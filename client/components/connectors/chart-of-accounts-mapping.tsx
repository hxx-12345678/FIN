"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, Download, Upload, AlertCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface SourceAccount {
  id: string
  name: string
  type: string
  code?: string
}

interface TargetAccount {
  id: string
  name: string
  type: string
  code?: string
}

interface Mapping {
  sourceId: string
  targetId: string
}

export function ChartOfAccountsMapping({ connectorId }: { connectorId: string }) {
  const [sourceAccounts, setSourceAccounts] = useState<SourceAccount[]>([])
  const [targetAccounts, setTargetAccounts] = useState<TargetAccount[]>([])
  const [mappings, setMappings] = useState<Map<string, string>>(new Map())
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [connectorId])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [sourceRes, targetRes, templatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/connectors/${connectorId}/accounts`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/chart-of-accounts?org_id=${localStorage.getItem("orgId") || ""}`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/connectors/mapping-templates`, {
          method: "GET",
          credentials: "include",
        }),
      ])

      if (!sourceRes.ok || !targetRes.ok) {
        throw new Error("Failed to fetch accounts")
      }

      const [sourceData, targetData, templatesData] = await Promise.all([
        sourceRes.json(),
        targetRes.json(),
        templatesRes.ok ? templatesRes.json() : { templates: [] },
      ])

      setSourceAccounts(sourceData.accounts || [])
      setTargetAccounts(targetData.accounts || [])
      setTemplates(templatesData.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMappingChange = (sourceId: string, targetId: string) => {
    const newMappings = new Map(mappings)
    if (targetId) {
      newMappings.set(sourceId, targetId)
    } else {
      newMappings.delete(sourceId)
    }
    setMappings(newMappings)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const mappingArray = Array.from(mappings.entries()).map(([sourceId, targetId]) => ({
        sourceId,
        targetId,
      }))

      const response = await fetch(`${API_BASE_URL}/connectors/${connectorId}/map-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ mappings: mappingArray }),
      })

      if (!response.ok) {
        throw new Error("Failed to save mappings")
      }

      toast.success("Mappings saved successfully")
    } catch (err) {
      toast.error("Failed to save mappings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveTemplate = async (templateName: string) => {
    try {
      const mappingArray = Array.from(mappings.entries()).map(([sourceId, targetId]) => ({
        sourceId,
        targetId,
      }))

      const response = await fetch(`${API_BASE_URL}/connectors/mapping-templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: templateName, mappings: mappingArray }),
      })

      if (!response.ok) {
        throw new Error("Failed to save template")
      }

      await fetchData()
      toast.success("Template saved successfully")
    } catch (err) {
      toast.error("Failed to save template")
    }
  }

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connectors/mapping-templates`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to load templates")
      }

      const data = await response.json()
      const template = data.templates.find((t: any) => t.id === templateId)

      if (template && template.mappings) {
        const newMappings = new Map()
        template.mappings.forEach((m: Mapping) => {
          newMappings.set(m.sourceId, m.targetId)
        })
        setMappings(newMappings)
        toast.success("Template loaded successfully")
      }
    } catch (err) {
      toast.error("Failed to load template")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Chart of Accounts Mapping</h1>
          <p className="text-muted-foreground">Map connector accounts to your chart of accounts</p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Select onValueChange={handleLoadTemplate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load Template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => {
            const name = prompt("Template name:")
            if (name) handleSaveTemplate(name)
          }}>
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Mappings
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Source Accounts</CardTitle>
            <CardDescription>Accounts from connector</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {sourceAccounts.map((account) => (
                <div key={account.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-muted-foreground">{account.type}</div>
                  {account.code && (
                    <div className="text-xs text-muted-foreground mt-1">Code: {account.code}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Accounts</CardTitle>
            <CardDescription>Your chart of accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {targetAccounts.map((account) => (
                <div key={account.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-muted-foreground">{account.type}</div>
                  {account.code && (
                    <div className="text-xs text-muted-foreground mt-1">Code: {account.code}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mappings</CardTitle>
          <CardDescription>Map source accounts to target accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sourceAccounts.map((sourceAccount) => {
              const targetId = mappings.get(sourceAccount.id)
              const targetAccount = targetId ? targetAccounts.find((a) => a.id === targetId) : null

              return (
                <div key={sourceAccount.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{sourceAccount.name}</div>
                    <div className="text-sm text-muted-foreground">{sourceAccount.type}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={targetId || ""}
                    onValueChange={(value) => handleMappingChange(sourceAccount.id, value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select target account" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetAccounts.map((targetAccount) => (
                        <SelectItem key={targetAccount.id} value={targetAccount.id}>
                          {targetAccount.name} ({targetAccount.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


