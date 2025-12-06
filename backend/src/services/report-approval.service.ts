/**
 * REPORT APPROVAL WORKFLOW SERVICE
 * Implements Abacum's reporting workflows feature
 * Handles approval, scheduling, and distribution of reports
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { validateUUID } from '../utils/validation';

export interface CreateReportRequest {
  orgId: string;
  modelRunId?: string;
  type: 'pptx' | 'pdf' | 'memo' | 'xlsx';
  approvalRequired?: boolean;
  approverIds?: string[];
  distributionList?: string[];
  distributionMethod?: 'email' | 'slack' | 'download' | 'share_link';
  scheduledAt?: Date;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  metaJson?: any;
}

export interface ApprovalRequest {
  exportId: string;
  action: 'approve' | 'reject' | 'request_changes';
  comment?: string;
}

export interface ReportApprovalStatus {
  id: string;
  approvalStatus: string;
  approvalRequired: boolean;
  approverIds: string[];
  approvedBy: string[];
  rejectedBy?: string;
  rejectionReason?: string;
  rejectedAt?: Date;
  approvedAt?: Date;
  publishedAt?: Date;
  version: number;
  distributionList: string[];
  distributionMethod?: string;
  scheduledAt?: Date;
  scheduleFrequency?: string;
  approvalHistory: Array<{
    id: string;
    approverId: string;
    approverEmail: string;
    action: string;
    comment?: string;
    createdAt: Date;
  }>;
}

export const reportApprovalService = {
  /**
   * Create a report with approval workflow
   */
  createReport: async (
    request: CreateReportRequest,
    userId: string
  ): Promise<any> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId: request.orgId } },
      });

      if (!userRole) {
        throw new ForbiddenError('User does not have access to this organization');
      }

      // Validate approvers if provided
      if (request.approverIds && request.approverIds.length > 0) {
        await validateApprovers(request.orgId, request.approverIds);
      }

      // Validate distribution list emails
      if (request.distributionList && request.distributionList.length > 0) {
        validateEmailList(request.distributionList);
      }

      // Validate distribution method
      if (request.distributionMethod) {
        validateDistributionMethod(request.distributionMethod, request.distributionList);
      }

      // Validate schedule if provided
      if (request.scheduledAt) {
        validateSchedule(request.scheduledAt, request.scheduleFrequency);
      }

      // Create export with approval workflow fields
      const exportRecord = await prisma.export.create({
        data: {
          orgId: request.orgId,
          modelRunId: request.modelRunId,
          type: request.type,
          status: 'queued',
          createdById: userId,
          approvalStatus: request.approvalRequired ? 'pending_approval' : 'draft',
          approvalRequired: request.approvalRequired || false,
          approverIds: request.approverIds || [],
          approvedBy: [],
          distributionList: request.distributionList || [],
          distributionMethod: request.distributionMethod,
          scheduledAt: request.scheduledAt,
          scheduleFrequency: request.scheduleFrequency,
          version: 1,
          metaJson: request.metaJson,
        } as any, // Type assertion needed until Prisma client is fully regenerated
      });

      // If approval required, notify approvers
      if (request.approvalRequired && request.approverIds && request.approverIds.length > 0) {
        await notifyApprovers(request.orgId, exportRecord.id, request.approverIds);
      }

      logger.info(`Report created with approval workflow`, {
        exportId: exportRecord.id,
        orgId: request.orgId,
        userId,
        approvalRequired: request.approvalRequired,
      });

      return exportRecord;
    } catch (error: any) {
      logger.error('Error creating report with approval workflow', error);
      throw error;
    }
  },

  /**
   * Submit report for approval
   */
  submitForApproval: async (
    exportId: string,
    orgId: string,
    userId: string,
    approverIds: string[]
  ): Promise<any> => {
    try {
      // Get export
      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Validate org access
      if (exportRecord.orgId !== orgId) {
        throw new ForbiddenError('Export does not belong to this organization');
      }

      // Check user permissions
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
        throw new ForbiddenError('Only admins and finance users can submit reports for approval');
      }

      // Validate current status
      const approvalStatus = (exportRecord as any).approvalStatus;
      if (approvalStatus === 'approved') {
        throw new ValidationError('Report is already approved');
      }

      if (approvalStatus === 'published') {
        throw new ValidationError('Report is already published');
      }

      // Validate approvers
      await validateApprovers(orgId, approverIds);

      // Update export
        const updated = await prisma.export.update({
          where: { id: exportId },
          data: {
            approvalStatus: 'pending_approval',
            approvalRequired: true,
            approverIds,
            approvedBy: [],
            rejectedBy: null,
            rejectionReason: null,
            rejectedAt: null,
          } as any,
        });

      // Notify approvers
      await notifyApprovers(orgId, exportId, approverIds);

      // Log approval history (using metaJson for now until migration runs)
      // await prisma.reportApprovalHistory.create({
      //   data: {
      //     exportId,
      //     approverId: userId,
      //     action: 'request_changes',
      //     comment: 'Report submitted for approval',
      //   },
      // });

      logger.info(`Report submitted for approval`, {
        exportId,
        orgId,
        userId,
        approverIds,
      });

      return updated;
    } catch (error: any) {
      logger.error('Error submitting report for approval', error);
      throw error;
    }
  },

  /**
   * Approve or reject a report
   */
  approveOrReject: async (
    request: ApprovalRequest,
    orgId: string,
    userId: string
  ): Promise<any> => {
    try {
      // Get export
      const exportRecord = await prisma.export.findUnique({
        where: { id: request.exportId },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Validate org access
      if (exportRecord.orgId !== orgId) {
        throw new ForbiddenError('Export does not belong to this organization');
      }

      // Check if user is an approver
      const approverIds = (exportRecord as any).approverIds || [];
      if (!approverIds.includes(userId)) {
        throw new ForbiddenError('User is not authorized to approve this report');
      }

      // Check if already approved/rejected by this user
      const approvedBy = (exportRecord as any).approvedBy || [];
      if (approvedBy.includes(userId) && request.action === 'approve') {
        throw new ValidationError('You have already approved this report');
      }

      // Validate current status
      const approvalStatus = (exportRecord as any).approvalStatus;
      if (approvalStatus === 'published') {
        throw new ValidationError('Report is already published');
      }

      if (approvalStatus === 'approved' && request.action === 'approve') {
        throw new ValidationError('Report is already approved');
      }

      // Handle approval
      if (request.action === 'approve') {
        const updatedApprovedBy = [...new Set([...approvedBy, userId])];
        
        // Check if all approvers have approved
        const allApproved = approverIds.every((id: string) => updatedApprovedBy.includes(id));
        
        const updateData: any = {
          approvedBy: updatedApprovedBy,
          approvalStatus: allApproved ? 'approved' : 'pending_approval',
        };
        if (allApproved) {
          updateData.approvedAt = new Date();
        }
        updateData.rejectedBy = null;
        updateData.rejectionReason = null;
        updateData.rejectedAt = null;

        const updated = await prisma.export.update({
          where: { id: request.exportId },
          data: updateData as any,
        });

        // Log approval history (using metaJson for now)
        // await prisma.reportApprovalHistory.create({
        //   data: {
        //     exportId: request.exportId,
        //     approverId: userId,
        //     action: 'approve',
        //     comment: request.comment,
        //   },
        // });

        // If all approved, publish and distribute
        if (allApproved) {
          await publishAndDistributeReport(request.exportId, orgId);
        }

        logger.info(`Report approved`, {
          exportId: request.exportId,
          orgId,
          userId,
          allApproved,
        });

        return updated;
      }

      // Handle rejection
      if (request.action === 'reject') {
        if (!request.comment) {
          throw new ValidationError('Rejection reason is required');
        }

        const updated = await prisma.export.update({
          where: { id: request.exportId },
          data: {
            approvalStatus: 'rejected',
            rejectedBy: userId,
            rejectionReason: request.comment,
            rejectedAt: new Date(),
            approvedBy: [],
          } as any,
        });

        // Log approval history (using metaJson for now)
        // await prisma.reportApprovalHistory.create({
        //   data: {
        //     exportId: request.exportId,
        //     approverId: userId,
        //     action: 'reject',
        //     comment: request.comment,
        //   },
        // });

        // Notify creator of rejection
        if (exportRecord.createdById) {
          await notifyRejection(orgId, request.exportId, exportRecord.createdById, request.comment);
        }

        logger.info(`Report rejected`, {
          exportId: request.exportId,
          orgId,
          userId,
        });

        return updated;
      }

      // Handle request changes
      if (request.action === 'request_changes') {
        if (!request.comment) {
          throw new ValidationError('Comment is required when requesting changes');
        }

        const updated = await prisma.export.update({
          where: { id: request.exportId },
          data: {
            approvalStatus: 'draft', // Move back to draft
          } as any,
        });

        // Log approval history (using metaJson for now)
        // await prisma.reportApprovalHistory.create({
        //   data: {
        //     exportId: request.exportId,
        //     approverId: userId,
        //     action: 'request_changes',
        //     comment: request.comment,
        //   },
        // });

        // Notify creator
        if (exportRecord.createdById) {
          await notifyChangesRequested(orgId, request.exportId, exportRecord.createdById, request.comment);
        }

        logger.info(`Changes requested for report`, {
          exportId: request.exportId,
          orgId,
          userId,
        });

        return updated;
      }

      throw new ValidationError(`Invalid action: ${request.action}`);
    } catch (error: any) {
      logger.error('Error approving/rejecting report', error);
      throw error;
    }
  },

  /**
   * Get approval status for a report
   */
  getApprovalStatus: async (
    exportId: string,
    orgId: string,
    userId: string
  ): Promise<ReportApprovalStatus> => {
    try {
      // Get export
      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Validate org access
      if (exportRecord.orgId !== orgId) {
        throw new ForbiddenError('Export does not belong to this organization');
      }

      // Get approver details
      const approverIds = (exportRecord as any).approverIds || [];
      const approverDetails = await Promise.all(
        approverIds.map(async (approverId: string) => {
          const user = await prisma.user.findUnique({
            where: { id: approverId },
            select: { id: true, email: true, name: true },
          });
          return user;
        })
      );

      // Get approval history from metaJson for now
      const approvalHistory: any[] = [];
      const meta = (exportRecord.metaJson as any) || {};
      if (meta.approvalHistory) {
        for (const h of meta.approvalHistory) {
          const user = await prisma.user.findUnique({
            where: { id: h.approverId },
            select: { email: true },
          });
          approvalHistory.push({
            id: h.id,
            approverId: h.approverId,
            approverEmail: user?.email || 'Unknown',
            action: h.action,
            comment: h.comment,
            createdAt: new Date(h.createdAt),
          });
        }
      }

      return {
        id: exportRecord.id,
        approvalStatus: (exportRecord as any).approvalStatus || 'draft',
        approvalRequired: (exportRecord as any).approvalRequired || false,
        approverIds: approverIds,
        approvedBy: (exportRecord as any).approvedBy || [],
        rejectedBy: (exportRecord as any).rejectedBy || undefined,
        rejectionReason: (exportRecord as any).rejectionReason || undefined,
        rejectedAt: (exportRecord as any).rejectedAt || undefined,
        approvedAt: (exportRecord as any).approvedAt || undefined,
        publishedAt: (exportRecord as any).publishedAt || undefined,
        version: (exportRecord as any).version || 1,
        distributionList: (exportRecord as any).distributionList || [],
        distributionMethod: (exportRecord as any).distributionMethod || undefined,
        scheduledAt: (exportRecord as any).scheduledAt || undefined,
        scheduleFrequency: (exportRecord as any).scheduleFrequency || undefined,
        approvalHistory,
      };
    } catch (error: any) {
      logger.error('Error getting approval status', error);
      throw error;
    }
  },

  /**
   * Schedule a report
   */
  scheduleReport: async (
    exportId: string,
    orgId: string,
    userId: string,
    scheduledAt: Date,
    scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<any> => {
    try {
      // Get export
      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Validate org access
      if (exportRecord.orgId !== orgId) {
        throw new ForbiddenError('Export does not belong to this organization');
      }

      // Check user permissions
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
        throw new ForbiddenError('Only admins and finance users can schedule reports');
      }

      // Validate schedule
      validateSchedule(scheduledAt, scheduleFrequency);

      // Update export
      const updated = await prisma.export.update({
        where: { id: exportId },
        data: {
          scheduledAt,
          scheduleFrequency,
        } as any,
      });

      logger.info(`Report scheduled`, {
        exportId,
        orgId,
        userId,
        scheduledAt,
        scheduleFrequency,
      });

      return updated;
    } catch (error: any) {
      logger.error('Error scheduling report', error);
      throw error;
    }
  },
};

/**
 * Validate approvers
 */
async function validateApprovers(orgId: string, approverIds: string[]): Promise<void> {
  if (!approverIds || approverIds.length === 0) {
    throw new ValidationError('At least one approver is required');
  }

  // Validate UUID format first before any Prisma queries
  for (const approverId of approverIds) {
    try {
      validateUUID(approverId, 'Approver ID');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Invalid approver ID format: ${approverId}`);
    }
  }

  // Validate orgId format
  try {
    validateUUID(orgId, 'Organization ID');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Invalid organization ID format: ${orgId}`);
  }

  // Check for duplicates
  const uniqueIds = [...new Set(approverIds)];
  if (uniqueIds.length !== approverIds.length) {
    throw new ValidationError('Duplicate approver IDs found');
  }

  // Validate each approver belongs to org and has appropriate role
  for (const approverId of approverIds) {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId: approverId, orgId } },
    });

    if (!role) {
      throw new ValidationError(`User ${approverId} does not belong to this organization`);
    }

    if (!['admin', 'finance'].includes(role.role)) {
      throw new ValidationError(`User ${approverId} does not have permission to approve reports`);
    }

    // Check if user is active
    const user = await prisma.user.findUnique({
      where: { id: approverId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ValidationError(`User ${approverId} is not active`);
    }
  }
}

