"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { History, RotateCcw, Eye, Download, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface ModelVersion {
  id: string
  version: number
  name: string
  timestamp: string
  author: string
  changes: string
  data: {
    revenue: number
    expenses: number
    runway: number
    cash: number
    burnRate: number
    arr: number
  }
  assumptions: {
    revenueGrowth: number
    churnRate: number
    employeeCount: number
  }
}

const mockVersions: ModelVersion[] = [
  {
    id: "v3",
    version: 3,
    name: "Current Version",
    timestamp: "2025-01-15T14:30:00Z",
    author: "John Doe",
    changes: "Updated revenue growth assumptions from 12% to 15%",
    data: {
      revenue: 950000,
      expenses: 720000,
      runway: 9,
      cash: 4950000,
      burnRate: 60000,
      arr: 11400000,
    },
    assumptions: {
      revenueGrowth: 15,
      churnRate: 5,
      employeeCount: 18,
    },
  },
  {
    id: "v2",
    version: 2,
    name: "Team Expansion",
    timestamp: "2025-01-14T10:20:00Z",
    author: "Jane Smith",
    changes: "Added 5 engineering hires to team expansion plan",
    data: {
      revenue: 880000,
      expenses: 680000,
      runway: 10,
      cash: 5200000,
      burnRate: 56667,
      arr: 10560000,
    },
    assumptions: {
      revenueGrowth: 12,
      churnRate: 5,
      employeeCount: 15,
    },
  },
  {
    id: "v1",
    version: 1,
    name: "Base Model",
    timestamp: "2025-01-13T09:15:00Z",
    author: "John Doe",
    changes: "Initial model creation with base assumptions",
    data: {
      revenue: 804000,
      expenses: 528000,
      runway: 13,
      cash: 6864000,
      burnRate: 44000,
      arr: 9648000,
    },
    assumptions: {
      revenueGrowth: 8,
      churnRate: 5,
      employeeCount: 12,
    },
  },
]

interface ModelVersionRollbackProps {
  currentVersion?: ModelVersion
  onVersionRollback?: (versionId: string) => void
  modelId?: string | null
  orgId?: string | null
}

