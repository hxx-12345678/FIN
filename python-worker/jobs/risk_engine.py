"""
Industrial Risk Engine
====================
Integrates Monte Carlo simulations with the Hyperblock calculation engine.
Supports probabilistic drivers (Normal, Uniform, Triangular) and multi-dimensional risk analysis.
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from jobs.hyperblock_engine import HyperblockEngine
import logging

logger = logging.getLogger(__name__)

class RiskEngine:
    """
    Orchestrates large-scale Monte Carlo simulations using Hyperblock vectorized processing.
    """
    
    def __init__(self, model_id: str, months: List[str], dimensions: List[Dict[str, Any]] = None):
        self.model_id = model_id
        self.months = months
        self.dimensions = dimensions or []
        
    def run_risk_analysis(self, 
                          nodes: List[Dict[str, Any]], 
                          proportions: Dict[str, Dict[str, Any]], 
                          num_simulations: int = 1000) -> Dict[str, Any]:
        """
        Runs a risk analysis by injecting stochastic drivers into the Hyperblock engine.
        proportions: {node_id: {dist: 'normal'|'uniform'|'triangular', params: {}}}
        """
        # 1. Initialize engine with a simulation dimension
        sim_members = [f"sim_{i}" for i in range(num_simulations)]
        engine = HyperblockEngine(f"{self.model_id}_risk")
        
        # Add original dimensions
        for dim in self.dimensions:
            engine.define_dimension(dim['name'], dim['members'])
            
        # Add the simulation dimension
        engine.define_dimension("_simulation", sim_members)
        
        engine.initialize_horizon(self.months)
        
        # 2. Add nodes to engine
        # Ensure all nodes that have formulas but also distributions are handled
        for node in nodes:
            dims = node.get('dims', [])
            # Add _simulation to ALL nodes to vectorize everything
            dims_with_sim = ["_simulation"] + dims
            engine.add_metric(node['id'], node['name'], node.get('category', 'operational'), dims_with_sim)
            if node.get('formula'):
                engine.set_formula(node['id'], node['formula'])
                
        # 3. Inject Stochastic Inputs
        rng = np.random.default_rng()
        for node_id, config in proportions.items():
            # Safety check: if node was not in the nodes list, add it as a basic metric
            if node_id not in engine.data:
                logger.warning(f"Node {node_id} found in distributions but not in nodes list. Adding dynamically.")
                engine.add_metric(node_id, node_id, "operational", ["_simulation"])
            
            dist = config.get('dist', 'normal')
            params = config.get('params', {})
            
            # Target shape: (num_simulations, dimensions..., months)
            # For simplicity, we sample for each simulation across all other dimensions/months
            target_shape = engine.data[node_id].shape
            
            if dist == 'normal':
                mu = params.get('mu', 0.0)
                sigma = params.get('sigma', 0.1)
                samples = rng.normal(mu, sigma, size=target_shape)
            elif dist == 'uniform':
                low = params.get('min', -0.1)
                high = params.get('max', 0.1)
                samples = rng.uniform(low, high, size=target_shape)
            elif dist == 'triangular':
                left = params.get('min', -0.1)
                mode = params.get('mode', 0.0)
                right = params.get('max', 0.1)
                samples = rng.triangular(left, mode, right, size=target_shape)
            else:
                samples = np.full(target_shape, params.get('value', 0.0))
                
            engine.data[node_id] = samples
            
        # 4. Execute Full Recompute
        engine.full_recompute()
        
        # 5. Extract Results and Compute Risk Metrics
        # Focus on one output metric for distribution analysis (e.g. Total Cash)
        # For now, let's return percentiles for all nodes
        output_metrics = {}
        for node in nodes:
            node_id = node['id']
            data = engine.data[node_id] # (sims, dims..., months)
            
            # Collapse extra dimensions for summary (mean across dims, or pick a specific one)
            # For risk engine summary, we usually want the aggregate
            if len(data.shape) > 2:
                # Average across internal dimensions (exclude sims and months)
                collapsed_data = np.mean(data, axis=tuple(range(1, len(data.shape)-1)))
            else:
                collapsed_data = data
                
            # percentiles (5, 25, 50, 75, 95)
            # collapsed_data is (sims, months)
            pvals = np.percentile(collapsed_data, [5, 25, 50, 75, 95], axis=0)
            
            output_metrics[node_id] = {
                "p5": pvals[0].tolist(),
                "p25": pvals[1].tolist(),
                "p50": pvals[2].tolist(),
                "p75": pvals[3].tolist(),
                "p95": pvals[4].tolist(),
                "mean": np.mean(collapsed_data, axis=0).tolist(),
                "std": np.std(collapsed_data, axis=0).tolist()
            }
            
        # 6. Specific Risk KPIs
        # Probability of Runway failure (Cash < 0)
        # Assumes a node named 'cash' exists
        failure_prob = []
        if 'cash' in engine.data:
            cash_data = engine.data['cash']
            if len(cash_data.shape) > 2:
                 cash_data = np.mean(cash_data, axis=tuple(range(1, len(cash_data.shape)-1)))
            
            for m in range(len(self.months)):
                fail_count = np.sum(cash_data[:, m] < 0)
                failure_prob.append(float(fail_count / num_simulations))
        
        return {
            "metrics": output_metrics,
            "failureProbability": failure_prob,
            "simulations": num_simulations,
            "months": self.months
        }
