"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Eye, EyeOff, User, Building2 } from "lucide-react"
import { SSOLogin } from "./sso-login"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface SignupFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [orgName, setOrgName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          orgName,
          name: name || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Signup failed")
      }

      // Check if signup resulted in access request instead of new account
      if (data.requiresAccessRequest) {
        toast.success(`Access request submitted for ${data.orgName}!`, {
          description: "An admin will review your request. You'll be notified once approved."
        })
        setError(null)
        // Show success message but don't redirect - user needs to wait for approval
        return
      }

      // Store tokens
      if (data.token) {
        localStorage.setItem("auth-token", data.token)
        document.cookie = `auth-token=${data.token}; path=/; max-age=86400`
      }
      if (data.refreshToken) {
        localStorage.setItem("refresh-token", data.refreshToken)
      }

      toast.success("Account created successfully!")
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <SSOLogin
          onSuccess={onSuccess}
          onError={(err) => setError(err)}
        />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#020617] px-4 text-slate-500 font-black tracking-widest">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name <span className="text-slate-600">(Optional)</span></Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">Email <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="orgName" className="text-xs font-black uppercase tracking-widest text-slate-400">Organization Name <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="orgName"
                type="text"
                placeholder="Acme Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Password <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={isLoading}
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-4 hover:bg-transparent text-slate-500 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-widest text-slate-400">Confirm Password <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-4 hover:bg-transparent text-slate-500 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center text-sm pt-4">
          <span className="text-slate-500">Already have an account? </span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm text-indigo-400 hover:text-indigo-300 font-bold"
            onClick={onSwitchToLogin}
          >
            Sign in
          </Button>
        </div>
    </div>
  )
}

