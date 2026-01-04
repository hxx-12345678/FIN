"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Minus, Download, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface ComparisonData {
  id: string
  name: string
  tag: string
  data: {
    revenue: number
    expenses: number
    runway: number
    cash: number
    burnRate: number
    arr: number
  }
}

const mockComparisons: ComparisonData[] = [
  {
    id: "snap-1",
    name: "Q3 Base Forecast",
    tag: "base-case",
    data: {
      revenue: 804000,
      expenses: 528000,
      runway: 13,
      cash: 6864000,
      burnRate: 44000,
      arr: 9648000,
    },
  },
  {
    id: "snap-2",
    name: "Aggressive Hiring Plan",
    tag: "best-case",
    data: {
      revenue: 950000,
      expenses: 720000,
      runway: 9,
      cash: 6480000,
      burnRate: 60000,
      arr: 11400000,
    },
  },
  {
    id: "snap-3",
    name: "Market Downturn Scenario",
    tag: "worst-case",
    data: {
      revenue: 600000,
      expenses: 450000,
      runway: 11,
      cash: 4950000,
      burnRate: 37500,
      arr: 7200000,
    },
  },
]

// Monthly data will be generated from scenario summaries if available

interface ScenarioComparisonViewProps {
  modelId?: string
  orgId?: string | null
  scenarios?: any[]
}

