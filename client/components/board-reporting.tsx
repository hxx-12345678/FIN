"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  ShieldCheck,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExportProgressModal } from "./exports/export-progress-modal"
import { ReportApprovalManager } from "./reports/report-approval-manager"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"

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
  const { currencySymbol, formatCurrency, boardReportAiContent, setBoardReportAiContent } = useOrg()
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
  const [loadingAiContent, setLoadingAiContent] = useState(false)
  const aiContentFetchedRef = useRef(!!boardReportAiContent) // Track if AI content has ever been fetched
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
      // NOTE: fetchAIContent() is NOT called here anymore.
      // AI content generation is expensive and should only happen on user request.
      fetchBoardSchedules()
    }
  }, [orgId])

  // Update content when template changes
  useEffect(() => {
    if (orgId && selectedTemplate && kpiMetrics.length > 0) {
      // Update report title based on template
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        setReportTitle(template.name)
      }

      // Update selected metrics based on template type
      if (selectedTemplate === "financial-review") {
        // Financial review should include all financial metrics
        setSelectedMetrics(kpiMetrics.filter((m: any) =>
          m.name.includes("Revenue") ||
          m.name.includes("Cash") ||
          m.name.includes("Burn") ||
          m.name.includes("Runway") ||
          m.name.includes("Margin")
        ).map((m: any) => m.name))
      } else if (selectedTemplate === "executive-summary") {
        // Executive summary should include top 4 metrics
        setSelectedMetrics(kpiMetrics.slice(0, 4).map((m: any) => m.name))
      } else if (selectedTemplate === "investor-update") {
        // Investor update should include growth and financial metrics
        setSelectedMetrics(kpiMetrics.filter((m: any) =>
          m.name.includes("Revenue") ||
          m.name.includes("Growth") ||
          m.name.includes("Customers") ||
          m.name.includes("ARR")
        ).map((m: any) => m.name))
      }

      // We only want to regenerate AI content when user manually changes template or first load
      // fetchAIContent()  <-- removed to avoid infinite loops when kpiMetrics updates
    }
  }, [selectedTemplate, orgId, templates, kpiMetrics])

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
              month: metric.month || metric.date || "Unknown",
              revenue: Number(metric.revenue || metric.mrr || metric.revenue || 0),
              customers: Number(metric.customers || metric.activeCustomers || 0),
              burn: Number(metric.burn || metric.burnRate || 0),
            })).filter((item: any) => item.month !== "Unknown" || item.revenue > 0 || item.customers > 0)
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
    aiContentFetchedRef.current = true // Mark as fetched (even on failure)

    setLoadingAiContent(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie.split("; ").find((row) => row.startsWith("auth-token="))?.split("=")[1]
      if (!token) {
        setLoadingAiContent(false)
        return
      }

      // Build context with template-specific information
      const template = templates.find(t => t.id === selectedTemplate)
      const templateName = template?.name || selectedTemplate

      const contextData: any = {
        reportingPeriod,
        selectedMetrics: selectedMetrics.length > 0 ? selectedMetrics : kpiMetrics.slice(0, 4).map((m: any) => m.name),
        template: templateName,
        reportTitle,
        includeSections: activeSections,
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          goal: `Generate board report content for ${templateName}. Create an executive summary, key highlights, and areas of focus based on the selected metrics and reporting period.`,
          context: contextData,
        }),
        // Add timeout signal to prevent hanging requests
        signal: AbortSignal.timeout(55000), // 55 second timeout (less than server's 60s)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && (result.plan || result.id)) {
          // Handle different response formats
          const planRecord = result.plan || result;
          const planData = planRecord.planJson || planRecord;
          const naturalLanguage = planData?.structuredResponse?.natural_text || planData?.naturalLanguage || planData?.natural_text || planData?.summary || "";
          const insights = planData?.insights || planData?.stagedChanges || [];
          const recommendations = planData?.recommendations || planData?.stagedChanges || [];
          const dataSources = planData?.metadata?.dataSources || planData?.dataSources || [];

          // Extract executive summary from natural language or first insight
          let executiveSummary = naturalLanguage;
          if (!executiveSummary && insights.length > 0) {
            executiveSummary = insights[0]?.summary || insights[0]?.explain || insights[0]?.description || "";
          }
          if (!executiveSummary) {
            executiveSummary = "Based on the current financial data and selected metrics, this report provides a comprehensive overview of the organization's performance.";
          }

          // Extract key highlights from recommendations
          const highlights = recommendations.slice(0, 4).map((r: any) => {
            if (typeof r === 'string') return r;
            return r.title || r.summary || r.explain || r.description || JSON.stringify(r);
          }).filter((h: any) => h && h.length > 0);

          // Extract areas of focus from insights or recommendations
          let areasOfFocus = insights.find((i: any) => i.type === "risk" || i.category === "risk")?.summary ||
            insights.find((i: any) => i.type === "focus" || i.category === "focus")?.summary ||
            recommendations.find((r: any) => r.type === "action" || r.priority === "high")?.summary ||
            "Continue monitoring key financial metrics and maintain focus on revenue growth and cost optimization.";

          setBoardReportAiContent({
            executiveSummary,
            keyHighlights: highlights.length > 0 ? highlights : ["Revenue performance", "Cost management", "Cash flow", "Growth metrics"],
            areasOfFocus,
            dataSources: dataSources.length > 0 ? dataSources : [
              { type: 'grounding', id: 'financial_metrics', snippet: 'Latest financial metrics' },
              { type: 'integration', id: 'accounting', snippet: 'Standard accounting records' }
            ],
            metadata: planData.metadata
          })

          toast.success("AI content generated successfully!", {
            description: "Review and edit the content as needed before generating your report",
            duration: 5000,
          })
        } else {
          console.error("Malformed AI Response:", result);
          throw new Error("Invalid response from AI service: plan data missing");
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error?.message || errorData.message || `Failed to generate AI content: ${response.statusText}`;

        // Handle specific error codes
        if (response.status === 504 || errorData.error?.code === 'TIMEOUT') {
          throw new Error('AI generation is taking longer than expected. Please try again with a simpler request.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to generate AI content. Please contact an admin.');
        } else if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        }

        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Failed to fetch AI content:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI content. Please try again.";

      // Check if it's a timeout/abort error
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
        setBoardReportAiContent({
          executiveSummary: "AI generation timed out. The request is too complex or the server is busy. Please try again with a simpler request.",
          keyHighlights: [],
          areasOfFocus: "Request timed out",
        });
        toast.warning("AI generation timed out. Please try again.");
      } else {
        // Don't set error content, keep previous content if available
        toast.error(errorMessage);
      }
    } finally {
      setLoadingAiContent(false);
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
            toast.success("Report generation started!", {
              description: "You can track progress in Reports & Analytics → Custom Reports tab or Export Queue",
              duration: 5000,
            })
            setTimeout(fetchRecentReports, 2000)

            // Poll for completion and show success toast
            const pollForCompletion = async () => {
              try {
                const statusResponse = await fetch(`${API_BASE_URL}/exports/${exportId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                })

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json()
                  const exportData = statusData.export || statusData
                  const status = exportData.status || statusData.status

                  if (status === "completed" || status === "done") {
                    toast.success("Report generated successfully!", {
                      description: "You can download it from Reports & Analytics → Custom Reports tab or Export Queue",
                      duration: 7000,
                    })
                    setIsGenerating(false)
                    setShowExportModal(false)
                    fetchRecentReports()
                    return
                  } else if (status === "failed") {
                    toast.error("Report generation failed. Please try again.")
                    setIsGenerating(false)
                    setShowExportModal(false)
                    return
                  }
                }

                // Continue polling if not completed
                setTimeout(pollForCompletion, 3000)
              } catch (error) {
                console.error("Error polling report status:", error)
                // Continue polling on error
                setTimeout(pollForCompletion, 5000)
              }
            }

            // Start polling after 3 seconds
            setTimeout(pollForCompletion, 3000)
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

  // Update sections based on template selection
  useEffect(() => {
    if (selectedTemplate === "executive-summary") {
      // Executive summary should include only key sections
      setIncludeSections({
        "Executive Summary": true,
        "Financial Performance": true,
        "Key Metrics": true,
        "Forward Outlook": true,
        "Growth Analysis": false,
        "Operational Updates": false,
        "Risk Assessment": false,
      })
    } else if (selectedTemplate === "financial-review") {
      // Financial review should include all financial sections
      setIncludeSections({
        "Executive Summary": true,
        "Financial Performance": true,
        "Key Metrics": true,
        "Growth Analysis": true,
        "Operational Updates": true,
        "Risk Assessment": true,
        "Forward Outlook": true,
      })
    } else if (selectedTemplate === "investor-update") {
      // Investor update should focus on growth and metrics
      setIncludeSections({
        "Executive Summary": true,
        "Financial Performance": true,
        "Key Metrics": true,
        "Growth Analysis": true,
        "Operational Updates": false,
        "Risk Assessment": false,
        "Forward Outlook": true,
      })
    } else {
      // Board deck includes all sections by default
      setIncludeSections(
        DEFAULT_SECTIONS.reduce((acc, section) => ({ ...acc, [section]: true }), {} as Record<string, boolean>)
      )
    }
  }, [selectedTemplate])

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Board Reporting</h1>
          <p className="text-sm md:text-base text-muted-foreground">Generate scheduled board packs, investor updates, and stakeholder reports.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setScheduleDialogOpen(true)} className="w-full sm:w-auto">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Schedule Report</span>
            <span className="sm:hidden">Schedule</span>
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">Generating</span>
              </>
            ) : (
              <>
                <Presentation className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Generate</span>
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
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-[500px]">
            <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs sm:text-sm">Metrics</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs sm:text-sm">Distribution</TabsTrigger>
            <TabsTrigger value="approval" className="text-xs sm:text-sm">Approval</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="content" className="space-y-4 overflow-x-auto overflow-y-visible">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                ) : boardReportAiContent ? (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-blue-800">Executive Summary</h3>
                        <Button size="sm" variant="outline" onClick={fetchAIContent} disabled={loadingAiContent}>
                          {loadingAiContent ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Edit className="mr-1 h-3 w-3" />}
                          Regenerate Content
                        </Button>
                      </div>
                      <p className="text-sm text-blue-700 mt-2 whitespace-pre-wrap">
                        {boardReportAiContent.executiveSummary || boardReportAiContent.summary || "No summary available."}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h3 className="font-medium text-green-800 mb-2">Key Highlights</h3>
                      {boardReportAiContent.keyHighlights?.length ? (
                        <ul className="text-sm text-green-700 space-y-1">
                          {boardReportAiContent.keyHighlights.map((highlight: any, index: number) => (
                            <li key={index}>• {highlight.title || highlight.summary || highlight.explain || highlight || "Highlight"}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-700">No highlights available.</p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <h3 className="font-medium text-yellow-800 mb-2">Areas of Focus</h3>
                      <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                        {boardReportAiContent.areasOfFocus || boardReportAiContent.risks || "No risk areas highlighted."}
                      </p>
                    </div>

                    {boardReportAiContent.dataSources && boardReportAiContent.dataSources.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          Data Provenance & Trust
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {boardReportAiContent.dataSources.map((source: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[10px] font-normal py-0 px-2 bg-slate-50 border-slate-200">
                              {source.type === 'integration' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />}
                              {source.type === 'grounding' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />}
                              {source.type === 'audit' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />}
                              {source.id || source.type}: {source.snippet?.length > 25 ? source.snippet.substring(0, 25) + '...' : source.snippet || 'Analyzed'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium mb-1">AI Content Not Generated Yet</p>
                    <p className="text-sm mb-4">Click the button below to generate an executive summary, key highlights, and risk areas powered by AI.</p>
                    <Button size="sm" variant="default" onClick={fetchAIContent} disabled={loadingAiContent}>
                      {loadingAiContent ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                      Generate AI Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 overflow-x-auto overflow-y-visible">
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
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMetrics.includes(metric.name) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
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
                      <h3 className="font-medium text-sm mb-1">{metric.name || "Unknown Metric"}</h3>
                      <div className="text-lg font-bold">{metric.value || "N/A"}</div>
                      <div className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {metric.change || "N/A"}
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

        <TabsContent value="preview" className="space-y-4 overflow-x-auto overflow-y-visible">
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
                            <div className="text-2xl font-bold text-blue-600">{metric.value || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{metric.name || "Unknown Metric"}</div>
                            <div className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                              {metric.change || "N/A"}
                            </div>
                          </div>
                        ) : (
                          <div key={metricName} className="text-center">
                            <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                            <div className="text-sm text-muted-foreground">{metricName}</div>
                            <div className="text-xs text-muted-foreground">No data</div>
                          </div>
                        )
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
                    <ResponsiveContainer width="100%" height={200} className="min-h-[200px] sm:min-h-[250px]">
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
                    <ResponsiveContainer width="100%" height={200} className="min-h-[200px] sm:min-h-[250px]">
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

        <TabsContent value="distribution" className="space-y-4 overflow-x-auto overflow-y-visible">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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

        <TabsContent value="approval" className="space-y-4">
          {orgId && <ReportApprovalManager orgId={orgId} />}
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
