"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"
import { Gauge, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: "login" | "signup"
  onSuccess?: () => void
}

export function AuthModal({ open, onOpenChange, defaultMode = "login", onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode)

  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[520px] max-w-[95vw] max-h-[95vh] overflow-y-auto p-0 bg-[#020617] border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)]"
        style={{ zIndex: 10000 }}
      >
        {/* Premium Header */}
        <div className="relative p-8 border-b border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <Gauge className="w-6 h-6 text-[#020617]" />
              </div>
              <span className="text-xl font-black tracking-tight uppercase italic text-white">
                Fina<span className="text-indigo-500 not-italic">Pilot</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                mode === "login"
                  ? "bg-white text-[#020617] shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                mode === "signup"
                  ? "bg-white text-[#020617] shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Content with Animation */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm
                  onSuccess={handleSuccess}
                  onSwitchToSignup={() => setMode("signup")}
                />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SignupForm
                  onSuccess={handleSuccess}
                  onSwitchToLogin={() => setMode("login")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

