"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Filter,
    Grid,
    BarChart3,
    Layout,
    ChevronDown,
    Maximize2,
    Download,
    RefreshCw,
    Plus
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts"
import { toast } from "sonner"

interface Dimension {
    id: string
    name: string
    type: string
    members: DimensionMember[]
}

interface DimensionMember {
    id: string
    name: string
    parentId?: string
}

interface PivotData {
    rows: string[]
    columns: string[]
    data: Record<string, Record<string, number>>
    totals: {
        rowTotals: Record<string, number>
        columnTotals: Record<string, number>
        grandTotal: number
    }
}

export function MultiDimensionalViewer({ orgId, modelId }: { orgId: string | null, modelId: string | null }) {
    const [dimensions, setDimensions] = useState<Dimension[]>([])
    const [selectedMetric, setSelectedMetric] = useState("revenue")
    const [rowDimension, setRowDimension] = useState("geography")
    const [colDimension, setColDimension] = useState("month")
    const [pivotData, setPivotData] = useState<PivotData | null>(null)
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(false)

    useEffect(() => {
        if (orgId && modelId) {
            fetchDimensions()
        }
    }, [orgId, modelId])

    useEffect(() => {
        if (orgId && modelId && selectedMetric) {
            fetchPivotData()
        }
    }, [orgId, modelId, selectedMetric, rowDimension, colDimension])

    const fetchDimensions = async () => {
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`/api/v1/orgs/${orgId}/models/${modelId}/dimensions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.ok) {
                setDimensions(data.dimensions)
                if (data.dimensions.length === 0) {
                    // Logic to initialize if empty?
                }
            }
        } catch (error) {
            console.error("Error fetching dimensions:", error)
        }
    }

    const fetchPivotData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(
                `/api/v1/orgs/${orgId}/models/${modelId}/cube/pivot?metricName=${selectedMetric}&rowDimension=${rowDimension}&colDimension=${colDimension}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            const data = await res.json()
            if (data.ok) {
                setPivotData(data.pivot)
            }
        } catch (error) {
            console.error("Error fetching pivot data:", error)
            toast.error("Failed to load pivot table")
        } finally {
            setLoading(false)
        }
    }

    const handleInitialize = async () => {
        setInitializing(true)
        try {
            const token = localStorage.getItem("auth-token")
            const res = await fetch(`/api/v1/orgs/${orgId}/models/${modelId}/dimensions/init`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.ok) {
                toast.success("Multi-dimensional system initialized")
                fetchDimensions()
            }
        } catch (error) {
            toast.error("Failed to initialize dimensions")
        } finally {
            setInitializing(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val)
    }

    if (!orgId || !modelId) return <div>Please select a model.</div>

    if (dimensions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                    <Grid className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Initialize Dimension Engine</h3>
                <p className="text-slate-500 max-w-md mb-6">
                    Unlock multi-dimensional modeling (Geography, Product, Segment) for this model to perform deep FP&A analysis.
                </p>
                <Button onClick={handleInitialize} disabled={initializing} className="bg-blue-600 hover:bg-blue-700">
                    {initializing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Initialize Hypercube Engine
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                                <Layout className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Hypercube Analysis</h2>
                                <p className="text-slate-400 text-sm">Multi-dimensional slicing & dicing</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Metric</span>
                                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white h-9">
                                        <SelectValue placeholder="Select Metric" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="revenue">Total Revenue</SelectItem>
                                        <SelectItem value="cogs">Total COGS</SelectItem>
                                        <SelectItem value="opex">Total OpEx</SelectItem>
                                        <SelectItem value="headcount">Headcount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rows</span>
                                <Select value={rowDimension} onValueChange={setRowDimension}>
                                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white h-9">
                                        <SelectValue placeholder="Rows" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dimensions.map(d => <SelectItem key={d.id} value={d.type}>{d.name}</SelectItem>)}
                                        <SelectItem value="month">Time (Month)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Columns</span>
                                <Select value={colDimension} onValueChange={setColDimension}>
                                    <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-white h-9">
                                        <SelectValue placeholder="Columns" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="month">Time (Month)</SelectItem>
                                        {dimensions.map(d => <SelectItem key={d.id} value={d.type}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" className="mt-5 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-700 h-9">
                                <Filter className="h-4 w-4 mr-2" /> Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Pivot Table */}
                <Card className="xl:col-span-2 shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b">
                        <div>
                            <CardTitle className="text-lg">Cross-Sectional View</CardTitle>
                            <CardDescription className="capitalize">Breakdown by {rowDimension} vs {colDimension}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 overflow-auto max-h-[600px]">
                        {loading ? (
                            <div className="flex items-center justify-center p-24">
                                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : pivotData ? (
                            <Table>
                                <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-900 border-r w-[200px]">{rowDimension.toUpperCase()}</TableHead>
                                        {pivotData.columns.map(col => (
                                            <TableHead key={col} className="text-right font-bold text-slate-900 min-w-[120px]">{col}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold text-blue-700 bg-blue-50/50 min-w-[120px]">TOTAL</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pivotData.rows.map(row => (
                                        <TableRow key={row} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-semibold text-slate-700 border-r">{row}</TableCell>
                                            {pivotData.columns.map(col => (
                                                <TableCell key={col} className="text-right font-mono text-sm">
                                                    {formatCurrency(pivotData.data[row]?.[col] || 0)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold text-blue-600 bg-blue-50/30">
                                                {formatCurrency(pivotData.totals.rowTotals[row] || 0)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-100/50 font-bold sticky bottom-0">
                                        <TableCell className="border-r">COLUMN TOTALS</TableCell>
                                        {pivotData.columns.map(col => (
                                            <TableCell key={col} className="text-right">
                                                {formatCurrency(pivotData.totals.columnTotals[col] || 0)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right text-blue-700 bg-blue-100/50">
                                            {formatCurrency(pivotData.totals.grandTotal)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-24 text-center text-slate-400">
                                Select dimensions and metrics to build the pivot table.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Visualizations */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-500" />
                                Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {pivotData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={pivotData.rows.map(row => ({
                                            name: row,
                                            value: pivotData.totals.rowTotals[row]
                                        })).sort((a, b) => b.value - a.value).slice(0, 5)}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    No chart data
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2 text-sm">
                                <Maximize2 className="h-4 w-4" />
                                Dimensional Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">
                                {pivotData ? formatCurrency(pivotData.totals.grandTotal) : "$0"}
                            </div>
                            <p className="text-blue-100 text-xs mb-4">Total across all filtered dimensions</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-blue-200">Active dimensions</span>
                                    <Badge className="bg-blue-400/30 text-white border-none">{dimensions.length}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-blue-200">Unique data points</span>
                                    <Badge className="bg-blue-400/30 text-white border-none">1,402</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
