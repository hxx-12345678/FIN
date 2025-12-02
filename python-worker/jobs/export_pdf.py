"""PDF Export Job Handler with Memo Generator
Stores file in database instead of S3
"""
import json
import os
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.logger import setup_logger
from utils.timer import CPUTimer
from utils.s3 import upload_bytes_to_s3
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def fetch_additional_financial_data(cursor, conn, org_id: str, model_run_id: str = None) -> dict:
    """
    Fetch additional financial data from transactions and model runs for comprehensive reporting.
    
    Args:
        cursor: Database cursor
        conn: Database connection (for rollback on error)
        org_id: Organization ID
        model_run_id: Optional model run ID
    
    Returns:
        Dictionary with additional financial metrics
    """
    additional_data = {
        'monthly_breakdown': [],
        'top_expense_categories': [],
        'revenue_trends': [],
        'transaction_count': 0,
    }
    
    try:
        # Check if raw_transactions table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'raw_transactions'
            )
        """)
        result = cursor.fetchone()
        table_exists = result[0] if result else False
        
        if not table_exists:
            logger.debug("raw_transactions table does not exist, skipping additional data fetch")
            return additional_data
        
        # Get recent transactions for monthly breakdown
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', date) as month,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as revenue,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
                COUNT(*) as transaction_count
            FROM raw_transactions
            WHERE "orgId" = %s
            AND date >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', date)
            ORDER BY month DESC
            LIMIT 12
        """, (org_id,))
        
        monthly_data = cursor.fetchall()
        if monthly_data:
            additional_data['monthly_breakdown'] = [
                {
                    'month': row[0].strftime('%Y-%m') if row[0] else '',
                    'revenue': float(row[1] or 0),
                    'expenses': float(row[2] or 0),
                    'transaction_count': int(row[3] or 0)
                }
                for row in monthly_data
            ]
            
            # Calculate growth from monthly data
            if len(monthly_data) >= 2:
                latest_rev = float(monthly_data[0][1] or 0)
                prev_rev = float(monthly_data[1][1] or 0)
                latest_exp = float(monthly_data[0][2] or 0)
                prev_exp = float(monthly_data[1][2] or 0)
                
                if prev_rev > 0:
                    additional_data['calculated_revenue_growth'] = ((latest_rev - prev_rev) / prev_rev) * 100
                if prev_exp > 0:
                    additional_data['calculated_expense_growth'] = ((latest_exp - prev_exp) / prev_exp) * 100
        
        # Get top expense categories
        cursor.execute("""
            SELECT 
                category,
                SUM(ABS(amount)) as total_expense,
                COUNT(*) as transaction_count
            FROM raw_transactions
            WHERE "orgId" = %s
            AND amount < 0
            AND date >= NOW() - INTERVAL '3 months'
            AND category IS NOT NULL
            GROUP BY category
            ORDER BY total_expense DESC
            LIMIT 10
        """, (org_id,))
        
        expense_categories = cursor.fetchall()
        if expense_categories:
            additional_data['top_expense_categories'] = [
                {
                    'category': row[0] or 'Uncategorized',
                    'total': float(row[1] or 0),
                    'count': int(row[2] or 0)
                }
                for row in expense_categories
            ]
        
        # Get total transaction count
        cursor.execute("""
            SELECT COUNT(*) FROM raw_transactions
            WHERE "orgId" = %s
        """, (org_id,))
        
        count_result = cursor.fetchone()
        if count_result:
            additional_data['transaction_count'] = int(count_result[0] or 0)
            
    except Exception as e:
        logger.warning(f"Error fetching additional financial data: {str(e)}")
        # Return empty data - error handling is done at higher level
    
    return additional_data


