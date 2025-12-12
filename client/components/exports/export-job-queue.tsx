"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2, RefreshCw, X, RotateCw, Download, Filter, FileText, Presentation, FileSpreadsheet, AlertCircle, ArrowUp, ArrowDown } from "lucide-react"
import { useExportJob } from "@/hooks/use-export-job"
import { toast } from "sonner"

interface ExportJob {
  id: string
  exportId?: string
  type: "PDF" | "PPTX" | "CSV"
  status: "queued" | "processing" | "completed" | "failed" | "cancelled"
  progress?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  fileSize?: number
  error?: string
  partialExport?: boolean
}

import { API_BASE_URL } from "@/lib/api-config"
const POLL_INTERVAL = 2000

export function ExportJobQueue() {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [cancelJobId, setCancelJobId] = useState<string | null>(null)
  const [retryJobId, setRetryJobId] = useState<string | null>(null)
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null)
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const orgId = localStorage.getItem("orgId") || ""
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Use jobs endpoint and filter by export job types
      const params = new URLSearchParams()
      params.append("orgId", orgId) // Backend expects camelCase
      params.append("limit", "50")
      // Filter for export job types
      const exportJobTypes = ["export_pdf", "export_pptx", "export_csv", "investor_export_pdf", "investor_export_pptx"]
      // We'll filter on the frontend since backend doesn't support multiple jobType values
      // Or we can make multiple requests, but for now let's get all jobs and filter

      const response = await fetch(`${API_BASE_URL}/jobs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch export jobs")
      }

      const data = await response.json()
      // Backend returns { ok: true, data: jobs[], total: number }
      const allJobs = data.data || data.jobs || []
      // Filter for export job types
      const jobsList = allJobs.filter((job: any) => {
        const jobType = job.jobType || job.job_type
        return exportJobTypes.includes(jobType)
      }).map((job: any) => ({
        id: job.id,
        exportId: job.objectId || job.object_id,
        type: (job.jobType || job.job_type || "").replace("export_", "").replace("investor_export_", "").toUpperCase(),
        status: job.status === "running" ? "processing" : job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : job.status === "cancelled" ? "cancelled" : "queued",
        progress: job.progress || 0,
        createdAt: job.createdAt || job.created_at,
        startedAt: job.runStartedAt || job.run_started_at || job.startedAt || job.started_at,
        finishedAt: job.finishedAt || job.finished_at,
        fileSize: job.fileSize || job.file_size,
        error: job.lastError || job.last_error,
        partialExport: job.partialExport || job.partial_export,
      }))
      setJobs(jobsList)

      jobsList.forEach((job: ExportJob) => {
        if (job.status === "processing" || job.status === "queued") {
          startPolling(job.id)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load export jobs")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    if (pollingRefs.current.has(jobId)) return

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!response.ok) {
          stopPolling(jobId)
          return
        }

        const data = await response.json()
        const jobData = data.job || data.data || data
        
        // Map job status to export status
        const exportStatus = jobData.status === "running" ? "processing" : 
                            jobData.status === "completed" ? "completed" : 
                            jobData.status === "failed" ? "failed" : 
                            jobData.status === "cancelled" ? "cancelled" : "queued"

        setJobs((prev) => prev.map((j) => (j.id === jobId ? { 
          ...j, 
          status: exportStatus,
          progress: jobData.progress || j.progress,
          startedAt: jobData.runStartedAt || jobData.run_started_at || jobData.startedAt || jobData.started_at || j.startedAt,
          finishedAt: jobData.finishedAt || jobData.finished_at || j.finishedAt,
          error: jobData.lastError || jobData.last_error || j.error,
        } : j)))

        if (exportStatus !== "processing" && exportStatus !== "queued") {
          stopPolling(jobId)
        }

        const started = jobData.runStartedAt || jobData.run_started_at || jobData.startedAt || jobData.started_at
        if (started && Date.now() - new Date(started).getTime() > 5 * 60 * 1000 && exportStatus === "processing") {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, status: "failed" as const, error: "Export generation timed out. Please try again." }
                : j
            )
          )
          stopPolling(jobId)
        }
      } catch (err) {
        stopPolling(jobId)
      }
    }, POLL_INTERVAL)

    pollingRefs.current.set(jobId, interval)
  }, [])

  const stopPolling = useCallback((jobId: string) => {
    const interval = pollingRefs.current.get(jobId)
    if (interval) {
      clearInterval(interval)
      pollingRefs.current.delete(jobId)
    }
  }, [])

  useEffect(() => {
    fetchJobs()

    return () => {
      pollingRefs.current.forEach((interval) => clearInterval(interval))
      pollingRefs.current.clear()
    }
  }, [fetchJobs])

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
        throw new Error("Failed to cancel export")
      }

      await fetchJobs()
      toast.success("Export cancelled")
      setCancelJobId(null)
    } catch (err) {
      toast.error("Failed to cancel export. It may have already completed.")
      setCancelJobId(null)
    }
  }

  const handleRetry = async (jobId: string) => {
    setRetryJobId(jobId)

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
        throw new Error("Failed to retry export")
      }

      await fetchJobs()
      toast.success("Export retry initiated")
      setRetryJobId(null)
    } catch (err) {
      toast.error("Failed to retry export")
      setRetryJobId(null)
    }
  }

  const handleDownload = async (job: ExportJob) => {
    if (!job.exportId) {
      toast.error("Export ID not available")
      return
    }

    setDownloadingJobId(job.id)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/exports/${job.exportId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          toast.error("Download link expired. Please regenerate export.")
          return
        }
        throw new Error("Failed to get download URL")
      }

      const data = await response.json()
      const downloadUrl = data.downloadUrl || data.url || ""

      if (downloadUrl) {
        window.open(downloadUrl, "_blank")
        toast.success("Download started")
      } else {
        toast.error("Download link expired. Please regenerate export.")
      }
    } catch (err) {
      toast.error("Download link expired. Please regenerate export.")
    } finally {
      setDownloadingJobId(null)
    }
  }

  const filteredAndSortedJobs = jobs
    .filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false
      if (typeFilter !== "all" && job.type !== typeFilter) return false
      if (dateFrom && new Date(job.createdAt) < new Date(dateFrom)) return false
      if (dateTo && new Date(job.createdAt) > new Date(dateTo)) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        comparison = dateA - dateB
      } else if (sortBy === "status") {
        const statusOrder = { queued: 0, processing: 1, completed: 2, failed: 3, cancelled: 4 }
        comparison = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="h-4 w-4" />
      case "PPTX":
        return <Presentation className="h-4 w-4" />
      case "CSV":
        return <FileSpreadsheet className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary">Queued</Badge>
      case "processing":
        return <Badge variant="default">Processing</Badge>
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Export Job Queue</h1>
          <p className="text-muted-foreground">Monitor and manage your export jobs</p>
        </div>
        <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setTypeFilter("all")
                setDateFrom("")
                setDateTo("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="PPTX">PPTX</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(v: "date" | "status") => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
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
          <CardTitle>Export History (Last 50)</CardTitle>
          <CardDescription>View and manage your export jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAndSortedJobs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No export jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="rounded-md border min-w-full inline-block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredAndSortedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(job.type)}
                          <span>{job.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(job.status)}
                        {job.partialExport && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Partial
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.status === "processing" ? (
                          <div className="space-y-1 min-w-[100px]">
                            <Progress value={job.progress || 0} className="h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round(job.progress || 0)}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(job.createdAt)}</TableCell>
                      <TableCell className="text-sm">
                        {formatFileSize(job.fileSize)}
                        {job.fileSize && job.fileSize > 50 * 1024 * 1024 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Large
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === "completed" && job.exportId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(job)}
                              disabled={downloadingJobId === job.id}
                            >
                              {downloadingJobId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {job.status === "processing" && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancel(job.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetry(job.id)}
                              disabled={retryJobId === job.id}
                            >
                              {retryJobId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelJobId !== null} onOpenChange={() => setCancelJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Export?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this export? This action cannot be undone.
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

