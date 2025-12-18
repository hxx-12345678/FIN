"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
const logger_1 = require("../src/utils/logger");
async function updateProvenanceNames() {
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
    if (!modelRun) {
        logger_1.logger.error(`❌ No model run found.`);
        return;
    }
    logger_1.logger.info(`\n📊 Updating Provenance Entry Names`);
    logger_1.logger.info(`   Model Run ID: ${modelRun.id}`);
    // Find all grossProfit and netIncome entries
    const entriesToUpdate = await database_1.default.provenanceEntry.findMany({
        where: {
            modelRunId: modelRun.id,
            cellKey: {
                contains: ':',
            },
            sourceType: 'assumption',
        },
    });
    let updated = 0;
    for (const entry of entriesToUpdate) {
        const cellKey = entry.cellKey;
        const sourceRef = entry.sourceRef;
        if (!sourceRef)
            continue;
        let needsUpdate = false;
        const newSourceRef = { ...sourceRef };
        if (cellKey.includes(':grossProfit')) {
            if (!sourceRef.assumption_id || sourceRef.assumption_id === 'Assumption') {
                newSourceRef.assumption_id = 'grossProfit';
                newSourceRef.name = 'Gross Profit';
                if (!newSourceRef.value && modelRun.summaryJson) {
                    const summary = typeof modelRun.summaryJson === 'string'
                        ? JSON.parse(modelRun.summaryJson)
                        : modelRun.summaryJson;
                    const monthKey = cellKey.split(':')[0];
                    if (summary.monthly && summary.monthly[monthKey]) {
                        newSourceRef.value = summary.monthly[monthKey].grossProfit;
                    }
                }
                needsUpdate = true;
            }
        }
        else if (cellKey.includes(':netIncome')) {
            if (!sourceRef.assumption_id || sourceRef.assumption_id === 'Assumption') {
                newSourceRef.assumption_id = 'netIncome';
                newSourceRef.name = 'Net Income';
                if (!newSourceRef.value && modelRun.summaryJson) {
                    const summary = typeof modelRun.summaryJson === 'string'
                        ? JSON.parse(modelRun.summaryJson)
                        : modelRun.summaryJson;
                    const monthKey = cellKey.split(':')[0];
                    if (summary.monthly && summary.monthly[monthKey]) {
                        newSourceRef.value = summary.monthly[monthKey].netIncome;
                    }
                }
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            await database_1.default.provenanceEntry.update({
                where: { id: entry.id },
                data: { sourceRef: newSourceRef },
            });
            updated++;
            logger_1.logger.info(`   ✅ Updated ${cellKey}`);
        }
    }
    logger_1.logger.info(`\n✅ Update complete! Updated ${updated} provenance entries.`);
}
updateProvenanceNames()
    .catch((e) => {
    logger_1.logger.error('Error updating provenance names:', e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=update-provenance-names.js.map