"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Zap, Play, Database, Sparkles, CheckCircle2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface PostLoginOptionsProps {
  onSelectDemo: () => void
  onSelectRealData: () => void
}

export function PostLoginOptions({ onSelectDemo, onSelectRealData }: PostLoginOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<"demo" | "real" | null>(null)

  const handleDemoSelect = () => {
    setSelectedOption("demo")
    // Set demo mode flag
    localStorage.setItem("finapilot_demo_mode", "true")
    localStorage.setItem("finapilot_has_visited", "true")
    localStorage.setItem("finapilot_onboarding_complete", "true")
    toast.success("Starting with demo company data")
    setTimeout(() => {
      onSelectDemo()
    }, 500)
  }

  const handleRealDataSelect = () => {
    setSelectedOption("real")
    // Clear demo mode flag
    localStorage.removeItem("finapilot_demo_mode")
    localStorage.setItem("finapilot_has_visited", "true")
    toast.success("Ready to connect your accounting system")
    setTimeout(() => {
      onSelectRealData()
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-slate-400">FinaPilot</span>
            </h1>
          </div>
          <p className="text-xl text-slate-600">Choose how you'd like to get started</p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Demo Company Option */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${
              selectedOption === "demo" 
                ? "border-indigo-500 bg-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            }`}
            onClick={handleDemoSelect}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Explore Demo Company</CardTitle>
                    <CardDescription className="mt-1">Try FinaPilot with sample data</CardDescription>
                  </div>
                </div>
                {selectedOption === "demo" && (
                  <Badge variant="default" className="bg-indigo-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Experience FinaPilot's full capabilities with a pre-configured demo company. 
                Perfect for exploring features without connecting your own data.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Pre-loaded financial data</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Sample transactions and models</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>All features available</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>No setup required</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDemoSelect()
                }}
                disabled={selectedOption !== null}
              >
                Start with Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Real Data Option */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${
              selectedOption === "real" 
                ? "border-indigo-500 bg-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            }`}
            onClick={handleRealDataSelect}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Connect with Real Data</CardTitle>
                    <CardDescription className="mt-1">Connect your accounting system</CardDescription>
                  </div>
                </div>
                {selectedOption === "real" && (
                  <Badge variant="default" className="bg-indigo-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Connect your accounting system to import real financial data and start managing 
                your company's finances with FinaPilot.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Connect QuickBooks, Xero, or CSV</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Automatic data sync</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Real-time financial insights</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Production-ready setup</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                size="lg"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRealDataSelect()
                }}
                disabled={selectedOption !== null}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Connect Accounting System
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  You can switch between demo and real data anytime
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Start with demo to explore, then connect your real data when ready
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


