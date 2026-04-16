"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  Circle,
  BookOpen,
  Users,
  Zap,
  Target,
  Settings,
  ArrowRight,
  Video,
  FileText,
  MessageSquare,
  Database,
  Shield,
  Brain,
  BarChart3,
  ExternalLink,
  Briefcase,
} from "lucide-react"

const onboardingSteps = [
  {
    id: 1,
    title: "Configure Organizational Profile",
    description: "Establish your company's fiscal calendar, base currency, and accounting standards.",
    completed: true,
    category: "Foundation",
  },
  {
    id: 2,
    title: "Integrate Core Financial Data",
    description: "Connect your ERP or accounting system (NetSuite, QuickBooks, Xero) for automated data ingestion.",
    completed: true,
    category: "Integration",
  },
  {
    id: 3,
    title: "Establish Roles & Permissions",
    description: "Configure Role-Based Access Control (RBAC) to assign Viewer, Analyst, Controller, or Admin roles.",
    completed: false,
    category: "Security",
  },
  {
    id: 4,
    title: "Initialize First Financial Model",
    description: "Select your revenue model type and forecast horizon to generate your first driver-based P&L.",
    completed: false,
    category: "Analytics",
  },
  {
    id: 5,
    title: "Configure Threshold Alerts",
    description: "Set monitors for cash runway, burn rate deviation, and revenue variance to detect anomalies.",
    completed: false,
    category: "Compliance",
  },
]

const quickActions = [
  {
    title: "Connect Accounting Software",
    description: "Link your ERP for automatic, encrypted data synchronization.",
    icon: Database,
    action: "Connect",
    category: "Integration",
  },
  {
    title: "Create Financial Model",
    description: "Build a driver-based 12–60 month financial forecast with AI benchmarks.",
    icon: BarChart3,
    action: "Create",
    category: "Modeling",
  },
  {
    title: "Invite Team Members",
    description: "Add stakeholders with role-based permissions (Viewer, Analyst, Controller, Admin).",
    icon: Users,
    action: "Invite",
    category: "Security",
  },
  {
    title: "Set Up Alert Monitors",
    description: "Configure threshold alerts for runway < 6 months, burn > 15% variance, and revenue gaps.",
    icon: Zap,
    action: "Configure",
    category: "Alerts",
  },
]

const resources = [
  {
    title: "Platform Overview",
    description: "Architecture, principles, and full capability breakdown of FinaPilot.",
    type: "documentation",
    duration: "10 min read",
    icon: BookOpen,
    docsSection: "overview",
  },
  {
    title: "AI Forecasting & Monte Carlo",
    description: "How FinaPilot runs 5,000+ simulations for probabilistic financial forecasting.",
    type: "documentation",
    duration: "8 min read",
    icon: Brain,
    docsSection: "forecasting",
  },
  {
    title: "Data Integrations Guide",
    description: "Step-by-step guide for connecting NetSuite, Xero, QuickBooks, and other ERPs.",
    type: "tutorial",
    duration: "5 min read",
    icon: Settings,
    docsSection: "connectors",
  },
  {
    title: "Board Reporting",
    description: "Generate audit-ready board decks with AI-synthesized executive summaries.",
    type: "guide",
    duration: "6 min read",
    icon: Briefcase,
    docsSection: "reporting",
  },
  {
    title: "Security & Compliance",
    description: "SOC 2 Type II certification, MFA enforcement, and data encryption details.",
    type: "documentation",
    duration: "4 min read",
    icon: Shield,
    docsSection: "compliance",
  },
  {
    title: "REST API Reference",
    description: "Endpoints, authentication, webhooks, and rate limits for developers.",
    type: "reference",
    duration: "12 min read",
    icon: FileText,
    docsSection: "api",
  },
]

