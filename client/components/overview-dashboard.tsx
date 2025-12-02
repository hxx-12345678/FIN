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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

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
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

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

  const fetchOverviewData = async () => {
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

      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch overview data: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.data) {
        setData(result.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load overview data"
      setError(errorMessage)
      console.error("Error fetching overview data:", err)
      // Don't show toast for 404s (expected for new users)
      if (!errorMessage.includes("404")) {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverviewData()
  }, [])

  // Listen for CSV import completion to refresh data
  useEffect(() => {
    const handleImportComplete = () => {
      fetchOverviewData()
    }

    window.addEventListener('csv-import-completed', handleImportComplete)
    return () => {
      window.removeEventListener('csv-import-completed', handleImportComplete)
    }
  }, [])

  const handleGenerateReport = async () => {
    if (!orgId) {
      toast.error("Organization ID not found. Please ensure you're logged in.")
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

      toast.info("Generating financial overview report...")

      // Create investor export (PDF format for overview report)
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          format: "pdf",
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
                const filename = exportData?.filename || statusData.filename || `financial-overview-report-${new Date().toISOString().split('T')[0]}.pdf`
                
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

  const { chartData: paginatedRevenueData, hasMore: hasMoreRevenue, loadMore: loadMoreRevenue, initializeData: initRevenue } = useChartPagination({
    defaultMonths: 36,
    onLoadMore: async (startDate, endDate) => {
      const revenueData = data?.revenueData || defaultRevenueData
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
      initRevenue(defaultRevenueData)
    }
  }, [data, initRevenue])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const overviewData = data || {
    healthScore: 82,
    monthlyRevenue: 67000,
    monthlyBurnRate: 44000,
    cashRunway: 13,
    activeCustomers: 1247,
    revenueGrowth: 12.5,
    burnRateChange: 7.3,
    runwayChange: -1,
    revenueData: defaultRevenueData,
    burnRateData: defaultBurnRateData,
    expenseBreakdown: defaultExpenseBreakdown,
    alerts: [],
  }

  const revenueData = overviewData.revenueData
  const burnRateData = overviewData.burnRateData
  const expenseBreakdown = overviewData.expenseBreakdown

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">AI-powered insights for your business performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button onClick={handleGenerateReport} disabled={!orgId}>
            <Zap className="mr-2 h-4 w-4" />
            Generate Report
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
              </CardTitle>
              <CardDescription>Your startup's financial health based on key metrics</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{overviewData.healthScore}</div>
              <div className="text-sm text-muted-foreground">
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
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overviewData.monthlyRevenue.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${overviewData.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {overviewData.revenueGrowth >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.revenueGrowth >= 0 ? "+" : ""}{overviewData.revenueGrowth.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overviewData.monthlyBurnRate.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${overviewData.burnRateChange >= 0 ? "text-red-600" : "text-green-600"}`}>
              {overviewData.burnRateChange >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.burnRateChange >= 0 ? "+" : ""}{overviewData.burnRateChange.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Runway</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.cashRunway} months</div>
            <div className={`flex items-center text-xs ${overviewData.runwayChange >= 0 ? "text-green-600" : "text-yellow-600"}`}>
              {overviewData.runwayChange >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {overviewData.runwayChange >= 0 ? "+" : ""}{overviewData.runwayChange.toFixed(1)} month from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.activeCustomers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              Growing
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Forecast</CardTitle>
            <CardDescription>Actual revenue compared to AI-generated forecasts</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]} />
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
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
              <ResponsiveContainer width="100%" height={300}>
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
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No burn rate data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Current month expense distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
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
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    alert.type === "warning"
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
                      className={`font-medium ${
                        alert.type === "warning"
                          ? "text-yellow-800"
                          : alert.type === "success"
                          ? "text-green-800"
                          : "text-blue-800"
                      }`}
                    >
                      {alert.title}
                    </div>
                    <div
                      className={`text-sm ${
                        alert.type === "warning"
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
