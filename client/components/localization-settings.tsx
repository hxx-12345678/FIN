"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"

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

export function LocalizationSettings() {
  const [baseCurrency, setBaseCurrency] = useState("INR")
  const [displayCurrency, setDisplayCurrency] = useState("INR")
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY")
  const [numberFormat, setNumberFormat] = useState("indian")
  const [language, setLanguage] = useState("en")
  const [autoFxUpdate, setAutoFxUpdate] = useState(true)
  const [gstEnabled, setGstEnabled] = useState(true)
  const [tdsEnabled, setTdsEnabled] = useState(true)

  const currencies: Currency[] = [
    { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 1.0 },
    { code: "USD", name: "US Dollar", symbol: "$", rate: 0.012 },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.011 },
    { code: "GBP", name: "British Pound", symbol: "£", rate: 0.0095 },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 0.016 },
  ]

  const taxLiabilities: TaxLiability[] = [
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
    {
      type: "GST Annual Return",
      amount: 0,
      dueDate: "2025-12-31",
      status: "upcoming",
      description: "Annual GST return (GSTR-9)",
    },
  ]

  const gstSummary = {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Localization & Compliance</h1>
          <p className="text-muted-foreground">Multi-currency support and India-specific compliance management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Update FX Rates
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Tax Report
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
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
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
                  <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
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
                  <Switch checked={autoFxUpdate} onCheckedChange={setAutoFxUpdate} />
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
                  {currencies.map((currency) => (
                    <div key={currency.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <span className="font-bold text-primary">{currency.symbol}</span>
                        </div>
                        <div>
                          <div className="font-medium">{currency.code}</div>
                          <div className="text-xs text-muted-foreground">{currency.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {currency.code === baseCurrency ? "1.0000" : currency.rate.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">per {baseCurrency}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800">
                      Exchange rates are fetched from OpenExchange API and updated daily at 00:00 UTC
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Currency Conversion Impact</CardTitle>
              <CardDescription>How currency conversion affects your financial metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold">₹84.2L</div>
                  <div className="text-xs text-green-600 mt-1">≈ $10,104 USD</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Monthly Burn</div>
                  <div className="text-2xl font-bold">₹4.5L</div>
                  <div className="text-xs text-orange-600 mt-1">≈ $5,400 USD</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Cash Balance</div>
                  <div className="text-2xl font-bold">₹57L</div>
                  <div className="text-xs text-blue-600 mt-1">≈ $68,400 USD</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Runway</div>
                  <div className="text-2xl font-bold">12.7 mo</div>
                  <div className="text-xs text-purple-600 mt-1">Currency neutral</div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number Format</Label>
                  <Select value={numberFormat} onValueChange={setNumberFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indian">Indian (1,00,000)</SelectItem>
                      <SelectItem value="international">International (100,000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select defaultValue="IST">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (UTC+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC (UTC+0:00)</SelectItem>
                      <SelectItem value="EST">EST (UTC-5:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">31/12/2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number:</span>
                    <span className="font-medium">₹1,00,000.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium">English</span>
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
                <div className="text-2xl font-bold">₹5.6L</div>
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
                <div className="text-2xl font-bold">Jan 20</div>
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
                <div className="text-2xl font-bold">₹1.25L</div>
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
                    <span className="font-semibold text-green-600">₹14.5L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Total GST Paid</span>
                    <span className="font-semibold text-orange-600">₹8.9L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg bg-primary/5">
                    <span className="font-medium">Net GST Liability</span>
                    <span className="font-bold text-primary">₹5.6L</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Input Tax Credit</span>
                    <span className="font-semibold text-blue-600">₹1.25L</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded-lg">
                    <span className="text-muted-foreground">Next Filing Date</span>
                    <span className="font-semibold">20 Jan 2025</span>
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
                <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>TDS Deductions</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculate TDS on applicable transactions
                  </p>
                </div>
                <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>E-Invoicing</Label>
                  <p className="text-xs text-muted-foreground">Enable e-invoicing for B2B transactions</p>
                </div>
                <Switch defaultChecked={false} />
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
