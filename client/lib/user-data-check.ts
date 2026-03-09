import { API_BASE_URL } from "./api-config"

/**
 * Check if user has imported data (transactions from CSV or integrations)
 */
export async function checkUserHasData(orgId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem("auth-token") || document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (!token || !orgId) {
      return false
    }

    // Check for transactions (from CSV imports or integrations)
    const transactionsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/transactions?limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (transactionsResponse.ok) {
      const transactionsResult = await transactionsResponse.json()
      if (transactionsResult.ok && transactionsResult.transactions && transactionsResult.transactions.length > 0) {
        return true
      }
    }

    // Check for connected integrations
    const connectorsResponse = await fetch(`${API_BASE_URL}/connectors/orgs/${orgId}/connectors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    // 404 is expected when no connectors exist - not an error, just means no integrations
    if (connectorsResponse.ok) {
      const connectorsResult = await connectorsResponse.json()
      if (connectorsResult.ok && connectorsResult.data) {
        // Handle both array and object response formats
        const connectorsList = Array.isArray(connectorsResult.data)
          ? connectorsResult.data
          : connectorsResult.data.connectors || []
        const connectedConnectors = connectorsList.filter(
          (c: any) => c && (c.status === "connected" || c.status === "syncing")
        )
        if (connectedConnectors.length > 0) {
          return true
        }
      }
    }

    // NEW SECONDARY CHECK: Check if user has any custom models (prevents redirect for users with synthetic models)
    const modelsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (modelsResponse.ok) {
      const modelsResult = await modelsResponse.json()
      if (modelsResult.ok && modelsResult.models && modelsResult.models.length > 0) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking user data:", error)
    return false
  }
}

/**
 * Get user's organization ID
 */
export async function getUserOrgId(): Promise<string | null> {
  const storedOrgId = localStorage.getItem("orgId")
  if (storedOrgId) {
    return storedOrgId
  }

  try {
    const token = localStorage.getItem("auth-token") || document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (!token) return null

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (response.ok) {
      const userData = await response.json()
      if (userData.orgs && userData.orgs.length > 0) {
        const primaryOrgId = userData.orgs[0].id
        localStorage.setItem("orgId", primaryOrgId)
        return primaryOrgId
      }
    }
  } catch (error) {
    console.error("Failed to fetch orgId:", error)
  }

  return null
}

