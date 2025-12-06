import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { slackIntegrationService, SlackConfig, SendReportRequest } from '../services/slack-integration.service';
import { ValidationError } from '../utils/errors';

export const slackIntegrationController = {
  configureSlack: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const config: SlackConfig = req.body;
      await slackIntegrationService.configureSlack(orgId, req.user.id, config);
      res.json({ ok: true });
    } catch (error) { next(error); }
  },
  getSlackConfig: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const config = await slackIntegrationService.getSlackConfig(orgId, req.user.id);
      res.json({ ok: true, config });
    } catch (error) { next(error); }
  },
  sendReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const request: SendReportRequest = { ...req.body, orgId };
      const result = await slackIntegrationService.sendReport(request, req.user.id);
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  },
  sendAnomalyNotification: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const { anomaly, channel } = req.body;
      const result = await slackIntegrationService.sendAnomalyNotification(orgId, req.user.id, anomaly, channel);
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  },
};

