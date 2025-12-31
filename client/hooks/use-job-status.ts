"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface Job {
  id: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  progress?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  error?: string
}

interface UseJobStatusReturn {
  job: Job | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  cancel: () => Promise<void>
}

const POLL_INTERVAL = 2000

export function useJobStatus(jobId: string | null): UseJobStatusReturn {
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  const fetchJob = useCallback(async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch job status")
      }

      const data = await response.json()
      setJob(data.job || data)

      if (data.job?.status === "running" || data.status === "running") {
        if (!isPollingRef.current) {
          isPollingRef.current = true
          startPolling()
        }
      } else {
        stopPolling()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job status")
      stopPolling()
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return

    pollingRef.current = setInterval(() => {
      if (jobId) {
        const token = localStorage.getItem("auth-token") || document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]

        fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error("Network error")
            }
            return res.json()
          })
          .then((data) => {
            const jobData = data.job || data
            setJob(jobData)
            setError(null)

            if (jobData.status !== "running" && jobData.status !== "queued") {
              stopPolling()
            }
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : "Network disconnect during polling")
            stopPolling()
          })
      }
    }, POLL_INTERVAL)
  }, [jobId])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
      isPollingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (jobId) {
      fetchJob()
    }

    return () => {
      stopPolling()
    }
  }, [jobId, fetchJob, stopPolling])

  const refetch = useCallback(async () => {
    await fetchJob()
  }, [fetchJob])

  const cancel = useCallback(async () => {
    if (!jobId) return

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to cancel job")
      }

      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel job")
    }
  }, [jobId, refetch])

  return {
    job,
    isLoading,
    error,
    refetch,
    cancel,
  }
}

