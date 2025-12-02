"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, Plus, Trash2, TestTube, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface IPWhitelistEntry {
  id: string
  ip: string
  cidr?: string
  description?: string
  createdAt: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

function validateCIDR(cidr: string): boolean {
  const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/
  return cidrRegex.test(cidr)
}

function validateIP(ip: string): boolean {
  const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/
  if (!ipRegex.test(ip)) return false
  const parts = ip.split(".").map(Number)
  return parts.every((part) => part >= 0 && part <= 255)
}

export function IPWhitelistManagement() {
  const [entries, setEntries] = useState<IPWhitelistEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [newIP, setNewIP] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testIP, setTestIP] = useState("")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    fetchWhitelist()
  }, [])

  const fetchWhitelist = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/security/ip-whitelist`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setIsEnabled(data.enabled || false)
      }
    } catch (err) {
      console.error("Failed to load whitelist", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    setValidationError(null)

    if (!newIP.trim()) {
      setValidationError("IP address or CIDR is required")
      return
    }

    const isValid = validateCIDR(newIP) || validateIP(newIP)
    if (!isValid) {
      setValidationError("Invalid IP address or CIDR notation")
      return
    }

    setIsAdding(true)

    try {
      const response = await fetch(`${API_BASE_URL}/security/ip-whitelist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ip: newIP,
          description: newDescription || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add IP")
      }

      await fetchWhitelist()
      setNewIP("")
      setNewDescription("")
      toast.success("IP address added to whitelist")
    } catch (err) {
      toast.error("Failed to add IP address")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`${API_BASE_URL}/security/ip-whitelist/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete IP")
      }

      await fetchWhitelist()
      toast.success("IP address removed from whitelist")
    } catch (err) {
      toast.error("Failed to delete IP address")
    } finally {
      setDeleteId(null)
    }
  }

  const handleTest = async () => {
    if (!testIP.trim()) {
      setValidationError("IP address is required for testing")
      return
    }

    const isValid = validateIP(testIP)
    if (!isValid) {
      setValidationError("Invalid IP address format")
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/security/ip-whitelist/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ ip: testIP }),
      })

      if (!response.ok) {
        throw new Error("Failed to test IP")
      }

      const data = await response.json()
      setTestResult(data.allowed ? "allowed" : "blocked")
      toast.success(`IP ${data.allowed ? "is allowed" : "is blocked"}`)
    } catch (err) {
      toast.error("Failed to test IP address")
    } finally {
      setIsTesting(false)
    }
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/security/ip-whitelist`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        setIsEnabled(enabled)
        toast.success(`IP whitelist ${enabled ? "enabled" : "disabled"}`)
      }
    } catch (err) {
      toast.error("Failed to update whitelist status")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">IP Whitelist Management</h1>
          <p className="text-muted-foreground">Configure IP address whitelist for access control</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Whitelist Status</CardTitle>
              <CardDescription>Enable or disable IP whitelist enforcement</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isEnabled} onCheckedChange={handleToggleEnabled} />
              <span className="text-sm font-medium">{isEnabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add IP Address</CardTitle>
          <CardDescription>Add IP address or CIDR range to whitelist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ip">IP Address or CIDR</Label>
              <Input
                id="ip"
                placeholder="192.168.1.1 or 192.168.1.0/24"
                value={newIP}
                onChange={(e) => {
                  setNewIP(e.target.value)
                  setValidationError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd()
                  }
                }}
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Office network"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={isAdding || !newIP.trim()}>
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add IP
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test IP Address</CardTitle>
          <CardDescription>Test if an IP address would be allowed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="192.168.1.1"
              value={testIP}
              onChange={(e) => {
                setTestIP(e.target.value)
                setTestResult(null)
                setValidationError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTest()
                }
              }}
            />
            <Button onClick={handleTest} disabled={isTesting || !testIP.trim()}>
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Test IP
                </>
              )}
            </Button>
          </div>
          {testResult && (
            <Alert variant={testResult === "allowed" ? "default" : "destructive"}>
              {testResult === "allowed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                IP address {testIP} is {testResult === "allowed" ? "allowed" : "blocked"}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Whitelist Entries</CardTitle>
          <CardDescription>{entries.length} entries configured</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No IP addresses whitelisted</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address / CIDR</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.ip}</TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm">{formatDate(entry.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove IP Address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the IP address from the whitelist. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


