const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({ include: { orgs: true } });
        console.log('USERS_COUNT=' + users.length);
        users.forEach(u => {
            console.log(`USER: ${u.email} ORGS: ${u.orgs.length}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
