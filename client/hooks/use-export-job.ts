"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface ExportJob {
  id: string
  exportId?: string
  type: "PDF" | "PPTX" | "CSV"
  status: "queued" | "processing" | "completed" | "failed" | "cancelled"
  progress?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  fileSize?: number
  error?: string
  partialExport?: boolean
  statusMessage?: string
}

interface UseExportJobReturn {
  job: ExportJob | null
  progress: number
  download: () => Promise<string>
  retry: () => Promise<void>
  cancel: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const POLL_INTERVAL = 2000
const MAX_POLL_ATTEMPTS = 150
const TIMEOUT_MS = 5 * 60 * 1000

export function useExportJob(jobId: string | null): UseExportJobReturn {
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)
  const pollAttemptsRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/exports/${jobId}/status`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch export status")
      }

      const data = await response.json()
      const jobData = data.job || data
      setJob(jobData)

      if (jobData.status === "processing" || jobData.status === "queued") {
        if (!isPollingRef.current) {
          isPollingRef.current = true
          pollAttemptsRef.current = 0
          startTimeRef.current = Date.now()
          startPolling()
        }
      } else {
        stopPolling()
      }

      if (startTimeRef.current && Date.now() - startTimeRef.current > TIMEOUT_MS && jobData.status === "processing") {
        setError("Export generation timed out. Please try again.")
        stopPolling()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch export status")
      stopPolling()
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return

    pollingRef.current = setInterval(() => {
      if (!jobId) {
        stopPolling()
        return
      }

      pollAttemptsRef.current++

      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        setError("Export generation timed out. Please try again.")
        stopPolling()
        return
      }

      fetch(`${API_BASE_URL}/exports/${jobId}/status`, {
        method: "GET",
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

          if (jobData.status !== "processing" && jobData.status !== "queued") {
            stopPolling()
          }

          if (startTimeRef.current && Date.now() - startTimeRef.current > TIMEOUT_MS && jobData.status === "processing") {
            setError("Export generation timed out. Please try again.")
            stopPolling()
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Network disconnect during polling")
          stopPolling()
        })
    }, POLL_INTERVAL)
  }, [jobId])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
      isPollingRef.current = false
      pollAttemptsRef.current = 0
      startTimeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (jobId) {
      fetchJobStatus()
    }

    return () => {
      stopPolling()
    }
  }, [jobId, fetchJobStatus, stopPolling])

  const download = useCallback(async (): Promise<string> => {
    if (!job?.exportId) {
      throw new Error("Export ID not available")
    }

    try {
      // First try to get the export record to check if it has a downloadUrl
      const exportResponse = await fetch(`${API_BASE_URL}/exports/${job.exportId}`, {
        method: "GET",
        credentials: "include",
      })

      if (exportResponse.ok) {
        const exportData = await exportResponse.json()
        if (exportData.downloadUrl) {
          return exportData.downloadUrl
        }
      }

      // If no downloadUrl, use the download endpoint directly
      // The download endpoint will either redirect to S3 or send the file
      const downloadUrl = `${API_BASE_URL}/exports/${job.exportId}/download`
      return downloadUrl
    } catch (err) {
      if (err instanceof Error && err.message.includes("expired")) {
        throw err
      }
      throw new Error("Failed to get download URL")
    }
  }, [job])

  const retry = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`${API_BASE_URL}/exports/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to retry export")
      }

      await fetchJobStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry export")
      throw err
    }
  }, [jobId, fetchJobStatus])

  const cancel = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`${API_BASE_URL}/exports/${jobId}/cancel`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to cancel export")
      }

      await fetchJobStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel export")
      throw err
    }
  }, [jobId, fetchJobStatus])

  // Calculate progress: 100% if completed, otherwise use job progress or 0
  const calculatedProgress = job?.status === "completed" 
    ? 100 
    : job?.progress || 0

  return {
    job,
    progress: calculatedProgress,
    download,
    retry,
    cancel,
    isLoading,
    error,
  }
}


