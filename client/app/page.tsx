"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import { OverviewDashboard } from "@/components/overview-dashboard"
import { FinancialModeling } from "@/components/financial-modeling"
import { BudgetActual } from "@/components/budget-actual"
import { ScenarioPlanning } from "@/components/scenario-planning"
import { RealtimeSimulations } from "@/components/realtime-simulations"
import { AIForecasting } from "@/components/ai-forecasting"
import { AIAssistant } from "@/components/ai-assistant"
import { ReportsAnalytics } from "@/components/reports-analytics"
import { BoardReporting } from "@/components/board-reporting"
import { InvestorDashboard } from "@/components/investor-dashboard"
import { UserManagement } from "@/components/user-management"
import { IntegrationsPage } from "@/components/integrations-page"
import { NotificationsPage } from "@/components/notifications-page"
import { CompliancePage } from "@/components/compliance-page"
import { PricingPage } from "@/components/pricing-page"
import { SettingsPage } from "@/components/settings-page"
import { OnboardingPage } from "@/components/onboarding-page"
import { CollaborationPage } from "@/components/collaboration-page"
import { DemoModeOnboarding } from "@/components/demo-mode-onboarding"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { UpgradeToRealModal } from "@/components/upgrade-to-real-modal"
import { PostLoginOptions } from "@/components/post-login-options"
import { isDemoMode, resetDemoDataIfNeeded } from "@/lib/demo-data-generator"
import { JobQueue } from "@/components/jobs/job-queue"
import { ExportJobQueue } from "@/components/exports/export-job-queue"

export default function HomePage() {
  const [showLanding, setShowLanding] = useState(true)
  const [activeView, setActiveView] = useState("overview")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPostLoginOptions, setShowPostLoginOptions] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    const checkAuthAndState = () => {
      const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")
      const authToken = localStorage.getItem("auth-token")
      
      // If no auth token, show landing page
      if (!authToken) {
        setShowLanding(true)
        setShowOnboarding(false)
        setShowPostLoginOptions(false)
        setDemoMode(false)
        return
      }
      
      // If authenticated but hasn't selected demo/real mode, show post-login options
      // This is the ONLY place where we show the demo/real selection after login
      if (authToken && !hasSelectedMode) {
        setShowLanding(false)
        setShowOnboarding(false)
        setShowPostLoginOptions(true)
        return
      }
      
      // If mode is already selected, go directly to dashboard
      if (hasSelectedMode) {
        setShowLanding(false)
        setShowPostLoginOptions(false)
        setShowOnboarding(false)
        const isDemo = isDemoMode()
        setDemoMode(isDemo)
        if (isDemo) {
          resetDemoDataIfNeeded()
        }
      }
    }

    checkAuthAndState()

    // Listen for signout event
    const handleSignOut = () => {
      setShowLanding(true)
      setShowOnboarding(false)
      setShowPostLoginOptions(false)
      setDemoMode(false)
      setActiveView("overview")
      localStorage.removeItem("finapilot_mode_selected")
      localStorage.removeItem("finapilot_has_visited")
      localStorage.removeItem("finapilot_onboarding_complete")
    }

    // Listen for login success event
    const handleLoginSuccess = () => {
      const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")
      if (!hasSelectedMode) {
        setShowLanding(false)
        setShowPostLoginOptions(true)
      }
    }

    window.addEventListener("signout", handleSignOut)
    window.addEventListener("login-success", handleLoginSuccess)
    return () => {
      window.removeEventListener("signout", handleSignOut)
      window.removeEventListener("login-success", handleLoginSuccess)
    }
  }, [])

  const handleGetStarted = () => {
    // When clicking "Get Started" from landing page, check if user is logged in
    const authToken = localStorage.getItem("auth-token")
    const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")
    
    if (authToken && !hasSelectedMode) {
      // If logged in but hasn't selected mode, show post-login options
      setShowLanding(false)
      setShowPostLoginOptions(true)
    } else if (authToken && hasSelectedMode) {
      // If logged in and mode selected, go to dashboard
      setShowLanding(false)
      const isDemo = isDemoMode()
      setDemoMode(isDemo)
    } else {
      // If not logged in, show landing page (they need to login first)
      setShowLanding(true)
    }
  }

  const handlePostLoginDemo = () => {
    localStorage.setItem("finapilot_mode_selected", "true")
    localStorage.setItem("finapilot_demo_mode", "true")
    localStorage.setItem("finapilot_onboarding_complete", "true")
    setShowPostLoginOptions(false)
    setDemoMode(true)
    resetDemoDataIfNeeded()
    setActiveView("overview")
  }

  const handlePostLoginRealData = () => {
    localStorage.setItem("finapilot_mode_selected", "true")
    localStorage.removeItem("finapilot_demo_mode")
    localStorage.setItem("finapilot_onboarding_complete", "true")
    setShowPostLoginOptions(false)
    setDemoMode(false)
    setActiveView("integrations")
  }

  const handleOnboardingComplete = (mode: "demo" | "real") => {
    localStorage.setItem("finapilot_onboarding_complete", "true")
    setShowOnboarding(false)

    if (mode === "demo") {
      setDemoMode(true)
    } else {
      setDemoMode(false)
      setActiveView("integrations")
    }
  }

  const handleUpgradeToReal = () => {
    setShowUpgradeModal(true)
  }

  const handleUpgradeComplete = () => {
    setShowUpgradeModal(false)
    setDemoMode(false)
    setActiveView("integrations")
  }

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return <OverviewDashboard />
      case "modeling":
        return <FinancialModeling />
      case "budget-actual":
        return <BudgetActual />
      case "scenarios":
        return <ScenarioPlanning />
      case "simulations":
        return <RealtimeSimulations />
      case "forecasting":
        return <AIForecasting />
      case "assistant":
        return <AIAssistant />
      case "reports":
        return <ReportsAnalytics />
      case "board-reporting":
        return <BoardReporting />
      case "investor":
        return <InvestorDashboard />
      case "users":
        return <UserManagement />
      case "integrations":
        return <IntegrationsPage />
      case "notifications":
        return <NotificationsPage />
      case "compliance":
        return <CompliancePage />
      case "pricing":
        return <PricingPage />
      case "settings":
        return <SettingsPage />
      case "onboarding":
        return <OnboardingPage />
      case "collaboration":
        return <CollaborationPage />
      case "job-queue":
        return <JobQueue />
      case "export-queue":
        return <ExportJobQueue />
      default:
        return <OverviewDashboard />
    }
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  // Show post-login options after successful login
  if (showPostLoginOptions) {
    return (
      <PostLoginOptions
        onSelectDemo={handlePostLoginDemo}
        onSelectRealData={handlePostLoginRealData}
      />
    )
  }

  // Show onboarding for users who clicked "Get Started"
  if (showOnboarding) {
    return <DemoModeOnboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <>
      <DashboardLayout activeView={activeView} onViewChange={setActiveView} demoMode={demoMode}>
        {demoMode && <DemoModeBanner onUpgrade={handleUpgradeToReal} />}
        {renderActiveView()}
      </DashboardLayout>

      <UpgradeToRealModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeComplete}
      />
    </>
  )
}
