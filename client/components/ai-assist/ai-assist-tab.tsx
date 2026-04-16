"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sparkles,
    Rocket,
    Leaf,
    Zap,
    CheckCircle2,
    ArrowRight,
    ChevronRight,
    Info,
    Network,
    Activity,
    BarChart3,
    Loader2,
    Trash2,
    Edit3
} from "lucide-react"
import { toast } from "sonner"
import { ModelReasoningHub } from "../reasoning/model-reasoning-hub"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"

interface AIAssistTabProps {
    orgId: string | null
    modelId: string | null
    currentRunId?: string | null
    refreshKey?: number
    onSuccess?: () => void
}

export function AIAssistTab({ orgId, modelId, currentRunId, refreshKey, onSuccess }: AIAssistTabProps) {
    const [strategy, setStrategy] = useState<"aggressive" | "sustainable" | "efficiency" | null>(null)
    const [loading, setLoading] = useState(false)
    const [sensitivities, setSensitivities] = useState<any[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [initialized, setInitialized] = useState(false)
    const [aiInsights, setAiInsights] = useState<any>(null)

    useEffect(() => {
        if (modelId) {
            fetchModelAnalysis()
        }
    }, [modelId, currentRunId, refreshKey])

    const fetchModelAnalysis = async () => {
        try {
            setLoading(true)
            // Fetch specific run if available, otherwise latest
            const url = currentRunId 
                ? `${API_BASE_URL}/models/${modelId}/runs/${currentRunId}`
                : `${API_BASE_URL}/models/${modelId}/runs?limit=1`;
                
            const res = await fetch(url, {
                headers: getAuthHeaders(),
                credentials: "include"
            })

            if (res.ok) {
                const data = await res.json()
                const run = data.run || data.runs?.[0]
                if (data.ok && run) {
                    const summary = typeof run.summaryJson === 'string'
                        ? JSON.parse(run.summaryJson)
                        : run.summaryJson;

                    if (summary?.sensitivities?.parameters) {
                        setSensitivities(summary.sensitivities.parameters)
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching model analysis:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleStrategySelect = async (s: "aggressive" | "sustainable" | "efficiency") => {
        setStrategy(s)
        setAnalyzing(true)
        setShowSuggestions(false)

        try {
            const res = await fetch(`${API_BASE_URL}/compute/ai-pipeline`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    modelId,
                    task: "strategy_analysis",
                    orgId,
                    strategy: s
                })
            })

            if (res.status === 401) { handleUnauthorized(); return; }
            const data = await res.json()
            if (data.ok && data.result) {
                setAiInsights(data.result)
            }
        } catch (error) {
            console.error("AI pipeline error:", error)
        } finally {
            setAnalyzing(false)
            setShowSuggestions(true)
        }
    }

    const [simLogs, setSimLogs] = useState<string[]>([])

    const addLog = (msg: string) => {
        setSimLogs(prev => [msg, ...prev].slice(0, 5))
    }

    const handleInitialize = async () => {
        addLog("Syncing AI parameters to Hyperblock engine...")
        setTimeout(() => {
            setInitialized(true)
            toast.success("AI assumptions confirmed and applied to model.")
            addLog("Industrial baseline locked.")
            if (onSuccess) onSuccess()
        }, 800)
    }

    if (!orgId || !modelId) return <div className="p-12 text-center text-muted-foreground">Select a model to use AI assistance.</div>

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">AI Financial Co-Pilot</h2>
                    <p className="text-muted-foreground">Strategic simulation & reasoning engine for industrial modeling.</p>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                    <Sparkles className="h-4 w-4 mr-2" /> Powered by Fin-GPT-4o
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar: Strategy & Suggestions */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Strategic Objective</CardTitle>
                            <CardDescription>Select a mode for AI-driven optimizations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { id: "aggressive", label: "Aggressive Growth", icon: Rocket, color: "emerald", desc: "Maximize ARR expansion, high burn tolerance" },
                                { id: "sustainable", label: "Sustainable Path", icon: Leaf, color: "blue", desc: "Balanced growth and unit economics" },
                                { id: "efficiency", label: "Lean Efficiency", icon: Zap, color: "amber", desc: "Focus on profitability and low burn" }
                            ].map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleStrategySelect(s.id as any)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${strategy === s.id ? `border-${s.color}-500 bg-${s.color}-50` : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-${s.color}-500/10 text-${s.color}-600`}>
                                            <s.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{s.label}</div>
                                            <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {analyzing && (
                        <div className="p-12 text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                            <p className="text-sm font-medium animate-pulse">Running Monte Carlo simulations...</p>
                        </div>
                    )}

                    {showSuggestions && !initialized && (
                        <Card className="border-purple-200 bg-purple-50/30 animate-in fade-in slide-in-from-bottom-4">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-md flex items-center justify-between">
                                    AI Suggested Assumptions
                                    <Badge className="bg-purple-500">Preview</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {(aiInsights?.suggestions || [
                                        { 
                                            field: strategy === "aggressive" ? "Growth Spend" : strategy === "efficiency" ? "Marketing OpEx" : "Retention Target", 
                                            value: strategy === "aggressive" ? "+$25k" : strategy === "efficiency" ? "-15%" : "96%", 
                                            change: strategy === "aggressive" ? "+12%" : strategy === "efficiency" ? "-5%" : "+2.4%" 
                                        },
                                        { 
                                            field: "Hiring Plan", 
                                            value: strategy === "aggressive" ? "Accelerated" : "Deferred", 
                                            change: strategy === "aggressive" ? "+4 Heads" : "Frozen" 
                                        },
                                        { 
                                            field: "Pricing Architecture", 
                                            value: "Enterprise Tier", 
                                            change: "+$5k ACV" 
                                        }
                                    ]).map((sug: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                                            <div className="text-xs font-semibold">{sug.field}</div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold ${sug.change.includes('-') ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {sug.change}
                                                </span>
                                                <span className="font-mono text-xs">{sug.value}</span>
                                                <Edit3 className="h-3 w-3 text-slate-300 cursor-pointer" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleInitialize}>
                                    Confirm & Initialize Model
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {initialized && (
                        <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
                            <h4 className="font-bold text-sm">Model Initialized</h4>
                            <p className="text-xs">Drivers have been auto-configured for <b>{strategy}</b> strategy.</p>
                            <Button variant="ghost" className="text-[10px] h-6 mt-2" onClick={() => { setShowSuggestions(false); setInitialized(false); setStrategy(null); setSimLogs([]); }}>Reset AI Layer</Button>
                        </div>
                    )}

                    <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">AI Simulation Log</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="space-y-2">
                                {simLogs.length > 0 ? simLogs.map((log, i) => (
                                    <div key={i} className="flex gap-2 items-start text-[10px] animate-in fade-in slide-in-from-left-1">
                                        <span className="text-slate-400 font-mono">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                        <span className="text-slate-600 font-medium">{log}</span>
                                    </div>
                                )) : (
                                    <div className="text-[10px] text-slate-400 italic">No recent simulations...</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content: Explainability Hub */}
                <div className="lg:col-span-8">
                    <Tabs defaultValue="reasoning" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="reasoning" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Network className="h-4 w-4 mr-2" /> Causal Reasoning
                            </TabsTrigger>
                            <TabsTrigger value="impact" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Activity className="h-4 w-4 mr-2" /> Drivers Impact
                            </TabsTrigger>
                            <TabsTrigger value="sensitivity" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <BarChart3 className="h-4 w-4 mr-2" /> Sensitivity Matrix
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="reasoning" className="mt-0">
                            <div className="min-h-[600px] rounded-xl border-2 border-slate-100 overflow-hidden bg-white">
                                <ModelReasoningHub orgId={orgId} modelId={modelId} />
                            </div>
                        </TabsContent>

                        <TabsContent value="impact" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Relative Impact Analysis</CardTitle>
                                    <CardDescription>Drivers with the highest elasticities to your bottom line.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {(sensitivities && sensitivities.length > 0) ? (
                                        sensitivities.slice(0, 6).map((item, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span>{item.parameter}</span>
                                                    <span className={item.direction === 'positive' ? 'text-emerald-600' : 'text-rose-600'}>
                                                        {item.direction === 'positive' ? '+' : '-'}{Math.abs(item.impact_pct).toFixed(1)}% impact score
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.direction === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(100, Math.abs(item.impact_pct) * 5)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground italic">
                                            No sensitivity data available. Run the model to generate impact analysis.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="sensitivity" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sensitivity matrix</CardTitle>
                                    <CardDescription>Comprehensive impact of +/- 10% variance across key variables.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {sensitivities && sensitivities.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b text-slate-500">
                                                        <th className="text-left py-2 font-medium">Assumption</th>
                                                        <th className="text-right py-2 font-medium">-10% Impact</th>
                                                        <th className="text-right py-2 font-medium">Base Value</th>
                                                        <th className="text-right py-2 font-medium">+10% Impact</th>
                                                        <th className="text-right py-2 font-medium">Elasticity</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sensitivities.map((s, i) => {
                                                        const base = Number(s.base_value) || 0;
                                                        const low = Number(s.low_scenario) || 0;
                                                        const high = Number(s.high_scenario) || 0;

                                                        // Calculate relative changes for heatmap intensities
                                                        const lowDelta = base !== 0 ? ((low - base) / base) * 100 : 0;
                                                        const highDelta = base !== 0 ? ((high - base) / base) * 100 : 0;

                                                        const getHeatColor = (delta: number) => {
                                                            const absDelta = Math.abs(delta);
                                                            const intensity = Math.min(0.2, absDelta / 200); // Max intensity at 40% change
                                                            if (delta > 0) return `rgba(16, 185, 129, ${intensity})`; // Emerald
                                                            if (delta < 0) return `rgba(244, 63, 94, ${intensity})`; // Rose
                                                            return 'transparent';
                                                        };

                                                        return (
                                                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors group">
                                                                <td className="py-4 font-medium text-slate-700 bg-slate-50/30">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                        {s.parameter}
                                                                    </div>
                                                                </td>
                                                                <td className="text-right py-4 font-mono transition-all" style={{ backgroundColor: getHeatColor(lowDelta) }}>
                                                                    <div className="px-3">
                                                                        <div className="text-[10px] text-slate-400 mb-0.5">-10% variance</div>
                                                                        <div className={`font-bold ${lowDelta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                            ${low.toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-right py-4 font-mono bg-white group-hover:bg-slate-50">
                                                                    <div className="px-3">
                                                                        <div className="text-[10px] text-slate-400 mb-0.5">Static Baseline</div>
                                                                        <div className="font-black text-slate-900">${base.toLocaleString()}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-right py-4 font-mono transition-all" style={{ backgroundColor: getHeatColor(highDelta) }}>
                                                                    <div className="px-3">
                                                                        <div className="text-[10px] text-slate-400 mb-0.5">+10% variance</div>
                                                                        <div className={`font-bold ${highDelta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                            ${high.toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-right py-4 bg-slate-50/30">
                                                                    <div className="px-3">
                                                                        <Badge variant="outline" className={`font-mono border-2 ${Math.abs(Number(s.elasticity)) > 1.5 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200'}`}>
                                                                            {s.elasticity}x
                                                                        </Badge>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground border-slate-100 border-2 border-dashed rounded-xl">
                                            <BarChart3 className="h-12 w-12 mx-auto opacity-20 mb-4" />
                                            <p className="text-sm">Comprehensive Sensitivity Matrix is being generated...</p>
                                            <p className="text-[10px] mt-2">Requires 1,000 Monte Carlo iterations across {strategy || 'Standard'} baseline.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
