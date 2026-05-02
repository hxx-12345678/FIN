"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Brain,
  Building2,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  PieChart,
  Settings,
  TrendingUp,
  Users,
  Zap,
  Target,
  MessageSquare,
  Shield,
  Activity,
  Briefcase,
  BookOpen,
  Layers,
  Menu,
  X,
  FileCheck,
  LogOut,
  Loader2,
  ShieldCheck,
  Database,
  Bell,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useStagedChanges } from "@/hooks/use-staged-changes"
import { toast } from "sonner"
import { SwitchOrganizationDialog } from "@/components/switch-organization-dialog"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"
import { useModel } from "@/lib/model-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeView: string
  onViewChange: (view: string, tab?: string) => void
  demoMode?: boolean
}

const navigationItems = [
  {
    title: "Overview",
    icon: Home,
    key: "overview",
    badge: null,
  },
  {
    title: "Financial Modeling",
    icon: BarChart3,
    key: "modeling",
    badge: null,
  },
  {
    title: "Budget vs Actual",
    icon: Target,
    key: "budget-actual",
    badge: null,
  },
  {
    title: "Scenario Planning",
    icon: TrendingUp,
    key: "scenarios",
    badge: null,
  },
  {
    title: "Real-time Simulations",
    icon: Activity,
    key: "simulations",
    badge: null,
  },
  {
    title: "AI CFO Assistant",
    icon: MessageSquare,
    key: "assistant",
    badge: null,
  },
  {
    title: "Forecasting",
    icon: Brain,
    key: "forecasting",
    badge: null,
  },
  {
    title: "Governance & Approvals",
    icon: ShieldCheck,
    key: "approvals",
    badge: null,
  },
  {
    title: "Semantic Ledger",
    icon: Database,
    key: "ledger",
    badge: null,
  },
  {
    title: "Board Reporting",
    icon: Briefcase,
    key: "board-reporting",
    badge: null,
  },
  {
    title: "Reports & Analytics",
    icon: FileText,
    key: "reports",
    badge: null,
  },
  {
    title: "Investor Dashboard",
    icon: PieChart,
    key: "investor",
    badge: null,
  },

  {
    title: "Export Queue",
    icon: FileText,
    key: "export-queue",
    badge: null,
  },
  {
    title: "Job Queue",
    icon: Activity,
    key: "job-queue",
    badge: null,
  },
]

const managementItems = [
  {
    title: "User Management",
    icon: Users,
    key: "users",
  },
  {
    title: "Integrations",
    icon: Zap,
    key: "integrations",
  },
  // Notifications removed - not currently functional
  // {
  //   title: "Compliance",
  //   icon: Shield,
  //   key: "compliance",
  // },
  {
    title: "Settings",
    icon: Settings,
    key: "settings",
  },
]

const quickAccessItems = [
  {
    title: "Onboarding",
    icon: BookOpen,
    key: "onboarding",
  },
  {
    title: "Collaboration",
    icon: Layers,
    key: "collaboration",
  },
]

