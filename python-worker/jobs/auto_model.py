"""
Auto Model Job Handler
Ingests data from connectors/CSV and generates model assumptions
Creates initial model_run snapshot
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def add_months(base_date: datetime, months: int) -> datetime:
    """Safely add months to a datetime (keeps day=1)."""
    year = base_date.year + (base_date.month - 1 + months) // 12
    month = (base_date.month - 1 + months) % 12 + 1
    return base_date.replace(year=year, month=month)


def handle_auto_model(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle auto-model job:
    1. Pull connectors if available
    2. Parse CSV if uploaded
    3. Build normalized ledgers
    4. Generate base assumptions (AI or deterministic)
    5. Save assumptions JSON
    6. Create initial model_run snapshot
    """
    logger.info(f"Processing auto-model job {job_id} for model {object_id}")
    
    conn = None
    cursor = None
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        model_id = object_id
        if not model_id:
            model_id = logs.get('params', {}).get('modelId')
        
        if not model_id:
            raise ValueError("Model ID not found")
        
        # Get model
        cursor.execute("""
            SELECT id, "orgId", name, model_json
            FROM models
            WHERE id = %s
        """, (model_id,))
        
        model_row = cursor.fetchone()
        if not model_row:
            raise ValueError(f"Model {model_id} not found")
        
        model_org_id = model_row[1]
        model_name = model_row[2]
        model_json = model_row[3] or {}
        
        if model_org_id != org_id:
            raise ValueError(f"Model org {model_org_id} does not match job org {org_id}")
        
        update_progress(job_id, 10, {'status': 'fetching_data'})
        
        # Get params - handle both array and dict log structures
        params = {}
        if isinstance(logs, list):
            # Logs is an array, extract params from meta.params
            for entry in logs:
                if isinstance(entry, dict) and entry.get('meta', {}).get('params'):
                    params = {**params, **entry['meta']['params']}
        elif isinstance(logs, dict):
            # Logs is a dict, extract params directly
            params = logs.get('params', {})
        
        data_source_type = params.get('dataSourceType', 'blank')
        trigger_type = params.get('triggerType', 'model_creation')
        
        logger.info(f"Extracted params: startingCustomers={params.get('startingCustomers')}, cashOnHand={params.get('cashOnHand')}")
        
        # STEP 1: Fetch transaction data
        logger.info(f"Fetching transactions for org {org_id}, data source: {data_source_type}")
        
        cursor.execute("""
            SELECT 
                date,
                amount,
                category,
                description
            FROM raw_transactions
            WHERE "orgId" = %s
              AND is_duplicate = false
            ORDER BY date ASC
        """, (org_id,))
        
        transactions = cursor.fetchall()
        logger.info(f"Found {len(transactions)} transactions")
        
        update_progress(job_id, 30, {'status': 'processing_transactions', 'count': len(transactions)})
        
        # STEP 2: Build normalized ledgers
        monthly_revenue = {}
        monthly_expenses = {}
        category_expenses = {}
        total_revenue = 0
        total_expenses = 0
        
        for tx in transactions:
            tx_date = tx[0]
            tx_amount = float(tx[1]) if tx[1] else 0
            category = tx[2] or 'Uncategorized'
            month_key = f"{tx_date.year}-{str(tx_date.month).zfill(2)}"
            
            if tx_amount > 0:
                monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + tx_amount
                total_revenue += tx_amount
            else:
                abs_amount = abs(tx_amount)
                monthly_expenses[month_key] = monthly_expenses.get(month_key, 0) + abs_amount
                category_expenses[category] = category_expenses.get(category, 0) + abs_amount
                total_expenses += abs_amount
        
        logger.info(f"Processed transactions: Revenue=${total_revenue:,.0f}, Expenses=${total_expenses:,.0f}")
        
        update_progress(job_id, 50, {'status': 'generating_assumptions'})
        
        # STEP 3: Generate assumptions
        assumptions = generate_assumptions(
            monthly_revenue,
            monthly_expenses,
            category_expenses,
            params,
            data_source_type
        )
        
        logger.info(f"Generated assumptions: Revenue=${assumptions.get('revenue', {}).get('baselineRevenue', 0):,.0f}/month")
        
        update_progress(job_id, 70, {'status': 'updating_model'})
        
        # STEP 4: Update model with assumptions
        model_json['assumptions'] = assumptions
        model_json['metadata']['dataIngestedAt'] = datetime.now(timezone.utc).isoformat()
        model_json['metadata']['transactionCount'] = len(transactions)
        
        cursor.execute("""
            UPDATE models
            SET model_json = %s::jsonb
            WHERE id = %s
        """, (json.dumps(model_json), model_id))
        
        update_progress(job_id, 70, {'status': 'populating_drivers'})
        
        # STEP 4.5: Populate Drivers Table for Interactive Modeling
        # 1. Create Base Scenario
        cursor.execute("""
            INSERT INTO financial_scenarios (id, "orgId", "modelId", name, is_default, created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, 'Base', true, NOW(), NOW())
            RETURNING id
        """, (org_id, model_id))
        scenario_id = cursor.fetchone()[0]
        
        # 2. Define standard industrial drivers
        std_drivers = [
            {'name': 'Revenue Growth', 'type': 'revenue', 'category': 'Growth', 'unit': '%', 'value_key': 'revenueGrowth', 'assump_group': 'revenue'},
            {'name': 'Churn Rate', 'type': 'revenue', 'category': 'Retention', 'unit': '%', 'value_key': 'churnRate', 'assump_group': 'revenue'},
            {'name': 'OpEx Growth', 'type': 'cost', 'category': 'Operations', 'unit': '%', 'value_key': 'expenseGrowth', 'assump_group': 'costs'},
            {'name': 'Tax Rate', 'type': 'cost', 'category': 'Finance', 'unit': '%', 'value_key': 'taxRate', 'assump_group': 'costs', 'default': 0.25}
        ]
        
        # Get start month
        metadata = model_json.get('metadata', {})
        start_month_str = metadata.get('startMonth') or '2025-01'
        try:
            year, month = map(int, start_month_str.split('-'))
            base_date = datetime(year, month, 1, tzinfo=timezone.utc)
        except:
            base_date = datetime(2025, 1, 1, tzinfo=timezone.utc)

        for d_info in std_drivers:
            cursor.execute("""
                INSERT INTO drivers (id, "orgId", "modelId", name, type, category, unit, is_calculated, created_at, updated_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, false, NOW(), NOW())
                RETURNING id
            """, (org_id, model_id, d_info['name'], d_info['type'], d_info['category'], d_info['unit']))
            driver_id = cursor.fetchone()[0]
            
            # Populate values for 36 months starting from start_month
            val = assumptions.get(d_info['assump_group'], {}).get(d_info['value_key'], d_info.get('default', 0))
            
            # Bulk insert values
            values_to_insert = []
            for i in range(36):
                m_date = add_months(base_date, i)
                m_key = f"{m_date.year}-{str(m_date.month).zfill(2)}"
                values_to_insert.append((str(uuid.uuid4()), driver_id, scenario_id, m_key, float(val)))
            
            # Execute bulk insert
            from psycopg2.extras import execute_values
            execute_values(cursor, """
                INSERT INTO driver_values (id, "driverId", "scenarioId", month, value, created_at, updated_at)
                VALUES %s
            """, [(v[0], v[1], v[2], v[3], v[4], datetime.now(timezone.utc), datetime.now(timezone.utc)) for v in values_to_insert])

        update_progress(job_id, 80, {'status': 'creating_initial_run'})
        
        # STEP 5: Create initial model_run snapshot
        # This will be a baseline run with the generated assumptions
        cursor.execute("""
            INSERT INTO model_runs (id, "modelId", "orgId", "run_type", "params_json", status, created_at)
            VALUES (gen_random_uuid(), %s, %s, 'baseline', %s::jsonb, 'queued', NOW())
            RETURNING id
        """, (
            model_id,
            org_id,
            json.dumps({
                'autoGenerated': True,
                'triggerType': trigger_type,
                'assumptions': assumptions,
            }),
        ))
        
        model_run_id = cursor.fetchone()[0]
        
        logger.info(f"Created initial model run: {model_run_id}")
        
        # STEP 6: Create model_run job to compute the baseline
        # STEP 6: Create model_run job to compute the baseline
        # Use logs column for params since params column doesn't exist
        
        job_params = {
            'modelRunId': model_run_id,
            'modelId': model_id,
            'runType': 'baseline',
            'paramsJson': {
                'autoGenerated': True,
            }
        }
        
        job_logs = [
            {
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Job created via auto_model',
                'meta': {
                    'jobType': 'model_run',
                    'params': job_params
                }
            }
        ]

        cursor.execute("""
            INSERT INTO jobs (id, job_type, "orgId", object_id, status, priority, queue, logs, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'model_run',
                %s,
                %s,
                'queued',
                50,
                'default',
                %s::jsonb,
                NOW(),
                NOW()
            )
        """, (
            org_id,
            model_run_id,
            json.dumps(job_logs),
        ))
        
        update_progress(job_id, 100, {
            'status': 'completed',
            'modelRunId': model_run_id,
            'assumptionsGenerated': True,
        })
        
        conn.commit()
        
        logger.info(f"✅ Auto-model completed for model {model_id}, created run {model_run_id}")
        
    except Exception as e:
        logger.error(f"❌ Auto-model failed: {str(e)}", exc_info=True)
        
        if conn and cursor:
            try:
                error_logs = {**logs, 'error': str(e), 'failed_at': datetime.now(timezone.utc).isoformat()}
                cursor.execute("""
                    UPDATE jobs 
                    SET status = 'failed', updated_at = NOW(), logs = %s 
                    WHERE id = %s
                """, (json.dumps(error_logs), job_id))
                conn.commit()
            except Exception as db_error:
                logger.error(f"Failed to update job status: {str(db_error)}")
        
        raise
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                conn.close()
            except:
                pass


