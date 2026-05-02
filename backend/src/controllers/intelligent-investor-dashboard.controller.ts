import { Request, Response, NextFunction } from 'express';
import { intelligentInvestorDashboardService } from '../services/intelligent-investor-dashboard.service';

export const intelligentInvestorDashboardController = {
  getDashboard: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const modelId = req.query.modelId as string | undefined;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const data = await intelligentInvestorDashboardService.getEnhancedDashboardData(orgId, userId, modelId);
      
      res.status(200).json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  },

  recomputeWhatIf: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const { modelId, nodeId, value } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const results = await intelligentInvestorDashboardService.recomputeWhatIf(orgId, modelId, nodeId, value, userId);
      
      res.status(200).json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  }
};
