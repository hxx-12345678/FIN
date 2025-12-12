"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScenarioSnapshotManager } from "./scenario-snapshot-manager"
import { ScenarioComparisonView } from "./scenario-comparison-view"
import { ScenarioVersionHistory } from "./scenario-version-history"
import { ScenarioDataTransparency } from "./scenario-data-transparency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Brain, Zap, Play, Save, Copy, Share, MessageSquare, AlertTriangle, CheckCircle, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api-config"

// Scenario templates - static list for quick creation
const scenarioTemplates = [
  {
    id: "hiring-spree",
    name: "Hiring Acceleration",
    description: "What if we hire 5 engineers in Q3?",
    category: "Growth",
    impact: "high",
    defaultOverrides: {
      costs: { payroll: 600000, growth: 0.15 },
      revenue: { growth: 0.12 },
    },
  },
  {
    id: "pricing-increase",
    name: "Price Increase",
    description: "Impact of 20% price increase on churn and revenue",
    category: "Revenue",
    impact: "medium",
    defaultOverrides: {
      revenue: { baseline: 1.2, churn: 0.08 },
    },
  },
  {
    id: "market-downturn",
    name: "Market Downturn",
    description: "Economic recession scenario planning",
    category: "Risk",
    impact: "high",
    defaultOverrides: {
      revenue: { growth: -0.15, churn: 0.12 },
      costs: { growth: -0.05 },
    },
  },
  {
    id: "new-product",
    name: "Product Launch",
    description: "Launching a new product line",
    category: "Growth",
    impact: "high",
    defaultOverrides: {
      revenue: { growth: 0.25, baseline: 1.1 },
      costs: { marketing: 150000 },
    },
  },
]

const nlpQueries = [
  "What happens if we hire 3 engineers next month?",
  "Show runway if CAC increases 20%",
  "Impact of losing our biggest customer",
  "What if we raise prices by 15%?",
  "Scenario where we cut marketing spend in half",
]

interface Scenario {
  id: string
  scenarioType: string
  scenarioName: string
  overrides: Record<string, any>
  status: string
  summary: any
  createdAt: string
  finishedAt?: string
}

interface Model {
  id: string
  name: string
  orgId: string
}

