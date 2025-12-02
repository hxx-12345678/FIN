"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Lock, FileText, CheckCircle, Download, Users, Database, Globe } from "lucide-react"

const complianceFrameworks = [
  {
    name: "SOC 2 Type II",
    status: "compliant",
    lastAudit: "2024-03-15",
    nextAudit: "2025-03-15",
    score: 98,
    requirements: 47,
    completed: 46,
  },
  {
    name: "GDPR",
    status: "compliant",
    lastAudit: "2024-05-20",
    nextAudit: "2024-11-20",
    score: 95,
    requirements: 32,
    completed: 30,
  },
  {
    name: "ISO 27001",
    status: "in-progress",
    lastAudit: "2024-01-10",
    nextAudit: "2024-07-10",
    score: 78,
    requirements: 114,
    completed: 89,
  },
  {
    name: "PCI DSS",
    status: "pending",
    lastAudit: "2023-12-01",
    nextAudit: "2024-12-01",
    score: 65,
    requirements: 12,
    completed: 8,
  },
]

const securityControls = [
  {
    category: "Access Control",
    controls: [
      { name: "Multi-Factor Authentication", status: "enabled", coverage: 100 },
      { name: "Role-Based Access Control", status: "enabled", coverage: 100 },
      { name: "Single Sign-On", status: "enabled", coverage: 95 },
      { name: "Password Policy", status: "enabled", coverage: 100 },
    ],
  },
  {
    category: "Data Protection",
    controls: [
      { name: "Data Encryption at Rest", status: "enabled", coverage: 100 },
      { name: "Data Encryption in Transit", status: "enabled", coverage: 100 },
      { name: "Data Loss Prevention", status: "enabled", coverage: 85 },
      { name: "Backup & Recovery", status: "enabled", coverage: 100 },
    ],
  },
  {
    category: "Network Security",
    controls: [
      { name: "Firewall Protection", status: "enabled", coverage: 100 },
      { name: "Intrusion Detection", status: "enabled", coverage: 90 },
      { name: "VPN Access", status: "enabled", coverage: 100 },
      { name: "Network Monitoring", status: "enabled", coverage: 95 },
    ],
  },
]

const auditLogs = [
  {
    id: 1,
    timestamp: "2024-06-20 14:30:25",
    user: "john.doe@company.com",
    action: "Data Export",
    resource: "Financial Reports",
    status: "success",
    ip: "192.168.1.100",
  },
  {
    id: 2,
    timestamp: "2024-06-20 14:25:12",
    user: "sarah.wilson@company.com",
    action: "User Access Granted",
    resource: "Investor Dashboard",
    status: "success",
    ip: "192.168.1.105",
  },
  {
    id: 3,
    timestamp: "2024-06-20 14:20:45",
    user: "system@finapilot.com",
    action: "Automated Backup",
    resource: "Database",
    status: "success",
    ip: "internal",
  },
  {
    id: 4,
    timestamp: "2024-06-20 14:15:33",
    user: "mike.chen@company.com",
    action: "Login Attempt",
    resource: "Dashboard",
    status: "failed",
    ip: "203.0.113.45",
  },
]

export function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState("soc2")

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Compliance & Security</h1>
          <p className="text-muted-foreground">Maintain regulatory compliance and security standards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm">
            <Shield className="mr-2 h-4 w-4" />
            Security Scan
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Overall Security Score
          </CardTitle>
          <CardDescription>Your organization's security and compliance posture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">92</div>
              <div className="text-sm text-muted-foreground">Security Score</div>
              <div className="text-xs text-green-600 mt-1">Excellent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">4</div>
              <div className="text-sm text-muted-foreground">Frameworks</div>
              <div className="text-xs text-blue-600 mt-1">Monitored</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">173</div>
              <div className="text-sm text-muted-foreground">Controls</div>
              <div className="text-xs text-purple-600 mt-1">Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">0</div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
              <div className="text-xs text-green-600 mt-1">All Clear</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="frameworks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="controls">Security Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {complianceFrameworks.map((framework, index) => (
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Compliance Score</span>
                    <span className="font-semibold">{framework.score}%</span>
                  </div>
                  <Progress value={framework.score} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Requirements</div>
                      <div className="font-medium">
                        {framework.completed}/{framework.requirements}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Next Audit</div>
                      <div className="font-medium">{new Date(framework.nextAudit).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          {securityControls.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.controls.map((control, controlIndex) => (
                    <div key={controlIndex} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-medium">{control.name}</div>
                          <div className="text-sm text-muted-foreground">Coverage: {control.coverage}%</div>
                        </div>
                      </div>
                      <Badge variant="default">{control.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete log of system activities and user actions</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Data Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">AES-256 encryption for all data</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Retention</Label>
                    <p className="text-sm text-muted-foreground">Automatic data purging after 7 years</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Anonymization</Label>
                    <p className="text-sm text-muted-foreground">Remove PII from analytics</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Required for all users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Auto-logout after 30 minutes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">Restrict access by IP address</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup & Recovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Input defaultValue="Daily at 2:00 AM UTC" />
                </div>
                <div className="space-y-2">
                  <Label>Retention Period</Label>
                  <Input defaultValue="90 days" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automated Testing</Label>
                    <p className="text-sm text-muted-foreground">Test backup integrity weekly</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cookie Consent</Label>
                    <p className="text-sm text-muted-foreground">GDPR compliant cookie banner</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Subject Rights</Label>
                    <p className="text-sm text-muted-foreground">Right to deletion and portability</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Privacy by Design</Label>
                    <p className="text-sm text-muted-foreground">Default privacy settings</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
