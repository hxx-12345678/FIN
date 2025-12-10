"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface StagedChange {
  id: string
  description: string
  impactSummary: string
  oldValue: any
  newValue: any
  confidenceScore: number
  createdAt: string
  status: "pending" | "approved" | "rejected"
  aiExplanation?: string
  promptId?: string
  dataSources?: Array<{ type: string; id: string; name?: string }>
  planId?: string
  changeIndex?: number
}

interface UseStagedChangesReturn {
  changes: StagedChange[]
  approve: (changeId: string) => Promise<void>
  reject: (changeId: string) => Promise<void>
  bulkApprove: (changeIds: string[]) => Promise<void>
  bulkReject: (changeIds: string[]) => Promise<void>
  refresh: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useStagedChanges(statusFilter?: string): UseStagedChangesReturn {
  const [changes, setChanges] = useState<StagedChange[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChanges = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // CRITICAL: Validate orgId exists and is valid UUID format
      const orgId = localStorage.getItem("orgId")
      if (!orgId || orgId.trim().length === 0) {
        // For new users, return empty array instead of error
        setChanges([])
        setIsLoading(false)
        return
      }

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(orgId)) {
        console.warn("Invalid orgId format, clearing and returning empty")
        localStorage.removeItem("orgId")
        setChanges([])
        setIsLoading(false)
        return
      }

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token || token.trim().length === 0) {
        // For unauthenticated users, return empty array
        setChanges([])
        setIsLoading(false)
        return
      }

