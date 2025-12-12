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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Map,
  Save,
  Eye,
  Download,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  csvColumn: string
  targetField: string
  confidence?: number
}

interface MappingTemplate {
  id: string
  name: string
  description?: string
  mappings: FieldMapping[]
  createdAt: string
}

const targetFields = [
  { value: "date", label: "Date", required: true },
  { value: "amount", label: "Amount", required: true },
  { value: "description", label: "Description", required: false },
  { value: "category", label: "Category", required: false },
  { value: "account", label: "Account", required: false },
  { value: "reference", label: "Reference Number", required: false },
  { value: "type", label: "Transaction Type", required: false },
  { value: "currency", label: "Currency", required: false },
]

export function CSVImportWizard() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "mapping" | "review">("upload")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<CSVRow[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [skipFirstRow, setSkipFirstRow] = useState(true)
  const [importedRows, setImportedRows] = useState<number>(0)
  const [initialCash, setInitialCash] = useState<string>("0")
  const [initialCustomers, setInitialCustomers] = useState<string>("0")
  const [isImporting, setIsImporting] = useState(false)
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Effect to handle step transition when job is created
  useEffect(() => {
    if (pendingJobId) {
      console.log("🔄 Effect: Transitioning to review step for job:", pendingJobId)
      setStep("review")
      setCurrentJobId(pendingJobId)
      // Keep pendingJobId for a bit to ensure step 4 stays visible
      const timer = setTimeout(() => {
        setPendingJobId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [pendingJobId])

  // Auto-detect field mappings based on column names
  const autoMapFields = (headers: string[]): FieldMapping[] => {
    const mappings: FieldMapping[] = []
    const headerLower = headers.map((h) => h.toLowerCase().trim())

    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim()
      let mappedField: string | null = null
      let confidence = 0

      // Date detection
      if (
        headerLower.includes("date") ||
        headerLower.includes("transaction date") ||
        headerLower.includes("posted date")
      ) {
        mappedField = "date"
        confidence = 95
      }
      // Amount detection
      else if (
        headerLower.includes("amount") ||
        headerLower.includes("value") ||
        headerLower.includes("total") ||
        headerLower.includes("debit") ||
        headerLower.includes("credit")
      ) {
        mappedField = "amount"
        confidence = 90
      }
      // Description detection
      else if (
        headerLower.includes("description") ||
        headerLower.includes("memo") ||
        headerLower.includes("notes") ||
        headerLower.includes("details")
      ) {
        mappedField = "description"
        confidence = 85
      }
      // Category detection
      else if (
        headerLower.includes("category") ||
        headerLower.includes("type") ||
        headerLower.includes("class")
      ) {
        mappedField = "category"
        confidence = 80
      }
      // Account detection
      else if (
        headerLower.includes("account") ||
        headerLower.includes("account name") ||
        headerLower.includes("account number")
      ) {
        mappedField = "account"
        confidence = 75
      }
      // Reference detection
      else if (
        headerLower.includes("reference") ||
        headerLower.includes("ref") ||
        headerLower.includes("transaction id") ||
        headerLower.includes("check number")
      ) {
        mappedField = "reference"
        confidence = 70
      }
      // Currency detection
      else if (headerLower.includes("currency") || headerLower.includes("curr")) {
        mappedField = "currency"
        confidence = 90
      }

      if (mappedField) {
        mappings.push({
          csvColumn: header,
          targetField: mappedField,
          confidence,
        })
      }
    })

    return mappings
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file")
      return
    }

    setCsvFile(file)
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length === 0) {
        toast.error("CSV file is empty")
        return
      }

      // Parse CSV (simple parser - handles quoted fields)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            result.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      setCsvHeaders(headers)

      const data: CSVRow[] = []
      const startIndex = skipFirstRow ? 1 : 0

      // Read all rows for import, but only show first 10 for preview
      for (let i = startIndex; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row)
      }

      setCsvData(data)
      setPreviewRows(data.slice(0, 10)) // Show first 10 rows for preview

      // Auto-map fields
      const autoMappings = autoMapFields(headers)
      setFieldMappings(autoMappings)

      setStep("preview")
      toast.success(`CSV file loaded: ${data.length} rows detected`)
    }

    reader.readAsText(file)
  }

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    // Handle "none" selection
    if (csvColumn === "__none__") {
      // Remove the mapping for this target field
      setFieldMappings((prev) => prev.filter((m) => m.targetField !== targetField))
      return
    }
    
    setFieldMappings((prev) => {
      const existing = prev.find((m) => m.targetField === targetField)
      if (existing) {
        // Update existing mapping
        return prev.map((m) => (m.targetField === targetField ? { ...m, csvColumn } : m))
      } else {
        // Add new mapping
        return [...prev, { csvColumn, targetField }]
      }
    })
  }

  // Helper to get current mapped value for a field
  const getMappedColumn = (targetField: string) => {
    const mapping = fieldMappings.find(m => m.targetField === targetField)
    return mapping ? mapping.csvColumn : "__none__"
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name")
      return
    }

    const template: MappingTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      mappings: fieldMappings,
      createdAt: new Date().toISOString(),
    }

    setSavedTemplates([...savedTemplates, template])
    setTemplateName("")
    setTemplateDescription("")
    toast.success("Mapping template saved successfully")
  }

  const handleLoadTemplate = (templateId: string) => {
    const template = savedTemplates.find((t) => t.id === templateId)
    if (template) {
      setFieldMappings(template.mappings)
      setSelectedTemplate(templateId)
      toast.success(`Template "${template.name}" loaded`)
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
    setSavedTemplates(savedTemplates.filter((t) => t.id !== templateId))
    if (selectedTemplate === templateId) {
      setSelectedTemplate("")
    }
    toast.success("Template deleted")
  }

  const validateMappings = (): boolean => {
    const requiredFields = targetFields.filter((f) => f.required).map((f) => f.value)
    const mappedFields = fieldMappings.map((m) => m.targetField)
    const missingRequired = requiredFields.filter((rf) => !mappedFields.includes(rf))

    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.join(", ")}`)
      return false
    }

    return true
  }

  const handleImport = async () => {
    console.log("🚀 handleImport called - START OF FUNCTION")
    console.log("📊 Current state:", {
      hasCsvFile: !!csvFile,
      csvFileName: csvFile?.name,
      fieldMappingsCount: fieldMappings.length,
      csvDataRows: csvData.length
    })
    
    if (!validateMappings()) {
      console.error("❌ Validation failed")
      toast.error("Please complete all required field mappings")
      return
    }
    console.log("✅ Validation passed")
    
    if (!csvFile) {
      console.error("❌ No CSV file selected")
      toast.error("Please select a CSV file")
      return
    }
    console.log("✅ CSV file present:", csvFile.name)

    // Set loading state immediately
    console.log("🔄 Setting isImporting to true")
    setIsImporting(true)
    setImportedRows(0)
    console.log("📤 Starting import process...")

    try {
      // Get orgId and token
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        console.error("❌ No auth token found")
        toast.error("Authentication token not found. Please log in again.")
        setIsImporting(false)
        return
      }
      
      console.log("✅ Auth token found")

      // Get orgId
      let orgId = localStorage.getItem("orgId")
      if (!orgId) {
        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (meResponse.ok) {
          const userData = await meResponse.json()
          if (userData.orgs && userData.orgs.length > 0) {
            orgId = userData.orgs[0].id
            if (orgId) {
              localStorage.setItem("orgId", orgId)
            }
          }
        }
      }

      if (!orgId) {
        console.error("❌ No orgId found")
        toast.error("Organization ID not found. Please log in again.")
        setIsImporting(false)
        return
      }
      
      console.log("✅ OrgId found:", orgId)

      // Step 1: Upload CSV file
      toast.info("Uploading CSV file...")
      const formData = new FormData()
      formData.append("file", csvFile)

      console.log("📤 Sending upload request to:", `${API_BASE_URL}/orgs/${orgId}/import/csv/upload`)
      console.log("📤 Upload file size:", formData.get('file') instanceof File ? (formData.get('file') as File).size : 'unknown')
      
      const uploadResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/import/csv/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: formData,
      })

      console.log("📥 Upload response received:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        ok: uploadResponse.ok
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error("❌ Upload failed - Response:", errorText)
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {}
        const errorMsg = errorData.error?.message || errorData.message || errorText || "Failed to upload CSV file"
        toast.error(`Upload failed: ${errorMsg}`)
        console.error("❌ Upload failed details:", {
          status: uploadResponse.status,
          errorData,
          errorText
        })
        setIsImporting(false)
        setCurrentJobId(null)
        setPendingJobId(null)
        return
      }

      console.log("📥 Parsing upload response...")
      const uploadResult = await uploadResponse.json()
      console.log("📥 Upload result parsed:", uploadResult)
      
      if (!uploadResult.ok || !uploadResult.data?.uploadKey) {
        toast.error("Invalid upload response - missing uploadKey")
        console.error("❌ Invalid upload result:", {
          hasOk: !!uploadResult.ok,
          hasData: !!uploadResult.data,
          hasUploadKey: !!uploadResult.data?.uploadKey,
          fullResult: uploadResult
        })
        setIsImporting(false)
        setCurrentJobId(null)
        setPendingJobId(null)
        return
      }

      const uploadKey = uploadResult.data.uploadKey
      console.log("✅ CSV uploaded successfully! uploadKey:", uploadKey)
      toast.success("CSV file uploaded successfully")

      // Step 2: Map CSV columns and create import job
      console.log("📋 Step 2: Preparing mappings...")
      toast.info("Mapping CSV columns and creating import job...")
      
      const mappings: Record<string, string> = {}
      fieldMappings.forEach((mapping) => {
        // Only include mappings that have a valid CSV column (not "__none__")
        if (mapping.csvColumn && mapping.csvColumn !== "__none__") {
          mappings[mapping.targetField] = mapping.csvColumn
        }
      })
      
      console.log("📋 Mappings prepared:", mappings)
      console.log("📋 Mappings count:", Object.keys(mappings).length)
      
      // Validate that we have at least the required mappings
      const requiredFields = targetFields.filter((f) => f.required).map((f) => f.value)
      const missingRequired = requiredFields.filter((rf) => !mappings[rf])
      if (missingRequired.length > 0) {
        toast.error(`Missing required field mappings: ${missingRequired.join(", ")}`)
        console.error("❌ Missing required mappings:", missingRequired)
        setIsImporting(false)
        setCurrentJobId(null)
        setPendingJobId(null)
        return
      }

      console.log("✅ All required mappings present")
      console.log("📤 Sending map request to:", `${API_BASE_URL}/orgs/${orgId}/import/csv/map`)
      console.log("📤 Request body:", {
        uploadKey,
        mappings,
        dateFormat: "YYYY-MM-DD",
        currency: "USD",
        defaultCategory: "Uncategorized",
        initialCash: initialCash ? (parseFloat(String(initialCash).replace(/[^0-9.-]/g, '')) || 0) : 0,
        initialCustomers: initialCustomers ? (parseInt(String(initialCustomers).replace(/[^0-9]/g, ''), 10) || 0) : 0,
      })

      const mapResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/import/csv/map`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          uploadKey,
          mappings,
          dateFormat: "YYYY-MM-DD",
          currency: "USD",
          defaultCategory: "Uncategorized",
          initialCash: initialCash ? (parseFloat(String(initialCash).replace(/[^0-9.-]/g, '')) || 0) : 0,
          initialCustomers: initialCustomers ? (parseInt(String(initialCustomers).replace(/[^0-9]/g, ''), 10) || 0) : 0,
        }),
      })

      console.log("📥 Map response status:", mapResponse.status, mapResponse.statusText)
      
      if (!mapResponse.ok) {
        const errorData = await mapResponse.json().catch(() => ({}))
        const errorMsg = errorData.error?.message || errorData.message || "Failed to map CSV columns"
        toast.error(errorMsg)
        console.error("❌ Map failed:", {
          status: mapResponse.status,
          statusText: mapResponse.statusText,
          errorData,
          headers: Object.fromEntries(mapResponse.headers.entries())
        })
        setIsImporting(false)
        setCurrentJobId(null)
        setPendingJobId(null)
        return
      }

      const mapResult = await mapResponse.json()
      console.log("📥 Map response received:", mapResult)
      console.log("📥 Map result structure:", {
        ok: mapResult.ok,
        hasData: !!mapResult.data,
        hasJobId: !!mapResult.data?.jobId,
        jobId: mapResult.data?.jobId
      })
      
      if (!mapResult.ok || !mapResult.data?.jobId) {
        toast.error("Invalid map response - job ID not found")
        console.error("❌ Invalid map result:", mapResult)
        setIsImporting(false)
        return
      }

      const jobId = mapResult.data.jobId
      console.log("✅ Import job created successfully! Job ID:", jobId)
      
      if (!jobId) {
        console.error("❌ Job ID is missing from response")
        toast.error("Failed to create import job. Please try again.")
        setIsImporting(false)
        return
      }
      
      toast.success("CSV columns mapped. Processing import...")
      
      // CRITICAL: Store job ID and transition to step 4 IMMEDIATELY
      console.log("🔄 Transitioning to step 4 (review) for job:", jobId)
      setCurrentJobId(jobId)
      setPendingJobId(jobId) // This triggers useEffect to set step to "review"
      setStep("review") // Direct state update for immediate transition
      setIsImporting(false) // Job is created, polling will handle progress
      
      console.log("✅ Step transition initiated - step should be 'review' now")

      // Step 4: Poll for job completion - START IMMEDIATELY
      const totalRows = csvData.length
      let attempts = 0
      const maxAttempts = 300 // 10 minutes max (increased for large files)
      
      console.log("🚀 Starting polling for job:", jobId, "Total rows:", totalRows)
      console.log("📊 Polling will check every 2 seconds, max attempts:", maxAttempts)

      const pollJob = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          toast.warning("Import is taking longer than expected. It will continue processing in the background.")
          setImportedRows(totalRows)
          setTimeout(() => {
            setIsOpen(false)
            resetWizard()
          }, 2000)
          return
        }

        try {
          attempts++
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts} for job ${jobId}`)
          
          const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (jobResponse.ok) {
            const jobResult = await jobResponse.json()
            console.log(`📊 Job status response (attempt ${attempts}):`, {
              status: jobResult.job?.status || jobResult.status,
              progress: jobResult.job?.progress || jobResult.progress,
              hasLogs: !!jobResult.job?.logs || !!jobResult.logs
            })
            
            // Handle different response formats - be more lenient
            let job = null
            if (jobResult.job) {
              job = jobResult.job
            } else if (jobResult.status) {
              job = jobResult
            } else if (jobResult.ok === false) {
              console.warn("⚠️ Job response indicates failure:", jobResult)
              throw new Error(jobResult.error?.message || "Failed to get job status")
            } else {
              // Try to use the response as job data
              job = jobResult
            }
            
            if (!job) {
              console.error("❌ Could not extract job data from response")
              throw new Error("Invalid job response format")
            }
            const jobStatus = job.status || job.jobStatus
            const progress = job.progress || 0
            
            // Parse logs - can be array or object
            let logs: any = job.logs || {}
            let importedCount = 0
            let rowsImported = 0
            let rowsSkipped = 0
            
            if (Array.isArray(logs)) {
              // Extract data from log entries - check most recent entries first
              for (let i = logs.length - 1; i >= 0; i--) {
                const entry = logs[i]
                if (entry && typeof entry === 'object') {
                  // Check if this entry has rows_imported in meta or directly
                  if (entry.meta && entry.meta.rows_imported !== undefined) {
                    rowsImported = entry.meta.rows_imported || 0
                    rowsSkipped = entry.meta.rows_skipped || 0
                    break
                  } else if (entry.rows_imported !== undefined) {
                    rowsImported = entry.rows_imported || 0
                    rowsSkipped = entry.rows_skipped || 0
                    break
                  }
                }
              }
            } else if (typeof logs === 'object' && logs !== null) {
              // Logs is an object
              rowsImported = logs.rows_imported || logs.rowsImported || 0
              rowsSkipped = logs.rows_skipped || logs.rowsSkipped || 0
            }
            
            // Calculate imported count from logs first, then fallback to progress
            importedCount = rowsImported > 0 ? rowsImported : Math.max(0, Math.floor((progress / 100) * totalRows))
            setImportedRows(importedCount)

            console.log(`Job ${jobId} status: ${jobStatus}, progress: ${progress}%, imported: ${rowsImported}, skipped: ${rowsSkipped}, totalRows: ${totalRows}`)

              if (jobStatus === "done" || jobStatus === "completed" || jobStatus === "finished") {
                // Get final count from logs if available
                const finalImported = rowsImported > 0 ? rowsImported : (progress >= 100 ? totalRows : importedCount)
                setImportedRows(finalImported)
                const message = rowsSkipped > 0 
                  ? `Successfully imported ${finalImported} transactions! (${rowsSkipped} skipped)`
                  : `Successfully imported ${finalImported} transactions!`
                toast.success(message)
                
                // Trigger data refresh in other components
                window.dispatchEvent(new CustomEvent('csv-import-completed', { 
                  detail: { rowsImported: finalImported, orgId } 
                }))
                
                // Close dialog after a short delay
                setTimeout(() => {
                  setIsOpen(false)
                  resetWizard()
                }, 2000)
                return
            } else if (jobStatus === "failed" || jobStatus === "dead_letter" || jobStatus === "error") {
              const errorMsg = job.lastError || job.last_error || "Import failed"
              throw new Error(errorMsg)
            } else if (jobStatus === "running" || jobStatus === "queued" || jobStatus === "processing") {
              // Job is running, continue polling
              console.log(`Job ${jobId} is ${jobStatus}, progress: ${progress}%, imported: ${rowsImported}/${totalRows}`)
              // Update UI with current progress even if not complete
              if (importedCount > 0) {
                setImportedRows(importedCount)
              }
            }
          } else {
            const errorData = await jobResponse.json().catch(() => ({}))
            throw new Error(errorData.error?.message || `Failed to get job status: ${jobResponse.statusText}`)
          }

          // Continue polling
          setTimeout(() => {
            pollJob()
          }, 2000) // Poll every 2 seconds
        } catch (error) {
          console.error(`❌ Error polling job status (attempt ${attempts}):`, error)
          if (attempts < maxAttempts) {
            console.log(`⏳ Retrying in 2 seconds... (${attempts}/${maxAttempts})`)
            setTimeout(() => {
              pollJob()
            }, 2000)
          } else {
            console.error("❌ Max polling attempts reached")
            toast.error("Error checking import status. Please check the Jobs page.")
            setIsImporting(false)
          }
        }
      }

      // Start polling for job status IMMEDIATELY
      console.log("🎯 Starting polling immediately for job:", jobId)
      // Use setTimeout(0) to ensure this runs after state updates
      setTimeout(() => {
        pollJob()
      }, 100) // Small delay to ensure step 4 is rendered
      console.log("✅ Polling scheduled")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import CSV"
      console.error("❌ CSV import error (CATCH BLOCK):", error)
      console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack")
      console.error("❌ Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      toast.error(`Import failed: ${errorMessage}`)
      setIsImporting(false)
      setCurrentJobId(null)
      setPendingJobId(null)
      // Reset to mapping step on error so user can try again
      setStep("mapping")
    } finally {
      // Ensure loading state is cleared
      console.log("🔚 Finally block - ensuring state is clean")
    }
  }

  const resetWizard = () => {
    setStep("upload")
    setCsvFile(null)
    setCsvData([])
    setCsvHeaders([])
    setPreviewRows([])
    setFieldMappings([])
    setTemplateName("")
    setTemplateDescription("")
    setSelectedTemplate("")
    setImportedRows(0)
    setInitialCash("0")
    setInitialCustomers("0")
    setIsImporting(false)
    setPendingJobId(null)
    setCurrentJobId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getUnmappedColumns = () => {
    return csvHeaders.filter((header) => !fieldMappings.some((m) => m.csvColumn === header))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Import Wizard</DialogTitle>
          <DialogDescription>
            Import financial data from CSV files with automatic field mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {["upload", "preview", "mapping", "review"].map((s, index) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : ["upload", "preview", "mapping", "review"].indexOf(step) > index
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-muted text-muted-foreground border-muted"
                  }`}
                >
                  {["upload", "preview", "mapping", "review"].indexOf(step) > index ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 h-0.5 mx-2 bg-muted">
                  {index < 3 && (
                    <div
                      className={`h-full ${
                        ["upload", "preview", "mapping", "review"].indexOf(step) > index
                          ? "bg-green-500"
                          : ""
                      }`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>Select a CSV file to import financial data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-primary font-medium">Click to upload</span> or drag and drop
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-2">CSV files only (max 10MB)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-header"
                    checked={skipFirstRow}
                    onCheckedChange={(checked) => setSkipFirstRow(checked as boolean)}
                  />
                  <Label htmlFor="skip-header" className="cursor-pointer">
                    First row contains headers
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Data</CardTitle>
                <CardDescription>Review the first 10 rows of your CSV file</CardDescription>
              </CardHeader>
              <CardContent>
                {csvData.length > 100 ? (
                  <VirtualizedTable
                    data={csvData.map((row, index) => ({ ...row, id: `row-${index}` }))}
                    columns={csvHeaders.map((header) => ({
                      key: header,
                      header,
                      render: (row: CSVRow) => (
                        <span className="max-w-[200px] truncate block">{row[header] || "-"}</span>
                      ),
                    }))}
                    containerHeight={400}
                    rowHeight={48}
                  />
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvHeaders.map((header) => (
                            <TableHead key={header} className="min-w-[120px]">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, index) => (
                          <TableRow key={index}>
                            {csvHeaders.map((header) => (
                              <TableCell key={header} className="max-w-[200px] truncate">
                                {row[header] || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {previewRows.length} of {csvData.length} rows
                  </p>
                  <Button onClick={() => setStep("mapping")}>Continue to Mapping</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Mapping */}
          {step === "mapping" && (
            <Tabs defaultValue="mapping" className="w-full">
              <TabsList>
                <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                <TabsTrigger value="templates">Saved Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="mapping" className="space-y-4 overflow-x-auto overflow-y-visible">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Map className="h-5 w-5" />
                          Map CSV Columns to Fields
                        </CardTitle>
                        <CardDescription>
                          {fieldMappings.length > 0 && (
                            <span className="flex items-center gap-2 mt-2">
                              <Sparkles className="h-4 w-4 text-green-500" />
                              Auto-mapped {fieldMappings.length} fields
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const autoMappings = autoMapFields(csvHeaders)
                          setFieldMappings(autoMappings)
                          toast.success("Fields re-mapped automatically")
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Re-auto Map
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Required Fields */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Required Fields</h4>
                      {targetFields
                        .filter((f) => f.required)
                        .map((field) => {
                          const mapping = fieldMappings.find((m) => m.targetField === field.value)
                          return (
                            <div key={field.value} className="flex items-center gap-4 p-3 border rounded-lg">
                              <div className="flex-1">
                                <Label className="font-medium">{field.label}</Label>
                                {mapping && (
                                  <Badge variant="secondary" className="ml-2">
                                    {mapping.confidence}% confidence
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={getMappedColumn(field.value)}
                                onValueChange={(value) => handleMappingChange(value, field.value)}
                              >
                                <SelectTrigger className="w-[250px]">
                                  <SelectValue placeholder="Select CSV column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {csvHeaders.map((header) => (
                                    <SelectItem key={header} value={header}>
                                      {header}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {mapping && (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          )
                        })}

                      {/* Optional Fields */}
                      <div className="mt-6">
                        <h4 className="font-medium text-sm mb-3">Optional Fields</h4>
                        {targetFields
                          .filter((f) => !f.required)
                          .map((field) => {
                            const mapping = fieldMappings.find((m) => m.targetField === field.value)
                            return (
                              <div
                                key={field.value}
                                className="flex items-center gap-4 p-3 border rounded-lg mb-2"
                              >
                                <div className="flex-1">
                                  <Label className="font-medium">{field.label}</Label>
                                  {mapping && (
                                    <Badge variant="secondary" className="ml-2">
                                      {mapping.confidence}% confidence
                                    </Badge>
                                  )}
                                </div>
                              <Select
                                value={getMappedColumn(field.value)}
                                onValueChange={(value) => handleMappingChange(value, field.value)}
                              >
                                <SelectTrigger className="w-[250px]">
                                  <SelectValue placeholder="Select CSV column (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {csvHeaders.map((header) => (
                                    <SelectItem key={header} value={header}>
                                      {header}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                                {mapping && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                            )
                          })}
                      </div>

                      {/* Unmapped Columns Warning */}
                      {getUnmappedColumns().length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                Unmapped columns: {getUnmappedColumns().join(", ")}
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                These columns will be ignored during import
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Initial Values */}
                      <div className="mt-6 p-4 border rounded-lg space-y-3 bg-muted/20">
                        <h4 className="font-medium text-sm">Additional Model Parameters (Optional)</h4>
                        <p className="text-xs text-muted-foreground">
                          These values are optional and help improve model accuracy. Leave as 0 if unknown.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="initial-cash">Initial Cash on Hand</Label>
                            <Input
                              id="initial-cash"
                              type="number"
                              min="0"
                              step="0.01"
                              value={initialCash}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.-]/g, '')
                                setInitialCash(val || "0")
                              }}
                              placeholder="e.g. 100000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="initial-customers">Active Customers Count</Label>
                            <Input
                              id="initial-customers"
                              type="number"
                              min="0"
                              step="1"
                              value={initialCustomers}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '')
                                setInitialCustomers(val || "0")
                              }}
                              placeholder="e.g. 100"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Template */}
                      <div className="mt-6 p-4 border rounded-lg space-y-3">
                        <h4 className="font-medium text-sm">Save Mapping Template</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                              id="template-name"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              placeholder="e.g., QuickBooks Export"
                            />
                          </div>
                          <div>
                            <Label htmlFor="template-desc">Description (optional)</Label>
                            <Input
                              id="template-desc"
                              value={templateDescription}
                              onChange={(e) => setTemplateDescription(e.target.value)}
                              placeholder="Brief description"
                            />
                          </div>
                        </div>
                        <Button onClick={handleSaveTemplate} variant="outline" size="sm">
                          <Save className="mr-2 h-4 w-4" />
                          Save Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep("preview")} disabled={isImporting}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={!validateMappings() || isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Continue to Import"
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-4 overflow-x-auto overflow-y-visible">
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Mapping Templates</CardTitle>
                    <CardDescription>Load a previously saved mapping configuration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {savedTemplates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No saved templates yet</p>
                        <p className="text-sm">Save a mapping configuration to reuse it later</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{template.name}</h4>
                                {selectedTemplate === template.id && (
                                  <Badge variant="default">Active</Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.mappings.length} mappings • Saved{" "}
                                {new Date(template.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadTemplate(template.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Load
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Step 4: Review & Import - Show if step is review OR if we have a job ID */}
          {(step === "review" || pendingJobId || currentJobId) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Import Progress
                </CardTitle>
                <CardDescription>
                  Importing your data... Please wait.
                  {(currentJobId || pendingJobId) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Job: {(currentJobId || pendingJobId)?.substring(0, 8)}...)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Rows imported</span>
                    <span className="font-medium">
                      {importedRows} / {csvData.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${csvData.length > 0 ? Math.min(100, (importedRows / csvData.length) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {importedRows === 0 ? "Starting import..." : `Processing ${importedRows} of ${csvData.length} rows...`}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Rows:</span>
                      <span className="ml-2 font-medium">{csvData.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fields Mapped:</span>
                      <span className="ml-2 font-medium">{fieldMappings.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}




