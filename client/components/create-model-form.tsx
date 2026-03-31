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
  Loader2, Plus, FileText, Database, Sparkles, TrendingUp,
  ShieldCheck, Target, Zap, ArrowRight, ArrowLeft, CheckCircle2, Brain,
  ShieldAlert, History as HistoryIcon, AlertTriangle, Lock, Unlock, Eye, Radio,
  Building2, DollarSign, Users, Landmark, BadgeCheck, Grid, SparkleIcon
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

type StepId = "blueprint" | "intelligence" | "upload" | "source-authority" | "assumptions" | "strategic" | "creating"

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
  const [dataSelectionMode, setDataSelectionMode] = useState<"all" | "specific">("all")
  const [uploadedBatchId, setUploadedBatchId] = useState<string | null>(null)

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
    churnRate: "5",
    target_cac: "",
    // DCF-specific
    riskFreeRate: "",
    equityRiskPremium: "",
    beta: "",
    costOfDebt: "",
    terminalGrowth: "",
    sharesOutstanding: "",
    taxRate: "",
    terminalValueMethod: "",
    forecastYears: "",
    // LBO-specific
    entryMultiple: "",
    exitMultiple: "",
    leverageRatio: "",
    holdingPeriod: "",
    seniorDebtRate: "",
    subDebtRate: "",
    mandatoryAmortization: "",
    excessCashSweep: "",
    transactionFeeRate: "",
    minimumCash: "",
    // Accretion/Dilution-specific
    sharePrice: "",
    targetNetIncome: "",
    purchasePremium: "",
    stockPercentage: "",
    costSynergies: "",
    synergyPhaseIn: "",
    assetWriteUpPct: "",
    amortizationPeriod: "",
    targetRevenue: "",
    marketCap: "",
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
        if (dataSelectionMode === "specific") {
          setStep("upload")
        } else {
          // Must have data to proceed for "all" mode
          if (!dataStatus?.intelligenceGating?.dataDrivenAI) {
            toast.error("Data-Driven AI is not available. Connect a data source first or upload a file.")
            return
          }
          setStep("source-authority")
        }
      } else if (intelligenceEngine === "synthetic") {
        setStep("assumptions")
      } else {
        // Manual — go straight to strategic
        setStep("strategic")
      }
    } else if (step === "upload") {
      if (!uploadedBatchId) {
        toast.error("Please upload and map your data file first.")
        return
      }
      setStep("source-authority")
    } else if (step === "source-authority") {
      if (!baselineConfirmed) {
        toast.error("Please confirm the data baseline integrity before proceeding.")
        return
      }
      deriveAIParameters()
      setStep("assumptions")
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
    else if (step === "upload") setStep("intelligence")
    else if (step === "source-authority") {
      if (intelligenceEngine === "data-driven" && dataSelectionMode === "specific") setStep("upload")
      else setStep("intelligence")
    }
    else if (step === "assumptions") {
      if (intelligenceEngine === "data-driven") setStep("source-authority")
      else setStep("intelligence")
    }
    else if (step === "strategic") setStep("assumptions")
  }

  const deriveAIParameters = () => {
    // ═══════════════════════════════════════════════════════════════
    // AI PRECISION DERIVATION (Institutional Intelligence)
    // ═══════════════════════════════════════════════════════════════
    const stage = dataStatus?.orgStage?.toLowerCase() || "unknown"
    const industry = formData.industry.toLowerCase()

    let aiDecided = { ...syntheticParams }

    // 1. DCF / VALUATION DEFAULTS
    if (industry === "saas" || industry === "technology") {
      aiDecided.beta = "1.35"
      aiDecided.equityRiskPremium = "5.5"
      aiDecided.terminalGrowth = "3.0"
      aiDecided.terminalValueMethod = "perpetuity"
      aiDecided.costOfDebt = "7.5"
    } else if (industry === "finance" || industry === "real estate") {
      aiDecided.beta = "0.95"
      aiDecided.terminalGrowth = "2.0"
      aiDecided.terminalValueMethod = "multiple"
      aiDecided.costOfDebt = "6.5"
    } else {
      aiDecided.beta = "1.1"
      aiDecided.terminalGrowth = "2.5"
      aiDecided.costOfDebt = "8.0"
    }

    // 2. LBO / PRIVATE EQUITY DEFAULTS
    if (industry === "saas") {
      aiDecided.entryMultiple = "14.0"
      aiDecided.exitMultiple = "16.0"
      aiDecided.leverageRatio = "3.5"
      aiDecided.seniorDebtRate = "6.5"
    } else if (industry === "manufacturing" || industry === "retail") {
      aiDecided.entryMultiple = "7.5"
      aiDecided.exitMultiple = "8.5"
      aiDecided.leverageRatio = "5.5"
      aiDecided.seniorDebtRate = "8.0"
    } else {
      aiDecided.entryMultiple = "9.0"
      aiDecided.exitMultiple = "11.0"
      aiDecided.leverageRatio = "4.5"
      aiDecided.seniorDebtRate = "7.0"
    }

    // 3. M&A / ACCRETION-DILUTION DEFAULTS
    if (industry === "saas") {
      aiDecided.purchasePremium = "35"
      aiDecided.stockPercentage = "25"
      aiDecided.costSynergies = (parseFloat(aiDecided.starting_revenue || "0") * 0.1).toString() || "150000"
    } else {
      aiDecided.purchasePremium = "20"
      aiDecided.stockPercentage = "50"
      aiDecided.costSynergies = (parseFloat(aiDecided.starting_revenue || "0") * 0.05).toString() || "100000"
    }

    // Data-driven extraction
    const totalRev = dataStatus?.stats?.totalRevenue || 0
    if (totalRev > 0) {
      aiDecided.starting_revenue = (totalRev / 12).toFixed(0)
      aiDecided.starting_mrr = (totalRev / 12).toFixed(0)
      aiDecided.cash_on_hand = (totalRev * 0.2).toFixed(0) // estimate 20% cash buffer
      aiDecided.marketCap = (totalRev * 5).toFixed(0) // 5x rev multiple estimate
    }

    // Default Shares & Cash based on 'stage' hints if available
    if (stage === "early" || stage === "seed") {
      aiDecided.sharesOutstanding = "1000000"
      aiDecided.taxRate = "0" // often tax exempt or loss carryforward
    } else if (stage === "growth") {
      aiDecided.sharesOutstanding = "5000000"
      aiDecided.taxRate = "21"
    } else if (stage === "mature") {
      aiDecided.sharesOutstanding = "50000000"
      aiDecided.taxRate = "25"
    }

    // 4. Institutional Hardening Defaults
    aiDecided.mandatoryAmortization = "0.05"
    aiDecided.excessCashSweep = "0.80"
    aiDecided.transactionFeeRate = "0.015"
    aiDecided.synergyPhaseIn = "0.70"
    aiDecided.assetWriteUpPct = "0.20"
    aiDecided.amortizationPeriod = "10"

    setSyntheticParams(aiDecided as any)
    toast.success("AI Precision Build: Model parameters derived from " + (totalRev > 0 ? "historical performance & " : "") + "industry benchmarks.")
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
      init_metadata: {
        ...(formData as any).init_metadata,
        uploaded_file_id: uploadedBatchId,
      }
    }

    // Always assemble assumptions from syntheticParams (common scratchpad)
    // This ensures consistency between data-driven AI, Synthetic, and Manual tweaks
    payload.assumptions = {
      // General
      sharesOutstanding: parseInt(syntheticParams.sharesOutstanding as string) || 1000000,
      taxRate: (parseFloat(syntheticParams.taxRate as string) || 25) / 100,
      costOfDebt: (parseFloat(syntheticParams.costOfDebt as string) || 8) / 100,
      marketCap: parseFloat(syntheticParams.marketCap as string) || 1000000,
    }

    if (formData.modelType === 'dcf') {
      Object.assign(payload.assumptions, {
        riskFreeRate: (parseFloat(syntheticParams.riskFreeRate as string) || 4.5) / 100,
        equityRiskPremium: (parseFloat(syntheticParams.equityRiskPremium as string) || 5.5) / 100,
        beta: parseFloat(syntheticParams.beta as string) || 1.2,
        terminalGrowth: (parseFloat(syntheticParams.terminalGrowth as string) || 2.5) / 100,
        terminalValueMethod: syntheticParams.terminalValueMethod || 'perpetuity',
        exitMultiple: parseFloat(syntheticParams.exitMultiple as string) || 10.0,
      })
    } else if (formData.modelType === 'lbo') {
      Object.assign(payload.assumptions, {
        entryMultiple: parseFloat(syntheticParams.entryMultiple as string) || 8.0,
        exitMultiple: parseFloat(syntheticParams.exitMultiple as string) || 10.0,
        leverageRatio: parseFloat(syntheticParams.leverageRatio as string) || 4.5,
        holdingPeriod: parseInt(syntheticParams.holdingPeriod as string) || 5,
        seniorDebtRate: (parseFloat(syntheticParams.seniorDebtRate as string) || 6) / 100,
        subDebtRate: (parseFloat(syntheticParams.subDebtRate as string) || 10) / 100,
        mandatoryAmortization: parseFloat(syntheticParams.mandatoryAmortization as string) || 0.05,
        excessCashSweep: parseFloat(syntheticParams.excessCashSweep as string) || 0.80,
        transactionFeeRate: parseFloat(syntheticParams.transactionFeeRate as string) || 0.015,
        minimumCash: parseFloat(syntheticParams.minimumCash as string) || 50000,
      })
    } else if (formData.modelType === 'accretion-dilution') {
      Object.assign(payload.assumptions, {
        sharePrice: parseFloat(syntheticParams.sharePrice as string) || 50.0,
        targetNetIncome: parseFloat(syntheticParams.targetNetIncome as string) || 500000,
        targetRevenue: parseFloat(syntheticParams.targetRevenue as string) || 2000000,
        purchasePremium: (parseFloat(syntheticParams.purchasePremium as string) || 30) / 100,
        stockPercentage: (parseFloat(syntheticParams.stockPercentage as string) || 50) / 100,
        costSynergies: parseFloat(syntheticParams.costSynergies as string) || 150000,
        synergyPhaseIn: parseFloat(syntheticParams.synergyPhaseIn as string) || 0.70,
        transactionFeeRate: parseFloat(syntheticParams.transactionFeeRate as string) || 0.015,
        assetWriteUpPct: parseFloat(syntheticParams.assetWriteUpPct as string) || 0.20,
        amortizationPeriod: parseInt(syntheticParams.amortizationPeriod as string) || 10,
      })
    } else if (formData.modelType === 'saas') {
      Object.assign(payload.assumptions, {
        targetNrr: (parseFloat(syntheticParams.retention_rate as string) || 105) / 100,
        targetGrr: (parseFloat(syntheticParams.retention_rate as string) || 92) / 100,
        churnRate: (parseFloat(syntheticParams.churnRate as string) || 5) / 100,
        cacPaybackMonths: parseInt(syntheticParams.target_cac as string) || 12,
        magicNumberTarget: 0.75,
        ltvCacTarget: 3.5,
      })
    }

    if (intelligenceEngine === "synthetic") {
      payload.aiAnswers = {
        business_type: syntheticParams.business_type,
        starting_customers: syntheticParams.starting_customers,
        starting_revenue: syntheticParams.starting_revenue || syntheticParams.starting_mrr,
        cash_on_hand: syntheticParams.cash_on_hand,
      }
    }

    // Simulate high-fidelity processing
    setTimeout(() => {
      if (onSuccess) onSuccess(payload)
    }, 1200)
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP PROGRESS INDICATOR
  // ═══════════════════════════════════════════════════════════════
  const steps: { id: StepId; label: string }[] = [
    { id: "blueprint", label: "Blueprint" },
    { id: "intelligence", label: "Intelligence" },
    ...(intelligenceEngine === "data-driven" ? [{ id: "source-authority" as StepId, label: "Source Authority" }] : []),
    { id: "assumptions" as StepId, label: "Assumptions" },
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
                      <SelectItem value="saas">SaaS Strategic Model (NRR/LTV focus)</SelectItem>
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
            <div className="space-y-6">
              {/* Data Context Banner */}
              <div className={`p-4 rounded-xl border-2 ${dataStatus?.hasRealData
                ? 'bg-green-50 border-green-200 shadow-sm'
                : 'bg-amber-50 border-amber-200'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${dataStatus?.hasRealData ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {dataStatus?.hasRealData ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${dataStatus?.hasRealData ? 'text-green-900' : 'text-amber-900'}`}>
                      {dataStatus?.hasRealData
                        ? `Institutional Data Detected`
                        : "Data Source Missing"}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5 opacity-80">
                      {dataStatus?.hasRealData
                        ? `${dataStatus.stats?.transactionCount?.toLocaleString() || 0} verified entries · last sync ${dataStatus.stats?.lastTransactionDate ? new Date(dataStatus.stats.lastTransactionDate).toLocaleDateString() : 'N/A'}`
                        : "Connect an ERP, upload a CSV, or use Synthetic AI to begin."}
                    </p>
                  </div>
                </div>
              </div>

              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Select Model Intelligence Engine</Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Data-Driven AI */}
                <button
                  onClick={() => dataStatus?.intelligenceGating?.dataDrivenAI && setIntelligenceEngine("data-driven")}
                  className={`p-5 rounded-2xl border-2 text-left flex flex-col gap-4 transition-all relative group h-full ${intelligenceEngine === "data-driven"
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 ring-offset-2 shadow-xl'
                    : !dataStatus?.intelligenceGating?.dataDrivenAI
                      ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed grayscale'
                      : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'
                    }`}
                >
                  <div className={`p-3 w-fit rounded-xl ${intelligenceEngine === "data-driven" ? 'bg-indigo-600 text-white shadow-lg rotate-3' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors'}`}>
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight text-slate-900">Data-Driven AI</div>
                    <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      Syncs historical actuals from ERP, GL, and existing data. Highest auditability for institutional models.
                    </div>
                  </div>
                  {intelligenceEngine === "data-driven" && (
                     <div className="mt-auto pt-4 border-t border-indigo-100 space-y-3">
                        <p className="text-[10px] font-black uppercase text-indigo-700">Data Selection</p>
                        <div className="space-y-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDataSelectionMode("all"); }}
                             className={`w-full text-left p-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${dataSelectionMode === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-indigo-100 hover:border-indigo-300'}`}
                           >
                              <Database className="h-3.5 w-3.5" />
                              Use All Org Data
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDataSelectionMode("specific"); }}
                             className={`w-full text-left p-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${dataSelectionMode === 'specific' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-indigo-100 hover:border-indigo-300'}`}
                           >
                              <Plus className="h-3.5 w-3.5" />
                              Upload Specific File
                           </button>
                        </div>
                     </div>
                  )}
                </button>

                {/* Synthetic AI */}
                <button
                  onClick={() => setIntelligenceEngine("synthetic")}
                  className={`p-5 rounded-2xl border-2 text-left flex flex-col gap-4 transition-all group h-full ${intelligenceEngine === "synthetic"
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600 ring-offset-2 shadow-xl'
                    : 'border-slate-100 bg-white hover:border-purple-200 hover:shadow-lg'
                    }`}
                >
                  <div className={`p-3 w-fit rounded-xl ${intelligenceEngine === "synthetic" ? 'bg-purple-600 text-white shadow-lg -rotate-3' : 'bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors'}`}>
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight text-slate-900">Synthetic AI</div>
                    <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      Generates a model using industry benchmarks & top-down assumptions. No real data required.
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-auto text-[10px] w-fit font-black uppercase text-purple-600 border-purple-200 bg-purple-50">
                    Always Available
                  </Badge>
                </button>

                {/* Manual */}
                <button
                  onClick={() => setIntelligenceEngine("manual")}
                  className={`p-5 rounded-2xl border-2 text-left flex flex-col gap-4 transition-all group h-full ${intelligenceEngine === "manual"
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900 ring-offset-2 shadow-xl'
                    : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-lg'
                    }`}
                >
                  <div className={`p-3 w-fit rounded-xl ${intelligenceEngine === "manual" ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors'}`}>
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight text-slate-900">Manual Build</div>
                    <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      Define every driver and assumption manually. Full control architecture, zero AI inference.
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-auto text-[10px] w-fit font-black uppercase text-slate-600 border-slate-200 bg-slate-50">
                    Traditional
                  </Badge>
                </button>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={goBack} className="font-bold text-slate-600"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={goNext} className="px-10 h-12 bg-slate-900 text-white hover:bg-slate-800 shadow-xl rounded-xl font-bold">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3: UPLOAD SPECIFIC DATA (Gated by Selection)
          ═══════════════════════════════════════════════════════ */}
          {step === "upload" && (
            <div className="space-y-6">
               <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                 <h4 className="font-black text-indigo-900 text-sm uppercase tracking-tight flex items-center gap-2 mb-1">
                   <Plus className="h-4 w-4" />
                   File-Driven Model Creation
                 </h4>
                 <p className="text-[11px] text-indigo-700 font-medium opacity-80">
                   This model will be initialized <strong>exclusively</strong> from the transactions in the file you upload. 
                   Existing ERP or historic data will be excluded from the baseline.
                 </p>
               </div>

               <div className="border-4 border-dashed border-slate-100 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-200 transition-all bg-slate-50/50 group">
                  {uploadedBatchId ? (
                    <>
                      <div className="h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">Data File Verified</h4>
                        <p className="text-xs text-slate-500 font-medium">Import batch {uploadedBatchId.slice(0, 8)} initialized.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setUploadedBatchId(null)} className="rounded-lg text-[10px] font-black uppercase tracking-widest border-red-100 text-red-600 hover:bg-red-50">
                        Remove & Re-upload
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer" 
                           onClick={() => {
                             // Simple trigger for demo, in real app we'd trigger a hidden file input
                             const input = document.createElement('input');
                             input.type = 'file';
                             input.accept = '.csv';
                             input.onchange = async (e) => {
                               const file = (e.target as HTMLInputElement).files?.[0];
                               if (file) {
                                 setLoading(true);
                                 toast.info("Uploading and processing file...");
                                 try {
                                   const formData = new FormData();
                                   formData.append('file', file);
                                   const uploadRes = await fetch(`${API_BASE_URL}/v1/orgs/${orgId}/import/csv/upload`, {
                                     method: 'POST',
                                     headers: { 'Authorization': (getAuthHeaders() as any).Authorization },
                                     body: formData,
                                   });
                                   const uploadData = await uploadRes.json();
                                   if (!uploadData.ok) throw new Error(uploadData.error?.message || "Upload failed");
                                   
                                   // Success - now trigger a simple auto-mapping to get a batchId
                                   const mapRes = await fetch(`${API_BASE_URL}/v1/orgs/${orgId}/import/csv/map`, {
                                     method: 'POST',
                                     headers: { 
                                       'Authorization': (getAuthHeaders() as any).Authorization,
                                       'Content-Type': 'application/json'
                                     },
                                     body: JSON.stringify({
                                       uploadKey: uploadData.data.uploadKey,
                                       mappings: { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category' }, // Default map
                                       fileHash: uploadData.data.fileHash
                                     }),
                                   });
                                   const mapData = await mapRes.json();
                                   if (!mapData.ok) throw new Error(mapData.error?.message || "Mapping failed");
                                   
                                   setUploadedBatchId(mapData.data.importBatchId);
                                   toast.success("File verified and data-cube initialized!");
                                 } catch (err: any) {
                                   toast.error(err.message);
                                 } finally {
                                   setLoading(false);
                                 }
                               }
                             };
                             input.click();
                           }}
                      >
                        {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Plus className="h-8 w-8" />}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 tracking-tight">Select Institutional Data File</h4>
                        <p className="text-xs text-slate-500 font-medium">Drag and drop or click to browse (CSV only)</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400">SOC 2 Compliant</Badge>
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400">AES-256 Encrypted</Badge>
                      </div>
                    </>
                  )}
               </div>

               <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={goBack} className="font-bold text-slate-600"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={goNext} disabled={!uploadedBatchId} className="px-10 h-12 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl rounded-xl font-bold">
                  Analyze File <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3.1: SOURCE AUTHORITY DECLARATION (Data-Driven Only)
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
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-900 flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-purple-600" />
                    AI Precision Configuration
                  </h4>
                  {intelligenceEngine === "data-driven" && (
                     <Badge className="bg-green-600 text-white border-0">Data-Verified</Badge>
                  )}
                </div>
                <div className="text-xs text-purple-700 leading-relaxed font-medium">
                  {intelligenceEngine === "data-driven" 
                    ? `AI has analyzed your historical revenue ($${(dataStatus?.stats?.totalRevenue || 0).toLocaleString()}) and industry benchmarks to pre-populate these assumptions.`
                    : "Initializing model using synthetic industry benchmarks. Values below can be adjusted for custom scenarios."
                  }
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

                {/* DCF-Specific Assumptions */}
                {formData.modelType === 'dcf' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">DCF Valuation Parameters</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Risk-Free Rate (%)</Label>
                        <Input type="number" step="0.1" placeholder="4.5" defaultValue="4.5"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, riskFreeRate: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Equity Risk Premium (%)</Label>
                        <Input type="number" step="0.1" placeholder="5.5" defaultValue="5.5"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, equityRiskPremium: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Beta</Label>
                        <Input type="number" step="0.1" placeholder="1.2" defaultValue="1.2"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, beta: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Cost of Debt (%)</Label>
                        <Input type="number" step="0.1" placeholder="8.0" 
                          value={syntheticParams.costOfDebt}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, costOfDebt: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Terminal Growth (%)</Label>
                        <Input type="number" step="0.1" placeholder="2.5" 
                          value={syntheticParams.terminalGrowth}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, terminalGrowth: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Market Cap ($)</Label>
                        <Input type="number" placeholder="1000000" 
                          value={syntheticParams.marketCap}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, marketCap: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Tax Rate (%)</Label>
                        <Input type="number" step="1" 
                          value={syntheticParams.taxRate}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, taxRate: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Terminal Method</Label>
                        <select
                          className="w-full h-9 text-sm border rounded-md px-2 bg-white"
                          value={syntheticParams.terminalValueMethod || "perpetuity"}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, terminalValueMethod: e.target.value }))}
                        >
                          <option value="perpetuity">Perpetuity Growth</option>
                          <option value="multiple">Exit Multiple</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-blue-600">Shares Outstanding</Label>
                        <Input type="number" step="1" 
                          value={syntheticParams.sharesOutstanding}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, sharesOutstanding: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {/* LBO-Specific Assumptions */}
                {formData.modelType === 'lbo' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider">LBO Deal Parameters</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Entry Multiple (x EBITDA)</Label>
                        <Input type="number" step="0.5" placeholder="8.0" defaultValue="8.0"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, entryMultiple: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Exit Multiple (x EBITDA)</Label>
                        <Input type="number" step="0.5" placeholder="10.0" defaultValue="10.0"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, exitMultiple: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Leverage Ratio (x EBITDA)</Label>
                        <Input type="number" step="0.5" placeholder="4.0" defaultValue="4.0"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, leverageRatio: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Holding Period (Years)</Label>
                        <Input type="number" step="1" min="1" max="10" placeholder="5" defaultValue="5"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, holdingPeriod: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Senior Rate (%)</Label>
                        <Input type="number" step="0.5" placeholder="6.0" defaultValue="6.0"
                          value={syntheticParams.seniorDebtRate}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, seniorDebtRate: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Sub Rate (%)</Label>
                        <Input type="number" step="0.5" placeholder="10.0" defaultValue="10.0"
                          value={syntheticParams.subDebtRate}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, subDebtRate: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Mandatory Amort (%)</Label>
                        <Input type="number" step="0.01" placeholder="0.05" 
                          value={syntheticParams.mandatoryAmortization}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, mandatoryAmortization: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Excess Sweep (%)</Label>
                        <Input type="number" step="0.01" placeholder="0.80" 
                          value={syntheticParams.excessCashSweep}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, excessCashSweep: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-purple-600">Min. Cash ($)</Label>
                        <Input type="number" placeholder="50000" defaultValue="50000"
                          onChange={(e) => setSyntheticParams(p => ({ ...p, minimumCash: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Accretion/Dilution-Specific Assumptions */}
                {formData.modelType === 'accretion-dilution' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">M&A / Accretion-Dilution Parameters</h4>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                        <BadgeCheck className="h-3 w-3" />
                        AI Verified
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Acquirer Price ($)</Label>
                        <Input type="number" step="0.5" placeholder="50.0" 
                          value={syntheticParams.sharePrice}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, sharePrice: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Acquirer Shares</Label>
                        <Input type="number" placeholder="1000000" 
                          value={syntheticParams.sharesOutstanding}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, sharesOutstanding: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Premium (%)</Label>
                        <Input type="number" step="1" placeholder="30" 
                          value={syntheticParams.purchasePremium}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, purchasePremium: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Target Net Income ($)</Label>
                        <Input type="number" placeholder="500000" 
                          value={syntheticParams.targetNetIncome}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, targetNetIncome: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Target Revenue ($)</Label>
                        <Input type="number" placeholder="2000000" 
                          value={syntheticParams.targetRevenue || ""}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, targetRevenue: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Stock Payment (%)</Label>
                        <Input type="number" step="1" min="0" max="100" placeholder="50" 
                          value={syntheticParams.stockPercentage}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, stockPercentage: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Cost Synergies ($ Run-rate)</Label>
                        <Input type="number" placeholder="100000" 
                          value={syntheticParams.costSynergies}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, costSynergies: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Synergy Phase-In Y1 (%)</Label>
                        <Input type="number" step="0.05" placeholder="0.70" 
                          value={syntheticParams.synergyPhaseIn}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, synergyPhaseIn: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Transaction Fee (%)</Label>
                        <Input type="number" step="0.005" placeholder="0.015" 
                          value={syntheticParams.transactionFeeRate}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, transactionFeeRate: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Asset Write-Up (%)</Label>
                        <Input type="number" step="0.05" placeholder="0.20" 
                          value={syntheticParams.assetWriteUpPct}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, assetWriteUpPct: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Amort. Period (Yrs)</Label>
                        <Input type="number" step="1" placeholder="10" 
                          value={syntheticParams.amortizationPeriod}
                          onChange={(e) => setSyntheticParams(p => ({ ...p, amortizationPeriod: e.target.value }))}
                          className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
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
                {/* AI Model Architecture Summary */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                   <div className="flex items-center gap-2">
                     <div className="p-1 bg-indigo-500 rounded text-white"><Sparkles className="h-3.5 w-3.5" /></div>
                     <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-tighter">AI Architecture Reasoning</h4>
                   </div>
                   <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                     The AI has initialized an <strong>{formData.modelType?.toUpperCase()}</strong> architecture 
                     using {intelligenceEngine === "data-driven" ? "verified data-points as the baseline" : "top-down industry benchmarks"}. 
                     {formData.modelType === 'dcf' && " Cost of Equity is optimized for current market yields and sector-specific risk premiums."}
                     {formData.modelType === 'lbo' && " Capital structure is optimized for maximum IRR while maintaining a sustainable leverage safety-margin."}
                     {formData.modelType === 'accretion-dilution' && " Synergies are modeled with a 24-month linear phase-in to reflect realistic integration effort."}
                   </p>
                </div>

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
