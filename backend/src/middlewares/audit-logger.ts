/**
 * IMMUTABLE AUDIT LOGGER
 * Logs all AI-CFO operations with full context
 * Tamper-evident logging for compliance
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { auditService } from '../services/audit.service';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  request_id: string;
  user_id: string;
  org_id: string;
  raw_user_input?: string;
  normalized_slots?: Record<string, any>;
  llm_prompt?: string;
  llm_response?: string;
  prompt_hash?: string;
  retrieval_hits?: Array<{
    doc_id: string;
    snippet: string;
  }>;
  calculation_input?: any;
  calculation_seed?: number;
  calculation_output?: any;
  approvals?: Array<{
    user_id: string;
    timestamp: string;
    reason?: string;
  }>;
  model_version?: string;
  prompt_version?: string;
  timestamp: string;
}

/**
 * Audit logger middleware
 * Logs all AI-CFO requests with full context
 */
export const auditLogger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach request ID to request
  (req as any).auditRequestId = requestId;

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json to capture response
  res.json = function (body: any) {
    // Log audit entry
    if (req.user && req.body) {
      const auditEntry: Partial<AuditLogEntry> = {
        request_id: requestId,
        user_id: req.user.id,
        org_id: req.params.orgId || req.body.orgId || '',
        raw_user_input: req.body.goal || req.body.query,
        timestamp: new Date().toISOString(),
      };

      // Extract structured response if present
      if (body.plan?.planJson?.structuredResponse) {
        const structured = body.plan.planJson.structuredResponse;
        auditEntry.normalized_slots = structured.input?.slots;
        auditEntry.calculation_input = structured.calculations;
        auditEntry.calculation_output = structured.calculations;
        auditEntry.retrieval_hits = structured.evidence;
        auditEntry.model_version = structured.audit?.model_version;
        auditEntry.prompt_version = structured.audit?.prompt_id;
      }

      // Log to audit service
      auditService.log({
        actorUserId: req.user.id,
        orgId: auditEntry.org_id || '',
        action: 'ai_cfo_request',
        objectType: 'ai_cfo_plan',
        objectId: requestId,
        metaJson: auditEntry,
      }).catch((error) => {
        console.error('Audit logging failed:', error);
        // Don't fail request if audit logging fails
      });
    }

    return originalJson(body);
  };

  next();
};

