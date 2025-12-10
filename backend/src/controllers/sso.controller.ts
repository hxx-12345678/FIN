/**
 * SSO Controller
 * Handles Single Sign-On authentication for Google, Microsoft, and SAML
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { config } from '../config/env';
import prisma from '../config/database';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export const ssoController = {
  /**
   * POST /api/v1/auth/sso/:provider
   * Initiate SSO authentication
   */
  initiateSSO: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;
      const { orgId, email } = req.body;

      const validProviders = ['google', 'microsoft', 'okta', 'saml'];
      if (!validProviders.includes(provider)) {
        throw new ValidationError(`Invalid SSO provider. Must be one of: ${validProviders.join(', ')}`);
      }

      // Generate state token for CSRF protection
      const state = Buffer.from(JSON.stringify({
        provider,
        orgId,
        email,
        timestamp: Date.now(),
      })).toString('base64');

      // Build OAuth URL based on provider
      let authUrl = '';
      const redirectUri = `${config.backendUrl}/api/v1/auth/sso/callback`;

      if (provider === 'google') {
        const clientId = config.oauth.google.clientId;
        if (!clientId) {
          throw new ValidationError('Google OAuth not configured');
        }
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${state}`;
      } else if (provider === 'microsoft') {
        // Microsoft Azure AD OAuth
        const clientId = config.oauth.microsoft?.clientId || process.env.MICROSOFT_CLIENT_ID;
        if (!clientId) {
          throw new ValidationError('Microsoft OAuth not configured');
        }
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${state}`;
      } else if (provider === 'okta') {
        // Okta OAuth
        const oktaDomain = process.env.OKTA_DOMAIN;
        const clientId = process.env.OKTA_CLIENT_ID;
        if (!oktaDomain || !clientId) {
          throw new ValidationError('Okta OAuth not configured');
        }
        authUrl = `https://${oktaDomain}/oauth2/v1/authorize?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid email profile&` +
          `state=${state}`;
      } else if (provider === 'saml') {
        // SAML SSO - redirect to SAML IdP
        const samlEndpoint = process.env.SAML_SSO_URL;
        if (!samlEndpoint) {
          throw new ValidationError('SAML SSO not configured');
        }
        authUrl = `${samlEndpoint}?RelayState=${state}`;
      }

      res.json({
        ok: true,
        authUrl,
        state,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/sso/callback
   * Handle SSO callback
   */
  handleCallback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state, provider } = req.query;

      if (!code || !state) {
        throw new ValidationError('code and state are required');
      }

      // Decode state
      let stateData: any;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch (error) {
        throw new ValidationError('Invalid state token');
      }

      const { provider: stateProvider, orgId, email } = stateData;
      const actualProvider = (provider as string) || stateProvider;

      // Exchange code for user info
      // Note: In production, use proper OAuth libraries (google-auth-library, @azure/msal-node, etc.)
      let userInfo: { email: string; name?: string; id?: string };
      
      if (actualProvider === 'google') {
        // Google OAuth2 token exchange
        const clientId = config.oauth.google.clientId;
        const clientSecret = config.oauth.google.clientSecret;
        const redirectUri = `${config.backendUrl}/api/v1/auth/sso/callback`;
        
        if (!clientId || !clientSecret) {
          throw new ValidationError('Google OAuth not configured');
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        
        if (!tokenResponse.ok) {
          throw new ValidationError('Failed to exchange Google OAuth code');
        }
        
        const tokens = await tokenResponse.json() as { access_token: string; token_type?: string };
        
        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        
        if (!userResponse.ok) {
          throw new ValidationError('Failed to fetch Google user info');
        }
        
        const googleUser = await userResponse.json() as { email: string; name?: string; id?: string };
        userInfo = {
          email: googleUser.email,
          name: googleUser.name,
          id: googleUser.id,
        };
      } else if (actualProvider === 'microsoft') {
        // Microsoft Azure AD OAuth2 token exchange
        const clientId = config.oauth.microsoft?.clientId || process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = config.oauth.microsoft?.clientSecret || process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = `${config.backendUrl}/api/v1/auth/sso/callback`;
        
        if (!clientId || !clientSecret) {
          throw new ValidationError('Microsoft OAuth not configured');
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'openid email profile',
          }),
        });
        
        if (!tokenResponse.ok) {
          throw new ValidationError('Failed to exchange Microsoft OAuth code');
        }
        
        const tokens = await tokenResponse.json() as { access_token: string; token_type?: string };
        
        // Get user info from Microsoft
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        
        if (!userResponse.ok) {
          throw new ValidationError('Failed to fetch Microsoft user info');
        }
        
        const msUser = await userResponse.json() as { mail?: string; userPrincipalName?: string; displayName?: string; id?: string };
        userInfo = {
          email: msUser.mail || msUser.userPrincipalName || '',
          name: msUser.displayName,
          id: msUser.id,
        };
      } else if (actualProvider === 'okta') {
        // Okta OAuth2 token exchange
        const oktaDomain = process.env.OKTA_DOMAIN;
        const clientId = process.env.OKTA_CLIENT_ID;
        const clientSecret = process.env.OKTA_CLIENT_SECRET;
        const redirectUri = `${config.backendUrl}/api/v1/auth/sso/callback`;
        
        if (!oktaDomain || !clientId || !clientSecret) {
          throw new ValidationError('Okta OAuth not configured');
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await fetch(`https://${oktaDomain}/oauth2/v1/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        
        if (!tokenResponse.ok) {
          throw new ValidationError('Failed to exchange Okta OAuth code');
        }
        
        const tokens = await tokenResponse.json() as { access_token: string; token_type?: string };
        
        // Get user info from Okta
        const userResponse = await fetch(`https://${oktaDomain}/oauth2/v1/userinfo`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        
        if (!userResponse.ok) {
          throw new ValidationError('Failed to fetch Okta user info');
        }
        
        const oktaUser = await userResponse.json() as { email?: string; name?: string; sub?: string };
        userInfo = {
          email: oktaUser.email || '',
          name: oktaUser.name,
          id: oktaUser.sub,
        };
      } else if (actualProvider === 'saml') {
        // SAML SSO - requires SAML library (passport-saml, saml2-js)
        // For now, return error indicating SAML needs library implementation
        throw new ValidationError('SAML SSO requires SAML library (passport-saml or saml2-js). Please implement SAML assertion parsing.');
      } else {
        throw new ValidationError(`Unsupported SSO provider: ${actualProvider}`);
      }

      // Find or create user
      const normalizedEmail = (userInfo.email || email).toLowerCase().trim();
      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Create user if doesn't exist (JIT provisioning)
        const org = orgId ? await prisma.org.findUnique({ where: { id: orgId as string } }) : null;
        
        if (!org) {
          throw new ValidationError('Organization not found for SSO user');
        }

        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: userInfo.name || normalizedEmail.split('@')[0],
            passwordHash: '', // SSO users don't have passwords
            isActive: true,
          },
        });

        // Add user to org with viewer role by default
        await prisma.userOrgRole.create({
          data: {
            userId: user.id,
            orgId: org.id,
            role: 'viewer',
          },
        });
      }

      // Generate tokens
      const userRole = await prisma.userOrgRole.findFirst({
        where: { userId: user.id },
        include: { org: true },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        orgId: userRole?.orgId,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        orgId: userRole?.orgId,
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Log SSO login
      logger.info(`SSO login: ${user.email} via ${actualProvider}`);

      // Redirect to frontend with tokens
      const tokenParam = encodeURIComponent(token);
      const refreshTokenParam = encodeURIComponent(refreshToken);
      res.redirect(`${config.frontendUrl}/auth/sso/callback?token=${tokenParam}&refreshToken=${refreshTokenParam}`);
    } catch (error) {
      logger.error('SSO callback error:', error);
      res.redirect(`${config.frontendUrl}/auth/login?error=sso_failed`);
    }
  },
};


