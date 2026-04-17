"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Cookie, Settings } from "lucide-react"

export function CookieConsent() {
  const [show, setShow] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false
  })

  useEffect(() => {
    const hasConsent = localStorage.getItem("finapilot_cookie_consent")
    if (!hasConsent) {
      setShow(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem("finapilot_cookie_consent", "all")
    setShow(false)
  }

  const handleDeclineOptional = () => {
    localStorage.setItem("finapilot_cookie_consent", "essential")
    setShow(false)
  }

  const handleSavePreferences = () => {
    localStorage.setItem("finapilot_cookie_consent", JSON.stringify(preferences))
    setPreferencesOpen(false)
    setShow(false)
  }

  if (!show) return null

  if (preferencesOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">Privacy Preference Center</h2>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              When you visit our website, we store cookies on your browser to collect information. This information might be about you, your preferences, or your device and is mostly used to make the site work as you expect it to.
            </p>
          </div>
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Strictly Necessary Cookies</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you.</p>
              </div>
              <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded select-none">Always Active</div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Performance & Analytics</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">These allow us to count visits and traffic sources so we can measure and improve the performance of our site.</p>
              </div>
              <div className="flex items-center h-5">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" checked={preferences.analytics} onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})} />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Marketing & Targeting</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">These cookies may be set by our advertising partners to build a profile of your interests and show you relevant adverts on other sites.</p>
              </div>
              <div className="flex items-center h-5">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" checked={preferences.marketing} onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})} />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between gap-4">
            <Button variant="outline" onClick={() => setPreferencesOpen(false)}>Back</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={handleSavePreferences}>Confirm My Choices</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-safe">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)]">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 mt-1 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 hidden sm:flex">
                <Cookie className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">We value your privacy</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We and our partners use cookies to enhance site navigation, analyze website performance, and assist in our marketing efforts. By clicking "Accept All", you agree to the storing of cookies on your device. For more information on how we use cookies, please see our <a href="/privacy" className="text-indigo-600 underline hover:text-indigo-800">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col sm:flex-row md:flex-col justify-center gap-3 shrink-0 min-w-[280px]">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-sm h-11" onClick={handleAcceptAll}>
              Accept All Cookies
            </Button>
            <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm h-11" onClick={handleDeclineOptional}>
              Reject Optional
            </Button>
            <button className="text-xs text-slate-500 hover:text-indigo-600 font-medium underline-offset-4 hover:underline transition-colors flex items-center justify-center gap-1.5 mt-2" onClick={() => setPreferencesOpen(true)}>
              <Settings className="h-3 w-3" /> Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
