"use client"

import { useState } from "react"
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
} from "lucide-react"

interface Alert {
  id: string
  name: string
  description: string
  metric: string
  operator: ">" | "<" | "=" | ">=" | "<="
  threshold: string
  frequency: "immediate" | "daily" | "weekly" | "monthly"
  channels: ("email" | "slack" | "in-app")[]
  enabled: boolean
  muted: boolean
  scope: "personal" | "organization"
  createdBy: string
  subscribers: string[]
  lastTriggered?: Date
  triggerCount: number
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
  { value: "cash_balance", label: "Cash Balance", icon: DollarSign },
  { value: "burn_rate", label: "Burn Rate", icon: TrendingDown },
  { value: "revenue", label: "Revenue", icon: TrendingUp },
  { value: "revenue_growth", label: "Revenue Growth %", icon: Activity },
  { value: "runway", label: "Cash Runway (months)", icon: Clock },
  { value: "customer_count", label: "Customer Count", icon: Users },
  { value: "churn_rate", label: "Churn Rate %", icon: TrendingDown },
  { value: "mrr", label: "Monthly Recurring Revenue", icon: DollarSign },
  { value: "arr", label: "Annual Recurring Revenue", icon: Target },
]

export function AlertsManagement() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      name: "Low Cash Warning",
      description: "Alert when cash balance drops below critical threshold",
      metric: "cash_balance",
      operator: "<",
      threshold: "1000000",
      frequency: "immediate",
      channels: ["email", "slack", "in-app"],
      enabled: true,
      muted: false,
      scope: "organization",
      createdBy: "John Doe",
      subscribers: ["john@company.com", "cfo@company.com"],
      lastTriggered: new Date(Date.now() - 86400000 * 3),
      triggerCount: 2,
    },
    {
      id: "2",
      name: "Burn Rate Spike",
      description: "Monitor monthly burn rate increases",
      metric: "burn_rate",
      operator: ">",
      threshold: "15",
      frequency: "daily",
      channels: ["email", "in-app"],
      enabled: true,
      muted: false,
      scope: "organization",
      createdBy: "John Doe",
      subscribers: ["john@company.com", "finance@company.com"],
      triggerCount: 0,
    },
    {
      id: "3",
      name: "Revenue Growth Slowdown",
      description: "Alert when revenue growth falls below target",
      metric: "revenue_growth",
      operator: "<",
      threshold: "5",
      frequency: "weekly",
      channels: ["email"],
      enabled: false,
      muted: false,
      scope: "personal",
      createdBy: "John Doe",
      subscribers: ["john@company.com"],
      lastTriggered: new Date(Date.now() - 86400000 * 7),
      triggerCount: 1,
    },
  ])

  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([
    {
      id: "h1",
      alertId: "1",
      alertName: "Low Cash Warning",
      triggeredAt: new Date(Date.now() - 86400000 * 3),
      metric: "Cash Balance",
      actualValue: "₹9,50,000",
      threshold: "₹10,00,000",
      message: "Cash balance has dropped below ₹10,00,000. Current balance: ₹9,50,000",
      acknowledged: true,
    },
    {
      id: "h2",
      alertId: "1",
      alertName: "Low Cash Warning",
      triggeredAt: new Date(Date.now() - 86400000 * 10),
      metric: "Cash Balance",
      actualValue: "₹9,80,000",
      threshold: "₹10,00,000",
      message: "Cash balance has dropped below ₹10,00,000. Current balance: ₹9,80,000",
      acknowledged: true,
    },
    {
      id: "h3",
      alertId: "3",
      alertName: "Revenue Growth Slowdown",
      triggeredAt: new Date(Date.now() - 86400000 * 7),
      metric: "Revenue Growth",
      actualValue: "4.2%",
      threshold: "5%",
      message: "Revenue growth rate of 4.2% is below target threshold of 5%",
      acknowledged: false,
    },
  ])

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [alertForm, setAlertForm] = useState({
    name: "",
    description: "",
    metric: "",
    operator: "<" as Alert["operator"],
    threshold: "",
    frequency: "immediate" as Alert["frequency"],
    channels: ["email"] as Alert["channels"],
    scope: "personal" as Alert["scope"],
    subscribers: "",
  })

  const handleCreateAlert = () => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      name: alertForm.name,
      description: alertForm.description,
      metric: alertForm.metric,
      operator: alertForm.operator,
      threshold: alertForm.threshold,
      frequency: alertForm.frequency,
      channels: alertForm.channels,
      enabled: true,
      muted: false,
      scope: alertForm.scope,
      createdBy: "John Doe",
      subscribers: alertForm.subscribers.split(",").map((s) => s.trim()),
      triggerCount: 0,
    }

    setAlerts([newAlert, ...alerts])
    setShowCreateDialog(false)
    resetForm()
  }

  const handleUpdateAlert = () => {
    if (!editingAlert) return

    setAlerts(
      alerts.map((alert) =>
        alert.id === editingAlert.id
          ? {
              ...alert,
              name: alertForm.name,
              description: alertForm.description,
              metric: alertForm.metric,
              operator: alertForm.operator,
              threshold: alertForm.threshold,
              frequency: alertForm.frequency,
              channels: alertForm.channels,
              scope: alertForm.scope,
              subscribers: alertForm.subscribers.split(",").map((s) => s.trim()),
            }
          : alert,
      ),
    )

    setEditingAlert(null)
    resetForm()
  }

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id))
  }

  const handleToggleAlert = (id: string) => {
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, enabled: !alert.enabled } : alert)))
  }

  const handleMuteAlert = (id: string) => {
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, muted: !alert.muted } : alert)))
  }

  const handleEditAlert = (alert: Alert) => {
    setEditingAlert(alert)
    setAlertForm({
      name: alert.name,
      description: alert.description,
      metric: alert.metric,
      operator: alert.operator,
      threshold: alert.threshold,
      frequency: alert.frequency,
      channels: alert.channels,
      scope: alert.scope,
      subscribers: alert.subscribers.join(", "),
    })
  }

  const resetForm = () => {
    setAlertForm({
      name: "",
      description: "",
      metric: "",
      operator: "<",
      threshold: "",
      frequency: "immediate",
      channels: ["email"],
      scope: "personal",
      subscribers: "",
    })
  }

  const handleChannelToggle = (channel: "email" | "slack" | "in-app") => {
    setAlertForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const getMetricIcon = (metricValue: string) => {
    const metric = metrics.find((m) => m.value === metricValue)
    return metric?.icon || AlertTriangle
  }

  const getOperatorSymbol = (operator: Alert["operator"]) => {
    return operator
  }

  const getFrequencyBadge = (frequency: Alert["frequency"]) => {
    const colors = {
      immediate: "bg-red-100 text-red-800",
      daily: "bg-orange-100 text-orange-800",
      weekly: "bg-blue-100 text-blue-800",
      monthly: "bg-green-100 text-green-800",
    }
    return colors[frequency]
  }

  const triggeredThisWeek = alertHistory.filter(
    (h) => new Date(h.triggeredAt) > new Date(Date.now() - 86400000 * 7),
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Alerts & Triggers</h1>
          <p className="text-muted-foreground">Create automated alerts for key financial metrics</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Alert
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <p className="text-sm font-medium text-muted-foreground">Organization Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter((a) => a.scope === "organization").length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Muted Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter((a) => a.muted).length}</p>
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

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Alert Rules</CardTitle>
              <CardDescription>
                Manage automated alerts for key metrics. Organization alerts require Admin permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
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
                    return (
                      <Card key={alert.id} className={alert.muted ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <MetricIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{alert.name}</h3>
                                  {alert.muted && (
                                    <Badge variant="outline" className="text-xs">
                                      <VolumeX className="h-3 w-3 mr-1" />
                                      Muted
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {alert.scope}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{alert.description}</p>
                                <div className="flex flex-wrap gap-2 text-sm">
                                  <Badge variant="outline">
                                    {metrics.find((m) => m.value === alert.metric)?.label}{" "}
                                    {getOperatorSymbol(alert.operator)} {alert.threshold}
                                  </Badge>
                                  <Badge className={getFrequencyBadge(alert.frequency)}>{alert.frequency}</Badge>
                                  <div className="flex gap-1">
                                    {alert.channels.map((channel) => (
                                      <Badge key={channel} variant="secondary" className="text-xs">
                                        {channel === "email" && <Mail className="h-3 w-3 mr-1" />}
                                        {channel === "slack" && <MessageSquare className="h-3 w-3 mr-1" />}
                                        {channel === "in-app" && <Bell className="h-3 w-3 mr-1" />}
                                        {channel}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Created by {alert.createdBy}</span>
                                  <span>{alert.subscribers.length} subscribers</span>
                                  {alert.lastTriggered && (
                                    <span>Last triggered {alert.lastTriggered.toLocaleDateString()}</span>
                                  )}
                                  <span>Triggered {alert.triggerCount} times</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={alert.enabled} onCheckedChange={() => handleToggleAlert(alert.id)} />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleMuteAlert(alert.id)}
                                className="bg-transparent"
                              >
                                {alert.muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                              </Button>
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

        <TabsContent value="history" className="space-y-4">
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
                  onValueChange={(value) => setAlertForm({ ...alertForm, operator: value as Alert["operator"] })}
                >
                  <SelectTrigger id="operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">{"<"} Less than</SelectItem>
                    <SelectItem value="<=">{"<="} Less or equal</SelectItem>
                    <SelectItem value=">">{">"} Greater than</SelectItem>
                    <SelectItem value=">=">{">="} Greater or equal</SelectItem>
                    <SelectItem value="=">{"="} Equal to</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="frequency">Check Frequency *</Label>
              <Select
                value={alertForm.frequency}
                onValueChange={(value) => setAlertForm({ ...alertForm, frequency: value as Alert["frequency"] })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (Real-time)</SelectItem>
                  <SelectItem value="daily">Daily (Once per day)</SelectItem>
                  <SelectItem value="weekly">Weekly (Once per week)</SelectItem>
                  <SelectItem value="monthly">Monthly (Once per month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notification Channels *</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={alertForm.channels.includes("email") ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChannelToggle("email")}
                  className={!alertForm.channels.includes("email") ? "bg-transparent" : ""}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={alertForm.channels.includes("slack") ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChannelToggle("slack")}
                  className={!alertForm.channels.includes("slack") ? "bg-transparent" : ""}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Slack
                </Button>
                <Button
                  type="button"
                  variant={alertForm.channels.includes("in-app") ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChannelToggle("in-app")}
                  className={!alertForm.channels.includes("in-app") ? "bg-transparent" : ""}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  In-App
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Alert Scope *</Label>
              <Select
                value={alertForm.scope}
                onValueChange={(value) => setAlertForm({ ...alertForm, scope: value as Alert["scope"] })}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (Only you)</SelectItem>
                  <SelectItem value="organization">Organization (All team members)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Organization alerts require Admin permissions</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscribers">Subscribers (Email Addresses)</Label>
              <Textarea
                id="subscribers"
                value={alertForm.subscribers}
                onChange={(e) => setAlertForm({ ...alertForm, subscribers: e.target.value })}
                placeholder="john@company.com, jane@company.com"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated email addresses for multi-user subscriptions
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
              disabled={!alertForm.name || !alertForm.metric || !alertForm.threshold || alertForm.channels.length === 0}
            >
              {editingAlert ? "Update Alert" : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
