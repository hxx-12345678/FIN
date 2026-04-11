"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { ModelProvider } from "@/lib/model-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import dynamic from "next/dynamic"

// Dynamic imports for major components to optimize build time and loading
const OverviewDashboard = dynamic(() => import("@/components/overview-dashboard").then(mod => mod.OverviewDashboard), {
  loading: () => <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
})
const FinancialModeling = dynamic(() => import("@/components/financial-modeling").then(mod => mod.FinancialModeling), {
  loading: () => <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
})
const BudgetActual = dynamic(() => import("@/components/budget-actual").then(mod => mod.BudgetActual))
const ScenarioPlanning = dynamic(() => import("@/components/scenario-planning").then(mod => mod.ScenarioPlanning))
const RealtimeSimulations = dynamic(() => import("@/components/realtime-simulations").then(mod => mod.RealtimeSimulations))
const AIForecasting = dynamic(() => import("@/components/ai-forecasting").then(mod => mod.AIForecasting))
const AIAssistant = dynamic(() => import("@/components/ai-assistant").then(mod => mod.AIAssistant))
const ReportsAnalytics = dynamic(() => import("@/components/reports-analytics").then(mod => mod.ReportsAnalytics))
const BoardReporting = dynamic(() => import("@/components/board-reporting").then(mod => mod.BoardReporting))
const InvestorDashboard = dynamic(() => import("@/components/investor-dashboard").then(mod => mod.InvestorDashboard))
const UserManagement = dynamic(() => import("@/components/user-management").then(mod => mod.UserManagement))
const IntegrationsPage = dynamic(() => import("@/components/integrations-page").then(mod => mod.IntegrationsPage))
const NotificationsPage = dynamic(() => import("@/components/notifications-page").then(mod => mod.NotificationsPage))
const CompliancePage = dynamic(() => import("@/components/compliance-page").then(mod => mod.CompliancePage))
const SettingsPage = dynamic(() => import("@/components/settings-page").then(mod => mod.SettingsPage))
const OnboardingPage = dynamic(() => import("@/components/onboarding-page").then(mod => mod.OnboardingPage))
const CollaborationPage = dynamic(() => import("@/components/collaboration-page").then(mod => mod.CollaborationPage))
const ApprovalManagement = dynamic(() => import("@/components/approval-management").then(mod => mod.ApprovalManagement))
const SemanticLedger = dynamic(() => import("@/components/semantic-ledger").then(mod => mod.SemanticLedger))
const ConsolidationPage = dynamic(() => import("@/components/consolidation-page").then(mod => mod.ConsolidationPage))
const HeadcountPlanningPage = dynamic(() => import("@/components/headcount-planning-page").then(mod => mod.HeadcountPlanningPage))
const DemoModeOnboarding = dynamic(() => import("@/components/demo-mode-onboarding").then(mod => mod.DemoModeOnboarding))
const DemoModeBanner = dynamic(() => import("@/components/demo-mode-banner").then(mod => mod.DemoModeBanner))
const UpgradeToRealModal = dynamic(() => import("@/components/upgrade-to-real-modal").then(mod => mod.UpgradeToRealModal))
const JobQueue = dynamic(() => import("@/components/jobs/job-queue").then(mod => mod.JobQueue))
const ExportJobQueue = dynamic(() => import("@/components/exports/export-job-queue").then(mod => mod.ExportJobQueue))

import { isDemoMode, resetDemoDataIfNeeded } from "@/lib/demo-data-generator"
import { checkUserHasData, getUserOrgId } from "@/lib/user-data-check"
import { ErrorBoundary } from "@/components/error-boundary"

import { OrgProvider } from "@/lib/org-context"

export default function HomePage() {
  return (
    <OrgProvider>
      <ModelProvider>
        <HomePageContent />
      </ModelProvider>
    </OrgProvider>
  )
}

