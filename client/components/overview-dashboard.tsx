"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useChartPagination } from "@/hooks/use-chart-pagination"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Loader2,
  Scale,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { FinancialTermTooltip } from "./financial-term-tooltip"
import { DataDrivenTooltip } from "./data-driven-tooltip"
import { useModel } from "@/lib/model-context"
import { useOrg } from "@/lib/org-context"
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select"

interface OverviewData {
  healthScore: number
  monthlyRevenue: number
  monthlyBurnRate: number
  cashRunway: number
  activeCustomers: number
  revenueGrowth: number
  burnRateChange: number
  runwayChange: number
  revenueData: Array<{
    month: string
    revenue: number
    forecast: number
  }>
  burnRateData: Array<{
    month: string
    burn: number
    runway: number
  }>
  expenseBreakdown: Array<{
    name: string
    value: number
    color: string
    type: 'COGS' | 'R&D' | 'S&M' | 'G&A'
    vendors: Array<{ name: string; value: number }>
  }>
  alerts: Array<{
    type: "warning" | "success" | "info"
    title: string
    message: string
  }>
  topVendors?: Array<{ name: string; value: number }>
  costSegregation: {
    direct: number
    indirect: number
    grossMargin: number
    operatingMargin: number
  }
}

// SaaS FP&A standard cost classification (COGS vs OpEx)
const COGS_KEYWORDS = ['hosting', 'cloud', 'aws', 'azure', 'gcp', 'infrastructure', 'devops', 'sre', 'support', 'customer success', 'onboarding', 'implementation', 'cogs', 'server', 'bandwidth', 'cdn', 'api', 'third-party', 'payment processing', 'stripe', 'twilio'];
const OPEX_RD_KEYWORDS = ['r&d', 'engineering', 'product', 'development', 'research'];
const OPEX_SM_KEYWORDS = ['marketing', 'sales', 'ads', 'advertising', 'commission', 'lead gen', 'seo', 'content'];
const OPEX_GA_KEYWORDS = ['admin', 'general', 'office', 'rent', 'legal', 'hr', 'insurance', 'utilities', 'accounting', 'finance', 'executive', 'payroll', 'salary', 'benefits', 'miscellaneous', 'other'];

function classifyExpenseCategory(name: string): { type: 'COGS' | 'R&D' | 'S&M' | 'G&A', label: string, color: string, description: string } {
  const lower = name.toLowerCase();
  if (COGS_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'COGS', label: 'Cost of Revenue (COGS)', color: 'text-blue-600 dark:text-blue-400', description: 'Direct cost of delivering the SaaS product — hosting, support, payment processing. Disappears if you stop serving customers.' };
  }
  if (OPEX_RD_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'R&D', label: 'R&D (OpEx)', color: 'text-violet-600 dark:text-violet-400', description: 'Research & Development — building new features and product innovation. Strategic investment, not delivery cost.' };
  }
  if (OPEX_SM_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'S&M', label: 'Sales & Marketing (OpEx)', color: 'text-amber-600 dark:text-amber-400', description: 'Customer acquisition costs — ads, commissions, lead generation. Drives growth but not required for current service delivery.' };
  }
  return { type: 'G&A', label: 'General & Admin (OpEx)', color: 'text-emerald-600 dark:text-emerald-400', description: 'Overhead — rent, legal, HR, executive comp. Required to run the company, but not tied to product delivery.' };
}

interface ExpenseDetail {
  name: string
  value: number
  color: string
  percentage: number
  classification: ReturnType<typeof classifyExpenseCategory>
}

const defaultRevenueData = [
  { month: "Jan", revenue: 45000, forecast: 42000 },
  { month: "Feb", revenue: 52000, forecast: 48000 },
  { month: "Mar", revenue: 48000, forecast: 51000 },
  { month: "Apr", revenue: 61000, forecast: 55000 },
  { month: "May", revenue: 55000, forecast: 58000 },
  { month: "Jun", revenue: 67000, forecast: 62000 },
]

