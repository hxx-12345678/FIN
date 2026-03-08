"""
AI Financial Modeling Pipeline — Correct 2026 Flow
=====================================================
Implements the enterprise-mandated 5-step AI modeling process:

Step 1: Data Profiling Agent — Detect patterns, anomalies, seasonality
Step 2: Model Selection Agent — Choose best statistical + driver model
Step 3: Assumption Generator — Generate assumptions with confidence intervals
Step 4: Human Confirmation — User edits/approves (handled by frontend)
Step 5: Deterministic Engine Executes — AI does NOT execute math

CRITICAL RULES:
- AI must SUGGEST assumptions
- AI must RANK sensitivities
- AI must PROVIDE reasoning
- AI must NEVER bypass deterministic engine
- AI must NEVER hide uncertainty
- AI must ALWAYS provide confidence intervals

This module returns structured recommendations for human review.
The DAG engine (Hyperblock) executes the actual computation.
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# STEP 1: DATA PROFILING AGENT
# =============================================================================

class DataProfilingAgent:
    """
    Analyzes raw financial data to detect:
    - Growth trends (linear, exponential, declining)
    - Volatility level (low/medium/high)
    - Churn patterns (if applicable)
    - Seasonality (monthly, quarterly patterns)
    - Anomalies (outliers, sudden shifts)
    - Data quality issues
    
    Output: Structured profile that feeds into Model Selection Agent.
    """

    @staticmethod
    def profile(
        data: Dict[str, List[float]],
        labels: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Profile all provided time series.
        
        data: { 'revenue': [100, 120, ...], 'expenses': [...] }
        labels: { 'revenue': 'Monthly Revenue (USD)' }
        
        Returns comprehensive data profile.
        """
        profiles = {}
        overall_quality_score = 0
        series_count = 0

        for metric_name, values in data.items():
            if not values or len(values) < 3:
                profiles[metric_name] = {
                    'status': 'insufficient_data',
                    'data_points': len(values) if values else 0,
                    'quality_score': 0
                }
                continue

            series_count += 1
            y = np.array(values, dtype=float)

            profile = {
                'data_points': len(y),
                'label': (labels or {}).get(metric_name, metric_name)
            }

            # 1. Basic Statistics
            profile['statistics'] = {
                'mean': round(float(np.mean(y)), 2),
                'median': round(float(np.median(y)), 2),
                'std': round(float(np.std(y)), 2),
                'cv': round(float(np.std(y) / np.mean(y)) if np.mean(y) != 0 else 0, 4),
                'min': round(float(np.min(y)), 2),
                'max': round(float(np.max(y)), 2),
                'range': round(float(np.max(y) - np.min(y)), 2),
                'skewness': round(float(DataProfilingAgent._skewness(y)), 4),
                'kurtosis': round(float(DataProfilingAgent._kurtosis(y)), 4)
            }

            # 2. Growth Trend Detection
            profile['growth'] = DataProfilingAgent._detect_growth(y)

            # 3. Volatility Assessment
            profile['volatility'] = DataProfilingAgent._assess_volatility(y)

            # 4. Seasonality Detection
            profile['seasonality'] = DataProfilingAgent._detect_seasonality(y)

            # 5. Anomaly Detection
            profile['anomalies'] = DataProfilingAgent._detect_anomalies(y)

            # 6. Churn Pattern Detection (if applicable)
            if 'churn' in metric_name.lower() or 'retention' in metric_name.lower() or 'customer' in metric_name.lower():
                profile['churn_pattern'] = DataProfilingAgent._detect_churn(y)

            # 7. Data Quality Score
            quality = DataProfilingAgent._quality_score(y)
            profile['quality_score'] = quality
            overall_quality_score += quality

            profiles[metric_name] = profile

        return {
            'profiles': profiles,
            'overall': {
                'series_analyzed': series_count,
                'avg_quality_score': round(overall_quality_score / max(series_count, 1), 1),
                'sufficient_for_modeling': series_count > 0 and overall_quality_score / max(series_count, 1) > 40,
                'profiled_at': datetime.now().isoformat()
            },
            'recommendations': DataProfilingAgent._generate_recommendations(profiles)
        }

    @staticmethod
    def _detect_growth(y: np.ndarray) -> Dict[str, Any]:
        """Detect growth pattern."""
        if len(y) < 3:
            return {'pattern': 'unknown', 'rate': 0}

        # Linear fit
        x = np.arange(len(y))
        slope, intercept = np.polyfit(x, y, 1)
        
        # Check for exponential growth (all positive)
        is_exp = False
        exp_rate = 0.0
        if all(v > 0 for v in y):
            log_y = np.log(y)
            exp_slope, _ = np.polyfit(x, log_y, 1)
            # R² comparison
            lin_residuals = y - (slope * x + intercept)
            exp_residuals = y - np.exp(exp_slope * x + _)
            lin_r2 = 1 - np.sum(lin_residuals**2) / np.sum((y - np.mean(y))**2)
            exp_r2 = 1 - np.sum(exp_residuals**2) / np.sum((y - np.mean(y))**2) if np.sum((y - np.mean(y))**2) > 0 else 0
            
            if exp_r2 > lin_r2 + 0.05:
                is_exp = True
                exp_rate = float(np.exp(exp_slope) - 1)

        # Classify
        mean = np.mean(y)
        monthly_growth_rate = slope / max(abs(mean), 1)

        if is_exp:
            pattern = 'exponential'
            rate = exp_rate
        elif monthly_growth_rate > 0.03:
            pattern = 'strong_growth'
            rate = monthly_growth_rate
        elif monthly_growth_rate > 0.01:
            pattern = 'moderate_growth'
            rate = monthly_growth_rate
        elif monthly_growth_rate > -0.01:
            pattern = 'stable'
            rate = monthly_growth_rate
        elif monthly_growth_rate > -0.03:
            pattern = 'moderate_decline'
            rate = monthly_growth_rate
        else:
            pattern = 'sharp_decline'
            rate = monthly_growth_rate

        # CAGR
        if len(y) >= 12 and y[0] > 0:
            cagr = (y[-1] / y[0]) ** (12 / len(y)) - 1
        else:
            cagr = monthly_growth_rate * 12

        return {
            'pattern': pattern,
            'monthly_rate': round(float(rate), 4),
            'annualized_rate': round(float(rate * 12 if not is_exp else (1 + rate)**12 - 1), 4),
            'cagr': round(float(cagr), 4),
            'is_exponential': is_exp,
            'confidence': round(float(max(0, min(1, abs(monthly_growth_rate) * 10))), 2)
        }

    @staticmethod
    def _assess_volatility(y: np.ndarray) -> Dict[str, Any]:
        """Assess volatility level."""
        cv = float(np.std(y) / np.mean(y)) if np.mean(y) != 0 else 0

        # Monthly returns volatility
        returns = []
        for i in range(1, len(y)):
            if y[i-1] != 0:
                returns.append((y[i] - y[i-1]) / abs(y[i-1]))

        vol = float(np.std(returns)) if returns else 0

        if vol < 0.05:
            level = 'low'
        elif vol < 0.15:
            level = 'medium'
        elif vol < 0.30:
            level = 'high'
        else:
            level = 'extreme'

        return {
            'level': level,
            'coefficient_of_variation': round(cv, 4),
            'monthly_volatility': round(vol, 4),
            'annualized_volatility': round(vol * np.sqrt(12), 4)
        }

    @staticmethod
    def _detect_seasonality(y: np.ndarray) -> Dict[str, Any]:
        """Detect seasonal patterns."""
        if len(y) < 12:
            return {'detected': False, 'reason': 'insufficient_data', 'period': None}

        # Auto-correlation based detection
        from numpy.fft import fft

        # Detrend
        x = np.arange(len(y))
        slope, intercept = np.polyfit(x, y, 1)
        detrended = y - (slope * x + intercept)

        # FFT
        n = len(detrended)
        spectrum = np.abs(fft(detrended))[:n // 2]

        if len(spectrum) < 3:
            return {'detected': False, 'reason': 'insufficient_spectrum', 'period': None}

        # Find dominant frequency (skip DC component)
        dominant_freq_idx = np.argmax(spectrum[1:]) + 1
        period = n / dominant_freq_idx if dominant_freq_idx > 0 else 0

        # Strength: ratio of dominant to mean
        strength = float(spectrum[dominant_freq_idx] / np.mean(spectrum[1:])) if np.mean(spectrum[1:]) > 0 else 0

        detected = strength > 2.0 and 2 <= period <= 24

        # Classify period
        if detected:
            if abs(period - 12) < 2:
                period_type = 'annual'
            elif abs(period - 4) < 1:
                period_type = 'quarterly'
            elif abs(period - 6) < 1:
                period_type = 'semi_annual'
            else:
                period_type = f'{round(period)}_month'
        else:
            period_type = None

        return {
            'detected': detected,
            'period': round(float(period), 1) if detected else None,
            'period_type': period_type,
            'strength': round(float(strength), 2),
            'confidence': round(min(1.0, float(strength) / 5.0), 2) if detected else 0
        }

    @staticmethod
    def _detect_anomalies(y: np.ndarray) -> Dict[str, Any]:
        """Detect anomalies using IQR and Z-score methods."""
        anomalies = []

        if len(y) < 4:
            return {'count': 0, 'anomalies': [], 'pct_anomalous': 0}

        mean = np.mean(y)
        std = np.std(y)
        q1, q3 = np.percentile(y, [25, 75])
        iqr = q3 - q1

        for i, val in enumerate(y):
            reasons = []

            # Z-score method
            if std > 0:
                z = abs(val - mean) / std
                if z > 3:
                    reasons.append(f'z_score={z:.2f}')

            # IQR method
            if iqr > 0:
                if val < q1 - 1.5 * iqr or val > q3 + 1.5 * iqr:
                    reasons.append('outside_iqr')

            # Sudden change from previous
            if i > 0 and y[i-1] != 0:
                pct_change = abs(val - y[i-1]) / abs(y[i-1])
                if pct_change > 0.5:
                    reasons.append(f'sudden_change={pct_change:.0%}')

            if reasons:
                anomalies.append({
                    'index': i,
                    'value': round(float(val), 2),
                    'reasons': reasons
                })

        return {
            'count': len(anomalies),
            'anomalies': anomalies,
            'pct_anomalous': round(len(anomalies) / len(y) * 100, 1)
        }

    @staticmethod
    def _detect_churn(y: np.ndarray) -> Dict[str, Any]:
        """Detect churn patterns in customer/retention data."""
        if len(y) < 3:
            return {'pattern': 'unknown'}

        avg_churn = float(np.mean(y))
        trend_slope = np.polyfit(np.arange(len(y)), y, 1)[0]
        
        if trend_slope > 0.001:
            pattern = 'increasing_churn'
            severity = 'warning'
        elif trend_slope < -0.001:
            pattern = 'improving_retention'
            severity = 'positive'
        else:
            pattern = 'stable_churn'
            severity = 'neutral'

        return {
            'pattern': pattern,
            'severity': severity,
            'avg_rate': round(avg_churn, 4),
            'trend': round(float(trend_slope), 6),
            'latest': round(float(y[-1]), 4)
        }

    @staticmethod
    def _quality_score(y: np.ndarray) -> float:
        """Score data quality 0-100."""
        score = 100

        # Length
        if len(y) < 6: score -= 30
        elif len(y) < 12: score -= 15
        elif len(y) < 24: score -= 5

        # Zeros
        zeros = sum(1 for v in y if v == 0)
        if zeros / len(y) > 0.2: score -= 20
        elif zeros / len(y) > 0.1: score -= 10

        # NaN/Inf check
        invalids = sum(1 for v in y if not np.isfinite(v))
        score -= invalids * 10

        # Outlier penalty
        if len(y) > 3:
            std = np.std(y)
            mean = np.mean(y)
            if std > 0:
                outliers = sum(1 for v in y if abs(v - mean) > 3 * std)
                score -= outliers * 5

        return max(0, min(100, round(score, 1)))

    @staticmethod
    def _skewness(y: np.ndarray) -> float:
        n = len(y)
        if n < 3: return 0.0
        mean = np.mean(y)
        std = np.std(y)
        if std == 0: return 0.0
        return float(np.mean(((y - mean) / std) ** 3))

    @staticmethod
    def _kurtosis(y: np.ndarray) -> float:
        n = len(y)
        if n < 4: return 0.0
        mean = np.mean(y)
        std = np.std(y)
        if std == 0: return 0.0
        return float(np.mean(((y - mean) / std) ** 4) - 3)

    @staticmethod
    def _generate_recommendations(profiles: Dict[str, Dict]) -> List[Dict[str, str]]:
        """Generate actionable recommendations based on profiles."""
        recs = []

        for name, profile in profiles.items():
            if profile.get('status') == 'insufficient_data':
                recs.append({
                    'metric': name,
                    'type': 'data_quality',
                    'message': f"Insufficient data for {name}. Need at least 6 months of history.",
                    'priority': 'high'
                })
                continue

            growth = profile.get('growth', {})
            vol = profile.get('volatility', {})
            season = profile.get('seasonality', {})
            anomalies = profile.get('anomalies', {})

            if growth.get('pattern') == 'sharp_decline':
                recs.append({
                    'metric': name,
                    'type': 'growth_concern',
                    'message': f"{name} shows sharp decline ({growth.get('annualized_rate', 0):.0%}/yr). Investigate root cause.",
                    'priority': 'high'
                })

            if vol.get('level') in ['high', 'extreme']:
                recs.append({
                    'metric': name,
                    'type': 'volatility_warning',
                    'message': f"{name} has {vol['level']} volatility. Use wider confidence intervals in forecasting.",
                    'priority': 'medium'
                })

            if season.get('detected'):
                recs.append({
                    'metric': name,
                    'type': 'seasonality_detected',
                    'message': f"{name} shows {season.get('period_type', '')} seasonality. Use seasonal forecasting method.",
                    'priority': 'info'
                })

            if anomalies.get('count', 0) > 2:
                recs.append({
                    'metric': name,
                    'type': 'anomaly_alert',
                    'message': f"{name} has {anomalies['count']} anomalies. Review for data errors or regime shifts.",
                    'priority': 'medium'
                })

        return recs


# =============================================================================
# STEP 2: MODEL SELECTION AGENT
# =============================================================================

class ModelSelectionAgent:
    """
    Recommends the best forecasting approach based on data profile.
    
    Does NOT execute the model — only recommends.
    The deterministic engine executes.
    """

    @staticmethod
    def recommend(
        profile: Dict[str, Any],
        metric_name: str = 'revenue',
        business_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Recommend forecasting method with reasoning.
        
        Returns structured recommendation for human review.
        """
        metric_profile = profile.get('profiles', {}).get(metric_name, {})
        
        if metric_profile.get('status') == 'insufficient_data':
            return {
                'primary_method': 'manual_input',
                'reasoning': 'Insufficient historical data. Manual input required.',
                'confidence': 'low',
                'alternative_methods': [],
                'requires_human_input': True
            }

        growth = metric_profile.get('growth', {})
        volatility = metric_profile.get('volatility', {})
        seasonality = metric_profile.get('seasonality', {})
        quality = metric_profile.get('quality_score', 50)
        data_points = metric_profile.get('data_points', 0)

        recommendations = []
        reasoning = []

        # Rule-based selection
        if seasonality.get('detected') and data_points >= 24:
            recommendations.append({
                'method': 'seasonal_decomposition',
                'weight': 0.35,
                'reason': f"Strong {seasonality.get('period_type', 'annual')} seasonality detected"
            })
            reasoning.append(f"Seasonal pattern detected with {seasonality.get('confidence', 0):.0%} confidence")

        if data_points >= 12 and quality >= 60:
            recommendations.append({
                'method': 'arima',
                'weight': 0.30,
                'reason': 'Sufficient history for ARIMA time series modeling'
            })
            reasoning.append("12+ months of quality data available for ARIMA")

        if growth.get('is_exponential'):
            recommendations.append({
                'method': 'exponential_trend',
                'weight': 0.25,
                'reason': 'Exponential growth pattern detected (common in SaaS)'
            })
            reasoning.append(f"Exponential growth at {growth.get('annualized_rate', 0):.0%}/year")
        else:
            recommendations.append({
                'method': 'linear_trend',
                'weight': 0.20,
                'reason': 'Linear trend projection as baseline'
            })

        # Driver-based always recommended as overlay
        business_context = business_context or {}
        if business_context.get('has_drivers', False):
            recommendations.append({
                'method': 'driver_based',
                'weight': 0.25,
                'reason': 'Driver-based overlay for business logic'
            })
            reasoning.append("Driver-based adjustments recommended for business-specific factors")

        # High volatility → Monte Carlo
        if volatility.get('level') in ['high', 'extreme']:
            recommendations.append({
                'method': 'monte_carlo_overlay',
                'weight': 0.15,
                'reason': f"High volatility ({volatility.get('level')}) requires stochastic modeling"
            })
            reasoning.append("Monte Carlo simulation recommended due to high volatility")

        # Sort by weight
        recommendations.sort(key=lambda x: x['weight'], reverse=True)
        primary = recommendations[0]['method'] if recommendations else 'trend'

        # Choose hybrid approach
        if len(recommendations) >= 2:
            approach = 'hybrid'
            reasoning.append("Hybrid approach recommended: statistical base + driver overrides")
        else:
            approach = 'single'

        # Confidence level
        if quality >= 80 and data_points >= 24:
            confidence = 'high'
        elif quality >= 60 and data_points >= 12:
            confidence = 'medium'
        else:
            confidence = 'low'

        return {
            'primary_method': primary,
            'approach': approach,
            'methods_ranked': recommendations,
            'reasoning': reasoning,
            'confidence': confidence,
            'data_quality_score': quality,
            'data_points': data_points,
            'requires_human_input': confidence == 'low',
            'ai_note': "These are recommendations only. The deterministic engine will execute the chosen method. "
                      "Please review and adjust before running."
        }


# =============================================================================
# STEP 3: ASSUMPTION GENERATOR
# =============================================================================

class AssumptionGenerator:
    """
    Generates model assumptions with:
    - Confidence intervals
    - Reasoning traces
    - Sensitivity indicators
    - Industry benchmark comparisons
    
    Returns assumptions for human review (Step 4).
    """

    @staticmethod
    def generate(
        data_profile: Dict[str, Any],
        model_recommendation: Dict[str, Any],
        business_context: Dict[str, Any] = None,
        industry_benchmarks: Dict[str, Dict] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive assumptions with reasoning.
        
        Returns structure for human review/approval.
        """
        business = business_context or {}
        benchmarks = industry_benchmarks or AssumptionGenerator._default_benchmarks()

        profiles = data_profile.get('profiles', {})
        assumptions = {}

        # Revenue assumptions
        revenue_profile = profiles.get('revenue', {})
        revenue_growth = revenue_profile.get('growth', {})
        revenue_vol = revenue_profile.get('volatility', {})

        base_growth = revenue_growth.get('annualized_rate', 0.10)
        vol_factor = 1.0 + (0.5 if revenue_vol.get('level') == 'high' else 0)

        assumptions['revenue_growth'] = {
            'value': round(base_growth, 4),
            'confidence_interval': [
                round(base_growth - 0.05 * vol_factor, 4),
                round(base_growth + 0.05 * vol_factor, 4)
            ],
            'confidence_level': 0.80,
            'reasoning': f"Based on {revenue_growth.get('pattern', 'observed')} trend at "
                        f"{base_growth:.1%}/year. Volatility: {revenue_vol.get('level', 'medium')}.",
            'source': 'historical_analysis',
            'benchmark': benchmarks.get('revenue_growth', {}),
            'sensitivity': 'high',  # Impact on model
            'editable': True
        }

        # Expense assumptions
        expense_profile = profiles.get('expenses', profiles.get('opex', {}))
        expense_growth = expense_profile.get('growth', {})

        expense_rate = expense_growth.get('annualized_rate', 0.06) if expense_growth else 0.06
        assumptions['expense_growth'] = {
            'value': round(expense_rate, 4),
            'confidence_interval': [round(expense_rate - 0.03, 4), round(expense_rate + 0.03, 4)],
            'confidence_level': 0.80,
            'reasoning': f"Operating expenses trending at {expense_rate:.1%}/year.",
            'source': 'historical_analysis',
            'sensitivity': 'high',
            'editable': True
        }

        # Churn/retention
        churn_profile = profiles.get('churn', profiles.get('churn_rate', {}))
        if churn_profile and churn_profile.get('statistics'):
            churn_val = churn_profile['statistics'].get('mean', 0.05)
        else:
            churn_val = float(business.get('churn_rate', 0.05))

        assumptions['churn_rate'] = {
            'value': round(churn_val, 4),
            'confidence_interval': [round(max(0, churn_val - 0.02), 4), round(churn_val + 0.02, 4)],
            'confidence_level': 0.75,
            'reasoning': f"Monthly churn estimated at {churn_val:.1%}. "
                        f"{'Based on historical data.' if churn_profile else 'Based on industry average.'}",
            'source': 'historical' if churn_profile else 'benchmark',
            'sensitivity': 'high',
            'editable': True
        }

        # COGS percentage
        rev_data = profiles.get('revenue', {}).get('statistics', {}).get('mean', 0)
        cogs_data = profiles.get('cogs', {}).get('statistics', {}).get('mean', 0)
        if rev_data > 0 and cogs_data > 0:
            cogs_pct = cogs_data / rev_data
        else:
            cogs_pct = float(business.get('cogs_pct', 0.30))

        assumptions['cogs_percentage'] = {
            'value': round(cogs_pct, 4),
            'confidence_interval': [round(cogs_pct - 0.05, 4), round(cogs_pct + 0.05, 4)],
            'confidence_level': 0.85,
            'reasoning': f"COGS at {cogs_pct:.1%} of revenue.",
            'source': 'calculated',
            'sensitivity': 'medium',
            'editable': True
        }

        # Tax rate
        tax_rate = float(business.get('tax_rate', 0.25))
        assumptions['tax_rate'] = {
            'value': tax_rate,
            'confidence_interval': [tax_rate - 0.02, tax_rate + 0.02],
            'confidence_level': 0.95,
            'reasoning': f"Statutory tax rate for {business.get('jurisdiction', 'US')}.",
            'source': 'regulatory',
            'sensitivity': 'low',
            'editable': True
        }

        # Working Capital
        assumptions['dso_days'] = {
            'value': float(business.get('dso', 30)),
            'confidence_interval': [25, 45],
            'confidence_level': 0.70,
            'reasoning': "Days Sales Outstanding based on industry average.",
            'source': 'benchmark',
            'sensitivity': 'medium',
            'editable': True
        }

        assumptions['dpo_days'] = {
            'value': float(business.get('dpo', 45)),
            'confidence_interval': [30, 60],
            'confidence_level': 0.70,
            'reasoning': "Days Payable Outstanding based on industry average.",
            'source': 'benchmark',
            'sensitivity': 'medium',
            'editable': True
        }

        # Overall confidence
        high_conf_count = sum(1 for a in assumptions.values() if a.get('source') == 'historical_analysis')
        total = len(assumptions)
        overall_data_backing = high_conf_count / max(total, 1)

        return {
            'assumptions': assumptions,
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'data_points_used': sum(
                    p.get('data_points', 0) for p in profiles.values() 
                    if isinstance(p, dict)
                ),
                'data_backed_pct': round(overall_data_backing * 100, 1),
                'model_method': model_recommendation.get('primary_method', 'unknown'),
                'requires_review': True
            },
            'sensitivity_ranking': sorted(
                [
                    {'parameter': k, 'sensitivity': v.get('sensitivity', 'medium')}
                    for k, v in assumptions.items()
                ],
                key=lambda x: {'high': 0, 'medium': 1, 'low': 2}.get(x['sensitivity'], 3)
            ),
            'ai_disclaimer': (
                "These assumptions are AI-generated recommendations based on available data. "
                "They include confidence intervals to quantify uncertainty. "
                "Please review, adjust, and approve before running the model. "
                "The deterministic engine will execute the computation — AI does not directly calculate results."
            )
        }

    @staticmethod
    def _default_benchmarks() -> Dict[str, Dict]:
        return {
            'revenue_growth': {'saas_median': 0.25, 'range': [0.05, 0.50]},
            'gross_margin': {'saas_median': 0.70, 'range': [0.50, 0.85]},
            'churn_rate': {'saas_median': 0.05, 'range': [0.01, 0.10]},
            'burn_multiple': {'good': 1.5, 'range': [0.5, 3.0]}
        }


# =============================================================================
# MASTER PIPELINE: Complete 5-Step AI Modeling Flow
# =============================================================================

def run_ai_modeling_pipeline(
    data: Dict[str, List[float]],
    business_context: Dict[str, Any] = None,
    industry_benchmarks: Dict[str, Dict] = None,
    target_metric: str = 'revenue'
) -> Dict[str, Any]:
    """
    Execute the complete 5-step AI modeling pipeline.
    
    Returns:
        Structured output for human review (Step 4).
        Step 5 (deterministic execution) happens AFTER human approval.
    """
    result = {
        'pipeline_version': '2.0',
        'executed_at': datetime.now().isoformat()
    }

    # STEP 1: Data Profiling
    logger.info("Step 1: Data Profiling...")
    profile = DataProfilingAgent.profile(data)
    result['step1_data_profile'] = profile

    # STEP 2: Model Selection
    logger.info("Step 2: Model Selection...")
    recommendation = ModelSelectionAgent.recommend(
        profile=profile,
        metric_name=target_metric,
        business_context=business_context
    )
    result['step2_model_recommendation'] = recommendation

    # STEP 3: Assumption Generation
    logger.info("Step 3: Assumption Generation...")
    assumptions = AssumptionGenerator.generate(
        data_profile=profile,
        model_recommendation=recommendation,
        business_context=business_context,
        industry_benchmarks=industry_benchmarks
    )
    result['step3_assumptions'] = assumptions

    # STEP 4: Human Confirmation (returns structure for frontend)
    result['step4_awaiting_confirmation'] = {
        'status': 'pending_review',
        'message': 'AI has generated assumptions. Please review and approve before execution.',
        'assumptions_to_review': list(assumptions['assumptions'].keys()),
        'editable_fields': [
            k for k, v in assumptions['assumptions'].items() if v.get('editable', True)
        ],
        'sensitivity_ranking': assumptions['sensitivity_ranking']
    }

    # STEP 5: Will be triggered AFTER human approval
    # The deterministic engine (Hyperblock/ThreeStatement) executes
    result['step5_execution'] = {
        'status': 'awaiting_approval',
        'engine': 'hyperblock_dag + three_statement_engine',
        'note': 'AI does NOT execute core math. The DAG engine does.'
    }

    return result


# =============================================================================
# ADAPTIVE FRONTEND PARAMETER DETECTION
# =============================================================================

class AdaptiveParameterMode:
    """
    Determines which frontend parameters to show based on user data maturity.
    
    MODE 1: Connector Present (Enterprise) — Minimal input needed
    MODE 2: Manual CSV Upload — Some manual input
    MODE 3: No Data (Startup) — Full manual input
    """

    @staticmethod
    def detect_mode(
        has_connector: bool = False,
        has_csv: bool = False,
        has_transactions: bool = False,
        transaction_months: int = 0
    ) -> Dict[str, Any]:
        """
        Detect appropriate frontend mode and return required parameters.
        """
        if has_connector and transaction_months >= 6:
            return AdaptiveParameterMode._mode_enterprise()
        elif (has_csv or has_transactions) and transaction_months >= 3:
            return AdaptiveParameterMode._mode_csv()
        else:
            return AdaptiveParameterMode._mode_startup()

    @staticmethod
    def _mode_enterprise() -> Dict[str, Any]:
        return {
            'mode': 'enterprise',
            'mode_label': 'Connected Data Source',
            'description': 'ERP/accounting data connected. Minimal input needed.',
            'required_parameters': [
                {'key': 'strategy_profile', 'label': 'Growth Strategy', 'type': 'select',
                 'options': ['aggressive', 'moderate', 'conservative'], 'default': 'moderate'},
                {'key': 'hiring_adjustments', 'label': 'Hiring Plan Adjustments', 'type': 'json', 'optional': True},
                {'key': 'capital_plan', 'label': 'Capital Raise Plan', 'type': 'json', 'optional': True},
                {'key': 'growth_priority', 'label': 'Growth Priority Weighting', 'type': 'slider',
                 'min': 0, 'max': 1, 'default': 0.5}
            ],
            'auto_inferred': [
                'revenue_growth', 'churn_rate', 'cac', 'ltv', 'burn_rate',
                'gross_margin', 'headcount', 'runway'
            ],
            'note': "All financial metrics are auto-calculated from connected data. "
                   "Only strategic parameters require manual input."
        }

    @staticmethod
    def _mode_csv() -> Dict[str, Any]:
        return {
            'mode': 'csv_upload',
            'mode_label': 'CSV/Manual Data',
            'description': 'Historical data uploaded. Some manual input needed.',
            'required_parameters': [
                {'key': 'revenue_history', 'label': 'Revenue History (12+ months)', 'type': 'auto', 'source': 'csv'},
                {'key': 'cost_history', 'label': 'Cost History', 'type': 'auto', 'source': 'csv'},
                {'key': 'headcount_history', 'label': 'Headcount History', 'type': 'auto', 'source': 'csv'},
                {'key': 'cash_on_hand', 'label': 'Cash on Hand', 'type': 'number', 'required': True},
                {'key': 'debt_balance', 'label': 'Debt Balance', 'type': 'number', 'default': 0}
            ],
            'optional_parameters': [
                {'key': 'cac', 'label': 'Customer Acquisition Cost', 'type': 'number'},
                {'key': 'retention_rate', 'label': 'Retention Rate', 'type': 'percentage'},
                {'key': 'pricing_changes', 'label': 'Planned Pricing Changes', 'type': 'json'}
            ],
            'auto_inferred': ['revenue_growth', 'burn_rate', 'gross_margin'],
            'note': "AI will infer missing values from uploaded data. "
                   "Optional parameters improve forecast accuracy."
        }

    @staticmethod
    def _mode_startup() -> Dict[str, Any]:
        return {
            'mode': 'startup',
            'mode_label': 'Manual Input (Startup)',
            'description': 'No historical data. Core metrics required.',
            'required_parameters': [
                {'key': 'mrr', 'label': 'Monthly Recurring Revenue', 'type': 'number', 'required': True},
                {'key': 'customer_count', 'label': 'Customer Count', 'type': 'number', 'required': True},
                {'key': 'churn_estimate', 'label': 'Monthly Churn Rate (%)', 'type': 'percentage', 'required': True,
                 'default': 5},
                {'key': 'cac_estimate', 'label': 'CAC Estimate', 'type': 'number', 'required': True},
                {'key': 'payroll', 'label': 'Monthly Payroll', 'type': 'number', 'required': True},
                {'key': 'infra_cost', 'label': 'Monthly Infrastructure Cost', 'type': 'number', 'required': True},
                {'key': 'cash_on_hand', 'label': 'Cash on Hand', 'type': 'number', 'required': True}
            ],
            'optional_parameters': [],
            'auto_inferred': [],
            'note': "Provide core metrics only. AI will generate all other assumptions. "
                   "Too many parameters increases user churn — keep it minimal."
        }
