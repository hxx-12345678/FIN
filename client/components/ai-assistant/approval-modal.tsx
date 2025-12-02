"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, CheckCircle2, XCircle, AlertCircle, Info, ArrowRight } from "lucide-react"

interface StagedChange {
  id: string
  description: string
  impactSummary: string
  oldValue: any
  newValue: any
  confidenceScore: number
  createdAt: string
  status: "pending" | "approved" | "rejected"
  aiExplanation?: string
}

interface ApprovalModalProps {
  changeId: string | null
  open: boolean
  onClose: () => void
  onApprove: (changeId: string) => Promise<void>
  onReject: (changeId: string) => Promise<void>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function ApprovalModal({ changeId, open, onClose, onApprove, onReject }: ApprovalModalProps) {
  const [change, setChange] = useState<StagedChange | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && changeId) {
      fetchChange()
    }
  }, [open, changeId])

  const fetchChange = async () => {
    if (!changeId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/aicfo/staged-changes?status=all`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch change details")
      }

      const data = await response.json()
      const foundChange = (data.changes || []).find((c: StagedChange) => c.id === changeId)
      
      if (foundChange) {
        setChange(foundChange)
      } else {
        setError("Change not found")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load change details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!changeId) return

    setIsApproving(true)
    setError(null)

    try {
      await onApprove(changeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve change")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!changeId) return

    setIsRejecting(true)
    setError(null)

    try {
      await onReject(changeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject change")
    } finally {
      setIsRejecting(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Change</DialogTitle>
          <DialogDescription>Review AI recommendation before approving or rejecting</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : change ? (
          <div className="space-y-6">
            {change.status !== "pending" && (
              <Alert>
                <AlertDescription>This change has already been processed.</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Old Value</h3>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <pre className="text-sm overflow-auto">
                    {typeof change.oldValue === "string"
                      ? change.oldValue
                      : JSON.stringify(change.oldValue, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">New Value</h3>
                <div className="p-4 border rounded-lg bg-primary/5">
                  <pre className="text-sm overflow-auto">
                    {typeof change.newValue === "string"
                      ? change.newValue
                      : JSON.stringify(change.newValue, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Impact Summary</h3>
                <p className="text-sm text-muted-foreground">{change.impactSummary}</p>
              </div>

              {change.aiExplanation && (
                <div>
                  <h3 className="font-semibold mb-2">AI Explanation</h3>
                  <p className="text-sm text-muted-foreground">{change.aiExplanation}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Confidence Score:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline">
                        {Math.round(change.confidenceScore * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI confidence in this recommendation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {change.status === "pending" && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={isApproving || isRejecting}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isApproving || isRejecting}
                  className="text-destructive"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
                <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
                  {isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}


