"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Download, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface SecurityEvent {
  id: string
  timestamp: string
  user: string
  eventType: string
  resource: string
  severity: "low" | "medium" | "high" | "critical"
  details: any
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
const POLL_INTERVAL = 5000

export function SecurityAuditLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (eventTypeFilter !== "all") params.append("eventType", eventTypeFilter)
      if (severityFilter !== "all") params.append("severity", severityFilter)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)

      const response = await fetch(`${API_BASE_URL}/security/audit-log?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch security events")
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security events")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()

    const wsUrl = API_BASE_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws/security-events"
    try {
      const ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        const newEvent = JSON.parse(event.data)
        setEvents((prev) => [newEvent, ...prev])
      }
      ws.onerror = () => {
        startPolling()
      }
      wsRef.current = ws
    } catch (err) {
      startPolling()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [eventTypeFilter, severityFilter, dateFrom, dateTo])

  const startPolling = () => {
    if (pollingRef.current) return

    pollingRef.current = setInterval(() => {
      fetchEvents()
    }, POLL_INTERVAL)
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams()
      if (eventTypeFilter !== "all") params.append("eventType", eventTypeFilter)
      if (severityFilter !== "all") params.append("severity", severityFilter)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)

      const response = await fetch(`${API_BASE_URL}/security/audit-log/export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to export logs")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `security-audit-log-${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Security logs exported successfully")
    } catch (err) {
      toast.error("Failed to export logs")
    } finally {
      setIsExporting(false)
    }
  }

  const toggleRow = (eventId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedRows(newExpanded)
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>
      case "medium":
        return <Badge variant="default" className="bg-yellow-500">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge>{severity}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const highSeverityEvents = events.filter((e) => e.severity === "high" || e.severity === "critical")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Security Audit Log</h1>
          <p className="text-muted-foreground">Real-time security event monitoring</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {highSeverityEvents.length > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{highSeverityEvents.length} high-severity events</strong> detected. Review immediately.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="permission_change">Permission Change</SelectItem>
                  <SelectItem value="data_access">Data Access</SelectItem>
                  <SelectItem value="system_change">System Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>{events.length} events found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No security events found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <>
                      <TableRow
                        key={event.id}
                        className={event.severity === "high" || event.severity === "critical" ? "bg-red-50" : ""}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRow(event.id)}
                            aria-label={expandedRows.has(event.id) ? "Collapse" : "Expand"}
                          >
                            {expandedRows.has(event.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(event.timestamp)}</TableCell>
                        <TableCell className="text-sm">{event.user}</TableCell>
                        <TableCell className="text-sm">{event.eventType}</TableCell>
                        <TableCell className="text-sm">{event.resource}</TableCell>
                        <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(event.details).substring(0, 50)}...
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(event.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/50">
                            <pre className="text-xs p-4 overflow-auto max-h-64">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


