"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Star, CreditCard, Download, Calendar, BarChart3, DollarSign } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: { monthly: 49, yearly: 39 },
    description: "Perfect for solo founders and small startups",
    features: [
      "1 user account",
      "1 integration (QuickBooks or Stripe)",
      "Basic financial modeling",
      "Monthly reports",
      "Email support",
      "5GB storage",
    ],
    limitations: ["No AI forecasting", "No scenario planning", "Basic templates only"],
    popular: false,
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: { monthly: 149, yearly: 119 },
    description: "Ideal for growing companies with advanced needs",
    features: [
      "Up to 5 users",
      "3 integrations",
      "AI-powered forecasting",
      "Natural language queries",
      "Scenario planning",
      "Weekly email digests",
      "Board-ready reports",
      "50GB storage",
      "Priority support",
    ],
    limitations: [],
    popular: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: { monthly: 399, yearly: 319 },
    description: "For large organizations with complex requirements",
    features: [
      "Unlimited users",
      "Unlimited integrations",
      "Advanced AI features",
      "Custom reporting",
      "API access",
      "SSO integration",
      "Audit trails",
      "Dedicated support",
      "500GB storage",
      "Custom onboarding",
    ],
    limitations: [],
    popular: false,
    cta: "Contact Sales",
  },
]

const regionalPlans = [
  {
    region: "India & Asia",
    currency: "₹",
    plans: [
      { name: "Starter", monthly: 999, yearly: 799 },
      { name: "Professional", monthly: 2999, yearly: 2399 },
      { name: "Enterprise", monthly: 7999, yearly: 6399 },
    ],
  },
  {
    region: "Europe",
    currency: "€",
    plans: [
      { name: "Starter", monthly: 45, yearly: 36 },
      { name: "Professional", monthly: 135, yearly: 108 },
      { name: "Enterprise", monthly: 359, yearly: 287 },
    ],
  },
]

const usageStats = [
  { label: "Team Members", value: 15, max: 15, unit: "users" },
  { label: "Storage Used", value: 32, max: 50, unit: "GB" },
  { label: "Integrations", value: 8, max: 8, unit: "active" },
  { label: "API Calls", value: 64, max: 100, unit: "% used" },
]

export function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState("US")

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Pricing & Billing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your financial modeling needs. All plans include a 14-day free trial.
        </p>
      </div>

      {/* Current Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Current Usage Overview
          </CardTitle>
          <CardDescription>Your current plan usage and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {usageStats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{stat.label}</span>
                  <span className="text-muted-foreground">
                    {stat.value}/{stat.max} {stat.unit}
                  </span>
                </div>
                <Progress value={(stat.value / stat.max) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {stat.unit === "% used" ? `${stat.value}% used` : `${stat.max - stat.value} remaining`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm ${!isYearly ? "font-semibold" : "text-muted-foreground"}`}>Monthly</span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span className={`text-sm ${isYearly ? "font-semibold" : "text-muted-foreground"}`}>
          Yearly
          <Badge variant="secondary" className="ml-2">
            Save 20%
          </Badge>
        </span>
      </div>

      {/* Regional Pricing Tabs */}
      <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="US">🇺🇸 United States</TabsTrigger>
          <TabsTrigger value="India">🇮🇳 India & Asia</TabsTrigger>
          <TabsTrigger value="Europe">🇪🇺 Europe</TabsTrigger>
        </TabsList>

        <TabsContent value="US" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? "border-blue-500 shadow-lg" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ${isYearly ? plan.price.yearly : plan.price.monthly}
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                    {isYearly && (
                      <div className="text-sm text-green-600">
                        Save ${(plan.price.monthly - plan.price.yearly) * 12}/year
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  {plan.limitations.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="text-sm font-medium text-muted-foreground">Not included:</div>
                      {plan.limitations.map((limitation) => (
                        <div key={limitation} className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="India" className="space-y-6 overflow-x-auto overflow-y-visible">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regionalPlans[0].plans.map((plan, index) => (
              <Card key={plan.name} className={`relative ${index === 1 ? "border-blue-500 shadow-lg" : ""}`}>
                {index === 1 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plans[index].description}</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ₹{isYearly ? plan.yearly : plan.monthly}
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                    {isYearly && (
                      <div className="text-sm text-green-600">Save ₹{(plan.monthly - plan.yearly) * 12}/year</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plans[index].features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                    {plans[index].cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="Europe" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regionalPlans[1].plans.map((plan, index) => (
              <Card key={plan.name} className={`relative ${index === 1 ? "border-blue-500 shadow-lg" : ""}`}>
                {index === 1 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plans[index].description}</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      €{isYearly ? plan.yearly : plan.monthly}
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                    {isYearly && (
                      <div className="text-sm text-green-600">Save €{(plan.monthly - plan.yearly) * 12}/year</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plans[index].features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                    {plans[index].cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your recent billing transactions and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "Dec 1, 2024", amount: "$149.00", status: "Paid", invoice: "INV-2024-001" },
              { date: "Nov 1, 2024", amount: "$149.00", status: "Paid", invoice: "INV-2024-002" },
              { date: "Oct 1, 2024", amount: "$149.00", status: "Paid", invoice: "INV-2024-003" },
            ].map((transaction) => (
              <div key={transaction.invoice} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">{transaction.invoice}</div>
                    <div className="text-sm text-muted-foreground">{transaction.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{transaction.amount}</div>
                    <Badge variant="secondary" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Manage your payment methods and billing information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">•••• •••• •••• 4242</div>
                  <div className="text-sm text-muted-foreground">Expires 12/2025</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Primary</Badge>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
