"use client"

import { useState, useCallback } from "react"

type SSOProvider = "google" | "microsoft" | "saml"

interface UseSSOAuthReturn {
  initiateSSO: (provider: SSOProvider) => Promise<void>
  isAuthenticating: boolean
  error: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function useSSOAuth(): UseSSOAuthReturn {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initiateSSO = useCallback(async (provider: SSOProvider) => {
    setIsAuthenticating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/sso/${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `SSO authentication failed for ${provider}`)
      }

      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error("No authentication URL received")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "SSO authentication failed. Please try again."
      setError(errorMessage)
      setIsAuthenticating(false)
    }
  }, [])

  return {
    initiateSSO,
    isAuthenticating,
    error,
  }
}