      // Fetch AI plans and extract staged changes
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        // Handle 404 (no plans) gracefully for new users
        if (response.status === 404) {
          setChanges([])
          setIsLoading(false)
          return
        }
        // Handle 401/403 (unauthorized) gracefully
        if (response.status === 401 || response.status === 403) {
          console.warn("Unauthorized access to AI plans")
          setChanges([])
          setIsLoading(false)
          return
        }
        throw new Error(`Failed to fetch AI plans: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      // CRITICAL: Always initialize with empty array for new users
      if (!result || !result.ok) {
        setChanges([])
        setIsLoading(false)
        return
      }

      if (result.plans && Array.isArray(result.plans) && result.plans.length > 0) {
        // Extract staged changes from all plans with strict validation
        const allChanges: StagedChange[] = []
        
        result.plans.forEach((plan: any) => {
          // CRITICAL VALIDATION: Only process valid plans
          if (!plan || typeof plan !== 'object' || !plan.id || typeof plan.id !== 'string') {
            return // Skip invalid plans
          }

          if (!plan.planJson || typeof plan.planJson !== 'object') {
            return // Skip plans without planJson
          }

          // Validate plan has required structure
          if (!plan.planJson.stagedChanges || !Array.isArray(plan.planJson.stagedChanges)) {
            return // Skip plans without staged changes array
          }

          // Validate staged changes array is not empty
          if (plan.planJson.stagedChanges.length === 0) {
            return // Skip plans with empty staged changes
          }

          const metadata = plan.planJson?.metadata || {}
          const fallbackUsed =
            metadata.fallbackUsed === true ||
            metadata.recommendationsSource === "fallback" ||
            (metadata.modelUsed && String(metadata.modelUsed).toLowerCase().includes("fallback"))

          // Skip fallback plans (low quality) - CRITICAL for new users
          if (fallbackUsed) {
            return
          }

          // Validate each staged change before adding
          plan.planJson.stagedChanges.forEach((change: any, idx: number) => {
            // CRITICAL: Validate change is an object
            if (!change || typeof change !== 'object') {
              return // Skip invalid changes
            }

            // CRITICAL: Validate change has required fields
            const action = change.action || change.explain || ""
            if (!action || typeof action !== 'string' || action.trim().length < 5) {
              return // Skip invalid or too short changes
            }

            // Validate confidence score if present
            if (change.confidence !== undefined && (typeof change.confidence !== 'number' || change.confidence < 0 || change.confidence > 1)) {
              return // Skip changes with invalid confidence
            }

            // Check if this change has been approved/rejected (stored in localStorage for now)
            const changeId = `${plan.id}-${idx}`
            const storedStatus = localStorage.getItem(`staged-change-${changeId}`)
            const status = (storedStatus as "pending" | "approved" | "rejected") || "pending"

            // Apply status filter
            if (statusFilter && statusFilter !== "all" && status !== statusFilter) {
              return
            }

            // Only add valid, meaningful changes
            allChanges.push({
              id: changeId,
              description: action.trim(),
              impactSummary: (change.explain || change.reasoning || "").trim(),
              oldValue: change.impact?.oldValue || null,
              newValue: change.impact?.newValue || change.impact || null,
              confidenceScore: typeof change.confidence === 'number' ? change.confidence : 0.7,
              createdAt: plan.createdAt || new Date().toISOString(),
              status,
              aiExplanation: (change.reasoning || change.explain || "").trim(),
              promptId: plan.promptId,
              dataSources: Array.isArray(change.evidence) ? change.evidence : [],
              planId: plan.id,
              changeIndex: idx,
            })
          })
        })

        // Sort by creation date (newest first)
        allChanges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        
        setChanges(allChanges)
      } else {
        // No plans or empty array - set empty array (CRITICAL for new users)
        setChanges([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staged changes")
      setChanges([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchChanges()
  }, [fetchChanges])

  const approve = useCallback(async (changeId: string) => {
    const originalChanges = [...changes]
    
    // Update local state optimistically
    setChanges((prev) => prev.map((c) => (c.id === changeId ? { ...c, status: "approved" as const } : c)))
    
    // Store status in localStorage (in production, this would update the database)
    localStorage.setItem(`staged-change-${changeId}`, "approved")

    try {
      // In production, this would call a backend endpoint to update the plan
      // For now, we just update localStorage
      await fetchChanges()
      toast?.success("Change approved successfully")
    } catch (err) {
      setChanges(originalChanges)
      localStorage.removeItem(`staged-change-${changeId}`)
      setError(err instanceof Error ? err.message : "Failed to approve change")
      throw err
    }
  }, [changes, fetchChanges])

  const reject = useCallback(async (changeId: string) => {
    const originalChanges = [...changes]
    
    // Update local state optimistically
    setChanges((prev) => prev.map((c) => (c.id === changeId ? { ...c, status: "rejected" as const } : c)))
    
    // Store status in localStorage
    localStorage.setItem(`staged-change-${changeId}`, "rejected")

    try {
      await fetchChanges()
      toast?.success("Change rejected")
    } catch (err) {
      setChanges(originalChanges)
      localStorage.removeItem(`staged-change-${changeId}`)
      setError(err instanceof Error ? err.message : "Failed to reject change")
      throw err
    }
  }, [changes, fetchChanges])

  const bulkApprove = useCallback(async (changeIds: string[]) => {
    const originalChanges = [...changes]
    
    // Update local state optimistically
    setChanges((prev) => prev.map((c) => (changeIds.includes(c.id) ? { ...c, status: "approved" as const } : c)))
    
    // Store statuses in localStorage
    changeIds.forEach((id) => {
      localStorage.setItem(`staged-change-${id}`, "approved")
    })

    try {
      await fetchChanges()
      toast?.success(`${changeIds.length} changes approved`)
    } catch (err) {
      setChanges(originalChanges)
      changeIds.forEach((id) => {
        localStorage.removeItem(`staged-change-${id}`)
      })
      setError(err instanceof Error ? err.message : "Failed to approve changes")
      throw err
    }
  }, [changes, fetchChanges])

  const bulkReject = useCallback(async (changeIds: string[]) => {
    const originalChanges = [...changes]
    
    // Update local state optimistically
    setChanges((prev) => prev.map((c) => (changeIds.includes(c.id) ? { ...c, status: "rejected" as const } : c)))
    
    // Store statuses in localStorage
    changeIds.forEach((id) => {
      localStorage.setItem(`staged-change-${id}`, "rejected")
    })

    try {
      await fetchChanges()
      toast?.success(`${changeIds.length} changes rejected`)
    } catch (err) {
      setChanges(originalChanges)
      changeIds.forEach((id) => {
        localStorage.removeItem(`staged-change-${id}`)
      })
      setError(err instanceof Error ? err.message : "Failed to reject changes")
      throw err
    }
  }, [changes, fetchChanges])

  return {
    changes,
    approve,
    reject,
    bulkApprove,
    bulkReject,
    refresh: fetchChanges,
    isLoading,
    error,
  }
}