def generate_template_specific_content(template: str, summary_json: dict, model_run_id: str, additional_data: dict = None) -> dict:
    """
    Generate template-specific content for different report types.
    
    Args:
        template: Template type (executive-summary, financial-performance, kpi-dashboard, etc.)
        summary_json: Summary JSON from model run
        model_run_id: Model run ID
        additional_data: Additional financial data from database
    
    Returns:
        Dictionary with title, sections, and recommendations
    """
    total_revenue = summary_json.get('totalRevenue', 0)
    total_expenses = summary_json.get('totalExpenses', 0)
    net_income = summary_json.get('netIncome', 0)
    cash_balance = summary_json.get('cashBalance', 0)
    runway_months = summary_json.get('runwayMonths', 0)
    burn_rate = summary_json.get('burnRate', 0)
    
    # Calculate additional metrics
    revenue_growth = summary_json.get('revenueGrowth', 0)
    expense_growth = summary_json.get('expenseGrowth', 0)
    
    # Use calculated growth from additional_data if available
    if additional_data and 'calculated_revenue_growth' in additional_data:
        revenue_growth = additional_data['calculated_revenue_growth']
    if additional_data and 'calculated_expense_growth' in additional_data:
        expense_growth = additional_data['calculated_expense_growth']
    
    gross_margin = ((total_revenue - total_expenses) / total_revenue * 100) if total_revenue > 0 else 0
    monthly_revenue = total_revenue / 12 if total_revenue > 0 else 0
    net_margin = (net_income / total_revenue * 100) if total_revenue > 0 else 0
    
    # Additional metrics from summary_json
    arr = summary_json.get('arr', 0) or summary_json.get('annualRecurringRevenue', 0)
    mrr = summary_json.get('mrr', 0) or summary_json.get('monthlyRecurringRevenue', 0) or monthly_revenue
    active_customers = summary_json.get('activeCustomers', 0) or summary_json.get('customers', 0)
    cac = summary_json.get('cac', 0) or summary_json.get('customerAcquisitionCost', 0)
    ltv = summary_json.get('ltv', 0) or summary_json.get('customerLifetimeValue', 0)
    churn_rate = summary_json.get('churnRate', 0) or summary_json.get('monthlyChurn', 0)
    
    template = template.lower() if template else "executive-summary"
    
    template = template.lower() if template else "executive-summary"
    
    if template == "executive-summary":
        # Build monthly trend analysis if available
        monthly_trend = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:6]  # Last 6 months
            if monthly_data:
                monthly_trend = "\n\nRecent Monthly Trends:\n"
                for month_data in reversed(monthly_data):
                    monthly_trend += f"• {month_data['month']}: Revenue ${month_data['revenue']:,.2f}, Expenses ${month_data['expenses']:,.2f}\n"
        
        return {
            "title": "Executive Summary Report",
            "subtitle": "High-level overview for leadership",
            "sections": [
                {
                    "title": "Executive Overview",
                    "content": f"""This executive summary provides a high-level view of the organization's financial performance and strategic position.

Key Highlights:
• Revenue Performance: ${total_revenue:,.2f} total revenue{' (MRR: $' + f'{mrr:,.2f})' if mrr > 0 else ''}
• Financial Health: {'Positive' if net_income >= 0 else 'Requires Attention'} - Net Income: ${net_income:,.2f}
• Cash Position: ${cash_balance:,.2f} available
• Runway: {runway_months:.1f} months of operating runway
• Profitability: Gross Margin {gross_margin:.1f}%, Net Margin {net_margin:.1f}%{monthly_trend}"""
                },
                {
                    "title": "Strategic Metrics",
                    "content": f"""Financial Performance:
• Net Income: ${net_income:,.2f}
• Monthly Burn Rate: ${burn_rate:,.2f}
• Gross Margin: {gross_margin:.1f}%
• Revenue Growth: {revenue_growth:.1f}%

Business Metrics:
• {'Active Customers: ' + str(active_customers) if active_customers > 0 else ''}
• {'CAC: $' + f'{cac:,.2f}' if cac > 0 else ''}
• {'LTV: $' + f'{ltv:,.2f}' if ltv > 0 else ''}
• {'LTV:CAC Ratio: ' + f'{(ltv/cac):.1f}' if ltv > 0 and cac > 0 else ''}
• {'Monthly Churn: ' + f'{churn_rate*100:.2f}%' if churn_rate > 0 else ''}"""
                },
                {
                    "title": "Financial Position Analysis",
                    "content": f"""The organization demonstrates {'strong' if net_income >= 0 and runway_months >= 12 else 'moderate' if runway_months >= 6 else 'concerning'} financial health.

Cash Management:
• Current cash balance provides {runway_months:.1f} months of runway
• {'Adequate' if runway_months >= 12 else 'Sufficient' if runway_months >= 6 else 'Critical'} cash position requiring {'monitoring' if runway_months >= 6 else 'immediate attention'}

Growth Trajectory:
• Revenue growth of {revenue_growth:.1f}% indicates {'strong' if revenue_growth > 10 else 'moderate' if revenue_growth > 0 else 'declining'} growth trajectory
• Expense growth of {expense_growth:.1f}% {'supports' if expense_growth < revenue_growth else 'challenges'} sustainable scaling"""
                }
            ],
            "recommendations": [
                "Review cash runway and plan for fundraising if below 6 months",
                "Monitor revenue growth trends and adjust strategy accordingly",
                "Evaluate expense efficiency relative to revenue growth",
                "Consider scenario planning for different growth trajectories",
                "Maintain focus on unit economics to ensure sustainable growth"
            ]
        }
    
    elif template == "financial-performance":
        # Build expense breakdown if available
        expense_breakdown = ""
        if additional_data and additional_data.get('top_expense_categories'):
            expense_breakdown = "\n\nTop Expense Categories:\n"
            for cat in additional_data['top_expense_categories'][:5]:
                expense_breakdown += f"• {cat['category']}: ${cat['total']:,.2f} ({cat['count']} transactions)\n"
        
        # Build monthly performance if available
        monthly_performance = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:6]
            if monthly_data:
                monthly_performance = "\n\nMonthly Performance (Last 6 Months):\n"
                for month_data in reversed(monthly_data):
                    month_net = month_data['revenue'] - month_data['expenses']
                    monthly_performance += f"• {month_data['month']}: Revenue ${month_data['revenue']:,.2f}, Expenses ${month_data['expenses']:,.2f}, Net ${month_net:,.2f}\n"
        
        return {
            "title": "Financial Performance Report",
            "subtitle": "Detailed P&L and cash flow analysis",
            "sections": [
                {
                    "title": "Profit & Loss Analysis",
                    "content": f"""Revenue: ${total_revenue:,.2f}
Expenses: ${total_expenses:,.2f}
Net Income: ${net_income:,.2f}
Gross Margin: {gross_margin:.1f}%
Net Margin: {net_margin:.1f}%

The organization {'is operating profitably' if net_income >= 0 else 'is operating at a loss'} with a gross margin of {gross_margin:.1f}% and net margin of {net_margin:.1f}%.

Profitability Analysis:
• Revenue efficiency: ${(total_revenue / active_customers):,.2f} per customer (if applicable)
• Expense ratio: {(total_expenses / total_revenue * 100) if total_revenue > 0 else 0:.1f}% of revenue{expense_breakdown}{monthly_performance}"""
                },
                {
                    "title": "Cash Flow Position",
                    "content": f"""Cash Balance: ${cash_balance:,.2f}
Monthly Burn Rate: ${burn_rate:,.2f}
Runway: {runway_months:.1f} months
Cash Run Rate: ${(cash_balance / runway_months):,.2f} per month (if runway < 999)

{'Strong cash position' if cash_balance > 100000 else 'Cash position requires monitoring'} with {'adequate' if runway_months >= 12 else 'limited' if runway_months >= 6 else 'critical'} runway.

Cash Flow Analysis:
• Current burn rate of ${burn_rate:,.2f} per month
• {'Positive' if net_income >= 0 else 'Negative'} cash flow from operations
• {'Sufficient' if runway_months >= 12 else 'Insufficient' if runway_months < 6 else 'Adequate'} cash reserves for current operations"""
                },
                {
                    "title": "Growth Trends & Unit Economics",
                    "content": f"""Revenue Growth: {revenue_growth:.1f}%
Expense Growth: {expense_growth:.1f}%
Growth Efficiency: {'Positive' if revenue_growth > expense_growth else 'Negative'}

{'Revenue growth exceeds expense growth' if revenue_growth > expense_growth else 'Expense growth is outpacing revenue growth'}, indicating {'positive' if revenue_growth > expense_growth else 'concerning'} unit economics.

Unit Economics Metrics:
• Gross Margin: {gross_margin:.1f}%
• Net Margin: {net_margin:.1f}%
• {'LTV:CAC Ratio: ' + f'{(ltv/cac):.1f}' if ltv > 0 and cac > 0 else 'LTV:CAC data not available'}
• {'Monthly Churn: ' + f'{churn_rate*100:.2f}%' if churn_rate > 0 else 'Churn data not available'}

Growth Trajectory:
• {'Strong growth momentum' if revenue_growth > 10 else 'Moderate growth' if revenue_growth > 0 else 'Declining revenue'} with {revenue_growth:.1f}% revenue growth
• Expense growth of {expense_growth:.1f}% {'supports' if expense_growth < revenue_growth else 'challenges'} sustainable scaling"""
                }
            ],
            "recommendations": [
                "Focus on improving gross margins through pricing optimization or cost reduction",
                "Monitor cash flow trends and adjust spending to extend runway",
                "Analyze expense categories to identify optimization opportunities",
                "Develop revenue growth strategies to improve unit economics",
                "Review monthly performance trends to identify patterns and adjust strategy",
                "Optimize expense allocation to support growth while maintaining efficiency"
            ]
        }
    
    elif template == "kpi-dashboard":
        # Build KPI trend analysis
        kpi_trends = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:6]
            if monthly_data:
                kpi_trends = "\n\n6-Month KPI Trends:\n"
                for month_data in reversed(monthly_data):
                    month_margin = ((month_data['revenue'] - month_data['expenses']) / month_data['revenue'] * 100) if month_data['revenue'] > 0 else 0
                    kpi_trends += f"• {month_data['month']}: Revenue ${month_data['revenue']:,.2f}, Margin {month_margin:.1f}%, Transactions {month_data['transaction_count']}\n"
        
        return {
            "title": "KPI Dashboard Report",
            "subtitle": "Key performance indicators tracking",
            "sections": [
                {
                    "title": "Financial KPIs",
                    "content": f"""Revenue Metrics:
• Total Revenue: ${total_revenue:,.2f}
• Monthly Revenue: ${monthly_revenue:,.2f}
• {'MRR: $' + f'{mrr:,.2f}' if mrr > 0 else ''}
• {'ARR: $' + f'{arr:,.2f}' if arr > 0 else ''}
• Revenue Growth: {revenue_growth:.1f}%

Profitability Metrics:
• Net Income: ${net_income:,.2f}
• Gross Margin: {gross_margin:.1f}%
• Net Margin: {net_margin:.1f}%
• Burn Rate: ${burn_rate:,.2f}

Efficiency Metrics:
• Revenue per Customer: ${(total_revenue / active_customers):,.2f} (if applicable)
• Expense Ratio: {(total_expenses / total_revenue * 100) if total_revenue > 0 else 0:.1f}%{kpi_trends}"""
                },
                {
                    "title": "Operational KPIs",
                    "content": f"""Cash Management:
• Cash Balance: ${cash_balance:,.2f}
• Runway: {runway_months:.1f} months
• Cash Efficiency: {'High' if runway_months >= 12 else 'Medium' if runway_months >= 6 else 'Low'}
• Monthly Cash Burn: ${burn_rate:,.2f}

Growth Efficiency:
• Revenue Growth Rate: {revenue_growth:.1f}%
• Expense Growth Rate: {expense_growth:.1f}%
• Growth Efficiency: {'Positive' if revenue_growth > expense_growth else 'Negative'}
• Growth Efficiency Ratio: {(revenue_growth / expense_growth) if expense_growth > 0 else 0:.2f}

Customer Metrics:
• {'Active Customers: ' + str(active_customers) if active_customers > 0 else ''}
• {'CAC: $' + f'{cac:,.2f}' if cac > 0 else ''}
• {'LTV: $' + f'{ltv:,.2f}' if ltv > 0 else ''}
• {'LTV:CAC: ' + f'{(ltv/cac):.1f}' if ltv > 0 and cac > 0 else ''}
• {'Monthly Churn: ' + f'{churn_rate*100:.2f}%' if churn_rate > 0 else ''}

Data Quality:
• Total Transactions: {additional_data.get('transaction_count', 0) if additional_data else 'N/A'}"""
                }
            ],
            "recommendations": [
                "Track monthly revenue trends to identify growth patterns",
                "Monitor burn rate relative to revenue to ensure sustainable growth",
                "Set targets for key metrics and track progress monthly",
                "Review KPI trends quarterly to adjust strategy",
                "Establish KPI dashboards for real-time monitoring",
                "Compare actual KPIs against targets and benchmarks"
            ]
        }
    
    elif template == "investor-update":
        # Build investor-focused metrics
        investor_metrics = ""
        if arr > 0:
            investor_metrics += f"\n• Annual Recurring Revenue (ARR): ${arr:,.2f}"
        if mrr > 0:
            investor_metrics += f"\n• Monthly Recurring Revenue (MRR): ${mrr:,.2f}"
        if active_customers > 0:
            investor_metrics += f"\n• Active Customers: {active_customers:,}"
        if ltv > 0 and cac > 0:
            investor_metrics += f"\n• Unit Economics: LTV ${ltv:,.2f}, CAC ${cac:,.2f}, Ratio {(ltv/cac):.1f}x"
        
        # Build quarterly trends if available
        quarterly_trends = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:3]  # Last quarter
            if monthly_data:
                q_revenue = sum(m['revenue'] for m in monthly_data)
                q_expenses = sum(m['expenses'] for m in monthly_data)
                q_net = q_revenue - q_expenses
                quarterly_trends = f"\n\nQ4 Performance Summary:\n• Quarterly Revenue: ${q_revenue:,.2f}\n• Quarterly Expenses: ${q_expenses:,.2f}\n• Quarterly Net Income: ${q_net:,.2f}"
        
        return {
            "title": "Investor Update Report",
            "subtitle": "Monthly investor communication",
            "sections": [
                {
                    "title": "Performance Highlights",
                    "content": f"""This investor update covers the organization's financial performance and strategic progress for the reporting period.

Financial Performance:
• Total Revenue: ${total_revenue:,.2f}
• Net Income: ${net_income:,.2f}
• Cash Position: ${cash_balance:,.2f}
• Runway: {runway_months:.1f} months
• Gross Margin: {gross_margin:.1f}%
• Net Margin: {net_margin:.1f}%{investor_metrics}{quarterly_trends}"""
                },
                {
                    "title": "Key Achievements & Milestones",
                    "content": f"""Financial Achievements:
• {'Profitable operations' if net_income >= 0 else 'Revenue growth of'} {revenue_growth:.1f}% {'with positive unit economics' if revenue_growth > expense_growth else ''}
• {'Strong cash position' if cash_balance > 100000 else 'Cash management focus'} with {runway_months:.1f} months runway
• Gross margin of {gross_margin:.1f}% {'demonstrates' if gross_margin > 50 else 'indicates'} {'strong' if gross_margin > 50 else 'developing'} operational efficiency

Growth Metrics:
• Revenue growth rate: {revenue_growth:.1f}% {'shows strong momentum' if revenue_growth > 10 else 'indicates steady growth' if revenue_growth > 0 else 'requires attention'}
• Expense growth: {expense_growth:.1f}% {'is well-controlled' if expense_growth < revenue_growth else 'needs optimization'}
• {'LTV:CAC ratio of ' + f'{(ltv/cac):.1f}' if ltv > 0 and cac > 0 else 'Unit economics'} {'exceeds industry benchmarks' if ltv > 0 and cac > 0 and (ltv/cac) > 3 else 'are developing'}"""
                },
                {
                    "title": "Forward Outlook & Strategy",
                    "content": f"""The organization is positioned for {'continued growth' if revenue_growth > 0 else 'stabilization'} with {'adequate' if runway_months >= 12 else 'sufficient' if runway_months >= 6 else 'limited'} operating runway.

Strategic Position:
• Current runway of {runway_months:.1f} months provides {'ample' if runway_months >= 12 else 'sufficient' if runway_months >= 6 else 'limited'} time for {'growth initiatives' if runway_months >= 12 else 'operational optimization' if runway_months >= 6 else 'fundraising or cost reduction'}

Growth Trajectory:
• Revenue growth of {revenue_growth:.1f}% {'supports' if revenue_growth > 10 else 'enables' if revenue_growth > 0 else 'requires focus on'} {'aggressive scaling' if revenue_growth > 10 else 'sustainable growth' if revenue_growth > 0 else 'revenue recovery'}
• {'Positive' if revenue_growth > expense_growth else 'Negative'} unit economics {'support' if revenue_growth > expense_growth else 'challenge'} scaling strategy

Next Steps:
• {'Continue current growth strategy' if revenue_growth > expense_growth and runway_months >= 6 else 'Optimize operations and extend runway' if runway_months < 6 else 'Focus on revenue growth initiatives'}"""
                }
            ],
            "recommendations": [
                "Continue monitoring cash runway and plan fundraising if needed",
                "Focus on revenue growth initiatives to improve unit economics",
                "Maintain transparent communication with investors on key metrics",
                "Provide regular updates on strategic initiatives and milestones",
                "Highlight key wins and achievements in investor communications",
                "Set clear targets and track progress against investor expectations"
            ]
        }
    
    elif template == "budget-variance":
        # Calculate variance percentages (assuming budget was based on previous period)
        revenue_variance_pct = revenue_growth  # Using growth as proxy for variance
        expense_variance_pct = expense_growth
        
        # Build expense category variance if available
        expense_variance_detail = ""
        if additional_data and additional_data.get('top_expense_categories'):
            expense_variance_detail = "\n\nExpense Category Analysis:\n"
            for cat in additional_data['top_expense_categories'][:5]:
                cat_pct = (cat['total'] / total_expenses * 100) if total_expenses > 0 else 0
                expense_variance_detail += f"• {cat['category']}: ${cat['total']:,.2f} ({cat_pct:.1f}% of total, {cat['count']} transactions)\n"
        
        # Build monthly variance if available
        monthly_variance = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:6]
            if monthly_data:
                monthly_variance = "\n\nMonthly Variance Trends:\n"
                for month_data in reversed(monthly_data):
                    month_net = month_data['revenue'] - month_data['expenses']
                    variance_status = "Favorable" if month_net >= 0 else "Unfavorable"
                    monthly_variance += f"• {month_data['month']}: Revenue ${month_data['revenue']:,.2f}, Expenses ${month_data['expenses']:,.2f}, Net ${month_net:,.2f} ({variance_status})\n"
        
        return {
            "title": "Budget Variance Report",
            "subtitle": "Budget vs actual analysis",
            "sections": [
                {
                    "title": "Budget vs Actual Performance",
                    "content": f"""Actual Revenue: ${total_revenue:,.2f}
Actual Expenses: ${total_expenses:,.2f}
Actual Net Income: ${net_income:,.2f}
Actual Gross Margin: {gross_margin:.1f}%

Variance Analysis:
• Revenue Variance: {'On target' if revenue_growth >= 0 else 'Below target'} ({revenue_variance_pct:.1f}% {'above' if revenue_variance_pct > 0 else 'below'} target)
• Expense Variance: {'Within budget' if expense_growth <= 10 else 'Over budget'} ({expense_variance_pct:.1f}% {'under' if expense_variance_pct < 10 else 'over'} budget)
• Net Income Variance: {'Favorable' if net_income >= 0 else 'Unfavorable'} (${abs(net_income):,.2f} {'surplus' if net_income >= 0 else 'deficit'})
• Margin Variance: Gross margin of {gross_margin:.1f}% {'meets' if gross_margin >= 50 else 'below'} target expectations{expense_variance_detail}{monthly_variance}"""
                },
                {
                    "title": "Variance Drivers & Root Causes",
                    "content": f"""Key factors driving variance:

Revenue Performance:
• Revenue growth of {revenue_growth:.1f}% {'exceeds' if revenue_growth > 10 else 'meets' if revenue_growth > 0 else 'falls short of'} budget expectations
• {'Strong' if revenue_growth > 10 else 'Moderate' if revenue_growth > 0 else 'Weak'} revenue performance {'drives' if revenue_growth > 0 else 'impacts'} overall variance

Expense Management:
• Expense growth of {expense_growth:.1f}% {'is controlled' if expense_growth < revenue_growth else 'outpaces revenue growth'}
• {'Efficient' if expense_growth < revenue_growth else 'Inefficient'} expense management {'supports' if expense_growth < revenue_growth else 'challenges'} budget targets

Overall Performance:
• {'Meeting' if net_income >= 0 else 'Below'} budget expectations with net income of ${net_income:,.2f}
• {'Positive' if net_income >= 0 else 'Negative'} variance {'supports' if net_income >= 0 else 'requires'} budget adjustments"""
                },
                {
                    "title": "Variance Impact Analysis",
                    "content": f"""Financial Impact:
• Revenue variance impact: ${(total_revenue * revenue_variance_pct / 100):,.2f} {'above' if revenue_variance_pct > 0 else 'below'} budget
• Expense variance impact: ${(total_expenses * expense_variance_pct / 100):,.2f} {'above' if expense_variance_pct > 0 else 'below'} budget
• Net impact: ${net_income:,.2f} {'favorable' if net_income >= 0 else 'unfavorable'} variance

Operational Impact:
• {'Budget performance supports' if net_income >= 0 else 'Budget variance requires'} {'continued operations' if net_income >= 0 else 'operational adjustments'}
• {'Strong' if gross_margin > 50 else 'Moderate' if gross_margin > 30 else 'Weak'} margin performance {'enables' if gross_margin > 30 else 'limits'} strategic flexibility"""
                }
            ],
            "recommendations": [
                "Review significant variances and identify root causes",
                "Adjust budget forecasts based on actual performance trends",
                "Implement cost controls for areas with unfavorable variances",
                "Celebrate areas performing above budget and replicate success",
                "Update budget assumptions based on actual performance patterns",
                "Establish variance thresholds and escalation procedures"
            ]
        }
    
    elif template == "growth-metrics":
        # Build growth trajectory analysis
        growth_trajectory = ""
        if additional_data and additional_data.get('monthly_breakdown'):
            monthly_data = additional_data['monthly_breakdown'][:6]
            if monthly_data:
                growth_trajectory = "\n\n6-Month Growth Trajectory:\n"
                prev_rev = None
                for month_data in reversed(monthly_data):
                    month_growth = ""
                    if prev_rev and prev_rev > 0:
                        month_growth_pct = ((month_data['revenue'] - prev_rev) / prev_rev) * 100
                        month_growth = f" ({month_growth_pct:+.1f}% MoM)"
                    growth_trajectory += f"• {month_data['month']}: ${month_data['revenue']:,.2f}{month_growth}\n"
                    prev_rev = month_data['revenue']
        
        # Calculate growth efficiency metrics
        growth_efficiency_ratio = (revenue_growth / expense_growth) if expense_growth > 0 else 0
        growth_efficiency_score = "Excellent" if growth_efficiency_ratio > 2 else "Good" if growth_efficiency_ratio > 1.5 else "Fair" if growth_efficiency_ratio > 1 else "Poor"
        
        return {
            "title": "Growth Metrics Report",
            "subtitle": "Customer and revenue growth analysis",
            "sections": [
                {
                    "title": "Revenue Growth Analysis",
                    "content": f"""Total Revenue: ${total_revenue:,.2f}
Monthly Revenue: ${monthly_revenue:,.2f}
Revenue Growth Rate: {revenue_growth:.1f}%

Growth Trends:
• {'Strong growth trajectory' if revenue_growth > 10 else 'Moderate growth' if revenue_growth > 0 else 'Declining revenue'} with {revenue_growth:.1f}% growth rate
• Monthly revenue run rate: ${monthly_revenue:,.2f}
• Annualized revenue projection: ${monthly_revenue * 12:,.2f}
• {'ARR: $' + f'{arr:,.2f}' if arr > 0 else ''}
• {'MRR: $' + f'{mrr:,.2f}' if mrr > 0 else ''}{growth_trajectory}

Growth Momentum:
• {'Accelerating' if revenue_growth > 10 else 'Steady' if revenue_growth > 0 else 'Declining'} growth indicates {'strong' if revenue_growth > 10 else 'moderate' if revenue_growth > 0 else 'challenging'} market position
• Revenue trajectory {'supports' if revenue_growth > 0 else 'requires'} {'scaling' if revenue_growth > 10 else 'optimization' if revenue_growth > 0 else 'recovery'} strategy"""
                },
                {
                    "title": "Growth Efficiency & Unit Economics",
                    "content": f"""Growth Metrics:
• Revenue Growth: {revenue_growth:.1f}%
• Expense Growth: {expense_growth:.1f}%
• Growth Efficiency: {'Positive' if revenue_growth > expense_growth else 'Negative'} (revenue growing {'faster' if revenue_growth > expense_growth else 'slower'} than expenses)
• Growth Efficiency Ratio: {growth_efficiency_ratio:.2f} ({growth_efficiency_score} efficiency)
• Growth Efficiency Score: {growth_efficiency_score}

Unit Economics:
• Gross Margin: {gross_margin:.1f}%
• Net Income Margin: {(net_income / total_revenue * 100) if total_revenue > 0 else 0:.1f}%
• {'LTV: $' + f'{ltv:,.2f}' if ltv > 0 else ''}
• {'CAC: $' + f'{cac:,.2f}' if cac > 0 else ''}
• {'LTV:CAC Ratio: ' + f'{(ltv/cac):.1f}x' if ltv > 0 and cac > 0 else ''}
• {'Monthly Churn: ' + f'{churn_rate*100:.2f}%' if churn_rate > 0 else ''}

Customer Growth:
• {'Active Customers: ' + str(active_customers) if active_customers > 0 else ''}
• {'Revenue per Customer: $' + f'{(total_revenue / active_customers):,.2f}' if active_customers > 0 else ''}
• {'Customer Growth Rate: ' + f'{revenue_growth:.1f}%' if active_customers > 0 else ''} (estimated from revenue growth)"""
                },
                {
                    "title": "Growth Sustainability Analysis",
                    "content": f"""Growth Sustainability:
• Current growth rate of {revenue_growth:.1f}% {'is sustainable' if revenue_growth > expense_growth and runway_months >= 6 else 'requires optimization'} given {'positive' if revenue_growth > expense_growth else 'negative'} unit economics
• Runway of {runway_months:.1f} months {'supports' if runway_months >= 12 else 'enables' if runway_months >= 6 else 'limits'} {'aggressive' if runway_months >= 12 else 'moderate' if runway_months >= 6 else 'conservative'} growth strategy

Growth Constraints:
• {'No major constraints' if revenue_growth > expense_growth and runway_months >= 6 else 'Expense growth outpacing revenue' if expense_growth > revenue_growth else 'Limited runway'} {'enables' if revenue_growth > expense_growth and runway_months >= 6 else 'requires'} {'continued scaling' if revenue_growth > expense_growth and runway_months >= 6 else 'operational optimization'}

Scaling Readiness:
• {'Ready for scaling' if revenue_growth > expense_growth and gross_margin > 50 and runway_months >= 6 else 'Optimization needed' if revenue_growth > 0 else 'Recovery required'} based on current metrics
• Unit economics {'support' if revenue_growth > expense_growth else 'challenge'} {'aggressive' if revenue_growth > expense_growth else 'conservative'} growth approach"""
                }
            ],
            "recommendations": [
                "Focus on accelerating revenue growth through customer acquisition",
                "Optimize growth efficiency by controlling expense growth",
                "Improve unit economics through pricing and cost optimization",
                "Track growth metrics monthly to identify trends early",
                "Maintain growth efficiency ratio above 1.5x for sustainable scaling",
                "Balance growth speed with unit economics to ensure long-term viability"
            ]
        }
    
    else:
        # Default to executive summary
        return {
            "title": "Financial Model Export Report",
            "subtitle": "Comprehensive financial analysis",
            "sections": [
                {
                    "title": "Executive Summary",
                    "content": f"""This report provides a comprehensive view of the organization's financial position.

Key Metrics:
• Total Revenue: ${total_revenue:,.2f}
• Total Expenses: ${total_expenses:,.2f}
• Net Income: ${net_income:,.2f}
• Cash Balance: ${cash_balance:,.2f}
• Monthly Burn Rate: ${burn_rate:,.2f}
• Runway: {runway_months:.1f} months"""
                }
            ],
            "recommendations": [
                "Monitor cash runway closely, especially if below 6 months",
                "Review expense growth relative to revenue growth",
                "Consider scenario planning for different growth trajectories"
            ]
        }


