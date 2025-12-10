"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Mail,
  MessageSquare,
  Slack,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Settings,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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

interface Notification {
  id: string
  type: "alert" | "success" | "warning" | "info"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "high" | "medium" | "low"
  category: "financial" | "growth" | "reporting" | "system"
}

interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  channels: string[]
  threshold: string
  frequency: "immediate" | "daily" | "weekly" | "monthly"
  metric?: string
  operator?: string
}

interface NotificationChannel {
  id: string
  type: "email" | "slack" | "sms" | "in-app"
  enabled: boolean
  config: any
}

interface NotificationStats {
  unread: number
  highPriority: number
  thisWeek: number
  activeRules: number
}

export function NotificationsPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    unread: 0,
    highPriority: 0,
    thisWeek: 0,
    activeRules: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false)
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    metric: "runway_months",
    operator: "<",
    threshold: "",
    channels: [] as string[],
    frequency: "immediate" as const,
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

  // Fetch data
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
        fetchNotifications(),
        fetchAlertRules(),
        fetchChannels(),
        fetchStats(),
      ])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications?limit=100`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const fetchAlertRules = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setAlertRules(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch alert rules:", error)
    }
  }

  const fetchChannels = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notification-channels`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setChannels(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error)
    }
  }

  const fetchStats = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/stats`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || { unread: 0, highPriority: 0, thisWeek: 0, activeRules: 0 })
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    if (!orgId) return
    try {
      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      )
      if (response.ok) {
        await fetchNotifications()
        await fetchStats()
        toast.success("Notification marked as read")
      }
    } catch (error) {
      toast.error("Failed to mark notification as read")
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/read-all`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        await fetchNotifications()
        await fetchStats()
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      toast.error("Failed to mark all as read")
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules/${ruleId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })
      if (response.ok) {
        await fetchAlertRules()
        await fetchStats()
        toast.success(`Alert rule ${enabled ? "enabled" : "disabled"}`)
      }
    } catch (error) {
      toast.error("Failed to update alert rule")
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules/${ruleId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        await fetchAlertRules()
        await fetchStats()
        toast.success("Alert rule deleted")
      }
    } catch (error) {
      toast.error("Failed to delete alert rule")
    }
  }

  const handleCreateRule = async () => {
    if (!orgId) return
    if (!newRule.name || !newRule.threshold) {
      toast.error("Please fill in all required fields")
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: newRule.name,
          description: newRule.description,
          metric: newRule.metric,
          operator: newRule.operator,
          threshold: parseFloat(newRule.threshold),
          channels: newRule.channels,
          frequency: newRule.frequency,
        }),
      })
      if (response.ok) {
        await fetchAlertRules()
        await fetchStats()
        setShowCreateRuleDialog(false)
        setNewRule({
          name: "",
          description: "",
          metric: "runway_months",
          operator: "<",
          threshold: "",
          channels: [],
          frequency: "immediate",
        })
        toast.success("Alert rule created")
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to create alert rule")
      }
    } catch (error) {
      toast.error("Failed to create alert rule")
    }
  }

  const handleChannelToggle = async (channelType: string, enabled: boolean) => {
    if (!orgId) return
    try {
      const channel = channels.find((ch) => ch.type === channelType)
      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/notification-channels/${channelType}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            enabled,
            config: channel?.config || {},
          }),
        }
      )
      if (response.ok) {
        await fetchChannels()
        toast.success(`Channel ${enabled ? "enabled" : "disabled"}`)
      }
    } catch (error) {
      toast.error("Failed to update channel")
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (selectedFilter === "all") return true
    if (selectedFilter === "unread") return !notification.read
    return notification.category === selectedFilter
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  const getChannel = (type: string) => {
    return channels.find((ch) => ch.type === type)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Alerts</h1>
          <p className="text-muted-foreground">Manage your notification preferences and alert rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={handleMarkAllAsRead}>
            <Bell className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{stats.activeRules}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Notifications</CardTitle>
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="reporting">Reporting</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notifications found</p>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${
                        !notification.read ? "bg-blue-50 border-blue-200" : "bg-background"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium">{notification.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                Mark as Read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Rules</CardTitle>
                  <CardDescription>Configure automated alerts for key business metrics</CardDescription>
                </div>
                <Button onClick={() => setShowCreateRuleDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Alert Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No alert rules configured</p>
                ) : (
                  alertRules.map((rule) => (
                    <div key={rule.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => handleToggleRule(rule.id, enabled)}
                          />
                          <div>
                            <h3 className="font-medium">{rule.name}</h3>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Threshold: </span>
                          <span className="font-medium">{rule.threshold}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequency: </span>
                          <span className="font-medium">{rule.frequency}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Channels: </span>
                          <span className="font-medium">{rule.channels.join(", ") || "None"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Configure email notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-enabled">Enable Email</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications</p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={getChannel("email")?.enabled || false}
                    onCheckedChange={(enabled) => handleChannelToggle("email", enabled)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Slack className="h-5 w-5" />
                  Slack Integration
                </CardTitle>
                <CardDescription>Send notifications to Slack channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="slack-enabled">Enable Slack</Label>
                    <p className="text-sm text-muted-foreground">Send alerts to Slack workspace</p>
                  </div>
                  <Switch
                    id="slack-enabled"
                    checked={getChannel("slack")?.enabled || false}
                    onCheckedChange={(enabled) => handleChannelToggle("slack", enabled)}
                  />
                </div>
                {getChannel("slack")?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="slack-webhook">Webhook URL</Label>
                      <Input
                        id="slack-webhook"
                        placeholder="https://hooks.slack.com/..."
                        defaultValue={getChannel("slack")?.config?.webhook || ""}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Notifications
                </CardTitle>
                <CardDescription>Critical alerts via SMS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-enabled">Enable SMS</Label>
                    <p className="text-sm text-muted-foreground">Critical alerts only</p>
                  </div>
                  <Switch
                    id="sms-enabled"
                    checked={getChannel("sms")?.enabled || false}
                    onCheckedChange={(enabled) => handleChannelToggle("sms", enabled)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  In-App Notifications
                </CardTitle>
                <CardDescription>Browser and dashboard notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="in-app-enabled">Enable In-App</Label>
                    <p className="text-sm text-muted-foreground">Desktop notifications</p>
                  </div>
                  <Switch
                    id="in-app-enabled"
                    checked={getChannel("in-app")?.enabled !== false}
                    onCheckedChange={(enabled) => handleChannelToggle("in-app", enabled)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Alert Rule Dialog */}
      <Dialog open={showCreateRuleDialog} onOpenChange={setShowCreateRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
            <DialogDescription>Configure a new alert rule for monitoring key metrics</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name *</Label>
              <Input
                id="rule-name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="Revenue Variance Alert"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Alert when revenue is more than 10% below target"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-metric">Metric *</Label>
                <Select
                  value={newRule.metric}
                  onValueChange={(value) => setNewRule({ ...newRule, metric: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="runway_months">Cash Runway (months)</SelectItem>
                    <SelectItem value="cash_balance">Cash Balance</SelectItem>
                    <SelectItem value="burn_rate">Burn Rate</SelectItem>
                    <SelectItem value="revenue_growth">Revenue Growth</SelectItem>
                    <SelectItem value="expense_growth">Expense Growth</SelectItem>
                    <SelectItem value="net_income">Net Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-operator">Operator *</Label>
                <Select
                  value={newRule.operator}
                  onValueChange={(value) => setNewRule({ ...newRule, operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">Less than</SelectItem>
                    <SelectItem value=">">Greater than</SelectItem>
                    <SelectItem value="<=">Less than or equal</SelectItem>
                    <SelectItem value=">=">Greater than or equal</SelectItem>
                    <SelectItem value="==">Equal to</SelectItem>
                    <SelectItem value="!=">Not equal to</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-threshold">Threshold *</Label>
              <Input
                id="rule-threshold"
                type="number"
                value={newRule.threshold}
                onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Notification Channels *</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={newRule.channels.includes("email") ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const channels = newRule.channels.includes("email")
                      ? newRule.channels.filter((c) => c !== "email")
                      : [...newRule.channels, "email"]
                    setNewRule({ ...newRule, channels })
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={newRule.channels.includes("slack") ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const channels = newRule.channels.includes("slack")
                      ? newRule.channels.filter((c) => c !== "slack")
                      : [...newRule.channels, "slack"]
                    setNewRule({ ...newRule, channels })
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Slack
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
