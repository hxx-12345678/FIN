"use client"

import { useState } from "react"
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
import { Loader2, RefreshCw, X, RotateCw, Eye, Filter, Calendar, BarChart3, AlertCircle, ArrowUp, ArrowDown } from "lucide-react"
import { useJobQueue } from "@/hooks/use-job-queue"
import { JobProgressIndicator } from "./job-progress-indicator"
import { JobDetailsModal } from "./job-details-modal"
import { toast } from "sonner"

type TabValue = "all" | "running" | "completed" | "failed"

export function MonteCarloJobQueue() {
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [cancelJobId, setCancelJobId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [modelFilter, setModelFilter] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "duration" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const { jobs, filters, setFilters, refresh, cancelJob, retryJob, isLoading, error } = useJobQueue({
    status: activeTab === "all" ? undefined : activeTab,
    sortBy,
    sortOrder,
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)
    setFilters({
      ...filters,
      status: value === "all" ? undefined : value,
    })
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
      await cancelJob(cancelJobId)
      toast.success("Job cancellation requested")
      setCancelJobId(null)
    } catch (err) {
      toast.error("Failed to cancel job. It may have already completed.")
    }
  }

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId)
      toast.success("Job retry initiated")
    } catch (err) {
      toast.error("Failed to retry job")
    }
  }

  const applyFilters = () => {
    setFilters({
      ...filters,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      modelId: modelFilter || undefined,
      sortBy,
      sortOrder,
    })
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setModelFilter("")
    setFilters({
      ...filters,
      dateFrom: undefined,
      dateTo: undefined,
      modelId: undefined,
    })
  }

  const filteredJobs = jobs
    .filter((job) => {
      if (activeTab === "all") return true
      return job.status === activeTab
    })
    .map((job) => {
      const started = job.startedAt ? new Date(job.startedAt).getTime() : 0
      const now = Date.now()
      const durationMs = now - started
      const isTimeout = durationMs > 30 * 60 * 1000 && job.status === "running"
      return { ...job, isTimeout, calculatedDuration: durationMs }
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") {
        const dateA = new Date(a.startedAt || a.createdAt).getTime()
        const dateB = new Date(b.startedAt || b.createdAt).getTime()
        comparison = dateA - dateB
      } else if (sortBy === "duration") {
        const durA = a.duration || a.calculatedDuration || 0
        const durB = b.duration || b.calculatedDuration || 0
        comparison = durA - durB
      } else if (sortBy === "status") {
        const statusOrder = { queued: 0, running: 1, completed: 2, failed: 3, cancelled: 4 }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Monte Carlo Job Queue</h1>
          <p className="text-muted-foreground">Monitor and manage your simulation jobs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
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
              <label className="text-sm font-medium">Model</label>
              <Input
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Model ID"
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
          <CardTitle>Jobs</CardTitle>
          <CardDescription>View and manage your Monte Carlo simulation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All Jobs</TabsTrigger>
                <TabsTrigger value="running" className="text-xs sm:text-sm">Running</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
                <TabsTrigger value="failed" className="text-xs sm:text-sm">Failed</TabsTrigger>
              </TabsList>
            </div>

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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-sm">
                            {job.id.slice(0, 8)}...
                            {job.isTimeout && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Timeout
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            {job.status === "running" ? (
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
                              {job.status === "running" && (
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
                      ))}
                    </TableBody>
                  </Table>
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

