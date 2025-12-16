"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { VirtualizedTable } from "@/components/ui/virtualized-table"
import { useChartPagination } from "@/hooks/use-chart-pagination"
import { Download, Upload, Zap, TrendingUp, Calculator, Brain, Save, SearchIcon, Loader2, AlertCircle, Play, FileDown, FileText } from "lucide-react"
import { toast } from "sonner"
import { ProvenanceDrawer } from "./provenance-drawer"
import { ProvenanceSearch } from "./provenance-search"
import { ModelVersionRollback } from "./model-version-rollback"
import { CSVImportWizard } from "./csv-import-wizard"
import { ExcelImportWizard } from "./excel-import-wizard"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { generateFinancialModelingTemplate, downloadCSV } from "@/utils/csv-template-generator"
import { OneClickExportButton } from "./one-click-export-button"
import { API_BASE_URL } from "@/lib/api-config"

const defaultFinancialData = [
  {
    month: "Jan 2024",
    revenue: 45000,
    cogs: 13500,
    grossProfit: 31500,
    opex: 28000,
    netIncome: 3500,
    cashFlow: 8500,
  },
  {
    month: "Feb 2024",
    revenue: 52000,
    cogs: 15600,
    grossProfit: 36400,
    opex: 30000,
    netIncome: 6400,
    cashFlow: 11400,
  },
  {
    month: "Mar 2024",
    revenue: 48000,
    cogs: 14400,
    grossProfit: 33600,
    opex: 32000,
    netIncome: 1600,
    cashFlow: 6600,
  },
  {
    month: "Apr 2024",
    revenue: 61000,
    cogs: 18300,
    grossProfit: 42700,
    opex: 35000,
    netIncome: 7700,
    cashFlow: 12700,
  },
  {
    month: "May 2024",
    revenue: 55000,
    cogs: 16500,
    grossProfit: 38500,
    opex: 37000,
    netIncome: 1500,
    cashFlow: 6500,
  },
  {
    month: "Jun 2024",
    revenue: 67000,
    cogs: 20100,
    grossProfit: 46900,
    opex: 39000,
    netIncome: 7900,
    cashFlow: 12900,
  },
]

// Default assumptions - only used as fallback when no model data exists
const defaultAssumptions = [
  { category: "Revenue", key: "baselineRevenue", item: "Baseline Monthly Revenue", value: "100000", type: "currency" },
  { category: "Revenue", key: "revenueGrowth", item: "Monthly Revenue Growth Rate", value: "0.08", type: "percentage" },
  { category: "Revenue", key: "churnRate", item: "Monthly Churn Rate", value: "0.05", type: "percentage" },
  { category: "Revenue", key: "cac", item: "Customer Acquisition Cost (CAC)", value: "125", type: "currency" },
  { category: "Revenue", key: "ltv", item: "Customer Lifetime Value (LTV)", value: "2400", type: "currency" },
  { category: "Costs", key: "baselineExpenses", item: "Baseline Monthly Expenses", value: "80000", type: "currency" },
  { category: "Costs", key: "expenseGrowth", item: "Monthly Expense Growth Rate", value: "0.05", type: "percentage" },
  { category: "Costs", key: "cogsPercentage", item: "COGS % of Revenue", value: "0.20", type: "percentage" },
  { category: "Costs", key: "initialCash", item: "Initial Cash Balance", value: "500000", type: "currency" },
]

// Transactions are now fetched from the backend API

interface Model {
  id: string
  name: string
  type: string
  orgId: string
  createdAt: string
}

interface ModelRun {
  id: string
  modelId: string
  status: string
  summaryJson: any
  createdAt: string
  finishedAt?: string
}

