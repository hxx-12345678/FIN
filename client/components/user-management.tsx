"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Settings,
  MoreHorizontal,
  Edit,
  Trash2,
  Crown,
  Eye,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PermissionMatrix } from "./auth/permission-matrix"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api-config"

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  // Try localStorage first
  const token = localStorage.getItem("auth-token")
  if (token) return token
  // Try cookies
  const cookies = document.cookie.split("; ")
  const authCookie = cookies.find((row) => row.startsWith("auth-token="))
  if (authCookie) {
    return authCookie.split("=")[1]
  }
  return null
}

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
  status: "active" | "inactive" | "pending"
  lastActive: Date | null
  joinDate: Date
}

interface Invitation {
  id: string
  email: string
  role: string
  invitedBy: string | null
  invitedAt: Date
  status: "pending" | "accepted" | "expired"
  expiresAt: Date
}

interface ActivityLogEntry {
  id: string
  user: string
  action: string
  timestamp: Date
  type: "permission" | "invite" | "role" | "login" | "system" | "user"
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  isDefault: boolean
  userCount: number
}

// Map backend roles to frontend display names
const roleDisplayMap: Record<string, string> = {
  admin: "Admin",
  finance: "Editor",
  viewer: "Viewer",
}

const roleColorMap: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800",
  finance: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-800",
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "Never"
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return "Never"
    
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return dateObj.toLocaleDateString()
  } catch (error) {
    return "Unknown"
  }
}

