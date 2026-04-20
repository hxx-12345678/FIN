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
import { Textarea } from "@/components/ui/textarea"
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
  Mail,
  BarChart2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Info,
  DollarSign,
  CheckCircle2,
  Search,
  Lock as LucideLock,
  Eye,
  Plus,
  History as HistoryIcon,
  RefreshCw,
  Send,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"

const ExportProgressModal = dynamic(() => import("./exports/export-progress-modal").then(mod => mod.ExportProgressModal))
const ReportApprovalManager = dynamic(() => import("./reports/report-approval-manager").then(mod => mod.ReportApprovalManager))

import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"
import { useModel } from "@/lib/model-context"

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
    name: "Strategic Board Deck",
    description: "High-impact presentation for quarterly board meetings. Covers executive strategy, financial performance, and future outlook.",
    type: "pptx",
    slides: 12,
    status: "ready",
    audience: "Board of Directors, VCs",
  },
  {
    id: "quarterly-review",
    name: "Financial Quarterly Review",
    description: "Data-heavy financial deep-dive. Focuses on budget variance, unit economics, and detailed ledger-level analysis.",
    type: "pptx",
    slides: 18,
    status: "ready",
    audience: "CFO, Finance Committee",
  },
  {
    id: "audit-compliance",
    name: "Audit & Compliance Package",
    description: "Formal document for regulatory and audit requirements. Includes financial controls, cash management, and compliance status.",
    type: "pdf",
    slides: 10,
    status: "ready",
    audience: "Auditors, Compliance Officer",
  },
  {
    id: "investor-update",
    name: "Monthly Investor Update",
    description: "Concise narrative update for existing investors. Highlights growth, burn rate, and strategic milestones.",
    type: "memo",
    slides: 6,
    status: "ready",
    audience: "All Investors, LPs",
  },
] as any;

