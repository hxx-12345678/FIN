"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, AlertCircle, FileText, BarChart3, X } from "lucide-react"
import { toast } from "sonner"
import { useJobStatus } from "@/hooks/use-job-status"
import { JobProgressIndicator } from "./job-progress-indicator"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface JobDetailsModalProps {
  jobId: string | null
  open: boolean
  onClose: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function JobDetailsModal({ jobId, open, onClose }: JobDetailsModalProps) {
  const { job, isLoading, error, refetch, cancel } = useJobStatus(jobId)
  const [logs, setLogs] = useState<string[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

  useEffect(() => {
    if (open && jobId) {
      refetch()
      fetchLogs()
    }
  }, [open, jobId, refetch])

  useEffect(() => {
    if (activeTab === "logs" && jobId && logs.length === 0 && !logsLoading) {
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, jobId, logs.length, logsLoading])

  useEffect(() => {
    if (activeTab === "results" && jobId && job?.status === "completed" && !results && !resultsLoading) {
      fetchResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, jobId, job?.status, results, resultsLoading])

  const fetchLogs = async () => {
    if (!jobId) return

    setLogsLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/logs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch logs")
      }

      const data = await response.json()
      const rawLogs = data.logs || []
      
      // Convert all log entries to strings, handling objects properly
      const logLines = rawLogs.map((log: any) => {
        if (typeof log === "string") {
          return log
        } else if (typeof log === "object" && log !== null) {
          // Handle log objects - extract message or stringify
          if (log.message) {
            return log.message
          } else if (log.msg) {
            return log.msg
          } else if (log.text) {
            return log.text
          } else {
            // Stringify object but filter out params and other internal fields
            const filtered: any = {}
            for (const [key, value] of Object.entries(log)) {
              if (key !== "params" && !key.startsWith("_") && key !== "__typename") {
                filtered[key] = value
              }
            }
            return JSON.stringify(filtered, null, 2)
          }
        } else {
          return String(log)
        }
      })
      
      if (logLines.length > 10000) {
        setLogs(logLines.slice(-10000))
      } else {
        setLogs(logLines)
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err)
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchResults = async () => {
    if (!jobId) return

    setResultsLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/results`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch results")
      }

      const data = await response.json()
      setResults(data.results || data)
    } catch (err) {
      console.error("Failed to fetch results:", err)
    } finally {
      setResultsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!jobId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/results`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to download results")
      }

      const data = await response.json()
      const results = data.results || data
      
      if (!results) {
        throw new Error("No results data available")
      }
      
      // Create a formatted JSON string
      const jsonString = JSON.stringify(results, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `job-${jobId}-results-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Results downloaded successfully")
    } catch (err) {
      console.error("Failed to download results:", err)
      toast.error(err instanceof Error ? err.message : "Failed to download results")
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const calculateDuration = () => {
    if (!job?.startedAt) return "N/A"
    const start = new Date(job.startedAt).getTime()
    const end = job.finishedAt ? new Date(job.finishedAt).getTime() : Date.now()
    const seconds = Math.floor((end - start) / 1000)
    
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatResultsForDisplay = (results: any) => {
    // If results is a string, try to parse it
    let parsedResults = results
    if (typeof results === "string") {
      try {
        parsedResults = JSON.parse(results)
      } catch {
        return <pre className="text-xs overflow-auto">{results}</pre>
      }
    }

    // If it's not an object, just display as-is
    if (typeof parsedResults !== "object" || parsedResults === null) {
      return <pre className="text-xs overflow-auto">{String(parsedResults)}</pre>
    }

    // Handle arrays - if results is an array, process each item
    if (Array.isArray(parsedResults)) {
      if (parsedResults.length === 0) {
        return (
          <Alert>
            <AlertDescription>No results available.</AlertDescription>
          </Alert>
        )
      }
      
      // Check if array contains financial data
      const firstItem = parsedResults[0]
      if (firstItem && (firstItem.summary || firstItem.summaryJson || firstItem.monthly)) {
        return (
          <div className="space-y-6">
            {parsedResults.map((item: any, index: number) => (
              <div key={index} className="border rounded p-4">
                <h5 className="font-semibold mb-3 text-sm">Result {index + 1}</h5>
                {formatFinancialResults(item)}
              </div>
            ))}
          </div>
        )
      }
      
      // Format array as a table
      return (
        <div className="space-y-4">
          <h4 className="font-semibold mb-3 text-sm">Results ({parsedResults.length} items)</h4>
          <div className="border rounded">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Index</th>
                    <th className="p-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedResults.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 font-medium text-muted-foreground w-1/4">{index}</td>
                      <td className="p-2">
                        {typeof item === "object" && item !== null ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-blue-600 hover:underline">View Details</summary>
                            <div className="mt-2">
                              {formatGenericResults(item)}
                            </div>
                          </details>
                        ) : (
                          String(item)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    // Check if it's a model run summary or financial data
    if (parsedResults.summary || parsedResults.summaryJson || parsedResults.monthly) {
      return formatFinancialResults(parsedResults)
    }

    // Check if it's Monte Carlo results
    if (parsedResults.percentiles || parsedResults.survivalProbability) {
      return formatMonteCarloResults(parsedResults)
    }

    // Check if it's export results
    if (parsedResults.exportId || parsedResults.fileUrl) {
      return formatExportResults(parsedResults)
    }

    // Default: format as a readable table
    return formatGenericResults(parsedResults)
  }

  const formatFinancialResults = (results: any) => {
    const summary = results.summary || results.summaryJson || results
    const monthly = summary.monthly || results.monthly || {}
    
    // Prepare chart data from monthly data
    const chartData = Object.entries(monthly).map(([month, data]: [string, any]) => ({
      month: month.length > 7 ? month.substring(0, 7) : month,
      revenue: (data.revenue || 0) / 1000,
      expenses: (data.expenses || 0) / 1000,
      net: ((data.revenue || 0) - (data.expenses || 0)) / 1000,
      cash: (data.cash || 0) / 1000,
    }))

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3 text-sm">Financial Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.revenue !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Revenue</div>
                <div className="text-lg font-semibold">
                  ${(summary.revenue / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {summary.expenses !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Expenses</div>
                <div className="text-lg font-semibold">
                  ${(summary.expenses / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {summary.cash !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Cash Balance</div>
                <div className="text-lg font-semibold">
                  ${(summary.cash / 1000000).toFixed(2)}M
                </div>
              </div>
            )}
            {summary.runway !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Runway</div>
                <div className="text-lg font-semibold">
                  {Math.round(summary.runway)} months
                </div>
              </div>
            )}
            {summary.runwayMonths !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Runway</div>
                <div className="text-lg font-semibold">
                  {Math.round(summary.runwayMonths)} months
                </div>
              </div>
            )}
            {summary.burnRate !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Burn Rate</div>
                <div className="text-lg font-semibold">
                  ${(summary.burnRate / 1000).toFixed(0)}K/mo
                </div>
              </div>
            )}
            {summary.arr !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">ARR</div>
                <div className="text-lg font-semibold">
                  ${(summary.arr / 1000000).toFixed(2)}M
                </div>
              </div>
            )}
            {summary.netIncome !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Net Income</div>
                <div className={`text-lg font-semibold ${summary.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${(summary.netIncome / 1000).toFixed(0)}K
                </div>
              </div>
            )}
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-sm">Revenue vs Expenses Trend</h4>
              <div className="border rounded p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}K`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-sm">Cash Flow Trend</h4>
              <div className="border rounded p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}K`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} name="Cash Balance" />
                    <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Net Income" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-sm">Monthly Breakdown Table</h4>
              <div className="border rounded">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Month</th>
                        <th className="p-2 text-right">Revenue</th>
                        <th className="p-2 text-right">Expenses</th>
                        <th className="p-2 text-right">Net</th>
                        <th className="p-2 text-right">Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(monthly).map(([month, data]: [string, any]) => (
                        <tr key={month} className="border-t">
                          <td className="p-2">{month}</td>
                          <td className="p-2 text-right">${((data.revenue || 0) / 1000).toFixed(0)}K</td>
                          <td className="p-2 text-right">${((data.expenses || 0) / 1000).toFixed(0)}K</td>
                          <td className={`p-2 text-right ${(data.revenue || 0) - (data.expenses || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${(((data.revenue || 0) - (data.expenses || 0)) / 1000).toFixed(0)}K
                          </td>
                          <td className="p-2 text-right">${((data.cash || 0) / 1000).toFixed(0)}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const formatMonteCarloResults = (results: any) => {
    const percentiles = results.percentiles || {}
    const survival = results.survivalProbability || {}

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3 text-sm">Monte Carlo Simulation Results</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {percentiles.p50 !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Median (50th)</div>
                <div className="text-lg font-semibold">
                  ${(percentiles.p50 / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {percentiles.p95 !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">95th Percentile</div>
                <div className="text-lg font-semibold">
                  ${(percentiles.p95 / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {percentiles.p5 !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">5th Percentile</div>
                <div className="text-lg font-semibold">
                  ${(percentiles.p5 / 1000).toFixed(0)}K
                </div>
              </div>
            )}
            {survival.probability !== undefined && (
              <div className="border rounded p-3">
                <div className="text-xs text-muted-foreground">Survival Probability</div>
                <div className="text-lg font-semibold">
                  {(survival.probability * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const formatExportResults = (results: any) => {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-3 text-sm">Export Information</h4>
          <div className="space-y-2">
            {results.exportId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Export ID:</span>
                <span className="font-mono text-sm">{results.exportId}</span>
              </div>
            )}
            {results.fileUrl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">File URL:</span>
                <a href={results.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Download
                </a>
              </div>
            )}
            {results.status && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge>{results.status}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const formatGenericResults = (results: any) => {
    // Recursively filter out params and other internal objects
    const filterObject = (obj: any, depth = 0): any => {
      if (depth > 3) return "[Nested object too deep]"
      if (obj === null || obj === undefined) return String(obj)
      if (typeof obj !== "object") return obj
      if (Array.isArray(obj)) {
        return obj.map(item => filterObject(item, depth + 1))
      }
      
      const filtered: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // Skip internal/technical fields
        if (key.startsWith("_") || key === "logs" || key === "params" || key === "__typename") {
          continue
        }
        
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          // For nested objects, stringify them instead of rendering directly
          filtered[key] = JSON.stringify(value, null, 2)
        } else {
          filtered[key] = value
        }
      }
      return filtered
    }

    const filteredResults = filterObject(results)
    const entries = Object.entries(filteredResults)

    if (entries.length === 0) {
      return (
        <div className="space-y-4">
          <Alert>
            <AlertDescription>No displayable results found. Results may contain only technical data.</AlertDescription>
          </Alert>
          <details className="border rounded p-4">
            <summary className="cursor-pointer font-medium text-sm mb-2">View Raw JSON (Technical)</summary>
            <pre className="text-xs overflow-auto mt-2">{JSON.stringify(results, null, 2)}</pre>
          </details>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h4 className="font-semibold mb-3 text-sm">Results</h4>
        <div className="border rounded">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {entries.map(([key, value]) => (
                  <tr key={key} className="border-t">
                    <td className="p-2 font-medium text-muted-foreground w-1/3">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </td>
                    <td className="p-2">
                      {typeof value === "string" && value.startsWith("{") ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-blue-600 hover:underline">View JSON</summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded">{value}</pre>
                        </details>
                      ) : typeof value === "number" && (key.toLowerCase().includes("revenue") || key.toLowerCase().includes("expense") || key.toLowerCase().includes("cash") || key.toLowerCase().includes("arr")) ? (
                        `$${(value / 1000).toFixed(0)}K`
                      ) : (
                        String(value)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>Job ID: {jobId}</DialogDescription>
        </DialogHeader>

        {isLoading && !job ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : job ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <div className="mt-1">
                      <JobProgressIndicator
                        jobId={job.id}
                        status={job.status}
                        progress={job.progress}
                        onCancel={job.status === "running" ? cancel : undefined}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Duration</div>
                    <div className="mt-1 text-sm">{calculateDuration()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                    <div className="mt-1 text-sm">{formatDate(job.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Started</div>
                    <div className="mt-1 text-sm">{formatDate(job.startedAt)}</div>
                  </div>
                </div>

                {job.finishedAt && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Finished</div>
                    <div className="mt-1 text-sm">{formatDate(job.finishedAt)}</div>
                  </div>
                )}

                {job.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{job.error}</AlertDescription>
                  </Alert>
                )}

                {job.status === "running" && job.startedAt && (() => {
                  const started = new Date(job.startedAt).getTime()
                  const now = Date.now()
                  const durationMs = now - started
                  const isTimeout = durationMs > 30 * 60 * 1000
                  return isTimeout ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Job timed out. Results may be incomplete.
                      </AlertDescription>
                    </Alert>
                  ) : null
                })()}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {logs.length > 0 && logs.length >= 10000 ? "Showing last 10,000 lines" : `${logs.length} lines`}
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                  {logsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Refresh Logs
                    </>
                  )}
                </Button>
              </div>

              {logsLoading && logs.length === 0 ? (
                <Skeleton className="h-64 w-full" />
              ) : logs.length === 0 ? (
                <Alert>
                  <AlertDescription>Logs not available for this job.</AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Job Results</div>
                {job.status === "completed" && (
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>

              {resultsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : results ? (
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                  {formatResultsForDisplay(results)}
                </ScrollArea>
              ) : job.status === "completed" ? (
                <div className="space-y-2">
                  <Alert>
                    <AlertDescription>Results are too large to preview. Please download.</AlertDescription>
                  </Alert>
                  <Button onClick={fetchResults} disabled={resultsLoading}>
                    {resultsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Load Results
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>Results will be available when the job completes.</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

