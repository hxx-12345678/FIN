"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
  Loader2, Plus, FileText, Database, Sparkles as SparkleIcon, TrendingUp,
  ShieldCheck, Target, Zap, ArrowRight, ArrowLeft, CheckCircle2, Brain,
  ShieldAlert, History as HistoryIcon, AlertTriangle, Lock, Unlock, Eye, Radio,
  Building2, DollarSign, Users, Landmark
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

// ═══════════════════════════════════════════════════════════════════
//  ENTERPRISE MODEL CREATION FORM
//  Implements the 6-step institutional governance flow:
//    Step 0: Data Availability Check (auto on mount)
//    Step 1: Model Blueprint Configuration
//    Step 2: Intelligence Engine Selection (gated by data)
//    Step 3: Source Authority Declaration (data-driven only)
//    Step 4: Assumption Preview & Baseline Confirmation
//    Step 5: Strategic Goal + Final Confirm
// ═══════════════════════════════════════════════════════════════════

type StepId = "blueprint" | "intelligence" | "source-authority" | "assumptions" | "strategic" | "creating"

interface DomainSource {
  available: boolean
  sources: string[]
  suggestedAuthority: string
}

interface DataStatus {
  ok?: boolean
  hasRealData?: boolean
  hasConnectors?: boolean
  hasTransactions?: boolean
  hasUploads?: boolean
  orgStage?: string
  intelligenceGating?: {
    dataDrivenAI: boolean
    dataDrivenAIReason?: string | null
    aiPrecisionBuild: boolean
    aiPrecisionBuildReason?: string | null
    syntheticAI: boolean
    manualLogic: boolean
  }
  stats?: {
    connectorsCount: number
    uploadsCount: number
    transactionCount: number
    coaCount: number
    totalRevenue: number
    lastTransactionDate: string | null
    firstTransactionDate: string | null
    dataAgeDays: number | null
  }
  sources?: {
    erp: boolean
    crm: boolean
    payroll: boolean
    banking: boolean
    connectors: Array<{ id: string; type: string; status: string; lastSync: string | null }>
    latestUploads: Array<{ id: string; type: string; createdAt: string; status: string }>
  }
  domainSources?: Record<string, DomainSource>
  auditReadiness?: {
    hasCOAMapping: boolean
    hasFinancialBaseline: boolean
    hasSourceAuthority: boolean
    isEnterpriseReady: boolean
    dataFreshness: string
  }
}

interface CreateModelFormProps {
  orgId?: string | null
  onSuccess?: (data: any) => void
  onCancel?: () => void
  aiMode?: boolean
  connectors?: any[]
  dataStatus?: DataStatus | null
  strategicPulse?: any | null
}

const DOMAIN_ICONS: Record<string, any> = {
  revenue: TrendingUp,
  expenses: Landmark,
  payroll: Users,
  cash: DollarSign,
  customers: Building2,
}

const DOMAIN_LABELS: Record<string, string> = {
  revenue: "Revenue Actuals",
  expenses: "Operating Expenses",
  payroll: "Payroll & Compensation",
  cash: "Cash & Bank Balances",
  customers: "Customer Metrics",
}

