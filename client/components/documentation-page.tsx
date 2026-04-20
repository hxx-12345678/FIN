"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { 
  BookOpen, Shield, Database, BrainCircuit, LineChart, CheckCircle2, 
  Terminal, Server, Code2, AlertCircle, Copy, Check, ShieldCheck,
  Settings, Lock, Key, Users, Workflow, ArrowRight, LinkIcon,
  Calculator, Zap, Target, BarChart3, PieChart, TrendingUp, Brain,
  Search, ChevronRight, FileText, Activity, Layers, MessageSquare,
  GitBranch, Eye, Globe, CreditCard, HelpCircle, Briefcase,
  ThumbsUp, ThumbsDown, ExternalLink, Clock, ArrowLeft,
  Building2, Gauge, Bell, Network, Bot, Table, Boxes
} from "lucide-react"

// ─── Section Data ────────────────────────────────────────────────────────────
const sectionCategories = [
  {
    name: "Getting Started",
    sections: [
      { id: "overview", title: "Platform Overview", icon: BookOpen, description: "Architecture, principles, and capabilities" },
      { id: "quickstart", title: "Quick Start Guide", icon: Zap, description: "Get up and running in under 10 minutes" },
      { id: "glossary", title: "Glossary of Terms", icon: FileText, description: "Key financial and platform terminology" },
    ]
  },
  {
    name: "Platform Capabilities",
    sections: [
      { id: "modeling", title: "Financial Modeling", icon: BarChart3, description: "Driver-based models with real-time computation" },
      { id: "budgeting", title: "Budgeting & Planning", icon: Target, description: "Collaborative budgets and rolling forecasts" },
      { id: "scenarios", title: "Scenario Planning", icon: GitBranch, description: "What-if analysis with instant comparison" },
      { id: "forecasting", title: "AI Forecasting", icon: BrainCircuit, description: "Monte Carlo simulations with 5,000+ iterations" },
      { id: "headcount", title: "Headcount Planning", icon: Users, description: "Workforce dynamics and ramp modeling" },
    ]
  },
  {
    name: "Data & Integrations",
    sections: [
      { id: "ingestion", title: "Data Ingestion Engine", icon: Database, description: "Multi-channel data synchronization" },
      { id: "connectors", title: "Connectors & ERPs", icon: Network, description: "NetSuite, Xero, QuickBooks, Sage, and more" },
      { id: "ledger", title: "Semantic Ledger", icon: Server, description: "Immutable truth store with evidence tracking" },
    ]
  },
  {
    name: "Reporting & Output",
    sections: [
      { id: "dashboards", title: "Dashboards & KPIs", icon: Gauge, description: "Real-time executive performance monitoring" },
      { id: "reporting", title: "Board Reporting", icon: Briefcase, description: "Institutional-grade board decks and PDFs" },
      { id: "analytics", title: "Reports & Analytics", icon: PieChart, description: "Automated variance analysis and P&L tracking" },
      { id: "investor", title: "Investor Dashboard", icon: TrendingUp, description: "Investor-ready metrics and data rooms" },
    ]
  },
  {
    name: "Governance & Security",
    sections: [
      { id: "auth", title: "Authentication & MFA", icon: Lock, description: "Zero-trust authentication pipeline" },
      { id: "governance", title: "Approvals & Workflows", icon: ShieldCheck, description: "Multi-stage approval with RBAC enforcement" },
      { id: "audit", title: "Audit Trail", icon: Eye, description: "Immutable logs with SHA-256 integrity hashing" },
      { id: "compliance", title: "Compliance & SOC 2", icon: Shield, description: "SOC 2 Type II, GDPR, and data residency" },
    ]
  },
  {
    name: "Developer Reference",
    sections: [
      { id: "api", title: "REST API Reference", icon: Code2, description: "Endpoints, authentication, and rate limits" },
      { id: "webhooks", title: "Webhooks & Events", icon: Bell, description: "Real-time event-driven notifications" },
      { id: "ai-assistant", title: "AI CFO Assistant", icon: Bot, description: "Natural language financial querying" },
    ]
  },
  {
    name: "Help & Support",
    sections: [
      { id: "faq", title: "Frequently Asked Questions", icon: HelpCircle, description: "Common questions answered" },
      { id: "changelog", title: "Changelog & Releases", icon: Activity, description: "Latest platform updates and improvements" },
    ]
  },
]

const allSections = sectionCategories.flatMap(cat => cat.sections.map(s => ({ ...s, category: cat.name })))

