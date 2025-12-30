import { connectorRepository } from '../repositories/connector.repository';
import { jobService } from './job.service';
import { getProviderAdapter, ConnectorType } from '../utils/provider-adapters';
import { encrypt } from '../utils/crypto';
import { generateToken, verifyToken } from '../utils/jwt';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { orgRepository } from '../repositories/org.repository';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export const connectorService = {
  /**
   * Stripe API-key based connection (no OAuth).
   * Stores key in encrypted_config using AES-256-GCM and marks connector connected.
   */
  connectStripeApiKey: async (orgId: string, userId: string, stripeSecretKey: string) => {
    // Verify user has access to org
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }
    if (!['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can configure Stripe connector');
    }

    if (!stripeSecretKey || typeof stripeSecretKey !== 'string') {
      throw new ValidationError('stripeSecretKey is required');
    }
    const trimmed = stripeSecretKey.trim();
    // Stripe secret keys typically start with sk_
    if (!trimmed.startsWith('sk_') || trimmed.length < 20) {
      throw new ValidationError('Invalid Stripe secret key format');
    }

    // Encrypt and store
    const payloadJson = JSON.stringify({
      stripeSecretKey: trimmed,
    });
    const encryptedBase64 = encrypt(payloadJson);
    const encryptedBytes = Buffer.from(encryptedBase64, 'base64');

    const connector = await connectorRepository.upsert(orgId, 'stripe', {
      status: 'connected',
      encryptedConfig: encryptedBytes,
      configJson: {
        connectedAt: new Date().toISOString(),
        keyPrefix: trimmed.slice(0, 6),
        keyLast4: trimmed.slice(-4),
      },
    });

    // Trigger initial sync (idempotent key prevents spam)
    await jobService.createJob(
      {
        jobType: 'connector_initial_sync' as any,
        orgId,
        objectId: connector.id,
        params: {
          connectorId: connector.id,
          type: 'stripe',
          provider: 'stripe',
          syncedBy: userId,
        },
        createdByUserId: userId,
      },
      `stripe_initial_sync:${orgId}:${connector.id}`
    );

    return {
      connectorId: connector.id,
      status: connector.status,
      configured: true,
    };
  },
  startOAuth: async (orgId: string, type: ConnectorType, userId: string) => {
    // Validate connector type
    const validTypes: ConnectorType[] = ['quickbooks', 'xero', 'stripe', 'plaid', 'razorpay', 'tally', 'csv'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid connector type. Must be one of: ${validTypes.join(', ')}`);
    }

    // CSV doesn't use OAuth
    if (type === 'csv') {
      throw new ValidationError('CSV connector does not use OAuth flow');
    }

    // Verify user has access to org
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Only admin and finance can create connectors
    if (!['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can create connectors');
    }

    // Upsert connector with auth_pending status first to get connector ID
    const connector = await connectorRepository.upsert(orgId, type, {
      status: 'auth_pending',
      configJson: {
        redirectUri: `${config.backendUrl}/api/v1/connectors/callback`,
        initiatedAt: new Date().toISOString(),
      },
    });

    // Generate state token (signed JWT) with connectorId included
    const stateTokenWithConnector = jwt.sign(
      { userId, orgId, connectorId: connector.id },
      config.jwtSecret,
      { expiresIn: '10m' } // Short expiration for OAuth state
    );

    // Get provider adapter
    const adapter = getProviderAdapter(type);
    const redirectUri = `${config.backendUrl}/api/v1/connectors/callback`;

    // Get OAuth URL
    const authUrl = await adapter.getAuthUrl(orgId, stateTokenWithConnector, redirectUri);

    // Update connector with state token
    await connectorRepository.update(connector.id, {
      configJson: {
        ...(connector.configJson as any || {}),
        stateToken: stateTokenWithConnector,
        redirectUri,
        initiatedAt: new Date().toISOString(),
      },
    });

    return {
      connectorId: connector.id,
      authUrl,
      state: stateTokenWithConnector,
    };
  },

  handleOAuthCallback: async (
    connectorId: string | undefined,
    code: string,
    state: string
  ) => {
    // Verify state token and extract connectorId from it
    let payload: any;
    try {
      payload = jwt.verify(state, config.jwtSecret) as any;
    } catch (error) {
      throw new ValidationError('Invalid or expired state token');
    }

    // Extract connectorId from state token (preferred) or use provided one
    const actualConnectorId = payload.connectorId || connectorId;
    if (!actualConnectorId) {
      throw new ValidationError('Connector ID not found in state token');
    }

    // Find connector
    const connector = await connectorRepository.findById(actualConnectorId);
    if (!connector) {
      throw new NotFoundError('Connector not found');
    }

    // Verify orgId matches
    if (payload.orgId !== connector.orgId) {
      throw new ValidationError('Invalid state token - org mismatch');
    }

    // Get provider adapter
    const adapter = getProviderAdapter(connector.type as ConnectorType);
    const redirectUri = `${config.backendUrl}/api/v1/connectors/callback`;

    // Exchange code for tokens
    const tokens = await adapter.exchangeCode(code, redirectUri);

    // Encrypt tokens
    const tokensJson = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt?.toISOString(),
      tokenType: tokens.tokenType,
      scope: tokens.scope,
    });

    // Encrypt tokens (encrypt returns base64 string, convert to Buffer)
    const encryptedBase64 = encrypt(tokensJson);
    const encryptedTokens = Buffer.from(encryptedBase64, 'base64');

    // Update connector - reset lastSyncedAt to null
    await prisma.connector.update({
      where: { id: actualConnectorId },
      data: {
        status: 'connected',
        encryptedConfig: encryptedTokens,
        configJson: {
          ...(connector.configJson as any || {}),
          tokenAcquiredAt: new Date().toISOString(),
          expiresAt: tokens.expiresAt?.toISOString(),
        },
        lastSyncedAt: null,
      },
    });

    // Create initial sync job
    await jobService.createJob({
      jobType: 'connector_initial_sync' as any,
      orgId: connector.orgId,
      objectId: actualConnectorId,
      params: {
        connectorId: actualConnectorId,
        type: connector.type,
        provider: connector.type,
      },
    });

    return {
      ok: true,
      connectorId: connector.id,
    };
  },

  sync: async (connectorId: string, userId: string) => {
    // Find connector
    const connector = await connectorRepository.findById(connectorId);
    if (!connector) {
      throw new NotFoundError('Connector not found');
    }

    // Verify user has access
    const role = await orgRepository.getUserRole(userId, connector.orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Check connector is connected
    if (connector.status !== 'connected') {
      throw new ValidationError('Connector is not connected. Please complete OAuth flow first.');
    }

    // Create sync job
    const job = await jobService.createJob({
      jobType: 'connector_sync' as any,
      orgId: connector.orgId,
      objectId: connectorId,
      params: {
        connectorId,
        type: connector.type,
        provider: connector.type,
        syncedBy: userId,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
    };
  },

  getStatus: async (connectorId: string, userId: string) => {
    // Find connector
    const connector = await connectorRepository.findById(connectorId);
    if (!connector) {
      throw new NotFoundError('Connector not found');
    }

    // Verify user has access
    const role = await orgRepository.getUserRole(userId, connector.orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get recent sync jobs
    const recentJobs = await prisma.job.findMany({
      where: {
        orgId: connector.orgId,
        objectId: connectorId,
        jobType: {
          in: ['connector_sync', 'connector_initial_sync'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        progress: true,
        createdAt: true,
        updatedAt: true,
        logs: true,
      },
    });

    // Mask sensitive data
    const safeConnector = {
      id: connector.id,
      orgId: connector.orgId,
      type: connector.type,
      status: connector.status,
      lastSyncedAt: connector.lastSyncedAt,
      createdAt: connector.createdAt,
      // Do not return encryptedConfig or sensitive configJson
      configJson: connector.configJson ? {
        // Only return non-sensitive metadata
        initiatedAt: (connector.configJson as any)?.initiatedAt,
        tokenAcquiredAt: (connector.configJson as any)?.tokenAcquiredAt,
      } : null,
    };

    return {
      connector: safeConnector,
      syncLogs: recentJobs,
      nextSyncScheduled: connector.status === 'connected' && !connector.lastSyncedAt,
    };
  },

  listConnectors: async (orgId: string, userId: string) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const connectors = await connectorRepository.findByOrgId(orgId);

    // Mask sensitive data
    return connectors.map((connector) => ({
      id: connector.id,
      orgId: connector.orgId,
      type: connector.type,
      status: connector.status,
      lastSyncedAt: connector.lastSyncedAt,
      createdAt: connector.createdAt,
      // Do not return encryptedConfig
    }));
  },
};