export function DashboardLayout({ children, activeView, onViewChange, demoMode = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // User data state
  const [userData, setUserData] = useState<{
    id: string
    name: string | null
    email: string
    mfaEnabled?: boolean
    orgs: Array<{
      id: string
      name: string
      role: string
      planTier?: string
    }>
  } | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [showSwitchOrgDialog, setShowSwitchOrgDialog] = useState(false)
  const { selectedModelId, setSelectedModelId, orgId: contextOrgId, setOrgId: setContextOrgId } = useModel()
  const [models, setModels] = useState<any[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(contextOrgId)
  
  // Notification toast state
  const [activeNotificationToast, setActiveNotificationToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: string;
  } | null>(null)
  const [showNotificationToast, setShowNotificationToast] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired, clear and redirect cleanly
            localStorage.removeItem("auth-token")
            localStorage.removeItem("refresh-token")
            localStorage.removeItem("orgId")
            localStorage.removeItem("is-logged-in")
            localStorage.removeItem("finapilot_mode_selected")
            window.history.replaceState(null, "", "/")
            window.location.reload()
            return
          }
          throw new Error("Failed to fetch user data")
        }

        const data = await response.json()
        setUserData(data)

        // Set current org from localStorage or first org
        const storedOrgId = localStorage.getItem("orgId")
        if (storedOrgId && data.orgs?.some((org: any) => org.id === storedOrgId)) {
          setCurrentOrgId(storedOrgId)
        } else if (data.orgs && data.orgs.length > 0) {
          setCurrentOrgId(data.orgs[0].id)
          localStorage.setItem("orgId", data.orgs[0].id)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load user data")
      } finally {
        setLoadingUser(false)
      }
    }

    fetchUserData()
  }, [])

  const fetchModels = async (orgId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/models`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.models) {
          setModels(result.models)
          // If no model is selected globally, select the first one
          if (!selectedModelId && result.models.length > 0) {
            setSelectedModelId(result.models[0].id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching models:", error)
    }
  }

  useEffect(() => {
    if (currentOrgId) {
      fetchModels(currentOrgId)
      setContextOrgId(currentOrgId)
    }
  }, [currentOrgId])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 50 && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => document.removeEventListener("mousemove", handleMouseMove)
  }, [isMobile, sidebarOpen])

  // ── High-priority alert notification polling (60 s) ──────────────────────
  const lastPollTimeRef = useRef<number>(0)
  const isPollingRef = useRef<boolean>(false)

  useEffect(() => {
    if (!currentOrgId || !userData) return

    const pollNotifications = async () => {
      // Prevent overlapping polls or spamming during re-renders
      if (isPollingRef.current || Date.now() - lastPollTimeRef.current < 10000) return
      
      isPollingRef.current = true
      try {
        const res = await fetch(
          `${API_BASE_URL}/orgs/${currentOrgId}/notifications?read=false&limit=10`,
          { headers: getAuthHeaders(), credentials: "include" }
        )
        if (!res.ok) return
        const result = await res.json()
        if (!result.ok || !result.data) return

        const newCount = result.data.filter((n: any) => !n.read).length
        setNotificationCount(newCount)

        if (result.data.length > 0) {
          const latest = result.data[0]
          
          const seenIds = JSON.parse(sessionStorage.getItem("fina_seen_notifs") || "[]")
          if (!seenIds.includes(latest.id)) {
            setActiveNotificationToast(latest)
            setShowNotificationToast(true)
            
            setTimeout(() => {
              setShowNotificationToast(false)
            }, 5000)
            
            sessionStorage.setItem("fina_seen_notifs", JSON.stringify([...seenIds, latest.id]))
          }
        }
        lastPollTimeRef.current = Date.now()
      } catch (err) {
        console.error("[Notification Poll] error:", err)
      } finally {
        isPollingRef.current = false
      }
    }

    // Initial poll
    pollNotifications()
    
    // Slower interval for institutional stability
    const timer = setInterval(pollNotifications, 60_000)
    return () => clearInterval(timer)
  }, [currentOrgId, userData])

  const handleMainContentClick = () => {
    if (sidebarOpen && !isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleNavClick = (key: string) => {
    onViewChange(key)
    // Update URL hash to maintain component on refresh
    window.location.hash = `#${key}`
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // Call backend logout endpoint
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        })
      } catch (error) {
        // Continue with logout even if backend call fails
        console.error("Logout API call failed:", error)
      }

      // Clear all auth data
      localStorage.removeItem("auth-token")
      localStorage.removeItem("refresh-token")
      localStorage.removeItem("orgId")
      localStorage.removeItem("finapilot_has_visited")
      localStorage.removeItem("finapilot_onboarding_complete")
      localStorage.removeItem("is-logged-in")
      localStorage.removeItem("userId")

      localStorage.removeItem("finapilot_active_view")
      localStorage.removeItem("finapilot_mode_selected")

      // Clear cookies by triggering an expiration
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

      toast.success("Signed out successfully")

      // Immediately clear URL history and push to /
      window.history.replaceState(null, "", "/")

      // Dispatch custom event to reset app state and show landing page
      window.dispatchEvent(new CustomEvent("signout", { detail: {} }))
    } catch (error) {
      console.error("Sign out error:", error)
      toast.error("Failed to sign out. Please try again.")
      setIsSigningOut(false)
    }
  }

  const handleSwitchOrg = () => {
    setShowSwitchOrgDialog(true)
  }

  const handleContactSales = () => {
    window.location.href = "mailto:sales@finapilot.com?subject=FinaPilot%20Enterprise%20Inquiry"
  }

  const handleAccountSettings = () => {
    onViewChange("settings")
  }

  const handleMFA = () => {
    // Open settings page specifically on the security tab for MFA management
    onViewChange("settings", "security")
  }

  // Get current organization
  const currentOrg = userData?.orgs?.find((org) => org.id === currentOrgId)

  // Get user initials for avatar
  const getUserInitials = () => {
    if (userData?.name) {
      const parts = userData.name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return userData.name.substring(0, 2).toUpperCase()
    }
    if (userData?.email) {
      return userData.email.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-[100] bg-white shadow-xl border-2 border-primary/20 hover:border-primary/50 transition-all rounded-xl"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-primary" />}
        </Button>
      )}

      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        ref={sidebarRef}
        className={`
          ${isMobile ? "fixed" : "fixed"} 
          top-0 left-0 h-full z-40 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${isMobile ? "w-80" : "w-64"}
          bg-background border-r shadow-lg
        `}
      >
        <div className="flex flex-col h-full">
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shrink-0 overflow-hidden relative group transition-all hover:scale-105">
                <img
                  src="/icon.svg"
                  alt="FinaPilot Logo"
                  className="w-8 h-8"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    FinaPilot
                  </span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 font-black border-blue-200 text-blue-600 bg-blue-50/50">V1.0 pro</Badge>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Finance OS</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Core Features</h3>
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeView === item.key ? "default" : "ghost"}
                    className="w-full justify-start h-10"
                    onClick={() => handleNavClick(item.key)}
                  >
                    <item.icon className="h-4 w-4 mr-3 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Management</h3>
              <div className="space-y-1">
                {managementItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeView === item.key ? "default" : "ghost"}
                    className="w-full justify-start h-10"
                    onClick={() => handleNavClick(item.key)}
                  >
                    <item.icon className="h-4 w-4 mr-3 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Quick Access</h3>
              <div className="space-y-1">
                {quickAccessItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeView === item.key ? "default" : "ghost"}
                    className="w-full justify-start h-10"
                    onClick={() => handleNavClick(item.key)}
                  >
                    <item.icon className="h-4 w-4 mr-3 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {activeNotificationToast && (
            <div className={`mt-auto pt-6 border-t border-sidebar-border/50 px-4 mb-4 transition-all duration-700 ${showNotificationToast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none h-0 p-0 m-0'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${activeNotificationToast.type === 'alert' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                    <Zap className={`h-3.5 w-3.5 ${activeNotificationToast.type === 'alert' ? 'text-red-400' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white leading-tight uppercase tracking-widest">New Intelligence</p>
                    <p className="text-[9px] text-sidebar-foreground/50 font-bold">Anomaly detected</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-xl border ${activeNotificationToast.type === 'alert' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'} backdrop-blur-sm`}>
                <p className="text-[10px] font-bold text-sidebar-foreground mb-1 line-clamp-2 leading-relaxed">
                  {activeNotificationToast.message}
                </p>
                <button 
                  onClick={() => {
                    onViewChange('notifications');
                    setNotificationCount(0);
                    setActiveNotificationToast(null);
                  }}
                  className="flex items-center text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                >
                  Investigate
                  <Activity className="ml-1 h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          )}
            
            {loadingUser ? (
              <div className="flex items-center gap-2 p-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-2 flex flex-col items-start min-w-0 flex-1">
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm font-medium truncate">
                          {userData.name || userData.email.split("@")[0]}
                        </span>
                        {currentOrg && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {currentOrg.role.charAt(0).toUpperCase() + currentOrg.role.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {currentOrg?.name || "No organization"}
                      </span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleSwitchOrg}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Switch Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleContactSales}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Contact Sales
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleMFA} className="cursor-pointer group">
                    <Shield className="mr-2 h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="flex-1">MFA Security</span>
                    {userData?.mfaEnabled ? (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-500 bg-emerald-500/5 uppercase font-black">Active</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 text-slate-500 border-slate-200 uppercase font-black">Disabled</Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAccountSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="text-sm text-muted-foreground p-2">Not logged in</div>
            )}
          </div>
        </div>

      <div
        ref={mainContentRef}
        className={`
          flex-1 flex flex-col min-h-screen max-w-full
          transition-all duration-300 ease-in-out
        `}
        onClick={handleMainContentClick}
      >
        <header
          className={`
          flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 md:px-6 
          bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
          ${isMobile ? "pl-16" : "pl-6"}
          w-full max-w-full overflow-hidden
        `}
        >
          {demoMode && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
              <span className="text-xs font-semibold text-purple-700">Demo Company</span>
            </div>
          )}
          <div className="flex flex-1 items-center gap-4 min-w-0">
            {models.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Active Model:</span>
                <Select
                  value={selectedModelId || undefined}
                  onValueChange={(value) => setSelectedModelId(value)}
                >
                  <SelectTrigger className="w-[180px] md:w-[240px] h-9 border-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-slate-100 transition-colors"
              onClick={() => handleNavClick("notifications")}
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {notificationCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition-colors ${notificationCount > 5 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 w-full">
          <div className="mx-auto w-full max-w-full p-4 md:p-6 overflow-x-hidden">{children}</div>
        </main>
      </div>

      {!isMobile && (
        <div className="fixed left-0 top-0 w-2 h-full z-20 cursor-pointer" onMouseEnter={() => setSidebarOpen(true)} />
      )}

      {userData && (
        <SwitchOrganizationDialog
          open={showSwitchOrgDialog}
          onOpenChange={setShowSwitchOrgDialog}
          organizations={userData.orgs || []}
          currentOrgId={currentOrgId}
          onSwitchComplete={() => {
            // Refresh user data after switch
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
