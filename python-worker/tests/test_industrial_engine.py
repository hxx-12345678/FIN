import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.engine import DriverBasedEngine

def test_industrial_engine_complex():
    print("--- Testing Industrial Driver-Based Engine ---")
    engine = DriverBasedEngine()
    
    # 1. Add Input Drivers
    engine.add_driver("d1", "Pricing", "revenue", "saas")
    engine.add_driver("d2", "Volume", "revenue", "saas")
    engine.add_driver("d3", "Fixed Costs", "cost", "opex")
    
    # Set values for 3 months
    engine.set_driver_values("d1", {"2024-01": 100, "2024-02": 100, "2024-03": 110})
    engine.set_driver_values("d2", {"2024-01": 500, "2024-02": 550, "2024-03": 600})
    engine.set_driver_values("d3", {"2024-01": 20000, "2024-02": 20000, "2024-03": 21000})
    
    # 2. Add Calculated Drivers
    # Revenue = Pricing * Volume
    engine.add_driver("d4", "Total Revenue", "revenue")
    engine.add_formula("d4", "pricing * volume", ["d1", "d2"])
    
    # Burn = Fixed Costs - Total Revenue
    engine.add_driver("d5", "Monthly Burn", "cost")
    engine.add_formula("d5", "fixed_costs - total_revenue", ["d3", "d4"])
    
    # 3. Compute
    months = ["2024-01", "2024-02", "2024-03"]
    results = engine.compute(months)
    
    # 4. Assertions
    # Jan: 100 * 500 = 50,000
    assert results["d4"]["2024-01"] == 50000.0
    # Jan Burn: 20000 - 50000 = -30000 (Profit)
    assert results["d5"]["2024-01"] == -30000.0
    
    # Mar: 110 * 600 = 66,000
    assert results["d4"]["2024-03"] == 66000.0
    # Mar Burn: 21000 - 66000 = -45000
    assert results["d5"]["2024-03"] == -45000.0
    
    print("✅ Unit Test: Formula Accuracy PASSED")
    
    # Test DAG Metadata
    meta = engine.get_dag_metadata()
    assert len(meta['nodes']) == 5
    assert len(meta['edges']) == 4 # d1->d4, d2->d4, d3->d5, d4->d5
    # d1, d2 -> d4
    # d3, d4 -> d5
    # So 4 edges. 
    print(f"Edges detected: {len(meta['edges'])}")
    
    print("✅ Unit Test: DAG Metadata PASSED")
    print("--- All Engine Tests Passed ---")

if __name__ == "__main__":
    test_industrial_engine_complex()
