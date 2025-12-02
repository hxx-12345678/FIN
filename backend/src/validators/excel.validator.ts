import { z } from 'zod';

/**
 * Excel import validation schemas
 */

// Excel range validation (A1:D100 or named range)
const excelRangeSchema = z.string().regex(
  /^([A-Z]+[0-9]+(:[A-Z]+[0-9]+)?|[A-Z_][A-Z0-9_]*)$/i,
  'Invalid Excel range format. Use A1:D100 or named range.'
);

// Excel mapping schema
export const excelMappingSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  mappingJson: z.object({
    sheetName: z.string().optional(),
    columnMappings: z.record(z.string(), z.object({
      csvColumn: z.string(),
      targetField: z.string(),
      dataType: z.enum(['date', 'amount', 'description', 'category', 'currency', 'source_id']).optional(),
    })),
    rangeMappings: z.array(z.object({
      range: excelRangeSchema,
      mapToModelItem: z.string().uuid().optional(),
      mapToChartOfAccount: z.string().optional(),
    })).optional(),
  }),
});

// Excel upload schema
export const excelUploadSchema = z.object({
  fileName: z.string().optional(),
  mappingId: z.string().uuid().optional(),
});

// Excel sync schema
export const excelSyncSchema = z.object({
  fileHash: z.string().length(64), // SHA256
  mappingId: z.string().uuid().optional(),
  fileName: z.string().optional(),
});

// Excel merge schema
export const excelMergeSchema = z.object({
  fileHash: z.string().length(64),
  mappingId: z.string().uuid().optional(),
  changes: z.array(z.object({
    cellRef: z.string(), // Sheet!A1
    oldValue: z.any().optional(),
    newValue: z.any(),
    formula: z.string().optional(),
  })).optional(),
});

// Excel export schema
export const excelExportSchema = z.object({
  modelRunId: z.string().uuid(),
  mappingId: z.string().uuid().optional(),
  includeProvenance: z.boolean().default(true),
  includeChangeTracking: z.boolean().default(true),
});

// Excel range sync schema
export const excelRangeSyncSchema = z.object({
  sheetName: z.string(),
  range: excelRangeSchema,
  mappingId: z.string().uuid().optional(),
});

// UUID validation helper
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});


