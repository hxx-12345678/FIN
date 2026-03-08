"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Download, Save, X, Plus, Loader2, FileDown, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { generateBudgetTemplate, downloadCSV } from "@/utils/csv-template-generator"
import { CSVImportWizard } from "./csv-import-wizard"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

interface BudgetEntry {
  category: string
  department?: string
  month: string
  amount: number
  currency: string
}

interface BudgetRecord {
  id: string
  category: string
  department?: string
  month: string
  amount: number
  currency: string
  source: string
  status?: string
  createdAt: string
  updatedAt: string
}

export function BudgetPlanner({ orgId, onSave }: { orgId: string; onSave?: () => void }) {
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [newBudget, setNewBudget] = useState<BudgetEntry>({
    category: "",
    department: "G&A",
    month: "",
    amount: 0,
    currency: "USD",
  })

  const departments = ["G&A", "Sales", "Marketing", "Engineering", "Product", "Operations"]

  // Generate months for the next 12 months
  const generateMonths = () => {
    const months: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push(month)
    }
    return months
  }

  const months = generateMonths()

  // Fetch existing budgets
  const fetchBudgets = async () => {
    if (!orgId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/budgets`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        setLoading(false)
        return
      }

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data?.budgets) {
          setBudgets(result.data.budgets)
        }
      } else if (response.status !== 404) {
        throw new Error("Failed to fetch budgets")
      }
    } catch (error) {
      console.error("Error fetching budgets:", error)
      toast.error("Failed to load budgets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [orgId])

  // Submit budgets for approval (Institutional Workflow)
  const handleSubmitForApproval = async (budgetsToSave: BudgetEntry[]) => {
    if (!orgId || budgetsToSave.length === 0) {
      toast.error("No budgets to submit")
      return
    }

    setSaving(true)
    try {
      // For enterprise users, we create an approval request instead of writing directly to the budget table
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/approvals`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          type: "budget_change",
          objectType: "budget",
          objectId: orgId, // Using orgId as a placeholder for the entire budget set
          payloadJson: { budgets: budgetsToSave },
          comment: `Submitted budget change for ${budgetsToSave.length} items including ${[...new Set(budgetsToSave.map(b => b.department || "General"))].join(", ")}`,
        }),
      })

      if (response.ok) {
        toast.success(`Successfully submitted ${budgetsToSave.length} budget(s) for approval`)
        if (onSave) onSave()
      } else {
        // Fallback to direct save if approvals aren't enabled for this org or endpoint fails
        const directResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/budgets`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ budgets: budgetsToSave }),
        })

        if (directResponse.ok) {
          toast.success(`Saved ${budgetsToSave.length} budget(s) directly`)
          await fetchBudgets()
        } else {
          throw new Error("Failed to submit budget")
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save budgets"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Add new budget entry
  const handleAddBudget = () => {
    if (!newBudget.category || !newBudget.month || newBudget.amount === 0) {
      toast.error("Please fill in all fields")
      return
    }

    const budgetsToSave = [newBudget]
    handleSubmitForApproval(budgetsToSave)
    setNewBudget({
      category: "",
      department: "G&A",
      month: "",
      amount: 0,
      currency: "USD",
    })
  }

  // Delete budget
  const handleDeleteBudget = async (budgetId: string) => {
    if (!orgId) return

    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/budgets/${budgetId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error("Failed to delete budget")
      }

      toast.success("Budget deleted successfully")
      await fetchBudgets()
      if (onSave) onSave()
    } catch (error) {
      toast.error("Failed to delete budget")
    }
  }

  // Handle CSV import completion
  const handleCSVImportComplete = async (importedBudgets: BudgetEntry[]) => {
    if (importedBudgets.length > 0) {
      await handleSubmitForApproval(importedBudgets)
      setShowCSVImport(false)
    }
  }

  // Download template
  const handleDownloadTemplate = () => {
    const csvContent = generateBudgetTemplate()
    downloadCSV(csvContent, "budget-template.csv")
    toast.success("Budget template downloaded!")
  }

  // Get budget for category and month
  const getBudget = (category: string, month: string): BudgetRecord | undefined => {
    return budgets.find(b => b.category === category && b.month === month)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget Planner</CardTitle>
              <CardDescription>
                Set monthly budgets by category to compare against actuals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCSVImport(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 overflow-x-auto overflow-y-visible">
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Marketing"
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newBudget.department}
                    onChange={(e) => setNewBudget({ ...newBudget, department: e.target.value })}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="month">Month (YYYY-MM)</Label>
                  <Input
                    id="month"
                    placeholder="2025-01"
                    value={newBudget.month}
                    onChange={(e) => setNewBudget({ ...newBudget, month: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newBudget.amount || ""}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddBudget} className="w-full" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Submit Change
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No budgets set. Add budgets manually or import from CSV.
                        </TableCell>
                      </TableRow>
                    ) : (
                      budgets.map((budget) => (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">{budget.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{budget.department || "General"}</Badge>
                          </TableCell>
                          <TableCell>{budget.month}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: budget.currency,
                            }).format(Number(budget.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={budget.status === 'pending' ? "secondary" : "default"}>
                              {budget.status || "Approved"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBudget(budget.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="space-y-4 overflow-x-auto overflow-y-visible">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Grid view coming soon. Use manual entry or CSV import for now.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* CSV Import Dialog */}
      <Dialog open={showCSVImport} onOpenChange={setShowCSVImport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Budgets from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with budget data. Format: Category, Month (YYYY-MM), Amount, Currency
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Need a template?</p>
                <p className="text-xs text-blue-700 mt-1">Download our budget CSV template</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>
          <BudgetCSVImporter orgId={orgId} onImportComplete={handleCSVImportComplete} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Budget CSV Importer Component
function BudgetCSVImporter({
  orgId,
  onImportComplete
}: {
  orgId: string
  onImportComplete: (budgets: BudgetEntry[]) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<BudgetEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    // Parse CSV
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

        // Validate headers
        const requiredHeaders = ['category', 'month', 'amount']
        const hasRequiredHeaders = requiredHeaders.every(h =>
          headers.some(header => header.toLowerCase() === h)
        )

        if (!hasRequiredHeaders) {
          throw new Error(`CSV must contain columns: ${requiredHeaders.join(', ')}`)
        }

        // Parse rows
        const budgets: BudgetEntry[] = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          if (values.length < 3) continue

          const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'category')
          const monthIdx = headers.findIndex(h => h.toLowerCase() === 'month')
          const amountIdx = headers.findIndex(h => h.toLowerCase() === 'amount')
          const currencyIdx = headers.findIndex(h => h.toLowerCase() === 'currency')

          const category = values[categoryIdx]?.trim()
          const month = values[monthIdx]?.trim()
          const amount = parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '') || '0')
          const currency = values[currencyIdx]?.trim() || 'USD'

          if (category && month && !isNaN(amount)) {
            // Validate month format
            if (!/^\d{4}-\d{2}$/.test(month)) {
              throw new Error(`Invalid month format in row ${i + 1}: ${month}. Must be YYYY-MM`)
            }

            budgets.push({
              category,
              month,
              amount,
              currency,
            })
          }
        }

        if (budgets.length === 0) {
          throw new Error("No valid budget entries found in CSV")
        }

        setPreview(budgets)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to parse CSV"
        setError(errorMessage)
        toast.error(errorMessage)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error("No budgets to import")
      return
    }

    setLoading(true)
    try {
      onImportComplete(preview)
    } catch (error) {
      toast.error("Failed to import budgets")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="csv-file">Select CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="mt-2"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {preview.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h4 className="font-medium">Preview ({preview.length} budgets)</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 10).map((budget, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{budget.category}</TableCell>
                    <TableCell>{budget.month}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: budget.currency,
                      }).format(budget.amount)}
                    </TableCell>
                    <TableCell>{budget.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {preview.length > 10 && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                ... and {preview.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setPreview([])}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={preview.length === 0 || loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import {preview.length} Budget(s)
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}

