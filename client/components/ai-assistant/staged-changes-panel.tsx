"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Info, FileText } from "lucide-react"
import { useStagedChanges } from "@/hooks/use-staged-changes"
import { ApprovalModal } from "./approval-modal"
import { AuditabilityModal } from "./auditability-modal"
import { toast } from "sonner"

type FilterStatus = "all" | "pending" | "approved" | "rejected"

export function StagedChangesPanel() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false)
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false)
  const [showAuditabilityModal, setShowAuditabilityModal] = useState(false)
  const [selectedChangeForAudit, setSelectedChangeForAudit] = useState<any>(null)

  const { changes, approve, reject, bulkApprove, bulkReject, isLoading, error } = useStagedChanges(
    statusFilter === "all" ? undefined : statusFilter
  )

  const handleSelectAll = () => {
    const pendingChanges = changes.filter((c) => c.status === "pending")
    if (selectedIds.size === pendingChanges.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingChanges.map((c) => c.id)))
    }
  }

  const handleSelectChange = (changeId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId)
    } else {
      newSelected.add(changeId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    try {
      await bulkApprove(Array.from(selectedIds))
      toast.success(`${selectedIds.size} changes approved`)
      setSelectedIds(new Set())
      setShowBulkApproveDialog(false)
    } catch (err) {
      toast.error("Failed to approve changes")
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return

    try {
      await bulkReject(Array.from(selectedIds))
      toast.success(`${selectedIds.size} changes rejected`)
      setSelectedIds(new Set())
      setShowBulkRejectDialog(false)
    } catch (err) {
      toast.error("Failed to reject changes")
    }
  }

  const handleViewDetails = (changeId: string) => {
    setSelectedChangeId(changeId)
    setShowApprovalModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const pendingChanges = changes.filter((c) => c.status === "pending")
  const allSelected = pendingChanges.length > 0 && selectedIds.size === pendingChanges.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staged Changes</CardTitle>
              <CardDescription>Review and approve AI recommendations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v: FilterStatus) => setStatusFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {pendingChanges.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all pending changes"
                />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkApproveDialog(true)}
                  disabled={selectedIds.size === 0}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkRejectDialog(true)}
                  disabled={selectedIds.size === 0}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject All
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : changes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Staged Changes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Staged changes appear here when you ask the AI CFO to create actionable recommendations.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Try asking questions like "How can I reduce my burn rate?" or "Create a plan to extend runway by 6 months"
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const chatTab = document.querySelector<HTMLElement>('[value="chat"]')
                  if (chatTab) chatTab.click()
                }}
              >
                Go to Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => (
                <Card key={change.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {change.status === "pending" && (
                        <Checkbox
                          checked={selectedIds.has(change.id)}
                          onCheckedChange={() => handleSelectChange(change.id)}
                          aria-label={`Select change ${change.id}`}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{change.description}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{change.impactSummary}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(change.status)}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(change.confidenceScore * 100)}%
                                    </Badge>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Confidence Score: {Math.round(change.confidenceScore * 100)}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                setSelectedChangeForAudit(change)
                                setShowAuditabilityModal(true)
                              }}
                              title="View auditability (prompt & data sources)"
                              disabled={!change.promptId && (!change.dataSources || change.dataSources.length === 0)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Audit
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Old Value: </span>
                            <span className="font-mono">{JSON.stringify(change.oldValue)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">New Value: </span>
                            <span className="font-mono">{JSON.stringify(change.newValue)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatDate(change.createdAt)}</span>
                          {change.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(change.id)}
                              >
                                View Details
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalModal
        changeId={selectedChangeId}
        open={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false)
          setSelectedChangeId(null)
        }}
        onApprove={async (id) => {
          await approve(id)
          setShowApprovalModal(false)
          setSelectedChangeId(null)
        }}
        onReject={async (id) => {
          await reject(id)
          setShowApprovalModal(false)
          setSelectedChangeId(null)
        }}
      />

      <AuditabilityModal
        open={showAuditabilityModal}
        onClose={() => {
          setShowAuditabilityModal(false)
          setSelectedChangeForAudit(null)
        }}
        promptId={selectedChangeForAudit?.promptId}
        dataSources={selectedChangeForAudit?.dataSources || []}
        recommendation={
          selectedChangeForAudit
            ? {
                type: selectedChangeForAudit.type || "recommendation",
                action: selectedChangeForAudit.action || selectedChangeForAudit.description,
                explain: selectedChangeForAudit.reasoning || selectedChangeForAudit.impactSummary || selectedChangeForAudit.aiExplanation,
                confidence: selectedChangeForAudit.confidenceScore || 0.7,
              }
            : undefined
        }
      />

      <AlertDialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {selectedIds.size} changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve all selected changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkApprove}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedIds.size} changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject all selected changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkReject} className="bg-destructive">
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


