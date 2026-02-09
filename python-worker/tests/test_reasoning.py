import sys
import os
import json
import unittest

# Add parent directory to path to import jobs
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.reasoning_engine import ModelReasoningEngine

class TestModelReasoning(unittest.TestCase):
    def setUp(self):
        self.engine = ModelReasoningEngine("test_model")
        
        # Define a simple SaaS model
        # Revenue = Customers * ARPU
        # Burn = OpsSpend + MarketingSpend
        # NetIncome = Revenue - Burn
        self.nodes = [
            {"id": "customers", "name": "Total Customers", "category": "operational"},
            {"id": "arpu", "name": "ARPU", "category": "operational"},
            {"id": "revenue", "name": "Total Revenue", "formula": "customers * arpu"},
            {"id": "ops_spend", "name": "Operations Spend", "category": "expense"},
            {"id": "mkt_spend", "name": "Marketing Spend", "category": "expense"},
            {"id": "burn", "name": "Total Burn", "formula": "ops_spend + mkt_spend"},
            {"id": "net_income", "name": "Net Income", "formula": "revenue - burn"}
        ]
        
        self.data = {
            "customers": {"Jan 2024": 100, "Feb 2024": 100},
            "arpu": {"Jan 2024": 50, "Feb 2024": 50},
            "ops_spend": {"Jan 2024": 2000, "Feb 2024": 2000},
            "mkt_spend": {"Jan 2024": 1000, "Feb 2024": 1000}
        }
        
        self.engine.hydrate_from_json(self.nodes, self.data)

    def test_driver_analysis(self):
        # Revenue should be driven by customers and arpu
        result = self.engine.analyze_drivers("revenue")
        driver_ids = [d['id'] for d in result['drivers']]
        
        self.assertIn("customers", driver_ids)
        self.assertIn("arpu", driver_ids)
        
        # Sensitivity check: 10% increase in customers (100 -> 110)
        # Revenue Jan: 100*50 = 5000. New: 110*50 = 5500. Delta = 500/5000 = 10%.
        # Sensitivity should be 0.1
        customer_driver = next(d for d in result['drivers'] if d['id'] == "customers")
        self.assertAlmostEqual(customer_driver['sensitivity'], 0.1, places=2)

    def test_net_income_drivers(self):
        # Net Income driven by all 4 inputs
        result = self.engine.analyze_drivers("net_income")
        driver_ids = [d['id'] for d in result['drivers']]
        
        self.assertIn("customers", driver_ids)
        self.assertIn("ops_spend", driver_ids)
        
        # Ops spend is negative driver
        ops_driver = next(d for d in result['drivers'] if d['id'] == "ops_spend")
        self.assertLess(ops_driver['sensitivity'], 0)

    def test_weak_assumptions(self):
        # All our inputs are static (flat), so they should all be flagged
        weak_points = self.engine.detect_weak_assumptions()
        self.assertGreater(len(weak_points), 0)
        
        names = [p['name'] for p in weak_points]
        self.assertIn("Total Customers", names)

    def test_scenario_simulation(self):
        # +20% Revenue growth via customers
        result = self.engine.simulate_scenario("net_income", {"customers": 0.2})
        
        # Baseline NI: (100*50) - (2000+1000) = 5000 - 3000 = 2000
        # Simulated NI: (120*50) - 3000 = 6000 - 3000 = 3000
        # Variance: 1000
        self.assertEqual(result['baseline'], 4000) # (Jan+Feb) = 2000*2
        self.assertEqual(result['scenario'], 6000) # (3000*2)
        self.assertAlmostEqual(result['variance_percent'], 0.5, places=2) # 2000/4000 = 50%

if __name__ == '__main__':
    unittest.main()
