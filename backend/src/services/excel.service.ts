import prisma from '../config/database';
import { jobService } from './job.service';
import { uploadStreamToS3, getSignedUrlForS3 } from '../utils/s3';
import { orgRepository } from '../repositories/org.repository';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import crypto from 'crypto';
import { quotaService } from './quota.service';

const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10); // 100MB default

// In-memory cache for file data (for development when S3 is not configured)
const fileDataCache = new Map<string, { data: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const excelService = {
  /**
   * Upload XLSX file and return upload key
   */
  uploadXlsx: async (
    orgId: string,
    userId: string,
    file: Express.Multer.File
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Check if user has finance or admin role
    if (role.role !== 'admin' && role.role !== 'finance') {
      throw new ForbiddenError('Excel import requires finance or admin role');
    }

    // Validate file
    if (!file) {
      throw new ValidationError('No file provided');
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`
      );
    }

    // Compute file hash
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Check if file already synced
    const existingSync = await prisma.excelSync.findFirst({
      where: {
        orgId,
        fileHash,
        status: 'completed',
      },
      orderBy: { lastSyncedAt: 'desc' },
    });

    // Generate upload key
    const fileId = uuidv4();
    const uploadKey = `uploads/${orgId}/${fileId}.xlsx`;

    // Try to upload to S3, fallback to storing in job params if S3 not configured
    let s3Key: string | null = null;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    
    if (s3Bucket) {
      try {
        const fileStream = Readable.from(file.buffer);
        s3Key = await uploadStreamToS3(uploadKey, fileStream, file.mimetype, file.size);
      } catch (error: any) {
        console.warn(`S3 upload failed: ${error.message}, storing file in job params instead`);
        s3Key = null;
      }
    } else {
      console.info('S3_BUCKET_NAME not set, storing file in memory cache');
      const expiresAt = Date.now() + CACHE_TTL_MS;
      fileDataCache.set(uploadKey, {
        data: file.buffer,
        expiresAt,
      });
    }

    // Create preview job to parse XLSX and detect headers/formulas
    const previewJob = await jobService.createJob({
      jobType: 'xlsx_preview',
      orgId,
      objectId: undefined,
      params: {
        uploadKey,
        s3Key,
        fileName: file.originalname,
        fileHash,
        orgId,
      },
      createdByUserId: userId,
    });

    return {
      uploadKey,
      fileName: file.originalname,
      fileSize: file.size,
      fileHash,
      jobId: previewJob.id,
      existingSync: existingSync ? {
        id: existingSync.id,
        lastSyncedAt: existingSync.lastSyncedAt,
      } : null,
    };
  },

  /**
   * Create mapping template (without upload)
   */
  createMapping: async (
    orgId: string,
    userId: string,
    mappingData: { name: string; description?: string; mappingJson: any }
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role || (role.role !== 'admin' && role.role !== 'finance')) {
      throw new ForbiddenError('Excel mapping requires finance or admin role');
    }

    const mapping = await prisma.excelMapping.create({
      data: {
        orgId,
        name: mappingData.name,
        description: mappingData.description,
        mappingJson: mappingData.mappingJson,
        createdById: userId,
      },
    });

    return mapping;
  },

  /**
   * Map XLSX columns and create import job
   */
  mapXlsx: async (
    orgId: string,
    userId: string,
    uploadKey: string,
    mappingJson: any,
    mappingId?: string,
    fileHash?: string
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role || (role.role !== 'admin' && role.role !== 'finance')) {
      throw new ForbiddenError('Excel import requires finance or admin role');
    }

    // Save or update mapping template if mappingId provided
    let savedMappingId = mappingId;
    if (mappingJson.name && !mappingId) {
      const mapping = await prisma.excelMapping.create({
        data: {
          orgId,
          name: mappingJson.name,
          description: mappingJson.description,
          mappingJson,
          createdById: userId,
        },
      });
      savedMappingId = mapping.id;
    } else if (mappingId) {
      // Update existing mapping
      await prisma.excelMapping.update({
        where: { id: mappingId },
        data: {
          mappingJson,
          updatedAt: new Date(),
        },
      });
    }

    // Create import job
    const importBatch = await prisma.dataImportBatch.create({
      data: {
        orgId,
        sourceType: 'xlsx',
        sourceRef: uploadKey,
        fileHash: fileHash || null,
        mappingJson: mappingJson as any,
        status: 'created',
        createdByUserId: userId,
      },
      select: { id: true },
    });

    const importJob = await jobService.createJob({
      jobType: 'xlsx_import',
      orgId,
      objectId: undefined,
      params: {
        uploadKey,
        mappingJson,
        mappingId: savedMappingId,
        fileHash: fileHash || null,
        importBatchId: importBatch.id,
        orgId,
      },
      createdByUserId: userId,
    });

    return {
      jobId: importJob.id,
      mappingId: savedMappingId,
      importBatchId: importBatch.id,
    };
  },

  /**
   * List Excel mapping templates
   */
  listMappings: async (orgId: string, userId: string) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const mappings = await prisma.excelMapping.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        mappingJson: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return mappings;
  },

  /**
   * Create Excel sync configuration
   */
  createSync: async (
    orgId: string,
    userId: string,
    fileHash: string,
    mappingId?: string,
    fileName?: string
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role || (role.role !== 'admin' && role.role !== 'finance')) {
      throw new ForbiddenError('Excel sync requires finance or admin role');
    }

    // Create or update sync (check if exists first)
    const existing = await prisma.excelSync.findFirst({
      where: {
        orgId,
        fileHash,
      },
    });

    const sync = existing
      ? await prisma.excelSync.update({
          where: { id: existing.id },
          data: {
            fileName,
            mappingId,
            updatedAt: new Date(),
          },
        })
      : await prisma.excelSync.create({
          data: {
            orgId,
            fileHash,
            fileName,
            mappingId,
            status: 'pending',
          },
        });

    return sync;
  },

  /**
   * Export model to XLSX
   */
  exportToXlsx: async (
    orgId: string,
    userId: string,
    modelRunId: string,
    mappingId?: string
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get model run
    const modelRun = await prisma.modelRun.findUnique({
      where: { id: modelRunId },
      include: {
        model: true,
      },
    });

    if (!modelRun || modelRun.orgId !== orgId) {
      throw new NotFoundError('Model run not found');
    }

    // Get mapping if provided
    let mapping = null;
    if (mappingId) {
      mapping = await prisma.excelMapping.findUnique({
        where: { id: mappingId },
      });
      if (!mapping || mapping.orgId !== orgId) {
        throw new NotFoundError('Mapping not found');
      }
    }

    // Create export job
    const exportJob = await jobService.createJob({
      jobType: 'excel_export',
      orgId,
      objectId: modelRunId,
      params: {
        modelRunId,
        mappingId,
        mappingJson: mapping?.mappingJson,
        orgId,
      },
      createdByUserId: userId,
    });

    return {
      jobId: exportJob.id,
    };
  },

  /**
   * Merge updated XLSX with model
   */
  mergeXlsx: async (
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    fileHash: string,
    mappingId?: string
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role || (role.role !== 'admin' && role.role !== 'finance')) {
      throw new ForbiddenError('Excel merge requires finance or admin role');
    }

    // Find existing sync
    const sync = await prisma.excelSync.findFirst({
      where: {
        orgId,
        fileHash,
      },
      include: {
        mapping: true,
      },
    });

    if (!sync) {
      throw new NotFoundError('No existing sync found for this file');
    }

    // Create merge job
    const mergeJob = await jobService.createJob({
      jobType: 'excel_merge',
      orgId,
      objectId: sync.id,
      params: {
        uploadKey: `uploads/${orgId}/${uuidv4()}.xlsx`,
        fileHash,
        mappingId: mappingId || sync.mappingId,
        syncId: sync.id,
        orgId,
      },
      createdByUserId: userId,
    });

    return {
      jobId: mergeJob.id,
      syncId: sync.id,
    };
  },

  /**
   * Get Excel sync status
   */
  getSyncStatus: async (orgId: string, userId: string, syncId: string) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const sync = await prisma.excelSync.findUnique({
      where: { id: syncId },
      include: {
        mapping: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sync || sync.orgId !== orgId) {
      throw new NotFoundError('Sync not found');
    }

    return sync;
  },

  /**
   * List Excel syncs for org
   */
  listSyncs: async (orgId: string, userId: string) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const syncs = await prisma.excelSync.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        mapping: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return syncs;
  },
};

