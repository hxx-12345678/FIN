import sys
import os
import json
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from jobs.forecasting_engine import ForecastingEngine

def run_tests():
    import warnings
    warnings.filterwarnings('ignore')
    results = {}
    
    # 1
    history1 = [0, 0, 50000, 0, 0, 0, 80000, 0, 0, 10000, 0, 0]
    res1 = ForecastingEngine.forecast_arima(history1, steps=6)
    results['test1_mean'] = res1['mean']
    results['test1_pass'] = not any(np.isnan(res1['mean'])) and len(res1['mean']) == 6
    
    # 2
    history2 = [100000, 102000, 105000, 103000, 40000, 42000, 45000, 50000, 80000, 110000, 112000, 115000]
    res2 = ForecastingEngine.forecast_trend(history2, steps=6)
    results['test2_mean_last'] = res2['mean'][-1]
    results['test2_pass'] = res2['mean'][-1] > 100000
    
    # 3
    history3 = [10000 * (1.2 ** i) for i in range(12)]
    res3 = ForecastingEngine.forecast_trend(history3, steps=6)
    results['test3_last_hist'] = history3[-1]
    results['test3_forecast_last'] = res3['mean'][-1]
    results['test3_pass'] = res3['mean'][-1] > history3[-1]
    expected_exponential = history3[-1] * (1.2 ** 6)
    results['test3_expected'] = expected_exponential
    
    with open('d:\\Fin\\python-worker\\tests\\forecasting_results.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
