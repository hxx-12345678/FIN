"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, X } from "lucide-react"
import { useState } from "react"

interface DemoModeBannerProps {
  onUpgrade: () => void
}

export function DemoModeBanner({ onUpgrade }: DemoModeBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Alert className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <AlertDescription className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              Demo Mode
            </Badge>
            <span className="text-sm">
              You're exploring FinaPilot with sample data. Connect your accounting system to unlock full features.
            </span>
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            onClick={onUpgrade}
          >
            Upgrade to Real Account
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  )
}
