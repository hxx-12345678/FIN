"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { FileText, Download, Share, Calendar, TrendingUp, TrendingDown, Zap, Filter, Eye, ListTodo } from "lucide-react"
import Link from "next/link"

// Report templates - static list of available templates
const reportTemplates = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level overview for leadership",
    category: "Executive",
    frequency: "Monthly",
    status: "ready",
  },
  {
    id: "financial-performance",
    name: "Financial Performance",
    description: "Detailed P&L and cash flow analysis",
    category: "Financial",
    frequency: "Monthly",
    status: "ready",
  },
  {
    id: "kpi-dashboard",
    name: "KPI Dashboard",
    description: "Key performance indicators tracking",
    category: "Operations",
    frequency: "Weekly",
    status: "ready",
  },
  {
    id: "investor-update",
    name: "Investor Update",
    description: "Monthly investor communication",
    category: "Investor",
    frequency: "Monthly",
    status: "ready",
  },
  {
    id: "budget-variance",
    name: "Budget Variance",
    description: "Budget vs actual analysis",
    category: "Financial",
    frequency: "Monthly",
    status: "ready",
  },
  {
    id: "growth-metrics",
    name: "Growth Metrics",
    description: "Customer and revenue growth analysis",
    category: "Growth",
    frequency: "Weekly",
    status: "ready",
  },
]

