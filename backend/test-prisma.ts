import prisma from './src/config/database';

async function main() {
    console.log('Testing Prisma client properties...');

    if ('computationTrace' in prisma) {
        console.log('✅ computationTrace exists in prisma client');
    } else {
        console.log('❌ computationTrace MISSING');
    }

    if ('metricCube' in prisma) {
        console.log('✅ metricCube exists in prisma client');
    } else {
        console.log('❌ metricCube MISSING');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
