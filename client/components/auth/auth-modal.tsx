"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: "login" | "signup"
  onSuccess?: () => void
}

export function AuthModal({ open, onOpenChange, defaultMode = "login", onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode)

  useEffect(() => {
    if (open) {
      setMode(defaultMode)
    }
  }, [open, defaultMode])

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
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>Sign in or create an account to access FinaPilot</DialogDescription>
        </DialogHeader>
        {/* Premium Header */}
        <div className="relative p-8 border-b border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <img src="/icon.svg" alt="FinaPilot Logo" className="w-8 h-8 rounded-lg shadow-lg" />
               <span className="text-xl font-bold tracking-tight text-white">FinaPilot</span>
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

