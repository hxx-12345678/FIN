"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthToken } from "@/lib/api-config"

interface Organization {
  id: string
  name: string
  role: string
  planTier?: string
  createdAt?: string
}

interface SwitchOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: Organization[]
  currentOrgId: string | null
  onSwitchComplete: () => void
}

export function SwitchOrganizationDialog({
  open,
  onOpenChange,
  organizations,
  currentOrgId,
  onSwitchComplete,
}: SwitchOrganizationDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(currentOrgId)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedOrgId(currentOrgId)
    }
  }, [open, currentOrgId])

  const handleSwitch = async () => {
    if (!selectedOrgId || selectedOrgId === currentOrgId) {
      onOpenChange(false)
      return
    }

    setSwitching(true)
    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      // Verify the user belongs to the selected organization
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify user")
      }

      const userData = await verifyResponse.json()
      const hasAccess = userData.orgs?.some((org: Organization) => org.id === selectedOrgId)

      if (!hasAccess) {
        toast.error("You don't have access to this organization")
        return
      }

      // Update localStorage with new orgId
      localStorage.setItem("orgId", selectedOrgId)

      // Refresh the token with new orgId (backend will generate new token)
      const switchResponse = await fetch(`${API_BASE_URL}/auth/switch-org`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ orgId: selectedOrgId }),
      })

      if (!switchResponse.ok) {
        // If switch-org endpoint doesn't exist, just update localStorage
        // The token will be refreshed on next API call
        console.warn("Switch org endpoint not available, using localStorage only")
      } else {
        const result = await switchResponse.json()
        if (result.token) {
          localStorage.setItem("auth-token", result.token)
          if (result.refreshToken) {
            localStorage.setItem("refresh-token", result.refreshToken)
          }
        }
      }

      toast.success("Organization switched successfully")
      onOpenChange(false)
      
      // Reload the page to refresh all data
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      console.error("Error switching organization:", error)
      toast.error(error.message || "Failed to switch organization")
    } finally {
      setSwitching(false)
    }
  }

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Organization
          </DialogTitle>
          <DialogDescription>
            Select an organization to switch to. You can only access organizations you belong to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No organizations available
            </div>
          ) : (
            organizations.map((org) => {
              const isSelected = selectedOrgId === org.id
              const isCurrent = currentOrgId === org.id

              return (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shrink-0">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{org.name}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                          </Badge>
                          {org.planTier && (
                            <Badge variant="outline" className="text-xs">
                              {org.planTier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={switching}>
            Cancel
          </Button>
          <Button onClick={handleSwitch} disabled={switching || !selectedOrgId || selectedOrgId === currentOrgId}>
            {switching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch Organization"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

