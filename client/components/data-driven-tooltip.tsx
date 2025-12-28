"use client"

import { useState, useEffect } from "react"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DataDrivenTooltipProps {
  metric: string
  value: number | string
  dataContext?: {
    // For revenue metrics
    monthlyRevenue?: number
    previousMonthRevenue?: number
    growthRate?: number
    // For burn rate
    monthlyBurnRate?: number
    previousMonthBurnRate?: number
    // For runway
    cashRunway?: number
    currentCash?: number
    // For health score
    healthScore?: number
    revenueGrowth?: number
    burnRateChange?: number
    runwayChange?: number
    // For customers
    activeCustomers?: number
    // Budget vs Actual
    budgetedAmount?: number
    actualAmount?: number
    variance?: number
    variancePercent?: number
    budgetAccuracy?: number
    // Financial Modeling
    modelItem?: string
    formula?: string
    assumptions?: Record<string, any>
  }
  className?: string
}

interface MetricExplanation {
  title: string
  calculation: string
  dataBreakdown: string
  interpretation: string
  verification: string
}

export function DataDrivenTooltip({ metric, value, dataContext, className = "text-2xl font-bold" }: DataDrivenTooltipProps) {
  const [explanation, setExplanation] = useState<MetricExplanation | null>(null)

  useEffect(() => {
    // Generate explanation based on metric and data context
    const generateExplanation = (): MetricExplanation | null => {
      switch (metric.toLowerCase()) {
        case "monthly revenue":
        case "revenue": {
          const revenue = dataContext?.monthlyRevenue || Number(value) || 0
          const prevRevenue = dataContext?.previousMonthRevenue || 0
          const growth = dataContext?.growthRate || (prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0)
          
          return {
            title: "Monthly Revenue",
            calculation: `Current Period: $${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n${prevRevenue > 0 ? `Previous Period: $${prevRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nGrowth Rate: ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%` : 'No previous period data available'}`,
            dataBreakdown: prevRevenue > 0 
              ? `This represents a ${Math.abs(growth).toFixed(1)}% ${growth >= 0 ? 'increase' : 'decrease'} from the previous period. Revenue is calculated from all income sources including sales, subscriptions, and service fees recorded in your accounting system.`
              : `Revenue represents total income for the current period. This value is calculated from transactions imported from your connected accounting system or CSV imports.`,
            interpretation: growth >= 0 
              ? `Positive revenue growth indicates healthy business expansion. This metric is critical for tracking business performance and making informed decisions about scaling operations, hiring, and investments.`
              : `Declining revenue requires attention to sales pipeline, customer retention, and pricing strategy. Review customer acquisition costs and conversion rates to identify improvement opportunities.`,
            verification: `To verify: Check your accounting system (QuickBooks/Xero/CSV) for all income transactions in this period. The value should match your P&L statement's revenue line item. Ensure all transactions are properly categorized and no duplicates exist.`
          }
        }

        case "monthly burn rate":
        case "burn rate": {
          const burnRate = dataContext?.monthlyBurnRate || Number(value) || 0
          const prevBurnRate = dataContext?.previousMonthBurnRate || 0
          const change = prevBurnRate > 0 ? ((burnRate - prevBurnRate) / prevBurnRate) * 100 : 0
          
          return {
            title: "Monthly Burn Rate",
            calculation: `Current Period: $${burnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n${prevBurnRate > 0 ? `Previous Period: $${prevBurnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nChange: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : 'No previous period data'}`,
            dataBreakdown: `Burn rate is calculated as total expenses minus revenue (if negative) or total operating expenses for the period. This includes salaries, rent, software subscriptions, marketing costs, and all other operating expenses recorded in your accounting system.`,
            interpretation: change > 0 
              ? `Increasing burn rate indicates higher cash consumption. This could be due to strategic investments (hiring, marketing) or operational inefficiencies. Compare burn rate growth to revenue growth to ensure sustainable scaling.`
              : change < 0 
                ? `Decreasing burn rate suggests improved operational efficiency or cost optimization. This is positive if revenue is stable or growing, but concerning if revenue is declining.`
                : `Stable burn rate indicates consistent expense management. Monitor in relation to revenue growth and cash runway.`,
            verification: `To verify: Sum all expense transactions from your accounting system for this period. The calculation is: Total Operating Expenses - (Revenue if negative). Compare with your cash flow statement. Ensure all expense categories are included (COGS, OpEx, etc.).`
          }
        }

        case "cash runway":
        case "runway": {
          const runway = dataContext?.cashRunway || Number(value) || 0
          const cash = dataContext?.currentCash || 0
          const burnRate = dataContext?.monthlyBurnRate || 0
          const calculation = burnRate > 0 ? (cash / burnRate).toFixed(1) : "N/A"
          
          return {
            title: "Cash Runway",
            calculation: `Months Remaining: ${runway}\nCurrent Cash: $${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nMonthly Burn Rate: $${burnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nFormula: Cash ÷ Monthly Burn Rate = ${calculation} months`,
            dataBreakdown: `Cash runway represents how many months your company can operate at the current burn rate before running out of cash. This is calculated by dividing your current cash balance by your average monthly burn rate.`,
            interpretation: runway >= 18
              ? `Excellent runway (>18 months) provides strong financial flexibility for strategic planning and growth initiatives without immediate fundraising pressure.`
              : runway >= 12
                ? `Good runway (12-18 months) offers reasonable time for business development and fundraising preparation.`
                : runway >= 6
                  ? `Moderate runway (6-12 months) requires active cash management and fundraising planning. Start investor conversations soon.`
                  : `Critical runway (<6 months) demands immediate action: reduce burn rate, accelerate fundraising, or secure bridge financing.`,
            verification: `To verify: Check your bank balance (current cash) and calculate average monthly expenses over the last 3 months (burn rate). Formula: Cash Balance ÷ Average Monthly Expenses. This should match your cash flow projections and bank reconciliation.`
          }
        }

        case "health score":
        case "financial health score": {
          const score = dataContext?.healthScore || Number(value) || 0
          const revenueGrowth = dataContext?.revenueGrowth || 0
          const burnRateChange = dataContext?.burnRateChange || 0
          const runwayChange = dataContext?.runwayChange || 0
          
          return {
            title: "Financial Health Score",
            calculation: `Score: ${score}/100\nComponents:\n- Revenue Growth: ${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%\n- Burn Rate Change: ${burnRateChange >= 0 ? '+' : ''}${burnRateChange.toFixed(1)}%\n- Runway Change: ${runwayChange >= 0 ? '+' : ''}${runwayChange.toFixed(1)} months`,
            dataBreakdown: `The health score is a composite metric (0-100) that evaluates multiple financial indicators including revenue growth trajectory, burn rate sustainability, cash runway adequacy, and operational efficiency. Higher scores indicate stronger financial health.`,
            interpretation: score >= 80
              ? `Excellent financial health. Strong growth, sustainable burn rate, and adequate runway indicate a well-managed company positioned for success.`
              : score >= 60
                ? `Good financial health with room for optimization. Monitor key metrics and continue improving operational efficiency.`
                : score >= 40
                  ? `Moderate financial health. Focus on revenue growth, cost optimization, and runway extension strategies.`
                  : `Needs attention. Review business model, reduce burn rate, and prioritize fundraising or profitability initiatives.`,
            verification: `To verify: Review the component metrics (revenue growth, burn rate trends, runway). The score is calculated using a weighted algorithm considering all factors. Compare with industry benchmarks for your stage and sector.`
          }
        }

        case "active customers":
        case "customers": {
          const customers = dataContext?.activeCustomers || Number(value) || 0
          
          return {
            title: "Active Customers",
            calculation: `Total Active Customers: ${customers.toLocaleString()}\nCounted as: Customers with transactions in the current period`,
            dataBreakdown: `Active customers are defined as unique customers who have generated revenue transactions (invoices, subscriptions, payments) in the current measurement period. This count is derived from your accounting system's customer transaction data.`,
            interpretation: customers > 0
              ? `Customer count indicates your business's market reach and revenue-generating customer base. Growth in active customers typically correlates with revenue growth. Monitor customer acquisition cost (CAC) and lifetime value (LTV) for profitability analysis.`
              : `No active customers detected. Ensure customer data is properly imported and transactions are correctly categorized with customer information.`,
            verification: `To verify: Export customer transaction report from your accounting system (QuickBooks/Xero/CSV). Count unique customers with revenue-generating transactions in this period. This should match your CRM or sales records.`
          }
        }

        case "budget variance":
        case "variance": {
          const budget = dataContext?.budgetedAmount || 0
          const actual = dataContext?.actualAmount || 0
          const variance = dataContext?.variance || (actual - budget)
          const variancePercent = dataContext?.variancePercent || (budget !== 0 ? (variance / budget) * 100 : 0)
          
          return {
            title: "Budget vs Actual Variance",
            calculation: `Budgeted: $${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nActual: $${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVariance: $${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(variancePercent).toFixed(1)}%)\nFormula: Actual - Budget = ${variance >= 0 ? '+' : '-'}$${Math.abs(variance).toLocaleString()}`,
            dataBreakdown: `Variance shows the difference between planned (budgeted) and actual amounts. Positive variance (actual > budget) for expenses is unfavorable, while positive variance for revenue is favorable.`,
            interpretation: Math.abs(variancePercent) < 5
              ? `Minimal variance (<5%) indicates accurate budgeting and strong financial planning. Actual results closely match projections.`
              : Math.abs(variancePercent) < 15
                ? `Moderate variance (5-15%) is common and acceptable. Review causes and adjust future budgets based on learnings.`
                : `Significant variance (>15%) requires investigation. Identify root causes (pricing changes, unexpected costs, market shifts) and update forecasting models accordingly.`,
            verification: `To verify: Compare budget amounts from your financial planning documents with actual transactions from accounting system. Ensure both use the same time period, categorization, and accounting method (cash vs accrual). Review transaction categorization for accuracy.`
          }
        }

        case "net variance": {
          const budget = dataContext?.budgetedAmount || 0
          const actual = dataContext?.actualAmount || 0
          const variance = actual - budget
          
          return {
            title: "Net Variance",
            calculation: `Net Budgeted: $${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nNet Actual: $${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nNet Variance: $${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nFormula: (Revenue - Expenses) Actual - (Revenue - Expenses) Budget`,
            dataBreakdown: `Net variance is the difference between budgeted and actual net income (revenue minus expenses). This provides a holistic view of overall financial performance against plan.`,
            interpretation: variance > 0
              ? `Favorable net variance indicates better-than-expected profitability. This could result from higher revenue, lower costs, or both. Analyze which components contributed most.`
              : variance < 0
                ? `Unfavorable net variance suggests lower profitability than planned. Investigate both revenue shortfalls and expense overruns to identify corrective actions.`
                : `Zero variance indicates perfect budget accuracy, which is rare. Review for potential data quality issues or overly conservative/aggressive budgeting.`,
            verification: `To verify: Calculate net income from P&L statements for both budget and actual. Ensure revenue recognition and expense matching follow the same accounting principles. Compare line-by-line to identify variance sources.`
          }
        }

        case "budget accuracy": {
          const accuracy = dataContext?.budgetAccuracy || Number(String(value).replace('%', '')) || 0
          
          return {
            title: "Budget Accuracy",
            calculation: `Accuracy: ${accuracy.toFixed(1)}%\nFormula: 100% - (|Actual - Budget| / Budget × 100%)\nThis measures how closely actual results match your budgeted amounts.`,
            dataBreakdown: `Budget accuracy is calculated as 100% minus the absolute percentage variance across all budgeted items. A score of ${accuracy.toFixed(1)}% means your actual results are ${(100 - accuracy).toFixed(1)}% off from budget on average. This metric aggregates variance across revenue, expenses, and all budget categories.`,
            interpretation: accuracy >= 90
              ? `Excellent budget accuracy (≥90%) demonstrates strong financial planning and execution. Your forecasts are highly reliable, indicating good understanding of business dynamics and effective budget management. This level of accuracy supports confident decision-making.`
              : accuracy >= 80
                ? `Good budget accuracy (80-90%) shows solid financial planning with minor variances. Some deviations are expected in dynamic business environments. Review specific areas with higher variance to improve forecasting precision.`
                : accuracy >= 70
                  ? `Moderate budget accuracy (70-80%) suggests room for improvement in forecasting. Analyze the largest variances to identify systematic biases (optimistic/pessimistic assumptions) or unexpected market conditions. Consider more conservative or realistic assumptions.`
                  : `Low budget accuracy (<70%) indicates significant forecasting challenges. Conduct thorough variance analysis to understand root causes: were assumptions unrealistic, did market conditions change unexpectedly, or are there data quality issues? This requires immediate attention to improve financial planning credibility.`,
            verification: `To verify: Compare your budget documents (created in Financial Modeling) with actual financial results from your accounting system for the same period. Check that both use consistent categorization and accounting methods. Review variance reports line-by-line. For CA/CFA verification: Ensure all budgeted line items are compared to actual P&L line items, verify revenue recognition timing matches (accrual vs cash basis), and confirm expense categorization aligns between budget and actuals.`
          }
        }

        case "revenue variance": {
          const variance = dataContext?.variance || 0
          const variancePercent = dataContext?.variancePercent || 0
          const budgeted = dataContext?.budgetedAmount || 0
          const actual = dataContext?.actualAmount || (budgeted + variance)
          
          return {
            title: "Revenue Variance",
            calculation: `Budgeted Revenue: $${budgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nActual Revenue: $${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVariance: ${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVariance %: ${variancePercent >= 0 ? '+' : ''}${Math.abs(variancePercent).toFixed(1)}%\nFormula: Actual Revenue - Budgeted Revenue`,
            dataBreakdown: `Revenue variance measures the difference between actual revenue earned and the revenue projected in your budget. A positive variance (actual > budget) is favorable, while negative variance (actual < budget) is unfavorable. This value is calculated from your actual income transactions (sales, subscriptions, services) compared to budgeted revenue projections from your financial model.`,
            interpretation: variance >= 0
              ? `Favorable revenue variance (actual exceeds budget) indicates stronger-than-expected sales performance. Possible reasons: successful marketing campaigns, market expansion, pricing optimization, or better-than-expected customer acquisition. Investigate which revenue streams contributed most to understand what's driving growth. For CEOs: This positive variance supports growth initiatives and may indicate readiness for scaling.`
              : Math.abs(variancePercent) < 10
                ? `Minor unfavorable variance (<10%) suggests slight revenue shortfall. Common causes: seasonality, minor market shifts, or timing differences. Monitor trends to ensure it doesn't become systematic. Review sales pipeline and conversion rates.`
                : `Significant unfavorable variance (≥10%) requires immediate investigation. Potential causes: pricing pressure, competitive losses, market contraction, sales execution issues, or customer churn. Analyze by revenue stream, customer segment, and sales channel. For CFOs: This impacts cash flow projections and may require budget revisions or cost adjustments.`,
            verification: `To verify: Export revenue transactions from your accounting system (QuickBooks/Xero/CSV) for this period. Sum all income transactions and compare to budgeted revenue from your financial model. Ensure revenue recognition timing is consistent (accrual vs cash basis). For CA verification: Reconcile with your P&L statement revenue line, verify no duplicate entries, check revenue recognition policies match between budget and actuals, and confirm all revenue streams are included (product sales, services, subscriptions, etc.).`
          }
        }

        case "expense variance": {
          const variance = dataContext?.variance || 0
          const variancePercent = dataContext?.variancePercent || 0
          const budgeted = dataContext?.budgetedAmount || 0
          const actual = dataContext?.actualAmount || (budgeted + variance)
          
          return {
            title: "Expense Variance",
            calculation: `Budgeted Expenses: $${budgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nActual Expenses: $${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVariance: ${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVariance %: ${variancePercent >= 0 ? '+' : ''}${Math.abs(variancePercent).toFixed(1)}%\nFormula: Actual Expenses - Budgeted Expenses`,
            dataBreakdown: `Expense variance compares actual operating costs to budgeted expenses. Positive variance (actual > budget) means overspending and is unfavorable, while negative variance (actual < budget) indicates cost savings and is favorable. This aggregates all expense categories including payroll, marketing, operations, R&D, and overhead costs from your accounting system compared to budget allocations.`,
            interpretation: variance <= 0
              ? `Favorable expense variance (actual below budget) indicates cost efficiency or successful cost control. Possible reasons: operational improvements, vendor negotiations, delayed hires, or reduced discretionary spending. While positive, ensure cost savings aren't from cutting critical investments. Analyze which expense categories contributed to savings.`
              : Math.abs(variancePercent) < 10
                ? `Minor unfavorable variance (<10%) suggests slight overspending, often acceptable due to business growth, unexpected opportunities, or minor scope changes. Monitor to prevent escalation. Review specific categories with highest variance.`
                : `Significant unfavorable variance (≥10%) requires cost management attention. Potential causes: unplanned hiring, marketing overspend, vendor cost increases, operational inefficiencies, or scope creep. Analyze by expense category to identify controllable vs non-controllable costs. For CFOs: This impacts profitability and cash runway, may require budget revisions or cost optimization initiatives.`,
            verification: `To verify: Export all expense transactions from your accounting system for this period. Sum all costs (excluding capital expenditures if using operating expense budget) and compare to budgeted expenses from your financial model. Ensure expense categorization matches between budget and actuals. For CA verification: Reconcile with P&L expense lines, verify all expense categories are included (COGS, OpEx, payroll, etc.), check for proper accrual vs cash basis alignment, and confirm no capital expenditures are included in operating expense variance.`
          }
        }

        default:
          return null
      }
    }

    const exp = generateExplanation()
    setExplanation(exp)
  }, [metric, value, dataContext])

  // Don't show tooltip if no explanation generated
  if (!explanation) {
    return null
  }

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className} underline decoration-dotted decoration-muted-foreground/50 hover:decoration-foreground/70 transition-colors`}>{value}</span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-[min(90vw,500px)] p-4 z-[9999] shadow-xl border-2 bg-popover"
          side="bottom"
          align="start"
          sideOffset={12}
          avoidCollisions={true}
          collisionPadding={40}
        >
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 pb-1">
            <div>
              <div className="font-bold text-base mb-2 text-left">{explanation.title}</div>
              <div className="text-sm text-muted-foreground whitespace-pre-line font-mono bg-muted p-3 rounded border text-left break-words">
                {explanation.calculation}
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="font-semibold text-sm mb-1.5 text-left">Data Source & Breakdown:</div>
              <div className="text-sm leading-relaxed text-foreground text-left">{explanation.dataBreakdown}</div>
            </div>
            <div className="border-t pt-3">
              <div className="font-semibold text-sm mb-1.5 text-left">Professional Interpretation:</div>
              <div className="text-sm leading-relaxed text-foreground text-left">{explanation.interpretation}</div>
            </div>
            <div className="border-t pt-3">
              <div className="font-semibold text-sm mb-1.5 text-left">Verification Steps (CA/CFA/CEO):</div>
              <div className="text-sm leading-relaxed text-foreground text-left break-words">{explanation.verification}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

