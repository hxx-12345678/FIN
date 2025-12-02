"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle, UserCheck, Ban, Trash2 } from "lucide-react"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function OrgManagement() {
  const { isAdmin, loading: accessLoading } = useAdminAccess()
  const [orgs, setOrgs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [impersonateOrgId, setImpersonateOrgId] = useState<string | null>(null)
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false)

  useEffect(() => {
    if (isAdmin && !accessLoading) {
      fetchOrgs()
    }
  }, [isAdmin, accessLoading])

  const fetchOrgs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orgs`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setOrgs(data.orgs || [])
      }
    } catch (err) {
      console.error("Failed to load orgs", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImpersonate = async () => {
    if (!impersonateOrgId) return

    try {
      const response = await fetch(`${API_BASE_URL}/admin/orgs/${impersonateOrgId}/impersonate`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Impersonation started")
        window.location.reload()
      } else {
        toast.error("Impersonation requires additional verification.")
      }
    } catch (err) {
      toast.error("Failed to impersonate")
    } finally {
      setShowImpersonateDialog(false)
      setImpersonateOrgId(null)
    }
  }

  if (accessLoading || isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Admin access required.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organization Management</h1>
        <Button onClick={fetchOrgs}>Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Manage all organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.userCount || 0}</TableCell>
                  <TableCell>
                    <Badge variant={org.status === "active" ? "default" : "secondary"}>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{org.healthScore || "N/A"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImpersonateOrgId(org.id)
                        setShowImpersonateDialog(true)
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Impersonate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log you in as this organization. All actions will be performed on their behalf. This action is logged for security purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImpersonate}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