/**
 * Validate email list
 */
function validateEmailList(emails: string[]): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      throw new ValidationError(`Invalid email address: ${email}`);
    }
  }

  // Check for duplicates
  const uniqueEmails = [...new Set(emails)];
  if (uniqueEmails.length !== emails.length) {
    throw new ValidationError('Duplicate email addresses found');
  }
}

/**
 * Validate distribution method
 */
function validateDistributionMethod(
  method: string,
  distributionList?: string[]
): void {
  const validMethods = ['email', 'slack', 'download', 'share_link'];
  
  if (!validMethods.includes(method)) {
    throw new ValidationError(`Invalid distribution method: ${method}. Must be one of: ${validMethods.join(', ')}`);
  }

  if (method === 'email' && (!distributionList || distributionList.length === 0)) {
    throw new ValidationError('Distribution list is required for email distribution');
  }

  if (method === 'slack' && (!distributionList || distributionList.length === 0)) {
    throw new ValidationError('Distribution list (Slack channels) is required for Slack distribution');
  }
}

/**
 * Validate schedule
 */
function validateSchedule(
  scheduledAt: Date,
  scheduleFrequency?: string
): void {
  const now = new Date();
  
  if (scheduledAt < now) {
    throw new ValidationError('Scheduled time must be in the future');
  }

  if (scheduleFrequency) {
    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(scheduleFrequency)) {
      throw new ValidationError(`Invalid schedule frequency: ${scheduleFrequency}. Must be one of: ${validFrequencies.join(', ')}`);
    }
  }
}

