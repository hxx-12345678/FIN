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
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateBudgetActualTemplate, generateBudgetTemplate, downloadCSV } from "@/utils/csv-template-generator"
import { DataDrivenTooltip } from "./data-driven-tooltip"
import { API_BASE_URL } from "@/lib/api-config"
import { useModel } from "@/lib/model-context"
import { useOrg } from "@/lib/org-context"

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

export function BudgetActual() {
  const { currencySymbol, formatCurrency } = useOrg()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "overview"
  const { selectedModelId, setSelectedModelId, orgId: contextOrgId, setOrgId: setContextOrgId } = useModel()

  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "previous" | "ytd">("current")
  const [selectedView, setSelectedView] = useState<"monthly" | "quarterly" | "yearly">("monthly")
  const [data, setData] = useState<BudgetActualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(contextOrgId)
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
        const hasUserBudgets = result.data.periods?.some((p: BudgetActualPeriod) =>
          p.budgetRevenue > 0 || p.budgetExpenses > 0
        ) || result.data.categories?.some((c: BudgetActualCategory) => c.budget > 0)
        setHasBudgets(hasUserBudgets ?? null)
        setHasTransactions(null)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load budget vs actual data"
      setError(errorMessage)
      console.error("Error fetching budget vs actual data:", err)
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
          if (modelId && !selectedModelId) {
            setSelectedModelId(modelId)
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

  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}

      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`Data import completed! Refreshing budget vs actual data...`)
        setTimeout(async () => {
          if (orgId && selectedModelId) {
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
  }, [orgId, selectedModelId])

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

    if (orgId) {
      if (data) {
        const budgetActualData = data?.periods || []
        const categoryBreakdown = data?.categories || []
        const hasActualData = budgetActualData.some((p: BudgetActualPeriod) =>
          (p.actualRevenue && p.actualRevenue > 0) || (p.actualExpenses && p.actualExpenses > 0)
        ) || categoryBreakdown.some((c: BudgetActualCategory) => c.actual > 0)

        if (!hasActualData) {
          checkTransactions()
        }
      } else if (!loading) {
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
        const runsResponse = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!runsResponse.ok) throw new Error("Failed to fetch model runs")
        const runsResult = await runsResponse.json()
        if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
          const latestRun = runsResult.runs.find((r: any) => r.status === "done") || runsResult.runs[0]
          const excelResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/excel/export`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ modelRunId: latestRun.id }),
          })

          if (excelResponse.ok) {
            const excelResult = await excelResponse.json()
            if (excelResult.ok && excelResult.data?.downloadUrl) {
              window.open(excelResult.data.downloadUrl, '_blank')
              toast.success("Budget export downloaded!")
            } else {
              toast.info("Excel export job created.")
            }
          }
        }
      } else {
        const runsResponse = await fetch(`${API_BASE_URL}/models/${selectedModelId}/runs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const runsResult = await runsResponse.json()
        if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
          const latestRun = runsResult.runs.find((r: any) => r.status === "done") || runsResult.runs[0]
          const exportResponse = await fetch(`${API_BASE_URL}/models/${latestRun.id}/export`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ type: "pdf" }),
          })
          if (exportResponse.ok) toast.success("PDF export job created.")
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Budget vs Actual</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.hash = '#modeling'}>Go to Financial Modeling</Button>
      </div>
    )
  }

  if (!selectedModelId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Budget vs Actual</h1>
        <Card>
          <CardHeader>
            <CardTitle>Select a Model</CardTitle>
            <CardDescription>Please select a model from the header to view budget vs actual data.</CardDescription>
          </CardHeader>
        </Card>
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

  const hasActualData = budgetActualData.some((p: BudgetActualPeriod) =>
    (p.actualRevenue && p.actualRevenue > 0) || (p.actualExpenses && p.actualExpenses > 0)
  ) || categoryBreakdown.some((c: BudgetActualCategory) => c.actual > 0)

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Budget vs Actual</h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium">Monitor performance against your financial targets</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as "current" | "previous" | "ytd")}
          >
            <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Year</SelectItem>
              <SelectItem value="previous">Previous Year</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleImportBudget} className="bg-white border-gray-200">
            <Upload className="mr-2 h-4 w-4" />
            Import Actuals
          </Button>
          <Button variant="outline" onClick={() => handleExportReport('pdf')} className="bg-white border-gray-200">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {!hasActualData && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            Actual data is missing. Import your financial transactions to see comparisons.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.budgetAccuracy.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.revenueVariance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.revenueVariance))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expense Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.expenseVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.expenseVariance <= 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.expenseVariance))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.netVariance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.netVariance))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="budgetRevenue" name="Budget" fill="#bfdbfe" />
                    <Line type="monotone" dataKey="actualRevenue" name="Actual" stroke="#2563eb" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="categories">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryBreakdown.map((cat, i) => (
                    <TableRow key={i}>
                      <TableCell>{cat.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.budget)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.actual)}</TableCell>
                      <TableCell className={`text-right ${cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cat.variance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(cat.variance))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{alert.title}</CardTitle>
                    <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>{alert.impact}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Actuals</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <CSVImportWizard />
            <ExcelImportWizard />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
