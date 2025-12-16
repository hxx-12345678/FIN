"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Presentation, Link as LinkIcon, Loader2, CheckCircle2, XCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface OneClickExportButtonProps {
  orgId: string
  modelRunId?: string
  className?: string
}

export function OneClickExportButton({ orgId, modelRunId, className }: OneClickExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{
    format: 'pdf' | 'pptx' | 'memo'
    exportId?: string
    jobId?: string
    status?: 'queued' | 'processing' | 'completed' | 'failed'
    progress?: number
    downloadUrl?: string
    shareableLink?: string
  } | null>(null)
  const [showProgressDialog, setShowProgressDialog] = useState(false)

  const handleExport = async (format: 'pdf' | 'pptx' | 'memo') => {
    setExporting(true)
    setShowProgressDialog(true)
    setExportStatus({
      format,
      status: 'queued',
      progress: 0,
    })

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Create export
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          format,
          modelRunId,
          includeMonteCarlo: true,
          includeRecommendations: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.message || "Failed to create export")
      }

      const result = await response.json()
      if (!result.ok || !result.export) {
        throw new Error("Invalid export response")
      }

      const { exportId, jobId } = result.export
      setExportStatus({
        format,
        exportId,
        jobId,
        status: 'queued',
        progress: 10,
      })

      // Poll for job completion
      await pollExportStatus(exportId, jobId, format, token)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export"
      toast.error(errorMessage)
      setExportStatus({
        format,
        status: 'failed',
      })
    } finally {
      setExporting(false)
    }
  }

  const pollExportStatus = async (
    exportId: string,
    jobId: string,
    format: 'pdf' | 'pptx' | 'memo',
    token: string
  ) => {
    let attempts = 0
    const maxAttempts = 120 // 4 minutes max

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.warning("Export is taking longer than expected. It will continue processing in the background.")
        setExportStatus(prev => prev ? { ...prev, status: 'processing' } : null)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/exports/${exportId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const result = await response.json()
          if (!result.ok) {
            throw new Error("Failed to get export status")
          }

          const exportRecord = result.export || result
          const status = exportRecord.status
          const progress = exportRecord.progress || 0

          setExportStatus(prev => prev ? {
            ...prev,
            status,
            progress: Math.max(prev.progress || 0, progress),
          } : null)

          if (status === 'completed') {
            // Get download URL
            const downloadResponse = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
            })

            if (downloadResponse.ok) {
              const blob = await downloadResponse.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `investor-${format}-${exportId.substring(0, 8)}.${format === 'memo' ? 'pdf' : format}`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)

              // Generate shareable link
              try {
                const linkResponse = await fetch(`${API_BASE_URL}/exports/${exportId}/shareable-link`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                })

                if (linkResponse.ok) {
                  const linkResult = await linkResponse.json()
                  if (linkResult.ok && linkResult.shareableLink) {
                    const shareableUrl = `${window.location.origin}/share/${linkResult.shareableLink.token}`
                    setExportStatus(prev => prev ? {
                      ...prev,
                      status: 'completed',
                      progress: 100,
                      downloadUrl: url,
                      shareableLink: shareableUrl,
                    } : null)
                    toast.success("Export completed! File downloaded and shareable link created.")
                  }
                }
              } catch (linkError) {
                // Shareable link is optional
                console.warn("Failed to create shareable link:", linkError)
              }

              return
            } else {
              throw new Error("Failed to download export")
            }
          } else if (status === 'failed') {
            throw new Error(exportRecord.lastError || "Export failed")
          } else if (status === 'processing' || status === 'queued') {
            attempts++
            setTimeout(poll, 2000) // Poll every 2 seconds
          }
        } else {
          throw new Error(`Failed to get export status: ${response.statusText}`)
        }
      } catch (error) {
        console.error("Error polling export status:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          toast.error("Error checking export status. Please check the Exports page.")
        }
      }
    }

    poll()
  }

  const copyShareableLink = () => {
    if (exportStatus?.shareableLink) {
      navigator.clipboard.writeText(exportStatus.shareableLink)
      toast.success("Shareable link copied to clipboard!")
    }
  }

  const getStatusIcon = () => {
    if (!exportStatus) return null
    
    switch (exportStatus.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                1-Click Export
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            PDF Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('pptx')}>
            <Presentation className="mr-2 h-4 w-4" />
            PowerPoint (PPTX)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('memo')}>
            <FileText className="mr-2 h-4 w-4" />
            Investor Memo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Progress</DialogTitle>
            <DialogDescription>
              {exportStatus?.format === 'pdf' && "Generating PDF report..."}
              {exportStatus?.format === 'pptx' && "Generating PowerPoint presentation..."}
              {exportStatus?.format === 'memo' && "Generating investor memo..."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {exportStatus && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <Badge variant={
                        exportStatus.status === 'completed' ? 'default' :
                        exportStatus.status === 'failed' ? 'destructive' :
                        'secondary'
                      }>
                        {exportStatus.status || 'queued'}
                      </Badge>
                    </div>
                  </div>
                  {exportStatus.progress !== undefined && (
                    <>
                      <Progress value={exportStatus.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground text-right">
                        {exportStatus.progress}%
                      </div>
                    </>
                  )}
                </div>

                {exportStatus.status === 'completed' && (
                  <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Export completed successfully!</span>
                    </div>
                    {exportStatus.shareableLink && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-green-700">Shareable link:</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={exportStatus.shareableLink}
                            className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyShareableLink}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {exportStatus.status === 'failed' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Export failed</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

