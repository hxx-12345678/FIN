"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
/**
 * Usage:
 *   npx tsx scripts/inspect-org-transactions.ts <orgId> [limit]
 */
async function main() {
    const orgId = process.argv[2];
    const limit = Number(process.argv[3] || 10);
    if (!orgId) {
        console.error('Missing orgId.\nUsage: npx tsx scripts/inspect-org-transactions.ts <orgId> [limit]');
        process.exit(2);
    }
    const agg = await database_1.default.rawTransaction.aggregate({
        where: { orgId },
        _count: { _all: true },
        _min: { date: true },
        _max: { date: true },
    });
    const rows = await database_1.default.rawTransaction.findMany({
        where: { orgId },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
            id: true,
            date: true,
            amount: true,
            category: true,
            description: true,
        },
    });
    console.log(JSON.stringify({
        orgId,
        count: agg._count._all,
        minDate: agg._min.date,
        maxDate: agg._max.date,
        sampleNewest: rows,
    }, null, 2));
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=inspect-org-transactions.js.map