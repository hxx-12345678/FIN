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

import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  csvColumn: string
  targetField: string
  confidence?: number
  explanation?: string
  method?: string
}

interface SmartMappingResult {
  mappings: any[];
  unmappedColumns: string[];
  skipSuggestions: string[];
  overallConfidence: number;
  formatDetected: string;
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

const FINAPILOT_HEADERS = [
  'date', 'mrr', 'arr', 'customer_count', 'new_customers', 'churned_customers',
  'churn_rate', 'arpa', 'cac', 'ltv', 'revenue', 'cogs', 'payroll',
  'infrastructure', 'marketing', 'operating_expenses', 'cash_balance',
  'orders', 'aov', 'conversion_rate', 'traffic', 'units_sold',
  'inventory_value', 'shipping_costs', 'payment_processing',
  'amount', 'description', 'category', 'account', 'reference', 'type', 'currency'
];

interface CSVImportWizardProps {
  orgId?: string | null
  token?: string | null
  onImportComplete?: () => void
}

export function CSVImportWizard({ orgId: propOrgId, token: propToken, onImportComplete }: CSVImportWizardProps) {
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
  const [smartMappingResult, setSmartMappingResult] = useState<SmartMappingResult | null>(null)
  const [useSmartMapping, setUseSmartMapping] = useState(true)
  const [skipFirstRow, setSkipFirstRow] = useState(true)
  const [importedRows, setImportedRows] = useState<number>(0)
  const [initialCash, setInitialCash] = useState<string>("0")
  const [initialCustomers, setInitialCustomers] = useState<string>("0")
  const [isImporting, setIsImporting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState<'finapilot' | 'custom' | null>(null)
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

  // Auto-detect field mappings based on column names with improved matching
  const autoMapFields = (headers: string[]): FieldMapping[] => {
    const mappings: FieldMapping[] = []
    const usedFields = new Set<string>()
    const headerLower = headers.map((h) => h.toLowerCase().trim())

    // First pass: Exact matches and high-confidence matches
    headers.forEach((header) => {
      const headerLower = header.toLowerCase().trim()
      let mappedField: string | null = null
      let confidence = 0

      // Date detection - multiple patterns
      if (
        headerLower === "date" ||
        headerLower === "transaction date" ||
        headerLower === "posted date" ||
        headerLower === "posting date" ||
        headerLower.includes("date") && !headerLower.includes("update")
      ) {
        if (!usedFields.has("date")) {
          mappedField = "date"
          confidence = headerLower === "date" ? 98 : 95
        }
      }
      // Amount detection - multiple patterns
      else if (
        headerLower === "amount" ||
        headerLower === "value" ||
        headerLower === "total" ||
        headerLower.includes("amount") ||
        (headerLower.includes("value") && !headerLower.includes("date")) ||
        headerLower.includes("debit") ||
        headerLower.includes("credit")
      ) {
        if (!usedFields.has("amount")) {
          mappedField = "amount"
          confidence = headerLower === "amount" ? 95 : 90
        }
      }
      // Description detection
      else if (
        headerLower === "description" ||
        headerLower === "memo" ||
        headerLower === "notes" ||
        headerLower === "details" ||
        headerLower === "narration" ||
        headerLower.includes("description") ||
        headerLower.includes("memo") ||
        headerLower.includes("notes")
      ) {
        if (!usedFields.has("description")) {
          mappedField = "description"
          confidence = headerLower === "description" ? 92 : 85
        }
      }
      // Category detection
      else if (
        headerLower === "category" ||
        headerLower === "type" ||
        headerLower === "class" ||
        headerLower.includes("category") ||
        (headerLower.includes("type") && !headerLower.includes("transaction"))
      ) {
        if (!usedFields.has("category")) {
          mappedField = "category"
          confidence = headerLower === "category" ? 88 : 80
        }
      }
      // Account detection
      else if (
        headerLower === "account" ||
        headerLower === "account name" ||
        headerLower.includes("account") && !headerLower.includes("number")
      ) {
        if (!usedFields.has("account")) {
          mappedField = "account"
          confidence = headerLower === "account" ? 85 : 75
        }
      }
      // Reference detection
      else if (
        headerLower === "reference" ||
        headerLower === "ref" ||
        headerLower === "transaction id" ||
        headerLower === "check number" ||
        headerLower === "invoice number" ||
        headerLower.includes("reference") ||
        headerLower.includes("ref #")
      ) {
        if (!usedFields.has("reference")) {
          mappedField = "reference"
          confidence = headerLower === "reference" || headerLower === "ref" ? 82 : 70
        }
      }
      // Type detection
      else if (
        headerLower === "transaction type" ||
        headerLower === "type" ||
        headerLower.includes("transaction type")
      ) {
        if (!usedFields.has("type")) {
          mappedField = "type"
          confidence = headerLower === "transaction type" ? 88 : 75
        }
      }
      // Currency detection
      else if (
        headerLower === "currency" ||
        headerLower === "curr" ||
        headerLower.includes("currency")
      ) {
        if (!usedFields.has("currency")) {
          mappedField = "currency"
          confidence = headerLower === "currency" ? 95 : 90
        }
      }

      if (mappedField && !usedFields.has(mappedField)) {
        usedFields.add(mappedField)
        mappings.push({
          csvColumn: header,
          targetField: mappedField,
          confidence,
        })
      }
    })

    return mappings
  }

  // Calculate confidence for a field even if not auto-mapped
  const getFieldConfidence = (targetField: string, csvColumn: string | null): number => {
    if (!csvColumn) return 0

    const headerLower = csvColumn.toLowerCase().trim()

    switch (targetField) {
      case "date":
        if (headerLower === "date") return 98
        if (headerLower.includes("date")) return 95
        return 0
      case "amount":
        if (headerLower === "amount") return 95
        if (headerLower.includes("amount") || headerLower === "value" || headerLower === "total") return 90
        return 0
      case "description":
        if (headerLower === "description") return 92
        if (headerLower.includes("description") || headerLower === "memo" || headerLower === "notes") return 85
        return 0
      case "category":
        if (headerLower === "category") return 88
        if (headerLower.includes("category") || (headerLower === "type" && !headerLower.includes("transaction"))) return 80
        return 0
      case "account":
        if (headerLower === "account") return 85
        if (headerLower.includes("account") && !headerLower.includes("number")) return 75
        return 0
      case "reference":
        if (headerLower === "reference" || headerLower === "ref") return 82
        if (headerLower.includes("reference") || headerLower.includes("ref")) return 70
        return 0
      case "type":
        if (headerLower === "transaction type") return 88
        if (headerLower === "type") return 75
        return 0
      case "currency":
        if (headerLower === "currency") return 95
        if (headerLower.includes("currency")) return 90
        return 0
      default:
        return 0
    }
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

      // Parse CSV with improved handling for quoted fields, escaped quotes, and edge cases
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false
        let i = 0

        while (i < line.length) {
          const char = line[i]
          const nextChar = i + 1 < line.length ? line[i + 1] : null

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote inside quoted field
              current += '"'
              i += 2
              continue
            } else {
              // Toggle quote state
              inQuotes = !inQuotes
            }
          } else if (char === "," && !inQuotes) {
            // Field separator
            result.push(current.trim())
            current = ""
          } else if (char === '\n' && !inQuotes) {
            // Newline outside quotes - end of line
            break
          } else if (char === '\r' && !inQuotes) {
            // Carriage return outside quotes - skip
          } else {
            current += char
          }
          i++
        }

        // Push the last field
        result.push(current.trim())

        // Clean up empty trailing fields
        while (result.length > 0 && result[result.length - 1] === "") {
          result.pop()
        }

        return result
      }

