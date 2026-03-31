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
        <TabsList className="grid w-full grid-cols-4 lg:w-[540px]">
          <TabsTrigger value="entities">
            <Building2 className="h-4 w-4 mr-2" />Entities
          </TabsTrigger>
          <TabsTrigger value="results">
            <BarChart3 className="h-4 w-4 mr-2" />Results
          </TabsTrigger>
          <TabsTrigger value="eliminations">
            <ArrowDownUp className="h-4 w-4 mr-2" />Methodology
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="h-4 w-4 mr-2" />Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* ENTITIES TAB */}
        <TabsContent value="entities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Consolidation Entities</h2>
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
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Ownership %</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity) => (
                    <TableRow key={entity.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <div className="font-medium">{entity.name}</div>
                            <div className="text-xs text-muted-foreground">{entity.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entity.currency}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entity.ownershipPct}%
                      </TableCell>
                      <TableCell>{entity.country || "—"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entity.taxRate ? `${(entity.taxRate * 100).toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(entity)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
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
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Consolidation Results Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add entities and run consolidation to see combined financial statements.
                </p>
                <Button onClick={handleRunConsolidation} disabled={entities.length === 0}>
                  <PlayCircle className="h-4 w-4 mr-2" />Run Consolidation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Consolidation Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entities</span>
                      <p className="font-semibold">{consolidationResult.metadata.entitiesConsolidated}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start Month</span>
                      <p className="font-semibold">{consolidationResult.metadata.startMonth}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Horizon</span>
                      <p className="font-semibold">{consolidationResult.metadata.horizonMonths} months</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Standard</span>
                      <p className="font-semibold">{consolidationResult.metadata.accountingStandard}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Generated</span>
                      <p className="font-semibold">{new Date(consolidationResult.metadata.generatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {consolidationResult.metadata.note && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      {consolidationResult.metadata.note}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Consolidated Statement Summary */}
              {consolidationResult.consolidated && (
                <ConsolidatedStatementView data={consolidationResult.consolidated} />
              )}
            </div>
          )}
        </TabsContent>

        {/* METHODOLOGY TAB */}
        <TabsContent value="eliminations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Consolidation Methodology
              </CardTitle>
              <CardDescription>
                Governance and rules applied during the group rollup process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-indigo-50/30 border-indigo-100 italic text-xs text-indigo-900">
                    "Intercompany revenue and COGS are automatically identified and eliminated at the transaction level to prevent group-level margin inflation."
                  </div>
                  <div className="p-4 border rounded-lg bg-blue-50/30 border-blue-100 italic text-xs text-blue-900">
                    "Balance sheet accounts (AR/AP) are netted. Any discrepancies between entity reporting are flagged in the consolidation audit log."
                  </div>
                  <div className="p-4 border rounded-lg bg-emerald-50/30 border-emerald-100 italic text-xs text-emerald-900">
                    "Minority Interest (NCI) is calculated based on cumulative equity. CTA is tracked via IAS 21 average vs closing rate methodology."
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-sm">Automated Eliminatons Applied:</h4>
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs list-disc pl-4 text-muted-foreground">
                    <li>Intercompany Sales (P&L)</li>
                    <li>Intercompany Dividends (P&L)</li>
                    <li>Unrealized Profit in Inventory (IAS 2)</li>
                    <li>Intercompany Receivables / Payables (BS)</li>
                    <li>Fixed Asset Profit Elimination with Depreciation Unwind</li>
                    <li>Minority Interest / NCI Allocation</li>
                    <li>FX Translation Adjustment (CTA) Tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Elimination Journal Entries
                </CardTitle>
                <CardDescription>
                  Detailed audit trail for group financial close validation
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-3.5 w-3.5" /> Export Journal
              </Button>
            </CardHeader>
            <CardContent>
              {consolidationResult?.consolidated?.eliminationJournals?.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[100px]">Month</TableHead>
                        <TableHead>Account/Category</TableHead>
                        <TableHead>Impact Type</TableHead>
                        <TableHead>Impact Description</TableHead>
                        <TableHead className="text-right">Adjustment Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidationResult?.consolidated?.eliminationJournals?.map((j: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs font-mono">{j.month}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="font-normal">{j.account}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-[10px] gap-1">
                              <span className="text-blue-600 font-bold uppercase">DR: {j.debit || "N/A"}</span>
                              <span className="text-red-600 font-bold uppercase">CR: {j.credit || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs italic text-muted-foreground">{j.action}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(j.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-lg border border-dashed">
                  <Eye className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No elimination journals generated.</p>
                  <p className="text-[10px] mt-1">Adjustments will appear here after the consolidation engine identifies intercompany transactions.</p>
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
          placeholder="e.g. ACME Europe GmbH"
        />
      </div>
      <div>
        <Label htmlFor="entity-code">Code</Label>
        <Input id="entity-code" value={formData.code}
          onChange={(e) => setFormData((p: any) => ({ ...p, code: e.target.value }))}
          placeholder="e.g. EU-GER"
        />
      </div>
      <div>
        <Label>Entity Type</Label>
        <Select value={formData.entityType} onValueChange={(v) => setFormData((p: any) => ({ ...p, entityType: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Currency</Label>
        <Select value={formData.currency} onValueChange={(v) => setFormData((p: any) => ({ ...p, currency: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ownership">Ownership %</Label>
        <Input id="ownership" type="number" min={0} max={100} value={formData.ownershipPct}
          onChange={(e) => setFormData((p: any) => ({ ...p, ownershipPct: Number(e.target.value) }))}
        />
      </div>
      <div>
        <Label>Country</Label>
        <Select value={formData.country || ""} onValueChange={(v) => setFormData((p: any) => ({ ...p, country: v }))}>
          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="tax-rate">Tax Rate (%)</Label>
        <Input id="tax-rate" type="number" min={0} max={100} step={0.1} value={formData.taxRate}
          onChange={(e) => setFormData((p: any) => ({ ...p, taxRate: Number(e.target.value) }))}
        />
      </div>
    </div>
  )
}

function ConsolidatedStatementView({ data }: { data: any }) {
  const is = data?.incomeStatement?.annual || data?.incomeStatement || {}
  const bs = data?.balanceSheet?.annual || data?.balanceSheet || {}
  const cf = data?.cashFlow?.annual || data?.cashFlow || {}

  const formatCurrency = (v: any) => {
    if (v == null || v === undefined) return "—"
    const num = typeof v === "number" ? v : Number(v)
    if (isNaN(num)) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Consolidated Income Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <StatementLine label="Revenue" value={is.revenue || is.totalRevenue} />
          <StatementLine label="COGS" value={is.cogs} negative />
          <StatementLine label="Gross Profit" value={is.grossProfit} bold />
          <StatementLine label="Operating Expenses" value={is.opex || is.operatingExpenses} negative />
          <StatementLine label="EBITDA" value={is.ebitda} bold />
          <StatementLine label="D&A" value={is.depAmort || is.depreciation} negative />
          <StatementLine label="EBIT" value={is.ebit} bold />
          <StatementLine label="Net Income" value={is.netIncome} bold accent />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Consolidated Balance Sheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <StatementLine label="Total Assets" value={bs.assets?.totalAssets || bs.totalAssets} bold />
          <StatementLine label="Cash" value={bs.assets?.cash || bs.cash} indent />
          <StatementLine label="Accounts Receivable" value={bs.assets?.accountsReceivable || bs.ar} indent />
          <StatementLine label="PPE (Net)" value={bs.assets?.ppe || bs.ppe} indent />
          <div className="border-t my-2" />
          <StatementLine label="Total Liabilities" value={bs.liabilities?.totalLiabilities || bs.totalLiabilities} bold />
          <StatementLine label="Total Equity" value={bs.equity?.totalEquity || bs.totalEquity} bold accent />
          {bs.equity?.minorityInterest != null && (
            <StatementLine label="Minority Interest (NCI)" value={bs.equity.minorityInterest} indent />
          )}
          {bs.equity?.cta != null && (
            <StatementLine label="CTA" value={bs.equity.cta} indent />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            Consolidated Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <StatementLine label="Operating Cash Flow" value={cf.operatingCashFlow || cf.cfo} bold />
          <StatementLine label="Investing Cash Flow" value={cf.investingCashFlow || cf.cfi} />
          <StatementLine label="Financing Cash Flow" value={cf.financingCashFlow || cf.cff} />
          <div className="border-t my-2" />
          <StatementLine label="Net Change in Cash" value={cf.netCashChange || cf.netChange} bold accent />
          <StatementLine label="Ending Cash" value={cf.endingCash} bold />
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
    <div className={`flex justify-between items-center py-0.5 ${bold ? "font-semibold" : ""} ${indent ? "pl-4" : ""}`}>
      <span className={`${accent ? "text-blue-700" : ""} ${negative ? "text-red-600" : ""}`}>{label}</span>
      <span className={`font-mono text-sm ${accent ? "text-blue-700" : ""} ${negative ? "text-red-600" : ""}`}>
        {negative && value ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  )
}
