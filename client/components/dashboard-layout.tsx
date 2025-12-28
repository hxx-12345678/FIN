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
  Bell,
  Search,
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
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useStagedChanges } from "@/hooks/use-staged-changes"
import { toast } from "sonner"
import { SwitchOrganizationDialog } from "@/components/switch-organization-dialog"
import { API_BASE_URL, getAuthToken } from "@/lib/api-config"

function PendingApprovalsBadge() {
  const { changes } = useStagedChanges("pending")
  const pendingCount = changes.filter((c) => c.status === "pending").length

  if (pendingCount === 0) return null

  return (
    <Button variant="outline" size="icon" className="relative bg-transparent shrink-0" asChild>
      <a href="#assistant" onClick={(e) => {
        e.preventDefault()
        const event = new CustomEvent("navigate", { detail: { view: "assistant", tab: "staged-changes" } })
        window.dispatchEvent(event)
      }}>
        <FileCheck className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
          {pendingCount}
        </span>
      </a>
    </Button>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
  activeView: string
  onViewChange: (view: string) => void
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
    badge: "AI",
  },
  {
    title: "Real-time Simulations",
    icon: Activity,
    key: "simulations",
    badge: "Live",
  },
  {
    title: "Job Queue",
    icon: Activity,
    key: "job-queue",
    badge: null,
  },
  {
    title: "AI Forecasting",
    icon: Brain,
    key: "forecasting",
    badge: "AI",
  },
  {
    title: "AI CFO Assistant",
    icon: MessageSquare,
    key: "assistant",
    badge: null,
  },
  {
    title: "Reports & Analytics",
    icon: FileText,
    key: "reports",
    badge: null,
  },
  {
    title: "Board Reporting",
    icon: Briefcase,
    key: "board-reporting",
    badge: null,
  },
  {
    title: "Export Queue",
    icon: FileText,
    key: "export-queue",
    badge: null,
  },
  {
    title: "Investor Dashboard",
    icon: PieChart,
    key: "investor",
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
  {
    title: "Notifications",
    icon: Bell,
    key: "notifications",
  },
  {
    title: "Compliance",
    icon: Shield,
    key: "compliance",
  },
  {
    title: "Pricing & Billing",
    icon: CreditCard,
    key: "pricing",
  },
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
    orgs: Array<{
      id: string
      name: string
      role: string
      planTier?: string
    }>
  } | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [showSwitchOrgDialog, setShowSwitchOrgDialog] = useState(false)
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          setLoadingUser(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired, clear and redirect
            localStorage.removeItem("auth-token")
            localStorage.removeItem("refresh-token")
            localStorage.removeItem("orgId")
            window.location.href = "/"
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
      const token = getAuthToken()

      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          })
        } catch (error) {
          // Continue with logout even if backend call fails
          console.error("Logout API call failed:", error)
        }
      }

      // Clear all auth data
      localStorage.removeItem("auth-token")
      localStorage.removeItem("refresh-token")
      localStorage.removeItem("orgId")
      localStorage.removeItem("finapilot_has_visited")
      localStorage.removeItem("finapilot_onboarding_complete")
      
      // Clear cookies
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

      toast.success("Signed out successfully")
      
      // Dispatch custom event to reset app state and show landing page
      // This avoids full page reload and works with component-based routing
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("signout", { detail: {} }))
        // Fallback: reload if event listener not set up
        window.location.href = "/"
      }, 300)
    } catch (error) {
      console.error("Sign out error:", error)
      toast.error("Failed to sign out. Please try again.")
      setIsSigningOut(false)
    }
  }

  const handleSwitchOrg = () => {
    setShowSwitchOrgDialog(true)
  }

  const handleBillingUsage = () => {
    onViewChange("pricing")
  }

  const handleAccountSettings = () => {
    onViewChange("settings")
  }

  const handleMFA = () => {
    onViewChange("settings")
    // Could dispatch event to open MFA tab in settings
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-settings-tab", { detail: { tab: "security" } }))
    }, 100)
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
          className="fixed top-4 left-4 z-50 bg-background shadow-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shrink-0">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FinaPilot
                </span>
                <span className="text-xs text-muted-foreground">AI Financial Copilot</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
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

          <div className="border-t p-2">
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
                  <DropdownMenuItem onClick={handleBillingUsage}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing & Usage
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleMFA}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>MFA Enabled</span>
                    <Badge variant="default" className="ml-auto text-xs">Active</Badge>
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
      </div>

      <div
        ref={mainContentRef}
        className={`
          flex-1 flex flex-col min-h-screen
          ${isMobile ? "w-full" : "w-full"}
          transition-all duration-300 ease-in-out
        `}
        onClick={handleMainContentClick}
      >
        <header
          className={`
          flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6 
          bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
          ${isMobile ? "pl-16" : "pl-6"}
        `}
        >
          {demoMode && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
              <span className="text-xs font-semibold text-purple-700">Demo Company</span>
            </div>
          )}
          <div className="flex flex-1 items-center gap-4 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search or ask AI CFO anything..." className="pl-10 bg-background" />
            </div>
            <Button variant="outline" size="icon" className="relative bg-transparent shrink-0">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
            </Button>
            <PendingApprovalsBadge />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50/50">
          <div className="h-full w-full p-4 md:p-6">{children}</div>
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
