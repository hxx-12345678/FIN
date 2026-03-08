"""
Enterprise Drift Monitor — 2026 Standards
==========================================
Detects deviation between forecasted values and actual business performance.
Automatically triggers 'Retraining Alerts' if statistical significance is lost.
"""

import numpy as np
import scipy.stats as stats
from typing import Dict, List, Any

class ForecastDriftMonitor:
    def __init__(self, threshold: float = 0.15, p_value_threshold: float = 0.05):
        self.threshold = threshold
        self.p_value_threshold = p_value_threshold

    def detect_drift(self, actuals: List[float], forecasts: List[float]) -> Dict[str, Any]:
        """
        Detect if the actual performance has drifted significantly from forecast.
        """
        if not actuals or not forecasts or len(actuals) < 3:
            return {'status': 'insufficient_data', 'drift_detected': False}

        n = min(len(actuals), len(forecasts))
        y_true = np.array(actuals[:n])
        y_pred = np.array(forecasts[:n])

        # 1. Percentage Variance
        variance = (y_true - y_pred) / np.maximum(np.abs(y_pred), 1.0)
        avg_variance = np.mean(variance)
        abs_avg_variance = np.abs(avg_variance)

        # 2. Statistical Significance (T-Test for mean shift)
        t_stat, p_val = stats.ttest_1samp(variance, 0.0)

        # 3. RMSE/MAE Check
        rmse = np.sqrt(np.mean((y_true - y_pred)**2))
        mape = np.mean(np.abs(variance)) * 100

        drift_detected = abs_avg_variance > self.threshold or (p_val < self.p_value_threshold if n >= 5 else False)

        severity = 'critical' if abs_avg_variance > self.threshold * 2 else 'warning' if drift_detected else 'nominal'

        return {
            'status': severity,
            'drift_detected': drift_detected,
            'metrics': {
                'avg_variance_pct': round(float(avg_variance * 100), 2),
                'p_value': round(float(p_val), 4) if not np.isnan(p_val) else 1.0,
                'rmse': round(float(rmse), 2),
                'mape': round(float(mape), 2)
            },
            'recommendation': self._get_recommendation(severity, abs_avg_variance)
        }

    def _get_recommendation(self, severity: str, variance: float) -> str:
        if severity == 'critical':
            return "IMMEDIATE ACTION REQUIRED: Model drift exceeds enterprise safety bounds. Forecast unreliable. Retrain and re-baseline immediately."
        elif severity == 'warning':
            return "ADVISORY: Moderate forecast drift detected. Schedule model recalibration during next budget cycle."
        return "NOMINAL: Model tracking actuals within established confidence intervals."

    @staticmethod
    def benchmark_performance(actuals_map: Dict[str, List[float]], forecast_map: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Compare multiple metrics against forecasts.
        """
        monitor = ForecastDriftMonitor()
        results = {}
        for metric, values in actuals_map.items():
            if metric in forecast_map:
                results[metric] = monitor.detect_drift(values, forecast_map[metric])
        
        return results
