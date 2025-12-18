"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
const logger_1 = require("../src/utils/logger");
const USER_EMAIL = 'cptjacksprw@gmail.com';
async function fixExistingModelRuns() {
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`FIXING EXISTING MODEL RUNS FOR: ${USER_EMAIL}`);
    logger_1.logger.info(`${'='.repeat(80)}\n`);
    // Get user and org
    const user = await database_1.default.user.findUnique({
        where: { email: USER_EMAIL },
        include: {
            roles: {
                include: {
                    org: true,
                },
            },
        },
    });
    if (!user || user.roles.length === 0) {
        logger_1.logger.error('User not found');
        return;
    }
    const org = user.roles[0].org;
    logger_1.logger.info(`✅ Organization: ${org.name} (${org.id})\n`);
    // Find customer count from auto-model trigger jobs (we know one has startingCustomers: 20)
    logger_1.logger.info(`📋 Finding customer count from auto-model trigger jobs...\n`);
    const triggerJobs = await database_1.default.job.findMany({
        where: {
            orgId: org.id,
            jobType: 'auto_model_trigger',
            status: 'done',
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 5,
    });
    let initialCustomers = 0;
    for (const triggerJob of triggerJobs) {
        if (triggerJob.logs) {
            const logs = typeof triggerJob.logs === 'string' ? JSON.parse(triggerJob.logs) : triggerJob.logs;
            if (Array.isArray(logs)) {
                for (const entry of logs) {
                    if (entry.meta?.params?.startingCustomers) {
                        initialCustomers = Number(entry.meta.params.startingCustomers);
                        logger_1.logger.info(`✅ Found startingCustomers: ${initialCustomers} in job ${triggerJob.id.substring(0, 8)}...`);
                        break;
                    }
                }
            }
            else if (typeof logs === 'object' && logs.params?.startingCustomers) {
                initialCustomers = Number(logs.params.startingCustomers);
                logger_1.logger.info(`✅ Found startingCustomers: ${initialCustomers} in job ${triggerJob.id.substring(0, 8)}...`);
                break;
            }
        }
        if (initialCustomers > 0)
            break;
    }
    // If still not found, try CSV import jobs
    if (initialCustomers === 0) {
        logger_1.logger.warn('⚠️  No startingCustomers found in auto-model trigger jobs');
        logger_1.logger.info('Checking CSV import jobs...\n');
        const csvJob = await database_1.default.job.findFirst({
            where: {
                orgId: org.id,
                jobType: 'csv_import',
                status: 'done',
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (csvJob && csvJob.logs) {
            const logs = typeof csvJob.logs === 'string' ? JSON.parse(csvJob.logs) : csvJob.logs;
            if (Array.isArray(logs)) {
                for (const entry of logs) {
                    if (entry.meta?.params?.initialCustomers) {
                        initialCustomers = Number(entry.meta.params.initialCustomers);
                        logger_1.logger.info(`✅ Found initialCustomers: ${initialCustomers}`);
                        break;
                    }
                }
            }
            else if (typeof logs === 'object' && logs.params?.initialCustomers) {
                initialCustomers = Number(logs.params.initialCustomers);
                logger_1.logger.info(`✅ Found initialCustomers: ${initialCustomers}`);
            }
        }
    }
    if (initialCustomers === 0) {
        logger_1.logger.error('❌ Could not find customer count. Using 20 as we know it was set in CSV import.');
        initialCustomers = 20; // We know from investigation that it was 20
    }
    // Update all model runs that have activeCustomers = 100
    logger_1.logger.info(`\n📋 Updating model runs with activeCustomers = 100...\n`);
    const modelRuns = await database_1.default.modelRun.findMany({
        where: {
            orgId: org.id,
            status: 'done',
        },
    });
    let updated = 0;
    for (const run of modelRuns) {
        if (run.summaryJson) {
            const summary = typeof run.summaryJson === 'string'
                ? JSON.parse(run.summaryJson)
                : run.summaryJson;
            if (summary.activeCustomers === 100 || summary.customerCount === 100) {
                logger_1.logger.info(`  Updating run ${run.id.substring(0, 8)}...`);
                logger_1.logger.info(`    Old: activeCustomers = ${summary.activeCustomers}, customerCount = ${summary.customerCount}`);
                summary.activeCustomers = initialCustomers;
                summary.customerCount = initialCustomers;
                await database_1.default.modelRun.update({
                    where: { id: run.id },
                    data: {
                        summaryJson: summary,
                    },
                });
                logger_1.logger.info(`    New: activeCustomers = ${initialCustomers}, customerCount = ${initialCustomers}`);
                updated++;
            }
        }
    }
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`SUMMARY`);
    logger_1.logger.info(`${'='.repeat(80)}\n`);
    logger_1.logger.info(`Updated ${updated} model run(s) with customer count: ${initialCustomers}`);
    logger_1.logger.info(`✅ Fix complete!\n`);
}
fixExistingModelRuns()
    .then(() => {
    logger_1.logger.info('✅ Script complete');
    process.exit(0);
})
    .catch((e) => {
    logger_1.logger.error('Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=fix-existing-model-runs-customer-count.js.map