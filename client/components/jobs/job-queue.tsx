"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, RefreshCw, X, RotateCw, Eye, Filter, Calendar, BarChart3, AlertCircle, ArrowUp, ArrowDown, Zap, FileText, Brain, TrendingUp } from "lucide-react"
import { JobProgressIndicator } from "./job-progress-indicator"
import { JobDetailsModal } from "./job-details-modal"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface Job {
  id: string
  jobType: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying" | "dead_letter"
  progress?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  duration?: number
  modelId?: string
  error?: string
  lastError?: string
  orgId?: string
}

type TabValue = "all" | "running" | "completed" | "failed"

const JOB_TYPE_ICONS: Record<string, any> = {
  monte_carlo: BarChart3,
  model_run: TrendingUp,
  csv_import: FileText,
  auto_model: Brain,
  export_pdf: FileText,
  export_pptx: FileText,
  export_csv: FileText,
  default: Zap,
}

const JOB_TYPE_LABELS: Record<string, string> = {
  monte_carlo: "Monte Carlo",
  model_run: "Model Run",
  csv_import: "CSV Import",
  auto_model: "Auto Model",
  auto_model_trigger: "Auto Model Trigger",
  export_pdf: "PDF Export",
  export_pptx: "PPTX Export",
  export_csv: "CSV Export",
  investor_export_pdf: "Investor PDF",
  investor_export_pptx: "Investor PPTX",
  data_sync: "Data Sync",
  notification: "Notification",
  scheduled_auto_model: "Scheduled Model",
  scheduled_connector_sync: "Scheduled Sync",
}

export function JobQueue() {
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [cancelJobId, setCancelJobId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [jobTypeFilter, setJobTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "duration" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const orgId = localStorage.getItem("orgId") || ""
      const params = new URLSearchParams()
      params.append("orgId", orgId) // Backend expects camelCase
      params.append("limit", "100")

      if (activeTab !== "all") {
        params.append("status", activeTab)
      }
      if (dateFrom) {
        params.append("date_from", dateFrom)
      }
      if (dateTo) {
        params.append("date_to", dateTo)
      }
      if (jobTypeFilter !== "all") {
        params.append("jobType", jobTypeFilter) // Backend expects camelCase
      }
      if (sortBy) {
        params.append("sort_by", sortBy)
      }
      if (sortOrder) {
        params.append("sort_order", sortOrder)
      }

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }

      const data = await response.json()
      // Backend returns { ok: true, data: jobs[], total: number }
      const jobsList = data.data || data.jobs || []
      // Map backend job format to frontend format
      const mappedJobs = jobsList.map((job: any) => ({
        id: job.id,
        jobType: job.jobType || job.job_type,
        status: job.status,
        progress: job.progress || 0,
        createdAt: job.createdAt || job.created_at,
        startedAt: job.runStartedAt || job.run_started_at || job.startedAt || job.started_at,
        finishedAt: job.finishedAt || job.finished_at,
        duration: job.duration,
        modelId: job.objectId || job.object_id,
        error: job.lastError || job.last_error,
        lastError: job.lastError || job.last_error,
        orgId: job.orgId || job.org_id,
      }))
      setJobs(mappedJobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, dateFrom, dateTo, jobTypeFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchJobs()
    // Auto-refresh every 5 seconds for running jobs
    const interval = setInterval(() => {
      if (activeTab === "all" || activeTab === "running") {
        fetchJobs()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchJobs, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)
  }

  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId)
    setShowDetailsModal(true)
  }

  const handleCancel = async (jobId: string) => {
    setCancelJobId(jobId)
  }

  const confirmCancel = async () => {
    if (!cancelJobId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${cancelJobId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to cancel job")
      }

      await fetchJobs()
      toast.success("Job cancellation requested")
      setCancelJobId(null)
    } catch (err) {
      toast.error("Failed to cancel job. It may have already completed.")
      setCancelJobId(null)
    }
  }

  const handleRetry = async (jobId: string) => {
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/retry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to retry job")
      }

      await fetchJobs()
      toast.success("Job retry initiated")
    } catch (err) {
      toast.error("Failed to retry job")
    }
  }

  const applyFilters = () => {
    fetchJobs()
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setJobTypeFilter("all")
    fetchJobs()
  }

  const filteredJobs = jobs
    .filter((job) => {
      if (activeTab === "all") return true
      return job.status === activeTab
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") {
        const dateA = new Date(a.startedAt || a.createdAt).getTime()
        const dateB = new Date(b.startedAt || b.createdAt).getTime()
        comparison = dateA - dateB
      } else if (sortBy === "duration") {
        const durA = a.duration || 0
        const durB = b.duration || 0
        comparison = durA - durB
      } else if (sortBy === "status") {
        const statusOrder = { queued: 0, running: 1, retrying: 2, completed: 3, failed: 4, cancelled: 5, dead_letter: 6 }
        comparison = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary">Queued</Badge>
      case "running":
        return <Badge variant="default">Running</Badge>
      case "retrying":
        return <Badge variant="default" className="bg-yellow-500">Retrying</Badge>
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>
      case "dead_letter":
        return <Badge variant="destructive">Dead Letter</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getJobTypeIcon = (jobType: string) => {
    const Icon = JOB_TYPE_ICONS[jobType] || JOB_TYPE_ICONS.default
    return <Icon className="h-4 w-4" />
  }

  const getJobTypeLabel = (jobType: string) => {
    return JOB_TYPE_LABELS[jobType] || jobType
  }

  // Get unique job types for filter
  const jobTypes = Array.from(new Set(jobs.map(j => j.jobType))).sort()

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Job Queue</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor and manage all background jobs: Monte Carlo simulations, model runs, CSV imports, exports, and more
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchJobs} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Refreshing...</span>
                <span className="sm:hidden">Refreshing</span>
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Type</label>
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getJobTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="End date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={applyFilters} className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(v: "date" | "duration" | "status") => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select value={sortOrder} onValueChange={(v: "asc" | "desc") => setSortOrder(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Descending
                    </div>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Ascending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>View and manage all background processing jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Jobs</TabsTrigger>
              <TabsTrigger value="running">Running</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 overflow-x-auto overflow-y-visible">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No jobs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="rounded-md border min-w-full inline-block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Type</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {filteredJobs.map((job) => {
                        const started = job.startedAt ? new Date(job.startedAt).getTime() : 0
                        const now = Date.now()
                        const durationMs = now - started
                        const isTimeout = durationMs > 30 * 60 * 1000 && job.status === "running"
                        
                        return (
                          <TableRow key={job.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getJobTypeIcon(job.jobType)}
                                <span className="font-medium">{getJobTypeLabel(job.jobType)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {job.id.slice(0, 8)}...
                              {isTimeout && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Timeout
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell>
                              {job.status === "running" || job.status === "retrying" ? (
                                <JobProgressIndicator
                                  jobId={job.id}
                                  status={job.status}
                                  progress={job.progress}
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(job.startedAt || job.createdAt)}</TableCell>
                            <TableCell className="text-sm">{formatDuration(job.duration)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(job.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(job.status === "running" || job.status === "retrying") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancel(job.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                {job.status === "failed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRetry(job.id)}
                                  >
                                    <RotateCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <JobDetailsModal
        jobId={selectedJobId}
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedJobId(null)
        }}
      />

      <AlertDialog open={cancelJobId !== null} onOpenChange={() => setCancelJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

