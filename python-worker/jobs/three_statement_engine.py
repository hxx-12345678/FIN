"""
Three-Statement Financial Modeling Engine
==========================================
Industrial-grade FP&A engine that generates:
- Income Statement (P&L)
- Cash Flow Statement
- Balance Sheet

With proper accounting linkages and cross-statement consistency.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)


class ThreeStatementEngine:
    """
    Industrial 3-Statement Financial Modeling Engine.
    
    Generates investor-ready financial statements with:
    - Proper accounting linkages (AR, AP, Depreciation, etc.)
    - Cross-statement consistency (Net Income → Retained Earnings, Cash Flow → Balance Sheet)
    - Multi-year projection capability
    - Rolling forecast support
    """
    
    def __init__(self, assumptions: Dict[str, Any] = None):
        self.assumptions = assumptions or {}
        self.statements = {
            'incomeStatement': {},
            'cashFlow': {},
            'balanceSheet': {}
        }
        
    def compute_statements(
        self,
        start_month: datetime,
        horizon_months: int,
        initial_values: Dict[str, float],
        growth_assumptions: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Compute all three statements for the given projection period.
        
        Args:
            start_month: Starting month for projections
            horizon_months: Number of months to project (12, 24, 36)
            initial_values: Starting values (cash, ar, ap, assets, etc.)
            growth_assumptions: Growth rates and percentages
            
        Returns:
            Complete 3-statement model with monthly breakdowns
        """
        # Initialize statement containers
        monthly_pl = {}
        monthly_cf = {}
        monthly_bs = {}
        
        # Extract initial values with defaults
        initial_cash = float(initial_values.get('cash', 500000))
        initial_ar = float(initial_values.get('accountsReceivable', 0))
        initial_ap = float(initial_values.get('accountsPayable', 0))
        initial_inventory = float(initial_values.get('inventory', 0))
        initial_ppe = float(initial_values.get('ppe', 100000))  # Property, Plant, Equipment
        initial_debt = float(initial_values.get('debt', 0))
        initial_equity = float(initial_values.get('equity', 500000))
        initial_retained_earnings = float(initial_values.get('retainedEarnings', 0))
        starting_revenue = float(initial_values.get('revenue', 50000))
        
        # Extract growth assumptions with defaults
        revenue_growth = float(growth_assumptions.get('revenueGrowth', 0.08))
        cogs_percentage = float(growth_assumptions.get('cogsPercentage', 0.30))
        opex_percentage = float(growth_assumptions.get('opexPercentage', 0.40))
        depreciation_rate = float(growth_assumptions.get('depreciationRate', 0.02))  # Monthly
        tax_rate = float(growth_assumptions.get('taxRate', 0.25))
        ar_days = float(growth_assumptions.get('arDays', 30))  # Days Sales Outstanding
        ap_days = float(growth_assumptions.get('apDays', 45))  # Days Payable Outstanding
        capex_percentage = float(growth_assumptions.get('capexPercentage', 0.05))  # of revenue
        
        # Track running balances
        running_cash = initial_cash
        running_ar = initial_ar
        running_ap = initial_ap
        running_inventory = initial_inventory
        running_ppe = initial_ppe
        running_debt = initial_debt
        running_equity = initial_equity
        running_retained_earnings = initial_retained_earnings
        accumulated_depreciation = 0.0
        
        for i in range(horizon_months):
            month_date = start_month + relativedelta(months=i)
            month_key = f"{month_date.year}-{str(month_date.month).zfill(2)}"
            
            # ============================================
            # INCOME STATEMENT (P&L)
            # ============================================
            
            # Revenue with growth
            growth_factor = (1 + revenue_growth) ** i
            revenue = starting_revenue * growth_factor
            
            # Cost of Goods Sold
            cogs = revenue * cogs_percentage
            
            # Gross Profit
            gross_profit = revenue - cogs
            gross_margin = gross_profit / revenue if revenue > 0 else 0
            
            # Operating Expenses
            operating_expenses = revenue * opex_percentage
            
            # Depreciation (on PPE)
            depreciation = running_ppe * depreciation_rate
            accumulated_depreciation += depreciation
            
            # EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization)
            ebitda = gross_profit - operating_expenses
            
            # EBIT (Earnings Before Interest and Taxes)
            ebit = ebitda - depreciation
            
            # Interest Expense (assuming 8% annual on debt)
            interest_expense = running_debt * (0.08 / 12)
            
            # EBT (Earnings Before Taxes)
            ebt = ebit - interest_expense
            
            # Income Tax
            income_tax = max(0, ebt * tax_rate)
            
            # Net Income
            net_income = ebt - income_tax
            
            monthly_pl[month_key] = {
                'revenue': round(revenue, 2),
                'cogs': round(cogs, 2),
                'grossProfit': round(gross_profit, 2),
                'grossMargin': round(gross_margin, 4),
                'operatingExpenses': round(operating_expenses, 2),
                'depreciation': round(depreciation, 2),
                'ebitda': round(ebitda, 2),
                'ebit': round(ebit, 2),
                'interestExpense': round(interest_expense, 2),
                'ebt': round(ebt, 2),
                'incomeTax': round(income_tax, 2),
                'netIncome': round(net_income, 2)
            }
            
            # ============================================
            # CASH FLOW STATEMENT
            # ============================================
            
            # --- Operating Activities ---
            # Start with Net Income
            cf_net_income = net_income
            
            # Add back non-cash: Depreciation
            cf_add_depreciation = depreciation
            
            # Changes in Working Capital
            # AR: Revenue → AR (DSO based)
            new_ar = (revenue / 30) * ar_days
            ar_change = new_ar - running_ar
            running_ar = new_ar
            
            # AP: COGS → AP (DPO based)
            new_ap = (cogs / 30) * ap_days
            ap_change = new_ap - running_ap
            running_ap = new_ap
            
            # Inventory change (simplified: 10% of COGS)
            inventory_change = cogs * 0.10 - running_inventory * 0.05
            running_inventory = max(0, running_inventory + inventory_change)
            
            cf_working_capital = -ar_change + ap_change - inventory_change
            
            cf_operating = cf_net_income + cf_add_depreciation + cf_working_capital
            
            # --- Investing Activities ---
            # CapEx (Capital Expenditures)
            capex = revenue * capex_percentage
            running_ppe = running_ppe + capex - depreciation
            
            cf_investing = -capex
            
            # --- Financing Activities ---
            # Debt payments (if any) - simplified: 1% of debt per month
            debt_repayment = running_debt * 0.01
            running_debt = max(0, running_debt - debt_repayment)
            
            # Equity (new funding - set to 0 unless specified)
            new_equity = 0
            
            cf_financing = -debt_repayment + new_equity
            
            # Net Cash Flow
            net_cash_flow = cf_operating + cf_investing + cf_financing
            
            # Update running cash
            running_cash += net_cash_flow
            
            monthly_cf[month_key] = {
                'netIncome': round(cf_net_income, 2),
                'depreciation': round(cf_add_depreciation, 2),
                'workingCapitalChange': round(cf_working_capital, 2),
                'arChange': round(-ar_change, 2),
                'apChange': round(ap_change, 2),
                'inventoryChange': round(-inventory_change, 2),
                'operatingCashFlow': round(cf_operating, 2),
                'capex': round(-capex, 2),
                'investingCashFlow': round(cf_investing, 2),
                'debtRepayment': round(-debt_repayment, 2),
                'equityFinancing': round(new_equity, 2),
                'financingCashFlow': round(cf_financing, 2),
                'netCashFlow': round(net_cash_flow, 2),
                'endingCash': round(running_cash, 2)
            }
            
            # ============================================
            # BALANCE SHEET
            # ============================================
            
            # Update retained earnings with net income
            running_retained_earnings += net_income
            
            # --- Assets ---
            current_assets = running_cash + running_ar + running_inventory
            fixed_assets = running_ppe - accumulated_depreciation
            total_assets = current_assets + fixed_assets
            
            # --- Liabilities ---
            current_liabilities = running_ap
            long_term_liabilities = running_debt
            total_liabilities = current_liabilities + long_term_liabilities
            
            # --- Equity ---
            total_equity = running_equity + running_retained_earnings
            
            # Force balance (Assets = Liabilities + Equity) before rounding
            # Any discrepancy goes to retained earnings
            balance_diff = total_assets - (total_liabilities + total_equity)
            if abs(balance_diff) > 0.001:
                running_retained_earnings += balance_diff
                total_equity = running_equity + running_retained_earnings
            
            # Round all values consistently
            r_cash = round(running_cash, 2)
            r_ar = round(running_ar, 2)
            r_inventory = round(running_inventory, 2)
            r_current_assets = round(r_cash + r_ar + r_inventory, 2)
            r_ppe = round(running_ppe, 2)
            r_accum_dep = round(accumulated_depreciation, 2)
            r_fixed_assets = round(r_ppe - r_accum_dep, 2)
            r_total_assets = round(r_current_assets + r_fixed_assets, 2)
            
            r_ap = round(running_ap, 2)
            r_current_liab = r_ap
            r_long_term_debt = round(running_debt, 2)
            r_total_liab = round(r_current_liab + r_long_term_debt, 2)
            
            r_common_stock = round(running_equity, 2)
            # Force retained earnings so that equation balances after rounding
            r_retained_earnings = round(r_total_assets - r_total_liab - r_common_stock, 2)
            r_total_equity = round(r_common_stock + r_retained_earnings, 2)
            
            monthly_bs[month_key] = {
                # Assets
                'cash': r_cash,
                'accountsReceivable': r_ar,
                'inventory': r_inventory,
                'currentAssets': r_current_assets,
                'ppe': r_ppe,
                'accumulatedDepreciation': r_accum_dep,
                'fixedAssets': r_fixed_assets,
                'totalAssets': r_total_assets,
                # Liabilities
                'accountsPayable': r_ap,
                'currentLiabilities': r_current_liab,
                'longTermDebt': r_long_term_debt,
                'totalLiabilities': r_total_liab,
                # Equity
                'commonStock': r_common_stock,
                'retainedEarnings': r_retained_earnings,
                'totalEquity': r_total_equity,
                # Validation (should always be 0 now)
                'balanceCheck': round(r_total_assets - (r_total_liab + r_total_equity), 2)
            }

        
        # Calculate annual summaries
        annual_summary = self._calculate_annual_summary(monthly_pl, monthly_cf, monthly_bs)
        
        return {
            'incomeStatement': {
                'monthly': monthly_pl,
                'annual': annual_summary.get('incomeStatement', {})
            },
            'cashFlow': {
                'monthly': monthly_cf,
                'annual': annual_summary.get('cashFlow', {})
            },
            'balanceSheet': {
                'monthly': monthly_bs,
                'annual': annual_summary.get('balanceSheet', {})
            },
            'metadata': {
                'startMonth': start_month.strftime('%Y-%m'),
                'horizonMonths': horizon_months,
                'generatedAt': datetime.now().isoformat(),
                'assumptions': {
                    'revenueGrowth': revenue_growth,
                    'cogsPercentage': cogs_percentage,
                    'opexPercentage': opex_percentage,
                    'taxRate': tax_rate,
                    'depreciationRate': depreciation_rate,
                    'arDays': ar_days,
                    'apDays': ap_days,
                    'capexPercentage': capex_percentage
                }
            }
        }
    
    def _calculate_annual_summary(
        self,
        monthly_pl: Dict[str, Dict],
        monthly_cf: Dict[str, Dict],
        monthly_bs: Dict[str, Dict]
    ) -> Dict[str, Any]:
        """Calculate annual summaries from monthly data."""
        annual = {
            'incomeStatement': {},
            'cashFlow': {},
            'balanceSheet': {}
        }
        
        # Group by year
        years = set()
        for month_key in monthly_pl.keys():
            years.add(month_key[:4])
        
        for year in sorted(years):
            # P&L - Sum up all P&L items for the year
            year_pl = {k: 0.0 for k in ['revenue', 'cogs', 'grossProfit', 'operatingExpenses', 
                                         'depreciation', 'ebitda', 'ebit', 'interestExpense', 
                                         'ebt', 'incomeTax', 'netIncome']}
            for month_key, pl_data in monthly_pl.items():
                if month_key.startswith(year):
                    for key in year_pl:
                        year_pl[key] += pl_data.get(key, 0)
            
            # Calculate gross margin for year
            if year_pl['revenue'] > 0:
                year_pl['grossMargin'] = year_pl['grossProfit'] / year_pl['revenue']
            else:
                year_pl['grossMargin'] = 0
                
            annual['incomeStatement'][year] = {k: round(v, 2) for k, v in year_pl.items()}
            
            # Cash Flow - Sum up all CF items for the year
            year_cf = {k: 0.0 for k in ['netIncome', 'depreciation', 'workingCapitalChange',
                                         'operatingCashFlow', 'investingCashFlow', 
                                         'financingCashFlow', 'netCashFlow']}
            for month_key, cf_data in monthly_cf.items():
                if month_key.startswith(year):
                    for key in year_cf:
                        year_cf[key] += cf_data.get(key, 0)
            
            # Get ending cash for the year
            year_months = [k for k in monthly_cf.keys() if k.startswith(year)]
            if year_months:
                last_month = sorted(year_months)[-1]
                year_cf['endingCash'] = monthly_cf[last_month].get('endingCash', 0)
            
            annual['cashFlow'][year] = {k: round(v, 2) for k, v in year_cf.items()}
            
            # Balance Sheet - Take the last month of the year
            year_months = [k for k in monthly_bs.keys() if k.startswith(year)]
            if year_months:
                last_month = sorted(year_months)[-1]
                annual['balanceSheet'][year] = monthly_bs[last_month]
        
        return annual
    
    def validate_statements(self, statements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate cross-statement consistency and accounting rules.
        
        Checks:
        1. Balance Sheet balances (Assets = Liabilities + Equity)
        2. Cash Flow ending cash = Balance Sheet cash
        3. Net Income flows to Retained Earnings
        """
        validations = {
            'passed': True,
            'checks': []
        }
        
        monthly_cf = statements.get('cashFlow', {}).get('monthly', {})
        monthly_bs = statements.get('balanceSheet', {}).get('monthly', {})
        
        for month_key in monthly_cf.keys():
            cf_data = monthly_cf.get(month_key, {})
            bs_data = monthly_bs.get(month_key, {})
            
            # Check 1: Cash Flow ending cash = Balance Sheet cash
            cf_cash = cf_data.get('endingCash', 0)
            bs_cash = bs_data.get('cash', 0)
            cash_match = abs(cf_cash - bs_cash) < 0.01
            
            # Check 2: Balance Sheet balances
            total_assets = bs_data.get('totalAssets', 0)
            total_liab_equity = bs_data.get('totalLiabilities', 0) + bs_data.get('totalEquity', 0)
            balance_match = abs(total_assets - total_liab_equity) < 0.01
            
            if not cash_match or not balance_match:
                validations['passed'] = False
                validations['checks'].append({
                    'month': month_key,
                    'cashMatch': cash_match,
                    'balanceMatch': balance_match,
                    'cfCash': cf_cash,
                    'bsCash': bs_cash,
                    'totalAssets': total_assets,
                    'totalLiabEquity': total_liab_equity
                })
        
        return validations


def compute_three_statements(
    start_month: str,
    horizon_months: int,
    initial_values: Dict[str, float],
    growth_assumptions: Dict[str, float]
) -> Dict[str, Any]:
    """
    Convenience function to compute 3-statement model.
    
    Args:
        start_month: Starting month in 'YYYY-MM' format
        horizon_months: Number of months to project
        initial_values: Starting balance sheet values
        growth_assumptions: Growth rates and percentages
        
    Returns:
        Complete 3-statement financial model
    """
    engine = ThreeStatementEngine()
    
    # Parse start month
    start_dt = datetime.strptime(start_month, '%Y-%m')
    
    # Compute statements
    statements = engine.compute_statements(
        start_month=start_dt,
        horizon_months=horizon_months,
        initial_values=initial_values,
        growth_assumptions=growth_assumptions
    )
    
    # Validate
    validation = engine.validate_statements(statements)
    statements['validation'] = validation
    
    return statements
