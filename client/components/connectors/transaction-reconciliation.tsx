"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, CheckCircle2, XCircle, AlertCircle, ArrowRight, SkipForward } from "lucide-react"
import { toast } from "sonner"

interface ImportedTransaction {
  id: string
  amount: number
  date: string
  description: string
  account: string
}

interface ExistingTransaction {
  id: string
  amount: number
  date: string
  description: string
  account: string
}

interface MatchCandidate {
  transactionId: string
  confidence: number
  reason: string
}

interface ReconciliationState {
  state: "loading" | "matching" | "review" | "complete" | "error"
  imported: ImportedTransaction[]
  existing: ExistingTransaction[]
  matches: Map<string, string>
  unmatched: string[]
  matchCandidates: Map<string, MatchCandidate[]>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function TransactionReconciliation({ importId }: { importId: string }) {
  const [reconciliation, setReconciliation] = useState<ReconciliationState>({
    state: "loading",
    imported: [],
    existing: [],
    matches: new Map(),
    unmatched: [],
    matchCandidates: new Map(),
  })
  const [selectedImported, setSelectedImported] = useState<string | null>(null)
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)

  const fetchReconciliation = useCallback(async () => {
    setReconciliation((prev) => ({ ...prev, state: "loading" }))

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/reconcile?import_id=${importId}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch reconciliation data")
      }

      const data = await response.json()
      setReconciliation({
        state: "review",
        imported: data.imported || [],
        existing: data.existing || [],
        matches: new Map(Object.entries(data.autoMatches || {})),
        unmatched: data.unmatched || [],
        matchCandidates: new Map(Object.entries(data.matchCandidates || {})),
      })
    } catch (err) {
      setReconciliation((prev) => ({
        ...prev,
        state: "error",
      }))
      toast.error("Failed to load reconciliation data")
    }
  }, [importId])

  useEffect(() => {
    fetchReconciliation()
  }, [fetchReconciliation])

  const handleMatch = async (importedId: string, existingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ importedId, existingId }),
      })

      if (!response.ok) {
        throw new Error("Failed to create match")
      }

      setReconciliation((prev) => {
        const newMatches = new Map(prev.matches)
        newMatches.set(importedId, existingId)
        return {
          ...prev,
          matches: newMatches,
          unmatched: prev.unmatched.filter((id) => id !== importedId),
        }
      })

      toast.success("Transaction matched successfully")
    } catch (err) {
      toast.error("Failed to match transaction")
    }
  }

  const handleBulkMatch = async (matches: Array<{ importedId: string; existingId: string }>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/bulk-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ matches }),
      })

      if (!response.ok) {
        throw new Error("Failed to bulk match")
      }

      await fetchReconciliation()
      toast.success(`${matches.length} transactions matched`)
    } catch (err) {
      toast.error("Failed to bulk match transactions")
    }
  }

  const handleComplete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/reconcile/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ importId }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete reconciliation")
      }

      setReconciliation((prev) => ({ ...prev, state: "complete" }))
      toast.success("Reconciliation completed")
    } catch (err) {
      toast.error("Failed to complete reconciliation")
    }
  }

  const handleSkipUnmatched = () => {
    setReconciliation((prev) => ({
      ...prev,
      unmatched: [],
    }))
    toast.success("Unmatched transactions skipped")
  }

  const getMatchConfidence = (importedId: string): MatchCandidate | null => {
    const candidates = reconciliation.matchCandidates.get(importedId)
    return candidates && candidates.length > 0 ? candidates[0] : null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  if (reconciliation.state === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (reconciliation.state === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load reconciliation data</AlertDescription>
      </Alert>
    )
  }

  if (reconciliation.state === "complete") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Reconciliation Complete</h3>
          <p className="text-muted-foreground">All transactions have been reconciled</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transaction Reconciliation</h1>
          <p className="text-muted-foreground">Match imported transactions with existing records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkipUnmatched}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip Unmatched
          </Button>
          <Button onClick={() => setShowCompleteDialog(true)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Reconcile All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Imported Transactions</CardTitle>
            <CardDescription>{reconciliation.imported.length} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {reconciliation.imported.map((tx) => {
                const matchCandidate = getMatchConfidence(tx.id)
                const isMatched = reconciliation.matches.has(tx.id)
                const isSelected = selectedImported === tx.id

                return (
                  <div
                    key={tx.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : isMatched ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedImported(tx.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(tx.date)}</div>
                        <div className="text-sm font-semibold mt-1">{formatCurrency(tx.amount)}</div>
                      </div>
                      {matchCandidate && !isMatched && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(matchCandidate.confidence * 100)}% match
                        </Badge>
                      )}
                      {isMatched && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          Matched
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Transactions</CardTitle>
            <CardDescription>{reconciliation.existing.length} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {reconciliation.existing.map((tx) => {
                const isSelected = selectedExisting === tx.id
                const isMatched = Array.from(reconciliation.matches.values()).includes(tx.id)

                return (
                  <div
                    key={tx.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : isMatched ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedExisting(tx.id)
                      if (selectedImported) {
                        handleMatch(selectedImported, tx.id)
                        setSelectedImported(null)
                        setSelectedExisting(null)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(tx.date)}</div>
                        <div className="text-sm font-semibold mt-1">{formatCurrency(tx.amount)}</div>
                      </div>
                      {isMatched && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          Matched
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {reconciliation.unmatched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Transactions</CardTitle>
            <CardDescription>{reconciliation.unmatched.length} transactions need manual review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reconciliation.unmatched.map((id) => {
                const tx = reconciliation.imported.find((t) => t.id === id)
                if (!tx) return null

                const candidates = reconciliation.matchCandidates.get(id) || []
                const hasLowConfidence = candidates.length > 0 && candidates[0].confidence < 0.7

                return (
                  <div key={id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(tx.date)}</div>
                        <div className="text-sm font-semibold">{formatCurrency(tx.amount)}</div>
                      </div>
                      {hasLowConfidence && (
                        <Alert variant="destructive" className="p-2">
                          <AlertDescription className="text-xs">
                            Match confidence too low. Please review.
                          </AlertDescription>
                        </Alert>
                      )}
                      {candidates.length > 1 && (
                        <Alert className="p-2">
                          <AlertDescription className="text-xs">
                            Multiple potential matches found. Please select manually.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Reconciliation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize all matched transactions. Unmatched transactions will be marked for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


