import networkx as nx
import sympy
from typing import Dict, List, Any, Optional
import json
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class DriverBasedEngine:
    """
    Industrial Driver-Based Financial Modelling Engine.
    Implements a Directed Acyclic Graph (DAG) for financial computations.
    """
    def __init__(self):
        self.graph = nx.DiGraph()
        self.drivers_meta = {} # id -> metadata
        self.formulas = {} # id -> expression
        self.constant_values = {} # id -> {month -> value}
        
    def add_driver(self, driver_id: str, name: str, driver_type: str, category: str = None):
        """Adds a driver node to the graph."""
        self.drivers_meta[driver_id] = {
            'name': name,
            'type': driver_type,
            'category': category
        }
        if not self.graph.has_node(driver_id):
            self.graph.add_node(driver_id)
            
    def set_driver_values(self, driver_id: str, values: Dict[str, float]):
        """Sets time-series values for a driver (for non-calculated drivers)."""
        self.constant_values[driver_id] = values
        
    def add_formula(self, target_id: str, expression: str, dependencies: List[str]):
        """Adds a formula node and edges from its dependencies."""
        self.formulas[target_id] = expression
        if not self.graph.has_node(target_id):
            self.graph.add_node(target_id)
            
        for dep in dependencies:
            if not self.graph.has_node(dep):
                self.graph.add_node(dep)
            self.graph.add_edge(dep, target_id)
            
    def compute(self, months: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Computes all nodes in topological order for the given months.
        Returns: {node_id: {month: value}}
        """
        try:
            compute_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXUnfeasible:
            logger.error("Circular dependency detected in model graph")
            raise ValueError("Model contains circular dependencies")
            
        # Initialize results storage
        results = {node_id: {} for node_id in compute_order}
        
        # Iterate through each month
        for month in months:
            for node_id in compute_order:
                if node_id in self.formulas:
                    # It's a calculated node
                    expr_str = self.formulas[node_id]
                    
                    # Build evaluation context
                    # Use both ID and Name in context to support flexible formulas
                    context = {}
                    for dep_id in self.graph.predecessors(node_id):
                        val = results[dep_id].get(month, 0.0)
                        context[dep_id] = val
                        # Also add by name if available (slugified or exact)
                        if dep_id in self.drivers_meta:
                            clean_name = self.drivers_meta[dep_id]['name'].replace(' ', '_').lower()
                            context[clean_name] = val
                    
                    try:
                        # Evaluate using SymPy for robustness
                        expr = sympy.sympify(expr_str)
                        # Replace symbols with values from context
                        # Sympy.subs with a dict works well
                        computed_val = float(expr.subs({sympy.Symbol(k): v for k, v in context.items()}))
                        results[node_id][month] = computed_val
                    except Exception as e:
                        logger.warning(f"Formula evaluation failed for {node_id} in {month}: {e}")
                        results[node_id][month] = 0.0
                else:
                    # It's a constant/input node
                    val = 0.0
                    if node_id in self.constant_values:
                        val = self.constant_values[node_id].get(month, 0.0)
                    results[node_id][month] = val
                    
        return results

    def get_dag_metadata(self):
        """Returns the graph structure for UI visualization."""
        nodes = []
        for node_id in self.graph.nodes():
            nodes.append({
                'id': node_id,
                'name': self.drivers_meta.get(node_id, {}).get('name', node_id),
                'type': 'formula' if node_id in self.formulas else 'input'
            })
        edges = [{'source': u, 'target': v} for u, v in self.graph.edges()]
        return {'nodes': nodes, 'edges': edges}
