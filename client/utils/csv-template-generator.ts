/**
 * CSV Template Generator
 * Generates CSV templates for different use cases with proper headers and sample data
 */

export interface TemplateConfig {
  name: string
  description: string
  headers: string[]
  sampleRows: string[][]
  format: 'csv' | 'excel'
}

/**
 * Generate CSV content from data
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ]

  return csvRows.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Financial Modeling Template - Standard transaction format
 */
export function generateFinancialModelingTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'Monthly subscription revenue', 'Revenue', 'Bank Account', 'INV-001', 'income', 'USD'],
    ['2024-01-16', '-2500.00', 'Office rent payment', 'Expenses', 'Bank Account', 'CHK-1234', 'expense', 'USD'],
    ['2024-01-17', '3000.00', 'Client payment - Project Alpha', 'Revenue', 'Bank Account', 'INV-002', 'income', 'USD'],
    ['2024-01-18', '-1200.00', 'Software subscription - Slack', 'Expenses', 'Credit Card', 'CC-5678', 'expense', 'USD'],
    ['2024-01-19', '-5000.00', 'Employee payroll', 'Expenses', 'Bank Account', 'PAY-001', 'expense', 'USD'],
    ['2024-01-20', '8000.00', 'Product sales revenue', 'Revenue', 'Bank Account', 'INV-003', 'income', 'USD'],
    ['2024-01-21', '-800.00', 'Marketing campaign - Google Ads', 'Expenses', 'Credit Card', 'CC-9012', 'expense', 'USD'],
    ['2024-01-22', '1500.00', 'Consulting fee', 'Revenue', 'Bank Account', 'INV-004', 'income', 'USD'],
    ['2024-01-23', '-600.00', 'Utilities - Electricity', 'Expenses', 'Bank Account', 'UTIL-001', 'expense', 'USD'],
    ['2024-01-24', '4500.00', 'Service contract payment', 'Revenue', 'Bank Account', 'INV-005', 'income', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Budget Template - Budget input format
 */
export function generateBudgetTemplate(): string {
  const headers = [
    'Category',
    'Month',
    'Amount',
    'Currency'
  ]

  const currentYear = new Date().getFullYear()
  const sampleRows = [
    ['Revenue', `${currentYear}-01`, '50000.00', 'USD'],
    ['Revenue', `${currentYear}-02`, '55000.00', 'USD'],
    ['Revenue', `${currentYear}-03`, '60000.00', 'USD'],
    ['COGS', `${currentYear}-01`, '15000.00', 'USD'],
    ['COGS', `${currentYear}-02`, '16500.00', 'USD'],
    ['COGS', `${currentYear}-03`, '18000.00', 'USD'],
    ['Marketing', `${currentYear}-01`, '5000.00', 'USD'],
    ['Marketing', `${currentYear}-02`, '5500.00', 'USD'],
    ['Marketing', `${currentYear}-03`, '6000.00', 'USD'],
    ['Payroll', `${currentYear}-01`, '35000.00', 'USD'],
    ['Payroll', `${currentYear}-02`, '35000.00', 'USD'],
    ['Payroll', `${currentYear}-03`, '35000.00', 'USD'],
    ['Operations', `${currentYear}-01`, '5000.00', 'USD'],
    ['Operations', `${currentYear}-02`, '5000.00', 'USD'],
    ['Operations', `${currentYear}-03`, '5000.00', 'USD'],
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Budget vs Actual Template - Actuals format
 */
export function generateBudgetActualTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '45000.00', 'Actual revenue - January', 'Revenue', 'Bank Account', 'ACT-001', 'income', 'USD'],
    ['2024-01-16', '-38000.00', 'Actual expenses - January', 'Expenses', 'Bank Account', 'ACT-002', 'expense', 'USD'],
    ['2024-01-17', '-5000.00', 'Actual payroll - January', 'Payroll', 'Bank Account', 'ACT-003', 'expense', 'USD'],
    ['2024-01-18', '-8000.00', 'Actual marketing - January', 'Marketing', 'Credit Card', 'ACT-004', 'expense', 'USD'],
    ['2024-01-19', '-12000.00', 'Actual operations - January', 'Operations', 'Bank Account', 'ACT-005', 'expense', 'USD'],
    ['2024-02-15', '52000.00', 'Actual revenue - February', 'Revenue', 'Bank Account', 'ACT-006', 'income', 'USD'],
    ['2024-02-16', '-41000.00', 'Actual expenses - February', 'Expenses', 'Bank Account', 'ACT-007', 'expense', 'USD'],
    ['2024-02-17', '-5000.00', 'Actual payroll - February', 'Payroll', 'Bank Account', 'ACT-008', 'expense', 'USD'],
    ['2024-02-18', '-9000.00', 'Actual marketing - February', 'Marketing', 'Credit Card', 'ACT-009', 'expense', 'USD'],
    ['2024-02-19', '-13000.00', 'Actual operations - February', 'Operations', 'Bank Account', 'ACT-010', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * QuickBooks Template
 */
export function generateQuickBooksTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['01/15/2024', '5000.00', 'Invoice Payment - Customer A', 'Accounts Receivable', 'Checking', 'QB-INV-001', 'income', 'USD'],
    ['01/16/2024', '-2500.00', 'Bill Payment - Vendor B', 'Accounts Payable', 'Checking', 'QB-BILL-001', 'expense', 'USD'],
    ['01/17/2024', '3000.00', 'Sales Receipt - Product X', 'Sales', 'Checking', 'QB-SR-001', 'income', 'USD'],
    ['01/18/2024', '-1200.00', 'Expense - Office Supplies', 'Office Expenses', 'Credit Card', 'QB-EXP-001', 'expense', 'USD'],
    ['01/19/2024', '-5000.00', 'Payroll - Employee Salaries', 'Payroll Expenses', 'Checking', 'QB-PAY-001', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Xero Template
 */
export function generateXeroTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['15/01/2024', '5000.00', 'Invoice Payment Received', 'Revenue', 'Bank Account', 'XERO-INV-001', 'income', 'USD'],
    ['16/01/2024', '-2500.00', 'Bill Payment Made', 'Expenses', 'Bank Account', 'XERO-BILL-001', 'expense', 'USD'],
    ['17/01/2024', '3000.00', 'Sales Invoice Payment', 'Sales Revenue', 'Bank Account', 'XERO-SI-001', 'income', 'USD'],
    ['18/01/2024', '-1200.00', 'Expense Claim', 'Expenses', 'Bank Account', 'XERO-EXP-001', 'expense', 'USD'],
    ['19/01/2024', '-5000.00', 'Payroll Payment', 'Payroll', 'Bank Account', 'XERO-PAY-001', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Tally Template
 */
export function generateTallyTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['15-01-2024', '5000.00', 'Sales Invoice Payment', 'Sales', 'Cash', 'TALLY-INV-001', 'income', 'INR'],
    ['16-01-2024', '-2500.00', 'Purchase Payment', 'Purchases', 'Bank', 'TALLY-PUR-001', 'expense', 'INR'],
    ['17-01-2024', '3000.00', 'Receipt Voucher', 'Receipts', 'Cash', 'TALLY-RCP-001', 'income', 'INR'],
    ['18-01-2024', '-1200.00', 'Payment Voucher', 'Payments', 'Bank', 'TALLY-PAY-001', 'expense', 'INR'],
    ['19-01-2024', '-5000.00', 'Salary Payment', 'Salaries', 'Bank', 'TALLY-SAL-001', 'expense', 'INR']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Zoho Books Template
 */
export function generateZohoTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'Invoice Payment', 'Income', 'Bank Account', 'ZOHO-INV-001', 'income', 'USD'],
    ['2024-01-16', '-2500.00', 'Expense Payment', 'Expenses', 'Bank Account', 'ZOHO-EXP-001', 'expense', 'USD'],
    ['2024-01-17', '3000.00', 'Sales Receipt', 'Sales', 'Bank Account', 'ZOHO-SR-001', 'income', 'USD'],
    ['2024-01-18', '-1200.00', 'Vendor Payment', 'Vendor Expenses', 'Bank Account', 'ZOHO-VEN-001', 'expense', 'USD'],
    ['2024-01-19', '-5000.00', 'Employee Payment', 'Payroll', 'Bank Account', 'ZOHO-EMP-001', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Razorpay Template
 */
export function generateRazorpayTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'Payment received - Order #12345', 'Payment Gateway', 'Razorpay Account', 'rzp_001', 'income', 'INR'],
    ['2024-01-16', '3000.00', 'Payment received - Order #12346', 'Payment Gateway', 'Razorpay Account', 'rzp_002', 'income', 'INR'],
    ['2024-01-17', '-150.00', 'Razorpay fees - Transaction fee', 'Fees', 'Razorpay Account', 'rzp_fee_001', 'expense', 'INR'],
    ['2024-01-18', '8000.00', 'Payment received - Order #12347', 'Payment Gateway', 'Razorpay Account', 'rzp_003', 'income', 'INR'],
    ['2024-01-19', '-240.00', 'Razorpay fees - Transaction fee', 'Fees', 'Razorpay Account', 'rzp_fee_002', 'expense', 'INR']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Stripe Template
 */
export function generateStripeTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'Payment - Subscription charge', 'Subscription Revenue', 'Stripe Account', 'ch_001', 'income', 'USD'],
    ['2024-01-16', '3000.00', 'Payment - One-time payment', 'Product Sales', 'Stripe Account', 'ch_002', 'income', 'USD'],
    ['2024-01-17', '-150.00', 'Stripe fees - Processing fee', 'Payment Processing Fees', 'Stripe Account', 'fee_001', 'expense', 'USD'],
    ['2024-01-18', '8000.00', 'Payment - Subscription charge', 'Subscription Revenue', 'Stripe Account', 'ch_003', 'income', 'USD'],
    ['2024-01-19', '-240.00', 'Stripe fees - Processing fee', 'Payment Processing Fees', 'Stripe Account', 'fee_002', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Bank Statement Template
 */
export function generateBankStatementTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'ACH Credit - Customer Payment', 'Deposits', 'Checking Account', 'ACH-001', 'income', 'USD'],
    ['2024-01-16', '-2500.00', 'ACH Debit - Vendor Payment', 'Withdrawals', 'Checking Account', 'ACH-002', 'expense', 'USD'],
    ['2024-01-17', '3000.00', 'Wire Transfer - Client Payment', 'Deposits', 'Checking Account', 'WIRE-001', 'income', 'USD'],
    ['2024-01-18', '-1200.00', 'Check Payment - Invoice #123', 'Withdrawals', 'Checking Account', 'CHK-1234', 'expense', 'USD'],
    ['2024-01-19', '-5000.00', 'ACH Debit - Payroll', 'Payroll', 'Checking Account', 'ACH-003', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Generic Accounting Template
 */
export function generateGenericAccountingTemplate(): string {
  const headers = [
    'Date',
    'Amount',
    'Description',
    'Category',
    'Account',
    'Reference',
    'Type',
    'Currency'
  ]

  const sampleRows = [
    ['2024-01-15', '5000.00', 'Revenue transaction', 'Revenue', 'Main Account', 'REF-001', 'income', 'USD'],
    ['2024-01-16', '-2500.00', 'Expense transaction', 'Expenses', 'Main Account', 'REF-002', 'expense', 'USD'],
    ['2024-01-17', '3000.00', 'Income transaction', 'Income', 'Main Account', 'REF-003', 'income', 'USD'],
    ['2024-01-18', '-1200.00', 'Cost transaction', 'Costs', 'Main Account', 'REF-004', 'expense', 'USD'],
    ['2024-01-19', '-5000.00', 'Payment transaction', 'Payments', 'Main Account', 'REF-005', 'expense', 'USD']
  ]

  return generateCSV(headers, sampleRows)
}

/**
 * Template configurations for integrations
 */
export const integrationTemplates = {
  quickbooks: {
    name: 'QuickBooks Online',
    description: 'Template for QuickBooks Online exports',
    generator: generateQuickBooksTemplate,
    filename: 'quickbooks-template.csv'
  },
  xero: {
    name: 'Xero',
    description: 'Template for Xero accounting exports',
    generator: generateXeroTemplate,
    filename: 'xero-template.csv'
  },
  tally: {
    name: 'Tally',
    description: 'Template for Tally accounting software',
    generator: generateTallyTemplate,
    filename: 'tally-template.csv'
  },
  zoho: {
    name: 'Zoho Books',
    description: 'Template for Zoho Books exports',
    generator: generateZohoTemplate,
    filename: 'zoho-books-template.csv'
  },
  razorpay: {
    name: 'Razorpay',
    description: 'Template for Razorpay payment gateway',
    generator: generateRazorpayTemplate,
    filename: 'razorpay-template.csv'
  },
  stripe: {
    name: 'Stripe',
    description: 'Template for Stripe payment processor',
    generator: generateStripeTemplate,
    filename: 'stripe-template.csv'
  },
  bank: {
    name: 'Bank Statement',
    description: 'Template for bank statement imports',
    generator: generateBankStatementTemplate,
    filename: 'bank-statement-template.csv'
  },
  generic: {
    name: 'Generic Accounting',
    description: 'Generic template for any accounting system',
    generator: generateGenericAccountingTemplate,
    filename: 'generic-accounting-template.csv'
  }
}

