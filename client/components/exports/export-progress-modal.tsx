"use client"

import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, X, Download, AlertCircle, CheckCircle2, Ban } from "lucide-react"
import { useExportJob } from "@/hooks/use-export-job"

interface ExportProgressModalProps {
  exportId: string | null
  open: boolean
  onClose: () => void
  onDownload?: (downloadUrl: string) => void
}

export function ExportProgressModal({ exportId, open, onClose, onDownload }: ExportProgressModalProps) {
  const { job, progress, download, cancel, isLoading, error } = useExportJob(exportId)

  useEffect(() => {
    if (job?.status === "completed" && job.exportId) {
      // Don't auto-download, let user click the download button
      // The success message is enough indication
    }
  }, [job?.status, job?.exportId])

  const handleCancel = async () => {
    try {
      await cancel()
    } catch (err) {
      console.error("Failed to cancel:", err)
    }
  }

  const handleDownload = async () => {
    if (!job?.exportId) {
      console.error("Export ID not available")
      return
    }

    try {
      const downloadUrl = await download()
      
      // If it's a full URL (S3), open in new tab
      if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
        if (onDownload) {
          onDownload(downloadUrl)
        } else {
          window.open(downloadUrl, "_blank")
        }
      } else {
        // If it's a relative URL, create a full URL and trigger download
        const fullUrl = downloadUrl.startsWith('/') 
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${downloadUrl}`
          : downloadUrl
        
        // Create a temporary link and click it to trigger download
        const link = document.createElement('a')
        link.href = fullUrl
        link.download = ''
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        if (onDownload) {
          onDownload(fullUrl)
        }
      }
      onClose()
    } catch (err) {
      console.error("Failed to download:", err)
    }
  }

  const getStatusIcon = () => {
    switch (job?.status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case "failed":
        return <AlertCircle className="h-6 w-6 text-red-500" />
      case "cancelled":
        return <Ban className="h-6 w-6 text-gray-500" />
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />
    }
  }

  const getStatusMessage = () => {
    if (job?.statusMessage) return job.statusMessage

    switch (job?.status) {
      case "queued":
        return "Queued for export generation..."
      case "processing":
        if (job.type === "PDF") return "Generating PDF..."
        if (job.type === "PPTX") return "Adding charts..."
        return "Generating export..."
      case "completed":
        return "Export completed successfully"
      case "failed":
        return "Export generation failed"
      case "cancelled":
        return "Export cancelled"
      default:
        return "Preparing export..."
    }
  }

  const estimatedTimeRemaining = job?.status === "processing" && progress > 0
    ? Math.max(0, Math.round((100 - progress) * 2))
    : null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Export Progress
          </DialogTitle>
          <DialogDescription>{getStatusMessage()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(job?.status === "processing" || job?.status === "queued") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
                aria-label={`Export progress: ${Math.round(progress)}%`}
              />
              {job.statusMessage && (
                <p className="text-xs text-muted-foreground">{job.statusMessage}</p>
              )}
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Estimated time remaining: ~{estimatedTimeRemaining}s
                </p>
              )}
            </div>
          )}

          {job?.status === "completed" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">100%</span>
              </div>
              <Progress
                value={100}
                className="h-2"
                aria-valuenow={100}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
                aria-label="Export progress: 100%"
              />
            </div>
          )}

          {job?.fileSize && job.fileSize > 50 * 1024 * 1024 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                File too large to generate. Please reduce data scope.
              </AlertDescription>
            </Alert>
          )}

          {job?.partialExport && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Partial export completed. Some slides may be missing.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-2">
            {job?.status === "processing" && (
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            {job?.status === "completed" && (
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            {(job?.status === "failed" || job?.status === "cancelled") && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

