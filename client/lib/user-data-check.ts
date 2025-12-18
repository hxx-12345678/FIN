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
    const connectorsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/connectors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (connectorsResponse.ok) {
      const connectorsResult = await connectorsResponse.json()
      if (connectorsResult.ok && connectorsResult.connectors) {
        const connectedConnectors = connectorsResult.connectors.filter(
          (c: any) => c.status === "connected" || c.status === "syncing"
        )
        if (connectedConnectors.length > 0) {
          return true
        }
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

