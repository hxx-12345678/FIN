const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'cptjacksprw@gmail.com' },
        include: { orgs: { include: { org: true } } }
    });

    if (!user) {
        console.log('USER_NOT_FOUND');
    } else if (!user.orgs.length) {
        console.log(`USER_FOUND_NO_ORG (ID=${user.id})`);
    } else {
        console.log(`CREDS ${user.id} ${user.orgs[0].orgId}`);
    }
    process.exit(0);
}
main();
