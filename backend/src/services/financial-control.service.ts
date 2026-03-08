/**
 * Enterprise Financial Control Service
 * ======================================
 * TypeScript service layer that orchestrates enterprise financial controls:
 * 
 * 1. Debt Schedule Management & Covenant Compliance
 * 2. Equity Dilution Modeling
 * 3. Tax Logic & Multi-Jurisdiction
 * 4. Deferred Revenue (ASC 606)
 * 5. Working Capital Dynamics
 * 6. Reconciliation & Constraint Enforcement
 * 7. AI Pipeline Orchestration
 * 8. Model Confidence Reporting
 * 
 * Connects frontend → backend → Python worker
 */

import axios from 'axios';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:5000';
const WORKER_SECRET = process.env.WORKER_SECRET || '';

const workerHeaders = {
    'Content-Type': 'application/json',
    'x-worker-secret': WORKER_SECRET,
};

// =============================================================================
// FINANCIAL CONTROLS SERVICE
// =============================================================================

export const financialControlService = {

    /**
     * Run the complete financial control suite over 3-statement output
     */
    async runFinancialControls(
        statements: any,
        debtInstruments?: any[],
        contracts?: any[],
        workingCapitalConfig?: any
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/financial-controls`,
            {
                statements,
                debtInstruments,
                contracts,
                workingCapitalConfig,
            },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Validate accounting constraints and cross-sheet consistency
     */
    async validateConstraints(
        incomeStatement: Record<string, any>,
        cashFlow: Record<string, any>,
        balanceSheet: Record<string, any>
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/constraints/validate`,
            { incomeStatement, cashFlow, balanceSheet },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Run enterprise-grade forecasting with regime detection,
     * hybrid models, and confidence scoring
     */
    async runEnterpriseForecast(
        history: number[],
        steps: number,
        options?: {
            features?: Record<string, number[]>;
            featuresForecast?: Record<string, number[]>;
            drivers?: Record<string, any>;
            driverOverrides?: Record<number, number>;
            assumptions?: Record<string, number>;
            industryBenchmarks?: Record<string, [number, number]>;
        }
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/forecast/enterprise`,
            {
                history,
                steps,
                ...options,
            },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Detect regime shifts in financial time series
     */
    async detectRegimes(
        history: number[],
        method: string = 'auto',
        sensitivity: number = 2.0
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/forecast/regime`,
            { history, method, sensitivity },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Compute model confidence score
     */
    async getModelConfidence(
        history: number[],
        forecast: number[],
        assumptions?: Record<string, number>,
        industryBenchmarks?: Record<string, [number, number]>
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/forecast/confidence`,
            { history, forecast, assumptions, industryBenchmarks },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Run the 5-step AI modeling pipeline
     */
    async runAIPipeline(
        data: Record<string, number[]>,
        targetMetric: string = 'revenue',
        businessContext?: any,
        industryBenchmarks?: any
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/ai-pipeline`,
            { data, targetMetric, businessContext, industryBenchmarks },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Auto-rank sensitivity of assumptions on target metric
     */
    async rankSensitivities(
        history: number[],
        steps: number,
        assumptions: Record<string, number>,
        targetMetric: string = 'revenue',
        perturbation: number = 0.10
    ) {
        const response = await axios.post(
            `${WORKER_URL}/compute/sensitivity`,
            { history, steps, assumptions, targetMetric, perturbation },
            { headers: workerHeaders }
        );
        return response.data;
    },

    /**
     * Detect which parameter mode the frontend should use
     */
    async detectParameterMode(options: {
        hasConnector?: boolean;
        hasCsv?: boolean;
        hasTransactions?: boolean;
        transactionMonths?: number;
    }) {
        const response = await axios.post(
            `${WORKER_URL}/compute/parameter-mode`,
            options,
            { headers: workerHeaders }
        );
        return response.data;
    },

    // =========================================================================
    // DEBT SCHEDULE HELPERS (used by frontend)
    // =========================================================================

    /**
     * Build debt instruments config from user input
     */
    buildDebtInstruments(instruments: Array<{
        id: string;
        type: 'term_loan' | 'revolver' | 'convertible_note' | 'bond';
        principal: number;
        interestRate: number;
        termMonths: number;
        startDate: string;
        amortization?: 'straight_line' | 'bullet' | 'equal_payment';
        rateType?: 'fixed' | 'variable';
    }>): any[] {
        return instruments.map(inst => ({
            id: inst.id,
            type: inst.type,
            principal: inst.principal,
            interest_rate: inst.interestRate,
            term_months: inst.termMonths,
            start_date: inst.startDate,
            amortization: inst.amortization || 'straight_line',
            rate_type: inst.rateType || 'fixed',
        }));
    },

    /**
     * Build deferred revenue contracts from user input
     */
    buildContracts(contracts: Array<{
        id: string;
        customer: string;
        totalValue: number;
        startDate: string;
        termMonths: number;
        recognitionPattern?: 'straight_line' | 'milestone' | 'usage' | 'point_in_time';
        billingPattern?: 'upfront' | 'monthly' | 'quarterly' | 'annual';
    }>): any[] {
        return contracts.map(c => ({
            id: c.id,
            customer: c.customer,
            total_value: c.totalValue,
            start_date: c.startDate,
            term_months: c.termMonths,
            recognition_pattern: c.recognitionPattern || 'straight_line',
            billing_pattern: c.billingPattern || 'monthly',
        }));
    },

    // =========================================================================
    // CONFIDENCE BAND INTERPRETATION (used by frontend)
    // =========================================================================

    interpretConfidence(confidence: any): {
        badge: string;
        color: string;
        message: string;
    } {
        const score = confidence?.overall_confidence || 0;
        const band = confidence?.confidence_band || 'very_low';

        const interpretations: Record<string, { badge: string; color: string; message: string }> = {
            high: {
                badge: '🟢 High Confidence',
                color: '#22c55e',
                message: 'Model is reliable for board-level reporting.',
            },
            medium: {
                badge: '🟡 Medium Confidence',
                color: '#eab308',
                message: 'Consider Monte Carlo simulation before major decisions.',
            },
            low: {
                badge: '🟠 Low Confidence',
                color: '#f97316',
                message: 'Manual review recommended. Widen confidence intervals.',
            },
            very_low: {
                badge: '🔴 Very Low Confidence',
                color: '#ef4444',
                message: 'Not reliable for decisions. Improve data quality.',
            },
        };

        return interpretations[band] || interpretations.very_low;
    },
};

export default financialControlService;
