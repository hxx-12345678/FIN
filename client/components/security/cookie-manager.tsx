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
        <div className="fixed bottom-6 right-6 z-[100000] pointer-events-none w-[340px]">
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            className="bg-[#0B0E14]/90 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[1.5rem] p-4 pointer-events-auto relative overflow-hidden"
          >
            {view === "banner" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Privacy Stack</h3>
                    <p className="text-[11px] text-slate-300 leading-snug font-medium pr-2">
                      FinaPilot uses core cookies to ensure audit integrity.
                      <a href="/legal/cookies" className="text-blue-400 hover:underline ml-1">Policy</a>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rejectNonEssential}
                    className="flex-1 text-slate-500 hover:text-white hover:bg-white/5 h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider"
                  >
                    Required
                  </Button>
                  <Button 
                    size="sm"
                    onClick={acceptAll}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider shadow-lg shadow-blue-600/20"
                  >
                    Accept All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setView("settings")}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Consent Policies</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setView("banner")}
                    className="h-6 w-6 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'necessary', title: 'Necessary', desc: 'Secure sessions & audit trails.', locked: true },
                    { id: 'analytics', title: 'Analytics', desc: 'Engine optimization.', locked: false },
                    { id: 'functional', title: 'Preferences', desc: 'UI personalization.', locked: false },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="mr-2">
                        <h4 className="font-bold text-white text-[10px]">{item.title}</h4>
                        <p className="text-[9px] text-slate-500 line-clamp-1">{item.desc}</p>
                      </div>
                      
                      {item.locked ? (
                        <div className="p-1 px-1.5 rounded bg-white/5 shrink-0 text-[7px] font-black text-slate-500">FIXED</div>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={preferences[item.id as keyof typeof preferences]}
                            onChange={() => setPreferences(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof preferences] }))}
                          />
                          <div className="w-7 h-3.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-500 after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => savePreferences()}
                  className="w-full bg-white text-[#0B0E14] hover:bg-slate-200 h-9 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] shadow-xl"
                >
                  Confirm Choice
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

