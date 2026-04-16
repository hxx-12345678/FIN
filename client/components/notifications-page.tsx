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
import { Textarea } from "@/components/ui/textarea"
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
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  ArrowUpRight,
  ShieldCheck,
  Zap,
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
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"

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
  description?: string
  metric: string
  operator: string
  threshold: number
  enabled: boolean
  notifyEmail: boolean
  notifySlack: boolean
  severity: "critical" | "warning" | "info"
  lastTriggered?: string
}

export function NotificationsPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab ] = useState("inbox")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [showCreateRule, setShowCreateRule ] = useState(false)
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    metric: "runway",
    operator: ">",
    threshold: "",
    severity: "warning" as "warning" | "info" | "critical",
    notifyEmail: false,
    notifySlack: false,
    slackWebhook: "",
  })

  // Fetch org context
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders(), credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (data.orgs?.length) setOrgId(data.orgs[0].id)
        }
      } catch (e) { console.error(e) }
    }
    fetchOrg()
  }, [])

  useEffect(() => {
    if (orgId) fetchAll()
  }, [orgId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [notifsRes, rulesRes, auditRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orgs/${orgId}/notifications`, { headers: getAuthHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/orgs/${orgId}/alerts`, { headers: getAuthHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/orgs/${orgId}/audit-logs`, { headers: getAuthHeaders(), credentials: "include" })
      ])
      
      if (notifsRes.ok) {
        const data = await notifsRes.json()
        setNotifications(data.data || [])
      }
      
      if (rulesRes.ok) {
        const data = await rulesRes.json()
        setAlertRules(data.alerts || [])
      }

      if (auditRes.ok) {
        const data = await auditRes.json()
        setAuditLogs(data.logs || [])
      }
    } catch (e) {
      toast.error("Failed to sync intelligence stream")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/${id}/read`, { 
        method: "PUT", 
        headers: getAuthHeaders(),
        credentials: "include"
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {}
  }

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.threshold) {
      toast.error("Name and threshold are required")
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/alerts`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          ...newRule,
          threshold: Number(newRule.threshold)
        })
      })
      if (res.ok) {
        toast.success("Intelligence rule established")
        setShowCreateRule(false)
        setNewRule({
          name: "",
          description: "",
          metric: "runway",
          operator: ">",
          threshold: "",
          severity: "warning",
          notifyEmail: false,
          notifySlack: false,
          slackWebhook: "",
        })
        fetchAll()
      }
    } catch (e) {
      toast.error("Failed to initialize rule")
    }
  }

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ enabled })
      })
      if (res.ok) {
        setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
        toast.success(enabled ? "Rule enabled" : "Rule muted")
      }
    } catch (e) {
      toast.error("Failed to update rule")
    }
  }

  const handleTestRule = async (id: string) => {
    const testVal = prompt("Enter a test value for this metric:")
    if (!testVal) return

    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ testValue: Number(testVal) })
      })
      const data = await res.json()
      if (data.ok) {
        if (data.triggered) {
          toast.success("Alert Triggered! Check your email/slack.", { duration: 5000 })
        } else {
          toast.info("Alert not triggered with this value.")
        }
      }
    } catch (e) {
      toast.error("Test failed")
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Decommission this alert rule?")) return
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${id}`, { 
        method: "DELETE", 
        headers: getAuthHeaders(),
        credentials: "include"
      })
      if (res.ok) {
        toast.success("Rule decommissioned")
        fetchAll()
      }
    } catch (e) {}
  }

  const filteredNotifs = notifications.filter(n => 
    (searchQuery === "" || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const unreadCount = notifications.filter(n => !n.read).length
  const highPriorityCount = notifications.filter(n => n.priority === "high" && !n.read).length

  return (
    <div className="flex flex-col h-full max-w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-1 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Intelligence Center</h1>
            {highPriorityCount > 0 && (
              <Badge className="bg-red-600 animate-pulse text-white border-0 px-2.5 py-0.5 rounded-full font-black text-[10px] sm:text-xs">
                {highPriorityCount} CRITICAL
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">Unified monitoring for financial anomalies and system events</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" className="h-11 px-5 border-2 hover:bg-slate-50 font-bold w-full sm:w-auto" onClick={fetchAll}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stream
          </Button>
          <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold w-full sm:w-auto" onClick={() => setShowCreateRule(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Establish Alert
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
          <TabsList className="bg-muted/50 p-1 border h-12 w-full lg:w-auto overflow-x-auto overflow-y-hidden no-scrollbar justify-start flex flex-nowrap shrink-0">
            <TabsTrigger value="inbox" className="px-4 sm:px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 w-5 h-5 flex items-center justify-center bg-blue-600 text-[10px] text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="px-4 sm:px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
              Rules Engine
            </TabsTrigger>
            <TabsTrigger value="history" className="px-4 sm:px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
              Event History
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search stream..." 
              className="pl-10 h-11 border-2 focus-visible:ring-blue-500 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="inbox" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-2xl border-2" />)}
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">No new intelligence</h3>
              <p className="text-slate-500 mt-1">Your financial horizon looks clear today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredNotifs.map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`
                    group transition-all duration-300 border-2 overflow-hidden rounded-2xl
                    ${!notif.read ? 'border-blue-100 bg-white shadow-md' : 'border-slate-100 bg-slate-50/30 opacity-80'}
                  `}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className={`w-full sm:w-1.5 ${
                        notif.priority === 'high' ? 'bg-red-500' : 
                        notif.priority === 'medium' ? 'bg-orange-400' : 'bg-blue-400'
                      }`} />
                      
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className={`
                              h-12 w-12 shrink-0 rounded-xl flex items-center justify-center shadow-sm
                              ${notif.type === 'alert' ? 'bg-red-50' : 'bg-blue-50'}
                            `}>
                              {notif.type === 'alert' ? 
                                <AlertTriangle className="h-6 w-6 text-red-600" /> : 
                                <ShieldCheck className="h-6 w-6 text-blue-600" />
                              }
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`text-lg font-bold truncate ${notif.read ? 'text-slate-600' : 'text-slate-900'}`}>
                                  {notif.title}
                                </h3>
                                <Badge className={`
                                  text-[10px] font-black uppercase
                                  ${notif.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}
                                `}>
                                  {notif.priority}
                                </Badge>
                              </div>
                              <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!notif.read && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleMarkRead(notif.id)}
                              >
                                Mark Ready
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="adaptive-grid">
            {alertRules.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                No intelligence monitors established yet.
              </div>
            )}
            {alertRules.map(rule => (
              <Card key={rule.id} className="border-2 rounded-2xl overflow-hidden hover:shadow-lg transition-all group">
                <CardHeader className="pb-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900">{rule.name}</span>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        rule.severity === 'critical' ? 'bg-red-100 text-red-600' :
                        rule.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {rule.severity}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleTestRule(rule.id)} title="Test Rule">
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold">{rule.name}</CardTitle>
                  <CardDescription className={`font-bold flex items-center gap-1.5 ${rule.enabled ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Search className="h-4 w-4" />
                    {rule.metric} {rule.operator} {rule.threshold}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{rule.description || 'No description provided.'}</p>
                  
                  {rule.lastTriggered && (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Last Triggered: {new Date(rule.lastTriggered).toLocaleString()}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex gap-2">
                      {rule.notifyEmail && <Mail className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400">{rule.enabled ? 'ACTIVE' : 'MUTED'}</span>
                      <Switch 
                        checked={rule.enabled} 
                        onCheckedChange={(v) => handleToggleRule(rule.id, v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <button 
              onClick={() => setShowCreateRule(true)}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all gap-4 group"
            >
              <div className="h-12 w-12 bg-white rounded-xl shadow-sm border-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-slate-900">Add New Monitor</h4>
                <p className="text-xs text-slate-500 mt-1">Establish automated alerts</p>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-2 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Organization Event Stream</CardTitle>
              <CardDescription>Comprehensive audit log of system actions and rule modifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    No events recorded in this period.
                  </div>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} className="py-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {log.actorUser?.name || 'System'} modified {log.objectType || 'resource'} 
                          {log.metaJson?.name ? ` "${log.metaJson.name}"` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
          <div className="p-8 border-2">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black">Establish Intelligence Monitor</DialogTitle>
              <DialogDescription className="font-medium">Define algorithmic thresholds for automated tracking.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Monitor Name</Label>
                <Input 
                  placeholder="Enterprise Runway Alert" 
                  className="h-11 border-2 font-medium"
                  value={newRule.name}
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Metric</Label>
                  <Select value={newRule.metric} onValueChange={v => setNewRule({...newRule, metric: v})}>
                    <SelectTrigger className="h-11 border-2 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runway">Runway (Mo)</SelectItem>
                      <SelectItem value="burn">Burn Rate</SelectItem>
                      <SelectItem value="cash">Cash Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Severity</Label>
                  <Select value={newRule.severity} onValueChange={v => setNewRule({...newRule, severity: v as any})}>
                    <SelectTrigger className="h-11 border-2 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Operator</Label>
                  <Select value={newRule.operator} onValueChange={v => setNewRule({...newRule, operator: v})}>
                    <SelectTrigger className="h-11 border-2 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">Less than</SelectItem>
                      <SelectItem value=">">Greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Threshold</Label>
                  <Input 
                    placeholder="3" 
                    className="h-11 border-2 font-medium" 
                    type="number"
                    value={newRule.threshold}
                    onChange={e => setNewRule({...newRule, threshold: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border-2 space-y-4">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Channels
                  </Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Dispatch</span>
                    <Switch checked={newRule.notifyEmail} onCheckedChange={v => setNewRule({...newRule, notifyEmail: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium pr-2">Slack Integration</span>
                    <Switch 
                      checked={newRule.notifySlack} 
                      onCheckedChange={async (val) => {
                        if (val) {
                          try {
                            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/connectors`, {
                              headers: getAuthHeaders(),
                              credentials: 'include'
                            });
                            if (res.ok) {
                              const data = await res.json();
                              // API could return array directly or within 'data'
                              const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : data.data?.connectors || [];
                              const hasSlack = list.some((c: any) => c.type === 'slack' && c.status === 'connected');
                              if (!hasSlack) {
                                toast("Slack not integrated", {
                                  description: "Please connect Slack in the Integrations page first.",
                                  action: {
                                    label: "Integrate",
                                    onClick: () => (window.location.hash = "#integrations")
                                  }
                                });
                                return;
                              }
                            }
                          } catch (e) {
                            console.error("Slack check failed", e);
                          }
                        }
                        setNewRule({...newRule, notifySlack: val});
                      }} 
                    />
                  </div>
                </div>

                {newRule.notifySlack && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Custom Webhook (Optional)</Label>
                    <Input 
                      placeholder="https://hooks.slack.com/services/..." 
                      className="bg-white border-2 focus:ring-blue-500 h-10 font-medium"
                      value={newRule.slackWebhook}
                      onChange={e => setNewRule({...newRule, slackWebhook: e.target.value})}
                    />
                    <p className="text-[10px] text-slate-400">Use if you want to override the default organization channel.</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1 h-12 border-2 font-bold rounded-xl" onClick={() => setShowCreateRule(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl" onClick={handleCreateRule}>
                Deploy Rule
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
