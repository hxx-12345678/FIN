"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { VirtualizedTable } from "@/components/ui/virtualized-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Map,
  Save,
  Eye,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface MappingTemplate {
  id: string
  name: string
  description?: string
  mappings: any[]
  createdAt: string
}

interface ExcelSheet {
  name: string
  headers: string[]
  rows: any[]
  formulas: any[]
  total_rows: number
}

const targetFields = [
  { value: "date", label: "Date", required: true },
  { value: "amount", label: "Amount", required: true },
  { value: "description", label: "Description", required: false },
  { value: "category", label: "Category", required: false },
  { value: "source_id", label: "Transaction ID", required: false },
  { value: "currency", label: "Currency", required: false },
]

interface ExcelImportWizardProps {
  orgId?: string | null
  token?: string | null
  onImportComplete?: () => void
}

export function ExcelImportWizard({ orgId: propOrgId, token: propToken, onImportComplete }: ExcelImportWizardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "mapping" | "importing">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [uploadKey, setUploadKey] = useState<string>("")
  const [previewData, setPreviewData] = useState<{
    sheets: ExcelSheet[]
    formulas_detected: number
    volatile_formulas: number
    total_rows: number
    file_hash: string
  } | null>(null)
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({}) // target -> source
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [templateName, setTemplateName] = useState("")
  const [importedCount, setImportedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-map fields based on headers
  const autoMapFields = (headers: string[]) => {
    const mappings: Record<string, string> = {}
    const headerMap = headers.reduce((acc, h) => ({ ...acc, [h.toLowerCase()]: h }), {} as Record<string, string>)

    targetFields.forEach(field => {
      const lowerField = field.value.toLowerCase()
      const match = Object.keys(headerMap).find(h => h.includes(lowerField) || lowerField.includes(h))
      if (match) {
        mappings[field.value] = headerMap[match]
      }
    })
    setFieldMappings(mappings)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please upload an .xlsx file")
      return
    }

    setFile(file)
    setStep("analyzing")

    try {
      const token = propToken || localStorage.getItem("auth-token")
      const orgId = propOrgId || localStorage.getItem("orgId")

      if (!token || !orgId) {
        toast.error("Authentication error or Organization not selected")
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      // Upload file
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/import/xlsx`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Upload failed")
      }

      const result = await response.json()
      if (result.ok) {
        setUploadKey(result.data.uploadKey)
        pollPreviewJob(result.data.jobId, token)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload file")
      setStep("upload")
    }
  }

  const pollPreviewJob = async (jobId: string, token: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()

        if (result.ok) {
          const job = result.job
          if (job.status === "completed") {
            // Extract preview data from logs
            const logs = job.logs || []
            const previewLog = Array.isArray(logs)
              ? logs.find((l: any) => l.preview)?.preview
              : (logs as any).preview

            if (previewLog) {
              setPreviewData(previewLog)
              setStep("preview")
              // Auto-select first sheet with data
              const sheetIdx = previewLog.sheets.findIndex((s: ExcelSheet) => s.total_rows > 0)
              setSelectedSheetIndex(Math.max(0, sheetIdx))
              if (previewLog.sheets.length > 0) {
                autoMapFields(previewLog.sheets[Math.max(0, sheetIdx)].headers)
              }
            } else {
              toast.error("No preview data found")
              setStep("upload")
            }
          } else if (job.status === "failed") {
            toast.error("File analysis failed")
            setStep("upload")
          } else {
            setTimeout(poll, 1000)
          }
        }
      } catch (error) {
        console.error(error)
        toast.error("Error polling status")
      }
    }
    poll()
  }

  const handleStartImport = async () => {
    if (!previewData) return

    setStep("importing")
    const orgId = propOrgId || localStorage.getItem("orgId")
    const token = propToken || localStorage.getItem("auth-token")

    if (!orgId || !token) {
      toast.error("Authentication error")
      return
    }

    try {
      const mappingJson = {
        columnMappings: Object.entries(fieldMappings).reduce((acc, [target, source]) => ({
          ...acc,
          [target]: { csvColumn: source }
        }), {}),
        sheetName: previewData.sheets[selectedSheetIndex].name
      }

      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/import/xlsx/map`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uploadKey,
          mappingJson
        })
      })

      const result = await response.json()
      if (result.ok) {
        pollImportJob(result.data.jobId, token)
      } else {
        throw new Error(result.error?.message || "Import failed to start")
      }
    } catch (error) {
      toast.error("Import failed to start")
      setStep("mapping")
    }
  }

  const pollImportJob = async (jobId: string, token: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()

        if (result.ok) {
          const job = result.job
          if (job.status === "completed") {
            // Calculate imported count
            const logs = job.logs || []
            // Try to find transaction count in logs
            // Mocking simple completion for now based on job status
            setImportedCount(previewData?.total_rows || 0)
            toast.success("Import completed successfully!")

            if (onImportComplete) {
              onImportComplete()
            }

            setTimeout(() => {
              setIsOpen(false)
              resetWizard()
            }, 2000)
          } else if (job.status === "failed") {
            toast.error("Import failed")
            setStep("mapping")
          } else {
            setTimeout(poll, 1000)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }
    poll()
  }

  const resetWizard = () => {
    setStep("upload")
    setFile(null)
    setPreviewData(null)
    setFieldMappings({})
    setImportedCount(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excel Import Wizard</DialogTitle>
          <DialogDescription>Import data with formula preservation</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <Card>
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="excel-upload" className="cursor-pointer block">
                <span className="text-primary font-medium">Click to upload</span> .xlsx file
              </Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Analyzing Excel file structure and formulas...</p>
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4">
            {previewData.volatile_formulas > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Volatile Formulas Detected</h4>
                  <p className="text-sm text-yellow-800">
                    Found {previewData.volatile_formulas} volatile formulas (e.g., RAND, TODAY).
                    These values may change on every calculation.
                  </p>
                </div>
              </div>
            )}

            <Tabs value={selectedSheetIndex.toString()} onValueChange={(v) => {
              setSelectedSheetIndex(parseInt(v))
              autoMapFields(previewData.sheets[parseInt(v)].headers)
            }}>
              <TabsList>
                {previewData.sheets.map((sheet, idx) => (
                  <TabsTrigger key={idx} value={idx.toString()}>
                    {sheet.name} ({sheet.total_rows})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.sheets[selectedSheetIndex].headers.map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.sheets[selectedSheetIndex].rows.map((row: any, i) => (
                    <TableRow key={i}>
                      {previewData.sheets[selectedSheetIndex].headers.map((h, j) => (
                        <TableCell key={j}>
                          {row.data[h]?.value !== undefined ? row.data[h].value : row.data[h]}
                          {row.data[h]?.is_formula && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">f(x)</Badge>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep("mapping")}>Continue to Mapping</Button>
            </div>
          </div>
        )}

        {step === "mapping" && previewData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {targetFields.map(field => (
                <div key={field.value} className="space-y-2">
                  <Label>{field.label} {field.required && "*"}</Label>
                  <Select
                    value={fieldMappings[field.value] || ""}
                    onValueChange={(v) => setFieldMappings(prev => ({ ...prev, [field.value]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.sheets[selectedSheetIndex].headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("preview")}>Back</Button>
              <Button onClick={handleStartImport}>Start Import</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Importing data and preserving formula lineage...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

