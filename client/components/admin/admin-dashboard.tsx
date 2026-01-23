"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Users, Building2, Activity, AlertCircle, TrendingUp, Settings } from "lucide-react"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { API_BASE_URL } from "@/lib/api-config"

interface SystemMetrics {
  totalUsers: number
  activeOrgs: number
  jobsRunning: number
  systemHealth: "healthy" | "degraded" | "down"
}

export function AdminDashboard() {
  const { isAdmin, loading: accessLoading } = useAdminAccess()
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [userActivity, setUserActivity] = useState<any[]>([])
  const [orgGrowth, setOrgGrowth] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin && !accessLoading) {
      fetchData()
    }
  }, [isAdmin, accessLoading])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [metricsRes, activityRes, growthRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/metrics`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/admin/users/activity`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/admin/orgs/growth`, { credentials: "include" }),
      ])

      if (!metricsRes.ok) {
        throw new Error("Failed to load metrics")
      }

      const [metricsData, activityData, growthData] = await Promise.all([
        metricsRes.json(),
        activityRes.ok ? activityRes.json() : { activity: [] },
        growthRes.ok ? growthRes.json() : { growth: [] },
      ])

      setMetrics(metricsData.metrics || metricsData)
      setUserActivity(activityData.activity || [])
      setOrgGrowth(growthData.growth || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load system metrics.")
    } finally {
      setIsLoading(false)
    }
  }

  if (accessLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Admin access required.</AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System-wide metrics and monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orgs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeOrgs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Running</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.jobsRunning || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics?.systemHealth || "unknown"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
              <LineChart data={userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
              <BarChart data={orgGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="newOrgs" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


