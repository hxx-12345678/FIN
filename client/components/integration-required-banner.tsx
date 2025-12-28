"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, Database } from "lucide-react"
import { useEffect, useState } from "react"
import { checkUserHasData, getUserOrgId } from "@/lib/user-data-check"

interface IntegrationRequiredBannerProps {
  onNavigateToIntegrations: () => void
}

export function IntegrationRequiredBanner({ onNavigateToIntegrations }: IntegrationRequiredBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkIntegrationStatus = async () => {
      const modeSelected = localStorage.getItem("finapilot_mode_selected")
      // Only show banner if user selected real data but hasn't integrated yet
      if (modeSelected === "pending_integration") {
        const orgId = await getUserOrgId()
        if (orgId) {
          const hasData = await checkUserHasData(orgId)
          if (!hasData) {
            setShowBanner(true)
          } else {
            // User has integrated - mark as complete
            localStorage.setItem("finapilot_mode_selected", "true")
            setShowBanner(false)
          }
        } else {
          setShowBanner(true)
        }
      } else {
        setShowBanner(false)
      }
      setChecking(false)
    }

    checkIntegrationStatus()

    // Listen for integration completion events
    const handleIntegrationComplete = () => {
      setShowBanner(false)
    }
    window.addEventListener('integration-completed', handleIntegrationComplete)
    window.addEventListener('csv-import-completed', checkIntegrationStatus)
    window.addEventListener('xlsx-import-completed', checkIntegrationStatus)

    return () => {
      window.removeEventListener('integration-completed', handleIntegrationComplete)
      window.removeEventListener('csv-import-completed', checkIntegrationStatus)
      window.removeEventListener('xlsx-import-completed', checkIntegrationStatus)
    }
  }, [])

  if (checking || !showBanner) {
    return null
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 mb-6">
      <AlertCircle className="h-5 w-5 text-blue-600" />
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-blue-900 font-medium mb-1">Complete your integration to get started</p>
          <p className="text-blue-700 text-sm">
            Connect your accounting system or import data to start using FinaPilot's financial insights.
          </p>
        </div>
        <Button
          onClick={onNavigateToIntegrations}
          className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
          size="sm"
        >
          <Database className="mr-2 h-4 w-4" />
          Go to Integrations
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}

