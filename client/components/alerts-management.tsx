"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  Bell,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  Clock,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Activity,
  CheckCircle,
  Volume2,
  VolumeX,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"
import { toast } from "sonner"

interface AlertRule {
  id: string
  name: string
  description?: string
  metric: string
  operator: ">" | "<" | "=" | ">=" | "<=" | "==" | "!="
  threshold: number
  enabled: boolean
  notifyEmail: boolean
  notifySlack: boolean
  slackWebhook?: string
  lastTriggered?: string | Date
  createdBy?: {
    id: string
    name: string
    email: string
  }
  createdAt: string | Date
  updatedAt: string | Date
}

interface AlertHistory {
  id: string
  alertId: string
  alertName: string
  triggeredAt: Date
  metric: string
  actualValue: string
  threshold: string
  message: string
  acknowledged: boolean
}

const metrics = [
  { value: "runway_months", label: "Cash Runway (months)", icon: Clock },
  { value: "cash_balance", label: "Cash Balance", icon: DollarSign },
  { value: "burn_rate", label: "Burn Rate", icon: TrendingDown },
  { value: "revenue_growth", label: "Revenue Growth %", icon: Activity },
  { value: "expense_growth", label: "Expense Growth %", icon: TrendingDown },
  { value: "net_income", label: "Net Income", icon: TrendingUp },
]

// Map backend metric names to display names
const getMetricLabel = (metric: string): string => {
  const found = metrics.find(m => m.value === metric)
  return found ? found.label : metric
}

