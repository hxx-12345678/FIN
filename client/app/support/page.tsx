"use client"

import { motion } from "framer-motion"
import { Search, Book, MessageCircle, PlayCircle, HelpCircle, ExternalLink, ChevronRight, Mail, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#020305] text-white pt-32 pb-20 selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-8 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest"
          >
            <HelpCircle className="w-3 h-3" />
            Support Center
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">How Can We <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">Assist You?</span></h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed">
            From financial modeling precision to enterprise-grade integrations, our support ecosystem is designed to ensure your success.
          </p>

          <div className="relative max-w-xl mx-auto group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Search the knowledge base..." 
              className="h-16 pl-14 pr-6 bg-slate-900/50 border-slate-800 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg font-medium"
            />
          </div>
        </div>

        {/* Support Options */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <SupportCard 
            icon={Book}
            title="Knowledge Base"
            desc="Detailed documentation on our agentic modeling engine, DCF logic, and ERP sync."
            link="/docs"
          />
          <SupportCard 
            icon={PlayCircle}
            title="Video Tutorials"
            desc="Step-by-step visual guides on setting up your first autonomous financial model."
            link="#"
          />
          <SupportCard 
            icon={MessageCircle}
            title="Community Forum"
            desc="Join the strategic conversation with thousands of FinaPilot power users."
            link="#"
          />
        </div>

        {/* Contact Support Section */}
        <div className="p-8 md:p-16 rounded-[40px] bg-slate-900/40 border border-slate-800 backdrop-blur-xl relative overflow-hidden group shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-400 to-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
           
           <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
              <div className="space-y-6 text-center md:text-left">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-3 h-3" />
                    Priority Support
                 </div>
                 <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Need Mission-Critical Assistance?</h2>
                 <p className="text-lg text-slate-400 font-medium max-w-xl">
                    Our team of financial analysts and platform engineers are available 24/7 for Enterprise Tier customers.
                 </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20">
                    <Mail className="w-5 h-5 mr-3" />
                    Email Support
                 </Button>
                 <Button variant="outline" className="h-14 px-8 border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-white font-bold rounded-2xl">
                    Live Chat <ExternalLink className="w-4 h-4 ml-3 opacity-50" />
                 </Button>
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}

function SupportCard({ icon: Icon, title, desc, link }: any) {
  return (
    <a href={link} className="p-8 rounded-[40px] bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 group shadow-xl">
       <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <Icon className="w-8 h-8" />
       </div>
       <h3 className="text-2xl font-black text-white mb-4 tracking-tight flex items-center gap-2">
          {title}
          <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
       </h3>
       <p className="text-base text-slate-400 font-medium leading-relaxed">
          {desc}
       </p>
    </a>
  )
}
