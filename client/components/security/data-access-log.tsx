"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface DataAccessEvent {
  id: string
  timestamp: string
  user: string
  resourceType: string
  resourceId: string
  action: "read" | "write" | "delete"
  details: any
  resourceSnapshot?: any
}

export function DataAccessLog() {
  const [events, setEvents] = useState<DataAccessEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [resourceTypeFilter, userFilter, page])

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (resourceTypeFilter !== "all") params.append("resourceType", resourceTypeFilter)
      if (userFilter) params.append("user", userFilter)
      params.append("page", page.toString())
      params.append("limit", "50")

      const response = await fetch(`${API_BASE_URL}/security/data-access?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch data access logs")
      }

      const data = await response.json()
      if (page === 1) {
        setEvents(data.events || [])
      } else {
        setEvents((prev) => [...prev, ...(data.events || [])])
      }
      setHasMore(data.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data access logs")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams()
      if (resourceTypeFilter !== "all") params.append("resourceType", resourceTypeFilter)
      if (userFilter) params.append("user", userFilter)

      const response = await fetch(`${API_BASE_URL}/security/data-access/export?${params.toString()}`, {
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
      a.download = `data-access-log-${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Data access logs exported successfully")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "read":
        return <Badge variant="secondary">Read</Badge>
      case "write":
        return <Badge variant="default">Write</Badge>
      case "delete":
        return <Badge variant="destructive">Delete</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Data Access Log</h1>
          <p className="text-muted-foreground">Track who accessed what data</p>
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
              Export
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select value={resourceTypeFilter} onValueChange={(v) => {
                setResourceTypeFilter(v)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="model">Models</SelectItem>
                  <SelectItem value="export">Exports</SelectItem>
                  <SelectItem value="transaction">Transactions</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Input
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Access Events</CardTitle>
          <CardDescription>{events.length} events found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && page === 1 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No data access events found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Resource Type</TableHead>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <>
                        <TableRow key={event.id}>
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
                          <TableCell className="text-sm">{event.resourceType}</TableCell>
                          <TableCell className="text-sm font-mono">{event.resourceId}</TableCell>
                          <TableCell>{getActionBadge(event.action)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {JSON.stringify(event.details).substring(0, 50)}...
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(event.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50">
                              <div className="p-4 space-y-2">
                                <div>
                                  <strong>Details:</strong>
                                  <pre className="text-xs mt-1 overflow-auto max-h-32">
                                    {JSON.stringify(event.details, null, 2)}
                                  </pre>
                                </div>
                                {event.resourceSnapshot && (
                                  <div>
                                    <strong>Resource Snapshot:</strong>
                                    <pre className="text-xs mt-1 overflow-auto max-h-32">
                                      {JSON.stringify(event.resourceSnapshot, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


