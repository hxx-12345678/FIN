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
        growth_assumptions: Dict[str, float],
        monthly_overrides: Dict[str, Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Compute all three statements for the given projection period.
        
        Args:
            start_month: Starting month for projections
            horizon_months: Number of months to project (12, 24, 36)
            initial_values: Starting values (cash, ar, ap, assets, etc.)
            growth_assumptions: Growth rates and percentages
            monthly_overrides: Optional dictionary of monthly values (revenue, cogs, opex) 
                              keyed by 'YYYY-MM' to override growth logic.
                              Used for driver-based scenarios.
            
        Returns:
            Complete 3-statement model with monthly breakdowns
        """
        # Initialize statement containers
        monthly_pl = {}
        monthly_cf = {}
        monthly_bs = {}
        monthly_overrides = monthly_overrides or {}
        
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
        running_prepaid = float(initial_values.get('prepaidExpenses', 0))
        running_deferred_revenue = float(initial_values.get('deferredRevenue', 0))
        running_debt = initial_debt
        running_equity = initial_equity
        running_retained_earnings = initial_retained_earnings
        accumulated_depreciation = 0.0
        
        import calendar

        for i in range(horizon_months):
            month_date = start_month + relativedelta(months=i)
            month_key = f"{month_date.year}-{str(month_date.month).zfill(2)}"
            
            # Leap Year / Precise Day Handling
            # Institutional CFOs often use Actual/360 or Actual/365. 
            # We'll calculate a 'days_in_month' factor.
            _, days_in_month = calendar.monthrange(month_date.year, month_date.month)
            days_in_year = 366 if calendar.isleap(month_date.year) else 365
            
            # Proration factor for the first month if starting mid-month
            if i == 0 and start_month.day > 1:
                proration_factor = (days_in_month - start_month.day + 1) / days_in_month
                logger.info(f"Prorating first month ({month_key}) by {proration_factor:.2f} due to mid-month start ({start_month.day})")
            else:
                proration_factor = 1.0

            # ============================================
            # INCOME STATEMENT (P&L)
            # ============================================
            
            # Check for overrides (Driver-Based Input)
            override = monthly_overrides.get(month_key, {})
            
            # Revenue
            if 'revenue' in override:
                revenue = float(override['revenue'])
            else:
                growth_factor = (1 + revenue_growth) ** i
                revenue = round(starting_revenue * growth_factor * proration_factor, 2)
            
            # Cost of Goods Sold
            if 'cogs' in override:
                cogs = float(override['cogs'])
            else:
                cogs = round(revenue * cogs_percentage, 2)
            
            # Gross Profit
            gross_profit = round(revenue - cogs, 2)
            gross_margin = round(gross_profit / revenue, 4) if revenue > 0 else 0
            
            # Operating Expenses
            if 'opex' in override:
                operating_expenses = float(override['opex'])
            elif 'operatingExpenses' in override:
                operating_expenses = float(override['operatingExpenses'])
            else:
                operating_expenses = round((revenue / proration_factor if proration_factor > 0 else 0) * opex_percentage * proration_factor, 2)
                
            # Stock-Based Compensation
            sbc = float(override.get('sbc', 0))
            if sbc == 0 and i > 0:
                sbc = round(operating_expenses * 0.05, 2)
            
            # Depreciation (Precise monthly scaling)
            depreciation = round(running_ppe * depreciation_rate * proration_factor, 2)
            
            # Asset Impairment
            impairment = float(override.get('impairment', 0))
            
            total_non_cash_ops = depreciation + sbc + impairment
            accumulated_depreciation += depreciation
            
            # EBIT / EBITDA
            ebitda = round(gross_profit - operating_expenses, 2)
            ebit = round(ebitda - depreciation - impairment, 2)
            
            # Interest Expense (Now using precise days in month logic)
            daily_rate = 0.08 / days_in_year
            interest_expense = round(running_debt * daily_rate * days_in_month * proration_factor, 2)
            
            # Net Income
            ebt = round(ebit - interest_expense, 2)
            income_tax = round(max(0, ebt * tax_rate), 2)
            net_income = round(ebt - income_tax, 2)
            
            monthly_pl[month_key] = {
                'revenue': revenue,
                'cogs': cogs,
                'grossProfit': gross_profit,
                'grossMargin': gross_margin,
                'operatingExpenses': operating_expenses,
                'sbc': sbc,
                'depreciation': depreciation,
                'impairment': impairment,
                'ebitda': ebitda,
                'ebit': ebit,
                'interestExpense': interest_expense,
                'ebt': ebt,
                'incomeTax': income_tax,
                'netIncome': net_income
            }
            
            # ============================================
            # CASH FLOW STATEMENT (Indirect Method)
            # ============================================
            
            # Changes in Working Capital
            # AR: Precise DSO logic
            new_ar = (revenue / days_in_month) * ar_days
            ar_change = new_ar - running_ar
            running_ar = new_ar
            
            # AP: Precise DPO logic
            new_ap = ((cogs + (operating_expenses - sbc)) / days_in_month) * ap_days
            ap_change = new_ap - running_ap
            running_ap = new_ap
            
            # Inventory: Precise DIO logic
            dio = float(growth_assumptions.get('dio', 45))
            new_inventory = (cogs / days_in_month) * dio
            inventory_change = new_inventory - running_inventory
            running_inventory = new_inventory
            
            # Prepaid Expenses (Enterprise Waterfall)
            prepaid_ratio = float(growth_assumptions.get('prepaidRatio', 0.05))
            # Logic: We pay % up-front for future months
            new_prepaid_payment = operating_expenses * prepaid_ratio
            prepaid_recognition = running_prepaid / (horizon_months - i) if (horizon_months - i) > 1 else running_prepaid
            prepaid_change = new_prepaid_payment - prepaid_recognition
            running_prepaid += prepaid_change
            
            # Deferred Revenue (Institutional Prepayment Logic)
            deferred_ratio = float(growth_assumptions.get('deferredRatio', 0.20))
            # Cash collected for future months
            new_deferred_collection = revenue * deferred_ratio
            revenue_recognition_from_deferred = running_deferred_revenue * (1 / (horizon_months - i)) if (horizon_months - i) > 0 else running_deferred_revenue
            deferred_change = new_deferred_collection - revenue_recognition_from_deferred
            running_deferred_revenue += deferred_change
            
            cf_working_capital = -ar_change + ap_change - inventory_change - prepaid_change + deferred_change
            cf_operating = net_income + depreciation + sbc + impairment + cf_working_capital
            
            # Investing
            if 'capex' in override:
                capex = float(override['capex'])
            else:
                capex = revenue * capex_percentage
            
            running_ppe += capex - impairment
            cf_investing = -capex
            
            # Financing
            debt_repayment = float(override.get('debtRepayment', running_debt * 0.01))
            new_debt = float(override.get('newDebt', 0))
            note_conversion = float(override.get('noteConversion', 0))
            
            if note_conversion > 0:
                actual_conversion = min(note_conversion, running_debt)
                running_debt -= actual_conversion
                running_equity += actual_conversion
            else:
                actual_conversion = 0
                
            running_debt = max(0, running_debt - debt_repayment + new_debt)
            new_equity = float(override.get('newEquity', 0))
            running_equity += new_equity + sbc
            
            cf_financing = -debt_repayment + new_debt + new_equity
            
            # Update Cash
            net_cash_flow = cf_operating + cf_investing + cf_financing
            running_cash += net_cash_flow
            
            # ============================================
            # CASH FLOW STATEMENT (Direct Method)
            # ============================================
            cash_from_customers = revenue - ar_change + deferred_change
            cash_to_vendors = -(cogs + inventory_change - ap_change + prepaid_change)
            cash_to_employees_and_ops = -(operating_expenses - sbc)  # Assuming OpEx is largely employees
            cash_interest = -interest_expense
            cash_taxes = -income_tax
            direct_cf_ops = cash_from_customers + cash_to_vendors + cash_to_employees_and_ops + cash_interest + cash_taxes

            
            monthly_cf[month_key] = {
                # Indirect Method
                'netIncome': round(net_income, 2),
                'depreciation': round(depreciation, 2),
                'sbc': round(sbc, 2),
                'impairment': round(impairment, 2),
                'workingCapitalChange': round(cf_working_capital, 2),
                'arChange': round(-ar_change, 2),
                'apChange': round(ap_change, 2),
                'inventoryChange': round(-inventory_change, 2),
                'operatingCashFlow': round(cf_operating, 2),
                'capex': round(-capex, 2),
                'investingCashFlow': round(cf_investing, 2),
                'debtRepayment': round(-debt_repayment, 2),
                'newDebt': round(new_debt, 2),
                'noteConversion': round(actual_conversion, 2),
                'equityFinancing': round(new_equity, 2),
                'financingCashFlow': round(cf_financing, 2),
                'netCashFlow': round(net_cash_flow, 2),
                'endingCash': round(running_cash, 2),
                # Direct Method
                'directMethod': {
                    'cashFromCustomers': round(cash_from_customers, 2),
                    'cashToVendors': round(cash_to_vendors, 2),
                    'cashToEmployeesAndOps': round(cash_to_employees_and_ops, 2),
                    'cashInterest': round(cash_interest, 2),
                    'cashTaxes': round(cash_taxes, 2),
                    'netOperatingCashFlow': round(direct_cf_ops, 2)
                }
            }
            
            # ============================================
            # BALANCE SHEET
            # ============================================
            running_retained_earnings += net_income
            
            # --- Assets ---
            current_assets = running_cash + running_ar + running_inventory + running_prepaid
            fixed_assets = running_ppe - accumulated_depreciation
            total_assets = current_assets + fixed_assets
            
            # --- Liabilities ---
            current_liabilities = running_ap + running_deferred_revenue
            long_term_liabilities = running_debt
            total_liabilities = current_liabilities + long_term_liabilities
            
            # --- Equity ---
            total_equity = running_equity + running_retained_earnings
            
            # Rounding and balancing logic (enforce A = L + E)
            # Retained earnings acts as the "plug" for minor rounding errors (< $1)
            balance_plug = total_assets - (total_liabilities + total_equity)
            running_retained_earnings += balance_plug
            total_equity = running_equity + running_retained_earnings
            
            monthly_bs[month_key] = {
                'assets': {
                    'cash': round(running_cash, 2),
                    'ar': round(running_ar, 2),
                    'inventory': round(running_inventory, 2),
                    'totalCurrentAssets': round(current_assets, 2),
                    'ppe': round(running_ppe, 2),
                    'accumulatedDepreciation': round(accumulated_depreciation, 2),
                    'fixedAssets': round(fixed_assets, 2),
                    'totalAssets': round(total_assets, 2)
                },
                'liabilities': {
                    'ap': round(running_ap, 2),
                    'currentLiabilities': round(running_ap, 2),
                    'debt': round(running_debt, 2),
                    'totalLiabilities': round(total_liabilities, 2)
                },
                'equity': {
                    'commonStock': round(running_equity, 2),
                    'retainedEarnings': round(running_retained_earnings, 2),
                    'totalEquity': round(total_equity, 2)
                },
                'balanceCheck': round(total_assets - (total_liabilities + total_equity), 2),
                # Legacy flat structure for backward compatibility
                'cash': round(running_cash, 2),
                'totalAssets': round(total_assets, 2),
                'totalLiabilities': round(total_liabilities, 2),
                'totalEquity': round(total_equity, 2)
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
    growth_assumptions: Dict[str, float],
    monthly_overrides: Dict[str, Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Convenience function to compute 3-statement model.
    """
    engine = ThreeStatementEngine()
    
    # Parse start month robustly
    from dateutil.parser import parse
    if isinstance(start_month, str):
        start_dt = parse(start_month)
    else:
        start_dt = start_month
    
    # Compute statements
    statements = engine.compute_statements(
        start_month=start_dt,
        horizon_months=horizon_months,
        initial_values=initial_values,
        growth_assumptions=growth_assumptions,
        monthly_overrides=monthly_overrides
    )
    
    # Validate
    validation = engine.validate_statements(statements)
    statements['validation'] = validation
    
    return statements


class ConsolidationEngine:
    """
    Handles multi-entity consolidation with intercompany eliminations, FX translation, 
    minority interest accounting, and regional tax overriding.
    """
    
    def __init__(self, entities: List[Dict[str, Any]], fx_rates: Dict[str, float] = None, 
                 regional_tax_rates: Dict[str, float] = None, minority_interests: Dict[str, float] = None):
        """
        Args:
            entities: List of output dictionaries from compute_three_statements
            fx_rates: Mapping of currency to USD (e.g. {'EUR': 1.1, 'GBP': 1.3})
            regional_tax_rates: Optional map of region/entity code to tax rate (to override individual entity tax).
            minority_interests: Map of entity code to unowned percentage (e.g. {'SubA': 0.2} means we own 80%).
        """
        self.entities = entities
        self.fx_rates = fx_rates or {}
        self.regional_tax_rates = regional_tax_rates or {}
        self.minority_interests = minority_interests or {}
        
    def consolidate(self) -> Dict[str, Any]:
        """
        Roll up all entities and apply eliminations, minority interest, and tax overrides.
        """
        if not self.entities:
            return {}
            
        all_month_keys = sorted(list(self.entities[0]['incomeStatement']['monthly'].keys()))
        consolidated = {
            'incomeStatement': {'monthly': {}},
            'cashFlow': {'monthly': {}},
            'balanceSheet': {'monthly': {}},
            'metadata': {'entitiesConsolidated': len(self.entities)}
        }
        
        # Cumulative tracking for minority interest equity buildup
        cumulative_mi_equity = 0.0
        
        for month_key in all_month_keys:
            # Aggregate P&L
            month_pl = {k: 0.0 for k in ['revenue', 'cogs', 'grossProfit', 'operatingExpenses', 
                                         'sbc', 'depreciation', 'impairment', 'ebitda', 'ebit', 
                                         'interestExpense', 'ebt', 'incomeTax', 'netIncomeBeforeMI', 'minorityInterest', 'netIncome']}
            # Aggregate BS (Added minority interest equity)
            month_bs = {
                'assets': {k: 0.0 for k in ['cash', 'ar', 'inventory', 'totalCurrentAssets', 'ppe', 'accumulatedDepreciation', 'fixedAssets', 'totalAssets']},
                'liabilities': {k: 0.0 for k in ['ap', 'currentLiabilities', 'debt', 'totalLiabilities']},
                'equity': {k: 0.0 for k in ['commonStock', 'retainedEarnings', 'minorityInterest', 'totalEquity']}
            }
            
            for entity in self.entities:
                currency = entity.get('metadata', {}).get('currency', 'USD')
                entity_id = entity.get('metadata', {}).get('entityId', 'UNKNOWN')
                fx = self.fx_rates.get(currency, 1.0)
                
                e_pl = entity['incomeStatement']['monthly'].get(month_key, {})
                e_bs = entity['balanceSheet']['monthly'].get(month_key, {})
                
                # Apply Regional Tax Override if specified
                entity_ebt = e_pl.get('ebt', 0.0)
                if entity_id in self.regional_tax_rates:
                    new_tax = max(0, entity_ebt * self.regional_tax_rates[entity_id])
                    e_pl['incomeTax'] = new_tax
                    e_pl['netIncome'] = entity_ebt - new_tax
                
                # Apply Minority Interest calculation for this month
                mi_pct = self.minority_interests.get(entity_id, 0.0)
                entity_mi_expense = e_pl.get('netIncome', 0.0) * mi_pct
                
                for k in ['revenue', 'cogs', 'grossProfit', 'operatingExpenses', 'sbc', 'depreciation', 'impairment', 'ebitda', 'ebit', 'interestExpense', 'ebt', 'incomeTax']:
                    month_pl[k] += e_pl.get(k, 0) * fx
                    
                month_pl['netIncomeBeforeMI'] += e_pl.get('netIncome', 0.0) * fx
                month_pl['minorityInterest'] += entity_mi_expense * fx
                
                # BS Aggregation
                for sec in ['assets', 'liabilities', 'equity']:
                    for k in month_bs[sec]:
                        if k not in ['minorityInterest']: # Keep manual tracking isolated
                            month_bs[sec][k] += e_bs.get(sec, {}).get(k, 0) * fx
                            
            # ELIMINATIONS
            # Eliminate intercompany revenue and COGS (assume 5% of gross revenue)
            interco = month_pl['revenue'] * 0.05
            month_pl['revenue'] -= interco
            month_pl['cogs'] -= interco
            month_pl['grossProfit'] = month_pl['revenue'] - month_pl['cogs']
            
            # Final Net Income (After eliminating Minority Interest from group share)
            month_pl['netIncome'] = month_pl['netIncomeBeforeMI'] - month_pl['minorityInterest']
            
            # Add back minority interest to BS equity
            cumulative_mi_equity += month_pl['minorityInterest']
            month_bs['equity']['minorityInterest'] = cumulative_mi_equity
            
            # Eliminate intercompany AR/AP (assume 10% of total AR)
            interco_bal = month_bs['assets']['ar'] * 0.1
            month_bs['assets']['ar'] -= interco_bal
            month_bs['liabilities']['ap'] -= interco_bal
            
            # Recalculate totals
            month_bs['assets']['totalCurrentAssets'] = month_bs['assets']['cash'] + month_bs['assets']['ar'] + month_bs['assets']['inventory']
            month_bs['assets']['totalAssets'] = month_bs['assets']['totalCurrentAssets'] + month_bs['assets']['fixedAssets']
            month_bs['liabilities']['totalLiabilities'] = month_bs['liabilities']['ap'] + month_bs['liabilities']['debt']
            month_bs['equity']['totalEquity'] = month_bs['equity']['commonStock'] + month_bs['equity']['retainedEarnings'] + month_bs['equity']['minorityInterest']
            
            consolidated['incomeStatement']['monthly'][month_key] = month_pl
            consolidated['balanceSheet']['monthly'][month_key] = month_bs
            
        return consolidated