def generate_export_memo(model_run_id: str, export_type: str, summary_json: dict, template: str = None) -> str:
    """
    Generate executive memo text for export.
    
    Args:
        model_run_id: Model run ID
        export_type: Type of export (pdf, pptx, csv)
        summary_json: Summary JSON from model run
        template: Template type for context-specific generation
    
    Returns:
        Memo text as string
    """
    try:
        template_content = generate_template_specific_content(template or "executive-summary", summary_json, model_run_id)
        
        memo = f"""{template_content['title']} - Financial Model Run {model_run_id[:8]}

Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
Subtitle: {template_content['subtitle']}

"""
        
        for section in template_content['sections']:
            memo += f"\n{section['title']}:\n{section['content']}\n"
        
        memo += "\nRecommendations:\n"
        for i, rec in enumerate(template_content['recommendations'], 1):
            memo += f"{i}. {rec}\n"
        
        return memo
    except Exception as e:
        logger.warning(f"Error generating memo: {str(e)}")
        return f"Executive Summary - Financial Model Run {model_run_id[:8]}\n\nGenerated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"


def fetch_provenance_summary(model_run_id: str, cursor, conn) -> str:
    """Fetch provenance summary for appendix"""
    try:
        # Check if provenance_entries table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'provenance_entries'
            )
        """)
        result = cursor.fetchone()
        table_exists = result[0] if result else False
        
        if not table_exists:
            return "<p>Provenance tracking not available.</p>"
        
        cursor.execute("""
            SELECT count(*), 
                   COUNT(DISTINCT "source_type"), 
                   AVG("confidence_score")
            FROM provenance_entries
            WHERE "modelRunId" = %s
        """, (model_run_id,))
        
        row = cursor.fetchone()
        if not row or row[0] == 0:
            return "No provenance data available for this run."
            
        count, source_types, avg_confidence = row
        
        cursor.execute("""
            SELECT "cell_key", "source_type", "confidence_score"
            FROM provenance_entries
            WHERE "modelRunId" = %s
            ORDER BY "confidence_score" ASC
            LIMIT 5
        """, (model_run_id,))
        
        low_confidence_cells = cursor.fetchall()
        
        summary = f"""
        <h3>Data Provenance Summary</h3>
        <p>This report is backed by {count} provenance entries tracing data lineage.</p>
        <ul>
            <li><strong>Data Sources:</strong> {source_types} distinct types (Transactions, Assumptions, AI)</li>
            <li><strong>Average Confidence Score:</strong> {float(avg_confidence or 0)*100:.1f}%</li>
        </ul>
        """
        
        if low_confidence_cells:
            summary += "<h4>Lowest Confidence Items (Review Recommended):</h4><ul>"
            for cell in low_confidence_cells:
                key, stype, score = cell
                summary += f"<li><strong>{key}</strong> ({stype}): {float(score)*100:.1f}%</li>"
            summary += "</ul>"
            
        return summary
    except Exception as e:
        logger.warning(f"Error fetching provenance: {str(e)}")
        return "<p>Provenance data not available.</p>"

def handle_export_pdf(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle PDF export job with memo generation"""
    logger.info(f"Processing PDF export job {job_id}")
    
    conn = None
    cursor = None
    cpu_timer = CPUTimer()
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        with cpu_timer:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Initialize export_org_id early
            export_org_id = org_id
            
            export_id = object_id
            if not export_id:
                export_id = logs.get('params', {}).get('exportId')
            
            if not export_id:
                raise ValueError("Export ID not found")
            
            # Get export record with model run summary and meta_json
            cursor.execute("""
                SELECT e.type, e."modelRunId", mr.summary_json, e."orgId", e.meta_json
                FROM exports e
                LEFT JOIN model_runs mr ON e."modelRunId" = mr.id
                WHERE e.id = %s
            """, (export_id,))
            
            export_record = cursor.fetchone()
            if not export_record:
                raise ValueError(f"Export {export_id} not found")
            
            export_type = export_record[0]
            model_run_id = export_record[1]
            summary_json = export_record[2] if export_record[2] else {}
            if len(export_record) > 3 and export_record[3]:
                export_org_id = export_record[3]
            meta_json = export_record[4] if len(export_record) > 4 else {}
            
            if isinstance(summary_json, str):
                try:
                    summary_json = json.loads(summary_json)
                except:
                    summary_json = {}
            
            if isinstance(meta_json, str):
                try:
                    meta_json = json.loads(meta_json)
                except:
                    meta_json = {}
            
            # Get template from meta_json or params
            template = None
            if meta_json and isinstance(meta_json, dict):
                template = meta_json.get('template')
            if not template:
                template = logs.get('params', {}).get('template')
            
            update_progress(job_id, 10, {'status': 'fetching_additional_data'})
            
            # Fetch additional financial data for comprehensive reporting
            additional_data = {}
            try:
                additional_data = fetch_additional_financial_data(cursor, conn, export_org_id, model_run_id)
            except Exception as e:
                logger.warning(f"Could not fetch additional financial data: {str(e)}")
                # Rollback and continue - we'll generate report without additional data
                try:
                    conn.rollback()
                except:
                    pass
                additional_data = {}  # Use empty data
            
            update_progress(job_id, 15, {'status': 'generating_memo'})
            
            # Generate template-specific memo
            memo_text = generate_export_memo(model_run_id or export_id, export_type, summary_json, template)
            
            # Get template-specific content for PDF generation with additional data
            template_content = generate_template_specific_content(
                template or "executive-summary", 
                summary_json, 
                model_run_id or export_id,
                additional_data
            )
            
            # Fetch Provenance Appendix (with error handling)
            provenance_html = ""
            if model_run_id:
                try:
                    provenance_html = fetch_provenance_summary(model_run_id, cursor, conn)
                except Exception as e:
                    logger.warning(f"Could not fetch provenance: {str(e)}")
                    provenance_html = "<p>Provenance data not available.</p>"
                    # Rollback and continue
                    try:
                        conn.rollback()
                    except:
                        pass
            
            update_progress(job_id, 30, {'status': 'generating_pdf'})
            
            # Generate PDF using WeasyPrint or reportlab
            pdf_content = None
            try:
                # Try WeasyPrint first
                from weasyprint import HTML
                from io import BytesIO
                
                # Create HTML from template-specific content
                sections_html = ""
                for section in template_content.get('sections', []):
                    sections_html += f"""
                    <h2>{section['title']}</h2>
                    <div class="metric">
                        {section['content'].replace(chr(10), '<br>')}
                    </div>
                    """
                
                recommendations_html = "<ul>"
                for rec in template_content.get('recommendations', []):
                    recommendations_html += f"<li>{rec}</li>"
                recommendations_html += "</ul>"
                
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            padding: 40px;
                            line-height: 1.6;
                        }}
                        h1 {{
                            color: #2c3e50;
                            border-bottom: 3px solid #3498db;
                            padding-bottom: 10px;
                        }}
                        h2 {{
                            color: #34495e;
                            margin-top: 30px;
                        }}
                        .metric {{
                            background: #ecf0f1;
                            padding: 15px;
                            margin: 10px 0;
                            border-left: 4px solid #3498db;
                        }}
                        .recommendation {{
                            background: #fff9e6;
                            padding: 15px;
                            margin: 10px 0;
                            border-left: 4px solid #f39c12;
                        }}
                        .provenance {{
                            background: #e8f8f5;
                            padding: 15px;
                            margin: 10px 0;
                            border-left: 4px solid #2ecc71;
                            font-size: 0.9em;
                        }}
                        .page-break {{
                            page-break-before: always;
                        }}
                    </style>
                </head>
                <body>
                    <h1>{template_content.get('title', 'Financial Model Export Report')}</h1>
                    {f'<p><em>{template_content.get("subtitle", "")}</em></p>' if template_content.get('subtitle') else ''}
                    <p><strong>Generated:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <p><strong>Model Run ID:</strong> {model_run_id or export_id}</p>
                    
                    {sections_html}
                    
                    <h2>Key Financial Metrics</h2>
                    <div class="metric">
                        <strong>Total Revenue:</strong> ${summary_json.get('totalRevenue', 0):,.2f}<br>
                        <strong>Total Expenses:</strong> ${summary_json.get('totalExpenses', 0):,.2f}<br>
                        <strong>Net Income:</strong> ${summary_json.get('netIncome', 0):,.2f}<br>
                        <strong>Cash Balance:</strong> ${summary_json.get('cashBalance', 0):,.2f}<br>
                        <strong>Monthly Burn Rate:</strong> ${summary_json.get('burnRate', 0):,.2f}<br>
                        <strong>Runway:</strong> {summary_json.get('runwayMonths', 0):.1f} months
                    </div>
                    
                    <h2>Recommendations</h2>
                    <div class="recommendation">
                        {recommendations_html}
                    </div>

                    <div class="page-break"></div>
                    <h2>Appendix A: Data Provenance</h2>
                    <div class="provenance">
                        {provenance_html}
                    </div>
                </body>
                </html>
                """
                
                buffer = BytesIO()
                HTML(string=html_content).write_pdf(buffer)
                pdf_content = buffer.getvalue()
                
            except (ImportError, OSError) as e:
                logger.warning(f"WeasyPrint not available ({str(e)}), using reportlab fallback")
                try:
                    from reportlab.lib.pagesizes import letter
                    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                    from reportlab.lib.units import inch
                    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
                    from reportlab.lib import colors
                    from io import BytesIO
                    
                    buffer = BytesIO()
                    doc = SimpleDocTemplate(buffer, pagesize=letter)
                    styles = getSampleStyleSheet()
                    
                    # Custom styles
                    title_style = ParagraphStyle(
                        'CustomTitle',
                        parent=styles['Heading1'],
                        fontSize=24,
                        textColor=colors.HexColor('#2c3e50'),
                        spaceAfter=30,
                    )
                    
                    h2_style = ParagraphStyle(
                        'CustomH2',
                        parent=styles['Heading2'],
                        fontSize=18,
                        textColor=colors.HexColor('#34495e'),
                        spaceBefore=20,
                        spaceAfter=10,
                    )
                    
                    story = []
                    
                    # Use template-specific title
                    report_title = template_content.get('title', "Financial Model Export Report")
                    report_subtitle = template_content.get('subtitle', '')
                        
                    story.append(Paragraph(report_title, title_style))
                    if report_subtitle:
                        story.append(Paragraph(report_subtitle, styles['Normal']))
                    story.append(Spacer(1, 0.2*inch))
                    
                    # Meta info
                    story.append(Paragraph(f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles['Normal']))
                    story.append(Paragraph(f"<b>Model Run ID:</b> {model_run_id or export_id}", styles['Normal']))
                    story.append(Spacer(1, 0.3*inch))
                    
                    # Template-specific sections
                    for section in template_content.get('sections', []):
                        story.append(Paragraph(section['title'], h2_style))
                        # Split section content into paragraphs
                        for line in section['content'].split('\n'):
                            if line.strip():
                                story.append(Paragraph(line, styles['Normal']))
                                story.append(Spacer(1, 0.05*inch))
                        story.append(Spacer(1, 0.15*inch))
                    
                    story.append(Spacer(1, 0.2*inch))
                    
                    # Key Metrics Table (always include)
                    story.append(Paragraph("Key Financial Metrics", h2_style))
                    
                    data = [
                        ['Metric', 'Value', 'Status'],
                        ['Total Revenue', f"${summary_json.get('totalRevenue', 0):,.2f}", ''],
                        ['Total Expenses', f"${summary_json.get('totalExpenses', 0):,.2f}", ''],
                        ['Net Income', f"${summary_json.get('netIncome', 0):,.2f}", ''],
                        ['Cash Balance', f"${summary_json.get('cashBalance', 0):,.2f}", ''],
                        ['Monthly Burn Rate', f"${summary_json.get('burnRate', 0):,.2f}", 'High' if summary_json.get('burnRate', 0) > 50000 else 'Normal'],
                        ['Runway', f"{summary_json.get('runwayMonths', 0):.1f} months", 'Critical' if summary_json.get('runwayMonths', 0) < 6 else 'Healthy']
                    ]
                    
                    t = Table(data, colWidths=[2.5*inch, 2.5*inch, 1.5*inch])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')),
                        ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 0.3*inch))
                    
                    # Detailed Financial Analysis (Mocked based on summary for now)
                    story.append(Paragraph("Financial Analysis", h2_style))
                    analysis_text = (
                        "The company's financial health remains stable with a strong cash position. "
                        f"Revenue of ${summary_json.get('totalRevenue', 0):,.2f} against expenses of "
                        f"${summary_json.get('totalExpenses', 0):,.2f} results in a net income of "
                        f"${summary_json.get('netIncome', 0):,.2f}. "
                        "The burn rate is currently managed within expected parameters."
                    )
                    story.append(Paragraph(analysis_text, styles['Normal']))
                    
                    # Template-specific recommendations
                    story.append(Paragraph("Strategic Recommendations", h2_style))
                    recommendations = template_content.get('recommendations', [
                        "Monitor cash runway closely, especially if below 6 months.",
                        "Review expense growth relative to revenue growth to ensure sustainable scaling.",
                        "Consider scenario planning for different growth trajectories to mitigate risks."
                    ])
                    for i, rec in enumerate(recommendations, 1):
                        story.append(Paragraph(f"{i}. {rec}", styles['Normal']))
                        story.append(Spacer(1, 0.05*inch))
                    
                    doc.build(story)
                    pdf_content = buffer.getvalue()
                    
                except ImportError:
                    logger.error("Neither WeasyPrint nor reportlab installed")
                    raise ValueError("PDF generation library not available. Install WeasyPrint: pip install weasyprint")
            
            update_progress(job_id, 90, {'status': 'storing_file'})
            
            # Upload PDF to S3 and update export record
            # Ensure we're in a clean transaction state
            try:
                # Check transaction state and rollback if needed
                try:
                    cursor.execute("SELECT 1")
                except:
                    conn.rollback()
                
                # Generate S3 key for export
                s3_key = f"exports/{export_org_id}/{export_id}/export.pdf"
                
                # Upload to S3
                uploaded_key = upload_bytes_to_s3(
                    key=s3_key,
                    data=pdf_content,
                    content_type='application/pdf'
                )
                
                if uploaded_key:
                    # Update export with S3 key
                    cursor.execute("""
                        UPDATE exports 
                        SET s3_key = %s, status = 'completed', updated_at = NOW()
                        WHERE id = %s
                    """, (uploaded_key, export_id))
                else:
                    # S3 not configured, store in database as fallback
                    logger.warning("S3 not configured, storing PDF in database as fallback")
                cursor.execute("""
                    UPDATE exports 
                    SET file_data = %s, status = 'completed', updated_at = NOW()
                    WHERE id = %s
                """, (pdf_content, export_id))
                
                conn.commit()
            except Exception as e:
                try:
                    conn.rollback()
                except:
                    pass
                raise
            
            # Get CPU time and estimate cost
            cpu_seconds = cpu_timer.elapsed()
            import os
            compute_cost_per_hour = float(os.getenv('COMPUTE_COST_PER_HOUR', '0.10'))
            estimated_cost = (cpu_seconds / 3600.0) * compute_cost_per_hour
            
            # Record billing usage
            try:
                bucket_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
                cursor.execute("""
                    INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (org_id, 'export_cpu_seconds', float(cpu_seconds), bucket_time))
                
                if estimated_cost > 0:
                    cursor.execute("""
                        INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (org_id, 'export_compute_cost', float(estimated_cost), bucket_time))
            except Exception as e:
                logger.warning(f"Error recording billing usage: {str(e)}")
            
            update_progress(job_id, 100, {
                'status': 'completed',
                'cpuSeconds': cpu_seconds,
                'fileSize': len(pdf_content),
            })
            
            logger.info(f"✅ PDF export {export_id} completed: {len(pdf_content)} bytes, {cpu_seconds:.2f}s CPU")
        
    except Exception as e:
        logger.error(f"❌ PDF export failed: {str(e)}", exc_info=True)
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
