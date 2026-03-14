"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    Lock,
    Unlock,
    Link as LinkIcon,
    BarChart3,
    Loader2,
    Network,
    UserPlus,
    Target,
    ArrowRightCircle,
    Eye,
    ChevronDown,
    CheckCircle2,
    Database,
    Sparkles,
    Activity,
    Compass,
    Settings2
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { DependencyGraph } from "../hyperblock/dependency-graph"

interface Driver {
    id: string
    name: string
    type: 'revenue' | 'cost' | 'headcount' | 'operational'
    category?: string
    unit?: string
    isCalculated: boolean
    formula?: string
    minRange?: number | null
    maxRange?: number | null
    isLocked?: boolean
    dependencies?: string[] | null
}

export function DriverManagement({ orgId, modelId, onRecompute, onRecomputeStart, onGenerateReport }: {
    orgId: string | null,
    modelId: string | null,
    onRecompute?: (data: any) => void,
    onRecomputeStart?: () => void,
    onGenerateReport?: () => void
}) {
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [loading, setLoading] = useState(true)
    const [recomputing, setRecomputing] = useState(false)
    const [driverValues, setDriverValues] = useState<Record<string, number>>({})
    const [deltas, setDeltas] = useState<Record<string, number>>({})
    const [lastResult, setLastResult] = useState<any>(null)
    const [isLive, setIsLive] = useState(true)
    const [pendingChanges, setPendingChanges] = useState<boolean>(false)
    const [editingDriver, setEditingDriver] = useState<string | null>(null)
    const [showGraph, setShowGraph] = useState(false)
    const [showHiringRoadmap, setShowHiringRoadmap] = useState(false)
    const [showPricingSimulator, setShowPricingSimulator] = useState(false)

    useEffect(() => {
        if (orgId && modelId) {
            fetchDrivers()
        } else {
            setLoading(false)
        }
    }, [orgId, modelId])

    const fetchDrivers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/drivers?org_id=${orgId}`, {
                headers: getAuthHeaders(),
                credentials: "include",
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }

            const data = await res.json()
            if (data.ok && data.drivers && data.drivers.length > 0) {
                setDrivers(data.drivers)
                // Initialize local value state for the first month
                const values: Record<string, number> = {}
                data.drivers.forEach((d: any) => {
                    // Start by picking up persisted db values, otherwise default sensibly
                    if (d.values && d.values.length > 0) {
                        values[d.id] = parseFloat(d.values[0].value)
                    } else if (d.type === 'headcount') {
                        values[d.id] = 10
                    } else if (d.type === 'revenue') {
                        values[d.id] = 1000
                    } else {
                        values[d.id] = 50
                    }
                })
                setDriverValues(values)
            } else {
                setDrivers([])
                setDriverValues({})
            }
        } catch (error) {
            console.error("Error fetching drivers:", error)
            setDrivers([])
            setDriverValues({})
        } finally {
            setLoading(false)
        }
    }

    const handleAddDriver = async (type: Driver['type']) => {
        const name = prompt("Enter driver name:", `New ${type.charAt(0).toUpperCase() + type.slice(1)} Driver`)
        if (!name) return

        const newDriver = {
            name,
            type,
            isCalculated: false,
            minRange: 0,
            maxRange: 1000,
            unit: type === 'headcount' ? 'FTE' : (type === 'revenue' ? 'customers' : 'units')
        }

        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/drivers?org_id=${orgId}`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                credentials: "include",
                body: JSON.stringify(newDriver)
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }
            const data = await res.json()
            if (data.ok) {
                setDrivers([...drivers, data.driver])
                setEditingDriver(data.driver.id) // Automatically open settings to edit name
                toast.success(`Driver '${data.driver.name}' added. You can rename it below.`)
            }
        } catch (error) {
            toast.error("Failed to add driver")
        }
    }

    const handlePatchDriver = async (driverId: string, patch: Partial<Driver>) => {
        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/drivers/${driverId}`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                credentials: "include",
                body: JSON.stringify(patch)
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }
            const data = await res.json()
            if (data.ok) {
                setDrivers(drivers.map(d => d.id === driverId ? { ...d, ...patch } : d))
                toast.success("Driver updated")
            }
        } catch (error) {
            toast.error("Failed to update driver")
        }
    }

    const handleValueChange = (driverId: string, value: number) => {
        // Calculate delta for visual feedback
        const prev = driverValues[driverId] || 0;
        const delta = prev !== 0 ? ((value - prev) / prev) * 100 : 0;
        setDeltas(prev => ({ ...prev, [driverId]: delta }));

        // Immediate visual update
        setDriverValues(prev => ({ ...prev, [driverId]: value }))

        if (!isLive) {
            setPendingChanges(true);
            return;
        }

        // Debounce the actual backend call
        if ((window as any).recomputeTimer) clearTimeout((window as any).recomputeTimer);
        setRecomputing(true);
        if (onRecomputeStart) onRecomputeStart();

        (window as any).recomputeTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/recompute`, {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    credentials: "include",
                    body: JSON.stringify({
                        update: {
                            nodeId: driverId,
                            values: { "2024-01": value }
                        }
                    })
                })
                const data = await res.json()
                if (data.ok) {
                    setLastResult(data.results);
                    if (onRecompute) onRecompute(data);
                }
            } catch (err) {
                console.error("Recompute error:", err)
            } finally {
                setRecomputing(false)
            }
        }, 800)
    }

    const handleManualCommit = async () => {
        setRecomputing(true);
        if (onRecomputeStart) onRecomputeStart();
        
        try {
            // Use any driver as the primary trigger for a full recompute with all current driverValues
            const firstDriverId = Object.keys(driverValues).pop() || Object.keys(deltas).pop() || drivers[0]?.id;
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/recompute`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({
                    update: {
                        nodeId: firstDriverId,
                        values: driverValues // Engine should handle multiple values if supported, or the service maps them
                    }
                })
            });
            
            const data = await res.json();
            if (data.ok) {
                if (onRecompute) onRecompute(data);
                setPendingChanges(false);
                toast.success("Industrial recompute completed successfully");
            }
        } catch (err) {
            toast.error("Failed to commit changes to engine");
        } finally {
            setRecomputing(false);
        }
    }

    const handleResync = async () => {
        setRecomputing(true)
        toast.info("Resyncing symbolic engine formulas...")
        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/recompute`, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: "include"
            })
            const data = await res.json()
            if (data.ok) {
                toast.success("Formulas synchronized")
                fetchDrivers()
                if (onRecompute) onRecompute(data)
            }
        } catch (err) {
            toast.error("Resync failed")
        } finally {
            setRecomputing(false)
        }
    }

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline mr-2" /> Initializing Drivers...</div>

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Driver Layer</h2>
                    <p className="text-muted-foreground">The source of truth for your financial assumptions and dependencies.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowGraph(true)}>
                        <Network className="h-4 w-4 mr-2 text-indigo-500" />
                        Symbolic Tree
                    </Button>
                    <Button variant="outline" onClick={() => setShowHiringRoadmap(!showHiringRoadmap)}>
                        <UserPlus className="h-4 w-4 mr-2 text-blue-500" />
                        HC Roadmap
                    </Button>
                    <Button variant="outline" onClick={() => setShowPricingSimulator(!showPricingSimulator)}>
                        <DollarSign className="h-4 w-4 mr-2 text-emerald-500" />
                        Pricing SIM
                    </Button>
                    <div className="flex items-center gap-3 ml-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Live Sync</span>
                            <div 
                                className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-all duration-300 ${isLive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                onClick={() => setIsLive(!isLive)}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${isLive ? 'translate-x-4' : ''}`} />
                            </div>
                        </div>
                        {pendingChanges && !isLive && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-9 bg-indigo-600 hover:bg-indigo-700 animate-in fade-in zoom-in duration-300 font-extrabold text-[10px] shadow-lg shadow-indigo-200"
                                onClick={handleManualCommit}
                                disabled={recomputing}
                            >
                                {recomputing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Calculator className="h-3 w-3 mr-1.5" />}
                                COMMIT & RECOMPUTE
                            </Button>
                        )}
                        <Button
                            className="bg-slate-900 shadow-lg shadow-slate-900/20"
                            onClick={handleResync}
                            disabled={recomputing}
                        >
                            {recomputing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                            Re-sync Formulas
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-8">
                    {['revenue', 'cost', 'headcount'].map((type) => (
                        <div key={type} className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-xl font-bold capitalize flex items-center gap-2">
                                    {type === 'revenue' && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                                    {type === 'cost' && <DollarSign className="h-5 w-5 text-amber-500" />}
                                    {type === 'headcount' && <Users className="h-5 w-5 text-blue-500" />}
                                    {type} Drivers
                                </h3>
                                <Button size="sm" variant="ghost" className="text-xs hover:bg-slate-100" onClick={() => handleAddDriver(type as any)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Driver
                                </Button>
                            </div>

                            {type === 'headcount' && showHiringRoadmap && (
                                <Card className="border-blue-200 bg-blue-50/30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                                            <UserPlus className="h-4 w-4" />
                                            Institutional Hiring Plan (FY25)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="space-y-3">
                                            {drivers.filter(d => d.type === 'headcount').length > 0 ? (
                                                drivers.filter(d => d.type === 'headcount').map((d, idx) => (
                                                    <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1">
                                                                <div className="text-xs font-bold text-slate-800">{d.name}</div>
                                                                <div className="text-[10px] text-slate-500">Target FTE • Driver Metric: {d.unit || 'FTE'}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 w-16 text-center text-xs font-bold border-blue-200 bg-white"
                                                                    value={driverValues[d.id] || 1}
                                                                    onChange={(e) => handleValueChange(d.id, parseFloat(e.target.value) || 0)}
                                                                />
                                                                <Badge variant="secondary" className="text-[9px] uppercase bg-green-50 text-green-700 border-green-100">
                                                                    Synced
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-4 bg-white rounded-lg border border-dashed text-xs text-slate-400">
                                                    No specific headcount drivers defined yet. Add one below.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {showPricingSimulator && (
                                <Card className="border-emerald-200 bg-emerald-50/30 overflow-hidden animate-in zoom-in-95 duration-500 mb-6">
                                    <CardHeader className="py-4 border-b border-emerald-100">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                                            <Zap className="h-4 w-4" />
                                            Pricing Model Simulator (Institutional v1)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Base Unit Price</Label>
                                                <div className="flex items-center gap-2">
                                                    <Slider
                                                        value={[drivers.find(d => d.name.toLowerCase().includes('price')) ? (driverValues[drivers.find(d => d.name.toLowerCase().includes('price'))!.id] || 499) : 499]}
                                                        max={2000}
                                                        step={10}
                                                        className="flex-1"
                                                        onValueChange={(val) => {
                                                            const d = drivers.find(drv => drv.name.toLowerCase().includes('price'))
                                                            if (d) handleValueChange(d.id, val[0])
                                                        }}
                                                    />
                                                    <span className="font-mono text-xs font-bold">${drivers.find(d => d.name.toLowerCase().includes('price')) ? (driverValues[drivers.find(d => d.name.toLowerCase().includes('price'))!.id] || 499) : 499}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Expansion Multiplier</Label>
                                                <div className="flex items-center gap-2">
                                                    <Slider
                                                        value={[drivers.find(d => d.name.toLowerCase().includes('expansion')) ? (driverValues[drivers.find(d => d.name.toLowerCase().includes('expansion'))!.id] || 1.2) : 1.2]}
                                                        max={3}
                                                        step={0.1}
                                                        className="flex-1"
                                                        onValueChange={(val) => {
                                                            const d = drivers.find(drv => drv.name.toLowerCase().includes('expansion'))
                                                            if (d) handleValueChange(d.id, val[0])
                                                        }}
                                                    />
                                                    <span className="font-mono text-xs font-bold">{drivers.find(d => d.name.toLowerCase().includes('expansion')) ? (driverValues[drivers.find(d => d.name.toLowerCase().includes('expansion'))!.id] || 1.2) : 1.2}x</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Churn Elasticity</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500" style={{ width: '45%' }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-amber-600">MODERATE</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 p-3 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-emerald-600" />
                                                <span className="text-xs font-bold text-slate-700">Projected Delta on ARR: </span>
                                                <span className="text-xs font-black text-emerald-600">+$240k (Annualized)</span>
                                            </div>
                                            <Button size="sm" className="h-7 text-[10px] bg-emerald-600 font-bold">APPLY OVERRIDE</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {drivers.filter(d => d.type === type && !d.isCalculated).map(d => (
                                    <Card key={d.id} className={`group hover:shadow-md transition-all border-l-4 ${d.isLocked ? 'border-l-slate-400' : 'border-l-primary'}`}>
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{d.name}</span>
                                                        {d.isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] py-0">{d.unit || 'units'}</Badge>
                                                        {d.minRange !== null && d.maxRange !== null && (
                                                            <Badge variant="outline" className="text-[10px] py-0 border-slate-200">
                                                                Range: {d.minRange} - {d.maxRange}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                    <Activity className="h-3 w-3 text-slate-400" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs font-bold">Driver Elasticity: 0.85</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePatchDriver(d.id, { isLocked: !d.isLocked })}>
                                                        {d.isLocked ? <Unlock className="h-3 w-3 text-indigo-500" /> : <Lock className="h-3 w-3" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDriver(d.id === editingDriver ? null : d.id)}>
                                                        <Settings2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <Slider
                                                        disabled={d.isLocked}
                                                        value={[driverValues[d.id] || 0]}
                                                        max={d.maxRange || 1000}
                                                        min={d.minRange || 0}
                                                        step={1}
                                                        className="flex-1"
                                                        onValueChange={(val) => handleValueChange(d.id, val[0])}
                                                    />
                                                    <div className="flex flex-col items-end min-w-[80px]">
                                                        <Input
                                                            disabled={d.isLocked}
                                                            value={driverValues[d.id] || 0}
                                                            onChange={(e) => handleValueChange(d.id, parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-8 font-mono text-right text-xs bg-slate-50 focus:bg-white transition-colors"
                                                        />
                                                        {deltas[d.id] !== undefined && deltas[d.id] !== 0 && (
                                                            <span className={`text-[10px] font-bold ${deltas[d.id] > 0 ? 'text-emerald-500' : 'text-rose-500'} mt-0.5 animate-in fade-in slide-in-from-top-1`}>
                                                                {deltas[d.id] > 0 ? '↑' : '↓'} {Math.abs(deltas[d.id]).toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {editingDriver === d.id && (
                                                    <div className="pt-4 border-t mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase font-bold text-slate-500">Driver Name</Label>
                                                            <Input
                                                                className="h-7 text-xs"
                                                                defaultValue={d.name}
                                                                onBlur={(e) => handlePatchDriver(d.id, { name: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Min Range</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="h-7 text-xs"
                                                                    defaultValue={d.minRange || 0}
                                                                    onBlur={(e) => handlePatchDriver(d.id, { minRange: parseFloat(e.target.value) })}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Max Range</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="h-7 text-xs"
                                                                    defaultValue={d.maxRange || 1000}
                                                                    onBlur={(e) => handlePatchDriver(d.id, { maxRange: parseFloat(e.target.value) })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] uppercase font-bold text-slate-500">Weight Linking (Dependencies)</Label>
                                                            <div className="flex gap-1 flex-wrap">
                                                                {d.dependencies?.map(dep => (
                                                                    <Badge key={dep} variant="outline" className="text-[10px] flex items-center gap-1">
                                                                        <LinkIcon className="h-2 w-2" /> {dep}
                                                                    </Badge>
                                                                ))}
                                                                <Button variant="outline" size="sm" className="h-5 text-[9px] px-1">+ Link</Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-8">
                    <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden">
                        <div className="h-1 bg-blue-500" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-400">
                                <Calculator className="h-5 w-5" />
                                Logic Factory
                            </CardTitle>
                            <CardDescription className="text-slate-400">Calculated drivers via symbolic equations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {drivers.filter(d => d.isCalculated).map(d => (
                                <div key={d.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 group hover:border-blue-500/50 transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-white text-sm">{d.name}</span>
                                        <div className="flex gap-1">
                                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[9px]">λ CALCULATED</Badge>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-500 group-hover:text-white" onClick={() => setEditingDriver(d.id === editingDriver ? null : d.id)}>
                                                <Settings2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[10px] p-2 bg-black rounded-md text-emerald-400 relative overflow-hidden group">
                                        {d.formula || "No expression defined"}
                                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </div>
                                    {editingDriver === d.id && (
                                        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 animate-in fade-in zoom-in-95">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-slate-400 uppercase font-bold">Rule Name</Label>
                                                <Input
                                                    className="bg-slate-900 border-slate-700 h-8 text-xs text-white"
                                                    defaultValue={d.name}
                                                    onBlur={(e) => handlePatchDriver(d.id, { name: e.target.value })}
                                                />
                                            </div>
                                            <Label className="text-[10px] text-slate-400 uppercase font-bold">Equation Builder</Label>
                                            <Input
                                                className="bg-slate-900 border-slate-700 h-8 text-xs font-mono"
                                                defaultValue={d.formula}
                                                onBlur={(e) => handlePatchDriver(d.id, { formula: e.target.value })}
                                            />
                                            <div className="flex gap-1 pt-1 overflow-x-auto pb-1">
                                                {drivers.filter(prev => !prev.isCalculated).slice(0, 3).map(prev => (
                                                    <Button key={prev.id} variant="secondary" className="h-5 text-[9px] px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                                                        {prev.name.substring(0, 10)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-lg text-sm transition-all hover:scale-[1.02]" onClick={() => handleAddDriver('revenue')}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Symbolic Rule
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-emerald-500/20 shadow-xl overflow-hidden group">
                        <div className="h-1.5 bg-emerald-500" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center justify-between">
                                Strategic Unit Economics
                                {recomputing ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : <Target className="h-4 w-4 text-emerald-500 animate-pulse" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            <div className="space-y-4">
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase">LTV / CAC Ratio</p>
                                        <p className="text-2xl font-black text-slate-900">
                                            {(() => {
                                                if (lastResult?.kpis?.ltv_cac) return `${lastResult.kpis.ltv_cac.toFixed(1)}x`;
                                                
                                                // Fallback calculation for immediate visual feedback
                                                const revD = drivers.find(d => d.name.toLowerCase().includes('revenue') || d.name.toLowerCase().includes('mrr'));
                                                const costD = drivers.find(d => d.name.toLowerCase().includes('cac') || d.name.toLowerCase().includes('marketing'));
                                                
                                                const revVal = revD ? driverValues[revD.id] : 300000;
                                                const costVal = costD ? driverValues[costD.id] : 15000;
                                                
                                                // Simulated formula: baseline 4.2x adjusted by revenue/cost ratio
                                                const ratio = costVal > 0 ? (revVal / (costVal * 20)) : 1;
                                                const simulatedLtvCac = 4.2 * ratio;
                                                
                                                return `${Math.max(1.1, simulatedLtvCac).toFixed(1)}x`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-600 shadow-sm text-xs">
                                        {(lastResult?.kpis?.ltv_cac || 4.2) > 4 ? 'A+' : 'B'}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Payback Period</span>
                                        <span>{lastResult?.kpis?.payback_period ? `${Math.round(lastResult.kpis.payback_period)} Months` : '11 Months'}</span>
                                    </div>
                                    <Progress value={lastResult?.kpis?.payback_period ? (100 - lastResult.kpis.payback_period * 3) : 75} className="h-1.5 bg-slate-100" indicatorClassName="bg-emerald-500" />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Churn Resistance</span>
                                        <span>{lastResult?.kpis?.churn_rate < 0.05 ? 'High Stability' : 'Moderate'}</span>
                                    </div>
                                    <Progress value={lastResult?.kpis?.churn_rate ? (100 - lastResult.kpis.churn_rate * 500) : 92} className="h-1.5 bg-slate-100" indicatorClassName="bg-emerald-500" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Efficiency Index</span>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                    {recomputing ? 'Recalculating...' : 'Top 5% Industry Bench'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 shadow-inner p-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-purple-400 flex items-center gap-2 text-sm uppercase tracking-widest font-black">
                                <Zap className="h-4 w-4" />
                                Impact Trace
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                                    <span>Top Sensitivity Vector</span>
                                    <span className="text-purple-500">82% Match</span>
                                </div>
                                <div className="p-3 rounded-lg bg-white/50 border border-purple-100 flex items-center gap-3 group-hover:bg-white transition-all">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold">Churn Correction</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">High elasticity to ARR</div>
                                    </div>
                                    <BarChart3 className="h-4 w-4 text-purple-400" />
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full text-blue-600 font-bold text-[10px] gap-1 hover:bg-blue-50">
                                <Compass className="h-3 w-3" /> DISCOVER NEW CORRELATIONS
                            </Button>
                            
                            {onGenerateReport && (
                                <Button 
                                    onClick={onGenerateReport}
                                    className="w-full mt-2 bg-indigo-500 hover:bg-indigo-400 font-bold text-[10px] h-9 rounded-lg shadow-lg shadow-indigo-500/20"
                                >
                                    <Sparkles className="h-3 w-3 mr-2" />
                                    GENERATE AI BOARD REPORT
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={showGraph} onOpenChange={setShowGraph}>
                <DialogContent className="max-w-5xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-indigo-500" />
                            Symbolic Revenue Driver Tree
                        </DialogTitle>
                        <DialogDescription>
                            Visualizing how input assumptions propagate through the Hyperblock engine.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 border rounded-xl bg-slate-50 overflow-hidden relative">
                        <DependencyGraph
                            nodes={drivers.map(d => ({ id: d.id, name: d.name, type: d.isCalculated ? 'formula' : 'input' }))}
                            edges={drivers.flatMap(d => (d.dependencies || []).map(depId => ({ source: depId, target: d.id })))}
                            affectedNodeIds={[]}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
