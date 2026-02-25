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
        # First pass: add all metrics with dimensions
        for node in nodes:
            dims = node.get('dims', [])
            dims_with_sim = ["_simulation"] + dims
            engine.add_metric(node['id'], node['name'], node.get('category', 'operational'), dims_with_sim)
            
        # Second pass: set formulas (now that all deps have correct dims)
        for node in nodes:
            if node.get('formula'):
                engine.set_formula(node['id'], node['formula'])
                
        # 3. Inject Stochastic Inputs (Correlated Sampling & Advanced Distributions)
        rng = np.random.default_rng()
        
        # Check for correlated parameters (e.g., CAC inversely correlated to Conversion Rate)
        corr_matrix = None
        var_names = list(proportions.keys())
        has_correlations = any('correlations' in config for config in proportions.values())
        
        if has_correlations and len(var_names) > 1:
            # Build correlation matrix
            n_vars = len(var_names)
            corr_matrix = np.eye(n_vars)
            for i, (_, config) in enumerate(proportions.items()):
                if 'correlations' in config:
                    for target, corr_val in config['correlations'].items():
                        if target in var_names:
                            j = var_names.index(target)
                            corr_matrix[i, j] = corr_val
                            corr_matrix[j, i] = corr_val # Ensure symmetry
            
            # Use Cholesky decomposition to generate correlated uniform samples (Gaussian Copula)
            # Ensure positive semi-definite (add small ridge if needed)
            try:
                L = np.linalg.cholesky(corr_matrix)
            except np.linalg.LinAlgError:
                # Add small ridge to diagonal
                corr_matrix += np.eye(n_vars) * 1e-6
                L = np.linalg.cholesky(corr_matrix)
                
            standard_normals = rng.standard_normal((num_simulations, n_vars))
            correlated_normals = standard_normals @ L.T
            
            from scipy.stats import norm
            correlated_uniforms = norm.cdf(correlated_normals)
        else:
            correlated_uniforms = rng.uniform(0, 1, (num_simulations, len(var_names)))
            
        # Apply distributions
        for i, (node_id, config) in enumerate(proportions.items()):
            actual_node_id = node_id
            
            if node_id not in engine.data:
                found = False
                for nid, meta in engine.nodes_meta.items():
                    if meta.get('name') == node_id:
                        actual_node_id = nid
                        found = True
                        break
                
                if not found:
                    engine.add_metric(node_id, node_id, "operational", ["_simulation"])
                    actual_node_id = node_id
            
            dist = config.get('dist', 'normal')
            params = config.get('params', {})
            
            target_shape = engine.data[actual_node_id].shape
            
            # Use the correlated uniform variable for this driver
            u = correlated_uniforms[:, i]
            
            # We must reshape u to broadcast across months/dimensions if needed
            # Shape for broadcasting: (num_sims, 1, 1, ..., 1) for all extra dimensions
            broadcast_dims = len(target_shape) - 1
            u_reshaped = u.reshape((num_simulations,) + (1,) * broadcast_dims)
            u_broadcasts = np.broadcast_to(u_reshaped, target_shape)
            
            # Inverse Transform Sampling using SciPy distributions
            import scipy.stats as stats
            
            if dist == 'normal':
                mu = params.get('mu', params.get('mean', 0.0))
                sigma = params.get('sigma', params.get('std', 0.1))
                samples = stats.norm.ppf(u_broadcasts, loc=mu, scale=sigma)
            elif dist == 'lognormal':
                mu = params.get('mu', params.get('mean', 0.0))
                sigma = params.get('sigma', params.get('std', 0.1))
                samples = stats.lognorm.ppf(u_broadcasts, s=sigma, scale=np.exp(mu))
            elif dist == 'uniform':
                low = params.get('min', -0.1)
                high = params.get('max', 0.1)
                samples = stats.uniform.ppf(u_broadcasts, loc=low, scale=high-low)
            elif dist == 'triangular':
                left = params.get('min', -0.1)
                mode = params.get('mode', 0.0)
                right = params.get('max', 0.1)
                # scale scipy triangular: loc=left, scale=right-left, c=(mode-left)/(right-left)
                c = (mode - left) / (right - left) if right > left else 0.5
                samples = stats.triang.ppf(u_broadcasts, c=c, loc=left, scale=right-left)
            elif dist == 'pareto': # Fat-tail
                b = params.get('b', 2.0) # shape parameter
                scale = params.get('scale', 1.0)
                samples = stats.pareto.ppf(u_broadcasts, b=b, scale=scale)
            else:
                samples = np.full(target_shape, float(params.get('value', 0.0)))
                
            engine.data[actual_node_id] = samples
            
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
        cash_node_id = 'cash'
        # Try to find by name
        for nid, meta in engine.nodes_meta.items():
            if meta.get('name', '').lower() == 'cash':
                cash_node_id = nid
                break
        
        var_95 = 0
        fatal_risk_prob = 0
        risk_insights = []

        if cash_node_id in engine.data:
            cash_data = engine.data[cash_node_id]
            if len(cash_data.shape) > 2:
                 cash_data = np.mean(cash_data, axis=tuple(range(1, len(cash_data.shape)-1)))
            
            # Probability of bankruptcy (cash < 0 at any point)
            bankrupt_sims = np.any(cash_data < 0, axis=1)
            fatal_risk_prob = float(np.sum(bankrupt_sims) / num_simulations)
            
            # VaR at 95% for the last month
            final_cash = cash_data[:, -1]
            var_95 = float(np.percentile(final_cash, 5))
            
            for m in range(len(self.months)):
                fail_count = np.sum(cash_data[:, m] < 0)
                failure_prob.append(float(fail_count / num_simulations))

            # Insights
            if fatal_risk_prob > 0.2:
                risk_insights.append({"type": "critical", "msg": f"High bankruptcy risk detected: {fatal_risk_prob*100:.1f}%"})
            elif fatal_risk_prob > 0.05:
                risk_insights.append({"type": "warning", "msg": f"Moderate bankruptcy risk: {fatal_risk_prob*100:.1f}%"})
            else:
                risk_insights.append({"type": "info", "msg": "Bankruptcy risk is minimal under current assumptions."})
        
        # 7. Summary Metrics for the Hub
        # Map IDs to names for the frontend
        keyed_by_name = {}
        for nid, meta in engine.nodes_meta.items():
            name = meta.get('name', nid)
            keyed_by_name[name] = output_metrics.get(nid)

        # 8. Sensitivity Matrix (Tornado/Sobol Variance Tracing)
        sensitivity = []
        if cash_node_id in engine.data and final_cash is not None:
            # Calculate correlation/variance contribution for each injected stochastic driver
            # against the final outcome metric (cash).
            for nid, config in proportions.items():
                if nid in engine.data:
                    driver_data = engine.data[nid]
                    if len(driver_data.shape) > 2:
                        driver_data = np.mean(driver_data, axis=tuple(range(1, len(driver_data.shape)-1)))
                    
                    # Take driver data at month 0 (or mean across months) to correlate
                    d_mean = np.mean(driver_data, axis=1) if len(driver_data.shape) > 1 else driver_data
                    
                    # Pearson correlation as basic sensitivity index
                    if np.std(d_mean) > 0 and np.std(final_cash) > 0:
                        corr = np.corrcoef(d_mean, final_cash)[0, 1]
                    else:
                        corr = 0.0
                        
                    sensitivity.append({
                        "driver": nid,
                        "correlation": float(corr),
                        "impact_variance": float(corr ** 2) # Approximation of first-order Sobol index
                    })
            
            # Sort sensitivity by absolute impact
            sensitivity.sort(key=lambda x: abs(x["impact_variance"]), reverse=True)

        return {
            "metrics": output_metrics,
            "metricsByName": keyed_by_name,
            "failureProbability": failure_prob,
            "fatalRisk": fatal_risk_prob,
            "var95": var_95,
            "insights": risk_insights,
            "sensitivity": sensitivity,
            "simulations": num_simulations,
            "months": self.months
        }
