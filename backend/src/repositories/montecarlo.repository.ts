import prisma from '../config/database';
import { MonteCarloJob } from '@prisma/client';

export const montecarloRepository = {
  findById: async (id: string): Promise<MonteCarloJob | null> => {
    return await prisma.monteCarloJob.findUnique({
      where: { id },
      include: {
        modelRun: {
          include: {
            model: true,
          },
        },
      },
    });
  },

  findByParamsHash: async (
    orgId: string,
    paramsHash: string,
    ttlDays: number = 30
  ): Promise<MonteCarloJob | null> => {
    const ttlDate = new Date();
    ttlDate.setDate(ttlDate.getDate() - ttlDays);

    return await prisma.monteCarloJob.findFirst({
      where: {
        orgId,
        paramsHash,
        status: 'done',
        finishedAt: {
          gte: ttlDate,
        },
        resultS3: {
          not: null,
        },
      },
      orderBy: {
        finishedAt: 'desc',
      },
    });
  },

  create: async (data: {
    modelRunId: string;
    orgId: string;
    numSimulations: number;
    paramsHash: string;
    status?: string;
  }): Promise<MonteCarloJob> => {
    return await prisma.monteCarloJob.create({
      data: {
        modelRunId: data.modelRunId,
        orgId: data.orgId,
        numSimulations: data.numSimulations,
        paramsHash: data.paramsHash,
        status: data.status || 'queued',
      },
    });
  },

  update: async (
    id: string,
    data: {
      status?: string;
      resultS3?: string;
      percentilesJson?: any;
      cpuSecondsEstimate?: number;
      finishedAt?: Date;
    }
  ): Promise<MonteCarloJob> => {
    return await prisma.monteCarloJob.update({
      where: { id },
      data,
    });
  },
};


