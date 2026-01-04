"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { API_BASE_URL } from "@/lib/api-config"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function BoardSnapshotPage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<any>(null)

  useEffect(() => {
    const fetchSnapshot = async () => {
      if (!token) {
        setError("Invalid snapshot token")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/public/snapshots/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || errorData.message || "Snapshot not found")
        }

        const result = await response.json()
        if (result.ok && result.data) {
          setSnapshot(result.data)
        } else {
          throw new Error("Invalid snapshot data")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load snapshot"
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchSnapshot()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Snapshot not found or expired"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const results = snapshot.results || []
  const paramsData = snapshot.params || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">{snapshot.name || "Board Snapshot"}</h1>
          <p className="text-muted-foreground">{snapshot.orgName}</p>
          <p className="text-sm text-muted-foreground">
            Created: {new Date(snapshot.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.length > 0 
                  ? `$${(results[results.length - 1]?.revenue || 0).toLocaleString()}`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.length > 0 
                  ? (results[results.length - 1]?.customers || 0).toLocaleString()
                  : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cash Runway</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.length > 0 
                  ? `${Math.round(results[results.length - 1]?.runway || 0)} months`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (results[results.length - 1]?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {results.length > 0 
                  ? `$${(results[results.length - 1]?.netIncome || 0).toLocaleString()}`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Projection</CardTitle>
                <CardDescription>12-month revenue simulation</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Customer acquisition and churn</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="customers"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Total Customers"
                    />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="New Customers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Runway</CardTitle>
                <CardDescription>Runway projection based on burn rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} months`, ""]} />
                    <Bar dataKey="runway" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unit Economics</CardTitle>
                <CardDescription>Key financial ratios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV:CAC Ratio</span>
                    <span className="font-semibold">
                      {paramsData.customerLifetimeValue && paramsData.customerAcquisitionCost
                        ? (paramsData.customerLifetimeValue / paramsData.customerAcquisitionCost).toFixed(1)
                        : "N/A"}
                      :1
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payback Period</span>
                    <span className="font-semibold">
                      {paramsData.customerAcquisitionCost && paramsData.pricingTier
                        ? `${Math.round(paramsData.customerAcquisitionCost / paramsData.pricingTier)} months`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Churn</span>
                    <span className="font-semibold">{paramsData.churnRate || "N/A"}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Simulation Parameters</CardTitle>
            <CardDescription>Parameters used for this snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Growth Rate:</span>
                <span className="ml-2 font-medium">{paramsData.monthlyGrowthRate || "N/A"}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">CAC:</span>
                <span className="ml-2 font-medium">${paramsData.customerAcquisitionCost || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">LTV:</span>
                <span className="ml-2 font-medium">${paramsData.customerLifetimeValue || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Churn Rate:</span>
                <span className="ml-2 font-medium">{paramsData.churnRate || "N/A"}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pricing Tier:</span>
                <span className="ml-2 font-medium">${paramsData.pricingTier || "N/A"}/mo</span>
              </div>
              <div>
                <span className="text-muted-foreground">Team Size:</span>
                <span className="ml-2 font-medium">{paramsData.teamSize || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marketing Spend:</span>
                <span className="ml-2 font-medium">${paramsData.marketingSpend || "N/A"}/mo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



