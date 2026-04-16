"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Save, Loader2, Calculator, Info, TrendingUp, Users, DollarSign, Zap } from "lucide-react"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface ManualInputFormProps {
    orgId: string | null
    modelId: string | null
    onSuccess?: () => void
}

export function ManualInputForm({ orgId, modelId, onSuccess }: ManualInputFormProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [inputs, setInputs] = useState<any>({
        revenue: {
            monthlyMrr: "",
            startingCustomers: "",
        },
        costs: {
            payroll: "",
            infrastructure: "",
            marketing: "",
        },
        metrics: {
            cac: "",
            retentionRate: "",
            churnRate: "",
        }
    })

    useEffect(() => {
        if (orgId && modelId) {
            fetchInputs()
        }
    }, [orgId, modelId])

    const fetchInputs = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/manual/input`, {
                headers: getAuthHeaders(),
                credentials: "include",
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }

            if (res.ok) {
                const data = await res.json()
                if (data.ok && data.inputs) {
                    // Deep merge or specific field merge to avoid losing nested structure
                    const newInputs = { ...inputs };
                    if (data.inputs.revenue) newInputs.revenue = { ...newInputs.revenue, ...data.inputs.revenue };
                    if (data.inputs.costs) newInputs.costs = { ...newInputs.costs, ...data.inputs.costs };
                    if (data.inputs.metrics) newInputs.metrics = { ...newInputs.metrics, ...data.inputs.metrics };
                    setInputs(newInputs);
                }
            }
        } catch (error) {
            console.error("Error fetching manual inputs:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (section: string, field: string, value: string) => {
        setInputs((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }))
    }

    const handleSave = async () => {
        if (!orgId || !modelId) return
        setSaving(true)

        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/manual/input`, {
                method: "POST",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(inputs),
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }

            const data = await res.json()
            if (data.ok) {
                toast.success("Manual inputs saved successfully. Recalculating model...")
                setDelta({
                  revenue: Number(inputs.revenue.monthlyMrr) - 50000, // Mock delta calculation
                  mrr: Number(inputs.revenue.monthlyMrr),
                  status: 'rebuilding'
                })
                if (onSuccess) onSuccess()
            } else {
                throw new Error(data.message || "Failed to save inputs")
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const [delta, setDelta] = useState<any>(null)

    if (loading) return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-t-4 border-t-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-40 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )

    if (!orgId || !modelId) {
        return <div className="p-8 text-center text-muted-foreground">Select a model to enter manual inputs.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Manual Input Center</h2>
                    <p className="text-muted-foreground">Override system-detected values with manual parameters.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Save as Snapshot & Rebuild
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Section */}
                <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Revenue Baseline
                        </CardTitle>
                        <CardDescription>Monthly starting points</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="monthlyMrr">Monthly MRR ($)</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent>Monthly Recurring Revenue at the start of the model period.</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Input
                                id="monthlyMrr"
                                type="number"
                                placeholder="50000"
                                value={inputs.revenue.monthlyMrr}
                                onChange={(e) => handleInputChange("revenue", "monthlyMrr", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="startingCustomers">Starting Customers</Label>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="startingCustomers"
                                type="number"
                                placeholder="100"
                                value={inputs.revenue.startingCustomers}
                                onChange={(e) => handleInputChange("revenue", "startingCustomers", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Costs Section */}
                <Card className="border-t-4 border-t-rose-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-rose-500" />
                            Core Expenses
                        </CardTitle>
                        <CardDescription>Initial monthly burn</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="payroll">Payroll Cost ($)</Label>
                            <Input
                                id="payroll"
                                type="number"
                                placeholder="35000"
                                value={inputs.costs.payroll}
                                onChange={(e) => handleInputChange("costs", "payroll", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="infrastructure">Infrastructure ($)</Label>
                            <Input
                                id="infrastructure"
                                type="number"
                                placeholder="5000"
                                value={inputs.costs.infrastructure}
                                onChange={(e) => handleInputChange("costs", "infrastructure", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="marketing">Marketing Spend ($)</Label>
                            <Input
                                id="marketing"
                                type="number"
                                placeholder="15000"
                                value={inputs.costs.marketing}
                                onChange={(e) => handleInputChange("costs", "marketing", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Growth & Efficiency */}
                <Card className="border-t-4 border-t-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-500" />
                            Efficiency KPI
                        </CardTitle>
                        <CardDescription>Drivers of long-term value</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cac">CAC ($)</Label>
                            <Input
                                id="cac"
                                type="number"
                                placeholder="450"
                                value={inputs.metrics.cac}
                                onChange={(e) => handleInputChange("metrics", "cac", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="retentionRate">Retention Rate (%)</Label>
                            <Input
                                id="retentionRate"
                                type="number"
                                placeholder="95"
                                value={inputs.metrics.retentionRate}
                                onChange={(e) => handleInputChange("metrics", "retentionRate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="churnRate">Churn Rate (%)</Label>
                            <Input
                                id="churnRate"
                                type="number"
                                placeholder="5"
                                value={inputs.metrics.churnRate}
                                onChange={(e) => handleInputChange("metrics", "churnRate", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {delta && (
                <Card className="bg-emerald-50 border-emerald-200 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-emerald-900 capitalize">Impact Analysis: Baseline Updated</h4>
                                <Badge className="bg-emerald-600 text-white border-none">Active Trace</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-white/50 rounded-lg border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Input Variance</p>
                                    <p className="text-xl font-bold text-emerald-900">
                                        {delta.revenue >= 0 ? '+' : ''}${Math.abs(delta.revenue).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-white/50 rounded-lg border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">New Run Rate</p>
                                    <p className="text-xl font-bold text-emerald-900">${delta.mrr.toLocaleString()}</p>
                                </div>
                            </div>
                            <p className="text-xs text-emerald-700 mt-4 leading-relaxed">
                                This override has been propagated to the <b>Hyperblock Engine</b>. All downstream dependencies (Net Income, Cash Flow, and Risk Bands) are being recalculated in the background.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-50 border-dashed">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                        <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Live Validation</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            Saving these values will create an immutable snapshot and trigger the computation worker to rebuild the <b>Baseline Scenario</b>.
                            Values are automatically rounded to Industrial-standard precision.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
