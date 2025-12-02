import prisma from '../config/database';

export const adminService = {
  getUsage: async (
    orgId?: string,
    startDate?: string,
    endDate?: string,
    metric?: string
  ) => {
    const where: any = {};

    if (orgId) {
      where.orgId = orgId;
    }

    if (metric) {
      where.metric = metric;
    }

    if (startDate || endDate) {
      where.bucketTime = {};
      if (startDate) {
        where.bucketTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.bucketTime.lte = new Date(endDate);
      }
    }

    const usage = await prisma.billingUsage.findMany({
      where,
      orderBy: { bucketTime: 'desc' },
    });

    // Aggregate by metric
    const aggregated: Record<string, { total: number; count: number; buckets: any[] }> = {};

    for (const entry of usage) {
      const metricKey = entry.metric;
      if (!aggregated[metricKey]) {
        aggregated[metricKey] = {
          total: 0,
          count: 0,
          buckets: [],
        };
      }

      const value = Number(entry.value || 0);
      aggregated[metricKey].total += value;
      aggregated[metricKey].count += 1;
      aggregated[metricKey].buckets.push({
        bucketTime: entry.bucketTime,
        value,
        orgId: entry.orgId,
      });
    }

    return {
      aggregated,
      raw: usage,
      summary: Object.entries(aggregated).map(([metric, data]) => ({
        metric,
        total: data.total,
        average: data.count > 0 ? data.total / data.count : 0,
        count: data.count,
      })),
    };
  },

  getMonteCarloUsage: async (
    orgId?: string,
    startDate?: string,
    endDate?: string
  ) => {
    const where: any = {
      metric: 'monte_carlo_cpu_seconds',
    };

    if (orgId) {
      where.orgId = orgId;
    }

    if (startDate || endDate) {
      where.bucketTime = {};
      if (startDate) {
        where.bucketTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.bucketTime.lte = new Date(endDate);
      }
    }

    const usage = await prisma.billingUsage.findMany({
      where,
      orderBy: { bucketTime: 'desc' },
    });

    // Also get job-level data
    const jobWhere: any = {
      jobType: 'monte_carlo',
    };

    if (orgId) {
      jobWhere.orgId = orgId;
    }

    if (startDate || endDate) {
      jobWhere.createdAt = {};
      if (startDate) {
        jobWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        jobWhere.createdAt.lte = new Date(endDate);
      }
    }

    const jobs = await prisma.job.findMany({
      where: jobWhere,
      select: {
        id: true,
        orgId: true,
        status: true,
        createdAt: true,
        finishedAt: true,
      },
    });

    const totalCpuSeconds = usage.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j) => j.status === 'completed').length;

    return {
      totalCpuSeconds,
      totalJobs,
      completedJobs,
      failedJobs: totalJobs - completedJobs,
      averageCpuSecondsPerJob: totalJobs > 0 ? totalCpuSeconds / totalJobs : 0,
      buckets: usage,
      jobs: jobs.slice(0, 100), // Limit to last 100 jobs
    };
  },

  getExportUsage: async (
    orgId?: string,
    startDate?: string,
    endDate?: string,
    type?: string
  ) => {
    const where: any = {};

    if (orgId) {
      where.orgId = orgId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const exports = await prisma.export.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Aggregate by type
    const byType: Record<string, number> = {};
    for (const exp of exports) {
      byType[exp.type] = (byType[exp.type] || 0) + 1;
    }

    return {
      total: exports.length,
      byType,
      exports: exports.slice(0, 100), // Limit to last 100 exports
    };
  },
};


