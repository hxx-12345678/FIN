import crypto from 'crypto';
import { montecarloRepository } from '../repositories/montecarlo.repository';
import { jobService } from './job.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';
import { getSignedUrlForS3 } from '../utils/s3';
import { config } from '../config/env';
import { MonteCarloJob } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Compute deterministic paramsHash from Monte Carlo parameters
 * Uses canonical JSON serialization with sorted keys
 */
export const computeParamsHash = (payload: {
  modelId: string;
  modelVersion?: number;
  drivers: Record<string, any>;
  overrides?: Record<string, any>;
  numSimulations: number;
  randomSeed?: number;
  mode?: string;
}): string => {
  // Create canonical payload object with sorted keys
  const canonical = {
    modelId: payload.modelId,
    modelVersion: payload.modelVersion || 1,
    drivers: sortObjectKeys(payload.drivers),
    overrides: payload.overrides ? sortObjectKeys(payload.overrides) : {},
    numSimulations: payload.numSimulations,
    randomSeed: payload.randomSeed || null,
    mode: payload.mode || 'full',
  };

  // Serialize to JSON with deterministic formatting (compact, no spaces)
  const jsonString = JSON.stringify(canonical, null, 0)
    .replace(/\s+/g, '');

  // Compute SHA256 hash
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};

/**
 * Recursively sort object keys for deterministic hashing
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

/**
 * Check cache for existing Monte Carlo result
 */
export const checkCache = async (
  orgId: string,
  paramsHash: string,
  ttlDays: number = config.monteCarlo.ttlDays
): Promise<MonteCarloJob | null> => {
  return await montecarloRepository.findByParamsHash(orgId, paramsHash, ttlDays);
};

/**
 * Create Monte Carlo job (both monte_carlo_jobs and jobs rows)
 */
export const createMonteCarloJob = async (
  modelId: string,
  modelRunId: string,
  orgId: string,
  paramsHash: string,
  numSimulations: number,
  jobPayload: {
    drivers: Record<string, any>;
    overrides?: Record<string, any>;
    randomSeed?: number;
    mode?: string;
  }
): Promise<{ monteCarloJobId: string; jobId: string }> => {
  // Create monte_carlo_jobs row
  const mcJob = await montecarloRepository.create({
    modelRunId,
    orgId,
    numSimulations,
    paramsHash,
    status: 'queued',
  });

  // Create jobs row
  const job = await jobService.createJob({
    jobType: 'monte_carlo',
    orgId,
    objectId: mcJob.id,
    params: {
      monteCarloJobId: mcJob.id,
      modelRunId,
      modelId,
      numSimulations,
      drivers: jobPayload.drivers,
      overrides: jobPayload.overrides,
      randomSeed: jobPayload.randomSeed,
      mode: jobPayload.mode || 'full',
      paramsHash,
    },
  });

  return {
    monteCarloJobId: mcJob.id,
    jobId: job.id,
  };
};

/**
 * Get Monte Carlo job result with signed S3 URL
 * jobId can be either jobs.id or monte_carlo_jobs.id
 */