      const headers = parseCSVLine(lines[0])
      console.log("📋 Parsed headers:", headers)

      if (headers.length === 0 || headers.every(h => !h.trim())) {
        toast.error("CSV file has no headers. Please check the file format.")
        return
      }

      // Clean headers - remove empty strings and trim
      const cleanHeaders = headers.filter(h => h.trim().length > 0).map(h => h.trim())

      if (cleanHeaders.length === 0) {
        toast.error("CSV file has no valid headers. Please check the file format.")
        return
      }

      setCsvHeaders(cleanHeaders)
      console.log("✅ Headers set:", cleanHeaders.length)

      // Local Detection
      const normalizedHeaders = cleanHeaders.map(h => h.toLowerCase().trim().replace(/[_\s-]+/g, '_'));
      const matches = normalizedHeaders.filter(h => FINAPILOT_HEADERS.includes(h));
      const matchPercentage = (matches.length / cleanHeaders.length) * 100;
      const isNative = matchPercentage >= 60;
      setDetectedFormat(isNative ? 'finapilot' : 'custom');

      if (isNative) {
        setUseSmartMapping(false); // No need for AI if it's our format
      }

      const data: CSVRow[] = []
      const startIndex = skipFirstRow ? 1 : 0

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = parseCSVLine(line)
        if (values.length === 0) continue

