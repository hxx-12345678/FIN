"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Cookie, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CookieManager() {
  const [isVisible, setIsVisible] = useState(false)
  const [view, setView] = useState<"banner" | "settings">("banner")
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem("finapilot_cookie_consent")
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    } else {
      try { setPreferences(JSON.parse(consent)) } catch {}
    }
  }, [])

  // Listen for footer "Cookie Settings" button event
  useEffect(() => {
    const handler = () => {
      setView("settings")
      setIsVisible(true)
    }
    window.addEventListener("finapilot:open-cookie-preferences", handler)
    return () => window.removeEventListener("finapilot:open-cookie-preferences", handler)
  }, [])

  const savePreferences = (prefs = preferences) => {
    localStorage.setItem("finapilot_cookie_consent", JSON.stringify(prefs))
    setIsVisible(false)
  }

  const acceptAll = () => {
    const allPrefs = { necessary: true, functional: true, analytics: true, marketing: true }
    setPreferences(allPrefs)
    savePreferences(allPrefs)
  }

  const rejectNonEssential = () => {
    const minPrefs = { necessary: true, functional: false, analytics: false, marketing: false }
    setPreferences(minPrefs)
    savePreferences(minPrefs)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-[100000] p-4 md:p-6 pointer-events-none">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="max-w-4xl mx-auto bg-[#0B0E14]/95 backdrop-blur-2xl border border-slate-800 shadow-[0_32px_80px_rgba(0,0,0,0.8)] rounded-3xl p-6 md:p-8 pointer-events-auto relative overflow-hidden"
          >
            {/* Branding Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
            
            {view === "banner" ? (
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Cookie className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">Privacy Preference Center</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    FinaPilot uses cookies for secure session management and auditable provenance tracking. See our <a href="/legal/cookies" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">Cookie Statement</a>.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button 
                    variant="ghost" 
                    onClick={() => setView("settings")}
                    className="text-slate-400 hover:text-white hover:bg-slate-800/50 h-11 px-5 rounded-xl font-bold text-xs"
                  >
                    Manage Settings
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={rejectNonEssential}
                    className="text-slate-400 hover:text-white hover:bg-slate-800/50 h-11 px-5 rounded-xl font-bold text-xs"
                  >
                    Reject Non-Essential
                  </Button>
                  <Button 
                    onClick={acceptAll}
                    className="bg-blue-600 hover:bg-blue-500 text-white h-11 px-8 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20"
                  >
                    Accept All
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setView("banner")}
                      className="text-slate-400 hover:text-white h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-bold text-white tracking-tight">Granular Consent Policies</h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                    <ShieldCheck className="w-3 h-3" />
                    SOC 2 Compliant
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    { id: 'necessary', title: 'Strictly Necessary', desc: 'Required for platform security and basic arithmetic integrity.', locked: true },
                    { id: 'functional', title: 'Functional & UI', desc: 'Remembers layout and currency preferences across sessions.', locked: false },
                    { id: 'analytics', title: 'Analytical Integrity', desc: 'Aggregated, anonymous usage data to optimize calculation engines.', locked: false },
                    { id: 'marketing', title: 'Communications', desc: 'Contextual help and support messaging inside the app.', locked: false },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all group">
                      <div className="space-y-0.5 mr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{item.title}</h4>
                          {item.locked && <span className="text-[9px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">MANDATORY</span>}
                        </div>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      
                      {item.locked ? (
                        <div className="p-1 rounded bg-slate-800/80 shrink-0">
                           <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={preferences[item.id as keyof typeof preferences]}
                            onChange={() => setPreferences(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof preferences] }))}
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <Button 
                    onClick={() => savePreferences()}
                    className="bg-white text-slate-900 hover:bg-slate-200 h-11 px-8 rounded-xl font-bold text-sm shadow-xl"
                  >
                    Save My Preferences
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
