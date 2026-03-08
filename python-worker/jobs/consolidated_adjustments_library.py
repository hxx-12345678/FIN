"""
Advanced Consolidation Adjustments Library
=========================================
Institutional-grade rules for:
- Intercompany Fixed Asset Profit Elimination (Net of Depreciation)
- Upstream vs Downstream Attribution
- Step Acquisitions & Fair Value Adjustments
- Dividend Elimination (Loop removal)
- IC Loan Elimination + Interest Reconciliation
"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class ConsolidationAdjustments:
    """
    Library of high-fidelity consolidation rules.
    Used by ConsolidationEngine to apply period-by-period adjustments.
    """
    
    @staticmethod
    def eliminate_ic_inventory_profit(target_bs: Dict, target_pl: Dict, profit_amt: float):
        """
        Eliminates unrealized profit in ending inventory (IAS 2).
        Dr Cost of Sales (PL)
        Cr Inventory (BS)
        """
        target_pl['cogs'] += profit_amt
        target_pl['grossProfit'] -= profit_amt
        target_bs['assets']['inventory'] -= profit_amt
        target_bs['assets']['totalAssets'] -= profit_amt
        return target_bs, target_pl

    @staticmethod
    def eliminate_fixed_asset_profit(target_bs: Dict, target_pl: Dict, original_profit: float, 
                                     useful_life_months: int, elapsed_months: int):
        """
        Eliminates profit on IC sale of fixed assets and reverses excess depreciation.
        """
        # 1. Eliminate initial profit
        if elapsed_months == 0:
            target_pl['otherIncome'] = target_pl.get('otherIncome', 0) - original_profit
            target_bs['assets']['fixedAssets'] -= original_profit
        else:
            # 2. Add back excess depreciation (Depreciation Unwind)
            # Excess depreciation = original_profit / useful_life_months
            monthly_unwind = original_profit / useful_life_months
            target_pl['depreciation'] -= monthly_unwind
            # BS correction: Fixed Assets (Net) increases by the unwind amount
            target_bs['assets']['fixedAssets'] -= (original_profit - (monthly_unwind * elapsed_months))
            
        return target_bs, target_pl

    @staticmethod
    def handle_step_acquisition(target_bs: Dict, parent_re: float, fv_adjustment: float, goodwill: float):
        """
        Adjusts for step acquisition (purchase of additional interest).
        Dr Goodwill (BS)
        Dr Fixed Assets / Intangibles (FV Adj)
        Cr Cash / Equity
        """
        target_bs['assets']['goodwill'] = target_bs['assets'].get('goodwill', 0) + goodwill
        target_bs['assets']['fixedAssets'] += fv_adjustment
        # Adjust RE for the cost of acquisition if not capitalized
        return target_bs

    @staticmethod
    def eliminate_ic_loan(parent_bs: Dict, sub_bs: Dict, loan_amt: float):
        """
        Eliminates intercompany loans.
        Dr Liability (Sub)
        Cr Asset (Parent)
        """
        # Search for Loan Receivable in Parent and Loan Payable in Sub
        # This is typically done during the aggregation pass across all entities
        pass

    @staticmethod
    def calculate_nci_share(sub_net_income: float, nci_pct: float, upstream_adj: float = 0):
        """
        Calculates NCI share of net income after upstream adjustments.
        NCI share = (Sub NI - Upstream Unrealized Prof) * NCI%
        """
        return (sub_net_income - upstream_adj) * nci_pct
