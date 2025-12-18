"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CSVImportWizard } from "./csv-import-wizard"
import { ExcelImportWizard } from "./excel-import-wizard"
import { BudgetPlanner } from "./budget-planner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Download, Upload, Loader2, FileDown, Plus, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { generateBudgetActualTemplate, generateBudgetTemplate, downloadCSV } from "@/utils/csv-template-generator"
import { API_BASE_URL } from "@/lib/api-config"

interface BudgetActualPeriod {
  period: string
  budgetRevenue: number
  actualRevenue: number
  budgetExpenses: number
  actualExpenses: number
  variance: number
  variancePercent: number
}

interface BudgetActualCategory {
  category: string
  budget: number
  actual: number
  variance: number
  variancePercent: number
  status: "good" | "warning" | "over" | "under"
}

interface BudgetActualSummary {
  budgetAccuracy: number
  revenueVariance: number
  revenueVariancePercent: number
  expenseVariance: number
  expenseVariancePercent: number
  netVariance: number
  netVariancePercent: number
}

interface BudgetActualAlert {
  type: "error" | "warning" | "info"
  title: string
  description: string
  impact: "High" | "Medium" | "Low"
  recommendation: string
}

interface BudgetActualData {
  summary: BudgetActualSummary
  periods: BudgetActualPeriod[]
  categories: BudgetActualCategory[]
  alerts: BudgetActualAlert[]
}

const defaultBudgetActualData: BudgetActualPeriod[] = [
  {
    period: "2024-01",
    budgetRevenue: 50000,
    actualRevenue: 45000,
    budgetExpenses: 40000,
    actualExpenses: 38000,
    variance: -5000,
    variancePercent: -10,
  },
  {
    period: "2024-02",
    budgetRevenue: 55000,
    actualRevenue: 52000,
    budgetExpenses: 42000,
    actualExpenses: 41000,
    variance: -3000,
    variancePercent: -5.5,
  },
  {
    period: "2024-03",
    budgetRevenue: 60000,
    actualRevenue: 48000,
    budgetExpenses: 45000,
    actualExpenses: 47000,
    variance: -12000,
    variancePercent: -20,
  },
  {
    period: "2024-04",
    budgetRevenue: 65000,
    actualRevenue: 61000,
    budgetExpenses: 48000,
    actualExpenses: 46000,
    variance: -4000,
    variancePercent: -6.2,
  },
  {
    period: "2024-05",
    budgetRevenue: 70000,
    actualRevenue: 55000,
    budgetExpenses: 50000,
    actualExpenses: 52000,
    variance: -15000,
    variancePercent: -21.4,
  },
  {
    period: "2024-06",
    budgetRevenue: 75000,
    actualRevenue: 67000,
    budgetExpenses: 52000,
    actualExpenses: 49000,
    variance: -8000,
    variancePercent: -10.7,
  },
]

const defaultCategoryBreakdown: BudgetActualCategory[] = [
  {
    category: "Revenue",
    budget: 75000,
    actual: 67000,
    variance: -8000,
    variancePercent: -10.7,
    status: "warning",
  },
  {
    category: "Payroll",
    budget: 35000,
    actual: 33000,
    variance: -2000,
    variancePercent: -5.7,
    status: "good",
  },
  {
    category: "Marketing",
    budget: 8000,
    actual: 9500,
    variance: 1500,
    variancePercent: 18.8,
    status: "over",
  },
  {
    category: "Operations",
    budget: 5000,
    actual: 4200,
    variance: -800,
    variancePercent: -16,
    status: "good",
  },
  {
    category: "R&D",
    budget: 4000,
    actual: 2300,
    variance: -1700,
    variancePercent: -42.5,
    status: "under",
  },
]

const defaultAlerts: BudgetActualAlert[] = [
  {
    type: "warning",
    title: "Marketing Budget Exceeded",
    description: "Marketing spend is 18.8% over budget this month",
    impact: "Medium",
    recommendation: "Review ad spend allocation and ROI metrics",
  },
  {
    type: "info",
    title: "R&D Under Budget",
    description: "R&D spending is significantly under budget",
    impact: "Low",
    recommendation: "Consider accelerating planned initiatives",
  },
  {
    type: "error",
    title: "Revenue Shortfall",
    description: "Revenue is tracking 10.7% below budget",
    impact: "High",
    recommendation: "Implement revenue acceleration strategies",
  },
]