export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("overview")
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({})

  const copyCode = (code: string, section: string) => {
    navigator.clipboard.writeText(code)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  // Listen for navigation events from other components (e.g., Onboarding page)
  useEffect(() => {
    const handleDocsNavigate = (e: CustomEvent<{ section: string }>) => {
      const sectionId = e.detail.section
      const validSection = allSections.find(s => s.id === sectionId)
      if (validSection) {
        setActiveSection(sectionId)
      }
    }
    window.addEventListener("docs-navigate", handleDocsNavigate as EventListener)
    return () => window.removeEventListener("docs-navigate", handleDocsNavigate as EventListener)
  }, [])

  const currentSection = allSections.find(s => s.id === activeSection)
  const currentCategory = currentSection?.category || "Getting Started"

  // Search filter for sidebar
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sectionCategories
    const q = searchQuery.toLowerCase()
    return sectionCategories
      .map(cat => ({
        ...cat,
        sections: cat.sections.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
        )
      }))
      .filter(cat => cat.sections.length > 0)
  }, [searchQuery])

  const giveFeedback = (section: string, type: "up" | "down") => {
    setFeedbackGiven(prev => ({ ...prev, [section]: type }))
  }

  // Get next section for "Next" navigation
  const currentIndex = allSections.findIndex(s => s.id === activeSection)
  const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* ─── Sidebar Navigation ─────────────────────────────────────────── */}
      <aside className="w-full md:w-72 border-r border-slate-200 bg-slate-50/50 md:sticky md:top-0 md:h-screen overflow-y-auto hidden md:block shrink-0">
        <div className="p-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="text-xs">✕</span>
              </button>
            )}
          </div>

          {/* Navigation */}
          {filteredCategories.map((cat) => (
            <div key={cat.name}>
              <h3 className="font-black text-[10px] tracking-widest uppercase text-slate-400 mb-2 px-2">{cat.name}</h3>
              <div className="space-y-0.5">
                {cat.sections.map((section) => (
                  <button 
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); setSearchQuery("") }} 
                    className={`flex items-center text-xs w-full text-left py-2 px-3 rounded-xl transition-all duration-200 font-semibold ${activeSection === section.id ? "bg-white shadow-sm border border-slate-200 text-blue-600 font-bold" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"}`}
                  >
                    <section.icon className={`mr-2.5 h-3.5 w-3.5 shrink-0 ${activeSection === section.id ? "text-blue-600" : "text-slate-400"}`} /> 
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ─── Main Content Area ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-14">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-6 font-medium">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveSection("overview")}>Docs</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-500">{currentCategory}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700 font-bold">{currentSection?.title}</span>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW SECTION                                               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-black text-[10px] px-2 py-0.5">V1.0</Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px] px-2 py-0.5">ENTERPRISE READY</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-slate-900 leading-tight">FinaPilot Platform<br />Documentation</h1>
              <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium max-w-2xl">
                FinaPilot is an institutional-grade Financial Planning & Analysis (FP&A) operating system. Build driver-based models, run Monte Carlo simulations, automate board reporting, and maintain an immutable audit trail—all from a single platform.
              </p>
              
              {/* Capability cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
                {[
                  { icon: BarChart3, title: "Financial Modeling", desc: "Build multi-scenario, driver-based P&L, cash flow, and balance sheet models with real-time computation.", color: "blue", link: "modeling" },
                  { icon: BrainCircuit, title: "AI-Powered Forecasting", desc: "5,000+ Monte Carlo simulations generate probabilistic outcome cones with P5/P50/P95 thresholds.", color: "purple", link: "forecasting" },
                  { icon: ShieldCheck, title: "Governance & Compliance", desc: "4-Eye approval workflows, immutable audit trails, and SOC 2 Type II certification.", color: "emerald", link: "governance" },
                  { icon: Database, title: "Unified Data Layer", desc: "Sync ERP, CRM, and HR data through managed connectors with automated schema validation.", color: "indigo", link: "ingestion" },
                  { icon: Briefcase, title: "Board Reporting", desc: "Generate audit-ready board decks with AI-synthesized executive summaries in PDF format.", color: "amber", link: "reporting" },
                  { icon: Bot, title: "AI CFO Assistant", desc: "Natural language querying across all financial data with cited, auditable responses.", color: "rose", link: "ai-assistant" },
                ].map((item) => (
                  <div key={item.title} className={`p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-${item.color}-100 transition-all shadow-sm hover:shadow-md group cursor-pointer`} onClick={() => setActiveSection(item.link)}>
                    <item.icon className={`h-7 w-7 text-${item.color}-500 mb-3 group-hover:scale-110 transition-transform`} />
                    <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Architecture Principles */}
              <h2 className="text-2xl font-black mb-6 pb-2 border-b-4 border-slate-100 inline-block">Architecture Principles</h2>
              <div className="space-y-3 mb-10">
                {[
                  { num: "01", title: "Decoupled Computation", desc: "Financial logic is processed on high-performance Python workers (Pandas, Prophet, NumPy) isolated from the application layer. The Node.js API handles orchestration while computation is offloaded asynchronously." },
                  { num: "02", title: "Staged Mutability", desc: "Data is never modified in-place. All changes exist as staged proposals requiring formal approval from a Controller-level user before promotion to the primary ledger. This ensures complete auditability." },
                  { num: "03", title: "Zero-Trust Authentication", desc: "Stateless JWT session handling with mandatory Multi-Factor Authentication (MFA) gating for critical data mutation endpoints. Read-only access uses standard session tokens." },
                  { num: "04", title: "Evidence-Based Truth", desc: "Every financial data point is linked to an evidence UUID tracing back to the source system (ERP Transaction ID, CSV row reference, or manual entry approval ID). Nothing exists without provenance." },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 shrink-0 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black shadow-sm text-sm">{item.num}</div>
                    <div>
                      <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech Stack */}
              <h2 className="text-2xl font-black mb-6">Technology Stack</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "API Layer", value: "Node.js / Express", detail: "Stateless REST endpoints" },
                  { label: "Intelligence Worker", value: "Python / FastAPI", detail: "Pandas, Prophet, NumPy" },
                  { label: "Database", value: "PostgreSQL", detail: "Row-level security policies" },
                  { label: "Frontend", value: "Next.js / React", detail: "TypeScript, real-time updates" },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-slate-900 text-white rounded-xl">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{item.label}</div>
                    <div className="font-bold text-sm mb-0.5">{item.value}</div>
                    <div className="text-[11px] text-slate-400">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* QUICK START GUIDE                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "quickstart" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px]">ONBOARDING</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Quick Start Guide</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">Get your organization operational on FinaPilot in under 10 minutes. Follow these steps in order for the fastest time-to-value.</p>

              <div className="space-y-6 mb-12">
                {[
                  { step: 1, title: "Create Organization & Configure Profile", desc: "Register your company, set your fiscal year start month (e.g., January or April), select your base reporting currency, and define your corporate structure (LLC, C-Corp, Enterprise Public).", time: "2 min", status: "required" },
                  { step: 2, title: "Connect Your First Data Source", desc: "Navigate to Settings → Integrations and connect your primary ERP or accounting system. FinaPilot supports OAuth-based connections for Xero and QuickBooks Online, and credential-based connections for NetSuite, Sage, and Workday. Data sync begins immediately after authentication.", time: "3 min", status: "required" },
                  { step: 3, title: "Invite Team Members & Set Permissions", desc: "Go to User Management and invite your team. Assign roles using our RBAC system: Admin (full access), Controller (approval authority), Analyst (read + stage changes), or Viewer (read-only dashboards). Each role maps to specific data mutation permissions.", time: "2 min", status: "recommended" },
                  { step: 4, title: "Create Your First Financial Model", desc: "Navigate to Financial Modeling and create a new model. Select your industry vertical (SaaS, E-commerce, Services, Manufacturing), forecast horizon (12–60 months), and revenue model type (Subscription MRR, Transactional, Contract-based). The AI engine will pre-populate benchmark assumptions.", time: "3 min", status: "required" },
                  { step: 5, title: "Configure Alerts & Anomaly Detection", desc: "Set up threshold-based monitors for critical metrics: cash runway (alert if < 6 months), burn rate deviation (alert if > 15% over forecast), revenue variance (alert if actuals deviate > 10% from budget). Alerts are delivered via in-app notifications, email, or Slack.", time: "2 min", status: "recommended" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-100 transition-colors">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">{item.step}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-bold text-sm">{item.title}</h3>
                        <Badge variant="outline" className={`text-[9px] px-1.5 ${item.status === 'required' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {item.status === 'required' ? 'REQUIRED' : 'RECOMMENDED'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">{item.desc}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Clock className="h-3 w-3" /> Estimated: {item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                <h3 className="font-bold text-sm mb-2 text-blue-900">Need Implementation Support?</h3>
                <p className="text-xs text-blue-700 mb-3">Our Customer Success team offers guided onboarding for Enterprise plans. Book a 30-minute implementation call to configure your environment with a dedicated specialist.</p>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold" onClick={() => window.open('mailto:success@finapilot.com?subject=Implementation%20Support%20Request', '_blank')}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Request Implementation Call
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GLOSSARY                                                       */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "glossary" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-slate-100 text-slate-600 border-slate-200 font-black text-[10px]">REFERENCE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Glossary of Terms</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">Standardized terminology used across the FinaPilot platform. Understanding these terms ensures consistency in financial communication across your organization.</p>

              <div className="space-y-3">
                {[
                  { term: "ARR", full: "Annual Recurring Revenue", def: "The annualized value of active subscription contracts. Calculated as MRR × 12. Excludes one-time fees and professional services revenue." },
                  { term: "MRR", full: "Monthly Recurring Revenue", def: "The normalized monthly value of recurring subscription revenue. Broken down into New MRR, Expansion MRR, Churn MRR, and Contraction MRR in FinaPilot models." },
                  { term: "Burn Rate", full: "Net Cash Burn Rate", def: "The monthly rate at which a company consumes cash reserves. Calculated as Total Cash Outflows − Total Cash Inflows for the period. Displayed on the Overview Dashboard." },
                  { term: "Runway", full: "Cash Runway", def: "The number of months until cash reserves are depleted at the current burn rate. Calculated as Current Cash Balance ÷ Monthly Net Burn. FinaPilot alerts when runway drops below configurable thresholds." },
                  { term: "CAC", full: "Customer Acquisition Cost", def: "Total Sales & Marketing expense divided by the number of new customers acquired in the period. Used in the CAC/LTV ratio analysis within Financial Modeling." },
                  { term: "LTV", full: "Customer Lifetime Value", def: "The total revenue a customer is expected to generate over their lifetime. Calculated using Average Revenue Per Account (ARPA), Gross Margin %, and Churn Rate." },
                  { term: "COGS", full: "Cost of Goods Sold", def: "Direct costs attributable to delivering the product or service. In SaaS models, typically includes hosting, third-party API costs, and customer support labor." },
                  { term: "OPEX", full: "Operating Expenses", def: "Recurring costs of running the business excluding COGS. Includes R&D, Sales & Marketing, and General & Administrative expenses." },
                  { term: "EBITDA", full: "Earnings Before Interest, Taxes, Depreciation & Amortization", def: "A proxy for operating cash flow. Used in valuation multiples (EV/EBITDA) within the Investor Dashboard module." },
                  { term: "Driver", full: "Financial Driver", def: "An operational input variable that cascades through the financial model. Examples: headcount growth rate, average deal size, monthly churn percentage. Changing a driver automatically recalculates all dependent outputs." },
                  { term: "Monte Carlo", full: "Monte Carlo Simulation", def: "A probabilistic forecasting methodology that runs 5,000+ randomized iterations across variable distributions (Normal, Triangular, Lognormal) to generate confidence-interval outcome cones." },
                  { term: "Semantic Ledger", full: "FinaPilot Semantic Ledger", def: "An intermediary data layer between raw ERP exports and the financial engine. Every entry is tagged with a verification status (Verified, Adjusted, Projected) and an Evidence ID linking to its source." },
                  { term: "Staged Change", full: "Staged Proposal", def: "A pending data modification that has not yet been approved. Changes remain in a staged state until a Controller or Admin promotes them to the primary ledger via the Approvals workflow." },
                  { term: "Evidence ID", full: "Data Provenance Identifier", def: "A UUID attached to every ledger row that maps to the raw source data (e.g., NetSuite Transaction ID, CSV row hash, or manual entry approval ID). Enables full audit traceability." },
                ].map((item) => (
                  <div key={item.term} className="p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm text-blue-600">{item.term}</span>
                      <span className="text-xs text-slate-400 font-medium">— {item.full}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.def}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FINANCIAL MODELING                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "modeling" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-purple-50 text-purple-600 border-purple-200 font-black text-[10px]">CORE ENGINE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Financial Modeling</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot uses a hierarchical driver-based modeling engine. Unlike linear spreadsheets, our engine computes inter-dependent variables asynchronously using time-series cross-validation. All models produce three core financial statements: P&L, Cash Flow, and Balance Sheet.
              </p>

              {/* Revenue Model Types */}
              <h2 className="text-xl font-black mb-4">Supported Revenue Model Types</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {[
                  { title: "SaaS / Subscription", desc: "Revenue = (Starting MRR + New MRR + Expansion MRR) − (Churn MRR + Contraction MRR). Computed month-over-month with retention cohort analysis. Supports annual contract segmentation.", drivers: ["New Customer Count", "ARPA", "Monthly Churn %", "Net Revenue Retention"] },
                  { title: "Transactional / E-commerce", desc: "Revenue = Transactions × Average Order Value. Models seasonal patterns, conversion funnel rates, and repeat purchase behavior using historical data regression.", drivers: ["Monthly Visitors", "Conversion Rate", "AOV", "Repeat Rate"] },
                  { title: "Services / Consulting", desc: "Revenue = Billable Hours × Hourly Rate × Utilization %. Accounts for project pipeline, resource capacity planning, and contract renewal probability.", drivers: ["Headcount", "Utilization %", "Bill Rate", "Project Pipeline"] },
                  { title: "Marketplace / Platform", desc: "Revenue = GMV × Take Rate. Models both supply and demand sides independently, with network effect multipliers and geographic expansion variables.", drivers: ["Active Sellers", "Active Buyers", "GMV", "Take Rate %"] },
                ].map((item) => (
                  <div key={item.title} className="p-5 rounded-2xl border-2 border-slate-100 bg-white">
                    <h3 className="font-bold text-sm mb-2">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.drivers.map(d => (
                        <Badge key={d} variant="outline" className="text-[9px] px-1.5 bg-purple-50 text-purple-600 border-purple-200">{d}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Structure */}
              <h2 className="text-xl font-black mb-4">Cost Structure Engine</h2>
              <div className="p-6 rounded-2xl bg-slate-900 text-white mb-10">
                <h3 className="font-bold text-xs uppercase tracking-wider text-purple-400 mb-4">Layered Cost Analysis</h3>
                <div className="space-y-3">
                  {[
                    { category: "COGS", desc: "Directly linked to revenue drivers. Server costs scale with ARR, customer support scales with active customer count. Variable vs. fixed split configurable per line item." },
                    { category: "R&D", desc: "Primarily headcount-driven. Engineering salary × headcount plan, with software tooling and infrastructure as fixed overhead. Capitalization rules configurable." },
                    { category: "Sales & Marketing", desc: "Split into performance marketing (CAC-driven), brand marketing (fixed budget), and sales compensation (base + commission tied to quota attainment)." },
                    { category: "G&A", desc: "Fixed overhead: office rent, legal, accounting, insurance. Grows as step functions aligned to headcount thresholds (e.g., office upgrade at 50 employees)." },
                  ].map((item) => (
                    <div key={item.category} className="flex gap-3 py-2 border-b border-slate-800 last:border-0">
                      <span className="text-xs font-bold text-purple-400 w-20 shrink-0 uppercase">{item.category}</span>
                      <span className="text-[11px] text-slate-300 leading-relaxed">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model API */}
              <h2 className="text-xl font-black mb-4">Model Initialization Payload</h2>
              <div className="relative mb-8 rounded-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">POST /orgs/:id/models</span>
                  <button onClick={() => copyCode('POST /orgs/:id/models', 'model-init')} className="p-1 hover:bg-slate-200 rounded transition-colors">
                    {copiedSection === 'model-init' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
                <pre className="bg-white p-5 text-[12px] font-mono overflow-x-auto text-slate-700"><code>{`{
  "model_name": "Q3-FY25-Base-Case",
  "industry": "Enterprise SaaS",
  "forecast_duration": 24,
  "revenue_model": "subscription_mrr",
  "is_synthetic": false,
  "config": {
    "growth_benchmark_target": 0.15,
    "churn_assumption": "cohort-based",
    "cost_allocation": "department-level",
    "valuation_method": "football-field"
  }
}`}</code></pre>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* BUDGETING & PLANNING                                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "budgeting" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-amber-50 text-amber-600 border-amber-200 font-black text-[10px]">PLANNING</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Budgeting & Planning</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot replaces static annual budgets with dynamic, rolling plans. Departments contribute budgets through a guided workflow with automated approval chains and version control, ensuring a single source of truth.
              </p>

              <div className="space-y-6 mb-10">
                {[
                  { title: "Budget vs. Actual Tracking", desc: "Automated variance analysis compares budget line-items against actual performance from your connected ERP. Variances exceeding configurable thresholds (default: 10%) trigger automatic alerts to budget owners. Drill-down capability allows you to trace any variance to the transaction level.", icon: Target },
                  { title: "Rolling Forecasts", desc: "Instead of a fixed annual budget, FinaPilot supports continuous rolling forecasts. Each month, the actuals replace the oldest forecast period and a new month is added to the horizon. This keeps your projection window constant (e.g., always looking 12 months ahead) regardless of where you are in the fiscal year.", icon: TrendingUp },
                  { title: "Collaborative Input", desc: "Department heads submit their own budget inputs through a structured form interface. Each submission enters a staged state, visible to finance reviewers. Once approved by a Controller, the department budget is consolidated into the master plan automatically.", icon: Users },
                  { title: "Version Control", desc: "Every budget iteration is versioned with a timestamp, author, and change summary. You can compare any two versions side-by-side to see exactly what changed, who changed it, and why. Rollback to any previous version is supported.", icon: GitBranch },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/30 transition-colors">
                    <item.icon className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SCENARIO PLANNING                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "scenarios" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-teal-50 text-teal-600 border-teal-200 font-black text-[10px]">ANALYSIS</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Scenario Planning</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                Model multiple business outcomes simultaneously. Create Base, Best, and Worst case scenarios by adjusting key driver assumptions, then compare their impact on P&L, cash flow, and runway side-by-side in real time.
              </p>

              <h2 className="text-xl font-black mb-4">How Scenarios Work</h2>
              <div className="space-y-3 mb-10">
                {[
                  { step: "1", text: "Create a named scenario (e.g., \"Aggressive Hiring Plan\") from any existing model as the baseline. All drivers and assumptions are cloned." },
                  { step: "2", text: "Modify specific driver values within the scenario. For example, increase headcount growth to 30% or reduce churn to 2%. Only changed values are stored as deltas against the baseline." },
                  { step: "3", text: "The computation engine recalculates all dependent outputs in real time: revenue projections, burn rate, runway, P&L waterfall, and cash flow forecast." },
                  { step: "4", text: "Use the Scenario Comparison view to overlay up to 4 scenarios side-by-side. Key metrics are highlighted where scenarios diverge significantly (>10% variance)." },
                  { step: "5", text: "Publish the approved scenario as the new organizational baseline through the Approvals workflow. Previous baselines are preserved in version history." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="h-7 w-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">{item.step}</div>
                    <span className="text-xs text-slate-600 leading-relaxed pt-1">{item.text}</span>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Scenario Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Base Case", desc: "Current trajectory with existing growth rates and cost structure. No new initiatives or external shocks.", badge: "DEFAULT", color: "blue" },
                  { name: "Bull Case", desc: "Accelerated growth: higher conversion rates, expanded deal sizes, faster hiring. Represents best realistic outcome.", badge: "OPTIMISTIC", color: "emerald" },
                  { name: "Bear Case", desc: "Downturn scenario: reduced pipeline, extended sales cycles, potential layoffs. Tests survival runway.", badge: "CONSERVATIVE", color: "rose" },
                ].map((item) => (
                  <div key={item.name} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <Badge variant="outline" className={`text-[9px] mb-2 bg-${item.color}-50 text-${item.color}-600 border-${item.color}-200`}>{item.badge}</Badge>
                    <h3 className="font-bold text-sm mb-1">{item.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* AI FORECASTING / MONTE CARLO                                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "forecasting" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-orange-50 text-orange-600 border-orange-200 font-black text-[10px]">RISK ANALYSIS</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">AI Forecasting & Monte Carlo Simulations</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot performs 5,000+ randomized simulations to generate a probabilistic outcome cone rather than a single point forecast. Each simulation varies key drivers within defined distributions, producing P5, P50, and P95 confidence thresholds.
              </p>

              {/* Distribution Types */}
              <h2 className="text-xl font-black mb-4">Statistical Distribution Types</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {[
                  { name: "Normal (Gaussian)", use: "Stable, predictable metrics", detail: "Used for G&A expenses, salary costs, and other metrics with symmetric variance. Defined by Mean (μ) and Standard Deviation (σ).", example: "Office rent: μ=$50K, σ=$2K" },
                  { name: "Triangular", use: "New initiatives with bounded outcomes", detail: "Used for market entry scenarios where you can define a realistic minimum, maximum, and most likely outcome. Asymmetric distributions supported.", example: "New product revenue: Min=$0, Mode=$200K, Max=$500K" },
                  { name: "Lognormal", use: "Revenue and deal sizes", detail: "Ideal for metrics where the upside potential is uncapped but the floor is zero. Naturally models the positive skew observed in startup revenue distributions.", example: "Enterprise deal size: μ=ln($80K), σ=0.4" },
                ].map((item) => (
                  <div key={item.name} className="p-5 rounded-2xl bg-white border-2 border-slate-100">
                    <h3 className="font-bold text-xs uppercase text-orange-600 mb-1">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">{item.use}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.detail}</p>
                    <div className="text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded-lg">{item.example}</div>
                  </div>
                ))}
              </div>

              {/* Percentile Thresholds */}
              <h2 className="text-xl font-black mb-4">Probability Thresholds</h2>
              <div className="space-y-3 mb-10">
                {[
                  { label: "P95", name: "Bull Case (95th Percentile)", desc: "Only 5% of simulations exceed this outcome. Represents maximum operational efficiency with favorable market conditions. Used for upside planning.", color: "emerald" },
                  { label: "P50", name: "Median Case (50th Percentile)", desc: "The central outcome of all 5,000 simulations. Typically aligns closely with the deterministic Base Case. Recommended for primary financial planning.", color: "blue" },
                  { label: "P5", name: "Bear Case (5th Percentile)", desc: "95% of simulations perform better than this. If cash runway fails at P5, immediate capital action is required. Used for stress testing and board presentations.", color: "rose" },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-4 p-4 bg-${item.color}-50/30 rounded-xl border border-${item.color}-100`}>
                    <div className={`h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-${item.color}-600 shadow-sm border border-${item.color}-200 text-sm`}>{item.label}</div>
                    <div>
                      <h4 className={`font-bold text-sm text-${item.color}-700 mb-0.5`}>{item.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Features */}
              <h2 className="text-xl font-black mb-4">AI-Powered Capabilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Time-Series Forecasting", desc: "Uses Facebook Prophet for trend decomposition with seasonality detection. Automatically identifies weekly, monthly, and annual patterns in your historical data." },
                  { title: "Anomaly Detection", desc: "Continuous monitoring of financial data for statistical outliers. Uses Z-score analysis against rolling averages to flag transactions or trends that deviate significantly from expected values." },
                  { title: "Sensitivity Analysis", desc: "Identifies which input drivers have the highest impact on key outputs (revenue, runway, profitability). Produces tornado charts ranking drivers by sensitivity coefficient." },
                  { title: "Benchmark Comparison", desc: "Compares your financial metrics against industry benchmarks for your stage and sector. Data sourced from anonymized aggregate performance data." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* HEADCOUNT PLANNING                                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "headcount" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-teal-50 text-teal-600 border-teal-200 font-black text-[10px]">WORKFORCE PLANNING</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Headcount Planning & Dynamics</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                The Headcount module is the primary driver of OPEX in most organizations. FinaPilot models hiring velocity, regional benefits multipliers, and productive efficiency delays to produce accurate fully-loaded cost projections.
              </p>

              <div className="p-6 border-2 border-slate-100 rounded-2xl bg-white mb-8">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  Productivity Ramp Model
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  FinaPilot does not assume a new hire is immediately 100% efficient. We apply a linear ramp model to each new hire:
                </p>
                <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-sm mb-4">
                  Efficiency(Day X) = Min(1.0, X / Ramp_Days)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Example:</strong> A Sales Rep with a 90-day ramp and $10K/month salary will cost $30K over 3 months but only yield efficiency-weighted ARR beginning in month 2. Engineering roles default to 60-day ramps; Sales to 90-day; Executive to 30-day.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { title: "Benefits Multiplier", desc: "Globally adjustable multiplier (default: 1.25x – 1.35x) applied to base salary. Accounts for payroll taxes, health insurance, 401(k) matching, and internal overhead. Configurable per region (US, EU, APAC)." },
                  { title: "Role Leveling", desc: "Hires are categorized by level (Junior, Mid, Senior, Lead, Director, VP, C-Level). Each level maps to organization-specific salary bands. Band ranges are configurable in Settings." },
                  { title: "Department Allocation", desc: "Each hire is assigned to a department (Engineering, Sales, Marketing, G&A, Customer Success). Department-level OPEX rolls up into the P&L automatically." },
                  { title: "Attrition Modeling", desc: "Configurable annual attrition rate per department. Departures are modeled as cost savings (reduced salary) but with replacement hiring costs (recruiter fees, ramp inefficiency)." },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-slate-50 rounded-xl border">
                    <h4 className="font-bold text-xs uppercase text-slate-700 mb-1.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DATA INGESTION ENGINE                                          */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "ingestion" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-600 border-blue-200 font-black text-[10px]">DATA PIPELINE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Multi-Channel Data Ingestion Engine</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot synchronizes financial data across three primary vectors: Managed Connectors for enterprise ERPs, OAuth Gateways for cloud accounting, and Manual Semantic Promotion for CSV/Excel imports.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {[
                  { title: "Managed Connectors", subtitle: "Enterprise ERPs", desc: "NetSuite, Sage, Workday: Uses Vault-stored credentials (Domain, Consumer Key, Secret). Background worker polls for ledger deltas every 4 hours.", icon: Server, color: "indigo" },
                  { title: "OAuth Gateways", subtitle: "Cloud Accounting", desc: "Xero, QuickBooks Online: Standardized OAuth 2.0 flow. Access tokens are rotated automatically; user interaction only required during initial linkage.", icon: LinkIcon, color: "orange" },
                  { title: "Manual Import", subtitle: "CSV & Excel", desc: "Upload financial data in structured CSV or Excel format. Schema validation enforces column mapping (Date, Amount, Category, Vendor). AI auto-categorizes rows.", icon: Table, color: "emerald" },
                ].map((item) => (
                  <div key={item.title} className={`p-5 rounded-2xl bg-${item.color}-50/50 border border-${item.color}-100`}>
                    <item.icon className={`h-6 w-6 text-${item.color}-600 mb-3`} />
                    <h3 className="font-bold text-sm mb-0.5">{item.title}</h3>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">{item.subtitle}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Data Promotion Workflow</h2>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">To prevent data corruption, all incoming data is held in an "Unpromoted" state until validated and approved:</p>
              <div className="space-y-2 mb-8">
                {[
                  "Incoming data is tagged with an Integration ID and enters the staging queue.",
                  "Schema Validation: Each row must map to the standardized structure (Date, Amount, Category, Vendor, Description).",
                  "Auto-Categorization: AI assigns categories based on historical patterns from your organization's transaction history.",
                  "User Review: Finance team reviews staged data in the Semantic Ledger interface with full source traceability.",
                  "Promotion: Approved data is flushed to the primary financial engine and becomes available in models and reports.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CONNECTORS & ERPs                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "connectors" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-indigo-50 text-indigo-600 border-indigo-200 font-black text-[10px]">INTEGRATIONS</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Connectors & ERP Integrations</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot connects to your existing financial systems to automatically synchronize chart of accounts, transactions, invoices, and journal entries. All connections use encrypted credential storage with automatic token rotation.
              </p>

              <div className="space-y-3 mb-10">
                {[
                  { name: "Oracle NetSuite", type: "Managed Connector", auth: "Token-Based (Consumer Key + Secret)", sync: "Every 4 hours", data: "GL Transactions, Invoices, Bills, Journal Entries, Chart of Accounts" },
                  { name: "QuickBooks Online", type: "OAuth 2.0 Gateway", auth: "OAuth 2.0 with automatic refresh", sync: "Every 6 hours", data: "Profit & Loss, Balance Sheet, Cash Flow, Customers, Vendors" },
                  { name: "Xero", type: "OAuth 2.0 Gateway", auth: "OAuth 2.0 with PKCE", sync: "Every 6 hours", data: "Invoices, Bank Transactions, Contacts, Reports, Manual Journals" },
                  { name: "Sage Intacct", type: "Managed Connector", auth: "Web Services Credentials", sync: "Every 8 hours", data: "GL Details, AP/AR, Statistical Journals, Dimensions" },
                  { name: "Workday", type: "Managed Connector", auth: "Integration Security Profile", sync: "Every 12 hours", data: "Worker Data, Compensation, Headcount, Department Structure" },
                  { name: "Stripe", type: "API Key", auth: "Restricted API Key (read-only)", sync: "Every 2 hours", data: "Charges, Subscriptions, Invoices, Payouts, Revenue Recognition" },
                  { name: "Salesforce", type: "OAuth 2.0 Gateway", auth: "OAuth 2.0 Connected App", sync: "Every 4 hours", data: "Opportunities, Pipeline, Closed/Won, Forecast Categories" },
                ].map((item) => (
                  <div key={item.name} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm">{item.name}</h3>
                      <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                      <div><span className="text-slate-400">Auth:</span> <span className="text-slate-600">{item.auth}</span></div>
                      <div><span className="text-slate-400">Sync:</span> <span className="text-slate-600">{item.sync}</span></div>
                      <div><span className="text-slate-400">Data:</span> <span className="text-slate-600">{item.data}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SEMANTIC LEDGER                                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "ledger" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-zinc-100 text-zinc-600 border-zinc-200 font-black text-[10px]">IMMUTABLE STORAGE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Semantic Ledger</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                The Semantic Ledger is the single source of truth for all financial data in FinaPilot. It acts as an intermediary between raw ERP exports and the financial modeling engine, ensuring data integrity through verification states and evidence tracking.
              </p>

              <div className="p-6 bg-slate-900 rounded-2xl text-white mb-10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Row Verification States</h3>
                <div className="space-y-3">
                  {[
                    { status: "VERIFIED", desc: "Directly mapped from a connector with 100% schema match. No manual intervention required.", color: "emerald" },
                    { status: "ADJUSTED", desc: "Modified by a user via the manual overrides interface. Original source value is preserved for audit comparison.", color: "amber" },
                    { status: "PROJECTED", desc: "Synthetically generated by the AI forecasting engine for future periods. Clearly marked as non-actual data.", color: "blue" },
                    { status: "STAGED", desc: "Newly imported data awaiting approval. Cannot be used in calculations until promoted by a Controller.", color: "purple" },
                  ].map((item) => (
                    <div key={item.status} className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
                      <Badge variant="outline" className={`bg-${item.color}-500/10 text-${item.color}-500 border-${item.color}-500/20 font-bold text-[9px] uppercase`}>{item.status}</Badge>
                      <span className="text-[11px] text-zinc-400 font-medium text-right flex-1 ml-4">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-black mb-4">Evidence ID Tracking</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Every ledger row contains an <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">evidenceId</code> (UUID). This maps back to the raw JSON response from the external integration (e.g., NetSuite Transaction ID, Xero Invoice Number). In audit mode, FinaPilot expands this ID to show a side-by-side comparison of the raw ERP data versus the normalized ledger data.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DASHBOARDS & KPIs                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "dashboards" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-indigo-50 text-indigo-600 border-indigo-200 font-black text-[10px]">MONITORING</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Dashboards & KPI Tracking</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot provides real-time executive dashboards that surface the metrics most critical to financial decision-making. All data updates automatically as new actuals flow in from connected integrations.
              </p>

              <h2 className="text-xl font-black mb-4">Overview Dashboard Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                {[
                  { metric: "Total Revenue", desc: "Current period revenue from all sources" },
                  { metric: "Net Burn Rate", desc: "Monthly cash consumption rate" },
                  { metric: "Cash Runway", desc: "Months until cash depletion" },
                  { metric: "Gross Margin", desc: "Revenue minus COGS as percentage" },
                  { metric: "MRR / ARR", desc: "Monthly and annualized recurring revenue" },
                  { metric: "CAC Payback", desc: "Months to recover acquisition cost" },
                  { metric: "LTV:CAC Ratio", desc: "Customer lifetime value efficiency" },
                  { metric: "Headcount", desc: "Current FTE count with hiring plan" },
                ].map((item) => (
                  <div key={item.metric} className="p-3 rounded-xl border border-slate-200 bg-white">
                    <h4 className="font-bold text-xs mb-0.5">{item.metric}</h4>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Dashboard Features</h2>
              <div className="space-y-3">
                {[
                  { title: "Real-Time Data Sync", desc: "Dashboard metrics automatically refresh when new data arrives from connected ERP and accounting integrations. No manual refresh required." },
                  { title: "Trend Visualization", desc: "Every metric includes a 12-month trend sparkline showing historical trajectory. Color-coded indicators highlight improving (green) or declining (red) trends." },
                  { title: "Period Comparison", desc: "Compare current period performance against prior period, same period last year, or budget targets. Variance percentages are calculated automatically." },
                  { title: "Drill-Down Navigation", desc: "Click any metric to navigate directly to its source module. Revenue clicks open Financial Modeling; Runway clicks open Cash Flow Forecasting." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl border border-slate-100 bg-white">
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* BOARD REPORTING                                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "reporting" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-amber-50 text-amber-600 border-amber-200 font-black text-[10px]">OUTPUT GENERATION</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Board Reporting</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot compiles model outcomes into audit-ready board decks and PDFs. Templates are modular—users select specific report slices to include—and AI generates executive summaries by analyzing key variance drivers.
              </p>

              <h2 className="text-xl font-black mb-4">Report Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {[
                  { name: "Monthly Board Report", desc: "Comprehensive monthly update including P&L summary, cash position, key metrics dashboard, and strategic highlights. Standard 15-20 page deck.", modules: ["P&L Actual vs Budget", "Cash Flow Waterfall", "Headcount Summary", "AI Executive Summary"] },
                  { name: "Quarterly Investor Update", desc: "Investor-focused quarterly report with cohort analysis, unit economics, and growth metrics. Optimized for VC/PE stakeholder consumption.", modules: ["Revenue Cohorts", "Unit Economics", "CAC/LTV Analysis", "Runway Projection"] },
                  { name: "Annual Financial Review", desc: "Year-in-review comprehensive financial analysis with year-over-year comparisons, audit-ready statements, and forward guidance.", modules: ["Full Year P&L", "Balance Sheet", "Cash Flow Statement", "Budget Variance Analysis"] },
                  { name: "Risk Assessment Brief", desc: "Monte Carlo output summary focusing on downside scenarios, survival probability analysis, and stress test results. Used for risk committee presentations.", modules: ["P5/P50/P95 Outcomes", "Sensitivity Tornado", "Survival Probability", "Stress Test Results"] },
                ].map((item) => (
                  <div key={item.name} className="p-5 rounded-2xl border border-slate-200 bg-white">
                    <h3 className="font-bold text-sm mb-1.5">{item.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.modules.map(m => (
                        <Badge key={m} variant="outline" className="text-[9px] px-1.5 bg-amber-50 text-amber-700 border-amber-200">{m}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Generation Payload</h2>
              <div className="relative mb-8 rounded-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">POST /orgs/:id/reports/generate</span>
                  <button onClick={() => copyCode('POST /orgs/:id/reports/generate', 'report-gen')} className="p-1 hover:bg-slate-200 rounded transition-colors">
                    {copiedSection === 'report-gen' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
                <pre className="bg-white p-5 text-[12px] font-mono overflow-x-auto text-slate-700"><code>{`{
  "template": "monthly_board_report",
  "target_audience": "Board of Directors",
  "period": "Q1-FY25",
  "modules": [
    "p_and_l_actual_vs_budget",
    "cash_flow_forecasting_24mo",
    "monte_carlo_survival_probability",
    "ai_risk_assessment_summary"
  ],
  "format": "PDF",
  "ai_executive_summary": true
}`}</code></pre>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* REPORTS & ANALYTICS                                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "analytics" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-violet-50 text-violet-600 border-violet-200 font-black text-[10px]">ANALYTICS</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Reports & Analytics</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                Self-service reporting engine that enables finance teams to generate custom reports, automate variance analysis, and export data in multiple formats without engineering support.
              </p>

              <div className="space-y-4 mb-10">
                {[
                  { title: "Automated Variance Analysis", desc: "Compares actuals against budget and prior period automatically. Highlights line items exceeding a configurable threshold (default: 10%). Each variance links to a drill-down view showing contributing transactions." },
                  { title: "Custom Report Builder", desc: "Drag-and-drop interface to compose reports from available data modules. Select time periods, metrics, chart types, and comparison baselines. Reports can be saved as templates for recurring use." },
                  { title: "Scheduled Distribution", desc: "Schedule reports to be generated and distributed automatically on a daily, weekly, or monthly cadence. Recipients receive PDF attachments via email with optional Slack notification." },
                  { title: "Multi-Format Export", desc: "Export any report as PDF, Excel (.xlsx), CSV, or Google Sheets format. PDF exports use professional typesetting with your organization's branding (logo, colors, fonts)." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* INVESTOR DASHBOARD                                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "investor" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px]">FUNDRAISING</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Investor Dashboard</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                A purpose-built view designed for investor relations. Share a curated set of metrics with your board and investors through secure, role-gated access. All data is live-linked to your models.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Key Metrics Overview", desc: "ARR, MRR growth rate, gross margin, net revenue retention, and logo churn displayed with trend sparklines and period-over-period comparisons." },
                  { title: "Unit Economics", desc: "CAC, LTV, LTV:CAC ratio, CAC payback period, and magic number. Segmentable by customer cohort, acquisition channel, or contract size." },
                  { title: "Revenue Waterfall", desc: "Visual breakdown showing New ARR, Expansion, Contraction, and Churn contributions to net revenue change. Updated automatically from billing data." },
                  { title: "Cash Runway Projection", desc: "Interactive chart showing projected cash balance over the forecast horizon. Overlays P5/P50/P95 Monte Carlo bands for probabilistic runway scenarios." },
                  { title: "Valuation Metrics", desc: "Real-time valuation estimates using DCF (Discounted Cash Flow) and public comparable multiples (EV/ARR, EV/EBITDA). Football field visualization." },
                  { title: "Shareable Data Room", desc: "Generate a secure, time-limited link to share the investor dashboard externally. Access logging tracks every view with IP address and timestamp." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* AUTHENTICATION & MFA                                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "auth" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px]">SECURITY PIPELINE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Authentication & MFA</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot implements a multi-tiered authentication pipeline. Standard session tokens enable read-only dashboard access, while any data mutation requires an MFA-validated session with the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">mfaValidated: true</code> flag in the JWT payload.
              </p>

              <div className="bg-slate-900 rounded-2xl p-6 text-white mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Lock className="h-16 w-16" /></div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Enforcement Logic
                </h3>
                <ol className="space-y-3">
                  {[
                    "User authenticates with Email + Password → Server returns JWT with mfaEnabled: true, mfaValidated: false.",
                    "Client redirects to MFA challenge screen. User enters 6-digit TOTP code from authenticator app.",
                    "Server validates TOTP code using otplib against stored secret. On success, returns new JWT with mfaValidated: true.",
                    "Middleware intercepts all POST/PUT/DELETE requests to /api/org/* endpoints. If mfaValidated is false, returns 403 Forbidden.",
                    "MFA session expires after 8 hours of inactivity. User must re-verify to continue data mutations.",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                      <span className="text-sm text-slate-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <h2 className="text-xl font-black mb-4">Implementation</h2>
              <div className="relative mb-8 rounded-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">mfa.service.ts</span>
                  <button onClick={() => copyCode('verifyMFAToken(userId, token)', 'mfa-srv')} className="p-1 hover:bg-slate-200 rounded transition-colors">
                    {copiedSection === 'mfa-srv' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
                <pre className="bg-white p-5 text-[12px] font-mono overflow-x-auto text-slate-700"><code>{`// Core MFA Verification using otplib
import { authenticator } from 'otplib';

export async function verifyMFAToken(userId: string, token: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  if (!user.totpSecret) throw new Error('MFA not configured');
  
  const isValid = authenticator.verify({
    token,
    secret: user.totpSecret
  });
  
  if (isValid) {
    return signJWT({ ...user, mfaValidated: true });
  }
  
  return null;
}`}</code></pre>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* APPROVALS & WORKFLOWS                                          */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "governance" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-rose-50 text-rose-600 border-rose-200 font-black text-[10px]">COMPLIANCE GATEWAY</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Approvals & Governance Workflows</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                All critical financial mutations—budget changes, scenario publications, capital allocations, and report approvals—trigger an asynchronous multi-stakeholder approval workflow based on RBAC permissions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {[
                  { icon: Workflow, title: "4-Eye Principle", desc: "An Analyst can stage a change, but only a Controller or Admin can promote it to the production ledger. No single individual can both create and approve a financial mutation.", color: "rose" },
                  { icon: Target, title: "Diff-Aware Review", desc: "Approval cards show a strict before/after delta. Example: 12-Month Runway: 14mo → 18mo. Reviewers see the exact financial impact before approving.", color: "indigo" },
                  { icon: Eye, title: "Immutable Audit Log", desc: "Every approval action (approve, reject, escalate) is logged with timestamp, user ID, SHA-256 hash, and reason code. Logs cannot be modified or deleted.", color: "amber" },
                  { icon: Bell, title: "Notification Routing", desc: "Pending approvals generate notifications via in-app alerts, email, and optional Slack integration. Escalation rules auto-notify admins if approvals stale for > 48 hours.", color: "blue" },
                ].map((item) => (
                  <div key={item.title} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <item.icon className={`h-6 w-6 text-${item.color}-600 mb-3`} />
                    <h3 className="font-bold text-sm mb-1.5 uppercase text-xs tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">RBAC Role Hierarchy</h2>
              <div className="space-y-2">
                {[
                  { role: "Viewer", permissions: "Read-only access to dashboards and reports. Cannot stage changes or export data." },
                  { role: "Analyst", permissions: "Full read access plus ability to create/stage changes. Cannot approve or promote to production." },
                  { role: "Controller", permissions: "All Analyst permissions plus approval authority for staged changes. Can promote data to the production ledger." },
                  { role: "Admin", permissions: "Full platform access including user management, integration configuration, billing, and organization settings." },
                ].map((item) => (
                  <div key={item.role} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    <Badge variant="outline" className="text-[9px] font-bold shrink-0 mt-0.5 w-20 justify-center">{item.role}</Badge>
                    <span className="text-xs text-slate-500 leading-relaxed">{item.permissions}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* AUDIT TRAIL                                                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "audit" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-amber-50 text-amber-600 border-amber-200 font-black text-[10px]">DATA INTEGRITY</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Audit Trail & Data Provenance</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot maintains an immutable, append-only audit log for every action that modifies financial data. Each log entry is cryptographically signed with SHA-256 to prevent tampering and ensure alignment with SOC 2 Type II architectural requirements.
              </p>

              <h2 className="text-xl font-black mb-4">Audit Log Entry Structure</h2>
              <Card className="rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden mb-8">
                <div className="bg-slate-900 p-4 text-white">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-center">Sample Audit Log Entry</h4>
                </div>
                <CardContent className="p-5 space-y-2">
                  {[
                    { label: "Timestamp", value: "2026-04-13T14:22:11Z" },
                    { label: "Action", value: "STAGED_CHANGE_PROMOTED", highlight: true },
                    { label: "Actor", value: "sarah.cfo@org.com" },
                    { label: "Resource", value: "model:Q3-FY25-Base-Case" },
                    { label: "Delta", value: "Monthly Burn: $420K → $385K" },
                    { label: "Integrity Hash", value: "sha256:7f9a8c2d...e41b" },
                    { label: "Reason Code", value: "FORECAST_UPDATE — Revised vendor contracts" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0">
                      <span className="text-[11px] text-slate-400 font-medium">{item.label}</span>
                      <span className={`text-[11px] font-bold ${item.highlight ? 'text-blue-600' : 'text-slate-700'} font-mono`}>{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                <h3 className="font-bold text-sm mb-2 text-amber-900">Compliance Note</h3>
                <p className="text-xs text-amber-700 leading-relaxed">
                  All audit log rejections require a mandatory Reason Code mapping to SOC 2 audit categories. This ensures that every decision point in the financial data lifecycle is documented, traceable, and defensible during external audits.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COMPLIANCE & SOC 2                                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "compliance" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px]">TRUST & SECURITY</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Compliance & Certifications</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                FinaPilot is built to meet the security and compliance requirements of institutional financial operations. Our platform undergoes regular third-party audits and maintains certifications required by regulated industries.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {[
                  { cert: "SOC 2 Type II Architecture", desc: "Designed to meet SOC 2 Trust Services Criteria for Security, Availability, and Confidentiality. Attestation roadmap in place.", status: "Aligned" },
                  { cert: "GDPR Compliance", desc: "Full compliance with EU General Data Protection Regulation including data subject rights, DPA support, and EU data residency options.", status: "Compliant" },
                  { cert: "AES-256 Encryption", desc: "All data encrypted at rest using AES-256 encryption. Data in transit protected by TLS 1.3. Database connections use certificate-based authentication.", status: "Implemented" },
                  { cert: "Data Residency", desc: "Choose your data hosting region: US East (N. Virginia), EU West (Ireland), or Asia Pacific (Mumbai). Data never leaves your selected region.", status: "Configurable" },
                ].map((item) => (
                  <div key={item.cert} className="p-5 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm">{item.cert}</h3>
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200">{item.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-blue-600 text-white">
                <Shield className="h-7 w-7 mb-3" />
                <h3 className="font-bold text-sm mb-1">Request Security Documentation</h3>
                <p className="text-xs text-blue-100 leading-relaxed mb-3">
                  Request our latest SOC 2 Type II report, penetration test results, or GDPR Data Processing Agreement directly from the security team.
                </p>
                <Button size="sm" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold" onClick={() => window.open('mailto:security@finapilot.com', '_blank')}>
                  Request Access <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* REST API REFERENCE                                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "api" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-600 border-blue-200 font-black text-[10px]">DEVELOPER</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">REST API Reference</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                All FinaPilot functionality is accessible through our RESTful API. Authenticate using JWT Bearer tokens. All endpoints return JSON responses with consistent error handling.
              </p>

              <h2 className="text-xl font-black mb-4">Authentication</h2>
              <div className="relative mb-8 rounded-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorization Header</span>
                </div>
                <pre className="bg-white p-4 text-[12px] font-mono overflow-x-auto text-slate-700"><code>{`Authorization: Bearer <your_jwt_token>
Content-Type: application/json`}</code></pre>
              </div>

              <h2 className="text-xl font-black mb-4">Core Endpoints</h2>
              <div className="space-y-3 mb-10">
                {[
                  { method: "POST", path: "/auth/login", desc: "Authenticate user and return JWT token pair" },
                  { method: "POST", path: "/auth/mfa/verify", desc: "Validate TOTP code and return MFA-elevated token" },
                  { method: "GET", path: "/orgs/:id/models", desc: "List all financial models for an organization" },
                  { method: "POST", path: "/orgs/:id/models", desc: "Create a new financial model with configuration" },
                  { method: "GET", path: "/orgs/:id/models/:modelId/forecast", desc: "Get forecast results including Monte Carlo outputs" },
                  { method: "POST", path: "/orgs/:id/reports/generate", desc: "Generate a board report from a template" },
                  { method: "GET", path: "/orgs/:id/ledger", desc: "Query Semantic Ledger entries with filter options" },
                  { method: "PATCH", path: "/orgs/:id/approvals/:approvalId", desc: "Approve or reject a staged change" },
                  { method: "GET", path: "/orgs/:id/notifications", desc: "List notifications with filter and pagination" },
                  { method: "POST", path: "/orgs/:id/exports", desc: "Queue a data export job (PDF, Excel, CSV)" },
                ].map((item) => (
                  <div key={item.path} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                    <Badge className={`text-[9px] font-bold shrink-0 w-14 justify-center ${
                      item.method === 'GET' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      item.method === 'POST' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                      'bg-amber-100 text-amber-700 hover:bg-amber-100'
                    }`}>{item.method}</Badge>
                    <code className="text-xs font-mono text-slate-700 shrink-0">{item.path}</code>
                    <span className="text-xs text-slate-400 ml-auto text-right">{item.desc}</span>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Rate Limits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { plan: "Starter", limit: "100 requests/min", burst: "200 requests/min" },
                  { plan: "Professional", limit: "500 requests/min", burst: "1,000 requests/min" },
                  { plan: "Enterprise", limit: "2,000 requests/min", burst: "5,000 requests/min" },
                ].map((item) => (
                  <div key={item.plan} className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                    <div className="font-bold text-sm mb-1">{item.plan}</div>
                    <div className="text-xs text-slate-500">{item.limit}</div>
                    <div className="text-[10px] text-slate-400">Burst: {item.burst}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* WEBHOOKS & EVENTS                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "webhooks" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-purple-50 text-purple-600 border-purple-200 font-black text-[10px]">EVENTS</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Webhooks & Events</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                Subscribe to real-time events to integrate FinaPilot into your existing workflows. Webhooks are delivered as HTTP POST requests with HMAC-SHA256 signature verification.
              </p>

              <h2 className="text-xl font-black mb-4">Available Events</h2>
              <div className="space-y-2 mb-10">
                {[
                  { event: "model.created", desc: "Fired when a new financial model is initialized" },
                  { event: "model.forecast.completed", desc: "Fired when Monte Carlo simulation finishes processing" },
                  { event: "approval.pending", desc: "Fired when a new staged change requires approval" },
                  { event: "approval.resolved", desc: "Fired when an approval is accepted or rejected" },
                  { event: "report.generated", desc: "Fired when a board report has been compiled" },
                  { event: "alert.triggered", desc: "Fired when a threshold alert condition is met" },
                  { event: "data.sync.completed", desc: "Fired when an integration data sync finishes" },
                  { event: "export.ready", desc: "Fired when a queued export job is ready for download" },
                ].map((item) => (
                  <div key={item.event} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    <code className="text-xs font-mono text-purple-600 font-bold">{item.event}</code>
                    <span className="text-xs text-slate-400">{item.desc}</span>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Webhook Payload Example</h2>
              <div className="relative rounded-xl border-2 border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">POST (your-webhook-url)</span>
                </div>
                <pre className="bg-white p-5 text-[12px] font-mono overflow-x-auto text-slate-700"><code>{`{
  "event": "alert.triggered",
  "timestamp": "2026-04-13T10:30:00Z",
  "org_id": "org_abc123",
  "data": {
    "alert_id": "alert_xyz789",
    "metric": "cash_runway_months",
    "current_value": 4.2,
    "threshold": 6,
    "severity": "critical",
    "message": "Cash runway dropped below 6-month threshold"
  },
  "signature": "sha256=..."
}`}</code></pre>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* AI CFO ASSISTANT                                               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "ai-assistant" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-rose-50 text-rose-600 border-rose-200 font-black text-[10px]">INTELLIGENCE</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">AI CFO Assistant</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">
                Query your financial data using natural language. The AI CFO Assistant interprets questions, retrieves relevant data from your models and ledger, and returns cited, auditable answers with full data provenance.
              </p>

              <h2 className="text-xl font-black mb-4">Example Queries</h2>
              <div className="space-y-2 mb-10">
                {[
                  { q: "What is our current cash runway?", a: "Based on your Q2 model, current cash balance of $2.4M with monthly net burn of $180K gives you 13.3 months of runway at P50." },
                  { q: "Compare revenue growth this quarter vs last quarter", a: "Q2 revenue grew 18.4% ($1.2M → $1.42M) vs Q1 growth of 12.1%. Primary driver: 23 new enterprise contracts vs 15 in Q1." },
                  { q: "What happens to runway if we hire 10 more engineers?", a: "Adding 10 engineers at avg $12K/mo fully-loaded would increase monthly burn by $120K, reducing runway from 13.3 to 8.9 months at P50." },
                  { q: "Show me our top 5 expense categories by growth rate", a: "1. Cloud Infrastructure (+34%), 2. Sales Compensation (+28%), 3. Marketing Spend (+22%), 4. Office Rent (+15%), 5. Professional Services (+11%)" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-700">&ldquo;{item.q}&rdquo;</p>
                    </div>
                    <div className="flex items-start gap-2 ml-6">
                      <Bot className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                <h3 className="font-bold text-sm mb-1.5 text-rose-900">Citation & Auditability</h3>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Every AI response includes data citations linking to the specific model, ledger entry, or report that sourced the answer. This ensures AI-generated insights are fully traceable and auditable, meeting enterprise governance requirements.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FAQ                                                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "faq" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-slate-100 text-slate-600 border-slate-200 font-black text-[10px]">SUPPORT</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Frequently Asked Questions</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">Answers to the most common questions about FinaPilot's platform, security, and features.</p>

              <div className="space-y-4">
                {[
                  { q: "How does FinaPilot differ from spreadsheets?", a: "Unlike spreadsheets, FinaPilot uses a driver-based engine where changing one input variable automatically recalculates all dependent outputs across your P&L, cash flow, and balance sheet. It adds version control, multi-user collaboration, approval workflows, and Monte Carlo simulations—none of which are possible in traditional spreadsheets." },
                  { q: "Can I import data from Excel?", a: "Yes. FinaPilot supports CSV and Excel (.xlsx) file imports through the Data Import Wizard. The wizard guides you through column mapping, data validation, and category assignment. Imported data enters a staged state and must be approved before it becomes part of your financial model." },
                  { q: "How accurate are the AI forecasts?", a: "AI forecasts are generated using Facebook Prophet for time-series decomposition and Monte Carlo simulations for probabilistic analysis. Accuracy depends on the quality and quantity of your historical data. The platform provides confidence intervals (P5/P50/P95) so you can assess the range of possible outcomes rather than relying on a single point estimate." },
                  { q: "Is my financial data secure?", a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). The platform implements row-level security in PostgreSQL, mandatory MFA for data mutations, and maintains an immutable audit trail with SHA-256 integrity hashing. We utilize a SOC 2 Type II Aligned Architecture." },
                  { q: "Can multiple team members collaborate on the same model?", a: "Yes. FinaPilot supports multi-user collaboration through RBAC (Role-Based Access Control). Team members can be assigned Viewer, Analyst, Controller, or Admin roles. Changes are staged and require approval, preventing conflicting edits. Real-time commenting is available on all financial items." },
                  { q: "How often does data sync from my ERP?", a: "Sync frequency depends on the integration: Stripe syncs every 2 hours, NetSuite and Salesforce every 4 hours, QuickBooks and Xero every 6 hours, Sage every 8 hours, and Workday every 12 hours. Enterprise plans can configure custom sync intervals." },
                  { q: "Can I generate investor-ready reports?", a: "Yes. The Board Reporting module includes templates specifically designed for board presentations and investor updates. Reports include AI-generated executive summaries, cohort analysis, unit economics, and valuation metrics. Export as PDF with your organization's branding." },
                  { q: "What happens if I need to change a historical value?", a: "Historical values can be modified through the manual override interface. The change enters a staged state requiring Controller approval. The original value is preserved in the audit trail, and the override reason is logged. This ensures data integrity while allowing legitimate corrections." },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                      {item.q}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed ml-6">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CHANGELOG                                                      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSection === "changelog" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-600 border-blue-200 font-black text-[10px]">UPDATES</Badge>
              <h1 className="text-4xl font-black tracking-tight mb-4">Changelog & Releases</h1>
              <p className="text-lg text-slate-500 mb-8 font-medium">Latest platform updates, new features, and improvements.</p>

              <div className="space-y-6">
                {[
                  { version: "v1.0", date: "April 2026", type: "Launch", changes: [
                    "Driver-based Financial Modeling engine with multi-scenario P&L, Cash Flow, and Balance Sheet generation",
                    "Monte Carlo simulation engine with 5,000+ iterations and Normal, Triangular, and Lognormal distributions",
                    "AI CFO Assistant with cited, auditable natural language financial querying and data provenance",
                    "Board Reporting module with modular templates and AI-generated executive summaries",
                    "Reports & Analytics with automated variance analysis, custom report builder, and scheduled distribution",
                    "Budget vs Actual tracking with configurable threshold alerts and transaction-level drill-down",
                    "Scenario Planning with up to 4 simultaneous scenario comparison and diff-aware review",
                    "Headcount Planning with productivity ramp modeling, role leveling, and benefits multiplier",
                    "Semantic Ledger with Evidence ID tracking, verification states, and source comparison view",
                    "Multi-channel data ingestion: NetSuite, Xero, QuickBooks, Sage, Workday, Stripe, and Salesforce connectors",
                    "RBAC system with 4-tier role hierarchy (Viewer, Analyst, Controller, Admin) and 4-Eye approval principle",
                    "Zero-trust authentication with mandatory MFA enforcement for data mutation endpoints",
                    "Immutable audit trail with SHA-256 integrity hashing and SOC 2 Type II aligned architecture",
                    "Investor Dashboard with unit economics, valuation metrics, and secure shareable data rooms",
                    "Export Queue with background PDF, Excel, and CSV generation",
                    "Real-time alert system with in-app, email, and Slack notification routing",
                    "Overview Dashboard with real-time KPI tracking, trend visualization, and period comparison",
                    "Webhook support for event-driven integrations and workflow automation",
                  ]},
                ].map((release) => (
                  <div key={release.version} className="p-5 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="font-bold text-xs">{release.version}</Badge>
                      <span className="text-xs text-slate-400">{release.date}</span>
                      <Badge className={`text-[9px] ${release.type === 'Major' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : release.type === 'Launch' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-purple-100 text-purple-700 hover:bg-purple-100'}`}>{release.type}</Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {release.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Page Feedback & Navigation ────────────────────────────── */}
          <Separator className="my-10" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Was this page helpful?</span>
              <button 
                onClick={() => giveFeedback(activeSection, "up")}
                className={`p-1.5 rounded-lg border transition-colors ${feedbackGiven[activeSection] === 'up' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200'}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => giveFeedback(activeSection, "down")}
                className={`p-1.5 rounded-lg border transition-colors ${feedbackGiven[activeSection] === 'down' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200'}`}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-300 font-medium">Last updated: April 2026</div>
          </div>

          {/* Prev / Next Navigation */}
          <div className="flex items-center justify-between gap-4">
            {prevSection ? (
              <button 
                onClick={() => setActiveSection(prevSection.id)} 
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left flex-1"
              >
                <ArrowLeft className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Previous</div>
                  <div className="text-xs font-bold text-slate-700">{prevSection.title}</div>
                </div>
              </button>
            ) : <div className="flex-1" />}
            {nextSection ? (
              <button 
                onClick={() => setActiveSection(nextSection.id)} 
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-right flex-1 justify-end"
              >
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Next</div>
                  <div className="text-xs font-bold text-slate-700">{nextSection.title}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            ) : <div className="flex-1" />}
          </div>

        </div>
      </main>

      {/* ─── Right Sidebar (Service Health) ─────────────────────────────── */}
      <div className="hidden xl:block w-64 border-l border-slate-200 p-5 bg-slate-50/50">
        <h3 className="font-bold text-[10px] tracking-widest text-slate-400 uppercase mb-5">Service Health</h3>
        <div className="space-y-3">
          {[
            { name: "Core API", tech: "Node.js / Express", latency: "45ms avg", color: "blue" },
            { name: "Intelligence Worker", tech: "Python / FastAPI", latency: "120ms avg", color: "purple" },
            { name: "Truth Store", tech: "PostgreSQL + RLS", latency: "12ms avg", color: "emerald" },
          ].map((item) => (
            <div key={item.name} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className={`font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-tight text-${item.color}-600`}>
                <div className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 animate-pulse`} /> {item.name}
              </span>
              <p className="text-slate-500 mt-0.5 text-[10px] font-medium">{item.tech}</p>
              <p className="text-slate-400 text-[10px]">Latency: {item.latency}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-blue-600 text-white shadow-lg cursor-pointer group" onClick={() => window.open('mailto:security@finapilot.com', '_blank')}>
          <Shield className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-xs uppercase mb-0.5">Security Audit?</h4>
          <p className="text-[10px] text-blue-100 leading-relaxed mb-2">
            Request SOC 2 Type II or GDPR compliance documentation.
          </p>
          <div className="flex items-center text-[10px] font-bold uppercase tracking-wider">
            Request Access <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="font-bold text-[10px] tracking-widest text-slate-400 uppercase mb-3">Quick Links</h3>
          {[
            { label: "API Status Page", href: "#" },
            { label: "Release Notes", href: "#" },
            { label: "Community Forum", href: "#" },
            { label: "Support Portal", href: "mailto:support@finapilot.com" },
          ].map((item) => (
            <a key={item.label} href={item.href} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-blue-600 transition-colors font-medium">
              <ExternalLink className="h-3 w-3" /> {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
