"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Smartphone, Mail, MessageSquare, CheckCircle2, Download, Copy, AlertCircle } from "lucide-react"
import { useMFA } from "@/hooks/use-mfa"
import { toast } from "sonner"

interface MFASetupWizardProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

type MFAStep = "method-selection" | "qr-display" | "verification" | "backup-codes" | "complete"

type MFAMethod = "totp" | "sms" | "email"

export function MFASetupWizard({ open, onClose, onComplete }: MFASetupWizardProps) {
  const [step, setStep] = useState<MFAStep>("method-selection")
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodesSaved, setBackupCodesSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    setupMFA,
    verifyCode,
    backupCodes,
    generateBackupCodes,
    enableMFA,
    attemptsRemaining,
    resetAttempts,
  } = useMFA()

  useEffect(() => {
    if (!open) {
      setStep("method-selection")
      setSelectedMethod(null)
      setQrCode(null)
      setSecret(null)
      setSentTo(null)
      setVerificationCode("")
      setBackupCodesSaved(false)
      setError(null)
      resetAttempts()
    }
  }, [open, resetAttempts])

  const handleMethodSelect = async (method: MFAMethod) => {
    setSelectedMethod(method)
    setError(null)

    try {
      const result = await setupMFA(method)
      
      if (method === "totp") {
        setQrCode(result.qrCode || null)
        setSecret(result.secret || null)
        setStep("qr-display")
      } else {
        setSentTo(result.sentTo || null)
        setStep("verification")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to setup MFA"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code")
      return
    }

    setError(null)

    try {
      const isValid = await verifyCode(verificationCode)
      
      if (isValid) {
        if (selectedMethod === "totp" && step === "qr-display") {
          setStep("verification")
        } else {
          await handleGenerateBackupCodes()
        }
      } else {
        setError("Invalid verification code. Please try again.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid verification code. Please try again."
      setError(errorMessage)
      
      if (errorMessage.includes("Maximum attempts")) {
        toast.error(errorMessage)
        setStep("method-selection")
        resetAttempts()
      }
    }
  }

  const handleGenerateBackupCodes = async () => {
    try {
      await generateBackupCodes()
      setStep("backup-codes")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate backup codes"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleEnableMFA = async () => {
    if (!backupCodesSaved) {
      setError("Please confirm you have saved the backup codes")
      return
    }

    try {
      await enableMFA()
      setStep("complete")
      toast.success("MFA enabled successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to enable MFA"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleCopyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"))
      toast.success("Backup codes copied to clipboard")
    }
  }

  const handleDownloadBackupCodes = () => {
    if (backupCodes) {
      const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "finapilot-backup-codes.txt"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Backup codes downloaded")
    }
  }

  const getProgress = () => {
    const steps = ["method-selection", "qr-display", "verification", "backup-codes", "complete"]
    return ((steps.indexOf(step) + 1) / steps.length) * 100
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
          <DialogDescription>Add an extra layer of security to your account</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(getProgress())}%</span>
            </div>
            <Progress value={getProgress()} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Method Selection */}
          {step === "method-selection" && (
            <div className="space-y-4">
              <Label>Choose your MFA method</Label>
              <RadioGroup value={selectedMethod || undefined} onValueChange={(value) => handleMethodSelect(value as MFAMethod)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="totp" id="totp" />
                  <Label htmlFor="totp" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5" />
                      <div>
                        <div className="font-medium">Authenticator App</div>
                        <div className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      <div>
                        <div className="font-medium">SMS</div>
                        <div className="text-sm text-muted-foreground">Receive codes via text message</div>
                      </div>
                    </div>
                    </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <div>
                        <div className="font-medium">Email</div>
                        <div className="text-sm text-muted-foreground">Receive codes via email</div>
                      </div>
                    </div>
                    </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 2: QR Display (TOTP only) */}
          {step === "qr-display" && selectedMethod === "totp" && (
            <div className="space-y-4">
              <div className="text-center">
                <Label>Scan QR Code</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {qrCode ? (
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              ) : (
                <div className="flex justify-center p-4">
                  <Skeleton className="w-48 h-48" />
                </div>
              )}

              {secret && (
                <div className="space-y-2">
                  <Label>Or enter this code manually</Label>
                  <div className="flex items-center gap-2">
                    <Input value={secret} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(secret)
                        toast.success("Secret code copied")
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Can't scan?</strong> Open your authenticator app and add a new account manually. Enter the secret code above.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("method-selection")}>
                  Back
                </Button>
                <Button onClick={() => setStep("verification")} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {step === "verification" && (
            <div className="space-y-4">
              <div>
                <Label>Enter verification code</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedMethod === "totp"
                    ? "Enter the 6-digit code from your authenticator app"
                    : selectedMethod === "sms"
                    ? `Enter the code sent to ${sentTo}`
                    : `Enter the code sent to ${sentTo}`}
                </p>
              </div>

              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setVerificationCode(value)
                  setError(null)
                }}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
              />

              {attemptsRemaining < 3 && (
                <Alert>
                  <AlertDescription>
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(selectedMethod === "totp" ? "qr-display" : "method-selection")}>
                  Back
                </Button>
                <Button onClick={handleVerifyCode} disabled={verificationCode.length !== 6} className="flex-1">
                  Verify
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Backup Codes */}
          {step === "backup-codes" && (
            <div className="space-y-4">
              <div>
                <Label>Save your backup codes</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  These codes can be used to access your account if you lose access to your authenticator device.
                  Save them in a safe place.
                </p>
              </div>

              {backupCodes ? (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-background rounded border text-center">
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saved-codes"
                  checked={backupCodesSaved}
                  onCheckedChange={(checked) => setBackupCodesSaved(checked as boolean)}
                />
                <Label htmlFor="saved-codes" className="cursor-pointer">
                  I have saved these backup codes in a secure location
                </Label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("verification")}>
                  Back
                </Button>
                <Button onClick={handleEnableMFA} disabled={!backupCodesSaved} className="flex-1">
                  Enable MFA
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">MFA Enabled Successfully</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account is now protected with multi-factor authentication
                </p>
              </div>
              <Button onClick={() => { onComplete(); onClose(); }} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

