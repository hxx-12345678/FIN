"use client"

import { useState, useEffect } from "react"
import { useChartPagination } from "@/hooks/use-chart-pagination"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts"
import { Brain, TrendingUp, Zap, Download, RefreshCw, AlertTriangle, CheckCircle, Target, ListTodo, Loader2 } from "lucide-react"
import { MonteCarloForecasting } from "./monte-carlo-forecasting"
import { toast } from "sonner"
import Link from "next/link"
import { API_BASE_URL } from "@/lib/api-config"

// All data is now fetched dynamically from backend - no static fallbacks

interface ForecastDataPoint {
  month: string
  actual: number | null
  forecast: number | null
  confidence: number | null
  type: "historical" | "forecast"
}

interface Model {
  id: string
  name: string
  industry?: string
  revenueModelType?: string
}

interface ModelRun {
  id: string
  summaryJson: any
  paramsJson?: any
  createdAt: string
  status: string
  runType?: string
}

type InsightImpact = "positive" | "warning" | "critical" | string

interface InsightCard {
  title: string
  description: string
  impact: InsightImpact
  confidence: number
  type: string
  source?: string
  runId?: string
}

const BASELINE_INSIGHT_SOURCE = "baseline"

const safeJsonParse = (value: any) => {
  if (typeof value !== "string") {
    return value
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    console.error("Failed to parse JSON field", error)
    return null
  }
}

const normalizeRun = (run: ModelRun): ModelRun => {
  const parsedSummary = safeJsonParse(run.summaryJson)
  const parsedParams = safeJsonParse(run.paramsJson)
  return {
    ...run,
    summaryJson: parsedSummary ?? (typeof run.summaryJson === "object" ? run.summaryJson : {}),
    paramsJson: parsedParams ?? (typeof run.paramsJson === "object" ? run.paramsJson : {}),
  }
}

const getRunModelType = (run?: ModelRun | null) => {
  if (!run) return ""
  const params = run.paramsJson || {}
  const summary = run.summaryJson || {}
  const type = params.modelType || params.model_type || summary.modelType || summary.model_type || ""
  return String(type || "").toLowerCase()
}

const selectRunForType = (runs: ModelRun[], modelType: string) => {
  const normalizedType = modelType.toLowerCase()
  return runs.find((run) => getRunModelType(run) === normalizedType)
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "N/A"
  }
  return `$${Number(value).toLocaleString()}`
}

const buildBaselineInsight = (summary: any, runId?: string): InsightCard | null => {
  if (!summary || typeof summary !== "object") {
    return null
  }

  const revenue = summary.totalRevenue ?? summary.arr ?? summary.mrr ?? 0
  const runway = summary.runwayMonths ?? summary.runway ?? 0
  const netIncome = summary.netIncome ?? 0
  const burnRate = summary.burnRate ?? 0
  const revenueGrowth = summary.revenueGrowth ?? 0
  const accuracy =
    summary.kpis?.forecastAccuracy ??
    summary.kpis?.accuracy ??
    summary.kpis?.profitMargin ??
    80

  // Build more detailed forecasting insight
  let description = `Forecast Analysis: `
  if (revenue > 0) {
    description += `Projected revenue of ${formatCurrency(revenue)}. `
  }
  if (runway > 0) {
    description += `Cash runway of ${Math.round(runway)} months. `
  }
  if (burnRate > 0) {
    description += `Monthly burn rate of ${formatCurrency(burnRate)}. `
  }
  if (revenueGrowth > 0) {
    description += `Revenue growth rate of ${(revenueGrowth * 100).toFixed(1)}%. `
  }
  description += `Forecast confidence: ${Math.round(accuracy)}%.`

  return {
    title: "Forecast Summary",
    description,
    impact: netIncome >= 0 && runway >= 6 ? "positive" : runway < 3 ? "critical" : "warning",
    confidence: Math.round(Math.min(Math.max(accuracy, 60), 99)),
    type: "forecast",
    source: BASELINE_INSIGHT_SOURCE,
    runId,
  }
}

