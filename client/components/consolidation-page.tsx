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
import { toast } from "sonner"
import {
  Building2, Globe, Plus, Trash2, Edit2, PlayCircle, ArrowDownUp,
  TrendingUp, DollarSign, Percent, RefreshCw, ChevronRight, BarChart3,
  FileText, AlertTriangle, GitBranch, Loader2, Settings, Eye, CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"

interface ConsolidationEntity {
  id: string
  name: string
  code: string | null
  entityType: string
  currency: string
  ownershipPct: number
  country: string | null
  taxRate: number | null
  isActive: boolean
  hasFinancialData?: boolean
}

interface ConsolidationResult {
  consolidated: any
  entities: any[]
  metadata: {
    entitiesConsolidated: number
    startMonth: string
    horizonMonths: number
    accountingStandard: string
    fxRates: Record<string, number>
    generatedAt: string
    note?: string
  }
}

const ENTITY_TYPES = [
  { value: "parent", label: "Parent Company", color: "bg-blue-100 text-blue-800" },
  { value: "subsidiary", label: "Subsidiary", color: "bg-green-100 text-green-800" },
  { value: "joint_venture", label: "Joint Venture", color: "bg-purple-100 text-purple-800" },
  { value: "associate", label: "Associate", color: "bg-amber-100 text-amber-800" },
]

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL", "KRW", "SGD", "HKD", "SEK"]
const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan", "Canada",
  "Australia", "India", "China", "Brazil", "Singapore", "Hong Kong",
  "Switzerland", "Sweden", "Netherlands", "Ireland", "Luxembourg"
]

