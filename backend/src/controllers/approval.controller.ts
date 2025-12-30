import { Response, NextFunction } from 'express';
import { approvalWorkflowService } from '../services/approval-workflow.service';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';

export const approvalController = {
  createRequest: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const { type, objectType, objectId, payloadJson, comment } = req.body;

      if (!req.user) throw new ValidationError('User not authenticated');

      const result = await approvalWorkflowService.createRequest({
        orgId,
        requesterId: req.user.id,
        type,
        objectType,
        objectId,
        payloadJson,
        comment,
      });

      res.status(201).json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  approveRequest: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const { comment } = req.body;

      if (!req.user) throw new ValidationError('User not authenticated');

      const result = await approvalWorkflowService.approveRequest(requestId, req.user.id, comment);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  rejectRequest: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const { comment } = req.body;

      if (!req.user) throw new ValidationError('User not authenticated');
      if (!comment) throw new ValidationError('Comment is required for rejection');

      const result = await approvalWorkflowService.rejectRequest(requestId, req.user.id, comment);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  listPending: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const result = await approvalWorkflowService.listPendingRequests(orgId);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};