export const getMonteCarloResult = async (jobId: string) => {
  // Try to find as job first
  let job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  let mcJob;
  
  if (job) {
    // jobId is jobs.id - find associated Monte Carlo job
    mcJob = await montecarloRepository.findById(job.objectId || '');
  } else {
    // jobId might be monte_carlo_jobs.id directly
    mcJob = await montecarloRepository.findById(jobId);
    if (mcJob) {
      // Find associated job
      job = await prisma.job.findFirst({
        where: { objectId: mcJob.id },
      });
    }
  }

  if (!mcJob) {
    throw new NotFoundError('Monte Carlo job not found');
  }

  // Create a virtual job object if not found (for backward compatibility)
  // Note: This is a minimal job object for the return value, not a full Prisma Job
  const virtualJob = {
    id: jobId,
    status: mcJob.status || 'queued',
    progress: mcJob.status === 'done' ? 100 : 0,
    jobType: 'monte_carlo' as const,
    objectId: mcJob.id,
  };
  
  if (!job) {
    job = virtualJob as any; // Type assertion needed for virtual job
  }

  // Get signed URL for result if available
  let resultUrl = null;
  if (mcJob.resultS3) {
    try {
      resultUrl = await getSignedUrlForS3(mcJob.resultS3, 3600);
    } catch (error) {
      console.warn(`Failed to get signed URL for ${mcJob.resultS3}: ${error}`);
      // Ignore S3 errors - continue with null URL
    }
  }

  // Parse percentiles JSON if available
  // Handle both JSONB object and string formats
  let percentiles = null;
  if (mcJob.percentilesJson) {
    try {
      if (typeof mcJob.percentilesJson === 'string') {
        percentiles = JSON.parse(mcJob.percentilesJson);
      } else if (typeof mcJob.percentilesJson === 'object') {
        percentiles = mcJob.percentilesJson;
      }
    } catch (parseError) {
      console.warn(`Error parsing percentilesJson: ${parseError}`);
    }
  }

  // Extract survival probability (MVP FEATURE: Probability of survival, not point forecast)
  let survivalProbability = null;
  if (percentiles && typeof percentiles === 'object') {
    const percentilesObj = percentiles as any;
    if (percentilesObj.survival_probability) {
      survivalProbability = percentilesObj.survival_probability;
    } else if (percentilesObj.survivalProbability) {
      survivalProbability = percentilesObj.survivalProbability;
    }
  }

  // Get sensitivity data if available
  // Check both sensitivity_json field and percentiles_json->tornado_sensitivity
  let sensitivityJson = null;
  
  // First, try sensitivity_json field (preferred)
  if (mcJob.sensitivityJson) {
    try {
      sensitivityJson = typeof mcJob.sensitivityJson === 'string'
        ? JSON.parse(mcJob.sensitivityJson)
        : mcJob.sensitivityJson;
    } catch (parseError) {
      console.warn(`Error parsing sensitivityJson: ${parseError}`);
    }
  }
  
  // Fallback: extract from percentiles_json if sensitivity_json is not available
  if (!sensitivityJson && percentiles && typeof percentiles === 'object') {
    const percentilesObj = percentiles as any;
    if (percentilesObj.tornado_sensitivity || percentilesObj.tornadoSensitivity) {
      const tornadoSens = percentilesObj.tornado_sensitivity || percentilesObj.tornadoSensitivity;
      // Convert dict format to array format for frontend
      if (typeof tornadoSens === 'object' && !Array.isArray(tornadoSens)) {
        const sensitivityArray = Object.entries(tornadoSens).map(([driver, data]: [string, any]) => ({
          driver,
          correlation: data.pearson_correlation || data.correlation || 0.0,
          spearman_correlation: data.spearman_correlation || 0.0,
          abs_correlation: data.abs_correlation || Math.abs(data.pearson_correlation || data.correlation || 0.0),
          p_value: data.p_value || 0.0,
        }));
        sensitivityJson = sensitivityArray;
      } else if (Array.isArray(tornadoSens)) {
        sensitivityJson = tornadoSens;
      }
    }
  }

  // Ensure progress is a number
  // If job is done, progress should be 100
  let progress = typeof job.progress === 'number' ? job.progress : (typeof job.progress === 'string' ? parseFloat(job.progress) || 0 : 0);
  
  // If job status is 'done' or 'completed', ensure progress is 100
  if ((job.status === 'done' || job.status === 'completed' || mcJob.status === 'done') && progress < 100) {
    logger?.warn?.(`Job ${job.id} is done but progress is ${progress}%, setting to 100%`);
    progress = 100;
  }
  
  progress = Math.max(0, Math.min(100, progress)); // Ensure progress is between 0 and 100

  return {
    jobId: job.id,
    monteCarloJobId: mcJob.id,
    orgId: mcJob.orgId,
    status: mcJob.status || job.status || 'queued',
    progress,
    numSimulations: mcJob.numSimulations,
    resultS3: mcJob.resultS3,
    resultUrl,
    percentiles,
    sensitivityJson, // Add sensitivity data for tornado chart
    survivalProbability, // MVP FEATURE: Probability of survival, not point forecast
    confidenceLevel: mcJob.confidenceLevel,
    cpuSecondsEstimate: mcJob.cpuSecondsEstimate,
    cpuSecondsActual: mcJob.cpuSecondsActual,
    createdAt: mcJob.createdAt,
    finishedAt: mcJob.finishedAt,
  };
};

export const montecarloService = {
  computeParamsHash,
  checkCache,
  createMonteCarloJob,
  getMonteCarloResult,
};

