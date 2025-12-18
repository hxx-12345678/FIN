"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
/**
 * Usage:
 *   npx tsx scripts/list-latest-model-runs.ts <modelId> [limit]
 */
async function main() {
    const modelId = process.argv[2];
    const limit = Number(process.argv[3] || 10);
    if (!modelId) {
        console.error('Missing modelId.\nUsage: npx tsx scripts/list-latest-model-runs.ts <modelId> [limit]');
        process.exit(2);
    }
    const runs = await database_1.default.modelRun.findMany({
        where: { modelId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            status: true,
            createdAt: true,
            finishedAt: true,
            summaryJson: true,
        },
    });
    const out = runs.map((r) => {
        const sj = r.summaryJson;
        const monthly = sj && typeof sj === 'object' ? sj.monthly : undefined;
        const monthlyCount = monthly && typeof monthly === 'object' ? Object.keys(monthly).length : null;
        return {
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            finishedAt: r.finishedAt,
            monthlyCount,
        };
    });
    console.table(out);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=list-latest-model-runs.js.map