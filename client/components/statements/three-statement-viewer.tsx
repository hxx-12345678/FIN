"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Building2,
    Wallet,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Download,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    Layers
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL, getAuthHeaders, handleUnauthorized } from "@/lib/api-config"
import { useOrg } from "@/lib/org-context"

interface StatementData {
    incomeStatement?: {
        monthly: Record<string, any>
        annual: Record<string, any>
    }
    cashFlow?: {
        monthly: Record<string, any>
        annual: Record<string, any>
    }
    balanceSheet?: {
        monthly: Record<string, any>
        annual: Record<string, any>
    }
    validation?: {
        passed: boolean
        checks: any[]
    }
    metadata?: {
        startMonth: string
        horizonMonths: number
        generatedAt: string
        assumptions: any
    }
}

interface ThreeStatementViewerProps {
    orgId: string | null
    modelId: string | null
    runId: string | null
    statements: StatementData | null
    modelRuns?: any[]
    onCellClick?: (cellId: string, value: any) => void
}

// Local formatter that respects organization currency
const formatValueLineItem = (value: number, symbol: string) => {
    if (value === undefined || value === null) return '-'
    const absValue = Math.abs(value)
    if (absValue >= 1000000) {
        return `${symbol}${(value / 1000000).toFixed(2)}M`
    } else if (absValue >= 1000) {
        return `${symbol}${(value / 1000).toFixed(1)}K`
    }
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const formatPercent = (value: number) => {
    if (value === undefined || value === null) return '-'
    return `${(value * 100).toFixed(1)}%`
}

export function ThreeStatementViewer({ orgId, modelId, runId, statements, modelRuns, onCellClick }: ThreeStatementViewerProps) {
    const { currencySymbol } = useOrg()
    const [activeStatement, setActiveStatement] = useState<'income' | 'cashflow' | 'balance'>('income')
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly')
    const [selectedScenario, setSelectedScenario] = useState('base')
    const [forecastHorizon, setForecastHorizon] = useState('12')

    const activeStatements = useMemo(() => {
        const resolveStatements = (data: any) => {
            if (!data) return null
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data
                // If it has 'statements' key with nested incomeStatement, use that
                if (parsed?.statements && (parsed.statements.incomeStatement || parsed.statements.cashFlow || parsed.statements.balanceSheet)) {
                    return parsed.statements
                }
                return parsed
            } catch (e) {
                console.error("Failed to parse statements data", e)
                return null
            }
        }

        if (!modelRuns || modelRuns.length === 0) return resolveStatements(statements)

        if (selectedScenario === 'base') {
            const baseRun = modelRuns.find(r => r.runType === 'baseline' && r.status === 'done')
            return resolveStatements(baseRun?.summaryJson || statements)
        }

        const targetType = selectedScenario === 'pessimistic' ? 'conservative' : selectedScenario
        const scenarioRun = [...modelRuns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(r => {
            const params = typeof r.paramsJson === 'string' ? JSON.parse(r.paramsJson) : r.paramsJson;
            return (
                r.runType === 'scenario' &&
                r.status === 'done' &&
                (params?.scenarioType === targetType)
            );
        })
        return resolveStatements(scenarioRun?.summaryJson)
    }, [selectedScenario, modelRuns, statements])

    // Memoize monthly data
    const monthlyPL = useMemo(() => activeStatements?.incomeStatement?.monthly || {}, [activeStatements])
    const monthlyCF = useMemo(() => activeStatements?.cashFlow?.monthly || {}, [activeStatements])
    const monthlyBS = useMemo(() => activeStatements?.balanceSheet?.monthly || {}, [activeStatements])

    const annualPL = useMemo(() => activeStatements?.incomeStatement?.annual || {}, [activeStatements])
    const annualCF = useMemo(() => activeStatements?.cashFlow?.annual || {}, [activeStatements])
    const annualBS = useMemo(() => activeStatements?.balanceSheet?.annual || {}, [activeStatements])

    const months = useMemo(() => Object.keys(monthlyPL).sort(), [monthlyPL])
    const years = useMemo(() => Object.keys(annualPL).sort(), [annualPL])

    const [exporting, setExporting] = useState(false)
    const isValidated = statements?.validation?.passed ?? false

    const handleExport = async () => {
        if (!runId) {
            toast.error("Model must be run before exporting.")
            return
        }
        setExporting(true)
        try {
            const res = await fetch(`${API_BASE_URL}/model-runs/${runId}/export`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                credentials: "include",
                body: JSON.stringify({
                    type: 'csv',
                    statements: ['income', 'cashflow', 'balance'],
                    scenario: selectedScenario
                })
            })

            if (res.status === 401) {
                handleUnauthorized()
                return
            }

            const data = await res.json()
            if ((data.ok || data.export) && (data.exportId || data.export?.id)) {
                const exportId = data.exportId || data.export?.id;
                toast.success("Excel export initiated. Preparing your file...")
                // In a real app we'd poll, but for now we'll just open the download link after a short delay
                // or tell the user to wait. 
                setTimeout(() => {
                    window.open(`${API_BASE_URL}/exports/${exportId}/download`, '_blank')
                    setExporting(false)
                }, 3000)
            } else {
                toast.error(data.message || "Failed to start export")
                setExporting(false)
            }
        } catch (error) {
            console.error("Export error:", error)
            toast.error("An error occurred while exporting")
            setExporting(false)
        }
    }

    if (!activeStatements || Object.keys(monthlyPL).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-900/50 rounded-xl border border-slate-800 text-center space-y-4">
                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                    <TrendingUp className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">No Statement Data Available</h3>
                    <p className="text-slate-400 mt-1">
                        {selectedScenario === 'base'
                            ? "Please ensure the model has been run to generate financial projections."
                            : `No completed run for the '${selectedScenario}' scenario was found.`}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-400" />
                                3-Statement Financial Model
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Investor-ready P&L, Cash Flow, and Balance Sheet
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Scenario Toggle */}
                            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Scenario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="base">Base Case</SelectItem>
                                    <SelectItem value="optimistic">Optimistic</SelectItem>
                                    <SelectItem value="pessimistic">Pessimistic</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Forecast Horizon */}
                            <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
                                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Horizon" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12 Months</SelectItem>
                                    <SelectItem value="24">24 Months</SelectItem>
                                    <SelectItem value="36">36 Months</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* View Toggle */}
                            <div className="flex rounded-lg bg-slate-800 p-1">
                                <Button
                                    size="sm"
                                    variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                                    className={viewMode === 'monthly' ? 'bg-blue-600' : 'text-slate-400 hover:text-white'}
                                    onClick={() => setViewMode('monthly')}
                                >
                                    Monthly
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === 'annual' ? 'default' : 'ghost'}
                                    className={viewMode === 'annual' ? 'bg-blue-600' : 'text-slate-400 hover:text-white'}
                                    onClick={() => setViewMode('annual')}
                                >
                                    Annual
                                </Button>
                            </div>

                            {/* Validation Badge */}
                            <Badge className={isValidated ? 'bg-green-600' : 'bg-yellow-600'}>
                                {isValidated ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Validated</>
                                ) : (
                                    <><AlertCircle className="h-3 w-3 mr-1" /> Review</>
                                )}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statement Tabs */}
            <Tabs value={activeStatement} onValueChange={(v) => setActiveStatement(v as any)}>
                <TabsList className="grid w-full grid-cols-3 h-14">
                    <TabsTrigger value="income" className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden sm:inline">Income Statement</span>
                        <span className="sm:hidden">P&L</span>
                    </TabsTrigger>
                    <TabsTrigger value="cashflow" className="flex items-center gap-2 text-sm">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:inline">Cash Flow</span>
                        <span className="sm:hidden">CF</span>
                    </TabsTrigger>
                    <TabsTrigger value="balance" className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Balance Sheet</span>
                        <span className="sm:hidden">BS</span>
                    </TabsTrigger>
                </TabsList>

                {/* Income Statement */}
                <TabsContent value="income" className="mt-4">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-green-800">
                                        <TrendingUp className="h-5 w-5" />
                                        Income Statement (P&L)
                                    </CardTitle>
                                    <CardDescription>Revenue, COGS, Operating Expenses, EBITDA, Net Income</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                                    {exporting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                                    {exporting ? 'Exporting...' : 'Export'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[180px] font-bold">Line Item</TableHead>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => (
                                                <TableHead key={period} className="text-right font-medium">{period}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Revenue */}
                                        <TableRow className="font-semibold bg-green-50">
                                            <TableCell className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                Revenue
                                            </TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-green-700 cursor-pointer hover:bg-green-100 transition-colors"
                                                        onClick={() => onCellClick?.(`${period}:revenue`, data?.revenue)}
                                                    >
                                                        {formatValueLineItem(data?.revenue, currencySymbol)}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* COGS */}
                                        <TableRow>
                                            <TableCell className="pl-8">Cost of Goods Sold</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-red-600 cursor-pointer hover:bg-red-50"
                                                        onClick={() => onCellClick?.(`${period}:cogs`, data?.cogs)}
                                                    >
                                                        ({formatValueLineItem(data?.cogs, currencySymbol)})
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Gross Profit */}
                                        <TableRow className="border-t-2 font-semibold">
                                            <TableCell>Gross Profit</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right cursor-pointer hover:bg-slate-50"
                                                        onClick={() => onCellClick?.(`${period}:grossProfit`, data?.grossProfit)}
                                                    >
                                                        {formatValueLineItem(data?.grossProfit, currencySymbol)}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Gross Margin */}
                                        <TableRow className="text-muted-foreground text-sm">
                                            <TableCell className="pl-8 italic">Gross Margin %</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right italic">{formatPercent(data?.grossMargin)}</TableCell>
                                            })}
                                        </TableRow>
                                        {/* Operating Expenses */}
                                        <TableRow>
                                            <TableCell className="pl-8">Operating Expenses</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-red-600 cursor-pointer hover:bg-red-50"
                                                        onClick={() => onCellClick?.(`${period}:operatingExpenses`, data?.operatingExpenses)}
                                                    >
                                                        ({formatValueLineItem(data?.operatingExpenses, currencySymbol)})
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Depreciation */}
                                        <TableRow>
                                            <TableCell className="pl-8">Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-muted-foreground cursor-pointer hover:bg-slate-50"
                                                        onClick={() => onCellClick?.(`${period}:depreciation`, data?.depreciation)}
                                                    >
                                                        ({formatValueLineItem(data?.depreciation, currencySymbol)})
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* EBITDA */}
                                        <TableRow className="border-t-2 font-semibold bg-blue-50">
                                            <TableCell className="flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-blue-600" />
                                                EBITDA
                                            </TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-blue-700 cursor-pointer hover:bg-blue-100"
                                                        onClick={() => onCellClick?.(`${period}:ebitda`, data?.ebitda)}
                                                    >
                                                        {formatValueLineItem(data?.ebitda, currencySymbol)}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Interest Expense */}
                                        <TableRow>
                                            <TableCell className="pl-8">Interest Expense</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right cursor-pointer hover:bg-slate-50"
                                                        onClick={() => onCellClick?.(`${period}:interestExpense`, data?.interestExpense)}
                                                    >
                                                        ({formatValueLineItem(data?.interestExpense, currencySymbol)})
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Income Tax */}
                                        <TableRow>
                                            <TableCell className="pl-8">Income Tax</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className="text-right text-red-600 cursor-pointer hover:bg-red-50"
                                                        onClick={() => onCellClick?.(`${period}:incomeTax`, data?.incomeTax)}
                                                    >
                                                        ({formatValueLineItem(data?.incomeTax, currencySymbol)})
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Net Income */}
                                        <TableRow className="border-t-2 border-b-2 font-bold bg-green-100">
                                            <TableCell className="flex items-center gap-2">
                                                <PiggyBank className="h-4 w-4 text-green-700" />
                                                Net Income
                                            </TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                const value = data?.netIncome || 0
                                                return (
                                                    <TableCell
                                                        key={period}
                                                        className={`text-right cursor-pointer hover:bg-green-200 ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}
                                                        onClick={() => onCellClick?.(`${period}:netIncome`, value)}
                                                    >
                                                        {formatValueLineItem(value, currencySymbol)}
                                                        {value >= 0 ?
                                                            <ArrowUpRight className="h-3 w-3 inline ml-1" /> :
                                                            <ArrowDownRight className="h-3 w-3 inline ml-1" />
                                                        }
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cash Flow Statement */}
                <TabsContent value="cashflow" className="mt-4">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-blue-800">
                                        <Wallet className="h-5 w-5" />
                                        Cash Flow Statement
                                    </CardTitle>
                                    <CardDescription>Operating, Investing, and Financing Activities</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                                    {exporting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                                    {exporting ? 'Exporting...' : 'Export'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[180px] font-bold">Line Item</TableHead>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => (
                                                <TableHead key={period} className="text-right font-medium">{period}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Operating Section Header */}
                                        <TableRow className="bg-blue-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-blue-800">
                                                Operating Activities
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Net Income</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.netIncome, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">+ Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-green-600">{formatValueLineItem(data?.depreciation, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Working Capital Changes</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                const value = data?.workingCapitalChange || 0
                                                return <TableCell key={period} className={`text-right ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatValueLineItem(value, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Operating Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-blue-700">{formatValueLineItem(data?.operatingCashFlow, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Investing Section */}
                                        <TableRow className="bg-amber-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-amber-800">
                                                Investing Activities
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Capital Expenditures</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-red-600">{formatValueLineItem(data?.capex, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Investing Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-amber-700">{formatValueLineItem(data?.investingCashFlow, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Financing Section */}
                                        <TableRow className="bg-purple-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-purple-800">
                                                Financing Activities
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Debt Repayment</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-red-600">{formatValueLineItem(data?.debtRepayment, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Financing Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-purple-700">{formatValueLineItem(data?.financingCashFlow, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Net Cash Flow */}
                                        <TableRow className="border-t-2 font-bold bg-slate-100">
                                            <TableCell>Net Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                const value = data?.netCashFlow || 0
                                                return (
                                                    <TableCell key={period} className={`text-right ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                        {formatValueLineItem(value, currencySymbol)}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {/* Ending Cash */}
                                        <TableRow className="border-b-2 font-bold bg-blue-100">
                                            <TableCell className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-blue-700" />
                                                Ending Cash Balance
                                            </TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-blue-700">{formatValueLineItem(data?.endingCash, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Balance Sheet */}
                <TabsContent value="balance" className="mt-4">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-purple-800">
                                        <Building2 className="h-5 w-5" />
                                        Balance Sheet
                                    </CardTitle>
                                    <CardDescription>Assets, Liabilities, and Shareholders Equity</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                                    {exporting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                                    {exporting ? 'Exporting...' : 'Export'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[180px] font-bold">Line Item</TableHead>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => (
                                                <TableHead key={period} className="text-right font-medium">{period}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Assets Section */}
                                        <TableRow className="bg-green-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-green-800">
                                                ASSETS
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Cash & Equivalents</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-green-600">{formatValueLineItem(data?.cash, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Accounts Receivable</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.accountsReceivable, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Inventory</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.inventory, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Current Assets</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.currentAssets, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Property, Plant & Equipment</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.ppe, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8 text-muted-foreground">Less: Accum. Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-red-600">({formatValueLineItem(data?.accumulatedDepreciation, currencySymbol)})</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Fixed Assets</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.fixedAssets, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-green-100">
                                            <TableCell>TOTAL ASSETS</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-green-700">{formatValueLineItem(data?.totalAssets, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Liabilities Section */}
                                        <TableRow className="bg-red-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-red-800">
                                                LIABILITIES
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Accounts Payable</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.accountsPayable, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Current Liabilities</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.currentLiabilities, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Long-Term Debt</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.longTermDebt, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-red-100">
                                            <TableCell>TOTAL LIABILITIES</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-red-700">{formatValueLineItem(data?.totalLiabilities, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Equity Section */}
                                        <TableRow className="bg-blue-50/50">
                                            <TableCell colSpan={7} className="font-semibold text-blue-800">
                                                SHAREHOLDERS EQUITY
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Common Stock</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.commonStock, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Retained Earnings</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatValueLineItem(data?.retainedEarnings, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-blue-100">
                                            <TableCell>TOTAL EQUITY</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-blue-700">{formatValueLineItem(data?.totalEquity, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>

                                        {/* Total L + E */}
                                        <TableRow className="font-bold border-t-2 border-b-2 bg-purple-100">
                                            <TableCell className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-purple-700" />
                                                TOTAL LIAB. + EQUITY
                                            </TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                const total = (data?.totalLiabilities || 0) + (data?.totalEquity || 0)
                                                return <TableCell key={period} className="text-right text-purple-700">{formatValueLineItem(total, currencySymbol)}</TableCell>
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Validation Status */}
            {!isValidated && statements?.validation?.checks && statements.validation.checks.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                        <strong>Validation Warning:</strong> {statements.validation.checks.length} accounting issue(s) detected.
                        Review the statements for discrepancies.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
