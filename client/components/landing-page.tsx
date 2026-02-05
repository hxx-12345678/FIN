"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import {
  Menu,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  BarChart3,
  Wand2,
  ShieldCheck,
  LockKeyhole,
  Mail,
  TrendingUp,
  Cpu,
  ChevronRight,
  Play,
  Zap,
  Target,
  Users,
  Building2,
  Globe,
  Award,
  Clock,
  FileText,
  PieChart,
  LineChart,
  Brain,
  MessageSquare,
  AlertCircle,
  Star,
  Quote,
} from "lucide-react"
// Image component will be used for Next.js Image optimization

// --- PREMIUM BACKGROUND COMPONENTS ---

const GlowingBackground = () => (
  <div className="fixed inset-0 -z-50 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden">
    {/* Subtle grid pattern */}
    <div 
      className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"
    />
    
    {/* Soft gradient orbs */}
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.2, 0.1],
        x: [0, 50, 0],
        y: [0, 30, 0]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-[120px]" 
    />
    <motion.div 
      animate={{ 
        scale: [1.2, 1, 1.2],
        opacity: [0.1, 0.15, 0.1],
        x: [0, -40, 0],
        y: [0, -20, 0]
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute top-[20%] right-0 w-[500px] h-[500px] rounded-full bg-indigo-400/15 blur-[100px]" 
    />
  </div>
)

const PremiumCard = ({ children, className = "", delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// --- MAIN LANDING PAGE ---

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const openSignup = () => {
    setAuthMode("signup")
    setAuthModalOpen(true)
  }

  const openLogin = () => {
    setAuthMode("login")
    setAuthModalOpen(true)
  }

  const requestDemo = () => {
    window.location.href = `mailto:sales@finapilot.ai?subject=FinaPilot%20Demo%20Request`
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-white text-slate-900 font-sans antialiased">
      <GlowingBackground />

      {/* Navigation - Professional & Trustworthy */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
          scrolled ? "py-4 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm" : "py-6 bg-white/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            {/* Use the icon.svg favicon as logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <img 
                src="/icon.svg" 
                alt="FinaPilot Logo" 
                className="w-6 h-6"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Fina<span className="text-blue-600">Pilot</span>
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {["Features", "How It Works", "Pricing", "Resources"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} className="hover:text-blue-600 transition-colors">
                {l}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="hidden sm:flex font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100" 
              onClick={openLogin}
            >
              Sign In
            </Button>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={openSignup} 
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/25 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-6 space-y-4">
                {["Features", "How It Works", "Pricing", "Resources"].map((l) => (
                  <a 
                    key={l} 
                    href={`#${l.toLowerCase().replace(" ", "-")}`} 
                    className="block text-base font-medium text-slate-600 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {l}
                  </a>
                ))}
                <div className="pt-4 border-t border-slate-200 flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openLogin()
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openSignup()
                    }}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Get Started Free
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - Trust-Building & Clear Value Prop */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold"
            >
              <Star className="w-4 h-4 fill-blue-600" />
              Trusted by Finance Teams Worldwide
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900"
            >
              Your AI-Powered{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Financial Copilot
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-medium"
            >
              Build complete financial models in minutes. Get AI-powered forecasting, scenario planning, and investor-ready reports—all in one platform.
            </motion.p>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-8 pt-4 text-sm text-slate-500"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="font-medium">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <LockKeyhole className="w-5 h-5 text-green-600" />
                <span className="font-medium">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="font-medium">GDPR Ready</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
            >
              <Button
                size="lg"
                onClick={openSignup}
                className="bg-blue-600 text-white hover:bg-blue-700 h-14 px-8 text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-semibold border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600"
                onClick={requestDemo}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Social Proof - No Credit Card Required */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-sm text-slate-500 pt-4"
            >
              No credit card required • 14-day free trial • Setup in 5 minutes
            </motion.p>
          </div>

          {/* Hero Image/Video Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 relative"
          >
            <div className="relative aspect-video rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden shadow-2xl">
              {/* Video/Image Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-slate-600 font-medium">Product Demo Video</p>
                  <p className="text-sm text-slate-500">Replace this placeholder with your product video or screenshot</p>
                </div>
              </div>
              
              {/* Optional: Add a screenshot overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar - Logos/Partners */}
      <section className="py-12 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-semibold text-slate-500 mb-8 uppercase tracking-wide">
            Trusted by Finance Teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale">
            {/* Placeholder for partner logos - Replace with actual logos */}
            {["TechScale", "Meridian", "CloudOptics", "DataFlow", "NextGen"].map((name, i) => (
              <div key={i} className="text-2xl font-bold text-slate-400">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 py-1.5 px-4 text-sm font-semibold">
              Powerful Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Everything You Need to Master Your Finances
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              From automated data integration to AI-powered insights—all in one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: "Automated Data Integration",
                description: "Connect QuickBooks, Stripe, and 20+ accounting systems. Automatic categorization, deduplication, and reconciliation with 99% accuracy.",
                color: "blue"
              },
              {
                icon: Brain,
                title: "AI CFO Assistant",
                description: "Ask financial questions in plain English. Get instant insights, variance analysis, and strategic recommendations powered by advanced AI.",
                color: "indigo"
              },
              {
                icon: BarChart3,
                title: "Monte Carlo Forecasting",
                description: "Run 1,000+ simulations to understand risk-adjusted runway, probability of success, and confidence intervals for every forecast.",
                color: "purple"
              },
              {
                icon: TrendingUp,
                title: "Scenario Planning",
                description: "Model multiple futures instantly. Compare best-case, worst-case, and custom scenarios side-by-side with real-time updates.",
                color: "green"
              },
              {
                icon: FileText,
                title: "Investor-Ready Reports",
                description: "Generate board packs, investor decks, and financial statements in one click. Export to PDF, PowerPoint, or Excel with full formatting.",
                color: "orange"
              },
              {
                icon: ShieldCheck,
                title: "Cell-Level Provenance",
                description: "Every number in your model is traceable to its source. Full audit trail for compliance, due diligence, and investor questions.",
                color: "red"
              },
            ].map((feature, i) => (
              <PremiumCard key={i} delay={i * 0.1}>
                <div className="space-y-4">
                  <div className={`w-14 h-14 rounded-xl bg-${feature.color}-100 flex items-center justify-center`}>
                    <feature.icon className={`w-7 h-7 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </PremiumCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 py-1.5 px-4 text-sm font-semibold">
              Simple Process
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Get Started in Minutes, Not Months
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              No complex setup. No lengthy implementations. Just connect your data and start making better decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Your Data",
                description: "Link your accounting system (QuickBooks, Xero, Stripe) or upload CSV files. We handle the rest automatically.",
                icon: Database
              },
              {
                step: "02",
                title: "AI Builds Your Model",
                description: "Our AI analyzes your data and creates a complete financial model with P&L, cash flow, and runway projections.",
                icon: Wand2
              },
              {
                step: "03",
                title: "Make Better Decisions",
                description: "Run scenarios, get AI insights, and generate investor-ready reports—all in one place.",
                icon: Target
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Video/Demo Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 py-1.5 px-4 text-sm font-semibold">
                See It In Action
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
                Watch How FinaPilot Transforms Financial Planning
              </h2>
              <p className="text-xl text-slate-600 font-medium leading-relaxed">
                See how finance teams use FinaPilot to automate reporting, run scenarios, and get AI-powered insights in minutes instead of days.
              </p>
              <ul className="space-y-4 pt-4">
                {[
                  "Automated data integration and reconciliation",
                  "AI-powered forecasting and scenario planning",
                  "One-click investor-ready report generation",
                  "Real-time collaboration and approvals"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Button
                  size="lg"
                  onClick={requestDemo}
                  className="bg-blue-600 text-white hover:bg-blue-700 h-12 px-8 font-semibold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Request Personalized Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-video rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden shadow-2xl">
                {/* Video Placeholder - Replace with actual video embed */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-blue-600 flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-12 h-12 text-white ml-1" />
                    </div>
                    <p className="text-slate-700 font-semibold text-lg">Product Demo Video</p>
                    <p className="text-sm text-slate-500">Embed your demo video here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge className="bg-green-50 text-green-700 border-green-200 py-1.5 px-4 text-sm font-semibold">
              Trusted by Finance Leaders
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              What Finance Teams Are Saying
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              See how FinaPilot helps finance teams make faster, smarter decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "FinaPilot transformed our monthly close from a 3-day fire drill into a smooth, automated process. The AI insights help us catch issues before they become problems.",
                author: "Sarah Chen",
                role: "CFO",
                company: "Meridian FinTech"
              },
              {
                quote: "The cell-level provenance feature is a game-changer for audits. We can trace every number back to its source transaction in seconds, not hours.",
                author: "Alex Rivera",
                role: "VP Finance",
                company: "TechScale"
              },
              {
                quote: "Monte Carlo forecasting gave our investors the confidence they needed. We can now show probability distributions, not just point estimates.",
                author: "James Miller",
                role: "Finance Director",
                company: "CloudOptics"
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
              >
                <div className="space-y-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-blue-600 opacity-50" />
                  <p className="text-slate-700 leading-relaxed font-medium text-lg">
                    "{testimonial.quote}"
                  </p>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="font-bold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 py-1.5 px-4 text-sm font-semibold">
              Transparent Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Choose the Plan That Fits Your Needs
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              Start free, upgrade as you grow. All plans include our core features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "forever",
                description: "Perfect for trying FinaPilot",
                features: [
                  "1 workspace",
                  "Core dashboard",
                  "Manual CSV import",
                  "Basic forecasting",
                  "Email support"
                ],
                cta: "Start Free",
                popular: false
              },
              {
                name: "Professional",
                price: "$199",
                period: "per month",
                description: "For growing finance teams",
                features: [
                  "Unlimited workspaces",
                  "Automated connectors",
                  "Monte Carlo simulations",
                  "AI CFO Assistant",
                  "Scenario planning",
                  "Investor-ready exports",
                  "Priority support"
                ],
                cta: "Start Free Trial",
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "pricing",
                description: "For large organizations",
                features: [
                  "Everything in Professional",
                  "Advanced RBAC & approvals",
                  "Cell-level provenance",
                  "Dedicated success manager",
                  "SSO/SAML integration",
                  "Custom integrations",
                  "24/7 phone support"
                ],
                cta: "Contact Sales",
                popular: false
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? "border-blue-600 bg-blue-50 shadow-xl scale-105"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                      {plan.period !== "forever" && (
                        <span className="text-slate-600 font-medium">/{plan.period}</span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-2 font-medium">{plan.description}</p>
                  </div>
                  <ul className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          plan.popular ? "text-blue-600" : "text-green-600"
                        }`} />
                        <span className="text-slate-700 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={plan.name === "Enterprise" ? requestDemo : openSignup}
                    className={`w-full h-12 font-semibold ${
                      plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Money-Back Guarantee */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-50 border border-green-200 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <div className="font-bold text-green-900">14-Day Money-Back Guarantee</div>
                <div className="text-sm text-green-700">Not satisfied? Get a full refund, no questions asked.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ready to Transform Your Financial Planning?
          </h2>
          <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto">
            Join finance teams who are already using FinaPilot to make faster, smarter decisions. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={openSignup}
              className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 text-lg font-semibold shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={requestDemo}
              className="h-14 px-8 text-lg font-semibold border-2 border-white text-white hover:bg-white/10"
            >
              Schedule a Demo
            </Button>
          </div>
          <p className="text-sm text-blue-200 pt-4">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 mb-12">
            <div className="md:col-span-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <img 
                    src="/icon.svg" 
                    alt="FinaPilot Logo" 
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-xl font-bold text-white">
                  Fina<span className="text-blue-400">Pilot</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-md">
                Your AI-powered financial copilot. Build models, run forecasts, and generate reports—all in one platform.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <span className="sr-only">Twitter</span>
                  <Globe className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Users className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                {
                  title: "Product",
                  links: ["Features", "Pricing", "Integrations", "Security"]
                },
                {
                  title: "Resources",
                  links: ["Documentation", "Blog", "Case Studies", "Support"]
                },
                {
                  title: "Company",
                  links: ["About", "Careers", "Contact", "Partners"]
                },
                {
                  title: "Legal",
                  links: ["Privacy", "Terms", "Compliance", "Cookies"]
                },
              ].map((col, i) => (
                <div key={i} className="space-y-4">
                  <h4 className="font-bold text-white uppercase text-sm tracking-wide">{col.title}</h4>
                  <ul className="space-y-3">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-slate-500 text-sm font-medium">
              © {new Date().getFullYear()} FinaPilot Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-slate-500">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <LockKeyhole className="w-4 h-4" />
                <span>Bank-Level Security</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authMode}
        onSuccess={() => {
          const token = localStorage.getItem("auth-token")
          if (token) onGetStarted()
        }}
      />
    </div>
  )
}
