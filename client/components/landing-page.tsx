"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Brain,
  CheckCircle2,
  Play,
  Menu,
  X,
  ChevronRight,
  LineChart,
  Target,
  Users,
  Building2,
  Calculator,
  Globe,
  Lock,
  Gauge,
} from "lucide-react"

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-lg flex items-center justify-center">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">
                Fina
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-slate-400">
                  Pilot
                </span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a
                href="#use-cases"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Use Cases
              </a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <a
                href="#integrations"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Integrations
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600"
                onClick={() => {
                  setAuthMode("login")
                  setAuthModalOpen(true)
                }}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAuthMode("signup")
                  setAuthModalOpen(true)
                }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30"
              >
                Get Started Free
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm font-medium text-slate-600 hover:text-slate-900">
                Features
              </a>
              <a href="#use-cases" className="block text-sm font-medium text-slate-600 hover:text-slate-900">
                Use Cases
              </a>
              <a href="#pricing" className="block text-sm font-medium text-slate-600 hover:text-slate-900">
                Pricing
              </a>
              <a href="#integrations" className="block text-sm font-medium text-slate-600 hover:text-slate-900">
                Integrations
              </a>
              <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600">
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={onGetStarted}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 -z-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-300/20 to-slate-400/20 rounded-full blur-3xl animate-pulse -z-10" />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-orange-400/10 to-pink-500/10 rounded-full blur-3xl animate-pulse -z-10"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-200/5 to-slate-300/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                <Sparkles className="w-3 h-3 mr-1" />
                Trusted by early-stage startups & accounting partners
              </Badge>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight">
                Auto-generate your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-slate-400">
                  financial model
                </span>
              </h1>

              <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
                FinaPilot — your AI-CFO for startups and SMBs. Build a full P&L, cashflow, and runway in minutes, run
                probabilistic forecasts, and export investor-ready decks — with audit trails accountants trust.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/30 text-base px-8"
                >
                  Get Started — Free Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-300 text-slate-700 text-base px-8 bg-transparent"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Book a 15-min Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600">Set up in 10 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600">No credit card required</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                {/* Mock Dashboard UI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-lg" />
                      <span className="text-white font-semibold">FinaPilot Dashboard</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm text-slate-300">AI-CFO Analysis</span>
                    </div>
                    <p className="text-white text-sm leading-relaxed">
                      Based on your current burn rate of ₹8.5L/month, you have 14 months of runway. I recommend reducing
                      cloud costs by 20% to extend runway to 18 months.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30"
                    >
                      Create Task
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      <div className="text-2xl font-bold text-white">₹1.2Cr</div>
                      <div className="text-xs text-slate-400">Cash Balance</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      <div className="text-2xl font-bold text-green-400">+23%</div>
                      <div className="text-xs text-slate-400">Revenue Growth</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      <div className="text-2xl font-bold text-indigo-400">14mo</div>
                      <div className="text-xs text-slate-400">Runway</div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-sm text-slate-300 mb-2">Monte Carlo Forecast</div>
                    <div className="h-24 flex items-end gap-1">
                      {[40, 60, 45, 70, 55, 80, 65, 85, 75, 90, 80, 95].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-indigo-400 to-slate-400 rounded-t opacity-70"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-slate-700">Syncing live data</span>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-indigo-300 to-slate-400 rounded-full blur-3xl opacity-20" />
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full blur-3xl opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* Curved wave divider */}
      <div className="relative -mt-1">
        <svg className="w-full h-24" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,64 C360,20 720,20 1080,64 C1260,86 1350,96 1440,96 L1440,120 L0,120 Z" fill="#f8fafc" />
        </svg>
      </div>

      {/* Value Pillars */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why FinaPilot?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The only financial planning platform that combines automation, AI intelligence, and probabilistic
              forecasting
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-slate-200 hover:shadow-xl transition-shadow bg-white">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Auto Models in Minutes</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect your accounting & payments systems. FinaPilot auto-builds your P&L, cashflow, and balance sheet
                with zero manual data entry.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:shadow-xl transition-shadow bg-white">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">AI-CFO that Acts</h3>
              <p className="text-slate-600 leading-relaxed">
                Ask questions in plain English. Get actionable insights with one-click task creation to Slack, Asana, or
                your calendar.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:shadow-xl transition-shadow bg-white">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Know the Risk</h3>
              <p className="text-slate-600 leading-relaxed">
                Run Monte Carlo simulations with 1000+ scenarios. See probability bands, confidence intervals, and
                risk-adjusted forecasts.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Curved wave divider with gradient */}
      <div className="relative -mt-1">
        <svg className="w-full h-24" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,32 C240,80 480,80 720,32 C960,80 1200,80 1440,32 L1440,120 L0,120 Z" fill="white" />
        </svg>
      </div>

      {/* Product Tour */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white">
        {/* Floating gradient orbs */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-indigo-300/10 to-slate-400/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-gradient-to-br from-orange-400/10 to-pink-500/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">See it in Action</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From data connection to investor-ready reports in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Your Data</h3>
                  <p className="text-slate-600">
                    One-click integrations with QuickBooks, Xero, Stripe, Razorpay, Zoho Books, and Tally. Secure OAuth
                    authentication.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">AI Builds Your Model</h3>
                  <p className="text-slate-600">
                    Machine learning categorizes transactions, identifies patterns, and generates a complete 3-statement
                    financial model.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Run Scenarios & Forecasts</h3>
                  <p className="text-slate-600">
                    Create best/base/worst case scenarios. Run Monte Carlo simulations. See probability-weighted
                    outcomes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 font-bold">4</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Export & Share</h3>
                  <p className="text-slate-600">
                    Generate investor decks, board reports, and compliance-ready exports with full audit trails and
                    provenance.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-2xl mx-auto flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-slate-700 font-medium">Watch 2-minute product tour</p>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    See it Live
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curved wave divider */}
      <div className="relative -mt-1">
        <svg className="w-full h-32" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,96 C480,32 960,32 1440,96 L1440,120 L0,120 Z" fill="#f8fafc" />
        </svg>
      </div>

      {/* Use Cases */}
      <section id="use-cases" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        {/* Organic blob shapes */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-200/10 to-slate-300/10 rounded-[40%_60%_70%_30%/60%_30%_70%_40%] blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-300/10 to-pink-400/10 rounded-[60%_40%_30%_70%/40%_60%_70%_30%] blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Built for Every Finance Role</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Whether you're a founder, accountant, or finance team — FinaPilot adapts to your workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-slate-200 bg-white">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Founders</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Understand your runway and burn rate instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Make data-driven hiring and spending decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Generate investor-ready financial models in minutes</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-slate-200 bg-white">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Calculator className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Accountants</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Full audit trails and provenance for every number</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">GST compliance and tax planning built-in</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Serve multiple clients from one dashboard</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-slate-200 bg-white">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Finance Teams</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Collaborative scenario planning and version control</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Automated board reporting and investor updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Real-time dashboards with role-based access</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Curved wave divider with multiple layers */}
      <div className="relative -mt-1">
        <svg className="w-full h-32" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,64 C360,96 720,96 1080,64 C1260,48 1350,40 1440,40 L1440,120 L0,120 Z"
            fill="white"
            fillOpacity="0.5"
          />
          <path d="M0,80 C360,40 720,40 1080,80 C1260,100 1350,110 1440,110 L1440,120 L0,120 Z" fill="white" />
        </svg>
      </div>

      {/* Feature Highlights */}
      <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto space-y-24">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">AI-Powered</Badge>
              <h2 className="text-4xl font-bold text-slate-900">Auto Model Engine</h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Connect your accounting system once. FinaPilot's ML engine automatically categorizes transactions,
                identifies revenue patterns, and builds a complete 3-statement financial model — no spreadsheets
                required.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Automatic transaction categorization with 95%+ accuracy</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Real-time sync with QuickBooks, Xero, Zoho, Tally</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Complete P&L, cashflow, and balance sheet in minutes</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-slate-400/20 rounded-[2rem] blur-2xl" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] p-8 h-96 flex items-center justify-center border border-slate-300/50">
                <LineChart className="w-32 h-32 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-pink-600/20 rounded-[2rem] blur-2xl" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] p-8 h-96 flex items-center justify-center border border-slate-300/50">
                <TrendingUp className="w-32 h-32 text-slate-400" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <Badge className="bg-orange-50 text-orange-700 border-orange-200">Probabilistic</Badge>
              <h2 className="text-4xl font-bold text-slate-900">Monte Carlo Forecasting</h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Move beyond single-point forecasts. Run 1000+ simulations to understand the full range of possible
                outcomes. See confidence bands, probability distributions, and risk-adjusted projections.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">5th-95th percentile confidence bands on all forecasts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Probability of hitting runway, revenue, or cash targets</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Sensitivity analysis showing top uncertainty drivers</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-slate-50 text-slate-700 border-slate-200">Compliance-Ready</Badge>
              <h2 className="text-4xl font-bold text-slate-900">Provenance & Audit Trails</h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Every number is fully explainable. Click any cell to see source transactions, assumptions, formulas, and
                AI explanations. Export complete audit trails for accountants and auditors.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Cell-level provenance with source data lineage</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">GST compliance and TDS tracking for India</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">SOC2-ready security and access controls</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/20 to-indigo-400/20 rounded-[2rem] blur-2xl" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] p-8 h-96 flex items-center justify-center border border-slate-300/50">
                <Shield className="w-32 h-32 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-[2rem] blur-2xl" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] p-8 h-96 flex items-center justify-center border border-slate-300/50">
                <Brain className="w-32 h-32 text-slate-400" />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">AI-Powered</Badge>
              <h2 className="text-4xl font-bold text-slate-900">AI-CFO Actions</h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Ask questions in plain English. Get actionable recommendations with one-click task creation. Export
                tasks to Slack, Asana, or Google Calendar. Track completion and measure impact.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Natural language queries: "How can I extend runway?"</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">One-click task creation with context and assumptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-slate-600">Integration with Slack, Asana, Trello, Google Calendar</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Curved wave divider */}
      <div className="relative -mt-1">
        <svg className="w-full h-24" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,32 C360,80 720,80 1080,32 C1260,10 1350,0 1440,0 L1440,120 L0,120 Z" fill="#f8fafc" />
        </svg>
      </div>

      {/* Integrations */}
      <section id="integrations" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        {/* Organic blob shapes */}
        <div className="absolute top-10 right-20 w-72 h-72 bg-gradient-to-br from-indigo-300/10 to-slate-400/10 rounded-[60%_40%_30%_70%/40%_60%_70%_30%] blur-3xl -z-10 animate-pulse" />
        <div
          className="absolute bottom-10 left-20 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-pink-500/10 rounded-[40%_60%_70%_30%/60%_30%_70%_40%] blur-3xl -z-10 animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Integrates with Your Stack</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              One-click connections to the tools you already use
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {[
              "QuickBooks",
              "Xero",
              "Stripe",
              "Razorpay",
              "Zoho Books",
              "Tally",
              "Slack",
              "Asana",
              "Google Calendar",
              "Plaid",
              "ClearTax",
              "Supabase",
            ].map((integration) => (
              <div
                key={integration}
                className="bg-white rounded-xl p-6 border border-slate-200 flex items-center justify-center hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-700">{integration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curved wave divider with gradient */}
      <div className="relative -mt-1">
        <svg className="w-full h-32" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="white" />
            </linearGradient>
          </defs>
          <path d="M0,64 C240,96 480,96 720,64 C960,32 1200,32 1440,64 L1440,120 L0,120 Z" fill="url(#waveGradient)" />
        </svg>
      </div>

      {/* Pricing */}
      <section id="pricing" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white">
        {/* Floating gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-200/10 to-slate-300/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-orange-300/10 to-pink-400/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Start free, scale as you grow. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <Card className="p-8 border-slate-200 bg-white">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">Free</span>
                </div>
                <p className="text-slate-600 mt-2">Perfect for trying FinaPilot</p>
              </div>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="w-full border-slate-300 text-slate-700 mb-6 bg-transparent"
              >
                Start Free Trial
              </Button>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Demo company with sample data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Basic financial modeling</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">AI-CFO chat (limited)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">1 user</span>
                </li>
              </ul>
            </Card>

            {/* Pro */}
            <Card className="p-8 border-2 border-indigo-500 bg-white relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-400 to-slate-400 text-white">
                Most Popular
              </Badge>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">$199</span>
                  <span className="text-slate-600">/month</span>
                </div>
                <p className="text-slate-600 mt-2">₹16,500/month • For growing startups</p>
              </div>
              <Button
                onClick={onGetStarted}
                className="w-full bg-gradient-to-r from-indigo-400 to-slate-400 hover:from-indigo-500 hover:to-slate-500 text-white mb-6"
              >
                Get Started
              </Button>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">All integrations included</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Unlimited scenarios & forecasts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Monte Carlo simulations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">AI-CFO with task creation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Up to 5 users</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Priority support</span>
                </li>
              </ul>
            </Card>

            {/* Enterprise */}
            <Card className="p-8 border-slate-200 bg-white">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">Custom</span>
                </div>
                <p className="text-slate-600 mt-2">For accounting firms & enterprises</p>
              </div>
              <Button variant="outline" className="w-full border-slate-300 text-slate-700 mb-6 bg-transparent">
                Contact Sales
              </Button>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">White-label options</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Multi-client management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Unlimited users</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">Custom integrations</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Curved wave divider transitioning to dark section */}
      <div className="relative -mt-1">
        <svg className="w-full h-32" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="darkWaveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <path
            d="M0,96 C360,32 720,32 1080,96 C1260,128 1350,144 1440,144 L1440,120 L0,120 Z"
            fill="url(#darkWaveGradient)"
          />
        </svg>
      </div>

      {/* CTA Banner */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
        {/* Animated gradient orbs in dark section */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/20 to-slate-400/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-orange-500/20 to-pink-600/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-white">Ready to meet your AI-CFO?</h2>
          <p className="text-xl text-slate-300">
            Join hundreds of startups and SMBs making smarter financial decisions with FinaPilot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/30 text-base px-8"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800 text-base px-8 bg-transparent"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">SOC2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">India & Global</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">Bank-grade Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Curved wave divider transitioning to footer */}
      <div className="relative -mt-1">
        <svg className="w-full h-24" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="footerWaveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <path d="M0,32 C480,96 960,96 1440,32 L1440,120 L0,120 Z" fill="url(#footerWaveGradient)" />
        </svg>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-slate-400 rounded-lg flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">
                  Fina
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-slate-400">
                    Pilot
                  </span>
                </span>
              </div>
              <p className="text-sm text-slate-600">Your AI-CFO for smarter financial decisions</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-sm text-slate-600 hover:text-slate-900">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#integrations" className="text-sm text-slate-600 hover:text-slate-900">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Partners
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-600">© 2025 FinaPilot Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                Twitter
              </a>
              <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                LinkedIn
              </a>
              <a href="#" className="text-sm text-slate-600 hover:text-slate-900">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authMode}
        onSuccess={() => {
          // Check if user is authenticated and redirect
          const token = localStorage.getItem("auth-token")
          if (token) {
            onGetStarted()
          }
        }}
      />
    </div>
  )
}
