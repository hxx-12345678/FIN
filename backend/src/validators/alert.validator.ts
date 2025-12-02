import { z } from 'zod';

export const CreateAlertSchema = z.object({
  metric: z.string().min(1, 'Metric is required'),
  operator: z.enum(['>', '>=', '<', '<=', '==']),
  value: z.number(),
  delivery_channels: z.array(z.enum(['email', 'slack'])).min(1, 'At least one delivery channel is required'),
  slack_webhook: z.string().url().optional(),
  active: z.boolean().default(true),
});

export const UpdateAlertSchema = z.object({
  metric: z.string().min(1).optional(),
  operator: z.enum(['>', '>=', '<', '<=', '==']).optional(),
  value: z.number().optional(),
  delivery_channels: z.array(z.enum(['email', 'slack'])).min(1).optional(),
  slack_webhook: z.string().url().optional(),
  active: z.boolean().optional(),
});


