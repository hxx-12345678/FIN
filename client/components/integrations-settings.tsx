"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Zap,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  Clock,
  BarChart3,
} from "lucide-react"

const integrations = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Sync your accounting data automatically",
    category: "Accounting",
    status: "connected",
    lastSync: "2 hours ago",
    icon: "📊",
    features: ["P&L sync", "Balance sheet", "Cash flow", "Expenses"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Import revenue and subscription data",
    category: "Payments",
    status: "connected",
    lastSync: "1 hour ago",
    icon: "💳",
    features: ["Revenue tracking", "Subscription metrics", "Customer data"],
  },
  {
    id: "gusto",
    name: "Gusto",
    description: "Sync payroll and employee data",
    category: "Payroll",
    status: "disconnected",
    lastSync: "Never",
    icon: "👥",
    features: ["Payroll expenses", "Employee count", "Benefits costs"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Import sales pipeline and customer data",
    category: "CRM",
    status: "pending",
    lastSync: "Pending setup",
    icon: "🎯",
    features: ["Sales pipeline", "Customer acquisition", "Deal tracking"],
  },
  {
    id: "xero",
    name: "Xero",
    description: "Alternative accounting platform integration",
    category: "Accounting",
    status: "available",
    lastSync: "Not connected",
    icon: "📈",
    features: ["Financial statements", "Invoice tracking", "Expense management"],
  },
  {
    id: "plaid",
    name: "Plaid",
    description: "Connect bank accounts for cash flow tracking",
    category: "Banking",
    status: "available",
    lastSync: "Not connected",
    icon: "🏦",
    features: ["Bank account sync", "Transaction categorization", "Cash flow"],
  },
]

const automationRules = [
  {
    id: 1,
    name: "Monthly Revenue Sync",
    description: "Automatically sync Stripe revenue data monthly",
    enabled: true,
    trigger: "Monthly",
    lastRun: "3 days ago",
  },
  {
    id: 2,
    name: "Expense Categorization",
    description: "Auto-categorize QuickBooks expenses using AI",
    enabled: true,
    trigger: "Real-time",
    lastRun: "2 hours ago",
  },
  {
    id: 3,
    name: "Payroll Sync",
    description: "Sync Gusto payroll data bi-weekly",
    enabled: false,
    trigger: "Bi-weekly",
    lastRun: "Never",
  },
]

export function IntegrationsSettings() {
  const [selectedCategory, setSelectedCategory] = useState("all")

  const categories = ["all", "Accounting", "Payments", "Payroll", "CRM", "Banking"]

  const filteredIntegrations = integrations.filter(
    (integration) => selectedCategory === "all" || integration.category === selectedCategory,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "disconnected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "disconnected":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Plus className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations & Settings</h1>
          <p className="text-muted-foreground">Connect your business tools and configure automation</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Request Integration
        </Button>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600">2</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-blue-600">4</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">12.5K</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                <p className="text-2xl font-bold">1h</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "All Categories" : category}
              </Button>
            ))}
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      <Badge className={getStatusColor(integration.status)}>{integration.status}</Badge>
                    </div>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {integration.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">Last sync: {integration.lastSync}</div>
                  <div className="flex gap-2">
                    {integration.status === "connected" ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Settings className="mr-1 h-3 w-3" />
                          Configure
                        </Button>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : integration.status === "pending" ? (
                      <Button size="sm" className="flex-1">
                        Complete Setup
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1">
                        <Plus className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>Configure automated data sync and processing rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {automationRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Switch checked={rule.enabled} />
                    <div>
                      <h3 className="font-medium">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Trigger: {rule.trigger}</span>
                        <span>Last run: {rule.lastRun}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add New Rule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Sync Settings</CardTitle>
                <CardDescription>Configure how and when your data is synchronized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Automatic Sync</Label>
                    <p className="text-sm text-muted-foreground">Enable automatic data synchronization</p>
                  </div>
                  <Switch id="auto-sync" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="real-time">Real-time Updates</Label>
                    <p className="text-sm text-muted-foreground">Sync data in real-time when possible</p>
                  </div>
                  <Switch id="real-time" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sync-frequency">Sync Frequency</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Every hour</option>
                    <option>Every 6 hours</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage security and access controls for integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="encryption">Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">Encrypt all data in transit and at rest</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="audit-logs">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">Log all integration activities</p>
                  </div>
                  <Switch id="audit-logs" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">Data Retention Period</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>2 years</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage API keys and webhook endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input id="api-key" type="password" value="fp_live_••••••••••••••••" readOnly />
                  <Button variant="outline">Regenerate</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input id="webhook-url" placeholder="https://your-app.com/webhooks/finapilot" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webhook-enabled">Enable Webhooks</Label>
                  <p className="text-sm text-muted-foreground">Receive real-time notifications via webhooks</p>
                </div>
                <Switch id="webhook-enabled" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
