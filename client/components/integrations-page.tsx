"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Database, 
  Activity,
  Plus,
  ExternalLink,
  Loader2,
  FileDown,
  ChevronDown,
  FileText
} from "lucide-react"
import { CSVImportWizard } from "./csv-import-wizard"
import { toast } from "sonner"
import { integrationTemplates, downloadCSV } from "@/utils/csv-template-generator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { API_BASE_URL } from "@/lib/api-config"

interface Connector {
  id: string
  type: string
  status: "connected" | "disconnected" | "syncing" | "error"
  lastSyncedAt?: string
  syncFrequencyHours?: number
  autoSyncEnabled: boolean
  lastSyncStatus?: string
  lastSyncError?: string
  createdAt: string
}

interface Integration {
  id: string
  name: string
  type: "accounting" | "payment" | "banking"
  icon: string
  description: string
  supported: boolean
  connector?: Connector
}

const availableIntegrations: Integration[] = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    type: "accounting",
    icon: "📊",
    description: "Sync invoices, expenses, and financial data from QuickBooks",
    supported: true,
  },
  {
    id: "xero",
    name: "Xero",
    type: "accounting",
    icon: "📈",
    description: "Connect your Xero accounting system for real-time financial data",
    supported: true,
  },
  {
    id: "tally",
    name: "Tally",
    type: "accounting",
    icon: "📋",
    description: "Import data from Tally accounting software",
    supported: true,
  },
  {
    id: "zoho",
    name: "Zoho Books",
    type: "accounting",
    icon: "📑",
    description: "Sync transactions and financial data from Zoho Books",
    supported: true,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    type: "payment",
    icon: "💳",
    description: "Import payment transactions from Razorpay",
    supported: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "payment",
    icon: "💵",
    description: "Sync payment data from Stripe",
    supported: true,
  },
  {
    id: "slack",
    name: "Slack",
    type: "payment",
    icon: "💬",
    description: "Get notifications and alerts in Slack",
    supported: false,
  },
  {
    id: "asana",
    name: "Asana",
    type: "payment",
    icon: "📋",
    description: "Sync tasks and project data from Asana",
    supported: false,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    type: "payment",
    icon: "📅",
    description: "Sync calendar events and reminders",
    supported: false,
  },
  {
    id: "plaid",
    name: "Plaid",
    type: "banking",
    icon: "🏦",
    description: "Connect bank accounts via Plaid",
    supported: false,
  },
  {
    id: "cleartax",
    name: "ClearTax",
    type: "accounting",
    icon: "📊",
    description: "Sync tax and compliance data from ClearTax",
    supported: false,
  },
  {
    id: "supabase",
    name: "Supabase",
    type: "accounting",
    icon: "🗄️",
    description: "Connect to Supabase database",
    supported: false,
  },
]

