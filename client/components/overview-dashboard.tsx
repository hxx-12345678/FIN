"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthToken, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
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
  }>
  alerts: Array<{
    type: "warning" | "success" | "info"
    title: string
    message: string
  }>
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

const defaultExpenseBreakdown = [
  { name: "Payroll", value: 180000, color: "#8884d8" },
  { name: "Marketing", value: 45000, color: "#82ca9d" },
  { name: "Operations", value: 32000, color: "#ffc658" },
  { name: "R&D", value: 28000, color: "#ff7300" },
  { name: "Other", value: 15000, color: "#00ff88" },
]

export function OverviewDashboard() {
  const { selectedModelId, setSelectedModelId, orgId: contextOrgId, setOrgId: setContextOrgId } = useModel()
  const { currencySymbol, formatCurrency } = useOrg()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(contextOrgId)
  const [models, setModels] = useState<any[]>([])

  const fetchOrgId = async () => {
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

      if (!token) {
        console.warn("[Overview] No token found for fetchOrgId")
        return null
      }

      const url = `${API_BASE_URL}/auth/me`
      console.log("[Overview] Fetching orgId from:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

      const token = getAuthToken()

      if (!token) {
        const errorMsg = "Authentication token not found. Please log in again."
        console.error("[Overview] No token found")
        setError(errorMsg)
        setLoading(false)
        return
      }

      if (!token) {
        const errorMsg = "Authentication token not found. Please log in."
        console.error("[Overview] No token found:", errorMsg)
        setError(errorMsg)
        toast.error(errorMsg)
        handleUnauthorized()
        setLoading(false)
        return
      }

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
        const token = getAuthToken()
        if (token) {
          await fetchModels(currentOrgId, token)
        }
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

  const overviewData = data || {
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
  }

  const revenueData = overviewData.revenueData
  const burnRateData = overviewData.burnRateData
  const expenseBreakdown = overviewData.expenseBreakdown

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
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
          <Button className="w-full sm:w-auto">
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
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-green-600">Growth</div>
                <div className="text-muted-foreground">
                  {overviewData.revenueGrowth >= 0 ? "+" : ""}{overviewData.revenueGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">Burn Rate</div>
                <div className="text-muted-foreground">
                  {overviewData.burnRateChange >= 0 ? "+" : ""}{overviewData.burnRateChange.toFixed(1)}%
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className={`flex items-center text-xs mt-2 ${overviewData.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {overviewData.revenueGrowth >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.revenueGrowth >= 0 ? "+" : ""}{overviewData.revenueGrowth.toFixed(1)}% from last month
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
            <div className={`flex items-center text-xs mt-2 ${overviewData.burnRateChange >= 0 ? "text-red-600" : "text-green-600"}`}>
              {overviewData.burnRateChange >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.burnRateChange >= 0 ? "+" : ""}{overviewData.burnRateChange.toFixed(1)}% from last month
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
            <div className={`flex items-center text-xs mt-2 ${overviewData.runwayChange >= 0 ? "text-green-600" : "text-yellow-600"}`}>
              {overviewData.runwayChange >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.runwayChange >= 0 ? "+" : ""}{overviewData.runwayChange.toFixed(1)} month from last period
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
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), ""]} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Actual Revenue" />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="AI Forecast"
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
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="burn"
                    stackId="1"
                    stroke="#ff7300"
                    fill="#ff7300"
                    fillOpacity={0.6}
                    name="Monthly Burn"
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
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Current month expense distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdown && expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const name = props.name ?? ''
                      const percent = props.percent ?? 0
                      return `${name} ${(percent * 100).toFixed(0)}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                No expense data available. Promote transactions to the ledger to see breakdown.
              </div>
            )}
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
    </div>
  )
}
