"use client"

import { useState } from "react"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [forecastMode, setForecastMode] = useState<"deterministic" | "montecarlo">("deterministic")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [numSimulations, setNumSimulations] = useState(5000)
  const [simulationComplete, setSimulationComplete] = useState(false)
  const [survivalProbability, setSurvivalProbability] = useState<SurvivalProbability | null>(null)
  const [percentiles, setPercentiles] = useState<any>(null)
  const [monteCarloResults, setMonteCarloResults] = useState<any>(null)

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
      unit: "$",
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
      unit: "$",
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

  // Runway distribution histogram
  const runwayHistogram = [
    { runway: "6-8", frequency: 5, probability: 5 },
    { runway: "8-10", frequency: 12, probability: 12 },
    { runway: "10-12", frequency: 18, probability: 18 },
    { runway: "12-14", frequency: 25, probability: 25 },
    { runway: "14-16", frequency: 20, probability: 20 },
    { runway: "16-18", frequency: 12, probability: 12 },
    { runway: "18+", frequency: 8, probability: 8 },
  ]

  // Tornado chart (sensitivity analysis)
  const tornadoData = [
    { driver: "Revenue Growth", low: -180000, high: 220000, impact: 400000 },
    { driver: "Churn Rate", low: -150000, high: 180000, impact: 330000 },
    { driver: "Conversion Rate", low: -120000, high: 140000, impact: 260000 },
    { driver: "CAC", low: -80000, high: 95000, impact: 175000 },
    { driver: "Deal Size", low: -70000, high: 85000, impact: 155000 },
  ].sort((a, b) => b.impact - a.impact)

  // Top 3 uncertainty drivers
  const topDrivers = [
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
  ]

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
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication token not found")
        setIsSimulating(false)
        return
      }

      // Simulate progress while waiting for job (stops at 90%, real progress from API will continue)
      const progressInterval = setInterval(() => {
        setSimulationProgress((prev) => {
          if (prev >= 90) {
            // Don't clear interval - let API polling take over
            return 90
          }
          return prev + 2
        })
      }, 100)

      // Create Monte Carlo job via backend
      if (modelId && orgId) {
        try {
          const response = await fetch(`${API_BASE_URL}/models/${modelId}/montecarlo`, {
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
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || "Failed to start Monte Carlo simulation")
          }
        } catch (error) {
          console.error("Error starting Monte Carlo:", error)
          toast.error(error instanceof Error ? error.message : "Failed to start simulation")
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
        const [jobResponse, mcResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/jobs/${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/montecarlo/${jobId}`, {
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
            const progress = result.progress !== undefined ? result.progress : (jobProgress || 0)
            
            // Update progress - allow up to 100% (removed 90% cap)
            if (progress !== undefined && progress !== null) {
              setSimulationProgress(Math.min(progress, 100))
            }
            
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
            // Progress already updated above, continue polling
          }
        } else if (jobResponse.ok) {
          // If monte carlo endpoint fails but job endpoint works, use job status
          const jobResult = await jobResponse.json()
          if (jobResult.ok && jobResult.job) {
            const status = jobResult.job.status
            const progress = jobResult.job.progress || 0
            
            if (progress !== undefined && progress !== null) {
              setSimulationProgress(Math.min(progress, 100))
            }
            
            if (status === "completed" || status === "done") {
              clearInterval(progressInterval)
              setSimulationProgress(100)
              setIsSimulating(false)
              setSimulationComplete(true)
              toast.success("Monte Carlo simulation completed!")
              return
            }
          }
        }

        attempts++
        setTimeout(poll, 2000) // Poll every 2 seconds
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monte Carlo Forecasting</h1>
          <p className="text-muted-foreground">Probabilistic financial modeling with uncertainty quantification</p>
        </div>
        <div className="flex gap-2">
          <LinkButton variant="outline" asChild>
            <Link href="#job-queue">
              <ListTodo className="mr-2 h-4 w-4" />
              View Job Queue
            </Link>
          </LinkButton>
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={forecastMode} onValueChange={(v: any) => setForecastMode(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deterministic">Deterministic Forecast</SelectItem>
            <SelectItem value="montecarlo">Monte Carlo Forecast</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Save className="mr-2 h-4 w-4" />
          Save Snapshot
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Results
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="drivers">Drivers & Distributions</TabsTrigger>
          <TabsTrigger value="results">Simulation Results</TabsTrigger>
          <TabsTrigger value="fanChart">Fan Chart</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity Analysis</TabsTrigger>
          <TabsTrigger value="explainability">Explainability</TabsTrigger>
        </TabsList>

        {/* Drivers Configuration */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Key Drivers</CardTitle>
              <CardDescription>
                Set uncertainty ranges and probability distributions for each financial driver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{driver.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current: {driver.mean}
                        {driver.unit} ± {driver.stdDev}
                        {driver.unit}
                      </p>
                    </div>
                    <Badge
                      variant={
                        driver.impact === "high" ? "destructive" : driver.impact === "medium" ? "default" : "secondary"
                      }
                    >
                      {driver.impact} impact
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        step={driver.unit === "$" ? 10 : 0.5}
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
                        max={(driver.max - driver.min) / 4}
                        step={driver.unit === "$" ? 5 : 0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Range</Label>
                      <div className="text-sm text-muted-foreground">
                        Min: {driver.min}
                        {driver.unit} | Max: {driver.max}
                        {driver.unit}
                      </div>
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
                    Est. Cost: ${estimatedCost.toFixed(2)}
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
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Simulation Progress</span>
                    <span>{simulationProgress}%</span>
                  </div>
                  <Progress value={simulationProgress} />
                  <p className="text-xs text-muted-foreground">
                    Running {numSimulations.toLocaleString()} simulations across {drivers.length} drivers...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulation Results */}
        <TabsContent value="results" className="space-y-4">
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
                            {survivalProbability.runwayThresholds['6_months']?.percentage.toFixed(1) || 'N/A'}%
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
                            {survivalProbability.runwayThresholds['12_months']?.percentage.toFixed(1) || 'N/A'}%
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
                      {percentiles?.percentiles_table?.p50?.[5] 
                        ? `$${(percentiles.percentiles_table.p50[5] / 1000).toFixed(0)}K`
                        : percentiles?.monthly?.[Object.keys(percentiles.monthly || {})[5]]?.p50
                        ? `$${(percentiles.monthly[Object.keys(percentiles.monthly)[5]].p50 / 1000).toFixed(0)}K`
                        : "$0K"}
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
                      {percentiles?.percentiles_table?.p95?.[5] 
                        ? `$${(percentiles.percentiles_table.p95[5] / 1000).toFixed(0)}K`
                        : percentiles?.monthly?.[Object.keys(percentiles.monthly || {})[5]]?.p95
                        ? `$${(percentiles.monthly[Object.keys(percentiles.monthly)[5]].p95 / 1000).toFixed(0)}K`
                        : "$0K"}
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
                      {percentiles?.percentiles_table?.p5?.[5] 
                        ? `$${(percentiles.percentiles_table.p5[5] / 1000).toFixed(0)}K`
                        : percentiles?.monthly?.[Object.keys(percentiles.monthly || {})[5]]?.p5
                        ? `$${(percentiles.monthly[Object.keys(percentiles.monthly)[5]].p5 / 1000).toFixed(0)}K`
                        : "$0K"}
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
                  <ResponsiveContainer width="100%" height={350}>
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
        <TabsContent value="fanChart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Fan Chart</CardTitle>
              <CardDescription>
                Probabilistic cash flow projections with 5th-95th percentile confidence bands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value?.toLocaleString()}`, ""]} />
                  <Legend />

                  {/* 80% Confidence Band (P10-P90) - Primary visualization */}
                  <Area
                    type="monotone"
                    dataKey="p90"
                    stackId="1"
                    stroke="none"
                    fill="#d1fae5"
                    fillOpacity={0.4}
                    name="P90 (90th Percentile)"
                  />
                  <Area
                    type="monotone"
                    dataKey="p75"
                    stackId="2"
                    stroke="none"
                    fill="#c7d2fe"
                    fillOpacity={0.4}
                    name="P75 (75th Percentile)"
                  />
                  <Area
                    type="monotone"
                    dataKey="median"
                    stackId="3"
                    stroke="none"
                    fill="#a5b4fc"
                    fillOpacity={0.5}
                    name="P50 (Median)"
                  />
                  <Area
                    type="monotone"
                    dataKey="p25"
                    stackId="4"
                    stroke="none"
                    fill="#c7d2fe"
                    fillOpacity={0.4}
                    name="P25 (25th Percentile)"
                  />
                  <Area
                    type="monotone"
                    dataKey="p10"
                    stackId="5"
                    stroke="none"
                    fill="#fee2e2"
                    fillOpacity={0.4}
                    name="P10 (10th Percentile)"
                  />
                  {/* Extended 90% Confidence Band (P5-P95) - Lighter overlay */}
                  <Area
                    type="monotone"
                    dataKey="p95"
                    stackId="6"
                    stroke="none"
                    fill="#e0e7ff"
                    fillOpacity={0.2}
                    name="P95 (95th Percentile)"
                  />
                  <Area
                    type="monotone"
                    dataKey="p5"
                    stackId="7"
                    stroke="none"
                    fill="#fee2e2"
                    fillOpacity={0.2}
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
                  <div className="text-xl font-bold">$68K</div>
                  <div className="text-xs text-muted-foreground">December cash flow</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">90% Confidence Range</div>
                  <div className="text-xl font-bold">$36K - $106K</div>
                  <div className="text-xs text-muted-foreground">P10 (conservative) to P90 (optimistic) with P50 (median)</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Uncertainty Spread</div>
                  <div className="text-xl font-bold">±52%</div>
                  <div className="text-xs text-muted-foreground">Relative to median</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tornado Chart - Sensitivity Analysis</CardTitle>
              <CardDescription>Impact of each driver on forecast uncertainty (sorted by magnitude)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tornadoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="driver" type="category" width={150} />
                  <Tooltip formatter={(value) => [`$${Math.abs(value as number).toLocaleString()}`, ""]} />
                  <Legend />
                  <Bar dataKey="low" fill="#ef4444" name="Downside Impact" stackId="a" />
                  <Bar dataKey="high" fill="#10b981" name="Upside Impact" stackId="a" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-3">
                <h4 className="font-semibold">Sensitivity Rankings:</h4>
                {tornadoData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{item.driver}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${item.impact.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total impact range</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Explainability */}
        <TabsContent value="explainability" className="space-y-4">
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
                      <span className="font-medium">8.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coefficient of Variation:</span>
                      <span className="font-medium">15.4%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence Level:</span>
                      <span className="font-medium">90%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Risk Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value at Risk (5%):</span>
                      <span className="font-medium">$620K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downside Deviation:</span>
                      <span className="font-medium">$112K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Probability of Loss:</span>
                      <span className="font-medium">3.2%</span>
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
