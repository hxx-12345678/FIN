"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, LogOut, AlertTriangle, Monitor, Smartphone, Tablet, Globe } from "lucide-react"
import { toast } from "sonner"

interface Session {
  id: string
  device: string
  deviceType: "desktop" | "mobile" | "tablet" | "unknown"
  location: string
  ip: string
  lastActivity: string
  isCurrent: boolean
}

type SessionState = "loading" | "active-sessions" | "empty" | "error"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function SessionManagement() {
  const [state, setState] = useState<SessionState>("loading")
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  const fetchSessions = async () => {
    setState("loading")
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch sessions")
      }

      const data = await response.json()
      const sessionsList = data.sessions || []

      if (sessionsList.length === 0) {
        setState("empty")
      } else {
        setSessions(sessionsList)
        setState("active-sessions")
      }
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Failed to load sessions")
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to revoke session. Please try again.")
      }

      toast.success("Session revoked successfully")
      await fetchSessions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke session. Please try again."
      toast.error(errorMessage)
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleRevokeAll = async () => {
    setIsRevokingAll(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions/revoke-all`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to revoke all sessions")
      }

      toast.success("Logged out from all devices")
      setShowRevokeAllDialog(false)
      
      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke all sessions"
      toast.error(errorMessage)
      setIsRevokingAll(false)
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="h-4 w-4" />
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const formatLastActivity = (lastActivity: string) => {
    const date = new Date(lastActivity)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  }

  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || "Failed to load sessions"}</AlertDescription>
          </Alert>
          <Button onClick={fetchSessions} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No active sessions found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowRevokeAllDialog(true)}
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout Everywhere
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.deviceType)}
                        <div>
                          <div className="font-medium">{session.device}</div>
                          {session.isCurrent && (
                            <Badge variant="default" className="text-xs mt-1">
                              Current Session
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{session.location}</TableCell>
                    <TableCell className="font-mono text-sm">{session.ip}</TableCell>
                    <TableCell>{formatLastActivity(session.lastActivity)}</TableCell>
                    <TableCell className="text-right">
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                        >
                          {revokingSessionId === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <LogOut className="mr-2 h-4 w-4" />
                              Logout
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log you out from all devices except this one. You will need to sign in again on other devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevokingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAll} disabled={isRevokingAll} className="bg-destructive">
              {isRevokingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout Everywhere"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


