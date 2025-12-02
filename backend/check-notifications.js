const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: 'cptjacksprw@gmail.com' },
      select: { id: true, email: true }
    });
    
    if (!user) {
      console.log('❌ User NOT FOUND');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Get user's organizations
    const orgRoles = await prisma.userOrgRole.findMany({
      where: { userId: user.id },
      include: { org: true }
    });
    
    console.log(`📊 Found ${orgRoles.length} organization(s)\n`);
    
    // Check notifications for each org
    for (const orgRole of orgRoles) {
      const orgId = orgRole.orgId;
      const orgName = orgRole.org.name || orgId;
      
      console.log(`\n🏢 Organization: ${orgName} (${orgId})`);
      console.log('─'.repeat(60));
      
      // Get all notifications for this org (user-specific and org-wide)
      const notifications = await prisma.notification.findMany({
        where: {
          orgId: orgId,
          OR: [
            { userId: null }, // Org-wide
            { userId: user.id } // User-specific
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      console.log(`   Total notifications: ${notifications.length}`);
      
      if (notifications.length > 0) {
        const unread = notifications.filter(n => !n.read).length;
        const read = notifications.filter(n => n.read).length;
        console.log(`   Unread: ${unread}`);
        console.log(`   Read: ${read}\n`);
        
        console.log('   Recent notifications:');
        notifications.slice(0, 10).forEach((n, idx) => {
          const date = new Date(n.createdAt).toLocaleString();
          const status = n.read ? '✓' : '○';
          const userSpecific = n.userId ? '(user-specific)' : '(org-wide)';
          console.log(`   ${idx + 1}. [${status}] ${n.title} - ${n.type} ${userSpecific}`);
          console.log(`      ${n.message.substring(0, 60)}...`);
          console.log(`      Created: ${date}`);
        });
        
        if (notifications.length > 10) {
          console.log(`   ... and ${notifications.length - 10} more`);
        }
      } else {
        console.log('   ✅ No notifications found (this is correct for a clean state)');
      }
    }
    
    // Check if there are any notifications that should be cleaned up
    const allUserNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: user.id },
          {
            orgId: { in: orgRoles.map(r => r.orgId) },
            userId: null
          }
        ]
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total notifications across all orgs: ${allUserNotifications.length}`);
    console.log(`   Unread: ${allUserNotifications.filter(n => !n.read).length}`);
    console.log(`   Read: ${allUserNotifications.filter(n => n.read).length}`);
    
    if (allUserNotifications.length === 0) {
      console.log('\n✅ Perfect! No notifications in database for this user.');
      console.log('   This is the expected state - notifications should only appear when events occur.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();


