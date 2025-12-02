/**
 * Compliance Service
 * Production-ready compliance and security management
 * Handles frameworks, security controls, audit logs, and policies
 */

import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

// Compliance frameworks
export const COMPLIANCE_FRAMEWORKS = {
  SOC2: {
    name: 'SOC 2 Type II',
    type: 'soc2',
    requirements: 47,
    description: 'Service Organization Control 2 - Security, availability, processing integrity, confidentiality, and privacy',
  },
  GDPR: {
    name: 'GDPR',
    type: 'gdpr',
    requirements: 32,
    description: 'General Data Protection Regulation - EU data protection and privacy',
  },
  ISO27001: {
    name: 'ISO 27001',
    type: 'iso27001',
    requirements: 114,
    description: 'Information Security Management System standard',
  },
  PCIDSS: {
    name: 'PCI DSS',
    type: 'pcidss',
    requirements: 12,
    description: 'Payment Card Industry Data Security Standard',
  },
  HIPAA: {
    name: 'HIPAA',
    type: 'hipaa',
    requirements: 45,
    description: 'Health Insurance Portability and Accountability Act',
  },
  CCPA: {
    name: 'CCPA',
    type: 'ccpa',
    requirements: 28,
    description: 'California Consumer Privacy Act',
  },
};

// Security control categories
export const SECURITY_CONTROL_CATEGORIES = [
  'Access Control',
  'Data Protection',
  'Network Security',
  'Incident Response',
  'Business Continuity',
  'Vulnerability Management',
  'Security Monitoring',
  'Compliance Management',
];

export interface ComplianceFrameworkStatus {
  frameworkType: string;
  status: 'compliant' | 'in-progress' | 'pending' | 'non-compliant';
  score: number;
  requirements: number;
  completed: number;
  lastAudit?: Date;
  nextAudit?: Date;
  certificationNumber?: string;
  auditor?: string;
  notes?: string;
}

export interface SecurityControl {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'enabled' | 'disabled' | 'partial';
  coverage: number; // 0-100
  lastTested?: Date;
  nextTest?: Date;
  evidence?: string;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  category: 'data-protection' | 'access-control' | 'backup-recovery' | 'privacy' | 'incident-response';
  description: string;
  enabled: boolean;
  lastUpdated: Date;
  version: string;
  content: string;
}

