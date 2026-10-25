import "dotenv/config"
import { prisma } from "@/lib/prisma"
import type { EffetStatus } from "@/prisma/generated/prisma/client"
import { nextNumber } from "@/lib/sequence"

async function main() {
    console.log("🌱 Seed Effets de Commerce — exhaustif\n")

    const company = await prisma.company.findFirst({ where: { actif: true } })
    if (!company) { console.error("❌ Aucune compagnie active"); process.exit(1) }
    console.log(`🏢 ${company.name}`)

    const companyBank = await prisma.companyBankAccount.findFirst({ where: { companyId: company.id, actif: true } })
    const companyBankName = companyBank?.nomBanque ?? company.banque ?? "Amen Bank"

    const clients = await prisma.tiers.findMany({ where: { isClient: true }, take: 5, orderBy: { createdAt: "asc" } })
    const fournisseurs = await prisma.tiers.findMany({ where: { isFournisseur: true }, take: 3, orderBy: { createdAt: "asc" } })
    const users = await prisma.user.findMany({ where: { companyId: company.id } })

    if (clients.length === 0) { console.error("❌ Aucun client"); process.exit(1) }

    // Fetch some invoices and achats for linking
    const invoices = await prisma.invoice.findMany({
        where: { companyId: company.id, status: { notIn: ["PAYEE", "ANNULEE"] } },
        take: 3, orderBy: { createdAt: "desc" },
    })
    const achats = await prisma.achat.findMany({
        where: { companyId: company.id, status: "VALIDEE" },
        take: 3, orderBy: { createdAt: "desc" },
    })

    // Cleanup
    await prisma.notification.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } })
    await prisma.effetAchat.deleteMany()
    await prisma.effet.deleteMany()
    await prisma.sequence.deleteMany({ where: { name: "effet" } })
    console.log("🧹 Nettoyé\n")

    const now = new Date()
    const created: { id: string; numero: string; label: string }[] = []

    // ─── 1. RECU — Full lifecycle (5 effects) ───────────────────────
    for (let i = 0; i < clients.length && i < 5; i++) {
        const client = clients[i]
        const montant = [2500.000, 5800.500, 12000.000, 3400.750, 8750.300][i]
        const echeanceDays = [30, 60, 90, 45, 120][i]
        const creationDays = -[60, 90, 120, 50, 150][i]
        const statuses: ("EN_PORTEFEUILLE" | "REMIS_ESCOMPTE" | "ENDOSSE" | "PAYE" | "IMPAYE")[] = [
            "EN_PORTEFEUILLE", "REMIS_ESCOMPTE", "ENDOSSE", "PAYE", "IMPAYE",
        ]
        const status = statuses[i]

        const dc = new Date(now); dc.setDate(dc.getDate() + creationDays)
        const de = new Date(dc); de.setDate(de.getDate() + echeanceDays)

        if (invoices[i]) {
            // Will store in achatsLies array but use invoiceId as reference
        }

        const effet = await prisma.effet.create({
            data: {
                numero: await nextNumber("effet", "EFF", company.id),
                type: "RECU",
                montant: montant.toString(),
                tire: client.raisonSociale,
                tireAdresse: client.adresse,
                tireBanque: client.banque ?? "BIAT",
                beneficiaire: company.name,
                tireurId: client.id,
                invoiceId: invoices[i]?.id ?? null,
                dateCreation: dc,
                dateEcheance: de,
                companyId: company.id,
                status,
                tauxEscompte: status === "REMIS_ESCOMPTE" || status === "ENDOSSE" ? "8.5" : null,
                frais: status === "REMIS_ESCOMPTE" || status === "ENDOSSE" ? "25.000" : null,
                netEncaisse: status === "REMIS_ESCOMPTE" || status === "ENDOSSE" ? (montant - 25 - montant * 0.085).toFixed(3) : null,
                dateRemise: status === "REMIS_ESCOMPTE" || status === "ENDOSSE" ? new Date(dc.getTime() + 2 * 86400000) : null,
                endosseA: status === "ENDOSSE" ? "Fournisseur Informatique SA" : null,
                endosseLe: status === "ENDOSSE" ? new Date(dc.getTime() + 4 * 86400000) : null,
                motifImpaye: status === "IMPAYE" ? "Provision insuffisante" : null,
                dateImpaye: status === "IMPAYE" ? new Date(de.getTime() + 5 * 86400000) : null,
                fraisProtet: status === "IMPAYE" ? "45.000" : null,
                rappel15jEnvoye: creationDays < -30,
                rappel10jEnvoye: creationDays < -40,
                rappel5jEnvoye: creationDays < -50,
                rappelJourEnvoye: creationDays < -50,
            },
        })
        created.push({ id: effet.id, numero: effet.numero, label: `${client.raisonSociale} — ${montant} TND — ${status}` })
    }

    // ─── 2. EMIS — 3 effects with linked achats ─────────────────────
    for (let i = 0; i < fournisseurs.length; i++) {
        const f = fournisseurs[i]
        const montant = [15000.000, 8200.500, 24500.000][i]
        const echeanceDays = [60, 90, 120][i]
        const creationDays = -[90, 120, 150][i]
        const statuses: EffetStatus[] = ["EN_PORTEFEUILLE", "REMIS_ESCOMPTE", "EN_PORTEFEUILLE"]
        const status = statuses[i]

        const dc = new Date(now); dc.setDate(dc.getDate() + creationDays)
        const de = new Date(dc); de.setDate(de.getDate() + echeanceDays)

        const effet = await prisma.effet.create({
            data: {
                numero: await nextNumber("effet", "EFF", company.id),
                type: "EMIS",
                montant: montant.toString(),
                tire: company.name,
                tireAdresse: company.adresse,
                tireBanque: companyBankName,
                beneficiaire: f.raisonSociale,
                tireurId: f.id,
                fournisseurId: f.id,
                companyBankAccountId: companyBank?.id ?? null,
                dateCreation: dc,
                dateEcheance: de,
                companyId: company.id,
                status,
                tauxEscompte: status === "REMIS_ESCOMPTE" ? "7.2" : null,
                frais: status === "REMIS_ESCOMPTE" ? "30.000" : null,
                netEncaisse: status === "REMIS_ESCOMPTE" ? (montant - 30 - montant * 0.072).toFixed(3) : null,
                dateRemise: status === "REMIS_ESCOMPTE" ? new Date(dc.getTime() + 1 * 86400000) : null,
                notes: `Paiement ${f.raisonSociale}`,
                achatsLies: achats[i] ? {
                    create: { achatId: achats[i].id, montantAlloue: montant.toString() },
                } : undefined,
            },
        })
        created.push({ id: effet.id, numero: effet.numero, label: `${f.raisonSociale} — ${montant} TND — ${status || "EN_PORTEFEUILLE"}` })
    }

    // ─── 3. SPLIT scenario: 1 fournisseur → 3 effects ─────────────
    if (fournisseurs.length > 0) {
        const f = fournisseurs[0]
        const splitGroup = "split-" + crypto.randomUUID().slice(0, 8)
        const splits = [10000.000, 12000.000, 13000.000]
        const dc = new Date(now); dc.setDate(dc.getDate() - 45)

        for (let i = 0; i < splits.length; i++) {
            const de = new Date(dc); de.setDate(de.getDate() + 60 + i * 30)
            const e = await prisma.effet.create({
                data: {
                    numero: await nextNumber("effet", "EFF", company.id),
                    type: "EMIS",
                    montant: splits[i].toString(),
                    tire: company.name,
                    tireAdresse: company.adresse,
                    tireBanque: companyBankName,
                    beneficiaire: f.raisonSociale,
                    tireurId: f.id,
                    fournisseurId: f.id,
                    companyBankAccountId: companyBank?.id ?? null,
                    dateCreation: dc,
                    dateEcheance: de,
                    companyId: company.id,
                    status: "EN_PORTEFEUILLE",
                    splitGroup,
                    splitIndex: i + 1,
                    splitTotal: splits.length,
                },
            })
            created.push({ id: e.id, numero: e.numero, label: `SPLIT ${f.raisonSociale} — ${splits[i]} TND (${i + 1}/${splits.length})` })
        }
    }

    // ─── 4. ANNULE ─────────────────────────────────────────────────
    if (clients.length > 0) {
        const dc = new Date(now); dc.setDate(dc.getDate() - 30)
        const de = new Date(dc); de.setDate(de.getDate() + 15)
        const e = await prisma.effet.create({
            data: {
                numero: await nextNumber("effet", "EFF", company.id),
                type: "RECU",
                montant: "6000.000",
                tire: clients[0].raisonSociale,
                beneficiaire: company.name,
                tireurId: clients[0].id,
                dateCreation: dc,
                dateEcheance: de,
                companyId: company.id,
                status: "ANNULE",
                notes: "Annulé suite accord commercial",
            },
        })
        created.push({ id: e.id, numero: e.numero, label: `ANNULE — ${clients[0].raisonSociale} — 6000 TND` })
    }

    // ─── 5. Notifications de seed ──────────────────────────────────
    if (users.length > 0) {
        const notifEffets = await prisma.effet.findMany({
            where: { companyId: company.id, status: { notIn: ["PAYE", "ANNULE"] } },
            take: 3,
        })
        for (const eff of notifEffets) {
            await prisma.notification.createMany({
                data: users.map((u) => ({
                    userId: u.id,
                    type: "ALERTE_ECHEANCE",
                    title: `Échéance ${eff.numero}`,
                    message: `L'effet ${eff.numero} arrive bientôt à échéance.`,
                    effetId: eff.id,
                })),
            })
        }
    }

    // ─── Stats ─────────────────────────────────────────────────────
    const total = await prisma.effet.count({ where: { companyId: company.id } })
    const byStatus = await prisma.effet.groupBy({ by: ["status"], _count: true, where: { companyId: company.id } })
    const totalMontant = await prisma.effet.aggregate({ _sum: { montant: true }, where: { companyId: company.id } })
    const notifs = await prisma.notification.count()

    console.log("📊 Résumé final:")
    console.log(`   Total effets: ${total}`)
    console.log(`   Montant total: ${Number(totalMontant._sum.montant).toFixed(3)} TND`)
    for (const s of byStatus) console.log(`   ${s.status}: ${s._count}`)
    console.log(`   Notifications créées: ${notifs}`)
    console.log(`\n📋 Détail:`)
    for (const c of created) console.log(`   ${c.numero} — ${c.label}`)
    console.log(`\n✅ Seed terminé`)
}

main().catch((e) => { console.error("❌", e); process.exit(1) }).finally(() => prisma.$disconnect())
