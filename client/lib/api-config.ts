/**
 * Shared API configuration utility
 * Ensures API_BASE_URL always includes /api/v1
 */

export const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Ensure /api/v1 is included - check both with and without trailing slash
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl
  }
  // Always append /api/v1 if not present
  const apiUrl = `${cleanUrl}/api/v1`
  return apiUrl
}

export const API_BASE_URL = getApiBaseUrl()

/**
 * Get authentication token - DEPRECATED for security.
 * Modern approach uses HttpOnly cookies which are not accessible by JS.
 * This is kept for backward compatibility with scripts that might use it,
 * but the backend now prioritizes HttpOnly cookies.
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth-token")
}

/**
 * Get authentication headers for API requests
 * Note: Authorization header is now optional as HttpOnly cookies 
 * are automatically sent via credentials: "include"
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  // Only add Bearer token if it exists in localStorage (legacy/transition)
  if (token && token.trim().length > 0) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return headers
}

/**
 * Handle 401 Unauthorized errors by clearing local state and cookies
 */
export const handleUnauthorized = (): void => {
  // Clear local markers
  localStorage.removeItem("auth-token")
  localStorage.removeItem("refresh-token")
  localStorage.removeItem("orgId")
  localStorage.removeItem("is-logged-in")

  // Attempt to clear auth cookie (browser will only allow if not HttpOnly)
  document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

  // Dispatch event to trigger login modal or redirect
  window.dispatchEvent(new CustomEvent("auth-required", { detail: { reason: "Token expired or invalid" } }))

  // Redirect to login if on protected route
  if (typeof window !== "undefined" && !window.location.pathname.startsWith('/login')) {
    // Small delay to allow toasts/feedback
    setTimeout(() => {
      window.location.href = '/login'
    }, 500)
  }
}

