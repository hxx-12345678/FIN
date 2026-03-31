"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, Loader2, Calculator, Info, TrendingUp, Users, DollarSign, Zap } from "lucide-react"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ManualInputFormProps {
    orgId: string | null
    modelId: string | null
}

export function ManualInputForm({ orgId, modelId }: ManualInputFormProps) {
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
            } else {
                throw new Error(data.message || "Failed to save inputs")
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Loading inputs...</div>

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
