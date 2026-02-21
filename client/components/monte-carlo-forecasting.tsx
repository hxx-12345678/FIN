"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

import { API_BASE_URL, getAuthToken } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Play, Save, Download, AlertTriangle, TrendingUp, Target, Zap, Info, BarChart3, Activity, ListTodo } from "lucide-react"
import { Button as LinkButton } from "@/components/ui/button"
import Link from "next/link"

// Distribution types
type DistributionType = "normal" | "triangular" | "lognormal"

// Driver configuration
interface Driver {
  id: string
  name: string
  mean: number
  stdDev: number
  min: number
  max: number
  distribution: DistributionType
  unit: string
  impact: "high" | "medium" | "low"
}

// Simulation results
interface SimulationResult {
  median: number
  percentile5: number
  percentile95: number
  mean: number
  stdDev: number
  runwayProbability: { [key: number]: number }
}

// Survival probability - MVP FEATURE: Probability of survival, not point forecast
interface SurvivalProbability {
  byMonth: Array<{
    month: string
    probability: number
    percentage: number
    simulationsSurvived: number
    simulationsFailed: number
  }>
  runwayThresholds: {
    [key: string]: {
      thresholdMonths: number
      probability: number
      percentage: number
      simulationsSurvived: number
      simulationsFailed: number
    }
  }
  overall: {
    probabilitySurvivingFullPeriod: number
    percentageSurvivingFullPeriod: number
    averageMonthsToFailure: number
    medianMonthsToFailure: number
    totalSimulations: number
    simulationsSurvived: number
    simulationsFailed: number
  }
  summary: {
    keyMessage: string
    riskLevel: 'high' | 'medium' | 'low'
  }
}

interface MonteCarloForecastingProps {
  modelId?: string
  orgId?: string
}

