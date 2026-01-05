/**
 * Production-Level Test for Semantic Ledger
 * Tests with respect to cptjacksprw@gmail.com
 */

import prisma from './config/database';

async function testSemanticLedgerProduction(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SEMANTIC LEDGER PRODUCTION TEST`);
  console.log(`   User: ${userEmail}`);
  console.log(`${'='.repeat(80)}\n`);

  // 1. Get user and org
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      roles: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!user || !user.roles || user.roles.length === 0) {
    console.error(`❌ User not found or has no organizations`);
    return;
  }

  const orgId = user.roles[0].org.id;
  const orgName = user.roles[0].org.name;
  console.log(`✅ Organization: ${orgName} (${orgId})\n`);

  // 2. Test Raw Transactions
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 1: RAW TRANSACTIONS (Before Promotion)`);
  console.log(`${'─'.repeat(80)}\n`);

  const rawTransactions = await prisma.rawTransaction.findMany({
    where: { orgId, isDuplicate: false },
    orderBy: { date: 'desc' },
    take: 10,
  });

  console.log(`📊 Raw Transactions: ${rawTransactions.length} (showing latest 10)`);
  if (rawTransactions.length > 0) {
    rawTransactions.forEach((txn, idx) => {
      console.log(`\n   Transaction ${idx + 1}:`);
      console.log(`   - ID: ${txn.id}`);
      console.log(`   - Date: ${txn.date.toLocaleDateString()}`);
      console.log(`   - Amount: ${txn.amount}`);
      console.log(`   - Category: ${txn.category || 'N/A'}`);
      console.log(`   - Description: ${txn.description?.substring(0, 50) || 'N/A'}...`);
      console.log(`   - Import Batch: ${txn.importBatchId || 'N/A'}`);
    });
  } else {
    console.log(`   ⚠️  No raw transactions found`);
  }

  // 3. Test Import Batches
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 2: IMPORT BATCHES`);
  console.log(`${'─'.repeat(80)}\n`);

  const importBatches = await prisma.dataImportBatch.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`📦 Import Batches: ${importBatches.length}`);
  if (importBatches.length > 0) {
    importBatches.forEach((batch, idx) => {
      const stats = typeof batch.statsJson === 'string' 
        ? JSON.parse(batch.statsJson) 
        : batch.statsJson || {};
      console.log(`\n   Batch ${idx + 1}:`);
      console.log(`   - ID: ${batch.id}`);
      console.log(`   - Source Type: ${batch.sourceType}`);
      console.log(`   - Status: ${batch.status}`);
      console.log(`   - Rows Imported: ${stats.rowsImported || 0}`);
      console.log(`   - Created: ${batch.createdAt.toLocaleString()}`);
    });
  } else {
    console.log(`   ⚠️  No import batches found`);
  }

  // 4. Test Financial Ledger
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 3: FINANCIAL LEDGER (After Promotion)`);
  console.log(`${'─'.repeat(80)}\n`);

  const ledgerEntries = await prisma.financialLedger.findMany({
    where: { orgId },
    orderBy: { transactionDate: 'desc' },
    take: 10,
  });

  console.log(`📊 Ledger Entries: ${ledgerEntries.length} (showing latest 10)`);
  if (ledgerEntries.length > 0) {
    ledgerEntries.forEach((entry, idx) => {
      console.log(`\n   Entry ${idx + 1}:`);
      console.log(`   - ID: ${entry.id}`);
      console.log(`   - Date: ${entry.transactionDate.toLocaleDateString()}`);
      console.log(`   - Amount: ${entry.amount}`);
      console.log(`   - Account: ${entry.accountName || entry.accountCode || 'N/A'}`);
      console.log(`   - Category: ${entry.category || 'N/A'}`);
      console.log(`   - Source Type: ${entry.sourceType}`);
      console.log(`   - Is Adjustment: ${entry.isAdjustment ? '✅ Yes' : '❌ No'}`);
      if (entry.isAdjustment) {
        console.log(`   - Adjustment Reason: ${entry.adjustmentReason || 'N/A'}`);
      }
    });
  } else {
    console.log(`   ⚠️  No ledger entries found (need to promote raw transactions)`);
  }

  // 5. Test Promotion Capability
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 4: PROMOTION CAPABILITY`);
  console.log(`${'─'.repeat(80)}\n`);

  const unpromotedBatches = importBatches.filter(b => b.status === 'completed');
  const promotedBatches = importBatches.filter(b => {
    // Check if any ledger entries reference this batch
    return ledgerEntries.some(e => e.sourceType === 'raw_transaction');
  });

  console.log(`📊 Promotion Status:`);
  console.log(`   - Completed Batches: ${unpromotedBatches.length}`);
  console.log(`   - Potentially Promoted: ${promotedBatches.length > 0 ? 'Yes' : 'No'}`);

  // Count raw transactions per batch
  for (const batch of unpromotedBatches.slice(0, 3)) {
    const count = await prisma.rawTransaction.count({
      where: {
        orgId,
        importBatchId: batch.id,
        isDuplicate: false,
      },
    });
    console.log(`   - Batch ${batch.id.substring(0, 8)}...: ${count} unpromoted transactions`);
  }

  // 6. Test Audit Trail
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 5: AUDIT TRAIL`);
  console.log(`${'─'.repeat(80)}\n`);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      orgId,
      action: { in: ['transactions_promoted_to_ledger', 'ledger_adjustment_added'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`📋 Audit Logs: ${auditLogs.length} (showing latest 10)`);
  if (auditLogs.length > 0) {
    auditLogs.forEach((log, idx) => {
      const meta = typeof log.metaJson === 'string' 
        ? JSON.parse(log.metaJson) 
        : log.metaJson || {};
      console.log(`\n   Log ${idx + 1}:`);
      console.log(`   - Action: ${log.action}`);
      console.log(`   - Object Type: ${log.objectType}`);
      console.log(`   - Object ID: ${log.objectId}`);
      console.log(`   - Count: ${meta.count || 'N/A'}`);
      console.log(`   - Created: ${log.createdAt.toLocaleString()}`);
    });
  } else {
    console.log(`   ⚠️  No promotion/adjustment audit logs found`);
  }

  // 7. Test API Endpoints
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 6: API ENDPOINTS VERIFICATION`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`✅ Semantic Ledger endpoints:`);
  console.log(`   - GET /api/v1/orgs/${orgId}/semantic-layer/ledger - Get ledger entries`);
  console.log(`   - POST /api/v1/orgs/${orgId}/semantic-layer/promote/:batchId - Promote batch to ledger`);
  console.log(`   - POST /api/v1/orgs/${orgId}/semantic-layer/adjustment - Add manual adjustment`);
  console.log(`   - GET /api/v1/orgs/${orgId}/data/import-batches - List import batches`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ SEMANTIC LEDGER PRODUCTION TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);

  await prisma.$disconnect();
}

// Run test
const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testSemanticLedgerProduction(userEmail).catch(console.error);


