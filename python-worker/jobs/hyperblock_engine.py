"""
Hyperblock-Style Dependency Graph Calculation Engine
===================================================
Industrial-grade computation engine supporting:
- Large-scale DAG dependency graphs
- Real-time incremental recalculation
- Multi-threaded parallel computation
- Multidimensional data structures
- Computation tracing and explainability
"""

import networkx as nx
import numpy as np
import logging
import time
import concurrent.futures
from typing import Dict, List, Any, Optional, Set, Tuple
import sympy
from datetime import datetime

logger = logging.getLogger(__name__)

class HyperblockEngine:
    """
    Hyperblock-style Financial Computation Engine.
    
    Architecture:
    1. Dependency Graph (DAG) using NetworkX
    2. Vectorized storage using NumPy for high performance (1M+ data points)
    3. Incremental recompute logic (only update downstream nodes)
    4. Parallel Tiered Execution
    5. Explainability Trace
    """
    
    def __init__(self, model_id: str = "default"):
        self.model_id = model_id
        self.graph = nx.DiGraph()
        self.nodes_meta = {} # node_id -> metadata
        self.formulas = {}   # node_id -> (sympy_expr, variables)
        self.validation_enabled = True # Toggle for bulk loading
        
        # Dimension management
        self.dimensions = {} # dim_name -> {members: [], member_to_idx: {}}
        self.metric_dimensions = {} # node_id -> [dim_names]
        
        # In-memory data store: node_id -> multidimensional numpy array
        self.data = {} 
        self.months = []
        self.month_to_idx = {}
        
        # Computation Trace
        self.traces = []
        
    def define_dimension(self, name: str, members: List[str]):
        """Defines a dimension and its members."""
        self.dimensions[name] = {
            'members': members,
            'member_to_idx': {m: i for i, m in enumerate(members)}
        }
        logger.info(f"Defined dimension {name} with {len(members)} members.")

    def _initialize_metric_data(self, node_id: str):
        """Initializes empty numpy array for a metric based on its dimensions."""
        shape = []
        for dim_name in self.metric_dimensions.get(node_id, []):
            if dim_name in self.dimensions:
                shape.append(len(self.dimensions[dim_name]['members']))
            else:
                shape.append(1) # Unknown dimension
        shape.append(len(self.months))
        self.data[node_id] = np.zeros(tuple(shape))

    def initialize_horizon(self, months: List[str]):
        """Sets the time horizon and initializes all metrics."""
        self.months = months
        self.month_to_idx = {m: i for i, m in enumerate(months)}
        for node_id in self.graph.nodes():
            self._initialize_metric_data(node_id)

    def add_metric(self, node_id: str, name: str, category: str = "operational", dims: List[str] = None):
        """Adds a metric node to the graph with specified dimensions."""
        self.nodes_meta[node_id] = {
            'name': name,
            'category': category,
            'is_calculated': False,
            'dims': dims or []
        }
        self.metric_dimensions[node_id] = dims or []
        
        if not self.graph.has_node(node_id):
            self.graph.add_node(node_id)
            if self.months:
                self._initialize_metric_data(node_id)


    def set_formula(self, node_id: str, expression: str):
        """Sets a formula for a node and updates graph edges."""
        try:
            # Ensure node metadata exists
            if node_id not in self.nodes_meta:
                self.add_metric(node_id, node_id)
                
            # Optimized safe naming: Only replace if hyphens present
            # We use a cache for node identity mappings to avoid O(N) lookups
            if not hasattr(self, '_safe_to_orig_cache'):
                self._safe_to_orig_cache = {n.replace('-', '_'): n for n in self.graph.nodes()}
            
            # Update cache for current node
            safe_node_id = node_id.replace('-', '_')
            self._safe_to_orig_cache[safe_node_id] = node_id
            
            # We only need to replace IDs that actually appear in the expression
            # Use regex to find potential UUIDs/IDs in the expression
            import re
            tokens = re.findall(r'[a-zA-Z_][a-zA-Z0-9_\-]*', expression)
            safe_expression = expression
            for token in tokens:
                if '-' in token:
                    safe_expression = safe_expression.replace(token, token.replace('-', '_'))
            
            expr = sympy.sympify(safe_expression)
            safe_dependencies = [str(s) for s in expr.free_symbols]
            dependencies = [self._safe_to_orig_cache.get(sd, sd) for sd in safe_dependencies]
            
            # Pre-compile the numpy function to avoid O(N^2) recompilation during eval
            symbols = list(expr.free_symbols)
            actual_deps = [self._safe_to_orig_cache.get(str(s), str(s)) for s in symbols]
            f = sympy.lambdify(symbols, expr, 'numpy')
            
            self.formulas[node_id] = (expr, dependencies, f, actual_deps)
            self.nodes_meta[node_id]['is_calculated'] = True
            
            # Update edges: dependency -> node
            # Remove old edges first if any
            old_edges = list(self.graph.predecessors(node_id))
            for old_dep in old_edges:
                self.graph.remove_edge(old_dep, node_id)
                
            for dep in dependencies:
                if not self.graph.has_node(dep):
                    # Add as placeholder if not exists
                    self.add_metric(dep, dep)
                    # Update cache for placeholder
                    self._safe_to_orig_cache[dep.replace('-', '_')] = dep
                self.graph.add_edge(dep, node_id)
                
            self.validate_graph()
            logger.info(f"Set formula for {node_id}: {expression} (deps: {dependencies})")
            
        except Exception as e:
            logger.error(f"Invalid formula for {node_id}: {expression} - {e}")
            raise ValueError(f"Invalid formula: {e}")

    def detect_cycles(self) -> List[List[str]]:
        """
        Detects circular dependencies in the graph.
        Returns a list of cycles (each cycle is a list of node IDs).
        """
        try:
            cycles = list(nx.simple_cycles(self.graph))
            return cycles
        except Exception as e:
            logger.error(f"Cycle detection failed: {e}")
            return []

    def validate_graph(self):
        """
        Validates that the graph is a Directed Acyclic Graph (DAG).
        Throws an error if cycles are found with a suggested fix.
        """
        if not self.validation_enabled:
            return
            
        cycles = self.detect_cycles()
        if cycles:
            cycle_str = " -> ".join(cycles[0] + [cycles[0][0]])
            error_msg = f"Circular dependency detected: {cycle_str}. institutional CFOs cannot rely on unstable logic."
            suggestion = f"Suggested Fix: Break the loop by changing one of the nodes (e.g., {cycles[0][-1]}) to be an input or use a lagged value (t-1) for {cycles[0][0]}."
            logger.error(f"CRITICAL MODEL CORRUPTION: {error_msg}")
            raise ValueError(f"{error_msg}\n{suggestion}")

    def update_input(self, node_id: str, values: List[Dict[str, Any]], user_id: str = "system"):
        """
        Updates input values with dimensional coordinates.
        values: List of {month: '...', coords: {dim: member}, value: 0.0}
        """
        if node_id not in self.data:
            self.add_metric(node_id, node_id)
            
        dims = self.metric_dimensions.get(node_id, [])
        
        for update in values:
            month = update.get('month')
            coords = update.get('coords', {})
            val = update.get('value', 0.0)
            
            if month not in self.month_to_idx:
                continue
            
            # Build slice index
            idx = []
            for dim_name in dims:
                member = coords.get(dim_name)
                if member and dim_name in self.dimensions and member in self.dimensions[dim_name]['member_to_idx']:
                    idx.append(self.dimensions[dim_name]['member_to_idx'][member])
                else:
                    idx.append(slice(None)) # All members if not specified
            
            idx.append(self.month_to_idx[month])
            self.data[node_id][tuple(idx)] = val
        
        # Record trace
        import uuid
        trace_entry = {
            'id': str(uuid.uuid4()),
            'created_at': datetime.now().isoformat(),
            'trigger_node_id': node_id,
            'trigger_user_id': user_id,
            'affected_nodes': [],
            'duration_ms': 0
        }
        
        start_time = time.time()
        
        # Trigger incremental recompute
        affected = self._incremental_recompute(node_id)
        
        end_time = time.time()
        trace_entry['affected_nodes'] = affected
        trace_entry['duration_ms'] = int((end_time - start_time) * 1000)
        self.traces.append(trace_entry)
        
        return affected

    def _incremental_recompute(self, start_node: str) -> List[str]:
        """
        Only recalculates nodes reachable from the start node in topological order.
        """
        # Find all downstream nodes
        downstream = nx.descendants(self.graph, start_node)
        if not downstream:
            return []
            
        # Get topological sort of the entire graph, but filter for descendants
        full_order = list(nx.topological_sort(self.graph))
        affected_order = [n for n in full_order if n in downstream]
        
        # Group nodes by 'tiers' for parallel execution
        # A tier contains nodes that can be calculated in parallel (no dependencies on each other)
        # However, for incremental recompute, simple topological order is often enough
        # if the number of affected nodes is small.
        # For large blocks, we use tiered parallel execution.
        
        self._parallel_evaluate_nodes(affected_order)
        
        return affected_order

    def full_recompute(self):
        """Recalculates every node in the graph."""
        order = list(nx.topological_sort(self.graph))
        self._parallel_evaluate_nodes(order)

    def _parallel_evaluate_nodes(self, node_ids: List[str]):
        """
        Evaluates nodes in parallel where possible.
        Uses topological tiers to ensure data safety.
        """
        if not node_ids:
            return
            
        # Subgraph of nodes to be evaluated
        subgraph = self.graph.subgraph(node_ids)
        # Group by generations (tiers)
        tiers = list(nx.topological_generations(subgraph))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            for tier in tiers:
                # Filter tier to only include calculated nodes
                calc_nodes = [n for n in tier if n in self.formulas]
                if not calc_nodes:
                    continue
                    
                # Submit all nodes in this tier to the executor
                # Since they are in the same tier, they don't depend on each other
                futures = {executor.submit(self._evaluate_node, n): n for n in calc_nodes}
                concurrent.futures.wait(futures)
                
                # Check for errors
                for f in futures:
                    if f.exception():
                        logger.error(f"Error computing node {futures[f]}: {f.exception()}")

    def _evaluate_node(self, node_id: str):
        """Evaluates a single node's formula across all months vectorized."""
        expr, deps, f, actual_deps = self.formulas[node_id]
        
        try:
            target_dims = self.metric_dimensions.get(node_id, [])
            target_shape = self.data[node_id].shape
            args = []
            
            for dep in actual_deps:
                dep_data = self.data.get(dep)
                dep_dims = self.metric_dimensions.get(dep, [])
                
                if dep_data is None:
                    # Missing dependency, provide zeros in correct shape
                    dep_shape = []
                    for td in target_dims:
                        if td in dep_dims:
                            dep_shape.append(len(self.dimensions[td]['members']) if td in self.dimensions else 1)
                        else:
                            dep_shape.append(1)
                    dep_shape.append(len(self.months))
                    dep_data = np.zeros(tuple(dep_shape))
                
                if list(dep_dims) == list(target_dims):
                    args.append(dep_data)
                    continue
                
                # Align dep_dims to target_dims for broadcasting
                new_shape = []
                for td in target_dims:
                    if td in dep_dims:
                        new_shape.append(len(self.dimensions[td]['members']) if td in self.dimensions else 1)
                    else:
                        new_shape.append(1)
                new_shape.append(len(self.months))
                
                try:
                    args.append(dep_data.reshape(tuple(new_shape)))
                except ValueError as ve:
                    # If direct reshape fails, it might be due to incompatible dimensions
                    # Try to broadcast the first element or something safe
                    logger.error(f"Broadcasting error for {node_id} dep {dep}: cannot reshape {dep_data.shape} to {new_shape}")
                    # Fallback: if dep_data is just (months,), broadcast it
                    if dep_data.shape == (len(self.months),):
                        broad_data = np.broadcast_to(dep_data, target_shape)
                        args.append(broad_data)
                    else:
                        raise ve
                
            result_array = f(*args)
            
            if np.isscalar(result_array):
                self.data[node_id] = np.full(target_shape, float(result_array))
            else:
                # Validation: ensure result_array matches target_shape
                if result_array.shape != target_shape:
                    self.data[node_id] = np.broadcast_to(result_array, target_shape)
                else:
                    self.data[node_id] = result_array
                
        except Exception as e:
            logger.error(f"Vectorized evaluation failed for {node_id}: {e}")
            # Do NOT reset self.data[node_id].shape, just fill with zeros if necessary
            if node_id in self.data:
                self.data[node_id].fill(0.0)
            else:
                self.data[node_id] = np.zeros((1,) * len(self.metric_dimensions.get(node_id, [])) + (len(self.months),))

    def get_results(self, filter_coords: Dict[str, str] = None) -> Any:
        """
        Returns results. If filter_coords is provided, returns sliced data.
        Otherwise returns a summary or full dimensional data (can be large).
        """
        results = {}
        for node_id, arr in self.data.items():
            # For now, we return the data as nested dicts or flat records
            # To avoid massive JSON, we'll return a flat list of records for non-zero values
            results[node_id] = self._export_cube(node_id, arr)
        return results

    def _export_cube(self, node_id: str, arr: np.ndarray) -> List[Dict]:
        """Converts multidimensional array to flat record list."""
        dims = self.metric_dimensions.get(node_id, [])
        records = []
        
        # Use np.ndenumerate for sparse-ish export (only non-zeros)
        it = np.nditer(arr, flags=['multi_index'])
        while not it.finished:
            val = float(it[0])
            if val != 0:
                indices = it.multi_index
                record = {
                    'month': self.months[indices[-1]],
                    'value': val
                }
                for i, dim_name in enumerate(dims):
                    record[dim_name] = self.dimensions[dim_name]['members'][indices[i]]
                records.append(record)
            it.iternext()
        return records

    def get_trace(self, limit: int = 10) -> List[Dict]:
        """Returns recent traces for explainability."""
        return self.traces[-limit:]

    def get_dependency_chain(self, node_id: str) -> Dict:
        """Traces the dependency graph for a specific node (up and down)."""
        return {
            'node': node_id,
            'depends_on': list(self.graph.predecessors(node_id)),
            'impacts': list(self.graph.successors(node_id)),
            'formula': str(self.formulas.get(node_id, (None, None))[0])
        }
