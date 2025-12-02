"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, CheckCircle2, XCircle, AlertCircle, Merge, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface DuplicateGroup {
  id: string
  transactions: Array<{
    id: string
    amount: number
    date: string
    description: string
    source: string
  }>
  confidence: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function DuplicateDetectionPanel() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergeGroupId, setMergeGroupId] = useState<string | null>(null)
  const [showMergeDialog, setShowMergeDialog] = useState(false)

  useEffect(() => {
    fetchDuplicates()
  }, [])

  const fetchDuplicates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const orgId = localStorage.getItem("orgId") || ""
      const response = await fetch(`${API_BASE_URL}/transactions/duplicates?org_id=${orgId}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch duplicates")
      }

      const data = await response.json()
      setDuplicates(data.duplicates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load duplicates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async (transactionIds: string[]) => {
    setIsMerging(true)

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ transactionIds }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.message?.includes("different accounts")) {
          throw new Error("Cannot merge transactions from different accounts.")
        }
        throw new Error("Failed to merge duplicates")
      }

      await fetchDuplicates()
      toast.success("Duplicates merged successfully")
      setShowMergeDialog(false)
      setMergeGroupId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to merge duplicates")
    } finally {
      setIsMerging(false)
    }
  }

  const handleMarkNotDuplicate = async (transactionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/mark-not-duplicate`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to mark as not duplicate")
      }

      await fetchDuplicates()
      toast.success("Marked as not duplicate")
    } catch (err) {
      toast.error("Failed to mark as not duplicate")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Detection</CardTitle>
          <CardDescription>Identify and merge duplicate transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {duplicates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No duplicate transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.map((group) => (
                <Card key={group.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Duplicate Group</CardTitle>
                        <CardDescription>
                          {group.transactions.length} transactions • {Math.round(group.confidence * 100)}% confidence
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMergeGroupId(group.id)
                            setShowMergeDialog(true)
                          }}
                        >
                          <Merge className="mr-2 h-4 w-4" />
                          Merge
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.transactions.map((tx) => (
                        <div key={tx.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-medium">{tx.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(tx.date)} • {tx.source}
                            </div>
                            <div className="text-sm font-semibold mt-1">{formatCurrency(tx.amount)}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkNotDuplicate(tx.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Duplicates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge all transactions in this group into a single transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const group = duplicates.find((g) => g.id === mergeGroupId)
                if (group) {
                  handleMerge(group.transactions.map((tx) => tx.id))
                }
              }}
              disabled={isMerging}
            >
              {isMerging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Merge className="mr-2 h-4 w-4" />
                  Merge
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


