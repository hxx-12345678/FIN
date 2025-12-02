"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Clock, Search, Download, Filter } from "lucide-react"

interface AuditLogEntry {
  id: string
  integration: string
  timestamp: string
  status: "success" | "failed" | "partial"
  rowsImported: number
  duration: string
  triggeredBy: "scheduled" | "manual" | "api"
  user?: string
  errors?: string[]
}

export function SyncAuditLog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterIntegration, setFilterIntegration] = useState("all")

  const auditLogs: AuditLogEntry[] = [
    {
      id: "1",
      integration: "QuickBooks Online",
      timestamp: "2024-01-15 02:00:00",
      status: "success",
      rowsImported: 156,
      duration: "2m 34s",
      triggeredBy: "scheduled",
    },
    {
      id: "2",
      integration: "Stripe",
      timestamp: "2024-01-15 02:00:00",
      status: "success",
      rowsImported: 89,
      duration: "1m 12s",
      triggeredBy: "scheduled",
    },
    {
      id: "3",
      integration: "QuickBooks Online",
      timestamp: "2024-01-14 14:30:00",
      status: "success",
      rowsImported: 142,
      duration: "2m 18s",
      triggeredBy: "manual",
      user: "John Doe",
    },
    {
      id: "4",
      integration: "Xero",
      timestamp: "2024-01-14 02:00:00",
      status: "failed",
      rowsImported: 0,
      duration: "0m 15s",
      triggeredBy: "scheduled",
      errors: ["Authentication failed", "Invalid API credentials"],
    },
    {
      id: "5",
      integration: "Razorpay",
      timestamp: "2024-01-13 16:45:00",
      status: "partial",
      rowsImported: 45,
      duration: "1m 45s",
      triggeredBy: "manual",
      user: "Jane Smith",
      errors: ["Some transactions failed to import"],
    },
  ]

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.integration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || log.status === filterStatus
    const matchesIntegration = filterIntegration === "all" || log.integration === filterIntegration
    return matchesSearch && matchesStatus && matchesIntegration
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "partial":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      default:
        return null
    }
  }

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>
      case "manual":
        return <Badge variant="outline">Manual</Badge>
      case "api":
        return <Badge variant="outline">API</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Audit Log</CardTitle>
            <CardDescription>Complete history of all data synchronization activities</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export Log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by integration or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterIntegration} onValueChange={setFilterIntegration}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Integration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrations</SelectItem>
              <SelectItem value="QuickBooks Online">QuickBooks</SelectItem>
              <SelectItem value="Stripe">Stripe</SelectItem>
              <SelectItem value="Xero">Xero</SelectItem>
              <SelectItem value="Razorpay">Razorpay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.status)}
                  <div>
                    <h3 className="font-medium">{log.integration}</h3>
                    <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status)}
                  {getTriggerBadge(log.triggeredBy)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Rows Imported</p>
                  <p className="font-medium">{log.rowsImported}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{log.duration}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Triggered By</p>
                  <p className="font-medium capitalize">{log.triggeredBy}</p>
                </div>
                {log.user && (
                  <div>
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium">{log.user}</p>
                  </div>
                )}
              </div>

              {log.errors && log.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <p className="font-medium mb-1">Errors:</p>
                  {log.errors.map((error, idx) => (
                    <div key={idx}>• {error}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit logs found matching your filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
