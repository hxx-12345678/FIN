// Demo Data Generator for FinaPilot Sandbox Mode
// Generates realistic 12-month financial dataset for first-time users

export interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: "income" | "expense"
}

export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  cashflow: number
  balance: number
}

export interface DemoDataset {
  companyName: string
  industry: string
  foundedDate: string
  transactions: Transaction[]
  monthlyData: MonthlyData[]
  plStatement: {
    revenue: number
    cogs: number
    grossProfit: number
    operatingExpenses: number
    netIncome: number
  }
  balanceSheet: {
    assets: number
    liabilities: number
    equity: number
  }
  metrics: {
    burnRate: number
    runway: number
    mrr: number
    arr: number
    cac: number
    ltv: number
  }
}

const categories = {
  income: ["SaaS Subscriptions", "Consulting Revenue", "Product Sales", "License Fees"],
  expense: [
    "Payroll & Benefits",
    "Marketing & Advertising",
    "Cloud Infrastructure",
    "Office Rent",
    "Software Subscriptions",
    "Professional Services",
    "Travel & Entertainment",
    "Utilities",
  ],
}

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getRandomDate(month: number, year: number): string {
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function generateMonthlyTransactions(month: number, year: number, baseRevenue: number): Transaction[] {
  const transactions: Transaction[] = []

  // Generate 3-5 revenue transactions per month
  const revenueCount = Math.floor(Math.random() * 3) + 3
  for (let i = 0; i < revenueCount; i++) {
    const amount = Math.floor(baseRevenue / revenueCount + (Math.random() - 0.5) * 5000)
    transactions.push({
      id: generateTransactionId(),
      date: getRandomDate(month, year),
      description: `${categories.income[Math.floor(Math.random() * categories.income.length)]} - Customer ${i + 1}`,
      category: categories.income[Math.floor(Math.random() * categories.income.length)],
      amount: amount,
      type: "income",
    })
  }

  // Generate 8-12 expense transactions per month
  const expenseCount = Math.floor(Math.random() * 5) + 8
  const expenseCategories = [...categories.expense]
  for (let i = 0; i < expenseCount; i++) {
    const category = expenseCategories[i % expenseCategories.length]
    let amount: number

    // Different expense ranges based on category
    if (category === "Payroll & Benefits") {
      amount = Math.floor(Math.random() * 20000) + 30000
    } else if (category === "Marketing & Advertising") {
      amount = Math.floor(Math.random() * 10000) + 5000
    } else if (category === "Cloud Infrastructure") {
      amount = Math.floor(Math.random() * 5000) + 2000
    } else {
      amount = Math.floor(Math.random() * 3000) + 500
    }

    transactions.push({
      id: generateTransactionId(),
      date: getRandomDate(month, year),
      description: `${category} - ${getRandomDate(month, year)}`,
      category: category,
      amount: amount,
      type: "expense",
    })
  }

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function generateDemoDataset(): DemoDataset {
  const currentYear = new Date().getFullYear()
  const startMonth = new Date().getMonth() - 11 // 12 months ago
  const startYear = startMonth < 0 ? currentYear - 1 : currentYear

  const allTransactions: Transaction[] = []
  const monthlyData: MonthlyData[] = []

  let cumulativeBalance = 500000 // Starting balance: $500k

  // Generate data for 12 months
  for (let i = 0; i < 12; i++) {
    const monthIndex = (startMonth + i) % 12
    const year = startMonth + i < 0 ? currentYear - 1 : currentYear
    const monthName = new Date(year, monthIndex).toLocaleString("default", { month: "short" })

    // Revenue grows 5-15% month over month
    const baseRevenue = 45000 + i * 3000 + Math.random() * 5000

    const monthTransactions = generateMonthlyTransactions(monthIndex + 1, year, baseRevenue)
    allTransactions.push(...monthTransactions)

    // Calculate monthly totals
    const revenue = monthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

    const expenses = monthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

    const cashflow = revenue - expenses
    cumulativeBalance += cashflow

    monthlyData.push({
      month: monthName,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      cashflow: Math.round(cashflow),
      balance: Math.round(cumulativeBalance),
    })
  }

  // Calculate P&L Statement (last 12 months)
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0)
  const cogs = totalRevenue * 0.22 // 22% COGS
  const grossProfit = totalRevenue - cogs
  const operatingExpenses = totalExpenses - cogs
  const netIncome = grossProfit - operatingExpenses

  // Calculate Balance Sheet
  const assets = cumulativeBalance + 150000 // Cash + AR
  const liabilities = 80000 // Accounts payable + loans
  const equity = assets - liabilities

  // Calculate Key Metrics
  const avgMonthlyRevenue = totalRevenue / 12
  const avgMonthlyExpenses = totalExpenses / 12
  const burnRate = avgMonthlyExpenses - avgMonthlyRevenue
  const runway = burnRate > 0 ? Math.floor(cumulativeBalance / burnRate) : 999
  const mrr = avgMonthlyRevenue
  const arr = mrr * 12

  return {
    companyName: "Demo Startup Inc.",
    industry: "SaaS",
    foundedDate: "2023-01-15",
    transactions: allTransactions,
    monthlyData: monthlyData,
    plStatement: {
      revenue: Math.round(totalRevenue),
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      operatingExpenses: Math.round(operatingExpenses),
      netIncome: Math.round(netIncome),
    },
    balanceSheet: {
      assets: Math.round(assets),
      liabilities: Math.round(liabilities),
      equity: Math.round(equity),
    },
    metrics: {
      burnRate: Math.round(Math.abs(burnRate)),
      runway: runway,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      cac: 850,
      ltv: 6800,
    },
  }
}

// Demo mode state management
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("finapilot_demo_mode") === "true"
}

export function enableDemoMode(): void {
  if (typeof window === "undefined") return
  localStorage.setItem("finapilot_demo_mode", "true")
  localStorage.setItem("finapilot_demo_activated_at", new Date().toISOString())
}

export function disableDemoMode(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("finapilot_demo_mode")
  localStorage.removeItem("finapilot_demo_activated_at")
  localStorage.removeItem("finapilot_demo_data")
}

export function getDemoData(): DemoDataset | null {
  if (typeof window === "undefined") return null

  const cached = localStorage.getItem("finapilot_demo_data")
  if (cached) {
    return JSON.parse(cached)
  }

  const demoData = generateDemoDataset()
  localStorage.setItem("finapilot_demo_data", JSON.stringify(demoData))
  return demoData
}

export function shouldResetDemoData(): boolean {
  if (typeof window === "undefined") return false

  const activatedAt = localStorage.getItem("finapilot_demo_activated_at")
  if (!activatedAt) return true

  const activatedDate = new Date(activatedAt)
  const now = new Date()
  const hoursSinceActivation = (now.getTime() - activatedDate.getTime()) / (1000 * 60 * 60)

  // Reset after 24 hours
  return hoursSinceActivation >= 24
}

export function resetDemoDataIfNeeded(): void {
  if (shouldResetDemoData()) {
    localStorage.removeItem("finapilot_demo_data")
    localStorage.setItem("finapilot_demo_activated_at", new Date().toISOString())
  }
}
