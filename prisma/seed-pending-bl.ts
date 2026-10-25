import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { BonLivraisonStatus } from "@/prisma/generated/prisma/client";

/**
 * Seed pour creer des Bons de Livraison livres mais pas encore factures
 * Permet de tester la feature de facturation fin de mois
 */
async function main() {
    console.log("Seeding Bons de Livraison lives non factures...");

    const company = await prisma.company.findFirst();
    if (!company) { console.error("Aucune company"); return; }
    const clients = await prisma.tiers.findMany({ where: { isClient: true } });
    if (clients.length === 0) { console.error("Aucun client"); return; }
    const products = await prisma.product.findMany({ take: 10 });
    if (products.length === 0) { console.error("Aucun produit"); return; }

    console.log(`Company: ${company.name}, Clients: ${clients.length}, Produits: ${products.length}`);

    const createBL = async (opts: {
        numero: string; tiersId: string; dateCreation: Date; dateLivraison: Date;
        lines: Array<{ productId: string; description: string; quantite: number; prixHT: number; tauxTVA: number; fodec: boolean }>;
    }) => {
        const linesWithTotals = opts.lines.map((l, i) => {
            const totalHT = Math.round(l.quantite * l.prixHT * 100) / 100;
            return { ...l, totalHT, tauxFodec: l.fodec ? 1 : 0, remise: 0, ordre: i + 1 };
        });
        const baseHT = Math.round(linesWithTotals.reduce((s, l) => s + l.totalHT, 0) * 100) / 100;
        const totalTVA = Math.round(linesWithTotals.reduce((s, l) => s + l.totalHT * (l.tauxTVA / 100), 0) * 100) / 100;
        const totalTTC = Math.round((baseHT + totalTVA) * 100) / 100;

        const bl = await prisma.bonLivraison.create({
            data: {
                numero: opts.numero, tiersId: opts.tiersId, companyId: company.id,
                dateCreation: opts.dateCreation, dateLivraison: opts.dateLivraison,
                baseHT, totalHT: baseHT, totalTVA, totalFodec: 0, totalTTC,
                status: BonLivraisonStatus.LIVRE, devise: "TND",
                lines: { create: linesWithTotals },
            },
            include: { lines: true },
        });
        console.log(`  BL ${bl.numero} -- ${bl.lines.length} lignes, TTC ${totalTTC} TND`);
        return bl;
    };

    const [c1, c2, c3] = clients;
    const [p1, p2, p3, p4, p5, p6] = products;

    // Client 1: 3 BLs en septembre 2026 (regroupement en 1 facture)
    await createBL({
        numero: "BL-TEST-001", tiersId: c1.id,
        dateCreation: new Date("2026-09-01"), dateLivraison: new Date("2026-09-05"),
        lines: [
            { productId: p1.id, description: p1.nom, quantite: 10, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
            ...(p2 ? [{ productId: p2.id, description: p2.nom, quantite: 5, prixHT: Number(p2.prixHT), tauxTVA: Number(p2.tauxTVA), fodec: p2.fodec }] : []),
        ],
    });

    await createBL({
        numero: "BL-TEST-002", tiersId: c1.id,
        dateCreation: new Date("2026-09-10"), dateLivraison: new Date("2026-09-12"),
        lines: [
            { productId: p1.id, description: p1.nom, quantite: 200, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
        ],
    });

    await createBL({
        numero: "BL-TEST-003", tiersId: c1.id,
        dateCreation: new Date("2026-09-20"), dateLivraison: new Date("2026-09-25"),
        lines: [
            { productId: p1.id, description: p1.nom, quantite: 50, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
            ...(p2 ? [{ productId: p2.id, description: p2.nom, quantite: 30, prixHT: Number(p2.prixHT), tauxTVA: Number(p2.tauxTVA), fodec: p2.fodec }] : []),
        ],
    });

    // Client 2: 2 BLs
    await createBL({
        numero: "BL-TEST-004", tiersId: c2.id,
        dateCreation: new Date("2026-09-08"), dateLivraison: new Date("2026-09-15"),
        lines: [
            { productId: p1.id, description: p1.nom, quantite: 3, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
        ],
    });

    await createBL({
        numero: "BL-TEST-005", tiersId: c2.id,
        dateCreation: new Date("2026-09-22"), dateLivraison: new Date("2026-09-28"),
        lines: [
            { productId: p1.id, description: p1.nom, quantite: 8, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
        ],
    });

    // Client 3: 1 BL (si 3 clients disponibles)
    if (c3) {
        await createBL({
            numero: "BL-TEST-006", tiersId: c3.id,
            dateCreation: new Date("2026-09-18"), dateLivraison: new Date("2026-09-22"),
            lines: [
                { productId: p1.id, description: p1.nom, quantite: 15, prixHT: Number(p1.prixHT), tauxTVA: Number(p1.tauxTVA), fodec: p1.fodec },
                ...(p2 ? [{ productId: p2.id, description: p2.nom, quantite: 20, prixHT: Number(p2.prixHT), tauxTVA: Number(p2.tauxTVA), fodec: p2.fodec }] : []),
            ],
        });
    }

    console.log("\nBLs lives non factures crees avec succes!");
    console.log("Verifiable via: GET /api/bons-livraison?status=LIVRE");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
