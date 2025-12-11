/**
 * Shared API configuration utility
 * Ensures API_BASE_URL always includes /api/v1
 */

export const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Ensure /api/v1 is included
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl
  }
  return `${cleanUrl}/api/v1`
}

export const API_BASE_URL = getApiBaseUrl()

/**
 * Get authentication token from localStorage or cookies
 * Returns null if no valid token is found
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  
  // Try localStorage first
  let token = localStorage.getItem("auth-token")
  
  // If token from localStorage is empty or null, try cookies
  if (!token || token.trim().length === 0) {
    const authCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
    if (authCookie) {
      token = authCookie.split("=")[1]
    }
  }

  // Clean token (remove any whitespace) and return
  return token?.trim() || null
}

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

/**
 * Handle 401 Unauthorized errors by clearing tokens and redirecting to login
 */
export const handleUnauthorized = (): void => {
  // Clear tokens
  localStorage.removeItem("auth-token")
  localStorage.removeItem("refresh-token")
  localStorage.removeItem("orgId")
  
  // Clear auth cookie
  document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  
  // Dispatch event to trigger login modal or redirect
  window.dispatchEvent(new CustomEvent("auth-required", { detail: { reason: "Token expired or invalid" } }))
}

