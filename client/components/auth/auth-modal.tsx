"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"

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
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{mode === "login" ? "Sign In" : "Create Account"}</DialogTitle>
          <DialogDescription>
            {mode === "login" ? "Enter your credentials to access your account" : "Get started with FinaPilot in minutes"}
          </DialogDescription>
        </DialogHeader>
        {mode === "login" ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToSignup={() => setMode("signup")}
          />
        ) : (
          <SignupForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode("login")}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

