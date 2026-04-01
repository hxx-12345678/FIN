import { Response, NextFunction } from 'express';
import { aicfoService } from '../services/aicfo.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

import { ApplyPlanSchema } from '../validators/aicfo.validator';

export const aicfoController = {
  /**
   * POST /api/v1/orgs/:orgId/ai-cfo/query - Process query through multi-agent orchestration
   * This is the new agentic workflow endpoint
   */
  processAgenticQuery: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { query, context } = req.body;

      if (!query || typeof query !== 'string') {
        throw new ValidationError('Query is required');
      }

      const result = await aicfoService.processAgenticQuery(
        orgId,
        req.user.id,
        query,
        context
      );

      // Flatten the response so all agent data is top-level accessible
      const agentResponse: any = result.response || {};
      res.json({
        ok: true,
        conversationId: result.conversationId,
        planId: result.planId,
        processingTimeMs: result.processingTimeMs,
        // Top-level agent response fields for easy access
        answer: agentResponse.answer,
        agentType: agentResponse.agentType,
        confidence: agentResponse.confidence,
        thoughts: agentResponse.thoughts || [],
        dataSources: agentResponse.dataSources || [],
        calculations: agentResponse.calculations || {},
        recommendations: agentResponse.recommendations || [],
        visualizations: agentResponse.visualizations || [],
        followUpQuestions: agentResponse.followUpQuestions || [],
        // Also keep the nested response for backward compat
        response: agentResponse,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/ai-plans/apply - Apply plan changes
   */
  applyPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { planId, changes } = ApplyPlanSchema.parse(req.body);

      const result = await aicfoService.applyPlan(orgId, req.user.id, {
        planId,
        changes,
      });

      res.status(201).json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/ai-plans - Generate AI-CFO plan
   */
  generatePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { modelRunId, goal, constraints, context } = req.body;

      if (!goal) {
        throw new ValidationError('goal is required');
      }

      // Set timeout to prevent connection reset - wrap in promise
      const planPromise = aicfoService.generatePlan(
        orgId,
        req.user.id,
        {
          modelRunId,
          goal,
          constraints,
          context, // Support context parameter from board-reporting
        }
      );

      // Add timeout handling
      const timeoutId = setTimeout(() => {
        // Don't actually timeout - let the service handle it
        // But log a warning if it's taking too long
        console.warn('[AICFO] Plan generation taking longer than expected');
      }, 55000); // 55 seconds

      try {
        const plan = await planPromise;
        clearTimeout(timeoutId);

        res.status(201).json({
          ok: true,
          plan,
        });
      } catch (serviceError) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (serviceError instanceof Error && serviceError.message.includes('timeout')) {
          return res.status(504).json({
            ok: false,
            error: {
              code: 'TIMEOUT',
              message: 'AI plan generation is taking longer than expected. Please try again with a simpler request.',
            },
          });
        }
        
        throw serviceError;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/ai-plans - List AI-CFO plans
   */
  listPlans: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const status = req.query.status as string | undefined;

      const plans = await aicfoService.listPlans(orgId, req.user.id, status);

      res.json({
        ok: true,
        plans,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/ai-plans/:planId - Get AI-CFO plan
   */
  getPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      const plan = await aicfoService.getPlan(planId, req.user.id);

      res.json({
        ok: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/ai-plans/:planId - Update AI-CFO plan
   */
  updatePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      const updateData = req.body;

      const plan = await aicfoService.updatePlan(planId, req.user.id, updateData);

      res.json({
        ok: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/ai-plans/:planId - Delete AI-CFO plan
   */
  deletePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      await aicfoService.deletePlan(planId, req.user.id);

      res.json({
        ok: true,
        message: 'Plan deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/prompts/:promptId - Get prompt details (AUDITABILITY)
   */
  getPrompt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { promptId } = req.params;
      const prompt = await aicfoService.getPrompt(promptId, req.user.id);

      if (!prompt) {
        // Synthetic prompt ID (deterministic fallback) - return informative response
        return res.json({
          ok: true,
          prompt: {
            id: promptId,
            provider: 'deterministic',
            modelUsed: 'fallback',
            promptTemplate: 'This recommendation was generated using deterministic CFO logic (no LLM call).',
            renderedPrompt: 'Deterministic analysis based on financial data.',
            responseText: 'Recommendation generated using local CFO Brain logic.',
            createdAt: new Date().toISOString(),
            synthetic: true,
          },
        });
      }

      res.json({
        ok: true,
        prompt,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * SSE Stream for Agentic Query
   * POST /api/v1/orgs/:orgId/ai-cfo/query/stream
   */
  streamAgenticQuery: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const { query, context } = req.body;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      await aicfoService.processAgenticQueryStream(
        orgId,
        req.user.id,
        query,
        context,
        (step) => {
          res.write(`data: ${JSON.stringify(step)}\n\n`);
        }
      );

      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', payload: { message: (error as Error).message } })}\n\n`);
        res.end();
      }
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/ai-cfo/conversations - List chat history
   */
  listConversations: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const conversations = await aicfoService.listConversations(orgId, req.user.id);
      res.json({ ok: true, conversations });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/ai-cfo/conversations/:conversationId - Get conversation with messages
   */
  getConversation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { conversationId } = req.params;
      const conversation = await aicfoService.getConversation(conversationId, req.user.id);
      res.json({ ok: true, conversation });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orgs/:orgId/ai-cfo/conversations/:conversationId - Delete conversation
   */
  deleteConversation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { conversationId } = req.params;
      await aicfoService.deleteConversation(conversationId, req.user.id);
      res.json({ ok: true, message: 'Conversation deleted' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/ai-cfo/upload - Upload file attachment for chat
   */
  uploadAttachment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const file = req.file;

      if (!file) throw new ValidationError('No file uploaded');

      const attachment = await aicfoService.uploadAttachment(orgId, req.user.id, file);
      res.status(201).json({ ok: true, attachment });
    } catch (error) {
      next(error);
    }
  },
};
