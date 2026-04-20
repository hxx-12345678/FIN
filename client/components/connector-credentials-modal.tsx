"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { API_BASE_URL, getAuthHeaders } from "@/lib/api-config"
import { toast } from "sonner"

interface ConnectorCredentialsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectorId: string
  connectorType: string
  connectorName: string
  orgId: string
  onSuccess: () => void
}

interface CredentialField {
  label: string
  name: string
  placeholder: string
  type: "text" | "password"
  required: boolean
  helperText?: string
}

// Define credential fields for each connector type
const CREDENTIAL_FIELDS: { [key: string]: CredentialField[] } = {
  stripe: [
    {
      label: "Stripe Secret Key",
      name: "apiKey",
      placeholder: "sk_live_... or sk_test_...",
      type: "password",
      required: true,
      helperText: "Found in Settings → API Keys in your Stripe dashboard",
    },
  ],
  razorpay: [
    {
      label: "Razorpay Key ID",
      name: "keyId",
      placeholder: "Your Key ID",
      type: "text",
      required: true,
      helperText: "Found in Settings → API Keys in your Razorpay dashboard",
    },
    {
      label: "Razorpay Key Secret",
      name: "keySecret",
      placeholder: "Your Key Secret",
      type: "password",
      required: true,
      helperText: "Keep this secret!",
    },
  ],
  plaid: [
    {
      label: "Plaid Client ID",
      name: "clientId",
      placeholder: "Your Client ID",
      type: "text",
      required: true,
      helperText: "Found in Settings → API Keys in your Plaid dashboard",
    },
    {
      label: "Plaid Secret",
      name: "secret",
      placeholder: "Your Secret",
      type: "password",
      required: true,
      helperText: "Keep this secret!",
    },
    {
      label: "Public Token (from Link)",
      name: "publicToken",
      placeholder: "Public token from Plaid Link",
      type: "text",
      required: true,
      helperText: "Get this by completing Plaid Link on their dashboard",
    },
  ],
  cleartax: [
    {
      label: "ClearTax API Key",
      name: "apiKey",
      placeholder: "Your API Key",
      type: "password",
      required: true,
      helperText: "Found in Settings → API in your ClearTax dashboard",
    },
  ],
  sap: [
    {
      label: "SAP Instance URL",
      name: "instanceUrl",
      placeholder: "https://your-instance.sap.com",
      type: "text",
      required: true,
      helperText: "Your SAP S/4HANA cloud instance URL (e.g. https://my300000.s4hana.cloud.sap)",
    },
    {
      label: "Access Token",
      name: "accessToken",
      placeholder: "Your OAuth 2.0 Access Token",
      type: "password",
      required: true,
      helperText: "Obtain via OAuth 2.0 flow or system integration",
    },
  ],
  oracle: [
    {
      label: "Oracle Instance URL",
      name: "instanceUrl",
      placeholder: "https://your-instance.oracle.com",
      type: "text",
      required: true,
      helperText: "Your Oracle ERP Cloud instance URL",
    },
    {
      label: "Access Token",
      name: "accessToken",
      placeholder: "Your OAuth 2.0 Access Token",
      type: "password",
      required: true,
      helperText: "Obtain via OAuth 2.0 flow or API credentials",
    },
  ],
  slack: [
    {
      label: "Slack Bot Token",
      name: "botToken",
      placeholder: "xoxb-... ",
      type: "password",
      required: true,
      helperText: "Found in Settings → Install App → Bot User OAuth Token",
    },
  ],
  asana: [
    {
      label: "Asana Personal Access Token",
      name: "accessToken",
      placeholder: "Your PAT",
      type: "password",
      required: true,
      helperText: "Create in Settings → Apps & Custom → Personal Access Tokens",
    },
  ],
  tally: [
    {
      label: "Tally.NET Server URL",
      name: "serverUrl",
      placeholder: "http://localhost:9000 or your Tally.NET address",
      type: "text",
      required: true,
      helperText: "Enable Tally.NET in Tally ERP → F12 (Configuration) → Data Configuration → Enable ODBC/Tally.NET Server",
    },
    {
      label: "Company Name (in Tally)",
      name: "companyName",
      placeholder: "e.g. Black Pearl Enterprise",
      type: "text",
      required: true,
      helperText: "The exact company name as registered in your Tally installation",
    },
  ],
  salesforce: [
    {
      label: "Salesforce Instance URL",
      name: "instanceUrl",
      placeholder: "https://yourcompany.my.salesforce.com",
      type: "text",
      required: true,
      helperText: "Your Salesforce org instance URL",
    },
    {
      label: "Access Token",
      name: "accessToken",
      placeholder: "Your connected app access token",
      type: "password",
      required: true,
      helperText: "Set up a Connected App in Salesforce Setup → App Manager",
    },
  ],
}

export function ConnectorCredentialsModal({
  open,
  onOpenChange,
  connectorId,
  connectorType,
  connectorName,
  orgId,
  onSuccess,
}: ConnectorCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [credentials, setCredentials] = useState<{ [key: string]: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Reset state when modal opens or connector changes
  useEffect(() => {
    if (open) {
      setCredentials({})
      setError(null)
      setLoading(false)
      setValidating(false)
      setSuccess(false)
    }
  }, [open, connectorId])

  const fields = CREDENTIAL_FIELDS[connectorType] || []

  const handleInputChange = (name: string, value: string) => {
    setCredentials(prev => ({ ...prev, [name]: value }))
    setError(null) // Clear error when user starts typing
  }

  const handleValidateAndConnect = async () => {
    // Validate required fields
    const missingFields = fields.filter(f => f.required && !credentials[f.name])
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.map(f => f.label).join(", ")}`)
      return
    }

    setValidating(true)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_BASE_URL}/orgs/${orgId}/connectors/${connectorId}/configure`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            type: connectorType,
            credentials,
          }),
        }
      )

      if (response.status === 401) {
        setError("Session expired. Please log in again.")
        setValidating(false)
        setLoading(false)
        return
      }

      const result = await response.json()

      if (!response.ok) {
        // Validation failed
        const errorMsg = result.error?.message || result.message || "Credential validation failed"
        setError(`Validation failed: ${errorMsg}`)
        setValidating(false)
        setLoading(false)
        return
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        toast.success(`${connectorName} successfully configured and connected!`)
        onOpenChange(false)
        onSuccess()
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to configure connector"
      setError(errorMsg)
      setValidating(false)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect {connectorName}</DialogTitle>
          <DialogDescription>
            Enter your {connectorName} API credentials. They will be securely encrypted and stored.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Connection Successful!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {connectorName} is now connected and initial sync has been queued.
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 px-4">
              {fields.map(field => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-600 ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={credentials[field.name] || ""}
                    onChange={e => handleInputChange(field.name, e.target.value)}
                    disabled={validating}
                  />
                  {field.helperText && (
                    <p className="text-xs text-muted-foreground">{field.helperText}</p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={validating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidateAndConnect}
                disabled={validating || fields.length === 0}
                className="gap-2"
              >
                {validating && <Loader2 className="h-4 w-4 animate-spin" />}
                {validating ? "Validating..." : "Validate & Connect"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
