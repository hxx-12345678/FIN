"""
Industrial Forecasting Engine
============================
Supports statistical and machine learning models for financial forecasting:
- Time Series: ARIMA, Seasonal Decomposition
- Statistical: Linear/Polynomial Regression, Trend Projection
- Advanced: Rolling forecasts with accuracy tracking (MAPE)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.seasonal import seasonal_decompose
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import logging

logger = logging.getLogger(__name__)

class ForecastingEngine:
    """
    Forecasting Engine for predictive financial modeling.
    """
    
    @staticmethod
    def forecast_arima(history: List[float], steps: int, order: Tuple[int, int, int] = (1, 1, 1)) -> Dict[str, Any]:
        """
        AutoRegressive Integrated Moving Average (ARIMA) forecast.
        """
        if len(history) < 10:
            return ForecastingEngine.forecast_trend(history, steps)
            
        try:
            model = ARIMA(history, order=order)
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=steps)
            
            # Simple interval heuristic for ARIMA
            std = np.std(history) if len(history) > 1 else (history[0] * 0.1 if history[0] != 0 else 1.0)
            ints = np.sqrt(np.arange(1, steps + 1))
            
            return {
                "mean": [float(v) for v in forecast],
                "lower": [float(v - 1.96 * std * ints[i]) for i, v in enumerate(forecast)],
                "upper": [float(v + 1.96 * std * ints[i]) for i, v in enumerate(forecast)]
            }
        except Exception as e:
            logger.warning(f"ARIMA failed: {e}. Falling back to trend.")
            return ForecastingEngine.forecast_trend(history, steps)

    @staticmethod
    def forecast_regression(history: List[float], steps: int, drivers_history: List[List[float]], drivers_forecast: List[List[float]]) -> Dict[str, Any]:
        """
        Multi-variate regression with confidence intervals.
        """
        if not drivers_history:
            return ForecastingEngine.forecast_trend(history, steps)
            
        y = np.array(history)
        X = np.array(drivers_history).T
        
        if X.shape[0] != y.shape[0]:
            return ForecastingEngine.forecast_trend(history, steps)

        model = LinearRegression()
        model.fit(X, y)
        
        # Interval based on residuals
        y_pred_hist = model.predict(X)
        std = np.std(y - y_pred_hist) if len(y) > 1 else (y[0] * 0.1 if y[0] != 0 else 1.0)
        
        X_pred = np.array(drivers_forecast).T
        mean_forecast = model.predict(X_pred)
        
        ints = np.sqrt(np.arange(1, steps + 1))
        
        return {
            "mean": [float(v) for v in mean_forecast],
            "lower": [float(v - 1.96 * std * ints[i]) for i, v in enumerate(mean_forecast)],
            "upper": [float(v + 1.96 * std * ints[i]) for i, v in enumerate(mean_forecast)]
        }

    @staticmethod
    def forecast_trend(history: List[float], steps: int) -> Dict[str, Any]:
        """
        Simple linear trend projection with 95% confidence intervals.
        Returns {mean: [], lower: [], upper: []}
        """
        if not history:
            return {"mean": [0.0] * steps, "lower": [0.0] * steps, "upper": [0.0] * steps}
            
        y = np.array(history).reshape(-1, 1)
        X = np.arange(len(history)).reshape(-1, 1)
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Calculate standard error for confidence intervals
        y_pred_hist = model.predict(X)
        residuals = y - y_pred_hist
        std_err = np.std(residuals) if len(residuals) > 1 else (y[0] * 0.1 if y[0] != 0 else 1.0)
        
        if steps == 0:
            X_pred = X
        else:
            X_pred = np.arange(len(history), len(history) + steps).reshape(-1, 1)
            
        mean_forecast = model.predict(X_pred).flatten()
        
        # 95% interval is approx mean +/- 1.96 * std_err
        # For forecasting, the uncertainty grows over time (sqrt growth)
        intervals = np.sqrt(np.arange(1, len(X_pred) + 1)) if steps > 0 else np.ones(len(X_pred))
        lower = mean_forecast - (1.96 * std_err * intervals)
        upper = mean_forecast + (1.96 * std_err * intervals)
        
        # Sanitize
        res = {
            "mean": [float(v) if np.isfinite(v) else 0.0 for v in mean_forecast],
            "lower": [float(v) if np.isfinite(v) else 0.0 for v in lower],
            "upper": [float(v) if np.isfinite(v) else 0.0 for v in upper]
        }
        
        if steps == 0:
            return res["mean"] # Backward compatibility for calculate_metrics
        return res

    @staticmethod
    def forecast_seasonal(history: List[float], steps: int, period: int = 12) -> Dict[str, Any]:
        """
        Seasonal forecast using additive/multiplicative decomposition principles.
        """
        if len(history) < period * 2:
            return ForecastingEngine.forecast_trend(history, steps)
            
        y = np.array(history)
        
        try:
            result = seasonal_decompose(y, model='additive', period=period, extrapolate_trend='freq')
            trend_model = LinearRegression()
            X = np.arange(len(y)).reshape(-1, 1)
            trend_model.fit(X, result.trend)
            
            X_pred = np.arange(len(y), len(y) + steps).reshape(-1, 1)
            future_trend = trend_model.predict(X_pred)
            
            seasonal_cycle = result.seasonal[:period]
            future_seasonal = np.array([seasonal_cycle[i % period] for i in range(len(y), len(y) + steps)])
            
            mean_forecast = future_trend + future_seasonal
            
            # Use residual std for intervals
            std = np.std(result.resid[~np.isnan(result.resid)])
            ints = np.sqrt(np.arange(1, steps + 1))
            
            return {
                "mean": [float(v) for v in mean_forecast],
                "lower": [float(v - 1.96 * std * ints[i]) for i, v in enumerate(mean_forecast)],
                "upper": [float(v + 1.96 * std * ints[i]) for i, v in enumerate(mean_forecast)]
            }
        except Exception as e:
            logger.warning(f"Seasonal forecast failed: {e}")
            return ForecastingEngine.forecast_trend(history, steps)

    @staticmethod
    def calculate_metrics(actual: List[float], forecast: List[float]) -> Dict[str, float]:
        """
        Calculates accuracy metrics: MAPE, RMSE, MAE.
        """
        if not actual or not forecast:
            return {"mape": 0.0, "rmse": 0.0, "mae": 0.0}
            
        if isinstance(forecast, dict):
            forecast = forecast.get('mean', [])
            
        n = min(len(actual), len(forecast))
        if n == 0:
            return {"mape": 0.0, "rmse": 0.0, "mae": 0.0}
            
        a = np.array(actual[:n])
        f = np.array(forecast[:n])
        
        # Mean Absolute Percentage Error
        mask = (a != 0)
        mape = np.mean(np.abs((a[mask] - f[mask]) / a[mask])) * 100 if any(mask) else 0.0
        
        # Root Mean Squared Error
        rmse = np.sqrt(np.mean((a - f)**2))
        
        # Mean Absolute Error
        mae = np.mean(np.abs(a - f))
        
        # Sanitize for JSON (NaN -> 0)
        return {
            "mape": float(mape) if np.isfinite(mape) else 0.0,
            "rmse": float(rmse) if np.isfinite(rmse) else 0.0,
            "mae": float(mae) if np.isfinite(mae) else 0.0
        }

    @staticmethod
    def run_backtest(history: List[float], window: int = 12) -> Dict[str, Any]:
        """
        Performs backtesting on previous periods to validate accuracy.
        """
        if len(history) <= window:
            return {"error": "Insufficient history for backtesting"}
            
        train_data = history[:-window]
        actual_data = history[-window:]
        
        # Run multiple models and compare
        raw_results = {
            "arima": ForecastingEngine.forecast_arima(train_data, window),
            "trend": ForecastingEngine.forecast_trend(train_data, window),
            "seasonal": ForecastingEngine.forecast_seasonal(train_data, window)
        }
        
        # Extract mean for flat arrays, keep bands for bracket testing
        flat_results = {}
        for name, res in raw_results.items():
            if isinstance(res, dict):
                flat_results[name] = res.get('mean', [])
            else:
                flat_results[name] = res
        
        metrics = {}
        for name, forecast in flat_results.items():
            metrics[name] = ForecastingEngine.calculate_metrics(actual_data, forecast)
            
        return {
            "actual": actual_data,
            "forecasts": flat_results,
            "metrics": metrics,
            "best_model": min(metrics, key=lambda k: metrics[k].get('mape', float('inf')))
        }
