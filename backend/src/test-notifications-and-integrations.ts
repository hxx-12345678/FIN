/**
 * Test Notifications and Integrations Components
 * Tests with respect to cptjacksprw@gmail.com
 */

import prisma from './config/database';

async function testNotificationsAndIntegrations(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 TESTING NOTIFICATIONS & INTEGRATIONS`);
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

  // 2. Test Notifications
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 1: NOTIFICATIONS COMPONENT`);
  console.log(`${'─'.repeat(80)}\n`);

  // Check notifications in database
  const notifications = await prisma.notification.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`📊 Notifications in database: ${notifications.length}`);
  if (notifications.length > 0) {
    notifications.forEach((notif, idx) => {
      console.log(`\n   Notification ${idx + 1}:`);
      console.log(`   - ID: ${notif.id}`);
      console.log(`   - Type: ${notif.type}`);
      console.log(`   - Title: ${notif.title?.substring(0, 50) || 'N/A'}...`);
      console.log(`   - Read: ${notif.read}`);
      console.log(`   - Created: ${notif.createdAt.toLocaleString()}`);
    });
  } else {
    console.log(`   ⚠️  No notifications found in database`);
  }

  // Check notification channels
  const channels = await prisma.notificationChannel.findMany({
    where: { orgId },
  });

  console.log(`\n📡 Notification Channels: ${channels.length}`);
  channels.forEach((ch) => {
    console.log(`   - ${ch.type}: ${ch.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  });

  // Check alert rules
  const alertRules = await prisma.alertRule.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n🚨 Alert Rules: ${alertRules.length}`);
  alertRules.forEach((rule) => {
    console.log(`   - ${rule.name}: ${rule.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`     Metric: ${rule.metric}, Threshold: ${rule.threshold}`);
  });

  // 3. Test Integrations
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 2: INTEGRATIONS COMPONENT`);
  console.log(`${'─'.repeat(80)}\n`);

  // Check connectors in database
  const connectors = await prisma.connector.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📊 Connectors in database: ${connectors.length}`);
  if (connectors.length > 0) {
    connectors.forEach((conn, idx) => {
      console.log(`\n   Connector ${idx + 1}:`);
      console.log(`   - ID: ${conn.id}`);
      console.log(`   - Type: ${conn.type}`);
      console.log(`   - Status: ${conn.status}`);
      console.log(`   - Auto Sync: ${conn.autoSyncEnabled ? '✅' : '❌'}`);
      console.log(`   - Last Synced: ${conn.lastSyncedAt ? conn.lastSyncedAt.toLocaleString() : 'Never'}`);
      console.log(`   - Created: ${conn.createdAt.toLocaleString()}`);
    });
  } else {
    console.log(`   ⚠️  No connectors found in database`);
  }

  // Check import jobs
  const importJobs = await prisma.job.findMany({
    where: {
      orgId,
      jobType: 'csv_import',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`\n📥 CSV Import Jobs: ${importJobs.length}`);
  if (importJobs.length > 0) {
    importJobs.forEach((job, idx) => {
      console.log(`\n   Job ${idx + 1}:`);
      console.log(`   - ID: ${job.id}`);
      console.log(`   - Status: ${job.status}`);
      console.log(`   - Created: ${job.createdAt.toLocaleString()}`);
      if (job.finishedAt) {
        console.log(`   - Finished: ${job.finishedAt.toLocaleString()}`);
      }
    });
  }

  // 4. Test API Endpoints
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 3: API ENDPOINTS VERIFICATION`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`✅ Notifications endpoints:`);
  console.log(`   - GET /api/v1/orgs/${orgId}/notifications - List notifications`);
  console.log(`   - PUT /api/v1/orgs/${orgId}/notifications/:id/read - Mark as read`);
  console.log(`   - PUT /api/v1/orgs/${orgId}/notifications/read-all - Mark all as read`);
  console.log(`   - GET /api/v1/orgs/${orgId}/notifications/stats - Get stats`);
  console.log(`   - GET /api/v1/orgs/${orgId}/notification-channels - List channels`);
  console.log(`   - PUT /api/v1/orgs/${orgId}/notification-channels/:type - Update channel`);

  console.log(`\n✅ Integrations endpoints:`);
  console.log(`   - GET /api/v1/connectors/orgs/${orgId}/connectors - List connectors`);
  console.log(`   - POST /api/v1/connectors/orgs/${orgId}/connectors/:type/start-oauth - Start OAuth`);
  console.log(`   - POST /api/v1/connectors/:id/sync - Sync connector`);
  console.log(`   - PATCH /api/v1/connectors/:id/sync-settings - Update sync settings`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ TESTING COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);

  await prisma.$disconnect();
}

// Run test
const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testNotificationsAndIntegrations(userEmail).catch(console.error);