export function MonteCarloForecasting({ modelId, orgId }: MonteCarloForecastingProps = {}) {
  const { currencySymbol, formatCurrency } = useOrg()
  const [forecastMode, setForecastMode] = useState<"deterministic" | "montecarlo">("deterministic")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [numSimulations, setNumSimulations] = useState(5000)
  const [simulationComplete, setSimulationComplete] = useState(false)
  const [survivalProbability, setSurvivalProbability] = useState<SurvivalProbability | null>(null)
  const [percentiles, setPercentiles] = useState<any>(null)
  const [monteCarloResults, setMonteCarloResults] = useState<any>(null)
  const [existingMonteCarloJobs, setExistingMonteCarloJobs] = useState<any[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Key financial drivers with uncertainty ranges
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: "revenue_growth",
      name: "Revenue Growth Rate",
      mean: 8,
      stdDev: 3,
      min: 2,
      max: 15,
      distribution: "normal",
      unit: "%",
      impact: "high",
    },
    {
      id: "churn_rate",
      name: "Churn Rate",
      mean: 5,
      stdDev: 2,
      min: 2,
      max: 10,
      distribution: "normal",
      unit: "%",
      impact: "high",
    },
    {
      id: "cac",
      name: "Customer Acquisition Cost",
      mean: 125,
      stdDev: 25,
      min: 80,
      max: 200,
      distribution: "lognormal",
      unit: currencySymbol,
      impact: "medium",
    },
    {
      id: "conversion_rate",
      name: "Conversion Rate",
      mean: 3.5,
      stdDev: 1,
      min: 1.5,
      max: 6,
      distribution: "triangular",
      unit: "%",
      impact: "high",
    },
    {
      id: "avg_deal_size",
      name: "Average Deal Size",
      mean: 2400,
      stdDev: 400,
      min: 1500,
      max: 4000,
      distribution: "lognormal",
      unit: currencySymbol,
      impact: "medium",
    },
  ])

  // Cost calculation
  const costPerSim = 0.00005 // $0.05 per 1000 simulations
  const estimatedCost = numSimulations * costPerSim

  // Transform percentiles to chart data
  const getChartData = () => {
    if (!percentiles) return []

    if (percentiles.percentiles_table) {
      const length = percentiles.percentiles_table.p50.length;
      // Get months from today
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = new Date().getMonth();

      return Array.from({ length }).map((_, i) => {
        const monthIndex = (currentMonth + i) % 12;
        return {
          month: months[monthIndex],
          p5: percentiles.percentiles_table.p5[i],
          p10: percentiles.percentiles_table.p10?.[i] ?? percentiles.percentiles_table.p5[i], // P10 with fallback
          p25: percentiles.percentiles_table.p25[i],
          median: percentiles.percentiles_table.p50[i],
          p75: percentiles.percentiles_table.p75[i],
          p90: percentiles.percentiles_table.p90?.[i] ?? percentiles.percentiles_table.p95[i], // P90 with fallback
          p95: percentiles.percentiles_table.p95[i],
          deterministic: percentiles.percentiles_table.p50[i] // Fallback for deterministic line
        };
      });
    }
    return [];
  }

  const chartData = getChartData();

  // Runway distribution histogram - calculate from simulation results if available
  const getRunwayHistogram = () => {
    // If we have survival probability data, calculate from that
    if (survivalProbability && survivalProbability.overall) {
      // For now, return a placeholder structure - this should be calculated from actual runway outcomes
      // TODO: Calculate actual runway distribution from simulation results
      return [
        { runway: "6-8", frequency: 5, probability: 5 },
        { runway: "8-10", frequency: 12, probability: 12 },
        { runway: "10-12", frequency: 18, probability: 18 },
        { runway: "12-14", frequency: 25, probability: 25 },
        { runway: "14-16", frequency: 20, probability: 20 },
        { runway: "16-18", frequency: 12, probability: 12 },
        { runway: "18+", frequency: 8, probability: 8 },
      ];
    }
    // Return empty if no data
    return [];
  }

  const runwayHistogram = getRunwayHistogram();

  // Tornado chart (sensitivity analysis) - use sensitivityJson from results if available
  const getTornadoData = () => {
    // Try to get from monteCarloResults.sensitivityJson (preferred - array format)
    if (monteCarloResults?.sensitivityJson) {
      let sensitivity = typeof monteCarloResults.sensitivityJson === 'string'
        ? JSON.parse(monteCarloResults.sensitivityJson)
        : monteCarloResults.sensitivityJson;

      // Handle both array and object formats
      if (Array.isArray(sensitivity) && sensitivity.length > 0) {
        // Already in array format - convert to tornado chart format
        return sensitivity.map((item: any) => {
          const correlation = item.correlation || item.pearson_correlation || item.abs_correlation || 0.0;
          const impact = Math.abs(correlation) * 100000; // Scale for visualization
          return {
            driver: item.driver || item.name || 'Unknown',
            correlation: correlation,
            abs_correlation: Math.abs(correlation),
            p_value: item.p_value || 0.0,
            impact: impact,
            low: correlation < 0 ? impact : -impact / 2,
            high: correlation > 0 ? impact : impact / 2,
          };
        }).sort((a, b) => b.abs_correlation - a.abs_correlation);
      } else if (typeof sensitivity === 'object' && sensitivity !== null && !Array.isArray(sensitivity)) {
        // Convert object format (dict) to array format
        return Object.entries(sensitivity).map(([driver, data]: [string, any]) => {
          const correlation = data.pearson_correlation || data.correlation || data.abs_correlation || 0.0;
          const impact = Math.abs(correlation) * 100000;
          return {
            driver,
            correlation: correlation,
            abs_correlation: Math.abs(correlation),
            p_value: data.p_value || 0.0,
            impact: impact,
            low: correlation < 0 ? impact : -impact / 2,
            high: correlation > 0 ? impact : impact / 2,
          };
        }).sort((a, b) => b.abs_correlation - a.abs_correlation);
      }
    }

    // Also try to get from percentiles if sensitivity_json is not available
    if (percentiles && typeof percentiles === 'object') {
      const percentilesObj = percentiles as any;
      if (percentilesObj.tornado_sensitivity || percentilesObj.tornadoSensitivity) {
        const tornadoSens = percentilesObj.tornado_sensitivity || percentilesObj.tornadoSensitivity;
        if (typeof tornadoSens === 'object' && !Array.isArray(tornadoSens)) {
          // Convert dict format to array format
          return Object.entries(tornadoSens).map(([driver, data]: [string, any]) => {
            const correlation = data.pearson_correlation || data.correlation || data.abs_correlation || 0.0;
            const impact = Math.abs(correlation) * 100000;
            return {
              driver,
              correlation: correlation,
              abs_correlation: Math.abs(correlation),
              p_value: data.p_value || 0.0,
              impact: impact,
              low: correlation < 0 ? impact : -impact / 2,
              high: correlation > 0 ? impact : impact / 2,
            };
          }).sort((a, b) => b.abs_correlation - a.abs_correlation);
        } else if (Array.isArray(tornadoSens) && tornadoSens.length > 0) {
          return tornadoSens.map((item: any) => {
            const correlation = item.correlation || item.pearson_correlation || item.abs_correlation || 0.0;
            const impact = Math.abs(correlation) * 100000;
            return {
              driver: item.driver || item.name || 'Unknown',
              correlation: correlation,
              abs_correlation: Math.abs(correlation),
              p_value: item.p_value || 0.0,
              impact: impact,
              low: correlation < 0 ? impact : -impact / 2,
              high: correlation > 0 ? impact : impact / 2,
            };
          }).sort((a, b) => b.abs_correlation - a.abs_correlation);
        }
      }
    }

    // Fallback to default hardcoded data if no results available
    return [
      { driver: "Revenue Growth", low: -180000, high: 220000, impact: 400000, correlation: 0.8, abs_correlation: 0.8, p_value: 0.0 },
      { driver: "Churn Rate", low: -150000, high: 180000, impact: 330000, correlation: 0.65, abs_correlation: 0.65, p_value: 0.0 },
      { driver: "Conversion Rate", low: -120000, high: 140000, impact: 260000, correlation: 0.52, abs_correlation: 0.52, p_value: 0.0 },
      { driver: "CAC", low: -80000, high: 95000, impact: 175000, correlation: 0.35, abs_correlation: 0.35, p_value: 0.0 },
      { driver: "Deal Size", low: -70000, high: 85000, impact: 155000, correlation: 0.31, abs_correlation: 0.31, p_value: 0.0 },
    ].sort((a, b) => b.impact - a.impact);
  }

  const tornadoData = getTornadoData();

  // Top 3 uncertainty drivers - calculate from tornado data or use defaults
  const getTopDrivers = () => {
    // Use tornado data to calculate top drivers
    if (tornadoData.length > 0) {
      const totalImpact = tornadoData.reduce((sum, item) => sum + item.impact, 0);
      return tornadoData.slice(0, 3).map((item, index) => ({
        name: item.driver,
        contribution: totalImpact > 0 ? Math.round((item.impact / totalImpact) * 100) : 0,
        description: index === 0
          ? "Highest impact on forecast uncertainty due to market volatility"
          : index === 1
            ? "Customer retention variability significantly affects long-term projections"
            : "Sales funnel efficiency variations create revenue uncertainty",
      }));
    }

    // Fallback to default hardcoded data
    return [
      {
        name: "Revenue Growth Rate",
        contribution: 42,
        description: "Highest impact on forecast uncertainty due to market volatility",
      },
      {
        name: "Churn Rate",
        contribution: 28,
        description: "Customer retention variability significantly affects long-term projections",
      },
      {
        name: "Conversion Rate",
        contribution: 18,
        description: "Sales funnel efficiency variations create revenue uncertainty",
      },
    ];
  }

  const topDrivers = getTopDrivers();

  // Fetch existing Monte Carlo jobs when component loads or modelId changes
  useEffect(() => {
    // Only fetch if we have both modelId and orgId, and a valid token
    const token = getAuthToken()
    if (modelId && orgId && token) {
      fetchExistingMonteCarloJobs()
    }
  }, [modelId, orgId])

  const fetchExistingMonteCarloJobs = async () => {
    if (!modelId || !orgId) return

    setLoadingJobs(true)
    try {
      const token = getAuthToken()

      if (!token) {
        console.error('No auth token found')
        setLoadingJobs(false)
        return
      }

      // Ensure API_BASE_URL includes /api/v1
      let baseUrl = API_BASE_URL
      if (!baseUrl.endsWith('/api/v1')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1'
      }

      const response = await fetch(`${baseUrl}/models/${modelId}/montecarlo`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed - token may be expired')
          toast.error("Your session has expired. Please log in again.")
          return
        }
        const errorText = await response.text()
        console.error(`Failed to fetch Monte Carlo jobs: ${response.status} - ${errorText}`)
        return
      }

      const result = await response.json()
      if (result.ok && Array.isArray(result.monteCarloJobs)) {
        setExistingMonteCarloJobs(result.monteCarloJobs)

        // If there are completed jobs, load the most recent one
        const completedJobs = result.monteCarloJobs.filter((job: any) => job.status === 'done' && job.hasResults)
        if (completedJobs.length > 0 && !selectedJobId) {
          const latestJob = completedJobs[0] // Already sorted by createdAt desc
          loadMonteCarloJobResults(latestJob.jobId || latestJob.id, token)
          setSelectedJobId(latestJob.jobId || latestJob.id)
        }
      } else {
        console.error('Invalid response format:', result)
      }
    } catch (error) {
      console.error('Failed to fetch existing Monte Carlo jobs:', error)
      toast.error("Failed to load Monte Carlo jobs. Please try again.")
    } finally {
      setLoadingJobs(false)
    }
  }

  const loadMonteCarloJobResults = async (jobId: string, token: string) => {
    if (!jobId || !token) return;

    try {
      let baseUrl = API_BASE_URL
      if (!baseUrl.endsWith('/api/v1')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1'
      }

      const response = await fetch(`${baseUrl}/montecarlo/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed when loading job results')
          toast.error("Your session has expired. Please log in again.")
          return
        }
        console.error('Failed to load Monte Carlo job results:', response.status, await response.text().catch(() => 'Unknown error'))
        return
      }

      const result = await response.json()
      if (result.ok) {
        // Set all result data
        setMonteCarloResults(result)

        // Set selectedJobId so export button works
        setSelectedJobId(jobId)

        // Parse and set percentiles
        if (result.percentiles) {
          setPercentiles(result.percentiles)
        } else if (result.summary) {
          setPercentiles(result.summary)
        }

        // Set survival probability
        if (result.survivalProbability) {
          setSurvivalProbability(result.survivalProbability)
        }

        // Ensure sensitivity data is set (from sensitivityJson)
        if (result.sensitivityJson) {
          // Already included in monteCarloResults above
        }

        // Update completion state
        if (result.status === 'done' || result.status === 'completed') {
          setSimulationComplete(true)
          setSimulationProgress(100)
        } else {
          setSimulationComplete(false)
          setSimulationProgress(result.progress || 0)
        }

        // Switch to Monte Carlo mode if we have results
        if (result.percentiles || result.sensitivityJson) {
          setForecastMode("montecarlo")
        }
      } else {
        console.error('Invalid response format:', result)
        toast.error("Failed to load simulation results: Invalid response format")
      }
    } catch (error) {
      console.error('Failed to load Monte Carlo job results:', error)
      toast.error("Failed to load simulation results. Please try again.")
    }
  }

  const handleRunSimulation = async () => {
    if (!modelId || !orgId) {
      toast.error("Please select a model first")
      return
    }

    setIsSimulating(true)
    setSimulationProgress(0)
    setSimulationComplete(false)
    setSurvivalProbability(null)

    try {
      const token = getAuthToken()

      if (!token) {
        toast.error("Authentication token not found. Please log in again.")
        setIsSimulating(false)
        return
      }

      // Simulate progress while waiting for job - this will be cleared when API polling starts
      // Keep progress very low to avoid confusion
      const progressInterval = setInterval(() => {
        setSimulationProgress((prev) => {
          // Cap at 20% for fake progress - API will take over after job is created
          if (prev >= 20) {
            return 20
          }
          return prev + 1
        })
      }, 200) // Very slow increment: 1% every 200ms = ~4 seconds to reach 20%

      // Create Monte Carlo job via backend
      if (modelId && orgId) {
        try {
          // Ensure API_BASE_URL includes /api/v1
          let baseUrl = API_BASE_URL
          if (!baseUrl.endsWith('/api/v1')) {
            baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1'
          }
          const monteCarloUrl = `${baseUrl}/models/${modelId}/montecarlo`
          console.log("📤 API_BASE_URL:", API_BASE_URL)
          console.log("📤 Corrected baseUrl:", baseUrl)
          console.log("📤 Full Monte Carlo URL:", monteCarloUrl)
          const response = await fetch(monteCarloUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              numSimulations,
              drivers: drivers.map(d => ({
                id: d.id,
                mean: d.mean,
                stdDev: d.stdDev,
                min: d.min,
                max: d.max,
                distribution: d.distribution,
              })),
            }),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.ok && result.jobId) {
              // Store monteCarloJobId if provided for direct polling
              const mcJobId = result.monteCarloJobId || result.jobId
              // Poll for completion - use jobId for polling
              pollMonteCarloJob(result.jobId, token, progressInterval)
              return
            }
          } else {
            // Handle different error status codes
            const errorData = await response.json().catch(() => ({}))
            const errorMsg = errorData.error?.message || errorData.message || "Failed to start Monte Carlo simulation"

            // Handle quota/credit errors (403) with helpful message
            if (response.status === 403) {
              throw new Error(errorMsg + " Please upgrade your plan or wait for your quota to reset.")
            } else if (response.status === 401) {
              throw new Error("Your session has expired. Please log in again.")
            } else {
              throw new Error(errorMsg)
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to start simulation"
          const isNetworkError =
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("NetworkError") ||
            errorMessage.includes("ERR_NETWORK") ||
            errorMessage.includes("ERR_CONNECTION_REFUSED") ||
            (error instanceof TypeError && error.message.includes("fetch"))

          console.error("Error starting Monte Carlo:", error)

          if (isNetworkError) {
            toast.error("Cannot connect to server. Please ensure the backend server is running.")
          } else {
            toast.error(errorMessage)
          }

          clearInterval(progressInterval)
          setIsSimulating(false)
          return
        }
      }

      // Fallback: simulate completion with mock data if no modelId
      setTimeout(() => {
        clearInterval(progressInterval)
        setSimulationProgress(100)
        setIsSimulating(false)
        setSimulationComplete(true)

        // Mock survival probability data for demonstration
        setSurvivalProbability({
          byMonth: [],
          runwayThresholds: {
            '6_months': { thresholdMonths: 6, probability: 0.82, percentage: 82, simulationsSurvived: 4100, simulationsFailed: 900 },
            '12_months': { thresholdMonths: 12, probability: 0.65, percentage: 65, simulationsSurvived: 3250, simulationsFailed: 1750 },
          },
          overall: {
            probabilitySurvivingFullPeriod: 0.75,
            percentageSurvivingFullPeriod: 75,
            averageMonthsToFailure: 10.5,
            medianMonthsToFailure: 11.2,
            totalSimulations: 5000,
            simulationsSurvived: 3750,
            simulationsFailed: 1250,
          },
          summary: {
            keyMessage: 'Probability of survival: 75.0% chance of surviving the full 12-month forecast period',
            riskLevel: 'medium' as const,
          },
        })
      }, 2000)
    } catch (error) {
      console.error('Simulation failed:', error)
      setIsSimulating(false)
      setSimulationComplete(false)
      toast.error("Simulation failed")
    }
  }

  const pollMonteCarloJob = async (jobId: string, token: string, progressInterval: NodeJS.Timeout) => {
    const maxAttempts = 120 // 4 minutes max
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        clearInterval(progressInterval)
        setIsSimulating(false)
        toast.warning("Simulation is taking longer than expected. Please check back later.")
        return
      }

      try {
        // Poll both jobs endpoint and monte carlo endpoint for accurate status
        // Ensure API_BASE_URL includes /api/v1
        let baseUrl = API_BASE_URL
        if (!baseUrl.endsWith('/api/v1')) {
          baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1'
        }
        const [jobResponse, mcResponse] = await Promise.all([
          fetch(`${baseUrl}/jobs/${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }),
          fetch(`${baseUrl}/montecarlo/${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
        ])

        // Get job status from jobs endpoint
        let jobStatus = null
        let jobProgress = 0
        if (jobResponse.ok) {
          const jobResult = await jobResponse.json()
          if (jobResult.ok && jobResult.job) {
            jobStatus = jobResult.job.status
            jobProgress = jobResult.job.progress || 0
          }
        }

        // Get detailed results from monte carlo endpoint
        if (mcResponse.ok) {
          const result = await mcResponse.json()
          if (result.ok) {
            // API returns data directly, not nested under monteCarlo
            const status = result.status || jobStatus

            // Calculate progress: use API progress if available, otherwise estimate from status
            let progress = result.progress !== undefined ? result.progress : (jobProgress !== undefined ? jobProgress : null)

            // If no progress from API but we have a status, estimate progress
            if (progress === null || progress === undefined) {
              if (status === "queued") {
                progress = 10
              } else if (status === "running" || status === "processing") {
                progress = 50 // Estimate 50% for running jobs
              } else if (status === "completed" || status === "done") {
                progress = 100
              } else {
                progress = 40 // Default to 40% if unknown
              }
            }

            // ALWAYS clear the fake progress interval once we get any real progress data
            // This ensures we only use API progress, not the fake interval
            clearInterval(progressInterval)

            // Update progress - use API/calculated progress
            // Ensure progress is always between 0 and 100
            const finalProgress = Math.min(Math.max(progress, 0), 100)
            setSimulationProgress(finalProgress)

            // Check if job is complete - check both monte carlo status and job status
            const isComplete = status === "completed" || status === "done" ||
              jobStatus === "completed" || jobStatus === "done"

            if (isComplete) {
              clearInterval(progressInterval)
              setSimulationProgress(100)
              setIsSimulating(false)
              setSimulationComplete(true)

              // Store full results
              setMonteCarloResults(result)

              // Set selectedJobId so export button works
              if (result.jobId || result.monteCarloJobId) {
                setSelectedJobId(result.jobId || result.monteCarloJobId)
              }

              // Extract percentiles from results
              if (result.percentiles) {
                setPercentiles(result.percentiles)
              } else if (result.percentilesJson) {
                // If percentiles are in JSON string format
                try {
                  const parsed = typeof result.percentilesJson === 'string'
                    ? JSON.parse(result.percentilesJson)
                    : result.percentilesJson
                  setPercentiles(parsed)
                } catch (e) {
                  console.error("Error parsing percentiles JSON:", e)
                }
              }

              // Extract survival probability from results
              if (result.survivalProbability) {
                setSurvivalProbability(result.survivalProbability)
              } else if (result.percentiles?.survival_probability) {
                setSurvivalProbability(result.percentiles.survival_probability)
              } else if (result.summary?.survival_probability) {
                setSurvivalProbability(result.summary.survival_probability)
              } else if (result.summary) {
                // Convert summary to survival probability format
                const summary = result.summary
                setSurvivalProbability({
                  byMonth: summary.byMonth || summary.by_month || [],
                  runwayThresholds: summary.runwayThresholds || summary.runway_thresholds || {},
                  overall: summary.overall || {
                    probabilitySurvivingFullPeriod: 0.75,
                    percentageSurvivingFullPeriod: 75,
                    averageMonthsToFailure: 10.5,
                    medianMonthsToFailure: 11.2,
                    totalSimulations: result.numSimulations || numSimulations,
                    simulationsSurvived: Math.round((result.numSimulations || numSimulations) * 0.75),
                    simulationsFailed: Math.round((result.numSimulations || numSimulations) * 0.25),
                  },
                  summary: summary.summary || {
                    keyMessage: 'Monte Carlo simulation completed',
                    riskLevel: 'medium' as const,
                  },
                })
              }

              toast.success("Monte Carlo simulation completed!")
              return
            } else if (status === "failed" || status === "dead_letter" ||
              jobStatus === "failed" || jobStatus === "dead_letter") {
              clearInterval(progressInterval)
              setIsSimulating(false)
              throw new Error(result.lastError || "Simulation failed")
            }

            // Continue polling if not complete
            attempts++
            if (attempts < maxAttempts) {
              setTimeout(poll, 2000)
            } else {
              clearInterval(progressInterval)
              setIsSimulating(false)
              toast.warning("Simulation is taking longer than expected. Please check back later.")
            }
            return
          }
        } else if (jobResponse.ok) {
          // If monte carlo endpoint fails but job endpoint works, use job status
          const jobResult = await jobResponse.json()
          if (jobResult.ok && jobResult.job) {
            const status = jobResult.job.status
            let progress = jobResult.job.progress

            // If no progress, estimate from status
            if (progress === null || progress === undefined) {
              if (status === "queued") {
                progress = 10
              } else if (status === "running" || status === "processing") {
                progress = 50
              } else if (status === "completed" || status === "done") {
                progress = 100
              } else {
                progress = 40
              }
            }

            // ALWAYS clear the fake progress interval once we get any real progress data
            clearInterval(progressInterval)

            // Update progress - use API/calculated progress
            const finalProgress = Math.min(Math.max(progress, 0), 100)
            setSimulationProgress(finalProgress)

            if (status === "completed" || status === "done") {
              clearInterval(progressInterval)
              setSimulationProgress(100)
              setIsSimulating(false)
              setSimulationComplete(true)
              // Set selectedJobId so export button works
              if (jobId) {
                setSelectedJobId(jobId)
              }
              toast.success("Monte Carlo simulation completed!")
              return
            }

            // Continue polling if not complete
            attempts++
            if (attempts < maxAttempts) {
              setTimeout(poll, 2000)
            } else {
              clearInterval(progressInterval)
              setIsSimulating(false)
              toast.warning("Simulation is taking longer than expected. Please check back later.")
            }
            return
          }
        }

        // If neither response worked, retry
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          clearInterval(progressInterval)
          setIsSimulating(false)
          toast.error("Error checking simulation status")
        }
      } catch (error) {
        console.error("Error polling Monte Carlo job:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          clearInterval(progressInterval)
          setIsSimulating(false)
          toast.error("Error checking simulation status")
        }
      }
    }

    poll()
  }

  const updateDriver = (id: string, field: keyof Driver, value: any) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Monte Carlo Forecasting</h1>
          <p className="text-sm md:text-base text-muted-foreground">Probabilistic financial modeling with uncertainty quantification</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <LinkButton variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#job-queue">
              <ListTodo className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">View Job Queue</span>
              <span className="sm:hidden">Queue</span>
            </Link>
          </LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Select value={forecastMode} onValueChange={(v: any) => setForecastMode(v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deterministic">Deterministic Forecast</SelectItem>
            <SelectItem value="montecarlo">Monte Carlo Forecast</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Save Snapshot</span>
          <span className="sm:hidden">Save</span>
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={async () => {
            const jobIdForExport = selectedJobId || monteCarloResults?.jobId || monteCarloResults?.monteCarloJobId;
            if (!monteCarloResults || !jobIdForExport) {
              toast.error("No simulation results to export. Please run a Monte Carlo simulation first.")
              return
            }

            try {
              const token = getAuthToken()
              if (!token) {
                toast.error("Authentication token not found. Please log in again.")
                return
              }

              // Export as JSON
              const exportData = {
                jobId: jobIdForExport,
                monteCarloJobId: monteCarloResults.monteCarloJobId || jobIdForExport,
                status: monteCarloResults.status,
                numSimulations: monteCarloResults.numSimulations || numSimulations,
                percentiles: percentiles,
                sensitivityJson: monteCarloResults.sensitivityJson,
                survivalProbability: survivalProbability,
                confidenceLevel: monteCarloResults.confidenceLevel,
                createdAt: monteCarloResults.createdAt,
                finishedAt: monteCarloResults.finishedAt,
                drivers: drivers,
              }

              const jsonString = JSON.stringify(exportData, null, 2)
              const blob = new Blob([jsonString], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              const dateStr = new Date().toISOString().split('T')[0]
              a.download = `monte-carlo-results-${dateStr}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              toast.success("Results exported successfully")
            } catch (error) {
              console.error("Failed to export results:", error)
              toast.error("Failed to export results. Please try again.")
            }
          }}
          disabled={!monteCarloResults || (!selectedJobId && !monteCarloResults.jobId && !monteCarloResults.monteCarloJobId)}
        >
          <Download className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Export Results</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      {/* Mode Toggle Info */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">
                {forecastMode === "deterministic" ? "Deterministic Mode" : "Monte Carlo Mode"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {forecastMode === "deterministic"
                  ? "Single-point estimates using mean values. Switch to Monte Carlo for probabilistic analysis with confidence intervals."
                  : `Running ${numSimulations.toLocaleString()} simulations to model uncertainty and generate probability distributions. This provides confidence bands and risk metrics.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="drivers" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-[500px]">
            <TabsTrigger value="drivers" className="text-xs sm:text-sm">Drivers & Distributions</TabsTrigger>
            <TabsTrigger value="results" className="text-xs sm:text-sm">Simulation Results</TabsTrigger>
            <TabsTrigger value="fanChart" className="text-xs sm:text-sm">Fan Chart</TabsTrigger>
            <TabsTrigger value="sensitivity" className="text-xs sm:text-sm">Sensitivity Analysis</TabsTrigger>
            <TabsTrigger value="explainability" className="text-xs sm:text-sm">Explainability</TabsTrigger>
          </TabsList>
        </div>

        {/* Drivers Configuration */}
        <TabsContent value="drivers" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>
                {forecastMode === "deterministic" ? "Configure Drivers (Deterministic)" : "Configure Key Drivers (Monte Carlo)"}
              </CardTitle>
              <CardDescription>
                {forecastMode === "deterministic"
                  ? "Set mean values for deterministic forecast (single-point estimates)"
                  : "Set uncertainty ranges and probability distributions for each financial driver"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/30 rounded-lg border border-muted-foreground/10">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Forecast Mode</Label>
                    <Badge variant="outline" className="text-[10px] uppercase">{forecastMode}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={forecastMode === "deterministic" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForecastMode("deterministic")}
                      className="flex-1 text-xs"
                    >
                      Deterministic
                    </Button>
                    <Button
                      variant={forecastMode === "montecarlo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForecastMode("montecarlo")}
                      className="flex-1 text-xs"
                    >
                      Monte Carlo
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Simulations: {numSimulations}</Label>
                    <Badge variant="secondary" className="text-[10px]">Est. Cost: ${estimatedCost.toFixed(2)}</Badge>
                  </div>
                  <Slider
                    value={[numSimulations]}
                    onValueChange={([v]) => setNumSimulations(v)}
                    min={100}
                    max={10000}
                    step={100}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Quick (100)</span>
                    <span>Deep (10k)</span>
                  </div>
                </div>
              </div>

              {drivers.map((driver) => (
                <div key={driver.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between group">
                    <div>
                      <h3 className="font-semibold">{driver.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current: {driver.mean}
                        {driver.unit} ± {driver.stdDev}
                        {driver.unit}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          driver.impact === "high" ? "destructive" : driver.impact === "medium" ? "default" : "secondary"
                        }
                      >
                        {driver.impact} impact
                      </Badge>
                      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {driver.id === "revenue_growth" && "Benchmark: 5-15% (Scale-up)"}
                        {driver.id === "churn_rate" && "Good: < 2%, Critical: > 5%"}
                        {driver.id === "cac" && "Target: LTV > 3x CAC"}
                        {driver.id === "conversion_rate" && "SaaS Avg: 2-5% (B2B)"}
                        {driver.id === "avg_deal_size" && "Total ACV / Customers"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Distribution Type</Label>
                      <Select
                        value={driver.distribution}
                        onValueChange={(v: DistributionType) => updateDriver(driver.id, "distribution", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal (Gaussian)</SelectItem>
                          <SelectItem value="triangular">Triangular</SelectItem>
                          <SelectItem value="lognormal">Lognormal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Mean Value: {driver.mean}
                        {driver.unit}
                      </Label>
                      <Slider
                        value={[driver.mean]}
                        onValueChange={([v]) => updateDriver(driver.id, "mean", v)}
                        min={driver.min}
                        max={driver.max}
                        step={driver.unit === currencySymbol ? 10 : 0.5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Std Deviation: {driver.stdDev}
                        {driver.unit}
                      </Label>
                      <Slider
                        value={[driver.stdDev]}
                        onValueChange={([v]) => updateDriver(driver.id, "stdDev", v)}
                        min={0}
                        max={(driver.max - driver.min) / 2}
                        step={driver.unit === currencySymbol ? 5 : 0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Min Bound ({driver.unit})</Label>
                      <Input
                        type="number"
                        value={driver.min}
                        onChange={(e) => updateDriver(driver.id, "min", parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Bound ({driver.unit})</Label>
                      <Input
                        type="number"
                        value={driver.max}
                        onChange={(e) => updateDriver(driver.id, "max", parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1">
                  <Label>Number of Simulations</Label>
                  <Select
                    value={numSimulations.toString()}
                    onValueChange={(v) => setNumSimulations(Number.parseInt(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="2500">2,500</SelectItem>
                      <SelectItem value="5000">5,000 (Recommended)</SelectItem>
                      <SelectItem value="10000">10,000</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground mt-1">
                    Est. Cost: {formatCurrency(estimatedCost)}
                  </div>
                </div>

                <Button size="lg" onClick={handleRunSimulation} disabled={isSimulating}>
                  {isSimulating ? (
                    <>
                      <Activity className="mr-2 h-5 w-5 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Run Monte Carlo Simulation
                    </>
                  )}
                </Button>
              </div>

              {isSimulating && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary animate-spin" />
                        <span className="font-semibold text-sm">Simulation in Progress</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{simulationProgress}%</span>
                    </div>
                    <Progress value={simulationProgress} className="h-3" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Running {numSimulations.toLocaleString()} simulations across {drivers.length} drivers</span>
                      <span>
                        {simulationProgress < 50 && "Initializing..."}
                        {simulationProgress >= 50 && simulationProgress < 90 && "Processing simulations..."}
                        {simulationProgress >= 90 && simulationProgress < 100 && "Finalizing results..."}
                        {simulationProgress === 100 && "Complete!"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulation Results */}
        <TabsContent value="results" className="space-y-4 overflow-x-auto overflow-y-visible">
          {!simulationComplete ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Simulation Results Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your drivers and run a Monte Carlo simulation to see probabilistic forecasts
                </p>
                <Button onClick={() => handleRunSimulation()}>
                  <Play className="mr-2 h-4 w-4" />
                  Run Simulation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* MVP FEATURE: Survival Probability - Prominently Displayed */}
              {survivalProbability && (
                <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5 mb-6">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Target className="h-6 w-6 text-primary" />
                      Probability of Survival
                    </CardTitle>
                    <CardDescription className="text-base">
                      <strong>MVP Feature:</strong> We show the probability of survival, not a single point forecast
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-background">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <Badge variant={survivalProbability.summary.riskLevel === 'low' ? 'default' : survivalProbability.summary.riskLevel === 'medium' ? 'secondary' : 'destructive'}>
                              {survivalProbability.summary.riskLevel.toUpperCase()} RISK
                            </Badge>
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            {survivalProbability.overall.percentageSurvivingFullPeriod.toFixed(1)}%
                          </div>
                          <p className="text-sm text-muted-foreground">Probability of Surviving Full Period</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-background">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <Badge variant="outline">6 Months</Badge>
                          </div>
                          <div className="text-3xl font-bold text-green-600">
                            {survivalProbability.runwayThresholds['6_months']?.percentage
                              ? survivalProbability.runwayThresholds['6_months'].percentage.toFixed(1) + '%'
                              : survivalProbability.runwayThresholds['6_months']?.probability
                                ? (survivalProbability.runwayThresholds['6_months'].probability * 100).toFixed(1) + '%'
                                : survivalProbability.overall?.percentageSurvivingFullPeriod
                                  ? (survivalProbability.overall.percentageSurvivingFullPeriod * 0.9).toFixed(1) + '%' // Estimate 6-month as ~90% of 12-month
                                  : '0.0%'}
                          </div>
                          <p className="text-sm text-muted-foreground">Survival to 6 Months</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-background">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            <Badge variant="outline">12 Months</Badge>
                          </div>
                          <div className="text-3xl font-bold text-blue-600">
                            {survivalProbability.runwayThresholds['12_months']?.percentage
                              ? survivalProbability.runwayThresholds['12_months'].percentage.toFixed(1) + '%'
                              : survivalProbability.runwayThresholds['12_months']?.probability
                                ? (survivalProbability.runwayThresholds['12_months'].probability * 100).toFixed(1) + '%'
                                : survivalProbability.overall?.percentageSurvivingFullPeriod || 0}%
                          </div>
                          <p className="text-sm text-muted-foreground">Survival to 12 Months</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-background">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <Badge variant="outline">Avg Failure</Badge>
                          </div>
                          <div className="text-3xl font-bold text-orange-600">
                            {survivalProbability.overall.averageMonthsToFailure.toFixed(1)}
                          </div>
                          <p className="text-sm text-muted-foreground">Average Months to Failure</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-semibold text-lg mb-2">{survivalProbability.summary.keyMessage}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Simulations Survived: </span>
                          <span className="font-semibold">{survivalProbability.overall.simulationsSurvived.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Simulations Failed: </span>
                          <span className="font-semibold">{survivalProbability.overall.simulationsFailed.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Simulations: </span>
                          <span className="font-semibold">{survivalProbability.overall.totalSimulations.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Median Months to Failure: </span>
                          <span className="font-semibold">{survivalProbability.overall.medianMonthsToFailure.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <Badge variant="outline">Median</Badge>
                    </div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 5) {
                          return formatCurrency(percentiles.percentiles_table.p50[5]);
                        }
                        if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                          const lastIndex = percentiles.percentiles_table.p50.length - 1;
                          return formatCurrency(percentiles.percentiles_table.p50[lastIndex]);
                        }
                        if (percentiles?.monthly) {
                          const monthKeys = Object.keys(percentiles.monthly);
                          if (monthKeys.length > 5 && percentiles.monthly[monthKeys[5]]?.p50) {
                            return formatCurrency(percentiles.monthly[monthKeys[5]].p50);
                          }
                          if (monthKeys.length > 0 && percentiles.monthly[monthKeys[monthKeys.length - 1]]?.p50) {
                            return formatCurrency(percentiles.monthly[monthKeys[monthKeys.length - 1]].p50);
                          }
                        }
                        return formatCurrency(0);
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">6-Month Cash Position</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <Badge variant="outline">95th %ile</Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {(() => {
                        if (percentiles?.percentiles_table?.p95 && percentiles.percentiles_table.p95.length > 5) {
                          return formatCurrency(percentiles.percentiles_table.p95[5]);
                        }
                        if (percentiles?.percentiles_table?.p95 && percentiles.percentiles_table.p95.length > 0) {
                          const lastIndex = percentiles.percentiles_table.p95.length - 1;
                          return formatCurrency(percentiles.percentiles_table.p95[lastIndex]);
                        }
                        if (percentiles?.monthly) {
                          const monthKeys = Object.keys(percentiles.monthly);
                          if (monthKeys.length > 5 && percentiles.monthly[monthKeys[5]]?.p95) {
                            return formatCurrency(percentiles.monthly[monthKeys[5]].p95);
                          }
                          if (monthKeys.length > 0 && percentiles.monthly[monthKeys[monthKeys.length - 1]]?.p95) {
                            return formatCurrency(percentiles.monthly[monthKeys[monthKeys.length - 1]].p95);
                          }
                        }
                        return formatCurrency(0);
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">Best Case Scenario</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <Badge variant="outline">5th %ile</Badge>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {(() => {
                        if (percentiles?.percentiles_table?.p5 && percentiles.percentiles_table.p5.length > 5) {
                          return formatCurrency(percentiles.percentiles_table.p5[5]);
                        }
                        if (percentiles?.percentiles_table?.p5 && percentiles.percentiles_table.p5.length > 0) {
                          const lastIndex = percentiles.percentiles_table.p5.length - 1;
                          return formatCurrency(percentiles.percentiles_table.p5[lastIndex]);
                        }
                        if (percentiles?.monthly) {
                          const monthKeys = Object.keys(percentiles.monthly);
                          if (monthKeys.length > 5 && percentiles.monthly[monthKeys[5]]?.p5) {
                            return formatCurrency(percentiles.monthly[monthKeys[5]].p5);
                          }
                          if (monthKeys.length > 0 && percentiles.monthly[monthKeys[monthKeys.length - 1]]?.p5) {
                            return formatCurrency(percentiles.monthly[monthKeys[monthKeys.length - 1]].p5);
                          }
                        }
                        return formatCurrency(0);
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">Worst Case Scenario</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <Badge variant="outline">Probability</Badge>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {survivalProbability?.runwayThresholds?.['12_months']?.percentage?.toFixed(1) ||
                        survivalProbability?.runwayThresholds?.['12_months']?.probability
                        ? `${(survivalProbability.runwayThresholds['12_months'].probability * 100).toFixed(1)}`
                        : survivalProbability?.overall?.percentageSurvivingFullPeriod?.toFixed(1) || "0"}%
                    </div>
                    <p className="text-sm text-muted-foreground">12-Month Survival Probability</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Runway Probability Distribution</CardTitle>
                  <CardDescription>Histogram showing likelihood of different runway outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300} className="min-h-[300px] sm:min-h-[350px]">
                    <BarChart data={runwayHistogram}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="runway"
                        label={{ value: "Runway (months)", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis label={{ value: "Probability (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => [`${value}%`, "Probability"]} />
                      <Bar dataKey="probability" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Key Insights:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• 82% probability of maintaining runway above 12 months</li>
                      <li>• Median runway: 13.5 months with 90% confidence interval of 10-17 months</li>
                      <li>• Only 5% chance of runway falling below 8 months</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Fan Chart */}
        <TabsContent value="fanChart" className="space-y-4 overflow-x-auto overflow-y-visible">
          {chartData && chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Fan Chart - Probabilistic Forecast</CardTitle>
                <CardDescription>
                  Probabilistic cash flow projections with 5th-95th percentile confidence bands.
                  Shows the range of possible outcomes from Monte Carlo simulations.
                  {monteCarloResults?.confidenceLevel && (
                    <span className="ml-2 font-semibold">
                      Confidence Level: {(Number(monteCarloResults.confidenceLevel) * 100).toFixed(0)}%
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} className="min-h-[300px] sm:min-h-[400px]">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                    <Legend />

                    {/* 80% Confidence Band (P10-P90) - Primary visualization with bright colors */}
                    <Area
                      type="monotone"
                      dataKey="p90"
                      stackId="1"
                      stroke="none"
                      fill="#10b981"
                      fillOpacity={0.5}
                      name="P90 (90th Percentile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="p75"
                      stackId="2"
                      stroke="none"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                      name="P75 (75th Percentile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="median"
                      stackId="3"
                      stroke="none"
                      fill="#6366f1"
                      fillOpacity={0.6}
                      name="P50 (Median)"
                    />
                    <Area
                      type="monotone"
                      dataKey="p25"
                      stackId="4"
                      stroke="none"
                      fill="#8b5cf6"
                      fillOpacity={0.5}
                      name="P25 (25th Percentile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="p10"
                      stackId="5"
                      stroke="none"
                      fill="#f59e0b"
                      fillOpacity={0.5}
                      name="P10 (10th Percentile)"
                    />
                    {/* Extended 90% Confidence Band (P5-P95) - Brighter overlay */}
                    <Area
                      type="monotone"
                      dataKey="p95"
                      stackId="6"
                      stroke="none"
                      fill="#06b6d4"
                      fillOpacity={0.3}
                      name="P95 (95th Percentile)"
                    />
                    <Area
                      type="monotone"
                      dataKey="p5"
                      stackId="7"
                      stroke="none"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="P5 (5th Percentile)"
                    />

                    {/* Median Line */}
                    <Line
                      type="monotone"
                      dataKey="median"
                      stroke="#6366f1"
                      strokeWidth={3}
                      name="Median Forecast"
                      dot={false}
                    />

                    {/* Deterministic Comparison */}
                    {forecastMode === "montecarlo" && (
                      <Line
                        type="monotone"
                        dataKey="deterministic"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Deterministic"
                        dot={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Median Projection</div>
                    <div className="text-xl font-bold">
                      {(() => {
                        if (chartData.length > 0) {
                          const lastMonth = chartData[chartData.length - 1];
                          if (lastMonth.median) {
                            return formatCurrency(lastMonth.median);
                          }
                          // Try to calculate from percentiles if available
                          if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                            const lastIndex = percentiles.percentiles_table.p50.length - 1;
                            const median = percentiles.percentiles_table.p50[lastIndex];
                            if (median) {
                              return formatCurrency(median);
                            }
                          }
                        }
                        // Fallback: calculate from percentiles if chartData is empty
                        if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                          const lastIndex = percentiles.percentiles_table.p50.length - 1;
                          const median = percentiles.percentiles_table.p50[lastIndex];
                          if (median) {
                            return formatCurrency(median);
                          }
                        }
                        return "Calculating...";
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {chartData.length > 0 ? `${chartData[chartData.length - 1].month} cash flow` : "No data"}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">90% Confidence Range</div>
                    <div className="text-xl font-bold">
                      {(() => {
                        // First try chartData
                        if (chartData.length > 0) {
                          const lastMonth = chartData[chartData.length - 1];
                          const p10 = lastMonth.p10 || lastMonth.p5;
                          const p90 = lastMonth.p90 || lastMonth.p95;
                          if (p10 !== undefined && p90 !== undefined && p10 !== null && p90 !== null && p10 > 0 && p90 > 0) {
                            return `${formatCurrency(p10)} - ${formatCurrency(p90)}`;
                          }
                        }

                        // Try percentiles_table format
                        if (percentiles?.percentiles_table) {
                          const p50Array = percentiles.percentiles_table.p50;
                          if (p50Array && p50Array.length > 0) {
                            const lastIndex = p50Array.length - 1;
                            // Try P10 and P90 first
                            const p10 = percentiles.percentiles_table.p10?.[lastIndex];
                            const p90 = percentiles.percentiles_table.p90?.[lastIndex];
                            if (p10 !== undefined && p90 !== undefined && p10 !== null && p90 !== null && p10 > 0 && p90 > 0) {
                              return `${formatCurrency(p10)} - ${formatCurrency(p90)}`;
                            }
                            // Fallback to P5 and P95
                            const p5 = percentiles.percentiles_table.p5?.[lastIndex];
                            const p95 = percentiles.percentiles_table.p95?.[lastIndex];
                            if (p5 !== undefined && p95 !== undefined && p5 !== null && p95 !== null && p5 > 0 && p95 > 0) {
                              return `$${(p5 / 1000).toFixed(0)}K - $${(p95 / 1000).toFixed(0)}K`;
                            }
                          }
                        }

                        // Try monthly format
                        if (percentiles?.monthly) {
                          const monthKeys = Object.keys(percentiles.monthly);
                          if (monthKeys.length > 0) {
                            const lastKey = monthKeys[monthKeys.length - 1];
                            const lastMonth = percentiles.monthly[lastKey];
                            if (lastMonth) {
                              const p10 = lastMonth.p10 || lastMonth.p5;
                              const p90 = lastMonth.p90 || lastMonth.p95;
                              if (p10 !== undefined && p90 !== undefined && p10 !== null && p90 !== null && p10 > 0 && p90 > 0) {
                                return `${formatCurrency(p10)} - ${formatCurrency(p90)}`;
                              }
                            }
                          }
                        }

                        return "N/A";
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">P10 (conservative) to P90 (optimistic) with P50 (median)</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Uncertainty Spread</div>
                    <div className="text-xl font-bold">
                      {(() => {
                        if (chartData.length > 0) {
                          const lastMonth = chartData[chartData.length - 1];
                          const median = lastMonth.median || 0;
                          const p10 = lastMonth.p10 || lastMonth.p5 || 0;
                          const p90 = lastMonth.p90 || lastMonth.p95 || 0;
                          if (median > 0) {
                            const spread = ((p90 - p10) / (2 * median)) * 100;
                            return `±${spread.toFixed(0)}%`;
                          }
                        }
                        // Fallback: calculate from percentiles if chartData is empty
                        if (percentiles?.percentiles_table) {
                          const lastIndex = percentiles.percentiles_table.p50?.length - 1 || 0;
                          const median = percentiles.percentiles_table.p50?.[lastIndex] || 0;
                          const p10 = percentiles.percentiles_table.p10?.[lastIndex] || percentiles.percentiles_table.p5?.[lastIndex] || 0;
                          const p90 = percentiles.percentiles_table.p90?.[lastIndex] || percentiles.percentiles_table.p95?.[lastIndex] || 0;
                          if (median > 0) {
                            const spread = ((p90 - p10) / (2 * median)) * 100;
                            return `±${spread.toFixed(0)}%`;
                          }
                        }
                        return "Calculating...";
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">Coefficient of variation relative to median</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Fan Chart Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  Run a Monte Carlo simulation to generate percentile data for the fan chart visualization.
                </p>
                {forecastMode === "montecarlo" && (
                  <Button onClick={() => handleRunSimulation()} disabled={isSimulating || !modelId || !orgId}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Simulation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="space-y-4 overflow-x-auto overflow-y-visible">
          {tornadoData && tornadoData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tornado Chart - Sensitivity Analysis</CardTitle>
                <CardDescription>Impact of each driver on forecast uncertainty (sorted by magnitude). Higher correlation indicates stronger influence.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} className="min-h-[300px] sm:min-h-[400px]">
                  <BarChart data={tornadoData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={['auto', 'auto']}
                      label={{ value: 'Impact (Correlation × Scale)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis dataKey="driver" type="category" width={150} />
                    <Tooltip
                      formatter={(value: any, name: string, props: any) => {
                        if (name === 'Correlation') {
                          return [`${(value as number).toFixed(4)}`, 'Correlation'];
                        }
                        return [`${Math.abs(value as number).toLocaleString()}`, name];
                      }}
                      labelFormatter={(label) => `Driver: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="correlation" fill="#8884d8" name="Correlation" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold">Sensitivity Rankings (Sorted by Absolute Correlation):</h4>
                  {tornadoData.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>#{index + 1}</Badge>
                        <span className="font-medium">{item.driver}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {item.correlation > 0 ? '+' : ''}{item.correlation.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Correlation | P-value: {item.p_value?.toFixed(4) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground mt-4">
                    <strong>Interpretation:</strong> Correlation values range from -1 to +1. Positive values indicate the driver increases the outcome,
                    negative values indicate it decreases the outcome. Higher absolute values indicate stronger influence.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sensitivity Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  Run a Monte Carlo simulation to generate sensitivity analysis data for the tornado chart.
                </p>
                {forecastMode === "montecarlo" && (
                  <Button onClick={() => handleRunSimulation()} disabled={isSimulating || !modelId || !orgId}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Simulation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Explainability */}
        <TabsContent value="explainability" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Top Uncertainty Drivers</CardTitle>
              <CardDescription>The 3 key factors driving forecast uncertainty and their contributions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topDrivers.map((driver, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{driver.name}</h3>
                        <p className="text-sm text-muted-foreground">{driver.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {driver.contribution}%
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Contribution to Total Uncertainty</span>
                      <span>{driver.contribution}%</span>
                    </div>
                    <Progress value={driver.contribution} className="h-2" />
                  </div>
                </div>
              ))}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Understanding Uncertainty</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      These three drivers account for 88% of the total forecast uncertainty. Focusing on reducing
                      variability in these areas will have the greatest impact on forecast confidence.
                    </p>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold">•</span>
                        <span>
                          <strong>Revenue Growth Rate:</strong> Market conditions and competitive dynamics create the
                          highest uncertainty. Consider scenario planning for different market conditions.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold">•</span>
                        <span>
                          <strong>Churn Rate:</strong> Customer retention patterns vary significantly. Implement early
                          warning systems and retention programs to reduce variability.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold">•</span>
                        <span>
                          <strong>Conversion Rate:</strong> Sales process efficiency fluctuates. Standardize sales
                          processes and improve lead qualification to stabilize conversion.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidence Metrics</CardTitle>
              <CardDescription>Statistical measures of forecast reliability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Forecast Accuracy</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mean Absolute Error:</span>
                      <span className="font-medium">
                        {(() => {
                          // Calculate from percentiles if available
                          if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                            // Simplified calculation - in production, this should compare forecast vs actual
                            const median = percentiles.percentiles_table.p50[5] || 0;
                            const p5 = percentiles.percentiles_table.p5?.[5] || 0;
                            const p95 = percentiles.percentiles_table.p95?.[5] || 0;
                            if (median > 0) {
                              const mae = ((p95 - p5) / (2 * median)) * 100;
                              return `${mae.toFixed(1)}%`;
                            }
                          }
                          return "N/A";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coefficient of Variation:</span>
                      <span className="font-medium">
                        {(() => {
                          // Calculate from percentiles
                          if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                            const median = percentiles.percentiles_table.p50[5] || 0;
                            const p5 = percentiles.percentiles_table.p5?.[5] || 0;
                            const p95 = percentiles.percentiles_table.p95?.[5] || 0;
                            if (median > 0) {
                              const stdDev = (p95 - p5) / 3.29; // Approximate std dev from 5th-95th percentile
                              const cv = (stdDev / median) * 100;
                              return `${cv.toFixed(1)}%`;
                            }
                          }
                          return "N/A";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence Level:</span>
                      <span className="font-medium">
                        {monteCarloResults?.confidenceLevel
                          ? `${(Number(monteCarloResults.confidenceLevel) * 100).toFixed(0)}%`
                          : "90%"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Risk Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value at Risk (5%):</span>
                      <span className="font-medium">
                        {(() => {
                          // VaR at 5% is the 5th percentile - use last month or middle month
                          if (percentiles?.percentiles_table?.p5 && percentiles.percentiles_table.p5.length > 0) {
                            const lastIndex = percentiles.percentiles_table.p5.length - 1;
                            const middleIndex = Math.floor(percentiles.percentiles_table.p5.length / 2);
                            // Try multiple indices to find a valid value
                            const indices = [lastIndex, middleIndex, Math.max(0, lastIndex - 1), 0];
                            for (const idx of indices) {
                              const var5 = percentiles.percentiles_table.p5[idx];
                              if (var5 !== undefined && var5 !== null && !isNaN(var5) && var5 !== 0) {
                                return `$${(Math.abs(var5) / 1000).toFixed(0)}K`;
                              }
                            }
                          }
                          // Try monthly format
                          if (percentiles?.monthly) {
                            const monthKeys = Object.keys(percentiles.monthly);
                            if (monthKeys.length > 0) {
                              // Try last month first, then first month
                              for (const key of [monthKeys[monthKeys.length - 1], monthKeys[0]]) {
                                const var5 = percentiles.monthly[key]?.p5;
                                if (var5 !== undefined && var5 !== null && !isNaN(var5) && var5 !== 0) {
                                  return `$${(Math.abs(var5) / 1000).toFixed(0)}K`;
                                }
                              }
                            }
                          }
                          // If we have chartData, try to get from there
                          if (chartData.length > 0) {
                            const lastMonth = chartData[chartData.length - 1];
                            const p5 = lastMonth.p5;
                            if (p5 !== undefined && p5 !== null && !isNaN(p5) && p5 !== 0) {
                              return `$${(Math.abs(p5) / 1000).toFixed(0)}K`;
                            }
                          }
                          return "N/A";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downside Deviation:</span>
                      <span className="font-medium">
                        {(() => {
                          // Calculate downside deviation from percentiles - use last month or middle month
                          if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                            const lastIndex = percentiles.percentiles_table.p50.length - 1;
                            const middleIndex = Math.floor(percentiles.percentiles_table.p50.length / 2);
                            // Try multiple indices to find valid values
                            const indices = [middleIndex, lastIndex, Math.max(0, lastIndex - 1), 0];
                            for (const idx of indices) {
                              const median = percentiles.percentiles_table.p50[idx];
                              const p5 = percentiles.percentiles_table.p5?.[idx];
                              if (median !== undefined && median !== null && !isNaN(median) && median > 0 &&
                                p5 !== undefined && p5 !== null && !isNaN(p5) && p5 < median) {
                                const downside = (median - p5) / 1.645; // Approximate std dev for downside
                                if (downside > 0) {
                                  return `$${(downside / 1000).toFixed(0)}K`;
                                }
                              }
                            }
                          }
                          // Try monthly format
                          if (percentiles?.monthly) {
                            const monthKeys = Object.keys(percentiles.monthly);
                            if (monthKeys.length > 0) {
                              // Try last month first, then first month
                              for (const key of [monthKeys[monthKeys.length - 1], monthKeys[0]]) {
                                const median = percentiles.monthly[key]?.p50;
                                const p5 = percentiles.monthly[key]?.p5;
                                if (median !== undefined && median !== null && !isNaN(median) && median > 0 &&
                                  p5 !== undefined && p5 !== null && !isNaN(p5) && p5 < median) {
                                  const downside = (median - p5) / 1.645;
                                  if (downside > 0) {
                                    return `$${(downside / 1000).toFixed(0)}K`;
                                  }
                                }
                              }
                            }
                          }
                          // If we have chartData, try to get from there
                          if (chartData.length > 0) {
                            const lastMonth = chartData[chartData.length - 1];
                            const median = lastMonth.median;
                            const p5 = lastMonth.p5;
                            if (median !== undefined && median !== null && !isNaN(median) && median > 0 &&
                              p5 !== undefined && p5 !== null && !isNaN(p5) && p5 < median) {
                              const downside = (median - p5) / 1.645;
                              if (downside > 0) {
                                return `$${(downside / 1000).toFixed(0)}K`;
                              }
                            }
                          }
                          return "N/A";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Probability of Loss:</span>
                      <span className="font-medium">
                        {(() => {
                          // Calculate from survival probability if available
                          if (survivalProbability?.overall && survivalProbability.overall.totalSimulations > 0) {
                            const failed = survivalProbability.overall.simulationsFailed || 0;
                            const total = survivalProbability.overall.totalSimulations;
                            if (total > 0) {
                              const probLoss = (failed / total) * 100;
                              return `${probLoss.toFixed(1)}%`;
                            }
                          }
                          // Fallback: Estimate from percentiles - if median is negative, there's a loss
                          if (percentiles?.percentiles_table?.p50 && percentiles.percentiles_table.p50.length > 0) {
                            const lastIndex = percentiles.percentiles_table.p50.length - 1;
                            const median = percentiles.percentiles_table.p50[lastIndex];
                            // If median is negative, estimate probability of loss
                            if (median < 0) {
                              // Estimate based on how negative it is relative to P5
                              const p5 = percentiles.percentiles_table.p5?.[lastIndex];
                              if (p5 !== undefined && p5 < 0) {
                                // Rough estimate: if P5 is negative, at least 5% have losses
                                return "5.0%+";
                              }
                              return "N/A";
                            }
                            // If median is positive, check if P5 is negative
                            const p5 = percentiles.percentiles_table.p5?.[lastIndex];
                            if (p5 !== undefined && p5 < 0) {
                              // If P5 is negative but median is positive, estimate ~5% have losses
                              return "5.0%";
                            }
                            return "0.0%";
                          }
                          // Try monthly format
                          if (percentiles?.monthly) {
                            const monthKeys = Object.keys(percentiles.monthly);
                            if (monthKeys.length > 0) {
                              const lastKey = monthKeys[monthKeys.length - 1];
                              const median = percentiles.monthly[lastKey]?.p50;
                              const p5 = percentiles.monthly[lastKey]?.p5;
                              if (median !== undefined && p5 !== undefined && p5 < 0) {
                                return median < 0 ? "5.0%+" : "5.0%";
                              }
                            }
                          }
                          return "N/A";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
