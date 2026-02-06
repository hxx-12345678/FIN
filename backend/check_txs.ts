import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const orgId = '9f4eaa3d-c2a4-4fa4-978d-f463b613d93a'
    const txCount = await prisma.rawTransaction.count({ where: { orgId } })
    console.log(`Transactions Count: ${txCount}`)

    if (txCount > 0) {
        const categories = await prisma.rawTransaction.groupBy({
            by: ['category'],
            where: { orgId },
            _count: true
        })
        console.log('Categories:', categories)
    }
}

main().finally(() => prisma.$disconnect())