export function ReportsAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days")
  const [selectedTemplate, setSelectedTemplate] = useState("executive-summary")
  const [isGenerating, setIsGenerating] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([])
  const [customReports, setCustomReports] = useState<any[]>([])
  const [scheduledReports, setScheduledReports] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch orgId
  useEffect(() => {
    fetchOrgId()
  }, [])

  // Fetch data when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchOverviewData()
      fetchExports()
    }
  }, [orgId])

  // Auto-refresh exports list for processing reports
  useEffect(() => {
    if (!orgId) return

    // Check if there are any processing reports
    const hasProcessingReports = customReports.some(
      (r: any) => r.originalStatus === "processing" || r.originalStatus === "queued"
    )

    if (hasProcessingReports) {
      // Poll every 3 seconds for processing reports
      const interval = setInterval(() => {
        fetchExports()
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [orgId, customReports])

  // Refetch data when period changes
  useEffect(() => {
    if (orgId) {
      fetchOverviewData()
    }
  }, [selectedPeriod, orgId])

  // Listen for CSV import completion to refresh data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`CSV import completed! Refreshing overview data...`)
        
        // Small delay to ensure backend has processed the data
        setTimeout(async () => {
          if (orgId) {
            await fetchOverviewData()
            await fetchExports()
          }
        }, 2000)
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
    }
  }, [orgId])

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

  const fetchOverviewData = async () => {
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

      // Calculate date range based on selected period
      const now = new Date()
      let startDate: Date
      switch (selectedPeriod) {
        case "last-7-days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "last-30-days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "last-90-days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case "ytd":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data) {
          const data = result.data
          
          // Process KPI data from overview
          const kpis = [
            { 
              name: "Revenue", 
              current: data.monthlyRevenue || 0, 
              target: data.monthlyRevenue ? Math.round(data.monthlyRevenue * 1.1) : 0, 
              change: data.revenueGrowth || 0, 
              trend: (data.revenueGrowth || 0) > 0 ? "up" : "down" 
            },
            { 
              name: "Customers", 
              current: data.activeCustomers || 0, 
              target: data.activeCustomers ? Math.round(data.activeCustomers * 1.1) : 0, 
              change: 0, 
              trend: "up" 
            },
            { 
              name: "Burn Rate", 
              current: data.monthlyBurnRate || 0, 
              target: data.monthlyBurnRate ? Math.round(data.monthlyBurnRate * 0.9) : 0, 
              change: data.burnRateChange || 0, 
              trend: (data.burnRateChange || 0) < 0 ? "down" : "up" 
            },
            { 
              name: "Cash Runway", 
              current: Math.round(data.cashRunway || 0), 
              target: 12, 
              change: data.runwayChange || 0, 
              trend: (data.runwayChange || 0) > 0 ? "up" : "down" 
            },
          ]
          setKpiData(kpis)

          // Process revenue data - always set data, use defaults if empty
          if (Array.isArray(data.revenueData) && data.revenueData.length > 0) {
            let processedRevenue = data.revenueData.map((item: any) => {
              const itemDate = item.date ? new Date(item.date) : null
              const monthStr = item.month || (itemDate ? itemDate.toLocaleDateString("en-US", { month: "short" }) : "")
              return {
                month: monthStr,
                revenue: Number(item.revenue) || 0,
                target: Number(item.forecast ?? item.target ?? item.revenue ?? 0),
                customers: Number(item.customers) || 0,
                date: itemDate,
              }
            })

            // Filter by selected period if dates available
            if (processedRevenue.some((r: any) => r.date)) {
              processedRevenue = processedRevenue.filter((item: any) => !item.date || item.date >= startDate)
            }
            
            // Sort by date and take last 6 months
            processedRevenue.sort((a: any, b: any) => {
              if (a.date && b.date) return a.date.getTime() - b.date.getTime()
              return 0
            })
            processedRevenue = processedRevenue.slice(-6)

            // Remove date field for chart
            const chartData = processedRevenue.map((item: any) => {
              const { date, ...rest } = item
              return rest
            })
            setRevenueData(chartData.length > 0 ? chartData : getDefaultRevenueData())
          } else {
            // Use default data if no revenue data - ensure charts always have data to display
            setRevenueData(getDefaultRevenueData())
          }

          // Process expense breakdown - always set data
          if (Array.isArray(data.expenseBreakdown) && data.expenseBreakdown.length > 0) {
            setExpenseBreakdown(data.expenseBreakdown)
          } else {
            // Use default expense breakdown if empty
            setExpenseBreakdown(getDefaultExpenseBreakdown())
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to fetch overview:", errorData)
        toast.error("Failed to load analytics data")
      }
    } catch (error) {
      console.error("Failed to fetch overview data:", error)
      toast.error("Failed to load analytics data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchExports = async () => {
    if (!orgId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      // Fetch exports for this org
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/exports`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.exports) {
          // Process exports into custom reports
          const reports = result.exports.map((exp: any) => {
            // Map status correctly
            let displayStatus = "scheduled"
            if (exp.status === "completed") {
              displayStatus = "published"
            } else if (exp.status === "pending") {
              displayStatus = "draft"
            } else if (exp.status === "processing" || exp.status === "queued") {
              displayStatus = "processing"
            } else if (exp.status === "failed") {
              displayStatus = "failed"
            }

            return {
              id: exp.id,
              name: `Report - ${exp.type.toUpperCase()}`,
              type: "Custom",
              createdBy: exp.createdBy?.name || "System",
              lastModified: exp.createdAt ? new Date(exp.createdAt).toLocaleString() : "Unknown",
              views: 0,
              status: displayStatus,
              originalStatus: exp.status, // Keep original status for polling logic
              exportType: exp.type,
              downloadUrl: exp.downloadUrl,
            }
          })
          setCustomReports(reports)

          // Separate scheduled reports (status is "scheduled" or "processing")
          const scheduled = reports.filter(
            (r: any) => r.status === "scheduled" || r.status === "processing"
          )
          setScheduledReports(scheduled)
        }
      } else {
        // Fallback to jobs endpoint if exports endpoint doesn't exist
        const jobsResponse = await fetch(`${API_BASE_URL}/jobs?orgId=${orgId}&jobType=export_pdf,export_pptx,export_csv&limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (jobsResponse.ok) {
          const jobsResult = await jobsResponse.json()
          if (jobsResult.ok && jobsResult.data) {
            const reports = jobsResult.data
              .filter((job: any) => job.jobType?.startsWith("export_"))
              .map((job: any, index: number) => ({
                id: job.id,
                name: `Report ${index + 1}`,
                type: "Custom",
                createdBy: "System",
                lastModified: job.createdAt ? new Date(job.createdAt).toLocaleString() : "Unknown",
                views: 0,
                status: job.status === "done" ? "published" : job.status === "pending" ? "draft" : "scheduled",
              }))
            setCustomReports(reports)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch exports:", error)
    }
  }

  const handleDownloadExport = async (exportId: string, exportType: string) => {
    if (!orgId) {
      toast.error("Organization ID not found")
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        return
      }

      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `report-${exportId.substring(0, 8)}.${exportType}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Report downloaded successfully")
      } else {
        toast.error("Failed to download report")
      }
    } catch (error) {
      console.error("Failed to download export:", error)
      toast.error("Failed to download report. Please try again.")
    }
  }

  const handleShareExport = async (exportId: string) => {
    if (!orgId) {
      toast.error("Organization ID not found")
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        return
      }

      toast.info("Creating shareable link...")

      const response = await fetch(`${API_BASE_URL}/exports/${exportId}/shareable-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          expiresInHours: 168, // 7 days default
          maxAccessCount: null, // Unlimited
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.shareableLink) {
          const shareUrl = result.shareableLink.shareUrl
          
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(shareUrl)
            
            // Show a prominent toast with the link
            toast.success(
              <div className="space-y-3 w-full max-w-md">
                <div className="font-semibold text-base">✅ Shareable link copied to clipboard!</div>
                <div className="text-xs text-muted-foreground break-all bg-muted p-3 rounded border font-mono">
                  {shareUrl}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.open(shareUrl, "_blank")
                    }}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Open Link
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl)
                        toast.info("Link copied again!")
                      } catch (e) {
                        toast.error("Failed to copy link")
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                  >
                    Copy Again
                  </button>
                </div>
              </div>,
              {
                duration: 12000, // Show for 12 seconds
                style: {
                  minWidth: "400px",
                },
              }
            )
          } catch (clipboardError) {
            // Fallback: show the link in a more visible way
            toast.success(
              <div className="space-y-3 w-full max-w-md">
                <div className="font-semibold text-base">Shareable link created!</div>
                <div className="text-xs text-muted-foreground break-all bg-muted p-3 rounded border font-mono">
                  {shareUrl}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.open(shareUrl, "_blank")
                    }}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Open Link
                  </button>
                  <button
                    onClick={async () => {
                      // Try to select and copy
                      const textArea = document.createElement("textarea")
                      textArea.value = shareUrl
                      textArea.style.position = "fixed"
                      textArea.style.opacity = "0"
                      document.body.appendChild(textArea)
                      textArea.select()
                      try {
                        document.execCommand("copy")
                        toast.success("Link copied to clipboard!")
                      } catch (e) {
                        toast.error("Failed to copy. Please copy manually from above.")
                      }
                      document.body.removeChild(textArea)
                    }}
                    className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>,
              {
                duration: 15000, // Show for 15 seconds
                style: {
                  minWidth: "400px",
                },
              }
            )
          }
        } else {
          toast.error("Failed to create shareable link")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error?.message || "Failed to create shareable link")
      }
    } catch (error) {
      console.error("Failed to create shareable link:", error)
      toast.error("Failed to create shareable link. Please try again.")
    }
  }

  const handleGenerateReport = async () => {
    if (!orgId) {
      toast.error("Organization ID not found")
      return
    }

    setIsGenerating(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        setIsGenerating(false)
        return
      }

      // Get latest model run to generate report from
      const modelsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (modelsResponse.ok) {
        const modelsResult = await modelsResponse.json()
        if (modelsResult.ok && modelsResult.models && modelsResult.models.length > 0) {
          const firstModel = modelsResult.models[0]
          
          // Get latest run for this model
          const runsResponse = await fetch(`${API_BASE_URL}/models/${firstModel.id}/runs`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (runsResponse.ok) {
            const runsResult = await runsResponse.json()
            if (runsResult.ok && runsResult.runs && runsResult.runs.length > 0) {
              const latestRun = runsResult.runs[0]
              
              // Determine export type based on template
              const exportType = selectedTemplate === "investor-update" ? "memo" : "pdf"
              
              // Create export with template information
              const exportResponse = await fetch(`${API_BASE_URL}/model-runs/${latestRun.id}/export`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ 
                  type: exportType,
                  template: selectedTemplate, // Pass template type for context-specific generation
                }),
              })

              if (exportResponse.ok) {
                const exportResult = await exportResponse.json()
                toast.success("Report generation started. Check Export Queue for status.")
                // Refresh exports list after a delay
    setTimeout(() => {
                  fetchExports()
                }, 2000)
              } else {
                const errorData = await exportResponse.json().catch(() => ({}))
                toast.error(errorData.error?.message || "Failed to generate report")
              }
            } else {
              toast.error("No model runs found. Please create a model first.")
            }
          }
        } else {
          toast.error("No models found. Please create a model first.")
        }
      }
    } catch (error) {
      console.error("Failed to generate report:", error)
      toast.error("Failed to generate report. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate insights and reports from your financial data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="#export-queue">
              <ListTodo className="mr-2 h-4 w-4" />
              Export Queue
            </Link>
          </Button>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="bg-transparent">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="sm" onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : kpiData.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
              {kpi.trend === "up" ? (
                <TrendingUp className={`h-4 w-4 ${kpi.change > 0 ? "text-green-600" : "text-red-600"}`} />
              ) : (
                <TrendingDown className={`h-4 w-4 ${kpi.change < 0 ? "text-green-600" : "text-red-600"}`} />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.name.includes("Rate") || kpi.name.includes("Churn")
                  ? `${kpi.current}%`
                  : kpi.name.includes("Revenue") ||
                      kpi.name.includes("CAC") ||
                      kpi.name.includes("LTV") ||
                      kpi.name.includes("Burn")
                    ? `$${kpi.current.toLocaleString()}`
                    : kpi.current.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div
                  className={`text-xs ${
                    Math.abs(kpi.change) > 0
                      ? kpi.name.includes("Churn")
                        ? kpi.change < 0
                          ? "text-green-600"
                          : "text-red-600"
                        : kpi.change > 0
                          ? "text-green-600"
                          : "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {kpi.change > 0 ? "+" : ""}
                  {kpi.change}% from last month
                </div>
                <div className="text-xs text-muted-foreground">
                  Target:{" "}
                  {kpi.name.includes("Rate") || kpi.name.includes("Churn")
                    ? `${kpi.target}%`
                    : kpi.name.includes("Revenue") ||
                        kpi.name.includes("CAC") ||
                        kpi.name.includes("LTV") ||
                        kpi.name.includes("Burn")
                      ? `$${kpi.target.toLocaleString()}`
                      : kpi.target.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No KPI data available. Import transactions to see metrics.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge
                      variant={
                        template.status === "ready" ? "default" : template.status === "draft" ? "secondary" : "outline"
                      }
                    >
                      {template.status}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span>{template.frequency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template.id)
                        handleGenerateReport()
                      }}
                      disabled={isGenerating}
                    >
                      {isGenerating && selectedTemplate === template.id ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                      <FileText className="mr-1 h-3 w-3" />
                      Generate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Performance</CardTitle>
                <CardDescription>Revenue vs targets over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Actual Revenue" />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No revenue data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Monthly customer acquisition</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="customers"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Customers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No customer data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Current month expense distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        const name = props.name ?? ''
                        const percent = props.percent ?? 0
                        return `${name} ${(percent * 100).toFixed(0)}%`
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No expense data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Key metrics trend analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Reports</CardTitle>
                  <CardDescription>Create and manage your custom reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRefreshing(true)
                      fetchExports().finally(() => setIsRefreshing(false))
                    }}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : customReports.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>{report.createdBy}</TableCell>
                        <TableCell>{report.lastModified}</TableCell>
                        <TableCell>{report.views}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.status === "published"
                                ? "default"
                                : report.status === "processing"
                                  ? "secondary"
                                  : report.status === "failed"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {report.status === "published" ? "Ready" : report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-transparent"
                              onClick={() => handleDownloadExport(report.id, report.exportType || "pdf")}
                              disabled={report.status !== "published"}
                              title={report.status === "processing" ? "Report is still generating..." : "Download report"}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-transparent"
                              onClick={() => handleShareExport(report.id)}
                              disabled={report.status !== "published"}
                              title={report.status === "processing" ? "Report is still generating..." : "Create shareable link"}
                            >
                              <Share className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No custom reports yet. Generate a report to see it here.</p>
                    </div>
                  )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule New Report</CardTitle>
                <CardDescription>Set up automated report generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input id="report-name" placeholder="Weekly Financial Summary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-template">Template</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive-summary">Executive Summary</SelectItem>
                      <SelectItem value="financial-performance">Financial Performance</SelectItem>
                      <SelectItem value="kpi-dashboard">KPI Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Input id="recipients" placeholder="john@company.com, sarah@company.com" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="auto-generate" />
                  <Label htmlFor="auto-generate" className="text-sm">
                    Auto-generate and send via email
                  </Label>
                </div>
                <Button className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Schedules</CardTitle>
                <CardDescription>Currently scheduled reports</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : scheduledReports.length > 0 ? (
                <div className="space-y-4">
                    {scheduledReports.map((schedule: any, index: number) => (
                      <div key={schedule.id || index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{schedule.name}</h3>
                          <Badge variant="outline">Scheduled</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                          <div>Last Modified: {schedule.lastModified}</div>
                          <div>Status: {schedule.status}</div>
                      </div>
                      <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-transparent"
                            onClick={() => handleDownloadExport(schedule.id, schedule.exportType || "pdf")}
                            disabled={schedule.status !== "published"}
                            title={schedule.status === "processing" ? "Report is still generating..." : "Download report"}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-transparent"
                            onClick={() => handleShareExport(schedule.id)}
                            disabled={schedule.status !== "published"}
                            title={schedule.status === "processing" ? "Report is still generating..." : "Create shareable link"}
                          >
                            <Share className="h-3 w-3 mr-1" />
                            Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No scheduled reports. Create a schedule to see them here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Default revenue data for charts when no data available
function getDefaultRevenueData() {
  return [
    { month: "Jan", revenue: 0, target: 0, customers: 0 },
    { month: "Feb", revenue: 0, target: 0, customers: 0 },
    { month: "Mar", revenue: 0, target: 0, customers: 0 },
    { month: "Apr", revenue: 0, target: 0, customers: 0 },
    { month: "May", revenue: 0, target: 0, customers: 0 },
    { month: "Jun", revenue: 0, target: 0, customers: 0 },
  ]
}

// Default expense breakdown when no data available
function getDefaultExpenseBreakdown() {
  return [
    { name: "No Data", value: 0, color: "#8884d8" },
  ]
}
