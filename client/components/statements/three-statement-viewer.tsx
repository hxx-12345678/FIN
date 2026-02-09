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
import { API_BASE_URL } from "@/lib/api-config"

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
}

const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return '-'
    const absValue = Math.abs(value)
    if (absValue >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`
    } else if (absValue >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
}

const formatPercent = (value: number) => {
    if (value === undefined || value === null) return '-'
    return `${(value * 100).toFixed(1)}%`
}

export function ThreeStatementViewer({ orgId, modelId, runId, statements }: ThreeStatementViewerProps) {
    const [activeStatement, setActiveStatement] = useState<'income' | 'cashflow' | 'balance'>('income')
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly')
    const [selectedScenario, setSelectedScenario] = useState('base')
    const [forecastHorizon, setForecastHorizon] = useState('12')

    // Memoize monthly data
    const monthlyPL = useMemo(() => statements?.incomeStatement?.monthly || {}, [statements])
    const monthlyCF = useMemo(() => statements?.cashFlow?.monthly || {}, [statements])
    const monthlyBS = useMemo(() => statements?.balanceSheet?.monthly || {}, [statements])

    const annualPL = useMemo(() => statements?.incomeStatement?.annual || {}, [statements])
    const annualCF = useMemo(() => statements?.cashFlow?.annual || {}, [statements])
    const annualBS = useMemo(() => statements?.balanceSheet?.annual || {}, [statements])

    const months = useMemo(() => Object.keys(monthlyPL).sort(), [monthlyPL])
    const years = useMemo(() => Object.keys(annualPL).sort(), [annualPL])

    const isValidated = statements?.validation?.passed ?? false

    if (!statements || Object.keys(monthlyPL).length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                    <Layers className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Financial Statements Available</h3>
                    <p className="text-muted-foreground mb-4">
                        Run a model to generate P&L, Cash Flow, and Balance Sheet statements.
                    </p>
                    <Badge variant="outline" className="text-xs">
                        3-Statement Financial Model
                    </Badge>
                </CardContent>
            </Card>
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
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1" /> Export
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
                                                return <TableCell key={period} className="text-right text-green-700">{formatCurrency(data?.revenue)}</TableCell>
                                            })}
                                        </TableRow>
                                        {/* COGS */}
                                        <TableRow>
                                            <TableCell className="pl-8">Cost of Goods Sold</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right text-red-600">({formatCurrency(data?.cogs)})</TableCell>
                                            })}
                                        </TableRow>
                                        {/* Gross Profit */}
                                        <TableRow className="border-t-2 font-semibold">
                                            <TableCell>Gross Profit</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.grossProfit)}</TableCell>
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
                                                return <TableCell key={period} className="text-right text-red-600">({formatCurrency(data?.operatingExpenses)})</TableCell>
                                            })}
                                        </TableRow>
                                        {/* Depreciation */}
                                        <TableRow>
                                            <TableCell className="pl-8">Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right text-muted-foreground">({formatCurrency(data?.depreciation)})</TableCell>
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
                                                return <TableCell key={period} className="text-right text-blue-700">{formatCurrency(data?.ebitda)}</TableCell>
                                            })}
                                        </TableRow>
                                        {/* Interest Expense */}
                                        <TableRow>
                                            <TableCell className="pl-8">Interest Expense</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right">({formatCurrency(data?.interestExpense)})</TableCell>
                                            })}
                                        </TableRow>
                                        {/* Income Tax */}
                                        <TableRow>
                                            <TableCell className="pl-8">Income Tax</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyPL[period] : annualPL[period]
                                                return <TableCell key={period} className="text-right text-red-600">({formatCurrency(data?.incomeTax)})</TableCell>
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
                                                    <TableCell key={period} className={`text-right ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                        {formatCurrency(value)}
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
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1" /> Export
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
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.netIncome)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">+ Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-green-600">{formatCurrency(data?.depreciation)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Working Capital Changes</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                const value = data?.workingCapitalChange || 0
                                                return <TableCell key={period} className={`text-right ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(value)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Operating Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-blue-700">{formatCurrency(data?.operatingCashFlow)}</TableCell>
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
                                                return <TableCell key={period} className="text-right text-red-600">{formatCurrency(data?.capex)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Investing Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-amber-700">{formatCurrency(data?.investingCashFlow)}</TableCell>
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
                                                return <TableCell key={period} className="text-right text-red-600">{formatCurrency(data?.debtRepayment)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-semibold border-t">
                                            <TableCell>Financing Cash Flow</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyCF[period] : annualCF[period]
                                                return <TableCell key={period} className="text-right text-purple-700">{formatCurrency(data?.financingCashFlow)}</TableCell>
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
                                                        {formatCurrency(value)}
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
                                                return <TableCell key={period} className="text-right text-blue-700">{formatCurrency(data?.endingCash)}</TableCell>
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
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1" /> Export
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
                                                return <TableCell key={period} className="text-right text-green-600">{formatCurrency(data?.cash)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Accounts Receivable</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.accountsReceivable)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Inventory</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.inventory)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Current Assets</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.currentAssets)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Property, Plant & Equipment</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.ppe)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8 text-muted-foreground">Less: Accum. Depreciation</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-red-600">({formatCurrency(data?.accumulatedDepreciation)})</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Fixed Assets</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.fixedAssets)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-green-100">
                                            <TableCell>TOTAL ASSETS</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-green-700">{formatCurrency(data?.totalAssets)}</TableCell>
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
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.accountsPayable)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-medium border-t">
                                            <TableCell className="pl-4">Current Liabilities</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.currentLiabilities)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Long-Term Debt</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.longTermDebt)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-red-100">
                                            <TableCell>TOTAL LIABILITIES</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-red-700">{formatCurrency(data?.totalLiabilities)}</TableCell>
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
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.commonStock)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Retained Earnings</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right">{formatCurrency(data?.retainedEarnings)}</TableCell>
                                            })}
                                        </TableRow>
                                        <TableRow className="font-bold border-t-2 bg-blue-100">
                                            <TableCell>TOTAL EQUITY</TableCell>
                                            {(viewMode === 'monthly' ? months.slice(0, 6) : years).map(period => {
                                                const data = viewMode === 'monthly' ? monthlyBS[period] : annualBS[period]
                                                return <TableCell key={period} className="text-right text-blue-700">{formatCurrency(data?.totalEquity)}</TableCell>
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
                                                return <TableCell key={period} className="text-right text-purple-700">{formatCurrency(total)}</TableCell>
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
