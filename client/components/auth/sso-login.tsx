"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Chrome, Building2, Lock } from "lucide-react"
import { useSSOAuth } from "@/hooks/use-sso-auth"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface SSOLoginProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  redirectUrl?: string
}

type SSOState = "idle" | "redirecting" | "authenticating" | "error" | "success"

export function SSOLogin({ onSuccess, onError, redirectUrl }: SSOLoginProps) {
  const { initiateSSO, isAuthenticating, error } = useSSOAuth()
  const [state, setState] = useState<SSOState>("idle")
  const [redirectingProvider, setRedirectingProvider] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const provider = urlParams.get("provider")
    const code = urlParams.get("code")

    if (provider && code) {
      handleCallback(provider, code)
    }
  }, [])

  useEffect(() => {
    if (error) {
      setState("error")
      onError?.(error)
    }
  }, [error, onError])

  const handleCallback = async (provider: string, code: string) => {
    setState("authenticating")

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/sso/callback?provider=${provider}&code=${code}`,
        {
          method: "GET",
          credentials: "include",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "SSO authentication failed. Please try again.")
      }

      const data = await response.json()

      if (data.token) {
        localStorage.setItem("auth-token", data.token)
        if (data.refreshToken) {
          localStorage.setItem("refresh-token", data.refreshToken)
        }
        document.cookie = `auth-token=${data.token}; path=/; max-age=86400`
      }

      setState("success")
      toast.success("Successfully signed in with SSO")
      
      // Dispatch login success event to show post-login options
      window.dispatchEvent(new CustomEvent("login-success", { detail: {} }))
      
      if (redirectUrl) {
        window.location.href = redirectUrl
      } else {
        onSuccess?.()
        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "SSO authentication failed. Please try again."
      setState("error")
      onError?.(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleProviderClick = async (provider: "google" | "microsoft" | "saml") => {
    setState("redirecting")
    setRedirectingProvider(provider)
    
    try {
      await initiateSSO(provider)
    } catch (err) {
      setState("error")
      setRedirectingProvider(null)
    }
  }

  if (state === "authenticating") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Completing authentication...</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "success") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <p className="text-muted-foreground">Authentication successful! Redirecting...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with SSO</CardTitle>
        <CardDescription>Choose your authentication provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "error" && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() => handleProviderClick("google")}
            disabled={isAuthenticating || state === "redirecting"}
          >
            {redirectingProvider === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() => handleProviderClick("microsoft")}
            disabled={isAuthenticating || state === "redirecting"}
          >
            {redirectingProvider === "microsoft" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="mr-2 h-4 w-4" />
            )}
            Continue with Microsoft
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={() => handleProviderClick("saml")}
            disabled={isAuthenticating || state === "redirecting"}
          >
            {redirectingProvider === "saml" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Continue with SAML
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button variant="ghost" className="w-full" onClick={() => window.history.back()}>
            Back to email login
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


