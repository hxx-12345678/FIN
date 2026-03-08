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
                          num_simulations: int = 1000,
                          seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Runs a risk analysis with deterministic seed control and correlation validation.
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
        for node in nodes:
            dims = node.get('dims', [])
            dims_with_sim = ["_simulation"] + dims
            engine.add_metric(node['id'], node['name'], node.get('category', 'operational'), dims_with_sim)
            
        for node in nodes:
            if node.get('formula'):
                engine.set_formula(node['id'], node['formula'])
                
        # 3. Inject Stochastic Inputs (Deterministic Seed + Correlated Sampling)
        rng = np.random.default_rng(seed)
        
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
            elif dist == 't': # Fat-tail T-Distribution
                df = params.get('df', 3.0) # degrees of freedom (low df = fatter tails)
                loc = params.get('loc', 0.0)
                scale = params.get('scale', 1.0)
                samples = stats.t.ppf(u_broadcasts, df=df, loc=loc, scale=scale)
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
                c = (mode - left) / (right - left) if right > left else 0.5
                samples = stats.triang.ppf(u_broadcasts, c=c, loc=left, scale=right-left)
            elif dist == 'pareto': # Fat-tail
                b = params.get('b', 2.0)
                scale = params.get('scale', 1.0)
                samples = stats.pareto.ppf(u_broadcasts, b=b, scale=scale)
            else:
                samples = np.full(target_shape, float(params.get('value', 0.0)))
                
            # 3.1 Regime Switching Stochastic Overlay (Institutional Standard)
            regime_params = config.get('regime_switching')
            if regime_params:
                # Basic 2-regime model: Normal vs Stressed
                p_stay_normal = regime_params.get('p_stay_normal', 0.95)
                p_stay_stressed = regime_params.get('p_stay_stressed', 0.80)
                stressed_multiplier = regime_params.get('stressed_multiplier', 2.0)
                
                # Chain for each simulation horizon
                for s in range(num_simulations):
                    state = 0 # 0=normal, 1=stressed
                    for m in range(len(self.months)):
                        if state == 0:
                            if rng.uniform(0, 1) > p_stay_normal: state = 1
                        else:
                            if rng.uniform(0, 1) > p_stay_stressed: state = 0
                        
                        if state == 1:
                            # Multi-dimensional broadcasting check
                            if len(samples.shape) > 2:
                                samples[s, ..., m] *= stressed_multiplier
                            else:
                                samples[s, m] *= stressed_multiplier
            
            engine.data[actual_node_id] = samples
            
        # 4. Execute Full Recompute
        engine.full_recompute()
        
        # 5. Extract Results and Compute Risk Metrics
        output_metrics = {}
        for node in nodes:
            node_id = node['id']
            data = engine.data[node_id]
            
            if len(data.shape) > 2:
                collapsed_data = np.mean(data, axis=tuple(range(1, len(data.shape)-1)))
            else:
                collapsed_data = data
                
            pvals = np.percentile(collapsed_data, [5, 10, 25, 50, 75, 90, 95], axis=0)
            
            output_metrics[node_id] = {
                "p5": pvals[0].tolist(),
                "p50": pvals[3].tolist(),
                "p95": pvals[6].tolist(),
                "mean": np.mean(collapsed_data, axis=0).tolist(),
                "std": np.std(collapsed_data, axis=0).tolist()
            }
            
        # 6. Specific Risk KPIs
        failure_prob = []
        cash_node_id = 'cash'
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
            
            bankrupt_sims = np.any(cash_data < 0, axis=1)
            fatal_risk_prob = float(np.sum(bankrupt_sims) / num_simulations)
            
            final_cash = cash_data[:, -1]
            var_95 = float(np.percentile(final_cash, 5))
            
            for m in range(len(self.months)):
                fail_count = np.sum(cash_data[:, m] < 0)
                failure_prob.append(float(fail_count / num_simulations))

            if fatal_risk_prob > 0.2:
                risk_insights.append({"type": "critical", "msg": f"High bankruptcy risk detected: {fatal_risk_prob*100:.1f}%"})
            
        # 8. Shapley-Based Risk Attribution (Variance Decomposition)
        attribution = []
        if cash_node_id in engine.data:
            total_var = np.var(final_cash)
            if total_var > 0:
                for nid, config in proportions.items():
                    if nid in engine.data:
                        driver_samples = engine.data[nid]
                        if len(driver_samples.shape) > 2:
                            driver_samples = np.mean(driver_samples, axis=tuple(range(1, len(driver_samples.shape)-1)))
                        
                        d_val = np.mean(driver_samples, axis=1) if len(driver_samples.shape) > 1 else driver_samples
                        
                        # Partial correlation as proxy for Shapley attribution
                        # This calculates how much of the final variance is explained by this driver
                        corr = np.corrcoef(d_val, final_cash)[0, 1]
                        explained_var = (corr ** 2) * 100 # Percentage
                        
                        attribution.append({
                            "driver": nid,
                            "attribution_pct": float(round(explained_var, 2)),
                            "impact": "positive" if corr > 0 else "negative"
                        })
                attribution.sort(key=lambda x: x["attribution_pct"], reverse=True)

        return {
            "metrics": output_metrics,
            "failureProbability": failure_prob,
            "fatalRisk": fatal_risk_prob,
            "var95": var_95,
            "insights": risk_insights,
            "attribution": attribution,
            "simulations": num_simulations,
            "samples": {k: v.tolist() if hasattr(v, 'tolist') else v for k, v in engine.data.items()}
        }
