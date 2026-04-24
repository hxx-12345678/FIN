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
  AlertCircle,
  Database,
  Activity,
  Plus,
  ExternalLink,
  Loader2,
  Zap,
  FileDown,
  ChevronDown,
  FileText,
  Upload
} from "lucide-react"
import { CSVImportWizard } from "./csv-import-wizard"
import { ConnectorCredentialsModal } from "./connector-credentials-modal"
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
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

interface Connector {
  id: string
  type: string
  status: "connected" | "disconnected" | "syncing" | "error" | "auth_pending"
  lastSyncedAt?: string
  syncFrequencyHours?: number
  autoSyncEnabled: boolean
  lastSyncStatus?: string
  lastSyncError?: string
  configJson?: any
  createdAt: string
}

interface Integration {
  id: string
  name: string
  type: "accounting" | "payment" | "banking" | "erp" | "collaboration" | "compliance"
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
    description: "Sync chart of accounts, invoices, expenses, P&L, and balance sheet data from QuickBooks Online via OAuth 2.0",
    supported: true,
  },
  {
    id: "xero",
    name: "Xero",
    type: "accounting",
    icon: "📈",
    description: "Connect Xero for real-time sync of journals, contacts, bank transactions, and financial statements via Xero OAuth",
    supported: true,
  },
  {
    id: "zoho",
    name: "Zoho Books",
    type: "accounting",
    icon: "📑",
    description: "Pull invoices, bills, chart of accounts, and tax summaries from Zoho Books using Zoho OAuth 2.0 API",
    supported: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "payment",
    icon: "💵",
    description: "Sync subscriptions, charges, payouts, refunds, and MRR/ARR metrics from Stripe via API key or OAuth",
    supported: true,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    type: "payment",
    icon: "💳",
    description: "Import payment settlements, refunds, disputes, and GST invoices from Razorpay using API key authentication",
    supported: true,
  },
  {
    id: "plaid",
    name: "Plaid",
    type: "banking",
    icon: "🏦",
    description: "Securely connect bank accounts via Plaid Link for real-time balance, transaction, and cash flow data across 12,000+ institutions",
    supported: true,
  },
  {
    id: "cleartax",
    name: "ClearTax",
    type: "compliance",
    icon: "📋",
    description: "Sync GST filings, TDS returns, ITR data, and compliance status from ClearTax for automated tax reconciliation",
    supported: true,
  },
  {
    id: "slack",
    name: "Slack",
    type: "collaboration",
    icon: "💬",
    description: "Receive real-time KPI alerts, anomaly notifications, budget variance warnings, and AI CFO insights directly in Slack channels",
    supported: true,
  },
  {
    id: "asana",
    name: "Asana",
    type: "collaboration",
    icon: "✅",
    description: "Track financial planning tasks, approval workflows, and close timelines by syncing Asana projects and task statuses",
    supported: true,
  },
  {
    id: "sap",
    name: "SAP S/4HANA",
    type: "erp",
    icon: "🏢",
    description: "Enterprise integration with SAP for GL accounts, cost centers, profit centers, and financial consolidation via SAP OData APIs",
    supported: true,
  },
  {
    id: "oracle",
    name: "Oracle Financials Cloud",
    type: "erp",
    icon: "🔶",
    description: "Connect Oracle ERP Cloud to pull general ledger, AP/AR, fixed assets, and intercompany transactions via REST APIs",
    supported: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    type: "collaboration",
    icon: "☁️",
    description: "Sync sales pipeline, opportunities, and contract value for accurate revenue forecasting and cash flow projections",
    supported: true,
  },
  {
    id: "tally",
    name: "Tally ERP 9 / Prime",
    type: "accounting",
    icon: "🇮🇳",
    description: "India's #1 accounting software. Export ledger data from Tally and import via CSV, or connect via Tally.NET API for automated sync of vouchers, ledgers, and GST data",
    supported: true,
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
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  // New state for credentials modal
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [pendingConnectorId, setPendingConnectorId] = useState<string | null>(null)

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

    try {
      const response = await fetch(`${API_BASE_URL}/jobs?orgId=${id}&jobType=csv_import&limit=10`, {
        headers: getAuthHeaders(),
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
  }, [])

  const fetchAllData = useCallback(async (id: string) => {
    setLoading(true)

    try {
      // Parallel fetches for efficiency
      const [connRes, histRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/orgs/${id}/connectors`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/jobs?orgId=${id}&jobType=csv_import&limit=10`, {
          headers: getAuthHeaders(),
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
  }, [checkCompletion])

  // 3. EFFECTS
  // Initial mount: get Org ID and check for OAuth callback results
  useEffect(() => {
    // Check for OAuth callback success/error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const connectorId = urlParams.get('connectorId')

    if (success && connectorId) {
      toast.success(`Successfully connected connector!`, { duration: 5000 })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`, { duration: 10000 })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    const stored = localStorage.getItem("orgId")
    if (stored) {
      setOrgId(stored)
      // Refresh connectors after OAuth callback
      if (success) {
        setTimeout(() => fetchAllData(stored), 1000)
      }
    } else {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
        .then(res => res.json())
        .then(data => {
          if (data.orgs?.length > 0) {
            localStorage.setItem("orgId", data.orgs[0].id)
            setOrgId(data.orgs[0].id)
            // Refresh connectors after OAuth callback
            if (success) {
              setTimeout(() => fetchAllData(data.orgs[0].id), 1000)
            }
          } else {
            setLoading(false)
          }
        })
        .catch(() => setLoading(false))
    }
  }, [fetchAllData])

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
        toast.info("Data Refresh Triggered", {
          description: "Ingested transactions are being mapped to your Digital Twin. Models will recompute automatically.",
          action: {
            label: "View Trace",
            onClick: () => console.log("Open Trace")
          }
        })

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
  const handleConnect = async (integration: Integration, fromDialog: boolean = false) => {
    if (!orgId) return toast.error("Organization ID not found")

    // API-key-based connectors (SAP, Oracle, Razorpay, Plaid, ClearTax, Asana, Stripe)
    const apiKeyConnectors = ['sap', 'oracle', 'razorpay', 'plaid', 'cleartax', 'asana', 'stripe', 'slack', 'tally']
    // OAuth-based connectors (QuickBooks, Xero, Zoho, Salesforce)
    const oauthConnectors = ['quickbooks', 'xero', 'zoho', 'salesforce']

    if (apiKeyConnectors.includes(integration.id)) {
      // For API-key-based connectors, check if connector already exists
      const existingConnector = integration.connector;
      
      if (existingConnector) {
        // Just show credentials modal with existing ID
        setPendingConnectorId(existingConnector.id)
        setSelectedIntegration(integration)
        setShowCredentialsModal(true)
        return
      }

      // Create new connector if doesn't exist
      try {
        const response = await fetch(
          `${API_BASE_URL}/orgs/${orgId}/connectors`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ type: integration.id, config: {} }),
          }
        )

        if (response.status === 401) {
          handleUnauthorized()
          throw new Error("Session expired. Please log in again.")
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to create ${integration.name} connector`)
        }

        const result = await response.json()
        const connectorId = result.data?.connectorId || result.data?.id

        // Show credentials modal
        if (connectorId) {
          setPendingConnectorId(connectorId)
          setSelectedIntegration(integration)
          setShowCredentialsModal(true)
        } else {
          throw new Error("No connector ID received")
        }
      } catch (err) {
        console.error('[Integrations] API key connector error:', err)
        toast.error(err instanceof Error ? err.message : "Connection failed", { duration: 8000 })
      }
      return
    }

    // OAuth-based connectors (default flow)
    if (!fromDialog) {
      setSelectedIntegration(integration)
      setDialogError(null)
      setShowConnectDialog(true)
      return
    }

    // Only proceed if from dialog
    try {
      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/connectors/${integration.id}/start-oauth`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      )

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Your session has expired. Please log in again.")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: Failed to start OAuth`
        // Check for placeholder credential errors
        const errorStr = String(errorMessage);
        if (errorStr.includes('credentials') || errorStr.includes('CLIENT_ID')) {
          errorMessage = `${integration.name} OAuth app is not configured yet. Please set up your ${integration.name} developer app credentials in the server environment.`
        }
        throw new Error(String(errorMessage))
      }

      const result = await response.json()
      if (result.ok && result.data?.authUrl) {
        // Sanity check: don't redirect to OAuth with placeholder credentials
        const authUrl = result.data.authUrl
        if (authUrl.includes('your-client-id') || authUrl.includes('your_client_id')) {
          throw new Error(`${integration.name} OAuth app credentials are not configured. The system is using placeholder values. Please configure real credentials in the server .env file.`)
        }
        window.location.href = authUrl
      } else {
        throw new Error(result.message || "Invalid OAuth response - no auth URL received")
      }
    } catch (err) {
      console.error('[Integrations] Connection error:', err)
      const errorMessage = err instanceof Error ? err.message : "Connection failed"
      setDialogError(errorMessage)
      toast.error(errorMessage, { duration: 10000 })
    }
  }

  const handleSyncNow = async (connectorId: string) => {
    if (syncing.has(connectorId)) return

    setSyncing(prev => new Set(prev).add(connectorId))
    setSyncProgress(prev => ({ ...prev, [connectorId]: 0 }))

    try {
      const res = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }
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
    try {
      const res = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync-settings`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ autoSyncEnabled: enabled }),
      })
      if (res.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }
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
      case "auth_pending": return <Clock className="h-4 w-4 text-amber-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected": return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case "syncing": return <Badge className="bg-blue-100 text-blue-800">Syncing</Badge>
      case "error": return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case "auth_pending": return <Badge className="bg-amber-100 text-amber-800">Setup Pending</Badge>
      default: return <Badge variant="secondary">Disconnected</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    try { return new Date(dateString).toLocaleString() } catch { return "Invalid date" }
  }

  const connectedCount = integrations.filter((i) => i.connector?.status === "connected").length
  
  // Total Syncs should be the number of unique connectors that have successfully completed a sync
  const totalSyncs = connectors.filter(c => c.status === "connected" && c.lastSyncedAt).length;

  // Calculate total volume of data synced (Connectors + CSV Imports)
  const totalVolume = connectors.reduce((acc, c) => {
    const stats = c.configJson?.last_sync_stats?.records_inserted || 0;
    return acc + (typeof stats === 'number' ? stats : 0);
  }, 0) + importHistory.reduce((acc, job) => {
    const logs = Array.isArray(job.logs) ? job.logs : [];
    const meta = [...logs].reverse().find((l: any) => l?.meta?.params)?.meta?.params;
    const legacy = [...logs].reverse().find((l: any) => l?.rowsImported || l?.transactionsCreated);
    const rows = meta?.rowsImported || meta?.transactionsCreated || legacy?.rowsImported || legacy?.transactionsCreated || 0;
    return acc + rows;
  }, 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect your accounting systems, payment gateways, and banking services</p>
        </div>
        <div className="flex gap-2">
          <CSVImportWizard
            orgId={orgId}
            onImportComplete={() => fetchAllData(orgId!)}
            triggerContent={
              <Button size="sm" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            }
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Connected</p>
                <p className="text-2xl font-bold text-green-900">{connectedCount}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Available</p>
                <p className="text-2xl font-bold text-blue-900">{availableIntegrations.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Sync Velocity</p>
                <p className="text-2xl font-bold text-purple-900">{totalSyncs}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">Data Points</p>
                <p className="text-2xl font-bold text-amber-900">{totalVolume.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
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
                      <span className={`font-medium ${job.status === 'done' || job.status === 'completed' ? 'text-green-600' :
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
                    {/* Row count: read from params first (Python worker stores it there), then logs */}
                    {(() => {
                      const logs = Array.isArray(job.logs) ? job.logs : [];
                      const meta = [...logs].reverse().find((l: any) => l?.meta?.params)?.meta?.params;
                      const legacy = [...logs].reverse().find((l: any) => l?.rowsImported || l?.transactionsCreated);
                      
                      const rowsImported: number = meta?.rowsImported || meta?.transactionsCreated || legacy?.rowsImported || legacy?.transactionsCreated || 0;
                      return rowsImported > 0 ? (
                        <div className="text-xs text-muted-foreground mt-1 space-x-3">
                          <span className="font-medium text-slate-700">
                            📊 {Number(rowsImported).toLocaleString()} rows imported
                          </span>
                          {Array.isArray(job.logs) && job.logs.length > 0 && job.logs[job.logs.length - 1]?.meta?.rows_skipped > 0 && (
                            <span className="text-orange-600">
                              · {job.logs[job.logs.length - 1]?.meta?.rows_skipped} duplicates skipped
                            </span>
                          )}
                        </div>
                      ) : null
                    })()}

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
        <h2 id="available-integrations" className="text-xl font-semibold mb-4 text-slate-800">Available Integrations</h2>
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
                    {connector && connector.status === "connected" ? (
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
                    ) : connector && connector.status === "error" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            {getStatusBadge(connector.status)}
                            <Badge variant="outline" className="text-[10px]">{integration.type}</Badge>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs">
                          <p className="font-bold text-red-800 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> API Sync Failure</p>
                          <p className="text-red-700 mt-1">{connector.lastSyncError || "Authentication token expired or API connection lost."}</p>
                          {connector.lastSyncedAt && <p className="text-red-600 mt-2 font-medium">Last successful sync: {formatDate(connector.lastSyncedAt)}</p>}
                        </div>
                        <div className="space-y-2">
                          <Button 
                            className="w-full" 
                            size="sm" 
                            onClick={() => handleConnect(integration)} 
                            variant="destructive"
                          >
                            <RefreshCw className="h-3 w-3 mr-2" /> Reconnect API
                          </Button>
                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-2 text-slate-400">or manual fallback</span></div>
                          </div>
                          <CSVImportWizard 
                            orgId={orgId} 
                            onImportComplete={() => fetchAllData(orgId!)}
                            triggerContent={
                              <Button className="w-full" size="sm" variant="outline">
                                <Upload className="h-3 w-3 mr-2" /> Upload Data Manually
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {connector && connector.status !== "connected" && (
                          <div className="flex items-center justify-between">
                            {getStatusBadge(connector.status)}
                            <Badge variant="outline" className="text-[10px]">{integration.type}</Badge>
                          </div>
                        )}
                        <Button 
                          className="w-full" 
                          size="sm" 
                          onClick={() => handleConnect(integration)} 
                          disabled={!integration.supported}
                          variant="default"
                        >
                          {connector ? (connector.status === "auth_pending" ? "Complete Setup" : "Reconnect") : <><Plus className="h-3 w-3 mr-1" /> Connect</>}
                        </Button>
                      </div>
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
          {dialogError && (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                {dialogError}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedIntegration && handleConnect(selectedIntegration, true)}>Continue <ExternalLink className="h-4 w-4 ml-2" /></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal for API-Key Connectors */}
      {pendingConnectorId && selectedIntegration && (
        <ConnectorCredentialsModal
          open={showCredentialsModal}
          onOpenChange={setShowCredentialsModal}
          connectorId={pendingConnectorId}
          connectorType={selectedIntegration.id}
          connectorName={selectedIntegration.name}
          orgId={orgId || ""}
          onSuccess={() => {
            // Refresh data after successful configuration
            if (orgId) {
              fetchAllData(orgId)
            }
          }}
        />
      )}
    </div>
  )
}
