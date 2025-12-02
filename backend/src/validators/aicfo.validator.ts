import { z } from 'zod';

export const GeneratePlanSchema = z.object({
  modelId: z.string().uuid('Invalid model ID'),
  runId: z.string().uuid('Invalid run ID'),
  goal: z.string().min(1, 'Goal is required'),
  constraints: z.array(z.string()).optional(),
});

export const ApplyPlanSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  changes: z.record(z.string(), z.any()), // Specific changes to apply
});

