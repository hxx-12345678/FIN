"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { ModelProvider } from "@/lib/model-context"
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
import { ApprovalManagement } from "@/components/approval-management"
import { SemanticLedger } from "@/components/semantic-ledger"
import { DemoModeOnboarding } from "@/components/demo-mode-onboarding"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { UpgradeToRealModal } from "@/components/upgrade-to-real-modal"
import { PostLoginOptions } from "@/components/post-login-options"
import { isDemoMode, resetDemoDataIfNeeded } from "@/lib/demo-data-generator"
import { JobQueue } from "@/components/jobs/job-queue"
import { ExportJobQueue } from "@/components/exports/export-job-queue"
import { IntegrationRequiredBanner } from "@/components/integration-required-banner"
import { checkUserHasData, getUserOrgId } from "@/lib/user-data-check"
import { ErrorBoundary } from "@/components/error-boundary"

export default function HomePage() {
  return (
    <ModelProvider>
      <HomePageContent />
    </ModelProvider>
  )
}

function HomePageContent() {
  // Initialize with default values for SSR compatibility (prevents hydration mismatch)
  const [showLanding, setShowLanding] = useState(true)
  const [activeView, setActiveView] = useState("overview")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPostLoginOptions, setShowPostLoginOptions] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    // CRITICAL: Check hash and auth synchronously FIRST to prevent landing page flash
    // This runs only on client side, preventing hydration mismatch
    const currentHash = window.location.hash.replace("#", "")
    const authToken = localStorage.getItem("auth-token")

    const validViews = [
      "overview", "modeling", "budget-actual", "scenarios", "simulations",
      "forecasting", "assistant", "reports", "board-reporting", "investor",
      "users", "integrations", "notifications", "compliance", "pricing",
      "settings", "onboarding", "collaboration", "job-queue", "export-queue",
      "approvals", "ledger"
    ]

    // If user has auth token, NEVER show landing page
    if (authToken) {
      setShowLanding(false)

      // If there's a valid hash, set view immediately
      if (currentHash && validViews.includes(currentHash)) {
        setActiveView(currentHash)
      }
    } else {
      setShowLanding(true)
    }

    const checkAuthAndState = async () => {
      const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")

      // CRITICAL: Check hash FIRST before any redirect logic - if user has a valid hash, respect it
      // This prevents redirecting to integrations when user is on another component
      const validViews = [
        "overview", "modeling", "budget-actual", "scenarios", "simulations",
        "forecasting", "assistant", "reports", "board-reporting", "investor",
        "users", "integrations", "notifications", "compliance", "pricing",
        "settings", "onboarding", "collaboration", "job-queue", "export-queue"
      ]

      if (currentHash && validViews.includes(currentHash)) {
        // User is on a specific view (from URL hash) - ALWAYS respect it, don't redirect
        setShowLanding(false)
        setShowPostLoginOptions(false)
        setShowOnboarding(false)
        setDemoMode(false)
        setActiveView(currentHash)
        return // CRITICAL: Return early to prevent any redirect logic
      }

      // If no auth token, show landing page
      if (!authToken) {
        setShowLanding(true)
        setShowOnboarding(false)
        setShowPostLoginOptions(false)
        setDemoMode(false)
        return
      }

      // If authenticated but hasn't selected demo/real mode, or selected real data but hasn't integrated
      if (authToken && (!hasSelectedMode || hasSelectedMode === "pending_integration")) {

        // Check if user has imported data or connected integrations
        const orgId = await getUserOrgId()
        if (orgId) {
          const hasData = await checkUserHasData(orgId)
          if (hasData) {
            // User has data - mark integration complete and go directly to dashboard
            localStorage.setItem("finapilot_mode_selected", "true")
            localStorage.removeItem("finapilot_demo_mode")
            setShowLanding(false)
            setShowPostLoginOptions(false)
            setShowOnboarding(false)
            setDemoMode(false)
            // Respect hash if present, otherwise go to overview
            setActiveView(currentHash || "overview")
            return
          }
        }

        // If pending_integration and no data and no hash, show integrations page
        // BUT ONLY if there's no hash (user not on a specific page)
        if (hasSelectedMode === "pending_integration" && !currentHash) {
          setShowLanding(false)
          setShowPostLoginOptions(false)
          setShowOnboarding(false)
          setDemoMode(false)
          setActiveView("integrations")
          window.location.hash = "#integrations"
          return
        }

        // User doesn't have data and hasn't selected mode - show post-login options
        if (!hasSelectedMode) {
          setShowLanding(false)
          setShowOnboarding(false)
          setShowPostLoginOptions(true)
          return
        }

        // If pending_integration but we got here, default to integrations (shouldn't happen, but fallback)
        setShowLanding(false)
        setShowPostLoginOptions(false)
        setShowOnboarding(false)
        setDemoMode(false)
        setActiveView("integrations")
        return
      }

      // If mode is already selected (and not pending integration), go directly to dashboard
      if (hasSelectedMode && hasSelectedMode !== "pending_integration") {
        setShowLanding(false)
        setShowPostLoginOptions(false)
        setShowOnboarding(false)
        const isDemo = isDemoMode()
        setDemoMode(isDemo)
        if (isDemo) {
          resetDemoDataIfNeeded()
        }
        // Respect hash if present, otherwise keep current view
        if (currentHash) {
          const validViews = [
            "overview", "modeling", "budget-actual", "scenarios", "simulations",
            "forecasting", "assistant", "reports", "board-reporting", "investor",
            "users", "integrations", "notifications", "compliance", "pricing",
            "settings", "onboarding", "collaboration", "job-queue", "export-queue"
          ]
          if (validViews.includes(currentHash)) {
            setActiveView(currentHash)
          }
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
    const handleLoginSuccess = async () => {
      const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")
      if (!hasSelectedMode || hasSelectedMode === "pending_integration") {
        // Check if user has data
        const orgId = await getUserOrgId()
        if (orgId) {
          const hasData = await checkUserHasData(orgId)
          if (hasData) {
            // User has data - mark integration complete and skip post-login options
            localStorage.setItem("finapilot_mode_selected", "true")
            localStorage.removeItem("finapilot_demo_mode")
            setShowLanding(false)
            setShowPostLoginOptions(false)
            setShowOnboarding(false)
            setDemoMode(false)
            setActiveView("overview")
            return
          }
        }
        // User doesn't have data - show post-login options
        setShowLanding(false)
        setShowPostLoginOptions(true)
      }
    }

    // Handle hash-based navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash) {
        const validViews = [
          "overview", "modeling", "budget-actual", "scenarios", "simulations",
          "forecasting", "assistant", "reports", "board-reporting", "investor",
          "users", "integrations", "notifications", "compliance", "pricing",
          "settings", "onboarding", "collaboration", "job-queue", "export-queue"
        ]
        if (validViews.includes(hash)) {
          setActiveView(hash)
        }
      }
    }

    // Handle custom navigation events
    const handleNavigateView = (e: CustomEvent<{ view: string }>) => {
      const view = e.detail.view
      setActiveView(view)
      window.location.hash = `#${view}`
    }

    window.addEventListener("signout", handleSignOut)
    window.addEventListener("login-success", handleLoginSuccess)
    window.addEventListener("hashchange", handleHashChange)
    window.addEventListener("navigate-view", handleNavigateView as EventListener)

    // Check initial hash
    handleHashChange()

    return () => {
      window.removeEventListener("signout", handleSignOut)
      window.removeEventListener("login-success", handleLoginSuccess)
      window.removeEventListener("hashchange", handleHashChange)
      window.removeEventListener("navigate-view", handleNavigateView as EventListener)
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
    // Don't set finapilot_mode_selected yet - wait until integration is complete
    localStorage.removeItem("finapilot_demo_mode")
    localStorage.setItem("finapilot_mode_selected", "pending_integration")
    setShowPostLoginOptions(false)
    setShowLanding(false)
    setShowOnboarding(false)
    setDemoMode(false)
    setActiveView("integrations")
    // Update URL hash to match the view
    window.location.hash = "#integrations"
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

  // Views that should show integration banner (excluding integrations page itself)
  const viewsNeedingIntegration = [
    "overview", "modeling", "budget-actual", "scenarios", "simulations",
    "forecasting", "assistant", "reports", "board-reporting", "investor"
  ]

  const shouldShowIntegrationBanner = viewsNeedingIntegration.includes(activeView) && !demoMode

  const renderActiveView = () => {
    const viewComponent = (() => {
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
        case "approvals":
          return <ApprovalManagement />
        case "ledger":
          return <SemanticLedger />
        case "job-queue":
          return <JobQueue />
        case "export-queue":
          return <ExportJobQueue />
        default:
          return <OverviewDashboard />
      }
    })()

    return (
      <>
        {shouldShowIntegrationBanner && (
          <IntegrationRequiredBanner
            onNavigateToIntegrations={() => setActiveView("integrations")}
          />
        )}
        <ErrorBoundary>
          {viewComponent}
        </ErrorBoundary>
      </>
    )
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

  // Handler to update both state and URL hash when view changes
  const handleViewChange = (view: string) => {
    setActiveView(view)
    window.location.hash = `#${view}`
  }

  return (
    <>
      <DashboardLayout activeView={activeView} onViewChange={handleViewChange} demoMode={demoMode}>
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
