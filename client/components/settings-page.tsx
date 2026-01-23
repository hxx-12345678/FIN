"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  User,
  Building2,
  Palette,
  Bell,
  Shield,
  Globe,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
} from "lucide-react"
import { AlertsManagement } from "./alerts-management"
import { LocalizationSettings } from "./localization-settings"
import { SyncAuditLog } from "./sync-audit-log"
import { MFASetupWizard } from "./auth/mfa-setup-wizard"
import { SessionManagement } from "./auth/session-management"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api-config"

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("auth-token")
  if (token) return token
  const cookies = document.cookie.split("; ")
  const authCookie = cookies.find((row) => row.startsWith("auth-token="))
  if (authCookie) {
    return authCookie.split("=")[1]
  }
  return null
}

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

function MFASetupButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setOpen(true)}>
        Configure
      </Button>
      <MFASetupWizard open={open} onClose={() => setOpen(false)} onComplete={() => setOpen(false)} />
    </>
  )
}

function SessionManagementButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setOpen(true)}>
        Manage Sessions
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4" onClick={() => setOpen(false)}>
          <div className="max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg" onClick={(e) => e.stopPropagation()}>
            <SessionManagement />
          </div>
        </div>
      )}
    </>
  )
}

export function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "profile"
  
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
    bio: "",
    timezone: "UTC",
  })
  
  // Organization state
  const [organization, setOrganization] = useState<any>({
    name: "",
    industry: "",
    companySize: "",
    website: "",
    address: "",
    taxId: "",
    currency: "USD",
    dataRetentionDays: 365,
  })
  
  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: "light" as "light" | "dark" | "auto",
    themeColor: "blue",
    fontSize: "medium" as "small" | "medium" | "large",
    dateFormat: "MM/DD/YYYY",
    animations: true,
  })
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    alertNotifications: true,
    marketingEmails: false,
  })
  
  // Localization state
  const [localization, setLocalization] = useState({
    language: "en",
    currency: "USD",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    numberFormat: "1,234.56",
  })
  
  // Security state
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  
  // Sync audit state
  const [syncAuditLog, setSyncAuditLog] = useState<any[]>([])
  const [loadingSyncLog, setLoadingSyncLog] = useState(false)

  // Fetch orgId
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          if (data.orgs && data.orgs.length > 0) {
            setOrgId(data.orgs[0].id)
          }
        }
      } catch (error) {
        console.error("Failed to fetch orgId:", error)
      }
    }
    fetchOrgId()
  }, [])

  // Fetch all settings data
  useEffect(() => {
    if (orgId) {
      fetchAllData()
    }
  }, [orgId])

  const fetchAllData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      await Promise.all([
        fetchProfile(),
        fetchOrganization(),
        fetchAppearance(),
        fetchNotificationPreferences(),
        fetchLocalization(),
        fetchApiKey(),
      ])
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setProfile({
            name: data.data.name || "",
            email: data.data.email || "",
            phone: data.data.phone || "",
            jobTitle: data.data.jobTitle || "",
            bio: data.data.bio || "",
            timezone: data.data.timezone || "UTC",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }

  const fetchOrganization = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setOrganization({
            name: data.data.name || "",
            industry: data.data.industry || "",
            companySize: data.data.companySize || "",
            website: data.data.website || "",
            address: data.data.address || "",
            taxId: data.data.taxId || "",
            currency: data.data.currency || "USD",
            dataRetentionDays: data.data.dataRetentionDays || 365,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch organization:", error)
    }
  }

  const fetchAppearance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/appearance`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setAppearance({
            theme: data.data.theme || "light",
            themeColor: data.data.themeColor || "blue",
            fontSize: data.data.fontSize || "medium",
            dateFormat: data.data.dateFormat || "MM/DD/YYYY",
            animations: data.data.animations !== undefined ? data.data.animations : true,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch appearance:", error)
    }
  }

  const fetchNotificationPreferences = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/preferences`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setNotificationPrefs({
            emailNotifications: data.data.emailNotifications !== undefined ? data.data.emailNotifications : true,
            pushNotifications: data.data.pushNotifications !== undefined ? data.data.pushNotifications : true,
            weeklyDigest: data.data.weeklyDigest !== undefined ? data.data.weeklyDigest : true,
            alertNotifications: data.data.alertNotifications !== undefined ? data.data.alertNotifications : true,
            marketingEmails: data.data.marketingEmails !== undefined ? data.data.marketingEmails : false,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error)
    }
  }

  const fetchLocalization = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setLocalization({
            language: data.data.language || "en",
            currency: data.data.currency || "USD",
            timezone: data.data.timezone || "UTC",
            dateFormat: data.data.dateFormat || "MM/DD/YYYY",
            numberFormat: data.data.numberFormat || "1,234.56",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch localization:", error)
    }
  }

  const fetchApiKey = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/api-key`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setApiKey(data.data.apiKey || "")
        }
      }
    } catch (error) {
      console.error("Failed to fetch API key:", error)
    }
  }

  const fetchSyncAuditLog = async () => {
    if (!orgId) return
    setLoadingSyncLog(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/sync-audit?limit=50`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setSyncAuditLog(data.data || [])
        }
      }
    } catch (error) {
      console.error("Failed to fetch sync audit log:", error)
      toast.error("Failed to load sync audit log")
    } finally {
      setLoadingSyncLog(false)
    }
  }

  const handleSaveAll = async () => {
    if (!orgId) return
    setSaving(true)
    const errors: string[] = []
    
    try {
      // Save profile
      try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(profile),
        })
        if (!response.ok) {
          const error = await response.json()
          errors.push(`Profile: ${error.error?.message || "Failed to save"}`)
        }
      } catch (error) {
        errors.push("Profile: Network error")
      }
      
      // Save organization (admin only)
      try {
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(organization),
        })
        if (!response.ok) {
          const error = await response.json()
          // Don't show error if user is not admin
          if (!error.error?.message?.includes("admin")) {
            errors.push(`Organization: ${error.error?.message || "Failed to save"}`)
          }
        }
      } catch (error) {
        errors.push("Organization: Network error")
      }
      
      // Save appearance
      try {
        const response = await fetch(`${API_BASE_URL}/users/appearance`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(appearance),
        })
        if (!response.ok) {
          const error = await response.json()
          errors.push(`Appearance: ${error.error?.message || "Failed to save"}`)
        }
      } catch (error) {
        errors.push("Appearance: Network error")
      }
      
      // Save notification preferences
      try {
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/preferences`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(notificationPrefs),
        })
        if (!response.ok) {
          const error = await response.json()
          errors.push(`Notifications: ${error.error?.message || "Failed to save"}`)
        }
      } catch (error) {
        errors.push("Notifications: Network error")
      }
      
      // Note: Localization is saved separately via LocalizationSettings component's own Save button
      
      if (errors.length > 0) {
        toast.error(`Some settings failed to save: ${errors.join(", ")}`)
      } else {
        toast.success("All settings saved successfully")
        // Refresh data to ensure UI is in sync
        await fetchAllData()
        // Reset initial values after save
        setInitialValues({
          profile: { ...profile },
          organization: { ...organization },
          appearance: { ...appearance },
          notificationPrefs: { ...notificationPrefs },
          localization: { ...localization },
        })
        setHasChanges(false)
      }
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/export-data`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          // Download as JSON file
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `finapilot-export-${new Date().toISOString().split("T")[0]}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success("Data exported successfully")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to export data")
      }
    } catch (error) {
      toast.error("Failed to export data")
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/password/change`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      
      if (response.ok) {
        toast.success("Password changed successfully")
        setShowChangePasswordDialog(false)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to change password")
      }
    } catch (error) {
      toast.error("Failed to change password")
    }
  }

  const handleRegenerateApiKey = async () => {
    if (!orgId) return
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/api-key/regenerate`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setApiKey(data.data.apiKey || "")
          toast.success("API key regenerated successfully")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to regenerate API key")
      }
    } catch (error) {
      toast.error("Failed to regenerate API key")
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure you want to delete your account? This action is permanent and will delete all your personal data in accordance with GDPR Right to Erasure.")) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Account deleted successfully")
        // Clear local storage and redirect to home
        localStorage.removeItem("auth-token")
        localStorage.removeItem("refresh-token")
        localStorage.removeItem("orgId")
        window.location.href = "/"
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to delete account")
      }
    } catch (error) {
      toast.error("Failed to delete account")
    }
  }

  // Track initial values to compare changes
  const [initialValues, setInitialValues] = useState<{
    profile: typeof profile
    organization: typeof organization
    appearance: typeof appearance
    notificationPrefs: typeof notificationPrefs
    localization: typeof localization
  } | null>(null)

  // Set initial values after data is loaded
  useEffect(() => {
    if (!loading && initialValues === null) {
      setInitialValues({
        profile: { ...profile },
        organization: { ...organization },
        appearance: { ...appearance },
        notificationPrefs: { ...notificationPrefs },
        localization: { ...localization },
      })
      setHasChanges(false)
    }
  }, [loading, profile, organization, appearance, notificationPrefs, localization, initialValues])

  // Track changes by comparing current values with initial values
  useEffect(() => {
    if (initialValues === null) {
      setHasChanges(false)
      return
    }

    const hasProfileChanges = JSON.stringify(profile) !== JSON.stringify(initialValues.profile)
    const hasOrgChanges = JSON.stringify(organization) !== JSON.stringify(initialValues.organization)
    const hasAppearanceChanges = JSON.stringify(appearance) !== JSON.stringify(initialValues.appearance)
    const hasNotificationChanges = JSON.stringify(notificationPrefs) !== JSON.stringify(initialValues.notificationPrefs)
    const hasLocalizationChanges = JSON.stringify(localization) !== JSON.stringify(initialValues.localization)

    setHasChanges(hasProfileChanges || hasOrgChanges || hasAppearanceChanges || hasNotificationChanges || hasLocalizationChanges)
  }, [profile, organization, appearance, notificationPrefs, localization, initialValues])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your account and workspace preferences</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-transparent w-full sm:w-auto"
            onClick={handleExportData}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Data</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button 
            size="sm"
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}

      <Tabs 
        value={currentTab} 
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("tab", value)
          router.replace(`?${params.toString()}`, { scroll: false })
        }}
        className="space-y-4 w-full"
      >
        <div className="overflow-x-auto overflow-y-visible -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-full min-w-[600px] md:min-w-0 md:grid md:grid-cols-8 h-auto p-1 gap-1">
            <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Profile</TabsTrigger>
            <TabsTrigger value="organization" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Organization</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Notifications</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Alerts</TabsTrigger>
            <TabsTrigger value="localization" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Localization</TabsTrigger>
            <TabsTrigger value="sync" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Sync Audit</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Security</TabsTrigger>
            <TabsTrigger value="api" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">API</TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback className="text-lg">
                    {profile.name ? profile.name.substring(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="bg-transparent w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input 
                    id="jobTitle" 
                    value={profile.jobTitle}
                    onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={profile.timezone}
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Kolkata">India</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Manage your organization settings and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={organization.name}
                    onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={organization.industry}
                    onValueChange={(value) => setOrganization({ ...organization, industry: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fintech">Financial Technology</SelectItem>
                      <SelectItem value="saas">Software as a Service</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select 
                    value={organization.companySize}
                    onValueChange={(value) => setOrganization({ ...organization, companySize: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input 
                    id="website" 
                    value={organization.website}
                    onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input 
                    id="taxId" 
                    value={organization.taxId}
                    onChange={(e) => setOrganization({ ...organization, taxId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Data Retention (Days) (GDPR)</Label>
                  <Input 
                    id="dataRetention" 
                    type="number"
                    value={organization.dataRetentionDays || 365}
                    onChange={(e) => setOrganization({ ...organization, dataRetentionDays: parseInt(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Automated data deletion after this period</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select 
                    value={organization.currency}
                    onValueChange={(value) => setOrganization({ ...organization, currency: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Company address..."
                  value={organization.address}
                  onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab - COMMENTED OUT */}
        {/* <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>Customize the look and feel of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <Select 
                  value={appearance.theme}
                  onValueChange={(value: "light" | "dark" | "auto") => setAppearance({ ...appearance, theme: value })}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex gap-3">
                  {[
                    { name: "Blue", color: "bg-blue-500", value: "blue" },
                    { name: "Purple", color: "bg-purple-500", value: "purple" },
                    { name: "Green", color: "bg-green-500", value: "green" },
                    { name: "Orange", color: "bg-orange-500", value: "orange" },
                    { name: "Red", color: "bg-red-500", value: "red" },
                  ].map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setAppearance({ ...appearance, themeColor: theme.value })}
                      className={`w-8 h-8 rounded-full ${theme.color} ring-2 ring-offset-2 ${
                        appearance.themeColor === theme.value ? "ring-gray-900" : "ring-transparent"
                      } hover:ring-gray-300`}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontSize">Font Size</Label>
                <Select 
                  value={appearance.fontSize}
                  onValueChange={(value: "small" | "medium" | "large") => setAppearance({ ...appearance, fontSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select 
                  value={appearance.dateFormat}
                  onValueChange={(value) => setAppearance({ ...appearance, dateFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="animations">Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                </div>
                <Switch 
                  id="animations" 
                  checked={appearance.animations}
                  onCheckedChange={(checked) => setAppearance({ ...appearance, animations: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch 
                  id="emailNotifications" 
                  checked={notificationPrefs.emailNotifications}
                  onCheckedChange={(checked) => {
                    setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
                    setHasChanges(true)
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketingEmails">Marketing & Newsletter (GDPR Consent)</Label>
                  <p className="text-sm text-muted-foreground">Receive product updates and tips</p>
                </div>
                <Switch 
                  id="marketingEmails" 
                  checked={notificationPrefs.marketingEmails}
                  onCheckedChange={(checked) => {
                    setNotificationPrefs({ ...notificationPrefs, marketingEmails: checked })
                    setHasChanges(true)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6 overflow-x-auto overflow-y-visible">
          <AlertsManagement />
        </TabsContent>

        {/* Localization Tab */}
        <TabsContent value="localization" className="space-y-6 overflow-x-auto overflow-y-visible">
          <LocalizationSettings />
        </TabsContent>

        {/* Sync Audit Tab */}
        <TabsContent value="sync" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sync Audit Log
              </CardTitle>
              <CardDescription>View synchronization history and status</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={fetchSyncAuditLog}
                disabled={loadingSyncLog}
                className="mb-4"
              >
                {loadingSyncLog ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              {loadingSyncLog ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : syncAuditLog.length === 0 ? (
                <p className="text-muted-foreground">No sync records found</p>
              ) : (
                <div className="space-y-2">
                  {syncAuditLog.map((sync) => (
                    <div key={sync.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{sync.fileName || "Unknown"}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground break-words">
                          Status: {sync.status} | Last synced: {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : "Never"}
                        </div>
                      </div>
                      <Badge variant={sync.status === "completed" ? "default" : sync.status === "failed" ? "destructive" : "secondary"} className="flex-shrink-0">
                        {sync.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                    <Badge variant="default" className="whitespace-nowrap">Enabled</Badge>
                    <MFASetupButton />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Password</div>
                    <div className="text-sm text-muted-foreground">Last changed recently</div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent w-full sm:w-auto flex-shrink-0" onClick={() => setShowChangePasswordDialog(true)}>
                    Change Password
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Active Sessions</div>
                    <div className="text-sm text-muted-foreground">Manage your active sessions</div>
                  </div>
                  <div className="w-full sm:w-auto flex-shrink-0">
                    <SessionManagementButton />
                  </div>
                </div>

                <div className="pt-6 border-t mt-6">
                  <h3 className="text-lg font-medium text-red-600 mb-2 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                    Delete Account (GDPR Right to Erasure)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6 overflow-x-auto overflow-y-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API & Integrations
              </CardTitle>
              <CardDescription>Manage API access and third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">API Key</div>
                      <div className="text-sm text-muted-foreground">Use this key to access the FinaPilot API</div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent w-full sm:w-auto flex-shrink-0" onClick={handleRegenerateApiKey}>
                      Regenerate
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      className="font-mono flex-1 min-w-0 text-xs sm:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="bg-transparent flex-shrink-0"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