const defaultBurnRateData = [
  { month: "Jan", burn: 35000, runway: 18 },
  { month: "Feb", burn: 38000, runway: 17 },
  { month: "Mar", burn: 42000, runway: 16 },
  { month: "Apr", burn: 39000, runway: 15 },
  { month: "May", burn: 41000, runway: 14 },
  { month: "Jun", burn: 44000, runway: 13 },
]

const defaultExpenseBreakdown: OverviewData['expenseBreakdown'] = [
  { name: "Payroll", value: 180000, color: "#8884d8", type: 'G&A', vendors: [] },
  { name: "Marketing", value: 45000, color: "#82ca9d", type: 'S&M', vendors: [] },
  { name: "Operations", value: 32000, color: "#ffc658", type: 'G&A', vendors: [] },
  { name: "R&D", value: 28000, color: "#ff7300", type: 'R&D', vendors: [] },
  { name: "Other", value: 15000, color: "#00ff88", type: 'G&A', vendors: [] },
]

export function OverviewDashboard() {
  const router = useRouter()
  const { selectedModelId, setSelectedModelId, orgId: contextOrgId, setOrgId: setContextOrgId } = useModel()
  const { currencySymbol, formatCurrency } = useOrg()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(contextOrgId)
  const [models, setModels] = useState<any[]>([])
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null)

  const fetchOrgId = async () => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return storedOrgId
    }

    try {
      const url = `${API_BASE_URL}/auth/me`
      console.log("[Overview] Fetching orgId from:", url)

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      console.log("[Overview] Auth me response status:", response.status)

      if (response.ok) {
        const responseData = await response.json()
        console.log("[Overview] Auth me response:", responseData)

        // Handle different response formats (wrapped in ok: true or direct data)
        const userData = responseData.ok ? responseData : responseData.data || responseData

        // Handle different response formats
        let orgIdToUse: string | null = null

        if (userData?.orgs && Array.isArray(userData.orgs) && userData.orgs.length > 0) {
          // Response has orgs array
          orgIdToUse = userData.orgs[0].id
        } else if (userData?.org && userData.org.id) {
          // Response has single org object
          orgIdToUse = userData.org.id
        } else if (responseData?.orgs && Array.isArray(responseData.orgs) && responseData.orgs.length > 0) {
          // Response at top level has orgs array
          orgIdToUse = responseData.orgs[0].id
        } else if (responseData?.org && responseData.org.id) {
          // Response at top level has single org object
          orgIdToUse = responseData.org.id
        } else if (responseData?.orgId) {
          // Direct orgId in response
          orgIdToUse = responseData.orgId
        }

        if (orgIdToUse) {
          console.log("[Overview] Found orgId:", orgIdToUse)
          localStorage.setItem("orgId", orgIdToUse)
          setOrgId(orgIdToUse)
          return orgIdToUse
        } else {
          console.warn("[Overview] No orgId found in response:", responseData)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[Overview] Auth me failed:", response.status, errorData)
      }
    } catch (error) {
      console.error("[Overview] Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchModels = async (orgId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models && result.models.length > 0) {
          setModels(result.models)
          // Only set if none selected
          if (!selectedModelId) {
            setSelectedModelId(result.models[0].id)
          }
        }
      }
    } catch (error) {
      console.error("[Overview] Failed to fetch models:", error)
    }
  }

  const fetchOverviewData = async () => {
    setLoading(true)
    setError(null)

    try {
      // First try to get orgId from state or localStorage
      let currentOrgId = orgId || localStorage.getItem("orgId")

      // If not found, fetch it
      if (!currentOrgId) {
        currentOrgId = await fetchOrgId()
      }

      if (!currentOrgId) {
        const errorMsg = "Organization ID not found. Please ensure you're logged in."
        console.error("[Overview] No orgId found:", errorMsg)
        setError(errorMsg)
        setLoading(false)
        return
      }

      // Ensure orgId is set in state and localStorage
      if (currentOrgId !== orgId) {
        setOrgId(currentOrgId)
        localStorage.setItem("orgId", currentOrgId)
      }

      console.log("[Overview] Fetching data for orgId:", currentOrgId)

      const url = new URL(`${API_BASE_URL}/orgs/${currentOrgId}/overview`)
      if (selectedModelId) {
        url.searchParams.append("modelId", selectedModelId)
      }

      console.log("[Overview] Fetching from URL:", url.toString())

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      console.log("[Overview] Response status:", response.status, response.statusText)

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          const errorMsg = "Your session has expired. Please log in again."
          console.error("[Overview] Unauthorized:", errorMsg)
          setError(errorMsg)
          toast.error(errorMsg)
          handleUnauthorized()
          setLoading(false)
          return
        }

        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.error("[Overview] Failed to parse error response:", e)
        }
        const errorMsg = errorData?.error?.message || errorData?.message || `Failed to fetch overview data: ${response.statusText}`
        console.error("[Overview] API Error:", errorMsg, errorData)
        throw new Error(errorMsg)
      }

      const result = await response.json()
      console.log("[Overview] Response received:", {
        ok: result.ok,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
      })

      if (result.ok && result.data) {
        console.log("[Overview] Setting data:", {
          healthScore: result.data.healthScore,
          monthlyRevenue: result.data.monthlyRevenue,
          revenueDataLength: result.data.revenueData?.length,
        })
        setData(result.data)
        setError(null) // Clear any previous errors
      } else {
        console.error("[Overview] Invalid response format:", result)
        throw new Error("Invalid response format - missing ok or data")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load overview data"
      console.error("[Overview] Error fetching overview data:", err)
      setError(errorMessage)
      // Always show error toast to help with debugging
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const currentOrgId = await fetchOrgId()
      if (currentOrgId) {
        await fetchModels(currentOrgId)
        await fetchOverviewData()
      }
    }
    initialize()
  }, [])

  useEffect(() => {
    if (orgId && selectedModelId) {
      fetchOverviewData()
    }
  }, [selectedModelId])

  // Listen for CSV/Excel import completion to refresh data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}

      console.log("[Overview] Import completed, refreshing data...", { rowsImported, importedOrgId, currentOrgId: orgId })

      // Update orgId if it came from the event
      if (importedOrgId) {
        if (importedOrgId !== orgId) {
          setOrgId(importedOrgId)
          localStorage.setItem("orgId", importedOrgId)
        }
      }

      // Small delay to ensure backend has processed the data
      setTimeout(() => {
        fetchOverviewData()
      }, 2000)
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    window.addEventListener('xlsx-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
      window.removeEventListener('xlsx-import-completed', listener)
    }
  }, [orgId])

  const { chartData: paginatedRevenueData, hasMore: hasMoreRevenue, loadMore: loadMoreRevenue, initializeData: initRevenue } = useChartPagination({
    defaultMonths: 36,
    onLoadMore: async (startDate, endDate) => {
      const revenueData = data?.revenueData || []
      return revenueData.filter((item) => {
        const itemDate = new Date(`${item.month} 1, 2024`)
        return itemDate >= startDate && itemDate < endDate
      })
    },
  })

  useEffect(() => {
    if (data?.revenueData) {
      initRevenue(data.revenueData)
    } else {
      initRevenue([])
    }
  }, [data, initRevenue])

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-full sm:w-32" />
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const overviewData: OverviewData = data || {
    healthScore: 0,
    monthlyRevenue: 0,
    monthlyBurnRate: 0,
    cashRunway: 0,
    activeCustomers: 0,
    revenueGrowth: 0,
    burnRateChange: 0,
    runwayChange: 0,
    revenueData: [],
    burnRateData: [],
    expenseBreakdown: [],
    alerts: [
      {
        type: "info",
        title: "No Data Available",
        message: "Connect an integration or import a CSV to see your financial overview."
      }
    ],
    costSegregation: {
      direct: 0,
      indirect: 0,
      grossMargin: 0,
      operatingMargin: 0
    }
  }

  const revenueData = overviewData.revenueData
  const burnRateData = overviewData.burnRateData
  const expenseBreakdown = overviewData.expenseBreakdown

  // Calculate total expense for percentage math
  const totalExpenseValue = expenseBreakdown.reduce((sum, item) => sum + item.value, 0)

  const handleExpenseClick = (data: any) => {
    const classification = classifyExpenseCategory(data.name);
    setSelectedExpense({
      name: data.name,
      value: data.value,
      color: data.color,
      percentage: totalExpenseValue > 0 ? (data.value / totalExpenseValue) * 100 : 0,
      classification,
    });
  };

  return (
    <div className="w-full max-w-full space-y-4 md:space-y-6 overflow-x-hidden pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Financial Overview</h1>
          <p className="text-sm md:text-base text-muted-foreground">AI-powered insights for your business performance</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={async () => {
              // Trigger data refresh for last 30 days
              if (orgId) {
                setLoading(true)
                await fetchOverviewData()
              } else {
                const fetchedOrgId = await fetchOrgId()
                if (fetchedOrgId) {
                  setLoading(true)
                  await fetchOverviewData()
                } else {
                  toast.error("Organization ID not found. Please log in again.")
                }
              }
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Last 30 days</span>
            <span className="sm:hidden">30d</span>
          </Button>
          <Button 
            className="w-full sm:w-auto" 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-view', { detail: { view: 'reports' } }))}
          >
            <Zap className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Generate Report</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </div>
      </div>

      {/* Health Score */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Financial Health Score
                <FinancialTermTooltip term="Health Score" />
              </CardTitle>
              <CardDescription>Your startup's financial health based on key metrics</CardDescription>
            </div>
            <div className="text-right">
              <DataDrivenTooltip
                metric="Health Score"
                value={overviewData.healthScore.toString()}
                dataContext={{
                  healthScore: overviewData.healthScore,
                  revenueGrowth: overviewData.revenueGrowth,
                  burnRateChange: overviewData.burnRateChange,
                  runwayChange: overviewData.runwayChange
                }}
                className="text-3xl font-bold text-green-600"
              />
              <div className="text-sm text-muted-foreground mt-1">
                {overviewData.healthScore >= 80 ? "Excellent" : overviewData.healthScore >= 60 ? "Good" : overviewData.healthScore >= 40 ? "Fair" : "Needs Attention"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Cash Runway</span>
              <span className="text-sm font-medium">{overviewData.cashRunway} months</span>
            </div>
            <Progress value={overviewData.healthScore} className="h-2" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-green-600">Growth</div>
                <div className="text-muted-foreground">
                  {(overviewData.revenueGrowth ?? 0) >= 0 ? "+" : ""}{(overviewData.revenueGrowth ?? 0).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">Burn Rate</div>
                <div className="text-muted-foreground">
                  {(overviewData.burnRateChange ?? 0) >= 0 ? "+" : ""}{(overviewData.burnRateChange ?? 0).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600">Runway</div>
                <div className="text-muted-foreground">{overviewData.cashRunway} months</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600">Customers</div>
                <div className="text-muted-foreground">{overviewData.activeCustomers.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Structure - Standard FP&A View */}
      <Card className="border-t-4 border-t-violet-500 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <Scale className="h-4 w-4 text-violet-500" />
              Profitability Structure
            </CardTitle>
            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
              SaaS Standard
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {overviewData.costSegregation.grossMargin}%
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Margin</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-violet-500" 
                  style={{ width: `${Math.max(0, overviewData.costSegregation.grossMargin)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Direct Costs: {formatCurrency(overviewData.costSegregation.direct)}</span>
                <span>Target: 80%+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {overviewData.costSegregation.operatingMargin}%
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Op Margin</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${overviewData.costSegregation.operatingMargin > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                  style={{ width: `${Math.min(100, Math.abs(overviewData.costSegregation.operatingMargin))}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Indirect Costs: {formatCurrency(overviewData.costSegregation.indirect)}</span>
                <span>{overviewData.costSegregation.operatingMargin > 0 ? 'Profitable' : 'Cash Burn'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Direct Costs (COGS)</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(overviewData.costSegregation.direct)}</p>
              <p className="text-[9px] text-slate-400 mt-1">Hosting, Success, Payment Proc.</p>
            </div>
            
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Indirect Costs (OpEx)</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(overviewData.costSegregation.indirect)}</p>
              <p className="text-[9px] text-slate-400 mt-1">R&D, S&M, G&A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DataDrivenTooltip
              metric="Monthly Revenue"
              value={formatCurrency(overviewData.monthlyRevenue)}
              dataContext={{
                monthlyRevenue: overviewData.monthlyRevenue,
                revenueGrowth: overviewData.revenueGrowth,
                previousMonthRevenue: overviewData.monthlyRevenue / (1 + overviewData.revenueGrowth / 100)
              }}
            />
            <div className={`flex items-center text-[10px] sm:text-xs mt-2 ${(overviewData.revenueGrowth ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(overviewData.revenueGrowth ?? 0) >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {(overviewData.revenueGrowth ?? 0) >= 0 ? "+" : ""}{(overviewData.revenueGrowth ?? 0).toFixed(1)}% <span className="hidden xs:inline ml-1">from last month</span><span className="xs:hidden ml-1">vs prev</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Burn Rate
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DataDrivenTooltip
              metric="Monthly Burn Rate"
              value={formatCurrency(overviewData.monthlyBurnRate)}
              dataContext={{
                monthlyBurnRate: overviewData.monthlyBurnRate,
                burnRateChange: overviewData.burnRateChange,
                previousMonthBurnRate: overviewData.monthlyBurnRate / (1 + overviewData.burnRateChange / 100)
              }}
            />
            <div className={`flex items-center text-[10px] sm:text-xs mt-2 ${(overviewData.burnRateChange ?? 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
              {(overviewData.burnRateChange ?? 0) >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {(overviewData.burnRateChange ?? 0) >= 0 ? "+" : ""}{(overviewData.burnRateChange ?? 0).toFixed(1)}% <span className="hidden xs:inline ml-1">from last month</span><span className="xs:hidden ml-1">vs prev</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Runway
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DataDrivenTooltip
              metric="Cash Runway"
              value={`${overviewData.cashRunway} months`}
              dataContext={{
                cashRunway: overviewData.cashRunway,
                monthlyBurnRate: overviewData.monthlyBurnRate,
                currentCash: overviewData.monthlyBurnRate * overviewData.cashRunway,
                runwayChange: overviewData.runwayChange
              }}
            />
            <div className={`flex items-center text-[10px] sm:text-xs mt-2 ${(overviewData.runwayChange ?? 0) >= 0 ? "text-green-600" : "text-yellow-600"}`}>
              {(overviewData.runwayChange ?? 0) >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {(overviewData.runwayChange ?? 0) >= 0 ? "+" : ""}{(overviewData.runwayChange ?? 0).toFixed(1)} mo <span className="hidden xs:inline ml-1">from last period</span><span className="xs:hidden ml-1">vs prev</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DataDrivenTooltip
              metric="Active Customers"
              value={overviewData.activeCustomers.toLocaleString()}
              dataContext={{
                activeCustomers: overviewData.activeCustomers
              }}
            />
            <div className="flex items-center text-xs text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              Growing
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Forecast</CardTitle>
            <CardDescription>Actual revenue compared to AI-generated forecasts</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      formatCurrency(value as number),
                      name === 'revenue' ? 'Actual Revenue' : name === 'forecast' ? (selectedModelId ? 'AI Forecast' : 'Estimated Growth') : name
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="revenue" />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Burn Rate & Runway</CardTitle>
            <CardDescription>Monthly burn rate and remaining runway projection</CardDescription>
          </CardHeader>
          <CardContent>
            {burnRateData && burnRateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                <AreaChart data={burnRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === 'runway' ? `${value} months` : formatCurrency(value as number),
                      name === 'burn' ? 'Monthly Burn' : 'Runway (months)'
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="burn"
                    stackId="1"
                    stroke="#ff7300"
                    fill="#ff7300"
                    fillOpacity={0.6}
                    name="burn"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                No burn rate data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Current month expense distribution</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-blue-600 font-bold text-xs uppercase tracking-wider">
                    Full Ledger View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Complete Expense Ledger</DialogTitle>
                    <DialogDescription>Itemized view of all recognized expenses for the period.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseBreakdown.map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{entry.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={classifyExpenseCategory(entry.name).color}>
                                {classifyExpenseCategory(entry.name).type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(entry.value)}</TableCell>
                            <TableCell className="text-right">
                              {((entry.value / totalExpenseValue) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {expenseBreakdown && expenseBreakdown.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-2xl">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">{data.name}</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(data.value)}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge className={`text-[10px] ${classifyExpenseCategory(data.name).color} border-current/20`}>
                                    {classifyExpenseCategory(data.name).type}
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {((data.value / totalExpenseValue) * 100).toFixed(1)}% of total
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                  No expense data available.
                </div>
              )}

              <div className="space-y-2">
                {expenseBreakdown.map((entry, index) => (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                              {entry.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                {classifyExpenseCategory(entry.name).type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(entry.value)}
                          </span>
                          <p className="text-[10px] font-medium text-slate-400">
                            {((entry.value / totalExpenseValue) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader className="pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800" style={{ color: entry.color }}>
                            <Scale className="h-6 w-6" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">{entry.name} Breakdown</DialogTitle>
                            <DialogDescription>SaaS Cost Segregation Analysis</DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>

                      <div className="py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(entry.value)}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contribution</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                              {((entry.value / totalExpenseValue) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`h-5 ${classifyExpenseCategory(entry.name).color} border-current/20`}>
                              {classifyExpenseCategory(entry.name).label}
                            </Badge>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Audit Classification</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {classifyExpenseCategory(entry.name).description}
                          </p>
                        </div>

                        {entry.vendors && entry.vendors.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Users className="h-3 w-3" /> Top Vendors / Recipients
                            </h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                              {entry.vendors.map((vendor: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{vendor.name}</span>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(vendor.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          <p className="text-[10px] font-medium italic">
                            "Audit verified: This category directly impacts your <strong>{classifyExpenseCategory(entry.name).type === 'COGS' ? 'Gross Margin' : 'Operating Margin'}</strong>."
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="pt-4 border-t">
                        <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-widest py-6">
                          View In Ledger
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Insights & Alerts</CardTitle>
            <CardDescription>Smart notifications and recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overviewData.alerts.length > 0 ? (
              overviewData.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === "warning"
                    ? "bg-yellow-50 border-yellow-200"
                    : alert.type === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                    }`}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : alert.type === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  )}
                  <div>
                    <div
                      className={`font-medium ${alert.type === "warning"
                        ? "text-yellow-800"
                        : alert.type === "success"
                          ? "text-green-800"
                          : "text-blue-800"
                        }`}
                    >
                      {alert.title}
                    </div>
                    <div
                      className={`text-sm ${alert.type === "warning"
                        ? "text-yellow-700"
                        : alert.type === "success"
                          ? "text-green-700"
                          : "text-blue-700"
                        }`}
                    >
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-800">No Alerts</div>
                  <div className="text-sm text-blue-700">All metrics are within normal ranges.</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Drill-Down Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: selectedExpense?.color }} />
              {selectedExpense?.name}
            </DialogTitle>
            <DialogDescription>
              Expense category deep-dive — click any segment on the pie chart.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4 pt-2">
              {/* Amount & Percentage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedExpense.value)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">% of Total Expenses</p>
                  <p className="text-xl font-bold">{selectedExpense.percentage.toFixed(1)}%</p>
                </div>
              </div>

              {/* Classification Badge */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Cost Classification (SaaS FP&A Standard)</p>
                <Badge variant="outline" className={`text-sm font-semibold ${selectedExpense.classification.color}`}>
                  {selectedExpense.classification.label}
                </Badge>
              </div>

              {/* Accountant Note */}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">📋 Auditor Note</p>
                <p className="text-muted-foreground">{selectedExpense.classification.description}</p>
              </div>

              {/* Gross Margin Impact */}
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium mb-1">Impact on Gross Margin</p>
                {selectedExpense.classification.type === 'COGS' ? (
                  <p className="text-muted-foreground">This is a <strong>direct delivery cost</strong>. Reducing it improves your <strong>gross margin</strong> — the #1 metric investors use to evaluate SaaS unit economics. Target: 70-90% gross margin.</p>
                ) : (
                  <p className="text-muted-foreground">This is an <strong>operating expense</strong> below the gross profit line. It affects your <strong>operating margin</strong> but NOT your gross margin. Optimize for efficiency, not elimination.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
