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
    def forecast_arima(history: List[float], steps: int, order: Tuple[int, int, int] = (1, 1, 1)) -> List[float]:
        """
        AutoRegressive Integrated Moving Average (ARIMA) forecast.
        """
        if len(history) < 10:
            # Fallback to trend if history is too short for meaningful ARIMA
            return ForecastingEngine.forecast_trend(history, steps)
            
        try:
            model = ARIMA(history, order=order)
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=steps)
            return [float(v) for v in forecast]
        except Exception as e:
            logger.warning(f"ARIMA failed: {e}. Falling back to trend.")
            return ForecastingEngine.forecast_trend(history, steps)

    @staticmethod
    def forecast_regression(history: List[float], steps: int, drivers_history: List[List[float]], drivers_forecast: List[List[float]]) -> List[float]:
        """
        Multi-variate regression using historical drivers.
        drivers_history: List of lists, where each sublist is the historical data for one driver.
        drivers_forecast: List of lists, where each sublist is the forecasted data for one driver.
        """
        if not drivers_history:
            return ForecastingEngine.forecast_trend(history, steps)
            
        y = np.array(history)
        X = np.array(drivers_history).T # Shape: (samples, features)
        
        if X.shape[0] != y.shape[0]:
            logger.warning(f"Regression shape mismatch: {X.shape[0]} samples vs {y.shape[0]} target points.")
            return ForecastingEngine.forecast_trend(history, steps)

        model = LinearRegression()
        model.fit(X, y)
        
        X_pred = np.array(drivers_forecast).T
        forecast = model.predict(X_pred)
        
        return [float(v) for v in forecast]

    @staticmethod
    def forecast_trend(history: List[float], steps: int) -> List[float]:
        """
        Simple linear trend projection using regression.
        """
        if not history:
            return [0.0] * steps
            
        y = np.array(history).reshape(-1, 1)
        X = np.arange(len(history)).reshape(-1, 1)
        
        model = LinearRegression()
        model.fit(X, y)
        
        X_pred = np.arange(len(history), len(history) + steps).reshape(-1, 1)
        forecast = model.predict(X_pred)
        return [float(v[0]) for v in forecast]

    @staticmethod
    def forecast_seasonal(history: List[float], steps: int, period: int = 12) -> List[float]:
        """
        Seasonal forecast using additive/multiplicative decomposition principles.
        """
        if len(history) < period * 2:
            return ForecastingEngine.forecast_trend(history, steps)
            
        # Basic seasonal approach: Trend + Average Seasonal Component
        y = np.array(history)
        
        # Decompose
        try:
            result = seasonal_decompose(y, model='additive', period=period, extrapolate_trend='freq')
            trend_model = LinearRegression()
            X = np.arange(len(y)).reshape(-1, 1)
            trend_model.fit(X, result.trend)
            
            X_pred = np.arange(len(y), len(y) + steps).reshape(-1, 1)
            future_trend = trend_model.predict(X_pred)
            
            # Cyclic seasonal component
            seasonal_cycle = result.seasonal[:period]
            future_seasonal = [seasonal_cycle[i % period] for i in range(len(y), len(y) + steps)]
            
            forecast = future_trend + future_seasonal
            return [float(v) for v in forecast]
        except Exception as e:
            logger.warning(f"Seasonal forecast failed: {e}")
            return ForecastingEngine.forecast_trend(history, steps)

    @staticmethod
    def calculate_metrics(actual: List[float], forecast: List[float]) -> Dict[str, float]:
        """
        Calculates accuracy metrics: MAPE, RMSE, MAE.
        """
        if not actual or not forecast:
            return {}
            
        n = min(len(actual), len(forecast))
        a = np.array(actual[:n])
        f = np.array(forecast[:n])
        
        # Mean Absolute Percentage Error
        mask = a != 0
        mape = np.mean(np.abs((a[mask] - f[mask]) / a[mask])) * 100 if any(mask) else 0.0
        
        # Root Mean Squared Error
        rmse = np.sqrt(np.mean((a - f)**2))
        
        # Mean Absolute Error
        mae = np.mean(np.abs(a - f))
        
        return {
            "mape": float(mape),
            "rmse": float(rmse),
            "mae": float(mae)
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
        results = {
            "arima": ForecastingEngine.forecast_arima(train_data, window),
            "trend": ForecastingEngine.forecast_trend(train_data, window),
            "seasonal": ForecastingEngine.forecast_seasonal(train_data, window)
        }
        
        metrics = {}
        for name, forecast in results.items():
            metrics[name] = ForecastingEngine.calculate_metrics(actual_data, forecast)
            
        return {
            "actual": actual_data,
            "forecasts": results,
            "metrics": metrics,
            "best_model": min(metrics, key=lambda k: metrics[k].get('mape', float('inf')))
        }
