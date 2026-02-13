/**
 * Risk Analysis Service
 */

import axios from 'axios';
import prisma from '../config/database';
import { ValidationError } from '../utils/errors';

const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:5000';

export interface RiskDistribution {
  dist: 'normal' | 'uniform' | 'triangular';
  params: Record<string, number>;
}

export const riskService = {
  /**
   * Run a multi-dimensional risk simulation
   */
  runRiskAnalysis: async (orgId: string, modelId: string, params: {
    distributions: Record<string, RiskDistribution>;
    numSimulations?: number;
  }) => {
    try {
      // 1. Fetch model structure
      const model = await prisma.model.findUnique({
        where: { id: modelId },
        include: {
          drivers: true,
          driverFormulas: true
        }
      });

      if (!model) throw new ValidationError('Model not found');

      // 2. Fetch dimensions
      const dimensions = await (prisma as any).dimension.findMany({
        where: { orgId },
        include: { members: true }
      });

      const dimensionPayload = dimensions.map((d: any) => ({
        name: d.name,
        members: d.members.map((m: any) => m.name)
      }));

      // 3. Prepare nodes
      const nodes = model.drivers.map(d => {
        const formula = model.driverFormulas.find(f => f.driverId === d.id);
        return {
          id: d.id,
          name: d.name,
          formula: formula?.expression || d.formula || null,
          category: d.category,
          dims: (d as any).dims || []
        };
      });

      // 4. Define horizon (12 months from now)
      const months: string[] = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push(d.toISOString().slice(0, 7));
      }

      // 5. Call Python Risk Engine
      const response = await axios.post(`${PYTHON_WORKER_URL}/compute/risk`, {
        modelId,
        months,
        dimensions: dimensionPayload,
        nodes,
        distributions: params.distributions,
        numSimulations: params.numSimulations || 1000
      });

      return response.data.results;
    } catch (error: any) {
      console.error('Risk analysis error:', error.message);
      return {
        simulations: [],
        summary: {},
        error: 'Risk engine is currently unavailable'
      };
    }
  }
};
