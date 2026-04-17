"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"

function getAnalyticsConsent(): boolean {
  try {
    const consentRaw = localStorage.getItem("finapilot_cookie_consent")
    if (!consentRaw) return false
    const consent = JSON.parse(consentRaw)
    return consent?.analytics === true
  } catch {
    return false
  }
}

export function CookieAwareAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(getAnalyticsConsent())

    const onStorage = (e: StorageEvent) => {
      if (e.key === "finapilot_cookie_consent") {
        setEnabled(getAnalyticsConsent())
      }
    }

    const onCustom = () => {
      setEnabled(getAnalyticsConsent())
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("finapilot:cookie-consent-updated", onCustom)

    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("finapilot:cookie-consent-updated", onCustom)
    }
  }, [])

  if (!enabled) return null
  return <Analytics />
}
