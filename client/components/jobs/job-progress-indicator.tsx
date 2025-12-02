"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Loader2, X, Clock, CheckCircle2, XCircle, Ban, AlertCircle } from "lucide-react"

interface JobProgressIndicatorProps {
  jobId: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying" | "dead_letter"
  progress?: number
  estimatedTimeRemaining?: number
  subTasks?: Array<{ name: string; completed: boolean; current?: number; total?: number }>
  showDetails?: boolean
  onCancel?: () => void
  stage?: string
}

export function JobProgressIndicator({
  jobId,
  status,
  progress = 0,
  estimatedTimeRemaining,
  subTasks,
  showDetails = false,
  onCancel,
  stage,
}: JobProgressIndicatorProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "queued":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        )
      case "running":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Ban className="h-3 w-3" />
            Cancelled
          </Badge>
        )
      case "retrying":
        return (
          <Badge variant="default" className="bg-yellow-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Retrying
          </Badge>
        )
      case "dead_letter":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Dead Letter
          </Badge>
        )
      default:
        return null
    }
  }

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return null
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {status === "running" && progress > 0 && (
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          )}
        </div>
        {status === "running" && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(status === "running" || status === "retrying") && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
          {stage && (
            <div className="text-xs text-muted-foreground">
              <span>{stage}</span>
            </div>
          )}
          {estimatedTimeRemaining && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>~{formatTimeRemaining(estimatedTimeRemaining)} remaining</span>
            </div>
          )}
        </div>
      )}

      {showDetails && subTasks && subTasks.length > 0 && (
        <div className="space-y-1 text-sm">
          {subTasks.map((task, index) => (
            <div key={index} className="flex items-center gap-2">
              {task.completed ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={task.completed ? "text-muted-foreground line-through" : ""}>
                {task.name}
                {task.current !== undefined && task.total !== undefined && (
                  <span className="text-muted-foreground ml-2">
                    ({task.current}/{task.total})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {status === "failed" && (
        <div className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          <span>Job failed. Check details for error information.</span>
        </div>
      )}
    </div>
  )
}

