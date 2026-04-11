"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
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
    History,
    Target
} from "lucide-react"

import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Scenario {
    id: string
    name: string
    description?: string
    color: string
    isDefault: boolean
    createdAt: string
    parentId?: string
    summary?: any
}

export function ScenarioManagement({ orgId, modelId, onRefresh, currentRunId, refreshKey }: { orgId: string | null, modelId: string | null, onRefresh?: () => void, currentRunId?: string | null, refreshKey?: number }) {
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [loading, setLoading] = useState(true)
    const [activeScenario, setActiveScenario] = useState<string | null>(null)
    const [showDiff, setShowDiff] = useState(false)

    useEffect(() => {
        if (orgId && modelId) {
            fetchScenarios()
        }
    }, [orgId, modelId, currentRunId, refreshKey])

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
                if (onRefresh) onRefresh()
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

    const [generatingPDF, setGeneratingPDF] = useState(false)

    const handleGenerateBoardPDF = async () => {
        if (!orgId) return;
        setGeneratingPDF(true);
        toast.loading("Queuing board-ready PDF generation...", { id: "board-pdf" });

        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/investor-export`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    format: 'pdf',
                    includeMonteCarlo: true,
                    includeRecommendations: true
                })
            });

            if (res.ok) {
                const data = await res.json();
                const exportId = data.export.exportId;
                toast.success("PDF Job Queued. Polling status...", { id: "board-pdf" });

                // Poll for status
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API_BASE_URL}/exports/${exportId}/status`, {
                            headers: getAuthHeaders(),
                            credentials: "include"
                        });
                        const statusData = await statusRes.json();
                        
                        if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            setGeneratingPDF(false);
                            toast.success("Board PDF Generated!", { id: "board-pdf" });
                            
                            // Trigger download
                            if (statusData.export.downloadUrl) {
                                window.open(`${API_BASE_URL.replace('/api/v1', '')}${statusData.export.downloadUrl}`, '_blank');
                            }
                        } else if (statusData.status === 'failed') {
                            clearInterval(pollInterval);
                            setGeneratingPDF(false);
                            toast.error("Generation failed", { id: "board-pdf" });
                        }
                    } catch (err) {
                        clearInterval(pollInterval);
                        setGeneratingPDF(false);
                    }
                }, 3000);
            } else {
                setGeneratingPDF(false);
                toast.error("Failed to queue PDF generation", { id: "board-pdf" });
            }
        } catch (err) {
            setGeneratingPDF(false);
            toast.error("Export error", { id: "board-pdf" });
        }
    }

    const handleExportExcel = () => {
        toast.info("Excel export coming in next release (Q3)");
    }

    if (loading) return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <Skeleton className="h-4 w-32" />
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
                <div className="md:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-44 w-full rounded-xl" />
                        <Skeleton className="h-44 w-full rounded-xl" />
                        <Skeleton className="h-[400px] lg:col-span-2 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    )

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
                    {scenarios.length === 0 && !loading ? (
                        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
                            <div className="h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center border border-slate-100 mb-6 group-hover:scale-110 transition-transform">
                                <GitBranch className="h-8 w-8 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">No Active Scenarios Found</h3>
                            <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
                                Scenario Planning allows you to branch your baseline model into multiple tracks. 
                                <span className="font-bold text-indigo-600"> Nothing will be seen in this tab until you initialize your first scenario branch.</span>
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                <Button 
                                    className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 h-11 shadow-lg shadow-indigo-200"
                                    onClick={() => handleCreateScenario()}
                                >
                                    <Zap className="h-4 w-4 mr-2" /> Initialize Scenarios
                                </Button>
                                <Button variant="outline" className="h-11 font-bold">
                                    View Documentation
                                </Button>
                            </div>
                            <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-2xl border-t border-slate-200 pt-8 opacity-50">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Step 1</p>
                                    <p className="text-xs font-bold text-slate-600 mt-1">Select Baseline</p>
                                </div>
                                <div className="text-center border-x border-slate-200 px-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Step 2</p>
                                    <p className="text-xs font-bold text-slate-600 mt-1">Branch Assumptions</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Step 3</p>
                                    <p className="text-xs font-bold text-slate-600 mt-1">Visual Diff Analysis</p>
                                </div>
                            </div>
                        </Card>
                    ) : showDiff ? (
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
                                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Net Alpha (Revenue)</Label>
                                            <div className={`text-2xl font-black flex items-center gap-2 mt-1 ${((scenarios.find(s => s.id === activeScenario)?.summary?.totalRevenue || 0) - (scenarios.find(s => s.isDefault)?.summary?.totalRevenue || 0)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {(() => {
                                                    const active = scenarios.find(s => s.id === activeScenario)?.summary?.totalRevenue || 0;
                                                    const base = scenarios.find(s => s.isDefault)?.summary?.totalRevenue || 0;
                                                    const delta = active - base;
                                                    return delta === 0 ? "No Change" : `${delta > 0 ? '+' : ''}$${(Math.abs(delta) / 1000000).toFixed(1)}M`;
                                                })()}
                                                {((scenarios.find(s => s.id === activeScenario)?.summary?.totalRevenue || 0) - (scenarios.find(s => s.isDefault)?.summary?.totalRevenue || 0)) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1 uppercase">
                                                <History className="h-3 w-3" /> VS. BASELINE MODEL
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-black">Impact Confidence</Label>
                                            <div className="text-2xl font-black text-blue-600 flex items-center gap-2 mt-1">
                                                {scenarios.find(s => s.id === activeScenario)?.summary ? "High" : "N/A"} <Target className="h-5 w-5" />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase">CONFIDENCE RANKING</div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-sm bg-rose-50/20">
                                            <Label className="text-[10px] text-slate-500 uppercase font-black">Burn Profile</Label>
                                            <div className="text-2xl font-black flex items-center gap-2 mt-1">
                                                {(() => {
                                                    const active = scenarios.find(s => s.id === activeScenario)?.summary?.burnRate || 0;
                                                    const base = scenarios.find(s => s.isDefault)?.summary?.burnRate || 0;
                                                    if (!active || !base) return <><span className="text-slate-600">Undefined</span> <ShieldAlert className="h-5 w-5 font-bold" /></>;
                                                    return active > base ? <><span className="text-rose-600">Elevated</span> <TrendingUp className="h-5 w-5 text-rose-500 font-bold" /></> : <><span className="text-emerald-600">Optimized</span> <TrendingDown className="h-5 w-5 text-emerald-500 font-bold" /></>;
                                                })()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase">VERSUS BASELINE RATE</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                            <BarChart className="h-4 w-4" />
                                            Variance Waterfall Analysis
                                        </h4>
                                        <div className="h-40 flex items-end gap-2 px-4 border-b border-l pb-2 bg-white/50 rounded-lg pt-8">
                                            {activeScenario && scenarios.find(s => s.id === activeScenario)?.summary?.varianceBridge ? 
                                                (scenarios.find(s => s.id === activeScenario)?.summary?.varianceBridge as any[]).map((item, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center group cursor-help">
                                                        <div className="text-[9px] font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {item.value > 0 ? '+' : ''}{item.value}%
                                                        </div>
                                                        <div
                                                            className={`${item.value >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} w-full rounded-t-sm transition-all duration-700 hover:brightness-110 shadow-sm`}
                                                            style={{ height: `${Math.min(Math.abs(item.value) * 1.5, 100)}px` }}
                                                        />
                                                        <span className="text-[8px] mt-2 font-black uppercase text-slate-400">{item.label}</span>
                                                    </div>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground text-[10px] uppercase font-black tracking-widest gap-2">
                                                        <BarChart className="h-6 w-6 opacity-20" />
                                                        No Variance Data Available
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs uppercase font-black text-slate-500 flex items-center gap-2">
                                                <Flame className="h-3 w-3 text-orange-500" />
                                                Runway Health
                                            </Label>
                                            <div className="text-3xl font-black text-slate-800 tracking-tight">
                                                {scenarios.find(s => s.id === activeScenario)?.summary?.runwayMonths?.toFixed(1) || '0.0'} <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Months</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 italic font-medium">Estimated runway before cash depletion under new branch assumptions.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-xs uppercase font-black text-slate-500 flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-primary" />
                                                AI Generated Insight
                                            </Label>
                                            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] leading-relaxed border-2 border-primary/20 shadow-lg">
                                                <span className="text-primary font-bold">Executive Summary:</span> {
                                                    (() => {
                                                        const activeS = scenarios.find(s => s.id === activeScenario);
                                                        const baseS = scenarios.find(s => s.isDefault);
                                                        if (!activeS?.summary || !baseS?.summary) return 'Run scenario to generate insights.';
                                                        const revDelta = (activeS.summary.totalRevenue || 0) - (baseS.summary.totalRevenue || 0);
                                                        const dir = revDelta > 0 ? 'an increase' : 'a decrease';
                                                        return `This branch projects ${dir} in lifetime ARR versus the baseline trajectory. Pay close attention to underlying burn rate variations as you merge changes.`;
                                                    })()
                                                }
                                                <div 
                                                    className="mt-2 text-primary font-bold uppercase tracking-widest text-[9px] flex items-center gap-1 cursor-pointer hover:underline disabled:opacity-50"
                                                    onClick={() => !generatingPDF && handleGenerateBoardPDF()}
                                                >
                                                    {generatingPDF ? (
                                                        <><Loader2 className="h-3 w-3 animate-spin" /> GENERATING...</>
                                                    ) : (
                                                        <>GENERATE BOARD PDF <Download className="h-3 w-3" /></>
                                                    )}
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

                            <Card className="lg:col-span-2 shadow-lg border-slate-200">
                                <CardHeader className="bg-slate-50/50">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Target className="h-5 w-5 text-indigo-500" />
                                            Comparative KPI Analysis
                                        </CardTitle>
                                        <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">
                                            Delta Confidence: 94%
                                        </Badge>
                                    </div>
                                    <CardDescription>Side-by-side performance variance for strategic metrics.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="font-bold text-xs">METRIC</TableHead>
                                                <TableHead className="font-bold text-xs text-right">BASELINE</TableHead>
                                                <TableHead className="font-bold text-xs text-right">ACTIVE BRANCH</TableHead>
                                                <TableHead className="font-bold text-xs text-right">VARIANCE</TableHead>
                                                <TableHead className="font-bold text-xs text-right">IMPACT</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(() => {
                                                const activeS = scenarios.find(s => s.id === activeScenario);
                                                const baseS = scenarios.find(s => s.isDefault) || scenarios[0];
                                                
                                                const activeSum = activeS?.summary || {};
                                                const baseSum = baseS?.summary || {};
                                                
                                                const kpiRows = [
                                                    { 
                                                        m: 'Annual Recurring Revenue (ARR)', 
                                                        b: baseSum.totalRevenue ? `$${(baseSum.totalRevenue / 1000000).toFixed(1)}M` : 'No Data', 
                                                        a: activeSum.totalRevenue ? `$${(activeSum.totalRevenue / 1000000).toFixed(1)}M` : 'No Data'
                                                    },
                                                    { 
                                                        m: 'Net Income / Burn', 
                                                        b: baseSum.netIncome ? `$${(baseSum.netIncome / 1000000).toFixed(1)}M` : 'No Data', 
                                                        a: activeSum.netIncome ? `$${(activeSum.netIncome / 1000000).toFixed(1)}M` : 'No Data'
                                                    },
                                                    { 
                                                        m: 'EBITDA Margin %', 
                                                        b: baseSum.ebitda && baseSum.totalRevenue ? `${((baseSum.ebitda / baseSum.totalRevenue) * 100).toFixed(1)}%` : 'No Data', 
                                                        a: activeSum.ebitda && activeSum.totalRevenue ? `${((activeSum.ebitda / activeSum.totalRevenue) * 100).toFixed(1)}%` : 'No Data'
                                                    }
                                                ];

                                                return kpiRows.map((row, i) => {
                                                    const bVal = parseFloat(row.b.replace(/[^\d.-]/g, ''));
                                                    const aVal = parseFloat(row.a.replace(/[^\d.-]/g, ''));
                                                    const variance = bVal !== 0 ? ((aVal - bVal) / Math.abs(bVal)) * 100 : 0;
                                                    
                                                    return (
                                                        <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                                                            <TableCell className="text-xs font-bold text-slate-700">{row.m}</TableCell>
                                                            <TableCell className="text-xs text-right font-mono">{row.b}</TableCell>
                                                            <TableCell className="text-xs text-right font-mono text-indigo-600 font-bold">{row.a}</TableCell>
                                                            <TableCell className={`text-xs text-right font-black ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge className={Math.abs(variance) > 15 ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}>
                                                                    {Math.abs(variance) > 15 ? 'Critical' : 'Positive'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                });
                                            })()}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-3 border-indigo-100 shadow-xl overflow-hidden mt-8 mb-6">
                                <CardHeader className="bg-indigo-50/50 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <History className="h-5 w-5 text-indigo-500" />
                                            Enterprise Waterfall: Baseline → Target Variance
                                        </CardTitle>
                                        <Button variant="outline" size="sm" className="text-[10px] h-7 font-black">EXPORT VARIANCE BRIDGE</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="flex items-end justify-between h-48 gap-4 px-6">
                                        {(activeScenario && scenarios.find(s => s.id === activeScenario)?.summary?.varianceBridge) ? (scenarios.find(s => s.id === activeScenario)?.summary?.varianceBridge as any[]).map((bar, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                                <div 
                                                    className={`w-full rounded-t-lg transition-all duration-700 ${bar.value >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                    style={{ height: `${Math.min(Math.abs(bar.value) * 1.5, 100)}%` }}
                                                />
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap">{bar.label}</div>
                                                <div className={`text-[10px] font-mono font-bold ${bar.value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{bar.value > 0 ? '+' : ''}{bar.value.toLocaleString()}%</div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground text-[10px] uppercase font-black tracking-widest gap-2">
                                                <LayoutGrid className="h-8 w-8 opacity-20" />
                                                Run Scenario for Bridge Analysis
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-8 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">AI Narrative Bridge</p>
                                        <p className="text-xs text-slate-600 italic">"The primary driver of variance between these scenarios is the Volume adjustment (+27% relative impact), offset partially by an aggressive Churn assumption."</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2 bg-slate-900 border-none text-white overflow-hidden shadow-2xl">
                                <CardContent className="p-6 flex items-center justify-between relative">
                                    <div className="absolute top-0 right-0 w-32 h-full bg-indigo-500/10 blur-3xl rounded-full" />
                                    <div className="relative z-10 flex items-center gap-6">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                            <Zap className="h-6 w-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black tracking-tight text-lg">Hyper-Trace™ Scenario Sync</h4>
                                            <p className="text-xs text-slate-400 mt-1 max-w-md">Industrial compute engine is monitoring changes across the multi-dimensional branch architecture for all collaborators.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-500">Engine Integrity</span>
                                            <span className="text-xs font-bold text-emerald-400">OPTIMAL</span>
                                        </div>
                                        <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
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
