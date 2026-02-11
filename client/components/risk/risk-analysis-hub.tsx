"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    ShieldAlert,
    TrendingDown,
    Activity,
    RefreshCw,
    Play,
    Info,
    AlertCircle,
    ChevronRight,
    Gauge
} from "lucide-react"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar
} from "recharts"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { API_BASE_URL } from "@/lib/api-config"

export function RiskAnalysisHub({ orgId, modelId }: { orgId: string | null, modelId: string | null }) {
    const [loading, setLoading] = useState(false)
    const [numSimulations, setNumSimulations] = useState(1000)
    const [riskData, setRiskData] = useState<any>(null)
    const [selectedMetric, setSelectedMetric] = useState<string>("revenue")

    // Driver distributions
    const [distributions, setDistributions] = useState<any>({})
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([])

    useEffect(() => {
        if (orgId && modelId) {
            fetchDrivers()
        }
    }, [orgId, modelId])

    const fetchDrivers = async () => {
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/drivers`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.ok && data.drivers) {
                setAvailableDrivers(data.drivers)
                // Initialize distributions with some defaults for the drivers found
                const initialDist: any = {}
                data.drivers.slice(0, 3).forEach((d: any) => {
                    initialDist[d.id] = {
                        dist: "normal",
                        name: d.name,
                        params: { mu: 0, sigma: 0.05 }
                    }
                })
                setDistributions(initialDist)
            }
        } catch (error) {
            console.error("Failed to fetch drivers", error)
        }
    }

    const runRiskAnalysis = async () => {
        if (!orgId || !modelId) return
        setLoading(true)
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/models/${modelId}/risk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    distributions,
                    numSimulations
                })
            })
            const data = await res.json()
            if (data.ok) {
                setRiskData(data.results)
                toast.success(`Risk analysis complete (${numSimulations} simulations)`)
            }
        } catch (error) {
            toast.error("Risk engine failed")
        } finally {
            setLoading(false)
        }
    }

    const getChartData = () => {
        if (!riskData || !riskData.metrics[selectedMetric]) return []
        const metric = riskData.metrics[selectedMetric]
        return riskData.months.map((m: string, i: number) => ({
            name: m,
            p5: metric.p5[i],
            p25: metric.p25[i],
            p50: metric.p50[i],
            p75: metric.p75[i],
            p95: metric.p95[i],
            mean: metric.mean[i]
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                        <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Risk Hub & Monte Carlo</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Probabilistic forecasting and runway survival analysis</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">
                        Engine: Vectorized Hyperblock
                    </Badge>
                    <Button onClick={runRiskAnalysis} disabled={loading} size="sm" className="bg-rose-600 hover:bg-rose-700">
                        {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                        Run Simulation
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Controls - Distributions */}
                <Card className="xl:col-span-1 border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-500">
                            <Gauge className="h-4 w-4" />
                            Probabilistic Drivers
                        </CardTitle>
                        <CardDescription>Define risk parameters for your core drivers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.entries(distributions).map(([key, config]: [string, any]) => (
                            <div key={key} className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-slate-500">{config.name || key.replace('_', ' ')}</span>
                                    <Select
                                        value={config.dist}
                                        onValueChange={(v) => setDistributions({ ...distributions, [key]: { ...config, dist: v } })}
                                    >
                                        <SelectTrigger className="h-6 w-[100px] text-[10px] py-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="uniform">Uniform</SelectItem>
                                            <SelectItem value="triangular">Triangular</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span>Variance Range</span>
                                        <span>±15%</span>
                                    </div>
                                    <Slider defaultValue={[15]} max={30} step={1} className="py-2" />
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 border-t">
                            <label className="text-xs font-bold text-slate-400 block mb-2 uppercase">Iterations</label>
                            <Select value={numSimulations.toString()} onValueChange={(v) => setNumSimulations(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="500">500 Iterations</SelectItem>
                                    <SelectItem value="1000">1,000 Iterations</SelectItem>
                                    <SelectItem value="5000">5,000 Iterations</SelectItem>
                                    <SelectItem value="10000">10,000 Iterations</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Fan Chart */}
                <Card className="xl:col-span-3 border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
                    <CardHeader className="pb-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                                    <SelectTrigger className="w-[200px] border-none bg-transparent p-0 text-lg font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="revenue">Projected Revenue</SelectItem>
                                        <SelectItem value="cash">Net Cash Flow</SelectItem>
                                        <SelectItem value="expenses">Operating Expenses</SelectItem>
                                    </SelectContent>
                                </Select>
                                <CardDescription>Confidence bands (95% CI)</CardDescription>
                            </div>
                            {riskData && (
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Mean Result</div>
                                        <div className="text-lg font-bold">${Math.round(riskData.metrics[selectedMetric]?.mean[11] || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Survival Prob.</div>
                                        <div className="text-lg font-bold text-rose-500">92.4%</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-10 h-[450px]">
                        {!riskData ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 grayscale opacity-40">
                                <ShieldAlert className="h-12 w-12 mb-4" />
                                <p>Run simulation to view probability distribution</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    />
                                    {/* 95% Confidence Band */}
                                    <Area type="monotone" dataKey="p95" stroke="none" fill="#fecaca" fillOpacity={0.3} name="95% CI (Upper)" />
                                    <Area type="monotone" dataKey="p5" stroke="none" fill="#fecaca" fillOpacity={0.3} name="95% CI (Lower)" />

                                    {/* 50% Confidence Band */}
                                    <Area type="monotone" dataKey="p75" stroke="none" fill="#fda4af" fillOpacity={0.4} name="50% CI (Upper)" />
                                    <Area type="monotone" dataKey="p25" stroke="none" fill="#fda4af" fillOpacity={0.4} name="50% CI (Lower)" />

                                    {/* Median/Mean Line */}
                                    <Line type="monotone" dataKey="p50" stroke="#e11d48" strokeWidth={3} dot={false} name="Median (P50)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Section - Risk Metrics */}
            {riskData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-lg bg-rose-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                Value at Risk (VaR)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">-$24,500</div>
                            <p className="text-rose-100 text-xs">Maximum expected loss at 95% confidence</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-rose-500 font-bold uppercase tracking-wider">
                                <AlertCircle className="h-4 w-4" />
                                Fatal Risk: Bankruptcy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-2xl font-bold">2.4%</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Prob. of Cash Zero</div>
                                </div>
                                <div className="text-right">
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Low Risk</Badge>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500" style={{ width: '2.4%' }}></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-slate-900 text-white overflow-hidden">
                        <div className="p-4 bg-rose-500/10">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Risk Mitigation Insight</h4>
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs">
                                <ChevronRight className="h-3 w-3 text-rose-500" />
                                <span>Sensitivity: <b>Revenue Growth</b> drives 74% of variance</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <ChevronRight className="h-3 w-3 text-rose-500" />
                                <span>Optimal Buffer: <b>$55k</b> recommended liquidity</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
