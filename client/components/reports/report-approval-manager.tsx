"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  Mail,
  Calendar,
  Loader2,
  AlertCircle,
  Eye,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("auth-token")
  if (token) return token
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
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

interface Report {
  id: string
  type: string
  status: string
  approvalStatus?: string
  approvalRequired?: boolean
  approverIds?: string[]
  approvedBy?: string[]
  rejectedBy?: string
  rejectionReason?: string
  createdAt: string
  approvedAt?: string
  publishedAt?: string
  version: number
  distributionList?: string[]
  distributionMethod?: string
}

interface User {
  id: string
  email: string
  name?: string
}

interface ApprovalStatus {
  id: string
  approvalStatus: string
  approvalRequired: boolean
  approverIds: string[]
  approvedBy: string[]
  rejectedBy?: string
  rejectionReason?: string
  rejectedAt?: Date
  approvedAt?: Date
  publishedAt?: Date
  version: number
  distributionList: string[]
  distributionMethod?: string
  scheduledAt?: Date
  scheduleFrequency?: string
  approvalHistory: Array<{
    id: string
    approverId: string
    approverEmail: string
    action: string
    comment?: string
    createdAt: Date
  }>
}

export function ReportApprovalManager({ orgId }: { orgId: string }) {
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form states
  const [reportType, setReportType] = useState<"pptx" | "pdf" | "memo" | "xlsx">("pdf")
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [approverIds, setApproverIds] = useState<string[]>([])
  const [distributionList, setDistributionList] = useState<string[]>([])
  const [distributionMethod, setDistributionMethod] = useState<"email" | "slack" | "download" | "share_link">("email")
  const [approvalComment, setApprovalComment] = useState("")
  const [emailInput, setEmailInput] = useState("")

  useEffect(() => {
    if (orgId) {
      fetchReports()
      fetchUsers()
    }
  }, [orgId])

  const fetchReports = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/exports?limit=50`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.exports) {
          setReports(data.exports)
        }
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
      toast.error("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          // Map the team members to user format
          // The service returns TeamMember[] with id, name, email, role, status
          const mappedUsers = data.data
            .filter((member: any) => member.status === 'active') // Only active users
            .filter((member: any) => ['admin', 'finance'].includes(member.role)) // Only users who can approve
            .map((member: any) => ({
              id: member.id,
              email: member.email,
              name: member.name || member.email.split('@')[0], // Use email prefix if name not available
            }))
            .filter((user: any) => user.id && user.email) // Filter out invalid entries
          setUsers(mappedUsers)
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users. Some features may not work.")
    }
  }

  const fetchApprovalStatus = async (exportId: string) => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/reports/${exportId}/approval-status`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.status) {
          setApprovalStatus(data.status)
          return data.status
        }
      }
    } catch (error) {
      console.error("Failed to fetch approval status:", error)
      toast.error("Failed to load approval status")
    }
    return null
  }

  const handleCreateReport = async () => {
    if (!orgId) return
    setActionLoading(true)

    try {
      // Validate approver IDs if approval required
      if (approvalRequired && approverIds.length === 0) {
        toast.error("Please select at least one approver when approval is required")
        setActionLoading(false)
        return
      }

      // Validate distribution list if email/slack method
      if ((distributionMethod === "email" || distributionMethod === "slack") && distributionList.length === 0) {
        toast.error(`Please add at least one ${distributionMethod === "email" ? "email address" : "channel"} for ${distributionMethod} distribution`)
        setActionLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/reports`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          type: reportType,
          approvalRequired,
          approverIds: approvalRequired ? approverIds : undefined,
          distributionList: distributionList.length > 0 ? distributionList : undefined,
          distributionMethod: distributionList.length > 0 ? distributionMethod : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          toast.success("Report created successfully")
          setShowCreateDialog(false)
          resetForm()
          fetchReports()
        } else {
          toast.error(data.error?.message || "Failed to create report")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to create report")
      }
    } catch (error) {
      console.error("Failed to create report:", error)
      toast.error("Failed to create report")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitForApproval = async () => {
    if (!orgId || !selectedReport) return
    setActionLoading(true)

    try {
      if (approverIds.length === 0) {
        toast.error("Please select at least one approver")
        setActionLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/reports/${selectedReport.id}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ approverIds }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          toast.success("Report submitted for approval")
          setShowSubmitDialog(false)
          fetchReports()
        } else {
          toast.error(data.error?.message || "Failed to submit report")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to submit report")
      }
    } catch (error) {
      console.error("Failed to submit report:", error)
      toast.error("Failed to submit report")
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveOrReject = async (action: "approve" | "reject" | "request_changes") => {
    if (!orgId || !selectedReport) return
    setActionLoading(true)

    try {
      if (action === "reject" || action === "request_changes") {
        if (!approvalComment.trim()) {
          toast.error(`${action === "reject" ? "Rejection reason" : "Comment"} is required`)
          setActionLoading(false)
          return
        }
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/reports/${selectedReport.id}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          action,
          comment: approvalComment || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          toast.success(`Report ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes requested"} successfully`)
          setShowApproveDialog(false)
          setApprovalComment("")
          fetchReports()
        } else {
          toast.error(data.error?.message || `Failed to ${action} report`)
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || `Failed to ${action} report`)
      }
    } catch (error) {
      console.error(`Failed to ${action} report:`, error)
      toast.error(`Failed to ${action} report`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewStatus = async (report: Report) => {
    setSelectedReport(report)
    const status = await fetchApprovalStatus(report.id)
    if (status) {
      setShowStatusDialog(true)
    }
  }

  const resetForm = () => {
    setReportType("pdf")
    setApprovalRequired(false)
    setApproverIds([])
    setDistributionList([])
    setDistributionMethod("email")
    setEmailInput("")
    setApprovalComment("")
  }

  const addEmail = () => {
    const email = emailInput.trim()
    if (email && !distributionList.includes(email)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(email)) {
        setDistributionList([...distributionList, email])
        setEmailInput("")
      } else {
        toast.error("Invalid email address")
      }
    }
  }

  const removeEmail = (email: string) => {
    setDistributionList(distributionList.filter((e) => e !== email))
  }

  const getStatusBadge = (report: Report) => {
    const status = report.approvalStatus || report.status
    switch (status) {
      case "pending_approval":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case "published":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" />Published</Badge>
      case "draft":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><FileText className="w-3 h-3 mr-1" />Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const canApprove = (report: Report) => {
    const status = report.approvalStatus || report.status
    return status === "pending_approval" && report.approverIds && report.approverIds.length > 0
  }

  const canSubmit = (report: Report) => {
    const status = report.approvalStatus || report.status
    return status === "draft" || !status
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Approval Workflow</CardTitle>
              <CardDescription>Manage report creation, approval, and distribution</CardDescription>
            </div>
            <Button onClick={() => {
              resetForm()
              setShowCreateDialog(true)
            }}>
              <FileText className="w-4 h-4 mr-2" />
              Create Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-xs">{report.id.slice(0, 8)}...</TableCell>
                    <TableCell><Badge variant="outline">{report.type.toUpperCase()}</Badge></TableCell>
                    <TableCell>{getStatusBadge(report)}</TableCell>
                    <TableCell>v{report.version || 1}</TableCell>
                    <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStatus(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canSubmit(report) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report)
                              setShowSubmitDialog(true)
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {canApprove(report) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report)
                              setShowApproveDialog(true)
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>Create a new report with optional approval workflow</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="pptx">PowerPoint (PPTX)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="memo">Memo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval-required"
                checked={approvalRequired}
                onCheckedChange={(checked) => setApprovalRequired(checked as boolean)}
              />
              <Label htmlFor="approval-required" className="cursor-pointer">
                Require approval before publishing
              </Label>
            </div>

            {approvalRequired && (
              <div>
                <Label>Approvers</Label>
                <div className="space-y-2 mt-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`approver-${user.id}`}
                        checked={approverIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setApproverIds([...approverIds, user.id])
                          } else {
                            setApproverIds(approverIds.filter((id) => id !== user.id))
                          }
                        }}
                      />
                      <Label htmlFor={`approver-${user.id}`} className="cursor-pointer">
                        {user.name || user.email}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Distribution Method</Label>
              <Select value={distributionMethod} onValueChange={(value: any) => setDistributionMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="share_link">Share Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionMethod === "email" && (
              <div>
                <Label>Distribution List</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addEmail()}
                  />
                  <Button type="button" onClick={addEmail}>Add</Button>
                </div>
                {distributionList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {distributionList.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReport} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Approval Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>Select approvers for this report</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Approvers</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`submit-approver-${user.id}`}
                      checked={approverIds.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setApproverIds([...approverIds, user.id])
                        } else {
                          setApproverIds(approverIds.filter((id) => id !== user.id))
                        }
                      }}
                    />
                    <Label htmlFor={`submit-approver-${user.id}`} className="cursor-pointer">
                      {user.name || user.email}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForApproval} disabled={actionLoading || approverIds.length === 0}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>Approve, reject, or request changes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add a comment (required for reject/request changes)"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApproveOrReject("request_changes")}
              disabled={actionLoading || !approvalComment.trim()}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Changes
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApproveOrReject("reject")}
              disabled={actionLoading || !approvalComment.trim()}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
            <Button onClick={() => handleApproveOrReject("approve")} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval Status</DialogTitle>
            <DialogDescription>View detailed approval information</DialogDescription>
          </DialogHeader>
          {approvalStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReport!)}</div>
                </div>
                <div>
                  <Label>Version</Label>
                  <div className="mt-1">v{approvalStatus.version}</div>
                </div>
              </div>

              {approvalStatus.approverIds.length > 0 && (
                <div>
                  <Label>Approvers</Label>
                  <div className="mt-1 space-y-1">
                    {approvalStatus.approverIds.map((approverId) => {
                      const user = users.find((u) => u.id === approverId)
                      const approved = approvalStatus.approvedBy.includes(approverId)
                      return (
                        <div key={approverId} className="flex items-center justify-between">
                          <span>{user?.name || user?.email || approverId}</span>
                          {approved ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {approvalStatus.rejectedBy && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">Rejected by: {approvalStatus.rejectedBy}</div>
                    {approvalStatus.rejectionReason && (
                      <div className="mt-1">{approvalStatus.rejectionReason}</div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {approvalStatus.approvalHistory.length > 0 && (
                <div>
                  <Label>Approval History</Label>
                  <div className="mt-2 space-y-2">
                    {approvalStatus.approvalHistory.map((history) => (
                      <div key={history.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{history.approverEmail}</span>
                          <Badge>{history.action}</Badge>
                        </div>
                        {history.comment && (
                          <div className="mt-1 text-sm text-muted-foreground">{history.comment}</div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(history.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

