import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'cptjacksprw@gmail.com'
    const user = await prisma.user.findFirst({
        where: { email },
        include: {
            roles: {
                include: {
                    org: true
                }
            }
        }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log(`User ID: ${user.id}`)
    console.log(`Organizations: ${user.roles.length}`)

    for (const role of user.roles) {
        const orgId = role.orgId
        const orgName = role.org.name
        console.log(`\nOrg: ${orgName} (${orgId})`)

        const models = await prisma.model.findMany({
            where: { orgId }
        })
        console.log(`Models count: ${models.length}`)
        for (const m of models) {
            console.log(`- Model: ${m.name} (${m.id})`)
            const runs = await prisma.modelRun.findMany({
                where: { modelId: m.id },
                orderBy: { createdAt: 'desc' },
                take: 3
            })
            console.log(`  Runs: ${runs.length}`)
            for (const r of runs) {
                console.log(`    * Run ${r.id}: status=${r.status} type=${r.runType}`)
                if (r.status === 'failed' && r.paramsJson) {
                    console.log(`      Error: ${JSON.stringify((r.paramsJson as any).error || 'unknown')}`)
                }
            }
        }

        // Check connectors
        const connectors = await prisma.connector.findMany({ where: { orgId } })
        console.log(`Connectors: ${connectors.length}`)
        for (const c of connectors) {
            console.log(`  - ${c.type}: status=${c.status}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
