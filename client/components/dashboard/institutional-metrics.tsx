"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Activity,
    TrendingUp,
    DollarSign,
    Zap,
    Target,
    ShieldCheck,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Tornado
} from "lucide-react"

interface InstitutionalMetricsProps {
    modelType: string
    valuation?: any
    lbo?: any
    sensitivities?: any
    formatCurrency: (val: number) => string
}

export function InstitutionalMetrics({
    modelType,
    valuation,
    lbo,
    sensitivities,
    formatCurrency
}: InstitutionalMetricsProps) {

    if (modelType === 'dcf' && valuation) {
        return (
            <Card className="border-2 border-indigo-100 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            <span className="text-xl font-black tracking-tight">DCF Intrinsic Valuation</span>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase font-black text-[9px]">GORDON GROWTH V1</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs uppercase font-bold text-slate-400">Projected Enterprise & Equity Value Analysis</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Enterprise Value</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{formatCurrency(valuation.enterpriseValue)}</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-400 uppercase">Equity Value</p>
                            <h4 className="text-xl font-black text-indigo-900 mt-1">{formatCurrency(valuation.equityValue)}</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Implied PPS</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">${valuation.impliedSharePrice}</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">WACC (Discount)</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{(valuation.wacc * 100).toFixed(2)}%</h4>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                            <span>Value Drivers (Sensitivities)</span>
                            <span className="text-indigo-600">Influence Factor</span>
                        </div>
                        <div className="space-y-2">
                            {sensitivities && Object.entries(sensitivities).slice(0, 3).map(([key, impact]: [string, any], i) => (
                                <div key={key} className="flex items-center gap-4">
                                    <div className="text-[10px] font-bold w-32 truncate text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                    <Progress value={Math.abs(impact) * 100} className="h-1.5 flex-1 bg-slate-100" indicatorClassName="bg-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-900 w-12 text-right">{(impact * 10).toFixed(1)}x</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (modelType === 'lbo' && lbo) {
        return (
            <Card className="border-2 border-emerald-100 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            <span className="text-xl font-black tracking-tight">LBO Returns Analysis</span>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-black text-[9px]">PE STACK V2</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs uppercase font-bold text-slate-400">Leverage Impact & ROI Projections</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-600 uppercase">Projected IRR</p>
                            <h4 className="text-2xl font-black text-emerald-900 mt-1">{(lbo.irr * 100).toFixed(1)}%</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">MOIC</p>
                            <h4 className="text-2xl font-black text-slate-900 mt-1">{lbo.moic}x</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Debt Paydown</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{formatCurrency(lbo.totalDebtPaydown)}</h4>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Equity Exit</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{formatCurrency(lbo.exitEquity)}</h4>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-inner flex items-center justify-between">
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Multiplier</span>
                                <span className="text-xl font-black">{lbo.entryMultiple}x</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-700 pl-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exit Multiplier</span>
                                <span className="text-xl font-black text-emerald-400">{lbo.exitMultiple}x</span>
                            </div>
                        </div>
                        <Tornado className="h-10 w-10 text-emerald-500/20" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return null
}
