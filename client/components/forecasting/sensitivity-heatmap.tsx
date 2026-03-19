"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useOrg } from "@/lib/org-context"

interface HeatmapCell {
  x_bin: number
  y_bin: number
  avg_outcome: number
  count: number
  x_range: [number, number]
  y_range: [number, number]
}

interface BivariateData {
  driver_x: string
  driver_y: string
  bins_x: number[]
  bins_y: number[]
  heatmap: HeatmapCell[]
  baseline_outcome: number
}

interface SensitivityHeatmapProps {
  data?: BivariateData
}

export function SensitivityHeatmap({ data }: SensitivityHeatmapProps) {
  const { formatCurrency } = useOrg()

  const grid = useMemo(() => {
    if (!data || !data.heatmap) return null
    
    const rows = data.bins_y.length - 1
    const cols = data.bins_x.length - 1
    const matrix: (HeatmapCell | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null))
    
    data.heatmap.forEach(cell => {
      if (cell.y_bin < rows && cell.x_bin < cols) {
        matrix[cell.y_bin][cell.x_bin] = cell
      }
    })
    
    return matrix
  }, [data])

  if (!data || !grid) {
    return null
  }

  // Color mapping: interpolate between red (negative delta), white (base), and green (positive delta)
  const getCellColor = (value: number, baseline: number) => {
    if (value === 0) return "rgba(200, 200, 200, 0.1)"
    const delta = ((value - baseline) / baseline) * 100
    // Limit delta for color contrast
    const normalizedDelta = Math.max(-30, Math.min(30, delta))
    
    if (normalizedDelta < 0) {
      const intensity = Math.abs(normalizedDelta) / 30
      return `rgba(239, 68, 68, ${0.1 + intensity * 0.8})` // Red
    } else {
      const intensity = normalizedDelta / 30
      return `rgba(34, 197, 94, ${0.1 + intensity * 0.8})` // Green
    }
  }

  const getTextColor = (value: number, baseline: number) => {
    if (value === 0) return "text-muted-foreground"
    const delta = ((value - baseline) / baseline) * 100
    return Math.abs(delta) > 15 ? "text-white" : "text-slate-900 dark:text-slate-100"
  }

  const formatBinValue = (val: number, driverName: string) => {
    if (driverName.toLowerCase().includes('rate') || driverName.toLowerCase().includes('growth') || driverName.toLowerCase().includes('churn')) {
      return `${val.toFixed(1)}%`
    }
    if (val > 1000) return `$${(val / 1000).toFixed(1)}K`
    return val.toFixed(1)
  }

  return (
    <Card className="overflow-hidden border-2 border-primary/10 shadow-xl bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Bivariate Sensitivity Analysis
        </CardTitle>
        <CardDescription>
          Impact of <strong>{data.driver_x}</strong> and <strong>{data.driver_y}</strong> interaction on final cash balance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 overflow-x-auto">
        <div className="min-w-[700px] p-4">
          <div className="relative">
            {/* Y-Axis Label */}
            <div className="absolute -left-16 top-1/2 -rotate-90 origin-center text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              {data.driver_y}
            </div>

            {/* X-Axis Label */}
            <div className="text-center mb-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {data.driver_x}
            </div>

            <div className="grid gap-1" style={{ gridTemplateColumns: `4rem repeat(${data.bins_x.length - 1}, 1fr)` }}>
              {/* Top empty corner */}
              <div />
              
              {/* X-Axis headers */}
              {data.bins_x.slice(0, -1).map((val, i) => (
                <div key={`col-${i}`} className="text-[10px] font-bold text-center text-muted-foreground p-1">
                  {formatBinValue(val, data.driver_x)}
                </div>
              ))}

              {/* Rows (reversed to have high values at top) */}
              {[...grid].reverse().map((row, revRowIndex) => {
                const rowIndex = grid.length - 1 - revRowIndex
                const yVal = data.bins_y[rowIndex]
                
                return (
                  <div key={`row-${rowIndex}`} className="contents">
                    {/* Y-Axis header */}
                    <div className="text-[10px] font-bold flex items-center justify-end pr-3 text-muted-foreground">
                      {formatBinValue(yVal, data.driver_y)}
                    </div>

                    {/* Grid Cells */}
                    {row.map((cell, colIndex) => {
                      if (!cell) return <div key={`empty-${colIndex}`} className="h-14 bg-muted/20 rounded-sm" />
                      
                      const value = cell.avg_outcome
                      const delta = ((value - data.baseline_outcome) / data.baseline_outcome) * 100
                      
                      return (
                        <TooltipProvider key={`cell-${rowIndex}-${colIndex}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`h-14 w-full flex flex-col items-center justify-center rounded-sm transition-all hover:scale-110 hover:z-10 hover:shadow-lg cursor-pointer ${getTextColor(value, data.baseline_outcome)}`}
                                style={{ backgroundColor: getCellColor(value, data.baseline_outcome) }}
                              >
                                <span className="text-[10px] font-black">
                                  {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
                                </span>
                                <span className="text-[8px] opacity-70">
                                  n={cell.count}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-4 glassmorphism backdrop-blur-md border-primary/20 shadow-2xl z-50">
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-muted-foreground">{data.driver_x}</p>
                                  <p className="text-xs font-bold">{formatBinValue(cell.x_range[0], data.driver_x)} — {formatBinValue(cell.x_range[1], data.driver_x)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-muted-foreground">{data.driver_y}</p>
                                  <p className="text-xs font-bold">{formatBinValue(cell.y_range[0], data.driver_y)} — {formatBinValue(cell.y_range[1], data.driver_y)}</p>
                                </div>
                                <div className="h-px bg-primary/20 my-2" />
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-primary">Expected Outcome</p>
                                  <p className="text-sm font-black">
                                    {formatCurrency(value)}
                                  </p>
                                  <p className={`text-xs font-bold flex items-center gap-1 ${delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    Variance: {delta > 0 ? "+" : ""}{delta.toFixed(1)}% 
                                    <span className="text-[10px] text-muted-foreground font-normal">vs median</span>
                                  </p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>Downside Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-400" />
              <span>Baseline Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Upside Potential</span>
            </div>
          </div>
          
          <div className="mt-8 p-5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4C20.66 17.73 21 17 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
              Industrial Insight Engine
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analyzing the correlation matrix between <strong>{data.driver_x}</strong> and <strong>{data.driver_y}</strong>. 
              The heatmap reveals high-sensitivity zones where concurrent shifts in both dimensions create 
              nonlinear impacts on capital runway. Strategic focus should be on the bottom-left quadrant failures.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
