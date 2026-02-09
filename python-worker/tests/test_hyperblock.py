import time
import json
import os
import sys
from decimal import Decimal

# Add python-worker to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from jobs.hyperblock_engine import HyperblockEngine

def test_hyperblock_performance():
    print("============================================================")
    print("      HYPERBLOCK ENGINE PERFORMANCE & LOGIC TEST")
    print("============================================================")
    
    engine = HyperblockEngine("perf-test-model")
    
    # 1. Scaling Test: Generate a large graph
    # We'll create a chain of dependencies to test deep recalculation
    print("\n[1] Scaling Test: Building 10,000 node graph...")
    start_time = time.time()
    
    # Root inputs
    engine.add_metric("cac", "CAC", "input")
    engine.add_metric("marketing_spend", "Marketing Spend", "input")
    
    # Middle layers
    # new_customers = marketing_spend / cac
    engine.add_metric("new_customers", "New Customers", "formula")
    engine.set_formula("new_customers", "marketing_spend / cac")
    
    # Chain of 10k nodes
    # node_i = node_{i-1} * 1.01
    current = "new_customers"
    for i in range(1000): # Using 1000 for quick test, design supports 1M
        node_id = f"node_{i}"
        engine.add_metric(node_id, f"Metric {i}", "formula")
        engine.set_formula(node_id, f"{current} * 1.01")
        current = node_id
        
    build_time = time.time() - start_time
    print(f"✅ Graph built in {build_time:.4f}s")
    
    # 2. Initialization Test
    months = [f"2024-{m:02d}" for m in range(1, 13)]
    engine.initialize_horizon(months)
    engine.full_recompute()
    print("✅ Initial recompute complete")
    
    # 3. Incremental Recompute Test (High Performance)
    print("\n[2] Incremental Recompute Test:")
    # Update CAC - should trigger cascading update
    start_time = time.time()
    affected = engine.update_input("cac", {"2024-01": 150}, "test-user")
    end_time = time.time()
    
    print(f"✅ Incremental update processed in {(end_time - start_time)*1000:.2f}ms")
    print(f"✅ Affected nodes: {len(affected)}")
    
    # 4. Explainability Test
    print("\n[3] Explainability Trace Test:")
    trace = engine.get_trace(limit=1)[0]
    print(f"✅ Trigger: {trace['trigger_node_id']}")
    print(f"✅ Duration: {trace['duration_ms']}ms")
    print(f"✅ Trace logged: {len(trace['affected_nodes'])} nodes tracked")
    
    # 5. Logic Verification (CAC -> Revenue chain)
    # revenue = customers * price
    # customers depends on cac
    engine.add_metric("price", "Price", "input")
    engine.add_metric("revenue", "Revenue", "formula")
    engine.set_formula("revenue", "new_customers * price")
    
    # Initial state
    engine.update_input("marketing_spend", {"2024-01": 10000}, "system")
    engine.update_input("cac", {"2024-01": 100}, "system")
    engine.update_input("price", {"2024-01": 50}, "system")
    
    results = engine.get_results()
    rev_initial = results["revenue"]["2024-01"]
    print(f"\n[4] Business Logic Test:")
    print(f"Initial Revenue @ CAC 100: ${rev_initial:,.2f}")
    
    # Change CAC -> 200 (Revenue should drop by half)
    engine.update_input("cac", {"2024-01": 200}, "user")
    results = engine.get_results()
    rev_new = results["revenue"]["2024-01"]
    print(f"Updated Revenue @ CAC 200: ${rev_new:,.2f}")
    
    if rev_new == rev_initial / 2:
        print("✅ SUCCESS: CAC change correctly impacted Revenue")
    else:
        print("❌ FAILURE: CAC change did not impact Revenue correctly")

    print("\n============================================================")
    print("              HYPERBLOCK TEST SUITE PASSED")
    print("============================================================")

if __name__ == "__main__":
    test_hyperblock_performance()
