"use client"

import { motion } from "framer-motion"
import { Mail, MessageSquare, Globe, ArrowRight, Building2, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#020305] text-white pt-32 pb-20 selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          
          {/* Left Side: Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                Global Sales & Support
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
                Let's Build the <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Future of FP&A.</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
                Ready to transition from static spreadsheets to agentic financial intelligence? Our team of experts is standing by.
              </p>
            </div>

            <div className="grid gap-8">
               <ContactItem 
                  icon={Mail}
                  title="General Inquiries"
                  desc="For general questions or partnership opportunities."
                  value="hello@finapilot.ai"
               />
               <ContactItem 
                  icon={MessageSquare}
                  title="Technical Support"
                  desc="Already a customer? Reach our mission-critical support desk."
                  value="support@finapilot.ai"
               />
               <ContactItem 
                  icon={Building2}
                  title="Corporate Headquarters"
                  desc="FinaPilot Technologies Inc."
                  value="San Francisco, CA"
               />
            </div>
          </motion.div>

          {/* Right Side: Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 md:p-12 rounded-[40px] bg-slate-900/40 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-8"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Send a Message</h3>
              <p className="text-sm text-slate-400">Expect a response within 4 institutional business hours.</p>
            </div>

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-xs font-bold uppercase tracking-widest text-slate-500">First Name</Label>
                  <Input id="first-name" placeholder="John" className="bg-slate-950/50 border-slate-800 h-12 focus:border-blue-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" className="bg-slate-950/50 border-slate-800 h-12 focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500">Institutional Email</Label>
                <Input id="email" type="email" placeholder="john@company.com" className="bg-slate-950/50 border-slate-800 h-12 focus:border-blue-500 transition-colors" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-bold uppercase tracking-widest text-slate-500">Company Name</Label>
                <Input id="company" placeholder="Acme Corp" className="bg-slate-950/50 border-slate-800 h-12 focus:border-blue-500 transition-colors" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-slate-500">How can we help?</Label>
                <Textarea id="message" placeholder="Describe your financial modeling requirements..." className="bg-slate-950/50 border-slate-800 min-h-[120px] focus:border-blue-500 transition-colors" />
              </div>

              <Button className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 group">
                Request Strategy Session
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  )
}

function ContactItem({ icon: Icon, title, desc, value }: any) {
  return (
    <div className="flex gap-6 items-start group">
       <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <Icon className="w-6 h-6" />
       </div>
       <div className="space-y-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
          <p className="text-base text-blue-400 font-bold mt-2">{value}</p>
       </div>
    </div>
  )
}
