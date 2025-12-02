import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';

export interface UpdateSettingsParams {
  dataRetentionDays?: number;
  currency?: string;
  timezone?: string;
  region?: string;
}

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY'];
const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];
const VALID_REGIONS = ['global', 'us-east', 'us-west', 'eu', 'ap-south', 'ap-northeast'];

export const settingsService = {
  getSettings: async (orgId: string, userId: string) => {
    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get or create settings
    let settings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!settings) {
      // Get org defaults
      const org = await prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        throw new NotFoundError('Organization not found');
      }

      // Create default settings
      settings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    return settings;
  },

  updateSettings: async (
    orgId: string,
    userId: string,
    params: UpdateSettingsParams
  ) => {
    // Verify user access (admin only)
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update settings');
    }

    // Validate inputs
    if (params.currency && !VALID_CURRENCIES.includes(params.currency)) {
      throw new ValidationError(
        `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}`
      );
    }

    if (params.timezone && !VALID_TIMEZONES.includes(params.timezone)) {
      throw new ValidationError(
        `Invalid timezone. Must be one of: ${VALID_TIMEZONES.join(', ')}`
      );
    }

    if (params.region && !VALID_REGIONS.includes(params.region)) {
      throw new ValidationError(
        `Invalid region. Must be one of: ${VALID_REGIONS.join(', ')}`
      );
    }

    if (params.dataRetentionDays !== undefined) {
      if (params.dataRetentionDays < 30 || params.dataRetentionDays > 3650) {
        throw new ValidationError('dataRetentionDays must be between 30 and 3650');
      }
    }

    // Update or create settings
    const settings = await prisma.orgSettings.upsert({
      where: { orgId },
      create: {
        orgId,
        dataRetentionDays: params.dataRetentionDays || 365,
        currency: params.currency || 'USD',
        timezone: params.timezone || 'UTC',
        region: params.region || 'global',
        updatedById: userId,
      },
      update: {
        ...(params.dataRetentionDays !== undefined && {
          dataRetentionDays: params.dataRetentionDays,
        }),
        ...(params.currency && { currency: params.currency }),
        ...(params.timezone && { timezone: params.timezone }),
        ...(params.region && { region: params.region }),
        updatedById: userId,
      },
    });

    // Also update org if currency/timezone changed
    if (params.currency || params.timezone || params.region) {
      await prisma.org.update({
        where: { id: orgId },
        data: {
          ...(params.currency && { currency: params.currency }),
          ...(params.timezone && { timezone: params.timezone }),
          ...(params.region && { dataRegion: params.region }),
        },
      });
    }

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'settings_updated',
      objectType: 'org_settings',
      objectId: settings.id,
      metaJson: params,
    });

    return settings;
  },
};