        const row: CSVRow = {}
        let hasData = false

        cleanHeaders.forEach((header, index) => {
          const value = (values[index] || "").trim()
          row[header] = value === "null" || value === "undefined" || value === "NULL" || value === "UNDEFINED" ? "" : value
          if (value) hasData = true
        })

        if (hasData) {
          data.push(row)
        }
      }

      setCsvData(data)
      const prevRows = data.slice(0, 10)
      setPreviewRows(prevRows)
      setStep("preview")
      toast.success(isNative ? "FinaPilot Template Detected!" : "CSV loaded successfully")
    }

    reader.readAsText(file)
  }

  const runSmartMapping = async () => {
    if (!csvHeaders.length || !previewRows.length) {
      console.warn("⚠️ Cannot run smart mapping: Missing headers or preview data");
      return;
    }

    console.log("🧠 Initiating AI Smart Mapping...", {
      headerCount: csvHeaders.length,
      sampleSize: previewRows.length
    });

    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/import/map/smart`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ headers: csvHeaders, sampleRows: previewRows }),
      });

      console.log("📡 AI Response Status:", res.status);

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await res.json();
      console.log("🎯 AI Result Data:", result);

      if (result.ok && result.data?.mappings && result.data.mappings.length > 0) {
        const smartMappings = result.data.mappings.map((m: any) => ({
          csvColumn: m.csvColumn || m.csv_field,
          targetField: m.internalField || m.internal_field,
          confidence: m.confidence,
          explanation: m.explanation,
          method: m.method || 'ai_semantic',
        }));
        
        console.log(`✅ AI mapped ${smartMappings.length} columns successfully`);
        setFieldMappings(smartMappings);
        setSmartMappingResult(result.data);
        toast.success(`✨ AI Mapping Analysis Complete (${smartMappings.length} fields detected)`);
      } else {
        console.log("ℹ️ AI returned no specific mappings, falling back to heuristic matching");
        setFieldMappings(autoMapFields(csvHeaders));
        if (result.ok) {
           toast.info("Heuristic mapping applied (AI suggest manual review)");
        }
      }
    } catch (err) {
      console.error("❌ Smart mapping critical failure:", err);
      setFieldMappings(autoMapFields(csvHeaders));
      toast.error("AI Analysis failed. Falling back to basic mapping.");
    } finally {
      setIsAnalyzing(false);
    }
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
      // Get orgId
      let orgId = propOrgId || localStorage.getItem("orgId")
      if (!orgId) {
        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (meResponse.status === 401) {
          handleUnauthorized()
          setIsImporting(false)
          return
        }

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

      const uploadUrl = `${API_BASE_URL}/orgs/${orgId}/import/csv/upload`
      console.log("📤 API_BASE_URL:", API_BASE_URL)
      console.log("📤 Full upload URL:", uploadUrl)
      console.log("📤 Upload file size:", formData.get('file') instanceof File ? (formData.get('file') as File).size : 'unknown')

      const uploadHeaders = { ...getAuthHeaders() } as any;
      delete uploadHeaders["Content-Type"];

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: uploadHeaders,
        credentials: "include",
        body: formData,
      })

      if (uploadResponse.status === 401) {
        handleUnauthorized()
        setIsImporting(false)
        return
      }

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
        } catch { }
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
        headers: getAuthHeaders(),
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
            const fetchJobStatus = async () => {
              try {
                const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
                  headers: getAuthHeaders(),
                  credentials: "include",
                })

                if (response.status === 401) {
                  handleUnauthorized()
                  return
                }
              } catch (error) {
                console.error("❌ Error polling job status:", error)
              }
            }
            fetchJobStatus()
          }, 2000)
          return
        }

        try {
          attempts++
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts} for job ${jobId}`)

          const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
            headers: getAuthHeaders(),
            credentials: "include",
          })

          if (jobResponse.status === 401) {
            handleUnauthorized()
            return
          }

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
              if (onImportComplete) {
                onImportComplete()
              }
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
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Import Financial Data
          </DialogTitle>
          <DialogDescription>
            Upload your CSV to populate your financial model with AI assistance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-8 px-4">
            {[
              { id: "upload", label: "Upload", icon: Upload },
              { id: "preview", label: "Preview", icon: Eye },
              { id: "mapping", label: "Mapping", icon: Map },
              { id: "review", label: "Import", icon: CheckCircle2 },
            ].map((s, index, arr) => {
              const Icon = s.icon
              const isActive = step === s.id
              const currentStepIndex = ["upload", "preview", "mapping", "review"].indexOf(step)
              const isPast = currentStepIndex > index
              
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2 relative border-none">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-500"
                          : isPast
                          ? "border-green-500 bg-green-50 text-green-500"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-4 -mt-6 ${isPast ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Conditional Content by Step */}
          <div>
            {step === "upload" && (
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed border-muted rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer group bg-slate-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                  />
                  <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Select a CSV File</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                    Drag and drop your file here, or click to browse.
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Max 50MB</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Auto-mapping</span>
                  </div>
                </div>

                <Card className="border-blue-100 bg-blue-50/30">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900">AI-Powered Extraction</h4>
                        <p className="text-xs text-blue-800/80 leading-relaxed mt-1">
                          Our intelligence engine automatically maps your specific accounting export (QuickBooks, NetSuite, Xero) to our categories.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="auto-mapping" 
                          checked={useSmartMapping} 
                          onCheckedChange={(c) => setUseSmartMapping(c as boolean)} 
                        />
                        <Label htmlFor="auto-mapping" className="text-xs font-bold text-blue-950 cursor-pointer">
                          Enable AI Smart Mapping (Recommended)
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" className="text-muted-foreground h-auto py-1" asChild>
                    <a href="/templates/finapilot_import_template.csv" download>
                      <Download className="mr-2 h-3 w-3" />
                      Download FinaPilot template
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Data Preview
                      {detectedFormat === 'finapilot' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Standard Format
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                          <AlertCircle className="w-3 h-3 mr-1" /> Custom Format
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">Showing sample rows for verification.</p>
                  </div>
                </div>

                {detectedFormat === 'custom' && (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">Custom Accounting Export Detected</p>
                      <p className="text-xs text-amber-800 leading-normal">
                        We recommend using **AI Smart Mapping** to understand your columns. Or, <a href="/templates/finapilot_import_template.csv" download className="font-bold underline decoration-dotted">download our native format</a> to skip mapping.
                      </p>
                    </div>
                  </div>
                )}

                <div className="border rounded-xl overflow-hidden bg-white shadow-sm max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {csvHeaders.map((header) => (
                          <TableHead key={header} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 py-3 whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          {csvHeaders.map((header) => (
                            <TableCell key={header} className="py-2 text-xs truncate max-w-[150px]">
                              {row[header] || <span className="text-muted-foreground/30 italic">empty</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">{csvData.length} records total.</p>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="toggle-ai-preview" 
                        checked={useSmartMapping} 
                        onCheckedChange={(c) => setUseSmartMapping(c as boolean)} 
                      />
                      <Label htmlFor="toggle-ai-preview" className="text-xs font-medium cursor-pointer">Use AI Intelligence</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Back</Button>
                    <Button size="sm" onClick={() => {
                      setStep("mapping");
                      if (useSmartMapping) runSmartMapping();
                      else setFieldMappings(autoMapFields(csvHeaders));
                    }}>
                      Proceed to Mapping
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "mapping" && (
              <div className="space-y-6">
                {isAnalyzing ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
                      <Sparkles className="h-8 w-8 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold">Gemini Intelligence Scanning...</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Analyzing your dataset structure for accurate financial reconciliation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Card className="border-none bg-slate-50 shadow-none">
                      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-base font-bold">Column Reconciliation</CardTitle>
                          <CardDescription className="text-xs">
                             {smartMappingResult ? "AI has suggested relevant matches below." : "Verify the automatically detected mappings."}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={runSmartMapping} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Sparkles className="w-3 h-3 mr-2" />
                          Re-scan data
                        </Button>
                      </CardHeader>
                      <CardContent className="px-6 pb-6 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-1 h-4 bg-blue-500 rounded-full" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Core Metrics</h4>
                        </div>
                        
                        <div className="grid gap-3">
                          {targetFields.map((field) => {
                            const mapping = fieldMappings.find((m) => m.targetField === field.value)
                            const currentColumn = getMappedColumn(field.value)
                            const confidence = mapping?.confidence || (currentColumn !== "__none__" ? getFieldConfidence(field.value, currentColumn) : 0)
                            const isMapped = currentColumn !== "__none__"

                            return (
                              <div key={field.value} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm font-bold">{field.label}</Label>
                                      {field.required && <Badge variant="outline" className="text-[9px] h-4 border-red-200 text-red-500 bg-red-50 font-bold uppercase">Required</Badge>}
                                      {isMapped && confidence > 0 && (
                                        <Badge className={`text-[10px] h-4 border-none ${confidence >= 90 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                          {confidence}% AI Confidence
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">Target system field</p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Select value={currentColumn} onValueChange={(val) => handleMappingChange(val, field.value)}>
                                      <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs bg-slate-50/50">
                                        <SelectValue placeholder="Select Column..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__" className="text-slate-400 italic">No Selection</SelectItem>
                                        {csvHeaders.map(h => (
                                          <SelectItem key={h} value={h}>
                                            {h} {smartMappingResult?.skipSuggestions?.includes(h) ? "⚠️" : ""}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {isMapped ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <XCircle className="h-5 w-5 text-slate-200 shrink-0" />}
                                  </div>
                                </div>
                                {mapping?.explanation && isMapped && (
                                  <div className="mt-3 pt-3 border-t border-dashed flex gap-2">
                                    <Sparkles className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-[10px] leading-normal text-slate-500">
                                      <span className="font-bold text-blue-600 mr-1">AI Logic:</span> {mapping.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Import Meta-Parameters</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 p-1">
                          <Label htmlFor="cash-input" className="text-xs font-semibold">Initial Cash Balance</Label>
                          <Input id="cash-input" type="number" placeholder="0.00" value={initialCash} onChange={e => setInitialCash(e.target.value)} className="bg-white text-xs h-9" />
                        </div>
                        <div className="space-y-1.5 p-1">
                          <Label htmlFor="cust-input" className="text-xs font-semibold">Current Customer Base</Label>
                          <Input id="cust-input" type="number" placeholder="0" value={initialCustomers} onChange={e => setInitialCustomers(e.target.value)} className="bg-white text-xs h-9" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button variant="ghost" size="sm" onClick={() => setStep("preview")}>Back</Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSaveTemplate}>Save Template</Button>
                        <Button size="sm" onClick={handleImport} disabled={!validateMappings() || isImporting}>
                          {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Complete Final Import
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="py-20 space-y-8 text-center animate-in zoom-in duration-500">
                <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-2xl relative">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md border">
                     <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {Math.round((importedRows / (csvData.length || 1)) * 100)}%
                     </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Synchronizing Data</h3>
                  <p className="text-sm text-muted-foreground">Integrating {csvData.length} records into your organizational model.</p>
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-700" 
                      style={{ width: `${Math.min(100, (importedRows / (csvData.length || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Inbound Traffic</span>
                    <span>{importedRows} / {csvData.length} records processed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}




