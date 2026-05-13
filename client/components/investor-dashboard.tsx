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
import { TrendingUp, TrendingDown, Target, Share, Download, Eye, Loader2, AlertCircle, Sparkles, BrainCircuit, Users, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialTermTooltip } from "./financial-term-tooltip"
import { AgenticResponse } from "@/components/ai-assistant/agentic-response"
import { IntelligentInvestorDashboard } from "./intelligent-investor-dashboard"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"
import { useModel } from "@/lib/model-context"

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
  saasMetrics: {
    nrr: number
    grr: number
    ruleOf40: number
    burnMultiple: number
    magicNumber: number
  }
  headcount: {
    total: number
    byDepartment: Record<string, number>
    planned: number
    hired: number
  } | null
  aiNarrative: string | null
  competitiveBenchmark: {
    summary: string
    dataSources: any[]
  } | null
}


export function InvestorDashboard() {
  const router = useRouter()
  const { currencySymbol, formatCurrency } = useOrg()
  const { orgId, selectedModelId } = useModel()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) {
      fetchDashboardData()
    }
  }, [orgId, selectedModelId])

  const fetchDashboardData = async () => {
    if (!orgId) return;
    
    setLoading(true)
    setError(null)

    try {
      // Build URL with modelId parameter
      const url = new URL(`${API_BASE_URL}/orgs/${orgId}/investor-dashboard`)
      if (selectedModelId) {
        url.searchParams.append("modelId", selectedModelId)
      }

      // Fetch dashboard data
      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Your session has expired. Please log in again.")
      }

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
    saasMetrics: {
      nrr: 0,
      grr: 0,
      ruleOf40: 0,
      burnMultiple: 0,
      magicNumber: 0,
    },
    headcount: null,
    aiNarrative: null,
    competitiveBenchmark: null,
  }


  const dashboardData = data || defaultData
  const { executiveSummary, monthlyMetrics, milestones, keyUpdates, unitEconomics, saasMetrics, headcount, aiNarrative, competitiveBenchmark } = dashboardData


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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Investor Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Institutional-grade insights for board members and capital partners.</p>
        </div>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            Standard View
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2 bg-primary/5 text-primary">
            <BrainCircuit className="h-4 w-4" />
            Intelligence Portal
            <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 text-[10px] bg-primary text-white border-none">BETA</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6 pt-4">

          {/* AI Strategic Narrative */}
          {aiNarrative && (
            <Card className="border-l-4 border-l-indigo-500 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Strategic AI Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <AgenticResponse content={aiNarrative} />
                </div>
              </CardContent>
            </Card>
          )}

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            disabled={!orgId}
            onClick={async () => {
              if (!orgId) return;
              try {
                const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/share-tokens`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  credentials: "include",
                  body: JSON.stringify({
                    scope: 'read-only',
                    expiresInDays: 7
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  if (result.ok && result.shareToken) {
                    const shareableUrl = `${window.location.origin}/share/?token=${result.shareToken.token}`
                    await navigator.clipboard.writeText(shareableUrl);
                    toast.success("Share link copied to clipboard and opening in new tab");
                    
                    // Open in new tab immediately for verification
                    window.open(shareableUrl, "_blank", "noopener,noreferrer");
                  } else {
                    toast.error("Failed to generate share link");
                  }
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Dashboard link copied to clipboard!");
                }
              } catch (error) {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Dashboard link copied to clipboard!");
              }
            }}
          >
            <Share className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Share Dashboard</span>
            <span className="sm:hidden">Share</span>
          </Button>
          <Button 
            className="w-full sm:w-auto"
            disabled={!orgId}
            onClick={async () => {
              if (!orgId) return;
              toast.info("Generating investor report export...");
              try {
                // Use latest model run if possible, otherwise use manual export
                const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/exports`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  credentials: "include",
                  body: JSON.stringify({
                    type: 'pdf',
                    template: 'investor-update'
                  })
                });
                if (response.ok) {
                  toast.success("Investor report generated! Check your email or downloads shortly.");
                } else {
                  toast.error("Failed to generate export. Please try again.");
                }
              } catch (e) {
                toast.error("Error connecting to export service.");
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
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
                {currencySymbol}{(executiveSummary.arr / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                Annual Recurring Revenue
                <FinancialTermTooltip term="ARR" />
              </div>
              <div className={`flex items-center justify-center text-xs mt-1 ${executiveSummary.arrGrowth >= 0 ? "text-green-600" : "text-red-600"
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
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                Active Customers
                <FinancialTermTooltip term="Active Customers" />
              </div>
              <div className={`flex items-center justify-center text-xs mt-1 ${executiveSummary.customerGrowth >= 0 ? "text-blue-600" : "text-red-600"
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
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                Months Runway
                <FinancialTermTooltip term="Cash Runway" />
              </div>
              <div className={`flex items-center justify-center text-xs mt-1 ${executiveSummary.runwayChange >= 0 ? "text-green-600" : "text-yellow-600"
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
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                Health Score
                <FinancialTermTooltip term="Health Score" />
              </div>
              <div className={`flex items-center justify-center text-xs mt-1 ${executiveSummary.healthScore >= 80 ? "text-green-600" :
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
          <CardContent className="h-[300px]">
            {monthlyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(value as number), "Revenue"]} 
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Monthly Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center space-y-2">
                <div className="p-3 bg-muted rounded-full"><TrendingUp className="h-6 w-6 opacity-20" /></div>
                <p>Waiting for model synchronization...</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50">Diagnostic: Empty Metric Array</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>Customer acquisition and retention trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {monthlyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="#82ca9d" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#82ca9d', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0 }} 
                    name="Active Customers" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center space-y-2">
                <div className="p-3 bg-muted rounded-full"><Users className="h-6 w-6 opacity-20" /></div>
                <p>Establishing customer growth signals...</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50">Diagnostic: Missing Time-Series Node</p>
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
        <CardContent className="h-[300px]">
          {monthlyMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(value as number), "Burn"]} 
                />
                <Bar dataKey="burn" fill="#ff7300" radius={[6, 6, 0, 0]} name="Monthly Burn" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center space-y-2">
              <div className="p-3 bg-muted rounded-full"><Clock className="h-6 w-6 opacity-20" /></div>
              <p>Burn analysis pending ledger reconciliation...</p>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Diagnostic: Burn Vector Uninitialized</p>
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
                  className={`w-3 h-3 rounded-full mt-2 ${milestone.status === "completed"
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
          {unitEconomics.ltv === 0 && unitEconomics.cac === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg border border-dashed">
              <Sparkles className="h-8 w-8 text-indigo-500 mb-3" />
              <h3 className="font-semibold text-slate-900">Advanced Metrics Required</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2 px-4">
                We've imported your transaction data, but deep unit economics (LTV, CAC, Payback) require an active financial model.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/dashboard/modeling')}
              >
                Run First Model
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(unitEconomics.ltv)}
                </div>
                <div className="text-sm text-green-700 flex items-center justify-center">
                  Customer LTV
                  <FinancialTermTooltip term="LTV" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">Lifetime Value</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(unitEconomics.cac)}
                </div>
                <div className="text-sm text-blue-700 flex items-center justify-center">
                  Customer CAC
                  <FinancialTermTooltip term="CAC" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">Acquisition Cost</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {unitEconomics.ltvCacRatio.toFixed(1)}:1
                </div>
                <div className="text-sm text-purple-700 flex items-center justify-center">
                  LTV:CAC Ratio
                  <FinancialTermTooltip term="LTV:CAC Ratio" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {unitEconomics.ltvCacRatio >= 3 ? "Excellent" : unitEconomics.ltvCacRatio >= 1 ? "Good" : "Needs Improvement"}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  {unitEconomics.paybackPeriod.toFixed(1)} months
                </div>
                <div className="text-sm text-orange-700 flex items-center justify-center">
                  Payback Period
                  <FinancialTermTooltip term="Payback Period" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">Time to recover CAC</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Headcount & SaaS Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SaaS Efficiency Benchmarks</CardTitle>
            <CardDescription>Capital efficiency and retention metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">NRR</p>
                <p className="text-2xl font-bold">{typeof saasMetrics.nrr === 'number' ? saasMetrics.nrr.toFixed(1) : saasMetrics.nrr}%</p>
                <p className="text-[10px] text-slate-500 mt-1">Net Revenue Retention</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Burn Multiple</p>
                <p className="text-2xl font-bold">{saasMetrics.burnMultiple.toFixed(2)}x</p>
                <p className="text-[10px] text-slate-500 mt-1">Net Burn / Net New ARR</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Rule of 40</p>
                <p className="text-2xl font-bold">{saasMetrics.ruleOf40.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500 mt-1">Growth + Margin</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Magic Number</p>
                <p className="text-2xl font-bold">{saasMetrics.magicNumber.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Sales Efficiency Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Headcount & Org Scaling</CardTitle>
            <CardDescription>Team distribution and hiring progress</CardDescription>
          </CardHeader>
          <CardContent>
            {headcount ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-center flex-1 border-r">
                    <p className="text-2xl font-bold text-indigo-600">{headcount.total}</p>
                    <p className="text-xs text-muted-foreground">Total Headcount</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-emerald-600">{headcount.hired}</p>
                    <p className="text-xs text-muted-foreground">Hired / Active</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                  {Object.entries(headcount.byDepartment).map(([dept, count], i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{dept}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${(count / headcount.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-4 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm italic">
                Connect HRIS or update headcount plan to see organizational data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitive Benchmark */}
      {competitiveBenchmark && (
        <Card className="bg-slate-900 text-white overflow-hidden border-none">
          <CardHeader className="bg-slate-800/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Market Context & Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <AgenticResponse content={competitiveBenchmark.summary} />
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="text-slate-400 border-slate-700">Top Quartile Growth</Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-700">Efficiency Optimized</Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-700">Series {dashboardData.executiveSummary.arr > 10000000 ? 'C' : dashboardData.executiveSummary.arr > 5000000 ? 'B' : 'A'} Leader</Badge>
            </div>
          </CardContent>
        </Card>
      )}


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
        </TabsContent>

        <TabsContent value="intelligence" className="pt-4">
          <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="text-xs font-bold">
              SIMULATION MODE: Adjusting drivers in this view performs a non-destructive Hyperblock recomputation for "What-If" analysis. 
              The Operating Plan remains unchanged.
            </AlertDescription>
          </Alert>
          <IntelligentInvestorDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
