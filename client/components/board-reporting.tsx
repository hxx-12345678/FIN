"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Download,
  FileText,
  Presentation,
  Calendar,
  Share,
  Edit,
  Zap,
  TrendingUp,
  Loader2,
  Copy,
  Trash2,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExportProgressModal } from "./exports/export-progress-modal"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface BoardTemplate {
  id: string
  name: string
  description: string
  type: string
  slides: number
  status: string
}

interface BoardReportSchedule {
  id: string
  name: string
  template: string
  format: string
  frequency: string
  scheduleType: string
  timezone: string
  status: string
  nextRunAt: string | null
  recipients?: string | null
}

const DEFAULT_SECTIONS = [
  "Executive Summary",
  "Financial Performance",
  "Key Metrics",
  "Growth Analysis",
  "Operational Updates",
  "Risk Assessment",
  "Forward Outlook",
]

const FALLBACK_TEMPLATES: BoardTemplate[] = [
  {
    id: "board-deck",
    name: "Monthly Board Deck",
    description: "Comprehensive board presentation with key metrics and insights",
    type: "presentation",
    slides: 12,
    status: "ready",
  },
  {
    id: "investor-update",
    name: "Investor Update",
    description: "Monthly investor communication with progress updates",
    type: "email",
    slides: 8,
    status: "ready",
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level overview for leadership team",
    type: "document",
    slides: 4,
    status: "ready",
  },
  {
    id: "financial-review",
    name: "Financial Review",
    description: "Detailed financial analysis and variance reporting",
    type: "document",
    slides: 16,
    status: "ready",
  },
]

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