export function UserManagement() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState("all")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [inviteMessage, setInviteMessage] = useState("")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  // Get orgId from user context or localStorage
  useEffect(() => {
    let mounted = true
    const fetchOrgId = async () => {
      try {
        setError(null)
        // Try localStorage first
        const storedOrgId = localStorage.getItem("orgId")
        if (storedOrgId) {
          if (mounted) {
            setOrgId(storedOrgId)
          }
          return
        }

        // Fetch from API
        const token = getAuthToken()
        const response = await fetch(`${API_BASE_URL}/auth/me`, { 
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (data.orgs && data.orgs.length > 0) {
            const primaryOrgId = data.orgs[0].id
            localStorage.setItem("orgId", primaryOrgId)
            if (mounted) {
              setOrgId(primaryOrgId)
            }
          } else {
            if (mounted) {
              setLoading(false)
              setError("No organization found. Please create or join an organization.")
            }
          }
        } else {
          if (mounted) {
            setLoading(false)
            setError("Failed to load organization. Please try refreshing the page.")
          }
        }
      } catch (error) {
        console.error("Failed to fetch orgId:", error)
        if (mounted) {
          setLoading(false)
          setError("Failed to connect to server. Please check your connection.")
        }
      }
    }
    fetchOrgId()
    return () => {
      mounted = false
    }
  }, [])

  // Fetch all data when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchAllData()
    }
  }, [orgId])

  const fetchAllData = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchTeamMembers(),
        fetchInvitations(),
        fetchActivityLog(),
        fetchRoles(),
      ])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setError("Failed to load some data. Please try refreshing.")
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
        credentials: "include",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const members = (data.data || []).map((member: any) => {
          try {
            return {
              ...member,
              lastActive: member.lastActive ? new Date(member.lastActive) : null,
              joinDate: member.joinDate ? new Date(member.joinDate) : new Date(),
            }
          } catch (e) {
            return {
              ...member,
              lastActive: null,
              joinDate: new Date(),
            }
          }
        })
        setTeamMembers(members)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || response.statusText
        console.error("Failed to fetch team members:", errorMessage)
        if (response.status === 401) {
          toast.error("Authentication failed. Please log in again.")
        }
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error)
    }
  }

  const fetchInvitations = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations`, {
        credentials: "include",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const invs = (data.data || []).map((inv: any) => {
          try {
            return {
              ...inv,
              invitedAt: inv.invitedAt ? new Date(inv.invitedAt) : new Date(),
              expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : new Date(),
            }
          } catch (e) {
            return {
              ...inv,
              invitedAt: new Date(),
              expiresAt: new Date(),
            }
          }
        })
        setInvitations(invs)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || response.statusText
        console.error("Failed to fetch invitations:", errorMessage)
        if (response.status === 401) {
          toast.error("Authentication failed. Please log in again.")
        }
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error)
    }
  }

  const fetchActivityLog = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/activity?limit=50`, {
        credentials: "include",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const acts = (data.data || []).map((act: any) => {
          try {
            return {
              ...act,
              timestamp: act.timestamp ? new Date(act.timestamp) : new Date(),
            }
          } catch (e) {
            return {
              ...act,
              timestamp: new Date(),
            }
          }
        })
        setActivities(acts)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || response.statusText
        console.error("Failed to fetch activity log:", errorMessage)
        if (response.status === 401) {
          toast.error("Authentication failed. Please log in again.")
        }
      }
    } catch (error) {
      console.error("Failed to fetch activity log:", error)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        credentials: "include",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || response.statusText
        console.error("Failed to fetch roles:", errorMessage)
        if (response.status === 401) {
          toast.error("Authentication failed. Please log in again.")
        }
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const handleInviteUser = async () => {
    if (!orgId || !inviteEmail) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/invite`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || undefined,
        }),
      })

      if (response.ok) {
        toast.success("Invitation sent successfully")
        setInviteEmail("")
        setInviteMessage("")
        setShowInviteDialog(false)
        fetchInvitations()
        fetchTeamMembers()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to send invitation")
      }
    } catch (error) {
      toast.error("Failed to send invitation")
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!orgId) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${userId}/role`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        toast.success("Role updated successfully")
        setShowRoleDialog(false)
        setSelectedUser(null)
        fetchTeamMembers()
        fetchActivityLog()
      } else {
        const error = await response.json()
        const errorMessage = error.error?.message || error.message || "Failed to update role"
        toast.error(errorMessage)
        // If it's the "last admin" error, show a more helpful message
        if (errorMessage.includes("last admin")) {
          toast.error("Cannot remove the last admin. Please assign another admin role first.")
        }
      }
    } catch (error) {
      toast.error("Failed to update role")
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!orgId) return
    if (!confirm("Are you sure you want to remove this user?")) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        toast.success("User removed successfully")
        fetchTeamMembers()
        fetchActivityLog()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to remove user")
      }
    } catch (error) {
      toast.error("Failed to remove user")
    }
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    if (!orgId) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${userId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        toast.success(`User ${isActive ? "activated" : "deactivated"} successfully`)
        fetchTeamMembers()
        fetchActivityLog()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update user status")
      }
    } catch (error) {
      toast.error("Failed to update user status")
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (!orgId) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/invitations/${invitationId}/resend`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      )

      if (response.ok) {
        toast.success("Invitation resent successfully")
        fetchInvitations()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to resend invitation")
      }
    } catch (error) {
      toast.error("Failed to resend invitation")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!orgId) return
    if (!confirm("Are you sure you want to cancel this invitation?")) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Invitation cancelled successfully")
        fetchInvitations()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to cancel invitation")
      }
    } catch (error) {
      toast.error("Failed to cancel invitation")
    }
  }

  const filteredMembers = (teamMembers || []).filter((member) => {
    if (selectedRole === "all") return true
    return member.role === selectedRole
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "finance":
        return <Edit className="h-4 w-4 text-green-600" />
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const activeUsers = (teamMembers || []).filter((m) => m?.status === "active").length
  const pendingInvites = (invitations || []).filter((i) => i?.status === "pending").length
  const adminUsers = (teamMembers || []).filter((m) => m?.role === "admin").length

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error && !orgId) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!orgId && !loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No organization found. Please create or join an organization to manage users.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{teamMembers?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold">{pendingInvites}</p>
              </div>
              <Mail className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold">{adminUsers}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 min-w-[500px]">
            <TabsTrigger value="members" className="text-xs sm:text-sm">Team Members</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs sm:text-sm">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs sm:text-sm">Permission Matrix</TabsTrigger>
            <TabsTrigger value="invitations" className="text-xs sm:text-sm">Invitations</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity Log</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="members" className="space-y-4 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team members and their access levels</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="finance">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No team members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => {
                        if (!member) return null
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {(member.name || member.email)
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{member.name || member.email}</div>
                                  <div className="text-sm text-muted-foreground">{member.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(member.role)}
                                <Badge className={roleColorMap[member.role] || "bg-gray-100 text-gray-800"}>
                                  {roleDisplayMap[member.role] || member.role}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTimeAgo(member.lastActive)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48" collisionPadding={16}>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(member)
                                      setShowRoleDialog(true)
                                    }}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleStatus(member.id, member.status !== "active")
                                    }
                                  >
                                    {member.status === "active" ? (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="mr-2 h-4 w-4" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleRemoveUser(member.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(!roles || roles.length === 0) ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No roles found
                </CardContent>
              </Card>
            ) : (
              roles.map((role) => {
                if (!role) return null
                return (
                  <Card key={role.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getRoleIcon(role.id)}
                        {role.name}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">Permissions:</h4>
                          <div className="flex flex-wrap gap-2">
                            {role.permissions.map((permission) => (
                              <Badge key={permission} variant="outline">
                                {permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm text-muted-foreground">{role.userCount} users</span>
                          {!role.isDefault && (
                            <Button variant="outline" size="sm" className="bg-transparent">
                              Edit Role
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Invitation</CardTitle>
                <CardDescription>Invite new team members to your workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="finance">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                  <Input
                    id="invite-message"
                    placeholder="Welcome to our team!"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={!inviteEmail} onClick={handleInviteUser}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invitation History</CardTitle>
                <CardDescription>Track sent invitations and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(!invitations || invitations.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No invitations sent yet
                    </p>
                  ) : (
                    invitations.map((invitation) => {
                      if (!invitation) return null
                      return (
                        <div key={invitation.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium">{invitation.email}</div>
                              <div className="text-sm text-muted-foreground">
                                {invitation.invitedBy && `Invited by ${invitation.invitedBy} • `}
                                {invitation.invitedAt 
                                  ? (invitation.invitedAt instanceof Date 
                                      ? invitation.invitedAt.toLocaleDateString()
                                      : new Date(invitation.invitedAt).toLocaleDateString())
                                  : "Unknown date"}
                              </div>
                            </div>
                            <Badge
                              className={
                                invitation.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : invitation.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {invitation.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(invitation.role)}
                              <span className="text-sm">{roleDisplayMap[invitation.role] || invitation.role}</span>
                            </div>
                            <div className="flex gap-1">
                              {invitation.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-transparent"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                  >
                                    Resend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-transparent"
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {invitation.status === "expired" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                >
                                  Resend
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Log</CardTitle>
              <CardDescription>Recent user actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!activities || activities.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity found</p>
                ) : (
                  activities.map((activity) => {
                    if (!activity) return null
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {activity.type === "permission" && <Shield className="h-4 w-4 text-blue-500" />}
                          {activity.type === "invite" && <Mail className="h-4 w-4 text-green-500" />}
                          {activity.type === "role" && <Edit className="h-4 w-4 text-purple-500" />}
                          {activity.type === "login" && <Users className="h-4 w-4 text-orange-500" />}
                          {activity.type === "system" && <Settings className="h-4 w-4 text-gray-500" />}
                          {activity.type === "user" && <UserPlus className="h-4 w-4 text-indigo-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.user}</span> {activity.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-invite-email">Email Address</Label>
              <Input
                id="dialog-invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="finance">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-invite-message">Personal Message (Optional)</Label>
              <Input
                id="dialog-invite-message"
                placeholder="Welcome to our team!"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={!inviteEmail}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-role">New Role</Label>
              <Select
                value={selectedUser?.role || ""}
                onValueChange={(value) => {
                  if (selectedUser) {
                    handleUpdateRole(selectedUser.id, value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="finance">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
