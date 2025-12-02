"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  LineChart,
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
} from "recharts"
import { TrendingUp, TrendingDown, Target, Share, Download, Eye, MessageSquare, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface DashboardData {
  executiveSummary: {
    arr: number
    activeCustomers: number
    monthsRunway: number
    healthScore: number
    arrGrowth: number
    customerGrowth: number
    runwayChange: number
  }
  monthlyMetrics: Array<{
    month: string
    revenue: number
    customers: number
    burn: number
    arr: number
  }>
  milestones: Array<{
    title: string
    description: string
    status: "completed" | "in-progress" | "upcoming"
    date: string
    progress?: number
  }>
  keyUpdates: Array<{
    date: string
    title: string
    content: string
    type: "positive" | "neutral" | "negative"
  }>
  unitEconomics: {
    ltv: number
    cac: number
    ltvCacRatio: number
    paybackPeriod: number
  }
}

export function InvestorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchOrgId = async (): Promise<string | null> => {
    // Try to get from localStorage first
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) return storedOrgId

    // Fetch from /auth/me endpoint
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

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get orgId
      const currentOrgId = await fetchOrgId()
      if (!currentOrgId) {
        throw new Error("Organization ID not found. Please ensure you're logged in.")
      }

      setOrgId(currentOrgId)

      // Fetch dashboard data
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found. Please log in.")
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/investor-dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch dashboard data: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.data) {
        setData(result.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load investor dashboard data"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Default data for fallback
  const defaultData: DashboardData = {
    executiveSummary: {
      arr: 0,
      activeCustomers: 0,
      monthsRunway: 0,
      healthScore: 0,
      arrGrowth: 0,
      customerGrowth: 0,
      runwayChange: 0,
    },
    monthlyMetrics: [],
    milestones: [],
    keyUpdates: [],
    unitEconomics: {
      ltv: 0,
      cac: 0,
      ltvCacRatio: 0,
      paybackPeriod: 0,
    },
  }

  const dashboardData = data || defaultData
  const { executiveSummary, monthlyMetrics, milestones, keyUpdates, unitEconomics } = dashboardData

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} variant="outline">
          <Loader2 className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investor Dashboard</h1>
          <p className="text-muted-foreground">Real-time insights for stakeholders and investors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Add Comment
          </Button>
          <Button variant="outline">
            <Share className="mr-2 h-4 w-4" />
            Share Dashboard
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Executive Summary
          </CardTitle>
          <CardDescription>Key performance indicators and business health overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${(executiveSummary.arr / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-muted-foreground">Annual Recurring Revenue</div>
              <div className={`flex items-center justify-center text-xs mt-1 ${
                executiveSummary.arrGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {executiveSummary.arrGrowth >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {executiveSummary.arrGrowth >= 0 ? "+" : ""}
                {executiveSummary.arrGrowth.toFixed(1)}% MoM
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{executiveSummary.activeCustomers}</div>
              <div className="text-sm text-muted-foreground">Active Customers</div>
              <div className={`flex items-center justify-center text-xs mt-1 ${
                executiveSummary.customerGrowth >= 0 ? "text-blue-600" : "text-red-600"
              }`}>
                {executiveSummary.customerGrowth >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {executiveSummary.customerGrowth >= 0 ? "+" : ""}
                {executiveSummary.customerGrowth.toFixed(1)}% MoM
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{executiveSummary.monthsRunway.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Months Runway</div>
              <div className={`flex items-center justify-center text-xs mt-1 ${
                executiveSummary.runwayChange >= 0 ? "text-green-600" : "text-yellow-600"
              }`}>
                {executiveSummary.runwayChange >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {executiveSummary.runwayChange >= 0 ? "+" : ""}
                {executiveSummary.runwayChange.toFixed(1)} month
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{executiveSummary.healthScore}</div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <div className={`flex items-center justify-center text-xs mt-1 ${
                executiveSummary.healthScore >= 80 ? "text-green-600" : 
                executiveSummary.healthScore >= 60 ? "text-yellow-600" : "text-red-600"
              }`}>
                <TrendingUp className="mr-1 h-3 w-3" />
                {executiveSummary.healthScore >= 80 ? "Excellent" : 
                 executiveSummary.healthScore >= 60 ? "Good" : "Needs Attention"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue and ARR progression</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Monthly Revenue"
                  />
                </AreaChart>
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
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>Customer acquisition and retention trends</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="customers" stroke="#82ca9d" strokeWidth={3} name="Active Customers" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No customer data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Burn Rate and Runway */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Runway</CardTitle>
          <CardDescription>Monthly burn rate and cash runway projection</CardDescription>
        </CardHeader>
          <CardContent>
            {monthlyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                  <Bar dataKey="burn" fill="#ff7300" name="Monthly Burn" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No burn rate data available
              </div>
            )}
          </CardContent>
      </Card>

      {/* Milestones and Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Milestones</CardTitle>
            <CardDescription>Progress towards major business objectives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                <div
                  className={`w-3 h-3 rounded-full mt-2 ${
                    milestone.status === "completed"
                      ? "bg-green-500"
                      : milestone.status === "in-progress"
                        ? "bg-blue-500"
                        : "bg-gray-300"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{milestone.title}</h3>
                    <Badge
                      variant={
                        milestone.status === "completed"
                          ? "default"
                          : milestone.status === "in-progress"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {milestone.status === "in-progress"
                        ? "In Progress"
                        : milestone.status === "completed"
                          ? "Completed"
                          : "Upcoming"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{milestone.date}</span>
                    {milestone.progress && (
                      <div className="flex items-center gap-2">
                        <Progress value={milestone.progress} className="w-20 h-2" />
                        <span className="text-xs">{milestone.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>Latest company news and developments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyUpdates.map((update, index) => (
              <div key={index} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{update.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        update.type === "positive"
                          ? "default"
                          : update.type === "negative"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {update.type === "positive" ? "Positive" : update.type === "negative" ? "Attention" : "Update"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(update.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{update.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Unit Economics */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Economics</CardTitle>
          <CardDescription>Key financial metrics and ratios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                ${unitEconomics.ltv.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Customer LTV</div>
              <div className="text-xs text-muted-foreground mt-1">Lifetime Value</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                ${unitEconomics.cac.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Customer CAC</div>
              <div className="text-xs text-muted-foreground mt-1">Acquisition Cost</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {unitEconomics.ltvCacRatio.toFixed(1)}:1
              </div>
              <div className="text-sm text-purple-700">LTV:CAC Ratio</div>
              <div className="text-xs text-muted-foreground mt-1">
                {unitEconomics.ltvCacRatio >= 3 ? "Excellent" : unitEconomics.ltvCacRatio >= 1 ? "Good" : "Needs Improvement"}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {unitEconomics.paybackPeriod.toFixed(1)} months
              </div>
              <div className="text-sm text-orange-700">Payback Period</div>
              <div className="text-xs text-muted-foreground mt-1">Time to recover CAC</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Investor View Access</p>
              <p className="text-xs text-yellow-700">
                This dashboard provides read-only access to key business metrics. Last updated:{" "}
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