export function BudgetActual() {
  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "previous" | "ytd">("current")
  const [selectedView, setSelectedView] = useState<"monthly" | "quarterly" | "yearly">("monthly")
  const [data, setData] = useState<BudgetActualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [models, setModels] = useState<any[]>([])
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showBudgetPlanner, setShowBudgetPlanner] = useState(false)
  const [hasBudgets, setHasBudgets] = useState<boolean | null>(null)
  const [hasTransactions, setHasTransactions] = useState<boolean | null>(null)

  const fetchOrgId = async (): Promise<string | null> => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return storedOrgId
    }

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
          setOrgId(primaryOrgId)
          return primaryOrgId
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchModels = async (orgId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models && result.models.length > 0) {
          setModels(result.models)
          setSelectedModelId(result.models[0].id)
          return result.models[0].id
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
    }
    return null
  }

  const fetchBudgetActualData = async () => {
    if (!orgId || !selectedModelId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found. Please log in.")
      }

      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/models/${selectedModelId}/budget-actual?period=${selectedPeriod}&view=${selectedView}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch budget vs actual data: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.data) {
        setData(result.data)
        // Check if budgets exist (if all budget values are 0, likely no user budgets)
        const hasUserBudgets = result.data.periods?.some((p: BudgetActualPeriod) => 
          p.budgetRevenue > 0 || p.budgetExpenses > 0
        ) || result.data.categories?.some((c: BudgetActualCategory) => c.budget > 0)
        setHasBudgets(hasUserBudgets ?? null)
        
        // Reset hasTransactions when data is fetched to re-check
        setHasTransactions(null)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load budget vs actual data"
      setError(errorMessage)
      console.error("Error fetching budget vs actual data:", err)
      // Don't show toast for 404s (expected for new users)
      if (!errorMessage.includes("404")) {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const currentOrgId = await fetchOrgId()
      if (currentOrgId) {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (token) {
          const modelId = await fetchModels(currentOrgId, token)
          if (modelId) {
            await fetchBudgetActualData()
          } else {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  useEffect(() => {
    if (orgId && selectedModelId) {
      fetchBudgetActualData()
    }
  }, [selectedPeriod, selectedView, orgId, selectedModelId])

  // Listen for CSV/Excel import completion to refresh data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`Data import completed! Refreshing budget vs actual data...`)
        
        // Small delay to ensure backend has processed the data
        setTimeout(async () => {
          if (orgId && selectedModelId) {
            await fetchBudgetActualData()
          } else if (orgId && models.length > 0) {
            // If no model selected but models exist, select first one and fetch
            const firstModelId = models[0].id
            setSelectedModelId(firstModelId)
            await fetchBudgetActualData()
          }
        }, 2000)
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    window.addEventListener('xlsx-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
      window.removeEventListener('xlsx-import-completed', listener)
    }
  }, [orgId, selectedModelId, models])

  // Check if transactions exist (for missing actual data detection)
  // This must be at the top before any conditional returns
  useEffect(() => {
    const checkTransactions = async () => {
      if (!orgId) return
      
      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) return

        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/transactions?limit=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const result = await response.json()
          setHasTransactions(result.ok && result.transactions && result.transactions.length > 0)
        }
      } catch (error) {
        console.error("Failed to check transactions:", error)
      }
    }

    // Only check if we have orgId and either no data or data without actuals
    if (orgId) {
      if (data) {
        // Check if actual data exists
        const budgetActualData = data?.periods || []
        const categoryBreakdown = data?.categories || []
        const hasActualData = budgetActualData.some((p: BudgetActualPeriod) => 
          (p.actualRevenue && p.actualRevenue > 0) || (p.actualExpenses && p.actualExpenses > 0)
        ) || categoryBreakdown.some((c: BudgetActualCategory) => c.actual > 0)
        
        if (!hasActualData) {
          checkTransactions()
        }
      } else if (!loading) {
        // No data and not loading - check transactions to show appropriate message
        checkTransactions()
      }
    }
  }, [orgId, data, loading])

  const formatPeriod = (period: string): string => {
    if (period.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = period.split("-")
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
    return period
  }

  const handleImportBudget = () => {
    setShowImportDialog(true)
  }

  const handleExportReport = async (format: 'pdf' | 'xlsx' = 'pdf') => {
    if (!data || !selectedModelId || !orgId) {
      toast.error("No data available to export")
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

      if (format === 'xlsx') {
        // Export to Excel using Excel service
        const runsResponse = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!runsResponse.ok) {
          throw new Error("Failed to fetch model runs")
        }

        const runsResult = await runsResponse.json()
        if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
          const latestRun = runsResult.runs.find((r: any) => r.status === "done") || runsResult.runs[0]
          
          // Export to Excel
          const excelResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/excel/export`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              modelRunId: latestRun.id,
              mappingId: null, // Will use default mapping
            }),
          })

          if (excelResponse.ok) {
            const excelResult = await excelResponse.json()
            if (excelResult.ok && excelResult.data?.downloadUrl) {
              window.open(excelResult.data.downloadUrl, '_blank')
              toast.success("Budget vs Actual Excel export downloaded!")
            } else {
              toast.info("Excel export job created. Check Export Queue for status.")
            }
          } else {
            const errorData = await excelResponse.json().catch(() => ({}))
            throw new Error(errorData.error?.message || "Failed to export to Excel")
          }
        } else {
          throw new Error("No model runs found. Please run a model first.")
        }
      } else {
        // PDF export (existing logic)
        const runsResponse = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!runsResponse.ok) {
          throw new Error("Failed to fetch model runs")
        }

        const runsResult = await runsResponse.json()
        if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
          const latestRun = runsResult.runs.find((r: any) => r.status === "done") || runsResult.runs[0]
          
          // Create export
          const exportResponse = await fetch(`${API_BASE_URL}/models/${latestRun.id}/export`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              type: "pdf",
            }),
          })

          if (!exportResponse.ok) {
            const errorData = await exportResponse.json().catch(() => ({}))
            throw new Error(errorData.error?.message || "Failed to export report")
          }

          const exportResult = await exportResponse.json()
          if (exportResult.ok && exportResult.export) {
            toast.success("Export job created. You'll be notified when it's ready.")
          }
        } else {
          throw new Error("No model runs found. Please run a model first.")
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export report"
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget vs Actual</h1>
            <p className="text-muted-foreground">Track performance against your financial plans</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {!selectedModelId && models.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Models Found</CardTitle>
              <CardDescription>You need to create a financial model first to view budget vs actual data.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.hash = '#modeling'}>
                Go to Financial Modeling
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Show message if no model is selected
  if (!loading && !error && !selectedModelId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget vs Actual</h1>
            <p className="text-muted-foreground">Track performance against your financial plans</p>
          </div>
        </div>
        {models.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Models Found</CardTitle>
              <CardDescription>You need to create a financial model first to view budget vs actual data.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.hash = '#modeling'}>
                Go to Financial Modeling
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select a Model</CardTitle>
              <CardDescription>Please select a model from the dropdown above to view budget vs actual data.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    )
  }

  const budgetActualData = data?.periods || []
  const categoryBreakdown = data?.categories || []
  const alerts = data?.alerts || []
  const summary = data?.summary || {
    budgetAccuracy: 0,
    revenueVariance: 0,
    revenueVariancePercent: 0,
    expenseVariance: 0,
    expenseVariancePercent: 0,
    netVariance: 0,
    netVariancePercent: 0,
  }

  // Check if actual data is missing (all actuals are 0 or null)
  const hasActualData = budgetActualData.some((p: BudgetActualPeriod) => 
    (p.actualRevenue && p.actualRevenue > 0) || (p.actualExpenses && p.actualExpenses > 0)
  ) || categoryBreakdown.some((c: BudgetActualCategory) => c.actual > 0)

  // Format data for charts
  const chartData = budgetActualData.map((period) => ({
    month: formatPeriod(period.period),
    period: period.period,
    budgetRevenue: period.budgetRevenue,
    actualRevenue: period.actualRevenue,
    budgetExpenses: period.budgetExpenses,
    actualExpenses: period.actualExpenses,
    variance: period.variance,
    variancePercent: period.variancePercent,
  }))

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Budget vs Actual</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track performance against your financial plans</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select 
            value={selectedPeriod} 
            onValueChange={(value) => setSelectedPeriod(value as "current" | "previous" | "ytd")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Year</SelectItem>
              <SelectItem value="previous">Previous Year</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          {models.length > 0 && (
            <Select 
              value={selectedModelId || ""} 
              onValueChange={(value) => setSelectedModelId(value)}
            >
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
          <Button 
            variant="outline"
            onClick={() => {
              const csvContent = generateBudgetActualTemplate()
              downloadCSV(csvContent, 'budget-actual-template.csv')
              toast.success('Template downloaded successfully!')
            }}
            className="w-full sm:w-auto"
          >
            <FileDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          <Button 
            variant="outline"
            onClick={handleImportBudget}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Import Actuals</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExportReport('pdf')}
            disabled={!data || !selectedModelId}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExportReport('xlsx')}
            disabled={!data || !selectedModelId}
            className="w-full sm:w-auto"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Missing Actual Data Alert */}
      {!loading && data && !hasActualData && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <strong className="text-blue-900">Actual data is missing</strong>
                <p className="text-blue-700 mt-1">
                  {hasTransactions 
                    ? "You have imported transactions, but they're not showing in Budget vs Actual. This may be because the transaction dates don't match the selected period, or categories need to be mapped correctly."
                    : "Import your actual financial data to compare against budgets. You can import CSV/Excel files or connect an accounting integration."}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {hasTransactions ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.hash = '#integrations'
                      window.dispatchEvent(new CustomEvent('navigate-view', { detail: { view: 'integrations' } }))
                    }}
                  >
                    Check Integrations
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Import CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.hash = '#integrations'
                        window.dispatchEvent(new CustomEvent('navigate-view', { detail: { view: 'integrations' } }))
                      }}
                    >
                      Connect Integration
                    </Button>
                  </>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? summary.budgetAccuracy.toFixed(1) : "0"}%
            </div>
            {data ? (
              <div className={`flex items-center text-xs ${summary.budgetAccuracy >= 90 ? "text-green-600" : summary.budgetAccuracy >= 80 ? "text-yellow-600" : "text-red-600"}`}>
                {summary.budgetAccuracy >= 90 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {summary.budgetAccuracy >= 90 ? "On target" : "Needs attention"}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Variance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.revenueVariancePercent < 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.revenueVariancePercent >= 0 ? "+" : ""}{summary.revenueVariancePercent.toFixed(1)}%
            </div>
            <div className={`flex items-center text-xs ${summary.revenueVariancePercent < 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.revenueVariancePercent < 0 ? <TrendingDown className="mr-1 h-3 w-3" /> : <TrendingUp className="mr-1 h-3 w-3" />}
              ${Math.abs(summary.revenueVariance / 1000).toFixed(1)}K {summary.revenueVariance < 0 ? "under" : "over"} budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expense Variance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.expenseVariancePercent > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.expenseVariancePercent >= 0 ? "+" : ""}{summary.expenseVariancePercent.toFixed(1)}%
            </div>
            <div className={`flex items-center text-xs ${summary.expenseVariancePercent > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.expenseVariancePercent > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              ${Math.abs(summary.expenseVariance / 1000).toFixed(1)}K {summary.expenseVariance > 0 ? "over" : "under"} budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netVariancePercent < 0 ? "text-red-600" : summary.netVariancePercent > 5 ? "text-green-600" : "text-yellow-600"}`}>
              {summary.netVariancePercent >= 0 ? "+" : ""}{summary.netVariancePercent.toFixed(1)}%
            </div>
            <div className={`flex items-center text-xs ${summary.netVariancePercent < 0 ? "text-red-600" : summary.netVariancePercent > 5 ? "text-green-600" : "text-yellow-600"}`}>
              {summary.netVariancePercent < 0 ? <TrendingDown className="mr-1 h-3 w-3" /> : <TrendingUp className="mr-1 h-3 w-3" />}
              ${Math.abs(summary.netVariance / 1000).toFixed(1)}K impact
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">By Category</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 overflow-x-auto overflow-y-visible">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Budget vs Actual Comparison</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Monthly budget performance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Bar dataKey="budgetRevenue" fill="#e2e8f0" name="Budget Revenue" />
                      <Bar dataKey="actualRevenue" fill="#3b82f6" name="Actual Revenue" />
                      <Line type="monotone" dataKey="variance" stroke="#ef4444" strokeWidth={2} name="Variance" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-xs sm:text-sm px-4 text-center">
                    {loading ? "Loading..." : "No budget vs actual data available. Run a model and import transactions to see data."}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Variance Analysis</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Percentage variance from budget</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, ""]} />
                      <Bar
                        dataKey="variancePercent"
                        fill="#8884d8"
                        name="Variance %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    {loading ? "Loading..." : "No variance data available. Run a model to see variance analysis."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget Performance</CardTitle>
              <CardDescription>Detailed month-by-month breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Budget Revenue</TableHead>
                      <TableHead className="text-right">Actual Revenue</TableHead>
                      <TableHead className="text-right">Budget Expenses</TableHead>
                      <TableHead className="text-right">Actual Expenses</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.length > 0 ? (
                      chartData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">${row.budgetRevenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${row.actualRevenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${row.budgetExpenses.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${row.actualExpenses.toLocaleString()}</TableCell>
                          <TableCell className={`text-right ${row.variance < 0 ? "text-red-600" : "text-green-600"}`}>
                            ${row.variance.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right ${row.variancePercent < 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {row.variancePercent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No budget vs actual data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Budget vs actual by expense category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {categoryBreakdown.map((category, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{category.category}</h3>
                      <Badge
                        variant={
                          category.status === "good"
                            ? "default"
                            : category.status === "warning"
                              ? "secondary"
                              : category.status === "over"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {category.status === "good"
                          ? "On Track"
                          : category.status === "warning"
                            ? "Warning"
                            : category.status === "over"
                              ? "Over Budget"
                              : "Under Budget"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Budget</div>
                        <div className="font-medium">${category.budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Actual</div>
                        <div className="font-medium">${category.actual.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Variance</div>
                        <div className={`font-medium ${category.variance < 0 ? "text-red-600" : "text-green-600"}`}>
                          ${category.variance.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Variance %</div>
                        <div
                          className={`font-medium ${category.variancePercent < 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {category.variancePercent}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress
                        value={Math.abs(category.variancePercent)}
                        className={`h-2 ${
                          category.status === "good"
                            ? "bg-green-100"
                            : category.status === "warning"
                              ? "bg-yellow-100"
                              : "bg-red-100"
                        }`}
                      />
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? "Loading category data..." : "No category data available. Import transactions to see category breakdown."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variance Trends</CardTitle>
              <CardDescription>Historical variance patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, ""]} />
                    <Line type="monotone" dataKey="variancePercent" stroke="#3b82f6" strokeWidth={3} name="Variance %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((alert, index) => (
              <Card
                key={index}
                className={`border-l-4 ${
                  alert.type === "error"
                    ? "border-l-red-500"
                    : alert.type === "warning"
                      ? "border-l-yellow-500"
                      : "border-l-blue-500"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <Badge
                      variant={
                        alert.type === "error" ? "destructive" : alert.type === "warning" ? "secondary" : "default"
                      }
                    >
                      {alert.impact} Impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Recommendation:</p>
                    <p className="text-sm text-muted-foreground">{alert.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? "Loading alerts..." : "No alerts at this time. All metrics are within expected ranges."}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Actuals</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import actual transaction data. This will be compared against your budget model.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Need a template?</p>
                <p className="text-xs text-blue-700 mt-1">Download our CSV template with sample actuals data</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csvContent = generateBudgetActualTemplate()
                  downloadCSV(csvContent, 'budget-actual-template.csv')
                  toast.success('Template downloaded successfully!')
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <CSVImportWizard />
              <ExcelImportWizard />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• CSV: Quick import for simple transaction data</p>
              <p>• Excel: Import with formula preservation and advanced mapping</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
