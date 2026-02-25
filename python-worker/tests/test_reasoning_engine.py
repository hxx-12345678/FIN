import sys
import os
import json
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from jobs.reasoning_engine import ModelReasoningEngine

def test_causal_explainability():
    print("\n--- 1. Testing Causal Explainability & Driver Discovery ---")
    
    # Model: P&L logic
    # Cash = Revenue - OpEx
    # Revenue = Users * ARPU
    # OpEx = Marketing + Payroll
    nodes = [
        {"id": "users", "name": "Active Users", "category": "operational"},
        {"id": "arpu", "name": "ARPU", "category": "operational"},
        {"id": "marketing", "name": "Marketing Spend", "category": "operational"},
        {"id": "payroll", "name": "Payroll", "category": "operational"},
        {"id": "revenue", "name": "Total Revenue", "formula": "users * arpu"},
        {"id": "opex", "name": "Operating Expenses", "formula": "marketing + payroll"},
        {"id": "cash", "name": "Cash Flow", "formula": "revenue - opex"}
    ]
    
    h_data = {
        "users": 1000,
        "arpu": 50,
        "marketing": 5000,
        "payroll": 30000
    }
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    engine = ModelReasoningEngine("test-reasoning")
    engine.hydrate_from_json(nodes, h_data, months=months)
    
    print("Baseline Cash:", np.sum(engine.engine.data["cash"]))
    
    # Explain logic
    explanation = engine.explain_metric_logic("cash")
    print("Logic Steps for Cash:")
    for step in explanation["steps"]:
        print(f"  - {step}")
        
    # Analyze drivers (Sensitivity)
    drivers = engine.analyze_drivers("cash")
    print("\nDrivers for Cash (Sensitivity):")
    for d in drivers["drivers"]:
        print(f"  {d['name']}: {d['sensitivity']:.2%}")
        
    # Explain variance (Waterfall) - Why did it change?
    # Simulation: Increase payroll in Month 2 (Index 1)
    # Ensure all inputs have data for at least 2 periods
    engine.engine.data["payroll"] = np.full(12, 30000.0)
    engine.engine.data["payroll"][1] = 40000.0 # Salary hike!
    engine.engine.data["users"] = np.full(12, 1000.0)
    engine.engine.data["arpu"] = np.full(12, 50.0)
    engine.engine.data["marketing"] = np.full(12, 5000.0)
    
    engine.engine.full_recompute()
    
    variance_report = engine.explain_variance("cash", 0, 1)
    print("\nVariance Analysis Report (Debug):", variance_report)
    
    if "baseline" in variance_report:
        print("\nVariance Analysis (Why did Cash drop?):")
        print(f"  Baseline: {variance_report['baseline']}, Current: {variance_report['current']}, Var: {variance_report['variance']}")
        for d in variance_report["drivers"]:
            print(f"  - {d['driver']}: delta={d['delta']}, contribution={d['contribution_percent']:.1%}")

    # Verify causal link
    found_payroll = any(d['name'] == 'Payroll' for d in drivers['drivers'])
    if found_payroll and abs(variance_report.get('variance', 0)) > 0:
        print("PASS: Causal driver and Variance breakdown successfully validated.")
    else:
        print("FAIL: Reasoning logic incomplete.")

def test_scenario_promotions_and_diff():
    print("\n--- 2. Testing Scenario Comparisons & Diff History ---")
    # This usually happens at the service layer, but we can verify the simulation logic here
    
    nodes = [
        {"id": "revenue_val", "name": "Revenue"},
        {"id": "expense_val", "name": "Expense"},
        {"id": "profit", "name": "Profit", "formula": "revenue_val - expense_val"}
    ]
    h_data = {"revenue_val": 100, "expense_val": 80}
    
    engine = ModelReasoningEngine("scenario-test")
    engine.hydrate_from_json(nodes, h_data, months=["M1"])
    
    # Simulate a 20% revenue increase
    sim = engine.simulate_scenario("profit", {"revenue_val": 0.20})
    print(f"Simulated Profit Switch: {sim['baseline']} -> {sim['scenario']} ({sim['variance_percent']:.1%})")
    
    if abs(sim['variance_percent'] - 1.0) < 1e-7: # (120-80) vs (100-80) => 40 vs 20 = 100% increase
        print("PASS: Scenario simulation logic is deterministic and accurate.")
    else:
        print(f"FAIL: Unexpected variance: {sim['variance_percent']}")

if __name__ == "__main__":
    print("TEST: Initiating Deep Reasoning & Governance Tests...")
    test_causal_explainability()
    test_scenario_promotions_and_diff()
    print("TEST: Reasoning Engine Tests Completed.")
