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
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Settings,
  User,
  Building2,
  Palette,
  Bell,
  Shield,
  Globe,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  FileText,
} from "lucide-react"
import { AlertsManagement } from "./alerts-management"
import { LocalizationSettings } from "./localization-settings"
import { SyncAuditLog } from "./sync-audit-log"
import { MFASetupWizard } from "./auth/mfa-setup-wizard"
import { SessionManagement } from "./auth/session-management"

function MFASetupButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setOpen(true)}>
        Configure
      </Button>
      <MFASetupWizard open={open} onClose={() => setOpen(false)} onComplete={() => setOpen(false)} />
    </>
  )
}

function SessionManagementButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setOpen(true)}>
        Manage Sessions
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <SessionManagement />
          </div>
        </div>
      )}
    </>
  )
}

export function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and workspace preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-9">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <Badge variant="secondary" className="ml-2">
              New
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="localization">
            Localization
            <Badge variant="secondary" className="ml-2">
              India
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sync">
            Sync Audit
            <Badge variant="secondary" className="ml-2">
              Auto
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback className="text-lg">JD</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" defaultValue="Founder & CEO" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="pst">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pst">Pacific Standard Time</SelectItem>
                      <SelectItem value="est">Eastern Standard Time</SelectItem>
                      <SelectItem value="cst">Central Standard Time</SelectItem>
                      <SelectItem value="mst">Mountain Standard Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  defaultValue="Passionate entrepreneur building the future of financial technology."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Manage your organization settings and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="Your Company Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select defaultValue="fintech">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fintech">Financial Technology</SelectItem>
                      <SelectItem value="saas">Software as a Service</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select defaultValue="11-50">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue="https://yourcompany.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Company address..."
                  defaultValue="123 Business St, Suite 100, San Francisco, CA 94105"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input id="taxId" defaultValue="12-3456789" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                      <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>Customize the look and feel of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
              </div>

              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex gap-3">
                  {[
                    { name: "Blue", color: "bg-blue-500" },
                    { name: "Purple", color: "bg-purple-500" },
                    { name: "Green", color: "bg-green-500" },
                    { name: "Orange", color: "bg-orange-500" },
                    { name: "Red", color: "bg-red-500" },
                  ].map((theme) => (
                    <button
                      key={theme.name}
                      className={`w-8 h-8 rounded-full ${theme.color} ring-2 ring-offset-2 ring-transparent hover:ring-gray-300`}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontSize">Font Size</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select defaultValue="mm-dd-yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="animations">Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                </div>
                <Switch id="animations" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allNotifications">All Notifications</Label>
                  <p className="text-sm text-muted-foreground">Master toggle for all notifications</p>
                </div>
                <Switch id="allNotifications" checked={notifications} onCheckedChange={setNotifications} />
              </div>

              {notifications && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch id="emailNotifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch id="pushNotifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weeklyDigest">Weekly Digest</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of your financial data</p>
                    </div>
                    <Switch id="weeklyDigest" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="alertNotifications">Alert Notifications</Label>
                      <p className="text-sm text-muted-foreground">Critical alerts and warnings</p>
                    </div>
                    <Switch id="alertNotifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="marketingEmails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">Product updates and tips</p>
                    </div>
                    <Switch id="marketingEmails" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsManagement />
        </TabsContent>

        <TabsContent value="localization" className="space-y-6">
          <LocalizationSettings />
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <SyncAuditLog />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Enabled</Badge>
                    <MFASetupButton />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Password</div>
                    <div className="text-sm text-muted-foreground">Last changed 30 days ago</div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Active Sessions</div>
                    <div className="text-sm text-muted-foreground">3 active sessions</div>
                  </div>
                  <SessionManagementButton />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Login Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified of new logins</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Security Monitoring
              </CardTitle>
              <CardDescription>Monitor security events and data access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => {
                    const event = new CustomEvent("navigate", { detail: { view: "security-audit-log" } })
                    window.dispatchEvent(event)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Security Audit Log</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    View all security events and login attempts
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => {
                    const event = new CustomEvent("navigate", { detail: { view: "data-access-log" } })
                    window.dispatchEvent(event)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Data Access Log</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    Track who accessed what data and when
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={() => {
                    const event = new CustomEvent("navigate", { detail: { view: "ip-whitelist" } })
                    window.dispatchEvent(event)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">IP Whitelist</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-left">
                    Configure allowed IP addresses and ranges
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API & Integrations
              </CardTitle>
              <CardDescription>Manage API access and third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium">API Key</div>
                      <div className="text-sm text-muted-foreground">Use this key to access the FinaPilot API</div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      Regenerate
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value="fp_live_sk_1234567890abcdef"
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="bg-transparent"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium">Webhook URL</div>
                      <div className="text-sm text-muted-foreground">Receive real-time notifications</div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      Test Webhook
                    </Button>
                  </div>
                  <Input placeholder="https://your-app.com/webhooks/finapilot" />
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Rate Limiting</div>
                      <div className="text-sm text-muted-foreground">1000 requests per hour</div>
                    </div>
                    <Badge variant="secondary">Professional Plan</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Connected Integrations</Label>
                <div className="space-y-2">
                  {[
                    { name: "Stripe", status: "Connected", lastSync: "2 hours ago" },
                    { name: "QuickBooks", status: "Connected", lastSync: "1 day ago" },
                    { name: "Slack", status: "Connected", lastSync: "5 minutes ago" },
                  ].map((integration, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-sm text-muted-foreground">Last sync: {integration.lastSync}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{integration.status}</Badge>
                        <Button variant="outline" size="sm" className="bg-transparent">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
