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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

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
        fetch(`${API_BASE_URL}/auth/permissions`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/auth/roles`, { credentials: "include" }),
      ])

      if (!permissionsRes.ok || !rolesRes.ok) {
        throw new Error("Failed to fetch permissions or roles")
      }

      const [permissionsData, rolesData] = await Promise.all([
        permissionsRes.json(),
        rolesRes.json(),
      ])

      const perms = permissionsData.permissions || []
      const rolesList = rolesData.roles || []

      setPermissions(perms)
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

    if (roleId !== selectedRole?.id) {
      setSelectedRole(role)
      setEditedPermissions(new Set(role.permissions))
      setOriginalPermissions(new Set(role.permissions))
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
      const response = await fetch(`${API_BASE_URL}/auth/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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