export const complianceService = {
  /**
   * Get compliance frameworks status for organization
   */
  getFrameworks: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get compliance data from org settings or create default
    let complianceData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).complianceJson) {
        complianceData = (orgSettings as any).complianceJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch compliance data from org settings');
    }

    const frameworks = Object.values(COMPLIANCE_FRAMEWORKS).map((framework) => {
      const frameworkData = complianceData.frameworks?.[framework.type] || {};
      const completed = frameworkData.completed || 0;
      const score = framework.requirements > 0 
        ? Math.round((completed / framework.requirements) * 100) 
        : 0;

      return {
        name: framework.name,
        type: framework.type,
        status: frameworkData.status || (score >= 95 ? 'compliant' : score >= 70 ? 'in-progress' : 'pending'),
        score,
        requirements: framework.requirements,
        completed,
        lastAudit: frameworkData.lastAudit ? new Date(frameworkData.lastAudit) : null,
        nextAudit: frameworkData.nextAudit ? new Date(frameworkData.nextAudit) : null,
        certificationNumber: frameworkData.certificationNumber || null,
        auditor: frameworkData.auditor || null,
        description: framework.description,
      };
    });

    return frameworks;
  },

  /**
   * Update framework status
   */
  updateFramework: async (
    orgId: string,
    userId: string,
    frameworkType: string,
    data: Partial<ComplianceFrameworkStatus>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update compliance frameworks');
    }

    if (!COMPLIANCE_FRAMEWORKS[frameworkType.toUpperCase() as keyof typeof COMPLIANCE_FRAMEWORKS]) {
      throw new ValidationError(`Invalid framework type: ${frameworkType}`);
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update compliance data
    const complianceJson = ((orgSettings as any).complianceJson as any) || {};
    if (!complianceJson.frameworks) {
      complianceJson.frameworks = {};
    }
    if (!complianceJson.frameworks[frameworkType]) {
      complianceJson.frameworks[frameworkType] = {};
    }

    complianceJson.frameworks[frameworkType] = {
      ...complianceJson.frameworks[frameworkType],
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById (not org_id, updated_by_id)
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET compliance_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(complianceJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_framework_updated',
      objectType: 'compliance_framework',
      objectId: undefined, // frameworkType is a string, not UUID
      metaJson: { frameworkType, ...data },
    });

    return await complianceService.getFrameworks(orgId, userId);
  },

  /**
   * Get security controls
   */
  getSecurityControls: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get security controls from org settings
    let controlsData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).securityControlsJson) {
        controlsData = (orgSettings as any).securityControlsJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch security controls from org settings');
    }

    // Default controls if none exist
    const defaultControls: SecurityControl[] = [
      // Access Control
      { id: 'mfa', category: 'Access Control', name: 'Multi-Factor Authentication', description: 'Required for all users', status: 'enabled', coverage: 100 },
      { id: 'rbac', category: 'Access Control', name: 'Role-Based Access Control', description: 'Granular permissions system', status: 'enabled', coverage: 100 },
      { id: 'sso', category: 'Access Control', name: 'Single Sign-On', description: 'SAML/OAuth integration', status: 'enabled', coverage: 95 },
      { id: 'password-policy', category: 'Access Control', name: 'Password Policy', description: 'Strong password requirements', status: 'enabled', coverage: 100 },
      // Data Protection
      { id: 'encryption-rest', category: 'Data Protection', name: 'Data Encryption at Rest', description: 'AES-256 encryption', status: 'enabled', coverage: 100 },
      { id: 'encryption-transit', category: 'Data Protection', name: 'Data Encryption in Transit', description: 'TLS 1.3 for all connections', status: 'enabled', coverage: 100 },
      { id: 'dlp', category: 'Data Protection', name: 'Data Loss Prevention', description: 'Automated data protection', status: 'enabled', coverage: 85 },
      { id: 'backup', category: 'Data Protection', name: 'Backup & Recovery', description: 'Automated daily backups', status: 'enabled', coverage: 100 },
      // Network Security
      { id: 'firewall', category: 'Network Security', name: 'Firewall Protection', description: 'Network-level protection', status: 'enabled', coverage: 100 },
      { id: 'ids', category: 'Network Security', name: 'Intrusion Detection', description: 'Real-time threat detection', status: 'enabled', coverage: 90 },
      { id: 'vpn', category: 'Network Security', name: 'VPN Access', description: 'Secure remote access', status: 'enabled', coverage: 100 },
      { id: 'monitoring', category: 'Network Security', name: 'Network Monitoring', description: '24/7 network monitoring', status: 'enabled', coverage: 95 },
    ];

    const storedControls = controlsData.controls || [];
    const controls = storedControls.length > 0 
      ? storedControls 
      : defaultControls.map(c => ({ ...c, lastTested: null, nextTest: null }));

    // Group by category
    const grouped: Record<string, SecurityControl[]> = {};
    SECURITY_CONTROL_CATEGORIES.forEach((category) => {
      grouped[category] = controls.filter((c: SecurityControl) => c.category === category);
    });

    return grouped;
  },

  /**
   * Update security control
   */
  updateSecurityControl: async (
    orgId: string,
    userId: string,
    controlId: string,
    data: Partial<SecurityControl>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update security controls');
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update security controls
    const securityControlsJson = ((orgSettings as any).securityControlsJson as any) || { controls: [] };
    const controls = securityControlsJson.controls || [];
    const index = controls.findIndex((c: SecurityControl) => c.id === controlId);

    if (index >= 0) {
      controls[index] = { ...controls[index], ...data };
    } else {
      controls.push({ id: controlId, ...data });
    }

    securityControlsJson.controls = controls;

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET security_controls_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(securityControlsJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'security_control_updated',
      objectType: 'security_control',
      objectId: undefined, // controlId is a string, not UUID
      metaJson: { controlId, ...data },
    });

    return await complianceService.getSecurityControls(orgId, userId);
  },

  /**
   * Get audit logs for compliance
   */
  getAuditLogs: async (
    orgId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      objectType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const where: any = { orgId };

    if (options?.action) {
      where.action = options.action;
    }
    if (options?.objectType) {
      where.objectType = options.objectType;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Fetch user details for logs that have actorUserId
    const userIds = [...new Set(logs.map(log => log.actorUserId).filter(Boolean) as string[])];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      logs: logs.map((log) => {
        const user = log.actorUserId ? userMap.get(log.actorUserId) : null;
        return {
          id: log.id,
          timestamp: log.createdAt,
          user: user?.email || 'system',
          userName: user?.name || null,
          action: log.action,
          objectType: log.objectType,
          objectId: log.objectId,
          resource: `${log.objectType || 'unknown'}:${log.objectId || 'unknown'}`,
          status: 'success', // Can be determined from metadata
          ip: (log.metaJson as any)?.ipAddress || 'internal',
          metadata: log.metaJson,
        };
      }),
      total,
    };
  },

  /**
   * Get compliance policies
   */
  getPolicies: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get policies from org settings
    let policiesData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).policiesJson) {
        policiesData = (orgSettings as any).policiesJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch policies from org settings');
    }

    // Default policies
    const defaultPolicies: CompliancePolicy[] = [
      {
        id: 'data-encryption',
        name: 'Data Encryption Policy',
        category: 'data-protection',
        description: 'AES-256 encryption for all data at rest and in transit',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'All data must be encrypted using AES-256. TLS 1.3 required for all connections.',
      },
      {
        id: 'data-retention',
        name: 'Data Retention Policy',
        category: 'data-protection',
        description: 'Automatic data purging after retention period',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Data will be automatically purged after 7 years as per regulatory requirements.',
      },
      {
        id: 'mfa-requirement',
        name: 'Multi-Factor Authentication Policy',
        category: 'access-control',
        description: 'MFA required for all users',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'All users must enable multi-factor authentication for account access.',
      },
      {
        id: 'session-timeout',
        name: 'Session Timeout Policy',
        category: 'access-control',
        description: 'Auto-logout after inactivity',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Sessions will automatically timeout after 30 minutes of inactivity.',
      },
      {
        id: 'backup-schedule',
        name: 'Backup & Recovery Policy',
        category: 'backup-recovery',
        description: 'Daily automated backups with 90-day retention',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Backups are performed daily at 2:00 AM UTC. Retention period is 90 days.',
      },
      {
        id: 'privacy-by-design',
        name: 'Privacy by Design Policy',
        category: 'privacy',
        description: 'Default privacy settings and GDPR compliance',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Privacy is built into all systems by default. GDPR compliant cookie consent and data subject rights.',
      },
    ];

    const storedPolicies = policiesData.policies || [];
    return storedPolicies.length > 0 ? storedPolicies : defaultPolicies;
  },

  /**
   * Update compliance policy
   */
  updatePolicy: async (
    orgId: string,
    userId: string,
    policyId: string,
    data: Partial<CompliancePolicy>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update compliance policies');
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update policies
    const policiesJson = ((orgSettings as any).policiesJson as any) || { policies: [] };
    const policies = policiesJson.policies || [];
    const index = policies.findIndex((p: CompliancePolicy) => p.id === policyId);

    if (index >= 0) {
      policies[index] = { 
        ...policies[index], 
        ...data,
        lastUpdated: new Date(),
        version: data.version || policies[index].version || '1.0',
      };
    } else {
      policies.push({ 
        id: policyId, 
        ...data,
        lastUpdated: new Date(),
        version: data.version || '1.0',
      } as CompliancePolicy);
    }

    policiesJson.policies = policies;

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET policies_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(policiesJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_policy_updated',
      objectType: 'compliance_policy',
      objectId: undefined, // policyId is a string, not UUID
      metaJson: { policyId, ...data },
    });

    return await complianceService.getPolicies(orgId, userId);
  },

  /**
   * Get overall security score
   */
  getSecurityScore: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const [frameworks, controls] = await Promise.all([
      complianceService.getFrameworks(orgId, userId),
      complianceService.getSecurityControls(orgId, userId),
    ]);

    // Calculate overall score
    const frameworkScores = frameworks.map(f => f.score);
    const avgFrameworkScore = frameworkScores.length > 0
      ? frameworkScores.reduce((a, b) => a + b, 0) / frameworkScores.length
      : 0;

    const allControls = Object.values(controls).flat();
    const controlScores = allControls.map(c => c.coverage);
    const avgControlScore = controlScores.length > 0
      ? controlScores.reduce((a, b) => a + b, 0) / controlScores.length
      : 0;

    const overallScore = Math.round((avgFrameworkScore * 0.6 + avgControlScore * 0.4));

    // Count critical issues (controls with coverage < 80%)
    const criticalIssues = allControls.filter(c => c.coverage < 80 && c.status !== 'disabled').length;

    return {
      overallScore,
      frameworkScore: Math.round(avgFrameworkScore),
      controlScore: Math.round(avgControlScore),
      frameworksCount: frameworks.length,
      controlsCount: allControls.length,
      activeControls: allControls.filter(c => c.status === 'enabled').length,
      criticalIssues,
    };
  },

  /**
   * Export compliance report
   */
  exportComplianceReport: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can export compliance reports');
    }

    const [frameworks, controls, policies, auditLogs, securityScore] = await Promise.all([
      complianceService.getFrameworks(orgId, userId),
      complianceService.getSecurityControls(orgId, userId),
      complianceService.getPolicies(orgId, userId),
      complianceService.getAuditLogs(orgId, userId, { limit: 1000 }),
      complianceService.getSecurityScore(orgId, userId),
    ]);

    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    // Query details separately to avoid Prisma include issues
    let orgDetails = null;
    try {
      orgDetails = await prisma.orgDetails.findUnique({
        where: { orgId },
      });
    } catch (error: any) {
      logger.warn(`Could not fetch org details: ${error.message}`);
    }

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_report_exported',
      objectType: 'compliance_report',
      objectId: orgId,
      metaJson: { exportDate: new Date().toISOString() },
    });

    return {
      exportDate: new Date().toISOString(),
      organization: {
        id: org?.id,
        name: org?.name,
        industry: orgDetails?.industry || null,
      },
      securityScore,
      frameworks,
      controls: Object.values(controls).flat(),
      policies,
      auditLogs: auditLogs.logs.slice(0, 100), // Sample of recent logs
      summary: {
        totalFrameworks: frameworks.length,
        compliantFrameworks: frameworks.filter(f => f.status === 'compliant').length,
        totalControls: Object.values(controls).flat().length,
        enabledControls: Object.values(controls).flat().filter(c => c.status === 'enabled').length,
        totalPolicies: policies.length,
        activePolicies: policies.filter((p: CompliancePolicy) => p.enabled).length,
      },
    };
  },
};

