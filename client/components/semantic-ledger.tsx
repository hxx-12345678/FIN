"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Database, 
  RefreshCcw, 
  ShieldCheck, 
  History, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { getUserOrgId } from "@/lib/user-data-check"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"

interface LedgerEntry {
  id: string
  transactionDate: string
  amount: number
  currency: string
  accountName: string
  category: string
  description: string
  sourceType: string
  isAdjustment: boolean
}

interface ImportBatch {
  id: string
  sourceType: string
  status: string
  createdAt: string
  statsJson: any
}

export function SemanticLedger() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrgId = async () => {
      const id = await getUserOrgId()
      setOrgId(id)
    }
    fetchOrgId()
  }, [])

  const fetchData = async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const [ledgerRes, batchRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orgs/${orgId}/semantic-layer/ledger`, {
          headers: getAuthHeaders()
        }),
        fetch(`${API_BASE_URL}/orgs/${orgId}/data/import-batches`, {
          headers: getAuthHeaders()
        })
      ])
      
      const ledgerData = await ledgerRes.json()
      const batchData = await batchRes.json()
      
      if (ledgerData.ok) setLedger(ledgerData.data)
      if (batchData.ok) setBatches(batchData.data.filter((b: any) => b.status === 'completed'))
    } catch (error) {
      console.error("Failed to fetch ledger data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  const handlePromote = async (batchId: string) => {
    try {
      setPromotingId(batchId)
      const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/semantic-layer/promote/${batchId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Successfully promoted ${data.data.count} transactions to the ledger`)
        fetchData()
      } else {
        toast.error(data.error?.message || "Failed to promote transactions")
      }
    } catch (error) {
      toast.error("An error occurred during promotion")
    } finally {
      setPromotingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Semantic Data Ledger</h1>
          <p className="text-muted-foreground">
            Trusted financial truth. Only validated and promoted data appears here.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Industrial</div>
            <p className="text-xs text-muted-foreground">Full Lineage Tracking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auditability</CardTitle>
            <History className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Immutable</div>
            <p className="text-xs text-muted-foreground">Versioned Ledger Entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Promotion Panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Unpromoted Data</CardTitle>
            <CardDescription>
              Raw batches waiting for promotion to the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No unpromoted batches found</p>
            ) : (
              batches.map(batch => (
                <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      {batch.sourceType.toUpperCase()} Batch
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString()} • {batch.statsJson?.rowsImported || 0} rows
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handlePromote(batch.id)}
                    disabled={!!promotingId}
                  >
                    {promotingId === batch.id ? (
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Clean Ledger</CardTitle>
              <CardDescription>The "Source of Truth" for your financial model.</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No transactions found in the ledger.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">
                          {new Date(entry.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {entry.category || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          {entry.description}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.amount > 0 ? 'text-emerald-500' : ''}`}>
                          {entry.amount > 0 ? '+' : ''}{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {entry.isAdjustment ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                              ADJUSTMENT
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                              VERIFIED
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

