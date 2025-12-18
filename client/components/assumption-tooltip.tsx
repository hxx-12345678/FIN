"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AssumptionTooltipProps {
  assumptionKey: string
  className?: string
}

const assumptionExplanations: Record<string, { explanation: string; effect: string }> = {
  baselineRevenue: {
    explanation: "The starting monthly revenue amount used as the foundation for your financial projections. This is the revenue you expect in the first month of your forecast.",
    effect: "Higher baseline revenue increases all future revenue projections proportionally. A 10% increase in baseline revenue will increase all monthly revenue forecasts by 10%, directly impacting cash flow and profitability."
  },
  revenueGrowth: {
    explanation: "The monthly percentage rate at which your revenue is expected to grow. This is applied month-over-month to calculate future revenue.",
    effect: "A higher growth rate compounds over time - 8% monthly growth means revenue doubles in about 9 months. Small changes in growth rate have exponential effects on long-term projections. A 1% increase can significantly impact cash runway and profitability."
  },
  churnRate: {
    explanation: "The percentage of customers or revenue lost each month. This represents customers canceling subscriptions or reducing spending.",
    effect: "Churn directly reduces revenue growth. A 5% monthly churn means you lose 5% of revenue each month, which must be offset by new customer acquisition. Lower churn extends customer lifetime value and improves cash runway."
  },
  cac: {
    explanation: "Customer Acquisition Cost (CAC) is the total cost to acquire a new customer, including marketing and sales expenses.",
    effect: "CAC affects profitability and cash flow. Higher CAC means you spend more to acquire customers, reducing net income. It's compared to LTV (Lifetime Value) - ideally LTV should be 3x CAC or higher for sustainable growth."
  },
  ltv: {
    explanation: "Customer Lifetime Value (LTV) is the total revenue you expect to earn from a customer over their entire relationship with your business.",
    effect: "LTV determines the maximum you can spend on customer acquisition. Higher LTV allows for higher CAC spending. The LTV:CAC ratio should be at least 3:1 for healthy unit economics. Higher LTV improves long-term profitability."
  },
  baselineExpenses: {
    explanation: "The starting monthly operating expenses (excluding COGS) used as the foundation for expense projections. Includes salaries, rent, marketing, and other operational costs.",
    effect: "Baseline expenses directly impact cash burn rate and runway. Higher expenses reduce net income and cash flow. A $10,000 increase in monthly expenses reduces cash runway by approximately (10,000 / monthly burn rate) months."
  },
  expenseGrowth: {
    explanation: "The monthly percentage rate at which your operating expenses are expected to grow. This accounts for hiring, inflation, and business expansion.",
    effect: "Expense growth compounds over time and can outpace revenue growth, leading to increased burn rate. A 5% monthly expense growth means expenses double in about 14 months. Controlling expense growth is critical for extending cash runway."
  },
  cogsPercentage: {
    explanation: "Cost of Goods Sold (COGS) as a percentage of revenue. This represents the direct costs of producing your product or service (e.g., hosting, payment processing, materials).",
    effect: "COGS directly impacts gross margin. A 20% COGS means 80% gross margin. Lower COGS percentage improves profitability and cash flow. A 5% reduction in COGS percentage can significantly increase net income, especially at scale."
  },
  initialCash: {
    explanation: "The starting cash balance at the beginning of your financial model. This is your current cash position or the cash you expect to have when the model starts.",
    effect: "Initial cash directly determines cash runway. Higher initial cash extends how long you can operate before running out of money. Cash runway = Initial Cash / Monthly Burn Rate. This is critical for planning fundraising timing."
  }
}

export function AssumptionTooltip({ assumptionKey, className = "" }: AssumptionTooltipProps) {
  const assumption = assumptionExplanations[assumptionKey]

  if (!assumption) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-4 w-4 text-muted-foreground hover:text-foreground cursor-help inline ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-3">
            <div>
              <div className="font-semibold mb-1">What it means:</div>
              <div className="text-sm">{assumption.explanation}</div>
            </div>
            <div className="border-t pt-2">
              <div className="font-semibold mb-1">Effect on model:</div>
              <div className="text-sm">{assumption.effect}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

