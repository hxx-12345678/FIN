"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
    Calculator,
    TrendingUp,
    Users,
    DollarSign,
    Zap,
    Save,
    Plus,
    Trash2,
    Info,
    ChevronRight,
    RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface Driver {
    id: string
    name: string
    type: 'revenue' | 'cost' | 'headcount' | 'operational'
    category?: string
    unit?: string
    isCalculated: boolean
    formula?: string
    values?: any[]
}

interface Scenario {
    id: string
    name: string
    color: string
    isDefault: boolean
}

export function DriverManagement({ orgId, modelId, onRecompute }: {
    orgId: string | null,
    modelId: string | null,
    onRecompute?: (data: { results: any, affectedNodes: string[], trace: any }) => void
}) {
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [recomputing, setRecomputing] = useState(false)
    const [driverValues, setDriverValues] = useState<Record<string, number>>({})

    useEffect(() => {
        if (orgId && modelId) {
            fetchData()
        } else {
            setLoading(false)
        }
    }, [orgId, modelId])


    const fetchData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("auth-token")

            const [driversRes, scenariosRes] = await Promise.all([
                fetch(`/api/orgs/${orgId}/models/${modelId}/drivers`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`/api/orgs/${orgId}/models/${modelId}/scenarios`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ])

            const driversData = await driversRes.json()
            const scenariosData = await scenariosRes.json()

            if (driversData.ok) setDrivers(driversData.drivers)
            if (scenariosData.ok) {
                setScenarios(scenariosData.scenarios)
                const defaultScenario = scenariosData.scenarios.find((s: any) => s.isDefault)
                if (defaultScenario) setSelectedScenario(defaultScenario.id)
                else if (scenariosData.scenarios.length > 0) setSelectedScenario(scenariosData.scenarios[0].id)
            }
        } catch (error) {
            console.error("Error fetching drivers:", error)
            toast.error("Failed to load drivers")
        } finally {
            setLoading(false)
        }
    }

    const handleAddDriver = async (type: Driver['type']) => {
        const newDriver = {
            name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Driver`,
            type,
            isCalculated: false,
        }

        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`/api/orgs/${orgId}/models/${modelId}/drivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newDriver)
            })
            const data = await res.json()
            if (data.ok) {
                setDrivers([...drivers, data.driver])
                toast.success("Driver added")
            }
        } catch (error) {
            toast.error("Failed to add driver")
        }
    }

    const handleValueChange = async (driverId: string, value: number) => {
        // 1. Update local state
        setDriverValues(prev => ({ ...prev, [driverId]: value }))

        // 2. Trigger real-time recompute via Hyperblock
        if (!orgId || !modelId) return

        setRecomputing(true)
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`/api/v1/orgs/${orgId}/models/${modelId}/recompute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    update: {
                        nodeId: driverId,
                        values: { "2024-01": value }, // For MVP, update first month
                        userId: "current-user"
                    }
                })
            })
            const data = await res.json()
            if (data.ok && onRecompute) {
                onRecompute({
                    results: data.results,
                    affectedNodes: data.affectedNodes,
                    trace: data.trace
                })
            }
        } catch (error) {
            console.error("Recompute error:", error)
        } finally {
            setRecomputing(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading drivers...</div>

    if (!orgId || !modelId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Please select a model to manage drivers.
            </div>
        )
    }

    return (

        <div className="space-y-6">
            {/* Scenario Selector */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                                <RefreshCw className="h-5 w-5" />
                                Active Scenario
                            </h3>
                            <p className="text-slate-400 text-sm">Switch scenarios to see instant financial impact</p>
                        </div>
                        <div className="flex gap-2">
                            {scenarios.map(s => (
                                <Button
                                    key={s.id}
                                    variant={selectedScenario === s.id ? "default" : "outline"}
                                    className={selectedScenario === s.id ? "" : "bg-transparent text-white border-slate-700 hover:bg-slate-700"}
                                    onClick={() => setSelectedScenario(s.id)}
                                    style={selectedScenario === s.id ? { backgroundColor: s.color } : {}}
                                >
                                    {s.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Input Drivers Column */}
                <div className="lg:col-span-2 space-y-6">
                    {['revenue', 'cost', 'headcount'].map((type) => (
                        <Card key={type} className="border-t-4" style={{ borderTopColor: type === 'revenue' ? '#10b981' : type === 'cost' ? '#f59e0b' : '#3b82f6' }}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="capitalize flex items-center gap-2">
                                        {type === 'revenue' ? <TrendingUp className="h-5 w-5 text-green-500" /> :
                                            type === 'cost' ? <DollarSign className="h-5 w-5 text-amber-500" /> :
                                                <Users className="h-5 w-5 text-blue-500" />}
                                        {type} Drivers
                                    </CardTitle>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleAddDriver(type as any)}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {drivers.filter(d => d.type === type && !d.isCalculated).map(d => (
                                    <div key={d.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="font-bold text-slate-700">{d.name}</Label>
                                            <Badge variant="outline" className="text-slate-500">{d.unit || 'units'}</Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Slider
                                                defaultValue={[driverValues[d.id] || 50]}
                                                max={100}
                                                step={1}
                                                className="flex-1"
                                                onValueChange={(val) => handleValueChange(d.id, val[0])}
                                            />
                                            <Input
                                                value={driverValues[d.id] || 50}
                                                onChange={(e) => handleValueChange(d.id, parseFloat(e.target.value) || 0)}
                                                className="w-20 font-mono text-right"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Right: Calculated Drivers & Formulas */}
                <div className="space-y-6">
                    <Card className="bg-blue-50/50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <Calculator className="h-5 w-5" />
                                Calculated Drivers
                            </CardTitle>
                            <CardDescription>Drivers driven by formulas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {drivers.filter(d => d.isCalculated).map(d => (
                                <div key={d.id} className="p-4 rounded-xl bg-white border border-blue-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-blue-900">{d.name}</span>
                                        <Badge className="bg-blue-600">Calculated</Badge>
                                    </div>
                                    <div className="font-mono text-xs p-2 bg-slate-900 text-green-400 rounded-md">
                                        {d.formula || "No formula defined"}
                                    </div>
                                </div>
                            ))}
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" variant="default" onClick={() => handleAddDriver('revenue')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Define Calculation
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-inner">
                        <CardHeader>
                            <CardTitle className="text-purple-800 flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Sensitivity Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-purple-700">
                            Adjust your drivers above and select the <strong>Sensitivity</strong> tab to see how changes impact your 12-month net income.
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
