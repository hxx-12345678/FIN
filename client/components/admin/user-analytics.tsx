"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Download } from "lucide-react"
import { useAdminAccess } from "@/hooks/use-admin-access"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export function UserAnalytics() {
  const { isAdmin, loading: accessLoading } = useAdminAccess()
  const [analytics, setAnalytics] = useState<any>(null)
  const [funnel, setFunnel] = useState<any[]>([])
  const [retention, setRetention] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && !accessLoading) {
      fetchData()
    }
  }, [isAdmin, accessLoading])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [analyticsRes, funnelRes, retentionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users/analytics`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/admin/users/conversion-funnel`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/admin/users/retention`, { credentials: "include" }),
      ])

      const [analyticsData, funnelData, retentionData] = await Promise.all([
        analyticsRes.ok ? analyticsRes.json() : { users: [] },
        funnelRes.ok ? funnelRes.json() : { funnel: [] },
        retentionRes.ok ? retentionRes.json() : { retention: [] },
      ])

      setAnalytics(analyticsData)
      setFunnel(funnelData.funnel || [])
      setRetention(retentionData.retention || [])
    } catch (err) {
      console.error("Failed to load analytics", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (accessLoading || isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!isAdmin) {
    return <div>Admin access required</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Analytics</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250} className="min-h-[250px] sm:min-h-[300px]">
            <LineChart data={retention}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="retention" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}


