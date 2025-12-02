"use client"

import { useState, useCallback, useEffect } from "react"

interface Job {
  id: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  progress?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  duration?: number
  modelId?: string
  error?: string
}

interface JobFilters {
  status?: string
  dateFrom?: string
  dateTo?: string
  modelId?: string
  sortBy?: "date" | "duration" | "status"
  sortOrder?: "asc" | "desc"
}

interface UseJobQueueReturn {
  jobs: Job[]
  filters: JobFilters
  setFilters: (filters: JobFilters) => void
  refresh: () => Promise<void>
  cancelJob: (jobId: string) => Promise<void>
  retryJob: (jobId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function useJobQueue(initialFilters?: JobFilters): UseJobQueueReturn {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filters, setFiltersState] = useState<JobFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const orgId = localStorage.getItem("orgId") || ""
      const params = new URLSearchParams()
      params.append("org_id", orgId)
      params.append("limit", "100")
      
      // Don't filter by type - show all job types
      // if (filters.type) {
      //   params.append("type", filters.type)
      // }
      
      if (filters.status) {
        params.append("status", filters.status)
      }
      if (filters.dateFrom) {
        params.append("date_from", filters.dateFrom)
      }
      if (filters.dateTo) {
        params.append("date_to", filters.dateTo)
      }
      if (filters.modelId) {
        params.append("model_id", filters.modelId)
      }
      if (filters.sortBy) {
        params.append("sort_by", filters.sortBy)
      }
      if (filters.sortOrder) {
        params.append("sort_order", filters.sortOrder)
      }

      const response = await fetch(`${API_BASE_URL}/jobs?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }

      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const setFilters = useCallback((newFilters: JobFilters) => {
    setFiltersState(newFilters)
  }, [])

  const refresh = useCallback(async () => {
    await fetchJobs()
  }, [fetchJobs])

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/cancel`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to cancel job")
      }

      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel job")
      throw err
    }
  }, [refresh])

  const retryJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to retry job")
      }

      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry job")
      throw err
    }
  }, [refresh])

  return {
    jobs,
    filters,
    setFilters,
    refresh,
    cancelJob,
    retryJob,
    isLoading,
    error,
  }
}


