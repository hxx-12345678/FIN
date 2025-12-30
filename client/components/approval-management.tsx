"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X, Clock, User, AlertCircle, Eye } from "lucide-react"
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
}

export function ApprovalManagement() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrgId = async () => {
      const id = await getUserOrgId()
      setOrgId(id)
    }
    fetchOrgId()
  }, [])

  const fetchRequests = async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/approvals/pending`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.ok) {
        setRequests(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchRequests()
    }
  }, [orgId])

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(requestId)
      const res = await fetch(`${API_BASE_URL}/approvals/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: action === 'approve' ? 'Approved via dashboard' : 'Rejected via dashboard'
        })
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Request ${action}d successfully`)
        setRequests(requests.filter(r => r.id !== requestId))
      } else {
        toast.error(data.error?.message || `Failed to ${action} request`)
      }
    } catch (error) {
      toast.error(`An error occurred while ${action}ing the request`)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading pending approvals...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Governance & Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve sensitive changes to financial models and ledger adjustments.
        </p>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Check className="h-8 w-8 mb-2 opacity-20" />
              <p>No pending approval requests</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {request.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="secondary">PENDING</Badge>
                </div>
                <CardTitle className="text-lg mt-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {request.requester.name || request.requester.email} requested a change
                </CardTitle>
                <CardDescription>
                  Target: {request.objectType} ({request.objectId.substring(0, 8)}...)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="bg-background border rounded-md p-3 mb-4">
                  <p className="text-sm font-medium mb-1">Requester Comment:</p>
                  <p className="text-sm text-muted-foreground italic">"{request.comment || 'No comment provided'}"</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Proposed Payload:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(request.payloadJson, null, 2)}
                  </pre>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleAction(request.id, 'reject')}
                  disabled={!!processingId}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleAction(request.id, 'approve')}
                  disabled={!!processingId}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve & Apply
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

