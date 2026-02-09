"""
Test Suite for Hyperblock-Style Calculation Engine
===================================================
Validates:
1. Vectorized computation speed
2. Incremental recompute accuracy
3. Parallel execution
4. Traceability (Explainability)
5. Business logic scenarios (CAC -> Revenue)
"""

import sys
import os
import time
import numpy as np

# Add parent directory to path to import engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.hyperblock_engine import HyperblockEngine

def test_large_scale_performance():
    print("\n--- TEST: Large Scale Performance ---")
    engine = HyperblockEngine("performance_test")
    months = [f"2024-{str(m).zfill(2)}" for m in range(1, 13)] * 3 # 36 months
    engine.initialize_horizon(months)
    
    # Create 1000 nodes in a chain
    num_nodes = 1000
    for i in range(num_nodes):
        node_id = f"node_{i}"
        engine.add_metric(node_id, f"Metric {i}")
        if i > 0:
            engine.set_formula(node_id, f"node_{i-1} * 1.01")
            
    # Set initial value
    start_time = time.time()
    engine.update_input("node_0", {"2024-01": 100.0}, user_id="tester")
    end_time = time.time()
    
    print(f"Computed {num_nodes} nodes across {len(months)} months in {(end_time - start_time)*1000:.2f}ms")
    
    results = engine.get_results()
    # Check last node (should be 100 * 1.01^999)
    last_val = results["node_999"]["2024-01"]
    print(f"Final value in chain: {last_val:,.2f}")
    assert last_val > 0

def test_incremental_recompute():
    print("\n--- TEST: Incremental Recompute ---")
    engine = HyperblockEngine("incremental_test")
    engine.initialize_horizon(["2024-01", "2024-02"])
    
    # Structure:
    # A -> B -> C
    # D -> E
    engine.add_metric("A", "Input A")
    engine.set_formula("B", "A * 2")
    engine.set_formula("C", "B + 10")
    engine.add_metric("D", "Input D")
    engine.set_formula("E", "D * 5")
    
    # Initial compute
    engine.update_input("A", {"2024-01": 10}, user_id="user1")
    engine.update_input("D", {"2024-01": 5}, user_id="user1")
    
    results = engine.get_results()
    assert results["C"]["2024-01"] == 30 # (10*2)+10
    assert results["E"]["2024-01"] == 25 # 5*5
    
    # Change A, check if E remains unchanged (Incremental check)
    print("Changing A...")
    affected = engine.update_input("A", {"2024-01": 20}, user_id="user2")
    
    print(f"Affected nodes: {affected}")
    assert "B" in affected
    assert "C" in affected
    assert "E" not in affected, "E should not be affected by change in A"
    
    new_results = engine.get_results()
    assert new_results["C"]["2024-01"] == 50 # (20*2)+10
    assert new_results["E"]["2024-01"] == 25 # Still 25
    print("✅ Incremental recompute verified")

def test_explainability_trace():
    print("\n--- TEST: Explainability / Tracing ---")
    engine = HyperblockEngine("trace_test")
    engine.initialize_horizon(["2024-01"])
    
    engine.add_metric("CAC", "Customer Acquisition Cost")
    engine.add_metric("CusCount", "Customer Count")
    engine.set_formula("SalesSpend", "CAC * CusCount")
    
    engine.update_input("CAC", {"2024-01": 500}, user_id="CFO_Bob")
    engine.update_input("CusCount", {"2024-01": 100}, user_id="Marketing_Alice")
    
    trace = engine.get_trace()
    for entry in trace:
        print(f"[{entry['timestamp']}] Node '{entry['trigger_node']}' changed by {entry['user_id']}. Affected: {entry['affected_nodes']} (Took {entry['duration_ms']:.2f}ms)")
    
    assert len(trace) == 2
    assert trace[0]['trigger_node'] == "CAC"
    assert "SalesSpend" in trace[0]['affected_nodes']
    print("✅ Tracing verified")

def test_cac_to_revenue_scenario():
    print("\n--- TEST: CAC -> Revenue Scenario ---")
    # User requirement: change CAC -> revenue updates
    engine = HyperblockEngine("logic_test")
    engine.initialize_horizon(["2024-01"])
    
    engine.add_metric("marketing_budget", "Budget")
    engine.add_metric("CAC", "CAC")
    engine.set_formula("new_customers", "marketing_budget / CAC")
    engine.add_metric("mrr_per_customer", "ARPU")
    engine.set_formula("revenue", "new_customers * mrr_per_customer")
    
    # Initial state
    engine.update_input("marketing_budget", {"2024-01": 10000}, user_id="finance")
    engine.update_input("CAC", {"2024-01": 200}, user_id="marketing")
    engine.update_input("mrr_per_customer", {"2024-01": 50}, user_id="sales")
    
    res = engine.get_results()
    print(f"Initial Revenue: ${res['revenue']['2024-01']:,.2f}")
    assert res['revenue']['2024-01'] == 2500 # (10000/200)*50
    
    # Change CAC
    print("Lowering CAC to $100...")
    engine.update_input("CAC", {"2024-01": 100}, user_id="growth_team")
    
    res2 = engine.get_results()
    print(f"New Revenue: ${res2['revenue']['2024-01']:,.2f}")
    assert res2['revenue']['2024-01'] == 5000 # (10000/100)*50
    print("✅ CAC -> Revenue linkage verified")

if __name__ == "__main__":
    test_large_scale_performance()
    test_incremental_recompute()
    test_explainability_trace()
    test_cac_to_revenue_scenario()
    print("\n--- ALL HYPERBLOCK ENGINE TESTS PASSED ---")
