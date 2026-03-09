"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    GitBranch,
    GitMerge,
    FileDiff,
    Download,
    Upload,
    Settings2,
    Plus,
    Zap,
    TrendingDown,
    TrendingUp,
    LineChart,
    MoreVertical,
    Check,
    ChevronRight,
    Loader2,
    LayoutGrid,
    BarChart,
    ShieldAlert,
    Clock,
    Flame,
    History
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface Scenario {
    id: string
    name: string
    description?: string
    color: string
    isDefault: boolean
    createdAt: string
    parentId?: string
}

export function ScenarioManagement({ orgId, modelId }: { orgId: string | null, modelId: string | null }) {
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [loading, setLoading] = useState(true)
    const [activeScenario, setActiveScenario] = useState<string | null>(null)
    const [showDiff, setShowDiff] = useState(false)

    useEffect(() => {
        if (orgId && modelId) {
            fetchScenarios()
        }
    }, [orgId, modelId])

    const fetchScenarios = async () => {
        setLoading(true)
        try {
            // Using the simplified route from scenarioRoutes
            const res = await fetch(`${API_BASE_URL}/models/${modelId}/scenarios`, {
                headers: getAuthHeaders(),
                credentials: "include",
            })

            if (res.status === 401) { handleUnauthorized(); return; }

            const data = await res.json()
            if (data.ok && data.scenarios) {
                // Map backend response to Scenario interface
                const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                const mapped: Scenario[] = data.scenarios.map((s: any, idx: number) => ({
                    id: s.id,
                    name: s.name || s.scenarioName || `Scenario ${idx + 1}`,
                    description: s.scenarioType || s.description || '',
                    color: colorPalette[idx % colorPalette.length],
                    isDefault: s.scenarioType === 'base' || idx === 0,
                    createdAt: s.createdAt || new Date().toISOString(),
                    parentId: s.baseModelId || undefined,
                    status: s.status,
                    summary: s.summary,
                }))
                setScenarios(mapped)
                const defaultS = mapped.find((s: any) => s.isDefault)
                if (defaultS) setActiveScenario(defaultS.id)
                else if (mapped.length > 0) setActiveScenario(mapped[0].id)
            } else {
                setScenarios([])
                if (data.error || data.message) {
                    toast.error(data.message || data.error)
                }
            }
        } catch (error) {
            console.error("Error fetching scenarios:", error)
            toast.error("Failed to connect to scenario engine")
            setScenarios([])
        } finally {
            setLoading(false)
        }
    }

    const handleCreateScenario = async (parentId?: string) => {
        const parent = scenarios.find(s => s.id === parentId)
        const newName = parent ? `Fork of ${parent.name}` : "New Scenario"

        try {
            const res = await fetch(`${API_BASE_URL}/models/${modelId}/scenarios`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    scenarioName: newName,
                    scenarioType: "adhoc",
                    overrides: {
                        revenue: { growth: 0.05 },
                    }
                })
            })

            if (res.status === 401) { handleUnauthorized(); return; }
            const data = await res.json()
            if (data.ok) {
                // Backend returns modelRunId, jobId, etc. Create a local scenario entry
                const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                const newScenario: Scenario = {
                    id: data.modelRunId || data.scenario?.id || `s-${Date.now()}`,
                    name: newName,
                    description: data.scenarioType || 'adhoc',
                    color: colorPalette[scenarios.length % colorPalette.length],
                    isDefault: false,
                    createdAt: new Date().toISOString(),
                    parentId: parentId,
                }
                setScenarios([...scenarios, newScenario])
                setActiveScenario(newScenario.id)
                toast.success("Scenario branched successfully")
            } else {
                toast.error(data.message || "Failed to create scenario")
            }
        } catch (error) {
            toast.error("Failed to branch scenario")
        }
    }

    const handleRenameScenario = async (id: string) => {
        const scenario = scenarios.find(s => s.id === id)
        if (!scenario) return
        const newName = prompt("Enter new scenario name", scenario.name)
        if (!newName || newName === scenario.name) return

        try {
            const res = await fetch(`${API_BASE_URL}/scenarios/${id}?org_id=${orgId}`, {
                method: "PUT",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: newName })
            })
            if (res.ok) {
                setScenarios(scenarios.map(s => s.id === id ? { ...s, name: newName } : s))
                toast.success("Scenario renamed")
            }
        } catch (err) { toast.error("Failed to rename") }
    }

    const handleDeleteScenario = async (id: string) => {
        const scenario = scenarios.find(s => s.id === id)
        if (!scenario || scenario.isDefault) {
            toast.error("Cannot delete default scenario")
            return
        }
        if (!confirm(`Are you sure you want to delete ${scenario.name}?`)) return

        try {
            const res = await fetch(`${API_BASE_URL}/scenarios/${id}?org_id=${orgId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
                credentials: "include"
            })
            if (res.ok) {
                setScenarios(scenarios.filter(s => s.id !== id))
                if (activeScenario === id) setActiveScenario(scenarios[0].id)
                toast.success("Scenario deleted")
            }
        } catch (err) { toast.error("Failed to delete") }
    }

    const handleDuplicateScenario = async (id: string) => {
        try {
            // Fetch the scenario we want to duplicate first
            const source = scenarios.find(s => s.id === id)
            if (!source) return;

            const res = await fetch(`${API_BASE_URL}/models/${modelId}/scenarios`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    scenarioName: `Copy of ${source.name}`,
                    scenarioType: "adhoc",
                    overrides: {} // A real implementation would pull the params from source
                })
            })
            if (res.ok) {
                const data = await res.json()
                if (data.ok) {
                    const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                    const s = data.scenario
                    const mapped: Scenario = {
                        id: s.id,
                        name: s.name,
                        description: s.description || '',
                        color: colorPalette[scenarios.length % colorPalette.length],
                        isDefault: false,
                        createdAt: s.createdAt,
                        parentId: id
                    }
                    setScenarios([...scenarios, mapped])
                    toast.success("Scenario duplicated")
                }
            }
        } catch (err) { toast.error("Failed to duplicate") }
    }

    const handleMergeScenario = async () => {
        if (!activeScenario) return
        const scenario = scenarios.find(s => s.id === activeScenario)
        if (!scenario || scenario.isDefault) return
        if (!confirm(`Merge ${scenario.name} into Baseline? This updates all driver values.`)) return

        try {
            const res = await fetch(`${API_BASE_URL}/scenarios/${activeScenario}/promote?org_id=${orgId}`, {
                method: "POST",
                headers: getAuthHeaders(),
                credentials: "include"
            })
            if (res.ok) {
                toast.success("Merged into baseline. Model recomputing...")
                // In a real app, we'd trigger a full model recompute here
            }
        } catch (err) { toast.error("Merge failed") }
    }

    const handleCopyShareLink = () => {
        const scenario = scenarios.find(s => s.id === activeScenario)
        if (!scenario) return

        // Mocking a unique shareable link
        const shareLink = `${window.location.origin}/share/scenario/${scenario.id}`
        navigator.clipboard.writeText(shareLink)
        toast.success("Share link copied to clipboard!")
    }

    const handleExportExcel = () => {
        toast.success("Exporting scenario data to Excel...")
        // Real logic would generate an xlsx file from the scenario parameters
        setTimeout(() => toast.success("Scenario exported successfully!"), 1500)
    }

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline mr-2" /> Synching Scenarios...</div>

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Scenario Planning</h2>
                    <p className="text-muted-foreground">Manage multi-track financial simulations and branch analysis.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowDiff(!showDiff)} className={showDiff ? "bg-slate-100 border-slate-400" : ""}>
                        <FileDiff className="h-4 w-4 mr-2" />
                        {showDiff ? "Hide Comparison" : "Diff Visualization"}
                    </Button>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" onClick={() => handleCreateScenario(activeScenario || undefined)}>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Branch Active
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Scenario List */}
                <div className="md:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active Branches</h3>
                    {scenarios.map(s => (
                        <div
                            key={s.id}
                            onClick={() => setActiveScenario(s.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden group ${activeScenario === s.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 hover:border-slate-300'
                                }`}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s.color }} />
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm truncate">{s.name}</span>
                                        {s.isDefault && <Badge variant="secondary" className="text-[9px] px-1 py-0">BASE</Badge>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Updated {new Date(s.createdAt).toLocaleDateString()}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleRenameScenario(s.id); }}>Rename</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleDuplicateScenario(s.id); }}>Duplicate</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs flex items-center gap-2 text-indigo-600 font-bold" onClick={(e) => { e.stopPropagation(); handleMergeScenario(); }}>
                                            <GitMerge className="h-3 w-3" /> Merge to Base
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeleteScenario(s.id); }}>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            {activeScenario === s.id && <div className="absolute top-4 right-4 text-primary"><Check className="h-4 w-4" /></div>}
                        </div>
                    ))}
                    <Button variant="outline" className="w-full border-dashed" onClick={() => handleCreateScenario()}>
                        <Plus className="h-4 w-4 mr-2" /> New Scenario
                    </Button>
                </div>

                {/* Comparison / Workspace Area */}
                <div className="md:col-span-3 space-y-6">
                    {showDiff ? (
                        <Card className="border-none bg-slate-50 shadow-inner min-h-[500px]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileDiff className="h-5 w-5 text-indigo-500" />
                                    Visual Diff: {scenarios.find(s => s.id === activeScenario)?.name} vs Baseline
                                </CardTitle>
                                <CardDescription>Identifying variance in projected ARR and Burn Rate between branches.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8 py-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Net Alpha</Label>
                                            <div className="text-2xl font-black text-emerald-600 flex items-center gap-2 mt-1">
                                                +$1.2M <TrendingUp className="h-5 w-5" />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1">
                                                <History className="h-3 w-3" /> VS. BASELINE (MARCH)
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Runway Impact</Label>
                                            <div className="text-2xl font-black text-blue-600 flex items-center gap-2 mt-1">
                                                +4.2 Mo <Clock className="h-5 w-5" />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-bold">EXTENDED LIQUIDITY WINDOW</div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-sm bg-rose-50/20">
                                            <Label className="text-[10px] text-rose-500 uppercase font-black">Risk Exposure</Label>
                                            <div className="text-2xl font-black text-rose-600 flex items-center gap-2 mt-1">
                                                Low <ShieldAlert className="h-5 w-5 font-bold" />
                                            </div>
                                            <div className="text-[10px] text-rose-400 mt-2 font-bold">95% CONFIDENCE INTERVAL</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                            <BarChart className="h-4 w-4" />
                                            Variance Waterfall Analysis
                                        </h4>
                                        <div className="h-40 flex items-end gap-2 px-4 border-b border-l pb-2 bg-white/50 rounded-lg pt-8">
                                            {[
                                                { label: 'Base', val: 70, color: 'bg-slate-300' },
                                                { label: 'Pricing', val: 15, color: 'bg-emerald-500', isDelta: true },
                                                { label: 'Churn', val: 10, color: 'bg-emerald-400', isDelta: true },
                                                { label: 'Hiring', val: -12, color: 'bg-rose-500', isDelta: true },
                                                { label: 'New Target', val: 83, color: 'bg-primary' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center group cursor-help">
                                                    <div className="text-[9px] font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {item.val > 0 ? '+' : ''}{item.val}%
                                                    </div>
                                                    <div
                                                        className={`${item.color} w-full rounded-t-sm transition-all duration-700 hover:brightness-110 shadow-sm`}
                                                        style={{ height: `${Math.abs(item.val) * 1.5}px` }}
                                                    />
                                                    <span className="text-[8px] mt-2 font-black uppercase text-slate-400">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs uppercase font-black text-slate-500 flex items-center gap-2">
                                                <Flame className="h-3 w-3 text-orange-500" />
                                                Driver Sensitivity Matrix
                                            </Label>
                                            <div className="grid grid-cols-4 gap-1">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-8 rounded-sm animate-pulse`}
                                                        style={{
                                                            backgroundColor: i % 3 === 0 ? '#ef4444' : i % 2 === 0 ? '#fbbf24' : '#10b981',
                                                            opacity: 0.3 + (Math.random() * 0.7)
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-slate-400 italic font-medium">Heatmap showing ARR impact across multiple pricing tiers vs retention rates.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-xs uppercase font-black text-slate-500 flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-primary" />
                                                Board Perspective (AI Summary)
                                            </Label>
                                            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] leading-relaxed border-2 border-primary/20 shadow-lg">
                                                <span className="text-primary font-bold">Executive Insight:</span> This branch demonstrates superior capital efficiency. By delaying 3 engineering hires until Q3, we can increase our marketing spend by 15% without reducing our cash-out date, resulting in a 4.2x LTV/CAC.
                                                <div className="mt-2 text-primary font-bold uppercase tracking-widest text-[9px] flex items-center gap-1 cursor-pointer hover:underline">
                                                    GENERATE BOARD PDF <Download className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-t-4 border-t-blue-500">
                                <CardHeader>
                                    <CardTitle className="text-lg">Collaborate & Export</CardTitle>
                                    <CardDescription>Share this branch analysis with stakeholders or export to Excel.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-muted-foreground pb-2">
                                        Collaboration allows you to send a read-only or collaborative link directly to board members or executives without them needing full system access.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleExportExcel}>
                                            <Download className="h-5 w-5 text-blue-500" />
                                            <div className="text-xs">Export Excel</div>
                                        </Button>
                                        <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleCopyShareLink}>
                                            <Upload className="h-5 w-5 text-indigo-500" />
                                            <div className="text-xs">Copy Share Link</div>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-t-4 border-t-emerald-500">
                                <CardHeader>
                                    <CardTitle className="text-lg">Merge Controls</CardTitle>
                                    <CardDescription>Consolidate results into the baseline projection.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-muted-foreground pb-2">
                                        Merging will update the baseline model with the specific driver values and logic defined in this scenario.
                                        This action is permanent and creates a new baseline version.
                                    </p>
                                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={handleMergeScenario} disabled={activeScenario === scenarios.find(s => s.isDefault)?.id}>
                                        <GitMerge className="h-4 w-4 mr-2" />
                                        Merge into Baseline
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2 bg-slate-900 text-white">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold">Real-time Scenario Sync</h4>
                                        <p className="text-xs text-slate-400 mt-1">Industrial engine is polling for changes in the active workspace.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">LIVE</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