export function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState(2)
  const [orgProfile, setOrgProfile] = useState({
    structure: "",
    erp: "",
    region: "",
    strictCompliance: false
  })

  const totalSteps = onboardingSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null

  useEffect(() => {
    fetchOnboardingStatus()
  }, [])

  const fetchOnboardingStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/status`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (res.ok) {
        const result = await res.json()
        if (result.ok && result.data) {
          setCompletedSteps(result.data.completedSteps?.length || 0)
          if (result.data.stepData?.orgProfile) {
            setOrgProfile(result.data.stepData.orgProfile)
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch onboarding status:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateOnboardingStep = async (stepId: number, data: any, moveTo?: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/step`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          stepId,
          stepData: data,
          moveToStep: moveTo
        }),
      })

      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          setCompletedSteps(result.data.completedSteps?.length || completedSteps)
          return true
        }
      }
      return false
    } catch (err) {
      console.error("Failed to update onboarding step:", err)
      return false
    }
  }

  const categoryToView: Record<string, string> = {
    "Foundation": "settings",
    "Integration": "integrations",
    "Security": "users",
    "Analytics": "modeling",
    "Compliance": "compliance",
    "Modeling": "modeling",
    "Alerts": "settings",
  };

  const handleStepComplete = (stepId: number, category: string) => {
    setCompletedSteps((prev) => Math.max(prev, stepId))
    const view = categoryToView[category]
    if (view) {
      window.location.hash = view
    } else {
      toast.success("Navigating to module...")
    }
  }

  const navigateTo = (view: string) => {
    window.location.hash = view
  }

  const navigateToDocs = (section?: string) => {
    // Navigate to the docs view within the dashboard
    window.location.hash = "docs"
    // Dispatch a custom event so the docs component can navigate to the specific section
    if (section) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("docs-navigate", { detail: { section } }))
      }, 300)
    }
  }

  const handleSupportEmail = () => {
    window.location.href = "mailto:support@finapilot.com?subject=Enterprise%20Setup%20Assistance"
  }

  const handleQuickSetupSave = async () => {
    toast.info("Encrypting and saving profile...")
    const success = await updateOnboardingStep(1, { orgProfile }, 2)
    if (success) {
      toast.success("Organization profile saved and encrypted successfully!")
      fetchOnboardingStatus()
    } else {
      toast.error("Failed to save profile. Please check your connection.")
    }
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome to FinaPilot</h1>
          <p className="text-muted-foreground">Complete these steps to configure your AI-powered financial operating system.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent" onClick={handleSupportEmail}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Get Help
          </Button>
          <Button size="sm" onClick={() => navigateToDocs("overview")}>
            <BookOpen className="mr-2 h-4 w-4" />
            View Documentation
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Setup Progress
          </CardTitle>
          <CardDescription>Complete these steps to get the most out of FinaPilot. Estimated total time: 10–15 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Configuration Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedSteps}/{totalSteps} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-white rounded-xl border-2 border-green-50">
                <div className="text-xl sm:text-2xl font-black text-green-600 leading-none">{completedSteps}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mt-1">Completed</div>
              </div>
              <div className="p-3 bg-white rounded-xl border-2 border-blue-50">
                <div className="text-xl sm:text-2xl font-black text-blue-600 leading-none">{totalSteps - completedSteps}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mt-1">Remaining</div>
              </div>
              <div className="p-3 bg-white rounded-xl border-2 border-purple-50">
                <div className="text-xl sm:text-2xl font-black text-purple-600 leading-none">{Math.max(1, (totalSteps - completedSteps) * 2)}m</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mt-1">Est. Left</div>
              </div>
              <div className="p-3 bg-white rounded-xl border-2 border-orange-50">
                <div className="text-xl sm:text-2xl font-black text-orange-600 leading-none">{Math.round(progressPercentage)}%</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mt-1">Complete</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Checklist</CardTitle>
              <CardDescription>Follow these steps in order for the fastest time-to-value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                      step.completed ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${step.completed ? "text-green-800" : ""}`}>{step.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {step.category}
                        </Badge>
                      </div>
                      <p className={`text-sm ${step.completed ? "text-green-700" : "text-muted-foreground"}`}>
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {!step.completed && (
                        <Button
                          size="sm"
                          onClick={() => handleStepComplete(step.id, step.category)}
                          className="bg-transparent"
                          variant="outline"
                        >
                          Start
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump directly to the most critical configuration tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <action.icon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{action.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => navigateTo(categoryToView[action.category] || 'overview')}>
                          {action.action}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources & Help */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Documentation Hub
              </CardTitle>
              <CardDescription>Explore the full platform documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resources.map((resource, index) => (
                  <div 
                    key={index} 
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group" 
                    onClick={() => navigateToDocs(resource.docsSection)}
                  >
                    <div className="flex items-start gap-3">
                      <resource.icon className="h-4 w-4 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">{resource.title}</h4>
                          <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{resource.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise Support</CardTitle>
              <CardDescription>Direct access to your dedicated success team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleSupportEmail}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Priority Support Channel
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => navigateToDocs("api")}>
                <FileText className="mr-2 h-4 w-4" />
                Developer API Reference
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => window.open('mailto:success@finapilot.com?subject=Implementation%20Call%20Request', '_blank')}>
                <Video className="mr-2 h-4 w-4" />
                Book Implementation Call
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>Configure your data ingestion settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-stage">Corporate Structure</Label>
                <Select value={orgProfile.structure} onValueChange={(v) => setOrgProfile(p => ({...p, structure: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llc">LLC / Partnership</SelectItem>
                    <SelectItem value="c-corp">C-Corporation</SelectItem>
                    <SelectItem value="enterprise">Enterprise Public</SelectItem>
                    <SelectItem value="non-profit">Non-Profit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accounting-system">Primary ERP / Ledger</Label>
                <Select value={orgProfile.erp} onValueChange={(v) => setOrgProfile(p => ({...p, erp: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="netsuite">Oracle NetSuite</SelectItem>
                    <SelectItem value="quickbooks">QuickBooks Online</SelectItem>
                    <SelectItem value="xero">Xero</SelectItem>
                    <SelectItem value="sage">Sage Intacct</SelectItem>
                    <SelectItem value="custom">Custom API / CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compliance">Data Residency Region</Label>
                <Select value={orgProfile.region} onValueChange={(v) => setOrgProfile(p => ({...p, region: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east">US East (N. Virginia)</SelectItem>
                    <SelectItem value="eu-west">EU West (Ireland)</SelectItem>
                    <SelectItem value="ap-south">Asia Pacific (Mumbai)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="soc2" checked={orgProfile.strictCompliance} onCheckedChange={(v) => setOrgProfile(p => ({...p, strictCompliance: !!v}))} />
                <Label htmlFor="soc2" className="text-sm">
                  Enable strict SOC 2 compliance auditing
                </Label>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleQuickSetupSave}>Save & Continue</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
