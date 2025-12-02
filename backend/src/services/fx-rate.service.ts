/**
 * FX Rate Service
 * Handles fetching and updating foreign exchange rates
 * Production-ready with external API integration
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD', 'HKD', 'CHF', 'NZD', 'AED', 'SAR'];

/**
 * Fetch FX rates from free API (exchangerate-api.com - no API key required)
 * Falls back to mock rates if API is unavailable
 */
async function fetchFxRatesFromAPI(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  // Try multiple free APIs in order of preference
  const apis = [
    // exchangerate-api.com - free, no API key required
    `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
    // Alternative: exchangerate.host - also free
    `https://api.exchangerate.host/latest?base=${baseCurrency}`,
  ];

  for (const apiUrl of apis) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        continue; // Try next API
      }

      const data = await response.json() as { rates?: Record<string, number>; conversion_rates?: Record<string, number> };
      const rates: Record<string, number> = {};
      
      // Handle different API response formats
      const apiRates = data.rates || data.conversion_rates || {};

      // Extract rates for supported currencies
      VALID_CURRENCIES.forEach((currency) => {
        if (currency !== baseCurrency && apiRates[currency]) {
          rates[currency] = apiRates[currency];
        }
      });

      if (Object.keys(rates).length > 0) {
        logger.info(`Fetched FX rates for base currency ${baseCurrency} from ${apiUrl}`);
        return rates;
      }
    } catch (error: any) {
      // Try next API
      logger.warn(`Failed to fetch from ${apiUrl}: ${error.message}`);
      continue;
    }
  }

  // If all APIs fail, use mock rates with realistic values
  logger.warn('All FX rate APIs failed, using mock rates');
  return getMockFxRates(baseCurrency);
}

/**
 * Get mock FX rates (for development/testing)
 * Uses realistic current rates (as of 2024)
 */
function getMockFxRates(baseCurrency: string = 'USD'): Record<string, number> {
  // Base rates relative to USD (realistic 2024 rates)
  const usdRates: Record<string, number> = {
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.15,
    AUD: 1.52,
    CAD: 1.35,
    JPY: 149.50,
    CNY: 7.24,
    SGD: 1.34,
    HKD: 7.82,
    CHF: 0.88,
    NZD: 1.64,
    AED: 3.67,
    SAR: 3.75,
  };

  // If base is USD, return as-is
  if (baseCurrency === 'USD') {
    return usdRates;
  }

  // Convert to base currency
  const baseRate = usdRates[baseCurrency] || 1;
  const rates: Record<string, number> = {};

  Object.keys(usdRates).forEach((currency) => {
    if (currency !== baseCurrency) {
      rates[currency] = usdRates[currency] / baseRate;
    }
  });

  // Add USD if not base
  if (baseCurrency !== 'USD') {
    rates['USD'] = 1 / baseRate;
  }

  return rates;
}

export const fxRateService = {
  /**
   * Update FX rates for an organization
   */
  updateFxRates: async (orgId: string, userId: string, baseCurrency?: string) => {
    try {
      // Verify user has access to organization
      const role = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!role) {
        throw new ValidationError('No access to this organization');
      }

      // Get current localization settings
      let localization = await prisma.localizationSettings.findUnique({
        where: { orgId },
      });

      if (!localization) {
        // Create default localization if it doesn't exist
        const org = await prisma.org.findUnique({ where: { id: orgId } });
        if (!org) {
          throw new ValidationError('Organization not found');
        }

        localization = await prisma.localizationSettings.create({
          data: {
            orgId,
            baseCurrency: baseCurrency || org.currency || 'USD',
            displayCurrency: baseCurrency || org.currency || 'USD',
            timezone: org.timezone || 'UTC',
          },
        });
      }

      const targetBaseCurrency = baseCurrency || localization.baseCurrency || 'USD';

      if (!VALID_CURRENCIES.includes(targetBaseCurrency)) {
        throw new ValidationError(`Invalid base currency: ${targetBaseCurrency}`);
      }

      // Fetch latest FX rates
      const fxRates = await fetchFxRatesFromAPI(targetBaseCurrency);

      // Update localization settings with new rates
      const updated = await prisma.localizationSettings.update({
        where: { orgId },
        data: {
          fxRatesJson: fxRates,
          ...(baseCurrency && { baseCurrency: targetBaseCurrency }),
        },
      });

      logger.info(`Updated FX rates for org ${orgId} with base currency ${targetBaseCurrency}`);

      return {
        baseCurrency: updated.baseCurrency,
        fxRates: (updated.fxRatesJson as Record<string, number>) || {},
        lastUpdated: updated.updatedAt,
      };
    } catch (error: any) {
      logger.error(`Error updating FX rates: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get current FX rates for an organization
   */
  getFxRates: async (orgId: string) => {
    const localization = await prisma.localizationSettings.findUnique({
      where: { orgId },
    });

    if (!localization) {
      throw new ValidationError('Localization settings not found');
    }

    return {
      baseCurrency: localization.baseCurrency,
      fxRates: (localization.fxRatesJson as Record<string, number>) || {},
      lastUpdated: localization.updatedAt,
      autoFxUpdate: localization.autoFxUpdate,
    };
  },

  /**
   * Convert amount from one currency to another
   */
  convertCurrency: async (
    orgId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const { fxRates, baseCurrency } = await fxRateService.getFxRates(orgId);

    // Convert to base currency first
    let baseAmount = amount;
    if (fromCurrency !== baseCurrency) {
      const fromRate = fxRates[fromCurrency];
      if (!fromRate) {
        throw new ValidationError(`No FX rate found for ${fromCurrency}`);
      }
      baseAmount = amount / fromRate;
    }

    // Convert from base to target currency
    if (toCurrency === baseCurrency) {
      return baseAmount;
    }

    const toRate = fxRates[toCurrency];
    if (!toRate) {
      throw new ValidationError(`No FX rate found for ${toCurrency}`);
    }

    return baseAmount * toRate;
  },
};

