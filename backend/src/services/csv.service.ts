import { jobService } from './job.service';
import { uploadStreamToS3 } from '../utils/s3';
import { orgRepository } from '../repositories/org.repository';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { csvRepository } from '../repositories/csv.repository';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10); // 100MB default

// In-memory cache for file data (for development when S3 is not configured)
// In production, this should be replaced with Redis or database storage
const fileDataCache = new Map<string, { data: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const csvService = {
  uploadCsv: async (
    orgId: string,
    userId: string,
    file: Express.Multer.File
  ) => {
    console.log('📤 csvService.uploadCsv called:', { orgId, userId, fileName: file.originalname, fileSize: file.size });
    
    // Verify user has access
    console.log('🔍 Checking user access...');
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      console.error('❌ User has no access to org');
      throw new ForbiddenError('No access to this organization');
    }
    console.log('✅ User has role:', role);

    // Validate file
    if (!file) {
      console.error('❌ No file provided');
      throw new ValidationError('No file provided');
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/csv',
      'text/plain',
    ];
    console.log('🔍 Validating file type:', file.mimetype);
    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.error('❌ Invalid file type:', file.mimetype);
      throw new ValidationError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      console.error('❌ File too large:', file.size);
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`
      );
    }

    console.log('✅ File validation passed');

    // Generate upload key
    const fileId = uuidv4();
    const uploadKey = `uploads/${orgId}/${fileId}.csv`;
    console.log('📋 Generated uploadKey:', uploadKey);

    // Try to upload to S3, fallback to storing in job params if S3 not configured
    let s3Key: string | null = null;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    
    if (s3Bucket) {
      try {
    // Upload to S3 using stream
    const fileStream = Readable.from(file.buffer);
        s3Key = await uploadStreamToS3(uploadKey, fileStream, file.mimetype, file.size);
      } catch (error: any) {
        // S3 upload failed, fallback to storing in job params
        console.warn(`S3 upload failed: ${error.message}, storing file in job params instead`);
        s3Key = null;
      }
    } else {
      console.info('S3_BUCKET_NAME not set, storing file in memory cache');
      // Store file data in memory cache for later retrieval
      const expiresAt = Date.now() + CACHE_TTL_MS;
      fileDataCache.set(uploadKey, {
        data: file.buffer,
        expiresAt,
      });
    }

    // Clean up expired cache entries
    const now = Date.now();
    for (const [key, value] of fileDataCache.entries()) {
      if (value.expiresAt < now) {
        fileDataCache.delete(key);
      }
    }

    // No need for preview job - we'll parse CSV directly in the import job
    // Just return the upload info for the mapping step
    console.log('✅ Upload complete, returning:', { uploadKey, fileName: file.originalname, fileSize: file.size });
    return {
      uploadKey,
      fileName: file.originalname,
      fileSize: file.size,
    };
  },

  mapCsv: async (
    orgId: string,
    userId: string,
    uploadKey: string,
    mappings: Record<string, string>,
    dateFormat?: string,
    currency?: string,
    defaultCategory?: string,
    initialCash?: number,
    initialCustomers?: number
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Validate inputs
    if (!uploadKey) {
      throw new ValidationError('uploadKey is required');
    }

    if (!mappings || Object.keys(mappings).length === 0) {
      throw new ValidationError('mappings are required');
    }

    // Get preview job to validate mappings
    // In production, fetch preview from S3 or job logs
    // For now, we'll validate in Python worker

    // Extract fileId from uploadKey (format: uploads/{orgId}/{fileId}.csv)
    // If uploadKey doesn't match pattern, generate new UUID
    const fileIdMatch = uploadKey.match(/uploads\/[^/]+\/([^/]+)\.csv$/);
    const fileId = fileIdMatch ? fileIdMatch[1] : uuidv4();

    // Get file data from cache if S3 is not configured
    let fileDataBase64: string | null = null;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    if (!s3Bucket) {
      const cached = fileDataCache.get(uploadKey);
      if (cached) {
        fileDataBase64 = cached.data.toString('base64');
        console.info(`File data retrieved from cache for ${uploadKey}, size: ${cached.data.length} bytes`);
        // Don't delete cache yet - keep it until job is processed
        // The cache will expire after 30 minutes automatically
      } else {
        console.error(`File data not found in cache for uploadKey: ${uploadKey}`);
        console.error(`Cache keys: ${Array.from(fileDataCache.keys()).join(', ')}`);
        throw new ValidationError('File data not found. Please re-upload the file.');
      }
    }

    // Create import job
    console.log('📤 Creating CSV import job with params:', {
      jobType: 'csv_import',
      orgId,
      objectId: fileId,
      mappingsCount: Object.keys(mappings).length,
      hasFileData: !!fileDataBase64,
      fileDataSize: fileDataBase64 ? fileDataBase64.length : 0,
      hasMappings: Object.keys(mappings).length > 0,
    });

    try {
      const importJob = await jobService.createJob({
        jobType: 'csv_import',
        orgId,
        objectId: fileId, // Use UUID fileId instead of uploadKey path
        params: {
          uploadKey, // Store the upload key in params
          s3Key: s3Bucket ? uploadKey : null, // Only set if S3 is configured
          fileData: fileDataBase64, // Base64 encoded file data for development
          mappings,
          dateFormat: dateFormat || 'YYYY-MM-DD',
          currency: currency || 'USD',
          defaultCategory,
          initialCash: initialCash || 0,
          initialCustomers: initialCustomers || 0,
          mappedBy: userId,
          mappedAt: new Date().toISOString(),
        },
        createdByUserId: userId, // Pass userId to job service
      });

      console.log('✅ CSV import job created successfully:', {
        jobId: importJob.id,
        status: importJob.status,
        queue: importJob.queue,
      });

      return {
        jobId: importJob.id,
        status: importJob.status,
      };
    } catch (error: any) {
      console.error('❌ Failed to create CSV import job:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to create import job: ${error.message}`);
    }
  },

  autoMap: async (
    orgId: string,
    userId: string,
    uploadKey: string,
    sampleRowsS3Key?: string
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Simple heuristic mapping
    // In production, this could call Python worker or use ML
    const suggestions: Record<string, string> = {};

    // Common column name patterns
    const columnPatterns = {
      date: ['date', 'transaction_date', 'posted_date', 'invoice_date', 'payment_date'],
      amount: ['amount', 'total', 'value', 'price', 'cost', 'revenue', 'income'],
      description: ['description', 'memo', 'notes', 'details', 'narration', 'particulars'],
      category: ['category', 'account', 'account_name', 'type', 'classification'],
      invoice: ['invoice', 'invoice_number', 'invoice_id', 'bill_number'],
      tax: ['tax', 'gst', 'vat', 'tax_amount', 'gst_amount'],
    };

    // This is a placeholder - in production, fetch actual column names from preview
    // For now, return heuristic suggestions
    return {
      suggestions: {
        // These would be populated based on actual CSV headers
        date: 'date',
        amount: 'amount',
        description: 'description',
        category: 'category',
      },
      confidence: 0.7,
      method: 'heuristic',
    };
  },

  saveMappingTemplate: async (
    orgId: string,
    userId: string,
    name: string,
    templateJson: any
  ) => {
    // Verify user has access
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Save template
    const template = await csvRepository.saveMappingTemplate(
      orgId,
      name,
      templateJson,
      userId
    );

    return template;
  },
};

