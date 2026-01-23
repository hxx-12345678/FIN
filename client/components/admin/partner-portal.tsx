"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2 } from "lucide-react"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { API_BASE_URL } from "@/lib/api-config"

export function PartnerPortal() {
  const { isAdmin, loading: accessLoading } = useAdminAccess()
  const [partners, setPartners] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && !accessLoading) {
      fetchPartners()
    }
  }, [isAdmin, accessLoading])

  const fetchPartners = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/partners`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
      }
    } catch (err) {
      console.error("Failed to load partners", err)
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
      <h1 className="text-2xl font-bold">Partner Portal</h1>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>Manage partner accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Revenue Share</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>{partner.name}</TableCell>
                  <TableCell>{partner.clientCount || 0}</TableCell>
                  <TableCell>{partner.revenueShare || "0%"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


