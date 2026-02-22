"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Check, X, Clock, User, AlertCircle, ShieldCheck, FileText,
  RefreshCw, History, ChevronRight, Info, Filter, Search, Loader2,
  Ban, CheckCircle2, XCircle, BarChart3, Sparkles, ShieldAlert
} from "lucide-react"
import { toast } from "sonner"
import { getUserOrgId } from "@/lib/user-data-check"
import { API_BASE_URL, getAuthToken, getAuthHeaders } from "@/lib/api-config"

interface ApprovalRequest {
  id: string;
  orgId: string;
  requesterId: string;
  approverId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  type: string;
  objectType: string;
  objectId: string;
  payloadJson: any;
  comment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  approver?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export function ApprovalManagement() {
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([])
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState("")
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)

  useEffect(() => {
    const fetchOrgId = async () => {
      const id = await getUserOrgId()
      setOrgId(id)
    }
    fetchOrgId()
  }, [])

  const fetchPendingRequests = async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/approvals/pending`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.ok) {
        setPendingRequests(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRequests = async () => {
    if (!orgId) return
    try {
      setLoadingHistory(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/approvals`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.ok) {
        setAllRequests(data.data || [])
      }
    } catch (error) {
      // If history endpoint fails, just show pending as history too
      console.error("Failed to fetch approval history:", error)
      setAllRequests(pendingRequests)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchPendingRequests()
    }
  }, [orgId])

  useEffect(() => {
    if (orgId && activeTab === "history") {
      fetchAllRequests()
    }
  }, [orgId, activeTab])

  const fetchRequestDetails = async (requestId: string) => {
    try {
      setDetailLoading(true)
      const res = await fetch(`${API_BASE_URL}/approvals/${requestId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.ok && data.data) {
        setSelectedRequest(data.data)
      } else {
        toast.error(data.error?.message || "Failed to load approval request details")
      }
    } catch (e) {
      toast.error("Failed to load approval request details")
    } finally {
      setDetailLoading(false)
    }
  }

  const openDetails = async (request: ApprovalRequest) => {
    setShowDetailDialog(true)
    setSelectedRequest(request)
    await fetchRequestDetails(request.id)
  }

  const renderAICFOStagedChange = (payload: any) => {
    const changeId = payload?.changeId
    const changeIndex = payload?.changeIndex
    const planId = payload?.planId
    const oldValue = payload?.oldValue
    const newValue = payload?.newValue
    const promptId = payload?.promptId
    const dataSources = Array.isArray(payload?.dataSources) ? payload.dataSources : []

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Plan ID</p>
            <p className="font-mono text-xs break-all">{planId || "—"}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Change</p>
            <p className="text-sm font-medium">{typeof changeIndex === "number" ? `#${changeIndex + 1}` : "—"}</p>
            {changeId ? <p className="font-mono text-xs text-muted-foreground break-all">{changeId}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Old value</p>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-56 border max-w-full whitespace-pre-wrap break-words">
              {oldValue === undefined ? "—" : JSON.stringify(oldValue, null, 2)}
            </pre>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">New value</p>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-56 border max-w-full whitespace-pre-wrap break-words">
              {newValue === undefined ? "—" : JSON.stringify(newValue, null, 2)}
            </pre>
          </div>
        </div>

        {promptId ? (
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Prompt ID</p>
            <p className="font-mono text-xs break-all">{promptId}</p>
          </div>
        ) : null}

        <div className="rounded-md border p-3">
          <p className="text-sm font-medium mb-2">Evidence</p>
          {dataSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence attached.</p>
          ) : (
            <div className="space-y-2">
              {dataSources.slice(0, 10).map((s: any, idx: number) => (
                <div key={idx} className="rounded-md bg-muted/50 p-3 border">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs">{s?.type || "source"}</Badge>
                    <span className="font-mono text-xs text-muted-foreground truncate min-w-0">{s?.id || ""}</span>
                  </div>
                  {s?.snippet ? <p className="text-sm mt-2 whitespace-pre-wrap break-words">{s.snippet}</p> : null}
                </div>
              ))}
              {dataSources.length > 10 ? (
                <p className="text-xs text-muted-foreground">Showing first 10 sources.</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const res = await fetch(`${API_BASE_URL}/approvals/${requestId}/approve`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: 'Approved via Governance dashboard'
        })
      })
      const data = await res.json()
      if (data.ok) {
        toast.success("Request approved successfully")
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        setShowDetailDialog(false)
      } else {
        toast.error(data.error?.message || "Failed to approve request")
      }
    } catch (error) {
      toast.error("An error occurred while approving the request")
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (requestId: string) => {
    setRejectTargetId(requestId)
    setRejectComment("")
    setShowRejectDialog(true)
  }

  const handleReject = async () => {
    if (!rejectTargetId) return
    if (!rejectComment.trim()) {
      toast.error("A comment is required for rejection")
      return
    }

    try {
      setProcessingId(rejectTargetId)
      const res = await fetch(`${API_BASE_URL}/approvals/${rejectTargetId}/reject`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: rejectComment
        })
      })
      const data = await res.json()
      if (data.ok) {
        toast.success("Request rejected")
        setPendingRequests(prev => prev.filter(r => r.id !== rejectTargetId))
        setShowRejectDialog(false)
        setShowDetailDialog(false)
      } else {
        toast.error(data.error?.message || "Failed to reject request")
      }
    } catch (error) {
      toast.error("An error occurred while rejecting the request")
    } finally {
      setProcessingId(null)
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'model_update': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ledger_adjustment': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'budget_change': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'scenario_publish': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><Ban className="h-3 w-3" /> Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatPayload = (payload: any) => {
    if (!payload) return "No payload"
    if (typeof payload === 'string') return payload

    // Try to render a human-readable summary
    const entries = Object.entries(payload)
    if (entries.length === 0) return "Empty payload"

    return entries.slice(0, 5).map(([key, value]) => {
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value)
      return `${displayKey}: ${displayValue}`
    }).join('\n')
  }

  const filteredHistory = allRequests.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      r.type?.toLowerCase().includes(q) ||
      r.objectType?.toLowerCase().includes(q) ||
      r.requester?.name?.toLowerCase().includes(q) ||
      r.requester?.email?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Governance & Approvals
            </h1>
            <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200">
              <ShieldCheck className="h-3 w-3" />
              Multi-Level Review
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Review and approve changes to financial models, ledger adjustments, budget changes, and published scenarios.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchPendingRequests(); if (activeTab === 'history') fetchAllRequests() }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* How it works */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">How Governance & Approvals Works:</p>
              <div className="space-y-1 text-blue-800">
                <p><strong>🔒 When are approvals created?</strong> Approval requests are automatically created when sensitive financial changes need review — such as model updates, ledger adjustments, budget modifications, or scenario publishing.</p>
                <p><strong>✅ Pending Tab:</strong> Shows all changes waiting for your review. Approve or reject with comments to maintain a full audit trail.</p>
                <p><strong>📜 History Tab:</strong> Browse the complete audit log of all past decisions for compliance and accountability.</p>
                <p><strong>🔗 Integration:</strong> This works alongside the <strong>AI CFO → Staged Changes</strong> workflow. When AI recommendations are approved there, high-impact changes may route here for additional governance review.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Review</p>
                <p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved (All Time)</p>
                <p className="text-3xl font-bold text-green-600">{allRequests.filter(r => r.status === 'approved').length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected (All Time)</p>
                <p className="text-3xl font-bold text-red-600">{allRequests.filter(r => r.status === 'rejected').length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Pending Review
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Approval History
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">All Clear — No Pending Approvals</h3>
                <p className="text-sm text-center max-w-md mb-4">
                  There are no changes waiting for your review. Approval requests are created automatically when:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 text-left max-w-md mb-6">
                  <li>Financial model assumptions are updated</li>
                  <li>Ledger adjustments are proposed</li>
                  <li>Budget allocations are modified</li>
                  <li>Scenarios are published for stakeholders</li>
                  <li>High-impact AI recommendations are staged</li>
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("navigate-view", { detail: { view: "assistant" } }))}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Go to AI CFO
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("navigate-view", { detail: { view: "modeling" } }))}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Go to Modeling
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="bg-amber-50/50 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`capitalize ${getTypeBadgeColor(request.type)}`}>
                          {request.type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <CardTitle className="text-lg mt-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {request.requester?.name || request.requester?.email || 'Unknown user'} requested a change
                    </CardTitle>
                    <CardDescription>
                      Target: <span className="font-medium">{request.objectType}</span> ({request.objectId.substring(0, 8)}...)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {request.comment && (
                      <div className="bg-background border rounded-md p-3 mb-4">
                        <p className="text-sm font-medium mb-1">Requester Comment:</p>
                        <p className="text-sm text-muted-foreground italic">"{request.comment}"</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Proposed Changes:</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 border">
                        {formatPayload(request.payloadJson)}
                      </pre>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2 border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetails(request)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Full Details
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => openRejectDialog(request.id)}
                        disabled={!!processingId}
                      >
                        {processingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={!!processingId}
                      >
                        {processingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Approve & Apply
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by type, requester, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredHistory.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mb-3 opacity-20" />
                <h3 className="text-lg font-medium mb-1">No Approval History</h3>
                <p className="text-sm text-center max-w-md">
                  {searchQuery ? "No results match your search. Try a different query." : "Past approval decisions will appear here once changes are reviewed."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((request) => (
                <Card key={request.id} className={`hover:bg-muted/30 transition-colors cursor-pointer ${request.status === 'approved' ? 'border-l-4 border-l-green-400' :
                    request.status === 'rejected' ? 'border-l-4 border-l-red-400' :
                      request.status === 'pending' ? 'border-l-4 border-l-amber-400' :
                        'border-l-4 border-l-gray-300'
                  }`}
                  onClick={() => openDetails(request)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusBadge(request.status)}
                        <Badge variant="outline" className={`capitalize text-xs ${getTypeBadgeColor(request.type)}`}>
                          {request.type?.replace(/_/g, ' ') || 'unknown'}
                        </Badge>
                        <span className="text-sm truncate">
                          by {request.requester?.name || request.requester?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {request.objectType} • {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Approval Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Rejection Reason (Required)</Label>
              <Textarea
                id="reject-comment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Explain why this change is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectComment.trim() || !!processingId}>
              {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader>
            <div className="px-6 pt-6">
              <DialogTitle>Approval Request Details</DialogTitle>
              <DialogDescription>
                Review the change, verify evidence, then approve or reject with a comment.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="px-6 pb-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {detailLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-56 w-full" />
              </div>
            ) : selectedRequest ? (
              <div className="space-y-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(selectedRequest.status)}
                  <Badge variant="outline" className={`capitalize ${getTypeBadgeColor(selectedRequest.type)}`}>
                    {selectedRequest.type?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Requester</p>
                    <p className="font-medium break-words">{selectedRequest.requester?.name || selectedRequest.requester?.email}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-medium">{selectedRequest.objectType}</p>
                    <p className="font-mono text-xs text-muted-foreground break-all">{selectedRequest.objectId}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Reviewed</p>
                    <p className="font-medium">{selectedRequest.reviewedAt ? new Date(selectedRequest.reviewedAt).toLocaleString() : "—"}</p>
                    {selectedRequest.reviewedAt ? (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        By {selectedRequest.approver?.name || selectedRequest.approver?.email || "—"}
                      </p>
                    ) : null}
                  </div>
                </div>

                {selectedRequest.comment ? (
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Requester comment</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedRequest.comment}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Proposed change</p>
                  {selectedRequest.type === "ai_cfo_staged_change" ? (
                    renderAICFOStagedChange(selectedRequest.payloadJson)
                  ) : (
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-80 border max-w-full whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedRequest.payloadJson, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Raw payload</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 border max-w-full whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedRequest.payloadJson, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load request details.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t bg-background px-6 py-4 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedRequest?.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => { setShowDetailDialog(false); openRejectDialog(selectedRequest.id) }}
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={!!processingId}
                >
                  {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve & Apply
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
