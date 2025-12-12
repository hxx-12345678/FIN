"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Shield,
  Lock,
  FileText,
  CheckCircle,
  Download,
  Users,
  Database,
  Globe,
  AlertCircle,
  RefreshCw,
  Loader2,
  Eye,
  Calendar,
  TrendingUp,
  Edit,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("auth-token")
  if (token) return token
  const cookies = document.cookie.split("; ")
  const authCookie = cookies.find((row) => row.startsWith("auth-token="))
  if (authCookie) {
    return authCookie.split("=")[1]
  }
  return null
}

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface ComplianceFramework {
  name: string
  type: string
  status: "compliant" | "in-progress" | "pending" | "non-compliant"
  score: number
  requirements: number
  completed: number
  lastAudit: string | null
  nextAudit: string | null
  certificationNumber: string | null
  auditor: string | null
  description: string
}

interface SecurityControl {
  id: string
  category: string
  name: string
  description: string
  status: "enabled" | "disabled" | "partial"
  coverage: number
  lastTested?: string
  nextTest?: string
}

interface AuditLog {
  id: string
  timestamp: string
  user: string
  userName: string | null
  action: string
  objectType: string
  objectId: string
  resource: string
  status: string
  ip: string
}

interface CompliancePolicy {
  id: string
  name: string
  category: string
  description: string
  enabled: boolean
  lastUpdated: string
  version: string
  content: string
}

interface SecurityScore {
  overallScore: number
  frameworkScore: number
  controlScore: number
  frameworksCount: number
  controlsCount: number
  activeControls: number
  criticalIssues: number
}