export function ScenarioComparisonView({ modelId, orgId, scenarios: propScenarios }: ScenarioComparisonViewProps) {
  const [scenarios, setScenarios] = useState<ComparisonData[]>([])
  const [baseScenario, setBaseScenario] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState<any>(null)

  useEffect(() => {
    if (propScenarios && propScenarios.length > 0) {
      // Transform scenarios from props
      const transformed = propScenarios
        .filter((s: any) => s.status === "done" && s.summary)
        .map((s: any) => {
          const summary = typeof s.summary === 'string' ? JSON.parse(s.summary) : (s.summary || {})
          return {
            id: s.id,
            name: s.scenarioName || s.name || "Unnamed Scenario",
            tag: s.scenarioType || "adhoc",
            data: {
              revenue: summary.totalRevenue || summary.revenue || summary.mrr || 0,
              expenses: summary.totalExpenses || summary.expenses || 0,
              runway: (() => {
                const burnRate = summary.burnRate || summary.monthlyBurnRate || 0;
                const runway = summary.runwayMonths || summary.runway || 0;
                // If burn rate is negative (profitable), runway is infinite
                if (burnRate < 0) return 999;
                return runway;
              })(),
              cash: summary.cashBalance || summary.cash || 0,
              burnRate: summary.burnRate || summary.monthlyBurnRate || 0,
              arr: summary.arr || (summary.mrr || summary.revenue || 0) * 12,
  },
          }
        })
      setScenarios(transformed)
      if (transformed.length > 0) {
        setBaseScenario(transformed[0].id)
      }
    } else if (modelId && orgId) {
      fetchScenarios()
    }
  }, [modelId, orgId, propScenarios])

  const fetchScenarios = async () => {
    if (!modelId || !orgId) return

    setLoading(true)
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/models/${modelId}/snapshots?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.snapshots) {
          const transformed = result.snapshots
            .filter((s: any) => s.status === "done" && s.summary)
            .map((s: any) => {
              const summary = s.summary || {}
              return {
                id: s.id,
                name: s.scenarioName || "Unnamed Scenario",
                tag: s.scenarioType || "adhoc",
                data: {
                  revenue: summary.totalRevenue || summary.revenue || summary.mrr || 0,
                  expenses: summary.totalExpenses || summary.expenses || 0,
                  runway: (() => {
                    const burnRate = summary.burnRate || summary.monthlyBurnRate || 0;
                    const runway = summary.runwayMonths || summary.runway || 0;
                    // If burn rate is negative (profitable), runway is infinite
                    if (burnRate < 0) return 999;
                    return runway;
                  })(),
                  cash: summary.cashBalance || summary.cash || 0,
                  burnRate: summary.burnRate || summary.monthlyBurnRate || 0,
                  arr: summary.arr || (summary.mrr || summary.revenue || 0) * 12,
  },
              }
            })
          setScenarios(transformed)
          if (transformed.length > 0) {
            setBaseScenario(transformed[0].id)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch scenarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDelta = (value1: number, value2: number) => {
    const delta = value1 - value2
    const percentage = ((delta / value2) * 100).toFixed(1)
    return { delta, percentage }
  }

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />
    if (delta < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getDeltaColor = (delta: number, isPositiveGood = true) => {
    if (delta === 0) return "text-gray-600"
    if (isPositiveGood) {
      return delta > 0 ? "text-green-600" : "text-red-600"
    } else {
      return delta > 0 ? "text-red-600" : "text-green-600"
    }
  }

  const handleExportComparison = async () => {
    if (!baseScenario || !orgId) {
      toast.error("Please select a base scenario")
      return
    }

    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        toast.error("Authentication required")
        return
      }

      // Get comparison data
      const response = await fetch(`${API_BASE_URL}/scenarios/${baseScenario}/comparison?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        setComparisonData(result)
        toast.success("Comparison data loaded. Export functionality coming soon.")
      } else {
        throw new Error("Failed to fetch comparison")
      }
    } catch (error) {
      console.error("Failed to export comparison:", error)
      toast.error("Failed to export comparison")
    }
  }

  const base = scenarios.find((s) => s.id === baseScenario)

  // Generate monthly data from scenarios if available
  const generateMonthlyData = () => {
    if (scenarios.length === 0) return []
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlyData: any[] = []
    
    // Generate 6 months of data based on scenario projections
    for (let i = 0; i < 6; i++) {
      const monthData: any = { month: monthNames[i] }
      
      scenarios.forEach((scenario) => {
        const monthlyRevenue = scenario.data.revenue / 12
        const monthlyExpenses = scenario.data.expenses / 12
        const growthFactor = 1.02 // 2% monthly growth
        
        monthData[`${scenario.id}_revenue`] = monthlyRevenue * Math.pow(growthFactor, i)
        monthData[`${scenario.id}_cash`] = scenario.data.cash - (monthlyExpenses * i)
      })
      
      monthlyData.push(monthData)
    }
    
    return monthlyData
  }

  const monthlyData = generateMonthlyData()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!modelId || !orgId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>Please select a model to view scenario comparisons</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No completed scenarios found. Create and run scenarios to see comparisons here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Scenario Comparison</h2>
          <p className="text-sm md:text-base text-muted-foreground">Side-by-side analysis of selected scenarios</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={baseScenario} onValueChange={setBaseScenario}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select base scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        <Button onClick={handleExportComparison} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Export to PDF</span>
          <span className="sm:hidden">Export</span>
        </Button>
        </div>
      </div>

      {/* Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Comparison</CardTitle>
            <CardDescription>Monthly revenue projections across scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
                  {scenarios.map((scenario, index) => {
                    const colors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6"]
                    return (
                      <Line
                        key={scenario.id}
                        type="monotone"
                        dataKey={`${scenario.id}_revenue`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={scenario.name}
                      />
                    )
                  })}
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                <p>No monthly data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Position Comparison</CardTitle>
            <CardDescription>Cash runway across different scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${(Number(value) / 1000000).toFixed(2)}M`} />
                <Legend />
                  {scenarios.map((scenario, index) => {
                    const colors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6"]
                    return (
                      <Line
                        key={scenario.id}
                        type="monotone"
                        dataKey={`${scenario.id}_cash`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={scenario.name}
                      />
                    )
                  })}
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm px-4 text-center">
                <p>No monthly data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delta Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Delta Summary</CardTitle>
          <CardDescription>Percentage and absolute differences compared to base scenario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Runway</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Burn Rate</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario) => {
                  const isBase = scenario.id === baseScenario
                  const revenueDelta = base ? calculateDelta(scenario.data.revenue, base.data.revenue) : null
                  const expensesDelta = base ? calculateDelta(scenario.data.expenses, base.data.expenses) : null
                  const runwayDelta = base ? calculateDelta(scenario.data.runway, base.data.runway) : null
                  const cashDelta = base ? calculateDelta(scenario.data.cash, base.data.cash) : null
                  const burnDelta = base ? calculateDelta(scenario.data.burnRate, base.data.burnRate) : null
                  const arrDelta = base ? calculateDelta(scenario.data.arr, base.data.arr) : null

                  return (
                    <TableRow key={scenario.id} className={isBase ? "bg-muted/50" : ""}>
                      <TableCell className="font-medium">
                        {scenario.name}
                        {isBase && (
                          <Badge variant="secondary" className="ml-2">
                            Base
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{scenario.tag}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>${(scenario.data.revenue / 1000).toFixed(0)}K</div>
                        {!isBase && revenueDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(revenueDelta.delta)}`}
                          >
                            {getDeltaIcon(revenueDelta.delta)}
                            {revenueDelta.percentage}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>${(scenario.data.expenses / 1000).toFixed(0)}K</div>
                        {!isBase && expensesDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(expensesDelta.delta, false)}`}
                          >
                            {getDeltaIcon(expensesDelta.delta)}
                            {expensesDelta.percentage}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{scenario.data.runway} mo</div>
                        {!isBase && runwayDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(runwayDelta.delta)}`}
                          >
                            {getDeltaIcon(runwayDelta.delta)}
                            {runwayDelta.delta > 0 ? "+" : ""}
                            {runwayDelta.delta.toFixed(0)} mo
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>${(scenario.data.cash / 1000000).toFixed(2)}M</div>
                        {!isBase && cashDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(cashDelta.delta)}`}
                          >
                            {getDeltaIcon(cashDelta.delta)}
                            {cashDelta.percentage}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>${(scenario.data.burnRate / 1000).toFixed(0)}K</div>
                        {!isBase && burnDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(burnDelta.delta, false)}`}
                          >
                            {getDeltaIcon(burnDelta.delta)}
                            {burnDelta.percentage}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>${(scenario.data.arr / 1000000).toFixed(2)}M</div>
                        {!isBase && arrDelta && (
                          <div
                            className={`text-xs flex items-center justify-end gap-1 ${getDeltaColor(arrDelta.delta)}`}
                          >
                            {getDeltaIcon(arrDelta.delta)}
                            {arrDelta.percentage}%
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Comparative analysis highlights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Best Performer</span>
              </div>
              <p className="text-sm text-green-700">
                Aggressive Hiring Plan shows +18% revenue growth but reduces runway by 4 months
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Most Balanced</span>
              </div>
              <p className="text-sm text-blue-700">
                Base Case maintains healthy 13-month runway with steady growth trajectory
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Risk Scenario</span>
              </div>
              <p className="text-sm text-red-700">
                Market Downturn shows -25% revenue impact but maintains 11-month runway
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