export function ScenarioPlanning() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Scenario creation state
  const [selectedScenario, setSelectedScenario] = useState("hiring-spree")
  const [scenarioName, setScenarioName] = useState("")
  const [scenarioType, setScenarioType] = useState<"baseline" | "optimistic" | "conservative" | "adhoc">("adhoc")
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // NLP Query state
  const [nlpQuery, setNlpQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState("")

  // Fetch orgId
  useEffect(() => {
    fetchOrgId()
  }, [])

  // Fetch models when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchModels()
    }
  }, [orgId])

  // Fetch scenarios when model is selected
  useEffect(() => {
    if (selectedModelId && orgId) {
      fetchScenarios()
    }
  }, [selectedModelId, orgId])

  // Listen for CSV import completion to refresh data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`CSV import completed! Refreshing scenarios...`)
        
        // Small delay to ensure backend has processed the data
        setTimeout(async () => {
          if (selectedModelId && orgId) {
            await fetchModels()
            await fetchScenarios()
          }
        }, 2000)
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
    }
  }, [orgId, selectedModelId])

  const fetchOrgId = async () => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

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
          setOrgId(primaryOrgId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }
  }

  const fetchModels = async () => {
    if (!orgId) return

    setLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models) {
          setModels(result.models)
          if (result.models.length > 0 && !selectedModelId) {
            setSelectedModelId(result.models[0].id)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
      setError("Failed to load models")
    } finally {
      setLoading(false)
    }
  }

  const fetchScenarios = async () => {
    if (!selectedModelId || !orgId) return

    setLoadingScenarios(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setLoadingScenarios(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/scenarios?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.scenarios) {
          setScenarios(result.scenarios)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error?.message?.includes("not found")) {
          // No scenarios yet, that's okay
          setScenarios([])
        } else {
          throw new Error(errorData.error?.message || "Failed to fetch scenarios")
        }
      }
    } catch (error) {
      console.error("Failed to fetch scenarios:", error)
      setScenarios([])
    } finally {
      setLoadingScenarios(false)
    }
  }

  const handleCreateScenario = async () => {
    if (!selectedModelId || !orgId) {
      toast.error("Please select a model first")
      return
    }

    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name")
      return
    }

    setIsCreating(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        setIsCreating(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/models/${selectedModelId}/scenarios?org_id=${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: scenarioName,
          scenarioType,
          overrides,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          toast.success("Scenario created successfully! Running in background...")
          setShowCreateDialog(false)
          setScenarioName("")
          setOverrides({})
          // Refresh scenarios after a delay
          setTimeout(() => {
            fetchScenarios()
          }, 2000)
        } else {
          throw new Error(result.error?.message || "Failed to create scenario")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Failed to create scenario")
      }
    } catch (error) {
      console.error("Failed to create scenario:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create scenario")
    } finally {
      setIsCreating(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedScenario(templateId)
    const template = scenarioTemplates.find(t => t.id === templateId)
    if (template) {
      setScenarioName(template.name)
      setOverrides(template.defaultOverrides || {})
      setScenarioType("adhoc")
    }
  }

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return
    if (!orgId) {
      toast.error("Please ensure you're logged in")
      return
    }

    setIsProcessing(true)
    setAiResponse("")
    
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        setIsProcessing(false)
        return
      }

      // Use AI CFO to process the query
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          goal: `Analyze this scenario: ${nlpQuery}. Provide detailed financial impact analysis including revenue changes, expense changes, cash runway impact, and recommendations.`,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.plan) {
          const planJson = result.plan.planJson || {}
          const structuredResponse = planJson.structuredResponse || {}
          const naturalText = structuredResponse.natural_text || ""
          
          if (naturalText) {
            setAiResponse(naturalText)
          } else if (planJson.insights && planJson.insights.length > 0) {
            const insights = planJson.insights.map((i: any) => i.summary || i.text).join("\n\n")
            setAiResponse(insights)
          } else {
            setAiResponse("Analysis completed. Review the recommendations below to create a scenario.")
          }
        } else {
          throw new Error("Invalid response from AI service")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Failed to process query")
      }
    } catch (error) {
      console.error("Failed to process NLP query:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process query")
      setAiResponse("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRunScenario = () => {
    if (!selectedModelId) {
      toast.error("Please select a model first")
      return
    }
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Scenario Planning</h1>
          <p className="text-muted-foreground">Natural language scenario modeling and what-if analysis</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="bg-transparent w-full sm:w-auto">
            <Share className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Share Scenarios</span>
            <span className="sm:hidden">Share</span>
          </Button>
          <Button size="sm" className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Save Analysis</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {/* Model Selection */}
      {models.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Label htmlFor="model-select" className="whitespace-nowrap">Select Model:</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model-select" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedModelId && (
                <Badge variant="outline" className="text-yellow-600">
                  Please select a model to create scenarios
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Query Interface */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Ask Your AI Financial Copilot
          </CardTitle>
          <CardDescription>Type your scenario question in natural language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="e.g., What happens if we hire 3 engineers next month?"
                value={nlpQuery}
                onChange={(e) => setNlpQuery(e.target.value)}
                className="min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleNLPQuery()
                  }
                }}
              />
            </div>
            <Button onClick={handleNLPQuery} disabled={isProcessing || !nlpQuery.trim() || !orgId} className="self-end">
              {isProcessing ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ask AI
                </>
              )}
            </Button>
          </div>

          {/* Quick Query Suggestions */}
          <div className="flex flex-wrap gap-2">
            {nlpQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => setNlpQuery(query)}
              >
                {query}
              </Button>
            ))}
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium">AI Analysis</span>
              </div>
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground">{aiResponse}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 min-w-[600px]">
            <TabsTrigger value="scenarios" className="text-xs sm:text-sm">Scenarios</TabsTrigger>
            <TabsTrigger value="snapshots" className="text-xs sm:text-sm">Snapshots</TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs sm:text-sm">Comparison</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Version History</TabsTrigger>
            <TabsTrigger value="sensitivity" className="text-xs sm:text-sm">Sensitivity</TabsTrigger>
            <TabsTrigger value="transparency" className="text-xs sm:text-sm">Data Sources</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scenarios" className="space-y-4 overflow-x-auto overflow-y-visible">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedModelId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Model Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Please select a financial model to create scenarios
                  </p>
                  {models.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No models found. Create a model in the Financial Modeling page first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Scenario Templates */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Templates</CardTitle>
                    <CardDescription>Pre-built scenarios for common situations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scenarioTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedScenario === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{template.name}</h3>
                          <Badge variant={template.impact === "high" ? "destructive" : "secondary"} className="text-xs">
                            {template.impact}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    ))}

                    <Button 
                      variant="outline" 
                      className="w-full bg-transparent"
                      onClick={() => {
                        setScenarioName("")
                        setOverrides({})
                        setScenarioType("adhoc")
                        setShowCreateDialog(true)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Custom Scenario
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing Scenarios List */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Existing Scenarios</CardTitle>
                    <CardDescription>Previously created scenarios</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingScenarios ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : scenarios.length > 0 ? (
                      <div className="space-y-2">
                        {scenarios.map((scenario) => (
                          <div
                            key={scenario.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              // Could navigate to scenario details
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">{scenario.scenarioName}</h4>
                              <Badge variant={scenario.status === "done" ? "default" : "secondary"}>
                                {scenario.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {scenario.scenarioType} • {new Date(scenario.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No scenarios created yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Scenario Builder */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Builder</CardTitle>
                    <CardDescription>Customize your scenario parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scenario Name</Label>
                        <Input 
                          value={scenarioName}
                          onChange={(e) => setScenarioName(e.target.value)}
                          placeholder="e.g., Hiring 5 Engineers"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Scenario Type</Label>
                        <Select value={scenarioType} onValueChange={(v: any) => setScenarioType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baseline">Baseline</SelectItem>
                            <SelectItem value="optimistic">Optimistic</SelectItem>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="adhoc">Ad-hoc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Key Assumptions (Overrides)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Revenue Growth (%)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={overrides.revenue?.growth ? (overrides.revenue.growth * 100).toFixed(2) : ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) / 100
                              setOverrides({
                                ...overrides,
                                revenue: { ...overrides.revenue, growth: value },
                              })
                            }}
                            placeholder="e.g., 12 for 12%"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Revenue Baseline Multiplier</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={overrides.revenue?.baseline || ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              setOverrides({
                                ...overrides,
                                revenue: { ...overrides.revenue, baseline: value },
                              })
                            }}
                            placeholder="e.g., 1.2 for 20% increase"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Churn Rate (%)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={overrides.revenue?.churn ? (overrides.revenue.churn * 100).toFixed(2) : ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) / 100
                              setOverrides({
                                ...overrides,
                                revenue: { ...overrides.revenue, churn: value },
                              })
                            }}
                            placeholder="e.g., 5 for 5%"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expense Growth (%)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={overrides.costs?.growth ? (overrides.costs.growth * 100).toFixed(2) : ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) / 100
                              setOverrides({
                                ...overrides,
                                costs: { ...overrides.costs, growth: value },
                              })
                            }}
                            placeholder="e.g., 10 for 10%"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payroll ($)</Label>
                          <Input 
                            type="number" 
                            value={overrides.costs?.payroll || ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              setOverrides({
                                ...overrides,
                                costs: { ...overrides.costs, payroll: value },
                              })
                            }}
                            placeholder="e.g., 500000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Marketing ($)</Label>
                          <Input 
                            type="number" 
                            value={overrides.costs?.marketing || ""}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              setOverrides({
                                ...overrides,
                                costs: { ...overrides.costs, marketing: value },
                              })
                            }}
                            placeholder="e.g., 100000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button onClick={handleRunScenario} disabled={!selectedModelId || !scenarioName.trim()} className="w-full sm:w-auto">
                        <Play className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Run Scenario</span>
                        <span className="sm:hidden">Run</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="bg-transparent w-full sm:w-auto"
                        onClick={() => {
                          // Duplicate current scenario
                          const template = scenarioTemplates.find(t => t.id === selectedScenario)
                          if (template) {
                            setScenarioName(`${template.name} (Copy)`)
                            setOverrides(template.defaultOverrides || {})
                          }
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Duplicate</span>
                        <span className="sm:hidden">Copy</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Snapshots tab */}
        <TabsContent value="snapshots" className="space-y-4 overflow-x-auto overflow-y-visible">
          <ScenarioSnapshotManager modelId={selectedModelId} orgId={orgId} />
        </TabsContent>

        {/* Comparison tab */}
        <TabsContent value="comparison" className="space-y-4 overflow-x-auto overflow-y-visible">
          <ScenarioComparisonView modelId={selectedModelId} orgId={orgId} scenarios={scenarios} />
        </TabsContent>

        {/* Version History tab */}
        <TabsContent value="history" className="space-y-4 overflow-x-auto overflow-y-visible">
          <ScenarioVersionHistory modelId={selectedModelId} orgId={orgId} />
        </TabsContent>

        {/* Data Transparency tab */}
        <TabsContent value="transparency" className="space-y-4 overflow-x-auto overflow-y-visible">
          <ScenarioDataTransparency modelId={selectedModelId} orgId={orgId} />
        </TabsContent>

        <TabsContent value="sensitivity" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Sensitivity Analysis</CardTitle>
              <CardDescription>How sensitive are your outcomes to key variables?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Sensitivity analysis will be available after running scenarios with Monte Carlo simulations.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Scenario Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Scenario</DialogTitle>
            <DialogDescription>
              Create a new scenario run with custom parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name *</Label>
              <Input
                id="scenario-name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Hiring 5 Engineers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-type">Scenario Type *</Label>
              <Select value={scenarioType} onValueChange={(v: any) => setScenarioType(v)}>
                <SelectTrigger id="scenario-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="optimistic">Optimistic</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="adhoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Current Overrides:</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(overrides, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateScenario} 
              disabled={!scenarioName.trim() || isCreating || !selectedModelId}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Create & Run
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
