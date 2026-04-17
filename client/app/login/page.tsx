"use client"

import { Suspense } from "react"
import { motion } from "framer-motion"
import { 
  Users, 
  BookOpen, 
  ChevronRight, 
  Globe, 
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Zap
} from "lucide-react"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

function LoginPageContent() {
  const openCookiePreferences = () => {
    window.dispatchEvent(new Event("finapilot:open-cookie-preferences"))
  }

  return (
    <div className="min-h-screen bg-[#020305] flex flex-col md:flex-row overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* --- LEFT SIDE: THE SECURE AUTH FORM --- */}
      <div className="w-full md:w-[500px] lg:w-[600px] flex flex-col relative z-20 border-r border-slate-900 bg-[#020305] overflow-y-auto custom-scrollbar">
        
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-20 min-h-screen relative">
          {/* Back Link */}
          <Link 
            href="/" 
            className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all group z-30"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Back to Terminal
          </Link>

          {/* Form Container */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto space-y-12 relative z-20 my-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                  <img src="/icon.svg" alt="Logo" className="w-8 h-8" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-2xl font-black tracking-tighter text-white block leading-none">FinaPilot</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Institutional</span>
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                  Access Secure <br/> Financial Engine
                </h1>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Enterprise-grade financial intelligence requires mission-critical security and zero-trust verification.
                </p>
              </div>
            </div>

            <LoginForm 
              onSuccess={() => window.location.href = "/"} 
              onSwitchToSignup={() => window.location.href = "/signup"} 
            />
            
            <div className="pt-10 border-t border-slate-900 grid grid-cols-2 gap-4 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>SOC 2 Type II Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                <span>GDPR/CCPA Verified</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* --- RIGHT SIDE: THE STRATEGIC BRANDING pane (ANAPLAN STYLE) --- */}
      <div className="hidden md:flex flex-1 relative bg-[#050608] overflow-hidden group">
        
        {/* Abstract Background with Animation */}
        <div className="absolute inset-0">
           {/* High-fidelity moving glows */}
           <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.25, 0.15],
                x: [0, 50, 0],
                y: [0, -30, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 -right-20 w-[800px] h-[800px] bg-blue-600/20 blur-[180px] rounded-full" 
           />
           <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.1, 0.2, 0.1],
                x: [0, -40, 0],
                y: [0, 60, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-1/4 -left-20 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full" 
           />
           
           {/* Institutional Grid */}
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.03]" />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-between p-16 lg:p-24 overflow-y-auto custom-scrollbar">
          
          {/* Tagline Section */}
          <div className="space-y-8 mt-12">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]"
            >
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               Strategic Vision
            </motion.div>
            <h2 className="text-5xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.9] tracking-tight max-w-2xl">
               Outpredict, Outplan, <br/>And <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Outperform.</span>
            </h2>
            <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
               Join the thousands of forward-thinking CFOs leveraging agentic intelligence to drive absolute financial certainty.
            </p>
          </div>

          {/* Anaplan Inspired Community & Links Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 mt-32 mb-32">
             <StrategicLink 
                icon={Users}
                title="Engage the Community"
                desc="Connect with FinaPilot power users, find modeling answers, and share strategic solutions."
                href="/community"
             />
             <StrategicLink 
                icon={MessageSquare}
                title="Provide Your Feedback"
                desc="Help guide the next wave of FinaPilot: Sign up for our global design partner research program."
                href="/contact"
             />
             <StrategicLink 
                icon={BookOpen}
                title="Explore the Strategic Blog"
                desc="Discover deep dives into Monte Carlo logic, DCF precision, and expert takes on AI-driven FP&A."
                href="/docs"
             />
             <StrategicLink 
                icon={Globe}
                title="FinaPilot Connect Cities"
                desc="Join the global event series that's shaping the future of AI-driven business planning."
                href="/support"
             />
          </div>

          {/* Footer Metadata */}
          <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end border-t border-white/5 pt-12 gap-8 text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em]">
             <div className="flex flex-wrap justify-center gap-8">
                <Link href="/legal/cookies" className="hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">Privacy Statement</Link>
                <button type="button" onClick={openCookiePreferences} className="hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5 text-left">Cookie Preferences</button>
                <Link href="/legal/security" className="hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">Trust & Security</Link>
             </div>
             <div className="text-center lg:text-right space-y-1">
                <p>&copy; 2026 FinaPilot Technologies Inc.</p>
                <p className="opacity-50 tracking-normal font-medium normal-case">All institutional rights reserved globally.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StrategicLink({ icon: Icon, title, desc, href }: any) {
  return (
    <Link href={href} className="flex flex-col gap-5 group/link">
       <div className="w-14 h-14 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-400 group-hover/link:bg-blue-600 group-hover/link:text-white group-hover/link:border-blue-600 group-hover/link:shadow-xl group-hover/link:shadow-blue-600/20 transition-all duration-500">
          <Icon className="w-7 h-7" />
       </div>
       <div className="space-y-2">
          <h4 className="font-black text-white flex items-center gap-2 text-sm uppercase tracking-wider">
             {title} <ChevronRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all" />
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium group-hover/link:text-slate-300 transition-colors">
             {desc}
          </p>
       </div>
    </Link>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020305] flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Secure Pipeline...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}

