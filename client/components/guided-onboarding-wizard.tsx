"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Database,
  TrendingUp,
  Zap,
  Building2,
  CreditCard,
  FileText,
  Loader2,
  HelpCircle,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const integrations = [
  { id: "quickbooks", name: "QuickBooks", icon: Building2, description: "Sync invoices, expenses, and P&L" },
  { id: "xero", name: "Xero", icon: Building2, description: "Real-time accounting data" },
  { id: "zoho", name: "Zoho Books", icon: Building2, description: "Complete financial sync" },
  { id: "tally", name: "Tally", icon: Building2, description: "India's #1 accounting software" },
  { id: "stripe", name: "Stripe", icon: CreditCard, description: "Revenue and subscription data" },
  { id: "razorpay", name: "Razorpay", icon: CreditCard, description: "Payment gateway integration" },
]

interface GuidedOnboardingWizardProps {
  onComplete: () => void
  onSkipToDemo: () => void
}

export function GuidedOnboardingWizard({ onComplete, onSkipToDemo }: GuidedOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showHelp, setShowHelp] = useState<string | null>(null)

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleConnect = () => {
    if (!selectedIntegration) return

    setConnecting(true)
    // Simulate connection
    setTimeout(() => {
      setConnecting(false)
      setCurrentStep(2)
    }, 2000)
  }

  const handleGenerateModel = () => {
    setGenerating(true)
    // Simulate model generation
    setTimeout(() => {
      setGenerating(false)
      setCurrentStep(3)
    }, 3000)
  }

  const handleFinish = () => {
    onComplete()
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome to FinaPilot</h1>
          </div>
          <p className="text-slate-600">Let's get your financial model set up in 3 simple steps</p>
        </div>

        {/* Progress Bar */}
        <Card className="border-2 border-indigo-100">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Setup Progress</span>
                <span className="text-slate-600">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-indigo-600" : "text-slate-400"}`}>
                  {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  <span className="text-xs font-medium">Connect</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-indigo-600" : "text-slate-400"}`}>
                  {currentStep > 2 ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  <span className="text-xs font-medium">Generate</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? "text-indigo-600" : "text-slate-400"}`}>
                  {currentStep === 3 ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  <span className="text-xs font-medium">Complete</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="border-2 border-slate-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {currentStep === 1 && (
                    <>
                      <Database className="w-6 h-6 text-indigo-600" />
                      Connect Your Accounting System
                    </>
                  )}
                  {currentStep === 2 && (
                    <>
                      <TrendingUp className="w-6 h-6 text-indigo-600" />
                      Auto-Model Preview
                    </>
                  )}
                  {currentStep === 3 && (
                    <>
                      <Zap className="w-6 h-6 text-green-600" />
                      AI-CFO Ready!
                    </>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  {currentStep === 1 && "Choose your accounting or payment platform to sync data automatically"}
                  {currentStep === 2 && "FinaPilot is analyzing your data and building your financial model"}
                  {currentStep === 3 && "Your financial model is ready! Start exploring your AI-powered insights"}
                </CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm">
                      {currentStep === 1 && "We use secure OAuth authentication. Your credentials are never stored."}
                      {currentStep === 2 &&
                        "Our AI categorizes transactions and identifies patterns in your financial data."}
                      {currentStep === 3 && "You can now ask questions, run forecasts, and generate reports."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Connect Integration */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {integrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => setSelectedIntegration(integration.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                        selectedIntegration === integration.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedIntegration === integration.id ? "bg-indigo-100" : "bg-slate-100"
                          }`}
                        >
                          <integration.icon
                            className={`w-5 h-5 ${
                              selectedIntegration === integration.id ? "text-indigo-600" : "text-slate-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{integration.name}</div>
                          <div className="text-sm text-slate-600 mt-1">{integration.description}</div>
                        </div>
                        {selectedIntegration === integration.id && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-900">
                      <strong>What happens next?</strong> We'll securely connect to your accounting system and import
                      the last 12 months of transactions. This typically takes 30-60 seconds.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Auto-Model Preview */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {generating ? (
                  <div className="py-12 text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Analyzing Your Data...</h3>
                      <p className="text-slate-600">This usually takes 30-60 seconds</p>
                    </div>
                    <div className="max-w-md mx-auto space-y-2 text-left">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Importing transactions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Categorizing expenses</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Circle className="w-4 h-4" />
                        <span>Building financial model</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Circle className="w-4 h-4" />
                        <span>Generating forecasts</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Data Import Complete</h4>
                          <p className="text-sm text-green-800">
                            Successfully imported 1,247 transactions from the last 12 months
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-2xl font-bold text-slate-900">₹1.2Cr</div>
                        <div className="text-sm text-slate-600 mt-1">Total Revenue</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-2xl font-bold text-slate-900">₹8.5L</div>
                        <div className="text-sm text-slate-600 mt-1">Monthly Burn</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-2xl font-bold text-indigo-600">14mo</div>
                        <div className="text-sm text-slate-600 mt-1">Runway</div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-indigo-900">
                          <strong>Ready to generate your forecast?</strong> Click below to create your first AI-powered
                          financial model with Monte Carlo simulations and scenario planning.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">You're All Set!</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Your AI-CFO is ready to help you make smarter financial decisions
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Financial Model Ready</h4>
                        <p className="text-sm text-slate-600">Complete P&L, cashflow, and balance sheet</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">AI-CFO Activated</h4>
                        <p className="text-sm text-slate-600">Ask questions in plain English</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Monte Carlo Enabled</h4>
                        <p className="text-sm text-slate-600">Run probabilistic forecasts</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Reports Available</h4>
                        <p className="text-sm text-slate-600">Generate investor-ready decks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onSkipToDemo} className="text-slate-600 hover:text-slate-900">
            Skip setup — Try Demo Mode
          </Button>
          <div className="flex gap-3">
            {currentStep > 1 && currentStep < 3 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={connecting || generating}
                className="bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                onClick={handleConnect}
                disabled={!selectedIntegration || connecting}
                className="bg-gradient-to-r from-indigo-400 to-slate-400 hover:from-indigo-500 hover:to-slate-500 text-white"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect & Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
            {currentStep === 2 && !generating && (
              <Button
                onClick={handleGenerateModel}
                className="bg-gradient-to-r from-indigo-400 to-slate-400 hover:from-indigo-500 hover:to-slate-500 text-white"
              >
                Generate My Forecast
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                onClick={handleFinish}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