def generate_assumptions(
    monthly_revenue: Dict[str, float],
    monthly_expenses: Dict[str, float],
    category_expenses: Dict[str, float],
    params: Dict[str, Any],
    data_source_type: str
) -> Dict[str, Any]:
    """
    Generate industrial-standard assumptions from transaction data or user inputs
    """
    assumptions = {
        'revenue': {
            'growthModel': 'linear',
            'seasonality': 0.05,
        },
        'costs': {
            'opexBuckets': {
                'sales_marketing': 0.0,
                'research_development': 0.0,
                'general_admin': 0.0,
            }
        },
        'cash': {},
        'unitEconomics': {},
    }
    
    # Prioritize user inputs for AI-generated models
    business_type = params.get('businessType', 'technology')
    starting_customers = params.get('startingCustomers', 0)
    starting_revenue = params.get('startingRevenue', 0)
    user_starting_mrr = params.get('startingMrr', 0)
    starting_aov = params.get('startingAov', 0)
    major_costs = params.get('majorCosts', {})
    cash_on_hand = params.get('cashOnHand', 500000)
    manual_assumptions = params.get('assumptions', {})
    
    # If manual assumptions provided, use them as base
    if manual_assumptions:
        return manual_assumptions

    # Determine baseline revenue: User input takes precedence
    baseline_revenue = float(user_starting_mrr or (float(starting_revenue) / 12) or 0)
    
    # Determine historical stats if data source is not blank
    hist_avg_revenue = 0
    hist_revenue_growth = 0.08 # Default industrial benchmark
    
    if (monthly_revenue or monthly_expenses) and data_source_type != 'blank':
        revenue_months = sorted(monthly_revenue.keys())
        hist_avg_revenue = sum(monthly_revenue.values()) / len(revenue_months) if revenue_months else 0
        
        if len(revenue_months) >= 3:
            recent_revs = [monthly_revenue[m] for m in revenue_months[-3:]]
            if recent_revs[0] > 100: # Significant enough to calculate growth
                hist_revenue_growth = (recent_revs[-1] / recent_revs[0]) ** (1.0 / 2) - 1.0
                # Clamp to realistic industrial ranges (-5% to +40% monthly)
                # Professional models should not default to -50% unless data is extremely conclusive
                hist_revenue_growth = max(-0.05, min(0.40, hist_revenue_growth))
    
    # Merge: if user didn't provide MRR but we have historicals, use historicals
    if baseline_revenue == 0 and hist_avg_revenue > 0:
        baseline_revenue = hist_avg_revenue
    elif baseline_revenue == 0:
        baseline_revenue = 10000.0 # Default starting point if totally empty

    # Final Assumptions Construction
    assumptions = {
        'revenue': {
            'baselineRevenue': float(baseline_revenue),
            'revenueGrowth': float(hist_revenue_growth),
            'growthModel': 'exponential', # SaaS Professional Standard
            'churnRate': 0.03, # 3% monthly is professional SME/SaaS standard (~30% annual)
            'customerCount': int(starting_customers) or (int(baseline_revenue / 100) if baseline_revenue > 0 else 100),
            'mrr': float(baseline_revenue),
            'arr': float(baseline_revenue * 12),
            'aov': float(starting_aov) or (baseline_revenue / max(1, starting_customers)) if starting_customers else 100.0,
        },
        'costs': {
            'baselineExpenses': 0,
            'expenseGrowth': 0.04, # Slightly lower than revenue growth for operating leverage
            'cogsRatio': 0.20 if business_type in ['saas', 'technology'] else (0.60 if business_type == 'ecommerce' else 0.40),
        },
        'cash': {
            'initialCash': float(cash_on_hand) if cash_on_hand else 100000.0,
        },
        'unitEconomics': {}
    }

    # Calculate Expenses from user costs or historicals
    payroll = float(major_costs.get('payroll', 0))
    marketing = float(major_costs.get('marketing', 0))
    infrastructure = float(major_costs.get('infrastructure', 0))
    
    if payroll == 0 and marketing == 0:
        # Fallback to historical averages or revenue percentage
        avg_exp = sum(monthly_expenses.values()) / len(monthly_expenses) if monthly_expenses else baseline_revenue * 0.7
        assumptions['costs']['payroll'] = avg_exp * 0.6
        assumptions['costs']['marketing'] = avg_exp * 0.2
        assumptions['costs']['infrastructure'] = avg_exp * 0.1
        assumptions['costs']['baselineExpenses'] = avg_exp
    else:
        assumptions['costs']['payroll'] = payroll
        assumptions['costs']['marketing'] = marketing
        assumptions['costs']['infrastructure'] = infrastructure
        assumptions['costs']['baselineExpenses'] = payroll + marketing + infrastructure

    # Industrial Unit Economics (LTV/CAC)
    mrr = assumptions['revenue']['mrr']
    cust_count = assumptions['revenue']['customerCount']
    arpu = mrr / max(1, cust_count)
    churn = assumptions['revenue']['churnRate']
    
    # CAC: Default to 12-month payback if no marketing spend
    cac = arpu * 12
    if assumptions['costs']['marketing'] > 0:
        # Implied monthly new customers (approx 10% of base)
        cac = assumptions['costs']['marketing'] / max(1, cust_count * 0.1)
    
    ltv = arpu / max(0.001, churn)
    
    assumptions['unitEconomics'] = {
        'cac': float(cac),
        'ltv': float(ltv),
        'ltvCacRatio': float(ltv / cac) if cac > 0 else 3.0,
        'paybackPeriod': float(cac / arpu) if arpu > 0 else 12.0,
    }
    
    return assumptions