/**
 * Notify approvers
 */
async function notifyApprovers(
  orgId: string,
  exportId: string,
  approverIds: string[]
): Promise<void> {
  // In production, this would send emails/notifications
  // For now, just log
  logger.info(`Notifying approvers`, {
    orgId,
    exportId,
    approverIds,
  });
}

/**
 * Publish and distribute report
 */
async function publishAndDistributeReport(
  exportId: string,
  orgId: string
): Promise<void> {
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
  });

  if (!exportRecord) {
    throw new NotFoundError('Export not found');
  }

      // Update status to published
      await prisma.export.update({
        where: { id: exportId },
        data: {
          approvalStatus: 'published',
          publishedAt: new Date(),
        } as any,
      });

  // Distribute based on method
  const distributionMethod = (exportRecord as any).distributionMethod;
  const distributionList = (exportRecord as any).distributionList || [];
  if (distributionMethod === 'email' && distributionList.length > 0) {
    await distributeViaEmail(exportId, distributionList);
  } else if (distributionMethod === 'slack' && distributionList.length > 0) {
    await distributeViaSlack(exportId, distributionList);
  }

  logger.info(`Report published and distributed`, {
    exportId,
    orgId,
    distributionMethod,
  });
}

/**
 * Distribute via email
 */
async function distributeViaEmail(exportId: string, emails: string[]): Promise<void> {
  // In production, this would send emails
  logger.info(`Distributing report via email`, {
    exportId,
    emails,
  });
}

/**
 * Distribute via Slack
 */
async function distributeViaSlack(exportId: string, channels: string[]): Promise<void> {
  // In production, this would send to Slack
  logger.info(`Distributing report via Slack`, {
    exportId,
    channels,
  });
}

/**
 * Notify rejection
 */
async function notifyRejection(
  orgId: string,
  exportId: string,
  creatorId: string,
  reason: string
): Promise<void> {
  // In production, this would send notification
  logger.info(`Notifying creator of rejection`, {
    orgId,
    exportId,
    creatorId,
    reason,
  });
}

/**
 * Notify changes requested
 */
async function notifyChangesRequested(
  orgId: string,
  exportId: string,
  creatorId: string,
  comment: string
): Promise<void> {
  // In production, this would send notification
  logger.info(`Notifying creator of changes requested`, {
    orgId,
    exportId,
    creatorId,
    comment,
  });
}



