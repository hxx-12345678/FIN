/**
 * Industry Templates Service
 * Provides prebuilt templates for SaaS, eCommerce, and Services with MRR, churn, ARPA, COGS presets
 */

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  revenueModelType: 'subscription' | 'transactional' | 'services' | 'hybrid';
  description: string;
  assumptions: {
    revenue: {
      baseline?: number;
      driver?: string;
      mrr?: number;
      churnRate?: number;
      arpa?: number;
      arr?: number;
      aov?: number;
      conversionRate?: number;
      hourlyRate?: number;
      utilizationRate?: number;
    };
    expenses: {
      baseline?: number;
      driver?: string;
      cogs?: number;
      payroll?: number;
      infrastructure?: number;
      marketing?: number;
    };
    cash: {
      initialCash?: number;
    };
    unitEconomics?: {
      cac?: number;
      ltv?: number;
      paybackPeriod?: number;
    };
  };
}

export const industryTemplatesService = {
  /**
   * Get all available industry templates
   */
  getTemplates: (): IndustryTemplate[] => {
    return [
      {
        id: 'saas-standard',
        name: 'SaaS Standard',
        industry: 'SaaS',
        revenueModelType: 'subscription',
        description: 'Standard SaaS template with MRR, churn, ARPA presets',
        assumptions: {
          revenue: {
            baseline: 10000,
            driver: 'mrr',
            mrr: 10000,
            churnRate: 0.05, // 5% monthly churn
            arpa: 100, // Average Revenue Per Account
            arr: 120000, // Annual Recurring Revenue
          },
          expenses: {
            baseline: 8000,
            driver: 'expense_growth',
            cogs: 2000, // 20% COGS for SaaS
            payroll: 5000,
            infrastructure: 2000,
            marketing: 1000,
          },
          cash: {
            initialCash: 500000,
          },
          unitEconomics: {
            cac: 125,
            ltv: 2400,
            paybackPeriod: 1.25,
          },
        },
      },
      {
        id: 'ecommerce-standard',
        name: 'E-commerce Standard',
        industry: 'E-commerce',
        revenueModelType: 'transactional',
        description: 'Standard eCommerce template with AOV, conversion rate, COGS presets',
        assumptions: {
          revenue: {
            baseline: 50000,
            driver: 'revenue_growth',
            aov: 50, // Average Order Value
            conversionRate: 0.03, // 3% conversion rate
          },
          expenses: {
            baseline: 40000,
            driver: 'expense_growth',
            cogs: 20000, // 40% COGS for eCommerce
            payroll: 15000,
            infrastructure: 5000,
            marketing: 10000,
          },
          cash: {
            initialCash: 300000,
          },
          unitEconomics: {
            cac: 25,
            ltv: 150,
            paybackPeriod: 0.5,
          },
        },
      },
      {
        id: 'services-standard',
        name: 'Services Standard',
        industry: 'Services',
        revenueModelType: 'services',
        description: 'Standard services template with hourly rate, utilization, COGS presets',
        assumptions: {
          revenue: {
            baseline: 30000,
            driver: 'revenue_growth',
            hourlyRate: 150,
            utilizationRate: 0.75, // 75% utilization
          },
          expenses: {
            baseline: 25000,
            driver: 'expense_growth',
            cogs: 10000, // 33% COGS for services
            payroll: 15000,
            infrastructure: 3000,
            marketing: 2000,
          },
          cash: {
            initialCash: 200000,
          },
          unitEconomics: {
            cac: 500,
            ltv: 18000,
            paybackPeriod: 3.33,
          },
        },
      },
    ];
  },

  /**
   * Get template by ID
   */
  getTemplateById: (templateId: string): IndustryTemplate | null => {
    const templates = industryTemplatesService.getTemplates();
    return templates.find(t => t.id === templateId) || null;
  },

  /**
   * Get template by industry
   */
  getTemplateByIndustry: (industry: string): IndustryTemplate | null => {
    const templates = industryTemplatesService.getTemplates();
    return templates.find(t => t.industry.toLowerCase() === industry.toLowerCase()) || null;
  },

  /**
   * Apply template to model creation request
   */
  applyTemplate: (templateId: string, overrides?: Partial<IndustryTemplate['assumptions']>): IndustryTemplate['assumptions'] => {
    const template = industryTemplatesService.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const assumptions = JSON.parse(JSON.stringify(template.assumptions)); // Deep clone

    // Apply overrides if provided
    if (overrides) {
      if (overrides.revenue) {
        assumptions.revenue = { ...assumptions.revenue, ...overrides.revenue };
      }
      if (overrides.expenses) {
        assumptions.expenses = { ...assumptions.expenses, ...overrides.expenses };
      }
      if (overrides.cash) {
        assumptions.cash = { ...assumptions.cash, ...overrides.cash };
      }
      if (overrides.unitEconomics) {
        assumptions.unitEconomics = { ...assumptions.unitEconomics, ...overrides.unitEconomics };
      }
    }

    return assumptions;
  },
};

