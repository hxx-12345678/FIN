"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { History, Eye, RotateCcw, Loader2 } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface VersionHistory {
  version: number
  timestamp: string
  author: string
  changes: string
  data: {
    revenue: number
    expenses: number
    runway: number
  }
}

const mockHistory: VersionHistory[] = [
  {
    version: 3,
    timestamp: "2025-01-15T14:30:00Z",
    author: "John Doe",
    changes: "Updated revenue growth assumptions from 12% to 15%",
    data: { revenue: 950000, expenses: 720000, runway: 9 },
  },
  {
    version: 2,
    timestamp: "2025-01-14T10:20:00Z",
    author: "Jane Smith",
    changes: "Added 5 engineering hires to team expansion plan",
    data: { revenue: 880000, expenses: 680000, runway: 10 },
  },
  {
    version: 1,
    timestamp: "2025-01-13T09:15:00Z",
    author: "John Doe",
    changes: "Initial scenario creation with base assumptions",
    data: { revenue: 804000, expenses: 528000, runway: 13 },
  },
]

interface ScenarioVersionHistoryProps {
  modelId?: string
  orgId?: string | null
}

export function ScenarioVersionHistory({ modelId, orgId }: ScenarioVersionHistoryProps) {
  const [history, setHistory] = useState<VersionHistory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (modelId && orgId) {
      fetchHistory()
    }
  }, [modelId, orgId])

  const fetchHistory = async () => {
    if (!modelId || !orgId) return

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

      const response = await fetch(`${API_BASE_URL}/models/${modelId}/scenarios?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.scenarios) {
          // Transform scenarios to version history format
          const transformed = result.scenarios
            .map((s: any, index: number) => {
              const summary = typeof s.summary === 'string' ? JSON.parse(s.summary) : (s.summary || {})
              return {
                version: result.scenarios.length - index,
                timestamp: s.createdAt,
                author: "System",
                changes: `${s.scenarioType || "adhoc"} scenario: ${s.scenarioName || s.name || "Unnamed"}`,
                data: {
                  revenue: summary.totalRevenue || summary.revenue || summary.mrr || 0,
                  expenses: summary.totalExpenses || summary.expenses || 0,
                  runway: summary.runwayMonths || summary.runway || 0,
                },
              }
            })
          setHistory(transformed)
        }
      }
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>Track changes and restore previous versions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !modelId || !orgId ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Please select a model to view version history</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No scenario history found. Create scenarios to see version history here.</p>
          </div>
        ) : (
        <div className="space-y-4">
          {history.map((version, index) => (
            <div key={version.version} className="relative pl-8 pb-4 border-l-2 border-muted last:border-l-0">
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />

              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      v{version.version}
                      {index === 0 && " (Current)"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">{version.changes}</p>
                  <p className="text-xs text-muted-foreground">By {version.author}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {index !== 0 && (
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-2 p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="font-semibold text-sm">${(version.data.revenue / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Expenses</div>
                  <div className="font-semibold text-sm">${(version.data.expenses / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Runway</div>
                  <div className="font-semibold text-sm">{version.data.runway} mo</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
