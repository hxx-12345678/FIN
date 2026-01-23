"use client"

import { useState, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api-config"

type MFAMethod = "totp" | "sms" | "email"

interface MFASetupResponse {
  qrCode?: string
  secret?: string
  sentTo?: string
}

interface UseMFAReturn {
  setupMFA: (method: MFAMethod) => Promise<MFASetupResponse>
  verifyCode: (code: string) => Promise<boolean>
  isEnabled: boolean
  backupCodes: string[] | null
  generateBackupCodes: () => Promise<string[]>
  enableMFA: () => Promise<void>
  attemptsRemaining: number
  resetAttempts: () => void
}

const MAX_ATTEMPTS = 3

export function useMFA(): UseMFAReturn {
  const [isEnabled, setIsEnabled] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS)

  const setupMFA = useCallback(async (method: MFAMethod): Promise<MFASetupResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ method }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Failed to setup MFA")
    }

    return await response.json()
  }, [])

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    if (attemptsRemaining <= 0) {
      throw new Error("Maximum attempts exceeded. Please restart setup.")
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setAttemptsRemaining((prev) => prev - 1)
        throw new Error(errorData.message || "Invalid verification code. Please try again.")
      }

      const data = await response.json()
      if (data.valid) {
        setAttemptsRemaining(MAX_ATTEMPTS)
        return true
      } else {
        setAttemptsRemaining((prev) => prev - 1)
        return false
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Maximum attempts")) {
        throw err
      }
      setAttemptsRemaining((prev) => prev - 1)
      throw new Error("Invalid verification code. Please try again.")
    }
  }, [attemptsRemaining])

  const generateBackupCodes = useCallback(async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/auth/mfa/backup-codes`, {
      method: "GET",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Failed to generate backup codes")
    }

    const data = await response.json()
    const codes = data.codes || []
    setBackupCodes(codes)
    return codes
  }, [])

  const enableMFA = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/auth/mfa/enable`, {
      method: "POST",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Failed to enable MFA")
    }

    setIsEnabled(true)
  }, [])

  const resetAttempts = useCallback(() => {
    setAttemptsRemaining(MAX_ATTEMPTS)
  }, [])

  return {
    setupMFA,
    verifyCode,
    isEnabled,
    backupCodes,
    generateBackupCodes,
    enableMFA,
    attemptsRemaining,
    resetAttempts,
  }
}


