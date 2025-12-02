import { z } from 'zod';

export const CreateModelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dataSource: z.enum(['blank', 'csv', 'quickbooks', 'xero']).default('blank'),
  csvFileId: z.string().uuid().optional(),
});

export const CreateModelRunSchema = z.object({
  runType: z.enum(['baseline', 'scenario', 'adhoc', 'forecast']).default('baseline'),
  paramsJson: z.record(z.string(), z.any()).optional(),
  params: z.record(z.string(), z.any()).optional(), // For backward compatibility
});

export const CreateSnapshotSchema = z.object({
  paramsJson: z.record(z.string(), z.any()).optional(),
  name: z.string().optional(),
});

export const CompareRunsSchema = z.object({
  run_a: z.string().uuid('Run A ID is invalid'),
  run_b: z.string().uuid('Run B ID is invalid'),
});

