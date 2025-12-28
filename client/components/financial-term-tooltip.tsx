"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FinancialTermTooltipProps {
  term: string
  definition?: string
  formula?: string
  className?: string
}

const financialTerms: Record<string, { definition: string; formula?: string }> = {
  "Health Score": {
    definition: "A composite metric measuring the overall financial stability of your business based on runway, burn rate, and revenue growth.",
    formula: "Weighted average of (Runway Score + Growth Score + Margin Score)"
  },
  "Monthly Revenue": {
    definition: "Total income generated from sales of goods or services associated with the main operations of the company during one month.",
    formula: "Sum of all sales transactions - Returns/Refunds"
  },
  "Monthly Burn Rate": {
    definition: "The rate at which a company spends its cash supply in a month to cover operating expenses.",
    formula: "Total Monthly Operating Expenses - Total Monthly Revenue (if negative)"
  },
  "Cash Runway": {
    definition: "The number of months a company can continue operating at its current burn rate before running out of cash.",
    formula: "Current Cash Balance / Monthly Net Burn"
  },
  "Active Customers": {
    definition: "The total number of unique customers who have made a purchase or have an active subscription during the current period.",
    formula: "Count of unique customer IDs with active status"
  },
  "Revenue Growth": {
    definition: "The percentage increase in revenue over a specific period compared to the previous period.",
    formula: "((Current Period Revenue - Previous Period Revenue) / Previous Period Revenue) * 100"
  },
  "Burn Rate Change": {
    definition: "The change in your monthly burn rate compared to the previous month.",
    formula: "Current Burn Rate - Previous Burn Rate"
  },
  "ARR": {
    definition: "Annual Recurring Revenue - a metric of predictable and recurring revenue components of your subscription business.",
    formula: "Monthly Recurring Revenue (MRR) * 12"
  },
  "LTV": {
    definition: "Lifetime Value - the total revenue you expect to earn from a customer over their entire relationship with your business.",
    formula: "Average Order Value * Number of Repeat Sales * Average Retention Time"
  },
  "CAC": {
    definition: "Customer Acquisition Cost - the total cost of winning a customer to purchase a product or service.",
    formula: "Total Marketing & Sales Spend / Number of New Customers Acquired"
  },
  "LTV:CAC Ratio": {
    definition: "A comparison of the value of a customer to the cost of acquiring them. A ratio of 3:1 is generally considered healthy.",
    formula: "Lifetime Value / Customer Acquisition Cost"
  },
  "Payback Period": {
    definition: "The amount of time it takes to recover the cost of acquiring a customer.",
    formula: "Customer Acquisition Cost / Average Monthly Gross Profit per Customer"
  },
  "Gross Profit": {
    definition: "The profit a company makes after deducting the costs associated with making and selling its products or services.",
    formula: "Total Revenue - Cost of Goods Sold (COGS)"
  },
  "Operating Expenses (OpEx)": {
    definition: "The costs required to run the day-to-day operations of a business, such as rent, salaries, and utilities.",
    formula: "Sum of all non-production costs"
  },
  "Net Income": {
    definition: "The total profit of a company after all expenses and taxes have been deducted from total revenue.",
    formula: "Gross Profit - Operating Expenses - Taxes - Interest"
  },
  "Variance": {
    definition: "The difference between planned (budgeted) financial outcomes and actual results.",
    formula: "Actual Value - Budgeted Value"
  },
  "Budget Accuracy": {
    definition: "A measure of how closely actual results aligned with the budgeted amounts.",
    formula: "1 - (Absolute Variance / Budgeted Amount)"
  },
  "Forecast Confidence": {
    definition: "A probability-based estimate of how likely the actual results will fall within the projected forecast range.",
    formula: "Based on historical variance and Monte Carlo simulation results"
  },
  "Gross Margin": {
    definition: "The percentage of revenue that exceeds the cost of goods sold.",
    formula: "(Total Revenue - COGS) / Total Revenue * 100"
  }
}

export function FinancialTermTooltip({ term, definition, formula, className = "" }: FinancialTermTooltipProps) {
  const termData = financialTerms[term] || { definition, formula }

  if (!termData.definition) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-4 w-4 text-muted-foreground hover:text-foreground cursor-help inline ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-3 p-1">
            <div>
              <div className="font-bold text-sm mb-1">{term}</div>
              <div className="text-sm leading-relaxed">{termData.definition}</div>
            </div>
            {termData.formula && (
              <div className="border-t pt-2">
                <div className="font-semibold text-xs text-muted-foreground mb-1">Formula:</div>
                <code className="text-xs bg-muted p-1 rounded block">{termData.formula}</code>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

