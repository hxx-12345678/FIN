import { z } from 'zod';

export const CreateMonteCarloSchema = z.object({
  numSimulations: z.number().int().min(100).max(100000).default(2000),
  drivers: z.record(z.string(), z.any()).optional(), // Or define a more specific driver schema
  overrides: z.record(z.string(), z.any()).optional(),
  randomSeed: z.number().int().optional(),
  mode: z.enum(['quick', 'full']).default('full'),
});

