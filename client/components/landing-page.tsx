"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useScroll, AnimatePresence, useInView, useSpring, useTransform, useMotionValue } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import { SimulatorWidget } from "@/components/simulator-widget"
import Link from 'next/link'
import {
  Menu,
  X,
  ArrowRight,
  Database,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Cpu,
  ChevronRight,
  Play,
  Target,
  Users,
  Award,
  Zap,
  Lock,
  Search,
  CheckCircle2,
  Globe,
  Layers,
  Activity,
  BarChart,
  PieChart,
  LineChart,
  Terminal,
  Fingerprint,
  Link as LinkIcon,
  GitBranch,
  History,
  FileSearch,
  BookOpen,
  Eye,
  Settings,
  Server,
  Network,
  Scale,
  Workflow,
  MousePointer2,
  ChevronDown,
  ExternalLink,
  Shield,
  LayoutDashboard,
  Check,
  Smartphone,
  Globe2,
  LockKeyhole,
  UploadCloud,
  Lightbulb,
  FileBarChart2,
  PlayCircle,
  AlertTriangle,
  Network as NetworkIcon
} from "lucide-react"

// --- PROFESSIONAL DESIGN TOKENS ---
const CleanBackground = () => (
  <div className="fixed inset-0 -z-50 bg-[#020305] overflow-hidden">
    {/* Subtle Gradient Glows */}
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[150px] rounded-full" />
    
    {/* Minimal Grid */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
  </div>
)

const IntegratedLogos = () => (
  <div className="w-full py-24 mt-12 relative overflow-hidden">
    <div className="absolute inset-0 bg-blue-500/5 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-16 opacity-80 decoration-blue-500/50 underline-offset-8 underline decoration-2">Natively Integrated with the CFO Stack</p>
      <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-90 transition-all duration-700">
         {["SAP S/4HANA", "Oracle NetSuite", "Stripe", "QuickBooks", "Xero", "Plaid", "Excel", "CSV", "Google Sheets", "Slack", "Zoho Books", "Asana"].map(l => (
           <span key={l} className="text-xl md:text-2xl font-black text-slate-200 tracking-tighter hover:text-blue-400 transition-all cursor-pointer hover:scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{l}</span>
         ))}
      </div>
    </div>
  </div>
)

// Rotating Core Capabilities
const capabilities = [
  {
    category: "Board Reporting & Provenance",
    title: "Deliver absolute certainty under pressure.",
    desc: "Generate perfectly formatted P&L and cashflow statements instantly. Every AI-projected cell is backed by a verifiable Directed Acyclic Graph (DAG), ensuring your board receives 100% auditable, zero-trust financial truth.",
    icon: Database,
    color: "from-blue-500 to-indigo-500"
  },
  {
    category: "Advanced Forecasting",
    title: "Predict runway with statistical precision.",
    desc: "Move beyond linear spreadsheets. FinaPilot parses historical ledger velocity to project revenue and burn rate dynamically. Spot cash crunches months before they happen and optimize resource allocation proactively.",
    icon: TrendingUp,
    color: "from-emerald-400 to-cyan-500"
  },
  {
    category: "Real-Time Scenario Planning",
    title: "Stress-test growth variants instantly.",
    desc: "Leverage our Hyperblock Engine to run 10,000 multi-dimensional Monte Carlo simulations in under 2 seconds. Simulate hiring surges, churn spikes, or pricing changes to immediately see the bottom-line impact.",
    icon: GitBranch,
    color: "from-purple-500 to-pink-500"
  },
  {
    category: "Agentic AI CFO",
    title: "Your autonomous strategic partner.",
    desc: "The Agentic CFO continuously monitors your financial data streams 24/7. It detects spending anomalies, performs natural-language variance analysis, and proactively alerts you to strategic opportunities before you even ask.",
    icon: Cpu,
    color: "from-rose-400 to-orange-500"
  }
]

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")

  // For the moving 3D Hero Effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring animations for smooth 3D tilting
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { damping: 30, stiffness: 100 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { damping: 30, stiffness: 100 })

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX_pos = event.clientX - rect.left
    const mouseY_pos = event.clientY - rect.top
    const xPct = mouseX_pos / width - 0.5
    const yPct = mouseY_pos / height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  // Auto-rotating Capability index
  const [currentCapability, setCurrentCapability] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCapability(prev => (prev + 1) % capabilities.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#020305] text-white font-sans antialiased selection:bg-blue-500/30 overflow-x-hidden w-full">
      <CleanBackground />

      {/* Professional Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[10000] transition-all duration-300 ${
        scrolled ? "py-4 bg-[#020305]/80 backdrop-blur-xl border-b border-slate-800/50 shadow-2xl" : "py-8 bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="/icon.svg" alt="FinaPilot Logo" className="w-8 h-8 rounded-lg shadow-lg" />
             <span className="text-xl font-bold tracking-tight text-white">FinaPilot</span>
          </div>

          <div className="hidden lg:flex items-center gap-10 h-10">
            {/* PLATFORM MEGA MENU */}
            <div className="relative group h-full flex items-center cursor-pointer">
               <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                 Platform <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-transform group-hover:rotate-180" />
               </span>
               <div className="absolute top-full left-0 pt-6 w-[950px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="bg-[#050608] border border-slate-800/80 rounded-[32px] shadow-[0_40px_150px_rgba(0,0,0,0.95)] p-10 grid grid-cols-4 gap-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] pointer-events-none rounded-full" />
                     
                     {/* Column 1: Intelligence & Modeling */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 border-b border-slate-800/50 pb-2">Modeling & Simulation</p>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <GitBranch className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Scenario Planning</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Branch-based multi-track variant modeling.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Real-time What-IF</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Instant impact analysis on P&L variables.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Cpu className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Forecasting Engine</p>
                              <p className="text-[10px] text-slate-400 leading-tight">AI-driven predictive trajectory analysis.</p>
                           </div>
                        </div>
                     </div>

                     {/* Column 2: Data & Trust */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 border-b border-slate-800/50 pb-2">Governance & Trust</p>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Semantic Ledger</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Unified schema for disparate ERP sources.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Fingerprint className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Audit-Grade Traceability</p>
                              <p className="text-[10px] text-slate-400 leading-tight">DAG-backed cell lineages (SOC 2 level).</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Model Architecture</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Atomic structure for infinite scalability.</p>
                           </div>
                        </div>
                     </div>

                     {/* Column 3: Advanced Reporting */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 border-b border-slate-800/50 pb-2">Board & Investors</p>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <LayoutDashboard className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Investor Dashboards</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Live, read-only board reporting portals.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Financial Modeling</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Professional DCF, SaaS, and LBO modeling.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Alerts Management</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Autonomous variance & anomaly detection.</p>
                           </div>
                        </div>
                     </div>

                     {/* Column 4: Strategy */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 border-b border-slate-800/50 pb-2">Strategic Direction</p>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <TrendingUp className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Monte Carlo Runway</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Probabilistic cash survival projections.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <LockKeyhole className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Budget vs Actual</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Neural variance gap analysis.</p>
                           </div>
                        </div>
                        <div className="group/item flex gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors cursor-pointer">
                           <Target className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-sm font-bold text-white mb-0.5">Resource Allocations</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Headcount & CAPEX optimization logic.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <a href="#" className="flex items-center h-full text-sm font-medium text-slate-300 hover:text-white transition-colors">Governance</a>
            <a href="#" className="flex items-center h-full text-sm font-medium text-slate-300 hover:text-white transition-colors">Hyperblock™</a>

            {/* INTEGRATIONS MEGA MENU */}
            <div className="relative group h-full flex items-center cursor-pointer">
               <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                 Integrations <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-transform group-hover:rotate-180" />
               </span>
               <div className="absolute top-full left-[-200px] pt-6 w-[700px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="bg-[#0B0E14]/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-8 relative overflow-hidden">
                     
                     <div className="flex gap-10">
                        {/* Live Instantly */}
                        <div className="w-1/3 border-r border-slate-800/50 pr-8">
                           <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                             Seamless Sync
                           </p>
                           <div className="space-y-4">
                              <div className="flex items-center gap-3"><FileBarChart2 className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-300 font-medium">Excel (.XLSX)</span></div>
                              <div className="flex items-center gap-3"><FileSearch className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-300 font-medium">CSV Bulk Upload</span></div>
                           </div>
                        </div>

                        {/* Beta Track */}
                        <div className="flex-1">
                           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                             <span>Native OS Connectors</span>
                             <Badge className="bg-slate-800 text-slate-400 hover:bg-slate-800 border-none text-[9px]">DESIGN PARTNERS ONLY</Badge>
                           </div>
                           <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                             FinaPilot utilizes SOC 2 encrypted pipeline infrastructure to securely mirror ERP ledgers. We are currently rolling out native sync capabilities directly to verified B2B partners.
                           </p>
                           <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                             {["SAP S/4HANA", "Oracle Financials", "QuickBooks Online", "Xero", "Zoho Books", "Stripe", "Razorpay", "Plaid", "ClearTax", "Asana", "Salesforce", "Slack"].map(app => (
                               <div key={app} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                                  <span className="text-xs font-medium text-slate-300 opacity-70 leading-tight">{app}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>

                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => { setAuthMode("login"); setAuthModalOpen(true); }} 
              className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <Button 
              onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }} 
              className="bg-blue-600 text-white hover:bg-blue-500 rounded-full px-5 sm:px-8 h-9 sm:h-10 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
            >
              Join <span className="hidden sm:inline">&nbsp;Design Partner Program</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* SECTION 1: PRO 3D HERO */}
      <section className="relative pt-48 pb-20 px-3 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
           {/* Text Content */}
           <div className="text-center max-w-4xl mx-auto space-y-8 mb-16 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-xl"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
                <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">Agentic FP&A OS v1.0</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-5xl sm:text-6xl md:text-[80px] font-bold tracking-tight text-white leading-[1.05]"
              >
                Zero-Trust Finance <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                  Built on Provenance.
                </span>
              </motion.h1>
              
              <motion.p
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.2 }}
                 className="text-xl text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-sm"
              >
                 Traditional forecasting is opaque. FinaPilot utilizes an <span className="text-white font-bold">Autonomous Agentic Swarm</span> and <span className="text-white font-bold">DAGs</span> to ensure every AI-generated forecast cell is 100% auditable back to its exact ERP transaction.
              </motion.p>
              
              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.4 }}
                 className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4"
              >
                 <Button 
                    onClick={() => { window.location.href = "https://fina-pilot.vercel.app/" }}
                    className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-500 h-14 px-10 text-base font-bold rounded-full shadow-2xl shadow-blue-600/30"
                 >
                    Join Design Partner Program
                 </Button>
                 <Button onClick={() => window.open("https://calendly.com/finapilot/30min", "_blank")} variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-bold text-slate-300 border-slate-700 bg-slate-900/50 hover:text-white hover:bg-slate-800 rounded-full">
                    <PlayCircle className="w-5 h-5 mr-3" />
                    Watch Demo
                 </Button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap justify-center gap-6 pt-6"
              >
                 <span className="px-3 py-1 rounded bg-slate-800/50 text-[10px] text-slate-400 font-bold tracking-wider uppercase border border-slate-700/50">SOC 2 Ready Architecture</span>
                 <span className="px-3 py-1 rounded bg-slate-800/50 text-[10px] text-slate-400 font-bold tracking-wider uppercase border border-slate-700/50">GDPR Ready</span>
                 <span className="px-3 py-1 rounded bg-slate-800/50 text-[10px] text-slate-400 font-bold tracking-wider uppercase border border-slate-700/50">Audit-Grade Lineage</span>
              </motion.div>
           </div>
           
           {/* High-Fidelity Laptop Screen Recording Video Container */}
           <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative max-w-6xl mx-auto px-2 sm:px-4"
           >
              <div className="relative rounded-2xl sm:rounded-[40px] border border-white/10 bg-[#0B0E14] shadow-[0_0_100px_rgba(37,99,235,0.15)] overflow-hidden aspect-video group shadow-2xl">
                 {/* Video Playback */}
                 <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover"
                    poster="/placeholder.jpg"
                 >
                    <source src="/demo-video.mp4" type="video/mp4" />
                    {/* Fallback for browsers that don't support video */}
                    Your browser does not support the video tag.
                 </video>

                 {/* Subtle Overlay Glow */}
                 <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                 
                 {/* Top Chrome Element (Institutional) */}
                 <div className="absolute top-0 inset-x-0 h-10 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center px-4 justify-between z-10 pointer-events-none">
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-white/20" />
                       <div className="w-2 h-2 rounded-full bg-white/20" />
                       <div className="w-2 h-2 rounded-full bg-white/20" />
                    </div>
                    <div className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em]">FinaPilot Strategic Intelligence v1.0</div>
                    <div className="w-10" />
                 </div>
              </div>

              {/* Verified Badge */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-2xl flex items-center gap-2.5 z-20 whitespace-nowrap">
                 <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                 <span className="text-[10px] font-black text-slate-300 tracking-[0.15em] uppercase">Enterprise-Grade Architecture Certified</span>
              </div>
           </motion.div>
        </div>
      </section>

      <IntegratedLogos />

      {/* SECTION 2: HOW IT WORKS (Autonomous Provenance Flow) */}
      <section className="py-32 px-6">
         <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
               <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">The Autonomous FP&A Workflow</h2>
               <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">From raw data to board-ready strategic foresight.</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8">
               <ProcessCard 
                 step="01"
                 icon={UploadCloud} 
                 title="Ingest & Sync" 
                 desc="Securely connect ERP, bank feeds, or CSVs. Data encrypted at rest via SOC 2 ready infrastructure." 
               />
               <ProcessCard 
                 step="02"
                 icon={NetworkIcon} 
                 title="Atomic Architecture" 
                 desc="AI normalizes disparate ledger formats into a singular, unified data schema with multi-dimensional model nodes." 
               />
               <ProcessCard 
                 step="03"
                 icon={Cpu} 
                 title="Neural Modeling" 
                 desc="Engine processes 10,000 statistical variances instantly across DCF, LBO, and SaaS-specific model logic." 
               />
               <ProcessCard 
                 step="04"
                 icon={GitBranch} 
                 title="DAG Auditing" 
                 desc="Extract fully lineage-traced board reports where every number proves its own mathematical origin." 
               />
            </div>
         </div>
      </section>

      {/* SECTION 3: ROTATING STRATEGIC CAPABILITIES */}
      <section className="py-32 bg-slate-900/40 border-y border-slate-800/50 px-6 overflow-hidden">
         <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center"
         >
            
            {/* Context Side */}
            <div className="space-y-10">
               <div className="space-y-4">
                  <Badge className="bg-slate-800 text-slate-300 border-none px-4 py-1.5 font-bold uppercase text-[11px] tracking-wider shrink-0">Platform Architecture</Badge>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                     End-to-End <br className="hidden md:block"/>
                     Financial Intelligence.
                  </h2>
                  <p className="text-lg text-slate-400 leading-relaxed font-medium">
                     The modern CFO cannot rely on fragmented data. FinaPilot dynamically anticipates and solves the biggest reporting, forecasting, and strategic bottlenecks in real-time.
                  </p>
               </div>
               
               {/* Progress Indicators */}
               <div className="flex gap-3 mt-8">
                  {capabilities.map((cap, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setCurrentCapability(idx)}
                      className={`h-1.5 flex-1 rounded-full overflow-hidden cursor-pointer transition-colors ${currentCapability === idx ? "bg-slate-700" : "bg-slate-800"}`}
                    >
                       <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: currentCapability === idx ? "100%" : currentCapability > idx ? "100%" : "0%" }}
                          transition={currentCapability === idx ? { duration: 8, ease: "linear" } : { duration: 0 }}
                       />
                    </div>
                  ))}
               </div>
               
               {/* Responsive Labels */}
               <div className="hidden md:flex justify-between w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-1">
                  <span>Board Prep</span>
                  <span className="pl-4">Forecasting</span>
                  <span className="pr-2">Scenario Plan</span>
                  <span>Agentic CFO</span>
               </div>
               <div className="md:hidden flex justify-center w-full text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-3">
                  {capabilities[currentCapability].category}
               </div>
               
               <div className="pt-6 border-t border-slate-800 mt-6">
                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Powered by 12 Autonomous Agents</p>
                 <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-400">
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Data Extractor</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Semantic Mapper</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Anomaly Detector</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Variance Analyzer</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Monte Carlo Engine</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Payroll Predictor</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">CAPEX Modeler</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Debt Scheduler</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Consolidation Engine</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Currency Converter</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Compliance Auditor</span>
                    <span className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">Strategic Director</span>
                 </div>
               </div>
               
               <Button 
                 onClick={() => { window.location.href = "https://fina-pilot.vercel.app/" }}
                 className="bg-white text-slate-900 hover:bg-slate-200 h-14 px-10 text-base font-bold rounded-full mt-4"
               >
                  Deploy Agentic OS
               </Button>
            </div>
            
            {/* Dynamic Solution Side */}
            <div className="relative h-[420px]">
               <AnimatePresence mode="wait">
                  {(() => {
                    const CurrentIcon = capabilities[currentCapability].icon;
                    return (
                      <motion.div
                         key={currentCapability}
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 1.05 }}
                         transition={{ duration: 0.5 }}
                         className="absolute inset-0 rounded-[32px] border border-slate-800 bg-slate-900/80 shadow-2xl p-10 flex flex-col justify-center backdrop-blur-xl"
                      >
                         <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${capabilities[currentCapability].color} p-[1px] mb-8`}>
                            <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                               <CurrentIcon className="w-8 h-8 text-white" />
                            </div>
                         </div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{capabilities[currentCapability].category}</p>
                         <h3 className="text-3xl font-bold text-white mb-4 leading-tight">{capabilities[currentCapability].title}</h3>
                         <p className="text-lg text-slate-400 leading-relaxed font-medium">{capabilities[currentCapability].desc}</p>
                      </motion.div>
                    );
                  })()}
               </AnimatePresence>
            </div>
         </motion.div>
      </section>

      {/* SECTION 4: PLAYGROUND */}
      <section className="py-32 px-6">
         <div className="max-w-[1400px] mx-auto space-y-16">
            <div className="text-center space-y-4">
               <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Experience the Hyperblock Engine</h2>
               <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">Adjust the parameters below. The agent runs a full re-forecast instantaneously.</p>
            </div>
            
            <div className="rounded-[40px] border border-slate-800/50 bg-[#0B0E14] shadow-2xl p-2 relative z-20">
               <SimulatorWidget />
            </div>
         </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 px-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-blue-600/5" />
         <div className="max-w-4xl mx-auto text-center relative z-10 space-y-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
               Finance requires <br/> <span className="italic text-slate-300">explainability.</span>
            </h2>
            <p className="text-xl text-slate-400 font-medium mb-10">
               Stop trusting black-box AI. Start using verifiable, agentic intelligence to back your intuition.
            </p>
            <Button 
               onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
               className="bg-blue-600 text-white hover:bg-blue-500 h-16 px-12 text-lg font-bold rounded-full shadow-2xl shadow-blue-600/30"
            >
               Join Design Partner Program
            </Button>
         </div>
      </section>

      {/* Minimal Institutional Footer */}
      <footer className="py-20 bg-slate-950 border-t border-slate-900 px-6 text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="FinaPilot Logo" className="w-6 h-6 rounded" />
              <span className="text-lg font-bold tracking-tight text-white">FinaPilot</span>
           </div>
           
           <div className="flex gap-6 md:gap-10 text-xs md:text-sm font-semibold flex-wrap justify-center">
              <Link href="/legal/data-privacy-security" className="text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-blue-500/50 underline-offset-4 decoration-2">Global Data Privacy</Link>
              <Link href="/legal/master-subscription-agreement" className="text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-blue-500/50 underline-offset-4 decoration-2">Master Subscription Agreement</Link>
              <a href="#" className="text-slate-400 hover:text-white transition-all underline decoration-transparent hover:decoration-blue-500/50 underline-offset-4 decoration-2">Trust & SOC 2</a>
           </div>
           
           <p className="text-sm font-medium">
             &copy; {new Date().getFullYear()} FinaPilot Technologies Inc.
           </p>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authMode}
      />
    </div>
  )
}

// --- REFINED UI COMPONENTS ---
const ProcessCard = ({ step, icon: Icon, title, desc }: any) => (
  <div className="p-8 rounded-[40px] bg-slate-900/40 border border-slate-800/80 relative shadow-2xl group hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm overflow-hidden">
     <div className="absolute top-0 right-0 p-8 flex flex-col items-end opacity-10 group-hover:opacity-20 transition-opacity">
        <div className="text-8xl font-black text-blue-500 leading-none tracking-tighter select-none">{step}</div>
     </div>
     <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-blue-400 mb-10 relative z-10 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all duration-300">
        <Icon className="w-8 h-8" />
     </div>
     <h3 className="text-2xl font-black text-white mb-4 tracking-tight relative z-10">{title}</h3>
     <p className="text-base text-slate-300 font-medium leading-relaxed relative z-10">{desc}</p>
     <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 w-0 group-hover:w-full transition-all duration-700" />
  </div>
)
