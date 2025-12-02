"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ZoomIn, ZoomOut, Maximize2, Filter, Database, Brain, Calculator, FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GraphNode {
  id: string
  label: string
  type: "source" | "calculation" | "ai" | "output"
  x: number
  y: number
  data?: {
    confidence?: number
    lastUpdated?: string
    description?: string
  }
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: "direct" | "derived" | "inferred"
}

interface ProvenanceLineageGraphProps {
  nodes?: GraphNode[]
  edges?: GraphEdge[]
  onNodeClick?: (nodeId: string) => void
}

const DEFAULT_NODES: GraphNode[] = [
  {
    id: "source_1",
    label: "Transaction Data",
    type: "source",
    x: 100,
    y: 100,
    data: { lastUpdated: "2 hours ago", description: "Raw transaction data from QuickBooks integration" },
  },
  {
    id: "calc_1",
    label: "Revenue Calculation",
    type: "calculation",
    x: 300,
    y: 100,
    data: { confidence: 0.95, description: "Sum of all revenue transactions" },
  },
  {
    id: "ai_1",
    label: "AI Forecast",
    type: "ai",
    x: 500,
    y: 100,
    data: { confidence: 0.88, description: "AI-generated revenue forecast for next quarter" },
  },
  {
    id: "output_1",
    label: "P&L Statement",
    type: "output",
    x: 700,
    y: 100,
    data: { lastUpdated: "1 hour ago", description: "Final P&L statement output" },
  },
  {
    id: "source_2",
    label: "Expense Data",
    type: "source",
    x: 100,
    y: 200,
    data: { lastUpdated: "3 hours ago", description: "Expense transactions from CSV import" },
  },
  {
    id: "calc_2",
    label: "Expense Sum",
    type: "calculation",
    x: 300,
    y: 200,
    data: { confidence: 0.92, description: "Total expenses calculation" },
  },
]

const DEFAULT_EDGES: GraphEdge[] = [
  { id: "e1", source: "source_1", target: "calc_1", type: "direct" },
  { id: "e2", source: "calc_1", target: "ai_1", type: "derived" },
  { id: "e3", source: "ai_1", target: "output_1", type: "direct" },
  { id: "e4", source: "source_2", target: "calc_2", type: "direct" },
  { id: "e5", source: "calc_2", target: "output_1", type: "direct" },
]

export function ProvenanceLineageGraph({
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  onNodeClick,
}: ProvenanceLineageGraphProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const filteredNodes =
    sourceTypeFilter === "all"
      ? nodes
      : nodes.filter((node) => {
          if (sourceTypeFilter === "source") return node.type === "source"
          if (sourceTypeFilter === "calculation") return node.type === "calculation"
          if (sourceTypeFilter === "ai") return node.type === "ai"
          if (sourceTypeFilter === "output") return node.type === "output"
          return true
        })

  const filteredEdges = edges.filter(
    (edge) =>
      filteredNodes.some((n) => n.id === edge.source) &&
      filteredNodes.some((n) => n.id === edge.target),
  )

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)))
  }

  const getNodeColor = (type: GraphNode["type"]) => {
    switch (type) {
      case "source":
        return "#3b82f6" // blue
      case "calculation":
        return "#10b981" // green
      case "ai":
        return "#8b5cf6" // purple
      case "output":
        return "#f59e0b" // orange
      default:
        return "#6b7280" // gray
    }
  }

  const getNodeIcon = (type: GraphNode["type"]) => {
    switch (type) {
      case "source":
        return Database
      case "calculation":
        return Calculator
      case "ai":
        return Brain
      case "output":
        return FileText
      default:
        return Database
    }
  }

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
    onNodeClick?.(node.id)
  }

  const exportGraph = () => {
    if (!svgRef.current) return

    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `provenance-graph-${Date.now()}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }

    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)
    img.src = url
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Lineage Graph</CardTitle>
              <CardDescription>Interactive visualization of data provenance and relationships</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="source">Sources</SelectItem>
                  <SelectItem value="calculation">Calculations</SelectItem>
                  <SelectItem value="ai">AI Generated</SelectItem>
                  <SelectItem value="output">Outputs</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPan({ x: 0, y: 0 })}>
                Reset View
              </Button>
              <Button variant="outline" size="sm" onClick={exportGraph}>
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-muted/20" style={{ height: isFullscreen ? "90vh" : "600px" }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox="0 0 1000 400"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ cursor: isPanning ? "grabbing" : "grab" }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Render edges */}
                {filteredEdges.map((edge) => {
                  const sourceNode = filteredNodes.find((n) => n.id === edge.source)
                  const targetNode = filteredNodes.find((n) => n.id === edge.target)
                  if (!sourceNode || !targetNode) return null

                  const edgeColor =
                    edge.type === "direct"
                      ? "#3b82f6"
                      : edge.type === "derived"
                        ? "#10b981"
                        : "#8b5cf6"

                  return (
                    <line
                      key={edge.id}
                      x1={sourceNode.x + 60}
                      y1={sourceNode.y + 30}
                      x2={targetNode.x}
                      y2={targetNode.y + 30}
                      stroke={edgeColor}
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      opacity={0.6}
                    />
                  )
                })}

                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>

                {/* Render nodes */}
                {filteredNodes.map((node) => {
                  const Icon = getNodeIcon(node.type)
                  const color = getNodeColor(node.type)

                  return (
                    <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: "pointer" }}>
                      <rect
                        x={node.x}
                        y={node.y}
                        width="120"
                        height="60"
                        rx="8"
                        fill={color}
                        fillOpacity="0.1"
                        stroke={color}
                        strokeWidth="2"
                        className="hover:stroke-2 hover:fill-opacity-20 transition-all"
                      />
                      <foreignObject x={node.x + 10} y={node.y + 5} width="100" height="50">
                        <div className="flex flex-col items-center justify-center h-full">
                          <Icon className="h-5 w-5" style={{ color }} />
                          <span className="text-xs font-medium mt-1 text-center" style={{ color }}>
                            {node.label}
                          </span>
                        </div>
                      </foreignObject>
                      {node.data?.confidence && (
                        <circle
                          cx={node.x + 110}
                          cy={node.y + 10}
                          r="6"
                          fill={color}
                          opacity="0.8"
                        />
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Source</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Calculation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>AI Generated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Output</span>
            </div>
            <div className="ml-auto">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedNode !== null} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode?.label}</DialogTitle>
            <DialogDescription>Node Details</DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Type</div>
                  <Badge variant="outline" className="mt-1">
                    {selectedNode.type}
                  </Badge>
                </div>
                {selectedNode.data?.description && (
                  <div>
                    <div className="text-sm font-medium">Description</div>
                    <p className="text-sm text-muted-foreground mt-1">{selectedNode.data.description}</p>
                  </div>
                )}
                {selectedNode.data?.confidence !== undefined && (
                  <div>
                    <div className="text-sm font-medium">Confidence Score</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(selectedNode.data.confidence * 100)}%
                    </div>
                  </div>
                )}
                {selectedNode.data?.lastUpdated && (
                  <div>
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-sm text-muted-foreground mt-1">{selectedNode.data.lastUpdated}</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}


