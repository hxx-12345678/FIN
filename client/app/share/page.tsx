"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { TrendingUp, TrendingDown, Target, Download, Eye, Loader2, AlertCircle, Sparkles, BrainCircuit, ShieldCheck, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialTermTooltip } from "@/components/financial-term-tooltip"
import { API_BASE_URL } from "@/lib/api-config"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"

function SharedDashboardContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgInfo, setOrgInfo] = useState<any>(null)

  useEffect(() => {
    if (token) {
      fetchSharedData(token)
    } else {
      setError("No access token provided")
      setLoading(false)
    }
  }, [token])

  const fetchSharedData = async (tokenValue: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/share/${tokenValue}?type=dashboard`)
      const result = await response.json()

      if (response.ok && result.ok) {
        setData(result.data?.dashboardData)
        setOrgInfo(result.data?.org)
      } else {
        setError(result.error?.message || "Failed to load shared dashboard")
      }
    } catch (err) {
      setError("An unexpected error occurred while loading the dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Decrypting secure financial dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-100">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>This link may be expired or invalid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => window.location.href = "/"}>Back to FinaPilot</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgInfo?.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (!data || !data.executiveSummary) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Public Header */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">FP</div>
             <div>
               <h1 className="text-sm font-bold leading-none">{orgInfo?.name}</h1>
               <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                 <ShieldCheck className="h-3 w-3 text-emerald-500" />
                 Verified Read-Only View
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 bg-slate-50">
               <Globe className="h-3 w-3" />
               External Access
             </Badge>
             <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">
               <Download className="h-3.5 w-3.5 mr-1.5" />
               Export PDF
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold h-5 text-[10px]">{data.executiveSummary.arrGrowth}% YoY</Badge>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current ARR</p>
              <h2 className="text-3xl font-black mt-1">{formatCurrency(data.executiveSummary.arr)}</h2>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-purple-500" />
                <Badge className="bg-purple-50 text-purple-700 border-purple-100 font-bold h-5 text-[10px]">{data.executiveSummary.customerGrowth}% YoY</Badge>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Customers</p>
              <h2 className="text-3xl font-black mt-1">{data.executiveSummary.activeCustomers}</h2>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-amber-500" />
                <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-bold h-5 text-[10px]">{data.executiveSummary.runwayChange} mo change</Badge>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cash Runway</p>
              <h2 className="text-3xl font-black mt-1">{data.executiveSummary.monthsRunway} Mo</h2>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BrainCircuit className="h-4 w-4 text-emerald-400" />
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${data.executiveSummary.healthScore}%` }} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Health Score</p>
              <h2 className="text-3xl font-black mt-1 text-emerald-400">{data.executiveSummary.healthScore}</h2>
            </CardContent>
          </Card>
        </div>

        {/* AI Narrative Section */}
        {data.aiNarrative && (
          <Card className="border-2 border-indigo-100 bg-white shadow-xl overflow-hidden">
             <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
             <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                   <Sparkles className="h-5 w-5 text-indigo-500" />
                   Strategic Summary & Insights
                </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap italic">
                   {data.aiNarrative}
                </div>
             </CardContent>
          </Card>
        )}

        {/* Charts & Main Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="border-none shadow-md bg-white">
             <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-slate-400">ARR Growth Trajectory</CardTitle>
             </CardHeader>
             <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyMetrics}>
                    <defs>
                      <linearGradient id="colorArr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), "ARR"]}
                    />
                    <Area type="monotone" dataKey="arr" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorArr)" />
                  </AreaChart>
                </ResponsiveContainer>
             </CardContent>
           </Card>

           <Card className="border-none shadow-md bg-white">
             <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Net Burn vs Revenue</CardTitle>
             </CardHeader>
             <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       formatter={(val: number) => formatCurrency(val)}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="burn" fill="#ef4444" radius={[4, 4, 0, 0]} name="Burn" />
                  </BarChart>
                </ResponsiveContainer>
             </CardContent>
           </Card>
        </div>

        {/* Unit Economics & SaaS Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="border-none shadow-md bg-white">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm">Unit Economics</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-xs text-muted-foreground">LTV</span>
                   <span className="font-bold">{formatCurrency(data.unitEconomics.ltv)}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs text-muted-foreground">CAC</span>
                   <span className="font-bold">{formatCurrency(data.unitEconomics.cac)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">LTV / CAC</span>
                    <span className={`text-sm font-black ${data.unitEconomics.ltvCacRatio >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                       {data.unitEconomics.ltvCacRatio.toFixed(1)}x
                    </span>
                  </div>
                </div>
             </CardContent>
           </Card>

           <Card className="border-none shadow-md bg-white lg:col-span-2">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm">SaaS Efficiency Benchmarks</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">NRR</p>
                      <p className="text-lg font-black text-slate-800">{data.saasMetrics.nrr}%</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Rule of 40</p>
                      <p className={`text-lg font-black ${data.saasMetrics.ruleOf40 >= 40 ? 'text-emerald-600' : 'text-slate-800'}`}>{data.saasMetrics.ruleOf40}%</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Burn Multiple</p>
                      <p className="text-lg font-black text-slate-800">{data.saasMetrics.burnMultiple}x</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Magic Number</p>
                      <p className="text-lg font-black text-slate-800">{data.saasMetrics.magicNumber}</p>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

export default function SharedDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing secure connection...</p>
      </div>
    }>
      <SharedDashboardContent />
    </Suspense>
  )
}
