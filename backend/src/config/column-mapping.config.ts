/**
 * Column Mapping Configuration
 * Defines synonyms and mapping rules for automated CSV column mapping
 */

export interface MappingRule {
  internalField: string;
  synonyms: string[];
  category: 'revenue' | 'costs' | 'metrics' | 'metadata' | 'units' | 'economics';
  required: boolean;
  dataType: 'number' | 'date' | 'string' | 'percentage';
  confidence: number; // Base confidence score (0-1)
}

/**
 * Internal field definitions with synonyms
 */
export const mappingRules: MappingRule[] = [
  // Revenue Fields
  {
    internalField: 'revenue',
    synonyms: ['revenue', 'sales', 'income', 'total_revenue', 'total_sales', 'sales_revenue', 'gross_revenue'],
    category: 'revenue',
    required: false,
    dataType: 'number',
    confidence: 0.95,
  },
  {
    internalField: 'mrr',
    synonyms: ['mrr', 'monthly_recurring_revenue', 'monthly_revenue', 'recurring_revenue'],
    category: 'revenue',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'arr',
    synonyms: ['arr', 'annual_recurring_revenue', 'annual_revenue', 'yearly_revenue'],
    category: 'revenue',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'aov',
    synonyms: ['aov', 'average_order_value', 'avg_order_value', 'order_value', 'transaction_value'],
    category: 'revenue',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },

  // Cost Fields
  {
    internalField: 'cogs',
    synonyms: ['cogs', 'cost_of_goods_sold', 'cost_of_sales', 'direct_costs', 'product_costs'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'payroll',
    synonyms: ['payroll', 'salaries', 'wages', 'employee_costs', 'personnel_costs', 'labor_costs'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },
  {
    internalField: 'marketing',
    synonyms: ['marketing', 'advertising', 'ads', 'marketing_spend', 'ad_spend', 'customer_acquisition'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },
  {
    internalField: 'infrastructure',
    synonyms: ['infrastructure', 'infra', 'hosting', 'cloud_costs', 'aws', 'servers', 'it_costs'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.8,
  },
  {
    internalField: 'operating_expenses',
    synonyms: ['operating_expenses', 'opex', 'operating_costs', 'total_expenses', 'expenses'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.75,
  },

  // Unit Economics
  {
    internalField: 'cac',
    synonyms: ['cac', 'customer_acquisition_cost', 'acquisition_cost', 'cost_per_customer'],
    category: 'economics',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'ltv',
    synonyms: ['ltv', 'lifetime_value', 'customer_lifetime_value', 'cltv', 'customer_value'],
    category: 'economics',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'churn_rate',
    synonyms: ['churn_rate', 'churn', 'customer_churn', 'attrition_rate', 'churn_percentage'],
    category: 'economics',
    required: false,
    dataType: 'percentage',
    confidence: 0.85,
  },
  {
    internalField: 'arpa',
    synonyms: ['arpa', 'average_revenue_per_account', 'avg_revenue_per_account', 'revenue_per_customer'],
    category: 'economics',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },

  // Customer Metrics
  {
    internalField: 'customer_count',
    synonyms: ['customer_count', 'customers', 'total_customers', 'active_customers', 'customer_base'],
    category: 'metrics',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'new_customers',
    synonyms: ['new_customers', 'customer_acquisitions', 'new_signups', 'new_accounts'],
    category: 'metrics',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },
  {
    internalField: 'churned_customers',
    synonyms: ['churned_customers', 'churned', 'lost_customers', 'cancellations'],
    category: 'metrics',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },

  // E-commerce Specific
  {
    internalField: 'orders',
    synonyms: ['orders', 'order_count', 'total_orders', 'transactions', 'order_volume'],
    category: 'metrics',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
  {
    internalField: 'conversion_rate',
    synonyms: ['conversion_rate', 'conversion', 'conv_rate', 'conversion_percentage'],
    category: 'metrics',
    required: false,
    dataType: 'percentage',
    confidence: 0.85,
  },
  {
    internalField: 'units_sold',
    synonyms: ['units_sold', 'quantity', 'qty', 'units', 'items_sold'],
    category: 'units',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },
  {
    internalField: 'inventory_value',
    synonyms: ['inventory_value', 'inventory', 'stock_value', 'inventory_cost'],
    category: 'costs',
    required: false,
    dataType: 'number',
    confidence: 0.85,
  },

  // Metadata
  {
    internalField: 'date',
    synonyms: ['date', 'transaction_date', 'posted_date', 'invoice_date', 'payment_date', 'period', 'month'],
    category: 'metadata',
    required: true,
    dataType: 'date',
    confidence: 0.95,
  },
  {
    internalField: 'description',
    synonyms: ['description', 'memo', 'notes', 'details', 'narration', 'particulars', 'comment'],
    category: 'metadata',
    required: false,
    dataType: 'string',
    confidence: 0.7,
  },
  {
    internalField: 'category',
    synonyms: ['category', 'account', 'account_name', 'type', 'classification', 'group'],
    category: 'metadata',
    required: false,
    dataType: 'string',
    confidence: 0.75,
  },

  // Cash
  {
    internalField: 'cash_balance',
    synonyms: ['cash_balance', 'cash', 'bank_balance', 'cash_on_hand', 'balance'],
    category: 'metrics',
    required: false,
    dataType: 'number',
    confidence: 0.9,
  },
];

/**
 * Get mapping rule by internal field
 */
export const getMappingRule = (internalField: string): MappingRule | undefined => {
  return mappingRules.find(rule => rule.internalField === internalField);
};

/**
 * Get all synonyms for an internal field
 */
export const getSynonyms = (internalField: string): string[] => {
  const rule = getMappingRule(internalField);
  return rule?.synonyms || [];
};

/**
 * Normalize column name for matching
 */
export const normalizeColumnName = (columnName: string): string => {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '_') // Replace spaces, hyphens, multiple underscores with single underscore
    .replace(/[^a-z0-9_]/g, ''); // Remove special characters
};

/**
 * Calculate similarity score between two strings using Levenshtein distance
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeColumnName(str1);
  const s2 = normalizeColumnName(str2);

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Calculate Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLength = Math.max(len1, len2);
  return 1 - distance / maxLength;
};


