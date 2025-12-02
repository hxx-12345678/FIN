"use client"

import { useState } from "react"
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
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PermissionMatrix } from "./auth/permission-matrix"

const teamMembers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@company.com",
    role: "Owner",
    department: "Executive",
    status: "active",
    lastActive: "2 minutes ago",
    joinDate: "2023-01-15",
    permissions: ["all"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    email: "sarah@company.com",
    role: "Admin",
    department: "Finance",
    status: "active",
    lastActive: "1 hour ago",
    joinDate: "2023-02-20",
    permissions: ["read", "write", "export"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    name: "Mike Chen",
    email: "mike@company.com",
    role: "Editor",
    department: "Finance",
    status: "active",
    lastActive: "3 hours ago",
    joinDate: "2023-03-10",
    permissions: ["read", "write"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    email: "emily@company.com",
    role: "Viewer",
    department: "Operations",
    status: "inactive",
    lastActive: "2 days ago",
    joinDate: "2023-04-05",
    permissions: ["read"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 5,
    name: "David Kim",
    email: "david@company.com",
    role: "Editor",
    department: "Marketing",
    status: "pending",
    lastActive: "Never",
    joinDate: "2024-06-15",
    permissions: ["read", "write"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

const rolePermissions = {
  Owner: {
    description: "Full access to all features and settings",
    permissions: ["Read", "Write", "Export", "Admin", "Billing", "User Management"],
    color: "bg-purple-100 text-purple-800",
  },
  Admin: {
    description: "Manage users and access most features",
    permissions: ["Read", "Write", "Export", "User Management"],
    color: "bg-blue-100 text-blue-800",
  },
  Editor: {
    description: "Create and edit financial models and reports",
    permissions: ["Read", "Write", "Export"],
    color: "bg-green-100 text-green-800",
  },
  Viewer: {
    description: "View-only access to dashboards and reports",
    permissions: ["Read"],
    color: "bg-gray-100 text-gray-800",
  },
}

const invitationHistory = [
  {
    id: 1,
    email: "alex@company.com",
    role: "Editor",
    invitedBy: "John Doe",
    invitedAt: "2024-06-20",
    status: "pending",
    expiresAt: "2024-06-27",
  },
  {
    id: 2,
    email: "lisa@company.com",
    role: "Viewer",
    invitedBy: "Sarah Wilson",
    invitedAt: "2024-06-18",
    status: "accepted",
    expiresAt: "2024-06-25",
  },
  {
    id: 3,
    email: "tom@company.com",
    role: "Admin",
    invitedBy: "John Doe",
    invitedAt: "2024-06-15",
    status: "expired",
    expiresAt: "2024-06-22",
  },
]

export function UserManagement() {
  const [selectedRole, setSelectedRole] = useState("all")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("Viewer")

  const filteredMembers = teamMembers.filter((member) => {
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
      case "Owner":
        return <Crown className="h-4 w-4 text-purple-600" />
      case "Admin":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "Editor":
        return <Edit className="h-4 w-4 text-green-600" />
      case "Viewer":
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <Users className="h-4 w-4" />
    }
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
          <Button variant="outline" size="sm" className="bg-transparent">
            <Settings className="mr-2 h-4 w-4" />
            Role Settings
          </Button>
          <Button size="sm">
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
                <p className="text-2xl font-bold">{teamMembers.length}</p>
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
                <p className="text-2xl font-bold">{teamMembers.filter((m) => m.status === "active").length}</p>
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
                <p className="text-2xl font-bold">{teamMembers.filter((m) => m.status === "pending").length}</p>
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
                <p className="text-2xl font-bold">
                  {teamMembers.filter((m) => m.role === "Admin" || m.role === "Owner").length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team members and their access levels</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
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
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <Badge className={rolePermissions[member.role as keyof typeof rolePermissions]?.color}>
                              {member.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.lastActive}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem>
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
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(rolePermissions).map(([role, details]) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    {role}
                  </CardTitle>
                  <CardDescription>{details.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Permissions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {details.permissions.map((permission) => (
                          <Badge key={permission} variant="outline">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        {teamMembers.filter((m) => m.role === role).length} users
                      </span>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Edit Role
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                      <SelectItem value="Viewer">Viewer</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                  <Input id="invite-message" placeholder="Welcome to our team!" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="send-welcome" defaultChecked />
                  <Label htmlFor="send-welcome" className="text-sm">
                    Send welcome email with getting started guide
                  </Label>
                </div>
                <Button className="w-full" disabled={!inviteEmail}>
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
                  {invitationHistory.map((invitation) => (
                    <div key={invitation.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Invited by {invitation.invitedBy} • {invitation.invitedAt}
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
                          <span className="text-sm">{invitation.role}</span>
                        </div>
                        <div className="flex gap-1">
                          {invitation.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                Resend
                              </Button>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                Cancel
                              </Button>
                            </>
                          )}
                          {invitation.status === "expired" && (
                            <Button size="sm" variant="outline" className="bg-transparent">
                              Resend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
                {[
                  {
                    user: "Sarah Wilson",
                    action: "Updated financial model permissions",
                    timestamp: "2 hours ago",
                    type: "permission",
                  },
                  {
                    user: "John Doe",
                    action: "Invited new user alex@company.com",
                    timestamp: "4 hours ago",
                    type: "invite",
                  },
                  {
                    user: "Mike Chen",
                    action: "Changed role from Viewer to Editor",
                    timestamp: "1 day ago",
                    type: "role",
                  },
                  {
                    user: "Emily Rodriguez",
                    action: "Last login from 192.168.1.100",
                    timestamp: "2 days ago",
                    type: "login",
                  },
                  {
                    user: "System",
                    action: "Automated backup completed",
                    timestamp: "3 days ago",
                    type: "system",
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === "permission" && <Shield className="h-4 w-4 text-blue-500" />}
                      {activity.type === "invite" && <Mail className="h-4 w-4 text-green-500" />}
                      {activity.type === "role" && <Edit className="h-4 w-4 text-purple-500" />}
                      {activity.type === "login" && <Users className="h-4 w-4 text-orange-500" />}
                      {activity.type === "system" && <Settings className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