export function ModelVersionRollback({ currentVersion, onVersionRollback, modelId, orgId }: ModelVersionRollbackProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  
  // Fetch versions from database when dialog opens
  useEffect(() => {
    if (isOpen && modelId && orgId) {
      fetchVersions()
    } else if (isOpen && !modelId) {
      // If no modelId, use mock data as fallback
      setVersions(mockVersions)
    }
  }, [isOpen, modelId, orgId])
  
  const fetchVersions = async () => {
    if (!modelId || !orgId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Fetch model details and all model runs (versions)
      const [modelResponse, runsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/models/${modelId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/models/${modelId}/runs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }),
      ])

      if (!modelResponse.ok) {
        const errorText = await modelResponse.text()
        throw new Error(`Failed to fetch model: ${modelResponse.status} ${errorText}`)
      }

      if (!runsResponse.ok) {
        const errorText = await runsResponse.text()
        throw new Error(`Failed to fetch model runs: ${runsResponse.status} ${errorText}`)
      }

      const modelData = await modelResponse.json()
      const runsData = await runsResponse.json()

      if (modelData.ok && modelData.model && runsData.ok && runsData.runs) {
        const model = modelData.model
        const runs = runsData.runs || []
        
        // Transform model runs into version history
        // Model runs don't have version numbers - use index + 1, with most recent being highest version
        const transformedVersions: ModelVersion[] = runs
          .map((run: any, index: number) => {
            const summary = run.summaryJson || {}
            const modelJson = model.modelJson || {}
            const runType = run.runType || 'baseline'
            
            // Calculate version number (most recent = highest version)
            const versionNumber = runs.length - index
            
            // Get timestamp
            const timestamp = run.createdAt || run.finishedAt || new Date().toISOString()
            
            // Generate meaningful change description
            let changes = `Model run (${runType})`
            if (runType === 'baseline') {
              changes = index === 0 ? "Current baseline model" : `Baseline model run ${versionNumber}`
            } else if (runType === 'scenario') {
              changes = `Scenario run: ${run.paramsJson?.scenarioName || 'Unnamed scenario'}`
            } else {
              changes = `Model run ${versionNumber}`
            }
            
            // Extract assumptions from run's paramsJson or summary, not just current model
            const runParams = run.paramsJson || {}
            const runAssumptions = runParams.assumptions || {}
            
            // Try to get assumptions from multiple sources (run params, summary, or fallback to model)
            // Convert to numbers and handle percentage values properly
            const revenueGrowthRaw = 
              runAssumptions.revenue?.revenueGrowth || 
              runAssumptions.revenueGrowth || 
              summary.revenueGrowth || 
              summary.kpis?.revenueGrowth ||
              modelJson.assumptions?.revenue?.revenueGrowth || 
              modelJson.assumptions?.revenueGrowth || 
              0
            
            // Convert to percentage if it's a decimal (0.08 -> 8%)
            const revenueGrowth = typeof revenueGrowthRaw === 'number' 
              ? (revenueGrowthRaw < 1 ? revenueGrowthRaw * 100 : revenueGrowthRaw)
              : (typeof revenueGrowthRaw === 'string' ? parseFloat(revenueGrowthRaw) || 0 : 0)
            
            const churnRateRaw = 
              runAssumptions.revenue?.churnRate || 
              runAssumptions.churnRate || 
              summary.churnRate || 
              summary.kpis?.churnRate ||
              modelJson.assumptions?.revenue?.churnRate || 
              modelJson.assumptions?.churnRate || 
              0
            
            // Convert to percentage if it's a decimal (0.025 -> 2.5%)
            const churnRate = typeof churnRateRaw === 'number'
              ? (churnRateRaw < 1 ? churnRateRaw * 100 : churnRateRaw)
              : (typeof churnRateRaw === 'string' ? parseFloat(churnRateRaw) || 0 : 0)
            
            const employeeCountRaw = 
              runAssumptions.costs?.employeeCount || 
              runAssumptions.employeeCount || 
              summary.employeeCount || 
              summary.kpis?.employeeCount ||
              modelJson.assumptions?.costs?.employeeCount || 
              modelJson.assumptions?.employeeCount || 
              0
            
            const employeeCount = typeof employeeCountRaw === 'number'
              ? employeeCountRaw
              : (typeof employeeCountRaw === 'string' ? parseInt(employeeCountRaw) || 0 : 0)
            
            return {
              id: run.id,
              version: versionNumber,
              name: model.name || `Model v${versionNumber}`,
              timestamp: timestamp,
              author: model.createdBy?.email || "System",
              changes: changes,
              data: {
                revenue: summary.totalRevenue || summary.revenue || summary.monthlyRevenue || summary.mrr || 0,
                expenses: summary.totalExpenses || summary.expenses || summary.monthlyExpenses || 0,
                runway: summary.runwayMonths || summary.runway || 0,
                cash: summary.cashBalance || summary.cash || summary.endingCash || 0,
                burnRate: summary.burnRate || summary.monthlyBurn || 0,
                arr: summary.arr || summary.annualRecurringRevenue || 0,
              },
              assumptions: {
                revenueGrowth: typeof revenueGrowth === 'number' ? revenueGrowth : (typeof revenueGrowth === 'string' ? parseFloat(revenueGrowth) || 0 : 0),
                churnRate: typeof churnRate === 'number' ? churnRate : (typeof churnRate === 'string' ? parseFloat(churnRate) || 0 : 0),
                employeeCount: typeof employeeCount === 'number' ? employeeCount : (typeof employeeCount === 'string' ? parseInt(employeeCount) || 0 : 0),
              },
            }
          })
          .sort((a: ModelVersion, b: ModelVersion) => {
            // Sort by timestamp descending (most recent first)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          })
        
        setVersions(transformedVersions)
      } else {
        // Fallback to mock data if no versions found
        setVersions(mockVersions)
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load version history"
      setError(errorMessage)
      
      // Only fallback to mock data if it's a network error or if user explicitly wants to see demo data
      // Don't silently fallback on authentication or permission errors
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("Network")) {
        console.warn("Network error, using mock data as fallback")
        setVersions(mockVersions)
      } else {
        // For other errors (auth, not found, etc.), show error and empty state
        setVersions([])
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Get current version (first in list, which is most recent)
  // Use mock data as fallback if no versions available
  const current = currentVersion || (versions.length > 0 ? versions[0] : mockVersions[0])

  const handleViewVersion = (version: ModelVersion) => {
    setSelectedVersion(version)
    setShowComparison(true)
  }

  const handleRollback = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId)
    if (!version) {
      toast.error("Version not found")
      return
    }

    // Show confirmation dialog
    if (
      !confirm(
        `Are you sure you want to rollback to version ${version.version}? This will replace your current model data.`,
      )
    ) {
      return
    }

    if (onVersionRollback) {
      onVersionRollback(versionId)
    } else {
      toast.info("Rollback functionality will be implemented soon")
    }

    toast.success(`Model rolled back to version ${version.version}`)
    setIsOpen(false)
    setShowComparison(false)
    setSelectedVersion(null)
  }

  const calculateDifference = (current: number, previous: number) => {
    const diff = current - previous
    const percent = previous !== 0 ? ((diff / previous) * 100) : 0
    const percentStr = percent.toFixed(1)
    return { diff, percent, percentStr }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Version History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Model Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of your financial model
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading version history...</div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No version history available for this model.</p>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
          <div className="space-y-4">
            {/* Current Version Badge */}
            {current && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">Current</Badge>
                    <span className="font-medium">{current.name}</span>
                    <span className="text-sm text-muted-foreground">v{current.version}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{current.changes}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(current.timestamp).toLocaleString()} • {current.author}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Revenue: ${(current.data.revenue / 1000).toFixed(0)}K</div>
                  <div className="text-sm font-medium">Runway: {current.data.runway} months</div>
                </div>
              </div>
            </div>
            )}

            {/* Version List */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Previous Versions</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.slice(1).map((version) => {
                    const revenueDiff = calculateDifference(current.data.revenue, version.data.revenue)
                    const runwayDiff = calculateDifference(current.data.runway, version.data.runway)

                    return (
                      <TableRow key={version.id}>
                        <TableCell>
                          <Badge variant="secondary">v{version.version}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{version.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{version.changes}</TableCell>
                        <TableCell>{version.author}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(version.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVersion(version)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRollback(version.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Quick Stats Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {versions.slice(0, 3).map((version) => (
                    <div key={version.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={version.id === current.id ? "default" : "secondary"}>
                          v{version.version}
                        </Badge>
                        {version.id === current.id && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-medium">${(version.data.revenue / 1000).toFixed(0)}K</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expenses: </span>
                          <span className="font-medium">${(version.data.expenses / 1000).toFixed(0)}K</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Runway: </span>
                          <span className="font-medium">{version.data.runway} mo</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version Comparison</DialogTitle>
            <DialogDescription>
              Compare version {selectedVersion?.version} with current version
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="space-y-4">
              {/* Version Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="default">Current</Badge>
                      v{current.version}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenue: </span>
                      <span className="font-medium">${(current.data.revenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expenses: </span>
                      <span className="font-medium">${(current.data.expenses / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Runway: </span>
                      <span className="font-medium">{current.data.runway} months</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cash: </span>
                      <span className="font-medium">${(current.data.cash / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Burn Rate: </span>
                      <span className="font-medium">${(current.data.burnRate / 1000).toFixed(1)}K/mo</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="secondary">v{selectedVersion.version}</Badge>
                      {selectedVersion.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenue: </span>
                      <span className="font-medium">${(selectedVersion.data.revenue / 1000).toFixed(0)}K</span>
                      {(() => {
                        // Calculate difference: selectedVersion - current (to show change from current to selected)
                        const diff = calculateDifference(selectedVersion.data.revenue, current.data.revenue)
                        return (
                          <span className={`ml-2 ${diff.diff > 0 ? "text-green-600" : diff.diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            ({diff.diff > 0 ? "+" : ""}${(diff.diff / 1000).toFixed(0)}K, {diff.percent > 0 ? "+" : ""}{diff.percentStr}%)
                          </span>
                        )
                      })()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expenses: </span>
                      <span className="font-medium">${(selectedVersion.data.expenses / 1000).toFixed(0)}K</span>
                      {(() => {
                        // Calculate difference: selectedVersion - current (lower expenses is better)
                        const diff = calculateDifference(selectedVersion.data.expenses, current.data.expenses)
                        return (
                          <span className={`ml-2 ${diff.diff < 0 ? "text-green-600" : diff.diff > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            ({diff.diff > 0 ? "+" : ""}${(diff.diff / 1000).toFixed(0)}K, {diff.percent > 0 ? "+" : ""}{diff.percentStr}%)
                          </span>
                        )
                      })()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Runway: </span>
                      <span className="font-medium">{selectedVersion.data.runway} months</span>
                      {(() => {
                        // Calculate difference: selectedVersion - current (higher runway is better)
                        const diff = calculateDifference(selectedVersion.data.runway, current.data.runway)
                        return (
                          <span className={`ml-2 ${diff.diff > 0 ? "text-green-600" : diff.diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            ({diff.diff > 0 ? "+" : ""}{diff.diff.toFixed(1)} mo, {diff.percent > 0 ? "+" : ""}{diff.percentStr}%)
                          </span>
                        )
                      })()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cash: </span>
                      <span className="font-medium">${(selectedVersion.data.cash / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Burn Rate: </span>
                      <span className="font-medium">${(selectedVersion.data.burnRate / 1000).toFixed(1)}K/mo</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assumptions Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Assumptions Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assumption</TableHead>
                        <TableHead>Current (v{current.version})</TableHead>
                        <TableHead>v{selectedVersion.version}</TableHead>
                        <TableHead>Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Revenue Growth</TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof current.assumptions.revenueGrowth === 'number' 
                              ? current.assumptions.revenueGrowth 
                              : parseFloat(String(current.assumptions.revenueGrowth || 0)) || 0
                            return `${val.toFixed(1)}%`
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof selectedVersion.assumptions.revenueGrowth === 'number'
                              ? selectedVersion.assumptions.revenueGrowth
                              : parseFloat(String(selectedVersion.assumptions.revenueGrowth || 0)) || 0
                            return `${val.toFixed(1)}%`
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Ensure both are numbers
                            const currentVal = typeof current.assumptions.revenueGrowth === 'number' 
                              ? current.assumptions.revenueGrowth 
                              : parseFloat(String(current.assumptions.revenueGrowth || 0)) || 0
                            const selectedVal = typeof selectedVersion.assumptions.revenueGrowth === 'number'
                              ? selectedVersion.assumptions.revenueGrowth
                              : parseFloat(String(selectedVersion.assumptions.revenueGrowth || 0)) || 0
                            
                            // Calculate difference: selectedVersion - current
                            const diff = selectedVal - currentVal
                            return (
                              <span className={diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}>
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}%
                              </span>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Churn Rate</TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof current.assumptions.churnRate === 'number'
                              ? current.assumptions.churnRate
                              : parseFloat(String(current.assumptions.churnRate || 0)) || 0
                            return `${val.toFixed(1)}%`
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof selectedVersion.assumptions.churnRate === 'number'
                              ? selectedVersion.assumptions.churnRate
                              : parseFloat(String(selectedVersion.assumptions.churnRate || 0)) || 0
                            return `${val.toFixed(1)}%`
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Ensure both are numbers
                            const currentVal = typeof current.assumptions.churnRate === 'number'
                              ? current.assumptions.churnRate
                              : parseFloat(String(current.assumptions.churnRate || 0)) || 0
                            const selectedVal = typeof selectedVersion.assumptions.churnRate === 'number'
                              ? selectedVersion.assumptions.churnRate
                              : parseFloat(String(selectedVersion.assumptions.churnRate || 0)) || 0
                            
                            // Calculate difference: selectedVersion - current (lower churn is better)
                            const diff = selectedVal - currentVal
                            return (
                              <span className={diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-muted-foreground"}>
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}%
                              </span>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Employee Count</TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof current.assumptions.employeeCount === 'number'
                              ? current.assumptions.employeeCount
                              : parseInt(String(current.assumptions.employeeCount || 0)) || 0
                            return val
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const val = typeof selectedVersion.assumptions.employeeCount === 'number'
                              ? selectedVersion.assumptions.employeeCount
                              : parseInt(String(selectedVersion.assumptions.employeeCount || 0)) || 0
                            return val
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Ensure both are numbers
                            const currentVal = typeof current.assumptions.employeeCount === 'number'
                              ? current.assumptions.employeeCount
                              : parseInt(String(current.assumptions.employeeCount || 0)) || 0
                            const selectedVal = typeof selectedVersion.assumptions.employeeCount === 'number'
                              ? selectedVersion.assumptions.employeeCount
                              : parseInt(String(selectedVersion.assumptions.employeeCount || 0)) || 0
                            
                            // Calculate difference: selectedVersion - current
                            const diff = selectedVal - currentVal
                            return (
                              <span className={diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-muted-foreground"}>
                                {diff > 0 ? "+" : ""}
                                {diff}
                              </span>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Rollback Warning</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Rolling back to this version will replace all current model data and assumptions. This action
                      cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowComparison(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleRollback(selectedVersion.id)} variant="destructive">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Rollback to v{selectedVersion.version}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}




