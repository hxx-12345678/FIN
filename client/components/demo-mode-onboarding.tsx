"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  DollarSign,
} from "lucide-react"
import { enableDemoMode, getDemoData } from "@/lib/demo-data-generator"

interface DemoModeOnboardingProps {
  onComplete: (mode: "demo" | "real") => void
}

export function DemoModeOnboarding({ onComplete }: DemoModeOnboardingProps) {
  const [loading, setLoading] = useState(false)

  const handleDemoMode = () => {
    setLoading(true)

    // Simulate loading time (generating demo data)
    setTimeout(() => {
      enableDemoMode()
      getDemoData() // Generate and cache demo data
      setLoading(false)
      onComplete("demo")
    }, 2000)
  }

  const handleRealMode = () => {
    onComplete("real")
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Welcome to FinaPilot
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered Financial Planning & Analysis platform. Choose how you'd like to get started.
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Demo Mode */}
          <Card className="relative overflow-hidden border-2 hover:border-purple-300 transition-all hover:shadow-lg">
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">Recommended</Badge>
            </div>
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Explore Demo Company</CardTitle>
                <CardDescription className="text-base mt-2">
                  Try FinaPilot with pre-loaded sample data. Perfect for exploring features before connecting your
                  accounts.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">12 months of realistic data</div>
                    <div className="text-sm text-muted-foreground">
                      Pre-loaded transactions, revenue, expenses, and financial statements
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Ready in seconds</div>
                    <div className="text-sm text-muted-foreground">No setup required, start exploring immediately</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Full feature access</div>
                    <div className="text-sm text-muted-foreground">
                      Test AI forecasting, scenario planning, and all analytics
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Read-only mode</div>
                    <div className="text-sm text-muted-foreground">Safe sandbox environment, resets daily</div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
                onClick={handleDemoMode}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Loading Demo Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start with Demo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Real Data Mode */}
          <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all hover:shadow-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Connect Real Data</CardTitle>
                <CardDescription className="text-base mt-2">
                  Connect your accounting system and start managing your actual financial data right away.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Live data sync</div>
                    <div className="text-sm text-muted-foreground">
                      Real-time updates from QuickBooks, Xero, or other platforms
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Accurate insights</div>
                    <div className="text-sm text-muted-foreground">
                      AI-powered forecasts based on your actual business data
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Bank-level security</div>
                    <div className="text-sm text-muted-foreground">256-bit encryption and SOC 2 compliance</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Full functionality</div>
                    <div className="text-sm text-muted-foreground">
                      Export reports, API access, and team collaboration
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-transparent" size="lg" variant="outline" onClick={handleRealMode}>
                <Database className="mr-2 h-4 w-4" />
                Connect Accounting System
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>You can always switch between demo and real data later in Settings</p>
        </div>
      </div>
    </div>
  )
}
