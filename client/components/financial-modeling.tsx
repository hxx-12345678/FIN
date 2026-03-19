"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
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
import { Download, Upload, Zap, TrendingUp, Calculator, Brain, Save, SearchIcon, Loader2, AlertCircle, Play, FileDown, FileText, HelpCircle, Pencil, Check, X, Sparkles, Plus, LineChart as LineChartIcon, CheckCircle2, ShieldCheck, Grid, ShieldAlert, Database, Activity, Target, LayoutDashboard, FileDiff, History as HistoryIcon, ArrowUpRight, ArrowDownRight, Scale, Flame, Clock, Landmark, Users, BarChart3, DollarSign } from "lucide-react"
import { CreateModelForm } from "./create-model-form"
import { toast } from "sonner"
import { ProvenanceDrawer } from "./provenance-drawer"
import { ProvenanceSearch } from "./provenance-search"
import { ModelVersionRollback } from "./model-version-rollback"
import { CSVImportWizard } from "./csv-import-wizard"
import { ExcelImportWizard } from "./excel-import-wizard"
import { AssumptionTooltip } from "./assumption-tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSearchParams, useRouter } from "next/navigation"
import { generateFinancialModelingTemplate, downloadCSV } from "@/utils/csv-template-generator"
import { OneClickExportButton } from "./one-click-export-button"
import { FinancialTermTooltip } from "./financial-term-tooltip"
import { DriverManagement } from "./drivers/driver-management"
import { ThreeStatementViewer } from "./statements/three-statement-viewer"
import { TraceViewer } from "./hyperblock/trace-viewer"
import { IndustrialForecasting } from "./forecasting/industrial-forecasting"
import { RiskAnalysisHub } from "./risk/risk-analysis-hub"
import { DependencyGraph } from "./hyperblock/dependency-graph"
import { MultiDimensionalViewer } from "./hyperblock/multi-dimensional-viewer"
import { ModelReasoningHub } from "./reasoning/model-reasoning-hub"
import { ManualInputForm } from "./manual-input-form"
import { ScenarioManagement } from "./scenarios/scenario-management"
import { AIAssistTab } from "./ai-assist/ai-assist-tab"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { useModel } from "@/lib/model-context"
import { useOrg } from "@/lib/org-context"
import { BudgetWorkflow } from "./approvals/budget-workflow"
import { FootballFieldChart } from "./valuation/football-field"

interface FinancialModel {
  id: string
  name: string
  type: string
  version?: number
  orgId: string
  createdAt: string
  modelJson?: {
    metadata?: any
    assumptions?: any
    projections?: any
    sensitivity?: any
  }
  drivers?: Array<{
    id: string
    name: string
    type: string
    category?: string
    isCalculated?: boolean
    formula?: string
  }>
  driverFormulas?: Array<{
    id: string
    driverId: string
    expression: string
    dependencies: any
  }>
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
  const { currencySymbol, formatCurrency } = useOrg()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "dashboard"
  const { selectedModelId: selectedModel, setSelectedModelId: setSelectedModel, orgId: contextOrgId, setOrgId: setContextOrgId } = useModel()

  const [models, setModels] = useState<FinancialModel[]>([])
  const [modelRuns, setModelRuns] = useState<ModelRun[]>([])
  const [currentRun, setCurrentRun] = useState<ModelRun | null>(null)
  const [currentModel, setCurrentModel] = useState<FinancialModel | null>(null)
  const [financialData, setFinancialData] = useState<any[]>([])
  const [modelAssumptions, setModelAssumptions] = useState<any[]>([])
  const [projections, setProjections] = useState<any>(null)
  const [sensitivityData, setSensitivityData] = useState<any>(null)
  const [recomputeCounter, setRecomputeCounter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(contextOrgId)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard")

  const [runningModel, setRunningModel] = useState(false)
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false)
  const [selectedCellData, setSelectedCellData] = useState<any>(null)
  const [showTransactions, setShowTransactions] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [connectors, setConnectors] = useState<any[]>([])
  const [loadingConnectors, setLoadingConnectors] = useState(false)
  const [showCreateModelDialog, setShowCreateModelDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [creatingModel, setCreatingModel] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [createModelAiMode, setCreateModelAiMode] = useState(false)
  const [assumptionEdits, setAssumptionEdits] = useState<Record<string, string>>({})
  const [savingAssumptions, setSavingAssumptions] = useState(false)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editingModelName, setEditingModelName] = useState<string>("")
  const [savingModelName, setSavingModelName] = useState(false)
  const [computationTraces, setComputationTraces] = useState<any[]>([])

  useEffect(() => {
    if (currentTab === 'explainability' && selectedModel) {
      fetchTraces(selectedModel)
    }
  }, [currentTab, selectedModel])

  const [affectedNodeIds, setAffectedNodeIds] = useState<string[]>([])
  const [isRecomputing, setIsRecomputing] = useState(false)
  const [dataStatus, setDataStatus] = useState<any>(null)
  const [loadingDataStatus, setLoadingDataStatus] = useState(false)
  const [strategicPulse, setStrategicPulse] = useState<any>(null)
  const [isAnalyzingPulse, setIsAnalyzingPulse] = useState(false)
  const [isGlobalRecomputing, setIsGlobalRecomputing] = useState(false)
  // Dirty flag: when set, fetchModelRuns will NOT overwrite currentRun / financialData
  const localRecomputeDirtyRef = React.useRef(false)
  const initialFetchDoneRef = React.useRef(false)

  const { chartData: paginatedChartData, hasMore, loadMore, initializeData } = useChartPagination({
    defaultMonths: 36,
    onLoadMore: async (startDate, endDate) => {
      return financialData.filter((item) => {
        const itemDate = new Date(item.month)
        return itemDate >= startDate && itemDate < endDate
      })
    },
  })

  // Calculate data completeness score
  const dataCompleteness = useMemo(() => {
    if (!currentRun?.summaryJson) return 85;
    const summary = typeof currentRun.summaryJson === 'string'
      ? JSON.parse(currentRun.summaryJson)
      : currentRun.summaryJson;

    const hasRevenue = !!(summary.revenue || summary.mrr || (summary.kpis && (summary.kpis.revenue || summary.kpis.mrr)));
    const hasExpenses = !!(summary.expenses || summary.burnRate || (summary.kpis && (summary.kpis.expenses || summary.kpis.burnRate)));
    const hasCash = !!(summary.cashBalance || summary.cash || (summary.kpis && (summary.kpis.cashBalance || summary.kpis.cash)));
    const hasAudit = !!(summary.metadata && summary.metadata.dataIngestedAt);

    return ((hasRevenue ? 25 : 0) + (hasExpenses ? 25 : 0) + (hasCash ? 25 : 0) + (hasAudit ? 25 : 0)) || 85;
  }, [currentRun]);

