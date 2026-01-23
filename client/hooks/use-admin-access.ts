"use client"

import { useState, useEffect } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface UseAdminAccessReturn {
  isAdmin: boolean
  hasAccess: (permission: string) => boolean
  loading: boolean
}

export function useAdminAccess(): UseAdminAccessReturn {
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/access`, {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin || false)
          setPermissions(data.permissions || [])
        } else {
          setIsAdmin(false)
          setPermissions([])
        }
      } catch (err) {
        setIsAdmin(false)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [])

  const hasAccess = (permission: string): boolean => {
    return isAdmin && (permissions.includes(permission) || permissions.includes("*"))
  }

  return {
    isAdmin,
    hasAccess,
    loading,
  }
}