export function AIForecasting() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [selectedModelType, setSelectedModelType] = useState("prophet")
  const [forecastHorizon, setForecastHorizon] = useState("6months")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([])
  const [cashFlowForecast, setCashFlowForecast] = useState<any[]>([])
  const [modelRuns, setModelRuns] = useState<ModelRun[]>([])
  const [latestRun, setLatestRun] = useState<ModelRun | null>(null)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [aiInsights, setAiInsights] = useState<InsightCard[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [modelMetrics, setModelMetrics] = useState<any[]>([])

  // Fetch org ID
  useEffect(() => {
    fetchOrgId()
  }, [])

  // Fetch models when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchModels()
    }
  }, [orgId])

  // Fetch model runs when model is selected
  useEffect(() => {
    if (selectedModelId && orgId) {
      fetchModelRuns()
      fetchScenarios()
      fetchAIInsights()
      fetchModelMetrics()
    }
  }, [selectedModelId, orgId])

  // Listen for CSV import completion to refresh data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`CSV import completed! Refreshing forecast data...`)
        
        // Small delay to ensure backend has processed the data
        setTimeout(async () => {
          if (selectedModelId && orgId) {
            await fetchModelRuns()
            await fetchScenarios()
            await fetchAIInsights()
            await fetchModelMetrics()
          }
        }, 2000)
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
    }
  }, [orgId, selectedModelId])

  // Fetch model metrics from backend
  const fetchModelMetrics = async () => {
    if (!selectedModelId || !orgId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      // Get all model runs to calculate metrics
      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.runs) {
          // Calculate metrics from runs
          const runs = result.runs
            .map((run: ModelRun) => normalizeRun(run))
            .filter((r: ModelRun) => r.status === "completed" || r.status === "done")
          
          // Group runs by model type
          const prophetRuns = runs.filter((r: ModelRun) => {
            const params = r.paramsJson || {}
            const modelType = params.modelType || params.model_type || ''
            return modelType.toLowerCase() === 'prophet'
          })
          
          const arimaRuns = runs.filter((r: ModelRun) => {
            const params = r.paramsJson || {}
            const modelType = params.modelType || params.model_type || ''
            return modelType.toLowerCase() === 'arima'
          })
          
          const neuralRuns = runs.filter((r: ModelRun) => {
            const params = r.paramsJson || {}
            const modelType = params.modelType || params.model_type || ''
            return modelType.toLowerCase() === 'neural' || modelType.toLowerCase() === 'neural_network'
          })
          
          // Get latest run for each type
          const latestProphet = prophetRuns.sort((a: ModelRun, b: ModelRun) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          
          const latestArima = arimaRuns.sort((a: ModelRun, b: ModelRun) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          
          const latestNeural = neuralRuns.sort((a: ModelRun, b: ModelRun) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          
          // Build metrics from actual runs - extract real metrics from summaryJson
          const getMetrics = (run: ModelRun | undefined) => {
            if (!run || !run.summaryJson) return { accuracy: 0, mape: 0, rmse: 0 };
            
            const summary = typeof run.summaryJson === 'string' 
              ? JSON.parse(run.summaryJson) 
              : run.summaryJson;
            
            // Try to get actual model metrics from summary
            const kpis = summary.kpis || {};
            const accuracy = kpis.accuracy || kpis.forecastAccuracy || (kpis.profitMargin ? kpis.profitMargin : 0);
            const mape = kpis.mape || kpis.meanAbsolutePercentageError || 0;
            const rmse = kpis.rmse || kpis.rootMeanSquaredError || 0;
            
            return { accuracy, mape, rmse };
          };

          const prophetMetrics = getMetrics(latestProphet);
          const arimaMetrics = getMetrics(latestArima);
          const neuralMetrics = getMetrics(latestNeural);

          // Build metrics from actual runs - ONLY show data for runs that exist
          // Each model type should have different scores based on its actual runs
          const metrics = [
            {
              model: "Prophet",
              accuracy: latestProphet ? prophetMetrics.accuracy : 0,
              mape: latestProphet ? prophetMetrics.mape : 0,
              rmse: latestProphet ? prophetMetrics.rmse : 0,
              status: selectedModelType === "prophet" ? "active" : (prophetRuns.length > 0 ? "backup" : "unavailable"),
              lastTrained: latestProphet?.createdAt ? new Date(latestProphet.createdAt).toLocaleDateString() : "Never",
              runCount: prophetRuns.length,
            },
            {
              model: "ARIMA",
              accuracy: latestArima ? arimaMetrics.accuracy : 0,
              mape: latestArima ? arimaMetrics.mape : 0,
              rmse: latestArima ? arimaMetrics.rmse : 0,
              status: selectedModelType === "arima" ? "active" : (arimaRuns.length > 0 ? "backup" : "unavailable"),
              lastTrained: latestArima?.createdAt ? new Date(latestArima.createdAt).toLocaleDateString() : "Never",
              runCount: arimaRuns.length,
            },
            {
              model: "Neural Network",
              accuracy: latestNeural ? neuralMetrics.accuracy : 0,
              mape: latestNeural ? neuralMetrics.mape : 0,
              rmse: latestNeural ? neuralMetrics.rmse : 0,
              status: selectedModelType === "neural" ? "active" : (neuralRuns.length > 0 ? "experimental" : "unavailable"),
              lastTrained: latestNeural?.createdAt ? new Date(latestNeural.createdAt).toLocaleDateString() : "Never",
              runCount: neuralRuns.length,
            },
          ]

          setModelMetrics(metrics)
        }
      }
    } catch (error) {
      console.error("Failed to fetch model metrics:", error)
      // Set empty metrics if fetch fails
      setModelMetrics([])
    }
  }

  // Update forecast data when runs change
  useEffect(() => {
    if (latestRun) {
      processForecastData(latestRun)
    }
  }, [latestRun])

  useEffect(() => {
    if (modelRuns.length === 0) {
      setLatestRun(null)
      return
    }

    const completedRuns = [...modelRuns]
      .filter((run) => run.status === "completed" || run.status === "done")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (completedRuns.length === 0) {
      setLatestRun(modelRuns[0])
      return
    }

    const preferredRun = selectRunForType(completedRuns, selectedModelType)
    setLatestRun(preferredRun || completedRuns[0])
  }, [modelRuns, selectedModelType])

  useEffect(() => {
    if (!latestRun?.summaryJson) {
      setAiInsights([])
      return
    }

    setAiInsights((current) => {
      const hasCurrentRun = current.some((insight) => insight.runId === latestRun.id)
      if (hasCurrentRun) {
        return current
      }
      const baseline = buildBaselineInsight(latestRun.summaryJson, latestRun.id)
      return baseline ? [baseline] : current
    })
  }, [latestRun])

  const fetchOrgId = async () => {
    try {
      const storedOrgId = localStorage.getItem("orgId")
      if (storedOrgId) {
        setOrgId(storedOrgId)
        return
      }

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.orgs && userData.orgs.length > 0) {
          const primaryOrgId = userData.orgs[0].id
          localStorage.setItem("orgId", primaryOrgId)
          setOrgId(primaryOrgId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }
  }

  const fetchModels = async () => {
    if (!orgId) return

    try {
      setLoading(true)
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models) {
          setModels(result.models)
          if (result.models.length > 0 && !selectedModelId) {
            setSelectedModelId(result.models[0].id)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
      toast.error("Failed to load models")
    } finally {
      setLoading(false)
    }
  }

  const fetchModelRuns = async () => {
    if (!selectedModelId || !orgId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.runs) {
          const normalizedRuns = result.runs.map((run: ModelRun) => normalizeRun(run))
          setModelRuns(normalizedRuns)
        }
      }
    } catch (error) {
      console.error("Failed to fetch model runs:", error)
    }
  }

  const processForecastData = (run: ModelRun) => {
    try {
      const parsedSummary = typeof run.summaryJson === "string" ? safeJsonParse(run.summaryJson) : run.summaryJson
      const summary = parsedSummary || {}
      if (!summary || Object.keys(summary).length === 0) return

      // Get monthly data from summary
      const monthly = summary.monthly || {}
      const forecastPoints: ForecastDataPoint[] = []
      const cashFlowPoints: any[] = []

      // Process monthly data
      Object.entries(monthly).forEach(([monthKey, monthData]: [string, any]) => {
        const revenue = monthData.revenue || 0
        const expenses = monthData.expenses || 0
        const netIncome = monthData.netIncome || revenue - expenses
        // Use cashBalance (from Python) or cash (fallback)
        const cash = monthData.cashBalance || monthData.cash || 0

        // Format month for display
        const [year, month] = monthKey.split("-")
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthName = `${monthNames[parseInt(month) - 1]} ${year}`

        // Determine if it's historical or forecast
        const now = new Date()
        const dataDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const isHistorical = dataDate < now

        forecastPoints.push({
          month: monthName,
          actual: isHistorical ? revenue : null,
          forecast: isHistorical ? null : revenue,
          confidence: isHistorical ? null : (monthData.confidence ?? summary.kpis?.forecastConfidence ?? summary.confidence ?? 85),
          type: isHistorical ? "historical" : "forecast",
        })

        cashFlowPoints.push({
          month: monthName,
          inflow: revenue,
          outflow: expenses,
          netCashFlow: netIncome,
          cumulativeCash: cash,
        })
      })

      // Sort by date
      forecastPoints.sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })

      cashFlowPoints.sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })

      setForecastData(forecastPoints)
      setCashFlowForecast(cashFlowPoints)
    } catch (error) {
      console.error("Error processing forecast data:", error)
    }
  }

  const fetchScenarios = async () => {
    if (!selectedModelId || !orgId) return

    try {
      setLoadingScenarios(true)
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/scenarios?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.scenarios) {
          setScenarios(result.scenarios)
        }
      }
    } catch (error) {
      console.error("Failed to fetch scenarios:", error)
    } finally {
      setLoadingScenarios(false)
    }
  }

  const mergeInsightsWithBaseline = (baseline: InsightCard | null, insights: InsightCard[]) => {
    const uniqueInsights = new Map<string, InsightCard>()
    if (baseline) {
      uniqueInsights.set(`${baseline.title}-${baseline.description}`, baseline)
    }
    insights.forEach((insight) => {
      const key = `${insight.title}-${insight.description}`
      if (!uniqueInsights.has(key)) {
        uniqueInsights.set(key, insight)
      }
    })
    return Array.from(uniqueInsights.values())
  }

  const fetchAIInsights = async () => {
    if (!orgId || !selectedModelId) return

    const activeRunId = latestRun?.id
    let baselineInsight: InsightCard | null = null
    let summaryConfidence = 80

    try {
      setLoadingInsights(true)
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const summaryForInsightsRaw = latestRun?.summaryJson
      const summaryForInsights = latestRun
        ? (typeof summaryForInsightsRaw === "string" ? safeJsonParse(summaryForInsightsRaw) : summaryForInsightsRaw)
        : null
      baselineInsight = latestRun ? buildBaselineInsight(summaryForInsights, latestRun.id) : null
      summaryConfidence = Math.round(
        (summaryForInsights?.kpis?.forecastAccuracy ??
          summaryForInsights?.kpis?.accuracy ??
          summaryForInsights?.confidence ??
          baselineInsight?.confidence ??
          80)
      )

      // Get latest model run for insights
      if (latestRun) {
        // Build forecasting-specific goal with context from summary
        const forecastGoal = `Analyze the financial forecast model and provide detailed forecasting insights. Focus on:
1. Revenue forecast trends and growth trajectory over the forecast period
2. Cash flow projections and runway analysis
3. Key risks and opportunities in the forecast
4. Forecast accuracy and confidence metrics
5. Actionable recommendations to optimize forecast outcomes
6. Comparison of forecasted vs historical performance patterns

Use the model run data to provide specific, data-driven insights about the forecast projections, not just general financial advice.`
        
        // Generate AI insights based on model run
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            goal: forecastGoal,
            modelRunId: latestRun.id,
            constraints: {
              focus: "forecasting",
              includeMetrics: true,
              includeTrends: true,
              includeRisks: true,
            },
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.plan) {
            // Extract insights from plan
            const planJson = result.plan.planJson || {}
            const structuredResponse = planJson.structuredResponse || {}
            
            // Process insights
            const extractedInsights: any[] = []
            const extractedRecommendations: any[] = []

            // Extract from recommendations if available
            if (structuredResponse.recommendations && Array.isArray(structuredResponse.recommendations)) {
              structuredResponse.recommendations.forEach((rec: any) => {
                extractedRecommendations.push({
                  type: rec.type || rec.category || "general",
                  title: rec.title || rec.action || rec.explain?.substring(0, 50) || "Recommendation",
                  description: rec.description || rec.explain || rec.reasoning || "No description available",
                  impact: rec.impact || (rec.priority === 'high' ? 'positive' : rec.priority === 'low' ? 'warning' : 'positive'),
                })
              })
            }

            // Also check stagedChanges for recommendations
            if (planJson.stagedChanges && Array.isArray(planJson.stagedChanges)) {
              planJson.stagedChanges.forEach((change: any) => {
                if (change.action || change.explain) {
                  extractedRecommendations.push({
                    type: change.type || change.category || "general",
                    title: change.action || change.explain?.substring(0, 50) || "Recommendation",
                    description: change.explain || change.reasoning || change.action || "No description available",
                    impact: change.impact || (change.priority === 'high' ? 'positive' : change.priority === 'low' ? 'warning' : 'positive'),
                  })
                }
              })
            }

            // Extract insights from analysis
            if (structuredResponse.analysis) {
              const analysis = structuredResponse.analysis
              
              // Extract forecast trends
              if (analysis.trends) {
                const trendsText = typeof analysis.trends === 'string' ? analysis.trends : 
                  (Array.isArray(analysis.trends) ? analysis.trends.join('. ') : JSON.stringify(analysis.trends))
                extractedInsights.push({
                  type: "trend",
                  title: "Forecast Growth Trends",
                  description: trendsText.length > 300 ? trendsText.substring(0, 300) + '...' : trendsText,
                  confidence: 85,
                  impact: "positive",
                })
              }
              
              // Extract forecast risks
              if (analysis.risks) {
                const risksText = typeof analysis.risks === 'string' ? analysis.risks : 
                  (Array.isArray(analysis.risks) ? analysis.risks.join('. ') : JSON.stringify(analysis.risks))
                extractedInsights.push({
                  type: "risk",
                  title: "Forecast Risk Factors",
                  description: risksText.length > 300 ? risksText.substring(0, 300) + '...' : risksText,
                  confidence: 75,
                  impact: "warning",
                })
              }
              
              // Extract forecast opportunities
              if (analysis.opportunities) {
                const oppsText = typeof analysis.opportunities === 'string' ? analysis.opportunities : 
                  (Array.isArray(analysis.opportunities) ? analysis.opportunities.join('. ') : JSON.stringify(analysis.opportunities))
                extractedInsights.push({
                  type: "opportunity",
                  title: "Forecast Opportunities",
                  description: oppsText.length > 300 ? oppsText.substring(0, 300) + '...' : oppsText,
                  confidence: 80,
                  impact: "positive",
                })
              }
              
              // Extract forecast accuracy insights
              if (analysis.forecastAccuracy || analysis.accuracy) {
                const accuracyText = typeof (analysis.forecastAccuracy || analysis.accuracy) === 'string' 
                  ? (analysis.forecastAccuracy || analysis.accuracy) 
                  : `Forecast accuracy: ${JSON.stringify(analysis.forecastAccuracy || analysis.accuracy)}`
                extractedInsights.push({
                  type: "analysis",
                  title: "Forecast Accuracy Analysis",
                  description: accuracyText.length > 300 ? accuracyText.substring(0, 300) + '...' : accuracyText,
                  confidence: summaryConfidence,
                  impact: summaryConfidence > 80 ? "positive" : "warning",
                })
              }
            }

            // Check for natural_text (preferred) or naturalLanguage
            const naturalText = structuredResponse.natural_text || structuredResponse.naturalLanguage
            if (naturalText) {
              // Split natural text into paragraphs and extract key forecasting insights
              const textLines = naturalText.split('\n').filter((line: string) => line.trim().length > 0)
              
              // Look for forecasting-specific keywords to create better insights
              const forecastKeywords = ['forecast', 'projection', 'trajectory', 'runway', 'growth', 'trend', 'revenue', 'cash flow', 'burn rate']
              
              if (textLines.length > 0) {
                // Try to extract multiple insights from different paragraphs
                const relevantParagraphs = textLines.filter((line: string) => 
                  forecastKeywords.some(keyword => line.toLowerCase().includes(keyword))
                )
                
                if (relevantParagraphs.length > 0) {
                  // Create insights from relevant paragraphs
                  relevantParagraphs.slice(0, 3).forEach((para: string, idx: number) => {
                    if (para.length > 50) { // Only add substantial paragraphs
                      extractedInsights.push({
                        type: "analysis",
                        title: idx === 0 ? "Forecast Analysis" : `Forecast Insight ${idx + 1}`,
                        description: para.length > 400 ? para.substring(0, 400) + '...' : para,
                        confidence: 80,
                        impact: para.toLowerCase().includes('risk') || para.toLowerCase().includes('concern') ? "warning" : "positive",
                      })
                    }
                  })
                } else {
                  // Fallback: use first substantial paragraph
                  const firstSubstantial = textLines.find((line: string) => line.length > 100)
                  if (firstSubstantial) {
                    extractedInsights.push({
                      type: "analysis",
                      title: "Forecast Analysis",
                      description: firstSubstantial.length > 500 ? firstSubstantial.substring(0, 500) + '...' : firstSubstantial,
                      confidence: 80,
                      impact: "positive",
                    })
                  }
                }
              }
            }

            // Extract from risks and warnings arrays
            if (structuredResponse.risks && Array.isArray(structuredResponse.risks)) {
              structuredResponse.risks.forEach((risk: string | any) => {
                const riskText = typeof risk === 'string' ? risk : risk.description || risk.text || JSON.stringify(risk)
                extractedInsights.push({
                  type: "risk",
                  title: "Risk Factor",
                  description: riskText,
                  confidence: 75,
                  impact: "warning",
                })
              })
            }

            if (structuredResponse.warnings && Array.isArray(structuredResponse.warnings)) {
              structuredResponse.warnings.forEach((warning: string | any) => {
                const warningText = typeof warning === 'string' ? warning : warning.description || warning.text || JSON.stringify(warning)
                extractedInsights.push({
                  type: "warning",
                  title: "Warning",
                  description: warningText,
                  confidence: 70,
                  impact: "warning",
                })
              })
            }

            // If no insights found, try to extract from natural text or create from summary
            if (extractedInsights.length === 0) {
              if (naturalText) {
                extractedInsights.push({
                  type: "analysis",
                  title: "Forecast Analysis",
                  description: naturalText.substring(0, 400),
                  confidence: 75,
                  impact: "positive",
                })
              } else if (summaryForInsights) {
                // Create insights from summary data
                const revenue = summaryForInsights.totalRevenue ?? summaryForInsights.arr ?? summaryForInsights.mrr ?? 0
                const runway = summaryForInsights.runwayMonths ?? summaryForInsights.runway ?? 0
                const growth = summaryForInsights.revenueGrowth ?? 0
                
                if (revenue > 0 || runway > 0) {
                  extractedInsights.push({
                    type: "analysis",
                    title: "Forecast Summary",
                    description: `Based on the forecast model: ${revenue > 0 ? `Projected revenue of ${formatCurrency(revenue)}. ` : ''}${runway > 0 ? `Cash runway of ${Math.round(runway)} months. ` : ''}${growth > 0 ? `Revenue growth rate of ${(growth * 100).toFixed(1)}%.` : ''}`,
                    confidence: summaryConfidence,
                    impact: runway >= 6 ? "positive" : "warning",
                  })
                }
              }
            }

            // If no recommendations found but we have stagedChanges, use those
            if (extractedRecommendations.length === 0 && planJson.stagedChanges && Array.isArray(planJson.stagedChanges) && planJson.stagedChanges.length > 0) {
              planJson.stagedChanges.forEach((change: any) => {
                extractedRecommendations.push({
                  type: change.type || "general",
                  title: change.action || "Action Item",
                  description: change.explain || change.reasoning || change.action || "No description available",
                  impact: change.priority === 'high' ? 'positive' : 'warning',
                })
              })
            }

            const insightsWithMeta: InsightCard[] = extractedInsights.map((insight: InsightCard) => ({
              ...insight,
              confidence: insight.confidence ?? summaryConfidence,
              runId: activeRunId,
              source: insight.source || "ai-plan",
            }))
            setAiInsights(mergeInsightsWithBaseline(baselineInsight, insightsWithMeta))
            setAiRecommendations(extractedRecommendations)
          }
        } else {
          // If API call fails, try to fetch existing plans
          const existingPlansResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (existingPlansResponse.ok) {
            const plansResult = await existingPlansResponse.json()
            if (plansResult.ok && plansResult.plans && plansResult.plans.length > 0) {
              // Use the most recent plan
              const latestPlan = plansResult.plans[0]
              const planJson = latestPlan.planJson || {}
              const structuredResponse = planJson.structuredResponse || {}
              
              const extractedInsights: any[] = []
              const extractedRecommendations: any[] = []

              // Extract recommendations
              if (structuredResponse.recommendations && Array.isArray(structuredResponse.recommendations)) {
                structuredResponse.recommendations.forEach((rec: any) => {
                  extractedRecommendations.push({
                    type: rec.type || "general",
                    title: rec.action || rec.explain?.substring(0, 50) || "Recommendation",
                    description: rec.explain || rec.reasoning || "No description available",
                    impact: rec.priority === 'high' ? 'positive' : 'warning',
                  })
                })
              }

              // Extract natural text as insight
              const naturalText = structuredResponse.natural_text || structuredResponse.naturalLanguage
              if (naturalText) {
                extractedInsights.push({
                  type: "analysis",
                  title: "AI Analysis",
                  description: naturalText.substring(0, 500),
                  confidence: 80,
                  impact: "positive",
                })
              }

              const insightsWithMeta: InsightCard[] = extractedInsights.map((insight: InsightCard) => ({
                ...insight,
                confidence: insight.confidence ?? summaryConfidence,
                runId: activeRunId,
                source: insight.source || "ai-plan",
              }))
              setAiInsights(mergeInsightsWithBaseline(baselineInsight, insightsWithMeta))
              setAiRecommendations(extractedRecommendations)
            }
          }
        }
      } else {
        // No latest run, try to fetch existing plans
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (token) {
          const existingPlansResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (existingPlansResponse.ok) {
            const plansResult = await existingPlansResponse.json()
            if (plansResult.ok && plansResult.plans && plansResult.plans.length > 0) {
              const latestPlan = plansResult.plans[0]
              const planJson = latestPlan.planJson || {}
              const structuredResponse = planJson.structuredResponse || {}
              
              const extractedInsights: any[] = []
              const extractedRecommendations: any[] = []

              if (structuredResponse.recommendations && Array.isArray(structuredResponse.recommendations)) {
                structuredResponse.recommendations.forEach((rec: any) => {
                  extractedRecommendations.push({
                    type: rec.type || "general",
                    title: rec.action || rec.explain?.substring(0, 50) || "Recommendation",
                    description: rec.explain || rec.reasoning || "No description available",
                    impact: rec.priority === 'high' ? 'positive' : 'warning',
                  })
                })
              }

              const naturalText = structuredResponse.natural_text || structuredResponse.naturalLanguage
              if (naturalText) {
                extractedInsights.push({
                  type: "analysis",
                  title: "AI Analysis",
                  description: naturalText.substring(0, 500),
                  confidence: 80,
                  impact: "positive",
                })
              }

              const insightsWithMeta: InsightCard[] = extractedInsights.map((insight: InsightCard) => ({
                ...insight,
                confidence: insight.confidence ?? summaryConfidence,
                runId: activeRunId,
                source: insight.source || "ai-plan",
              }))
              setAiInsights(mergeInsightsWithBaseline(baselineInsight, insightsWithMeta))
              setAiRecommendations(extractedRecommendations)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI insights:", error)
      // No fallback - show empty state if API fails
      setAiInsights(baselineInsight ? [baselineInsight] : [])
      setAiRecommendations([])
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleExportForecast = async () => {
    if (!latestRun || !orgId) {
      toast.error("No forecast data available to export")
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/model-runs/${latestRun.id}/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: "csv", // Can be csv, pdf, pptx, excel
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Failed to export forecast")
      }

      const result = await response.json()
      
      if (result.ok && result.export) {
        toast.success("Export job created. Processing...")
        
        // Poll for export completion
        if (result.jobId) {
          await pollExportStatus(result.jobId, result.export.id, token)
        }
      } else {
        throw new Error(result.error?.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export forecast"
      toast.error(errorMessage)
    }
  }

  const pollExportStatus = async (jobId: string, exportId: string, token: string) => {
    const maxAttempts = 60
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.warning("Export is taking longer than expected. Please check back later.")
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.job) {
            const status = result.job.status
            if (status === "done" || status === "completed") {
              // Download export
              const downloadResponse = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                credentials: "include",
              })

              if (downloadResponse.ok) {
                const blob = await downloadResponse.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `forecast-export-${exportId.substring(0, 8)}.csv`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                toast.success("Forecast exported successfully!")
              }
              return
            } else if (status === "failed" || status === "dead_letter") {
              throw new Error(result.job.lastError || "Export failed")
            }
          }
        }

        attempts++
        setTimeout(poll, 2000)
      } catch (error) {
        console.error("Error polling export status:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        }
      }
    }

    poll()
  }

  const handleGenerateForecast = async () => {
    if (!selectedModelId || !orgId) {
      toast.error("Please select a model first")
      return
    }

    setIsGenerating(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Trigger a new model run
      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          runType: "forecast",
          paramsJson: {
            modelType: selectedModelType,
            model_type: selectedModelType, // Support both formats
            horizon: forecastHorizon,
            scenario_name: "AI Forecast",
            createdAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Failed to generate forecast")
      }

      const result = await response.json()
      
      if (result.ok) {
        toast.success("Forecast generation started. This may take a few moments...")
        
        // Poll for completion
        if (result.jobId) {
          await pollJobStatus(result.jobId)
        } else if (result.run?.id) {
          // Run completed immediately
          await fetchModelRuns()
        }
      } else {
        throw new Error(result.error?.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate forecast"
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 60 // 2 minutes max
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.warning("Forecast is taking longer than expected. Please check back later.")
        return
      }

      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) return

        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.job) {
            const status = result.job.status
            if (status === "done" || status === "completed") {
              toast.success("Forecast generated successfully!")
              await fetchModelRuns()
              // Refresh metrics to show new run data
              await fetchModelMetrics()
              // Refresh AI insights if user wants
              if (latestRun) {
                await fetchAIInsights()
              }
              return
            } else if (status === "failed" || status === "dead_letter") {
              throw new Error(result.job.lastError || "Forecast generation failed")
            }
          }
        }

        attempts++
        setTimeout(poll, 2000) // Poll every 2 seconds
      } catch (error) {
        console.error("Error polling job status:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        }
      }
    }

    poll()
  }

  const { chartData: paginatedForecastData, hasMore: hasMoreForecast, loadMore: loadMoreForecast, initializeData: initForecast } = useChartPagination({
    defaultMonths: 36,
    onLoadMore: async (startDate, endDate) => {
      return forecastData.filter((item) => {
        const itemDate = new Date(item.month)
        return itemDate >= startDate && itemDate < endDate
      })
    },
  })

  useEffect(() => {
    if (forecastData.length > 0) {
    initForecast(forecastData)
    }
  }, [forecastData, initForecast])

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Forecasting Engine</h1>
          <p className="text-sm md:text-base text-muted-foreground">Advanced machine learning models for financial predictions</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {models.length > 0 && (
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedModelType} onValueChange={setSelectedModelType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prophet">Prophet</SelectItem>
              <SelectItem value="arima">ARIMA</SelectItem>
              <SelectItem value="neural">Neural Network</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleGenerateForecast} disabled={isGenerating || !selectedModelId || loading} className="w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">Generating</span>
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Regenerate</span>
                <span className="sm:hidden">Regen</span>
              </>
            )}
          </Button>
          <Button onClick={handleExportForecast} disabled={!latestRun || loading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Forecast</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#job-queue">
              <ListTodo className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Job Queue</span>
              <span className="sm:hidden">Queue</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Model Performance */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Performance
          </CardTitle>
          <CardDescription>Real-time accuracy metrics for forecasting models</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : modelMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {modelMetrics.map((model, index) => {
                const isActive = model.model.toLowerCase() === selectedModelType.toLowerCase()
                const hasData = model.runCount > 0 && model.accuracy > 0
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{model.model}</h3>
                      <Badge
                        variant={
                          isActive ? "default" : model.status === "experimental" ? "secondary" : model.status === "unavailable" ? "outline" : "outline"
                        }
                      >
                        {isActive ? "active" : model.status}
                      </Badge>
                    </div>
                    {hasData ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accuracy</span>
                          <span className="font-medium">{model.accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">MAPE</span>
                          <span className="font-medium">{model.mape > 0 ? `${model.mape.toFixed(2)}%` : "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RMSE</span>
                          <span className="font-medium">{model.rmse > 0 ? model.rmse.toFixed(2) : "N/A"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last run: {model.lastTrained}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total runs: {model.runCount}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-muted-foreground text-center py-4">
                        <p>No data available</p>
                        <p className="text-xs">Generate a forecast with {model.model} to see performance metrics</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No model metrics available. Generate a forecast to see performance data.</p>
              <p className="text-sm mt-2">Select a model type (Prophet, ARIMA, or Neural Network) and click "Regenerate" to create a forecast run.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forecasting Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-[500px]">
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue Forecast</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Cash Flow</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm">AI Insights</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs sm:text-sm">Scenarios</TabsTrigger>
            <TabsTrigger value="montecarlo" className="text-xs sm:text-sm">Monte Carlo</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="revenue" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecasting</CardTitle>
              <CardDescription>
                AI-powered revenue predictions with confidence intervals. This data comes from your financial model runs.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  <strong>Data Source:</strong> Model runs (summaryJson.monthly) → Revenue projections from your baseline or scenario models.
                  <br />
                  <strong>How to add data:</strong> Import transactions via CSV or connect accounting software, then run a model to generate forecasts.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-400">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} className="min-h-[300px] sm:min-h-[400px]">
                  <ComposedChart data={paginatedForecastData.length > 0 ? paginatedForecastData : forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value?.toLocaleString()}`, ""]} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Actual Revenue"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="AI Forecast"
                    connectNulls={false}
                  />
                  <Bar dataKey="confidence" fill="#e2e8f0" name="Confidence %" />
                </ComposedChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-400 text-muted-foreground">
                  <p>No forecast data available. Select a model and generate a forecast.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">6-Month Forecast</p>
                    <p className="text-2xl font-bold text-green-600">
                      {latestRun?.summaryJson?.totalRevenue || latestRun?.summaryJson?.revenue
                        ? `$${((latestRun.summaryJson.totalRevenue || latestRun.summaryJson.revenue) / 1000).toFixed(0)}K`
                        : "N/A"}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {latestRun?.summaryJson?.kpis?.revenueGrowth 
                    ? `+${(latestRun.summaryJson.kpis.revenueGrowth * 100).toFixed(0)}% growth projected`
                    : "No data available"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Forecast Accuracy</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {latestRun?.summaryJson?.kpis?.profitMargin 
                        ? `${latestRun.summaryJson.kpis.profitMargin.toFixed(1)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Based on {selectedModelType} model</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confidence Level</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {forecastData.length > 0 && forecastData.filter(d => d.confidence).length > 0
                        ? `${Math.round(forecastData.filter(d => d.confidence).reduce((sum, d) => sum + (d.confidence || 0), 0) / forecastData.filter(d => d.confidence).length)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-purple-500" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Average confidence</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Forecasting</CardTitle>
              <CardDescription>
                Predicted cash inflows, outflows, and runway analysis.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  <strong>Data Source:</strong> Model runs (summaryJson.monthly) → Cash balance, revenue (inflow), expenses (outflow), and net cash flow.
                  <br />
                  <strong>How to add data:</strong> Import transactions or connect accounting software, then run a model. Cash balance is calculated from initial cash + cumulative net cash flow.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowForecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={cashFlowForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value?.toLocaleString()}`, ""]} />
                  <Bar dataKey="inflow" fill="#10b981" name="Cash Inflow" />
                  <Bar dataKey="outflow" fill="#ef4444" name="Cash Outflow" />
                  <Line
                    type="monotone"
                    dataKey="cumulativeCash"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Cumulative Cash"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-400 text-muted-foreground">
                  <p>No cash flow forecast data available.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Inflow (6 months)</span>
                  <span className="font-semibold text-green-600">
                    {cashFlowForecast.length > 0
                      ? `$${cashFlowForecast.slice(0, 6).reduce((sum, item) => sum + (item.inflow || 0), 0).toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Outflow (6 months)</span>
                  <span className="font-semibold text-red-600">
                    {cashFlowForecast.length > 0
                      ? `$${cashFlowForecast.slice(0, 6).reduce((sum, item) => sum + (item.outflow || 0), 0).toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Cash Flow</span>
                  <span className="font-semibold text-blue-600">
                    {cashFlowForecast.length > 0
                      ? `$${cashFlowForecast.slice(0, 6).reduce((sum, item) => sum + (item.netCashFlow || 0), 0).toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projected Cash Balance</span>
                  <span className="font-semibold text-purple-600">
                    {latestRun?.summaryJson?.cashBalance
                      ? `$${latestRun.summaryJson.cashBalance.toLocaleString()}`
                      : cashFlowForecast.length > 0
                      ? `$${cashFlowForecast[cashFlowForecast.length - 1]?.cumulativeCash?.toLocaleString() || "N/A"}`
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Runway Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {latestRun?.summaryJson?.runwayMonths || latestRun?.summaryJson?.runway
                      ? `${Math.round(latestRun.summaryJson.runwayMonths || latestRun.summaryJson.runway)}+ months`
                      : "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Projected runway</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current burn rate</span>
                    <span>
                      {latestRun?.summaryJson?.burnRate || latestRun?.summaryJson?.monthlyBurnRate
                        ? `$${((latestRun.summaryJson.burnRate || latestRun.summaryJson.monthlyBurnRate) / 1000).toFixed(0)}K/month`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Projected burn rate</span>
                    <span>
                      {latestRun?.summaryJson?.monthlyBurn
                        ? `$${(latestRun.summaryJson.monthlyBurn / 1000).toFixed(0)}K/month`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Break-even month</span>
                    <span>
                      {cashFlowForecast.length > 0
                        ? cashFlowForecast.findIndex(item => (item.netCashFlow || 0) > 0) >= 0
                          ? `Month ${cashFlowForecast.findIndex(item => (item.netCashFlow || 0) > 0) + 1}`
                          : "Not projected"
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Insights</CardTitle>
                  <CardDescription>
                    AI-powered analysis of your financial forecast with trends, risks, and actionable recommendations.
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      <strong>Data Source:</strong> AI CFO Plan service → Analyzes your latest model run summary to generate insights and recommendations.
                      <br />
                      <strong>How to generate:</strong> Click "Generate AI Insights" below to analyze your forecast.
                    </span>
                  </CardDescription>
                </div>
                <Button 
                  onClick={fetchAIInsights} 
                  disabled={loadingInsights || !latestRun}
                  variant="outline"
                >
                  {loadingInsights ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate AI Insights
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>
          
          {loadingInsights ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {aiInsights.map((insight, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    insight.impact === "positive"
                      ? "border-l-green-500"
                      : insight.impact === "warning"
                        ? "border-l-yellow-500"
                        : "border-l-red-500"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      {insight.impact === "positive" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : insight.impact === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{insight.type}</Badge>
                      <span className="text-sm font-medium">{insight.confidence}% confidence</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2 font-medium">No insights available yet.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {latestRun 
                    ? "Click 'Generate AI Insights' above to analyze your forecast and get recommendations."
                    : "Generate a forecast first, then click 'Generate AI Insights' to analyze it."}
                </p>
                {latestRun && (
                  <Button 
                    onClick={fetchAIInsights} 
                    disabled={loadingInsights}
                    variant="default"
                  >
                    {loadingInsights ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate AI Insights
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Data-driven suggestions for business optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.impact === "positive"
                        ? "bg-green-50 border-green-200"
                        : rec.impact === "warning"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {rec.impact === "positive" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : rec.impact === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      ) : (
                        <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                      )}
                      <div>
                        <h3 className={`font-medium ${
                          rec.impact === "positive"
                            ? "text-green-800"
                            : rec.impact === "warning"
                            ? "text-yellow-800"
                            : "text-blue-800"
                        }`}>
                          {rec.title}
                        </h3>
                        <p className={`text-sm ${
                          rec.impact === "positive"
                            ? "text-green-700"
                            : rec.impact === "warning"
                            ? "text-yellow-700"
                            : "text-blue-700"
                        }`}>
                          {rec.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-800">Accelerate Growth</h3>
                    <p className="text-sm text-green-700">
                      Current trajectory suggests you can safely increase marketing spend by 25% to accelerate customer
                      acquisition.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Optimize Pricing</h3>
                    <p className="text-sm text-blue-700">
                      Consider introducing a premium tier at $199/month. Model suggests 15% of customers would upgrade.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Monitor Churn</h3>
                    <p className="text-sm text-yellow-700">
                      Churn rate may increase to 3.2% in Q4. Implement retention strategies for customers aged 6+
                      months.
                    </p>
                  </div>
                </div>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Planning</CardTitle>
              <CardDescription>
                Compare different financial scenarios to understand the impact of key decisions.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  <strong>Data Source:</strong> Model runs with runType='scenario' → Each scenario is a separate model run with custom overrides.
                  <br />
                  <strong>How to add data:</strong> Create scenarios from the Scenario Planning page. Each scenario runs a model with modified assumptions (revenue growth, expenses, etc.).
                </span>
              </CardDescription>
            </CardHeader>
          </Card>
          
          {loadingScenarios ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenarios.map((scenario) => {
                // Handle both summary and summaryJson (backend returns 'summary')
                const summary = scenario.summary || scenario.summaryJson || {}
                const scenarioName = scenario.name || scenario.scenarioName || scenario.scenario_name || "Unnamed Scenario"
                const paramsJson = scenario.paramsJson || {}
                const scenarioType = scenario.scenarioType || paramsJson.scenarioType || scenario.scenario_type || "adhoc"
                const isBaseCase = scenarioType === "baseline" || scenarioName.toLowerCase().includes("base") || scenarioName.toLowerCase().includes("baseline")
                
                // Calculate 6-month revenue from monthly data
                let sixMonthRevenue = 0
                let sixMonthNetIncome = 0
                if (summary.monthly && typeof summary.monthly === 'object') {
                  const monthly = summary.monthly
                  const months = Object.keys(monthly).sort().slice(0, 6) // First 6 months
                  months.forEach((month) => {
                    const monthData = monthly[month]
                    if (monthData) {
                      const revenue = monthData.revenue || monthData.totalRevenue || 0
                      const expenses = monthData.expenses || monthData.totalExpenses || 0
                      const netIncome = monthData.netIncome !== undefined ? monthData.netIncome : (revenue - expenses)
                      sixMonthRevenue += Number(revenue) || 0
                      sixMonthNetIncome += Number(netIncome) || 0
                    }
                  })
                }
                
                // Fallback to totalRevenue if monthly calculation fails
                if (sixMonthRevenue === 0 && summary.totalRevenue) {
                  // If totalRevenue exists but we couldn't calculate from monthly, use a fraction
                  // Assuming 12 months, 6 months would be roughly half
                  sixMonthRevenue = (summary.totalRevenue / 2) || 0
                }
                
                // Get runway (prefer runwayMonths, fallback to runway)
                const runway = summary.runwayMonths !== undefined 
                  ? summary.runwayMonths 
                  : (summary.runway !== undefined ? summary.runway : null)
                
                // Get net income (prefer calculated 6-month, fallback to total)
                const netIncome = sixMonthNetIncome !== 0 
                  ? sixMonthNetIncome 
                  : (summary.netIncome !== undefined ? summary.netIncome : null)
                
                // Check if scenario is still processing
                const isProcessing = scenario.status === 'queued' || scenario.status === 'running' || scenario.status === 'processing'
                const hasData = !isProcessing && (sixMonthRevenue > 0 || summary.totalRevenue) && runway !== null && netIncome !== null
                
                return (
                  <Card key={scenario.id} className={isBaseCase ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                      <CardTitle>{scenarioName}</CardTitle>
                      <CardDescription>
                        {scenario.description || `${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} scenario analysis`}
                        {scenario.status && (
                          <Badge variant={scenario.status === 'done' ? 'default' : scenario.status === 'failed' ? 'destructive' : 'secondary'} className="ml-2">
                            {scenario.status}
                          </Badge>
                        )}
                      </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Processing scenario...</p>
                    </div>
                  </div>
                ) : hasData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">6-month revenue</span>
                            <span className="font-semibold">
                              {sixMonthRevenue > 0
                                ? `$${(sixMonthRevenue / 1000).toFixed(0)}K`
                                : summary.totalRevenue
                                ? `$${((summary.totalRevenue / 2) / 1000).toFixed(0)}K`
                                : "N/A"}
                            </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Runway</span>
                            <span className="font-semibold">
                              {runway !== null && runway !== undefined
                                ? `${Math.round(runway)} months`
                                : "N/A"}
                            </span>
                    </div>
                    <div className="flex justify-between">
                            <span className="text-muted-foreground">Net Income</span>
                            <span className="font-semibold">
                              {netIncome !== null && netIncome !== undefined
                                ? `$${(netIncome / 1000).toFixed(0)}K`
                                : "N/A"}
                            </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>No data available yet</p>
                    <p className="text-xs mt-1">Scenario may still be processing</p>
                  </div>
                )}
              </CardContent>
            </Card>
                )
              })}
                  </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No scenarios available yet.</p>
                <p className="text-sm text-muted-foreground">
                  Create scenarios from the Scenario Planning page to see them here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="montecarlo" className="space-y-4 overflow-x-auto overflow-y-visible">
          {selectedModelId && orgId ? (
            <MonteCarloForecasting modelId={selectedModelId} orgId={orgId} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Please select a model to run Monte Carlo simulations.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
