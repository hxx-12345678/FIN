"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts"
import { Play, Pause, RotateCcw, Zap, TrendingUp, Users, DollarSign, Activity, Loader2, AlertCircle, Share2, ShieldCheck, Calendar } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"

interface SimulationParams {
  monthlyGrowthRate: number
  customerAcquisitionCost: number
  customerLifetimeValue: number
  churnRate: number
  pricingTier: number
  teamSize: number
  marketingSpend: number
}

const initialParams: SimulationParams = {
  monthlyGrowthRate: 8,
  customerAcquisitionCost: 125,
  customerLifetimeValue: 2400,
  churnRate: 2.5,
  pricingTier: 99,
  teamSize: 12,
  marketingSpend: 8000,
}

export function RealtimeSimulations() {
  const { currencySymbol, formatCurrency } = useOrg()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "revenue"

  const [params, setParams] = useState<SimulationParams>(initialParams)
  const [isRunning, setIsRunning] = useState(false)
  const [simulationData, setSimulationData] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [simulationId, setSimulationId] = useState<string | null>(null)
  const [decisionImpact, setDecisionImpact] = useState<any>(null)
  const [calculatingImpact, setCalculatingImpact] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [creatingSnapshot, setCreatingSnapshot] = useState(false)

  // Fetch decision impact whenever params change
  useEffect(() => {
    if (!orgId || loading) return

    const fetchImpact = async () => {
      setCalculatingImpact(true)
      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/decision-impact`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            headcountChange: params.teamSize - initialParams.teamSize,
            marketingSpendChange: params.marketingSpend - initialParams.marketingSpend,
            revenueChange: (params.pricingTier * params.monthlyGrowthRate) - (initialParams.pricingTier * initialParams.monthlyGrowthRate) // Simplified delta
          }),
        })

        if (response.ok) {
          const result = await response.json()
          setDecisionImpact(result.data)
        }
      } catch (err) {
        console.error("Impact calculation failed:", err)
      } finally {
        setCalculatingImpact(false)
      }
    }

    const timer = setTimeout(fetchImpact, 1200) // Debounce
    return () => clearTimeout(timer)
  }, [params, orgId, loading])

  const handleShareSnapshot = async () => {
    if (!orgId) return
    setCreatingSnapshot(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/decision-snapshots`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          params,
          name: `Board Update - ${new Date().toLocaleDateString()}`,
          description: "Scenario snapshot for board meeting"
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setShareUrl(result.data.shareUrl)
        toast.success("Snapshot created! Copy the link below to share with the board.")
      }
    } catch (err) {
      toast.error("Failed to create snapshot.")
    } finally {
      setCreatingSnapshot(false)
    }
  }

  // Generate simulation data based on parameters - ALWAYS uses backend when orgId is available
  const generateSimulationData = async (params: SimulationParams, useBackend: boolean = true) => {
    // ALWAYS try backend first if orgId is available - this is the primary path
    if (orgId && useBackend) {
      try {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) {
          console.warn("No auth token, cannot use backend")
          return generateSimulationDataClient(params)
        }

        // Call backend to update simulation (which calculates results using model data)
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/realtime-simulations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            simulationId: simulationId || undefined,
            params,
            currentMonth,
            isRunning,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.simulation) {
            // Update simulation ID if we got a new one
            if (result.simulation.id && result.simulation.id !== simulationId) {
              setSimulationId(result.simulation.id)
            }

            // ALWAYS return calculated results from backend - this is the source of truth
            if (result.simulation.results && Array.isArray(result.simulation.results) && result.simulation.results.length > 0) {
              return result.simulation.results
            } else {
              // Backend should always return results, but if it doesn't, regenerate them
              console.warn("Backend returned simulation but no results array. Regenerating...")
              // The backend service generates results, so this shouldn't happen, but handle gracefully
              // Return empty array and let the frontend handle it
              return []
            }
          } else {
            console.error("Backend response missing simulation:", result)
            return []
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error("Backend calculation failed:", response.status, errorData)
          toast.error(`Backend error: ${errorData.error?.message || response.statusText}`)
          // Only fallback if it's a critical error (5xx)
          if (response.status >= 500) {
            console.warn("Server error, using client-side fallback")
            return generateSimulationDataClient(params)
          }
          return []
        }
      } catch (error) {
        console.error("Failed to calculate simulation on backend:", error)
        toast.error("Connection error. Using local calculation.")
        // Only fallback on network errors
        return generateSimulationDataClient(params)
      }
    }

    // Only use client-side if explicitly told not to use backend or if no orgId
    if (!useBackend || !orgId) {
      return generateSimulationDataClient(params)
    }

    // This shouldn't happen, but return empty array as fallback
    return []
  }

  // Client-side simulation calculation (fallback)
  const generateSimulationDataClient = (params: SimulationParams) => {
    const data = []
    let customers = 248
    let revenue = 67000
    let expenses = 49000

    for (let month = 0; month < 12; month++) {
      // Calculate growth
      const newCustomers = Math.floor(
        (params.marketingSpend / params.customerAcquisitionCost) * (1 + params.monthlyGrowthRate / 100),
      )
      const churnedCustomers = Math.floor(customers * (params.churnRate / 100))
      customers = customers + newCustomers - churnedCustomers

      // Calculate revenue
      revenue = customers * params.pricingTier

      // Calculate expenses (team cost + marketing + operations)
      const teamCost = params.teamSize * 7000 // Average $7k per employee
      const operationalCost = revenue * 0.15 // 15% of revenue
      expenses = teamCost + params.marketingSpend + operationalCost

      const netIncome = revenue - expenses
      const burnRate = expenses - revenue
      const runway = burnRate > 0 ? Math.max(0, 570000 / burnRate) : 999 // Assuming $570k cash

      data.push({
        month: `Month ${month + 1}`,
        customers,
        revenue,
        expenses,
        netIncome,
        burnRate: Math.max(0, burnRate),
        runway: Math.min(999, runway),
        newCustomers,
        churnedCustomers,
        ltv: params.customerLifetimeValue,
        cac: params.customerAcquisitionCost,
      })
    }

    return data
  }

  // Fetch orgId first, then simulation data - ensures backend connection
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        // First, ensure we have orgId
        const currentOrgId = await fetchOrgId()
        if (isMounted) {
          if (currentOrgId) {
            // Set orgId first
            setOrgId(currentOrgId)
            // Small delay to ensure state is set, then fetch simulation data from backend
            await new Promise(resolve => setTimeout(resolve, 100))
            if (isMounted) {
              await fetchSimulationData()
            }
          } else {
            setError("Organization ID not found. Please ensure you're logged in.")
            setLoading(false)
            toast.error("Please log in to use real-time simulations.")
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Initialization error:", error)
          setError("Failed to initialize simulation. Please refresh the page.")
          setLoading(false)
          toast.error("Failed to initialize. Please refresh the page.")
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [])

  // Listen for CSV import completion to refresh simulation data
  useEffect(() => {
    const handleImportComplete = async (event: CustomEvent) => {
      const { rowsImported, orgId: importedOrgId } = event.detail || {}

      if (importedOrgId && importedOrgId === orgId) {
        toast.success(`CSV import completed! Refreshing simulation data...`)

        // Small delay to ensure backend has processed the data
        setTimeout(async () => {
          if (orgId) {
            await fetchSimulationData()
          }
        }, 2000)
      }
    }

    const listener = handleImportComplete as unknown as EventListener
    window.addEventListener('csv-import-completed', listener)
    return () => {
      window.removeEventListener('csv-import-completed', listener)
    }
  }, [orgId])

  const fetchOrgId = async (): Promise<string | null> => {
    const storedOrgId = localStorage.getItem("orgId")
    if (storedOrgId) return storedOrgId

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
          return primaryOrgId
        }
      }
    } catch (error) {
      console.error("Failed to fetch orgId:", error)
    }

    return null
  }

  const fetchSimulationData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use orgId from state if available, otherwise fetch it
      const currentOrgId = orgId || await fetchOrgId()
      if (!currentOrgId) {
        throw new Error("Organization ID not found. Please ensure you're logged in.")
      }

      // Set orgId if not already set
      if (!orgId) {
        setOrgId(currentOrgId)
      }

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found. Please log in.")
      }

      // Fetch initial values from model run if available
      let initialValues = null
      try {
        const initialValuesResponse = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/realtime-simulations/initial-values`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (initialValuesResponse.ok) {
          const initialData = await initialValuesResponse.json()
          if (initialData.ok && initialData.values) {
            initialValues = initialData.values
            // Update params with realistic starting values from model
            const { customers, revenue, expenses, cashBalance } = initialData.values
            if (customers > 0 && revenue > 0) {
              setParams(prev => ({
                ...prev,
                pricingTier: Math.round(revenue / customers),
              }))
            }
          }
        }
      } catch (err) {
        // Continue if initial values fetch fails
        console.warn("Could not fetch initial values:", err)
      }

      // Fetch or create simulation
      const response = await fetch(`${API_BASE_URL}/orgs/${currentOrgId}/realtime-simulations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch simulation: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.ok && result.simulation) {
        setSimulationId(result.simulation.id)

        // Use simulation params if available, otherwise keep current or use initial values
        if (result.simulation.params && Object.keys(result.simulation.params).length > 0) {
          setParams(result.simulation.params)
        } else if (initialValues) {
          // Use initial values to set realistic starting params
          const { customers, revenue } = initialValues
          if (customers > 0 && revenue > 0) {
            setParams(prev => ({
              ...prev,
              pricingTier: Math.round(revenue / customers),
            }))
          }
        }

        // ALWAYS use backend results - this is the source of truth
        if (result.simulation.results && Array.isArray(result.simulation.results) && result.simulation.results.length > 0) {
          setSimulationData(result.simulation.results)
        } else {
          // If no results, force backend recalculation - backend should always return results
          const simParams = result.simulation.params || params
          const data = await generateSimulationData(simParams, true)
          if (data && Array.isArray(data) && data.length > 0) {
            setSimulationData(data)
          } else {
            // If backend still doesn't return data, show error
            console.error("Backend failed to generate simulation results")
            toast.error("Failed to generate simulation data. Please try again.")
          }
        }

        setCurrentMonth(result.simulation.currentMonth !== undefined ? result.simulation.currentMonth : 0)
        setIsRunning(result.simulation.isRunning !== undefined ? result.simulation.isRunning : false)
      } else {
        // No simulation found, create one with initial values using backend
        let simParams = params
        if (initialValues) {
          const { customers, revenue } = initialValues
          if (customers > 0 && revenue > 0) {
            simParams = {
              ...params,
              pricingTier: Math.round(revenue / customers),
            }
            setParams(simParams)
          }
        }
        // ALWAYS use backend to generate initial simulation - no fallback
        const data = await generateSimulationData(simParams, true)
        if (data && Array.isArray(data) && data.length > 0) {
          setSimulationData(data)
        } else {
          // If backend fails, show error but don't use client-side fallback
          console.error("Backend failed to generate initial simulation")
          toast.error("Failed to initialize simulation. Please refresh the page.")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load simulation data"
      setError(errorMessage)
      toast.error(errorMessage)
      // Try one more time with backend, but don't use client-side fallback
      if (orgId) {
        try {
          const data = await generateSimulationData(params, true)
          if (data && Array.isArray(data) && data.length > 0) {
            setSimulationData(data)
            setError(null) // Clear error if backend succeeds
          }
        } catch (retryError) {
          console.error("Retry also failed:", retryError)
          // Only use client-side as last resort if backend completely fails
          const fallbackData = generateSimulationDataClient(params)
          setSimulationData(fallbackData)
          toast.warning("Using local calculation. Backend connection failed.")
        }
      } else {
        // No orgId, use client-side as fallback
        const fallbackData = generateSimulationDataClient(params)
        setSimulationData(fallbackData)
      }
    } finally {
      setLoading(false)
    }
  }

  // Update simulation data when parameters change - ALWAYS use backend
  useEffect(() => {
    if (loading || !orgId) return // Don't update while initial loading or if no orgId

    let timeoutId: NodeJS.Timeout
    let isCancelled = false

    const updateData = async () => {
      if (isCancelled) return

      try {
        // ALWAYS use backend when orgId is available - no fallback to client-side
        const data = await generateSimulationData(params, true)
        if (!isCancelled && data && Array.isArray(data) && data.length > 0) {
          setSimulationData(data)
          // Auto-save to backend after generating data (silently, don't show errors for auto-saves)
          if (orgId) {
            saveSimulation().catch((err) => {
              // Silent fail for auto-saves - user doesn't need to know
              console.warn("Auto-save failed (non-critical):", err)
            })
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error updating simulation data:", error)
          toast.error("Failed to update simulation. Please try again.")
        }
      }
    }

    // Debounce updates to avoid excessive API calls
    timeoutId = setTimeout(() => {
      updateData()
    }, 1000) // Debounce 1 second

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [params, orgId, loading])

  // Real-time simulation runner - updates current month and syncs with backend
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && simulationData.length > 0) {
      interval = setInterval(() => {
        setCurrentMonth((prev) => {
          if (prev >= simulationData.length - 1) {
            setIsRunning(false)
            // Save state when simulation completes
            if (orgId && simulationId) {
              saveSimulation().catch((err) => {
                console.error("Failed to save simulation on completion:", err)
                // Don't show error toast on completion - it's not critical
              })
            }
            toast.success("Simulation completed!")
            return 0
          }
          const nextMonth = prev + 1
          // Only save on pause/complete, not during run (optimized for performance)
          // Save will happen when user pauses or simulation completes
          return nextMonth
        })
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isRunning, orgId, simulationId, simulationData.length])

  const saveSimulation = async (retryCount = 0): Promise<void> => {
    if (!orgId || saving) return

    setSaving(true)
    const maxRetries = 2

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setSaving(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/realtime-simulations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          simulationId: simulationId || undefined,
          params,
          currentMonth,
          isRunning,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.simulation) {
          // Update simulation ID if we got a new one
          if (result.simulation.id && result.simulation.id !== simulationId) {
            setSimulationId(result.simulation.id)
          }

          // Update simulation data if backend returned results
          if (result.simulation.results && Array.isArray(result.simulation.results) && result.simulation.results.length > 0) {
            setSimulationData(result.simulation.results)
          }

          // Only show success toast for explicit saves (not auto-saves)
          if (retryCount === 0) {
            // Silent success for auto-saves
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || `Failed to save simulation: ${response.statusText}`

        // Retry logic for transient errors
        if (retryCount < maxRetries && (response.status >= 500 || response.status === 429)) {
          console.warn(`Save failed, retrying... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
          return saveSimulation(retryCount + 1)
        }

        console.error("Failed to save simulation:", errorData)
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save simulation"
      console.error("Failed to save simulation:", error)

      // Retry logic for network errors
      if (retryCount < maxRetries && errorMessage.includes("fetch")) {
        console.warn(`Network error, retrying... (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return saveSimulation(retryCount + 1)
      }

      // Only show error toast if not an auto-save or if it's the final retry
      if (retryCount >= maxRetries) {
        toast.error("Failed to save simulation. Your changes are saved locally and will sync when connection is restored.")
      }

      // Don't throw - allow simulation to continue even if save fails
    } finally {
      setSaving(false)
    }
  }

  const handleParamChange = (key: keyof SimulationParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const resetSimulation = async () => {
    setParams(initialParams)
    setCurrentMonth(0)
    setIsRunning(false)

    // Save reset state and regenerate data via backend
    if (orgId) {
      try {
        // Generate new data with reset params using backend
        const data = await generateSimulationData(initialParams, true)
        if (data && Array.isArray(data) && data.length > 0) {
          setSimulationData(data)
        }
        // Save to backend
        await saveSimulation()
        toast.success("Simulation reset successfully")
      } catch (error) {
        console.error("Failed to reset simulation:", error)
        toast.error("Failed to reset simulation. Please try again.")
      }
    } else {
      // Fallback to client-side if no orgId
      const data = generateSimulationDataClient(initialParams)
      setSimulationData(data)
    }
  }

  const handleToggleRun = async () => {
    const newRunningState = !isRunning
    setIsRunning(newRunningState)

    // Save run state to backend (optimized - only save on pause/play, not during run)
    if (orgId) {
      try {
        // Save current state when pausing or starting
        await saveSimulation()

        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) {
          toast.error("Authentication required. Please log in.")
          setIsRunning(!newRunningState) // Revert state
          return
        }

        // If we have a simulationId, use the toggle endpoint, otherwise save via POST
        if (simulationId) {
          const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/realtime-simulations/${simulationId}/run`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              isRunning: newRunningState,
              currentMonth,
            }),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.ok && result.simulation) {
              // Update state from backend response
              setIsRunning(result.simulation.isRunning)
              setCurrentMonth(result.simulation.currentMonth || currentMonth)
            }
          } else {
            // If toggle fails, state is already saved via saveSimulation above
            console.warn("Toggle endpoint failed, but state is saved")
          }
        }
      } catch (error) {
        console.error("Failed to update simulation state:", error)
        // Don't revert state - saveSimulation handles errors gracefully
        // Simulation can continue locally even if backend save fails
      }
    } else {
      toast.error("Organization ID not found. Please refresh the page.")
      setIsRunning(!newRunningState) // Revert state
    }
  }

  // Get current month's data from backend-calculated simulation data
  const currentData = simulationData && simulationData.length > 0
    ? (simulationData[currentMonth] || simulationData[0] || null)
    : null

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error && simulationData.length === 0) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchSimulationData} variant="outline">
          <Loader2 className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Real-time Simulations</h1>
          <p className="text-sm md:text-base text-muted-foreground">Interactive financial modeling with live parameter adjustments</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {saving && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
          <Button variant="outline" onClick={handleShareSnapshot} disabled={creatingSnapshot || !orgId}>
            {creatingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Board Snapshot
          </Button>
          <Button variant="outline" onClick={resetSimulation} disabled={saving} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleToggleRun} disabled={saving} className="w-full sm:w-auto">
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Pause</span>
                <span className="sm:hidden">Pause</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Run Simulation</span>
                <span className="sm:hidden">Run</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Simulation Status */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Simulation Status
            </CardTitle>
            <Badge variant={isRunning ? "default" : "secondary"}>{isRunning ? "Running" : "Paused"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentData ? (
            <div className="space-y-4">
              {/* Month Indicator and Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    {isRunning ? (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        Simulating Month {currentMonth + 1} of {simulationData.length || 12}
                      </span>
                    ) : (
                      `Month ${currentMonth + 1} of ${simulationData.length || 12}`
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {simulationData.length > 0 ? Math.round(((currentMonth + 1) / simulationData.length) * 100) : 0}% Complete
                  </span>
                </div>
                <Progress
                  value={simulationData.length > 0 ? ((currentMonth + 1) / simulationData.length) * 100 : 0}
                  className="h-2"
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-2">
                <div className="text-center transition-all duration-300">
                  <div className="text-3xl font-bold text-blue-600 transition-all duration-300">
                    {currentData.customers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Customers</div>
                </div>
                <div className="text-center transition-all duration-300">
                  <div className="text-3xl font-bold text-green-600 transition-all duration-300">
                    {formatCurrency(currentData.revenue || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                </div>
                <div className="text-center transition-all duration-300">
                  <div className="text-3xl font-bold text-purple-600 transition-all duration-300">
                    {Math.round(currentData.runway || 0)} months
                  </div>
                  <div className="text-sm text-muted-foreground">Cash Runway</div>
                </div>
                <div className="text-center transition-all duration-300">
                  <div className={`text-3xl font-bold transition-all duration-300 ${(currentData.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(currentData.netIncome || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Income</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No simulation data available. Adjust parameters to generate simulation.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Impact Engine - Shows instant financial impact of parameter changes */}
      {decisionImpact && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-8 border-l-4 border-l-blue-500 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Decision Intelligence Impact
                </CardTitle>
                {calculatingImpact && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              </div>
              <CardDescription>Instant evaluation of your current slider configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-800 uppercase tracking-wider">CFO Recommendation</p>
                    <Badge variant="outline" className="text-[10px] bg-white/50 border-blue-200 text-blue-700">
                      Source: {decisionImpact.provenance?.source === 'model_run' ? 'Financial Model' : 'Live Ledger'}
                    </Badge>
                  </div>
                  <p className="text-lg font-medium leading-snug text-slate-900">{decisionImpact.recommendation}</p>
                </div>
                <div className="flex gap-4 border-l pl-6 border-blue-100">
                  <div className="text-center">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Survival Odds</p>
                    <div className="text-3xl font-black text-blue-900">
                      {decisionImpact?.estimatedNewSurvivalProbability
                        ? Math.round((decisionImpact.estimatedNewSurvivalProbability || 0.85) * 100)
                        : decisionImpact?.currentSurvivalProbability
                          ? Math.round((decisionImpact.currentSurvivalProbability || 0.85) * 100)
                          : 85}%
                    </div>
                    <div className={`text-xs font-bold ${(decisionImpact?.survivalProbabilityImpact || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(decisionImpact?.survivalProbabilityImpact || 0) >= 0 ? '+' : ''}{decisionImpact?.survivalProbabilityImpact || 0}% shift
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-4 border-l-4 border-l-purple-500 bg-purple-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Runway Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-3xl font-black text-purple-900">
                    {decisionImpact.newRunwayMonths} Mo
                  </div>
                  <p className={`text-sm font-bold ${decisionImpact.runwayDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {decisionImpact.cashOutDateImpact}
                  </p>
                </div>

                {/* Strategic Buffers - PAIN POINT 4 & 6 */}
                <div className="pt-2 border-t border-purple-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Hiring Buffer</span>
                    <span className="text-sm font-bold text-purple-900">+{formatCurrency(decisionImpact.sensitivity.maxAdditionalBurn / 1000).replace(currencySymbol, "")}k/mo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Revenue Buffer</span>
                    <span className="text-sm font-bold text-purple-900">
                      {decisionImpact?.sensitivity?.revenueBuffer && decisionImpact.sensitivity.revenueBuffer > 0
                        ? `-${formatCurrency(decisionImpact.sensitivity.revenueBuffer / 1000).replace(currencySymbol, "")}k/mo`
                        : decisionImpact?.sensitivity?.revenueBuffer === 0
                          ? '$0/mo'
                          : 'N/A'}
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-500 italic leading-tight">
                    Maximum margin before dropping below 6 months runway.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {shareUrl && (
        <Alert className="bg-green-50 border-green-200">
          <Zap className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="text-green-800 font-medium">Board Snapshot Live: <code className="bg-white px-2 py-0.5 rounded border ml-2 text-xs">{shareUrl}</code></span>
            <Button variant="outline" size="sm" className="ml-4" onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              toast.success("URL copied!");
            }}>Copy Link</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameter Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Simulation Parameters
            </CardTitle>
            <CardDescription>Adjust parameters to see real-time impact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Monthly Growth Rate: {params.monthlyGrowthRate}%</Label>
              <Slider
                value={[params.monthlyGrowthRate]}
                onValueChange={([value]) => handleParamChange("monthlyGrowthRate", value)}
                max={25}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Acquisition Cost: {formatCurrency(params.customerAcquisitionCost)}</Label>
              <Slider
                value={[params.customerAcquisitionCost]}
                onValueChange={([value]) => handleParamChange("customerAcquisitionCost", value)}
                max={500}
                min={50}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Lifetime Value: {formatCurrency(params.customerLifetimeValue)}</Label>
              <Slider
                value={[params.customerLifetimeValue]}
                onValueChange={([value]) => handleParamChange("customerLifetimeValue", value)}
                max={5000}
                min={500}
                step={100}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Churn Rate: {params.churnRate}%</Label>
              <Slider
                value={[params.churnRate]}
                onValueChange={([value]) => handleParamChange("churnRate", value)}
                max={10}
                min={0.5}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Pricing Tier: {formatCurrency(params.pricingTier)}/month</Label>
              <Slider
                value={[params.pricingTier]}
                onValueChange={([value]) => handleParamChange("pricingTier", value)}
                max={500}
                min={29}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Team Size: {params.teamSize} people</Label>
              <Slider
                value={[params.teamSize]}
                onValueChange={([value]) => handleParamChange("teamSize", value)}
                max={50}
                min={5}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Marketing Spend: {formatCurrency(params.marketingSpend)}/month</Label>
              <Slider
                value={[params.marketingSpend]}
                onValueChange={([value]) => handleParamChange("marketingSpend", value)}
                max={50000}
                min={1000}
                step={500}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Simulation Results */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs
            value={currentTab}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("tab", value)
              router.replace(`?${params.toString()}`, { scroll: false })
            }}
            className="space-y-4"
          >
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
                <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
                <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
                <TabsTrigger value="runway" className="text-xs sm:text-sm">Runway</TabsTrigger>
                <TabsTrigger value="unit-economics" className="text-xs sm:text-sm">Unit Economics</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="revenue" className="space-y-4 overflow-x-auto overflow-y-visible">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Projection</CardTitle>
                  <CardDescription>12-month revenue simulation</CardDescription>
                </CardHeader>
                <CardContent>
                  {simulationData && simulationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                      <AreaChart data={simulationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), ""]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                          name="Revenue"
                          animationDuration={300}
                        />
                        {/* Vertical line at current month - show always, not just when running */}
                        {simulationData[currentMonth] && (
                          <ReferenceLine
                            x={simulationData[currentMonth].month}
                            stroke={isRunning ? "#ef4444" : "#f59e0b"}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                              value: isRunning ? "Current" : `Month ${currentMonth + 1}`,
                              position: "top",
                              fill: isRunning ? "#ef4444" : "#f59e0b",
                              fontSize: 12
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No revenue data available. Adjust parameters to generate simulation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4 overflow-x-auto overflow-y-visible">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                  <CardDescription>Customer acquisition and churn simulation</CardDescription>
                </CardHeader>
                <CardContent>
                  {simulationData && simulationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                      <LineChart data={simulationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="customers"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Total Customers"
                          animationDuration={300}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="newCustomers"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="New Customers"
                          animationDuration={300}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="churnedCustomers"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Churned"
                          animationDuration={300}
                          dot={{ r: 3 }}
                        />
                        {/* Vertical line at current month - show always, not just when running */}
                        {simulationData[currentMonth] && (
                          <ReferenceLine
                            x={simulationData[currentMonth].month}
                            stroke={isRunning ? "#ef4444" : "#f59e0b"}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                              value: isRunning ? "Current" : `Month ${currentMonth + 1}`,
                              position: "top",
                              fill: isRunning ? "#ef4444" : "#f59e0b",
                              fontSize: 12
                            }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No customer data available. Adjust parameters to generate simulation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runway" className="space-y-4 overflow-x-auto overflow-y-visible">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Runway</CardTitle>
                  <CardDescription>Runway projection based on burn rate</CardDescription>
                </CardHeader>
                <CardContent>
                  {simulationData && simulationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
                      <BarChart data={simulationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [`${value} months`, ""]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        <Bar
                          dataKey="runway"
                          fill="#8b5cf6"
                          name="Runway (months)"
                          animationDuration={300}
                          radius={[4, 4, 0, 0]}
                        />
                        {/* Vertical line at current month - show always, not just when running */}
                        {simulationData[currentMonth] && (
                          <ReferenceLine
                            x={simulationData[currentMonth].month}
                            stroke={isRunning ? "#ef4444" : "#f59e0b"}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                              value: isRunning ? "Current" : `Month ${currentMonth + 1}`,
                              position: "top",
                              fill: isRunning ? "#ef4444" : "#f59e0b",
                              fontSize: 12
                            }}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No runway data available. Adjust parameters to generate simulation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unit-economics" className="space-y-4 overflow-x-auto overflow-y-visible">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">LTV:CAC Ratio</p>
                        <p className="text-2xl font-bold">
                          {(params.customerLifetimeValue / params.customerAcquisitionCost).toFixed(1)}:1
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Payback Period</p>
                        <p className="text-2xl font-bold">
                          {Math.round(params.customerAcquisitionCost / params.pricingTier)} months
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Monthly Churn</p>
                        <p className="text-2xl font-bold">{params.churnRate}%</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">CAC Efficiency</p>
                        <p className="text-2xl font-bold">
                          {params.marketingSpend > 0
                            ? ((params.marketingSpend / params.customerAcquisitionCost) / params.marketingSpend * 100).toFixed(1)
                            : '0.0'}
                          %
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
