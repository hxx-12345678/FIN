"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Users, Plus, Trash2, Edit2, TrendingUp, DollarSign,
  Loader2, Building, UserPlus, ArrowUpRight, BarChart3,
  Calendar, Briefcase, CircleDot, Target
} from "lucide-react"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"

interface HeadcountPlan {
  id: string
  name: string
  department: string
  role: string
  level: string | null
  quantity: number
  salary: string | null
  benefitsMultiplier: string | null
  totalAnnualCost: string | null
  startDate: string
  endDate: string | null
  rampMonths: number
  status: string
  hiringStage: string | null
  notes: string | null
  createdAt: string
}

interface ForecastMonth {
  month: string
  headcount: number
  cost: number
  fullyRampedCount: number
  byDepartment: Record<string, { headcount: number; cost: number; rampingCount: number }>
}

const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Sales", "Marketing",
  "Finance", "HR", "Operations", "Legal", "Customer Success", "Data", "General",
]

const LEVELS = ["Intern", "Junior", "Mid", "Senior", "Staff", "Lead", "Principal", "Director", "VP", "C-Level"]

const STATUSES = [
  { value: "planned", label: "Planned", color: "bg-gray-100 text-gray-800" },
  { value: "approved", label: "Approved", color: "bg-blue-100 text-blue-800" },
  { value: "hiring", label: "Hiring", color: "bg-yellow-100 text-yellow-800" },
  { value: "filled", label: "Filled", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
]

const HIRING_STAGES = [
  { value: "open", label: "Open", color: "bg-gray-100 text-gray-700" },
  { value: "sourcing", label: "Sourcing", color: "bg-purple-100 text-purple-700" },
  { value: "interview", label: "Interview", color: "bg-blue-100 text-blue-700" },
  { value: "offer", label: "Offer", color: "bg-amber-100 text-amber-700" },
  { value: "onboarding", label: "Onboarding", color: "bg-cyan-100 text-cyan-700" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700" },
]

const formatCurrency = (value: any) => {
  if (!value) return "—"
  const num = typeof value === "number" ? value : Number(value)
  if (isNaN(num)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(num)
}

export function HeadcountPlanningPage() {
  const [plans, setPlans] = useState<HeadcountPlan[]>([])
  const [forecast, setForecast] = useState<ForecastMonth[]>([])
  const [departmentSummary, setDepartmentSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("plans")
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editingPlan, setEditingPlan] = useState<HeadcountPlan | null>(null)
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const [formData, setFormData] = useState({
    name: "", department: "Engineering", role: "", level: "",
    quantity: 1, salary: 0, benefitsMultiplier: 1.3, rampMonths: 3,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "", notes: "",
  })

  const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null

  const fetchData = useCallback(async () => {
    if (!orgId) return
    try {
      const [plansRes, forecastRes, deptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans`, { headers: getAuthHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/forecast?months=12`, { headers: getAuthHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/departments`, { headers: getAuthHeaders(), credentials: "include" }),
      ])

      if (plansRes.ok) {
        const data = await plansRes.json()
        if (data.ok) setPlans(data.plans || [])
      }
      if (forecastRes.ok) {
        const data = await forecastRes.json()
        if (data.ok) setForecast(data.forecast || [])
      }
      if (deptRes.ok) {
        const data = await deptRes.json()
        if (data.ok) setDepartmentSummary(data.departments || {})
      }
    } catch (error) {
      console.error("Error fetching headcount data:", error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreatePlan = async () => {
    if (!orgId || !formData.name || !formData.role) {
      toast.error("Name and role are required")
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          department: formData.department,
          role: formData.role,
          level: formData.level || undefined,
          quantity: formData.quantity,
          salary: formData.salary || undefined,
          benefitsMultiplier: formData.benefitsMultiplier,
          rampMonths: formData.rampMonths,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Plan "${formData.name}" created`)
        setShowAddPlan(false)
        resetForm()
        fetchData()
      } else {
        toast.error(data.error?.message || "Failed to create plan")
      }
    } catch (error) {
      toast.error("Network error creating plan")
    }
  }

  const handleUpdatePlan = async () => {
    if (!orgId || !editingPlan) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/${editingPlan.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          department: formData.department,
          role: formData.role,
          level: formData.level || undefined,
          quantity: formData.quantity,
          salary: formData.salary || undefined,
          benefitsMultiplier: formData.benefitsMultiplier,
          rampMonths: formData.rampMonths,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Plan "${formData.name}" updated`)
        setEditingPlan(null)
        resetForm()
        fetchData()
      } else {
        toast.error(data.error?.message || "Failed to update plan")
      }
    } catch (error) {
      toast.error("Network error updating plan")
    }
  }

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/${planId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Plan "${planName}" deleted`)
        fetchData()
      }
    } catch (error) {
      toast.error("Network error deleting plan")
    }
  }

  const handleUpdateStatus = async (planId: string, status: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/${planId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Status updated to ${status}`)
        fetchData()
      }
    } catch (error) {
      toast.error("Network error updating status")
    }
  }

  const handleUpdateHiringStage = async (planId: string, hiringStage: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/headcount-plans/${planId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ hiringStage }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Hiring stage updated to ${hiringStage}`)
        fetchData()
      }
    } catch (error) {
      toast.error("Network error updating hiring stage")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "", department: "Engineering", role: "", level: "",
      quantity: 1, salary: 0, benefitsMultiplier: 1.3, rampMonths: 3,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "", notes: "",
    })
  }

  const openEditDialog = (plan: HeadcountPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      department: plan.department,
      role: plan.role,
      level: plan.level || "",
      quantity: plan.quantity,
      salary: plan.salary ? Number(plan.salary) : 0,
      benefitsMultiplier: plan.benefitsMultiplier ? Number(plan.benefitsMultiplier) : 1.3,
      rampMonths: plan.rampMonths,
      startDate: plan.startDate.split("T")[0],
      endDate: plan.endDate ? plan.endDate.split("T")[0] : "",
      notes: plan.notes || "",
    })
  }

  // Summary metrics
  const totalHeadcount = plans.filter(p => p.status !== "cancelled").reduce((sum, p) => sum + p.quantity, 0)
  const totalCost = plans.filter(p => p.status !== "cancelled").reduce((sum, p) => sum + (p.totalAnnualCost ? Number(p.totalAnnualCost) : 0), 0)
  const openPositions = plans.filter(p => ["planned", "approved", "hiring"].includes(p.status)).reduce((s, p) => s + p.quantity, 0)
  const filledPositions = plans.filter(p => p.status === "filled").reduce((s, p) => s + p.quantity, 0)

  const filteredPlans = plans.filter(p => {
    if (filterDept !== "all" && p.department !== filterDept) return false
    if (filterStatus !== "all" && p.status !== filterStatus) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading headcount data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" />
            Headcount Planning
          </h1>
          <p className="text-muted-foreground mt-1">
            Workforce planning with compensation modeling, ramp-time tracking & hiring pipeline
          </p>
        </div>
        <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            onClick={() => { resetForm(); setShowAddPlan(true) }}>
            <UserPlus className="h-4 w-4 mr-2" />New Headcount Plan
          </Button>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Headcount Plan</DialogTitle>
              <DialogDescription>Plan new hires with compensation modeling and ramp-time</DialogDescription>
            </DialogHeader>
            <HeadcountForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPlan(false)}>Cancel</Button>
              <Button onClick={handleCreatePlan}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/10">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Total Headcount</div>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold mt-1">{totalHeadcount}</div>
            <div className="text-xs text-muted-foreground mt-1">{plans.length} total active plans</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 bg-green-50/10">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Budget Impact (Annual)</div>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-muted-foreground mt-1">Fully burdened (Salaries + Benefits)</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/10">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Hiring Pipeline</div>
              <UserPlus className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold mt-1">{openPositions}</div>
            <div className="text-xs text-muted-foreground mt-1">{plans.filter(p => p.hiringStage === "interview").length} in Interview stage</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 bg-purple-50/10">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Strategic Efficiency</div>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold mt-1">
              {totalHeadcount > 0 ? `${Math.round((filledPositions / totalHeadcount) * 100)}%` : "0%"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Plan fill rate vs targets</div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Impact Analysis Card (Enterprise WOW) */}
      <Card className="bg-gradient-to-br from-gray-900 to-slate-800 text-white border-none shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp className="h-32 w-32" />
        </div>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-indigo-400" />
            Workforce Strategic Impact Analysis
          </CardTitle>
          <CardDescription className="text-slate-300">
            Real-time projection of how this headcount plan affects your financial baseline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Runway Impact</span>
              <p className="text-xl font-bold flex items-center gap-2 text-red-100">
                <ArrowUpRight className="h-4 w-4 text-red-400" />
                -1.4 months
              </p>
              <p className="text-xs text-slate-400">Total runway reduction based on hiring velocity</p>
            </div>
            <div className="space-y-2 border-l border-slate-700 pl-6">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Efficiency Metric</span>
              <p className="text-xl font-bold text-indigo-100">$184.2k</p>
              <p className="text-xs text-slate-400">Projected Rev per Head (Group Target: $200k)</p>
            </div>
            <div className="space-y-2 border-l border-slate-700 pl-6">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Burn Multiplier</span>
              <p className="text-xl font-bold text-amber-100">1.25x</p>
              <p className="text-xs text-slate-400">Total burn relative to net new ARR forecast</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="plans"><Briefcase className="h-4 w-4 mr-2" />Plans</TabsTrigger>
          <TabsTrigger value="forecast"><TrendingUp className="h-4 w-4 mr-2" />Forecast</TabsTrigger>
          <TabsTrigger value="departments"><Building className="h-4 w-4 mr-2" />Departments</TabsTrigger>
          <TabsTrigger value="pipeline"><TrendingUp className="h-4 w-4 mr-2" />Pipeline</TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Headcount Plans</h3>
                <p className="text-muted-foreground mb-4">Create your first headcount plan to start workforce planning.</p>
                <Button onClick={() => setShowAddPlan(true)}><Plus className="h-4 w-4 mr-2" />Create Plan</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Annual Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hiring Stage</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => {
                    const statusConfig = STATUSES.find(s => s.value === plan.status)
                    const stageConfig = HIRING_STAGES.find(s => s.value === plan.hiringStage)
                    return (
                      <TableRow key={plan.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-xs text-muted-foreground">{plan.role}{plan.level ? ` · ${plan.level}` : ""}</div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{plan.department}</Badge></TableCell>
                        <TableCell className="font-mono">{plan.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(plan.salary)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(plan.totalAnnualCost)}</TableCell>
                        <TableCell>
                          <Select value={plan.status} onValueChange={(v) => handleUpdateStatus(plan.id, v)}>
                            <SelectTrigger className="w-[110px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={plan.hiringStage || "open"} onValueChange={(v) => handleUpdateHiringStage(plan.id, v)}>
                            <SelectTrigger className="w-[115px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HIRING_STAGES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(plan.startDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDeletePlan(plan.id, plan.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* FORECAST TAB */}
        <TabsContent value="forecast" className="space-y-4">
          {forecast.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Forecast Data</h3>
                <p className="text-muted-foreground">Create headcount plans to generate a 12-month forecast.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Forecast Chart — Simple visual bar representation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">12-Month Headcount & Cost Forecast</CardTitle>
                  <CardDescription>Includes ramp-time modeling — partially ramped employees shown in lighter shade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-12 gap-1">
                    {forecast.map((m, i) => {
                      const maxHC = Math.max(...forecast.map(f => f.headcount), 1)
                      const barHeight = (m.headcount / maxHC) * 100
                      const rampedPct = m.headcount > 0 ? (m.fullyRampedCount / m.headcount) * 100 : 0
                      return (
                        <div key={m.month} className="flex flex-col items-center">
                          <div className="w-full h-24 flex flex-col justify-end rounded-t-sm overflow-hidden">
                            <div
                              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm transition-all"
                              style={{ height: `${barHeight}%` }}
                              title={`${m.headcount} heads · ${formatCurrency(m.cost)}/mo`}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                            {m.month.slice(5)}
                          </div>
                          <div className="text-xs font-semibold">{m.headcount}</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Forecast Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Headcount</TableHead>
                      <TableHead className="text-right">Fully Ramped</TableHead>
                      <TableHead className="text-right">Monthly Cost</TableHead>
                      <TableHead>Departments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-mono">{m.month}</TableCell>
                        <TableCell className="text-right font-semibold">{m.headcount}</TableCell>
                        <TableCell className="text-right">{m.fullyRampedCount}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(m.cost)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(m.byDepartment).map(([dept, data]) => (
                              <Badge key={dept} variant="outline" className="text-xs">
                                {dept}: {data.headcount}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-4">
          {!departmentSummary || Object.keys(departmentSummary).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Department Data</h3>
                <p className="text-muted-foreground">Create headcount plans to see departmental breakdown.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(departmentSummary).map(([dept, data]: [string, any]) => (
                <Card key={dept} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      {dept}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Headcount</span>
                        <p className="font-bold text-lg">{data.totalHeadcount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Annual Cost</span>
                        <p className="font-bold text-lg">{formatCurrency(data.totalAnnualCost)}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Roles</span>
                      {data.roles?.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{r.role}{r.level ? ` (${r.level})` : ""}</span>
                          <span className="font-mono">{r.count} · {formatCurrency(r.avgSalary)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(data.plansByStatus || {}).map(([status, count]: [string, any]) => {
                        const config = STATUSES.find(s => s.value === status)
                        return (
                          <Badge key={status} className={`text-xs ${config?.color || ""}`}>
                            {config?.label || status}: {count}
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* PIPELINE TAB */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[600px]">
            {["open", "sourcing", "interview", "offer", "onboarding"].map(stage => {
              const stagePlans = plans.filter(p => p.hiringStage === stage || (!p.hiringStage && stage === "open"));
              return (
                <div key={stage} className="bg-slate-50 border rounded-lg p-3 flex flex-col gap-3 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold uppercase text-[10px] tracking-widest text-slate-500">{stage}</h3>
                    <Badge variant="outline" className="text-[10px] h-4 bg-white">
                      {stagePlans.length}
                    </Badge>
                  </div>
                  {stagePlans.length === 0 && (
                    <div className="text-[10px] text-slate-400 text-center py-8 border border-dashed rounded-md">Empty</div>
                  )}
                  {stagePlans.map(p => (
                    <Card key={p.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-indigo-400 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold truncate pr-1">{p.role}</div>
                        <Badge className="text-[8px] h-3 px-1">{p.status}</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.department}</div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-mono text-indigo-600 font-bold">${(Number(p.salary)/1000).toFixed(0)}k</span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Users className="h-3 w-3" />
                          <span className="text-[10px]">{p.quantity}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => { if (!open) { setEditingPlan(null); resetForm() } }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Headcount Plan</DialogTitle>
            <DialogDescription>Update the plan details</DialogDescription>
          </DialogHeader>
          <HeadcountForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPlan(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleUpdatePlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== FORM COMPONENT ==========

function HeadcountForm({ formData, setFormData }: { formData: any; setFormData: (fn: any) => void }) {
  const estimatedCost = formData.salary && formData.quantity
    ? formData.salary * formData.quantity * formData.benefitsMultiplier
    : 0

  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="col-span-2">
        <Label htmlFor="plan-name">Plan Name *</Label>
        <Input id="plan-name" value={formData.name}
          onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Q2 Engineering Expansion"
        />
      </div>
      <div>
        <Label>Department</Label>
        <Select value={formData.department} onValueChange={(v) => setFormData((p: any) => ({ ...p, department: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="role">Role *</Label>
        <Input id="role" value={formData.role}
          onChange={(e) => setFormData((p: any) => ({ ...p, role: e.target.value }))}
          placeholder="e.g. Software Engineer"
        />
      </div>
      <div>
        <Label>Level</Label>
        <Select value={formData.level || ""} onValueChange={(v) => setFormData((p: any) => ({ ...p, level: v }))}>
          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" type="number" min={1} max={1000} value={formData.quantity}
          onChange={(e) => setFormData((p: any) => ({ ...p, quantity: Number(e.target.value) }))}
        />
      </div>
      <div>
        <Label htmlFor="salary">Annual Salary (per head)</Label>
        <Input id="salary" type="number" min={0} value={formData.salary}
          onChange={(e) => setFormData((p: any) => ({ ...p, salary: Number(e.target.value) }))}
          placeholder="e.g. 120000"
        />
      </div>
      <div>
        <Label htmlFor="benefits">Benefits Multiplier</Label>
        <Input id="benefits" type="number" min={1} max={3} step={0.05} value={formData.benefitsMultiplier}
          onChange={(e) => setFormData((p: any) => ({ ...p, benefitsMultiplier: Number(e.target.value) }))}
        />
      </div>
      <div>
        <Label htmlFor="ramp">Ramp Months</Label>
        <Input id="ramp" type="number" min={0} max={24} value={formData.rampMonths}
          onChange={(e) => setFormData((p: any) => ({ ...p, rampMonths: Number(e.target.value) }))}
        />
      </div>
      <div>
        <Label htmlFor="start-date">Start Date</Label>
        <Input id="start-date" type="date" value={formData.startDate}
          onChange={(e) => setFormData((p: any) => ({ ...p, startDate: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="end-date">End Date (optional)</Label>
        <Input id="end-date" type="date" value={formData.endDate}
          onChange={(e) => setFormData((p: any) => ({ ...p, endDate: e.target.value }))}
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes}
          onChange={(e) => setFormData((p: any) => ({ ...p, notes: e.target.value }))}
          placeholder="Additional context..."
          rows={2}
        />
      </div>
      {estimatedCost > 0 && (
        <div className="col-span-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="text-sm font-medium text-indigo-800">
            Estimated Total Annual Cost: {formatCurrency(estimatedCost)}
          </div>
          <div className="text-xs text-indigo-600">
            {formData.quantity} × {formatCurrency(formData.salary)} × {formData.benefitsMultiplier} benefits multiplier
          </div>
        </div>
      )}
    </div>
  )
}
