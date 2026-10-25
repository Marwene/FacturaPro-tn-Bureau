import { prisma } from "../lib/prisma"

async function main() {
    console.log("🔧 Fixing corrupted tauxChange values...\n")

    // Fix invoices
    const corruptedInvoices = await prisma.invoice.findMany({
        where: { tauxChange: { gt: 10 } },
        select: { id: true, numero: true, tauxChange: true },
    })

    console.log(`  Factures corrompues: ${corruptedInvoices.length}`)
    for (const inv of corruptedInvoices) {
        const fixed = Number(inv.tauxChange) / 10000
        await prisma.invoice.update({
            where: { id: inv.id },
            data: { tauxChange: fixed },
        })
        console.log(`    ✅ ${inv.numero}: ${inv.tauxChange} → ${fixed}`)
    }

    // Fix BLs
    const corruptedBLs = await prisma.bonLivraison.findMany({
        where: { tauxChange: { gt: 10 } },
        select: { id: true, numero: true, tauxChange: true },
    })

    console.log(`\n  BL corrompus: ${corruptedBLs.length}`)
    for (const bl of corruptedBLs) {
        const fixed = Number(bl.tauxChange) / 10000
        await prisma.bonLivraison.update({
            where: { id: bl.id },
            data: { tauxChange: fixed },
        })
        console.log(`    ✅ ${bl.numero}: ${bl.tauxChange} → ${fixed}`)
    }

    console.log(`\n✅ Migration terminée!`)
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
