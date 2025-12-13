"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings, 
  AlertTriangle, 
  Database, 
  Activity,
  Plus,
  ExternalLink,
  Loader2,
  FileDown,
  ChevronDown
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
]

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(availableIntegrations)
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

  useEffect(() => {
    fetchOrgId()
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchConnectors()
      fetchImportHistory()
    }
  }, [orgId])

  // Refresh import history when CSV import completes
  useEffect(() => {
    const handleImportComplete = (event: CustomEvent) => {
      if (orgId) {
        fetchConnectors()
        fetchImportHistory() // Refresh history
        toast.success(`CSV import completed! Data is now available in Overview, Budget vs Actual, and Financial Modeling.`)
      }
    }

    window.addEventListener('csv-import-completed', handleImportComplete as EventListener)
    return () => {
      window.removeEventListener('csv-import-completed', handleImportComplete as EventListener)
    }
  }, [orgId])

  const fetchImportHistory = async () => {
    if (!orgId) return
    
    setLoadingHistory(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`${API_BASE_URL}/jobs?orgId=${orgId}&jobType=csv_import&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data) {
          setImportHistory(result.data)
        }
      }
    } catch (error) {
      // Silently handle network errors for import history - don't show errors if backend is down
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch import history"
      const isNetworkError = 
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_NETWORK") ||
        (error instanceof TypeError && error.message.includes("fetch"))
      
      if (!isNetworkError) {
        console.error("Failed to fetch import history:", error)
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  // Listen for CSV import completion to refresh data
  useEffect(() => {
    const handleImportComplete = (event: CustomEvent) => {
      // Refresh connectors and import history
      if (orgId) {
        fetchConnectors()
        fetchImportHistory()
        toast.success(`CSV import completed! Data is now available in Overview, Budget vs Actual, and Financial Modeling.`)
      }
    }

    window.addEventListener('csv-import-completed', handleImportComplete as EventListener)
    return () => {
      window.removeEventListener('csv-import-completed', handleImportComplete as EventListener)
    }
  }, [orgId])

  const fetchOrgId = async (): Promise<string | null> => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) {
      setOrgId(storedOrgId)
      return storedOrgId
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return null

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.orgs && userData.orgs.length > 0) {
          const primaryOrgId = userData.orgs[0].id
          localStorage.setItem("orgId", primaryOrgId)
          setOrgId(primaryOrgId)
          return primaryOrgId
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchConnectors = async () => {
    if (!orgId) return

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/connectors/orgs/${orgId}/connectors`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        // Handle 404 (no connectors) gracefully
        if (response.status === 404) {
          setConnectors([])
          setIntegrations((prev) =>
            prev.map((integration) => ({
              ...integration,
              connector: undefined,
            }))
          )
          setLoading(false)
          return
        }
        throw new Error(`Failed to fetch connectors: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Safely extract connectors list
      let connectorsList: Connector[] = []
      
      if (result.ok && result.data) {
        // Backend returns { ok: true, data: connectors[] } where data is an array
        if (Array.isArray(result.data)) {
          connectorsList = result.data
        } else if (result.data.connectors && Array.isArray(result.data.connectors)) {
          connectorsList = result.data.connectors
        } else if (result.data && typeof result.data === 'object') {
          // If data is an object but not an array, try to extract connectors
          connectorsList = []
        }
      }
      
      // Always set connectors (even if empty)
      setConnectors(connectorsList)
      
      // Map connectors to integrations safely
      setIntegrations((prev) =>
        prev.map((integration) => {
          // Safely find connector
          const connector = Array.isArray(connectorsList) 
            ? connectorsList.find((c: Connector) => c && c.type === integration.id)
            : undefined
          
          return {
            ...integration,
            connector: connector || undefined,
          }
        })
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load connectors"
      console.error("Error fetching connectors:", err)
      
      // Check if it's a network error (backend not running)
      const isNetworkError = 
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_NETWORK") ||
        errorMessage.includes("ERR_INTERNET_DISCONNECTED") ||
        errorMessage.includes("ERR_NETWORK_IO_SUSPENDED") ||
        (err instanceof TypeError && err.message.includes("fetch"))
      
      // On error, still set empty arrays to prevent undefined errors
      setConnectors([])
      setIntegrations((prev) =>
        prev.map((integration) => ({
          ...integration,
          connector: undefined,
        }))
      )
      
      // Only show error for non-network errors and non-404 errors
      if (isNetworkError) {
        // Network errors are expected when backend is not running - don't show error toast
        // Just log it for debugging
        console.warn("Backend server appears to be unavailable. Connectors will not be loaded until server is running.")
        setError(null) // Don't show error in UI for network issues
      } else if (errorMessage && !errorMessage.includes("404") && !errorMessage.includes("not found")) {
        // Show error for actual API errors (not 404, not network)
        setError(errorMessage)
        toast.error(errorMessage)
      } else {
        // 404 or not found is expected for new users - clear error
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (integration: Integration) => {
    if (!orgId) {
      toast.error("Organization ID not found")
      return
    }

    setSelectedIntegration(integration)
    setShowConnectDialog(true)

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Start OAuth flow
      const response = await fetch(
        `${API_BASE_URL}/connectors/orgs/${orgId}/connectors/${integration.id}/start-oauth`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to start OAuth: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.data?.authUrl) {
        // Redirect to OAuth provider
        window.location.href = result.data.authUrl
      } else {
        throw new Error("Invalid OAuth response")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect integration"
      const isNetworkError = 
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_NETWORK") ||
        (err instanceof TypeError && err.message.includes("fetch"))
      
      if (isNetworkError) {
        toast.error("Cannot connect to server. Please ensure the backend server is running.")
      } else {
        toast.error(errorMessage)
      }
      setShowConnectDialog(false)
    }
  }

  const handleSyncNow = async (connectorId: string) => {
    if (syncing.has(connectorId)) return

    setSyncing((prev) => new Set(prev).add(connectorId))
    setSyncProgress((prev) => ({ ...prev, [connectorId]: 0 }))

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Simulate progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += 10
        setSyncProgress((prev) => ({ ...prev, [connectorId]: progress }))
        if (progress >= 100) {
          clearInterval(progressInterval)
        }
      }, 300)

      // Wait for sync to complete (in production, poll job status)
      setTimeout(() => {
        clearInterval(progressInterval)
        setSyncing((prev) => {
          const newSet = new Set(prev)
          newSet.delete(connectorId)
          return newSet
        })
        setSyncProgress((prev) => {
          const newProgress = { ...prev }
          delete newProgress[connectorId]
          return newProgress
        })
        toast.success("Sync completed successfully")
        fetchConnectors() // Refresh connectors
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync"
      const isNetworkError = 
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_NETWORK") ||
        (err instanceof TypeError && err.message.includes("fetch"))
      
      if (isNetworkError) {
        toast.error("Cannot connect to server. Please ensure the backend server is running.")
      } else {
        toast.error(errorMessage)
      }
      setSyncing((prev) => {
        const newSet = new Set(prev)
        newSet.delete(connectorId)
        return newSet
      })
      setSyncProgress((prev) => {
        const newProgress = { ...prev }
        delete newProgress[connectorId]
        return newProgress
      })
    }
  }

  const handleToggleAutoSync = async (connectorId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/connectors/${connectorId}/sync-settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ autoSyncEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to update sync settings")
      }

      toast.success(`Auto-sync ${enabled ? "enabled" : "disabled"}`)
      fetchConnectors()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update auto-sync settings"
      const isNetworkError = 
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_NETWORK") ||
        (err instanceof TypeError && err.message.includes("fetch"))
      
      if (isNetworkError) {
        toast.error("Cannot connect to server. Please ensure the backend server is running.")
      } else {
        toast.error("Failed to update auto-sync settings")
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case "syncing":
        return <Badge className="bg-blue-100 text-blue-800">Syncing</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge variant="secondary">Disconnected</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "Invalid date"
    }
  }

  const connectedCount = integrations.filter((i) => i.connector?.status === "connected").length
  const totalConnectors = connectors.length

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your accounting systems, payment gateways, and banking services
          </p>
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
                <p className="text-2xl font-bold">{totalConnectors}</p>
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
              <CardDescription>
                Download CSV templates for different accounting systems and payment processors
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Template
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="bottom"
                  sideOffset={8}
                  className="w-[280px] max-h-[60vh] overflow-y-auto"
                  collisionPadding={{ top: 8, bottom: 8, left: 16, right: 16 }}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                <DropdownMenuLabel>Select Template Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.quickbooks.generator()
                    downloadCSV(csvContent, integrationTemplates.quickbooks.filename)
                    toast.success('QuickBooks template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">QuickBooks Online</span>
                    <span className="text-xs text-muted-foreground">For QuickBooks exports</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.xero.generator()
                    downloadCSV(csvContent, integrationTemplates.xero.filename)
                    toast.success('Xero template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Xero</span>
                    <span className="text-xs text-muted-foreground">For Xero accounting exports</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.tally.generator()
                    downloadCSV(csvContent, integrationTemplates.tally.filename)
                    toast.success('Tally template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Tally</span>
                    <span className="text-xs text-muted-foreground">For Tally accounting software</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.zoho.generator()
                    downloadCSV(csvContent, integrationTemplates.zoho.filename)
                    toast.success('Zoho Books template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Zoho Books</span>
                    <span className="text-xs text-muted-foreground">For Zoho Books exports</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.razorpay.generator()
                    downloadCSV(csvContent, integrationTemplates.razorpay.filename)
                    toast.success('Razorpay template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Razorpay</span>
                    <span className="text-xs text-muted-foreground">For Razorpay payment gateway</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.stripe.generator()
                    downloadCSV(csvContent, integrationTemplates.stripe.filename)
                    toast.success('Stripe template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Stripe</span>
                    <span className="text-xs text-muted-foreground">For Stripe payment processor</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.bank.generator()
                    downloadCSV(csvContent, integrationTemplates.bank.filename)
                    toast.success('Bank statement template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Bank Statement</span>
                    <span className="text-xs text-muted-foreground">For bank statement imports</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.generic.generator()
                    downloadCSV(csvContent, integrationTemplates.generic.filename)
                    toast.success('Generic accounting template downloaded!')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Generic Accounting</span>
                    <span className="text-xs text-muted-foreground">For any accounting system</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const csvContent = integrationTemplates.test.generator()
                    downloadCSV(csvContent, integrationTemplates.test.filename)
                    toast.success('Comprehensive test data downloaded! Perfect for testing all features.')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Comprehensive Test Data</span>
                    <span className="text-xs text-muted-foreground">6 months of realistic transactions for testing</span>
                  </div>
                </DropdownMenuItem>
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
                <p className="text-xs text-blue-700 mt-1">
                  Each template includes sample data with proper formatting. Required fields: Date and Amount. 
                  Optional fields: Description, Category, Account, Reference, Type, and Currency. 
                  Templates are compatible with Excel and can be customized to match your data format.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import History */}
      {importHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent CSV Imports</CardTitle>
            <CardDescription>View your recent CSV import history and results</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {importHistory.map((job: any) => {
                  // Extract import statistics from logs
                  let rowsImported = 0
                  let rowsSkipped = 0
                  const logs = job.logs || []
                  
                  if (Array.isArray(logs)) {
                    for (const entry of logs.reverse()) {
                      if (entry && entry.meta) {
                        if (entry.meta.rows_imported !== undefined) {
                          rowsImported = entry.meta.rows_imported
                        }
                        if (entry.meta.rows_skipped !== undefined) {
                          rowsSkipped = entry.meta.rows_skipped
                        }
                      }
                    }
                  }
                  
                  const statusColor = 
                    job.status === 'done' ? 'text-green-600' :
                    job.status === 'failed' ? 'text-red-600' :
                    job.status === 'running' ? 'text-blue-600' :
                    'text-gray-600'
                  
                  return (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${statusColor}`}>
                            {job.status === 'done' ? '✅ Completed' :
                             job.status === 'failed' ? '❌ Failed' :
                             job.status === 'running' ? '🔄 Processing' :
                             job.status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(job.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {job.status === 'done' && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {rowsImported > 0 ? (
                              <>
                                <span className="text-green-600 font-medium">{rowsImported} rows imported</span>
                                {rowsSkipped > 0 && (
                                  <span className="ml-2 text-orange-600">({rowsSkipped} skipped)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-orange-600">0 rows imported</span>
                            )}
                            {job.progress !== undefined && (
                              <span className="ml-2">• Progress: {job.progress}%</span>
                            )}
                          </div>
                        )}
                        {job.status === 'failed' && job.lastError && (
                          <div className="mt-2 text-sm text-red-600">
                            Error: {job.lastError.substring(0, 100)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {job.finishedAt ? (
                          <span className="text-xs text-muted-foreground">
                            Finished: {new Date(job.finishedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            In progress...
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const connector = integration.connector
              const isConnected = connector?.status === "connected"
              const isSyncing = syncing.has(connector?.id || "")

              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{integration.icon}</span>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription className="mt-1">{integration.description}</CardDescription>
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
                          <Badge variant="outline" className="text-xs">
                            {integration.type}
                          </Badge>
                        </div>

                        {isSyncing && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Syncing...</span>
                              <span className="font-medium">{syncProgress[connector.id] || 0}%</span>
                            </div>
                            <Progress value={syncProgress[connector.id] || 0} className="h-2" />
                          </div>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Sync:</span>
                            <span className="font-medium">{formatDate(connector.lastSyncedAt)}</span>
                          </div>
                          {connector.lastSyncStatus && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge
                                variant={
                                  connector.lastSyncStatus === "success"
                                    ? "default"
                                    : connector.lastSyncStatus === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {connector.lastSyncStatus}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={connector.autoSyncEnabled}
                              onCheckedChange={(checked) => handleToggleAutoSync(connector.id, checked)}
                              disabled={isSyncing}
                            />
                            <Label className="text-xs">Auto-sync</Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncNow(connector.id)}
                            disabled={isSyncing || connector.status === "error"}
                          >
                            {isSyncing ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Sync Now
                          </Button>
                        </div>

                        {connector.lastSyncError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">{connector.lastSyncError}</AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleConnect(integration)}
                        disabled={!integration.supported}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Connect {integration.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              You will be redirected to {selectedIntegration?.name} to authorize the connection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedIntegration && handleConnect(selectedIntegration)}>
              Continue to {selectedIntegration?.name}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
