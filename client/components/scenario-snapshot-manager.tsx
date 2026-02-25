"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Save, Copy, History, Tag, Loader2, ArrowUpCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ScenarioSnapshot {
  id: string
  name: string
  description: string
  tag: "best-case" | "base-case" | "worst-case" | "custom"
  createdAt: string
  author: string
  version: number
  data: {
    revenue: number
    expenses: number
    runway: number
    cash: number
    burnRate: number
    arr: number
  }
}

const mockSnapshots: ScenarioSnapshot[] = [
  // ... (mock data removed for conciseness or kept if needed)
]

interface ScenarioSnapshotManagerProps {
  modelId?: string
  orgId?: string | null
}

export function ScenarioSnapshotManager({ modelId, orgId }: ScenarioSnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<ScenarioSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [promoteId, setPromoteId] = useState<string | null>(null)
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newSnapshot, setNewSnapshot] = useState({
    name: "",
    description: "",
    tag: "custom" as const,
  })

  useEffect(() => {
    if (modelId && orgId) {
      fetchSnapshots()
    }
  }, [modelId, orgId])

  const fetchSnapshots = async () => {
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

      const response = await fetch(`${API_BASE_URL}/models/${modelId}/scenarios?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.scenarios) {
          // Transform backend scenarios to snapshot format
          const transformed = result.scenarios
            .filter((s: any) => s.status === "done" && s.summary)
            .map((s: any) => {
              const summary = typeof s.summary === 'string' ? JSON.parse(s.summary) : (s.summary || {})
              return {
                id: s.id,
                name: s.scenarioName || s.name || "Unnamed Scenario",
                description: `Type: ${s.scenarioType || "adhoc"}`,
                tag: s.scenarioType === "optimistic" ? "best-case" :
                  s.scenarioType === "conservative" ? "worst-case" :
                    s.scenarioType === "baseline" ? "base-case" : "custom",
                createdAt: s.createdAt,
                author: "System",
                version: 1,
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
          setSnapshots(transformed)
        }
      }
    } catch (error) {
      console.error("Failed to fetch snapshots:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteScenario = async () => {
    if (!promoteId || !orgId) return

    setIsPromoting(true)
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(`${API_BASE_URL}/scenarios/${promoteId}/promote?org_id=${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Success! Model promoted to v${result.newVersion}. A new baseline run has been scheduled.`)
        setPromoteId(null)
      } else {
        throw new Error("Promotion failed")
      }
    } catch (error) {
      console.error("Promotion error:", error)
      toast.error("Failed to promote scenario to base model.")
    } finally {
      setIsPromoting(false)
    }
  }

  const handleSaveSnapshot = () => {
    if (!newSnapshot.name.trim()) {
      toast.error("Please enter a scenario name")
      return
    }

    const snapshot: ScenarioSnapshot = {
      id: `snap-${Date.now()}`,
      name: newSnapshot.name,
      description: newSnapshot.description,
      tag: newSnapshot.tag,
      createdAt: new Date().toISOString(),
      author: "Current User",
      version: 1,
      data: {
        revenue: 804000,
        expenses: 528000,
        runway: 13,
        cash: 6864000,
        burnRate: 44000,
        arr: 9648000,
      },
    }

    setSnapshots([snapshot, ...snapshots])
    setIsCreateDialogOpen(false)
    setNewSnapshot({ name: "", description: "", tag: "custom" })
    toast.success("Scenario saved successfully")
  }

  const handleCloneSnapshot = (snapshotId: string) => {
    const original = snapshots.find((s) => s.id === snapshotId)
    if (!original) return

    const cloned: ScenarioSnapshot = {
      ...original,
      id: `snap-${Date.now()}`,
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      version: original.version + 1,
    }

    setSnapshots([cloned, ...snapshots])
    toast.success("Scenario duplicated successfully")
  }

  const handleToggleSelection = (snapshotId: string) => {
    if (selectedSnapshots.includes(snapshotId)) {
      setSelectedSnapshots(selectedSnapshots.filter((id) => id !== snapshotId))
    } else {
      if (selectedSnapshots.length >= 3) {
        toast.error("You can compare up to 3 scenarios at once")
        return
      }
      setSelectedSnapshots([...selectedSnapshots, snapshotId])
    }
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "best-case":
        return "bg-green-100 text-green-800 border-green-300"
      case "base-case":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "worst-case":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getTagLabel = (tag: string) => {
    return tag
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="space-y-6">
      {/* Promotion Confirmation Dialog */}
      <AlertDialog open={promoteId !== null} onOpenChange={(open) => !open && setPromoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              Promote to Base Model?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will update the <strong>Base Model Assumptions</strong> with the overrides from this scenario.
              This action is permanent and will create a new model version in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePromoteScenario();
              }}
              disabled={isPromoting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPromoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Scenario Snapshots</h2>
          <p className="text-muted-foreground">Save, clone, and compare scenario versions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Save Current Scenario</DialogTitle>
                <DialogDescription>Create a snapshot of your current scenario configuration</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Scenario Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q4 Growth Plan"
                    value={newSnapshot.name}
                    onChange={(e) => setNewSnapshot({ ...newSnapshot, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this scenario..."
                    value={newSnapshot.description}
                    onChange={(e) => setNewSnapshot({ ...newSnapshot, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag">Scenario Tag</Label>
                  <Select
                    value={newSnapshot.tag}
                    onValueChange={(value: any) => setNewSnapshot({ ...newSnapshot, tag: value })}
                  >
                    <SelectTrigger id="tag">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best-case">Best Case</SelectItem>
                      <SelectItem value="base-case">Base Case</SelectItem>
                      <SelectItem value="worst-case">Worst Case</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSnapshot}>Save Snapshot</Button>
              </div>
            </DialogContent>
          </Dialog>

          {selectedSnapshots.length >= 2 && (
            <Button variant="outline" onClick={() => (window.location.href = "#comparison")}>
              Compare Selected ({selectedSnapshots.length})
            </Button>
          )}
        </div>
      </div>

      {/* Snapshots List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Scenarios</CardTitle>
          <CardDescription>Select up to 3 scenarios to compare</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !modelId || !orgId ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please select a model to view scenarios</p>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No scenarios found. Create scenarios in the Scenarios tab.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedSnapshots.includes(snapshot.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  onClick={() => handleToggleSelection(snapshot.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{snapshot.name}</h3>
                        <Badge className={getTagColor(snapshot.tag)} variant="outline">
                          <Tag className="mr-1 h-3 w-3" />
                          {getTagLabel(snapshot.tag)}
                        </Badge>
                        <Badge variant="secondary">v{snapshot.version}</Badge>
                        {snapshot.tag !== "base-case" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromoteId(snapshot.id);
                            }}
                          >
                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                            Promote
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{snapshot.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>By {snapshot.author}</span>
                        <span>•</span>
                        <span>{new Date(snapshot.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(snapshot.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloneSnapshot(snapshot.id)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.info("Version history coming soon")
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                      <div className="font-semibold">${(snapshot.data.revenue / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Expenses</div>
                      <div className="font-semibold">${(snapshot.data.expenses / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Runway</div>
                      <div className="font-semibold">{snapshot.data.runway} mo</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Cash</div>
                      <div className="font-semibold">${(snapshot.data.cash / 1000000).toFixed(2)}M</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Burn Rate</div>
                      <div className="font-semibold">${(snapshot.data.burnRate / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">ARR</div>
                      <div className="font-semibold">${(snapshot.data.arr / 1000000).toFixed(2)}M</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
