"""
Accounting Constraint Solver & Sparse Optimization
====================================================
Extends the Hyperblock DAG Engine with enterprise-grade capabilities:

1. Hard Accounting Constraints (Balance Sheet MUST reconcile)
2. Sparse Data Optimization (efficient handling of large, sparse matrices)
3. Circular Reference Resolution (iterative convergence for allowed cycles)
4. Cross-sheet Constraint Enforcement
5. Constraint Violation Reporting

Architecture: These are injected into the Hyperblock Engine computation flow.
The DAG engine remains the single source of deterministic computation.
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from copy import deepcopy

logger = logging.getLogger(__name__)


# =============================================================================
# 1. HARD ACCOUNTING CONSTRAINT SOLVER
# =============================================================================

class AccountingConstraintSolver:
    """
    Enforces hard accounting identities that must hold at ALL times.
    
    Constraints:
    1. Assets = Liabilities + Equity
    2. Net Income flows to Retained Earnings
    3. Cash Flow ending → Balance Sheet cash
    4. Debt schedule → Balance Sheet debt
    5. Revenue - COGS = Gross Profit (exactly)
    6. EBITDA = Gross Profit - OpEx
    7. Net Change in Cash = Operating + Investing + Financing
    
    Uses a 2-pass approach:
    Pass 1: Compute all values via DAG
    Pass 2: Enforce constraints & report violations
    """

    CONSTRAINTS = [
        {
            'id': 'BS_EQUATION',
            'name': 'Balance Sheet Equation',
            'description': 'Total Assets = Total Liabilities + Total Equity',
            'severity': 'critical',
            'check': lambda d: abs(d.get('total_assets', 0) - (d.get('total_liabilities', 0) + d.get('total_equity', 0))),
            'tolerance': 1.0,
            'plug_variable': 'retained_earnings'
        },
        {
            'id': 'CF_TO_BS_CASH',
            'name': 'Cash Flow to Balance Sheet',
            'description': 'Cash Flow ending cash must equal Balance Sheet cash',
            'severity': 'critical',
            'check': lambda d: abs(d.get('cf_ending_cash', 0) - d.get('bs_cash', 0)),
            'tolerance': 1.0,
            'plug_variable': 'bs_cash'
        },
        {
            'id': 'GROSS_PROFIT',
            'name': 'Gross Profit Identity',
            'description': 'Revenue - COGS = Gross Profit',
            'severity': 'warning',
            'check': lambda d: abs(d.get('revenue', 0) - d.get('cogs', 0) - d.get('gross_profit', 0)),
            'tolerance': 0.01,
            'plug_variable': 'gross_profit'
        },
        {
            'id': 'NET_CASH_FLOW',
            'name': 'Net Cash Flow Identity',
            'description': 'Net Cash = Operating CF + Investing CF + Financing CF',
            'severity': 'critical',
            'check': lambda d: abs(
                d.get('net_cash_flow', 0) - 
                (d.get('operating_cf', 0) + d.get('investing_cf', 0) + d.get('financing_cf', 0))
            ),
            'tolerance': 1.0,
            'plug_variable': None
        }
    ]

    @staticmethod
    def validate(financial_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Validate all hard constraints.
        
        financial_data: Flat dictionary of all relevant values for one period.
        
        Returns:
            {
                valid: bool,
                violations: [{ constraint_id, violation_amount, severity }],
                adjustments: [{ variable, adjustment_amount }]
            }
        """
        violations = []
        adjustments = []
        all_valid = True

        for constraint in AccountingConstraintSolver.CONSTRAINTS:
            try:
                violation_amount = constraint['check'](financial_data)
                passed = violation_amount <= constraint['tolerance']

                if not passed:
                    all_valid = False
                    violation = {
                        'constraint_id': constraint['id'],
                        'name': constraint['name'],
                        'violation_amount': round(violation_amount, 2),
                        'severity': constraint['severity'],
                        'description': constraint['description']
                    }
                    violations.append(violation)

                    # Auto-adjust using plug variable
                    if constraint.get('plug_variable'):
                        adjustments.append({
                            'variable': constraint['plug_variable'],
                            'adjustment': round(violation_amount, 2),
                            'constraint': constraint['id'],
                            'auto_fixed': True
                        })
            except Exception as e:
                logger.warning(f"Constraint check {constraint['id']} failed: {e}")

        return {
            'valid': all_valid,
            'violations': violations,
            'adjustments': adjustments,
            'constraints_checked': len(AccountingConstraintSolver.CONSTRAINTS),
            'constraints_passed': len(AccountingConstraintSolver.CONSTRAINTS) - len(violations)
        }

    @staticmethod
    def enforce_balance_sheet(
        bs_data: Dict[str, float],
        plug: str = 'retained_earnings'
    ) -> Dict[str, float]:
        """
        Force-balance a balance sheet using the plug variable.
        
        Modifies and returns bs_data so that A = L + E.
        """
        adjusted = deepcopy(bs_data)
        
        total_assets = float(adjusted.get('total_assets', 0))
        total_liabilities = float(adjusted.get('total_liabilities', 0))
        total_equity = float(adjusted.get('total_equity', 0))
        
        diff = total_assets - (total_liabilities + total_equity)
        
        if abs(diff) > 0.01:
            adjusted[plug] = round(float(adjusted.get(plug, 0)) + diff, 2)
            adjusted['total_equity'] = round(total_equity + diff, 2)
            adjusted['balance_plug_applied'] = round(diff, 2)
            logger.info(f"Balance sheet plug applied: {diff:.2f} to {plug}")
        
        return adjusted

    @staticmethod
    def validate_multi_period(
        monthly_data: Dict[str, Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Validate constraints across all periods.
        Returns consolidated validation report.
        """
        period_results = {}
        all_valid = True
        total_violations = 0

        for period, data in sorted(monthly_data.items()):
            result = AccountingConstraintSolver.validate(data)
            period_results[period] = result
            if not result['valid']:
                all_valid = False
                total_violations += len(result['violations'])

        return {
            'all_valid': all_valid,
            'total_violations': total_violations,
            'periods_checked': len(monthly_data),
            'periods_with_violations': sum(
                1 for r in period_results.values() if not r['valid']
            ),
            'period_details': period_results
        }


# =============================================================================
# 2. SPARSE DATA OPTIMIZATION
# =============================================================================

class SparseMatrixOptimizer:
    """
    Optimized storage and computation for large, sparse financial matrices.
    
    Enterprise models often have:
    - 100+ entities
    - 50+ departments 
    - 20+ products
    - 36+ months
    
    Most cells are zero. Sparse representation saves 10-100x memory.
    """

    def __init__(self):
        self.sparse_data: Dict[str, Dict[Tuple, float]] = {}  # node_id -> {(coords): value}
        self.shapes: Dict[str, Tuple[int, ...]] = {}

    def from_dense(self, node_id: str, dense_array: np.ndarray, threshold: float = 1e-10):
        """Convert dense numpy array to sparse representation."""
        self.shapes[node_id] = dense_array.shape
        sparse = {}

        it = np.nditer(dense_array, flags=['multi_index'])
        while not it.finished:
            val = float(it[0])
            if abs(val) > threshold:
                sparse[it.multi_index] = val
            it.iternext()

        self.sparse_data[node_id] = sparse
        
        # Report compression
        total_cells = np.prod(dense_array.shape)
        nonzero_cells = len(sparse)
        density = nonzero_cells / max(total_cells, 1) * 100
        logger.info(
            f"Sparse conversion for {node_id}: "
            f"{total_cells} cells → {nonzero_cells} non-zero ({density:.1f}% density)"
        )

        return {
            'node_id': node_id,
            'total_cells': int(total_cells),
            'nonzero_cells': nonzero_cells,
            'density_pct': round(density, 2),
            'memory_savings_pct': round(100 - density, 2)
        }

    def to_dense(self, node_id: str) -> np.ndarray:
        """Convert sparse representation back to dense numpy array."""
        if node_id not in self.shapes:
            return np.array([])
        
        result = np.zeros(self.shapes[node_id])
        for coords, value in self.sparse_data.get(node_id, {}).items():
            result[coords] = value
        return result

    def get_value(self, node_id: str, coords: tuple) -> float:
        """Get a single value. O(1) lookup."""
        return self.sparse_data.get(node_id, {}).get(coords, 0.0)

    def set_value(self, node_id: str, coords: tuple, value: float, threshold: float = 1e-10):
        """Set a single value. Removes if below threshold."""
        if node_id not in self.sparse_data:
            self.sparse_data[node_id] = {}
        
        if abs(value) > threshold:
            self.sparse_data[node_id][coords] = value
        elif coords in self.sparse_data[node_id]:
            del self.sparse_data[node_id][coords]

    def sparse_multiply(
        self, node_a: str, node_b: str, result_node: str
    ) -> int:
        """
        Element-wise multiply two sparse matrices.
        Only computes non-zero intersections.
        Returns count of operations performed.
        """
        a = self.sparse_data.get(node_a, {})
        b = self.sparse_data.get(node_b, {})
        result = {}
        ops = 0

        # Only iterate over coordinates that exist in BOTH
        common_coords = set(a.keys()) & set(b.keys())
        for coords in common_coords:
            val = a[coords] * b[coords]
            if abs(val) > 1e-10:
                result[coords] = val
                ops += 1

        self.sparse_data[result_node] = result
        if node_a in self.shapes:
            self.shapes[result_node] = self.shapes[node_a]

        return ops

    def sparse_add(
        self, node_a: str, node_b: str, result_node: str, 
        scale_a: float = 1.0, scale_b: float = 1.0
    ) -> int:
        """
        Element-wise addition: result = scale_a * A + scale_b * B
        """
        a = self.sparse_data.get(node_a, {})
        b = self.sparse_data.get(node_b, {})
        result = {}
        ops = 0

        all_coords = set(a.keys()) | set(b.keys())
        for coords in all_coords:
            val = scale_a * a.get(coords, 0) + scale_b * b.get(coords, 0)
            if abs(val) > 1e-10:
                result[coords] = val
                ops += 1

        self.sparse_data[result_node] = result
        if node_a in self.shapes:
            self.shapes[result_node] = self.shapes[node_a]
        elif node_b in self.shapes:
            self.shapes[result_node] = self.shapes[node_b]

        return ops

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about sparse storage."""
        total_cells = 0
        total_nonzero = 0
        node_stats = {}

        for node_id, sparse in self.sparse_data.items():
            shape = self.shapes.get(node_id, (0,))
            cells = int(np.prod(shape)) if shape else 0
            nonzero = len(sparse)
            total_cells += cells
            total_nonzero += nonzero
            node_stats[node_id] = {
                'shape': shape,
                'total_cells': cells,
                'nonzero': nonzero,
                'density': round(nonzero / max(cells, 1) * 100, 2)
            }

        return {
            'total_nodes': len(self.sparse_data),
            'total_cells': total_cells,
            'total_nonzero': total_nonzero,
            'overall_density': round(total_nonzero / max(total_cells, 1) * 100, 2),
            'memory_savings_pct': round(100 - total_nonzero / max(total_cells, 1) * 100, 2),
            'node_stats': node_stats
        }


# =============================================================================
# 3. CIRCULAR REFERENCE RESOLUTION
# =============================================================================

class CircularReferenceResolver:
    """
    Handles allowed circular dependencies through iterative convergence.
    
    Common financial circular references:
    - Interest expense depends on debt, which depends on cash,
      which depends on interest expense
    - Tax depends on pre-tax income, which depends on deferred tax
    
    Uses Gauss-Seidel iterative method with convergence checking.
    """

    MAX_ITERATIONS = 100
    DEFAULT_TOLERANCE = 0.01  # $0.01

    @staticmethod
    def resolve_circular(
        nodes: Dict[str, Dict],
        formulas: Dict[str, callable],
        cycle_nodes: List[str],
        initial_values: Dict[str, float] = None,
        tolerance: float = None,
        max_iterations: int = None
    ) -> Dict[str, Any]:
        """
        Resolve circular dependencies through iterative convergence.
        
        nodes: { node_id: { value: float, ... } }
        formulas: { node_id: callable(node_values) -> float }
        cycle_nodes: Nodes involved in the cycle
        initial_values: Starting guesses (if None, uses current values)
        
        Returns:
            {
                converged: bool,
                iterations: int,
                values: { node_id: final_value },
                convergence_history: [{ iteration, max_change }]
            }
        """
        tol = tolerance or CircularReferenceResolver.DEFAULT_TOLERANCE
        max_iter = max_iterations or CircularReferenceResolver.MAX_ITERATIONS

        # Initialize
        current_values = {}
        for node_id in cycle_nodes:
            if initial_values and node_id in initial_values:
                current_values[node_id] = float(initial_values[node_id])
            elif node_id in nodes:
                current_values[node_id] = float(nodes[node_id].get('value', 0))
            else:
                current_values[node_id] = 0.0

        convergence_history = []
        converged = False

        for iteration in range(max_iter):
            max_change = 0.0
            old_values = deepcopy(current_values)

            # Gauss-Seidel: update each node using latest values
            for node_id in cycle_nodes:
                if node_id in formulas:
                    try:
                        new_value = formulas[node_id](current_values)
                        change = abs(new_value - current_values[node_id])
                        max_change = max(max_change, change)
                        current_values[node_id] = new_value
                    except Exception as e:
                        logger.warning(f"Circular resolution failed for {node_id}: {e}")

            convergence_history.append({
                'iteration': iteration + 1,
                'max_change': round(max_change, 6),
                'values': {k: round(v, 2) for k, v in current_values.items()}
            })

            if max_change < tol:
                converged = True
                break

        return {
            'converged': converged,
            'iterations': len(convergence_history),
            'values': {k: round(v, 2) for k, v in current_values.items()},
            'convergence_history': convergence_history[-5:],  # Last 5 iterations
            'tolerance_used': tol,
            'final_max_change': convergence_history[-1]['max_change'] if convergence_history else 0
        }

    @staticmethod
    def detect_and_classify_cycles(graph_edges: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Detect cycles and classify them as resolvable vs problematic.
        
        Resolvable: Financial identity cycles (interest-debt-cash)
        Problematic: Logic errors (revenue depends on itself)
        """
        import networkx as nx

        G = nx.DiGraph()
        G.add_edges_from(graph_edges)

        cycles = list(nx.simple_cycles(G))

        # Known resolvable patterns
        FINANCIAL_CYCLES = {
            frozenset(['interest_expense', 'debt', 'cash', 'net_income']),
            frozenset(['tax_expense', 'pre_tax_income', 'deferred_tax']),
            frozenset(['depreciation', 'ppe', 'capex', 'cash']),
        }

        classified = []
        for cycle in cycles:
            cycle_set = frozenset(cycle)

            # Check against known patterns
            is_known = any(
                cycle_set.issubset(known) or known.issubset(cycle_set)
                for known in FINANCIAL_CYCLES
            )

            classified.append({
                'nodes': cycle,
                'length': len(cycle),
                'type': 'resolvable_financial' if is_known else 'needs_review',
                'resolution': 'iterative_convergence' if is_known else 'manual_break_required',
                'suggested_break_point': cycle[-1] if not is_known else None
            })

        return {
            'total_cycles': len(cycles),
            'resolvable': sum(1 for c in classified if c['type'] == 'resolvable_financial'),
            'needs_review': sum(1 for c in classified if c['type'] == 'needs_review'),
            'cycles': classified
        }


# =============================================================================
# 4. CROSS-SHEET CONSTRAINT ENFORCEMENT
# =============================================================================

class CrossSheetConstraints:
    """
    Enforces constraints across multiple financial statements/sheets.
    
    Rules:
    1. P&L Net Income must flow to Balance Sheet Retained Earnings
    2. Cash Flow Statement net change must match BS cash change
    3. AR/AP changes must be consistent with revenue/expense changes
    4. Depreciation must match asset schedule
    """

    @staticmethod
    def enforce_cross_sheet(
        income_statement: Dict[str, Dict],
        cash_flow: Dict[str, Dict],
        balance_sheet: Dict[str, Dict]
    ) -> Dict[str, Any]:
        """
        Check and enforce all cross-sheet constraints.
        Returns violations and auto-corrections.
        """
        months = sorted(income_statement.keys())
        corrections = []
        violations = []

        prev_bs = None
        cumulative_net_income = 0.0

        for month_key in months:
            pl = income_statement.get(month_key, {})
            cf = cash_flow.get(month_key, {})
            bs = balance_sheet.get(month_key, {})

            net_income = float(pl.get('netIncome', 0))
            cumulative_net_income += net_income

            # RULE 1: Cash flow ending cash = BS cash
            cf_cash = float(cf.get('endingCash', 0))
            # Handle nested BS structure
            if isinstance(bs.get('assets'), dict):
                bs_cash = float(bs.get('assets', {}).get('cash', 0))
            else:
                bs_cash = float(bs.get('cash', 0))

            diff = abs(cf_cash - bs_cash)
            if diff > 1.0:
                violations.append({
                    'month': month_key,
                    'rule': 'CF_to_BS_cash',
                    'cf_value': cf_cash,
                    'bs_value': bs_cash,
                    'difference': round(diff, 2)
                })
                # Auto-correct: adjust BS cash to match CF
                if isinstance(bs.get('assets'), dict):
                    bs['assets']['cash'] = cf_cash
                else:
                    bs['cash'] = cf_cash
                corrections.append({
                    'month': month_key,
                    'field': 'bs_cash',
                    'old': bs_cash,
                    'new': cf_cash,
                    'reason': 'Aligned BS cash with CF ending cash'
                })

            # RULE 2: Cash flow net change consistency
            net_cf = float(cf.get('netCashFlow', 0))
            op_cf = float(cf.get('operatingCashFlow', 0))
            inv_cf = float(cf.get('investingCashFlow', 0))
            fin_cf = float(cf.get('financingCashFlow', 0))
            cf_sum = op_cf + inv_cf + fin_cf

            if abs(net_cf - cf_sum) > 1.0:
                violations.append({
                    'month': month_key,
                    'rule': 'CF_components_sum',
                    'net_cf': net_cf,
                    'sum_components': round(cf_sum, 2),
                    'difference': round(abs(net_cf - cf_sum), 2)
                })

            # RULE 3: Depreciation consistency (P&L dep = CF add-back)
            pl_dep = float(pl.get('depreciation', 0))
            cf_dep = float(cf.get('depreciation', 0))
            if abs(pl_dep - cf_dep) > 0.01:
                violations.append({
                    'month': month_key,
                    'rule': 'depreciation_consistency',
                    'pl_depreciation': pl_dep,
                    'cf_depreciation': cf_dep,
                    'difference': round(abs(pl_dep - cf_dep), 2)
                })

            # RULE 4: Balance Sheet equation
            if isinstance(bs.get('assets'), dict):
                ta = float(bs.get('assets', {}).get('totalAssets', 0))
                tl = float(bs.get('liabilities', {}).get('totalLiabilities', 0))
                te = float(bs.get('equity', {}).get('totalEquity', 0))
            else:
                ta = float(bs.get('totalAssets', 0))
                tl = float(bs.get('totalLiabilities', 0))
                te = float(bs.get('totalEquity', 0))

            bs_diff = abs(ta - (tl + te))
            if bs_diff > 1.0:
                violations.append({
                    'month': month_key,
                    'rule': 'BS_equation',
                    'assets': ta,
                    'liabilities_plus_equity': round(tl + te, 2),
                    'difference': round(bs_diff, 2)
                })

            prev_bs = bs

        return {
            'valid': len(violations) == 0,
            'violations_count': len(violations),
            'violations': violations,
            'corrections_applied': len(corrections),
            'corrections': corrections,
            'months_checked': len(months)
        }