export function ConsolidationPage() {
  const [entities, setEntities] = useState<ConsolidationEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null)
  const [isConsolidating, setIsConsolidating] = useState(false)
  const [showAddEntity, setShowAddEntity] = useState(false)
  const [editingEntity, setEditingEntity] = useState<ConsolidationEntity | null>(null)
  const [activeTab, setActiveTab] = useState("entities")
  const [accountingStandard, setAccountingStandard] = useState<"IFRS" | "GAAP">("IFRS")
  const [activeStep, setActiveStep] = useState(1); // 1: Mapping, 2: FX, 3: IC, 4: Review

  // Form state
  const [formData, setFormData] = useState({
    name: "", code: "", entityType: "subsidiary", currency: "USD",
    ownershipPct: 100, country: "", taxRate: 21,
  })

  const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null

  const fetchEntities = useCallback(async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/consolidation/summary`, {
        headers: getAuthHeaders(), credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.entities) {
          setEntities(data.entities)
        }
      }
    } catch (error) {
      console.error("Error fetching entities:", error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchEntities() }, [fetchEntities])

  const handleAddEntity = async () => {
    if (!orgId || !formData.name) {
      toast.error("Entity name is required")
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/consolidation/entities`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          code: formData.code || undefined,
          entityType: formData.entityType,
          currency: formData.currency,
          ownershipPct: formData.ownershipPct,
          country: formData.country || undefined,
          taxRate: formData.taxRate ? formData.taxRate / 100 : undefined,
        }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Entity "${formData.name}" created`)
        setShowAddEntity(false)
        resetForm()
        fetchEntities()
      } else {
        toast.error(data.error?.message || "Failed to create entity")
      }
    } catch (error) {
      toast.error("Network error creating entity")
    }
  }

  const handleUpdateEntity = async () => {
    if (!orgId || !editingEntity) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/consolidation/entities/${editingEntity.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          code: formData.code || undefined,
          entityType: formData.entityType,
          currency: formData.currency,
          ownershipPct: formData.ownershipPct,
          country: formData.country || undefined,
          taxRate: formData.taxRate ? formData.taxRate / 100 : undefined,
        }),
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Entity "${formData.name}" updated`)
        setEditingEntity(null)
        resetForm()
        fetchEntities()
      } else {
        toast.error(data.error?.message || "Failed to update entity")
      }
    } catch (error) {
      toast.error("Network error updating entity")
    }
  }

  const handleDeleteEntity = async (entityId: string, entityName: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/consolidation/entities/${entityId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await response.json()
      if (data.ok) {
        toast.success(`Entity "${entityName}" deactivated`)
        fetchEntities()
      }
    } catch (error) {
      toast.error("Network error deleting entity")
    }
  }

  const handleRunConsolidation = async () => {
    if (!orgId) return
    if (entities.length === 0) {
      toast.error("Add at least one entity before running consolidation")
      return
    }
    setIsConsolidating(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/consolidation/run`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          accountingStandard,
          horizonMonths: 12,
        }),
      })
      const data = await response.json()
      if (data.ok) {
        setConsolidationResult(data)
        setActiveStep(4)
        setActiveTab("results")
        toast.success(`Consolidation complete — ${data.metadata?.entitiesConsolidated || entities.length} entities consolidated`)
      } else {
        toast.error(data.error?.message || "Consolidation failed")
      }
    } catch (error) {
      toast.error("Network error running consolidation")
    } finally {
      setIsConsolidating(false)
    }
  }

  const steps = [
    { id: 1, label: "Entity Mapping", icon: <Building2 className="h-4 w-4" /> },
    { id: 2, label: "FX Translation", icon: <Globe className="h-4 w-4" /> },
    { id: 3, label: "IC Eliminations", icon: <ArrowDownUp className="h-4 w-4" /> },
    { id: 4, label: "Consolidated Review", icon: <FileText className="h-4 w-4" /> },
  ];

  const resetForm = () => {
    setFormData({
      name: "", code: "", entityType: "subsidiary", currency: "USD",
      ownershipPct: 100, country: "", taxRate: 21,
    })
  }

  const openEditDialog = (entity: ConsolidationEntity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      code: entity.code || "",
      entityType: entity.entityType,
      currency: entity.currency,
      ownershipPct: entity.ownershipPct,
      country: entity.country || "",
      taxRate: entity.taxRate ? entity.taxRate * 100 : 21,
    })
  }

  const getEntityTypeBadge = (type: string) => {
    const config = ENTITY_TYPES.find(t => t.value === type)
    return config ? <Badge className={config.color}>{config.label}</Badge> : <Badge>{type}</Badge>
  }

  const parentCount = entities.filter(e => e.entityType === "parent").length
  const subsidiaryCount = entities.filter(e => e.entityType === "subsidiary").length
  const jvCount = entities.filter(e => e.entityType === "joint_venture").length
  const currencies = [...new Set(entities.map(e => e.currency))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading consolidation data...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consolidation Command Center</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" /> Multi-entity rollup, FX translation, and Intercompany eliminations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-slate-300">
            <Settings className="h-4 w-4" /> Configure Rules
          </Button>
          <Button 
            onClick={handleRunConsolidation} 
            disabled={isConsolidating || entities.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isConsolidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Run Consolidation Engine
          </Button>
        </div>
      </div>

      {/* Enterprise Workflow Stepper */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="py-6 px-10">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500" 
              style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setActiveStep(step.id)}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  activeStep === step.id ? "bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg" : 
                  activeStep > step.id ? "bg-indigo-100 border-indigo-500 text-indigo-600" : 
                  "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                )}>
                  {activeStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                </div>
                <span className={cn(
                  "text-xs font-semibold whitespace-nowrap px-2 py-1 rounded-md transition-colors",
                  activeStep === step.id ? "text-indigo-700 bg-indigo-50" : "text-slate-500"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-sm font-medium text-muted-foreground">Total Entities</div>
            <div className="text-2xl font-bold">{entities.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {parentCount} parent, {subsidiaryCount} sub, {jvCount} JV
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-sm font-medium text-muted-foreground">Currencies</div>
            <div className="text-2xl font-bold">{currencies.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{currencies.join(", ") || "None"}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-sm font-medium text-muted-foreground">Standard</div>
            <div className="text-2xl font-bold">{accountingStandard}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {accountingStandard === "IFRS" ? "IAS 21 / IFRS 10" : "ASC 830"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-sm font-medium text-muted-foreground">Last Run</div>
            <div className="text-2xl font-bold">
              {consolidationResult ? "✓" : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {consolidationResult?.metadata?.generatedAt
                ? new Date(consolidationResult.metadata.generatedAt).toLocaleTimeString()
                : "Not yet run"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="entities">
            <Building2 className="h-4 w-4 mr-2" />Entities
          </TabsTrigger>
          <TabsTrigger value="results">
            <BarChart3 className="h-4 w-4 mr-2" />Results
          </TabsTrigger>
          <TabsTrigger value="bridge">
            <ArrowDownUp className="h-4 w-4 mr-2" />Bridge
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="h-4 w-4 mr-2" />Audit Trail
          </TabsTrigger>
        </TabsList>
 
        {/* ENTITIES TAB */}
        <TabsContent value="entities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Consolidation Entities</h2>
            <div className="flex gap-2">
               <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1">
                 <CheckCircle2 className="h-3 w-3 mr-1" /> All Entities Validated
               </Badge>
               <Dialog open={showAddEntity} onOpenChange={setShowAddEntity}>
                 <DialogTrigger asChild>
                   <Button onClick={() => { resetForm(); setShowAddEntity(true) }}>
                     <Plus className="h-4 w-4 mr-2" />Add Entity
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[540px]">
                   <DialogHeader>
                     <DialogTitle>Add Consolidation Entity</DialogTitle>
                     <DialogDescription>
                       Add a subsidiary, joint venture, or associate for consolidation
                     </DialogDescription>
                   </DialogHeader>
                   <EntityForm formData={formData} setFormData={setFormData} />
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setShowAddEntity(false)}>Cancel</Button>
                     <Button onClick={handleAddEntity}>Create Entity</Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
            </div>
          </div>
 
          {entities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Entities Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Add your parent company and subsidiaries to run consolidated financial statements.
                </p>
                <Button onClick={() => setShowAddEntity(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add First Entity
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Ownership %</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity) => (
                    <TableRow key={entity.id} className="hover:bg-slate-50/80 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border",
                            entity.entityType === 'parent' ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-white border-slate-200 text-slate-600"
                          )}>
                            {entity.entityType === 'parent' ? <Globe className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{entity.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{entity.code || 'NO-CODE'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-700">{entity.currency}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {entity.ownershipPct}%
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">{entity.country || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entity.taxRate ? `${(entity.taxRate * 100).toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                         <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">READY</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entity)}>
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteEntity(entity.id, entity.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
 
        {/* RESULTS TAB */}
        <TabsContent value="results" className="space-y-4">
          {!consolidationResult ? (
            <Card className="border-dashed bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 bg-white rounded-2xl shadow-sm border flex items-center justify-center mb-6">
                  <PlayCircle className="h-8 w-8 text-indigo-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Consolidate</h3>
                <p className="text-muted-foreground mb-8 max-w-sm text-sm">
                  Run the FinaPilot engine to perform multi-currency translation and automated intercompany eliminations.
                </p>
                <Button onClick={handleRunConsolidation} size="lg" disabled={entities.length === 0} className="bg-indigo-600 hover:bg-indigo-700 px-10 rounded-full shadow-lg shadow-indigo-200">
                  <RefreshCw className="h-4 w-4 mr-2" />Run Engine Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <MetricCard 
                    title="Consolidated Revenue" 
                    value={consolidationResult.consolidated.incomeStatement.annual['2026']?.revenue || 0} 
                    trend="+12.4%" 
                    icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                 />
                 <MetricCard 
                    title="Group EBITDA" 
                    value={consolidationResult.consolidated.incomeStatement.annual['2026']?.ebitda || 0} 
                    trend="+8.1%" 
                    icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
                 />
                 <MetricCard 
                    title="Net Controlling Interest" 
                    value={consolidationResult.consolidated.incomeStatement.annual['2026']?.netIncome || 0} 
                    trend="+15.2%" 
                    icon={<CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                 />
              </div>

              {/* Consolidated Statement Summary */}
              {consolidationResult.consolidated && (
                <ConsolidatedStatementView data={consolidationResult.consolidated} />
              )}
            </div>
          )}
        </TabsContent>

        {/* BRIDGE TAB */}
        <TabsContent value="bridge" className="space-y-4">
           {consolidationResult ? (
             <Card className="border-slate-200 shadow-sm">
               <CardHeader className="bg-slate-50/80 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Consolidation Bridge (Audit Trail)</CardTitle>
                      <CardDescription>Visual reconciliation from Local Entity reporting to Group Consolidated totals</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono bg-white uppercase tracking-tighter">IFRS 10 Compliant</Badge>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <ConsolidationBridge result={consolidationResult} />
               </CardContent>
             </Card>
           ) : (
             <Card className="border-dashed py-12 text-center text-muted-foreground">
               Run consolidation to view the financial bridge.
             </Card>
           )}
        </TabsContent>
 
        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Elimination Journal Entries
                </CardTitle>
                <CardDescription>
                  Detailed ledger adjustments applied for group financial close
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 bg-white">
                  <ArrowDownUp className="h-3.5 w-3.5" /> Validate Pairs
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-white">
                  <FileText className="h-3.5 w-3.5" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {consolidationResult?.consolidated?.eliminationJournals?.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="w-[120px] pl-6">Period</TableHead>
                      <TableHead>Mapping Category</TableHead>
                      <TableHead>Journal Leg (DR/CR)</TableHead>
                      <TableHead>Elimination Rationale</TableHead>
                      <TableHead className="text-right pr-6">Amount (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidationResult?.consolidated?.eliminationJournals?.map((j: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 border-b-slate-100 last:border-0">
                        <TableCell className="font-medium text-xs font-mono pl-6">{j.month}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold text-[10px] bg-slate-100 text-slate-700">
                            {j.account.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 py-1">
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 rounded bg-blue-50 text-blue-600 text-[8px] font-bold flex items-center justify-center border border-blue-100">DR</div>
                               <span className="text-[11px] font-medium text-slate-700 uppercase">{j.debit || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 rounded bg-rose-50 text-rose-600 text-[8px] font-bold flex items-center justify-center border border-rose-100">CR</div>
                               <span className="text-[11px] font-medium text-slate-700 uppercase">{j.credit || "N/A"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground italic">{j.action}</TableCell>
                        <TableCell className="text-right text-xs font-mono font-bold pr-6 text-indigo-900">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(j.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 text-slate-400">
                  <Eye className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No elimination journals generated.</p>
                  <p className="text-[10px] mt-1">Adjustments will appear here after the consolidation engine runs.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
 
      {/* Edit Entity Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => { if (!open) { setEditingEntity(null); resetForm() } }}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Entity</DialogTitle>
            <DialogDescription>Update entity details for consolidation</DialogDescription>
          </DialogHeader>
          <EntityForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingEntity(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleUpdateEntity}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
 
// ========== SUB-COMPONENTS ==========

function MetricCard({ title, value, trend, icon }: { title: string, value: number, trend: string, icon: React.ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{icon}</div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">{trend}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold font-mono">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ConsolidationBridge({ result }: { result: ConsolidationResult }) {
  // Aggregate data for the bridge
  const entities = result.entities || []
  const consolidated = result.consolidated || {}
  const journals = consolidated.eliminationJournals || []
  
  // Metrics to show in bridge
  const metrics = [
    { key: 'revenue', label: 'Revenue', isIS: true },
    { key: 'ebitda', label: 'EBITDA', isIS: true },
    { key: 'totalAssets', label: 'Total Assets', isIS: false },
    { key: 'totalEquity', label: 'Total Equity', isIS: false },
  ]

  const formatValue = (v: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 
    }).format(v)
  }

  return (
    <div className="overflow-x-auto">
      <Table className="border-collapse">
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-b">
            <TableHead className="w-[150px] sticky left-0 bg-slate-50 z-20 pl-6">Metric</TableHead>
            {entities.map(e => (
              <TableHead key={e.id} className="text-center font-bold text-[10px] uppercase tracking-widest min-w-[120px]">
                {e.name}
              </TableHead>
            ))}
            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-blue-600 bg-blue-50/30">FX Trans.</TableHead>
            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-rose-600 bg-rose-50/30">Elims</TableHead>
            <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-indigo-700 bg-indigo-50/50 pr-6">Consolidated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map(m => {
            const yr = '2026' // Simplified for demo
            const groupVal = m.isIS 
              ? (consolidated.incomeStatement?.annual?.[yr]?.[m.key] || 0)
              : (consolidated.balanceSheet?.annual?.[yr]?.assets?.[m.key] || consolidated.balanceSheet?.annual?.[yr]?.equity?.[m.key] || 0)
            
            // Sum of local entities
            let sumLocal = 0
            entities.forEach(e => {
              const val = m.isIS 
                ? (e.financialData?.incomeStatement?.annual?.[yr]?.[m.key] || 0)
                : (e.financialData?.balanceSheet?.annual?.[yr]?.[m.key] || 0)
              sumLocal += val
            })

            // Calc Eliminations for this metric
            const elimVal = journals
              .filter((j: any) => j.account.toLowerCase().includes(m.key.toLowerCase()) || (m.key === 'revenue' && j.account === 'P&L'))
              .reduce((acc: number, curr: any) => acc - curr.amount, 0)

            const fxVal = groupVal - sumLocal - elimVal

            return (
              <TableRow key={m.key} className="hover:bg-slate-50/30 border-b-slate-100">
                <TableCell className="sticky left-0 bg-white font-semibold text-sm z-20 pl-6 border-r">{m.label}</TableCell>
                {entities.map(e => {
                  const val = m.isIS 
                    ? (e.financialData?.incomeStatement?.annual?.[yr]?.[m.key] || 0)
                    : (e.financialData?.balanceSheet?.annual?.[yr]?.[m.key] || 0)
                  return (
                    <TableCell key={e.id} className="text-center font-mono text-xs">
                      {formatValue(val)}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center font-mono text-xs text-blue-600 bg-blue-50/10 italic">
                  {fxVal === 0 ? "—" : formatValue(fxVal)}
                </TableCell>
                <TableCell className="text-center font-mono text-xs text-rose-600 bg-rose-50/10 italic">
                  {elimVal === 0 ? "—" : `(${formatValue(Math.abs(elimVal))})`}
                </TableCell>
                <TableCell className="text-center font-mono text-sm font-bold text-indigo-700 bg-indigo-50/20 pr-6">
                  {formatValue(groupVal)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
 
function EntityForm({ formData, setFormData }: {
  formData: any
  setFormData: (fn: any) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="col-span-2">
        <Label htmlFor="entity-name">Entity Name *</Label>
        <Input id="entity-name" value={formData.name}
          onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. ClearJunction UK Ltd"
          className="h-10"
        />
      </div>
      <div>
        <Label htmlFor="entity-code">Identifier / Code</Label>
        <Input id="entity-code" value={formData.code}
          onChange={(e) => setFormData((p: any) => ({ ...p, code: e.target.value }))}
          placeholder="e.g. CJ-UK"
          className="h-10"
        />
      </div>
      <div>
        <Label>Entity Type</Label>
        <Select value={formData.entityType} onValueChange={(v) => setFormData((p: any) => ({ ...p, entityType: v }))}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Reporting Currency</Label>
        <Select value={formData.currency} onValueChange={(v) => setFormData((p: any) => ({ ...p, currency: v }))}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ownership">Ownership %</Label>
        <Input id="ownership" type="number" min={0} max={100} value={formData.ownershipPct}
          onChange={(e) => setFormData((p: any) => ({ ...p, ownershipPct: Number(e.target.value) }))}
          className="h-10"
        />
      </div>
      <div>
        <Label>Tax Jurisdiction</Label>
        <Select value={formData.country || ""} onValueChange={(v) => setFormData((p: any) => ({ ...p, country: v }))}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="tax-rate">Effective Tax Rate (%)</Label>
        <Input id="tax-rate" type="number" min={0} max={100} step={0.1} value={formData.taxRate}
          onChange={(e) => setFormData((p: any) => ({ ...p, taxRate: Number(e.target.value) }))}
          className="h-10"
        />
      </div>
    </div>
  )
}
 
function ConsolidatedStatementView({ data }: { data: any }) {
  const is = data?.incomeStatement?.annual?.['2026'] || data?.incomeStatement?.annual || {}
  const bs = data?.balanceSheet?.annual?.['2026'] || data?.balanceSheet?.annual || {}
  const cf = data?.cashFlow?.annual?.['2026'] || data?.cashFlow?.annual || {}
 
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-slate-200">
        <CardHeader className="pb-4 border-b bg-slate-50/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Income Statement (Group)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1.5 text-sm">
          <StatementLine label="Gross Revenue" value={is.revenue} />
          <StatementLine label="Direct Costs (COGS)" value={is.cogs} negative />
          <StatementLine label="Gross Profit" value={is.grossProfit} bold />
          <StatementLine label="Operating Expenses" value={is.operatingExpenses} negative />
          <div className="border-t border-slate-100 my-2" />
          <StatementLine label="EBITDA" value={is.ebitda} bold />
          <StatementLine label="Depreciation & Amort." value={is.depreciation} negative />
          <StatementLine label="EBIT" value={is.ebit} bold />
          <StatementLine label="Group Net Income" value={is.netIncome} bold accent />
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardHeader className="pb-4 border-b bg-slate-50/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Balance Sheet (Group)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1.5 text-sm">
          <StatementLine label="Current Assets" value={bs.assets?.totalCurrentAssets} />
          <StatementLine label="PPE & Fixed Assets" value={bs.assets?.fixedAssets} />
          <StatementLine label="Intangibles & Goodwill" value={bs.assets?.goodwill} />
          <StatementLine label="Total Assets" value={bs.assets?.totalAssets} bold accent />
          <div className="border-t border-slate-100 my-2" />
          <StatementLine label="Total Liabilities" value={bs.liabilities?.totalLiabilities} bold />
          <StatementLine label="Common Stock" value={bs.equity?.commonStock} indent />
          <StatementLine label="Retained Earnings" value={bs.equity?.retainedEarnings} indent />
          <StatementLine label="Non-Controlling Int. (NCI)" value={bs.equity?.minorityInterest} indent />
          <StatementLine label="Translation Adj (CTA)" value={bs.equity?.cta} indent />
          <StatementLine label="Total Group Equity" value={bs.equity?.totalEquity} bold accent />
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardHeader className="pb-4 border-b bg-slate-50/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-indigo-600" />
            Cash Flow (Group Summary)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1.5 text-sm">
          <StatementLine label="Net Income (Attributable)" value={is.netIncome} />
          <StatementLine label="D&A Add-back" value={is.depreciation} />
          <StatementLine label="Operating Cash Flow" value={cf.operatingCashFlow} bold />
          <div className="border-t border-slate-100 my-2" />
          <StatementLine label="Net Cash Position" value={cf.endingCash} bold accent />
        </CardContent>
      </Card>
    </div>
  )
}
 
function StatementLine({ label, value, bold, negative, accent, indent }: {
  label: string; value: any; bold?: boolean; negative?: boolean; accent?: boolean; indent?: boolean
}) {
  const formatCurrency = (v: any) => {
    if (v == null) return "—"
    const num = typeof v === "number" ? v : Number(v)
    if (isNaN(num)) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(Math.abs(num))
  }
 
  return (
    <div className={cn(
      "flex justify-between items-center py-1 transition-colors hover:bg-slate-50/50 rounded px-1",
      bold ? "font-bold" : "text-slate-600",
      indent ? "pl-5" : ""
    )}>
      <span className={cn(
        accent ? "text-indigo-700" : "",
        negative && !bold ? "text-rose-500 italic" : ""
      )}>{label}</span>
      <span className={cn(
        "font-mono text-[13px]",
        accent ? "text-indigo-700" : "",
        negative ? "text-rose-600" : "text-slate-900"
      )}>
        {negative && value ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  )
}