function HomePageContent() {
  // Initialize with null to indicate "checking auth" and prevent landing page flash
  const [showLanding, setShowLanding] = useState<boolean | null>(null)
  const [activeView, setActiveViewState] = useState(() => {
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash.replace("#", "")
      const validViews = [
        "overview", "modeling", "budget-actual", "scenarios", "simulations",
        "forecasting", "assistant", "reports", "board-reporting", "investor",
        "users", "integrations", "notifications", "compliance", "settings", 
        "onboarding", "collaboration", "job-queue", "export-queue", "approvals", 
        "ledger", "consolidation", "headcount"
      ]
      if (currentHash && validViews.includes(currentHash)) {
        return currentHash
      }
      try {
        const savedView = localStorage.getItem("finapilot_active_view")
        if (savedView && validViews.includes(savedView)) {
          return savedView
        }
      } catch (_e) {}
    }
    return "overview"
  })

  // Wrapper to persist activeView to localStorage
  const setActiveView = (view: string) => {
    setActiveViewState(view)
    try { localStorage.setItem("finapilot_active_view", view) } catch (_e) { /* ignore */ }
  }
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // State to persist tabs per view
  const [viewTabs, setViewTabs] = useState<Record<string, string>>({})

  // Handler to update both state and URL hash when view changes
  const handleViewChange = (view: string, tab?: string) => {
    // Save current tab before switching
    const currentParams = new URLSearchParams(window.location.search)
    const currentTab = currentParams.get("tab")

    if (currentTab) {
      setViewTabs(prev => ({ ...prev, [activeView]: currentTab }))
    }

    setActiveView(view)
    window.location.hash = `#${view}`

    // Restore tab for the next view if it exists
    const nextTab = tab || viewTabs[view]
    const nextParams = new URLSearchParams(window.location.search)

    if (nextTab) {
      nextParams.set("tab", nextTab)
    } else {
      nextParams.delete("tab")
    }

    const newSearch = nextParams.toString()
    const newUrl = `${window.location.pathname}${newSearch ? "?" + newSearch : ""}${window.location.hash}`
    window.history.replaceState({}, "", newUrl)
  }

  useEffect(() => {
    // CRITICAL: Check hash and auth synchronously FIRST to prevent landing page flash
    // This runs only on client side, preventing hydration mismatch
    const currentHash = window.location.hash.replace("#", "")
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get("tab")
    const authToken = localStorage.getItem("auth-token") || localStorage.getItem("is-logged-in")

    const validViews = [
      "overview", "modeling", "budget-actual", "scenarios", "simulations",
      "forecasting", "assistant", "reports", "board-reporting", "investor",
      "users", "integrations", "notifications", "compliance",
      "settings", "onboarding", "collaboration", "job-queue", "export-queue",
      "approvals", "ledger", "consolidation", "headcount"
    ]

    // If user has auth token, NEVER show landing page
    if (authToken) {
      setShowLanding(false)

      // If there's a valid hash, set view immediately
      if (currentHash && validViews.includes(currentHash)) {
        setActiveView(currentHash)
      } else if (tabParam && validViews.includes(tabParam)) {
        // Fallback: check query param if hash is missing (UX improvement for refreshes)
        setActiveView(tabParam)
        window.location.hash = `#${tabParam}`
      } else {
        // Fallback: recover from localStorage (e.g. hard refresh with no hash)
        const savedView = localStorage.getItem("finapilot_active_view")
        if (savedView && validViews.includes(savedView)) {
          setActiveView(savedView)
          window.location.hash = `#${savedView}`
        }
      }
    } else {
      // Defer showing landing to avoid React state flashes if currently animating out
      setTimeout(() => setShowLanding(true), 0)
    }

    const checkAuthAndState = async () => {
      const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")

      // If no auth token, ALWAYS show landing page regardless of hash
      if (!authToken) {
        setTimeout(() => setShowLanding(true), 0)
        setShowOnboarding(false)
        setDemoMode(false)

        // Actively strip any hashes or search params so the user sees a clean '/'
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, "", "/")
        }

        return
      }

      // CRITICAL: Check hash FIRST before any redirect logic - if user has a valid hash, respect it
      // This prevents redirecting to integrations when user is on another component
      const validViews = [
        "overview", "modeling", "budget-actual", "scenarios", "simulations",
        "forecasting", "assistant", "reports", "board-reporting", "investor",
        "users", "integrations", "notifications", "compliance", "pricing",
        "settings", "onboarding", "collaboration", "job-queue", "export-queue",
        "approvals", "ledger", "consolidation", "headcount"
      ]

      // Determine the effective view from hash, tab param, or localStorage
      const effectiveView = (currentHash && validViews.includes(currentHash)) ? currentHash
        : (tabParam && validViews.includes(tabParam)) ? tabParam
          : (localStorage.getItem("finapilot_active_view") && validViews.includes(localStorage.getItem("finapilot_active_view")!)) ? localStorage.getItem("finapilot_active_view")
            : null

      if (effectiveView) {
        // User is on a specific view - ALWAYS respect it, don't redirect
        setShowLanding(false)
        setShowOnboarding(false)
        setDemoMode(false)
        setActiveView(effectiveView)
        if (!currentHash) window.location.hash = `#${effectiveView}`
        return // CRITICAL: Return early to prevent any redirect logic
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
            setShowOnboarding(false)
            setDemoMode(false)
            // Respect hash if present, otherwise go to overview
            // Respect recovered view or hash, otherwise go to overview
            setActiveView(effectiveView || currentHash || "overview")
            return
          }
        }

        // If pending_integration and no data and no hash, show integrations page
        // BUT ONLY if there's no hash (user not on a specific page)
        if (hasSelectedMode === "pending_integration" && !currentHash) {
          setShowLanding(false)
          setShowOnboarding(false)
          setDemoMode(false)
          setActiveView("integrations")
          window.location.hash = "#integrations"
          return
        }

        // No mode selected and no data - default to integrations
        if (!hasSelectedMode) {
          setShowLanding(false)
          setShowOnboarding(false)
          setDemoMode(false)
          setActiveView("integrations")
          window.location.hash = "#integrations"
          return
        }

        // If pending_integration but we got here, default to integrations (shouldn't happen, but fallback)
        setShowLanding(false)
        setShowOnboarding(false)
        setDemoMode(false)
        setActiveView("integrations")
        return
      }

      // If mode is already selected (and not pending integration), go directly to dashboard
      if (hasSelectedMode && hasSelectedMode !== "pending_integration") {
        setShowLanding(false)
        setShowOnboarding(false)
        setDemoMode(false)
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
            "settings", "onboarding", "collaboration", "job-queue", "export-queue",
            "approvals", "ledger", "consolidation", "headcount"
          ]
          if (validViews.includes(currentHash)) {
            setActiveView(currentHash || effectiveView || "overview")
          }
        }
      }
    }

    checkAuthAndState()

    // Listen for signout event
    const handleSignOut = () => {
      setShowLanding(true)
      setShowOnboarding(false)
      setDemoMode(false)
      setActiveView("overview")

      // Clear localStorage
      localStorage.removeItem("finapilot_mode_selected")
      localStorage.removeItem("finapilot_has_visited")
      localStorage.removeItem("finapilot_onboarding_complete")
      localStorage.removeItem("is-logged-in")
      localStorage.removeItem("userId")
      localStorage.removeItem("finapilot_active_view")

      // Remove hash and search params from URL and force standard reload for clean slate
      window.history.replaceState(null, "", "/")
      window.location.reload()
    }

    const handleSignupSuccess = () => {
      // First time signup -> must go to integrations
      localStorage.setItem("finapilot_mode_selected", "pending_integration")
      localStorage.removeItem("finapilot_demo_mode")
      setShowLanding(false)
      setShowOnboarding(false)
      setDemoMode(false)
      setActiveView("integrations")
      window.location.hash = "#integrations"
    }

    const handleLoginSuccess = async () => {
      // Any normal login -> go to overview
      localStorage.setItem("finapilot_mode_selected", "true")
      localStorage.removeItem("finapilot_demo_mode")
      setShowLanding(false)
      setShowOnboarding(false)
      setDemoMode(false)
      setActiveView("overview")
      window.location.hash = "#overview"
    }

    // Handle hash-based navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash) {
        const validViews = [
          "overview", "modeling", "budget-actual", "scenarios", "simulations",
          "forecasting", "assistant", "reports", "board-reporting", "investor",
          "users", "integrations", "notifications", "compliance", "pricing",
          "settings", "onboarding", "collaboration", "job-queue", "export-queue",
          "approvals", "ledger", "consolidation", "headcount"
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
    window.addEventListener("signup-success", handleSignupSuccess)
    window.addEventListener("hashchange", handleHashChange)
    window.addEventListener("navigate-view", handleNavigateView as EventListener)

    // Check initial hash
    handleHashChange()

    return () => {
      window.removeEventListener("signout", handleSignOut)
      window.removeEventListener("login-success", handleLoginSuccess)
      window.removeEventListener("signup-success", handleSignupSuccess)
      window.removeEventListener("hashchange", handleHashChange)
      window.removeEventListener("navigate-view", handleNavigateView as EventListener)
    }
  }, [])

  const handleGetStarted = () => {
    // When clicking "Get Started" from landing page, check if user is logged in
    const authToken = localStorage.getItem("auth-token") || localStorage.getItem("is-logged-in")
    const hasSelectedMode = localStorage.getItem("finapilot_mode_selected")

    if (authToken && !hasSelectedMode) {
      // If logged in but hasn't selected mode, show integrations
      setShowLanding(false)
      setActiveView("integrations")
      window.location.hash = "#integrations"
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
        case "consolidation":
          return <ConsolidationPage />
        case "headcount":
          return <HeadcountPlanningPage />
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

        <ErrorBoundary>
          {viewComponent}
        </ErrorBoundary>
      </>
    )
  }

  // Return a blank page while auth status is being determined to avoid landing page flash
  if (showLanding === null) {
    return <div className="fixed inset-0 bg-white z-[9999]" />
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  // Show onboarding for users who clicked "Get Started"
  if (showOnboarding) {
    return <DemoModeOnboarding onComplete={handleOnboardingComplete} />
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
