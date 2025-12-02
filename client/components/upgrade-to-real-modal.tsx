"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ArrowRight, Zap } from "lucide-react"
import { disableDemoMode } from "@/lib/demo-data-generator"

interface UpgradeToRealModalProps {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
}

const integrations = [
  {
    name: "QuickBooks Online",
    logo: "💼",
    popular: true,
  },
  {
    name: "Xero",
    logo: "📊",
    popular: true,
  },
  {
    name: "Stripe",
    logo: "💳",
    popular: false,
  },
  {
    name: "Razorpay",
    logo: "💰",
    popular: false,
  },
  {
    name: "Zoho Books",
    logo: "📚",
    popular: false,
  },
  {
    name: "Tally",
    logo: "🧮",
    popular: false,
  },
]

export function UpgradeToRealModal({ open, onClose, onUpgrade }: UpgradeToRealModalProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)

  const handleUpgrade = () => {
    disableDemoMode()
    onUpgrade()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade to Real Account</DialogTitle>
          <DialogDescription className="text-base">
            Connect your accounting system to start managing your actual financial data with FinaPilot's AI-powered
            insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold">What you'll get:</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Real-time data synchronization</div>
                  <div className="text-sm text-muted-foreground">
                    Automatic updates from your accounting system every hour
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Accurate AI forecasts</div>
                  <div className="text-sm text-muted-foreground">
                    Predictions based on your actual business patterns and trends
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Full export capabilities</div>
                  <div className="text-sm text-muted-foreground">
                    Download reports, share with investors, and integrate with other tools
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Team collaboration</div>
                  <div className="text-sm text-muted-foreground">
                    Invite team members, set permissions, and work together
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold">Choose your accounting system:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {integrations.map((integration) => (
                <Card
                  key={integration.name}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedIntegration === integration.name ? "border-2 border-blue-600 bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedIntegration(integration.name)}
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="text-3xl">{integration.logo}</div>
                    <div className="font-medium text-sm">{integration.name}</div>
                    {integration.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-1">Secure & Encrypted</div>
                <div className="text-blue-700">
                  We use bank-level 256-bit encryption and never store your login credentials. Your data is protected
                  with SOC 2 Type II compliance.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Stay in Demo Mode
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={handleUpgrade}
            disabled={!selectedIntegration}
          >
            Connect {selectedIntegration || "Integration"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