export function CreateModelForm({
  orgId,
  onSuccess,
  onCancel,
  aiMode = false,
  connectors = [],
  dataStatus,
  strategicPulse = null,
}: CreateModelFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<StepId>("blueprint")
  const [loading, setLoading] = useState(false)
  const [baselineConfirmed, setBaselineConfirmed] = useState(false)

  // Step 1: Blueprint
  const [formData, setFormData] = useState({
    name: "",
    industry: "SaaS",
    modelType: "3-statement",
    revenueModelType: "subscription" as string,
    duration: "12",
    startDate: new Date().toISOString().slice(0, 7),
    description: "",
    versionTag: "v1.0.0-baseline",
    governanceMode: "audit_locked" as "audit_locked" | "experimental",
  })

  // Step 2: Intelligence engine
  const [intelligenceEngine, setIntelligenceEngine] = useState<"data-driven" | "synthetic" | "manual">(
    aiMode ? "data-driven" : "manual"
  )

  // Step 3: Source authority map (domain -> selected source)
  const [sourceAuthMap, setSourceAuthMap] = useState<Record<string, string>>({})

  // Step 4: Synthetic AI parameters
  const [syntheticParams, setSyntheticParams] = useState({
    business_type: "saas",
    starting_customers: "",
    starting_revenue: "",
    starting_mrr: "",
    monthly_payroll: "",
    monthly_infrastructure: "",
    monthly_marketing: "",
    cash_on_hand: "",
    retention_rate: "90",
    target_cac: "",
  })

  // Step 5: Strategic goal
  const [strategicGoal, setStrategicGoal] = useState<"growth" | "stable" | "profitability">("stable")

  // Auto-populate source authority from dataStatus domain suggestions
  useEffect(() => {
    if (dataStatus?.domainSources) {
      const map: Record<string, string> = {}
      Object.entries(dataStatus.domainSources).forEach(([domain, info]) => {
        if (info.available) {
          map[domain] = info.suggestedAuthority
        }
      })
      setSourceAuthMap(map)
    }
  }, [dataStatus])

  // If AI mode is forced but no data, default to synthetic
  useEffect(() => {
    if (aiMode && dataStatus && !dataStatus.intelligenceGating?.dataDrivenAI) {
      setIntelligenceEngine("synthetic")
    }
  }, [aiMode, dataStatus])

  // Pre-fill from Strategic Pulse
  useEffect(() => {
    if (strategicPulse) {
      setFormData(prev => ({
        ...prev,
        industry: strategicPulse.detectedIndustry || prev.industry,
        revenueModelType: strategicPulse.suggestedRevenueModel || prev.revenueModelType,
        name: `Institutional Plan - ${strategicPulse.detectedIndustry || "General"}`,
      }))
    }
  }, [strategicPulse])

  const industries = ["SaaS", "E-commerce", "Services", "Healthcare", "Finance", "Education", "Manufacturing", "Real Estate", "Retail", "Other"]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  const goNext = () => {
    if (step === "blueprint") {
      if (!formData.name.trim()) {
        toast.error("Model name is required")
        return
      }
      setStep("intelligence")
    } else if (step === "intelligence") {
      if (intelligenceEngine === "data-driven") {
        // Must have data to proceed
        if (!dataStatus?.intelligenceGating?.dataDrivenAI) {
          toast.error("Data-Driven AI is not available. Connect a data source first.")
          return
        }
        setStep("source-authority")
      } else if (intelligenceEngine === "synthetic") {
        setStep("assumptions")
      } else {
        // Manual — go straight to strategic
        setStep("strategic")
      }
    } else if (step === "source-authority") {
      if (!baselineConfirmed) {
        toast.error("Please confirm the data baseline integrity before proceeding.")
        return
      }
      setStep("strategic")
    } else if (step === "assumptions") {
      // Validate minimum synthetic params
      if (!syntheticParams.starting_revenue && !syntheticParams.starting_mrr) {
        toast.error("Please provide at least Starting Revenue or MRR.")
        return
      }
      if (!syntheticParams.cash_on_hand) {
        toast.error("Cash on Hand is required for synthetic modeling.")
        return
      }
      setStep("strategic")
    } else if (step === "strategic") {
      handleFinalSubmit()
    }
  }

  const goBack = () => {
    if (step === "intelligence") setStep("blueprint")
    else if (step === "source-authority") setStep("intelligence")
    else if (step === "assumptions") setStep("intelligence")
    else if (step === "strategic") {
      if (intelligenceEngine === "data-driven") setStep("source-authority")
      else if (intelligenceEngine === "synthetic") setStep("assumptions")
      else setStep("intelligence")
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  FINAL SUBMIT — assembles all data and calls onSuccess
  // ═══════════════════════════════════════════════════════════════
  const handleFinalSubmit = () => {
    setStep("creating")

    const payload: any = {
      ...formData,
      intelligenceEngine,
      strategicGoal,
      baselineConfirmed: intelligenceEngine === "data-driven" ? baselineConfirmed : true,
      sourceAuthMap: intelligenceEngine === "data-driven" ? sourceAuthMap : {},
    }

    if (intelligenceEngine === "synthetic") {
      payload.aiAnswers = {
        business_type: syntheticParams.business_type,
        starting_customers: syntheticParams.starting_customers,
        starting_revenue: syntheticParams.starting_revenue || syntheticParams.starting_mrr,
        cash_on_hand: syntheticParams.cash_on_hand,
      }
    }

    // Simulate a brief processing step (enterprise feel)
    setTimeout(() => {
      if (onSuccess) {
        onSuccess(payload)
      }
    }, 800)
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP PROGRESS INDICATOR
  // ═══════════════════════════════════════════════════════════════
  const steps: { id: StepId; label: string }[] = [
    { id: "blueprint", label: "Blueprint" },
    { id: "intelligence", label: "Intelligence" },
    ...(intelligenceEngine === "data-driven" ? [{ id: "source-authority" as StepId, label: "Source Authority" }] : []),
    ...(intelligenceEngine === "synthetic" ? [{ id: "assumptions" as StepId, label: "Assumptions" }] : []),
    { id: "strategic", label: "Confirm" },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === step)

  return (
    <div className="space-y-6">
      {/* Step Progress Bar */}
      {step !== "creating" && (
        <div className="flex items-center gap-1 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${i <= currentStepIndex ? 'text-primary' : 'text-slate-300'}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${i < currentStepIndex ? 'bg-primary border-primary text-white' :
                  i === currentStepIndex ? 'border-primary text-primary bg-primary/10' :
                    'border-slate-200 text-slate-400'
                  }`}>
                  {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:inline ${i <= currentStepIndex ? '' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${i < currentStepIndex ? 'bg-primary' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* ═══════════════════════════════════════════════════════
              STEP 1: MODEL BLUEPRINT
          ═══════════════════════════════════════════════════════ */}
          {step === "blueprint" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Model Name *</Label>
                  <Input
                    placeholder="e.g. FY25 Institutional Plan"
                    value={formData.name}
                    autoFocus
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Industry Sector</Label>
                  <Select value={formData.industry} onValueChange={(v) => handleInputChange("industry", v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Revenue Engine</Label>
                  <Select value={formData.revenueModelType} onValueChange={(v) => handleInputChange("revenueModelType", v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription">Subscription (MRR/ARR)</SelectItem>
                      <SelectItem value="transactional">Transactional (AOV)</SelectItem>
                      <SelectItem value="services">Professional Services</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Model Architecture</Label>
                  <Select value={formData.modelType} onValueChange={(v) => handleInputChange("modelType", v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3-statement">3-Statement Operating Model</SelectItem>
                      <SelectItem value="dcf">Discounted Cash Flow (DCF)</SelectItem>
                      <SelectItem value="lbo">Leveraged Buyout (LBO)</SelectItem>
                      <SelectItem value="accretion-dilution">Accretion / Dilution (M&A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Forecast Window</Label>
                  <Select value={formData.duration} onValueChange={(v) => handleInputChange("duration", v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Months</SelectItem>
                      <SelectItem value="24">24 Months</SelectItem>
                      <SelectItem value="36">36 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Ignition Month</Label>
                  <Input type="month" value={formData.startDate} onChange={(e) => handleInputChange("startDate", e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
                <Button onClick={goNext} className="px-8 h-11 bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* AI Strategic Insights Overlay */}
              {aiMode && strategicPulse && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <SparkleIcon className="h-4 w-4 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">AI Strategic Insights Detected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-indigo-50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Volume Pattern</p>
                      <p className="font-semibold text-slate-800">{strategicPulse.volumeIntensity || "Consistent"}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Expense Model</p>
                      <p className="font-semibold text-slate-800">{strategicPulse.expenseConcentration || "Distributed"}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-600/70 italic">
                    * Parameters above pre-populated based on {dataStatus?.stats?.transactionCount?.toLocaleString() || "recent"} verified accounting entries.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 2: INTELLIGENCE ENGINE SELECTION (GATED)
          ═══════════════════════════════════════════════════════ */}
          {step === "intelligence" && (
            <div className="space-y-5">
              {/* Data Context Banner */}
              <div className={`p-4 rounded-xl border-2 ${dataStatus?.hasRealData
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
                }`}>
                <div className="flex items-start gap-3">
                  {dataStatus?.hasRealData ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-bold ${dataStatus?.hasRealData ? 'text-green-900' : 'text-amber-900'}`}>
                      {dataStatus?.hasRealData
                        ? `Data detected: ${dataStatus.stats?.transactionCount || 0} transactions, ${dataStatus.stats?.connectorsCount || 0} connectors, ${dataStatus.stats?.uploadsCount || 0} uploads`
                        : "No verified data sources connected to this organization."}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {dataStatus?.hasRealData
                        ? `Organization stage: ${dataStatus.orgStage || 'Unknown'} · Last data: ${dataStatus.stats?.lastTransactionDate ? new Date(dataStatus.stats.lastTransactionDate).toLocaleDateString() : 'N/A'}`
                        : "Connect an ERP, upload a CSV, or use Synthetic AI to begin."}
                    </p>
                  </div>
                </div>
              </div>

              <Label className="text-xs font-bold uppercase text-slate-500 block">Select Model Intelligence Source</Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Data-Driven AI */}
                <button
                  onClick={() => dataStatus?.intelligenceGating?.dataDrivenAI && setIntelligenceEngine("data-driven")}
                  disabled={!dataStatus?.intelligenceGating?.dataDrivenAI}
                  className={`p-5 rounded-xl border-2 text-left flex flex-col gap-3 transition-all relative group ${intelligenceEngine === "data-driven"
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2 shadow-lg'
                    : !dataStatus?.intelligenceGating?.dataDrivenAI
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-md'
                    }`}
                >
                  {!dataStatus?.intelligenceGating?.dataDrivenAI && (
                    <Lock className="h-4 w-4 text-slate-400 absolute top-3 right-3" />
                  )}
                  <div className={`p-2.5 w-fit rounded-xl ${intelligenceEngine === "data-driven" ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                    <HistoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Data-Driven AI</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Syncs historical actuals from ERP, GL, and uploaded data. Highest auditability.
                    </div>
                  </div>
                  {!dataStatus?.intelligenceGating?.dataDrivenAI && (
                    <Badge variant="outline" className="text-[10px] w-fit text-red-600 border-red-200 bg-red-50">
                      {dataStatus?.intelligenceGating?.dataDrivenAIReason || "Connect data first"}
                    </Badge>
                  )}
                </button>

                {/* Synthetic AI */}
                <button
                  onClick={() => setIntelligenceEngine("synthetic")}
                  className={`p-5 rounded-xl border-2 text-left flex flex-col gap-3 transition-all group ${intelligenceEngine === "synthetic"
                    ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-offset-2 shadow-lg'
                    : 'border-slate-100 bg-white hover:border-purple-200 hover:shadow-md'
                    }`}
                >
                  <div className={`p-2.5 w-fit rounded-xl ${intelligenceEngine === "synthetic" ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                    <SparkleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Synthetic AI Benchmark</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Generates a model using industry benchmarks. No real data required. Clearly labeled as synthetic.
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-fit text-purple-600 border-purple-200 bg-purple-50">
                    Always Available
                  </Badge>
                </button>

                {/* Manual */}
                <button
                  onClick={() => setIntelligenceEngine("manual")}
                  className={`p-5 rounded-xl border-2 text-left flex flex-col gap-3 transition-all group ${intelligenceEngine === "manual"
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900 ring-offset-2 shadow-lg'
                    : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                >
                  <div className={`p-2.5 w-fit rounded-xl ${intelligenceEngine === "manual" ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Manual Build</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Define every driver and assumption manually. Full control, zero AI inference.
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-fit text-slate-600 border-slate-200 bg-slate-50">
                    Always Available
                  </Badge>
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={goNext} className="px-8 h-11 bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3: SOURCE AUTHORITY DECLARATION (Data-Driven Only)
          ═══════════════════════════════════════════════════════ */}
          {step === "source-authority" && (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Source Authority Declaration — Enterprise Required
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Define the authoritative data source for each financial domain. This determines which system is the
                  &quot;source of truth&quot; when multiple sources provide overlapping data. Conflicts are resolved using your declared hierarchy.
                </p>
              </div>

              {/* Domain-level source selection */}
              <div className="space-y-3">
                {dataStatus?.domainSources && Object.entries(dataStatus.domainSources)
                  .filter(([, info]) => info.available)
                  .map(([domain, info]) => {
                    const Icon = DOMAIN_ICONS[domain] || Database
                    return (
                      <div key={domain} className="p-4 border rounded-xl bg-white hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">{DOMAIN_LABELS[domain] || domain}</p>
                              <p className="text-[11px] text-slate-500">
                                {info.sources.length} source{info.sources.length !== 1 ? 's' : ''} detected
                                {info.sources.length > 1 && (
                                  <span className="text-amber-600 font-semibold ml-1">· Multi-source conflict possible</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <Select
                            value={sourceAuthMap[domain] || info.suggestedAuthority}
                            onValueChange={(v) => setSourceAuthMap(prev => ({ ...prev, [domain]: v }))}
                          >
                            <SelectTrigger className="w-[200px] h-9 bg-white text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {info.sources.map(src => (
                                <SelectItem key={src} value={src}>
                                  <span className="flex items-center gap-2">
                                    {src === info.suggestedAuthority && <Radio className="h-3 w-3 text-primary" />}
                                    {src}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}

                {/* Domains with no data */}
                {dataStatus?.domainSources && Object.entries(dataStatus.domainSources)
                  .filter(([, info]) => !info.available)
                  .map(([domain]) => {
                    const Icon = DOMAIN_ICONS[domain] || Database
                    return (
                      <div key={domain} className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">{DOMAIN_LABELS[domain] || domain}</p>
                            <p className="text-[11px] text-slate-400">No source available — will use AI estimate or manual input</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Baseline Confirmation Checkbox */}
              <div className={`p-4 rounded-xl border-2 flex items-start gap-3 transition-all ${baselineConfirmed
                ? 'border-green-300 bg-green-50'
                : 'border-dashed border-red-200 bg-red-50/50'
                }`}>
                <Checkbox
                  id="baseline-confirm"
                  checked={baselineConfirmed}
                  onCheckedChange={(v) => setBaselineConfirmed(!!v)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="baseline-confirm" className={`text-sm font-bold cursor-pointer ${baselineConfirmed ? 'text-green-900' : 'text-red-900'}`}>
                    Confirm Source Authority & Baseline Integrity
                  </Label>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    I confirm that the source authority declarations above are correct, and the financial model
                    should be initialized using the selected data sources. All calculations will trace back to
                    these sources for auditability.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={goNext} disabled={!baselineConfirmed} className="px-8 h-11 bg-primary text-white hover:bg-primary/90 shadow-lg">
                  <ShieldCheck className="mr-2 h-4 w-4" /> Confirm Authority
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 4: SYNTHETIC ASSUMPTION INPUT (Synthetic Only)
          ═══════════════════════════════════════════════════════ */}
          {step === "assumptions" && (
            <div className="space-y-5">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <h4 className="font-bold text-purple-900 flex items-center gap-2 text-sm">
                  <SparkleIcon className="h-4 w-4" />
                  Synthetic Model Parameters
                </h4>
                <div className="text-xs text-purple-700 leading-relaxed">
                  This model will be initialized using <strong>synthetic assumptions</strong> — no real financial data is connected.
                  All projections will be clearly labeled as <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-100 border-purple-300">SYNTHETIC</Badge> for auditability.
                </div>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Business Type *</Label>
                  <Select value={syntheticParams.business_type} onValueChange={(v) => setSyntheticParams(p => ({ ...p, business_type: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saas">SaaS / Subscription</SelectItem>
                      <SelectItem value="ecommerce">E-commerce / Transactional</SelectItem>
                      <SelectItem value="services">Professional Services</SelectItem>
                      <SelectItem value="mixed">Hybrid / Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Starting Monthly Revenue ($) *</Label>
                    <Input
                      type="number" placeholder="e.g. 50000"
                      value={syntheticParams.starting_revenue}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, starting_revenue: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Starting Customers</Label>
                    <Input
                      type="number" placeholder="e.g. 100"
                      value={syntheticParams.starting_customers}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, starting_customers: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Monthly Payroll ($)</Label>
                    <Input
                      type="number" placeholder="e.g. 50000"
                      value={syntheticParams.monthly_payroll}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, monthly_payroll: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Infrastructure ($)</Label>
                    <Input
                      type="number" placeholder="e.g. 10000"
                      value={syntheticParams.monthly_infrastructure}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, monthly_infrastructure: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Marketing ($)</Label>
                    <Input
                      type="number" placeholder="e.g. 20000"
                      value={syntheticParams.monthly_marketing}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, monthly_marketing: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Cash on Hand ($) *</Label>
                    <Input
                      type="number" placeholder="e.g. 500000"
                      value={syntheticParams.cash_on_hand}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, cash_on_hand: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Retention Rate (%)</Label>
                    <Input
                      type="number" placeholder="e.g. 90"
                      value={syntheticParams.retention_rate}
                      onChange={(e) => setSyntheticParams(p => ({ ...p, retention_rate: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Target CAC ($)</Label>
                  <Input
                    type="number" placeholder="e.g. 500"
                    value={syntheticParams.target_cac}
                    onChange={(e) => setSyntheticParams(p => ({ ...p, target_cac: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={goNext} className="px-8 h-11 bg-purple-600 text-white hover:bg-purple-700 shadow-lg">
                  Review & Confirm <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 5: STRATEGIC CONFIGURATION + FINAL PREVIEW
          ═══════════════════════════════════════════════════════ */}
          {step === "strategic" && (
            <div className="space-y-5">
              {/* Summary Panel */}
              <div className="p-5 bg-slate-50 border rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Model Initialization Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Model</p>
                    <p className="font-semibold text-slate-900 truncate">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Industry</p>
                    <p className="font-semibold text-slate-900">{formData.industry}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Engine</p>
                    <Badge variant="outline" className={`text-[10px] ${intelligenceEngine === "data-driven" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      intelligenceEngine === "synthetic" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                      {intelligenceEngine === "data-driven" ? "Data-Driven" :
                        intelligenceEngine === "synthetic" ? "Synthetic AI" : "Manual"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Horizon</p>
                    <p className="font-semibold text-slate-900">{formData.duration} months</p>
                  </div>
                </div>

                {/* Show source authority summary for data-driven */}
                {intelligenceEngine === "data-driven" && Object.keys(sourceAuthMap).length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Source Authority Map</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(sourceAuthMap).map(([domain, source]) => (
                        <Badge key={domain} variant="outline" className="text-[10px] bg-blue-50 border-blue-200">
                          {domain}: {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show synthetic params summary */}
                {intelligenceEngine === "synthetic" && (
                  <div className="pt-3 border-t">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Declared Assumptions (Synthetic)</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {syntheticParams.starting_revenue && (
                        <div><span className="text-slate-400">Revenue:</span> <span className="font-bold">${Number(syntheticParams.starting_revenue).toLocaleString()}/mo</span></div>
                      )}
                      {syntheticParams.cash_on_hand && (
                        <div><span className="text-slate-400">Cash:</span> <span className="font-bold">${Number(syntheticParams.cash_on_hand).toLocaleString()}</span></div>
                      )}
                      {syntheticParams.starting_customers && (
                        <div><span className="text-slate-400">Customers:</span> <span className="font-bold">{syntheticParams.starting_customers}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Strategic Goal */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-500">Strategic Outlook</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "growth" as const, label: "Aggressive Growth", icon: Zap, color: "orange", desc: "Maximize MoM revenue scaling, accept higher burn." },
                    { id: "stable" as const, label: "Sustainable", icon: Target, color: "blue", desc: "Balanced growth with controlled burn rate." },
                    { id: "profitability" as const, label: "Efficiency First", icon: ShieldCheck, color: "green", desc: "Prioritize runway & unit economics." },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setStrategicGoal(opt.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${strategicGoal === opt.id
                        ? `border-${opt.color}-500 bg-${opt.color}-50 ring-2 ring-${opt.color}-500 ring-offset-1 shadow-md`
                        : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                    >
                      <opt.icon className={`h-5 w-5 mb-2 ${strategicGoal === opt.id ? `text-${opt.color}-600` : 'text-slate-400'}`} />
                      <h5 className="font-bold text-sm text-slate-900">{opt.label}</h5>
                      <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                {/* Maturity & Governance */}
                <div className="p-5 border-2 border-indigo-100 rounded-xl bg-indigo-50/10 space-y-4">
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Maturity & Governance Mode
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Version Tag</Label>
                      <Input
                        value={formData.versionTag}
                        onChange={(e) => setFormData(p => ({ ...p, versionTag: e.target.value }))}
                        placeholder="e.g. v1.0.0-baseline"
                        className="h-9 font-mono text-xs border-indigo-200 focus:ring-indigo-500"
                      />
                      <p className="text-[9px] text-slate-400">Immutable tag used for institutional audit trails.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Snapshot Mode</Label>
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => setFormData(p => ({ ...p, governanceMode: "audit_locked" }))}
                          className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${formData.governanceMode === 'audit_locked' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Audit Locked
                        </button>
                        <button
                          onClick={() => setFormData(p => ({ ...p, governanceMode: "experimental" }))}
                          className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${formData.governanceMode === 'experimental' ? 'bg-white shadow text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Experimental
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Synthetic Disclosure Warning */}
                {intelligenceEngine === "synthetic" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      <strong>Synthetic Model Notice:</strong> This model is generated using declared assumptions and industry benchmarks.
                      No real financial data is connected. The model will be tagged as <code className="bg-amber-100 px-1 rounded font-mono">SYNTHETIC</code> in all outputs and audit logs.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button
                    onClick={goNext}
                    className={`px-8 h-11 shadow-lg text-white ${intelligenceEngine === "synthetic"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-slate-900 hover:bg-slate-800"
                      }`}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {intelligenceEngine === "synthetic" ? "Create Synthetic Model" :
                      intelligenceEngine === "data-driven" ? "Initialize from Verified Data" :
                        "Create Model"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              CREATING STATE
          ═══════════════════════════════════════════════════════ */}
          {step === "creating" && (
            <div className="py-16 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="h-14 w-14 animate-spin text-primary" />
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse blur-xl" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Initializing Financial Model</h3>
                <p className="text-sm text-slate-500">
                  {intelligenceEngine === "data-driven"
                    ? "Mapping data sources and validating baseline integrity..."
                    : intelligenceEngine === "synthetic"
                      ? "Generating synthetic benchmark from declared assumptions..."
                      : "Creating model structure with manual driver scaffold..."}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
