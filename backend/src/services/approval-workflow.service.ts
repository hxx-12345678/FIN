import prisma from '../config/database';
import { auditService } from './audit.service';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

// Type assertion for Prisma models that may not be in generated types yet
const prismaClient = prisma as any;

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const approvalWorkflowService = {
  /**
   * Create a new approval request for a sensitive change.
   */
  createRequest: async (params: {
    orgId: string;
    requesterId: string;
    type: string;
    objectType: string;
    objectId: string;
    payloadJson: any;
    comment?: string;
  }) => {
    const request = await prismaClient.approvalRequest.create({
      data: {
        orgId: params.orgId,
        requesterId: params.requesterId,
        type: params.type,
        objectType: params.objectType,
        objectId: params.objectId,
        payloadJson: params.payloadJson,
        comment: params.comment,
        status: 'pending',
      },
    });

    await auditService.log({
      actorUserId: params.requesterId,
      orgId: params.orgId,
      action: 'approval_request_created',
      objectType: 'approval_request',
      objectId: request.id,
      metaJson: {
        type: params.type,
        objectType: params.objectType,
        objectId: params.objectId,
      },
    });

    return request;
  },

  /**
   * Approve a request.
   */
  approveRequest: async (requestId: string, approverId: string, comment?: string) => {
    const request = await prismaClient.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Approval request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Request is already ${request.status}`);
    }

    // Update request status
    const updatedRequest = await prismaClient.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approverId,
        comment: comment || request.comment,
        reviewedAt: new Date(),
      },
    });

    await auditService.log({
      actorUserId: approverId,
      orgId: request.orgId,
      action: 'approval_request_approved',
      objectType: 'approval_request',
      objectId: requestId,
      metaJson: {
        type: request.type,
        objectType: request.objectType,
        objectId: request.objectId,
      },
    });

    // TODO: Trigger the actual change (e.g., apply assumption update or ledger adjustment)
    // This could be handled by a listener or by returning the approved payload to the caller

    return updatedRequest;
  },

  /**
   * Reject a request.
   */
  rejectRequest: async (requestId: string, approverId: string, comment: string) => {
    const request = await prismaClient.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Approval request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Request is already ${request.status}`);
    }

    const updatedRequest = await prismaClient.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        approverId,
        comment,
        reviewedAt: new Date(),
      },
    });

    await auditService.log({
      actorUserId: approverId,
      orgId: request.orgId,
      action: 'approval_request_rejected',
      objectType: 'approval_request',
      objectId: requestId,
      metaJson: {
        reason: comment,
      },
    });

    return updatedRequest;
  },

  /**
   * List pending requests for an org.
   */
  listPendingRequests: async (orgId: string) => {
    return await prismaClient.approvalRequest.findMany({
      where: {
        orgId,
        status: 'pending',
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};


