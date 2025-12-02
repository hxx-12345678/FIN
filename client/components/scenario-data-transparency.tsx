"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, CheckCircle, Info, Database, TrendingUp, TrendingDown } from "lucide-react"
import { Loader2 } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface DataTransparencyProps {
  modelId?: string
  orgId?: string | null
  scenarioId?: string
}

export function ScenarioDataTransparency({ modelId, orgId, scenarioId }: DataTransparencyProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orgId && modelId) {
      fetchTransparencyData()
    }
  }, [orgId, modelId, scenarioId])

  const fetchTransparencyData = async () => {
    if (!orgId || !modelId) return

    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem("auth-token") || document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) {
        setError("Authentication required")
        setLoading(false)
        return
      }

      // Fetch transactions
      const transactionsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/transactions?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      // Fetch model
      const modelResponse = await fetch(`${API_BASE_URL}/models/${modelId}?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      // Fetch scenario if provided
      let scenarioData = null
      if (scenarioId) {
        const scenarioResponse = await fetch(`${API_BASE_URL}/scenarios/${scenarioId}/comparison?org_id=${orgId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
        
        if (scenarioResponse.ok) {
          const scenarioResult = await scenarioResponse.json()
          scenarioData = scenarioResult.scenario
        }
      }

      if (transactionsResponse.ok && modelResponse.ok) {
        const transactionsResult = await transactionsResponse.json()
        const modelResult = await modelResponse.json()

        // Calculate actual data
        const transactions = transactionsResult.transactions || []
        const model = modelResult.model || {}
        const modelJson = model.modelJson || {}
        const assumptions = modelJson.assumptions || {}

        // Process transactions
        let totalRevenue = 0
        let totalExpenses = 0
        const monthlyRevenue: Record<string, number> = {}
        const monthlyExpenses: Record<string, number> = {}

        transactions.forEach((tx: any) => {
          const date = new Date(tx.date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const amount = parseFloat(tx.amount) || 0

          if (amount > 0) {
            totalRevenue += amount
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount
          } else {
            totalExpenses += Math.abs(amount)
            monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + Math.abs(amount)
          }
        })

        // Calculate averages and growth
        const revenueMonths = Object.keys(monthlyRevenue).sort()
        const expenseMonths = Object.keys(monthlyExpenses).sort()
        const avgMonthlyRevenue = revenueMonths.length > 0
          ? Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) / revenueMonths.length
          : 0
        const avgMonthlyExpenses = expenseMonths.length > 0
          ? Object.values(monthlyExpenses).reduce((a, b) => a + b, 0) / expenseMonths.length
          : 0

        // Calculate growth rates
        let revenueGrowth = 0
        if (revenueMonths.length >= 2) {
          const first = monthlyRevenue[revenueMonths[0]]
          const last = monthlyRevenue[revenueMonths[revenueMonths.length - 1]]
          if (first > 0) {
            revenueGrowth = Math.pow(last / first, 1 / (revenueMonths.length - 1)) - 1
          }
        }

        let expenseGrowth = 0
        if (expenseMonths.length >= 2) {
          const first = monthlyExpenses[expenseMonths[0]]
          const last = monthlyExpenses[expenseMonths[expenseMonths.length - 1]]
          if (first > 0) {
            expenseGrowth = Math.pow(last / first, 1 / (expenseMonths.length - 1)) - 1
          }
        }

        // Get latest month values (used as starting point)
        const latestRevenueMonth = revenueMonths.length > 0 ? revenueMonths[revenueMonths.length - 1] : null
        const latestExpenseMonth = expenseMonths.length > 0 ? expenseMonths[expenseMonths.length - 1] : null
        const latestRevenue = latestRevenueMonth ? monthlyRevenue[latestRevenueMonth] : avgMonthlyRevenue
        const latestExpenses = latestExpenseMonth ? monthlyExpenses[latestExpenseMonth] : avgMonthlyExpenses

        setData({
          transactions: {
            count: transactions.length,
            totalRevenue,
            totalExpenses,
            revenueMonths: revenueMonths.length,
            expenseMonths: expenseMonths.length,
          },
          baseline: {
            avgMonthlyRevenue,
            avgMonthlyExpenses,
            latestRevenue,
            latestExpenses,
            latestRevenueMonth,
            latestExpenseMonth,
            revenueGrowth,
            expenseGrowth,
          },
          assumptions: {
            initialCash: assumptions.cash?.initialCash || 500000,
            baselineRevenue: assumptions.revenue?.baselineRevenue || avgMonthlyRevenue,
            baselineExpenses: assumptions.costs?.baselineExpenses || avgMonthlyExpenses,
          },
          monthlyData: {
            revenue: monthlyRevenue,
            expenses: monthlyExpenses,
          },
          scenario: scenarioData,
        })
      }
    } catch (error) {
      console.error("Failed to fetch transparency data:", error)
      setError("Failed to load data sources")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p>{error || "No data available"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sources & Calculations
          </CardTitle>
          <CardDescription>
            Transparent view of all data sources and calculations used in scenario planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Raw Transaction Data */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Raw Transaction Data
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="text-2xl font-bold">{data.transactions.count}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">
                  ${data.transactions.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Expenses</div>
                <div className="text-2xl font-bold">
                  ${data.transactions.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Data Months</div>
                <div className="text-2xl font-bold">
                  {Math.max(data.transactions.revenueMonths, data.transactions.expenseMonths)}
                </div>
              </div>
            </div>
          </div>

          {/* Baseline Calculations */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Baseline Calculations
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Average Monthly Revenue</TableCell>
                  <TableCell>
                    ${data.baseline.avgMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Calculated from {data.transactions.revenueMonths} months</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Average Monthly Expenses</TableCell>
                  <TableCell>
                    ${data.baseline.avgMonthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Calculated from {data.transactions.expenseMonths} months</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Latest Month Revenue</TableCell>
                  <TableCell>
                    ${data.baseline.latestRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {data.baseline.latestRevenueMonth || 'N/A'} (Used as starting point)
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Latest Month Expenses</TableCell>
                  <TableCell>
                    ${data.baseline.latestExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {data.baseline.latestExpenseMonth || 'N/A'} (Used as starting point)
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Revenue Growth Rate</TableCell>
                  <TableCell>
                    {(data.baseline.revenueGrowth * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      Calculated from historical trend
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Expense Growth Rate</TableCell>
                  <TableCell>
                    {(data.baseline.expenseGrowth * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      Calculated from historical trend
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Monthly Breakdown */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-600" />
              Monthly Historical Data
            </h3>
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys({ ...data.monthlyData.revenue, ...data.monthlyData.expenses })
                    .sort()
                    .map((month) => (
                      <TableRow key={month}>
                        <TableCell className="font-medium">{month}</TableCell>
                        <TableCell className="text-right text-green-600">
                          ${(data.monthlyData.revenue[month] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ${(data.monthlyData.expenses[month] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          ${((data.monthlyData.revenue[month] || 0) - (data.monthlyData.expenses[month] || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Calculation Methodology */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Calculation Methodology</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Starting Point:</strong> Uses latest month's actual revenue/expenses (not average)</li>
              <li>• <strong>Projections:</strong> 12-month forward projection using compound growth</li>
              <li>• <strong>Growth Rates:</strong> Calculated from historical trend or scenario overrides</li>
              <li>• <strong>Annual Values:</strong> Sum of 12 monthly projections (not last month × 12)</li>
              <li>• <strong>Cash & Runway:</strong> Calculated month-by-month with cumulative cash balance</li>
              <li>• <strong>Scenario Overrides:</strong> Applied to growth rates, replacing historical calculations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