export function CompliancePage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([])
  const [controls, setControls] = useState<Record<string, SecurityControl[]>>({})
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [policies, setPolicies] = useState<CompliancePolicy[]>([])
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null)
  const [showFrameworkDialog, setShowFrameworkDialog] = useState(false)
  const [editingFramework, setEditingFramework] = useState<ComplianceFramework | null>(null)
  const [updatingFramework, setUpdatingFramework] = useState(false)
  const [frameworkRequirements, setFrameworkRequirements] = useState<Array<{ id: string; title: string; description: string; category: string }>>([])
  const [loadingRequirements, setLoadingRequirements] = useState(false)

  // Fetch orgId
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          if (data.orgs && data.orgs.length > 0) {
            setOrgId(data.orgs[0].id)
          }
        }
      } catch (error) {
        console.error("Failed to fetch orgId:", error)
      }
    }
    fetchOrgId()
  }, [])

  // Fetch all compliance data
  useEffect(() => {
    if (orgId) {
      fetchAllData()
    }
  }, [orgId])

  const fetchAllData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      await Promise.all([
        fetchFrameworks(),
        fetchSecurityControls(),
        fetchAuditLogs(),
        fetchPolicies(),
        fetchSecurityScore(),
      ])
    } catch (error) {
      console.error("Failed to fetch compliance data:", error)
      toast.error("Failed to load compliance data")
    } finally {
      setLoading(false)
    }
  }

  const fetchFrameworks = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setFrameworks(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch frameworks:", error)
    }
  }

  const fetchSecurityControls = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/controls`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setControls(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch security controls:", error)
    }
  }

  const fetchAuditLogs = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/audit-logs?limit=100`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setAuditLogs(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    }
  }

  const fetchPolicies = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/policies`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setPolicies(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error)
    }
  }

  const fetchSecurityScore = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/security-score`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setSecurityScore(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch security score:", error)
    }
  }

  const handleExportReport = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/export`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          // Download as JSON file
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success("Compliance report exported successfully")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to export report")
      }
    } catch (error) {
      toast.error("Failed to export compliance report")
    }
  }

  const handleUpdateFramework = async (frameworkType: string, updates: Partial<ComplianceFramework>) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks/${frameworkType}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        toast.success("Framework updated successfully")
        await fetchFrameworks()
        await fetchSecurityScore()
        return true
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update framework")
        return false
      }
    } catch (error) {
      toast.error("Failed to update framework")
      return false
    }
  }

  const handleUpdateControl = async (controlId: string, updates: Partial<SecurityControl>) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/controls/${controlId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        toast.success("Security control updated successfully")
        await fetchSecurityControls()
        await fetchSecurityScore()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update control")
      }
    } catch (error) {
      toast.error("Failed to update security control")
    }
  }

  const handleUpdatePolicy = async (policyId: string, updates: Partial<CompliancePolicy>) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/policies/${policyId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        toast.success("Policy updated successfully")
        await fetchPolicies()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update policy")
      }
    } catch (error) {
      toast.error("Failed to update policy")
    }
  }

  const formatTimeAgo = (date: string | null) => {
    if (!date) return "Never"
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const overallScore = securityScore?.overallScore || 0
  const frameworksCount = securityScore?.frameworksCount || frameworks.length
  const controlsCount = securityScore?.controlsCount || Object.values(controls).flat().length
  const criticalIssues = securityScore?.criticalIssues || 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Compliance & Security</h1>
          <p className="text-muted-foreground">Maintain regulatory compliance and security standards</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-transparent w-full sm:w-auto"
            onClick={handleExportReport}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button 
            size="sm"
            onClick={fetchAllData}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
            Overall Security Score
          </CardTitle>
          <CardDescription>Your organization's security and compliance posture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Security Score</div>
              <div className={`text-xs mt-1 ${overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {overallScore >= 90 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{frameworksCount}</div>
              <div className="text-sm text-muted-foreground">Frameworks</div>
              <div className="text-xs text-blue-600 mt-1">Monitored</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{controlsCount}</div>
              <div className="text-sm text-muted-foreground">Controls</div>
              <div className="text-xs text-purple-600 mt-1">Active</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${criticalIssues === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {criticalIssues}
              </div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
              <div className={`text-xs mt-1 ${criticalIssues === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {criticalIssues === 0 ? 'All Clear' : 'Action Required'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="frameworks" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 min-w-[400px]">
            <TabsTrigger value="frameworks" className="text-xs sm:text-sm">Frameworks</TabsTrigger>
            <TabsTrigger value="controls" className="text-xs sm:text-sm">Security Controls</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs sm:text-sm">Audit Logs</TabsTrigger>
            <TabsTrigger value="policies" className="text-xs sm:text-sm">Policies</TabsTrigger>
          </TabsList>
        </div>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4 overflow-x-auto overflow-y-visible">
          {/* Instructions on how to increase framework scores */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">How to Increase Framework Scores:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click <strong>"View Details"</strong> or the <strong>Edit</strong> button on any framework card</li>
                  <li>In the dialog, update the <strong>"Completed Requirements"</strong> field</li>
                  <li>The score automatically calculates as: <strong>(Completed / Total Requirements) × 100</strong></li>
                  <li>Optionally set Status, Audit Dates, Certification Number, and Auditor</li>
                  <li>Click <strong>"Save Changes"</strong> to update the framework</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Example:</strong> For GDPR (32 requirements), set "Completed Requirements" to 30 to achieve 94% score.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {frameworks.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No compliance frameworks configured
              </div>
            ) : (
              frameworks.map((framework, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{framework.name}</CardTitle>
                      <Badge
                        variant={
                          framework.status === "compliant"
                            ? "default"
                            : framework.status === "in-progress"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {framework.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">{framework.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Compliance Score</span>
                      <span className="font-semibold">{framework.score}%</span>
                    </div>
                    <Progress value={framework.score} className="h-2" />
                    {framework.score === 0 && (
                      <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                        <strong>Tip:</strong> Click "View Details" to update completed requirements and increase the score.
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Requirements</div>
                        <div className="font-medium">
                          {framework.completed}/{framework.requirements}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Next Audit</div>
                        <div className="font-medium">
                          {framework.nextAudit ? new Date(framework.nextAudit).toLocaleDateString() : "Not scheduled"}
                        </div>
                      </div>
                    </div>
                    {framework.certificationNumber && (
                      <div className="text-sm">
                        <div className="text-muted-foreground">Certification</div>
                        <div className="font-medium">{framework.certificationNumber}</div>
                        {framework.auditor && (
                          <div className="text-xs text-muted-foreground">Auditor: {framework.auditor}</div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-transparent"
                      onClick={async () => {
                        setEditingFramework(framework)
                        setShowFrameworkDialog(true)
                        setLoadingRequirements(true)
                        try {
                          const response = await fetch(`${API_BASE_URL}/compliance/frameworks/${framework.type}/requirements`, {
                            headers: getAuthHeaders(),
                            credentials: "include",
                          })
                          if (response.ok) {
                            const data = await response.json()
                            if (data.ok && data.data) {
                              setFrameworkRequirements(data.data)
                            }
                          }
                        } catch (error) {
                          console.error("Failed to fetch requirements:", error)
                        } finally {
                          setLoadingRequirements(false)
                        }
                      }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                      onClick={async () => {
                        setEditingFramework(framework)
                        setShowFrameworkDialog(true)
                        setLoadingRequirements(true)
                        try {
                          const response = await fetch(`${API_BASE_URL}/compliance/frameworks/${framework.type}/requirements`, {
                            headers: getAuthHeaders(),
                            credentials: "include",
                          })
                          if (response.ok) {
                            const data = await response.json()
                            if (data.ok && data.data) {
                              setFrameworkRequirements(data.data)
                            }
                          }
                        } catch (error) {
                          console.error("Failed to fetch requirements:", error)
                        } finally {
                          setLoadingRequirements(false)
                        }
                      }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Security Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          {Object.keys(controls).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No security controls configured
              </CardContent>
            </Card>
          ) : (
            Object.entries(controls).map(([category, categoryControls]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryControls.map((control) => (
                      <div key={control.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          {control.status === "enabled" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : control.status === "partial" ? (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{control.name}</div>
                            <div className="text-sm text-muted-foreground">{control.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Coverage:</span>
                              <Progress value={control.coverage} className="h-1 w-24" />
                              <span className="text-xs font-medium">{control.coverage}%</span>
                            </div>
                            {control.lastTested && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Last tested: {formatTimeAgo(control.lastTested)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              control.status === "enabled" 
                                ? "default" 
                                : control.status === "partial"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {control.status}
                          </Badge>
                          <Switch
                            checked={control.status === "enabled"}
                            onCheckedChange={(checked) => {
                              handleUpdateControl(control.id, {
                                status: checked ? "enabled" : "disabled",
                              })
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>Complete log of system activities and user actions</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAuditLogs}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.user}</div>
                              {log.userName && (
                                <div className="text-xs text-muted-foreground">{log.userName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell className="font-mono text-xs">{log.resource}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No compliance policies configured
              </div>
            ) : (
              policies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {policy.category === 'data-protection' && <Database className="h-5 w-5" />}
                        {policy.category === 'access-control' && <Lock className="h-5 w-5" />}
                        {policy.category === 'backup-recovery' && <Database className="h-5 w-5" />}
                        {policy.category === 'privacy' && <Globe className="h-5 w-5" />}
                        {policy.category === 'incident-response' && <Shield className="h-5 w-5" />}
                        {policy.name}
                      </CardTitle>
                      <Badge variant={policy.enabled ? "default" : "outline"}>
                        {policy.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{policy.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-1">Policy Content</div>
                      <div className="p-3 bg-muted rounded-lg text-xs font-mono">
                        {policy.content}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-muted-foreground">Version</div>
                        <div className="font-medium">{policy.version}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Updated</div>
                        <div className="font-medium">{formatTimeAgo(policy.lastUpdated)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enabled</Label>
                        <p className="text-xs text-muted-foreground">Policy is active</p>
                      </div>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={(checked) => {
                          handleUpdatePolicy(policy.id, { enabled: checked })
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Framework Details Dialog */}
      <Dialog open={showFrameworkDialog} onOpenChange={setShowFrameworkDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-5 w-5" />
              <span className="text-sm sm:text-base">{editingFramework?.name || "Framework Details"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingFramework?.description || "View and update compliance framework details"}
            </DialogDescription>
          </DialogHeader>

          {editingFramework && (
            <div className="space-y-6 py-4">
              {/* Current Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Compliance Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{editingFramework.score}%</div>
                    <Progress value={editingFramework.score} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {editingFramework.completed}/{editingFramework.requirements}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {Math.round((editingFramework.completed / editingFramework.requirements) * 100)}% Complete
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Update Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editingFramework.status}
                      onChange={(e) => setEditingFramework({
                        ...editingFramework,
                        status: e.target.value as any
                      })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="compliant">Compliant</option>
                      <option value="non-compliant">Non-Compliant</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Completed Requirements</Label>
                    <Input
                      type="number"
                      min="0"
                      max={editingFramework.requirements}
                      value={editingFramework.completed}
                      onChange={(e) => {
                        const completed = parseInt(e.target.value) || 0
                        const score = editingFramework.requirements > 0
                          ? Math.round((completed / editingFramework.requirements) * 100)
                          : 0
                        setEditingFramework({
                          ...editingFramework,
                          completed,
                          score
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Last Audit Date</Label>
                    <Input
                      type="date"
                      value={editingFramework.lastAudit ? new Date(editingFramework.lastAudit).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingFramework({
                        ...editingFramework,
                        lastAudit: e.target.value ? new Date(e.target.value).toISOString() : null
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Audit Date</Label>
                    <Input
                      type="date"
                      value={editingFramework.nextAudit ? new Date(editingFramework.nextAudit).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingFramework({
                        ...editingFramework,
                        nextAudit: e.target.value ? new Date(e.target.value).toISOString() : null
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Certification Number</Label>
                    <Input
                      value={editingFramework.certificationNumber || ''}
                      onChange={(e) => setEditingFramework({
                        ...editingFramework,
                        certificationNumber: e.target.value || null
                      })}
                      placeholder="Enter certification number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auditor</Label>
                    <Input
                      value={editingFramework.auditor || ''}
                      onChange={(e) => setEditingFramework({
                        ...editingFramework,
                        auditor: e.target.value || null
                      })}
                      placeholder="Enter auditor name"
                    />
                  </div>
                </div>
              </div>

              {/* Framework Requirements List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Framework Requirements</CardTitle>
                  <CardDescription>
                    Detailed list of all requirements for {editingFramework.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRequirements ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading requirements...</p>
                    </div>
                  ) : frameworkRequirements.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {frameworkRequirements.map((req, index) => (
                        <div
                          key={req.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-muted-foreground">{req.id}</span>
                                <Badge variant="outline" className="text-xs">
                                  {req.category}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-sm">{req.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No requirements found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          if (!editingFramework) return
                          setLoadingRequirements(true)
                          try {
                            const response = await fetch(`${API_BASE_URL}/compliance/frameworks/${editingFramework.type}/requirements`, {
                              headers: getAuthHeaders(),
                              credentials: "include",
                            })
                            if (response.ok) {
                              const data = await response.json()
                              if (data.ok && data.data) {
                                setFrameworkRequirements(data.data)
                              }
                            }
                          } catch (error) {
                            console.error("Failed to fetch requirements:", error)
                            toast.error("Failed to load requirements")
                          } finally {
                            setLoadingRequirements(false)
                          }
                        }}
                      >
                        Load Requirements
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Framework Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Framework Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {editingFramework.type.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Total Requirements:</span> {editingFramework.requirements}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span> {editingFramework.description}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFrameworkDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingFramework || !orgId) return
                setUpdatingFramework(true)
                try {
                  const success = await handleUpdateFramework(editingFramework.type, {
                    status: editingFramework.status,
                    completed: editingFramework.completed,
                    score: editingFramework.score,
                    lastAudit: editingFramework.lastAudit,
                    nextAudit: editingFramework.nextAudit,
                    certificationNumber: editingFramework.certificationNumber,
                    auditor: editingFramework.auditor,
                  })
                  if (success) {
                    setShowFrameworkDialog(false)
                  }
                } catch (error) {
                  console.error("Failed to update framework:", error)
                } finally {
                  setUpdatingFramework(false)
                }
              }}
              disabled={updatingFramework}
            >
              {updatingFramework ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
