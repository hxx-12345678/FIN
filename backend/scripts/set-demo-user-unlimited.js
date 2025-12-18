"use strict";
/**
 * Script to set unlimited quotas for demo/test user
 * Usage: npx ts-node scripts/set-demo-user-unlimited.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
const DEMO_USER_EMAIL = 'cptjacksprw@gmail.com';
const UNLIMITED_VALUE = 999999999; // Very large number to simulate unlimited
async function setDemoUserUnlimited() {
    try {
        console.log(`🔍 Finding user: ${DEMO_USER_EMAIL}...`);
        // Find the user
        const user = await database_1.default.user.findUnique({
            where: { email: DEMO_USER_EMAIL },
            include: {
                roles: {
                    include: {
                        org: true,
                    },
                },
            },
        });
        if (!user) {
            console.error(`❌ User not found: ${DEMO_USER_EMAIL}`);
            process.exit(1);
        }
        console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
        // Get all orgs for this user
        const orgIds = user.roles.map(role => role.orgId);
        console.log(`📊 Found ${orgIds.length} organization(s) for this user`);
        for (const orgId of orgIds) {
            const org = user.roles.find(r => r.orgId === orgId)?.org;
            console.log(`\n🏢 Processing org: ${org?.name} (ID: ${orgId})`);
            // Update or create quota with unlimited values
            const quota = await database_1.default.orgQuota.upsert({
                where: { orgId },
                update: {
                    monteCarloSimsLimit: UNLIMITED_VALUE,
                    monteCarloSimsUsed: 0, // Reset used count
                    exportsLimit: UNLIMITED_VALUE,
                    exportsUsed: 0,
                    alertsLimit: UNLIMITED_VALUE,
                    monteCarloResetAt: null, // No reset needed for unlimited
                    exportsResetAt: null,
                },
                create: {
                    orgId,
                    monteCarloSimsLimit: UNLIMITED_VALUE,
                    monteCarloSimsUsed: 0,
                    exportsLimit: UNLIMITED_VALUE,
                    exportsUsed: 0,
                    alertsLimit: UNLIMITED_VALUE,
                    monteCarloResetAt: null,
                    exportsResetAt: null,
                },
            });
            console.log(`✅ Updated quota for org ${orgId}:`);
            console.log(`   - Monte Carlo limit: ${quota.monteCarloSimsLimit.toLocaleString()}`);
            console.log(`   - Exports limit: ${quota.exportsLimit.toLocaleString()}`);
            console.log(`   - Alerts limit: ${quota.alertsLimit.toLocaleString()}`);
            console.log(`   - Reset used counts to 0`);
            // Also update org plan tier to enterprise (for credit system)
            await database_1.default.org.update({
                where: { id: orgId },
                data: {
                    planTier: 'enterprise',
                },
            });
            console.log(`✅ Updated org plan tier to: enterprise`);
        }
        console.log(`\n🎉 Successfully set unlimited quotas for ${DEMO_USER_EMAIL}`);
        console.log(`\n📝 Note: The simulation credit system also checks plan tier.`);
        console.log(`   Enterprise plan allows up to 100,000 simulations per month.`);
        console.log(`   If you need truly unlimited, you may need to modify the credit service.`);
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    finally {
        await database_1.default.$disconnect();
    }
}
setDemoUserUnlimited();
//# sourceMappingURL=set-demo-user-unlimited.js.map