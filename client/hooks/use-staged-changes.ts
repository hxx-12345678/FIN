"use client"

import { useState, useCallback, useEffect } from "react"
import { API_BASE_URL, getAuthToken, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

interface StagedChange {
  id: string
  description: string
  impactSummary: string
  oldValue: any
  newValue: any
  confidenceScore: number
  createdAt: string
  status: "draft" | "pending_approval" | "approved" | "rejected" | "cancelled"
  aiExplanation?: string
  promptId?: string
  dataSources?: Array<{ type: string; id: string; snippet: string }>
  planId?: string
  changeIndex?: number
  type?: string
  action?: string
  reasoning?: string
}

interface ApprovalRequest {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  type: string
  objectType: string
  objectId: string
  payloadJson: any
  reviewedAt?: string | null
  createdAt: string
}

interface UseStagedChangesReturn {
  changes: StagedChange[]
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

      const token = getAuthToken()

      if (!token) {
        // For unauthenticated users, return empty array
        setChanges([])
        setIsLoading(false)
        return
      }

      // Fetch AI plans and extract staged changes
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-plans`, {
        headers: getAuthHeaders(),
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
          handleUnauthorized()
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
        // Fetch persisted governance approvals for AI CFO staged changes
        // Note: these are stored as ApprovalRequest rows (objectType=aicfo_plan, objectId=planId)
        let approvals: ApprovalRequest[] = []
        try {
          const approvalsRes = await fetch(
            `${API_BASE_URL}/orgs/${orgId}/approvals?type=ai_cfo_staged_change&objectType=aicfo_plan`,
            {
              headers: getAuthHeaders(),
              credentials: "include",
            }
          )
          if (approvalsRes.ok) {
            const approvalsJson = await approvalsRes.json()
            if (approvalsJson?.ok && Array.isArray(approvalsJson.data)) {
              approvals = approvalsJson.data
            }
          }
        } catch {
          // If approvals endpoint fails, fall back to showing draft changes (still reviewable)
          approvals = []
        }

        const approvalByChangeId = new Map<string, ApprovalRequest>()
        approvals.forEach((req) => {
          const changeId = req?.payloadJson?.changeId
          if (typeof changeId === "string" && changeId.trim().length > 0) {
            const existing = approvalByChangeId.get(changeId)
            // Prefer the newest request if duplicates exist
            if (!existing || new Date(req.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
              approvalByChangeId.set(changeId, req)
            }
          }
        })

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

            const changeId = `${plan.id}-${idx}`

            // Determine status from persisted approval requests (governance)
            const approval = approvalByChangeId.get(changeId)
            const status: StagedChange["status"] = approval
              ? approval.status === "pending"
                ? "pending_approval"
                : approval.status
              : "draft"

            // Apply status filter
            if (statusFilter && statusFilter !== "all" && status !== statusFilter) {
              return
            }

            // Extract dataSources - check both dataSources and evidence fields
            let dataSources: Array<{ type: string; id: string; snippet: string }> = []
            
            if (Array.isArray(change.dataSources) && change.dataSources.length > 0) {
              // Use dataSources if available (preferred format)
              dataSources = change.dataSources.map((ds: any) => ({
                type: ds.type || 'data_source',
                id: ds.id || String(ds),
                snippet: ds.snippet || String(ds)
              }))
            } else if (Array.isArray(change.evidence) && change.evidence.length > 0) {
              // Fallback to evidence if dataSources not available
              dataSources = change.evidence.map((e: any) => ({
                type: e.doc_type || e.type || 'evidence',
                id: e.doc_id || e.id || String(e),
                snippet: typeof e === 'string' ? e : (e.snippet || e.content || String(e))
              }))
            }

            // Extract promptId - check change level first, then plan metadata
            const promptId = change.promptId || 
                           (Array.isArray(plan.planJson.metadata?.promptIds) && plan.planJson.metadata.promptIds.length > 0 
                             ? plan.planJson.metadata.promptIds[0] 
                             : undefined)

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
              promptId,
              dataSources,
              planId: plan.id,
              changeIndex: idx,
              type: change.type || "recommendation",
              action: change.action || action.trim(),
              reasoning: change.reasoning || change.explain || "",
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

  return {
    changes,
    refresh: fetchChanges,
    isLoading,
    error,
  }
}
