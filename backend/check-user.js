const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'cptjacksprw@gmail.com' },
      select: { id: true, email: true, isActive: true, createdAt: true }
    });
    
    if (!user) {
      console.log('❌ User NOT FOUND');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   ID: ${user.id}`);
    
    if (!user.isActive) {
      console.log('\n⚠️  User is inactive. Activating...');
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true }
      });
      console.log('✅ User activated!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();

