import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'cptjacksprw@gmail.com';
    console.log(`Finding admin user: ${adminEmail}`);

    const admin = await prisma.user.findFirst({
        where: { email: adminEmail },
        include: {
            roles: true
        }
    });

    if (!admin || !admin.roles.length) {
        console.error('Admin user or org not found.');
        return;
    }

    const orgId = admin.roles[0].orgId;
    console.log(`Found orgId: ${orgId}`);

    // Create some test access requests
    console.log('Creating test access requests...');
    await prisma.accessRequest.createMany({
        data: [
            {
                orgId,
                email: 'john.viewer.req@gmail.com',
                domain: 'gmail.com',
                message: 'Hello, I need viewer access for testing.',
                status: 'pending'
            },
            {
                orgId,
                email: 'alice.finance.req@gmail.com',
                domain: 'gmail.com',
                message: 'Finance team access required.',
                status: 'pending'
            }
        ],
        skipDuplicates: true
    });

    console.log('Test access requests created successfully!');

    // Create a team member for the org that is an admin, finance and viewer
    // Let's create dummy users if they don't exist
    const createTestUser = async (email: string, role: string, name: string) => {
        let user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash: '$2a$10$Mktx7isENIQl/FjvfzxnvuR5dpdNw0KLGHRCWN8zVFhpodLs5YPMe', // Player@123
                    isActive: true
                }
            });
        }

        const existingRole = await prisma.userOrgRole.findFirst({
            where: { userId: user.id, orgId }
        });

        if (!existingRole) {
            await prisma.userOrgRole.create({
                data: {
                    userId: user.id,
                    orgId,
                    role
                }
            });
            console.log(`Created ${role} role for ${email}`);
        } else {
            await prisma.userOrgRole.update({
                where: { id: existingRole.id },
                data: { role }
            });
            console.log(`Updated ${role} role for ${email}`);
        }
    };

    await createTestUser('viewer@gmail.com', 'viewer', 'Test Viewer');
    await createTestUser('finance@gmail.com', 'finance', 'Test Finance');
    await createTestUser('admin2@gmail.com', 'admin', 'Secondary Admin');

    console.log('Test data initialized successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
