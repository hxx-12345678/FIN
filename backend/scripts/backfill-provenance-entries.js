"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
const logger_1 = require("../src/utils/logger");
async function backfillProvenanceEntries() {
    const userEmail = 'cptjacksprw@gmail.com';
    logger_1.logger.info(`🔍 Finding user: ${userEmail}...`);
    const user = await database_1.default.user.findUnique({
        where: { email: userEmail },
        include: {
            roles: {
                include: {
                    org: {
                        include: {
                            models: {
                                include: {
                                    modelRuns: {
                                        where: {
                                            status: 'done',
                                        },
                                        orderBy: {
                                            createdAt: 'desc',
                                        },
                                        take: 1,
                                    },
                                },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });
    if (!user || user.roles.length === 0) {
        logger_1.logger.error(`❌ User or org not found.`);
        return;
    }
    const org = user.roles[0].org;
    const model = org.models[0];
    const modelRun = model.modelRuns[0];
    if (!modelRun || !modelRun.summaryJson) {
        logger_1.logger.error(`❌ No model run or summary found.`);
        return;
    }
    logger_1.logger.info(`\n📊 Backfilling Provenance Entries`);
    logger_1.logger.info(`   Model Run ID: ${modelRun.id}`);
    logger_1.logger.info(`   Org ID: ${org.id}`);
    const summary = typeof modelRun.summaryJson === 'string'
        ? JSON.parse(modelRun.summaryJson)
        : modelRun.summaryJson;
    if (!summary.monthly) {
        logger_1.logger.error(`❌ No monthly data in summary.`);
        return;
    }
    const monthlyData = summary.monthly;
    let entriesCreated = 0;
    // Process each month
    for (const [monthKey, monthData] of Object.entries(monthlyData)) {
        try {
            const [year, month] = monthKey.split('-').map(Number);
            // Create provenance entries for missing metrics
            const metricsToCreate = [
                { key: 'cogs', value: monthData.cogs, assumptionId: 'cogsPercentage' },
                { key: 'grossProfit', value: monthData.grossProfit },
                { key: 'netIncome', value: monthData.netIncome },
            ];
            for (const metric of metricsToCreate) {
                if (metric.value === undefined || metric.value === null)
                    continue;
                const cellKey = `${year}-${String(month).padStart(2, '0')}:${metric.key}`;
                // Check if entry already exists
                const existing = await database_1.default.provenanceEntry.findFirst({
                    where: {
                        modelRunId: modelRun.id,
                        cellKey: cellKey,
                    },
                });
                if (existing) {
                    logger_1.logger.info(`   ⏭️  Skipping ${cellKey} - already exists`);
                    continue;
                }
                // Create appropriate source_ref based on metric
                let sourceRef = {};
                let sourceType = 'assumption';
                if (metric.key === 'cogs') {
                    sourceRef = {
                        assumption_id: 'cogsPercentage',
                        value: metric.value,
                        calculated_from: ['revenue'],
                        formula: 'cogs = revenue * cogsPercentage',
                    };
                }
                else if (metric.key === 'grossProfit') {
                    sourceRef = {
                        assumption_id: 'grossProfit',
                        name: 'Gross Profit',
                        calculated_from: ['revenue', 'cogs'],
                        formula: 'grossProfit = revenue - cogs',
                        value: metric.value,
                    };
                }
                else if (metric.key === 'netIncome') {
                    sourceRef = {
                        assumption_id: 'netIncome',
                        name: 'Net Income',
                        calculated_from: ['revenue', 'cogs', 'expenses'],
                        formula: 'netIncome = revenue - cogs - opex',
                        value: metric.value,
                    };
                }
                // Create provenance entry
                await database_1.default.provenanceEntry.create({
                    data: {
                        modelRunId: modelRun.id,
                        orgId: org.id,
                        cellKey: cellKey,
                        sourceType: sourceType,
                        sourceRef: sourceRef,
                        confidenceScore: 0.9,
                    },
                });
                entriesCreated++;
                logger_1.logger.info(`   ✅ Created ${cellKey}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`   ❌ Error processing ${monthKey}: ${error.message}`);
        }
    }
    logger_1.logger.info(`\n✅ Backfill complete! Created ${entriesCreated} provenance entries.`);
}
backfillProvenanceEntries()
    .catch((e) => {
    logger_1.logger.error('Error backfilling provenance entries:', e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=backfill-provenance-entries.js.map