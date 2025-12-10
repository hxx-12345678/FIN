/**
 * CSV Template Configuration
 * Defines CSV templates for different industries with headers and example rows
 */

export type IndustryType = 'saas' | 'ecommerce' | 'quickcommerce';

export interface CSVTemplateConfig {
  industry: IndustryType;
  headers: string[];
  exampleRows: Record<string, string | number>[];
  description: string;
}

/**
 * SaaS Template Configuration
 * Includes: MRR, churn, ARPA, ARR, customer count, CAC, LTV, COGS
 */
const saasTemplate: CSVTemplateConfig = {
  industry: 'saas',
  description: 'SaaS financial data template with subscription metrics',
  headers: [
    'date',
    'mrr',
    'arr',
    'customer_count',
    'new_customers',
    'churned_customers',
    'churn_rate',
    'arpa',
    'cac',
    'ltv',
    'revenue',
    'cogs',
    'payroll',
    'infrastructure',
    'marketing',
    'operating_expenses',
    'cash_balance',
  ],
  exampleRows: [
    {
      date: '2024-01-31',
      mrr: 10000,
      arr: 120000,
      customer_count: 100,
      new_customers: 15,
      churned_customers: 5,
      churn_rate: 0.05,
      arpa: 100,
      cac: 125,
      ltv: 2400,
      revenue: 10000,
      cogs: 2000,
      payroll: 50000,
      infrastructure: 2000,
      marketing: 10000,
      operating_expenses: 65000,
      cash_balance: 500000,
    },
    {
      date: '2024-02-29',
      mrr: 10500,
      arr: 126000,
      customer_count: 110,
      new_customers: 18,
      churned_customers: 8,
      churn_rate: 0.073,
      arpa: 95.45,
      cac: 130,
      ltv: 2450,
      revenue: 10500,
      cogs: 2100,
      payroll: 52000,
      infrastructure: 2100,
      marketing: 12000,
      operating_expenses: 68200,
      cash_balance: 481800,
    },
    {
      date: '2024-03-31',
      mrr: 11200,
      arr: 134400,
      customer_count: 120,
      new_customers: 20,
      churned_customers: 10,
      churn_rate: 0.083,
      arpa: 93.33,
      cac: 135,
      ltv: 2500,
      revenue: 11200,
      cogs: 2240,
      payroll: 54000,
      infrastructure: 2200,
      marketing: 15000,
      operating_expenses: 73640,
      cash_balance: 422960,
    },
  ],
};

/**
 * E-commerce Template Configuration
 * Includes: Revenue, AOV, conversion rate, orders, COGS, inventory
 */
const ecommerceTemplate: CSVTemplateConfig = {
  industry: 'ecommerce',
  description: 'E-commerce financial data template with transaction metrics',
  headers: [
    'date',
    'revenue',
    'orders',
    'aov',
    'conversion_rate',
    'traffic',
    'units_sold',
    'cogs',
    'inventory_value',
    'shipping_costs',
    'payment_processing',
    'marketing',
    'payroll',
    'infrastructure',
    'operating_expenses',
    'cash_balance',
  ],
  exampleRows: [
    {
      date: '2024-01-31',
      revenue: 50000,
      orders: 1000,
      aov: 50,
      conversion_rate: 0.03,
      traffic: 33333,
      units_sold: 1500,
      cogs: 20000,
      inventory_value: 50000,
      shipping_costs: 3000,
      payment_processing: 1500,
      marketing: 10000,
      payroll: 25000,
      infrastructure: 5000,
      operating_expenses: 45500,
      cash_balance: 300000,
    },
    {
      date: '2024-02-29',
      revenue: 55000,
      orders: 1050,
      aov: 52.38,
      conversion_rate: 0.031,
      traffic: 33871,
      units_sold: 1650,
      cogs: 22000,
      inventory_value: 48000,
      shipping_costs: 3200,
      payment_processing: 1650,
      marketing: 12000,
      payroll: 26000,
      infrastructure: 5100,
      operating_expenses: 48950,
      cash_balance: 281050,
    },
    {
      date: '2024-03-31',
      revenue: 62000,
      orders: 1150,
      aov: 53.91,
      conversion_rate: 0.033,
      traffic: 34848,
      units_sold: 1800,
      cogs: 24800,
      inventory_value: 52000,
      shipping_costs: 3500,
      payment_processing: 1860,
      marketing: 15000,
      payroll: 27000,
      infrastructure: 5200,
      operating_expenses: 57560,
      cash_balance: 265490,
    },
  ],
};

/**
 * Quick Commerce Template Configuration
 * Includes: Revenue, orders, delivery time, inventory turnover, COGS
 */
const quickcommerceTemplate: CSVTemplateConfig = {
  industry: 'quickcommerce',
  description: 'Quick commerce financial data template with fast delivery metrics',
  headers: [
    'date',
    'revenue',
    'orders',
    'aov',
    'orders_per_day',
    'average_delivery_time_minutes',
    'active_customers',
    'units_sold',
    'cogs',
    'inventory_value',
    'inventory_turnover',
    'delivery_costs',
    'payment_processing',
    'marketing',
    'payroll',
    'warehouse_costs',
    'operating_expenses',
    'cash_balance',
  ],
  exampleRows: [
    {
      date: '2024-01-31',
      revenue: 75000,
      orders: 2500,
      aov: 30,
      orders_per_day: 80.65,
      average_delivery_time_minutes: 25,
      active_customers: 5000,
      units_sold: 4000,
      cogs: 30000,
      inventory_value: 80000,
      inventory_turnover: 0.375,
      delivery_costs: 10000,
      payment_processing: 2250,
      marketing: 15000,
      payroll: 35000,
      warehouse_costs: 8000,
      operating_expenses: 70250,
      cash_balance: 200000,
    },
    {
      date: '2024-02-29',
      revenue: 80000,
      orders: 2667,
      aov: 30,
      orders_per_day: 92.0,
      average_delivery_time_minutes: 23,
      active_customers: 5500,
      units_sold: 4300,
      cogs: 32000,
      inventory_value: 85000,
      inventory_turnover: 0.376,
      delivery_costs: 10667,
      payment_processing: 2400,
      marketing: 18000,
      payroll: 36000,
      warehouse_costs: 8500,
      operating_expenses: 77567,
      cash_balance: 192483,
    },
    {
      date: '2024-03-31',
      revenue: 90000,
      orders: 3000,
      aov: 30,
      orders_per_day: 96.77,
      average_delivery_time_minutes: 22,
      active_customers: 6000,
      units_sold: 4800,
      cogs: 36000,
      inventory_value: 90000,
      inventory_turnover: 0.4,
      delivery_costs: 12000,
      payment_processing: 2700,
      marketing: 20000,
      payroll: 37000,
      warehouse_costs: 9000,
      operating_expenses: 87700,
      cash_balance: 184783,
    },
  ],
};

/**
 * Template registry mapping industry types to configurations
 */
const templateRegistry: Record<IndustryType, CSVTemplateConfig> = {
  saas: saasTemplate,
  ecommerce: ecommerceTemplate,
  quickcommerce: quickcommerceTemplate,
};

/**
 * Get available industries
 */
export const getAvailableIndustries = (): IndustryType[] => {
  return Object.keys(templateRegistry) as IndustryType[];
};

/**
 * Get template configuration for an industry
 */
export const getTemplateConfig = (industry: IndustryType): CSVTemplateConfig | null => {
  return templateRegistry[industry] || null;
};

/**
 * Validate industry type
 */
export const isValidIndustry = (industry: string): industry is IndustryType => {
  return industry in templateRegistry;
};

export { templateRegistry };