export function FinancialModeling() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [modelRuns, setModelRuns] = useState<ModelRun[]>([])
  const [currentRun, setCurrentRun] = useState<ModelRun | null>(null)
  const [currentModel, setCurrentModel] = useState<Model | null>(null)
  const [financialData, setFinancialData] = useState<any[]>([])
  const [modelAssumptions, setModelAssumptions] = useState<any[]>([])
  const [projections, setProjections] = useState<any>(null)
  const [sensitivityData, setSensitivityData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [runningModel, setRunningModel] = useState(false)
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false)
  const [selectedCellData, setSelectedCellData] = useState<any>(null)
  const [showTransactions, setShowTransactions] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showCreateModelDialog, setShowCreateModelDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [newModelName, setNewModelName] = useState("")
  const [newModelDescription, setNewModelDescription] = useState("")
  const [newModelDuration, setNewModelDuration] = useState<string>("12")
  const [newModelIndustry, setNewModelIndustry] = useState<string>("technology")
  const [newModelRevenueType, setNewModelRevenueType] = useState<string>("hybrid")
  const [newModelStartDate, setNewModelStartDate] = useState<string>(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [creatingModel, setCreatingModel] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [assumptionEdits, setAssumptionEdits] = useState<Record<string, string>>({})
  const [savingAssumptions, setSavingAssumptions] = useState(false)

  const { chartData: paginatedChartData, hasMore, loadMore, initializeData } = useChartPagination({
    defaultMonths: 36,
    onLoadMore: async (startDate, endDate) => {
      return financialData.filter((item) => {
        const itemDate = new Date(item.month)
        return itemDate >= startDate && itemDate < endDate
      })
    },
  })

  useEffect(() => {
    fetchOrgIdAndModels()
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchTransactions()
    }
  }, [orgId])

  // Listen for CSV import completion to refresh all data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`CSV import completed! Refreshing data...`)
        
        // Refresh transactions
        await fetchTransactions()
        
        // Refresh models and runs
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]
        
        if (token && orgId) {
          // Refresh models list
          await fetchOrgIdAndModels()
          
          // If a model is selected, refresh its runs
          if (selectedModel) {
            await fetchModelRuns(orgId, selectedModel, token)
            await fetchModelDetails(orgId, selectedModel, token)
          }
        }
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
    }
  }, [orgId, selectedModel])

  useEffect(() => {
    if (financialData.length > 0) {
      initializeData(financialData)
    }
  }, [financialData, initializeData])

  const fetchOrgId = async (): Promise<string | null> => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) return storedOrgId

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return null

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
          return primaryOrgId
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchTransactions = async () => {
    if (!orgId) return

    setLoadingTransactions(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/transactions?limit=10000`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.transactions) {
          setTransactions(result.transactions)
        }
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchOrgIdAndModels = async () => {
    setLoading(true)
    setError(null)

    try {
      const currentOrgId = await fetchOrgId()
      if (!currentOrgId) {
        throw new Error("Organization ID not found. Please ensure you're logged in.")
      }

      setOrgId(currentOrgId)

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found. Please log in.")
      }

      // Fetch models
      const modelsResponse = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!modelsResponse.ok) {
        throw new Error(`Failed to fetch models: ${modelsResponse.statusText}`)
      }

      const modelsResult = await modelsResponse.json()
      if (modelsResult.ok && modelsResult.models) {
        setModels(modelsResult.models)
        if (modelsResult.models.length > 0) {
          const firstModel = modelsResult.models[0]
          setSelectedModel(firstModel.id)
          setCurrentModel(firstModel)
          await fetchModelRuns(currentOrgId, firstModel.id, token)
          await fetchModelDetails(currentOrgId, firstModel.id, token)
        }
      } else {
        // No models yet, clear data
        setFinancialData([])
        setModelAssumptions([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load financial models"
      setError(errorMessage)
      toast.error(errorMessage)
      // Leave existing financialData untouched on error
    } finally {
      setLoading(false)
    }
  }

  const fetchModelRuns = async (orgId: string, modelId: string, token: string) => {
    try {
      // Get model runs for this model
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.runs) {
          const runs = result.runs
          setModelRuns(runs)
          
          // Get the latest completed run (or most recent run)
          const latestRun = runs.find((r: ModelRun) => r.status === "done") || runs[0]
          if (latestRun) {
            setCurrentRun(latestRun)
            await fetchModelRunDetails(orgId, modelId, latestRun.id, token)
          } else {
            // No completed runs yet for this model
            setCurrentRun(null)
            setFinancialData([])
          }
          // Always fetch model details for assumptions/projections/sensitivity
          await fetchModelDetails(orgId, modelId, token)
        } else {
          // No runs yet for this model; clear run-specific state so UI shows correct "no data" message
          setModelRuns([])
          setCurrentRun(null)
          setFinancialData([])
          await fetchModelDetails(orgId, modelId, token)
        }
      } else {
        // Request failed; do not overwrite existing data
      }
    } catch (error) {
      console.error("Failed to fetch model runs:", error)
      // Leave existing data as-is on error
    }
  }

  const fetchModelRunDetails = async (orgId: string, modelId: string, runId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/runs/${runId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.run) {
          const run = result.run
          setCurrentRun(run)
          
          // Extract financial data from summaryJson
          if (run.summaryJson) {
            // summaryJson can be stored as JSONB or accidentally as a JSON-string; normalize to object.
            const summary =
              typeof run.summaryJson === "string"
                ? (() => {
                    try {
                      return JSON.parse(run.summaryJson)
                    } catch {
                      return {}
                    }
                  })()
                : run.summaryJson
            const monthlyData: any[] = []

            // Extract monthly data from summary
            const monthly = summary?.monthly || summary?.fullResult?.monthly
            if (monthly && typeof monthly === "object") {
              Object.keys(monthly).sort().forEach((monthKey) => {
                const monthData = monthly[monthKey]
                monthlyData.push({
                  month: formatMonth(monthKey),
                  monthKey: monthKey, // Store original YYYY-MM format for cell key construction
                  revenue: Number(monthData.revenue || monthData.mrr || 0),
                  cogs: Number(monthData.cogs || 0),
                  grossProfit: Number(monthData.grossProfit || (monthData.revenue - monthData.cogs) || 0),
                  opex: Number(monthData.opex || monthData.expenses || 0),
                  netIncome: Number(monthData.netIncome || (monthData.revenue - monthData.cogs - monthData.opex) || 0),
                  cashFlow: Number(monthData.cashFlow || monthData.netIncome || 0),
                })
              })
            }

            if (monthlyData.length > 0) {
              setFinancialData(monthlyData)
            } else {
              // Don't blank the UI while a new run is still queued/running.
              // Only clear if a completed run truly has no monthly series.
              if (run.status === "done") {
                setFinancialData([])
              }
            }
          } else {
            // No summary data; keep existing financialData
          }
        } else {
          // Invalid response; keep existing financialData
        }
      } else {
        // Request failed; keep existing financialData
      }
    } catch (error) {
      console.error("Failed to fetch model run details:", error)
      // Keep existing financialData on error
    }
  }

  const fetchModelDetails = async (orgId: string, modelId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.model) {
          const model = result.model
          setCurrentModel(model)
          
          // Extract assumptions from modelJson
          if (model.modelJson && model.modelJson.assumptions) {
            // Keep a focused, editable set of key assumptions (these flow into the Python worker model).
            const a: any = model.modelJson.assumptions
            const toNum = (v: any, fallback: number) => {
              const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN
              return Number.isFinite(n) ? n : fallback
            }

            const normalized = {
              baselineRevenue: toNum(a.baselineRevenue ?? a.revenue?.baselineRevenue, 100000),
              revenueGrowth: toNum(a.revenueGrowth ?? a.revenue?.revenueGrowth, 0.08),
              churnRate: toNum(a.churnRate ?? a.revenue?.churnRate, 0.05),
              baselineExpenses: toNum(a.baselineExpenses ?? a.costs?.baselineExpenses, 80000),
              expenseGrowth: toNum(a.expenseGrowth ?? a.costs?.expenseGrowth, 0.05),
              cogsPercentage: toNum(a.cogsPercentage ?? a.costs?.cogsPercentage, 0.2),
              initialCash: toNum(a.initialCash ?? a.cash?.initialCash, 500000),
              cac: toNum(a.cac, 125),
              ltv: toNum(a.ltv, 2400),
            }

            const extractedAssumptions: any[] = [
              { category: "Revenue", key: "baselineRevenue", item: "Baseline Monthly Revenue", value: String(normalized.baselineRevenue), type: "currency" },
              { category: "Revenue", key: "revenueGrowth", item: "Monthly Revenue Growth Rate", value: String(normalized.revenueGrowth), type: "percentage" },
              { category: "Revenue", key: "churnRate", item: "Monthly Churn Rate", value: String(normalized.churnRate), type: "percentage" },
              { category: "Revenue", key: "cac", item: "Customer Acquisition Cost (CAC)", value: String(normalized.cac), type: "currency" },
              { category: "Revenue", key: "ltv", item: "Customer Lifetime Value (LTV)", value: String(normalized.ltv), type: "currency" },
              { category: "Costs", key: "baselineExpenses", item: "Baseline Monthly Expenses", value: String(normalized.baselineExpenses), type: "currency" },
              { category: "Costs", key: "expenseGrowth", item: "Monthly Expense Growth Rate", value: String(normalized.expenseGrowth), type: "percentage" },
              { category: "Costs", key: "cogsPercentage", item: "COGS % of Revenue", value: String(normalized.cogsPercentage), type: "percentage" },
              { category: "Costs", key: "initialCash", item: "Initial Cash Balance", value: String(normalized.initialCash), type: "currency" },
            ]

            setModelAssumptions(extractedAssumptions)
            setAssumptionEdits(Object.fromEntries(extractedAssumptions.map((x) => [x.key, x.value])))
          } else {
            setModelAssumptions([])
            setAssumptionEdits({})
          }
          
          // Extract projections from modelJson
          if (model.modelJson && model.modelJson.projections) {
            setProjections(model.modelJson.projections)
          } else if (currentRun && currentRun.summaryJson) {
            // Generate projections from summary
            const summary = currentRun.summaryJson as any
            const monthlyRevenue = summary.revenue || summary.mrr || 0
            const arr = monthlyRevenue * 12
            const growthRate = summary.growthRate || 0.08
            const projectedArr = arr * Math.pow(1 + growthRate, 1)
            setProjections({
              projectedARR: projectedArr,
              totalBurn: summary.expenses * 12 || 0,
              runway: summary.runwayMonths || 0,
              growthRate: growthRate * 100,
            })
          }
          
          // Extract sensitivity data from modelJson or generate from assumptions
          if (model.modelJson && model.modelJson.sensitivity) {
            setSensitivityData(model.modelJson.sensitivity)
          } else {
            // Generate default sensitivity data
            const baseRevenue = currentRun?.summaryJson ? (currentRun.summaryJson as any).revenue || (currentRun.summaryJson as any).mrr || 0 : 0
            const baseARR = baseRevenue * 12
            setSensitivityData({
              revenueGrowth: {
                conservative: { rate: 0.05, arr: baseARR * 1.05 },
                base: { rate: 0.08, arr: baseARR * 1.08 },
                optimistic: { rate: 0.12, arr: baseARR * 1.12 },
              },
              churnRate: {
                low: { rate: 0.02, arr: baseARR * 1.1 },
                base: { rate: 0.05, arr: baseARR },
                high: { rate: 0.08, arr: baseARR * 0.9 },
              },
            })
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch model details:", error)
      setModelAssumptions([])
    }
  }

  const handleSaveAssumptions = async () => {
    if (!selectedModel || !orgId) {
      toast.error("Please select a model first")
      return
    }
    if (savingAssumptions) return

    const token = localStorage.getItem("auth-token") || document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (!token) {
      toast.error("Authentication token not found")
      return
    }

    const parseNum = (key: string, fallback: number) => {
      const raw = assumptionEdits[key]
      const n = raw === undefined ? NaN : Number(String(raw).replace(/[%$, ]/g, ""))
      return Number.isFinite(n) ? n : fallback
    }

    const assumptionsPayload = {
      // flat keys
      baselineRevenue: parseNum("baselineRevenue", 100000),
      revenueGrowth: parseNum("revenueGrowth", 0.08),
      churnRate: parseNum("churnRate", 0.05),
      baselineExpenses: parseNum("baselineExpenses", 80000),
      expenseGrowth: parseNum("expenseGrowth", 0.05),
      cogsPercentage: parseNum("cogsPercentage", 0.2),
      initialCash: parseNum("initialCash", 500000),
      cac: parseNum("cac", 125),
      ltv: parseNum("ltv", 2400),
      // structured mirrors
      revenue: {
        baselineRevenue: parseNum("baselineRevenue", 100000),
        revenueGrowth: parseNum("revenueGrowth", 0.08),
        churnRate: parseNum("churnRate", 0.05),
      },
      costs: {
        baselineExpenses: parseNum("baselineExpenses", 80000),
        expenseGrowth: parseNum("expenseGrowth", 0.05),
        cogsPercentage: parseNum("cogsPercentage", 0.2),
      },
      cash: {
        initialCash: parseNum("initialCash", 500000),
      },
    }

    setSavingAssumptions(true)
    try {
      const resp = await fetch(`${API_BASE_URL}/models/${selectedModel}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ assumptions: assumptionsPayload }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error?.message || err.message || "Failed to save assumptions")
      }

      const result = await resp.json()
      if (!result.ok) {
        throw new Error(result.error?.message || result.message || "Failed to save assumptions")
      }

      toast.success("Assumptions saved. Re-running model to apply changes...")
      await fetchModelDetails(orgId, selectedModel, token)
      await handleRunModel()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save assumptions"
      toast.error(msg)
    } finally {
      setSavingAssumptions(false)
    }
  }

  const formatMonth = (monthKey: string): string => {
    if (monthKey.match(/^[A-Z][a-z]{2} \d{4}$/)) return monthKey
    if (monthKey.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = monthKey.split("-")
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
    return monthKey
  }

  const handleRunModel = async () => {
    if (!selectedModel) {
      toast.error("Please select a model first")
      return
    }
    
    let currentOrgId = orgId
    if (!currentOrgId) {
      currentOrgId = await fetchOrgId()
      if (!currentOrgId) {
        toast.error("Organization ID not found. Please log in again.")
        return
      }
    }
    
    if (runningModel) {
      return
    }

    setRunningModel(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Get current model details to ensure we have the right model
      const modelResponse = await fetch(`${API_BASE_URL}/models/${selectedModel}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!modelResponse.ok) {
        throw new Error("Failed to fetch model details")
      }

      const modelResult = await modelResponse.json()
      if (!modelResult.ok || !modelResult.model) {
        throw new Error("Model not found or access denied")
      }

      toast.info(`Running model: ${modelResult.model.name}...`)

      // Create model run
      const response = await fetch(`${API_BASE_URL}/models/${selectedModel}/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          runType: "baseline",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || `Failed to run model: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Handle different response formats
      if (result.ok) {
        const jobId = result.jobId || result.modelRun?.jobId || result.job?.id
        const modelRunId = result.modelRun?.id
        
        if (jobId && currentOrgId && selectedModel) {
          toast.success("Model run started. Processing...")
          // Poll for completion
          await pollModelRunStatus(currentOrgId, selectedModel, jobId, token, modelRunId)
        } else if (result.modelRun && currentOrgId && selectedModel) {
          // If modelRun is created but no jobId, refresh runs
          toast.success("Model run created. Refreshing...")
          await fetchModelRuns(currentOrgId, selectedModel, token)
          await fetchModelDetails(currentOrgId, selectedModel, token)
        } else {
          throw new Error("Invalid response: no jobId or modelRun")
        }
      } else {
        throw new Error(result.error?.message || result.message || "Failed to run model")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to run model"
      toast.error(errorMessage)
    } finally {
      setRunningModel(false)
    }
  }

  const pollModelRunStatus = async (orgId: string, modelId: string, jobId: string, token: string, modelRunId?: string) => {
    const maxAttempts = 120 // 4 minutes max (120 * 2 seconds)
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.warning("Model run is taking longer than expected. It will continue processing in the background.")
        // Still refresh to show current status
        await fetchModelRuns(orgId, modelId, token)
        await fetchModelDetails(orgId, modelId, token)
        return
      }

      try {
        // Check job status
        const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (jobResponse.ok) {
          const jobResult = await jobResponse.json()
          if (jobResult.ok && jobResult.job) {
            const jobStatus = jobResult.job.status
            const progress = jobResult.job.progress || 0

            if (jobStatus === "done" || jobStatus === "completed") {
              toast.success("Model run completed successfully!")
              // Refresh all data
              await fetchModelRuns(orgId, modelId, token)
              await fetchModelDetails(orgId, modelId, token)
              return
            } else if (jobStatus === "failed") {
              toast.error("Model run failed. Please check the logs and try again.")
              await fetchModelRuns(orgId, modelId, token)
              return
            } else if (jobStatus === "cancelled") {
              toast.warning("Model run was cancelled.")
              await fetchModelRuns(orgId, modelId, token)
              return
            }
            
            // Still running - show progress if available
            if (progress > 0 && attempts % 10 === 0) {
              toast.info(`Model run in progress: ${Math.round(progress)}%`)
            }
          }
        }

        // Also check model run status directly if we have the ID
        if (modelRunId && attempts % 5 === 0) {
          try {
            const runResponse = await fetch(`${API_BASE_URL}/models/${modelId}/runs/${modelRunId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            })

            if (runResponse.ok) {
              const runResult = await runResponse.json()
              // Backend returns `{ ok: true, run: {...} }` (not `modelRun`)
              const runObj = runResult?.run || runResult?.modelRun
              if (runResult.ok && runObj) {
                const runStatus = runObj.status
                if (runStatus === "done") {
                  toast.success("Model run completed!")
                  await fetchModelRuns(orgId, modelId, token)
                  await fetchModelDetails(orgId, modelId, token)
                  return
                } else if (runStatus === "failed") {
                  toast.error("Model run failed.")
                  await fetchModelRuns(orgId, modelId, token)
                  return
                }
              }
            }
          } catch (runError) {
            // Ignore errors checking run status, continue polling job
            console.debug("Error checking run status:", runError)
          }
        }

        attempts++
        setTimeout(poll, 2000) // Poll every 2 seconds
      } catch (error) {
        console.error("Error polling model run status:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          toast.error("Error checking model run status. Please refresh the page.")
        }
      }
    }

    poll()
  }

  const handleCreateModel = async () => {
    if (!newModelName.trim() || !orgId || creatingModel) return

    setCreatingModel(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }
      const authToken: string = token

      // Prepare request body with comprehensive industrial standard fields
      const requestBody = {
        model_name: newModelName.trim(),
        industry: newModelIndustry,
        revenue_model_type: newModelRevenueType as any,
        forecast_duration: parseInt(newModelDuration) as any,
        data_source_type: "blank" as const,
        description: newModelDescription.trim() || undefined,
        start_month: newModelStartDate, // YYYY-MM
        base_currency: "USD", // Can be made configurable if needed
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Failed to create model")
      }

      const result = await response.json()
      
      if (result.ok && result.model) {
        toast.success("Model created successfully")
        setShowCreateModelDialog(false)
        setNewModelName("")
        setNewModelDescription("")
        // Refresh models list
        await fetchOrgIdAndModels()
        // Select the newly created model
        if (result.model.id) {
          setSelectedModel(result.model.id)
          setCurrentModel(result.model)
          // Use the already-validated token from this request scope
          if (orgId) {
            await fetchModelRuns(orgId, result.model.id, authToken)
            await fetchModelDetails(orgId, result.model.id, authToken)
          }

          // IMPORTANT: A brand-new blank model has no runs, so the UI will appear empty.
          // Automatically trigger a baseline run so the model immediately shows monthly data.
          try {
            toast.info("Initializing model (running baseline)...")
            const runResponse = await fetch(`${API_BASE_URL}/models/${result.model.id}/run`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ runType: "baseline" }),
            })
            if (runResponse.ok) {
              const runResult = await runResponse.json()
              const jobId = runResult.jobId || runResult.modelRun?.jobId || runResult.job?.id
              const modelRunId = runResult.modelRun?.id
              if (jobId && orgId) {
                await pollModelRunStatus(orgId, result.model.id, jobId, authToken, modelRunId)
              } else if (orgId) {
                // Fallback: refresh runs to show queued/done state
                await fetchModelRuns(orgId, result.model.id, authToken)
              }
            } else {
              // If worker isn't running, this may fail; keep the model created but warn.
              const err = await runResponse.json().catch(() => ({}))
              console.warn("Baseline run start failed:", err)
              toast.warning("Model created, but baseline run couldn't start. Please click “Run Model”.")
            }
          } catch (e) {
            console.warn("Baseline run start error:", e)
            toast.warning("Model created, but baseline run couldn't start. Please click “Run Model”.")
          }
        }
      } else {
        throw new Error(result.error?.message || result.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create model"
      toast.error(errorMessage)
    } finally {
      setCreatingModel(false)
    }
  }

  const handleAIGenerate = async () => {
    if (generatingAI) return

    let currentOrgId = orgId
    if (!currentOrgId) {
      currentOrgId = await fetchOrgId()
      if (!currentOrgId) {
        toast.error("Organization ID not found. Please log in again.")
        return
      }
    }

    setGeneratingAI(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Use AI CFO to generate model recommendations
      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/ai-plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          goal: "Generate a comprehensive financial model with assumptions, projections, and sensitivity analysis based on our current financial data",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || "Failed to generate AI model")
      }

      const result = await response.json()
      if (result.ok && result.plan) {
        toast.success("AI model generation started. Creating model from AI recommendations...")
        // Create model from the AI plan
        if (result.plan.planJson?.structuredResponse) {
          const structuredResponse = result.plan.planJson.structuredResponse
          // Create model from AI recommendations
          await handleCreateModelFromAI(structuredResponse, currentOrgId, token)
        } else {
          // Fallback: create a basic model
          await handleCreateModelFromAI({ calculations: {} }, currentOrgId, token)
        }
      } else {
        throw new Error(result.error?.message || result.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI model"
      toast.error(errorMessage)
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleCreateModelFromAI = async (aiData: any, currentOrgId?: string, token?: string) => {
    const targetOrgId = currentOrgId || orgId
    if (!targetOrgId) {
      toast.error("Organization ID not found")
      return
    }

    try {
      const authToken = token || localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!authToken) {
        toast.error("Authentication token not found")
        return
      }

      const modelName = `AI Generated Model - ${new Date().toLocaleDateString()}`
      
      // Check if user has transaction data - if yes, use CSV data source to pull real data
      // Otherwise use blank and let the baseline run pull from transactions
      let dataSourceType: "blank" | "csv" = "blank"
      try {
        // Check if there are transactions available
        const txResponse = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/transactions?limit=1`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
        if (txResponse.ok) {
          const txResult = await txResponse.json()
          if (txResult.ok && txResult.transactions && txResult.transactions.length > 0) {
            // User has transaction data - use CSV source to ensure data is ingested
            dataSourceType = "csv"
          }
        }
      } catch (e) {
        console.log("Could not check transactions, using blank model")
      }
      
      // Use standard defaults for AI models, or infer from aiData if possible
      // For AI models, we'll use 24 months and hybrid as robust defaults
      const requestBody = {
        model_name: modelName,
        industry: "technology", 
        revenue_model_type: "hybrid" as const,
        forecast_duration: 24 as const, 
        data_source_type: dataSourceType,
        description: "AI generated financial model based on analysis",
        start_month: new Date().toISOString().slice(0, 7),
        base_currency: "USD"
      }
      
      const response = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/models`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || "Failed to create model from AI")
      }

      const result = await response.json()
      if (result.ok && result.model) {
        toast.success("AI model created successfully! Starting analysis...")
        
        // Trigger a baseline run immediately so the model reflects real data
        try {
          const runResponse = await fetch(`${API_BASE_URL}/models/${result.model.id}/run`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              runType: "baseline",
            }),
          })
          
          if (runResponse.ok) {
            const runResult = await runResponse.json()
            const jobId = runResult.jobId || runResult.modelRun?.jobId || runResult.job?.id
            if (jobId) {
              toast.info("Processing financial data for AI model...")
              // IMPORTANT: Wait for the baseline run to complete so UI has real data
              await pollModelRunStatus(targetOrgId, result.model.id, jobId, authToken, runResult.modelRun?.id)
            }
          }
        } catch (runError) {
          console.error("Failed to start initial model run:", runError)
        }

        // Refresh models list and select the newly created model
        await fetchOrgIdAndModels()
        if (result.model.id) {
          setSelectedModel(result.model.id)
          setCurrentModel(result.model)
          if (authToken && targetOrgId) {
            await fetchModelRuns(targetOrgId, result.model.id, authToken)
            await fetchModelDetails(targetOrgId, result.model.id, authToken)
          }
        }
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create model from AI"
      console.error("Failed to create model from AI:", error)
      toast.error(errorMessage)
    }
  }

  const handleGenerateReport = async () => {
    if (!orgId) {
      toast.error("Organization ID not found. Please ensure you're logged in.")
      return
    }

    if (!currentRun || currentRun.status !== "done") {
      toast.error("Please run the model first and wait for it to complete")
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication token not found. Please log in.")
        return
      }

      toast.info("Generating financial model report...")

      // Create investor export (PDF format for model report)
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          format: "pdf",
          modelRunId: currentRun.id,
          includeMonteCarlo: false,
          includeRecommendations: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to generate report: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.ok && result.export) {
        const exportId = result.export.id || result.export.exportId
        const jobId = result.export.jobId

        toast.success("Report generation started. This may take a few moments...")

        // Poll for export completion
        const pollExportStatus = async () => {
          const maxAttempts = 60
          let attempts = 0

          const poll = async () => {
            if (attempts >= maxAttempts) {
              toast.warning("Report generation is taking longer than expected. Please check back later.")
              return
            }

            try {
              // Re-fetch token on each poll attempt to handle token refresh
              const currentToken = localStorage.getItem("auth-token") || document.cookie
                .split("; ")
                .find((row) => row.startsWith("auth-token="))
                ?.split("=")[1] || token

              const statusResponse = await fetch(`${API_BASE_URL}/exports/${exportId}/status`, {
                headers: {
                  Authorization: `Bearer ${currentToken}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
              })

              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                
                // Handle both response formats
                const exportData = statusData.export || statusData
                const exportStatus = exportData?.status || statusData.status
                const downloadUrl = exportData?.downloadUrl || statusData.downloadUrl
                const filename = exportData?.filename || statusData.filename || `financial-model-report-${new Date().toISOString().split('T')[0]}.pdf`
                
                if (exportStatus === 'done' && downloadUrl) {
                  // Download the report with proper filename
                  const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${API_BASE_URL}${downloadUrl}`
                  
                  // Create a temporary link to trigger download
                  const link = document.createElement('a')
                  link.href = fullUrl
                  link.download = filename
                  link.target = '_blank'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  
                  toast.success(`Report "${filename}" downloaded successfully!`)
                  return
                } else if (exportStatus === 'failed') {
                  toast.error("Report generation failed. Please try again.")
                  return
                }
              } else if (statusResponse.status === 401) {
                // Token expired or invalid - stop polling
                toast.error("Authentication expired. Please log in again.")
                return
              }

              attempts++
              if (attempts < maxAttempts) {
                setTimeout(poll, 2000)
              }
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

        pollExportStatus()
      } else {
        throw new Error(result.error?.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate report"
      toast.error(errorMessage)
      console.error("Error generating report:", error)
    }
  }

  const handleExportModel = async () => {
    if (!selectedModel) {
      toast.error("Please select a model first")
      return
    }

    if (!currentRun) {
      toast.error("Please run the model first")
      return
    }
    
    // Allow export even if status is not "done" - user might want to export current state
    if (currentRun.status === "failed") {
      toast.error("Cannot export a failed model run")
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

      // Export as CSV for now (can add PDF/JSON options later)
      const exportType = "csv"
      
      // Create export using the correct endpoint
      const response = await fetch(`${API_BASE_URL}/model-runs/${currentRun.id}/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: exportType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || "Failed to export model")
      }

      const result = await response.json()
      
      if (result.ok && result.export) {
        const exportId = result.export.id
        toast.success("Export job created. Processing...")
        
        // Poll for export completion
        if (result.jobId) {
          await pollExportStatus(result.jobId, exportId, token)
        } else {
          // If no job, try direct download
          setTimeout(async () => {
            await downloadExport(exportId, token)
          }, 2000)
        }
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export model"
      toast.error(errorMessage)
    }
  }

  const downloadExport = async (exportId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `model-export-${exportId.substring(0, 8)}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Export downloaded successfully!")
      } else {
        throw new Error("Export not ready yet")
      }
    } catch (error) {
      console.error("Error downloading export:", error)
      // Don't show error, export might still be processing
    }
  }

  const pollExportStatus = async (jobId: string, exportId: string, token: string) => {
    const maxAttempts = 60 // 2 minutes max
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.warning("Export is taking longer than expected. Please check back later.")
        return
      }

      try {
        // Check job status
        const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (jobResponse.ok) {
          const jobResult = await jobResponse.json()
          if (jobResult.ok && jobResult.job) {
            const jobStatus = jobResult.job.status
            if (jobStatus === "done" || jobStatus === "completed") {
              // Try to download the export
              await downloadExport(exportId, token)
              return
            } else if (jobStatus === "failed") {
              toast.error("Export failed. Please try again.")
              return
            }
          }
        }

        // Also check export status directly
        const exportResponse = await fetch(`${API_BASE_URL}/exports/${exportId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (exportResponse.ok) {
          const exportResult = await exportResponse.json()
          if (exportResult.status === "completed") {
            await downloadExport(exportId, token)
            return
          } else if (exportResult.status === "failed") {
            toast.error("Export failed. Please try again.")
            return
          }
        }

        attempts++
        setTimeout(poll, 2000) // Poll every 2 seconds
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

  // Calculate confidence score from model run data
  const calculateConfidenceScore = (summary: any, cellId?: string): number => {
    if (!summary || typeof summary !== 'object') {
      return 70 // Default confidence if no data
    }

    // Try to get confidence from various sources in order of preference
    const kpis = summary.kpis || {}
    
    // 1. Direct confidence from KPIs
    if (kpis.forecastAccuracy !== undefined && kpis.forecastAccuracy !== null) {
      // If it's a percentage (0-100), use it directly; if it's a decimal (0-1), convert
      const accuracy = typeof kpis.forecastAccuracy === 'number'
        ? (kpis.forecastAccuracy < 1 ? kpis.forecastAccuracy * 100 : kpis.forecastAccuracy)
        : parseFloat(String(kpis.forecastAccuracy)) || 70
      return Math.round(Math.min(Math.max(accuracy, 50), 99))
    }

    if (kpis.confidence !== undefined && kpis.confidence !== null) {
      const confidence = typeof kpis.confidence === 'number'
        ? (kpis.confidence < 1 ? kpis.confidence * 100 : kpis.confidence)
        : parseFloat(String(kpis.confidence)) || 70
      return Math.round(Math.min(Math.max(confidence, 50), 99))
    }

    if (summary.confidence !== undefined && summary.confidence !== null) {
      const confidence = typeof summary.confidence === 'number'
        ? (summary.confidence < 1 ? summary.confidence * 100 : summary.confidence)
        : parseFloat(String(summary.confidence)) || 70
      return Math.round(Math.min(Math.max(confidence, 50), 99))
    }

    // 2. Calculate confidence based on data quality indicators
    let confidenceFactors: number[] = []

    // Data completeness (0-100)
    const hasRevenue = !!(summary.revenue || summary.mrr)
    const hasExpenses = !!(summary.expenses || summary.burnRate)
    const hasCash = !!(summary.cashBalance || summary.cash)
    const hasGrowth = !!(summary.revenueGrowth || summary.growthRate)
    const dataCompleteness = ((hasRevenue ? 25 : 0) + (hasExpenses ? 25 : 0) + (hasCash ? 25 : 0) + (hasGrowth ? 25 : 0))
    confidenceFactors.push(dataCompleteness)

    // Historical data quality (if we have monthly data)
    if (summary.monthly && typeof summary.monthly === 'object') {
      const monthlyKeys = Object.keys(summary.monthly)
      if (monthlyKeys.length >= 3) {
        confidenceFactors.push(85) // Good historical data
      } else if (monthlyKeys.length >= 1) {
        confidenceFactors.push(70) // Some historical data
      } else {
        confidenceFactors.push(60) // Limited data
      }
    } else {
      confidenceFactors.push(65) // No monthly breakdown
    }

    // Variance/stability indicator (lower variance = higher confidence)
    if (summary.variance !== undefined) {
      const variance = Math.abs(Number(summary.variance))
      if (variance < 0.1) {
        confidenceFactors.push(90) // Very stable
      } else if (variance < 0.2) {
        confidenceFactors.push(80) // Stable
      } else if (variance < 0.3) {
        confidenceFactors.push(70) // Moderate variance
      } else {
        confidenceFactors.push(60) // High variance
      }
    } else {
      confidenceFactors.push(75) // Unknown variance
    }

    // Calculate weighted average
    const avgConfidence = confidenceFactors.reduce((sum, val) => sum + val, 0) / confidenceFactors.length
    return Math.round(Math.min(Math.max(avgConfidence, 50), 99))
  }

  const handleCellClick = async (cellId: string, metricName: string, value: string, monthKey?: string) => {
    // Calculate confidence from current model run
    let confidenceScore = 70 // Default
    let aiExplanation: string | undefined
    let generatedBy: "user" | "ai" = "ai"

    // Construct proper cell key: YYYY-MM:metric format
    // If monthKey is provided, use it; otherwise try to find it from financialData
    let actualCellKey = cellId
    if (monthKey) {
      // Map cellId to the metric name used in provenance
      const metricMap: Record<string, string> = {
        revenue: 'revenue',
        cogs: 'cogs',
        gross_profit: 'grossProfit',
        net_income: 'netIncome',
      }
      const provenanceMetric = metricMap[cellId] || cellId
      actualCellKey = `${monthKey}:${provenanceMetric}`
    } else {
      // Try to find the most recent month from financialData
      if (financialData.length > 0) {
        const lastRow = financialData[financialData.length - 1]
        if (lastRow.monthKey) {
          const metricMap: Record<string, string> = {
            revenue: 'revenue',
            cogs: 'cogs',
            gross_profit: 'grossProfit',
            net_income: 'netIncome',
          }
          const provenanceMetric = metricMap[cellId] || cellId
          actualCellKey = `${lastRow.monthKey}:${provenanceMetric}`
        }
      }
    }

    if (currentRun && currentRun.summaryJson) {
      const summary = typeof currentRun.summaryJson === 'string' 
        ? JSON.parse(currentRun.summaryJson) 
        : currentRun.summaryJson
      
      confidenceScore = calculateConfidenceScore(summary, cellId)
      
      // Generate explanation based on data
      const kpis = summary.kpis || {}
      const revenue = summary.revenue || summary.mrr || 0
      const growth = summary.revenueGrowth || summary.growthRate || 0
      const churn = summary.churnRate || 0
      
      if (cellId === "revenue" || cellId.includes("revenue")) {
        aiExplanation = `This revenue figure is calculated based on ${summary.activeCustomers || 15} active subscriptions. ` +
          `The model detected a ${(growth * 100).toFixed(1)}% growth pattern and factored in a ${(churn * 100).toFixed(1)}% churn rate. ` +
          `Confidence is ${confidenceScore >= 80 ? 'high' : confidenceScore >= 60 ? 'moderate' : 'low'} due to ` +
          `${summary.monthly ? 'historical data patterns' : 'current financial indicators'}.`
      } else {
        aiExplanation = `This metric is calculated from the financial model run. ` +
          `Confidence: ${confidenceScore}% based on data quality and historical patterns.`
      }
    }

    // Try to fetch real provenance data
    let provenanceData: any = null
    if (currentRun && orgId) {
      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (token) {
          // Try the actual cell key first, then fallback to the simple cellId
          const cellKeysToTry = [actualCellKey, cellId]
          let result: any = null
          
          for (const keyToTry of cellKeysToTry) {
            const response = await fetch(
              `${API_BASE_URL}/orgs/${orgId}/models/${selectedModel}/runs/${currentRun.id}/provenance/${encodeURIComponent(keyToTry)}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
              }
            )

            if (response.ok) {
              const responseData = await response.json()
              if (responseData.ok && responseData.entries && responseData.entries.length > 0) {
                result = responseData
                break // Found data, stop trying other keys
              }
            }
          }
          
          if (result && result.entries && result.entries.length > 0) {
            // CRITICAL: Use the value from the table (passed as parameter) as it's the actual cell value
            // The API summary.totalAmount might be an aggregate, not the specific cell value
            // Only use API value as fallback if no value was passed
            let actualValue = value // Always prefer the passed value (from table cell)
            
            // If no value was passed, try to extract from API response
            if (!actualValue || actualValue === 'N/A' || actualValue === '$0') {
              const firstEntry = result.entries[0]
              
              // Try to get value from summary (for transaction-based) - but this might be aggregate
              if (firstEntry.summary && firstEntry.summary.totalAmount !== undefined) {
                actualValue = `$${Number(firstEntry.summary.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              // Try to get value from assumptionRef (for assumption-based)
              else if (firstEntry.assumptionRef && firstEntry.assumptionRef.value !== undefined) {
                const val = firstEntry.assumptionRef.value
                if (typeof val === 'number') {
                  actualValue = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                } else {
                  actualValue = String(val)
                }
              }
              // Try to get value from sourceRef
              else if (firstEntry.sourceRef && typeof firstEntry.sourceRef === 'object' && firstEntry.sourceRef.value !== undefined) {
                const val = firstEntry.sourceRef.value
                if (typeof val === 'number') {
                  actualValue = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                } else {
                  actualValue = String(val)
                }
              }
            }
            
            // Use real provenance data
            provenanceData = {
              cellId: actualCellKey,
              metricName,
              value: actualValue, // Use table value (preferred) or API fallback
              sourceTransactions: result.entries
                .filter((e: any) => e.sourceType === 'txn' && e.sampleTransactions)
                .flatMap((e: any) => e.sampleTransactions.map((txn: any) => ({
                  id: txn.id,
                  date: new Date(txn.date).toISOString().split('T')[0],
                  description: txn.description || 'Transaction',
                  amount: txn.amount,
                  category: txn.category || 'Uncategorized',
                }))),
              assumptionRefs: result.entries
                .filter((e: any) => e.sourceType === 'assumption' && (e.sourceRef || e.assumptionRef))
                .map((e: any) => {
                  const ref = e.assumptionRef || e.sourceRef || {}
                  // Extract assumption name properly
                  const assumptionName = ref.name || ref.assumption_id || 'Assumption'
                  // Extract assumption value properly
                  const assumptionValue = ref.value !== undefined 
                    ? (typeof ref.value === 'number' 
                        ? `$${ref.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : String(ref.value))
                    : (ref.assumption_value !== undefined 
                        ? (typeof ref.assumption_value === 'number'
                            ? `$${ref.assumption_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : String(ref.assumption_value))
                        : 'N/A')
                  return {
                    id: e.id,
                    name: assumptionName,
                    value: assumptionValue,
                    lastModified: new Date(e.createdAt).toLocaleDateString(),
                  }
                }),
              generatedBy: result.entries.some((e: any) => e.promptPreview) ? "ai" : "user",
              confidenceScore: confidenceScore, // Use calculated confidence
              aiExplanation: aiExplanation || result.entries.find((e: any) => e.promptPreview)?.promptPreview?.responseText,
              auditTrail: result.entries.map((e: any) => ({
                timestamp: new Date(e.createdAt).toLocaleString(),
                action: `Provenance entry (${e.sourceType})`,
                user: 'System',
              })),
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch provenance:", error)
      }
    }

    // Use real provenance data if available, otherwise use fallback
    if (!provenanceData) {
      // Try to get value from summary if available
      let fallbackValue = value
      if (currentRun && currentRun.summaryJson) {
        const summary = typeof currentRun.summaryJson === 'string' 
          ? JSON.parse(currentRun.summaryJson) 
          : currentRun.summaryJson
        
        if (summary.monthly && monthKey) {
          const monthData = summary.monthly[monthKey]
          if (monthData) {
            if (cellId === 'revenue') fallbackValue = `$${(monthData.revenue || 0).toLocaleString()}`
            else if (cellId === 'cogs') fallbackValue = `$${(monthData.cogs || 0).toLocaleString()}`
            else if (cellId === 'gross_profit') fallbackValue = `$${(monthData.grossProfit || 0).toLocaleString()}`
            else if (cellId === 'net_income') fallbackValue = `$${(monthData.netIncome || 0).toLocaleString()}`
          }
        }
      }

      provenanceData = {
        cellId: actualCellKey,
        metricName,
        value: fallbackValue,
        formula: cellId === "revenue" ? "SUM(transactions) * (1 + growth_rate)" 
          : cellId === "cogs" ? "revenue * cogsPercentage"
          : cellId === "gross_profit" ? "revenue - cogs"
          : cellId === "net_income" ? "revenue - cogs - opex"
          : undefined,
        sourceTransactions: [],
        assumptionRefs: [],
        generatedBy,
        confidenceScore,
        aiExplanation,
        auditTrail: [],
      }
    }

    setSelectedCellData(provenanceData)
    setProvenanceModalOpen(true)
  }

  const metricOverrides = useMemo(() => {
    if (!currentRun || !currentRun.summaryJson) return {}

    const summary = typeof currentRun.summaryJson === "string"
      ? JSON.parse(currentRun.summaryJson)
      : currentRun.summaryJson

    const mrr = Number(summary.mrr ?? summary.revenue ?? 0)
    const arr = mrr * 12
    const burn = Number(summary.monthlyBurn ?? summary.monthlyBurnRate ?? summary.burnRate ?? 0)
    const runway = Number(summary.runwayMonths ?? summary.runway ?? 0)
    const cac = Number(summary.cac ?? 0)
    const ltv = Number(summary.ltv ?? 0)

    const formatCurrency = (v: number) =>
      v ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"

    return {
      mrr: formatCurrency(mrr),
      arr: formatCurrency(arr),
      burn_rate: formatCurrency(burn),
      runway: runway ? `${runway.toFixed(1)} months` : "N/A",
      cac: cac ? formatCurrency(cac) : "N/A",
      ltv: ltv ? formatCurrency(ltv) : "N/A",
    } as Record<string, string>
  }, [currentRun])

  const handleMetricSearch = (metricId: string) => {
    if (!currentRun || !currentRun.summaryJson) {
      toast.error("No model run data available for metric lineage.")
      return
    }

    const summary = typeof currentRun.summaryJson === "string"
      ? JSON.parse(currentRun.summaryJson)
      : currentRun.summaryJson

    // Derive live metric values from the actual model summary (no hardcoded numbers)
    const mrr = Number(summary.mrr ?? summary.revenue ?? 0)
    const arr = mrr * 12
    const burn =
      Number(summary.monthlyBurn ?? summary.monthlyBurnRate ?? summary.burnRate ?? 0)
    const runway = Number(summary.runwayMonths ?? summary.runway ?? 0)
    const cac = Number(summary.cac ?? 0)
    const ltv = Number(summary.ltv ?? 0)

    const metricMap: Record<string, { name: string; value: string; cellId: string }> = {
      // Treat MRR/ARR as revenue lineage (so provenance shows real transactions/assumptions)
      mrr: { name: "Monthly Recurring Revenue", value: metricOverrides.mrr ?? "N/A", cellId: "revenue" },
      arr: { name: "Annual Recurring Revenue", value: metricOverrides.arr ?? "N/A", cellId: "revenue" },
      burn_rate: { name: "Monthly Burn Rate", value: metricOverrides.burn_rate ?? "N/A", cellId: "net_income" },
      runway: {
        name: "Cash Runway",
        value: metricOverrides.runway ?? (runway ? `${runway.toFixed(1)} months` : "N/A"),
        cellId: "runwayMonths",
      },
      cac: {
        name: "Customer Acquisition Cost",
        value: metricOverrides.cac ?? (cac ? `$${cac.toLocaleString()}` : "N/A"),
        cellId: "revenue", // derived from revenue & customers
      },
      ltv: {
        name: "Customer Lifetime Value",
        value: metricOverrides.ltv ?? (ltv ? `$${ltv.toLocaleString()}` : "N/A"),
        cellId: "revenue", // derived from revenue & churn
      },
    }

    const metric = metricMap[metricId]
    if (!metric) {
      toast.error("Metric not recognized for provenance search.")
      return
    }

    // IMPORTANT:
    // - Use underlying cellId (e.g. "revenue") so provenance API finds the correct entries
    // - Pass the live metric value derived from the current model run
    handleCellClick(metric.cellId, metric.name, metric.value)
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error && financialData.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchOrgIdAndModels} variant="outline" className="w-full sm:w-auto">
          <Loader2 className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Financial Modeling</h1>
          <p className="text-sm md:text-base text-muted-foreground">AI-powered financial models and projections</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {selectedModel && (
            <Button 
              onClick={handleRunModel} 
              disabled={runningModel}
              className="w-full sm:w-auto"
            >
              {runningModel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Running...</span>
                  <span className="sm:hidden">Running</span>
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Run Model</span>
                  <span className="sm:hidden">Run</span>
                </>
              )}
            </Button>
          )}
          <div className="w-full sm:w-auto">
            <ModelVersionRollback
              modelId={selectedModel}
              orgId={orgId}
              onVersionRollback={(versionId) => {
                console.log("Rolling back to version:", versionId)
                toast.success("Model version rolled back successfully")
              }}
            />
          </div>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Import Data</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Financial Data</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import transactions and financial data
                </DialogDescription>
              </DialogHeader>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Need a template?</p>
                    <p className="text-xs text-blue-700 mt-1">Download our CSV template with sample data and proper formatting</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = generateFinancialModelingTemplate()
                      downloadCSV(csvContent, 'financial-modeling-template.csv')
                      toast.success('Template downloaded successfully!')
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
              <CSVImportWizard />
              <ExcelImportWizard />
            </DialogContent>
          </Dialog>
          {orgId && currentRun && (
            <OneClickExportButton
              orgId={orgId}
              modelRunId={currentRun.id}
            />
          )}
          <Button 
            variant="outline"
            onClick={handleExportModel}
            disabled={!selectedModel || !currentRun || currentRun.status === "failed"}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Model
          </Button>
          <Button 
            onClick={handleGenerateReport}
            disabled={!orgId || !currentRun || currentRun.status !== "done"}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button 
            onClick={handleAIGenerate}
            disabled={generatingAI || !orgId}
          >
            {generatingAI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                AI Generate
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5 text-purple-600" />
            Metric Lineage Search
          </CardTitle>
          <CardDescription>Search any metric to view its complete data provenance and lineage path</CardDescription>
        </CardHeader>
        <CardContent>
          <ProvenanceSearch onSelectMetric={handleMetricSearch} metricOverrides={metricOverrides} />
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Model Template
          </CardTitle>
          <CardDescription>Choose a pre-built model template or create custom</CardDescription>
        </CardHeader>
        <CardContent>
          {models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className={`cursor-pointer transition-all ${selectedModel === model.id ? "ring-2 ring-primary" : ""}`}
                  onClick={async () => {
                    setSelectedModel(model.id)
                    const token = localStorage.getItem("auth-token") || document.cookie
                      .split("; ")
                      .find((row) => row.startsWith("auth-token="))
                      ?.split("=")[1]
                    if (token && orgId) {
                      await fetchModelRuns(orgId, model.id, token)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{model.name || "Unnamed Model"}</h3>
                      <Badge variant="secondary">{model.type || "Custom"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(model.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No models found. Create your first model to get started.</p>
              <Button onClick={() => setShowCreateModelDialog(true)}>
                <Brain className="mr-2 h-4 w-4" />
                Create Model
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Model Tabs */}
      <Tabs defaultValue="statements" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
            <TabsTrigger value="statements" className="text-xs sm:text-sm">Financial Statements</TabsTrigger>
            <TabsTrigger value="assumptions" className="text-xs sm:text-sm">Assumptions</TabsTrigger>
            <TabsTrigger value="projections" className="text-xs sm:text-sm">Projections</TabsTrigger>
            <TabsTrigger value="sensitivity" className="text-xs sm:text-sm">Sensitivity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="statements" className="space-y-4 overflow-x-auto overflow-y-visible">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>Monthly P&L breakdown with provenance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">COGS</TableHead>
                        <TableHead className="text-right">Gross Profit</TableHead>
                        <TableHead className="text-right">Net Income</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialData.length > 0 ? (
                        financialData.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => handleCellClick("revenue", "Revenue", `$${row.revenue.toLocaleString()}`, row.monthKey)}
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
                            >
                              ${row.revenue.toLocaleString()}
                              <SearchIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() =>
                                handleCellClick("cogs", "Cost of Goods Sold", `$${row.cogs.toLocaleString()}`, row.monthKey)
                              }
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
                            >
                              ${row.cogs.toLocaleString()}
                              <SearchIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() =>
                                handleCellClick("gross_profit", "Gross Profit", `$${row.grossProfit.toLocaleString()}`, row.monthKey)
                              }
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
                            >
                              ${row.grossProfit.toLocaleString()}
                              <SearchIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() =>
                                handleCellClick("net_income", "Net Income", `$${row.netIncome.toLocaleString()}`, row.monthKey)
                              }
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
                            >
                              ${row.netIncome.toLocaleString()}
                              <SearchIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No financial data available. Run a model to see results.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>6-month revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                {financialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={paginatedChartData.length > 0 ? paginatedChartData : financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No revenue data available. Run a model to see trends.
                  </div>
                )}
                {hasMore && (
                  <div className="mt-2 text-center">
                    <Button variant="outline" size="sm" onClick={loadMore}>
                      Load More Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
              <CardDescription>Monthly cash flow trends</CardDescription>
            </CardHeader>
              <CardContent>
                {financialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                    <BarChart data={paginatedChartData.length > 0 ? paginatedChartData : financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Bar dataKey="cashFlow" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No cash flow data available. Run a model to see analysis.
                  </div>
                )}
                {hasMore && (
                  <div className="mt-2 text-center">
                    <Button variant="outline" size="sm" onClick={loadMore}>
                      Load More Data
                    </Button>
                  </div>
                )}
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Model Assumptions</CardTitle>
              <CardDescription>Key assumptions driving your financial model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {["Revenue", "Costs"].map((category) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(modelAssumptions.length > 0 ? modelAssumptions : defaultAssumptions)
                        .filter((assumption: any) => assumption.category === category)
                        .map((assumption: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <Label htmlFor={`assumption-${index}`}>{assumption.item}</Label>
                            <Input
                              id={`assumption-${index}`}
                              value={assumptionEdits[assumption.key] ?? assumption.value}
                              onChange={(e) => {
                                const next = e.target.value
                                setAssumptionEdits((prev) => ({ ...prev, [assumption.key]: next }))
                              }}
                              className="font-mono"
                            />
                          </div>
                        ))}
                    </div>
                    {modelAssumptions.length === 0 && defaultAssumptions.length === 0 && (
                      <div className="text-sm text-muted-foreground py-4">
                        No model assumptions available. Create a model and run it to see assumptions.
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={handleSaveAssumptions} disabled={savingAssumptions || !selectedModel}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingAssumptions ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline">
                    <Zap className="mr-2 h-4 w-4" />
                    AI Optimize
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>12-Month Projections</CardTitle>
                  <CardDescription>AI-generated forecasts based on current trends</CardDescription>
                </div>
                {orgId && currentRun && (
                  <OneClickExportButton
                    orgId={orgId}
                    modelRunId={currentRun.id}
                    className="ml-4"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {projections?.projectedARR 
                        ? `$${(projections.projectedARR / 1000000).toFixed(1)}M`
                        : currentRun?.summaryJson 
                        ? `$${(((currentRun.summaryJson as any).revenue || (currentRun.summaryJson as any).mrr || 0) * 12 / 1000000).toFixed(1)}M`
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">Projected ARR</div>
                    {projections || currentRun?.summaryJson ? (
                      <div className="flex items-center text-xs text-green-600 mt-1">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {projections?.growthRate ? `+${projections.growthRate.toFixed(0)}%` : "+0%"} growth
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">No projection data</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {projections?.totalBurn 
                        ? `$${(projections.totalBurn / 1000).toFixed(0)}K`
                        : currentRun?.summaryJson 
                        ? `$${(((currentRun.summaryJson as any).expenses || 0) * 12 / 1000).toFixed(0)}K`
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Burn</div>
                    {projections || currentRun?.summaryJson ? (
                      <div className="flex items-center text-xs text-blue-600 mt-1">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Controlled growth
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">No burn data</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {projections?.runway 
                        ? `${projections.runway.toFixed(0)} months`
                        : currentRun?.summaryJson 
                        ? `${((currentRun.summaryJson as any).runwayMonths || 0).toFixed(0)} months`
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">Runway</div>
                    {projections || currentRun?.summaryJson ? (
                      <div className="flex items-center text-xs text-purple-600 mt-1">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Healthy buffer
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">No runway data</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>AI Insights:</strong> Based on current growth trends and market conditions, your business is
                  projected to reach profitability by month 8. Consider raising additional funding in Q4 to accelerate
                  growth and extend runway to 24+ months.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitivity" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Sensitivity Analysis</CardTitle>
              <CardDescription>How changes in key variables affect your outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <Label>Revenue Growth Rate</Label>
                    <div className="mt-2 space-y-2">
                      {sensitivityData?.revenueGrowth ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Conservative ({sensitivityData.revenueGrowth.conservative.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.revenueGrowth.conservative.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Base Case ({sensitivityData.revenueGrowth.base.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.revenueGrowth.base.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Optimistic ({sensitivityData.revenueGrowth.optimistic.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.revenueGrowth.optimistic.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No sensitivity data available. Run a model to see sensitivity analysis.
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Customer Churn Rate</Label>
                    <div className="mt-2 space-y-2">
                      {sensitivityData?.churnRate ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Low ({sensitivityData.churnRate.low.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.churnRate.low.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Base Case ({sensitivityData.churnRate.base.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.churnRate.base.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>High ({sensitivityData.churnRate.high.rate * 100}%)</span>
                            <span className="font-mono">${(sensitivityData.churnRate.high.arr / 1000).toFixed(0)}K ARR</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No churn sensitivity data available.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction List</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowTransactions(!showTransactions)}>
                  {showTransactions ? "Hide" : "Show"} Transactions
                </Button>
              </div>
            </CardHeader>
            {showTransactions && (
              <CardContent>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length > 0 ? (
                  <VirtualizedTable
                    data={transactions}
                    columns={[
                      { key: "date", header: "Date", render: (tx) => tx.date },
                      { key: "description", header: "Description", render: (tx) => tx.description || "N/A" },
                      {
                        key: "amount",
                        header: "Amount",
                        render: (tx) => `$${Math.abs(tx.amount).toFixed(2)}`,
                      },
                      { key: "category", header: "Category", render: (tx) => tx.category || "Uncategorized" },
                    ]}
                    containerHeight={400}
                    rowHeight={48}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions found. Import CSV data to see transactions here.</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ProvenanceDrawer
        open={provenanceModalOpen}
        onOpenChange={setProvenanceModalOpen}
        modelRunId={currentRun?.id}
        cellKey={selectedCellData?.cellId}
        provenanceData={selectedCellData}
      />

      {/* Create Model Dialog */}
      <Dialog open={showCreateModelDialog} onOpenChange={setShowCreateModelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Financial Model</DialogTitle>
            <DialogDescription>
              Configure your financial model parameters according to industrial standards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name *</Label>
              <Input
                id="model-name"
                placeholder="e.g., Series A Forecast 2025"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="model-description">Description (Optional)</Label>
              <Textarea
                id="model-description"
                placeholder="Describe the purpose, assumptions, and context..."
                value={newModelDescription}
                onChange={(e) => setNewModelDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Industry */}
              <div className="space-y-2">
                <Label htmlFor="industry">Industry Sector</Label>
                <Select value={newModelIndustry} onValueChange={setNewModelIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology / SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-commerce / Retail</SelectItem>
                    <SelectItem value="services">Professional Services</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Revenue Model */}
              <div className="space-y-2">
                <Label htmlFor="revenue-model">Revenue Model</Label>
                <Select value={newModelRevenueType} onValueChange={setNewModelRevenueType}>
                  <SelectTrigger id="revenue-model">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription (MRR/ARR)</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="services">Service Based</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Forecast Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Forecast Duration</Label>
                <Select value={newModelDuration} onValueChange={setNewModelDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Months (1 Year)</SelectItem>
                    <SelectItem value="24">24 Months (2 Years)</SelectItem>
                    <SelectItem value="36">36 Months (3 Years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Month */}
              <div className="space-y-2">
                <Label htmlFor="start-month">Start Month</Label>
                <Input
                  id="start-month"
                  type="month"
                  value={newModelStartDate}
                  onChange={(e) => setNewModelStartDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModelDialog(false)
              setNewModelName("")
              setNewModelDescription("")
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateModel} disabled={!newModelName.trim() || creatingModel || !orgId}>
              {creatingModel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Model"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