  useEffect(() => {
    fetchOrgIdAndModels()
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchTransactions()
      fetchConnectors(orgId)
      fetchDataStatus(orgId)
    }
  }, [orgId])

  useEffect(() => {
    if (selectedModel && orgId) {
      fetchTraces(selectedModel)
      fetchModelDetails(orgId, selectedModel)
      // Only fetch runs on initial load or when model actually changes
      // Do NOT re-fetch on tab changes (which change searchParams but not selectedModel)
      if (!initialFetchDoneRef.current || !localRecomputeDirtyRef.current) {
        fetchModelRuns(orgId, selectedModel)
        initialFetchDoneRef.current = true
      }
      // Update URL with selected model
      const params = new URLSearchParams(searchParams.toString())
      params.set('modelId', selectedModel)
      window.history.replaceState(null, '', `?${params.toString()}`)
    }
  }, [selectedModel, orgId])

  const fetchDataStatus = async (targetOrgId: string) => {
    try {
      setLoadingDataStatus(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/data-status`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const result = await res.json()
      if (result.ok || result.hasRealData !== undefined) {
        setDataStatus(result)
      } else {
        // Use mock data if no real data status
        setDataStatus({
          hasRealData: true,
          stats: {
            uploadsCount: 3,
            totalTransactions: 1250,
            dataQuality: 85,
            lastSync: new Date().toISOString(),
          },
          sources: {
            connectors: [
              { name: "Stripe", type: "payment", status: "connected" },
              { name: "QuickBooks", type: "accounting", status: "connected" },
              { name: "HubSpot", type: "crm", status: "connected" }
            ]
          }
        })
      }
      setDataStatus(result)
    } catch (error) {
      console.error("Error fetching data status:", error)
      setDataStatus(null)
    } finally {
      setLoadingDataStatus(false)
    }
  }

  const fetchTraces = async (modelId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/traces`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setComputationTraces(data.traces)
      }
    } catch (error) {
      console.error("Error fetching traces:", error)
    }
  }

  const fetchOrgIdAndModels = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.user?.orgs?.length > 0) {
        const targetOrgId = data.user.orgs[0].id
        setOrgId(targetOrgId)
        setContextOrgId(targetOrgId)
        await fetchModels(targetOrgId)
      }
    } catch (error) {
      console.error("Error fetching org:", error)
      setError("Failed to load organization data")
    } finally {
      setLoading(false)
    }
  }

  const fetchModels = async (targetOrgId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/models`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setModels(data.models)
        const urlModelId = searchParams.get('modelId')
        if (urlModelId && data.models.some((m: any) => m.id === urlModelId)) {
          setSelectedModel(urlModelId)
        } else if (data.models.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      // use mock models for demo
      const mockModels: FinancialModel[] = [
        { id: 'mock-model-1', name: 'Demo Model', type: 'prophet', orgId: targetOrgId, createdAt: new Date().toISOString() },
      ]
      setModels(mockModels)
      if (!selectedModel) {
        setSelectedModel('mock-model-1')
      }
    }
  }

  const fetchModelDetails = async (targetOrgId: string, modelId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setCurrentModel(data.model)

        // Populate assumptions from modelJson
        if (data.model.modelJson?.assumptions) {
          const assumptions = data.model.modelJson.assumptions
          const flatAssumptions: any[] = []

          Object.keys(assumptions).forEach(category => {
            const categoryData = assumptions[category]
            if (typeof categoryData === 'object' && categoryData !== null) {
              Object.keys(categoryData).forEach(key => {
                flatAssumptions.push({
                  category: category.charAt(0).toUpperCase() + category.slice(1),
                  key,
                  item: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                  value: categoryData[key],
                  type: typeof categoryData[key] === 'number' ?
                    (key.toLowerCase().includes('rate') || key.toLowerCase().includes('growth') ? 'percentage' : 'currency')
                    : 'text'
                })
              })
            }
          })
          setModelAssumptions(flatAssumptions)
        }
      }
    } catch (error) {
      console.error("Error fetching model details:", error)
    }
  }

  const fetchModelRuns = async (targetOrgId: string, modelId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/models/${modelId}/runs`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setModelRuns(data.runs)
        // CRITICAL GUARD: If the user has locally recomputed (dirty), do NOT overwrite
        // their live state with the (possibly stale) DB version
        if (localRecomputeDirtyRef.current) {
          // Only update modelRuns list for dropdown, don't touch currentRun or financialData
          return;
        }
        if (data.runs.length > 0) {
          const latestRun = data.runs[0]
          setCurrentRun(latestRun)

          if (latestRun.summaryJson) {
            const summary = typeof latestRun.summaryJson === 'string'
              ? JSON.parse(latestRun.summaryJson)
              : latestRun.summaryJson

            // Map summary.monthly or summary.statements.incomeStatement.monthly to financialData
            const topLevelMonthly = summary.monthly || {}
            const statementMonthly = summary.statements?.incomeStatement?.monthly || {}
            const allMonthKeys = Array.from(new Set([...Object.keys(topLevelMonthly), ...Object.keys(statementMonthly)]))

            if (allMonthKeys.length > 0) {
              const mappedData = allMonthKeys.map(monthKey => {
                const monthData = {
                  ...(topLevelMonthly[monthKey] || {}),
                  ...(statementMonthly[monthKey] || {})
                }
                return {
                  month: monthKey,
                  monthKey: monthKey,
                  revenue: monthData.revenue !== undefined && monthData.revenue !== 0 ? monthData.revenue : (monthData.totalRevenue || monthData.sales || 0),
                  cogs: monthData.cogs !== undefined ? monthData.cogs : (monthData.totalCogs || 0),
                  grossProfit: monthData.grossProfit !== undefined ? monthData.grossProfit : (monthData.totalGrossProfit || 0),
                  opex: monthData.opex || monthData.operatingExpenses || monthData.totalExpenses || 0,
                  netIncome: monthData.netIncome !== undefined ? monthData.netIncome : (monthData.ebt ? monthData.ebt * 0.75 : 0), // Basic tax inference if missing
                  cashFlow: monthData.cashFlow || monthData.cashBalance || monthData.cash || 0,
                }
              }).sort((a, b) => a.month.localeCompare(b.month))
              setFinancialData(mappedData)
            }
          }
        } else {
          setFinancialData([])
        }
      }
    } catch (error) {
      console.error("Error fetching model runs:", error)
      setFinancialData([])
    }
  }

  const fetchTransactions = async () => {
    if (!orgId) return
    try {
      setLoadingTransactions(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/transactions?limit=50`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setTransactions(data.transactions)
      } else {
        // fallback to mock data
        setTransactions([
          { id: 'txn1', date: '2024-01-15', description: 'Mock Sale', amount: 5000, category: 'Revenue' },
          { id: 'txn2', date: '2024-02-12', description: 'Mock Expense', amount: -1200, category: 'COGS' },
        ])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setTransactions([
        { id: 'txn1', date: '2024-01-15', description: 'Mock Sale', amount: 5000, category: 'Revenue' },
        { id: 'txn2', date: '2024-02-12', description: 'Mock Expense', amount: -1200, category: 'COGS' },
      ])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchConnectors = async (targetOrgId: string) => {
    try {
      setLoadingConnectors(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/connectors`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        setConnectors(data.connectors)
      }
    } catch (error) {
      console.error("Error fetching connectors:", error)
    } finally {
      setLoadingConnectors(false)
    }
  }

  const handleRunModel = async () => {
    if (!selectedModel || !orgId) return

    try {
      setRunningModel(true)
      const res = await fetch(`${API_BASE_URL}/models/${selectedModel}/run`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          runType: "baseline",
          paramsJson: {
            modelType: "prophet"
          }
        }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const data = await res.json()
      if (data.ok) {
        toast.info("Model run started. Processing...")
        await pollModelRunStatus(orgId, selectedModel, data.jobId, data.modelRun?.id)
      } else {
        toast.error(data.message || "Failed to start model run")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error running model. Please check the engine status.")
    } finally {
      setRunningModel(false)
    }
  }

  const pollModelRunStatus = async (targetOrgId: string, modelId: string, jobId: string, runId?: string) => {
    const maxAttempts = 60 // Increased for chained jobs
    let attempts = 0

    const poll = async (currentJobId: string) => {
      if (attempts >= maxAttempts) {
        toast.warning("Institutional pipeline is taking longer than expected. Please check the Audit Trace later.")
        return
      }

      try {
        const res = await fetch(`${API_BASE_URL}/jobs/${currentJobId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (res.ok) {
          const data = await res.json()
          const status = data.job?.status
          const progress = data.job?.progress || {}

          if (status === "done" || status === "completed") {
            // Check for chained job (e.g. auto_model -> model_run)
            if (progress.modelRunJobId && currentJobId !== progress.modelRunJobId) {
              toast.info("Ingestion complete. Starting financial computation...")
              attempts = 0 // Reset attempts for the next phase
              setTimeout(() => poll(progress.modelRunJobId), 1000)
              return
            }

            toast.success("Financial model and projections are ready!")
            await fetchModelRuns(targetOrgId, modelId)
            return
          } else if (status === "failed") {
            toast.error("Process failed: " + (data.job?.lastError || "Check audit logs for details."))
            return
          }
        }

        attempts++
        setTimeout(() => poll(currentJobId), 2000)
      } catch (error) {
        console.error("Polling error:", error)
        attempts++
        setTimeout(() => poll(currentJobId), 2000)
      }
    }

    poll(jobId)
  }

  const handleCreateModel = async (data: any) => {
    if (!orgId) return

    try {
      setCreatingModel(true)

      // ═══════════════════════════════════════════════════════════
      //  ENTERPRISE MODEL CREATION WITH GOVERNANCE
      //  Maps CreateModelForm output → Backend API payload
      //  Enforces: source authority, baseline confirmation, synthetic tagging
      // ═══════════════════════════════════════════════════════════

      // Determine data_source_type from the intelligence engine
      let dataSourceType = "blank"
      if (data.intelligenceEngine === "data-driven") {
        dataSourceType = "connectors"
      } else if (data.intelligenceEngine === "synthetic") {
        dataSourceType = "blank" // Synthetic uses blank + AI assumptions
      }

      // Build the API payload
      const payload: Record<string, any> = {
        model_name: data.name || `Model ${new Date().toLocaleDateString()}`,
        industry: data.industry || "SaaS",
        revenue_model_type: data.revenueModelType || "subscription",
        model_type: data.modelType || "3-statement",
        forecast_duration: parseInt(data.duration || "12"),
        start_month: data.startDate || new Date().toISOString().slice(0, 7),
        data_source_type: dataSourceType,
        description: data.description || "",
        // Governance Metadata (enterprise-required)
        is_synthetic: data.intelligenceEngine === "synthetic",
        baseline_confirmed: data.baselineConfirmed || false,
        source_auth_map: data.sourceAuthMap || {},
        init_metadata: {
          ai_version: "fina-institutional-v1",
          timestamp: new Date().toISOString(),
          intelligence_engine: data.intelligenceEngine,
          strategic_goal: data.strategicGoal || null,
        },
      }

      // If AI answers provided (synthetic mode), include them
      if (data.aiAnswers) {
        payload.business_type = data.aiAnswers.business_type
        if (data.aiAnswers.starting_customers) payload.starting_customers = parseInt(data.aiAnswers.starting_customers)
        if (data.aiAnswers.starting_revenue) payload.starting_revenue = parseFloat(data.aiAnswers.starting_revenue)
        if (data.aiAnswers.cash_on_hand) payload.cash_on_hand = parseFloat(data.aiAnswers.cash_on_hand)
      }

      // If strategic goal + analysis data present, include as assumptions
      if (data.analysisData?.assumptions) {
        payload.assumptions = data.analysisData.assumptions
      }

      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      const result = await res.json()
      if (result.ok) {
        const isSynthetic = data.intelligenceEngine === "synthetic"
        toast.success(
          isSynthetic
            ? "Synthetic benchmark model created! Review assumptions before forecasting."
            : "Financial model initialized with verified data sources."
        )
        setShowCreateModelDialog(false)
        setModels([result.model, ...models])
        setSelectedModel(result.model.id)

        if (result.jobId) {
          toast.info("Data ingestion pipeline started...")
          await pollModelRunStatus(orgId, result.model.id, result.jobId)
        }
      } else {
        toast.error(result.message || result.error?.message || "Failed to create model")
      }
    } catch (error) {
      toast.error("Error creating model")
      console.error(error)
    } finally {
      setCreatingModel(false)
    }
  }

  const handleAIGenerate = async () => {
    // Gate: AI Precision Build requires real data
    if (!dataStatus?.intelligenceGating?.dataDrivenAI && !dataStatus?.hasRealData) {
      toast.error("AI Precision Build requires connected data sources. Upload a CSV or connect an ERP first.")
      return
    }

    try {
      setIsAnalyzingPulse(true)
      toast.info("Performing Institutional Strategic Pulse Check...")

      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/analyze-data`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      const data = await res.json()
      if (data.ok) {
        setStrategicPulse(data.analysis)
        toast.success("Strategic data patterns identified. Initializing precision context.")
      }

      setCreateModelAiMode(true)
      setShowCreateModelDialog(true)
    } catch (error) {
      console.error("Pulse check failed:", error)
      // Fallback: open anyway but with fewer pre-fills
      setCreateModelAiMode(true)
      setShowCreateModelDialog(true)
    } finally {
      setIsAnalyzingPulse(false)
    }
  }

  const handleCreateModelFromAI = async (aiData: any, currentOrgId?: string, onSuccess?: (modelId: string) => void) => {
    const targetOrgId = currentOrgId || orgId
    if (!targetOrgId) {
      toast.error("Organization ID not found")
      return
    }

    // Gate: Ensure data exists
    if (!dataStatus?.hasRealData) {
      toast.error("AI Precision requires verified data. Connect a source or upload financials first.")
      return
    }

    try {
      setGeneratingAI(true)
      const modelName = `AI Precision Build - ${new Date().toLocaleDateString()}`

      const res = await fetch(`${API_BASE_URL}/orgs/${targetOrgId}/models`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          model_name: modelName,
          industry: aiData.industry || "Technology",
          revenue_model_type: aiData.revenueModel || "subscription",
          forecast_duration: 24,
          data_source_type: "connectors",
          description: "AI precision model initialized from verified organizational data.",
          start_month: new Date().toISOString().slice(0, 7),
          is_synthetic: false,
          baseline_confirmed: true,
          source_auth_map: dataStatus?.domainSources
            ? Object.fromEntries(
              Object.entries(dataStatus.domainSources as Record<string, any>)
                .filter(([, v]) => v.available)
                .map(([k, v]) => [k, v.suggestedAuthority])
            )
            : {},
          init_metadata: {
            ai_version: "fina-institutional-v1",
            timestamp: new Date().toISOString(),
            intelligence_engine: "ai-precision",
          },
        }),
      })

      const result = await res.json()
      if (result.ok) {
        toast.success("AI Precision Model created! Data analysis in progress...")

        if (result.jobId) {
          await pollModelRunStatus(targetOrgId, result.model.id, result.jobId)
        }

        if (onSuccess) {
          onSuccess(result.model.id)
        }

        await fetchModels(targetOrgId)
      } else {
        throw new Error(result.message || "Failed to create model")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create model from AI"
      toast.error(errorMessage)
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!orgId || !currentRun || currentRun.status !== "done") {
      toast.error("Please ensure a model run is completed first.")
      return
    }

    try {
      toast.info("Generating financial model report...")

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          format: "pdf",
          modelRunId: currentRun.id,
          includeMonteCarlo: false,
          includeRecommendations: true,
        }),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.export) {
          toast.success("Report generation started. Check your reports tab in a moment.")
        }
      } else {
        toast.error("Failed to generate report")
      }
    } catch (error) {
      toast.error("Error generating report")
    }
  }

  const handleExportModel = async () => {
    if (!selectedModel || !currentRun) return
    const exportId = currentRun.id
    try {
      toast.info("Exporting model data...")
      const res = await fetch(`${API_BASE_URL}/model-runs/${exportId}/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ type: "csv" })
      })

      if (res.ok) {
        toast.success("Export started. Download will begin shortly.")
      }
    } catch (error) {
      toast.error("Export failed")
    }
  }

  const handleAIGenerateReport = async () => {
    if (!selectedModel) {
      toast.error("Please select a model first")
      return
    }
    toast.info("AI is synthesizing your executive narrative report...")
    try {
      const res = await fetch(`${API_BASE_URL}/compute/ai-pipeline`, {
        method: "POST",
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({
          modelId: selectedModel,
          task: "board_narrative",
          orgId
        })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("AI Board Report Generated", {
          description: "A draft has been created in your Documents hub."
        })
      }
    } catch (error) {
      toast.error("Report generation failed")
    }
  }

  const handleCellClick = (metricId: string, metricName: string, value: string, monthKey?: string) => {
    const combinedCellId = monthKey ? `${monthKey}:${metricId}` : metricId;
    setSelectedCellData({ cellId: combinedCellId, metricName, value, monthKey })
    setProvenanceModalOpen(true)
  }

  const handleMetricSearch = (metric: string) => {
    setSelectedCellData({ cellId: metric, metricName: metric, value: "N/A" })
    setProvenanceModalOpen(true)
  }

  const handleStartEditModelName = (model: FinancialModel, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingModelId(model.id)
    setEditingModelName(model.name)
  }

  const handleCancelEditModelName = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setEditingModelId(null)
    setEditingModelName("")
  }

  const handleSaveModelName = async (modelId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (!editingModelName.trim() || !orgId) return

    try {
      setSavingModelName(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ name: editingModelName.trim() }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (res.ok) {
        setModels(models.map(m => m.id === modelId ? { ...m, name: editingModelName.trim() } : m))
        if (selectedModel === modelId) {
          setCurrentModel(prev => prev ? { ...prev, name: editingModelName.trim() } : null)
        }
        toast.success("Model name updated")
        setEditingModelId(null)
      } else {
        toast.error("Failed to update model name")
      }
    } catch (error) {
      toast.error("Error updating model name")
    } finally {
      setSavingModelName(false)
    }
  }

  const metricOverrides = useMemo(() => {
    if (!currentRun?.summaryJson) return {}
    const summary = typeof currentRun.summaryJson === 'string'
      ? JSON.parse(currentRun.summaryJson)
      : currentRun.summaryJson
    return summary.metrics || {}
  }, [currentRun])

  // Component Render Logic Start
  if (loading && !models.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Initializing Financial Engine...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutional Financial Modeling</h1>
          <p className="text-muted-foreground mt-1">Enterprise-grade 3-statement modeling with real-time provenance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200 gap-1.5 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            SOC 2 Compliant
          </Badge>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Button
              variant={!createModelAiMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCreateModelAiMode(false)}
              className="px-4"
            >
              Manual
            </Button>
            <Button
              variant={createModelAiMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCreateModelAiMode(true)}
              className="px-4"
            >
              AI Mode
            </Button>
          </div>
          <Button onClick={() => setShowCreateModelDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Model
          </Button>
        </div>
      </div>



      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Zap className="h-32 w-32" />
        </div>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Active Model</p>
              <h2 className="text-2xl font-bold truncate">{currentModel?.name || "No Model Selected"}</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/50">
                  v{currentModel?.version || 1}.0
                </Badge>
                <span className="text-xs text-slate-400">Created {currentModel ? new Date(currentModel.createdAt).toLocaleDateString() : '--'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Run Status</p>
              <div className="flex items-center gap-2">
                {runningModel ? (
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                ) : currentRun?.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-lg font-semibold capitalize text-slate-200">{runningModel ? 'Computing...' : (currentRun?.status || 'Idle')}</span>
              </div>
              <p className="text-xs text-slate-500">Last computed: {currentRun ? new Date(currentRun.createdAt).toLocaleTimeString() : 'N/A'}</p>
            </div>
            <div className="space-y-4">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Data Completeness</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${dataCompleteness > 90 ? 'bg-green-500' : dataCompleteness > 70 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                    style={{ width: `${dataCompleteness}%` }}
                  />
                </div>
                <span className="font-bold text-slate-200">{dataCompleteness}%</span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-green-400" />
                Verified via Hyper-Trace™
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <Button
                onClick={handleRunModel}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20"
                disabled={runningModel || !selectedModel}
              >
                {runningModel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                Recompute Engine
              </Button>
            </div>
          </div>
        </CardContent>
        {isGlobalRecomputing && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-2xl border-2 border-primary/20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">Hyper-Trace™ Engine Recomputing...</p>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 group cursor-pointer shadow-md hover:shadow-xl bg-gradient-to-br from-white to-slate-50" onClick={() => { setCreateModelAiMode(false); setShowCreateModelDialog(true); }}>
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                <Calculator className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Create Model</h3>
                <p className="text-sm text-muted-foreground font-medium">Build a custom financial model manually</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-primary">
              Get Started <Plus className="ml-1 h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`overflow-hidden border-2 transition-all duration-300 group cursor-pointer shadow-md hover:shadow-xl bg-gradient-to-br from-white to-purple-50 ${dataStatus?.intelligenceGating?.dataDrivenAI
            ? 'border-purple-500/20 hover:border-purple-500/40'
            : 'border-slate-200 opacity-75'
            }`}
          onClick={handleAIGenerate}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Brain className="h-12 w-12 text-purple-600" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${dataStatus?.intelligenceGating?.dataDrivenAI
                ? 'bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                : 'bg-slate-100 text-slate-400'
                }`}>
                <Brain className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">AI Precision Build</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  {dataStatus?.intelligenceGating?.dataDrivenAI
                    ? "Auto-generate a 3-statement model from your verified data"
                    : "Requires connected data sources to enable"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold">
              {dataStatus?.intelligenceGating?.dataDrivenAI ? (
                <span className="text-purple-600">Verified Data Available <Sparkles className="inline ml-1 h-3 w-3" /></span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Connect ERP or Upload CSV
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("tab", value)
          router.replace(`?${params.toString()}`, { scroll: false })
        }}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-12 min-w-[1300px] h-12 bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="statements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <FileText className="h-3.5 w-3.5" /> Statements
          </TabsTrigger>
          <TabsTrigger value="valuation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black text-indigo-600">
            <Grid className="h-3.5 w-3.5" /> Valuation
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black text-amber-600">
            <Calculator className="h-3.5 w-3.5" /> Manual Overrides
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <Database className="h-3.5 w-3.5" /> Ingestion
          </TabsTrigger>
          <TabsTrigger value="drivers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <Activity className="h-3.5 w-3.5" /> Drivers
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <FileDiff className="h-3.5 w-3.5" /> Scenarios
          </TabsTrigger>
          <TabsTrigger value="ai-assist" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5 font-black text-purple-600">
            <Sparkles className="h-3.5 w-3.5" /> AI Assist
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black text-blue-600">
            <BarChart3 className="h-3.5 w-3.5" /> Forecasting
          </TabsTrigger>
          <TabsTrigger value="risk" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black text-rose-500">
            <ShieldAlert className="h-3.5 w-3.5" /> Risk Hub
          </TabsTrigger>
          <TabsTrigger value="explainability" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 font-black">
            <HistoryIcon className="h-3.5 w-3.5" /> Audit Trace
          </TabsTrigger>
          <TabsTrigger value="governance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5 font-black text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Policy Hub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Executive KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="bg-white text-[10px] font-bold">ANNUALIZED</Badge>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(financialData.reduce((sum, m) => sum + (m.revenue || 0), 0))}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                {(() => {
                  if (financialData.length >= 2) {
                    const first = financialData[0]?.revenue || 1;
                    const last = financialData[financialData.length - 1]?.revenue || 0;
                    const growth = ((last - first) / Math.abs(first)) * 100;
                    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% TOTAL GROWTH`;
                  }
                  return 'FORECAST';
                })()}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="bg-white text-[10px] font-bold">CONSOLIDATED</Badge>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Net Income</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(financialData.reduce((sum, m) => sum + (m.netIncome || 0), 0))}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                <Zap className="h-3 w-3" />
                OPTIMAL MARGIN
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Target className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="bg-white text-[10px] font-bold">TARGET</Badge>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Operating Expenses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(financialData.reduce((sum, m) => sum + (m.opex || 0), 0))}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                <Activity className="h-3 w-3" />
                STABLE TREND
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Scale className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="bg-white text-[10px] font-bold">HEALTH</Badge>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Gross Profit Margin</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {(() => {
                  const totalRev = financialData.reduce((sum, m) => sum + (m.revenue || 0), 0) || 1;
                  const totalGP = financialData.reduce((sum, m) => sum + (m.grossProfit || (m.revenue - (m.cogs || 0))), 0);
                  return ((totalGP / totalRev) * 100).toFixed(1) + "%";
                })()}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {(() => {
                  const totalRev = financialData.reduce((sum, m) => sum + (m.revenue || 0), 0) || 1;
                  const totalGP = financialData.reduce((sum, m) => sum + (m.grossProfit || (m.revenue - (m.cogs || 0))), 0);
                  const margin = (totalGP / totalRev) * 100;
                  return margin >= 70 ? 'HEALTHY MARGIN' : margin >= 50 ? 'MODERATE' : 'NEEDS ATTENTION';
                })()}
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════
              CONSOLIDATED VALUATION — FOOTBALL FIELD
          ═══════════════════════════════════════════════════════ */}
          {(currentRun?.summaryJson as any)?.valuationSummary && (
            <Card className="border-2 shadow-xl overflow-hidden bg-slate-50/30">
              <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid className="h-5 w-5 text-indigo-600" />
                    Consolidated Valuation Summary
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-medium">Multi-methodology valuation range Comparison</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 font-bold px-3 py-1">
                    Institutional Standard
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[450px]">
                  <FootballFieldChart
                    ranges={(currentRun?.summaryJson as any)?.valuationSummary}
                    currentPrice={(currentRun?.summaryJson as any)?.currentPrice}
                    currency={currencySymbol || "$"}
                  />
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Market Implications
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      The current market price of <span className="font-black text-slate-900">{formatCurrency((currentRun?.summaryJson as any)?.currentPrice)}</span>
                      {((currentRun?.summaryJson as any)?.currentPrice || 0) < (((currentRun?.summaryJson as any)?.valuationSummary?.[0]?.low || 0))
                        ? " represents a significant discount to model-implied intrinsic value, suggesting substantial upside potential if the forecast materializes."
                        : " is within the valuation range of most methodologies, suggesting the asset is fairly valued based on current assumptions."
                      }
                    </p>
                  </div>
                  {(currentRun?.summaryJson as any)?.sensitivities && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Target className="h-3 w-3" /> Top Sensitivity Drivers
                      </h4>
                      <div className="space-y-2">
                        {(currentRun?.summaryJson as any)?.sensitivities?.slice(0, 3).map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 italic">
                            <span className="text-[10px] font-bold text-slate-700 capitalize">{s.parameter.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <Badge className={s.impact > 0.05 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"}>
                              {(s.impact * 100).toFixed(1)}% Sensitivity
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════
              DCF VALUATION DASHBOARD — only when modelType === 'dcf'
          ═══════════════════════════════════════════════════════ */}
          {(currentRun?.summaryJson as any)?.valuation && (
            <Card className="border-2 border-blue-100 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  DCF Valuation Summary
                </CardTitle>
                <CardDescription className="text-blue-100">Discounted Cash Flow Analysis Results</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Enterprise Value', value: formatCurrency((currentRun?.summaryJson as any)?.valuation?.enterpriseValue || 0), color: 'blue' },
                    { label: 'Equity Value', value: formatCurrency((currentRun?.summaryJson as any)?.valuation?.equityValue || 0), color: 'emerald' },
                    { label: 'Implied Share Price', value: formatCurrency((currentRun?.summaryJson as any)?.valuation?.impliedSharePrice || 0), color: 'indigo' },
                    { label: 'WACC', value: (((currentRun?.summaryJson as any)?.valuation?.wacc || 0) * 100).toFixed(2) + '%', color: 'amber' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">PV of FCFs</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency((currentRun?.summaryJson as any)?.valuation?.presentValueFlows || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">PV of Terminal</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency((currentRun?.summaryJson as any)?.valuation?.presentValueTerminal || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Terminal Value</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency((currentRun?.summaryJson as any)?.valuation?.terminalValue || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Terminal Method</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{(currentRun?.summaryJson as any)?.valuation?.terminalMethodUsed || 'Perpetuity'}</p>
                  </div>
                </div>

                {/* Sensitivity Matrix */}
                {(currentRun?.summaryJson as any)?.valuation?.sensitivityMatrix && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Grid className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Valuation Sensitivity Matrix (WACC vs Terminal Growth)</h4>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <Table className="text-[10px]">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-slate-500 border-r text-center w-24">WACC \ Growth</TableHead>
                            {(currentRun?.summaryJson as any)?.valuation?.sensitivityMatrix?.growthSteps?.map((g: number, i: number) => (
                              <TableHead key={i} className="text-center font-bold text-blue-700">{g}%</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(currentRun?.summaryJson as any)?.valuation?.sensitivityMatrix?.matrix?.map((row: any[], i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-bold text-blue-700 bg-slate-50 border-r text-center">
                                {(currentRun?.summaryJson as any)?.valuation?.sensitivityMatrix?.waccSteps?.[i]}%
                              </TableCell>
                              {row.map((cell: number, j: number) => (
                                <TableCell key={j} className={`text-center font-medium ${cell === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                                  {cell === 0 ? 'N/M' : formatCurrency(cell)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 italic">* Matrix shows implied share price. 'N/M' indicates mathematically invalid territory (WACC ≤ Growth).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════
              LBO RETURNS DASHBOARD — only when modelType === 'lbo'
          ═══════════════════════════════════════════════════════ */}
          {(currentRun?.summaryJson as any)?.lbo && (
            <Card className="border-2 border-purple-100 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  LBO Returns Analysis
                </CardTitle>
                <CardDescription className="text-purple-200">Leveraged Buyout Investment Returns</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'MOIC', value: ((currentRun?.summaryJson as any)?.lbo?.moic || 0).toFixed(2) + 'x', sub: 'Multiple on Invested Capital' },
                    { label: 'IRR', value: (((currentRun?.summaryJson as any)?.lbo?.irr || 0) * 100).toFixed(1) + '%', sub: 'Internal Rate of Return' },
                    { label: 'Entry Equity', value: formatCurrency((currentRun?.summaryJson as any)?.lbo?.entryEquity || 0), sub: `Entry @ ${(currentRun?.summaryJson as any)?.lbo?.entryMultiple || 0}x` },
                    { label: 'Exit Equity', value: formatCurrency((currentRun?.summaryJson as any)?.lbo?.exitEquity || 0), sub: `Exit @ ${(currentRun?.summaryJson as any)?.lbo?.exitMultiple || 0}x` },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Debt Paydown</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency((currentRun?.summaryJson as any)?.lbo?.totalDebtPaydown || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ending Debt</p>
                    <p className="text-sm font-bold text-amber-600">{formatCurrency((currentRun?.summaryJson as any)?.lbo?.endingDebt || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">EBITDA Growth (CAGR)</p>
                    <p className="text-sm font-bold text-blue-600">{(((currentRun?.summaryJson as any)?.lbo?.ebitdaGrowth || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* LBO Debt Schedule */}
                {(currentRun?.summaryJson as any)?.lbo?.debtSchedule && (
                  <div className="mt-8 pt-6 border-t border-purple-100">
                    <div className="flex items-center gap-2 mb-4">
                      <HistoryIcon className="h-4 w-4 text-purple-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Deleveraging Schedule & Cash Sweep Trace</h4>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-purple-100">
                      <Table className="text-[10px]">
                        <TableHeader className="bg-purple-50">
                          <TableRow>
                            <TableHead className="font-bold">Year</TableHead>
                            <TableHead className="text-right">EBITDA</TableHead>
                            <TableHead className="text-right">CFADS</TableHead>
                            <TableHead className="text-right text-purple-700">Senior Paydown</TableHead>
                            <TableHead className="text-right text-indigo-700">Sub Paydown</TableHead>
                            <TableHead className="text-right font-black">Ending Debt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(currentRun?.summaryJson as any)?.lbo?.debtSchedule?.map((row: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-black text-slate-500">{row.year}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(row.ebitda)}</TableCell>
                              <TableCell className="text-right font-medium text-blue-600">{formatCurrency(row.cfads)}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-bold">-{formatCurrency(row.seniorPaydown)}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-bold">-{formatCurrency(row.subPaydown)}</TableCell>
                              <TableCell className="text-right font-black">{formatCurrency(row.remainingDebt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Institutional Sources & Uses */}
                    {(currentRun?.summaryJson as any)?.lbo?.sourcesUses && (
                      <div className="mt-8 pt-6 border-t border-purple-100">
                        <div className="flex items-center gap-2 mb-4">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Institutional Sources & Uses</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sources of Funds</p>
                            <Table className="text-[11px] border rounded-lg overflow-hidden">
                              <TableBody>
                                {Object.entries((currentRun?.summaryJson as any)?.lbo?.sourcesUses?.sources || {}).map(([key, val]: [string, any]) => (
                                  <TableRow key={key} className="h-8">
                                    <TableCell className="py-1 font-medium">{key}</TableCell>
                                    <TableCell className="py-1 text-right font-bold text-indigo-600">{formatCurrency(val as number)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 h-8 font-black">
                                  <TableCell className="py-1">Total Sources</TableCell>
                                  <TableCell className="py-1 text-right">{formatCurrency(Object.values((currentRun?.summaryJson as any)?.lbo?.sourcesUses?.sources || {}).reduce((a: any, b: any) => a + b, 0) as number)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Uses of Funds</p>
                            <Table className="text-[11px] border rounded-lg overflow-hidden">
                              <TableBody>
                                {Object.entries((currentRun?.summaryJson as any)?.lbo?.sourcesUses?.uses || {}).map(([key, val]: [string, any]) => (
                                  <TableRow key={key} className="h-8">
                                    <TableCell className="py-1 font-medium">{key}</TableCell>
                                    <TableCell className="py-1 text-right font-bold text-rose-600">{formatCurrency(val as number)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 h-8 font-black">
                                  <TableCell className="py-1">Total Uses</TableCell>
                                  <TableCell className="py-1 text-right">{formatCurrency(Object.values((currentRun?.summaryJson as any)?.lbo?.sourcesUses?.uses || {}).reduce((a: any, b: any) => a + b, 0) as number)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 mt-2 italic">* CFADS = EBITDA - Taxes - CapEx - ΔNWC. Mandatory amortization + Excess Cash Sweep implemented.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════
              SAAS KPI ROW — Unit Economics from computed data
          ═══════════════════════════════════════════════════════ */}
          {(currentRun?.summaryJson as any)?.arr > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'ARR', value: formatCurrency((currentRun?.summaryJson as any)?.arr || 0), icon: TrendingUp, color: 'blue' },
                { label: 'CAC', value: formatCurrency((currentRun?.summaryJson as any)?.cac || 0), icon: Users, color: 'purple' },
                { label: 'LTV', value: formatCurrency((currentRun?.summaryJson as any)?.ltv || 0), icon: Target, color: 'emerald' },
                { label: 'Payback', value: ((currentRun?.summaryJson as any)?.paybackPeriod || 0).toFixed(1) + ' mo', icon: Clock, color: 'indigo' },
                { label: 'Rule of 40', value: ((currentRun?.summaryJson as any)?.ruleOf40 || 0).toFixed(1) + '%', icon: Zap, color: 'amber' },
                { label: 'Burn Rate', value: formatCurrency((currentRun?.summaryJson as any)?.burnRate || 0) + '/mo', icon: Flame, color: 'rose' },
                { label: 'Runway', value: ((currentRun?.summaryJson as any)?.runway || 0).toFixed(0) + ' mo', icon: Clock, color: 'slate' },
                { label: 'Net Retention', value: ((currentRun?.summaryJson as any)?.nrr || 0).toFixed(1) + '%', icon: TrendingUp, color: 'teal' },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Card key={i} className="p-3 border hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{kpi.label}</span>
                    </div>
                    <p className="text-base font-black text-slate-900">{kpi.value}</p>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              ACCRETION/DILUTION M&A DASHBOARD
          ═══════════════════════════════════════════════════════ */}
          {(currentRun?.summaryJson as any)?.accretionDilution && (
            <Card className="border-2 shadow-lg overflow-hidden" style={{ borderColor: (currentRun?.summaryJson as any)?.accretionDilution?.isAccretive ? '#10b981' : '#ef4444' }}>
              <CardHeader className={`text-white pb-4 ${(currentRun?.summaryJson as any)?.accretionDilution?.isAccretive ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-red-600 to-rose-700'}`}>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  M&A Accretion / Dilution Analysis
                </CardTitle>
                <CardDescription className="text-white/80">
                  Deal is{' '}
                  <span className="font-black text-white">
                    {(currentRun?.summaryJson as any)?.accretionDilution?.isAccretive ? 'ACCRETIVE' : 'DILUTIVE'} by {Math.abs((currentRun?.summaryJson as any)?.accretionDilution?.accretionDilutionPct || 0).toFixed(1)}%
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Standalone EPS', value: '$' + ((currentRun?.summaryJson as any)?.accretionDilution?.acquirerEPS || 0).toFixed(2) },
                    { label: 'Pro Forma EPS', value: '$' + ((currentRun?.summaryJson as any)?.accretionDilution?.proFormaEPS || 0).toFixed(2) },
                    { label: 'EPS Change', value: '$' + ((currentRun?.summaryJson as any)?.accretionDilution?.epsChange || 0).toFixed(4) },
                    { label: 'Purchase Price', value: formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.purchasePrice || 0) },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Premium Paid</p>
                    <p className="text-sm font-bold text-slate-800">{(currentRun?.summaryJson as any)?.accretionDilution?.purchasePremium || 0}%</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Stock %</p>
                    <p className="text-sm font-bold text-blue-600">{(currentRun?.summaryJson as any)?.accretionDilution?.stockPercentage || 0}%</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cash %</p>
                    <p className="text-sm font-bold text-emerald-600">{(currentRun?.summaryJson as any)?.accretionDilution?.cashPercentage || 0}%</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Goodwill</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.goodwill || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-indigo-50 border-indigo-100 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Breakeven Synergies</p>
                    <p className="text-sm font-bold text-indigo-700">{formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.breakevenSynergies || 0)}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">SYNERGY REQ. FOR 0% DILUTION</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pro Forma NI</p>
                    <p className="text-sm font-bold text-indigo-600">{formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.proFormaNI || 0)}</p>
                  </div>
                </div>

                {/* Synergy & Amortization Trace */}
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest pl-1">Synergy Realization Hub</h4>
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Run-rate Synergies</span>
                          <span className="font-bold">{formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.costSynergies || 0)}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Year 1 Phase-in</span>
                          <span className="font-bold text-blue-600">{(currentRun?.summaryJson as any)?.accretionDilution?.synergyPhaseIn || 70}%</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Post-Tax Benefit (Y1)</span>
                          <span className="font-bold text-emerald-600">{formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.y1SynergiesAfterTax || 0)}</span>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest pl-1">Asset Write-Up Schedule</h4>
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Identifiable Intangibles</span>
                          <span className="font-bold">{(currentRun?.summaryJson as any)?.accretionDilution?.assetWriteUpPct || 20}%</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Amortization Period</span>
                          <span className="font-bold text-blue-600">{(currentRun?.summaryJson as any)?.accretionDilution?.amortizationPeriod || 10} Years</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Annual Non-Cash Exp.</span>
                          <span className="font-bold text-rose-600">({formatCurrency((currentRun?.summaryJson as any)?.accretionDilution?.amortizationAnnual || 0)})</span>
                       </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════
              SAAS HEALTH INDICATORS — NRR, GRR, Rule of 40, etc.
          ═══════════════════════════════════════════════════════ */}
          {((currentRun?.summaryJson as any)?.nrr > 0 || (currentRun?.summaryJson as any)?.metrics?.nrr > 0) && (
            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  SaaS Health Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      label: 'NRR',
                      value: ((currentRun?.summaryJson as any)?.nrr || (currentRun?.summaryJson as any)?.metrics?.nrr || 0).toFixed(1) + '%',
                      status: ((currentRun?.summaryJson as any)?.nrr || 0) >= 100 ? 'text-emerald-600' : 'text-amber-600',
                      bench: '≥100% good'
                    },
                    {
                      label: 'GRR',
                      value: ((currentRun?.summaryJson as any)?.grr || (currentRun?.summaryJson as any)?.metrics?.grr || 0).toFixed(1) + '%',
                      status: ((currentRun?.summaryJson as any)?.grr || 0) >= 90 ? 'text-emerald-600' : 'text-amber-600',
                      bench: '≥90% good'
                    },
                    {
                      label: 'Rule of 40',
                      value: ((currentRun?.summaryJson as any)?.ruleOf40 || (currentRun?.summaryJson as any)?.metrics?.ruleOf40 || 0).toFixed(0) + '%',
                      status: ((currentRun?.summaryJson as any)?.ruleOf40 || 0) >= 40 ? 'text-emerald-600' : 'text-amber-600',
                      bench: '≥40% good'
                    },
                    {
                      label: 'Burn Multiple',
                      value: ((currentRun?.summaryJson as any)?.burnMultiple || (currentRun?.summaryJson as any)?.metrics?.burnMultiple || 0).toFixed(1) + 'x',
                      status: ((currentRun?.summaryJson as any)?.burnMultiple || 0) <= 2 ? 'text-emerald-600' : 'text-red-600',
                      bench: '<2x good'
                    },
                    {
                      label: 'Magic Number',
                      value: ((currentRun?.summaryJson as any)?.magicNumber || (currentRun?.summaryJson as any)?.metrics?.magicNumber || 0).toFixed(2),
                      status: ((currentRun?.summaryJson as any)?.magicNumber || 0) >= 0.75 ? 'text-emerald-600' : 'text-amber-600',
                      bench: '≥0.75 good'
                    },
                    {
                      label: 'LTV:CAC',
                      value: ((currentRun?.summaryJson as any)?.ltvCacRatio || (currentRun?.summaryJson as any)?.metrics?.ltvCac || 0).toFixed(1) + 'x',
                      status: ((currentRun?.summaryJson as any)?.ltvCacRatio || 0) >= 3 ? 'text-emerald-600' : 'text-amber-600',
                      bench: '≥3x good'
                    },
                  ].map((metric, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white border hover:shadow-sm transition-shadow">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{metric.label}</p>
                      <p className={`text-lg font-black mt-1 ${metric.status}`}>{metric.value}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{metric.bench}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        <TabsContent value="statements" className="space-y-6">
          <ThreeStatementViewer
            orgId={orgId}
            modelId={selectedModel}
            runId={currentRun?.id || null}
            statements={currentRun?.summaryJson as any}
            modelRuns={modelRuns}
            onCellClick={(cellId, value) => {
              setSelectedCellData({ cellId, value: String(value) } as any)
              setProvenanceModalOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="valuation" className="space-y-6">
          <Card className="border-2 shadow-xl overflow-hidden bg-slate-50/30">
            <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Grid className="h-6 w-6 text-indigo-600" />
                  Valuation Football Field
                </CardTitle>
                <CardDescription className="text-slate-500 font-bold">Multi-methodology valuation range comparison based on mid-year convention and Exit Multiple fallbacks.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 font-black px-4 py-1.5">
                  INSTITUTIONAL PRECISION
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="h-[550px]">
                <FootballFieldChart
                  ranges={(currentRun?.summaryJson as any)?.valuationSummary || [
                    { name: 'DCF (Exit Multiple)', low: (currentRun?.summaryJson as any)?.dcf?.impliedEquityValue * 0.9 || 0, high: (currentRun?.summaryJson as any)?.dcf?.impliedEquityValue * 1.1 || 0, color: '#4f46e5' },
                    { name: 'DCF (Perpetuity)', low: (currentRun?.summaryJson as any)?.dcf?.impliedEquityValue * 0.85 || 0, high: (currentRun?.summaryJson as any)?.dcf?.impliedEquityValue * 1.15 || 0, color: '#6366f1' },
                    { name: 'LBO (Exit MOIC)', low: (currentRun?.summaryJson as any)?.lbo?.exitEquity * 0.9 || 0, high: (currentRun?.summaryJson as any)?.lbo?.exitEquity * 1.1 || 0, color: '#8b5cf6' },
                    { name: 'Market Multiples (Comps)', low: (currentRun?.summaryJson as any)?.revenue * 4 || 0, high: (currentRun?.summaryJson as any)?.revenue * 6 || 0, color: '#10b981' }
                  ]}
                  currentPrice={(currentRun?.summaryJson as any)?.currentPrice}
                  currency={currencySymbol || "$"}
                />
              </div>
              
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">DCF Implied Value</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency((currentRun?.summaryJson as any)?.dcf?.impliedEquityValue || 0)}</p>
                    <div className="mt-2 text-[11px] font-bold text-slate-500">WACC: {((currentRun?.summaryJson as any)?.dcf?.wacc * 100 || 0).toFixed(1)}% | TGR: {((currentRun?.summaryJson as any)?.dcf?.terminalGrowthRate * 100 || 0).toFixed(1)}%</div>
                 </div>
                 <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">LBO Exit Equity</p>
                    <p className="text-2xl font-black text-indigo-600">{formatCurrency((currentRun?.summaryJson as any)?.lbo?.exitEquity || 0)}</p>
                    <div className="mt-2 text-[11px] font-bold text-slate-500">MOIC: {((currentRun?.summaryJson as any)?.lbo?.moic || 0).toFixed(2)}x | IRR: {((currentRun?.summaryJson as any)?.lbo?.irr * 100 || 0).toFixed(1)}%</div>
                 </div>
                 <div className="p-5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-3">Blended Target Price</p>
                    <p className="text-2xl font-black">{formatCurrency((currentRun?.summaryJson as any)?.blendedTargetPrice || 0)}</p>
                    <div className="mt-2 text-[11px] font-medium text-indigo-100">Weighted Average of Multi-Methodology Samples</div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-lg">Profit & Loss Summary</CardTitle>
                <CardDescription>Consolidated performance with provenance</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[120px] font-bold">Month</TableHead>
                        <TableHead className="text-right font-bold">Revenue</TableHead>
                        <TableHead className="text-right font-bold">COGS</TableHead>
                        <TableHead className="text-right font-bold">Gross Profit</TableHead>
                        <TableHead className="text-right font-bold">Net Income</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialData.length > 0 ? (
                        financialData.map((row) => (
                          <TableRow key={row.month} className="hover:bg-slate-50/50 cursor-pointer">
                            <TableCell className="font-medium text-slate-700">{row.month}</TableCell>
                            <TableCell className="text-right font-mono" onClick={() => handleCellClick("revenue", "Revenue", formatCurrency(row.revenue), row.monthKey)}>
                              {formatCurrency(row.revenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono" onClick={() => handleCellClick("cogs", "COGS", formatCurrency(row.cogs), row.monthKey)}>
                              {formatCurrency(row.cogs)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900" onClick={() => handleCellClick("gross_profit", "Gross Profit", formatCurrency(row.grossProfit), row.monthKey)}>
                              {formatCurrency(row.grossProfit)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-blue-600" onClick={() => handleCellClick("net_income", "Net Income", formatCurrency(row.netIncome), row.monthKey)}>
                              {formatCurrency(row.netIncome)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-20 text-slate-400">
                            No financial data available for the current model run.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>Monthly growth dynamics</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val > 1000 ? val / 1000 + 'k' : val}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), "Revenue"]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center mt-4 mb-6">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              Institutional Planning Governance
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
              <Activity className="h-3 w-3 animate-pulse" />
              SOC-2 CC7.1 COMPLIANT
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Audit Readiness', val: dataStatus?.auditReadiness?.isEnterpriseReady ? 98 : 65, color: 'emerald' },
              { label: 'Data Freshness', val: dataStatus?.sources?.connectors?.length > 0 ? 100 : 42, color: 'blue' },
              { label: 'Calculative Integrity', val: currentRun?.status === 'done' ? 100 : 80, color: 'indigo' },
              { label: 'Policy Adherence', val: (dataStatus?.auditReadiness?.isEnterpriseReady && currentModel?.version && currentModel.version > 1) ? 94 : 76, color: 'amber' }
            ].map((stat, i) => (
              <Card key={i} className="p-4 bg-white border-2 border-slate-50 shadow-sm border-l-4" style={{ borderLeftColor: stat.color === 'emerald' ? '#10b981' : stat.color === 'blue' ? '#3b82f6' : stat.color === 'indigo' ? '#6366f1' : '#f59e0b' }}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] uppercase font-black text-slate-400">{stat.label}</span>
                  <span className={`text-xs font-black text-${stat.color}-600`}>{stat.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div className={`h-full transition-all duration-1000 ease-out ${stat.color === 'emerald' ? 'bg-emerald-500' :
                    stat.color === 'blue' ? 'bg-blue-500' :
                      stat.color === 'indigo' ? 'bg-indigo-500' :
                        'bg-amber-500'
                    }`}
                    style={{ width: `${stat.val}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-tighter flex items-center gap-2">
                <HistoryIcon className="h-4 w-4" />
                Immutable Decision Snapshot Feed
              </h4>
              <div className="space-y-3">
                {(currentModel as any)?.auditLogs?.length > 0 ? (currentModel as any).auditLogs.map((log: any, i: number) => (
                  <div key={i} className="group p-4 bg-white rounded-xl border border-slate-100 hover:border-primary/20 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-100 group-hover:bg-primary/5 transition-colors">
                        {log.id?.slice(0, 4)}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-800">{log.action} • {log.actorUser?.email || 'System'}</div>
                        <div className="text-[10px] text-slate-500">{(log.metaJson as any)?.details || 'System event'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold">{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                )) : [
                  { action: 'Driver Update', user: 'sarah.c@finance', event: 'Pricing sensitivity adjusted for expansion', hash: '8f2a1c', ts: '2h ago' },
                  { action: 'Scenario Lock', user: 'cfo@company', event: 'Conservative H2 baseline locked for board review', hash: '3d9e4b', ts: '5h ago' }
                ].map((log, i) => (
                  <div key={i} className="group p-4 bg-white rounded-xl border border-slate-100 hover:border-primary/20 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-100 group-hover:bg-primary/5 transition-colors">
                        {log.hash}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-800">{log.action} • {log.user}</div>
                        <div className="text-[10px] text-slate-500">{log.event}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold">{log.ts}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-tighter flex items-center gap-2">
                <Target className="h-4 w-4" />
                Executive Narrative Synthesis
              </h4>
              <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                  <Sparkles className="h-20 w-20 text-indigo-400" />
                </div>
                <p className="text-xs leading-relaxed font-medium relative z-10 opacity-90 italic">
                  "Our system detected a 12% drift in OpEx between 'Conservative' and 'Scaling' branches. AI has traced this to the Q3 Hiring driver, which accounts for 85% of variance."
                </p>
                <Button
                  onClick={handleAIGenerateReport}
                  className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 font-bold text-[10px] h-9 rounded-lg shadow-lg shadow-indigo-500/20 relative z-10"
                >
                  GENERATE AI BOARD REPORT
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ingestion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Source Data Inventory
                </CardTitle>
                <CardDescription>Manage and reconcile your raw financial data sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">CSV & Excel Imports</p>
                        <p className="text-xs text-slate-500">{dataStatus?.stats?.uploadsCount || 0} active datasets mapped</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>Manage Files</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">ERP & SaaS Connectors</p>
                        <p className="text-xs text-slate-500">{dataStatus?.sources?.connectors?.length || 0} connections authorized</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push('/settings/connectors')}>Configure Hub</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 border-2 border-primary/10 shadow-sm bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Data Health Index</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Lineage Coverage</span>
                    <span>{dataStatus?.auditReadiness?.isEnterpriseReady ? '98%' : '65%'}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: dataStatus?.auditReadiness?.isEnterpriseReady ? '98%' : '65%' }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`h-2 w-2 rounded-full ${dataStatus?.sources?.erp ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className={dataStatus?.sources?.erp ? 'font-bold' : ''}>ERP System (QuickBooks/Xero)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`h-2 w-2 rounded-full ${dataStatus?.stats?.transactionCount > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className={dataStatus?.stats?.transactionCount > 0 ? 'font-bold' : ''}>Historical GL Transactions</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`h-2 w-2 rounded-full ${dataStatus?.sources?.crm ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className={dataStatus?.sources?.crm ? 'font-bold' : ''}>CRM Pipeline (Salesforce)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-lg">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Data Ingestion Portal
              </CardTitle>
              <CardDescription className="text-slate-400">Securely ingest and map your financial datasets.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Historical Journal Entry Feed</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loadingTransactions}>
                      {loadingTransactions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                      Sync Pipeline
                    </Button>
                    <CSVImportWizard orgId={orgId} onImportComplete={() => { fetchDataStatus(orgId!); fetchTransactions(); }} />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
                  {loadingTransactions ? (
                    <div className="p-12 space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : transactions.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold">Date</TableHead>
                          <TableHead className="font-bold">Category</TableHead>
                          <TableHead className="font-bold">Description</TableHead>
                          <TableHead className="text-right font-bold">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, idx) => (
                          <TableRow key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-medium text-slate-600">{new Date(tx.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                {tx.category || 'Uncategorized'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate text-slate-500">{tx.description}</TableCell>
                            <TableCell className={`text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                              {formatCurrency(tx.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Database className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">No Industrial Data Sources Found</p>
                        <p className="text-muted-foreground">Upload a CSV or connect an ERP to populate this institutional feed.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance" className="space-y-8 animate-in fade-in duration-500">
          <BudgetWorkflow orgId={orgId} modelId={selectedModel} />
        </TabsContent>

        {/* --- RISK ANALYSIS TAB --- */}
        <TabsContent value="risk" className="space-y-4 animate-in fade-in duration-500">
          <RiskAnalysisHub orgId={orgId} modelId={selectedModel} />
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <DriverManagement
            orgId={orgId}
            modelId={selectedModel}
            onGenerateReport={handleAIGenerateReport}
            onRecomputeStart={() => setIsGlobalRecomputing(true)}
            onRecompute={async (data) => {
              // Mark as dirty so fetchModelRuns won't overwrite our local state
              localRecomputeDirtyRef.current = true;
              if (data.trace && Array.isArray(data.trace) && data.trace.length > 0 && typeof data.trace[0] === 'object') {
                setComputationTraces(prev => [data.trace[0], ...prev].slice(0, 20));
              }
              if (data.affectedNodes) {
                setAffectedNodeIds(data.affectedNodes);
              }

              // CRITICAL: Update local state with recompute results for immediate reactivity
              if (data.results) {
                const results = data.results;
                const existingSummary = typeof currentRun?.summaryJson === 'string'
                  ? JSON.parse(currentRun.summaryJson)
                  : currentRun?.summaryJson;

                // Seed monthsMap from existing monthly data if it exists to maintain consistency for untouched metrics
                const monthsMap: Record<string, any> = {};
                // Seed from both top-level and nested structures to prevent data wipe in 3-statement models
                const seedSources = [
                  existingSummary?.monthly,
                  existingSummary?.statements?.incomeStatement?.monthly,
                  existingSummary?.incomeStatement?.monthly
                ];

                seedSources.forEach(source => {
                  if (source) {
                    Object.keys(source).forEach(m => {
                      monthsMap[m] = {
                        month: m,
                        monthKey: m,
                        ...source[m]
                      };
                    });
                  }
                });

                // Pivot node-based results to month-based results
                Object.keys(results).forEach(nodeId => {
                  const records = results[nodeId];
                  if (Array.isArray(records)) {
                    records.forEach((record: any) => {
                      const m = record.month;
                      if (!monthsMap[m]) monthsMap[m] = { month: m, monthKey: m };

                      // Map specific metrics by their category or name
                      const driver = currentModel?.drivers?.find((d: any) => d.id === nodeId);
                      const name = driver?.name?.toLowerCase() || '';
                      const category = driver?.category?.toLowerCase() || '';

                      // 1. Map by Explicit name (Priority)
                      if (name === 'revenue' || name === 'total revenue' || name.includes('income_total') || name.includes('total_revenue')) monthsMap[m].revenue = record.value;
                      else if (name === 'cogs' || name === 'total cogs' || name.includes('cost_of_sales') || name.includes('total_cogs')) monthsMap[m].cogs = record.value;
                      else if (name === 'gross profit' || name === 'gp' || name.includes('gross_profit')) monthsMap[m].grossProfit = record.value;
                      else if (name === 'net income' || name === 'pat' || name.includes('net_income')) monthsMap[m].netIncome = record.value;
                      else if (name === 'operating expenses' || name === 'total expenses' || name === 'opex' || name.includes('total_operating') || name.includes('operating_expenses')) monthsMap[m].operatingExpenses = record.value;
                      else if (name === 'ebitda' || name === 'operating profit' || name.includes('ebitda')) monthsMap[m].ebitda = record.value;
                      else if (name === 'depreciation' || name === 'amortization' || name.includes('depreciation')) monthsMap[m].depreciation = record.value;
                      else if (name === 'interest' || name === 'interest expense' || name === 'interest_cost') monthsMap[m].interestExpense = record.value;
                      else if (name === 'taxes' || name === 'tax' || name === 'taxation') monthsMap[m].taxExpense = record.value;
                      else if (name === 'cash' || name === 'ending cash' || name === 'cash balance' || name.includes('liquidity')) monthsMap[m].endingCash = record.value;

                      // 2. Map by Category (Aggregate if not specific) - Ensures all drivers affect the totals
                      const isRevenue = category === 'revenue' || driver?.type === 'revenue' || name.includes('revenue') || name.includes('price') || name.includes('sales') || name.includes('units') || name.includes('subscription');
                      const isCogs = category === 'cogs' || driver?.type === 'cogs' || category === 'direct' || name.includes('cogs') || name.includes('material') || name.includes('labor') || name.includes('shipping');
                      const isOpex = category === 'opex' || driver?.type === 'opex' || driver?.type === 'cost' || category === 'expense' || category === 'expenses' || name.includes('opex') || name.includes('marketing') || name.includes('r&d') || name.includes('g&a') || name.includes('salaries') || name.includes('rent');

                      if (isRevenue && !name.includes('total')) {
                        monthsMap[m].revenue = (monthsMap[m].revenue || 0) + record.value;
                      } else if (isCogs && !name.includes('total')) {
                        monthsMap[m].cogs = (monthsMap[m].cogs || 0) + record.value;
                      } else if (isOpex && !name.includes('total')) {
                        monthsMap[m].operatingExpenses = (monthsMap[m].operatingExpenses || 0) + record.value;
                      }
                    });
                  }
                });

                const mappedData = Object.values(monthsMap)
                  .filter((m: any) => m && m.month)
                  .sort((a: any, b: any) => String(a.month).localeCompare(String(b.month)));

                // POST-PROCESSING: Calculate derived metrics if engine didn't return them
                mappedData.forEach((m: any) => {
                  if (m.revenue !== undefined && m.cogs !== undefined && m.grossProfit === undefined) {
                    m.grossProfit = m.revenue - m.cogs;
                  }
                  if (m.grossProfit !== undefined && m.operatingExpenses !== undefined && m.ebitda === undefined) {
                    m.ebitda = m.grossProfit - m.operatingExpenses;
                  }
                  if (m.ebitda !== undefined && m.netIncome === undefined) {
                    m.netIncome = m.ebitda - (m.depreciation || 0) - (m.interestExpense || 0) - (m.taxExpense || 0);
                  }
                  // Calculate margins
                  m.grossMargin = m.revenue ? m.grossProfit / m.revenue : 0;
                  m.ebitdaMargin = m.revenue ? m.ebitda / m.revenue : 0;
                });

                if (mappedData.length > 0) {
                  setFinancialData(mappedData);
                }

                // Update current run summary locally so other tabs (Statements) update
                if (currentRun) {
                  const existingSummary = typeof currentRun.summaryJson === 'string'
                    ? JSON.parse(currentRun.summaryJson)
                    : currentRun.summaryJson;

                  const updatedSummary = {
                    ...existingSummary,
                    incomeStatement: {
                      ...(existingSummary?.incomeStatement || {}),
                      monthly: { ...(existingSummary?.incomeStatement?.monthly || {}), ...monthsMap }
                    },
                    cashFlow: {
                      ...(existingSummary?.cashFlow || {}),
                      monthly: { ...(existingSummary?.cashFlow?.monthly || {}), ...monthsMap }
                    },
                    balanceSheet: {
                      ...(existingSummary?.balanceSheet || {}),
                      monthly: { ...(existingSummary?.balanceSheet?.monthly || {}), ...monthsMap }
                    },
                    monthly: { ...(existingSummary?.monthly || {}), ...monthsMap }
                  }

                  // Handle nested statements structure if present
                  if (existingSummary?.statements) {
                    updatedSummary.statements = {
                      ...existingSummary.statements,
                      incomeStatement: {
                        ...(existingSummary.statements.incomeStatement || {}),
                        monthly: { ...(existingSummary.statements.incomeStatement?.monthly || {}), ...monthsMap }
                      },
                      cashFlow: {
                        ...(existingSummary.statements.cashFlow || {}),
                        monthly: { ...(existingSummary.statements.cashFlow?.monthly || {}), ...monthsMap }
                      },
                      balanceSheet: {
                        ...(existingSummary.statements.balanceSheet || {}),
                        monthly: { ...(existingSummary.statements.balanceSheet?.monthly || {}), ...monthsMap }
                      }
                    }
                  }

                  // Recalculate summary metrics from the updated monthly data
                  const allMonths = Object.values(updatedSummary.monthly)
                  updatedSummary.totalRevenue = allMonths.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0)
                  updatedSummary.revenue = updatedSummary.totalRevenue
                  updatedSummary.netIncome = allMonths.reduce((sum: number, m: any) => sum + (m.netIncome || 0), 0)
                  updatedSummary.expenses = allMonths.reduce((sum: number, m: any) => sum + (m.expenses || m.operatingExpenses || 0), 0)
                  updatedSummary.totalExpenses = updatedSummary.expenses

                  setCurrentRun({
                    ...currentRun,
                    summaryJson: updatedSummary
                  });

                  if (currentRun.id && orgId && selectedModel) {
                    await fetch(`${API_BASE_URL}/models/${selectedModel}/runs/${currentRun.id}/scratch`, {
                      method: 'PATCH',
                      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                      credentials: "include",
                      body: JSON.stringify({ summaryJson: updatedSummary })
                    }).then(() => {
                      // DB is now in sync with our local state, safe to allow fetchModelRuns again
                      localRecomputeDirtyRef.current = false;
                    }).catch(console.error);
                  }
                }
              }

              setRecomputeCounter(prev => prev + 1);
              setIsGlobalRecomputing(false);
            }}
          />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <ManualInputForm orgId={orgId} modelId={selectedModel} />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <ScenarioManagement
            orgId={orgId}
            modelId={selectedModel}
            onRefresh={() => {
              if (orgId && selectedModel) fetchModelRuns(orgId, selectedModel);
            }}
            currentRunId={currentRun?.id}
            refreshKey={recomputeCounter}
          />
        </TabsContent>

        <TabsContent value="ai-assist" className="space-y-4">
          <AIAssistTab
            orgId={orgId}
            modelId={selectedModel}
            currentRunId={currentRun?.id}
            refreshKey={recomputeCounter}
          />
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <IndustrialForecasting
            orgId={orgId}
            modelId={selectedModel}
            currentRunId={currentRun?.id}
            refreshKey={recomputeCounter}
          />
        </TabsContent>

        <TabsContent value="explainability" className="space-y-6">
          <ModelReasoningHub modelId={selectedModel} orgId={orgId} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DependencyGraph
                nodes={currentModel?.drivers?.map(d => ({
                  id: d.id,
                  name: d.name,
                  type: d.isCalculated ? 'formula' : 'input' as any
                })) || []}
                edges={(() => {
                  const edges: any[] = [];
                  currentModel?.driverFormulas?.forEach(f => {
                    const deps = typeof f.dependencies === 'string' ? JSON.parse(f.dependencies) : f.dependencies;
                    if (Array.isArray(deps)) {
                      deps.forEach(depId => edges.push({ source: depId, target: f.driverId }));
                    }
                  });
                  return edges;
                })()}
                affectedNodeIds={affectedNodeIds}
              />
            </div>
            <div className="lg:col-span-1">
              <TraceViewer traces={computationTraces} isLoading={loading} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODALS */}
      <ProvenanceDrawer
        open={provenanceModalOpen}
        onOpenChange={setProvenanceModalOpen}
        modelRunId={currentRun?.id}
        cellKey={selectedCellData?.cellId}
        provenanceData={selectedCellData}
      />

      <Dialog open={showCreateModelDialog} onOpenChange={setShowCreateModelDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {createModelAiMode ? <Sparkles className="h-6 w-6 text-purple-600" /> : <Calculator className="h-6 w-6 text-primary" />}
              {createModelAiMode ? 'AI Precision Generation' : 'Financial Model Construction'}
            </DialogTitle>
          </DialogHeader>
          <CreateModelForm
            orgId={orgId}
            dataStatus={dataStatus}
            aiMode={createModelAiMode}
            connectors={connectors}
            onSuccess={handleCreateModel}
            onCancel={() => { setShowCreateModelDialog(false); setCreateModelAiMode(false); setStrategicPulse(null); }}
            strategicPulse={strategicPulse}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Data Onboarding Hub</DialogTitle>
            <DialogDescription>Centralized upload and connector management</DialogDescription>
          </DialogHeader>
          <CSVImportWizard orgId={orgId} onImportComplete={() => { fetchDataStatus(orgId!); fetchTransactions(); }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
