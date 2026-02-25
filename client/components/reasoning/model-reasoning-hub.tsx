"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Zap, AlertTriangle, Lightbulb, Search, ArrowRight, TrendingUp, TrendingDown, DollarSign, Info, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config"
import { toast } from "sonner"

interface ModelReasoningHubProps {
    modelId: string | null
    orgId: string | null
}

export function ModelReasoningHub({ modelId, orgId }: ModelReasoningHubProps) {
    const [targetMetric, setTargetMetric] = useState<string>("monthly_burn_rate")
    const [loading, setLoading] = useState(false)
    const [reasoningData, setReasoningData] = useState<any>(null)

    const metrics = [
        { id: "monthly_burn_rate", name: "Monthly Burn Rate", icon: DollarSign },
        { id: "cash_runway", name: "Cash Runway", icon: TrendingUp },
        { id: "revenue", name: "Total Revenue", icon: Zap },
        { id: "net_income", name: "Net Income", icon: ArrowRight },
    ]

    const fetchReasoning = async () => {
        if (!modelId) {
            toast.error("Please select a model first")
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("auth-token")
            const response = await fetch(`${API_BASE_URL}/compute/reasoning`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    modelId,
                    target: targetMetric,
                    goal: targetMetric.includes("burn") ? "decrease" : "increase",
                    period_a: 0,
                    period_b: 1
                }),
            })

            if (response.ok) {
                const result = await response.json()
                setReasoningData(result)
            } else {
                throw new Error("Failed to fetch reasoning analysis")
            }
        } catch (error) {
            console.error("Reasoning error:", error)
            toast.error("Could not complete reasoning analysis")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-2 border-blue-100 bg-blue-50/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="h-6 w-6 text-blue-600" />
                            <CardTitle>AI Financial Reasoner</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            Causal Engine v2.0
                        </Badge>
                    </div>
                    <CardDescription>
                        Go beyond predictions and uncover the underlying mathematical drivers of your business metrics.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Select value={targetMetric} onValueChange={setTargetMetric}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select target metric to analyze" />
                                </SelectTrigger>
                                <SelectContent>
                                    {metrics.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <div className="flex items-center gap-2">
                                                <m.icon className="h-4 w-4 text-muted-foreground" />
                                                {m.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={fetchReasoning} disabled={loading || !modelId} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Analyze Causal Drivers
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reasoningData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">

                    {/* Variance Waterfall - Why did it change? */}
                    {reasoningData.varianceAnalysis && (
                        <Card className="lg:col-span-2 border-blue-200 bg-blue-50/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5 text-blue-600" />
                                    Waterfall Variance Analysis
                                </CardTitle>
                                <CardDescription>
                                    Decomposition of change in {targetMetric.replace(/_/g, ' ')} between Period 0 and Period 1
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="p-3 bg-white border rounded-lg shadow-sm">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Baseline</p>
                                        <p className="text-xl font-bold text-slate-900">${reasoningData.varianceAnalysis.baseline?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-white border rounded-lg shadow-sm">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Current</p>
                                        <p className="text-xl font-bold text-slate-900">${reasoningData.varianceAnalysis.current?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-white border rounded-lg shadow-sm">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Net Variance</p>
                                        <p className={`text-xl font-bold ${reasoningData.varianceAnalysis.variance >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                            ${reasoningData.varianceAnalysis.variance?.toLocaleString()}
                                            <span className="text-sm font-normal ml-1">
                                                ({(reasoningData.varianceAnalysis.variance_percent * 100).toFixed(1)}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <ArrowRight className="h-4 w-4" />
                                        Contribution Breakdown
                                    </h4>
                                    <div className="space-y-3">
                                        {reasoningData.varianceAnalysis.drivers?.map((driver: any, idx: number) => (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {driver.contribution_percent > 0 ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                                                        <span className="font-medium text-slate-700">{driver.driver}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-slate-500">${driver.delta?.toLocaleString()}</span>
                                                        <Badge variant="outline" className={driver.contribution_percent > 0 ? "bg-green-50 text-green-700 border-green-100" : "bg-rose-50 text-rose-700 border-rose-100"}>
                                                            {(driver.contribution_percent * 100).toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${driver.contribution_percent > 0 ? 'bg-green-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.abs(driver.contribution_percent) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Driver Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Key Upstream Drivers
                            </CardTitle>
                            <CardDescription>Drivers ranked by impact on {targetMetric.replace(/_/g, ' ')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {reasoningData.analysis?.drivers?.map((driver: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700">{driver.name}</span>
                                        <span className={`font-mono ${driver.sensitivity > 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                            {driver.sensitivity > 0 ? '+' : ''}{(driver.sensitivity * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${Math.abs(driver.sensitivity) > 0.1 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                            style={{ width: `${Math.min(Math.abs(driver.sensitivity) * 500, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Impact: {driver.impact.toUpperCase()} • Sensitivity: {driver.sensitivity.toFixed(4)}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Logic Explanation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                Metric Derivation Logic
                            </CardTitle>
                            <CardDescription>Mathematical formula and logic tree</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-900 text-slate-100 font-mono p-4 rounded-lg text-sm mb-4">
                                {reasoningData.explanation?.formula}
                            </div>
                            <div className="space-y-3">
                                {reasoningData.explanation?.steps?.map((step: string, idx: number) => (
                                    <div key={idx} className="flex gap-3 text-sm">
                                        <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <p className="text-slate-600">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Strategic Suggestions */}
                    <Card className="lg:col-span-1 border-emerald-100 bg-emerald-50/10">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-emerald-500" />
                                Strategic Optimization
                            </CardTitle>
                            <CardDescription>Actionable suggestions to improve {targetMetric.replace(/_/g, ' ')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {reasoningData.suggestions?.map((suggestion: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white border border-emerald-100 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{suggestion.impact} Impact</Badge>
                                        <span className="font-semibold text-sm text-emerald-900">{suggestion.driver}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{suggestion.action}</p>
                                    <p className="text-[11px] text-muted-foreground mt-2 italic">{suggestion.reasoning}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Weak Assumptions */}
                    <Card className="lg:col-span-1 border-rose-100 bg-rose-50/10">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-rose-500" />
                                Model Integrity Check
                            </CardTitle>
                            <CardDescription>Detected weak assumptions and lazy drivers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {reasoningData.weakAssumptions?.length > 0 ? (
                                reasoningData.weakAssumptions.map((wa: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white border border-rose-100 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-rose-900">{wa.name}</span>
                                            <Badge variant="destructive" className="text-[10px] h-4">STATIC</Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">{wa.issue}</p>
                                        <p className="text-xs text-rose-700 mt-2 font-medium">Recommendation: {wa.recommendation}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    <span className="text-sm">No weak assumptions detected in inputs.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {!reasoningData && !loading && (
                <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Brain className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-600">Start Model Reasoning</h3>
                    <p className="text-slate-400 max-w-md mx-auto mt-2">
                        Select a metric and click analyze to see how the model calculates it and identify the most sensitive drivers.
                    </p>
                </div>
            )}
        </div>
    )
}

function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
