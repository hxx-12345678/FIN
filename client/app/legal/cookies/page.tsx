"use client"

import { motion } from "framer-motion"
import { Shield, Cookie, Lock, Eye, CheckCircle2, Settings, LineChart } from "lucide-react"
import Link from "next/link"

export default function CookiePolicyPage() {
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
          <Link href="/" className="text-xs font-bold text-slate-500 hover:text-white transition-colors">&larr; Back to Home</Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
            <Cookie className="w-3 h-3" />
            Governance Transparency
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">Cookie Statement</h1>
          <p className="text-xl text-slate-400 font-medium">
            How FinaPilot utilizes local storage and tracking technologies to ensure auditable financial integrity.
          </p>
          <div className="text-sm text-slate-500">Last Updated: April 16, 2026</div>
        </motion.div>

        <div className="mt-16 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-500" />
              1. Our Approach to Data Collection
            </h2>
            <p className="text-slate-300 leading-relaxed font-medium">
              FinaPilot adheres to a &ldquo;Privacy by Design&rdquo; philosophy. As an institutional financial platform, our use of cookies is primarily focused on session security, multi-dimensional model persistence, and SOC 2 compliant audit logging. We do not sell user data to advertising networks.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">2. Categorization of Cookies</h2>
            
            <div className="grid gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex gap-6 items-start">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Strictly Necessary</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Essential for core platform functionality, including authentication, load balancing, and secure ledger access. These cannot be disabled.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex gap-6 items-start">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Settings className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Functional &amp; Preference</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Allows the platform to remember your layout preferences, currency settings, and specific dashboard variants across sessions.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex gap-6 items-start">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <LineChart className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Analytical Integrity</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Help us understand how users interact with the Hyperblock engine to optimize performance and calculation latency. All data is anonymized.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-500" />
              3. Managing Your Preferences
            </h2>
            <p className="text-slate-300 leading-relaxed font-medium">
              You can adjust your cookie settings at any time via the &ldquo;Cookie Settings&rdquo; link in the footer of our dashboard. Furthermore, FinaPilot respects Global Privacy Control (GPC) signals and Do Not Track (DNT) browser headers by default.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              4. Third-Party Data Processors
            </h2>
            <p className="text-slate-300 leading-relaxed font-medium">
              FinaPilot uses a limited set of third-party processors exclusively for platform operations. These include Vercel (hosting), Stripe (payment processing), and Plaid (bank connectivity). Each processor is contractually bound to process data only as instructed by FinaPilot and in compliance with applicable data protection regulations.
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-blue-600/5 border border-blue-500/20 mt-20">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Institutional Compliance Report</h3>
                <p className="text-sm text-slate-400 max-w-lg">
                  Need a full audit of our data processing partners? Download our SOC 2 Type II cookie audit report for your compliance department.
                </p>
              </div>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">
                Request Audit Pack
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
