"use client"

import { motion } from "framer-motion"
import { Shield, Lock, Eye, ShieldCheck, CheckCircle2, Globe, Server, FileCheck, LockKeyhole } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#020305] text-white pt-32 pb-20 selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            Institutional Trust Center
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">Enterprise Security</h1>
          <p className="text-xl text-slate-400 font-medium">
            FinaPilot utilizes zero-trust architecture and audit-grade provenance to ensure every financial cell is 100% auditable and secure.
          </p>
          <div className="text-sm text-slate-500">Last Updated: April 16, 2026</div>
        </motion.div>

        <div className="mt-16 space-y-20">
          
          {/* Compliance Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <ComplianceBadge icon={ShieldCheck} label="SOC 2 TYPE II" sub="Ready" />
             <ComplianceBadge icon={Lock} label="GDPR" sub="Compliant" />
             <ComplianceBadge icon={Globe} label="CCPA" sub="Compliant" />
             <ComplianceBadge icon={CheckCircle2} label="ISO 27001" sub="Aligned" />
          </div>

          <section className="space-y-12">
            <h2 className="text-3xl font-black text-white">Our Security Pillars</h2>
            <div className="grid gap-8">
               <SecurityPillar 
                  icon={LockKeyhole}
                  title="Zero-Trust Architecture"
                  desc="Every request to the FinaPilot engine is authenticated, authorized, and continuously validated. We employ multi-factor authentication and role-based access control (RBAC) at every layer."
               />
               <SecurityPillar 
                  icon={Server}
                  title="Data Isolation & Encryption"
                  desc="Customer data is logically isolated in multi-tenant environments. All data is encrypted at rest using AES-256 and in transit using TLS 1.3. We utilize hardware-backed key management systems."
               />
               <SecurityPillar 
                  icon={FileCheck}
                  title="Audit-Grade Provenance"
                  desc="Our unique DAG-backed cell lineage ensures every AI-generated forecast cell is 100% auditable back to its exact ERP transaction. No 'black box' AI."
               />
               <SecurityPillar 
                  icon={Eye}
                  title="Continuous Monitoring"
                  desc="24/7/365 security monitoring and threat detection. We conduct regular third-party penetration testing and vulnerability assessments."
               />
            </div>
          </section>

          <section className="p-8 md:p-12 rounded-[40px] bg-slate-900/40 border border-slate-800 mt-20">
            <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-black text-white">Report Security Issues</h3>
                <p className="text-base text-slate-400 max-w-lg">
                  We take the security of our institutional platform with absolute seriousness. If you've identified a potential vulnerability, please report it immediately.
                </p>
              </div>
              <button 
                onClick={() => window.location.href = "mailto:support@finapilot.com?subject=Security%20Issue%20Report"}
                className="px-10 py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 hover:border-red-600 font-bold rounded-2xl transition-all whitespace-nowrap"
              >
                Report Sensitivity
              </button>
            </div>
          </section>

          <section className="p-8 md:p-12 rounded-[40px] bg-blue-600/5 border border-blue-500/20 mt-8">
            <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white">Institutional Security Pack</h3>
                <p className="text-base text-slate-400 max-w-lg">
                  Need a full audit of our security protocols for your compliance department? Download our latest security whitepaper and SOC 2 overview.
                </p>
              </div>
              <button 
                onClick={() => window.location.href = "mailto:support@finapilot.com?subject=Audit%20Pack%20Request"}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
              >
                Request Audit Pack
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ComplianceBadge({ icon: Icon, label, sub }: any) {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2 hover:border-blue-500/30 transition-colors">
       <Icon className="w-8 h-8 text-blue-500 mx-auto" />
       <div className="space-y-0.5">
          <p className="text-xs font-black text-white tracking-widest">{label}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{sub}</p>
       </div>
    </div>
  )
}

function SecurityPillar({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-8 rounded-[40px] bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row gap-8 items-start hover:border-slate-700 transition-colors">
       <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Icon className="w-8 h-8" />
       </div>
       <div className="space-y-3">
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="text-base text-slate-400 leading-relaxed font-medium">{desc}</p>
       </div>
    </div>
  )
}