export function AlertsManagement() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([])

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null)
  const [alertForm, setAlertForm] = useState({
    name: "",
    description: "",
    metric: "",
    operator: "<" as AlertRule["operator"],
    threshold: "",
    notifyEmail: true,
    notifySlack: false,
    slackWebhook: "",
  })

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

  // Fetch alerts when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchAlerts()
      fetchAlertHistory()
    }
  }, [orgId])

  const fetchAlerts = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alerts`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.alerts) {
          setAlerts(data.alerts)
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to fetch alerts")
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
      toast.error("Failed to load alerts")
    } finally {
      setLoading(false)
    }
  }

  const fetchAlertHistory = async () => {
    if (!orgId) return
    try {
      // Use compliance audit logs endpoint to show alert triggers
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/audit-logs?action=alert_triggered&limit=50`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          // Transform audit logs to alert history format
          const history: AlertHistory[] = data.data.map((log: any, index: number) => {
            const meta = typeof log.metaJson === 'string' ? JSON.parse(log.metaJson) : log.metaJson || {}
            return {
              id: log.id || `h${index}`,
              alertId: log.objectId || '',
              alertName: meta.alertName || meta.name || 'Unknown Alert',
              triggeredAt: new Date(log.createdAt),
              metric: meta.metric || 'Unknown',
              actualValue: meta.actualValue || meta.value || 'N/A',
              threshold: meta.threshold || 'N/A',
              message: meta.message || `Alert "${meta.alertName || meta.name || 'Unknown'}" triggered: ${meta.metric || 'Unknown'} ${meta.operator || ''} ${meta.threshold || ''}`,
              acknowledged: false, // Audit logs don't track acknowledgment
            }
          })
          setAlertHistory(history)
        }
      } else {
        // If audit logs endpoint doesn't exist or fails, show empty state
        setAlertHistory([])
      }
    } catch (error) {
      console.error("Failed to fetch alert history:", error)
      // Don't show error toast for history as it's optional - just show empty state
      setAlertHistory([])
    }
  }

  const handleCreateAlert = async () => {
    if (!orgId) return
    
    if (!alertForm.name || !alertForm.metric || !alertForm.threshold) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alerts`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: alertForm.name,
          description: alertForm.description || undefined,
          metric: alertForm.metric,
          operator: alertForm.operator,
          threshold: Number(alertForm.threshold),
          notifyEmail: alertForm.notifyEmail,
          notifySlack: alertForm.notifySlack,
          slackWebhook: alertForm.slackWebhook || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.alert) {
          toast.success("Alert created successfully")
          setShowCreateDialog(false)
          resetForm()
          fetchAlerts()
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to create alert")
      }
    } catch (error) {
      console.error("Failed to create alert:", error)
      toast.error("Failed to create alert")
    }
  }

  const handleUpdateAlert = async () => {
    if (!editingAlert || !orgId) return

    if (!alertForm.name || !alertForm.metric || !alertForm.threshold) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${editingAlert.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: alertForm.name,
          description: alertForm.description || undefined,
          metric: alertForm.metric,
          operator: alertForm.operator,
          threshold: Number(alertForm.threshold),
          notifyEmail: alertForm.notifyEmail,
          notifySlack: alertForm.notifySlack,
          slackWebhook: alertForm.slackWebhook || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.alert) {
          toast.success("Alert updated successfully")
          setEditingAlert(null)
          resetForm()
          fetchAlerts()
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update alert")
      }
    } catch (error) {
      console.error("Failed to update alert:", error)
      toast.error("Failed to update alert")
    }
  }

  const handleDeleteAlert = async (id: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Alert deleted successfully")
        fetchAlerts()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to delete alert")
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
      toast.error("Failed to delete alert")
    }
  }

  const handleToggleAlert = async (id: string) => {
    const alert = alerts.find(a => a.id === id)
    if (!alert) return

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          enabled: !alert.enabled,
        }),
      })

      if (response.ok) {
        toast.success(`Alert ${!alert.enabled ? 'enabled' : 'disabled'}`)
        fetchAlerts()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update alert")
      }
    } catch (error) {
      console.error("Failed to toggle alert:", error)
      toast.error("Failed to update alert")
    }
  }

  const handleEditAlert = (alert: AlertRule) => {
    setEditingAlert(alert)
    setAlertForm({
      name: alert.name,
      description: alert.description || "",
      metric: alert.metric,
      operator: alert.operator,
      threshold: alert.threshold.toString(),
      notifyEmail: alert.notifyEmail,
      notifySlack: alert.notifySlack,
      slackWebhook: alert.slackWebhook || "",
    })
  }

  const resetForm = () => {
    setAlertForm({
      name: "",
      description: "",
      metric: "",
      operator: "<",
      threshold: "",
      notifyEmail: true,
      notifySlack: false,
      slackWebhook: "",
    })
  }

  const getMetricIcon = (metricValue: string) => {
    const metric = metrics.find((m) => m.value === metricValue)
    return metric?.icon || AlertTriangle
  }

  const getOperatorSymbol = (operator: AlertRule["operator"]) => {
    return operator
  }

  const triggeredThisWeek = alertHistory.filter(
    (h) => new Date(h.triggeredAt) > new Date(Date.now() - 86400000 * 7),
  ).length

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Custom Alerts & Triggers</h1>
          <p className="text-sm md:text-base text-muted-foreground">Create automated alerts for key financial metrics</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Create Alert</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter((a) => a.enabled).length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Triggered This Week</p>
                <p className="text-2xl font-bold">{triggeredThisWeek}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disabled Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter((a) => !a.enabled).length}</p>
              </div>
              <VolumeX className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
          <TabsTrigger value="history">
            Alert History
            {alertHistory.filter((h) => !h.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alertHistory.filter((h) => !h.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Alert Rules</CardTitle>
                  <CardDescription>
                    Manage automated alerts for key financial metrics.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first alert to get notified about important metric changes
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Alert
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => {
                    const MetricIcon = getMetricIcon(alert.metric)
                    const lastTriggered = alert.lastTriggered ? new Date(alert.lastTriggered) : null
                    return (
                      <Card key={alert.id} className={!alert.enabled ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <MetricIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{alert.name}</h3>
                                  {!alert.enabled && (
                                    <Badge variant="outline" className="text-xs">
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                                {alert.description && (
                                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 text-sm">
                                  <Badge variant="outline">
                                    {getMetricLabel(alert.metric)}{" "}
                                    {getOperatorSymbol(alert.operator)} {alert.threshold}
                                  </Badge>
                                  <div className="flex gap-1">
                                    {alert.notifyEmail && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Mail className="h-3 w-3 mr-1" />
                                        Email
                                      </Badge>
                                    )}
                                    {alert.notifySlack && (
                                      <Badge variant="secondary" className="text-xs">
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        Slack
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {alert.createdBy && (
                                    <span>Created by {alert.createdBy.name || alert.createdBy.email}</span>
                                  )}
                                  {lastTriggered && (
                                    <span>Last triggered {lastTriggered.toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={alert.enabled} onCheckedChange={() => handleToggleAlert(alert.id)} />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditAlert(alert)}
                                className="bg-transparent"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>View past alert triggers and acknowledge notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {alertHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No alert history</h3>
                  <p className="text-sm text-muted-foreground">Alert triggers will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertHistory.map((history) => (
                    <div
                      key={history.id}
                      className={`p-4 border rounded-lg ${
                        !history.acknowledged ? "bg-red-50 border-red-200" : "bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {history.acknowledged ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{history.alertName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {history.metric}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{history.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Triggered {history.triggeredAt.toLocaleString()}</span>
                              <span>
                                Actual: {history.actualValue} | Threshold: {history.threshold}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!history.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAlertHistory(
                                alertHistory.map((h) => (h.id === history.id ? { ...h, acknowledged: true } : h)),
                              )
                            }}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Alert Dialog */}
      <Dialog
        open={showCreateDialog || editingAlert !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setEditingAlert(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAlert ? "Edit Alert" : "Create New Alert"}</DialogTitle>
            <DialogDescription>Define conditions and notification preferences for your custom alert</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Alert Name *</Label>
              <Input
                id="name"
                value={alertForm.name}
                onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                placeholder="e.g., Low Cash Warning"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={alertForm.description}
                onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                placeholder="Describe when this alert should trigger"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="metric">Metric *</Label>
                <Select
                  value={alertForm.metric}
                  onValueChange={(value) => setAlertForm({ ...alertForm, metric: value })}
                >
                  <SelectTrigger id="metric">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator">Operator *</Label>
                <Select
                  value={alertForm.operator}
                  onValueChange={(value) => setAlertForm({ ...alertForm, operator: value as AlertRule["operator"] })}
                >
                  <SelectTrigger id="operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">{"<"} Less than</SelectItem>
                    <SelectItem value="<=">{"<="} Less or equal</SelectItem>
                    <SelectItem value=">">{">"} Greater than</SelectItem>
                    <SelectItem value=">=">{">="} Greater or equal</SelectItem>
                    <SelectItem value="==">{"=="} Equal to</SelectItem>
                    <SelectItem value="!=">{"!="} Not equal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold Value *</Label>
              <Input
                id="threshold"
                value={alertForm.threshold}
                onChange={(e) => setAlertForm({ ...alertForm, threshold: e.target.value })}
                placeholder="e.g., 1000000 or 15"
              />
              <p className="text-xs text-muted-foreground">
                Enter numeric value (e.g., 1000000 for ₹10,00,000 or 15 for 15%)
              </p>
            </div>

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingAlert(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingAlert ? handleUpdateAlert : handleCreateAlert}
              disabled={!alertForm.name || !alertForm.metric || !alertForm.threshold || (!alertForm.notifyEmail && !alertForm.notifySlack)}
            >
              {editingAlert ? "Update Alert" : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
