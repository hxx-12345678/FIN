"use client"

import { motion } from "framer-motion"
import { Users, MessageSquare, Heart, Share2, Globe, ArrowRight, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#020305] text-white pt-32 pb-20 selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-8 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest"
          >
            <Users className="w-3 h-3" />
            The Strategic Community
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            Connect with the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">Future of Finance.</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed">
            Join thousands of CFOs, financial analysts, and platform engineers sharing insights, models, and the future of agentic FP&A.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="h-14 px-10 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20">
              Join the Discord
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="h-14 px-10 border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-white font-bold rounded-2xl">
              Explore User Models
            </Button>
          </div>
        </div>

        {/* Community Pillars */}
        <div className="grid md:grid-cols-3 gap-8 mb-32">
          <CommunityCard 
            icon={MessageSquare}
            title="Strategic Discussions"
            desc="Engage in deep dives into complex financial modeling, variance analysis, and AI-driven forecasting."
            count="12.4k+ Members"
          />
          <CommunityCard 
            icon={Share2}
            title="Template Sharing"
            desc="Access and share board deck templates, Monte Carlo logic, and specialized industry models."
            count="850+ Templates"
          />
          <CommunityCard 
            icon={Sparkles}
            title="Design Partners"
            desc="Get early access to new agent features and provide direct feedback to the FinaPilot engineering team."
            count="Exclusive Program"
          />
        </div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="p-12 md:p-20 rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-64 h-64 text-white" />
          </div>
          
          <div className="relative z-10 max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              Power Your Network
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">Ready to collaborate?</h2>
            <p className="text-xl text-blue-100 font-medium">
              Join the FinaPilot strategic community today and help shape the next era of financial intelligence.
            </p>
            <Button className="h-16 px-12 bg-white text-blue-600 hover:bg-blue-50 font-black rounded-2xl text-lg shadow-xl">
              Get Started Now
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function CommunityCard({ icon: Icon, title, desc, count }: any) {
  return (
    <div className="p-8 rounded-[40px] bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 group shadow-xl">
       <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <Icon className="w-8 h-8" />
       </div>
       <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{title}</h3>
       <p className="text-base text-slate-400 font-medium leading-relaxed mb-6">
          {desc}
       </p>
       <div className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 group-hover:text-blue-400 transition-colors">
          {count}
       </div>
    </div>
  )
}
