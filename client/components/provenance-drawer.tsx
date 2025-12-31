"use client"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Database,
  Calculator,
  Brain,
  History,
  Download,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  User,
  Bot,
  Copy,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthToken, getAuthHeaders } from "@/lib/api-config"

interface ProvenanceData {
  cellId: string
  metricName: string
  value: string
  formula?: string
  sourceTransactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    category: string
  }>
  assumptionRefs: Array<{
    id: string
    name: string
    value: string
    lastModified: string
  }>
  generatedBy: "user" | "ai"
  confidenceScore: number
  aiExplanation?: string
  auditTrail: Array<{
    timestamp: string
    action: string
    user: string
    oldValue?: string
    newValue?: string
  }>
  integrationSources: Array<{
    name: string
    type: string
    lastSync: string
  }>
}

interface ProvenanceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelRunId?: string
  cellKey?: string
  provenanceData?: ProvenanceData | null
}

export function ProvenanceDrawer({ 
  open, 
  onOpenChange, 
  modelRunId,
  cellKey,
  provenanceData: initialProvenanceData 
}: ProvenanceDrawerProps) {
  const [provenanceData, setProvenanceData] = useState<ProvenanceData | null>(initialProvenanceData || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && modelRunId && cellKey && !initialProvenanceData) {
      fetchProvenance()
    } else if (open && initialProvenanceData) {
      setProvenanceData(initialProvenanceData)
    } else if (!open) {
      setProvenanceData(null)
    }
  }, [open, modelRunId, cellKey, initialProvenanceData])

  const fetchProvenance = async () => {
    if (!modelRunId || !cellKey) return

    setLoading(true)

    try {
      const token = getAuthToken()
      const response = await fetch(
        `${API_BASE_URL}/provenance?model_run_id=${modelRunId}&cell=${encodeURIComponent(cellKey)}&full=true`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch provenance: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.ok && data.entries) {
        const transformed = transformProvenanceResponse(data, cellKey)
        setProvenanceData(transformed)
      } else {
        throw new Error('Invalid provenance response format')
      }
    } catch (err: any) {
      console.error('Provenance fetch error:', err)
      toast.error("Failed to load provenance data", {
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const transformProvenanceResponse = (apiData: any, cellKey: string): ProvenanceData => {
    const transactions: any[] = []
    const assumptions: any[] = []
    const auditTrail: any[] = []
    const integrations: any[] = []

    let confidenceScore = 0.7
    let aiExplanation: string | undefined
    let generatedBy: "user" | "ai" = "user"

    // Calculate confidence from entries
    const confidenceScores: number[] = []
    
    apiData.entries.forEach((entry: any) => {
      if (entry.sourceType === 'txn' && entry.sampleTransactions) {
        entry.sampleTransactions.forEach((txn: any) => {
          transactions.push({
            id: txn.id,
            date: new Date(txn.date).toISOString().split('T')[0],
            description: txn.description || 'Transaction',
            amount: txn.amount,
            category: txn.category || 'Uncategorized',
          })
        })
      }

      if (entry.sourceType === 'assumption' && (entry.sourceRef || entry.assumptionRef)) {
        const ref = entry.assumptionRef || entry.sourceRef || {}
        assumptions.push({
          id: entry.id,
          name: ref.name || ref.assumption_id || 'Assumption',
          value: String(ref.value !== undefined ? ref.value : (ref.assumption_value !== undefined ? ref.assumption_value : 'N/A')),
          lastModified: new Date(entry.createdAt).toLocaleDateString(),
        })
      }

      if (entry.promptPreview) {
        generatedBy = "ai"
        aiExplanation = entry.promptPreview.responseText || undefined
      }

      // Collect confidence scores from entries
      if (entry.confidenceScore !== undefined && entry.confidenceScore !== null) {
        // Convert to 0-1 scale if needed (backend might send 0-100)
        const score = typeof entry.confidenceScore === 'number'
          ? (entry.confidenceScore > 1 ? entry.confidenceScore / 100 : entry.confidenceScore)
          : parseFloat(String(entry.confidenceScore)) || 0.7
        confidenceScores.push(score)
      }

      auditTrail.push({
        timestamp: new Date(entry.createdAt).toLocaleString(),
        action: `Provenance entry created (${entry.sourceType})`,
        user: 'System',
      })
    })

    // Calculate average confidence from all entries, or use default
    if (confidenceScores.length > 0) {
      confidenceScore = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    }

    const parts = cellKey.split(':')
    const metricName = parts.length > 1 ? `${parts[1]}${parts[2] ? ` - ${parts[2]}` : ''}` : cellKey

    // Try to extract value from entries if available
    let cellValue = 'N/A'
    if (apiData.entries && apiData.entries.length > 0) {
      // Try to get value from summary or sourceRef
      const firstEntry = apiData.entries[0]
      
      // Priority 1: Check summary.totalAmount (for transaction-based entries)
      if (firstEntry.summary && firstEntry.summary.totalAmount !== undefined) {
        cellValue = `$${Number(firstEntry.summary.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      } 
      // Priority 2: Check assumptionRef.value (for assumption-based entries)
      else if (firstEntry.assumptionRef && firstEntry.assumptionRef.value !== undefined) {
        const val = firstEntry.assumptionRef.value
        if (typeof val === 'number') {
          cellValue = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        } else {
          cellValue = String(val)
        }
      }
      // Priority 3: Check sourceRef.value
      else if (firstEntry.sourceRef && typeof firstEntry.sourceRef === 'object') {
        const ref = firstEntry.sourceRef
        if (ref.value !== undefined) {
          const val = ref.value
          if (typeof val === 'number') {
            cellValue = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          } else {
            cellValue = String(val)
          }
        } else if (ref.total_amount !== undefined) {
          cellValue = `$${Number(ref.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }

    return {
      cellId: cellKey,
      metricName,
      value: cellValue, 
      sourceTransactions: transactions,
      assumptionRefs: assumptions,
      generatedBy,
      confidenceScore: confidenceScore * 100,
      aiExplanation,
      auditTrail,
      integrationSources: integrations,
    }
  }

  const handleExportProvenance = () => {
    if (!provenanceData) return
    
    const exportData = {
      metric: provenanceData.metricName,
      value: provenanceData.value,
      timestamp: new Date().toISOString(),
      provenance: provenanceData,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `provenance-${provenanceData.cellId}.json`
    a.click()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-6 border-b bg-muted/5">
          <div className="flex items-center justify-between mr-8">
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                {provenanceData?.metricName || "Cell Provenance"}
                {provenanceData?.cellId && (
                  <Badge variant="outline" className="font-mono text-xs font-normal text-muted-foreground">
                    {provenanceData.cellId}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                Full audit trail and source attribution
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportProvenance} disabled={!provenanceData}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 pb-20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Tracing data lineage...</p>
              </div>
            ) : !provenanceData ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
                <Search className="h-12 w-12 opacity-20" />
                <p>Select a cell to view provenance data</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-muted/20">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Current Value</div>
                          <div className="text-4xl font-bold tracking-tight">{provenanceData.value}</div>
                        </div>
                        
                        {provenanceData.formula && (
                          <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md border">
                            <Calculator className="h-4 w-4 text-muted-foreground" />
                            <code className="font-mono text-primary">{provenanceData.formula}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => copyToClipboard(provenanceData.formula!)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between gap-4 text-right">
                        <div className="flex justify-end">
                           <Badge variant={provenanceData.generatedBy === "ai" ? "default" : "secondary"} className="px-3 py-1 text-sm">
                            {provenanceData.generatedBy === "ai" ? (
                              <span className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> AI Generated</span>
                            ) : (
                              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> User Input</span>
                            )}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-end gap-3 bg-background/50 p-2 rounded-lg border">
                          <span className="text-sm font-medium text-muted-foreground">Confidence</span>
                          <div className="flex items-center gap-1.5">
                            {provenanceData.confidenceScore >= 80 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : provenanceData.confidenceScore >= 60 ? (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-bold text-lg">{Math.round(provenanceData.confidenceScore)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Explanation */}
                {provenanceData.aiExplanation && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">AI Reasoning</h3>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed">{provenanceData.aiExplanation}</p>
                  </div>
                )}

                <Tabs defaultValue="sources" className="w-full">
                  <div className="overflow-x-auto mb-4">
                    <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
                      <TabsTrigger value="sources" className="text-xs sm:text-sm">Transactions</TabsTrigger>
                      <TabsTrigger value="assumptions" className="text-xs sm:text-sm">Assumptions</TabsTrigger>
                      <TabsTrigger value="audit" className="text-xs sm:text-sm">History</TabsTrigger>
                      <TabsTrigger value="integrations" className="text-xs sm:text-sm">Sources</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="sources" className="space-y-4 mt-0 overflow-x-auto overflow-y-visible">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Source Transactions ({provenanceData.sourceTransactions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="max-h-[400px] overflow-y-auto">
                          {provenanceData.sourceTransactions.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No transactions linked</div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr className="text-left text-muted-foreground">
                                  <th className="p-3 font-medium">Date</th>
                                  <th className="p-3 font-medium">Description</th>
                                  <th className="p-3 font-medium text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {provenanceData.sourceTransactions.map((txn) => (
                                  <tr key={txn.id} className="hover:bg-muted/50">
                                    <td className="p-3 whitespace-nowrap">{txn.date}</td>
                                    <td className="p-3">{txn.description}</td>
                                    <td className="p-3 text-right font-mono">${txn.amount.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="assumptions" className="space-y-4 mt-0">
                     <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Assumptions ({provenanceData.assumptionRefs.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-y-auto">
                          {provenanceData.assumptionRefs.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No assumptions linked</div>
                          ) : (
                            <div className="divide-y">
                              {provenanceData.assumptionRefs.map((assumption) => (
                                <div key={assumption.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                  <div>
                                    <div className="font-medium">{assumption.name}</div>
                                    <div className="text-xs text-muted-foreground">Modified: {assumption.lastModified}</div>
                                  </div>
                                  <Badge variant="outline" className="font-mono">{assumption.value}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="audit" className="mt-0">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Change Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y max-h-[400px] overflow-y-auto">
                           {provenanceData.auditTrail.map((entry, i) => (
                             <div key={i} className="p-4 flex gap-3 text-sm">
                               <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                               <div>
                                 <div className="font-medium">{entry.action}</div>
                                 <div className="text-muted-foreground text-xs">{entry.timestamp} • {entry.user}</div>
                                 {entry.oldValue && entry.newValue && (
                                    <div className="mt-2 flex items-center gap-2 text-xs bg-muted/30 p-2 rounded">
                                      <span className="line-through text-muted-foreground">{entry.oldValue}</span>
                                      <span>→</span>
                                      <span className="font-medium">{entry.newValue}</span>
                                    </div>
                                  )}
                               </div>
                             </div>
                           ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="integrations" className="mt-0">
                     <Card>
                      <CardHeader className="pb-3">
                         <CardTitle className="text-base font-medium flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          External Sources
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <p>No external integrations connected for this metric.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

