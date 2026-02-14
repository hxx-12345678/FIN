"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Plus, FileText, Database, Sparkles as SparkleIcon, TrendingUp, ShieldCheck, Target, Zap, ArrowRight, CheckCircle2, Brain } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { API_BASE_URL } from "@/lib/api-config"

interface CreateModelFormProps {
  orgId?: string | null
  onSuccess?: (modelId: string) => void
  onCancel?: () => void
  aiMode?: boolean // If true, automatically show AI questions after basic form
  connectors?: any[]
}

export function CreateModelForm({ orgId, onSuccess, onCancel, aiMode = false, connectors = [] }: CreateModelFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"basic" | "analyzing" | "strategic-confirm" | "ai-questions" | "complete">("basic")
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [strategicGoal, setStrategicGoal] = useState<"growth" | "profitability" | "stable">("growth")
  const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(orgId || null)

  // Try to get orgId from localStorage if not provided as prop
  useEffect(() => {
    if (!effectiveOrgId) {
      const storedOrgId = localStorage.getItem("orgId")
      if (storedOrgId) {
        setEffectiveOrgId(storedOrgId)
      }
    }
  }, [effectiveOrgId])

  // Update effectiveOrgId when prop changes
  useEffect(() => {
    if (orgId) {
      setEffectiveOrgId(orgId)
    }
  }, [orgId])

  // Suggestions based on connectors
  useEffect(() => {
    if (connectors.length > 0) {
      setFormData(prev => ({
        ...prev,
        data_source_type: prev.data_source_type || "connectors",
      }))
    }
  }, [connectors])

  useEffect(() => {
    if (aiMode) {
      setFormData(prev => ({
        ...prev,
        data_source_type: prev.data_source_type || "blank", // Will trigger AI questions
      }))
    }
  }, [aiMode])

  // Form state
  const [formData, setFormData] = useState({
    model_name: "",
    industry: "",
    revenue_model_type: "" as "subscription" | "transactional" | "services" | "hybrid" | "",
    forecast_duration: 12 as 12 | 24 | 36,
    start_month: "",
    data_source_type: "" as "connectors" | "csv" | "blank" | "",
    base_currency: "USD",
    country: "",
    tax_region: "",
    description: "",
  })

  // AI questions state (only for AI-generated models)
  const [aiAnswers, setAiAnswers] = useState({
    business_type: "" as "saas" | "ecommerce" | "services" | "mixed" | "",
    starting_customers: "",
    starting_revenue: "",
    starting_mrr: "",
    starting_aov: "",
    major_costs: {
      payroll: "",
      infrastructure: "",
      marketing: "",
    },
    cash_on_hand: "",
    growth_rate_target: "",
    retention_rate: "",
    hiring_plan: [] as Array<{ month: number, role: string, salary: string }>,
    acquisition_efficiency: {
      caac: "", // Customer Acquisition Cost
      payback: "", // Payback period in months
    }
  })

  // Set default start month to current month
  useEffect(() => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setFormData(prev => ({
      ...prev,
      start_month: prev.start_month || `${now.getFullYear()}-${month}`,
    }))
  }, [])

  const industries = [
    "SaaS",
    "E-commerce",
    "Services",
    "Healthcare",
    "Finance",
    "Education",
    "Real Estate",
    "Manufacturing",
    "Retail",
    "Other",
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAiAnswerChange = (field: string, value: any) => {
    if (field.startsWith("major_costs.")) {
      const costField = field.split(".")[1]
      setAiAnswers(prev => ({
        ...prev,
        major_costs: {
          ...prev.major_costs,
          [costField]: value,
        },
      }))
    } else {
      setAiAnswers(prev => ({ ...prev, [field]: value }))
    }
  }

  const validateBasicForm = (): boolean => {
    if (!formData.model_name.trim()) {
      toast.error("Model name is required")
      return false
    }
    if (!formData.industry) {
      toast.error("Industry is required")
      return false
    }
    if (!formData.revenue_model_type) {
      toast.error("Revenue model type is required")
      return false
    }
    if (!formData.data_source_type) {
      toast.error("Data source type is required")
      return false
    }
    if (!formData.start_month || !/^\d{4}-\d{2}$/.test(formData.start_month)) {
      toast.error("Start month must be in YYYY-MM format")
      return false
    }
    return true
  }

  const getAiQuestions = () => {
    const questions: Array<{
      key: string
      label: string
      type: "text" | "number" | "select"
      options?: string[]
      placeholder?: string
      required?: boolean
    }> = []

    // Business type (always asked)
    questions.push({
      key: "business_type",
      label: "Business Type",
      type: "select",
      options: ["saas", "ecommerce", "services", "mixed"],
      required: true,
    })

    // Revenue model specific questions
    if (formData.revenue_model_type === "subscription") {
      questions.push({
        key: "starting_mrr",
        label: "Starting Monthly Recurring Revenue (MRR)",
        type: "number",
        placeholder: "e.g., 50000",
        required: true,
      })
      questions.push({
        key: "starting_customers",
        label: "Starting Number of Customers",
        type: "number",
        placeholder: "e.g., 100",
        required: true,
      })
    } else if (formData.revenue_model_type === "transactional") {
      questions.push({
        key: "starting_aov",
        label: "Average Order Value (AOV)",
        type: "number",
        placeholder: "e.g., 100",
        required: true,
      })
      questions.push({
        key: "starting_customers",
        label: "Starting Number of Orders per Month",
        type: "number",
        placeholder: "e.g., 500",
        required: true,
      })
    } else {
      questions.push({
        key: "starting_revenue",
        label: "Starting Monthly Revenue",
        type: "number",
        placeholder: "e.g., 50000",
        required: true,
      })
    }

    // Cost questions (always asked)
    questions.push({
      key: "major_costs.payroll",
      label: "Monthly Payroll Costs",
      type: "number",
      placeholder: "e.g., 50000",
    })
    questions.push({
      key: "major_costs.infrastructure",
      label: "Monthly Infrastructure Costs",
      type: "number",
      placeholder: "e.g., 10000",
    })
    questions.push({
      key: "major_costs.marketing",
      label: "Monthly Marketing Costs",
      type: "number",
      placeholder: "e.g., 20000",
    })

    // Efficiency parameters (Futuristic standard)
    questions.push({
      key: "retention_rate",
      label: "Expected Customer Retention Rate (%)",
      type: "number",
      placeholder: "e.g., 95 (for 5% churn)",
      required: true,
    })

    questions.push({
      key: "acquisition_efficiency.caac",
      label: "Target CAC ($)",
      type: "number",
      placeholder: "e.g., 500",
    })

    // Cash question (always asked)
    questions.push({
      key: "cash_on_hand",
      label: "Current Total Cash on Hand ($)",
      type: "number",
      placeholder: "e.g., 500000",
      required: true,
    })

    return questions
  }

  const handleDataAnalysis = async () => {
    if (!effectiveOrgId) return;
    setStep("analyzing");

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const res = await fetch(`${API_BASE_URL}/orgs/${effectiveOrgId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setAnalysisData(data.analysis);
        // Artificial delay for "Premium AI Feel" and transition window
        await new Promise(r => setTimeout(r, 2500));
        setStep("strategic-confirm");
      } else {
        throw new Error("Analysis failed");
      }
    } catch (e) {
      setStep("basic");
      toast.error("AI Analysis failed. Proceeding with standard setup.");
      await createModel(false);
    }
  }

  const handleSubmit = async () => {
    if (!validateBasicForm()) {
      return
    }

    // If data source is CSV/connectors, trigger AI Analysis for Premium Feel
    if (formData.data_source_type === "csv" || formData.data_source_type === "connectors") {
      await handleDataAnalysis();
      return
    }

    // If data source is blank, show AI questions to generate assumptions
    if (formData.data_source_type === "blank") {
      setStep("ai-questions")
      return
    }

    // Fallback: create model without AI
    await createModel(false)
  }

  const handleStrategicSubmit = async () => {
    // Merge strategic goal into assumptions
    const customAssumptions = {
      revenue: {
        ...analysisData?.assumptions?.revenue,
        growthModel: strategicGoal === "growth" ? "exponential" : "linear",
        revenueGrowth: strategicGoal === "growth"
          ? (analysisData?.assumptions?.revenue?.revenueGrowth || 0.08) * 1.5
          : (analysisData?.assumptions?.revenue?.revenueGrowth || 0.08)
      }
    };

    // Create model with these strategic biases
    await createModel(true, customAssumptions);
  }

  const handleAiSubmit = async () => {
    // Validate AI answers
    const questions = getAiQuestions()
    const requiredQuestions = questions.filter(q => q.required)

    for (const q of requiredQuestions) {
      if (q.key.startsWith("major_costs.")) {
        // Skip cost validation
        continue
      }
      const value = aiAnswers[q.key as keyof typeof aiAnswers]
      if (!value || (typeof value === "string" && !value.trim())) {
        toast.error(`${q.label} is required`)
        return
      }
    }

    await createModel(true)
  }

  const createModel = async (isAiGenerated: boolean = false, extraAssumptions?: any) => {
    if (!effectiveOrgId) {
      toast.error("Organization ID not found. Please try again or refresh the page.")
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const payload: any = {
        model_name: formData.model_name,
        industry: formData.industry,
        revenue_model_type: formData.revenue_model_type,
        forecast_duration: formData.forecast_duration,
        start_month: formData.start_month,
        data_source_type: formData.data_source_type,
        base_currency: formData.base_currency,
      }

      if (formData.country) payload.country = formData.country
      if (formData.tax_region) payload.tax_region = formData.tax_region
      if (formData.description) payload.description = formData.description

      // Add AI-generated fields if applicable
      if (isAiGenerated) {
        payload.business_type = aiAnswers.business_type
        if (aiAnswers.starting_customers) payload.starting_customers = parseInt(aiAnswers.starting_customers)
        if (aiAnswers.starting_revenue) payload.starting_revenue = parseFloat(aiAnswers.starting_revenue)
        if (aiAnswers.starting_mrr) payload.starting_mrr = parseFloat(aiAnswers.starting_mrr)
        if (aiAnswers.starting_aov) payload.starting_aov = parseFloat(aiAnswers.starting_aov)
        if (aiAnswers.cash_on_hand) payload.cash_on_hand = parseFloat(aiAnswers.cash_on_hand)

        payload.major_costs = {}
        if (aiAnswers.major_costs.payroll) payload.major_costs.payroll = parseFloat(aiAnswers.major_costs.payroll)
        if (aiAnswers.major_costs.infrastructure) payload.major_costs.infrastructure = parseFloat(aiAnswers.major_costs.infrastructure)
        if (aiAnswers.major_costs.marketing) payload.major_costs.marketing = parseFloat(aiAnswers.major_costs.marketing)
      }

      console.log("Creating model with payload:", payload)
      console.log("API URL:", `${API_BASE_URL}/orgs/${effectiveOrgId}/models`)

      const response = await fetch(`${API_BASE_URL}/orgs/${effectiveOrgId}/models`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || "Failed to create model")
      }

      const result = await response.json()
      if (result.ok && result.model) {
        toast.success("Model created successfully!")
        setStep("complete")

        if (onSuccess) {
          onSuccess(result.model.id)
        } else {
          router.push(`/financial-modeling?modelId=${result.model.id}`)
        }
      } else {
        throw new Error(result.error?.message || result.message || "Invalid response from server")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create model"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderAnalyzingStep = () => {
    const statuses = [
      "Securing data pipeline...",
      "Analyzing transaction history...",
      "Identifying recurring revenue patterns...",
      "Benchmarking against industry standards...",
      "Synthesizing strategic recommendations..."
    ];

    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-xl shadow-purple-200"
          >
            <SparkleIcon className="h-10 w-10 text-white" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-blue-400 -z-10 blur-xl"
          />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            FinaPilot AI is Thinking
          </h3>
          <div className="h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={Math.floor(Date.now() / 2000)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-muted-foreground"
              >
                {statuses[Math.floor((Date.now() / 1000) % statuses.length)]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          />
        </div>
      </div>
    );
  };

  const renderStrategicStep = () => {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex gap-4 items-start">
          <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-medium text-purple-900">AI Data Insight</h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              {analysisData?.insight?.summary} {analysisData?.insight?.benchmarks?.text}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose Your Strategic Outlook</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'growth', label: 'Aggressive Growth', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Focus on MoM revenue scaling.' },
              { id: 'stable', label: 'Sustainable', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Balanced growth and burn.' },
              { id: 'profitability', label: 'Efficiency First', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', desc: 'Prioritize runway & unit economics.' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStrategicGoal(opt.id as any)}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${strategicGoal === opt.id ? `${opt.border} ${opt.bg} ring-2 ring-primary ring-offset-2` : 'border-slate-100 bg-white hover:border-slate-300'}`}
              >
                <opt.icon className={`h-6 w-6 mb-3 ${opt.color}`} />
                <h5 className="font-bold text-slate-900">{opt.label}</h5>
                <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={() => setStep("basic")} disabled={loading}>Back</Button>
          <Button onClick={handleStrategicSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Confirm & Initialize Model
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-none shadow-2xl ring-1 ring-slate-200">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === "basic" && (
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <CardTitle className="text-2xl">Financial Model Hub</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Design the blueprint of your company&apos;s future.</CardDescription>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <SparkleIcon size={120} />
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Model Name</Label>
                    <Input
                      placeholder="e.g. Series A Projections"
                      value={formData.model_name}
                      autoFocus
                      onChange={(e) => handleInputChange("model_name", e.target.value)}
                      className="h-12 border-slate-200 focus:ring-purple-500 transition-all text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Industry Sector</Label>
                    <Select value={formData.industry} onValueChange={(val) => handleInputChange("industry", val)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Revenue Engine</Label>
                    <Select value={formData.revenue_model_type} onValueChange={(val) => handleInputChange("revenue_model_type", val)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Engine" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Scale Window</Label>
                    <Select value={String(formData.forecast_duration)} onValueChange={(val) => handleInputChange("forecast_duration", parseInt(val))}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 Months</SelectItem>
                        <SelectItem value="24">24 Months</SelectItem>
                        <SelectItem value="36">36 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Ignition Month</Label>
                    <Input type="month" value={formData.start_month} onChange={(e) => handleInputChange("start_month", e.target.value)} className="h-12" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase text-slate-500">Intelligence Source</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleInputChange("data_source_type", "connectors")}
                      className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.data_source_type === "connectors" ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className={`p-2 rounded-lg ${formData.data_source_type === "connectors" ? 'bg-primary text-white' : 'bg-slate-100'}`}>
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold">Sync Connectors</div>
                        <div className="text-xs text-slate-500 italic">ERP, QBO, Xero, Plaid</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleInputChange("data_source_type", "blank")}
                      className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.data_source_type === "blank" ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className={`p-2 rounded-lg ${formData.data_source_type === "blank" ? 'bg-primary text-white' : 'bg-slate-100'}`}>
                        <SparkleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold">AI Synthetic Generation</div>
                        <div className="text-xs text-slate-500 italic">Predictive Benchmarking</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                  {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !formData.model_name || !formData.industry}
                    className="px-8 h-12 bg-slate-900 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all"
                  >
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}

          {step === "analyzing" && (
            <CardContent className="p-12">
              {renderAnalyzingStep()}
            </CardContent>
          )}

          {step === "strategic-confirm" && (
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">AI Strategy Configuration</h3>
                  <p className="text-slate-500">We&apos;ve analyzed your data. Now tell us your aim.</p>
                </div>
              </div>
              {renderStrategicStep()}
            </CardContent>
          )}

          {step === "ai-questions" && (
            <CardContent className="p-8 pb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                  <SparkleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">AI Guided Setup</h3>
                  <p className="text-slate-500">Let&apos;s calibrate your synthetic model.</p>
                </div>
              </div>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {getAiQuestions().map(q => (
                  <div key={q.key} className="space-y-2">
                    <Label className="font-semibold text-slate-700">{q.label} {q.required && "*"}</Label>
                    {q.type === "select" ? (
                      <Select value={aiAnswers[q.key as keyof typeof aiAnswers] as any} onValueChange={v => handleAiAnswerChange(q.key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {q.options?.map(o => <SelectItem key={o} value={o}>{o.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={q.placeholder}
                        type={q.type}
                        className="h-11"
                        value={q.key.includes('.') ? (aiAnswers.major_costs as any)[q.key.split('.')[1]] : (aiAnswers[q.key as keyof typeof aiAnswers] as any)}
                        onChange={e => handleAiAnswerChange(q.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <Button variant="ghost" onClick={() => setStep("basic")}>Back</Button>
                <Button onClick={handleAiSubmit} disabled={loading} className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 shadow-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                  Generate Model
                </Button>
              </div>
            </CardContent>
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  )
}

