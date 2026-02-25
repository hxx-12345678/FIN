
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'cptjacksprw@gmail.com' },
        include: { roles: { include: { org: true } } }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User ID:', user.id);
    console.log('Roles:', JSON.stringify(user.roles.map(r => ({
        orgId: r.orgId,
        orgName: r.org.name,
        role: r.role
    })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
