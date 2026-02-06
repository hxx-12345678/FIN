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
import { Loader2, Plus, FileText, Database } from "lucide-react"
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
  const [step, setStep] = useState<"basic" | "ai-questions" | "complete">("basic")
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

    // Cash question (always asked)
    questions.push({
      key: "cash_on_hand",
      label: "Current Cash on Hand",
      type: "number",
      placeholder: "e.g., 500000",
      required: true,
    })

    return questions
  }

  const handleSubmit = async () => {
    if (!validateBasicForm()) {
      return
    }

    // If data source is CSV/connectors, skip AI questions (data comes from transactions)
    if (formData.data_source_type === "csv" || formData.data_source_type === "connectors") {
      await createModel(false)
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

  const createModel = async (isAiGenerated: boolean = false) => {
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

  // Show loading while waiting for orgId
  if (!effectiveOrgId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading organization data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "complete") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Created Successfully!</CardTitle>
          <CardDescription>Your financial model is being set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The model is being processed. You'll be redirected to the model dashboard shortly.
          </p>
          <Button onClick={() => router.push("/financial-modeling")}>
            Go to Financial Modeling
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "ai-questions") {
    const questions = getAiQuestions()

    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Model Setup</CardTitle>
          <CardDescription>
            Answer a few questions to help us generate accurate assumptions for your model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((q) => (
            <div key={q.key} className="space-y-2">
              <Label htmlFor={q.key}>
                {q.label}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {q.type === "select" ? (
                <Select
                  value={aiAnswers[q.key as keyof typeof aiAnswers] as string || undefined}
                  onValueChange={(value) => handleAiAnswerChange(q.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${q.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={q.key}
                  type={q.type}
                  placeholder={q.placeholder}
                  value={
                    q.key.includes('.')
                      ? (aiAnswers.major_costs as any)[q.key.split('.')[1]] || ""
                      : (aiAnswers[q.key as keyof typeof aiAnswers] as string) || ""
                  }
                  onChange={(e) => handleAiAnswerChange(q.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep("basic")}
              disabled={loading}
            >
              Back
            </Button>
            <Button onClick={handleAiSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Model
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Financial Model</CardTitle>
        <CardDescription>
          Set up a new financial model for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Name */}
        <div className="space-y-2">
          <Label htmlFor="model_name">
            Model Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="model_name"
            placeholder="e.g., Q1 2025 Forecast"
            value={formData.model_name}
            onChange={(e) => handleInputChange("model_name", e.target.value)}
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">
            Industry <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.industry || undefined}
            onValueChange={(value) => handleInputChange("industry", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Revenue Model Type */}
        <div className="space-y-2">
          <Label htmlFor="revenue_model_type">
            Revenue Model Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.revenue_model_type || undefined}
            onValueChange={(value) => handleInputChange("revenue_model_type", value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select revenue model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="transactional">Transactional</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Forecast Duration */}
        <div className="space-y-2">
          <Label htmlFor="forecast_duration">
            Forecast Duration <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.forecast_duration ? String(formData.forecast_duration) : undefined}
            onValueChange={(value) => handleInputChange("forecast_duration", parseInt(value) as 12 | 24 | 36)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
              <SelectItem value="36">36 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Month */}
        <div className="space-y-2">
          <Label htmlFor="start_month">
            Start Month <span className="text-red-500">*</span>
          </Label>
          <Input
            id="start_month"
            type="month"
            value={formData.start_month}
            onChange={(e) => handleInputChange("start_month", e.target.value)}
          />
        </div>

        {/* Data Source Type */}
        <div className="space-y-2">
          <Label htmlFor="data_source_type">
            Data Source <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.data_source_type || undefined}
            onValueChange={(value) => handleInputChange("data_source_type", value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="connectors">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Connectors (QuickBooks, Xero, etc.)</span>
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>CSV Import</span>
                </div>
              </SelectItem>
              <SelectItem value="blank">Blank (Manual Entry)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Optional Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base_currency">Base Currency</Label>
            <Input
              id="base_currency"
              value={formData.base_currency}
              onChange={(e) => handleInputChange("base_currency", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a description for this model..."
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {formData.data_source_type === "blank" ? "Create Model" : "Continue"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

