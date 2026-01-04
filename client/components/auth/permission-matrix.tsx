"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Info, AlertCircle, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface Role {
  id: string
  name: string
  permissions: string[]
  isDefault?: boolean
}

interface PermissionMatrixProps {
  roleId?: string
  readOnly?: boolean
}

type MatrixState = "loading" | "matrix-display" | "editing" | "saving" | "error"

import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"


export function PermissionMatrix({ roleId, readOnly = false }: PermissionMatrixProps) {
  const [state, setState] = useState<MatrixState>("loading")
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<Set<string>>(new Set())
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [roleId])

  const fetchData = async () => {
    setState("loading")
    setError(null)

    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/permissions`, { 
          credentials: "include",
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE_URL}/auth/roles`, { 
          credentials: "include",
          headers: getAuthHeaders(),
        }),
      ])

      if (!permissionsRes.ok || !rolesRes.ok) {
        throw new Error("Failed to fetch permissions or roles")
      }

      const [permissionsData, rolesData] = await Promise.all([
        permissionsRes.json(),
        rolesRes.json(),
      ])

      // Backend returns { ok: true, data: { permissions: [...] } } where permissions is array of strings
      const permsStrings = permissionsData.data?.permissions || permissionsData.permissions || []
      
      // Backend returns { ok: true, data: { roles: [...] } } where roles is array of { orgId, role, orgName }
      const rolesDataList = rolesData.data?.roles || rolesData.roles || []

      // Create default permission structure from available permissions
      const defaultPerms: Permission[] = [
        { id: "admin:*", name: "Admin Access", description: "Full administrative access", category: "Administration" },
        { id: "finance:*", name: "Finance Access", description: "Full finance and accounting access", category: "Finance" },
        { id: "viewer:*", name: "Viewer Access", description: "Read-only access to all data", category: "Viewer" },
        { id: "org:read", name: "View Organization", description: "View organization details", category: "Organization" },
        { id: "org:write", name: "Edit Organization", description: "Edit organization settings", category: "Organization" },
        { id: "users:read", name: "View Users", description: "View user list", category: "Users" },
        { id: "users:write", name: "Manage Users", description: "Add, edit, or remove users", category: "Users" },
        { id: "reports:read", name: "View Reports", description: "View financial reports", category: "Reports" },
        { id: "reports:write", name: "Create Reports", description: "Create and export reports", category: "Reports" },
      ]
      
      // Filter to only show permissions that exist in backend response
      const perms = defaultPerms.filter(p => permsStrings.length === 0 || permsStrings.includes(p.id))
      setPermissions(perms)

      // Transform backend roles format to frontend format
      // Backend returns: [{ orgId, role, orgName }]
      // Frontend expects: [{ id, name, permissions: string[], isDefault? }]
      const roleMap: Record<string, string[]> = {
        admin: ["admin:*", "finance:*", "viewer:*", "org:read", "org:write", "users:read", "users:write", "reports:read", "reports:write"],
        finance: ["finance:*", "viewer:*", "org:read", "reports:read", "reports:write"],
        viewer: ["viewer:*", "org:read", "reports:read"],
      }

      const rolesList: Role[] = rolesDataList.map((r: any) => ({
        id: r.role || r.id,
        name: r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : r.name,
        permissions: roleMap[r.role] || [],
        isDefault: true,
      }))

      // If no roles from backend, create default roles
      if (rolesList.length === 0) {
        const defaultRoles: Role[] = [
          { id: "admin", name: "Admin", permissions: roleMap.admin, isDefault: true },
          { id: "finance", name: "Finance", permissions: roleMap.finance, isDefault: true },
          { id: "viewer", name: "Viewer", permissions: roleMap.viewer, isDefault: true },
        ]
        setRoles(defaultRoles)
        if (!roleId) {
          setSelectedRole(defaultRoles[0])
          setEditedPermissions(new Set(defaultRoles[0].permissions))
          setOriginalPermissions(new Set(defaultRoles[0].permissions))
        }
      } else {
        setRoles(rolesList)
        if (roleId) {
          const role = rolesList.find((r: Role) => r.id === roleId)
          if (role) {
            setSelectedRole(role)
            setEditedPermissions(new Set(role.permissions))
            setOriginalPermissions(new Set(role.permissions))
          }
        } else if (rolesList.length > 0) {
          const defaultRole = rolesList.find((r: Role) => r.name.toLowerCase() === "admin") || rolesList[0]
          setSelectedRole(defaultRole)
          setEditedPermissions(new Set(defaultRole.permissions))
          setOriginalPermissions(new Set(defaultRole.permissions))
        }
      }

      setState("matrix-display")
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Failed to load permissions")
    }
  }

  const handlePermissionToggle = (roleId: string, permissionId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role || role.isDefault) {
      toast.error("Cannot modify default role permissions.")
      return
    }

    // Only allow editing if this is the selected role
    if (roleId !== selectedRole?.id) {
      // Switch to this role
      setSelectedRole(role)
      setEditedPermissions(new Set(role.permissions))
      setOriginalPermissions(new Set(role.permissions))
      setState("editing")
      return
    }

    setState("editing")
    const newPermissions = new Set(editedPermissions)
    
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId)
    } else {
      newPermissions.add(permissionId)
    }

    setEditedPermissions(newPermissions)
  }

  const handleSave = async () => {
    if (!selectedRole) return

    if (selectedRole.isDefault) {
      toast.error("Cannot modify default role permissions.")
      return
    }

    setState("saving")
    setError(null)

    try {
      // Use user-management endpoint for updating role permissions
      const response = await fetch(`${API_BASE_URL}/auth/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          permissions: Array.from(editedPermissions),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Permission conflict detected.")
      }

      setOriginalPermissions(new Set(editedPermissions))
      setState("matrix-display")
      toast.success("Permissions updated successfully")

      await fetchData()
    } catch (err) {
      setState("error")
      const errorMessage = err instanceof Error ? err.message : "Permission conflict detected."
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleReset = () => {
    if (selectedRole) {
      setEditedPermissions(new Set(originalPermissions))
      setState("matrix-display")
    }
  }

  const hasChanges = () => {
    if (!selectedRole) return false
    const edited = Array.from(editedPermissions).sort().join(",")
    const original = Array.from(originalPermissions).sort().join(",")
    return edited !== original
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Manage role-based access control permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Manage role-based access control permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>Manage role-based access control permissions</CardDescription>
          </div>
          {!readOnly && hasChanges() && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={state === "saving"}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={state === "saving" || !selectedRole || selectedRole.isDefault}>
                {state === "saving" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{role.name}</span>
                      {role.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <React.Fragment key={category}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={roles.length + 1} className="font-semibold">
                      {category}
                    </TableCell>
                  </TableRow>
                  {perms.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span>{permission.name}</span>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{permission.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {roles.map((role) => {
                        const isChecked = role.permissions.includes(permission.id)
                        const isDisabled = role.isDefault || readOnly

                        return (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={() => handlePermissionToggle(role.id, permission.id)}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedRole?.isDefault && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Default roles cannot be modified. Create a custom role to customize permissions.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

