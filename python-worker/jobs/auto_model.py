"""
Auto Model Job Handler
Ingests data from connectors/CSV and generates model assumptions
Creates initial model_run snapshot
"""
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


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
    
    # Extract user inputs if provided (AI-generated model)
    business_type = params.get('businessType', 'technology')
    starting_customers = params.get('startingCustomers', 0)
    starting_revenue = params.get('startingRevenue', 0)
    starting_mrr = params.get('startingMrr', 0)
    starting_aov = params.get('startingAov', 0)
    major_costs = params.get('majorCosts', {})
    cash_on_hand = params.get('cashOnHand', 500000)
    manual_assumptions = params.get('assumptions', {})
    
    # If manual assumptions provided, use them as base
    if manual_assumptions:
        return manual_assumptions
    
    # Calculate from transaction data if available
    if monthly_revenue or monthly_expenses:
        revenue_months = sorted(monthly_revenue.keys())
        expense_months = sorted(monthly_expenses.keys())
        
        # Calculate average monthly values
        avg_monthly_revenue = sum(monthly_revenue.values()) / len(revenue_months) if revenue_months else 0
        avg_monthly_expenses = sum(monthly_expenses.values()) / len(expense_months) if expense_months else 0
        
        # Calculate growth rates (CAGR-like)
        revenue_growth = 0.08  # Default 8% periodic growth
        if len(revenue_months) >= 3:
            # Use last 3 months for more recent trend
            recent_revs = [monthly_revenue[m] for m in revenue_months[-3:]]
            if recent_revs[0] > 0:
                revenue_growth = (recent_revs[-1] / recent_revs[0]) ** (1.0 / 2) - 1.0
                revenue_growth = max(-0.5, min(1.0, revenue_growth))  # Clamp
        
        # Attempt categorization if we have enough data (placeholder for more complex logic)
        # In a real system, we'd use a classifier here.
        cogs_ratio = 0.20 # Default for SaaS-like
        if business_type == 'ecommerce': cogs_ratio = 0.60
        elif business_type == 'services': cogs_ratio = 0.40
        
        assumptions['revenue'] = {
            'baselineRevenue': float(avg_monthly_revenue),
            'revenueGrowth': float(revenue_growth),
            'churnRate': 0.05,
            'customerCount': int(starting_customers) or 100,
            'mrr': float(avg_monthly_revenue),
            'arr': float(avg_monthly_revenue * 12),
            'aov': float(starting_aov) or (float(avg_monthly_revenue / max(1, starting_customers))),
        }
        
        # Map categories to industrial OPEX buckets
        payroll_total = float(category_expenses.get('Payroll', category_expenses.get('Salary', 0)))
        marketing_total = float(category_expenses.get('Marketing', category_expenses.get('Advertising', 0)))
        rent_total = float(category_expenses.get('Rent', category_expenses.get('Office', 0)))
        
        assumptions['costs'] = {
            'baselineExpenses': float(avg_monthly_expenses),
            'expenseGrowth': 0.05,
            'cogsRatio': float(cogs_ratio),
            'payroll': payroll_total / max(1, len(expense_months)) if payroll_total > 0 else float(major_costs.get('payroll', avg_monthly_expenses * 0.5)),
            'marketing': marketing_total / max(1, len(expense_months)) if marketing_total > 0 else float(major_costs.get('marketing', avg_monthly_expenses * 0.2)),
            'infrastructure': float(major_costs.get('infrastructure', avg_monthly_expenses * 0.1)),
        }
    else:
        # Use user inputs (AI-generated model / New Setup)
        baseline_revenue = float(starting_mrr or (float(starting_revenue) / 12) or 0)
        
        assumptions['revenue'] = {
            'baselineRevenue': baseline_revenue,
            'revenueGrowth': 0.08,
            'churnRate': 0.05,
            'customerCount': int(starting_customers) or 1,
            'mrr': baseline_revenue,
            'arr': baseline_revenue * 12,
            'aov': float(starting_aov) or (baseline_revenue / max(1, starting_customers)),
        }
        
        baseline_expenses = float(
            (float(major_costs.get('payroll') or 0)) + \
            (float(major_costs.get('infrastructure') or 0)) + \
            (float(major_costs.get('marketing') or 0))
        )
        if baseline_expenses == 0: baseline_expenses = baseline_revenue * 0.8 # Fallback
        
        assumptions['costs'] = {
            'baselineExpenses': baseline_expenses,
            'expenseGrowth': 0.05,
            'cogsRatio': 0.25,
            'payroll': float(major_costs.get('payroll', 0)),
            'infrastructure': float(major_costs.get('infrastructure', 0)),
            'marketing': float(major_costs.get('marketing', 0)),
        }
    
    # Cash assumptions
    assumptions['cash'] = {
        'initialCash': float(cash_on_hand) if cash_on_hand else 100000.0,
    }
    
    # Industrial Unit Economics
    cac = 125.0
    if assumptions['costs'].get('marketing') and assumptions['revenue'].get('customerCount', 0) > 0:
        # Simplified CAC from marketing spend / customer count (historical)
        cac = assumptions['costs']['marketing'] / max(1, assumptions['revenue']['customerCount'] * 0.1)
    
    ltv = 2400.0
    mrr = assumptions['revenue'].get('mrr', 0)
    churn = assumptions['revenue'].get('churnRate', 0.05)
    if churn > 0:
        ltv = (mrr / max(1, assumptions['revenue'].get('customerCount', 1))) / churn
    
    assumptions['unitEconomics'] = {
        'cac': float(cac),
        'ltv': float(ltv),
        'ltvCacRatio': float(ltv / cac) if cac > 0 else 3.0,
        'paybackPeriod': float(cac / (mrr / max(1, assumptions['revenue'].get('customerCount', 1)))) if mrr > 0 else 12.0,
    }
    
    return assumptions



