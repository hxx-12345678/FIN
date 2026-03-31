"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ValuationRange {
  name: string
  low: number
  high: number
  color?: string
}

interface FootballFieldProps {
  ranges: ValuationRange[]
  currentPrice?: number
  currency?: string
}

export function FootballFieldChart({ ranges, currentPrice, currency = "$" }: FootballFieldProps) {
  // Sort ranges by high value for better visualization
  const sortedRanges = [...ranges].sort((a, b) => b.high - a.high)

  // Filter out invalid ranges
  const validRanges = sortedRanges.filter(r => r.high > r.low && r.low >= 0)

  // Recharts Bar chart "waterfall" trick:
  // We use a stacked bar where the first bar is invisible (transparent) 
  // and its height is the 'low' value. 
  // The second bar is the 'range' (high - low).
  const data = validRanges.map((r) => ({
    name: r.name,
    base: r.low,
    range: r.high - r.low,
    low: r.low,
    high: r.high,
    color: r.color || "#6366f1"
  }))

  const formatCurrency = (val: number) => {
    return `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className="w-full h-full min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 20, right: 60, left: 100, bottom: 20 }}
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.2} />
          <XAxis 
            type="number" 
            domain={['dataMin - 10', 'auto']} 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={formatCurrency}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }}
            width={90}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as any
                return (
                  <div className="bg-white p-3 border rounded-xl shadow-2xl">
                    <p className="text-xs font-black text-slate-900 mb-2 uppercase">{item.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-8 text-[10px]">
                        <span className="text-slate-400 font-bold">LOW</span>
                        <span className="font-black text-rose-600">{formatCurrency(item.low)}</span>
                      </div>
                      <div className="flex justify-between gap-8 text-[10px]">
                        <span className="text-slate-400 font-bold">HIGH</span>
                        <span className="font-black text-emerald-600">{formatCurrency(item.high)}</span>
                      </div>
                      <div className="pt-2 border-t mt-1">
                        <div className="flex justify-between gap-8 text-[10px]">
                          <span className="text-slate-500 font-bold">SPREAD</span>
                          <span className="font-black text-slate-900">{formatCurrency(item.range)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="valuation" fill="transparent" />
          
          {/* Visible range bar */}
          <Bar dataKey="range" stackId="valuation" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
            <LabelList 
              dataKey="high" 
              position="right" 
              formatter={(val: any) => formatCurrency(Number(val))} 
              style={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} 
              offset={10}
            />
          </Bar>

          {/* Current Price Reference Line (Marker) */}
          {currentPrice !== undefined && (
            <ReferenceLine 
              x={currentPrice} 
              stroke="#0f172a" 
              strokeWidth={2} 
              strokeDasharray="4 4"
              label={{ position: 'top', value: 'Current', fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }}
            />
          )}

        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
