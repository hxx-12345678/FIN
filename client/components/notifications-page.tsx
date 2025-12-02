"use client"

import { useState } from "react"
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
} from "lucide-react"

const notifications = [
  {
    id: 1,
    type: "alert",
    title: "Revenue Target Missed",
    message: "June revenue of $67K is 10.7% below target of $75K",
    timestamp: "2 hours ago",
    read: false,
    priority: "high",
    category: "financial",
  },
  {
    id: 2,
    type: "success",
    title: "Customer Milestone Reached",
    message: "Congratulations! You've reached 250 active customers",
    timestamp: "1 day ago",
    read: false,
    priority: "medium",
    category: "growth",
  },
  {
    id: 3,
    type: "info",
    title: "Weekly Digest Ready",
    message: "Your weekly financial digest is ready for review",
    timestamp: "2 days ago",
    read: true,
    priority: "low",
    category: "reporting",
  },
  {
    id: 4,
    type: "warning",
    title: "Burn Rate Increase",
    message: "Monthly burn rate increased by 7.3% to $44K",
    timestamp: "3 days ago",
    read: true,
    priority: "medium",
    category: "financial",
  },
  {
    id: 5,
    type: "info",
    title: "Integration Sync Complete",
    message: "Stripe data sync completed successfully",
    timestamp: "1 week ago",
    read: true,
    priority: "low",
    category: "system",
  },
]

const alertRules = [
  {
    id: 1,
    name: "Revenue Variance Alert",
    description: "Alert when revenue is more than 10% below target",
    enabled: true,
    channels: ["email", "slack"],
    threshold: "10%",
    frequency: "immediate",
  },
  {
    id: 2,
    name: "Burn Rate Monitor",
    description: "Monitor monthly burn rate changes",
    enabled: true,
    channels: ["email"],
    threshold: "5%",
    frequency: "daily",
  },
  {
    id: 3,
    name: "Customer Churn Alert",
    description: "Alert when churn rate exceeds threshold",
    enabled: false,
    channels: ["email", "slack"],
    threshold: "3%",
    frequency: "weekly",
  },
  {
    id: 4,
    name: "Cash Runway Warning",
    description: "Warning when runway drops below 6 months",
    enabled: true,
    channels: ["email", "slack", "sms"],
    threshold: "6 months",
    frequency: "immediate",
  },
]

export function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true)
  const [slackIntegrationEnabled, setSlackIntegrationEnabled] = useState(true)

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
          <Button>
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
                <p className="text-2xl font-bold">2</p>
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
                <p className="text-2xl font-bold">1</p>
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
                <p className="text-2xl font-bold">5</p>
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
                <p className="text-2xl font-bold">3</p>
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
                {filteredNotifications.map((notification) => (
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
                            <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                            <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                          {!notification.read && (
                            <Button size="sm" variant="outline">
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>Configure automated alerts for key business metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Switch checked={rule.enabled} />
                        <div>
                          <h3 className="font-medium">{rule.name}</h3>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
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
                        <span className="font-medium">{rule.channels.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full bg-transparent">
                  <Bell className="mr-2 h-4 w-4" />
                  Add New Alert Rule
                </Button>
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
                    <Label htmlFor="email-digest">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly summary emails</p>
                  </div>
                  <Switch id="email-digest" checked={emailDigestEnabled} onCheckedChange={setEmailDigestEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-alerts">Instant Alerts</Label>
                    <p className="text-sm text-muted-foreground">Immediate email for critical alerts</p>
                  </div>
                  <Switch id="email-alerts" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input id="email-address" defaultValue="john@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-day">Digest Day</Label>
                  <Select defaultValue="monday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                    </SelectContent>
                  </Select>
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
                    checked={slackIntegrationEnabled}
                    onCheckedChange={setSlackIntegrationEnabled}
                  />
                </div>
                {slackIntegrationEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="slack-channel">Default Channel</Label>
                      <Input id="slack-channel" defaultValue="#finance-alerts" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slack-webhook">Webhook URL</Label>
                      <Input id="slack-webhook" placeholder="https://hooks.slack.com/..." />
                    </div>
                    <Button variant="outline" className="w-full bg-transparent">
                      Test Slack Connection
                    </Button>
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
                  <Switch id="sms-enabled" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input id="phone-number" placeholder="+1 (555) 123-4567" />
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    SMS notifications are only sent for high-priority alerts to avoid spam.
                  </p>
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
                    <Label htmlFor="browser-notifications">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Desktop notifications</p>
                  </div>
                  <Switch id="browser-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dashboard-badges">Dashboard Badges</Label>
                    <p className="text-sm text-muted-foreground">Show notification count</p>
                  </div>
                  <Switch id="dashboard-badges" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sound-alerts">Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">Audio notifications</p>
                  </div>
                  <Switch id="sound-alerts" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
