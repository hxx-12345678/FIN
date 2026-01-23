"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, AlertCircle, Download, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { API_BASE_URL } from "@/lib/api-config"

export default function ShareExportPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportInfo, setExportInfo] = useState<any>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [exportType, setExportType] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Invalid shareable link")
      setLoading(false)
      return
    }

    // Fetch export info and prepare display/download
    const fetchExportInfo = async () => {
      try {
        setLoading(true)
        setError(null)

        // Call the download endpoint directly
        const response = await fetch(`${API_BASE_URL}/share-export/${token}/download`, {
          method: "GET",
          credentials: "include",
          redirect: "follow", // Follow redirects to S3
        })

        // Check if it's a redirect (S3 URL) - this happens when redirect is followed
        if (response.redirected) {
          // The browser followed the redirect, so response.url is the final URL
          setDownloadUrl(response.url)
          // Determine type from URL
          if (response.url.includes(".pdf") || response.url.includes("pdf")) {
            setExportType("pdf")
          } else if (response.url.includes(".pptx") || response.url.includes("pptx")) {
            setExportType("pptx")
          } else {
            setExportType("pdf") // Default to PDF
          }
          setLoading(false)
          return
        }

        // If response is OK, it means the file is being served directly from database
        if (response.ok) {
          const contentType = response.headers.get("content-type") || ""
          const contentDisposition = response.headers.get("content-disposition") || ""
          
          // Determine export type from content type
          if (contentType.includes("pdf")) {
            setExportType("pdf")
          } else if (contentType.includes("pptx") || contentType.includes("presentation")) {
            setExportType("pptx")
          } else if (contentType.includes("csv") || contentType.includes("text")) {
            setExportType("csv")
          } else {
            setExportType("pdf") // Default
          }

          // For PDFs, we can display inline
          if (contentType.includes("pdf")) {
            // Create a blob URL for the PDF
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            setDownloadUrl(blobUrl)
            setExportInfo({ type: "pdf", blobUrl })
          } else {
            // For other types, trigger download
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const filename = contentDisposition
              ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") || "export"
              : "export"
            
            // Trigger download
            const link = document.createElement("a")
            link.href = blobUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(blobUrl)
            
            setLoading(false)
            return
          }
          
          setLoading(false)
          return
        }

        // If not OK, check for error
        if (response.status === 400 || response.status === 404) {
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.error?.message || "Shareable link not found or expired")
        } else {
          const errorText = await response.text().catch(() => "")
          setError(`Failed to access export (Status: ${response.status}). ${errorText || "Please try again."}`)
        }
      } catch (err) {
        console.error("Error accessing shareable link:", err)
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(`Failed to access export: ${errorMessage}. Please check your connection and try again.`)
      } finally {
        setLoading(false)
      }
    }

    fetchExportInfo()
  }, [token])

  const handleDownload = () => {
    if (downloadUrl) {
      if (exportType === "pdf" && exportInfo?.blobUrl) {
        // For blob URLs, create download link
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = "export.pdf"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        window.location.href = downloadUrl
      }
    } else {
      const directDownloadUrl = `${API_BASE_URL}/share-export/${token}/download`
      window.location.href = directDownloadUrl
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Accessing Export...
            </CardTitle>
            <CardDescription>
              Please wait while we prepare your download
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 animate-pulse" style={{ width: "60%" }} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                This may take a few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Unable to Access Export
            </CardTitle>
            <CardDescription>
              There was a problem accessing the shared export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1"
              >
                Go to Home
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Try Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show PDF viewer if we have a PDF
  if (downloadUrl && exportType === "pdf") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-semibold">Shared Financial Report</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4">
          <iframe
            src={downloadUrl}
            className="w-full h-[calc(100vh-100px)] border rounded-lg shadow-lg"
            title="Financial Report"
          />
        </div>
      </div>
    )
  }

  // If we have a download URL but it's not a PDF, show download button
  if (downloadUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Ready
            </CardTitle>
            <CardDescription>
              Your export is ready to download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Export
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1"
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

