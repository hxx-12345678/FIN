"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Play, RotateCcw, Download, Upload } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

const preconfiguredScenarios = [
  { id: "saas-growth", name: "SaaS Growth" },
  { id: "ecommerce", name: "E-commerce" },
  { id: "services", name: "Services" },
]

export function DemoScenarioBuilder() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingScenario, setIsLoadingScenario] = useState(false)

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/demo/scenarios`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setScenarios(data.scenarios || [])
      }
    } catch (err) {
      console.error("Failed to load scenarios", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadScenario = async (scenarioId: string) => {
    setIsLoadingScenario(true)
    try {
      const response = await fetch(`${API_BASE_URL}/demo/load-scenario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ scenarioId }),
      })

      if (response.ok) {
        toast.success("Scenario loaded successfully")
        window.location.reload()
      } else {
        toast.error("Failed to load scenario")
      }
    } catch (err) {
      toast.error("Failed to load scenario")
    } finally {
      setIsLoadingScenario(false)
    }
  }

  const handleReset = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/demo/reset`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Demo reset successfully")
        window.location.reload()
      } else {
        toast.error("Failed to reset demo")
      }
    } catch (err) {
      toast.error("Failed to reset demo")
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Demo Scenario Builder</h1>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Demo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pre-configured Scenarios</CardTitle>
          <CardDescription>Load a ready-made demo scenario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {preconfiguredScenarios.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:border-primary">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{scenario.name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleLoadScenario(scenario.id)}
                    disabled={isLoadingScenario}
                  >
                    {isLoadingScenario ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Load Scenario
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{scenario.name}</h4>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadScenario(scenario.id)}
                    disabled={isLoadingScenario}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


