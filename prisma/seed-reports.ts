import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/prisma/generated/prisma/client";

async function main() {
    console.log("🌱 Seeding fiscal report data...\n");

    // ── Get or create default company ──
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: "FACTORY TRADE",
                matriculeFiscal: "1234567X/A/M/000",
                adresse: "42 Rue de la Finance",
                ville: "Tunis",
                codePostal: "1001",
                telephone: "+216 71 123 456",
                email: "contact@factory-trade.com",
                tauxTVADefaut: 19,
                tauxFodecDefaut: 1,
                prefixeFacture: "FAC",
            },
        });
        console.log("  Created company:", company.name);
    } else {
        console.log("  Using existing company:", company.name);
    }

    // ── Get or create clients ──
    const clientData = [
        { code: "CLI001", raisonSociale: "STI", matriculeFiscal: "1111111X/A/M/000", ville: "Tunis", tauxRetenue: 1.5 },
        { code: "CLI002", raisonSociale: "DSS Fax", matriculeFiscal: "2222222X/A/M/000", ville: "Sfax", tauxRetenue: 0 },
        { code: "CLI003", raisonSociale: "Electro Industries", matriculeFiscal: "3333333X/A/M/000", ville: "Sousse", tauxRetenue: 1.5 },
        { code: "CLI004", raisonSociale: "MediCare Tunisie", matriculeFiscal: "4444444X/A/M/000", ville: "Tunis", tauxRetenue: 0 },
        { code: "CLI005", raisonSociale: "TechVision SARL", matriculeFiscal: "5555555X/A/M/000", ville: "Nabeul", tauxRetenue: 1.0 },
        { code: "CLI006", raisonSociale: "AgriPlus", matriculeFiscal: "6666666X/A/M/000", ville: "Bizerte", tauxRetenue: 0 },
        { code: "CLI007", raisonSociale: "Batico Matériaux", matriculeFiscal: "7777777X/A/M/000", ville: "Sfax", tauxRetenue: 1.5 },
    ];

    const clients: Array<{ id: string; raisonSociale: string; tauxRetenue: number }> = [];

    for (const cd of clientData) {
        let client = await prisma.tiers.findFirst({ where: { code: cd.code } });
        if (!client) {
            client = await prisma.tiers.create({
                data: {
                    code: cd.code,
                    raisonSociale: cd.raisonSociale,
                    matriculeFiscal: cd.matriculeFiscal,
                    adresse: `Adresse ${cd.raisonSociale}`,
                    ville: cd.ville,
                    codePostal: "1000",
                    telephone: "+216 00 000 000",
                    email: `${cd.code.toLowerCase()}@example.com`,
                    assujettTVA: true,
                    tauxRetenue: cd.tauxRetenue,
                    isClient: true,
                    isFournisseur: false,
                },
            });
            console.log(`  Created client: ${cd.raisonSociale}`);
        } else {
            console.log(`  Using existing client: ${cd.raisonSociale}`);
        }
        clients.push({ id: client.id, raisonSociale: client.raisonSociale, tauxRetenue: cd.tauxRetenue });
    }

    // ── Generate invoices across months ──
    // Monthly base CA by client (index matching clients array)
    const monthlyClientCA = [
        { idx: 0, basePerMonth: [85000, 92000, 78000, 105000, 120000, 95000, 110000, 130000, 98000, 115000, 140000, 125000] }, // STI
        { idx: 1, basePerMonth: [45000, 52000, 48000, 58000, 62000, 55000, 60000, 65000, 51000, 59000, 68000, 63000] }, // DSS Fax
        { idx: 2, basePerMonth: [38000, 41000, 35000, 42000, 48000, 39000, 44000, 50000, 37000, 43000, 51000, 46000] }, // Electro
        { idx: 3, basePerMonth: [28000, 31000, 25000, 32000, 35000, 29000, 33000, 38000, 27000, 34000, 39000, 36000] }, // MediCare
        { idx: 4, basePerMonth: [32000, 35000, 28000, 38000, 42000, 34000, 37000, 44000, 31000, 39000, 45000, 40000] }, // TechVision
        { idx: 5, basePerMonth: [15000, 18000, 12000, 20000, 22000, 16000, 19000, 24000, 14000, 21000, 25000, 23000] }, // AgriPlus
        { idx: 6, basePerMonth: [22000, 25000, 20000, 28000, 31000, 24000, 27000, 33000, 21000, 29000, 34000, 30000] }, // Batico
    ];

    const currentYear = new Date().getFullYear();
    const seedYear = currentYear; // Use current year

    let totalInvoices = 0;

    // Check if invoices already exist for this year
    const existingCount = await prisma.invoice.count({
        where: {
            companyId: company.id,
            dateEmission: {
                gte: new Date(seedYear, 0, 1),
                lte: new Date(seedYear, 11, 31),
            },
        },
    });

    if (existingCount > 20) {
        console.log(`\n  ⏭️  ${existingCount} invoices already exist for ${seedYear}, skipping invoice creation.`);
    } else {
        console.log(`\n  Creating invoices for ${seedYear}...`);

        for (let month = 0; month < 12; month++) {
            for (const mc of monthlyClientCA) {
                const client = clients[mc.idx];
                const totalHT = mc.basePerMonth[month];
                const baseHT = totalHT;
                const tva = Math.round(totalHT * 19) / 100; // 19% TVA
                const fodec = Math.round(totalHT * 1) / 100; // 1% FODEC
                const retenue = client.tauxRetenue > 0 ? Math.round(totalHT * client.tauxRetenue) / 100 : 0;
                const totalTTC = totalHT + tva + fodec - retenue;

                const invoiceCount = month % 2 === 0 ? 2 : 1; // 2 invoices on even months, 1 on odd
                const splitAmount = Math.round((totalHT / invoiceCount) * 100) / 100;
                const splitTVA = Math.round((tva / invoiceCount) * 100) / 100;
                const splitFodec = Math.round((fodec / invoiceCount) * 100) / 100;
                const splitRetenue = Math.round((retenue / invoiceCount) * 100) / 100;
                const splitTTC = Math.round((totalTTC / invoiceCount) * 100) / 100;

                for (let i = 0; i < invoiceCount; i++) {
                    const day = 5 + (i * 10) + (month % 20);
                    const emissionDate = new Date(seedYear, month, Math.min(day, 28));
                    const echeanceDate = new Date(seedYear, month + 1, Math.min(day, 28));
                    const status = month < new Date().getMonth()
                        ? (i === 0 ? "PAYEE" as InvoiceStatus : "PAYEE" as InvoiceStatus)
                        : month === new Date().getMonth()
                            ? (i === 0 ? "PAYEE" as InvoiceStatus : "ENVOYEE" as InvoiceStatus)
                            : "ENVOYEE" as InvoiceStatus;

                    const resteAPayer = status === "PAYEE" ? 0 : splitTTC;

                    await prisma.invoice.create({
                        data: {
                            numero: `SEED-FAC-${seedYear}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}-${client.raisonSociale.substring(0, 3).toUpperCase()}`,
                            tiersId: client.id,
                            companyId: company.id,
                            dateEmission: emissionDate,
                            dateEcheance: echeanceDate,
                            baseHT: splitAmount,
                            totalHT: splitAmount,
                            totalTVA: splitTVA,
                            totalFodec: splitFodec,
                            totalRetenue: splitRetenue,
                            totalTTC: splitTTC,
                            montantPaye: status === "PAYEE" ? splitTTC : 0,
                            resteAPayer: resteAPayer,
                            status,
                            devise: "TND",
                        },
                    });
                    totalInvoices++;
                }
            }
        }
        console.log(`  ✅ Created ${totalInvoices} invoices across 12 months`);
    }

    // Also add some invoices for previous year (for CA variation comparison)
    const prevYear = seedYear - 1;
    const prevCount = await prisma.invoice.count({
        where: {
            companyId: company.id,
            dateEmission: {
                gte: new Date(prevYear, 0, 1),
                lte: new Date(prevYear, 11, 31),
            },
        },
    });

    if (prevCount < 5) {
        console.log(`\n  Creating invoices for ${prevYear} (comparison)...`);
        const prevMonthlyCA = [120000, 110000, 130000, 115000, 140000, 125000, 135000, 145000, 120000, 130000, 150000, 140000];

        // Group by client proportionally (same weights as current year)
        for (let month = 0; month < 12; month++) {
            const totalMonthHT = prevMonthlyCA[month];
            for (const mc of monthlyClientCA) {
                const client = clients[mc.idx];
                const clientShare = mc.basePerMonth[mc.basePerMonth.length - 1]; // Use Dec as share reference
                const totalClientsShare = monthlyClientCA.reduce((s, m) => s + m.basePerMonth[m.basePerMonth.length - 1], 0);
                const proportion = clientShare / totalClientsShare;
                const clientHT = Math.round(totalMonthHT * proportion * 100) / 100;

                if (clientHT > 5000) {
                    const tva = Math.round(clientHT * 19) / 100;
                    const fodec = Math.round(clientHT * 1) / 100;
                    const retenue = client.tauxRetenue > 0 ? Math.round(clientHT * client.tauxRetenue) / 100 : 0;
                    const totalTTC = clientHT + tva + fodec - retenue;

                    await prisma.invoice.create({
                        data: {
                            numero: `SEED-FAC-${prevYear}-${String(month + 1).padStart(2, "0")}-${client.raisonSociale.substring(0, 3).toUpperCase()}`,
                            tiersId: client.id,
                            companyId: company.id,
                            dateEmission: new Date(prevYear, month, 15),
                            dateEcheance: new Date(prevYear, month + 1, 15),
                            baseHT: clientHT,
                            totalHT: clientHT,
                            totalTVA: tva,
                            totalFodec: fodec,
                            totalRetenue: retenue,
                            totalTTC: totalTTC,
                            montantPaye: totalTTC,
                            resteAPayer: 0,
                            status: "PAYEE" as InvoiceStatus,
                            devise: "TND",
                        },
                    });
                    totalInvoices++;
                }
            }
        }
        console.log(`  ✅ Created invoices for ${prevYear}`);
    } else {
        console.log(`  ⏭️  ${prevCount} invoices already exist for ${prevYear}`);
    }

    // ── Summary ──
    const totalAllInvoices = await prisma.invoice.count({ where: { companyId: company.id } });
    const caAll = await prisma.invoice.aggregate({
        where: { companyId: company.id, status: { notIn: ["BROUILLON", "ANNULEE"] } },
        _sum: { totalTTC: true },
    });
    const clientCount = await prisma.tiers.count({ where: { isClient: true } });

    console.log(`\n📊 Seed Summary:`);
    console.log(`   Company:       ${company.name}`);
    console.log(`   Clients:       ${clientCount}`);
    console.log(`   Invoices:      ${totalAllInvoices}`);
    console.log(`   Total CA:      ${Number(caAll._sum.totalTTC || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT`);
    console.log(`\n✅ Fiscal report seed complete!\n`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
