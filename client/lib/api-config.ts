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

