"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, DollarSign, ArrowUpRight, Activity, Cpu, Layers, MousePointer2 } from "lucide-react"

export function SimulatorWidget() {
  const [growth, setGrowth] = useState(15)
  const [churn, setChurn] = useState(3)
  const [arpu, setArpu] = useState(150)
  const [volatility, setVolatility] = useState(5)
  const [agentStatus, setAgentStatus] = useState("Optimizing")
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering client-side values after mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  const data = useMemo(() => {
    let currentMrr = 50000
    const result = []
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    for (let i = 0; i < 12; i++) {
      // Add volatility noise (deterministic for hydration)
      const noise = Math.sin(i * 1.3) * (volatility / 5) * 2000
      result.push({
        name: months[i],
        mrr: Math.max(0, Math.round(currentMrr + noise)),
      })
      
      const netGrowth = (growth - churn) / 100
      currentMrr = currentMrr * (1 + netGrowth)
    }
    return result
  }, [growth, churn, volatility])

  const finalMrr = data[data.length - 1].mrr
  const initialMrr = data[0].mrr
  const totalGrowth = ((finalMrr - initialMrr) / initialMrr) * 100

  // Standardize number formatting for consistency
  const formatCurrency = (val: number) => {
    if (!mounted) return val.toString(); // Fallback for SSR
    return val.toLocaleString("en-US");
  }

  return (
    <div className="w-full bg-[#0B0E14] rounded-[40px] border border-white/5 shadow-3xl overflow-hidden flex flex-col lg:flex-row text-left backdrop-blur-3xl">
      {/* Controls */}
      <div className="lg:w-1/3 p-10 border-b lg:border-b-0 lg:border-r border-white/5 bg-white/[0.02]">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-black text-white text-sm uppercase tracking-widest">Simulator</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-0.5">Live</span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Growth</Label>
                <span className="text-xs font-black text-white">{growth}%</span>
              </div>
              <Slider 
                value={[growth]} 
                onValueChange={(v) => {
                  setGrowth(v[0]);
                  setAgentStatus("Re-Forecasting");
                  setTimeout(() => setAgentStatus("Optimizing"), 1000);
                }} 
                max={50} 
                step={1}
                className="hover:cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Volatility</Label>
                <span className="text-xs font-black text-rose-500">{volatility}%</span>
              </div>
              <Slider 
                value={[volatility]} 
                onValueChange={(v) => {
                  setVolatility(v[0]);
                  setAgentStatus("Detecting Risk");
                  setTimeout(() => setAgentStatus("Optimizing"), 1000);
                }} 
                max={25} 
                step={1}
                className="hover:cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing (ARPU)</Label>
                <span className="text-xs font-black text-cyan-400">${arpu}</span>
              </div>
              <Slider 
                value={[arpu]} 
                onValueChange={(v) => setArpu(v[0])} 
                min={50}
                max={1000} 
                step={10}
                className="hover:cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent State</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                agentStatus === "Optimizing" ? "text-emerald-500" : "text-amber-500"
              }`}>{agentStatus}...</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[8px] text-slate-500 mb-1 uppercase font-black tracking-widest leading-none">Net Change</p>
                <p className={`text-sm font-black ${growth - churn > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {Math.round((growth - churn) * 10) / 10}%
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-[8px] text-slate-500 mb-1 uppercase font-black tracking-widest leading-none">Confidence</p>
                <p className="text-sm font-black text-white">94.2%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-10 bg-transparent relative">
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 leading-none">PROJECTED CASH POSITION (12M)</h4>
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black text-white tracking-tighter">
                ${formatCurrency(finalMrr)}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
                <ArrowUpRight className="w-3 h-3" />
                {totalGrowth.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="p-2 border border-white/5 rounded-xl flex items-center gap-2 bg-white/[0.02]">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SaaS Architecture</span>
             </div>
          </div>
        </div>

        <div className="h-[340px] w-full relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900}}
                dy={12}
              />
              <YAxis 
                hide 
                domain={['dataMin - 10000', 'dataMax + 10000']}
              />
              <Tooltip 
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
                  padding: '16px',
                  backgroundColor: '#0B0E14',
                  backdropFilter: 'blur(20px)'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                formatter={(value: number) => [`$${formatCurrency(value)}`, 'NET CASH']}
              />
              <Area 
                type="monotone" 
                dataKey="mrr" 
                stroke="#10b981" 
                strokeWidth={5}
                fillOpacity={1} 
                fill="url(#colorMrr)" 
                animationDuration={1500}
                activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981', filter: 'url(#glow)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Scale Node</p>
              <p className="text-sm font-black text-white">+{Math.round(finalMrr / arpu - initialMrr / arpu)} Unit/mo</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
              <MousePointer2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Asset LTV</p>
              <p className="text-sm font-black text-white">${formatCurrency(Math.round(arpu / (churn / 100)))}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group text-shadow-glow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none mb-1">Forecast Integrity</p>
              <p className="text-sm font-black text-white">Industrial Grade</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