export function BoardReporting() {
  const [selectedTemplate, setSelectedTemplate] = useState("board-deck")
  const [templates, setTemplates] = useState<BoardTemplate[]>(FALLBACK_TEMPLATES)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [aiContent, setAiContent] = useState<any>(null)
  const [loadingAiContent, setLoadingAiContent] = useState(false)
  const [reportTitle, setReportTitle] = useState("Monthly Board Update")
  const [reportingPeriod, setReportingPeriod] = useState("current")
  const [reportFormat, setReportFormat] = useState("pptx")
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [distributionMethod, setDistributionMethod] = useState("email")
  const [recipients, setRecipients] = useState("board@company.com")
  const [emailSubject, setEmailSubject] = useState("Monthly Board Update")
  const [passwordProtect, setPasswordProtect] = useState(false)
  const [trackEngagement, setTrackEngagement] = useState(true)
  const [boardSchedules, setBoardSchedules] = useState<BoardReportSchedule[]>([])
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleName, setScheduleName] = useState("Monthly Board Update")
  const [scheduleMode, setScheduleMode] = useState<"single" | "recurring">("recurring")
  const [scheduleFrequency, setScheduleFrequency] = useState("monthly")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [scheduleTimezone, setScheduleTimezone] = useState("UTC")
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [includeSections, setIncludeSections] = useState<Record<string, boolean>>(
    DEFAULT_SECTIONS.reduce((acc, section) => ({ ...acc, [section]: true }), {} as Record<string, boolean>)
  )

  useEffect(() => {
    fetchOrgId()
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchBoardTemplates()
      fetchInvestorDashboardData()
      fetchRecentReports()
      fetchAIContent()
      fetchBoardSchedules()
    }
  }, [orgId])

  useEffect(() => {
    setEmailSubject(`${reportTitle} - ${formatMonthLabel(new Date())}`)
  }, [reportTitle])

  const fetchOrgId = async () => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.orgs?.length) {
          const primaryOrgId = userData.orgs[0].id
          localStorage.setItem("orgId", primaryOrgId)
          setOrgId(primaryOrgId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }
  }

  const fetchBoardTemplates = async () => {
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token || !orgId) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/templates`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.templates) {
          setTemplates(result.templates)
          if (!result.templates.find((t: BoardTemplate) => t.id === selectedTemplate)) {
            setSelectedTemplate(result.templates[0]?.id ?? "board-deck")
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates", error)
    }
  }

  const fetchInvestorDashboardData = async () => {
    if (!orgId) return

    setLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) {
        setLoading(false)
        return
      }

      let response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        })
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.metrics) {
          setKpiMetrics(result.metrics)
          setSelectedMetrics((prev) => (prev.length ? prev : result.metrics.slice(0, 4).map((m: any) => m.name)))
        } else if (result.ok && result.data) {
          const data = result.data
          const summary = data.executiveSummary || {}
          const unitEcon = data.unitEconomics || {}
          const kpis = [
            { name: "Monthly Recurring Revenue", value: `$${((summary.arr || 0) / 12).toLocaleString()}`, change: `+${summary.arrGrowth || 0}%`, trend: summary.arrGrowth > 0 ? "up" : "down" },
            { name: "Annual Recurring Revenue", value: `$${(summary.arr || 0).toLocaleString()}`, change: `+${summary.arrGrowth || 0}%`, trend: summary.arrGrowth > 0 ? "up" : "down" },
            { name: "Active Customers", value: (summary.activeCustomers || 0).toLocaleString(), change: `+${summary.customerGrowth || 0}%`, trend: summary.customerGrowth > 0 ? "up" : "down" },
            { name: "Monthly Churn Rate", value: `${summary.monthlyChurn || 2.3}%`, change: `-${summary.churnChange || 0.6}%`, trend: "down" },
            { name: "Customer Acquisition Cost", value: `$${unitEcon.cac || 125}`, change: "+8.7%", trend: "up" },
            { name: "Customer Lifetime Value", value: `$${unitEcon.ltv || 2400}`, change: "+5.2%", trend: "up" },
            { name: "Gross Margin", value: `${summary.grossMargin || 78}%`, change: "+2.1%", trend: "up" },
            { name: "Cash Runway", value: `${Math.round(summary.monthsRunway || 0)} months`, change: `${summary.runwayChange || 0} month`, trend: (summary.runwayChange || 0) > 0 ? "up" : "down" },
          ]
          setKpiMetrics(kpis)
          setSelectedMetrics((prev) => (prev.length ? prev : kpis.slice(0, 4).map((m) => m.name)))
        }

        const chartResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        })

        if (chartResponse.ok) {
          const chartResult = await chartResponse.json()
          if (chartResult.ok && chartResult.data?.monthlyMetrics) {
            const processedChartData = chartResult.data.monthlyMetrics.slice(-6).map((metric: any) => ({
              month: metric.month || "Unknown",
              revenue: metric.revenue || 0,
              customers: metric.customers || 0,
              burn: metric.burn || 0,
            }))
            setChartData(processedChartData)
            setAvailablePeriods(processedChartData.map((item: any) => item.month))
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch board reporting data:", error)
      toast.error("Failed to load board reporting data")
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentReports = async () => {
    if (!orgId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/exports?type=pptx,pdf&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.exports) {
          const reports = result.exports
            .filter((exp: any) => exp.metaJson?.reportType === "board-report")
            .map((exp: any) => ({
              name: exp.metaJson?.reportTitle || `Board Report - ${exp.type.toUpperCase()}`,
              date: exp.createdAt ? new Date(exp.createdAt).toISOString().split("T")[0] : "Unknown",
              status: exp.status,
              exportId: exp.id,
              exportType: exp.type,
              meta: exp.metaJson,
            }))
          setRecentReports(reports)
        }
      }
    } catch (error) {
      console.error("Failed to fetch recent reports:", error)
    }
  }

  const fetchBoardSchedules = async () => {
    if (!orgId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.schedules) {
          setBoardSchedules(result.schedules)
        }
      }
    } catch (error) {
      console.error("Failed to fetch schedules", error)
    }
  }

  const fetchAIContent = async () => {
    if (!orgId) return

    setLoadingAiContent(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) {
        setLoadingAiContent(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          goal: `Generate ${selectedTemplate} content for ${reportTitle}`,
          context: {
            reportingPeriod,
            selectedMetrics,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.plan) {
          setAiContent({
            executiveSummary: result.plan.insights?.[0]?.summary || "No summary available",
            keyHighlights: result.plan.recommendations?.slice(0, 4) || [],
            areasOfFocus: result.plan.insights?.find((i: any) => i.type === "risk")?.summary || "No focus areas identified",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI content:", error)
    } finally {
      setLoadingAiContent(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!orgId) {
      toast.error("Organization ID not found")
      return
    }

    setIsGenerating(true)
    setShowExportModal(true)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) {
        toast.error("Authentication required")
        setIsGenerating(false)
        setShowExportModal(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          template: selectedTemplate,
          format: reportFormat,
          includeBudget: includeSections["Financial Performance"],
          includeMonteCarlo: includeSections["Risk Assessment"],
          includeRecommendations: includeSections["Forward Outlook"],
          selectedMetrics,
          reportTitle,
          reportingPeriod,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.export) {
          const exportId = result.export.id || result.export.exportId
          if (exportId) {
            setExportJobId(exportId)
            toast.success("Report generation started.")
            setTimeout(fetchRecentReports, 2000)
          } else {
            toast.error("Failed to get export ID")
            setIsGenerating(false)
            setShowExportModal(false)
          }
        } else {
          toast.error("Failed to generate report")
          setIsGenerating(false)
          setShowExportModal(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error?.message || "Failed to generate report")
        setIsGenerating(false)
        setShowExportModal(false)
      }
    } catch (error) {
      console.error("Failed to generate report:", error)
      toast.error("Failed to generate report. Please try again.")
      setIsGenerating(false)
      setShowExportModal(false)
    }
  }

  const handleScheduleCreate = async () => {
    if (!orgId) return
    setSavingSchedule(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: scheduleName,
          template: selectedTemplate,
          format: reportFormat,
          frequency: scheduleFrequency,
          scheduleType: scheduleMode === "recurring" ? "recurring" : "single",
          startDate: scheduleDate,
          startTime: scheduleTime,
          timezone: scheduleTimezone,
          distributionMethod,
          recipients,
          reportTitle,
          reportingPeriod,
          selectedMetrics,
          includeSections,
        }),
      })

      if (response.ok) {
        toast.success("Schedule saved")
        setScheduleDialogOpen(false)
        fetchBoardSchedules()
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error?.message || "Failed to create schedule")
      }
    } catch (error) {
      console.error("Failed to save schedule", error)
      toast.error("Failed to create schedule")
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleScheduleDelete = async (scheduleId: string) => {
    if (!orgId) return
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Schedule cancelled")
        fetchBoardSchedules()
      } else {
        toast.error("Failed to cancel schedule")
      }
    } catch (error) {
      console.error("Failed to cancel schedule", error)
    }
  }

  const handleShareReport = async (exportId: string) => {
    if (!orgId) return
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/shareable-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          navigator.clipboard.writeText(result.shareableLink.shareUrl)
          toast.success("Share link copied to clipboard")
        }
      } else {
        toast.error("Failed to create share link")
      }
    } catch (error) {
      console.error("Share link error", error)
    }
  }

  const handleDownloadReport = async (exportId: string, exportType: string) => {
    if (!orgId) return
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `board-report-${exportId.substring(0, 8)}.${exportType}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Report downloaded")
      } else {
        toast.error("Failed to download report")
      }
    } catch (error) {
      console.error("Download error", error)
      toast.error("Failed to download report")
    }
  }

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]))
  }

  const activeSections = useMemo(() => Object.entries(includeSections).filter(([, value]) => value).map(([key]) => key), [includeSections])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Board Reporting</h1>
          <p className="text-muted-foreground">Generate scheduled board packs, investor updates, and stakeholder reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Presentation className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
          <CardDescription>Pick the structure that best matches your audience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate === template.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <Badge variant={template.status === "ready" ? "default" : "secondary"}>{template.status}</Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.slides} slides</span>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Title, period, format and sections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-title">Report Title</Label>
                  <Input id="report-title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-period">Reporting Period</Label>
                  <Select value={reportingPeriod} onValueChange={setReportingPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="quarter">Current Quarter</SelectItem>
                      {availablePeriods.map((period) => (
                        <SelectItem key={period} value={period.toLowerCase()}>{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-format">Output Format</Label>
                  <Select value={reportFormat} onValueChange={setReportFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pptx">PowerPoint (.pptx)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="memo">Memo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Include Sections</Label>
                  <div className="space-y-2">
                    {DEFAULT_SECTIONS.map((section) => (
                      <div key={section} className="flex items-center space-x-2">
                        <Checkbox
                          id={section}
                          checked={includeSections[section]}
                          onCheckedChange={(checked) =>
                            setIncludeSections((prev) => ({ ...prev, [section]: !!checked }))
                          }
                        />
                        <Label htmlFor={section} className="text-sm">
                          {section}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Content Generation</CardTitle>
                <CardDescription>Let AI write a narrative for your board</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAiContent ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : aiContent ? (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-blue-800">Executive Summary</h3>
                        <Button size="sm" variant="ghost" onClick={fetchAIContent}>
                          <Edit className="mr-1 h-3 w-3" />
                          Regenerate
                        </Button>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">
                        {aiContent.executiveSummary || "No summary available."}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h3 className="font-medium text-green-800 mb-2">Key Highlights</h3>
                      {aiContent.keyHighlights?.length ? (
                        <ul className="text-sm text-green-700 space-y-1">
                          {aiContent.keyHighlights.map((highlight: any, index: number) => (
                            <li key={index}>• {highlight.title || highlight.summary || highlight}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-700">No highlights available.</p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <h3 className="font-medium text-yellow-800 mb-2">Areas of Focus</h3>
                      <p className="text-sm text-yellow-700">
                        {aiContent.areasOfFocus || "No risk areas highlighted."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No AI content yet.</p>
                    <Button size="sm" variant="outline" className="mt-4" onClick={fetchAIContent}>
                      <Zap className="mr-1 h-3 w-3" />
                      Generate AI Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Key Metrics</CardTitle>
              <CardDescription>Choose which metrics to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : kpiMetrics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {kpiMetrics.map((metric) => (
                    <div
                      key={metric.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedMetrics.includes(metric.name) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleMetricToggle(metric.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Checkbox checked={selectedMetrics.includes(metric.name)} />
                        {metric.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                        )}
                      </div>
                      <h3 className="font-medium text-sm mb-1">{metric.name}</h3>
                      <div className="text-lg font-bold">{metric.value}</div>
                      <div className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No metrics available. Create a financial model to see metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Preview your report before generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <h2 className="text-2xl font-bold mb-2">{reportTitle}</h2>
                  <p className="text-lg text-muted-foreground">{formatMonthLabel(new Date())}</p>
                  <p className="text-sm text-muted-foreground mt-4">Generated by FinaPilot</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-4">Key Performance Metrics</h3>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : selectedMetrics.length > 0 && kpiMetrics.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedMetrics.slice(0, 4).map((metricName) => {
                        const metric = kpiMetrics.find((m) => m.name === metricName)
                        return metric ? (
                          <div key={metricName} className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{metric.value}</div>
                            <div className="text-sm text-muted-foreground">{metric.name}</div>
                            <div className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                              {metric.change}
                            </div>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Select metrics to see preview</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
                  {loading ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <p>No revenue data available</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-4">Customer Growth</h3>
                  {loading ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="customers" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      <p>No customer data available</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribution Settings</CardTitle>
                <CardDescription>Configure how your report is shared</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Distribution Method</Label>
                  <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="link">Shareable Link</SelectItem>
                      <SelectItem value="download">Download Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Input id="recipients" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="board@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input id="subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="password-protect" checked={passwordProtect} onCheckedChange={(checked) => setPasswordProtect(!!checked)} />
                  <Label htmlFor="password-protect" className="text-sm">
                    Password protect report
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="track-views" checked={trackEngagement} onCheckedChange={(checked) => setTrackEngagement(!!checked)} />
                  <Label htmlFor="track-views" className="text-sm">
                    Track views and engagement
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Previously generated board reports</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentReports.length > 0 ? (
                  <div className="space-y-3">
                    {recentReports.map((report) => (
                      <div key={report.exportId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-muted-foreground">{report.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleShareReport(report.exportId)}>
                            <Share className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadReport(report.exportId, report.exportType)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent reports. Generate a report to see it here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Board Reports</CardTitle>
          <CardDescription>Automated distributions for investors and the board</CardDescription>
        </CardHeader>
        <CardContent>
          {boardSchedules.length ? (
            <div className="space-y-3">
              {boardSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{schedule.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Next run: {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "Pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.status === "active" ? "default" : "secondary"}>{schedule.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleScheduleDelete(schedule.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">No schedules yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Board Report</DialogTitle>
            <DialogDescription>Set up automated delivery for your board package.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input id="schedule-name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={scheduleMode} onValueChange={(value: "single" | "recurring") => setScheduleMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">One time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Start Date</Label>
                <Input id="schedule-date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input id="schedule-time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            </div>
            {scheduleMode === "recurring" && (
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={scheduleTimezone} onChange={(e) => setScheduleTimezone(e.target.value)} placeholder="UTC" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleCreate} disabled={savingSchedule}>
              {savingSchedule ? "Saving..." : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exportJobId && (
        <ExportProgressModal
          exportId={exportJobId}
          open={showExportModal}
          onClose={() => {
            setShowExportModal(false)
            setExportJobId(null)
          }}
          onDownload={(url) => {
            if (url) {
              window.open(url, "_blank")
            } else if (exportJobId) {
              handleDownloadReport(exportJobId, reportFormat)
            }
          }}
        />
      )}
    </div>
  )
}
