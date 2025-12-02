"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Shield,
  Building2,
  CreditCard,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

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

interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
}

interface TaxLiability {
  type: string
  amount: number
  dueDate: string
  status: "upcoming" | "due" | "overdue"
  description: string
}

interface LocalizationData {
  baseCurrency: string
  displayCurrency: string
  language: string
  dateFormat: string
  numberFormat: string
  timezone: string
  autoFxUpdate: boolean
  fxRates: Record<string, number>
  gstEnabled: boolean
  tdsEnabled: boolean
  einvoicingEnabled: boolean
  complianceData: any
}

export function LocalizationSettings() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingFxRates, setUpdatingFxRates] = useState(false)
  const [localization, setLocalization] = useState<LocalizationData>({
    baseCurrency: "USD",
    displayCurrency: "USD",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    numberFormat: "1,234.56",
    timezone: "UTC",
    autoFxUpdate: true,
    fxRates: {},
    gstEnabled: false,
    tdsEnabled: false,
    einvoicingEnabled: false,
    complianceData: {},
  })

  const currencies: Currency[] = [
    { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 1.0 },
    { code: "USD", name: "US Dollar", symbol: "$", rate: 0.012 },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.011 },
    { code: "GBP", name: "British Pound", symbol: "£", rate: 0.0095 },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 0.016 },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 0.018 },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 0.016 },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 1.8 },
  ]

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

  // Fetch localization data
  useEffect(() => {
    if (orgId) {
      fetchLocalization()
    }
  }, [orgId])

  const fetchLocalization = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setLocalization({
            baseCurrency: data.data.baseCurrency || "USD",
            displayCurrency: data.data.displayCurrency || "USD",
            language: data.data.language || "en",
            dateFormat: data.data.dateFormat || "MM/DD/YYYY",
            numberFormat: data.data.numberFormat || "1,234.56",
            timezone: data.data.timezone || "UTC",
            autoFxUpdate: data.data.autoFxUpdate !== undefined ? data.data.autoFxUpdate : true,
            fxRates: data.data.fxRates || {},
            gstEnabled: data.data.gstEnabled !== undefined ? data.data.gstEnabled : false,
            tdsEnabled: data.data.tdsEnabled !== undefined ? data.data.tdsEnabled : false,
            einvoicingEnabled: data.data.einvoicingEnabled !== undefined ? data.data.einvoicingEnabled : false,
            complianceData: data.data.complianceData || {},
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch localization:", error)
      toast.error("Failed to load localization settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(localization),
      })
      if (response.ok) {
        toast.success("Localization settings saved successfully")
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to save localization settings")
      }
    } catch (error) {
      toast.error("Failed to save localization settings")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateFxRates = async () => {
    if (!orgId) return
    setUpdatingFxRates(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization/fx-rates/update`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          baseCurrency: localization.baseCurrency,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          const updatedRates = data.data.fxRates || {}
          setLocalization({ 
            ...localization, 
            fxRates: updatedRates,
            baseCurrency: data.data.baseCurrency || localization.baseCurrency,
          })
          toast.success(`Exchange rates updated successfully! Fetched ${Object.keys(updatedRates).length} currency rates.`)
          // Refresh localization data to ensure UI is in sync
          await fetchLocalization()
        } else {
          toast.error("Failed to update exchange rates")
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || "Failed to update exchange rates")
      }
    } catch (error) {
      console.error("FX rate update error:", error)
      toast.error("Failed to update exchange rates. Please try again.")
    } finally {
      setUpdatingFxRates(false)
    }
  }

  const taxLiabilities: TaxLiability[] = localization.complianceData?.taxLiabilities || [
    {
      type: "GST Return (GSTR-3B)",
      amount: 145000,
      dueDate: "2025-01-20",
      status: "upcoming",
      description: "Monthly GST return filing",
    },
    {
      type: "TDS Payment",
      amount: 82000,
      dueDate: "2025-01-07",
      status: "due",
      description: "TDS on salaries for December 2024",
    },
  ]

  const gstSummary = localization.complianceData?.gstSummary || {
    totalGstCollected: 1450000,
    totalGstPaid: 890000,
    netGstLiability: 560000,
    itcAvailable: 125000,
    nextFilingDate: "2025-01-20",
  }

  const integrations = [
    { name: "Razorpay", status: "connected", type: "payment" },
    { name: "Tally", status: "connected", type: "accounting" },
    { name: "Zoho Books", status: "available", type: "accounting" },
    { name: "ClearTax", status: "available", type: "compliance" },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Localization & Compliance</h1>
          <p className="text-muted-foreground">Multi-currency support and India-specific compliance management</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleUpdateFxRates}
            disabled={updatingFxRates}
          >
            {updatingFxRates ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {updatingFxRates ? "Updating..." : "Update FX Rates"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="currency" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="currency">Multi-Currency</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="compliance">India Compliance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Multi-Currency Tab */}
        <TabsContent value="currency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>Configure base and display currencies for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Base Currency</Label>
                  <Select 
                    value={localization.baseCurrency} 
                    onValueChange={(value) => setLocalization({ ...localization, baseCurrency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">All financial data will be stored in this currency</p>
                </div>

                <div className="space-y-2">
                  <Label>Display Currency</Label>
                  <Select 
                    value={localization.displayCurrency} 
                    onValueChange={(value) => setLocalization({ ...localization, displayCurrency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Currency shown in reports and dashboards</p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label>Auto-update FX Rates</Label>
                    <p className="text-xs text-muted-foreground">Fetch daily exchange rates automatically</p>
                  </div>
                  <Switch 
                    checked={localization.autoFxUpdate} 
                    onCheckedChange={(checked) => setLocalization({ ...localization, autoFxUpdate: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exchange Rates</CardTitle>
                <CardDescription>Current exchange rates (updated daily)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencies.map((currency) => {
                    // Get rate from fetched rates or fallback to default
                    const rate = localization.fxRates && localization.fxRates[currency.code] 
                      ? localization.fxRates[currency.code] 
                      : (currency.code === localization.baseCurrency ? 1 : currency.rate)
                    const isBaseCurrency = currency.code === localization.baseCurrency
                    return (
                      <div key={currency.code} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <span className="font-bold text-primary">{currency.symbol}</span>
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {currency.code}
                              {isBaseCurrency && (
                                <Badge variant="outline" className="text-xs">Base</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{currency.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {isBaseCurrency ? "1.0000" : rate.toFixed(4)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isBaseCurrency ? "Base currency" : `per ${localization.baseCurrency}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-800 font-medium mb-1">Live Exchange Rates</p>
                      <p className="text-xs text-blue-700">
                        Rates are fetched from free currency APIs (exchangerate-api.com). 
                        Click "Update FX Rates" to refresh with latest rates. 
                        {localization.fxRates && Object.keys(localization.fxRates).length > 0 && (
                          <span className="block mt-1">
                            Last updated: {new Date().toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Localization Tab */}
        <TabsContent value="localization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Preferences</CardTitle>
              <CardDescription>Customize date, number formats, and language settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select 
                    value={localization.dateFormat} 
                    onValueChange={(value) => setLocalization({ ...localization, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                      <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number Format</Label>
                  <Select 
                    value={localization.numberFormat} 
                    onValueChange={(value) => setLocalization({ ...localization, numberFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indian">Indian (1,00,000)</SelectItem>
                      <SelectItem value="international">International (100,000)</SelectItem>
                      <SelectItem value="1,234.56">US Format (1,234.56)</SelectItem>
                      <SelectItem value="1.234,56">European Format (1.234,56)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={localization.language} 
                    onValueChange={(value) => setLocalization({ ...localization, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="es">Español (Spanish)</SelectItem>
                      <SelectItem value="fr">Français (French)</SelectItem>
                      <SelectItem value="de">Deutsch (German)</SelectItem>
                      <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                      <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select 
                    value={localization.timezone} 
                    onValueChange={(value) => setLocalization({ ...localization, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">IST (UTC+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC (UTC+0:00)</SelectItem>
                      <SelectItem value="America/New_York">EST (UTC-5:00)</SelectItem>
                      <SelectItem value="America/Los_Angeles">PST (UTC-8:00)</SelectItem>
                      <SelectItem value="Europe/London">GMT (UTC+0:00)</SelectItem>
                      <SelectItem value="Asia/Tokyo">JST (UTC+9:00)</SelectItem>
                      <SelectItem value="Asia/Singapore">SGT (UTC+8:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {localization.dateFormat === "DD/MM/YYYY" ? "31/12/2024" :
                       localization.dateFormat === "MM/DD/YYYY" ? "12/31/2024" :
                       localization.dateFormat === "YYYY-MM-DD" ? "2024-12-31" : "31.12.2024"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number:</span>
                    <span className="font-medium">
                      {localization.numberFormat === "indian" ? "₹1,00,000.00" :
                       localization.numberFormat === "international" ? "₹100,000.00" :
                       localization.numberFormat === "1,234.56" ? "₹1,234.56" : "₹1.234,56"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium">
                      {localization.language === "en" ? "English" :
                       localization.language === "hi" ? "हिन्दी" :
                       localization.language === "es" ? "Español" :
                       localization.language === "fr" ? "Français" :
                       localization.language === "de" ? "Deutsch" :
                       localization.language === "ja" ? "日本語" : "中文"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* India Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="text-2xl font-bold">₹{(gstSummary.netGstLiability / 100000).toFixed(2)}L</div>
                <p className="text-sm text-muted-foreground">Net GST Liability</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Due Soon
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {new Date(gstSummary.nextFilingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <p className="text-sm text-muted-foreground">Next GST Filing</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Available
                  </Badge>
                </div>
                <div className="text-2xl font-bold">₹{(gstSummary.itcAvailable / 100000).toFixed(2)}L</div>
                <p className="text-sm text-muted-foreground">ITC Available</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GST Summary</CardTitle>
              <CardDescription>Overview of GST collections, payments, and liabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Total GST Collected</span>
                    <span className="font-semibold text-green-600">₹{(gstSummary.totalGstCollected / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Total GST Paid</span>
                    <span className="font-semibold text-orange-600">₹{(gstSummary.totalGstPaid / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg bg-primary/5">
                    <span className="font-medium">Net GST Liability</span>
                    <span className="font-bold text-primary">₹{(gstSummary.netGstLiability / 100000).toFixed(2)}L</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Input Tax Credit</span>
                    <span className="font-semibold text-blue-600">₹{(gstSummary.itcAvailable / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Next Filing Date</span>
                    <span className="font-semibold">{new Date(gstSummary.nextFilingDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Compliance Status</span>
                    <Badge className="bg-green-500">Up to Date</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Compliance Calendar</CardTitle>
              <CardDescription>Upcoming tax filing deadlines and liabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {taxLiabilities.map((liability, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      liability.status === "overdue"
                        ? "border-red-200 bg-red-50"
                        : liability.status === "due"
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{liability.type}</h4>
                          <Badge
                            variant={
                              liability.status === "overdue"
                                ? "destructive"
                                : liability.status === "due"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {liability.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{liability.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Due: {liability.dueDate}</span>
                          </div>
                          {liability.amount > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>₹{(liability.amount / 100000).toFixed(2)}L</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {liability.status === "due" && (
                        <Button size="sm" className="ml-4">
                          File Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>Enable India-specific tax and compliance features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>GST Tracking</Label>
                  <p className="text-xs text-muted-foreground">Track GST collections and payments in cash flow</p>
                </div>
                <Switch 
                  checked={localization.gstEnabled} 
                  onCheckedChange={(checked) => setLocalization({ ...localization, gstEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>TDS Deductions</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculate TDS on applicable transactions
                  </p>
                </div>
                <Switch 
                  checked={localization.tdsEnabled} 
                  onCheckedChange={(checked) => setLocalization({ ...localization, tdsEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>E-Invoicing</Label>
                  <p className="text-xs text-muted-foreground">Enable e-invoicing for B2B transactions</p>
                </div>
                <Switch 
                  checked={localization.einvoicingEnabled} 
                  onCheckedChange={(checked) => setLocalization({ ...localization, einvoicingEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>India-Specific Integrations</CardTitle>
              <CardDescription>Connect with Razorpay, Tally, and other India-focused platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{integration.type}</p>
                        </div>
                      </div>
                      {integration.status === "connected" ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">Available</Badge>
                      )}
                    </div>
                    {integration.status === "connected" ? (
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        Configure
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full">
                        Connect
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Integration Benefits</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Razorpay: Automatic GST mapping on payment transactions</li>
                      <li>• Tally: Sync accounting data and tax calculations</li>
                      <li>• ClearTax: Automated GST filing and compliance management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