const formatCurrency = (value: number | string) => {
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

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
  const isGeneratingRef = useRef(false)
  const [loadingAiContent, setLoadingAiContent] = useState(false)
  const loadingAiContentRef = useRef(false)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const { orgId, setOrgId, selectedModelId } = useModel()
  const [loading, setLoading] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [recentReports, setRecentReports] = useState<any[]>([])
  const aiContentFetchedRef = useRef(!!boardReportAiContent) // Track if AI content has ever been fetched
  const [reportTitle, setReportTitle] = useState("Monthly Board Update")
  const [reportingPeriod, setReportingPeriod] = useState("current")
  const [reportFormat, setReportFormat] = useState("pptx")
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [distributionMethod, setDistributionMethod] = useState("email")
  const [recipients, setRecipients] = useState("")
  const [emailSubject, setEmailSubject] = useState("Monthly Board Update")
  const [passwordProtect, setPasswordProtect] = useState(false)
  const [password, setPassword] = useState("")
  const [trackEngagement, setTrackEngagement] = useState(true)
  const [distributionMessage, setDistributionMessage] = useState("Attached is the latest Board Report for your review.")
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
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null)



  useEffect(() => {
    if (orgId) {
      fetchBoardTemplates()
      fetchInvestorDashboardData()
      fetchRecentReports()
      fetchBoardSchedules()
    }
  }, [orgId, selectedModelId])

  // Update content when template changes
  useEffect(() => {
    if (orgId && selectedTemplate && kpiMetrics.length > 0) {
      // Update report title based on template
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        setReportTitle(template.name)
        // Auto-sync format
        if (template.type === 'pptx' || template.type === 'presentation') {
          setReportFormat('pptx');
        } else if (template.type === 'pdf') {
          setReportFormat('pdf');
        } else if (template.type === 'memo' || template.type === 'email') {
          setReportFormat('memo');
        }
      }

      // Update selected metrics based on template type
      if (selectedTemplate === "board-deck") {
        // Board deck: top-line KPIs that directors need
        setSelectedMetrics(kpiMetrics.slice(0, 6).map((m: any) => m.name))
      } else if (selectedTemplate === "quarterly-review") {
        // Quarterly review: all financial metrics for deep-dive
        setSelectedMetrics(kpiMetrics.map((m: any) => m.name))
      } else if (selectedTemplate === "audit-compliance") {
        // Audit: cash, runway, margin metrics for financial controls
        setSelectedMetrics(kpiMetrics.filter((m: any) =>
          m.name.includes("Cash") ||
          m.name.includes("Burn") ||
          m.name.includes("Runway") ||
          m.name.includes("Margin") ||
          m.name.includes("Rule")
        ).map((m: any) => m.name))
      } else if (selectedTemplate === "investor-update") {
        // Investor update: growth and unit economics
        setSelectedMetrics(kpiMetrics.filter((m: any) =>
          m.name.includes("Revenue") ||
          m.name.includes("ARR") ||
          m.name.includes("LTV") ||
          m.name.includes("Burn") ||
          m.name.includes("Customers") ||
          m.name.includes("Runway")
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
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
      if (!orgId) return

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/templates`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
      let response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/metrics?modelId=${selectedModelId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        setLoading(false)
        return
      }

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-dashboard?modelId=${selectedModelId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
      }

      if (response.status === 401) {
        handleUnauthorized()
        setLoading(false)
        return
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
          
          // Calculate SaaS-specific institutional metrics
          const burnRate = summary.monthlyBurnRate || summary.burn || 0;
          const monthlyRevenue = (summary.arr || summary.revenue || 0) / 12;
          const burnMultiple = monthlyRevenue > 0 ? (burnRate / monthlyRevenue).toFixed(2) : "Breakeven";
          const ruleOf40 = summary.arrGrowth !== undefined && summary.grossMargin !== undefined 
            ? (Number(summary.arrGrowth) + Number(summary.grossMargin - 60)).toFixed(1) + "%" 
            : "N/A";

          const kpis = [
            { 
              name: "Annual Recurring Revenue", 
              value: summary.arr ? formatCurrency(summary.arr) : "N/A", 
              change: summary.arrGrowth ? `+${summary.arrGrowth}%` : "N/A", 
              trend: summary.arrGrowth > 0 ? "up" : "down" 
            },
            { 
              name: "Burn Multiple", 
              value: burnMultiple, 
              change: "Efficiency metric", 
              trend: Number(burnMultiple) < 1.5 ? "up" : "down" 
            },
            { 
              name: "LTV:CAC Ratio", 
              value: unitEcon.ltvCacRatio ? `${unitEcon.ltvCacRatio.toFixed(1)}x` : "N/A", 
              change: "Unit Economics", 
              trend: unitEcon.ltvCacRatio > 3 ? "up" : "down" 
            },
            { 
              name: "Quick Ratio", 
              value: summary.arrGrowth && summary.monthlyChurn 
                ? ((summary.arrGrowth / summary.monthlyChurn).toFixed(1)) 
                : "N/A", 
              change: "Growth vs Churn", 
              trend: "up" 
            },
            { 
              name: "Rule of 40", 
              value: ruleOf40 !== "N/A" ? ruleOf40 : "N/A", 
              change: "Growth + Profit", 
              trend: parseFloat(ruleOf40) > 40 ? "up" : "down" 
            },
            { 
              name: "Gross Margin", 
              value: summary.grossMargin !== undefined ? `${summary.grossMargin}%` : "N/A", 
              change: "Profitability", 
              trend: "up" 
            },
            { 
              name: "Cash Runway", 
              value: summary.monthsRunway !== undefined ? `${Math.round(summary.monthsRunway)}mo` : "N/A", 
              change: summary.runwayChange ? `${summary.runwayChange > 0 ? '+' : ''}${summary.runwayChange}mo` : "N/A", 
              trend: (summary.runwayChange || 0) > 0 ? "up" : "down" 
            },
            { 
              name: "Active Customers", 
              value: summary.activeCustomers !== undefined ? (summary.activeCustomers || 0).toLocaleString() : "N/A", 
              change: summary.customerGrowth ? `+${summary.customerGrowth}%` : "N/A", 
              trend: summary.customerGrowth > 0 ? "up" : "down" 
            },
          ]
          setKpiMetrics(kpis)
          setSelectedMetrics((prev) => (prev.length ? prev : kpis.slice(0, 6).map((m) => m.name)))
        }

        const chartResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-dashboard?modelId=${selectedModelId}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (chartResponse.status === 401) {
          handleUnauthorized()
        }

        if (chartResponse.ok) {
          const chartResult = await chartResponse.json()
          if (chartResult.ok && chartResult.data?.monthlyMetrics) {
            const processedChartData = chartResult.data.monthlyMetrics.slice(-6).map((metric: any) => {
              const rev = Number(metric.revenue || metric.mrr || 0);
              const burnVal = Number(metric.burn || metric.burnRate || 0);
              const efficiency = rev > 0 ? Number((burnVal / (rev / 12)).toFixed(2)) : 0;
              
              return {
                month: metric.month || metric.date || "Unknown",
                revenue: rev,
                customers: Number(metric.customers || metric.activeCustomers || 0),
                burn: burnVal,
                efficiency: efficiency
              };
            }).filter((item: any) => item.month !== "Unknown");
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
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/exports?type=pptx,pdf&limit=10&modelId=${selectedModelId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.exports) {
          const reports = result.exports
            .filter((exp: any) => {
              const meta = exp.metaJson || exp.meta_json || {};
              return meta.reportType === "board-report";
            })
            .map((exp: any) => {
              const meta = exp.metaJson || exp.meta_json || {};
              return {
                name: meta.reportTitle || `Board Report - ${exp.type.toUpperCase()}`,
                date: exp.createdAt ? new Date(exp.createdAt).toISOString().split("T")[0] : "Unknown",
                status: exp.status,
                exportId: exp.id,
                exportType: exp.type,
                meta: meta,
              }
            })
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
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules?modelId=${selectedModelId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
    if (loadingAiContentRef.current || !orgId) return
    loadingAiContentRef.current = true
    aiContentFetchedRef.current = true // Mark as fetched (even on failure)

    setLoadingAiContent(true)
    try {
      // Build context with template-specific information
      const template = templates.find(t => t.id === selectedTemplate)
      const templateName = template?.name || selectedTemplate

      const contextData: any = {
        reportingPeriod,
        selectedMetrics: selectedMetrics.length > 0 ? selectedMetrics : kpiMetrics.slice(0, 4).map((m: any) => m.name),
        template: templateName,
        reportTitle,
        includeSections: activeSections,
        actualData: kpiMetrics.map(m => ({ name: m.name, value: m.value, change: m.change })),
        historicalTrends: chartData.length > 0 ? chartData : "No historical data provided"
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          modelRunId: selectedModelId,
          goal: `Generate a DEEP, COMPREHENSIVE professional board report narrative for ${templateName}. 
          The board expects substantial detail (500-800 words total).
          Please structure the response as a JSON object with:
          1. "executiveSummary": A multi-paragraph overview detailing the current period's performance (The Good, The Bad, and The Ugly). Include insights on ARR, burn, and runway.
          2. "kpiAnalysis": Detailed analysis of Growth, Efficiency, and Health trends.
          3. "functionalHighlights": Deep dive into Sales, Product, and Marketing progress.
          4. "recommendations": An array of 4-6 specific strategic board decisions or action items needed.
          Use professional, high-stakes investor-grade language.`,
          context: contextData,
        }),
        // Add timeout signal to prevent hanging requests
        signal: AbortSignal.timeout(55000), // 55 second timeout (less than server's 60s)
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Your session has expired. Please log in again.")
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && (result.plan || result.id)) {
          // Handle different response formats
          const planRecord = result.plan || result;
          const planData = planRecord.planJson || planRecord;
          const structured = planData?.structuredResponse || planData;

          // Extract content prioritizing the structured keys from our detailed prompt
          let executiveSummary = structured.executiveSummary || structured.summary || structured.natural_text || structured.naturalLanguage || "";
          
          // If we have kpiAnalysis and functionalHighlights, append them for a "deep" narrative
          if (structured.kpiAnalysis) {
            executiveSummary += "\n\nFinancial & KPI Analysis:\n" + structured.kpiAnalysis;
          }
          if (structured.functionalHighlights) {
            executiveSummary += "\n\nFunctional & Operational Highlights:\n" + structured.functionalHighlights;
          }
          if (structured.risksAndMitigations) {
            executiveSummary += "\n\nRisks & Mitigations:\n" + structured.risksAndMitigations;
          }
          if (structured.strategicRecommendations && Array.isArray(structured.strategicRecommendations)) {
            executiveSummary += "\n\nStrategic Recommendations:\n" + structured.strategicRecommendations.map((r: string) => `• ${r}`).join("\n");
          }

          const insights = planData?.insights || planData?.stagedChanges || [];
          const recommendations = structured.recommendations || planData?.recommendations || planData?.stagedChanges || [];
          const dataSources = planData?.metadata?.dataSources || planData?.dataSources || [];

          // Fallback if still empty
          if (!executiveSummary && insights.length > 0) {
            executiveSummary = insights[0]?.summary || insights[0]?.explain || insights[0]?.description || "";
          }
          if (!executiveSummary) {
            executiveSummary = "Based on the current financial data and selected metrics, this report provides a comprehensive overview of the organization's performance.";
          }

          // Extract key highlights
          const highlights = recommendations.slice(0, 6).map((r: any) => {
            if (typeof r === 'string') return r;
            return r.title || r.summary || r.explain || r.description || JSON.stringify(r);
          }).filter((h: any) => h && h.length > 0);

          setBoardReportAiContent({
            executiveSummary,
            keyHighlights: highlights.length > 0 ? highlights : ["Revenue performance", "Cost management", "Cash flow", "Growth metrics"],
            areasOfFocus: structured.areasOfFocus || structured.risks || "Continue monitoring key financial metrics and maintain focus on revenue growth and cost optimization.",
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
      loadingAiContentRef.current = false;
    }
  }

  const handleGenerateReport = async () => {
    if (isGeneratingRef.current || !orgId) {
      if (!orgId) toast.error("Organization ID not found")
      return;
    }
    
    isGeneratingRef.current = true;
    setIsGenerating(true)
    setShowExportModal(true)

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          template: selectedTemplate,
          format: reportFormat,
          modelId: selectedModelId,
          includeBudget: includeSections["Financial Performance"],
          includeMonteCarlo: includeSections["Risk Assessment"],
          includeRecommendations: includeSections["Forward Outlook"],
          selectedMetrics,
          reportTitle,
          reportingPeriod,
          aiContent: boardReportAiContent,
          distribution: {
            method: distributionMethod,
            recipients: recipients.split(',').map(r => r.trim()).filter(r => r.length > 0),
            subject: emailSubject,
            message: distributionMessage,
            passwordProtect: passwordProtect,
            password: passwordProtect ? password : null,
            trackEngagement: trackEngagement
          }
        }),
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Your session has expired. Please log in again.")
      }

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
                  headers: getAuthHeaders(),
                  credentials: "include",
                })

                if (statusResponse.status === 401) {
                  handleUnauthorized()
                  setIsGenerating(false)
                  setShowExportModal(false)
                  return
                }

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
      setShowExportModal(false)
    } finally {
      setIsGenerating(false)
      isGeneratingRef.current = false
    }
  }

  const handleScheduleCreate = async () => {
    if (!orgId) return
    setSavingSchedule(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: scheduleName,
          template: selectedTemplate,
          format: reportFormat,
          modelId: selectedModelId,
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

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

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
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/board-reports/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/shareable-link`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

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
    if (selectedTemplate === "board-deck") {
      // Board deck: all sections for comprehensive director briefing
      setIncludeSections(
        DEFAULT_SECTIONS.reduce((acc, section) => ({ ...acc, [section]: true }), {} as Record<string, boolean>)
      )
    } else if (selectedTemplate === "quarterly-review") {
      // Quarterly review: every section for deep-dive financials
      setIncludeSections({
        "Executive Summary": true,
        "Financial Performance": true,
        "Key Metrics": true,
        "Growth Analysis": true,
        "Operational Updates": true,
        "Risk Assessment": true,
        "Forward Outlook": true,
      })
    } else if (selectedTemplate === "audit-compliance") {
      // Audit report: focus on financial controls and risk
      setIncludeSections({
        "Executive Summary": true,
        "Financial Performance": true,
        "Key Metrics": false,
        "Growth Analysis": false,
        "Operational Updates": false,
        "Risk Assessment": true,
        "Forward Outlook": false,
      })
    } else if (selectedTemplate === "investor-update") {
      // Investor memo: growth story with forward outlook
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
            {templates.map((template) => {
              const templateConfig: Record<string, { icon: any; color: string; bgColor: string; audience: string }> = {
                "board-deck": { icon: Presentation, color: "text-blue-600", bgColor: "bg-blue-50", audience: "Board of Directors" },
                "quarterly-review": { icon: BarChart2, color: "text-purple-600", bgColor: "bg-purple-50", audience: "Board & C-Suite" },
                "audit-compliance": { icon: ShieldCheck, color: "text-amber-600", bgColor: "bg-amber-50", audience: "Audit Committee" },
                "investor-update": { icon: Mail, color: "text-emerald-600", bgColor: "bg-emerald-50", audience: "Investors & LPs" },
              }
              const config = templateConfig[template.id] || { icon: FileText, color: "text-primary", bgColor: "bg-primary/5", audience: "General" }
              const Icon = config.icon
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate === template.id ? "ring-2 ring-primary shadow-lg" : "hover:border-primary/30"}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <Badge variant={template.status === "ready" ? "default" : "secondary"}>{template.status}</Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Audience</span>
                        <span className="font-medium text-foreground">{(template as any).audience}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{template.type === "pptx" ? "Slides" : "Pages"}</span>
                        <span className="font-medium text-foreground">{template.slides}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Format</span>
                        <Badge variant="outline" className={`text-[10px] h-5 uppercase font-bold flex items-center gap-1 ${template.type === 'pptx' || template.type === 'presentation' ? 'text-blue-600 border-blue-200' : template.type === 'pdf' ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200'}`}>
                          {template.type === 'pptx' || template.type === 'presentation' ? <Presentation className="w-3 h-3"/> : template.type === 'pdf' ? <FileText className="w-3 h-3"/> : <Mail className="w-3 h-3"/>}
                          {template.type}
                        </Badge>
                      </div>
                    </div>
                    {/* Visual Layout Preview */}
                    <div className="mt-4 pt-4 border-t relative group/preview">
                      <div className="flex justify-center h-[60px] opacity-60 group-hover/preview:opacity-100 transition-opacity">
                        {(template.type === 'pptx' || template.type === 'presentation') ? (
                          <div className="flex gap-2 w-full max-w-[120px]">
                            <div className="w-2/3 h-full bg-blue-100 rounded border border-blue-200 p-1 flex flex-col gap-1">
                              <div className="w-full h-1/4 bg-blue-200 rounded-sm"></div>
                              <div className="w-full flex-1 bg-blue-200/50 rounded-sm"></div>
                            </div>
                            <div className="w-1/3 flex flex-col gap-1.5 h-full">
                              <div className="w-full flex-1 bg-blue-100 rounded border border-blue-200"></div>
                              <div className="w-full flex-1 bg-blue-100 rounded border border-blue-200"></div>
                            </div>
                          </div>
                        ) : template.type === 'pdf' ? (
                          <div className="flex gap-2 h-full">
                            <div className="w-10 h-full bg-amber-100 rounded border border-amber-200 flex flex-col items-center justify-start p-1.5 gap-1.5">
                              <div className="w-full h-1 bg-amber-300 rounded-full"></div>
                              <div className="w-full h-1 bg-amber-200 rounded-full"></div>
                              <div className="w-3/4 h-1 bg-amber-200 rounded-full shrink-0"></div>
                            </div>
                            <div className="w-10 h-full bg-amber-100 rounded border border-amber-200 flex flex-col items-center justify-start p-1.5 gap-1.5">
                              <div className="w-full h-1 bg-amber-300 rounded-full"></div>
                              <div className="w-full h-3 bg-amber-200 rounded-sm"></div>
                              <div className="w-full h-1 bg-amber-200 rounded-full"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-[100px] h-full bg-emerald-50 rounded border border-emerald-200 p-2 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full bg-emerald-200"></div>
                               <div className="w-12 h-1.5 bg-emerald-200 rounded-full"></div>
                            </div>
                            <div className="w-full h-1 bg-emerald-100 rounded-full mt-1"></div>
                            <div className="w-full h-1 bg-emerald-100 rounded-full"></div>
                            <div className="w-2/3 h-1 bg-emerald-100 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute inset-0 m-auto h-8 w-8 rounded-full shadow-lg scale-0 group-hover/preview:scale-100 transition-transform bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplatePreviewId(template.id);
                        }}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
            <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Template:</span><span className="font-semibold">{templates.find(t => t.id === selectedTemplate)?.name || "Board Deck"}</span></div>
            <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Sections:</span><Badge variant="outline" className="text-[10px] h-5">{activeSections.length}</Badge></div>
            <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Metrics:</span><Badge variant="outline" className="text-[10px] h-5">{selectedMetrics.length}</Badge></div>
            <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Format:</span><Badge variant="outline" className={`text-[10px] h-5 uppercase font-bold flex items-center gap-1 ${reportFormat === 'pptx' ? 'text-blue-600 border-blue-200 bg-blue-50' : reportFormat === 'pdf' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}>{reportFormat === 'pptx' ? <Presentation className="w-3 h-3"/> : reportFormat === 'pdf' ? <FileText className="w-3 h-3"/> : <Mail className="w-3 h-3"/>}{reportFormat}</Badge></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Define title, period, output format, and which sections to include</CardDescription>
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
                      <SelectItem value="pptx">PowerPoint (.pptx) — Slides presentation</SelectItem>
                      <SelectItem value="pdf">PDF — Document format</SelectItem>
                      <SelectItem value="memo">Memo — Written narrative</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {reportFormat === "pptx" ? "Best for board meetings — visual slides with charts and KPIs" :
                     reportFormat === "pdf" ? "Best for audit committees — formal, archivable document" :
                     "Best for investor updates — concise written narrative"}
                  </p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Content Generation</CardTitle>
                    <CardDescription>Generate executive narrative, highlights, and risk areas for your board report</CardDescription>
                  </div>
                  {boardReportAiContent && (
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Generated</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-4">
                    {/* Template Strategy Header */}
                    <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 mb-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Narrative Strategy</span>
                      </div>
                      <p className="text-sm font-medium">
                        {selectedTemplate === "board-deck" ? "High-level strategic narrative focused on market position, top-line growth, and board-level decisions." :
                         selectedTemplate === "quarterly-review" ? "Deep-dive operational review analyzing departmental performance, budget variances, and Q-over-Q trends." :
                         selectedTemplate === "investor-update" ? "LTV/CAC and unit economics focus, specifically designed for transparent investor communication." :
                         selectedTemplate === "audit-compliance" ? "Risk-focused narrative covering internal controls, financial health, and regulatory milestones." :
                         "Comprehensive financial overview with cross-functional performance highlights."}
                      </p>
                    </div>

                    {loadingAiContent ? (
                      <div className="py-8 space-y-4">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-medium text-sm">Generating AI Content...</p>
                          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" />Analyzing metrics</span>
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />Drafting narrative</span>
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-gray-300" />Formatting output</span>
                          </div>
                        </div>
                      </div>
                    ) : boardReportAiContent ? (
                      <>
                        {/* Metadata bar */}
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pb-2 border-b">
                          <span>{(() => { const text = (boardReportAiContent.executiveSummary || "") + (boardReportAiContent.areasOfFocus || ""); const words = text.split(/\s+/).filter(Boolean).length; return `${words} words`; })()}</span>
                          <span>{(() => { const text = (boardReportAiContent.executiveSummary || "") + (boardReportAiContent.areasOfFocus || ""); const words = text.split(/\s+/).filter(Boolean).length; return `~${Math.max(1, Math.ceil(words / 200))} min read`; })()}</span>
                          <span>{boardReportAiContent.keyHighlights?.length || 0} highlights</span>
                        </div>

                        <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                              <div className="h-5 w-5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                              Executive Summary
                            </h3>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchAIContent} disabled={loadingAiContent}>
                              {loadingAiContent ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Edit className="mr-1 h-3 w-3" />}
                              Regenerate
                            </Button>
                          </div>
                          <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                            {boardReportAiContent.executiveSummary || boardReportAiContent.summary || "No summary available."}
                          </p>
                        </div>

                        <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                          <h3 className="font-semibold text-sm text-emerald-900 mb-3 flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                            Key Highlights
                          </h3>
                          {boardReportAiContent.keyHighlights?.length ? (
                            <ul className="space-y-2">
                              {boardReportAiContent.keyHighlights.map((highlight: any, index: number) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-emerald-800">
                                  <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0 mt-0.5">{index + 1}</div>
                                  <span>{highlight.title || highlight.summary || highlight.explain || highlight || "Highlight"}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-emerald-700">No highlights available.</p>
                          )}
                        </div>

                        <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                          <h3 className="font-semibold text-sm text-amber-900 mb-2 flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                            Areas of Focus & Risk
                          </h3>
                          <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
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

                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-500 leading-relaxed">AI-generated content should be reviewed for accuracy before distribution. All data points are sourced from your organization&apos;s financial records and may require manual verification for board-level compliance.</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                          <Zap className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-sm mb-1">AI Content Not Generated Yet</p>
                        <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">Generate an executive summary, key highlights, and risk assessment powered by AI using your selected metrics and reporting period.</p>
                        <Button size="sm" variant="default" onClick={fetchAIContent} disabled={loadingAiContent}>
                          {loadingAiContent ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                          Generate AI Content
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Key Metrics</CardTitle>
                  <CardDescription>Choose which metrics to include in your report. Each metric shows its current value and strategic significance.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{selectedMetrics.length} of {kpiMetrics.length} selected</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : kpiMetrics.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiMetrics.map((metric) => {
                      const significanceMap: Record<string, string> = {
                        "Annual Recurring Revenue": "Primary top-line growth indicator. Board priority #1.",
                        "Monthly Recurring Revenue": "Baseline monthly SaaS revenue. Tracks short-term growth momentum.",
                        "Burn Multiple": "Capital efficiency: net burn ÷ net new ARR. < 1.5x is best-in-class.",
                        "Burn Rate": "Monthly cash consumption. Essential for evaluating runway.",
                        "LTV:CAC Ratio": "Unit economics health. > 3x indicates sustainable growth.",
                        "Customer Acquisition Cost": "Sales & marketing efficiency metric. Monitored for scalability.",
                        "Customer Lifetime Value": "Projected revenue per account. Key metric for evaluating ROI.",
                        "Monthly Churn Rate": "Customer retention metric. Higher churn significantly impacts LTV.",
                        "Quick Ratio": "Growth quality: new + expansion MRR ÷ churn + contraction MRR.",
                        "Rule of 40": "Revenue growth % + profit margin %. > 40% is the benchmark.",
                        "Gross Margin": "Revenue retained after COGS. SaaS baseline: 70-80%.",
                        "Cash Runway": "Months of operation at current burn. < 6 months = alert.",
                        "Active Customers": "Total paying accounts. Directly correlated with ARR.",
                      }
                      const significance = significanceMap[metric.name] || "Key performance indicator for stakeholder reporting."
                      return (
                        <div
                          key={metric.name}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMetrics.includes(metric.name) ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                          onClick={() => handleMetricToggle(metric.name)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Checkbox checked={selectedMetrics.includes(metric.name)} />
                            {metric.trend === "up" ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <h3 className="font-medium text-sm mb-1">{metric.name || "Unknown Metric"}</h3>
                          <div className="text-xl font-bold mb-1">{metric.value || "N/A"}</div>
                          <div className={`text-xs font-medium mb-2 ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                            {metric.change || "N/A"}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed border-t pt-2">{significance}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">Selected metrics will appear in the Key Performance Metrics section of your report. For board-level reports, we recommend including 4–6 metrics that cover growth, efficiency, and runway.</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium mb-1">No Metrics Available</p>
                  <p className="text-sm">Create a financial model and run a forecast to populate key performance metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card className="shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Board Report Preview
                  </CardTitle>
                  <CardDescription>Live visualization of your generated board pack based on current configuration</CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit h-7 px-3 text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                  {selectedTemplate.replace('-', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-6 bg-slate-50/50">
              <div className="max-w-4xl mx-auto bg-white shadow-xl ring-1 ring-slate-200 rounded-sm md:rounded-md p-6 md:p-12 space-y-8 md:space-y-12 min-h-[1000px]">
                {/* Mock Header */}
                <div className="border-b-2 border-primary pb-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">{reportTitle}</h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{formatMonthLabel(new Date())} • BOARD CONFIDENTIAL</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sourced from</p>
                    <p className="text-sm font-bold text-primary">FinaPilot AI-CFO</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Executive Summary Narrative */}
                  {includeSections["Executive Summary"] && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Executive Summary
                      </h3>
                      <div className="prose prose-slate max-w-none">
                        <div className="text-slate-600 leading-relaxed italic border-l-4 border-slate-200 pl-4 py-1 whitespace-pre-wrap">
                          {boardReportAiContent?.executiveSummary || "Initial strategic assessment identifying key performance drivers, operational tailwinds, and critical budget considerations for the board's upcoming quarterly review session."}
                        </div>
                      </div>
                      
                      {/* NEW: Show Highlights in Preview */}
                      {boardReportAiContent?.keyHighlights && boardReportAiContent.keyHighlights.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {boardReportAiContent.keyHighlights.slice(0, 3).map((h: string, i: number) => (
                            <div key={i} className="p-3 bg-amber-50 rounded-md border border-amber-100 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-xs text-amber-900 font-medium">{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                {/* Key Performance Indicators */}
                {includeSections["Key Metrics"] && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Key Performance Metrics</h3>
                    {loading ? (
                      <div className="flex items-center justify-center h-32 bg-slate-50 rounded">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : selectedMetrics.length > 0 && kpiMetrics.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {selectedMetrics.slice(0, 8).map((metricName) => {
                          const metric = kpiMetrics.find((m) => m.name === metricName)
                          return metric ? (
                            <div key={metricName} className="text-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-tight mb-1">{metric.name}</div>
                              <div className="text-xl font-bold text-slate-900">{metric.value || "N/A"}</div>
                              <div className={`text-[10px] font-bold mt-0.5 ${metric.trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                                {metric.change || "N/A"}
                              </div>
                            </div>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded text-slate-400 italic text-sm">
                        Select metrics to see preview data
                      </div>
                    )}
                  </div>
                )}
                {/* Growth Analysis */}
                {includeSections["Growth Analysis"] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Revenue Trend */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Revenue Growth</h3>
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      </div>
                      {chartData.length > 0 ? (
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} 
                              />
                              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 bg-slate-50 rounded text-slate-400 italic text-sm">
                          Revenue trend visualization pending data
                        </div>
                      )}
                    </div>

                    {/* Customer Acquisition */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Customer Growth</h3>
                        <BarChart2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      {chartData.length > 0 ? (
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="customers" fill="#10b981" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 bg-slate-50 rounded text-slate-400 italic text-sm">
                          Customer growth visualization pending data
                        </div>
                      )}
                    </div>
                  </div>
                )}

                  {/* Growth Analysis - Grid 2x2 */}
                  {includeSections["Growth Analysis"] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Revenue Trend */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Revenue Growth</h3>
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        </div>
                        {chartData.length > 0 ? (
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} 
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 bg-slate-50 rounded text-slate-400 italic text-[10px]">
                            Revenue trend visualization pending data
                          </div>
                        )}
                      </div>

                      {/* Customer Acquisition */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">2. Customer Growth</h3>
                          <BarChart2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        {chartData.length > 0 ? (
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <ResponsiveContainer width="100%" height={160}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                                <Bar dataKey="customers" fill="#10b981" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 bg-slate-50 rounded text-slate-400 italic text-[10px]">
                            Customer growth visualization pending data
                          </div>
                        )}
                      </div>

                      {/* Burn Rate */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">3. Monthly Burn</h3>
                          <PieChart className="h-4 w-4 text-rose-500" />
                        </div>
                        {chartData.length > 0 ? (
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <ResponsiveContainer width="100%" height={160}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "Burn"]}
                                />
                                <Bar dataKey="burn" fill="#ef4444" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 bg-slate-50 rounded text-slate-400 italic text-[10px]">
                            Burn rate visualization pending data
                          </div>
                        )}
                      </div>

                      {/* Efficiency Metric */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">4. Efficiency Score</h3>
                          <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        {chartData.length > 0 ? (
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                  formatter={(value) => [value, "Burn Multiple"]}
                                />
                                <Line type="stepAfter" dataKey="efficiency" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: '#f59e0b' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 bg-slate-50 rounded text-slate-400 italic text-[10px]">
                            Efficiency visualization pending data
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Operational Note */}
                  <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <span>Page 1 of {templates.find(t => t.id === selectedTemplate)?.slides || 8}</span>
                    <span>Board Update • {new Date().getFullYear()}</span>
                    <span>Classified: Internal Only</span>
                  </div>
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
                <CardDescription>Configure how your report is shared with stakeholders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Distribution Method</Label>
                  <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email — Direct to inbox</SelectItem>
                      <SelectItem value="slack">Slack — Channel notification</SelectItem>
                      <SelectItem value="link">Shareable Link — Password optional</SelectItem>
                      <SelectItem value="download">Download Only — Local export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {distributionMethod === 'email' && (
                  <>
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="recipients">Email Recipients</Label>
                      <Input id="recipients" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="board@company.com, investor@lp.com" />
                      <p className="text-[10px] text-muted-foreground">Separate multiple email addresses with commas</p>
                    </div>
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input id="subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                    </div>
                  </>
                )}
                
                {distributionMethod === 'slack' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="recipients">Slack Channels or User IDs</Label>
                    <Input id="recipients" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="#board-updates, @investor" />
                    <p className="text-[10px] text-muted-foreground">Comma separated. Ensure FinaPilot app is invited to private channels.</p>
                  </div>
                )}

                {(distributionMethod === 'email' || distributionMethod === 'slack' || distributionMethod === 'link') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="message">Message Context</Label>
                    <Textarea 
                      id="message" 
                      value={distributionMessage} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDistributionMessage(e.target.value)}
                      placeholder={distributionMethod === 'link' ? "Internal notes (optional)..." : "Brief context for the report..."}
                      rows={3}
                    />
                  </div>
                )}

                {distributionMethod === 'download' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-2">
                      <Download className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">Local Download</span>
                        <p className="text-xs mt-1">The report will be generated and saved to your "Recent Reports" below. You can download it directly without sending notifications.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="password-protect" checked={passwordProtect} onCheckedChange={(checked) => setPasswordProtect(!!checked)} />
                    <Label htmlFor="password-protect" className="text-sm font-medium flex items-center gap-1.5">
                      <LucideLock className="h-3.5 w-3.5 text-slate-400" />
                      Password protect report
                    </Label>
                  </div>
                  
                  {passwordProtect && (
                    <div className="pl-6 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="report-password" className="text-[10px] uppercase font-bold text-slate-500">Set AES-256 Encryption Password</Label>
                      <Input 
                        id="report-password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Min 8 characters recommended"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox id="track-views" checked={trackEngagement} onCheckedChange={(checked) => setTrackEngagement(!!checked)} />
                    <Label htmlFor="track-views" className="text-sm font-medium flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                      Track stakeholder engagement
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                       <HistoryIcon className="h-4 w-4 text-slate-400" />
                       Recent Reports
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">Execution history and delivery status</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchRecentReports} className="h-8 text-xs font-semibold gap-1.5 text-slate-500 hover:text-primary hover:bg-primary/5">
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                     <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentReports.length > 0 ? (
                      recentReports.map((report: any, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${report.exportType === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                              {report.exportType === 'pdf' ? <FileText className="h-4 w-4" /> : <Presentation className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 line-clamp-1">{report.name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{report.date}</span>
                                <span className="h-0.5 w-0.5 bg-slate-200 rounded-full" />
                                <span className="uppercase font-bold tracking-tighter">{report.exportType}</span>
                                {report.meta?.distribution?.method && (
                                  <>
                                    <span className="h-0.5 w-0.5 bg-slate-200 rounded-full" />
                                    <span className="flex items-center gap-1 text-primary/70 font-medium">
                                      <Send className="h-2.5 w-2.5" />
                                      {report.meta.distribution.method}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              report.status === 'completed' || report.status === 'done' ? 'default' : 
                              report.status === 'failed' ? 'destructive' : 'secondary'
                            } className={`h-6 px-1.5 text-[9px] font-bold uppercase tracking-wider ${
                              report.status === 'completed' || report.status === 'done' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : ''
                            }`}>
                              {report.status}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-primary/20 hover:bg-primary/5"
                              onClick={() => handleDownloadReport(report.exportId, report.exportType)}
                              disabled={report.status !== 'completed' && report.status !== 'done'}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                          <HistoryIcon className="h-5 w-5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">No Recent Reports Found</h4>
                        <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">Generated reports will appear here automatically.</p>
                        <Button variant="outline" size="sm" className="mt-4 h-8 text-[11px] font-bold px-4 border-slate-200" onClick={fetchRecentReports}>
                          Sync History
                        </Button>
                      </div>
                    )}
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
      {/* template preview modal */}
      <Dialog open={!!templatePreviewId} onOpenChange={(open) => !open && setTemplatePreviewId(null)}>
        <DialogContent className="max-w-4xl sm:max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-6 bg-white border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {templates.find(t => t.id === templatePreviewId)?.name} Preview
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Structure and typical content breakdown for this {templates.find(t => t.id === templatePreviewId)?.type.toUpperCase()} template
                </DialogDescription>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold capitalize">
                {(templates.find(t => t.id === templatePreviewId) as any)?.audience}
              </Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show slides based on template slide count */}
              {Array.from({ length: Math.min(12, templates.find(t => t.id === templatePreviewId)?.slides || 8) }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                   <div className="aspect-[16/9] bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col p-4 group transition-all hover:border-primary/50 relative">
                     <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                       {i + 1}
                     </div>
                      <div className="h-4 w-1/2 bg-slate-100 rounded mb-4"></div>
                      <div className="flex-1 flex flex-col gap-3">
                         <div className="h-2 w-full bg-slate-50 rounded"></div>
                         
                         {/* Mock Page Content based on slide index */}
                         {i === 0 ? (
                            // Title slide
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                              <div className="h-5 w-3/4 bg-blue-50 rounded"></div>
                              <div className="h-2 w-1/2 bg-slate-50 rounded"></div>
                            </div>
                         ) : (i === 1 || i === 2) ? (
                            // Chart slides with REAL DATA if available
                            <div className="mt-auto flex-1 flex items-end gap-1.5 px-2 pb-1">
                               {chartData.length > 0 ? (
                                 chartData.map((d, idx) => {
                                   const val = i === 1 ? (d.revenue || 0) : (d.burn || 0);
                                   const maxVal = i === 1 ? Math.max(...chartData.map(cd => cd.revenue || 1)) : Math.max(...chartData.map(cd => cd.burn || 1));
                                   const h = Math.max(10, (val / (maxVal || 1)) * 100);
                                   return (
                                     <div 
                                       key={idx} 
                                       className={`flex-1 rounded-t-sm transition-all ${i === 1 ? 'bg-blue-500/40' : 'bg-red-400/40'}`}
                                       style={{ height: `${h}%` }}
                                     ></div>
                                   );
                                 })
                               ) : (
                                 [30, 60, 45, 80, 55, 90].map((h, idx) => (
                                   <div key={idx} className="flex-1 bg-slate-100 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                 ))
                               )}
                            </div>
                         ) : (
                            <div className="space-y-2">
                              <div className="h-2 w-full bg-slate-50 rounded"></div>
                              <div className="h-2 w-2/3 bg-slate-50 rounded"></div>
                              {i % 3 === 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                  <div className="h-8 bg-emerald-50/50 rounded border border-emerald-100/50" />
                                  <div className="h-8 bg-blue-50/50 rounded border border-blue-100/50" />
                                </div>
                              )}
                            </div>
                         )}
                      </div>
                      <div className="mt-auto pt-2 flex justify-between items-center border-t border-slate-50">
                        <div className="h-1.5 w-8 bg-slate-100 rounded"></div>
                        <div className="h-1.5 w-4 bg-slate-100 rounded-full"></div>
                      </div>
                   </div>
                    <div className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                       {[
                         "Cover & Agenda", "Revenue Trends", "Burn & Runway", 
                         "LTV/CAC Analysis", "Unit Economics", "Market Position", 
                         "Operational Review", "Risk Assessment", "Strategic Roadmap", 
                         "Future Outlook", "Data Provenance", "Appendix"
                       ][i] || "Appendix Area"}
                    </div>
                </div>
              ))}
              {/* Show overflow indicator if more than 12 slides */}
              {(templates.find(t => t.id === templatePreviewId)?.slides || 0) > 12 && (
                <div className="aspect-[16/9] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 bg-white/50">
                   <Plus className="h-8 w-8 mb-2" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">
                     +{((templates.find(t => t.id === templatePreviewId)?.slides || 0) - 12)} Additional Institutional Slides
                   </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t shrink-0">
            <Button variant="outline" onClick={() => setTemplatePreviewId(null)}>Close Preview</Button>
            <Button onClick={() => {
              setSelectedTemplate(templatePreviewId || "board-deck");
              setTemplatePreviewId(null);
            }}>Use This Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
