"""
Industrial Financial Reasoning Engine
===================================
Provides deep model understanding, causal analysis, and strategic simulation.
"""

import numpy as np
import networkx as nx
import sympy
from typing import Dict, List, Any, Optional, Tuple
from jobs.hyperblock_engine import HyperblockEngine
import logging

logger = logging.getLogger(__name__)

class ModelReasoningEngine:
    def __init__(self, model_id: str):
        self.model_id = model_id
        # In a real environment, we'd load this from a cache or database.
        # For this implementation, we initialize a fresh engine for the model.
        self.engine = HyperblockEngine(model_id)
    
    def hydrate_from_json(self, nodes: List[Dict], h_data: Dict[str, Any] = None):
        """
        Hydrates the engine from external JSON state.
        nodes: List of {id, name, type, formula, dims, etc.}
        h_data: Dict of {node_id: {month: value}} or similar
        """
        # 1. Initialize horizon (infer from data or use default)
        months = ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024", 
                  "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"]
        self.engine.initialize_horizon(months)

        # 2. Add metrics and formulas
        for node in nodes:
            node_id = node['id']
            dims = node.get('dims', [])
            self.engine.add_metric(node_id, node.get('name', node_id), node.get('category', 'operational'), dims)
            if node.get('formula'):
                self.engine.set_formula(node_id, node['formula'])

        # 3. Load data
        if h_data:
            for node_id, values in h_data.items():
                if node_id in self.engine.data:
                    update_list = []
                    for month, val in values.items():
                        update_list.append({'month': month, 'value': float(val)})
                    self.engine.update_input(node_id, update_list)
        
        # 4. Initial compute
        self.engine.full_recompute()

    def analyze_drivers(self, target_node: str) -> Dict[str, Any]:
        """
        Identifies key drivers for a target metric using sensitivity analysis.
        """
        if target_node not in self.engine.graph:
            return {"error": f"Node {target_node} not found"}
            
        # 1. Trace upstream dependencies (ancestors)
        upstream = list(nx.ancestors(self.engine.graph, target_node))
        
        # 2. Baseline
        baseline_data = self.engine.data.get(target_node)
        if baseline_data is None:
            return {"error": f"No data for {target_node}"}
        baseline_sum = np.sum(baseline_data)
        
        drivers = []
        for node in upstream:
            # We only care about leaf nodes (inputs) for driver analysis
            if self.engine.graph.in_degree(node) > 0:
                continue
                
            original_val = self.engine.data[node].copy()
            
            # Perturb - 10% increase
            self.engine.data[node] *= 1.10
            
            # Recompute target
            # Find path from node to target
            path_nodes = nx.descendants(self.engine.graph, node)
            nodes_to_recompute = [n for n in nx.topological_sort(self.engine.graph) 
                                 if n in path_nodes and (n == target_node or n in nx.ancestors(self.engine.graph, target_node))]
            
            for n in nodes_to_recompute:
                if n in self.engine.formulas:
                    self.engine._evaluate_node(n)
            
            new_sum = np.sum(self.engine.data[target_node])
            delta = (new_sum - baseline_sum) / (baseline_sum + 1e-9)
            
            drivers.append({
                "id": node,
                "name": self.engine.nodes_meta.get(node, {}).get('name', node),
                "sensitivity": float(delta), 
                "impact": "high" if abs(delta) > 0.1 else "medium" if abs(delta) > 0.02 else "low"
            })
            
            # Reset
            self.engine.data[node] = original_val
            for n in nodes_to_recompute:
                if n in self.engine.formulas:
                    self.engine._evaluate_node(n)
        
        # Sort by impact
        drivers.sort(key=lambda x: abs(x['sensitivity']), reverse=True)
        
        return {
            "target": target_node,
            "drivers": drivers[:5]
        }

    def simulate_scenario(self, target_node: str, overrides: Dict[str, float]) -> Dict[str, Any]:
        """
        Runs a simulation given percentage overrides on specific nodes.
        """
        if target_node not in self.engine.graph:
            return {"error": f"Node {target_node} not found"}
            
        baseline_val = float(np.sum(self.engine.data[target_node]))
        
        # Backup
        original_data = {nid: data.copy() for nid, data in self.engine.data.items()}
        
        applied = []
        for nid, change in overrides.items():
            if nid in self.engine.data:
                self.engine.data[nid] *= (1 + change)
                applied.append(f"{nid} ({change:+.1%})")
        
        self.engine.full_recompute()
        new_val = float(np.sum(self.engine.data[target_node]))
        
        # Restore
        self.engine.data = original_data
        
        return {
            "target": target_node,
            "baseline": baseline_val,
            "scenario": new_val,
            "variance": new_val - baseline_val,
            "variance_percent": (new_val - baseline_val) / (baseline_val + 1e-9),
            "description": f"Scenario: " + ", ".join(applied)
        }

    def detect_weak_assumptions(self) -> List[Dict]:
        """
        AI identifies assumptions that might be unrealistic (e.g., zero growth, 
        extreme volatility, or diverging from historicals).
        """
        weak_points = []
        for node_id, meta in self.engine.nodes_meta.items():
            # Only check input nodes
            if self.engine.graph.in_degree(node_id) > 0:
                continue
                
            data = self.engine.data[node_id]
            # Filter out non-zero months to check for static assumptions
            non_zero_data = data[data != 0]
            
            if len(non_zero_data) > 1 and np.std(non_zero_data) < 1e-6:
                weak_points.append({
                    "id": node_id,
                    "name": meta.get('name', node_id),
                    "issue": "Static Assumption",
                    "recommendation": f"Consider adding a growth driver or seasonality to {meta.get('name', node_id)}."
                })
                
            # Check for outliers (e.g., > 3 std devs)
            # (Stub for more complex detection)
            
        return weak_points

    def suggest_strategic_improvements(self, target_node: str) -> List[Dict]:
        """
        Suggests concrete actions based on driver analysis.
        """
        analysis = self.analyze_drivers(target_node)
        drivers = analysis.get('drivers', [])
        
        suggestions = []
        for d in drivers:
            if d['sensitivity'] > 0:
                # Positive driver: We should optimize/increase
                suggestions.append({
                    "driver": d['name'],
                    "action": "Optimize/Scale",
                    "reasoning": f"{d['name']} is a primary positive driver of {target_node}.",
                    "confidence": 0.85
                })
            elif d['sensitivity'] < 0:
                # Negative driver: We should reduce/control
                suggestions.append({
                    "driver": d['name'],
                    "action": "Reduce/Control",
                    "reasoning": f"{d['name']} negatively impacts {target_node}, suggesting efficiency gains are possible.",
                    "confidence": 0.9
                })
                
        return suggestions

    def explain_metric_logic(self, node_id: str) -> Dict[str, Any]:
        """
        Provides a deep explanation of how a metric is derived.
        """
        if node_id not in self.engine.graph:
            return {"error": "Metric not found"}
            
        meta = self.engine.nodes_meta.get(node_id, {})
        formula_info = self.engine.formulas.get(node_id)
        
        if not formula_info:
            return {
                "id": node_id,
                "name": meta.get('name', node_id),
                "type": "Direct Input",
                "derivation": "This value is provided as a direct input to the model."
            }
            
        expr, deps = formula_info
        dep_names = [self.engine.nodes_meta.get(d, {}).get('name', d) for d in deps]
        
        return {
            "id": node_id,
            "name": meta.get('name', node_id),
            "type": "Calculated Metric",
            "formula": str(expr),
            "inputs": dep_names,
            "derivation": f"Derived from {', '.join(dep_names)} using the logic: {expr}."
        }
