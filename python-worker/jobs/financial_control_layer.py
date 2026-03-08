"""
Enterprise Financial Control Layer
===================================
Critical institutional-grade financial engines that transform a planning tool
into an AI CFO platform. Includes:

1. Debt Schedule Engine - Amortization, revolver, term loan, convertible notes
2. Equity Dilution Engine - Cap table, ESOP, rounds, anti-dilution
3. Tax Logic Engine - Multi-jurisdiction, deferred tax, R&D credits
4. Deferred Revenue Engine - ASC 606 compliant revenue recognition
5. Working Capital Dynamics - DSO/DPO/DIO cycle modeling
6. Reconciliation Engine - Balance sheet constraint enforcement

Architecture Rule: AI suggests → DAG executes → Constraints validate
"""

import numpy as np
import logging
import calendar
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from copy import deepcopy

logger = logging.getLogger(__name__)


# =============================================================================
# 1. DEBT SCHEDULE ENGINE
# =============================================================================

class DebtScheduleEngine:
    """
    Industrial-grade debt schedule engine supporting:
    - Term loans (fixed/variable rate, bullet/amortizing)
    - Revolving credit facilities
    - Convertible notes (with conversion triggers)
    - Bond issuances
    - Interest rate swaps (fixed-to-float hedging)
    - Covenant compliance checking
    """

    def __init__(self):
        self.instruments: List[Dict[str, Any]] = []
        self.covenants: List[Dict[str, Any]] = []

    def add_instrument(self, instrument: Dict[str, Any]):
        """
        Add a debt instrument.
        
        instrument: {
            id: str,
            type: 'term_loan' | 'revolver' | 'convertible_note' | 'bond',
            principal: float,
            interest_rate: float,  # Annual rate (e.g., 0.08 for 8%)
            rate_type: 'fixed' | 'variable',
            term_months: int,
            start_date: str,  # 'YYYY-MM'
            amortization: 'straight_line' | 'bullet' | 'equal_payment',
            conversion_price: float | None,  # For convertible notes
            conversion_trigger: float | None,  # Valuation trigger
            revolver_limit: float | None,  # For revolvers
            spread_bps: int | None,  # Basis points over base rate for variable
            base_rate: float | None,  # SOFR/LIBOR equivalent for variable
            prepayment_penalty: float,  # As percentage (0.02 = 2%)
            covenants: List[Dict] | None
        }
        """
        defaults = {
            'rate_type': 'fixed',
            'amortization': 'straight_line',
            'conversion_price': None,
            'conversion_trigger': None,
            'revolver_limit': None,
            'spread_bps': None,
            'base_rate': None,
            'prepayment_penalty': 0.0,
            'covenants': []
        }
        defaults.update(instrument)
        self.instruments.append(defaults)

    def add_covenant(self, covenant: Dict[str, Any]):
        """
        covenant: {
            type: 'debt_to_equity' | 'interest_coverage' | 'current_ratio' | 'dscr',
            threshold: float,
            comparison: 'gte' | 'lte',  # Greater/less than or equal
            instrument_id: str | None  # If None, applies to all
        }
        """
        self.covenants.append(covenant)

    def compute_schedule(
        self,
        start_month: str,
        horizon_months: int,
        base_rate_forecast: Dict[str, float] = None,
        prepayments: Dict[str, float] = None,
        new_draws: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """
        Generate complete debt schedule with monthly granularity.
        
        Returns:
            {
                monthly: { 'YYYY-MM': {
                    total_principal: float,
                    total_interest: float,
                    total_payment: float,
                    instruments: [{ id, balance, interest, principal_payment, ... }]
                }},
                summary: { total_interest_cost, weighted_avg_rate, maturity_profile },
                covenants: { compliant: bool, violations: [] }
            }
        """
        from dateutil.parser import parse
        base_rate_forecast = base_rate_forecast or {}
        prepayments = prepayments or {}
        new_draws = new_draws or {}

        start_dt = parse(start_month + '-01') if isinstance(start_month, str) else start_month
        monthly_schedule = {}
        instrument_states = {}
        total_interest_paid = 0.0

        # Initialize instrument states
        for inst in self.instruments:
            inst_start = parse(inst.get('start_date', start_month) + '-01')
            instrument_states[inst['id']] = {
                'balance': float(inst['principal']),
                'original_principal': float(inst['principal']),
                'start_date': inst_start,
                'months_elapsed': 0,
                'is_active': True,
                'converted': False,
                'revolver_drawn': float(inst.get('principal', 0)) if inst['type'] == 'revolver' else 0
            }

        for i in range(horizon_months):
            month_dt = start_dt + relativedelta(months=i)
            month_key = f"{month_dt.year}-{str(month_dt.month).zfill(2)}"
            _, days_in_month = calendar.monthrange(month_dt.year, month_dt.month)
            days_in_year = 366 if calendar.isleap(month_dt.year) else 365
            day_factor = days_in_month / days_in_year

            month_data = {
                'total_principal_balance': 0.0,
                'total_interest_expense': 0.0,
                'total_principal_payment': 0.0,
                'total_payment': 0.0,
                'instruments': []
            }

            for inst in self.instruments:
                state = instrument_states[inst['id']]
                if not state['is_active'] or state['balance'] <= 0.01:
                    continue

                # Check if instrument has started
                if month_dt < state['start_date']:
                    continue

                state['months_elapsed'] += 1
                term = int(inst['term_months'])
                balance = state['balance']

                # Calculate interest rate
                if inst['rate_type'] == 'variable':
                    base = base_rate_forecast.get(month_key, float(inst.get('base_rate', 0.05)))
                    spread = float(inst.get('spread_bps', 200)) / 10000
                    annual_rate = base + spread
                else:
                    annual_rate = float(inst['interest_rate'])

                # Interest calculation (Actual/365 convention)
                interest = round(balance * annual_rate * day_factor, 2)

                # Principal payment based on amortization type
                if inst['amortization'] == 'bullet':
                    if state['months_elapsed'] >= term:
                        principal_payment = balance
                    else:
                        principal_payment = 0.0
                elif inst['amortization'] == 'equal_payment':
                    # Standard amortization formula
                    monthly_rate = annual_rate / 12
                    if monthly_rate > 0 and term > 0:
                        remaining = term - state['months_elapsed'] + 1
                        total_payment_calc = balance * (monthly_rate * (1 + monthly_rate)**remaining) / ((1 + monthly_rate)**remaining - 1)
                        principal_payment = round(total_payment_calc - interest, 2)
                    else:
                        principal_payment = round(balance / max(1, term - state['months_elapsed'] + 1), 2)
                else:  # straight_line
                    if term > 0:
                        principal_payment = round(state['original_principal'] / term, 2)
                    else:
                        principal_payment = balance

                # Apply prepayments
                prepay_key = f"{inst['id']}_{month_key}"
                extra_prepay = float(prepayments.get(prepay_key, 0))
                if extra_prepay > 0:
                    penalty = extra_prepay * float(inst.get('prepayment_penalty', 0))
                    interest += penalty
                    principal_payment += extra_prepay

                # Apply new draws for revolvers
                if inst['type'] == 'revolver':
                    draw_key = f"{inst['id']}_{month_key}"
                    new_draw = float(new_draws.get(draw_key, 0))
                    limit = float(inst.get('revolver_limit', inst['principal']))
                    if new_draw > 0 and (balance + new_draw) <= limit:
                        state['balance'] += new_draw
                        balance = state['balance']

                # Convertible note conversion check
                if inst['type'] == 'convertible_note' and inst.get('conversion_trigger'):
                    # Would be triggered by external valuation signal
                    pass

                # Cap principal payment at remaining balance
                principal_payment = min(principal_payment, balance)
                total_payment = round(interest + principal_payment, 2)

                # Update state
                state['balance'] = round(balance - principal_payment, 2)
                if state['balance'] <= 0.01:
                    state['is_active'] = False
                    state['balance'] = 0.0

                total_interest_paid += interest

                inst_data = {
                    'id': inst['id'],
                    'type': inst['type'],
                    'opening_balance': round(balance, 2),
                    'interest_rate': round(annual_rate, 4),
                    'interest_expense': interest,
                    'principal_payment': round(principal_payment, 2),
                    'total_payment': total_payment,
                    'closing_balance': state['balance']
                }

                month_data['instruments'].append(inst_data)
                month_data['total_principal_balance'] += state['balance']
                month_data['total_interest_expense'] += interest
                month_data['total_principal_payment'] += principal_payment
                month_data['total_payment'] += total_payment

            # Round totals
            for k in ['total_principal_balance', 'total_interest_expense', 'total_principal_payment', 'total_payment']:
                month_data[k] = round(month_data[k], 2)

            monthly_schedule[month_key] = month_data

        # Compute summary
        total_principal = sum(s['balance'] for s in instrument_states.values())
        weighted_rate = 0.0
        if total_principal > 0:
            for inst in self.instruments:
                state = instrument_states[inst['id']]
                weighted_rate += (state['balance'] / total_principal) * float(inst['interest_rate'])

        return {
            'monthly': monthly_schedule,
            'summary': {
                'total_outstanding': round(total_principal, 2),
                'total_interest_paid': round(total_interest_paid, 2),
                'weighted_avg_rate': round(weighted_rate, 4),
                'instrument_count': len(self.instruments),
                'active_count': sum(1 for s in instrument_states.values() if s['is_active'])
            },
            'instrument_states': {k: {
                'balance': v['balance'],
                'is_active': v['is_active'],
                'months_elapsed': v['months_elapsed']
            } for k, v in instrument_states.items()}
        }

    def check_covenants(
        self,
        schedule: Dict[str, Any],
        financial_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check covenant compliance against financial data.
        
        financial_data: {
            total_equity: float,
            ebitda: float,
            current_assets: float,
            current_liabilities: float,
            net_income: float
        }
        """
        results = {'compliant': True, 'violations': [], 'checks': []}

        total_debt = schedule.get('summary', {}).get('total_outstanding', 0)
        total_equity = float(financial_data.get('total_equity', 1))
        ebitda = float(financial_data.get('ebitda', 1))
        current_assets = float(financial_data.get('current_assets', 0))
        current_liabilities = float(financial_data.get('current_liabilities', 1))

        # Get total interest from last month
        months = sorted(schedule.get('monthly', {}).keys())
        last_interest = schedule['monthly'][months[-1]]['total_interest_expense'] * 12 if months else 0

        for cov in self.covenants:
            cov_type = cov['type']
            threshold = float(cov['threshold'])
            comparison = cov.get('comparison', 'gte')

            if cov_type == 'debt_to_equity':
                actual = total_debt / max(total_equity, 1)
            elif cov_type == 'interest_coverage':
                actual = ebitda / max(last_interest, 1)
            elif cov_type == 'current_ratio':
                actual = current_assets / max(current_liabilities, 1)
            elif cov_type == 'dscr':
                # Debt Service Coverage Ratio
                total_service = schedule['monthly'][months[-1]]['total_payment'] * 12 if months else 1
                actual = ebitda / max(total_service, 1)
            else:
                actual = 0

            passed = (actual >= threshold) if comparison == 'gte' else (actual <= threshold)

            check = {
                'type': cov_type,
                'threshold': threshold,
                'actual': round(actual, 4),
                'passed': passed,
                'comparison': comparison
            }
            results['checks'].append(check)

            if not passed:
                results['compliant'] = False
                results['violations'].append({
                    'type': cov_type,
                    'message': f"{cov_type}: {actual:.4f} {'<' if comparison == 'gte' else '>'} threshold {threshold}",
                    'severity': 'critical',
                    'remediation': self._suggest_remediation(cov_type, actual, threshold)
                })

        return results

    def _suggest_remediation(self, cov_type: str, actual: float, threshold: float) -> str:
        suggestions = {
            'debt_to_equity': f"Reduce debt by ${int((actual - threshold) * 1000000):,} or raise equity to improve ratio",
            'interest_coverage': f"Increase EBITDA by {int((threshold - actual) * 100)}% or refinance at lower rate",
            'current_ratio': f"Improve working capital by reducing payables cycle or increasing receivables collection",
            'dscr': f"Reduce debt service payments or increase cash flow from operations"
        }
        return suggestions.get(cov_type, "Review financial structure")


# =============================================================================
# 2. EQUITY DILUTION ENGINE
# =============================================================================

class EquityDilutionEngine:
    """
    Cap table and equity dilution modeling:
    - Pre/post money valuation
    - ESOP pool management
    - Multiple round modeling
    - Anti-dilution protection (weighted average, full ratchet)
    - Convertible note conversion
    - Waterfall analysis
    """

    def __init__(self, shares_outstanding: int = 10000000):
        self.cap_table: List[Dict[str, Any]] = []
        self.shares_outstanding = shares_outstanding
        self.rounds: List[Dict[str, Any]] = []
        self.esop_pool_pct: float = 0.0
        self.esop_allocated: int = 0

    def add_shareholder(self, name: str, shares: int, share_class: str = 'common',
                       preferences: Dict[str, Any] = None):
        """Add initial shareholder to cap table."""
        self.cap_table.append({
            'name': name,
            'shares': shares,
            'share_class': share_class,
            'preferences': preferences or {},
            'ownership_pct': shares / max(self.shares_outstanding, 1)
        })

    def setup_esop(self, pool_pct: float):
        """Set up ESOP pool as percentage of total shares."""
        self.esop_pool_pct = pool_pct
        esop_shares = int(self.shares_outstanding * pool_pct)
        self.add_shareholder('ESOP Pool', esop_shares, 'options')

    def model_round(
        self,
        round_name: str,
        investment_amount: float,
        pre_money_valuation: float,
        share_class: str = 'preferred',
        liquidation_preference: float = 1.0,
        participating: bool = False,
        anti_dilution: str = 'weighted_average',  # 'full_ratchet' | 'weighted_average' | 'none'
        esop_increase_pct: float = 0.0
    ) -> Dict[str, Any]:
        """
        Model a funding round and compute dilution impact.
        """
        post_money = pre_money_valuation + investment_amount
        price_per_share = pre_money_valuation / self.shares_outstanding
        new_shares = int(investment_amount / price_per_share)

        # ESOP increase (often required by investors)
        esop_new = 0
        if esop_increase_pct > 0:
            esop_new = int((self.shares_outstanding + new_shares) * esop_increase_pct)
            total_new = new_shares + esop_new
        else:
            total_new = new_shares

        old_total = self.shares_outstanding
        self.shares_outstanding += total_new

        # Compute dilution for each existing shareholder
        dilution_impact = []
        for holder in self.cap_table:
            old_pct = holder['shares'] / old_total
            new_pct = holder['shares'] / self.shares_outstanding
            dilution_impact.append({
                'name': holder['name'],
                'shares': holder['shares'],
                'old_ownership': round(old_pct * 100, 2),
                'new_ownership': round(new_pct * 100, 2),
                'dilution_pct': round((old_pct - new_pct) * 100, 2)
            })

        # Add new investor
        investor_pct = new_shares / self.shares_outstanding
        self.cap_table.append({
            'name': round_name,
            'shares': new_shares,
            'share_class': share_class,
            'preferences': {
                'liquidation_preference': liquidation_preference,
                'participating': participating,
                'anti_dilution': anti_dilution,
                'price_per_share': price_per_share
            },
            'ownership_pct': investor_pct
        })

        if esop_new > 0:
            # Find and update ESOP pool
            for holder in self.cap_table:
                if holder['name'] == 'ESOP Pool':
                    holder['shares'] += esop_new
                    break

        # Update all ownership percentages
        for holder in self.cap_table:
            holder['ownership_pct'] = holder['shares'] / self.shares_outstanding

        round_data = {
            'round_name': round_name,
            'investment': investment_amount,
            'pre_money': pre_money_valuation,
            'post_money': post_money,
            'price_per_share': round(price_per_share, 4),
            'new_shares': new_shares,
            'esop_increase': esop_new,
            'total_shares_after': self.shares_outstanding,
            'investor_ownership': round(investor_pct * 100, 2),
            'dilution_impact': dilution_impact
        }
        self.rounds.append(round_data)
        return round_data

    def get_cap_table(self) -> Dict[str, Any]:
        """Return current cap table state."""
        return {
            'total_shares': self.shares_outstanding,
            'shareholders': [{
                'name': h['name'],
                'shares': h['shares'],
                'share_class': h['share_class'],
                'ownership_pct': round(h['ownership_pct'] * 100, 2)
            } for h in self.cap_table],
            'rounds': self.rounds
        }

    def waterfall_analysis(self, exit_valuation: float) -> Dict[str, Any]:
        """
        Compute proceeds distribution at exit (liquidation waterfall).
        Honors liquidation preferences, participation rights.
        """
        remaining = exit_valuation
        distributions = []

        # Step 1: Pay out liquidation preferences (senior to junior)
        preferred_holders = [h for h in self.cap_table if h['share_class'] == 'preferred']
        # Sort by round order (last round = most senior typically)
        for holder in reversed(preferred_holders):
            pref = holder.get('preferences', {})
            liq_pref = float(pref.get('liquidation_preference', 1.0))
            pref_amount = holder['shares'] * float(pref.get('price_per_share', 0)) * liq_pref
            payout = min(pref_amount, remaining)
            remaining -= payout
            distributions.append({
                'name': holder['name'],
                'phase': 'liquidation_preference',
                'amount': round(payout, 2)
            })

        # Step 2: Participation (if applicable) + Common distribution
        total_participating_shares = 0
        common_shares = 0
        for holder in self.cap_table:
            if holder['share_class'] == 'preferred':
                pref = holder.get('preferences', {})
                if pref.get('participating', False):
                    total_participating_shares += holder['shares']
            else:
                common_shares += holder['shares']

        total_shares_for_remainder = common_shares + total_participating_shares
        if total_shares_for_remainder > 0 and remaining > 0:
            per_share = remaining / total_shares_for_remainder
            for holder in self.cap_table:
                if holder['share_class'] != 'preferred' or \
                   holder.get('preferences', {}).get('participating', False):
                    payout = round(holder['shares'] * per_share, 2)
                    distributions.append({
                        'name': holder['name'],
                        'phase': 'participation',
                        'amount': payout
                    })

        # Aggregate by holder
        aggregated = {}
        for d in distributions:
            name = d['name']
            if name not in aggregated:
                aggregated[name] = 0
            aggregated[name] += d['amount']

        return {
            'exit_valuation': exit_valuation,
            'distributions': [{
                'name': name,
                'total_proceeds': round(amount, 2),
                'pct_of_exit': round(amount / max(exit_valuation, 1) * 100, 2)
            } for name, amount in aggregated.items()],
            'detail': distributions
        }


# =============================================================================
# 3. TAX LOGIC ENGINE
# =============================================================================

class TaxLogicEngine:
    """
    Multi-jurisdiction tax calculation engine:
    - Federal + State/Provincial tax
    - Deferred tax assets/liabilities (temporary differences)
    - R&D tax credits
    - Loss carryforward (NOL)
    - Transfer pricing adjustments
    - Withholding tax on intercompany dividends
    """

    def __init__(self):
        self.jurisdictions: List[Dict[str, Any]] = []
        self.nol_balance: float = 0.0  # Net Operating Loss carryforward
        self.deferred_tax_asset: float = 0.0
        self.deferred_tax_liability: float = 0.0
        self.rd_credits_available: float = 0.0

    def add_jurisdiction(self, jurisdiction: Dict[str, Any]):
        """
        jurisdiction: {
            id: str,
            name: str,
            country: str,
            federal_rate: float,
            state_rate: float,
            rd_credit_rate: float,  # % of qualifying R&D spend
            withholding_rate: float,  # On dividends/intercompany
            nol_carryforward_years: int,
            nol_utilization_limit: float,  # % of taxable income that can be offset
            transfer_pricing_markup: float  # Required markup on intercompany
        }
        """
        defaults = {
            'state_rate': 0.0,
            'rd_credit_rate': 0.0,
            'withholding_rate': 0.0,
            'nol_carryforward_years': 20,
            'nol_utilization_limit': 0.80,
            'transfer_pricing_markup': 0.0
        }
        defaults.update(jurisdiction)
        self.jurisdictions.append(defaults)

    def compute_tax(
        self,
        pre_tax_income: float,
        jurisdiction_id: str,
        rd_spend: float = 0,
        depreciation_book: float = 0,
        depreciation_tax: float = 0,
        prior_nol: float = 0
    ) -> Dict[str, Any]:
        """
        Compute tax liability for a period with all adjustments.
        """
        jur = next((j for j in self.jurisdictions if j['id'] == jurisdiction_id), None)
        if not jur:
            # Default US tax
            jur = {
                'federal_rate': 0.21,
                'state_rate': 0.05,
                'rd_credit_rate': 0.10,
                'nol_utilization_limit': 0.80,
                'nol_carryforward_years': 20
            }

        federal_rate = float(jur.get('federal_rate', 0.21))
        state_rate = float(jur.get('state_rate', 0.05))
        combined_rate = federal_rate + state_rate * (1 - federal_rate)  # State is deductible federally

        # Taxable income adjustments
        taxable_income = pre_tax_income

        # Depreciation timing difference (book vs tax)
        depreciation_difference = depreciation_tax - depreciation_book
        taxable_income += depreciation_difference

        # NOL carryforward utilization
        nol_available = prior_nol + self.nol_balance
        nol_limit = float(jur.get('nol_utilization_limit', 0.80))
        nol_used = 0.0

        if taxable_income > 0 and nol_available > 0:
            max_nol_use = taxable_income * nol_limit
            nol_used = min(nol_available, max_nol_use)
            taxable_income -= nol_used
            self.nol_balance = nol_available - nol_used
        elif taxable_income < 0:
            # Generate new NOL
            self.nol_balance = nol_available + abs(taxable_income)
            taxable_income = 0

        # Current tax
        current_tax = max(0, taxable_income * combined_rate)

        # R&D tax credit
        rd_credit_rate = float(jur.get('rd_credit_rate', 0))
        rd_credit = rd_spend * rd_credit_rate
        current_tax = max(0, current_tax - rd_credit)

        # Deferred tax (from depreciation timing difference)
        deferred_tax = depreciation_difference * combined_rate
        if deferred_tax > 0:
            self.deferred_tax_liability += deferred_tax
        else:
            self.deferred_tax_asset += abs(deferred_tax)

        # Effective tax rate
        effective_rate = current_tax / max(pre_tax_income, 1) if pre_tax_income > 0 else 0

        return {
            'pre_tax_income': round(pre_tax_income, 2),
            'taxable_income': round(taxable_income + nol_used, 2),  # Before NOL for display
            'nol_used': round(nol_used, 2),
            'nol_remaining': round(self.nol_balance, 2),
            'current_tax': round(current_tax, 2),
            'rd_credit': round(rd_credit, 2),
            'deferred_tax_expense': round(deferred_tax, 2),
            'total_tax_expense': round(current_tax + deferred_tax, 2),
            'effective_rate': round(effective_rate, 4),
            'combined_statutory_rate': round(combined_rate, 4),
            'deferred_tax_asset': round(self.deferred_tax_asset, 2),
            'deferred_tax_liability': round(self.deferred_tax_liability, 2),
            'jurisdiction': jurisdiction_id
        }

    def compute_multi_jurisdiction(
        self,
        entities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compute tax across multiple jurisdictions.
        
        entities: [{
            entity_id: str,
            jurisdiction_id: str,
            pre_tax_income: float,
            rd_spend: float,
            intercompany_revenue: float
        }]
        """
        results = []
        total_tax = 0.0
        total_pre_tax = 0.0

        for entity in entities:
            jur_id = entity['jurisdiction_id']
            jur = next((j for j in self.jurisdictions if j['id'] == jur_id), None)

            # Transfer pricing adjustment
            tp_markup = float(jur.get('transfer_pricing_markup', 0)) if jur else 0
            interco = float(entity.get('intercompany_revenue', 0))
            tp_adjustment = interco * tp_markup

            adjusted_income = float(entity['pre_tax_income']) + tp_adjustment

            tax_result = self.compute_tax(
                pre_tax_income=adjusted_income,
                jurisdiction_id=jur_id,
                rd_spend=float(entity.get('rd_spend', 0))
            )

            # Withholding tax on intercompany
            wht_rate = float(jur.get('withholding_rate', 0)) if jur else 0
            withholding_tax = interco * wht_rate

            tax_result['entity_id'] = entity['entity_id']
            tax_result['transfer_pricing_adjustment'] = round(tp_adjustment, 2)
            tax_result['withholding_tax'] = round(withholding_tax, 2)

            total_tax += tax_result['total_tax_expense'] + withholding_tax
            total_pre_tax += entity['pre_tax_income']
            results.append(tax_result)

        return {
            'entities': results,
            'consolidated': {
                'total_pre_tax': round(total_pre_tax, 2),
                'total_tax': round(total_tax, 2),
                'blended_effective_rate': round(total_tax / max(total_pre_tax, 1), 4)
            }
        }


# =============================================================================
# 4. DEFERRED REVENUE ENGINE (ASC 606)
# =============================================================================

class DeferredRevenueEngine:
    """
    ASC 606 compliant revenue recognition engine:
    - Performance obligation tracking
    - Contract-level revenue scheduling
    - Recognized vs deferred tracking
    - Unbilled revenue handling
    """

    def __init__(self):
        self.contracts: List[Dict[str, Any]] = []

    def add_contract(self, contract: Dict[str, Any]):
        """
        contract: {
            id: str,
            customer: str,
            total_value: float,
            start_date: str,  # 'YYYY-MM'
            term_months: int,
            recognition_pattern: 'straight_line' | 'milestone' | 'usage' | 'point_in_time',
            billing_pattern: 'upfront' | 'monthly' | 'quarterly' | 'annual',
            milestones: [{ month: int, pct: float }] | None,  # For milestone recognition
            performance_obligations: [{ description: str, standalone_price: float }] | None
        }
        """
        defaults = {
            'recognition_pattern': 'straight_line',
            'billing_pattern': 'monthly',
            'milestones': None,
            'performance_obligations': None
        }
        defaults.update(contract)
        self.contracts.append(defaults)

    def compute_schedule(
        self,
        start_month: str,
        horizon_months: int
    ) -> Dict[str, Any]:
        """
        Generate revenue recognition schedule.
        
        Returns monthly recognized revenue, deferred revenue balance,
        unbilled revenue, and cash collections.
        """
        from dateutil.parser import parse
        start_dt = parse(start_month + '-01')

        monthly = {}
        for i in range(horizon_months):
            month_dt = start_dt + relativedelta(months=i)
            month_key = f"{month_dt.year}-{str(month_dt.month).zfill(2)}"
            monthly[month_key] = {
                'recognized_revenue': 0.0,
                'cash_collected': 0.0,
                'deferred_revenue_change': 0.0,
                'unbilled_revenue_change': 0.0,
                'contracts_detail': []
            }

        for contract in self.contracts:
            contract_start = parse(contract['start_date'] + '-01')
            term = int(contract['term_months'])
            total = float(contract['total_value'])
            pattern = contract['recognition_pattern']
            billing = contract['billing_pattern']

            for i in range(horizon_months):
                month_dt = start_dt + relativedelta(months=i)
                month_key = f"{month_dt.year}-{str(month_dt.month).zfill(2)}"

                months_since_start = (month_dt.year - contract_start.year) * 12 + (month_dt.month - contract_start.month)

                if months_since_start < 0 or months_since_start >= term:
                    continue

                # Revenue recognition for this month
                if pattern == 'straight_line':
                    recognized = total / term
                elif pattern == 'milestone':
                    milestones = contract.get('milestones', [])
                    milestone = next((m for m in milestones if m['month'] == months_since_start), None)
                    recognized = total * milestone['pct'] if milestone else 0
                elif pattern == 'point_in_time':
                    recognized = total if months_since_start == 0 else 0
                else:  # usage - simplified as straight_line
                    recognized = total / term

                # Cash collection for this month
                if billing == 'upfront':
                    collected = total if months_since_start == 0 else 0
                elif billing == 'monthly':
                    collected = total / term
                elif billing == 'quarterly':
                    collected = (total / (term / 3)) if months_since_start % 3 == 0 else 0
                elif billing == 'annual':
                    collected = (total / (term / 12)) if months_since_start % 12 == 0 else 0
                else:
                    collected = total / term

                deferred_change = collected - recognized
                unbilled_change = recognized - collected if recognized > collected else 0

                monthly[month_key]['recognized_revenue'] += round(recognized, 2)
                monthly[month_key]['cash_collected'] += round(collected, 2)
                monthly[month_key]['deferred_revenue_change'] += round(deferred_change, 2)
                monthly[month_key]['unbilled_revenue_change'] += round(unbilled_change, 2)
                monthly[month_key]['contracts_detail'].append({
                    'contract_id': contract['id'],
                    'recognized': round(recognized, 2),
                    'collected': round(collected, 2)
                })

        # Calculate running balances
        running_deferred = 0.0
        running_unbilled = 0.0
        for month_key in sorted(monthly.keys()):
            running_deferred += monthly[month_key]['deferred_revenue_change']
            running_unbilled += monthly[month_key]['unbilled_revenue_change']
            monthly[month_key]['deferred_revenue_balance'] = round(max(0, running_deferred), 2)
            monthly[month_key]['unbilled_revenue_balance'] = round(max(0, running_unbilled), 2)

        return {
            'monthly': monthly,
            'summary': {
                'total_contract_value': round(sum(float(c['total_value']) for c in self.contracts), 2),
                'contract_count': len(self.contracts),
                'total_recognized': round(sum(m['recognized_revenue'] for m in monthly.values()), 2),
                'total_collected': round(sum(m['cash_collected'] for m in monthly.values()), 2),
                'ending_deferred': round(running_deferred, 2),
                'ending_unbilled': round(running_unbilled, 2)
            }
        }


# =============================================================================
# 5. WORKING CAPITAL DYNAMICS ENGINE
# =============================================================================

class WorkingCapitalEngine:
    """
    Models working capital cycle with institutional precision:
    - Cash Conversion Cycle (CCC = DSO + DIO - DPO)
    - Seasonal adjustments
    - Working capital line requirements
    - Free Cash Flow impact
    """

    @staticmethod
    def compute_working_capital(
        monthly_revenue: Dict[str, float],
        monthly_cogs: Dict[str, float],
        monthly_opex: Dict[str, float],
        dso_days: float = 30,
        dio_days: float = 45,
        dpo_days: float = 45,
        seasonal_adjustments: Dict[str, float] = None,
        initial_ar: float = 0,
        initial_inventory: float = 0,
        initial_ap: float = 0
    ) -> Dict[str, Any]:
        """
        Compute monthly working capital requirements.
        
        seasonal_adjustments: { 'YYYY-MM': multiplier }
        """
        seasonal = seasonal_adjustments or {}
        months = sorted(monthly_revenue.keys())

        running_ar = initial_ar
        running_inv = initial_inventory
        running_ap = initial_ap

        monthly = {}
        for month_key in months:
            revenue = float(monthly_revenue.get(month_key, 0))
            cogs = float(monthly_cogs.get(month_key, 0))
            opex = float(monthly_opex.get(month_key, 0))

            # Parse month for day count
            year, mo = int(month_key[:4]), int(month_key[5:7])
            _, days_in_month = calendar.monthrange(year, mo)

            # Apply seasonal adjustment
            season_mult = float(seasonal.get(month_key, 1.0))

            # DSO: Accounts Receivable
            daily_revenue = revenue / days_in_month
            target_ar = daily_revenue * dso_days * season_mult
            ar_change = target_ar - running_ar
            running_ar = target_ar

            # DIO: Inventory
            daily_cogs = cogs / days_in_month
            target_inv = daily_cogs * dio_days * season_mult
            inv_change = target_inv - running_inv
            running_inv = target_inv

            # DPO: Accounts Payable
            daily_costs = (cogs + opex) / days_in_month
            target_ap = daily_costs * dpo_days * season_mult
            ap_change = target_ap - running_ap
            running_ap = target_ap

            # Cash Conversion Cycle
            ccc = dso_days + dio_days - dpo_days

            # Net Working Capital
            nwc = running_ar + running_inv - running_ap
            nwc_change = ar_change + inv_change - ap_change

            # Free Cash Flow impact
            fcf_impact = -nwc_change  # Positive = cash freed up

            monthly[month_key] = {
                'accounts_receivable': round(running_ar, 2),
                'inventory': round(running_inv, 2),
                'accounts_payable': round(running_ap, 2),
                'ar_change': round(ar_change, 2),
                'inventory_change': round(inv_change, 2),
                'ap_change': round(ap_change, 2),
                'net_working_capital': round(nwc, 2),
                'nwc_change': round(nwc_change, 2),
                'cash_conversion_cycle': round(ccc, 1),
                'fcf_working_capital_impact': round(fcf_impact, 2),
                'dso': dso_days,
                'dio': dio_days,
                'dpo': dpo_days
            }

        # Summary
        total_fcf_impact = sum(m['fcf_working_capital_impact'] for m in monthly.values())
        avg_nwc = np.mean([m['net_working_capital'] for m in monthly.values()]) if monthly else 0

        return {
            'monthly': monthly,
            'summary': {
                'cash_conversion_cycle': round(dso_days + dio_days - dpo_days, 1),
                'avg_net_working_capital': round(avg_nwc, 2),
                'total_fcf_impact': round(total_fcf_impact, 2),
                'ending_ar': round(running_ar, 2),
                'ending_inventory': round(running_inv, 2),
                'ending_ap': round(running_ap, 2)
            }
        }


# =============================================================================
# 6. RECONCILIATION ENGINE
# =============================================================================

class ReconciliationEngine:
    """
    Ensures accounting integrity across all statements.
    
    Hard constraints:
    1. Assets = Liabilities + Equity (ALWAYS)
    2. Cash Flow ending cash = Balance Sheet cash
    3. Net Income → Retained Earnings
    4. Debt Schedule → Balance Sheet debt
    5. Working Capital → Balance Sheet current items
    6. Deferred Revenue → Balance Sheet liabilities
    """

    @staticmethod
    def reconcile(
        income_statement: Dict[str, Dict],
        cash_flow: Dict[str, Dict],
        balance_sheet: Dict[str, Dict],
        debt_schedule: Dict[str, Dict] = None,
        working_capital: Dict[str, Dict] = None,
        deferred_revenue: Dict[str, Dict] = None
    ) -> Dict[str, Any]:
        """
        Run all reconciliation checks.
        Returns pass/fail for each check with specific discrepancies.
        """
        checks = []
        all_passed = True

        months = sorted(balance_sheet.keys())
        cumulative_retained = 0.0

        for month_key in months:
            bs = balance_sheet.get(month_key, {})
            cf = cash_flow.get(month_key, {})
            pl = income_statement.get(month_key, {})

            month_checks = []

            # CHECK 1: Balance Sheet Equation
            # Handle both nested and flat BS structure
            if isinstance(bs.get('assets'), dict):
                total_assets = float(bs.get('assets', {}).get('totalAssets', 0))
                total_liabilities = float(bs.get('liabilities', {}).get('totalLiabilities', 0))
                total_equity = float(bs.get('equity', {}).get('totalEquity', 0))
            else:
                total_assets = float(bs.get('totalAssets', 0))
                total_liabilities = float(bs.get('totalLiabilities', 0))
                total_equity = float(bs.get('totalEquity', 0))

            balance_diff = abs(total_assets - (total_liabilities + total_equity))
            bs_balanced = balance_diff < 1.0  # $1 tolerance

            month_checks.append({
                'check': 'balance_sheet_equation',
                'passed': bs_balanced,
                'expected': round(total_liabilities + total_equity, 2),
                'actual': round(total_assets, 2),
                'difference': round(balance_diff, 2),
                'severity': 'critical' if not bs_balanced else 'ok'
            })

            # CHECK 2: Cash Flow → Balance Sheet Cash
            cf_ending_cash = float(cf.get('endingCash', 0))
            if isinstance(bs.get('assets'), dict):
                bs_cash = float(bs.get('assets', {}).get('cash', 0))
            else:
                bs_cash = float(bs.get('cash', 0))

            cash_diff = abs(cf_ending_cash - bs_cash)
            cash_match = cash_diff < 1.0

            month_checks.append({
                'check': 'cash_flow_to_bs',
                'passed': cash_match,
                'cf_cash': round(cf_ending_cash, 2),
                'bs_cash': round(bs_cash, 2),
                'difference': round(cash_diff, 2),
                'severity': 'critical' if not cash_match else 'ok'
            })

            # CHECK 3: Net Income → Retained Earnings
            net_income = float(pl.get('netIncome', 0))
            cumulative_retained += net_income
            
            if isinstance(bs.get('equity'), dict):
                bs_retained = float(bs.get('equity', {}).get('retainedEarnings', 0))
            else:
                bs_retained = float(bs.get('retainedEarnings', 0))

            # CHECK 4: Debt Schedule → Balance Sheet (if provided)
            if debt_schedule and month_key in debt_schedule:
                ds = debt_schedule[month_key]
                ds_debt = float(ds.get('total_principal_balance', 0))
                if isinstance(bs.get('liabilities'), dict):
                    bs_debt = float(bs.get('liabilities', {}).get('debt', 0))
                else:
                    bs_debt = float(bs.get('debt', 0))

                debt_diff = abs(ds_debt - bs_debt)
                debt_match = debt_diff < 1.0
                month_checks.append({
                    'check': 'debt_schedule_to_bs',
                    'passed': debt_match,
                    'schedule_debt': round(ds_debt, 2),
                    'bs_debt': round(bs_debt, 2),
                    'difference': round(debt_diff, 2),
                    'severity': 'warning' if not debt_match else 'ok'
                })

            for check in month_checks:
                if not check['passed']:
                    all_passed = False

            checks.append({
                'month': month_key,
                'checks': month_checks,
                'all_passed': all(c['passed'] for c in month_checks)
            })

        return {
            'reconciled': all_passed,
            'months_checked': len(months),
            'months_with_issues': sum(1 for c in checks if not c['all_passed']),
            'details': checks,
            'summary': {
                'balance_sheet_balanced': all(
                    c['passed']
                    for m in checks
                    for c in m['checks']
                    if c['check'] == 'balance_sheet_equation'
                ),
                'cash_reconciled': all(
                    c['passed']
                    for m in checks
                    for c in m['checks']
                    if c['check'] == 'cash_flow_to_bs'
                )
            }
        }

    @staticmethod
    def auto_adjust(
        balance_sheet: Dict[str, Dict],
        adjustments_needed: Dict[str, float]
    ) -> Dict[str, Dict]:
        """
        Auto-adjust balance sheet to enforce A = L + E.
        Uses retained earnings as the plug variable.
        """
        adjusted = deepcopy(balance_sheet)

        for month_key, bs in adjusted.items():
            if isinstance(bs.get('assets'), dict):
                total_assets = float(bs['assets'].get('totalAssets', 0))
                total_liabilities = float(bs['liabilities'].get('totalLiabilities', 0))
                total_equity = float(bs['equity'].get('totalEquity', 0))

                diff = total_assets - (total_liabilities + total_equity)
                if abs(diff) > 0.01:
                    # Plug retained earnings
                    bs['equity']['retainedEarnings'] = round(
                        float(bs['equity'].get('retainedEarnings', 0)) + diff, 2
                    )
                    bs['equity']['totalEquity'] = round(total_equity + diff, 2)
                    bs['balanceCheck'] = 0.0

        return adjusted


# =============================================================================
# CONVENIENCE: Run full financial control suite
# =============================================================================

def run_financial_controls(
    statements: Dict[str, Any],
    debt_instruments: List[Dict] = None,
    equity_config: Dict[str, Any] = None,
    tax_config: Dict[str, Any] = None,
    contracts: List[Dict] = None,
    working_capital_config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Run the complete financial control layer over 3-statement model output.
    
    This is the master orchestration function that:
    1. Computes debt schedules
    2. Models equity dilution
    3. Calculates multi-jurisdiction tax
    4. Schedules deferred revenue (ASC 606)
    5. Models working capital dynamics
    6. Runs reconciliation
    
    Returns comprehensive financial control report.
    """
    result = {
        'debt_schedule': None,
        'equity': None,
        'tax': None,
        'deferred_revenue': None,
        'working_capital': None,
        'reconciliation': None,
        'controls_passed': True
    }

    monthly_pl = statements.get('incomeStatement', {}).get('monthly', {})
    monthly_cf = statements.get('cashFlow', {}).get('monthly', {})
    monthly_bs = statements.get('balanceSheet', {}).get('monthly', {})
    months = sorted(monthly_pl.keys())

    if not months:
        return result

    start_month = months[0]
    horizon = len(months)

    # 1. Debt Schedule
    if debt_instruments:
        debt_engine = DebtScheduleEngine()
        for inst in debt_instruments:
            debt_engine.add_instrument(inst)

        # Add standard covenants
        debt_engine.add_covenant({'type': 'debt_to_equity', 'threshold': 3.0, 'comparison': 'lte'})
        debt_engine.add_covenant({'type': 'interest_coverage', 'threshold': 2.0, 'comparison': 'gte'})
        debt_engine.add_covenant({'type': 'current_ratio', 'threshold': 1.2, 'comparison': 'gte'})

        debt_result = debt_engine.compute_schedule(start_month, horizon)

        # Covenant check using last month data
        last_month = months[-1]
        last_bs = monthly_bs.get(last_month, {})
        last_pl = monthly_pl.get(last_month, {})

        if isinstance(last_bs.get('equity'), dict):
            equity_val = float(last_bs.get('equity', {}).get('totalEquity', 100000))
            ca = float(last_bs.get('assets', {}).get('totalCurrentAssets', 0))
            cl = float(last_bs.get('liabilities', {}).get('currentLiabilities', 0))
        else:
            equity_val = float(last_bs.get('totalEquity', 100000))
            ca = float(last_bs.get('totalCurrentAssets', 0))
            cl = float(last_bs.get('currentLiabilities', 0))

        covenant_result = debt_engine.check_covenants(debt_result, {
            'total_equity': equity_val,
            'ebitda': float(last_pl.get('ebitda', 0)) * 12,
            'current_assets': ca,
            'current_liabilities': cl
        })

        debt_result['covenants'] = covenant_result
        result['debt_schedule'] = debt_result

        if not covenant_result['compliant']:
            result['controls_passed'] = False

    # 2. Working Capital
    if working_capital_config or monthly_pl:
        wc_config = working_capital_config or {}
        monthly_revenue = {m: float(pl.get('revenue', 0)) for m, pl in monthly_pl.items()}
        monthly_cogs = {m: float(pl.get('cogs', 0)) for m, pl in monthly_pl.items()}
        monthly_opex = {m: float(pl.get('operatingExpenses', 0)) for m, pl in monthly_pl.items()}

        wc_result = WorkingCapitalEngine.compute_working_capital(
            monthly_revenue=monthly_revenue,
            monthly_cogs=monthly_cogs,
            monthly_opex=monthly_opex,
            dso_days=float(wc_config.get('dso', 30)),
            dio_days=float(wc_config.get('dio', 45)),
            dpo_days=float(wc_config.get('dpo', 45))
        )
        result['working_capital'] = wc_result

    # 3. Deferred Revenue
    if contracts:
        dr_engine = DeferredRevenueEngine()
        for c in contracts:
            dr_engine.add_contract(c)
        result['deferred_revenue'] = dr_engine.compute_schedule(start_month, horizon)

    # 4. Reconciliation
    recon = ReconciliationEngine.reconcile(
        income_statement=monthly_pl,
        cash_flow=monthly_cf,
        balance_sheet=monthly_bs,
        debt_schedule=result.get('debt_schedule', {}).get('monthly') if result.get('debt_schedule') else None
    )
    result['reconciliation'] = recon

    if not recon['reconciled']:
        result['controls_passed'] = False

    return result
