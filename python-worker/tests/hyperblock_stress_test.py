import sys
import os
import time
import numpy as np
from typing import List, Dict

# Add parent directory to path to import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.hyperblock_engine import HyperblockEngine

def test_circular_dependency():
    print("\n1. Testing Circular Dependency Detection...")
    engine = HyperblockEngine("cycle-test")
    engine.initialize_horizon(["2025-01", "2025-02"])
    
    # Interest expense depends on debt
    # Debt depends on cash
    # Cash depends on interest
    
    engine.add_metric("interest", "Interest Expense")
    engine.add_metric("debt", "Total Debt")
    engine.add_metric("cash", "Ending Cash")
    
    # Setting debt -> interest
    engine.set_formula("interest", "debt * 0.05")
    
    # Setting cash -> debt
    engine.set_formula("debt", "1000000 - cash")
    
    print("   Attemping to set interest -> cash (creating cycle: interest -> cash -> debt -> interest)...")
    try:
        # This should fail
        engine.set_formula("cash", "500000 - interest")
        print("   FAIL: Cycle not detected!")
    except ValueError as e:
        print(f"   PASS: Detected cycle. Error: {str(e)[:100]}...")

def test_massive_scale():
    print("\n2. Testing Massive Scale Computation (50,000 nodes, 120 months)...")
    engine = HyperblockEngine("scale-test")
    
    num_nodes = 50000
    num_months = 120
    months = [f"M{i}" for i in range(num_months)]
    engine.initialize_horizon(months)
    engine.validation_enabled = False # CRITICAL for 50k nodes
    
    # Create 50,000 nodes
    # Structure: 10,000 inputs, 40,000 calculated nodes in 4 layers of 10,000 each
    start_time = time.time()
    
    # Layer 0: Inputs
    for i in range(10000):
        node_id = f"input_{i}"
        engine.add_metric(node_id, f"Input {i}")
        # Initialize with random data
        engine.data[node_id] = np.random.rand(num_months)
        
    # Layer 1-4: Projections
    for layer in range(1, 5):
        for i in range(10000):
            node_id = f"node_{layer}_{i}"
            prev_node_id = f"input_{i}" if layer == 1 else f"node_{layer-1}_{i}"
            # Formula depends on previous layer and some random input from layer 0
            random_dep = f"input_{(i + layer * 7) % 10000}"
            engine.set_formula(node_id, f"{prev_node_id} * 1.02 + {random_dep} * 0.01")
            
    build_time = time.time() - start_time
    print(f"   Building 50k nodes took: {build_time:.2f} seconds")
    
    # Perform full recompute
    print("   Starting Full Recompute...")
    recompute_start = time.time()
    engine.full_recompute()
    recompute_time = time.time() - recompute_start
    print(f"   Full recompute took: {recompute_time:.2f} seconds")
    
    # Perform incremental update
    print("   Starting Incremental Update (Trigger 1 input)...")
    incremental_start = time.time()
    # Update input_500
    affected = engine.update_input("input_500", [{"month": "M0", "value": 1000, "coords": {}}])
    incremental_time = time.time() - incremental_start
    print(f"   Incremental recompute took: {incremental_time:.4f} seconds (Affected nodes: {len(affected)})")
    
    if recompute_time < 30 and incremental_time < 0.5:
        print("   PASS: Performance within enterprise-grade bounds.")
    else:
        print("   FAIL: Performance slow for enterprise scale.")

def test_driver_shock_propagation():
    print("\n3. Testing Driver Shock Propagation Tracing...")
    engine = HyperblockEngine("shock-test")
    engine.initialize_horizon(["2025-01", "2025-02"])
    
    # CAC -> Customers -> Revenue -> Net Income
    # CAC -> Marketing Efficiency -> Leads -> Customers
    
    engine.add_metric("cac", "CAC")
    engine.add_metric("marketing_efficiency", "Marketing Efficiency")
    engine.add_metric("leads", "Leads")
    engine.add_metric("customers", "Total Customers")
    engine.add_metric("revenue", "Revenue")
    engine.add_metric("net_income", "Net Income")
    
    engine.set_formula("leads", "marketing_efficiency * 1000")
    engine.set_formula("customers", "leads / cac")
    engine.set_formula("revenue", "customers * 100")
    engine.set_formula("net_income", "revenue - (leads * 5)")
    
    print("   Trigging shock: CAC increases 30%...")
    affected = engine.update_input("cac", [{"month": "2025-01", "value": 130, "coords": {}}])
    
    print(f"   Affected Nodes: {affected}")
    # Verify impact chain
    expected_chain = ["customers", "revenue", "net_income"]
    if all(node in affected for node in expected_chain):
        print("   PASS: Impact chain correctly traced.")
    else:
        print("   FAIL: Missing nodes in impact chain.")
        
    # Test causal pathway explanation logic extension
    trace = engine.get_dependency_chain("net_income")
    print(f"   Dependents for Net Income: {trace['depends_on']}")
    if "revenue" in trace['depends_on']:
        print("   PASS: Causal pathway identified.")
    else:
        print("   FAIL: Path detection failure.")

if __name__ == "__main__":
    print("Starting Hyperblock Stress & Integrity Tests...")
    test_circular_dependency()
    try:
        test_massive_scale()
    except Exception as e:
        print(f"Scale test error: {e}")
    test_driver_shock_propagation()
    print("\nAll Hyperblock tests completed.")