export function IntegrationsPage() {
  // 1. STATE
  const [integrations, setIntegrations] = useState<Integration[]>(() => 
    availableIntegrations.map(i => ({ ...i, connector: undefined }))
  )
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Set<string>>(new Set())
  const [syncProgress, setSyncProgress] = useState<{ [key: string]: number }>({})
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 2. HELPERS
  const getAuthToken = useCallback(() => {
    return localStorage.getItem("auth-token") || document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]
  }, [])

  const checkCompletion = useCallback(async (id: string) => {
    try {
      const modeSelected = localStorage.getItem("finapilot_mode_selected")
      if (modeSelected === "pending_integration") {
        const { checkUserHasData } = await import("@/lib/user-data-check")
        const hasData = await checkUserHasData(id)
        if (hasData) {
          localStorage.setItem("finapilot_mode_selected", "true")
          window.dispatchEvent(new CustomEvent('integration-completed'))
        }
      }
    } catch (e) {
      console.error("[Integrations] checkCompletion error:", e)
    }
  }, [])

  const fetchImportHistory = useCallback(async (id: string) => {
    if (!id) return
    console.log("[Integrations] Fetching import history for org:", id)
    
    setLoadingHistory(true)
    const token = getAuthToken()
    if (!token) {
      setLoadingHistory(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/jobs?orgId=${id}&jobType=csv_import&limit=10`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data) {
          setImportHistory(result.data)
          console.log("[Integrations] Import history updated:", result.data.length, "jobs")
        } else if (Array.isArray(result)) {
          setImportHistory(result)
        }
      }
    } catch (err) {
      console.error("[Integrations] Failed to fetch import history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }, [getAuthToken])

  const fetchAllData = useCallback(async (id: string) => {
    if (!id) return
    console.log("[Integrations] Fetching all data for org:", id)
    
    setLoading(true)
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      // Parallel fetches for efficiency
      const [connRes, histRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/connectors/orgs/${id}/connectors`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/jobs?orgId=${id}&jobType=csv_import&limit=10`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        })
      ])

      // 1. Process Connectors
      if (connRes.status === 'fulfilled' && connRes.value.ok) {
        const result = await connRes.value.json()
        let list: Connector[] = []
        if (result && result.ok && result.data) {
          list = Array.isArray(result.data) ? result.data : (result.data.connectors || [])
        } else if (Array.isArray(result)) {
          list = result
        }
        
        setConnectors(list)
        setIntegrations(availableIntegrations.map(i => ({
          ...i,
          connector: list.find((c: any) => c && c.type === i.id) || undefined
        })))
      } else {
        console.warn("[Integrations] Connectors fetch failed, using fallback")
        setIntegrations(availableIntegrations.map(i => ({ ...i, connector: undefined })))
      }

      // 2. Process History
      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        const result = await histRes.value.json()
        if (result.ok && result.data) {
          setImportHistory(result.data)
        } else if (Array.isArray(result)) {
          setImportHistory(result)
        }
      }

      // 3. Check if onboarding complete
      setTimeout(() => checkCompletion(id), 1000)

    } catch (err) {
      console.error("[Integrations] fetchAllData critical error:", err)
      setIntegrations(availableIntegrations.map(i => ({ ...i, connector: undefined })))
    } finally {
      setLoading(false)
    }
  }, [getAuthToken, checkCompletion])

  // 3. EFFECTS
  // Initial mount: get Org ID
  useEffect(() => {
    const stored = localStorage.getItem("orgId")
    if (stored) {
      setOrgId(stored)
    } else {
      const token = getAuthToken()
      if (token) {
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        }).then(res => res.json()).then(data => {
          if (data.orgs?.length > 0) {
            localStorage.setItem("orgId", data.orgs[0].id)
            setOrgId(data.orgs[0].id)
          } else {
            setLoading(false)
          }
        }).catch(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }
  }, [getAuthToken])

  // When orgId is set, fetch data
  useEffect(() => {
    if (orgId) {
      fetchAllData(orgId)
      fetchImportHistory(orgId) // Also fetch import history on mount
    }
  }, [orgId, fetchAllData, fetchImportHistory])

  // Global event listeners for data refresh
  useEffect(() => {
    const handleRefresh = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}
      
      // Use the orgId from event if available, otherwise use current orgId
      const targetOrgId = importedOrgId || orgId
      
      if (targetOrgId) {
        console.log("[Integrations] CSV import completed, refreshing data...", { rowsImported, targetOrgId })
        toast.success(`CSV import completed! Refreshing integrations...`)
        
        // Update orgId if it came from the event
        if (importedOrgId && importedOrgId !== orgId) {
          setOrgId(importedOrgId)
          localStorage.setItem("orgId", importedOrgId)
        }
        
        // Refresh all data with a small delay to ensure backend has processed
        setTimeout(async () => {
          await fetchAllData(targetOrgId)
          // Explicitly refresh import history
          await fetchImportHistory(targetOrgId)
        }, 2000)
      } else {
        console.warn("[Integrations] No orgId available for refresh")
      }
    }
    
    const listener = handleRefresh as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    window.addEventListener('xlsx-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
      window.removeEventListener('xlsx-import-completed', listener)
    }
  }, [orgId, fetchAllData, fetchImportHistory])

  // 4. HANDLERS
  const handleConnect = async (integration: Integration) => {
    if (!orgId) return toast.error("Organization ID not found")
    setSelectedIntegration(integration)
    setShowConnectDialog(true)

    try {
      const token = getAuthToken()
      if (!token) throw new Error("Authentication token not found")

      const response = await fetch(
        `${API_BASE_URL}/connectors/orgs/${orgId}/connectors/${integration.id}/start-oauth`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        }
      )

      if (!response.ok) throw new Error("Failed to start OAuth")
      const result = await response.json()
      if (result.ok && result.data?.authUrl) {
        window.location.href = result.data.authUrl
      } else {
        throw new Error("Invalid OAuth response")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed")
      setShowConnectDialog(false)
    }
  }

  const handleSyncNow = async (connectorId: string) => {
    if (syncing.has(connectorId)) return
    const token = getAuthToken()
    if (!token) return

    setSyncing(prev => new Set(prev).add(connectorId))
    setSyncProgress(prev => ({ ...prev, [connectorId]: 0 }))

    try {
      const res = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) throw new Error("Sync request failed")

      // Mock progress for UI
      let p = 0
      const interval = setInterval(() => {
        p += 10
        setSyncProgress(prev => ({ ...prev, [connectorId]: p }))
        if (p >= 100) clearInterval(interval)
      }, 200)

      setTimeout(() => {
        clearInterval(interval)
        setSyncing(prev => { const n = new Set(prev); n.delete(connectorId); return n })
        setSyncProgress(prev => { const n = { ...prev }; delete n[connectorId]; return n })
        toast.success("Sync completed")
        if (orgId) fetchAllData(orgId)
      }, 2500)
    } catch (err) {
      toast.error("Sync failed")
      setSyncing(prev => { const n = new Set(prev); n.delete(connectorId); return n })
    }
  }

  const handleToggleAutoSync = async (connectorId: string, enabled: boolean) => {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync-settings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ autoSyncEnabled: enabled }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast.success(`Auto-sync ${enabled ? "enabled" : "disabled"}`)
      if (orgId) fetchAllData(orgId)
    } catch (err) {
      toast.error("Update failed")
    }
  }

  // 5. RENDER HELPERS
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "syncing": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "error": return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected": return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case "syncing": return <Badge className="bg-blue-100 text-blue-800">Syncing</Badge>
      case "error": return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default: return <Badge variant="secondary">Disconnected</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    try { return new Date(dateString).toLocaleString() } catch { return "Invalid date" }
  }

  const connectedCount = integrations.filter((i) => i.connector?.status === "connected").length
  const totalSyncs = connectors.length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect your accounting systems, payment gateways, and banking services</p>
        </div>
        <div className="flex gap-2">
          <CSVImportWizard />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{connectedCount}</p>
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
                <p className="text-2xl font-bold">{availableIntegrations.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Syncs</p>
                <p className="text-2xl font-bold">{totalSyncs}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Import Templates */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>CSV Import Templates</CardTitle>
              <CardDescription>Download CSV templates for different accounting systems</CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileDown className="mr-2 h-4 w-4" /> Download Template <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px]">
                  <DropdownMenuLabel>Select Template Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(integrationTemplates).map(([key, template]: [string, any]) => (
                    <DropdownMenuItem key={key} onClick={() => { downloadCSV(template.generator(), template.filename); toast.success(`${template.filename} downloaded!`) }}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.filename.replace('.csv', '').replace(/-/g, ' ')}</span>
                        <span className="text-xs text-muted-foreground">CSV Template</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Template Guide</p>
                <p className="text-xs text-blue-700 mt-1">Required fields: Date and Amount. Recommended: Description, Category, Account.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History - Always show, even if empty */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent CSV Imports</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => orgId && fetchImportHistory(orgId)}
              disabled={loadingHistory}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : importHistory.length > 0 ? (
            <div className="space-y-3">
              {importHistory.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${
                        job.status === 'done' || job.status === 'completed' ? 'text-green-600' : 
                        job.status === 'failed' || job.status === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {job.status === 'done' || job.status === 'completed' ? '✅ Completed' : 
                         job.status === 'failed' || job.status === 'error' ? '❌ Failed' :
                         job.status === 'running' ? '🔄 Running' :
                         job.status === 'queued' ? '⏳ Queued' :
                         job.status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {job.logs && typeof job.logs === 'object' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {Array.isArray(job.logs) && job.logs.length > 0 && (
                          <span>Rows: {job.logs[job.logs.length - 1]?.meta?.rows_imported || 'N/A'}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {job.finishedAt ? (
                      <span>Finished: {new Date(job.finishedAt).toLocaleTimeString()}</span>
                    ) : (
                      <span className="text-blue-600">In progress...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No CSV imports yet</p>
              <p className="text-sm mt-1">Import a CSV file to see your import history here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
        {loading && integrations.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const connector = integration.connector
              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      {connector && getStatusIcon(connector.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {connector ? (
                      <>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(connector.status)}
                          <Badge variant="outline" className="text-[10px]">{integration.type}</Badge>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between"><span>Last Sync:</span><span className="font-medium">{formatDate(connector.lastSyncedAt)}</span></div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSyncNow(connector.id)} disabled={syncing.has(connector.id)}>
                            {syncing.has(connector.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} Sync
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button className="w-full" size="sm" onClick={() => handleConnect(integration)} disabled={!integration.supported}>
                        <Plus className="h-3 w-3 mr-1" /> Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>Redirecting to {selectedIntegration?.name} for authorization.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedIntegration && handleConnect(selectedIntegration)}>Continue <ExternalLink className="h-4 w-4 ml-2" /></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
