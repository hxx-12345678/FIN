"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import {
  Menu,
  X,
  Gauge,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  BarChart3,
  Wand2,
  ShieldCheck,
  LockKeyhole,
  Mail,
  Layout,
  Globe,
  TrendingUp,
  Cpu,
  ChevronRight,
} from "lucide-react"

// --- ULTRA PREMIUM 3D COMPONENTS ---

const GlowingBackground = () => (
  <div className="fixed inset-0 -z-50 bg-[#020617] overflow-hidden">
    {/* Infinite Grid Plane */}
    <div 
      className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"
      style={{ transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) scale(2)' }}
    />
    
    {/* Atmospheric Orbs */}
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 50, 0],
        y: [0, 30, 0]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-600/30 blur-[120px]" 
    />
    <motion.div 
      animate={{ 
        scale: [1.2, 1, 1.2],
        opacity: [0.2, 0.4, 0.2],
        x: [0, -40, 0],
        y: [0, -20, 0]
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px]" 
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/80 to-[#020617]" />
  </div>
)

const PremiumCard = ({ children, className = "", delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={`group relative rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-xl p-8 overflow-hidden hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-2xl ${className}`}
    >
      {/* Internal Glow */}
      <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

const TextReveal = ({ children, className = "" }: any) => {
  return (
    <motion.span
      initial={{ y: "100%" }}
      whileInView={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
      className={`inline-block overflow-hidden ${className}`}
    >
      {children}
    </motion.span>
  )
}

const IndustrialDivider = () => (
  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-20" />
)

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

  // Smooth scroll logic
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

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
    <div ref={containerRef} className="relative min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 selection:text-indigo-200 font-sans antialiased">
      <GlowingBackground />

      {/* Navigation - Always Visible with Maximum Z-Index */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-700 ${
          scrolled ? "py-4 bg-[#020617]/80 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_40px_rgba(0,0,0,0.3)]" : "py-10 bg-transparent"
        }`}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform">
              <Gauge className="w-7 h-7 text-[#020617]" />
            </div>
            <span className="text-2xl font-black tracking-tight uppercase italic">
              Fina<span className="text-indigo-500 not-italic">Pilot</span>
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
            {["Platform", "Intelligence", "Pricing", "Audit"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-white transition-all hover:tracking-[0.4em]">
                {l}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="hidden sm:flex font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 h-12 px-6 rounded-full transition-all" 
              onClick={openLogin}
            >
              Login
            </Button>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={openSignup} 
                className="bg-white text-[#020617] hover:bg-slate-200 h-12 px-8 font-black uppercase tracking-widest text-xs rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Pilot
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
              </Button>
            </motion.div>
            <button 
              className="md:hidden p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" 
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
              className="md:hidden bg-[#020617]/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
            >
              <div className="px-6 py-8 space-y-6">
                {["Platform", "Intelligence", "Pricing", "Audit"].map((l) => (
                  <a 
                    key={l} 
                    href={`#${l.toLowerCase()}`} 
                    className="block text-lg font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {l}
                  </a>
                ))}
                <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 h-12 rounded-full font-black uppercase tracking-widest text-xs"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openLogin()
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openSignup()
                    }}
                    className="w-full bg-white text-[#020617] hover:bg-slate-200 h-12 rounded-full font-black uppercase tracking-widest text-xs shadow-lg"
                  >
                    Start Pilot
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - 3D Perspective Headline */}
      <section className="relative pt-[20vh] pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center">
        <div className="max-w-[1400px] w-full mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              Intelligence Layer v2.0 Live
            </div>

            <h1 className="text-[12vw] lg:text-[10vw] font-black tracking-tighter leading-[0.85] uppercase italic select-none">
              <span className="block text-white opacity-90">FINANCIAL</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-purple-600">COMMAND</span>
            </h1>

            <p className="text-xl sm:text-3xl text-slate-400 leading-relaxed max-w-3xl mx-auto font-medium tracking-tight">
              The first Decision Engine for startups. <span className="text-white">Unify your data</span>, simulate the future, and report with 100% confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Button
                size="lg"
                onClick={openSignup}
                className="bg-indigo-600 text-white hover:bg-indigo-500 h-20 px-16 text-xl font-black uppercase tracking-widest rounded-[2rem] shadow-[0_20px_80px_rgba(79,70,229,0.3)] transition-all hover:scale-105 group"
              >
                Start Free Pilot
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-20 px-16 text-xl font-black uppercase tracking-widest rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all"
                onClick={requestDemo}
              >
                Request Demo
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Floating 3D Assets Mockup */}
        <motion.div 
          style={{ rotateX: 15, perspective: 1000 }}
          className="mt-32 w-full max-w-[1200px] relative"
        >
          <div className="absolute inset-0 bg-indigo-500/20 blur-[150px] -z-10 rounded-full" />
          <div className="relative aspect-video rounded-[3rem] border border-white/10 bg-[#020617]/80 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-14 bg-white/5 flex items-center px-8 border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="ml-10 text-[10px] font-black uppercase tracking-widest text-slate-500">LIVE COMMAND CENTER</div>
            </div>
            {/* Mock Content */}
            <div className="pt-20 px-12 grid grid-cols-3 gap-10">
              <div className="space-y-8">
                <div className="h-32 rounded-3xl bg-white/5 border border-white/5 p-6 space-y-4">
                  <div className="h-2 w-20 bg-indigo-500/50 rounded" />
                  <div className="h-8 w-32 bg-white rounded" />
                </div>
                <div className="h-48 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-white/5" />
              </div>
              <div className="col-span-2 rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-10 relative">
                <div className="flex justify-between items-center mb-10">
                  <div className="h-6 w-48 bg-white/10 rounded-full" />
                  <div className="h-6 w-20 bg-green-500/20 rounded-full" />
                </div>
                <div className="h-64 flex items-end gap-4 px-4">
                  {[40, 70, 50, 90, 60, 100, 80, 110, 95, 120, 100].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h * 0.6}%` }}
                      className="flex-1 bg-white/10 rounded-t-lg group-hover:bg-indigo-500/50 transition-colors"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Industrial Capabilities - Combined Section to reduce repetition */}
      <section id="features" className="py-48 px-6 relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-20 items-end mb-32">
            <div className="max-w-2xl space-y-8">
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 py-2 px-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Built for Industrial Scale</Badge>
              <h2 className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic">
                BEYOND <span className="text-slate-700">SHEETS.</span><br />
                REAL <span className="text-indigo-500">SPEED.</span>
              </h2>
            </div>
            <p className="text-xl text-slate-400 font-medium max-w-lg mb-4">
              Stop fighting manual exports. FinaPilot automates the entire upstream data cycle so you can focus on the next $10M decision.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <PremiumCard className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-12 h-full">
                <div className="space-y-8">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tight uppercase italic">Autonomous Data Pipelines</h3>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed">
                    Connect QuickBooks, Stripe, and your ERP once. We handle categorization, deduplication, and reconciliation with 99% accuracy.
                  </p>
                  <Button variant="outline" className="border-white/10 h-14 rounded-2xl uppercase tracking-widest font-black text-[10px]">Explore Connectors</Button>
                </div>
                <div className="relative bg-[#020617] rounded-3xl border border-white/5 p-8 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
                        <div className="flex gap-3 items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                          <div className="h-2 w-24 bg-white/10 rounded" />
                        </div>
                        <div className="h-2 w-12 bg-white/20 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Reconciling 1,240 txns...</div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard>
              <div className="space-y-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center border border-white/10">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tight uppercase italic">Monte Carlo Simulations</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Don't just predict one future. Simulate 1,000+. Understand risk-adjusted runway and probability of success.
                </p>
              </div>
            </PremiumCard>

            <PremiumCard>
              <div className="space-y-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center border border-white/10">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tight uppercase italic">Dynamic AI-CFO</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Ask strategy questions. Get board-ready narratives and actionable task exports to Slack or Asana.
                </p>
              </div>
            </PremiumCard>

            <PremiumCard className="lg:col-span-2">
              <div className="flex flex-col md:flex-row gap-12 h-full items-center">
                <div className="space-y-8 flex-1">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center border border-white/10">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tight uppercase italic">Cell-Level Provenance</h3>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed">
                    Zero-hallucination reporting. Every number in your model can be traced back to its specific source transaction.
                  </p>
                </div>
                <div className="flex-1 w-full bg-white/5 rounded-3xl p-10 border border-white/5 text-center space-y-4">
                  <div className="text-sm font-black uppercase tracking-widest text-indigo-400">Audit Proof</div>
                  <div className="text-5xl font-black tabular-nums">100%</div>
                  <div className="text-[10px] font-bold text-slate-500">LINEAGE VERIFIED</div>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* Industrial Audit Section - White Section for Contrast */}
      <section className="py-48 px-6 bg-white text-[#020617] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <h2 className="text-[8vw] lg:text-[6vw] font-black tracking-tighter leading-[0.85] uppercase italic">
              STOP <span className="text-slate-300">GUESSING.</span><br />
              START <span className="text-indigo-600">COMMANDING.</span>
            </h2>
            <p className="text-2xl text-slate-600 font-medium leading-relaxed max-w-xl tracking-tight">
              Excel is a liability. FinaPilot is your industrial-grade intelligence layer. Move from uncertainty to 95% statistical confidence.
            </p>
            <div className="space-y-8">
              {[
                { t: "Automated Board Packs", d: "3 days of manual preparation turned into 1-click precision exports." },
                { t: "Predictive Burn Analysis", d: "Identify cash-out events 6 months before they happen with AI alerting." }
              ].map((item, i) => (
                <div key={i} className="flex gap-8 items-start group">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-[#020617] text-white flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-all group-hover:rotate-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tight">{item.t}</h4>
                    <p className="text-slate-500 font-medium text-lg leading-snug">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            {/* 3D Visual Box */}
            <div className="absolute inset-0 bg-[#020617]/5 rounded-[4rem] -rotate-3 -z-10 shadow-inner" />
            <div className="bg-slate-50 rounded-[4rem] border border-slate-200 p-16 shadow-2xl relative overflow-hidden">
              <div className="space-y-12">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Risk Assessment</div>
                  <Cpu className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="space-y-10">
                  {[
                    { l: "Manual Error Risk", v: 94, c: "bg-red-500" },
                    { l: "Data Latency", v: 88, c: "bg-orange-500" },
                    { l: "Decision Lag", v: 72, c: "bg-yellow-500" }
                  ].map((s, i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex justify-between font-black uppercase text-xs tracking-widest">
                        <span>{s.l}</span>
                        <span>{s.v}% Impact</span>
                      </div>
                      <div className="h-5 w-full bg-slate-200 rounded-full overflow-hidden p-1 shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.v}%` }}
                          transition={{ duration: 1.5, delay: i * 0.2, ease: "circOut" }}
                          className={`h-full ${s.c} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-sm italic font-medium leading-relaxed pt-6 border-t border-slate-200">
                  "Legacy spreadsheet workflows create an average of 14.2 hidden errors per model, costing Series A teams over $40k/month in missed optimizations."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - High Fashion Cards */}
      <section id="pricing" className="py-48 px-6 bg-[#020617] relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-32 space-y-8">
            <h2 className="text-[6vw] font-black tracking-tighter uppercase italic leading-none">COMMAND <span className="text-indigo-500">TIERS.</span></h2>
            <p className="text-2xl text-slate-500 font-medium tracking-tight">Scale your financial intelligence from Seed to Exit.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 items-stretch">
            {[
              { n: "Starter Pilot", p: "$0", d: "Early Exploration", f: ["1 Workspace", "Core Dashboard", "Manual CSV"] },
              { n: "Growth Command", p: "$199", d: "Forecasting Power", f: ["Unlimited Scenarios", "Monte Carlo Simulations", "Auto-Connectors", "Board Export Pack"], featured: true },
              { n: "Industrial Scale", p: "Custom", d: "Governance & Control", f: ["RBAC & Approvals", "Audit Provenance", "Dedicated Success", "SSO/SAML"] }
            ].map((plan, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -15 }}
                className={`relative flex flex-col p-12 rounded-[3.5rem] border ${plan.featured ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_100px_rgba(79,70,229,0.3)]' : 'bg-white/5 border-white/10 text-white'}`}
              >
                {plan.featured && (
                  <div className="absolute top-0 right-12 -translate-y-1/2 bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Most Popular</div>
                )}
                <div className="flex-1 space-y-10">
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${plan.featured ? 'text-white/60' : 'text-slate-500'}`}>{plan.n}</div>
                    <div className="text-7xl font-black tracking-tighter italic">{plan.p}</div>
                    <p className={`text-sm mt-4 font-bold ${plan.featured ? 'text-white/80' : 'text-indigo-400'}`}>{plan.d}</p>
                  </div>
                  <div className={`h-px w-full ${plan.featured ? 'bg-white/20' : 'bg-white/10'}`} />
                  <ul className="space-y-6">
                    {plan.f.map((f, j) => (
                      <li key={j} className="flex gap-4 items-center font-bold text-sm tracking-tight">
                        <CheckCircle2 className={`w-5 h-5 ${plan.featured ? 'text-white' : 'text-indigo-500'}`} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={plan.n.includes("Scale") ? requestDemo : openSignup}
                  className={`mt-12 h-20 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all ${
                    plan.featured 
                      ? 'bg-white text-indigo-600 hover:bg-slate-100 shadow-2xl' 
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {plan.n.includes("Scale") ? "Contact Sales" : "Start Pilot"}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Kinetic Scroll */}
      <section className="py-48 px-6 bg-[#020617]/50 border-y border-white/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-3 gap-16">
            {[
              { q: "FinaPilot turned our chaotic monthly fire-drills into a smooth check-in. It's absolute clarity.", a: "Alex Rivera", r: "Founder, TechScale" },
              { q: "The cell-level provenance is a game changer for audit. No more spreadsheet forensic work.", a: "Sarah Chen", r: "CFO, Meridian FinTech" },
              { q: "Monte Carlo forecasting gave our investors the confidence they needed to lead our Series B.", a: "James Miller", r: "VP Finance, CloudOptics" }
            ].map((t, i) => (
              <div key={i} className="space-y-8 p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="text-indigo-500 text-6xl font-serif leading-none">“</div>
                <p className="text-2xl text-slate-300 font-medium tracking-tight leading-relaxed italic">
                  {t.q}
                </p>
                <div className="flex items-center gap-5 pt-6 border-t border-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600" />
                  <div>
                    <div className="font-black text-white uppercase tracking-tight">{t.a}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Industrial Terminal Style */}
      <footer className="py-32 px-6 bg-[#020617] relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-12 gap-24 mb-32">
            <div className="md:col-span-5 space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                  <Gauge className="w-8 h-8 text-[#020617]" />
                </div>
                <span className="text-3xl font-black tracking-tight text-white uppercase italic">FinaPilot</span>
              </div>
              <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md tracking-tight">
                Industrial-grade financial intelligence for high-growth teams building the future.
              </p>
              <div className="flex gap-12 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                <a href="#" className="hover:text-indigo-500 transition-colors">TWITTER</a>
                <a href="#" className="hover:text-indigo-500 transition-colors">LINKEDIN</a>
                <a href="#" className="hover:text-indigo-500 transition-colors">GITHUB</a>
              </div>
            </div>
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-16">
              {[
                { t: "Platform", l: ["Features", "Pricing", "Connectors", "Security"] },
                { t: "Company", l: ["About", "Careers", "Contact", "Mission"] },
                { t: "Legal", l: ["Privacy", "Terms", "Compliance", "Cookies"] }
              ].map((col, i) => (
                <div key={i} className="space-y-10">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] opacity-50">{col.t}</h4>
                  <ul className="space-y-6">
                    {col.l.map((link, j) => (
                      <li key={j}>
                        <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm font-black uppercase tracking-widest">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-10">
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} FinaPilot Technologies Pvt. Ltd.
            </p>
            <div className="flex items-center gap-12 grayscale opacity-30">
              <ShieldCheck className="w-8 h-8" />
              <Globe className="w-8 h-8" />
              <LockKeyhole className="w-8 h-8" />
            </div>
          </div>
        </div>
      </footer >

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
