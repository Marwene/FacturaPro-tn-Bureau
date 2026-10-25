import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { MouvementType, ReferenceType } from "@/prisma/generated/prisma/client";

type MovementSeed = {
    productId: string;
    type: MouvementType;
    quantite: number;
    referenceType: ReferenceType;
    referenceId: string;
    achatId?: string | null;
    date: Date;
    createdAt?: Date;
};

async function main() {
    console.log("📦 Seeding stock movements from invoices and purchases...\n");

    const deleted = await prisma.stockMovement.deleteMany();
    console.log(`  Nettoyé: ${deleted.count} mouvements existants supprimés`);

    const invoices = await prisma.invoice.findMany({
        where: {
            status: { in: ["PAYEE", "ENVOYEE", "PARTIELLE", "EN_RETARD"] },
        },
        include: {
            lines: {
                where: { productId: { not: null } },
                select: { productId: true, quantite: true },
            },
        },
        orderBy: { dateEmission: "asc" },
    });

    const achats = await prisma.achat.findMany({
        where: { status: "VALIDEE" },
        include: {
            lines: {
                where: { productId: { not: null } },
                select: { productId: true, quantite: true },
            },
        },
        orderBy: { dateFacture: "asc" },
    });

    console.log(`  Factures (ventes) trouvées: ${invoices.length}`);
    console.log(`  Achats (VALIDEE) trouvés: ${achats.length}`);

    const movements: MovementSeed[] = [];

    for (const invoice of invoices) {
        for (const line of invoice.lines) {
            if (!line.productId) continue;
            movements.push({
                productId: line.productId,
                type: MouvementType.SORTIE,
                quantite: Number(line.quantite),
                referenceType: ReferenceType.VENTE,
                referenceId: invoice.id,
                date: invoice.dateEmission,
                createdAt: invoice.dateEmission,
            });
        }
    }

    for (const achat of achats) {
        for (const line of achat.lines) {
            if (!line.productId) continue;
            movements.push({
                productId: line.productId,
                type: MouvementType.ENTREE,
                quantite: Number(line.quantite),
                referenceType: ReferenceType.ACHAT,
                referenceId: achat.numero,
                achatId: achat.id,
                date: achat.dateFacture,
                createdAt: achat.dateFacture,
            });
        }
    }

    movements.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`  Mouvements à créer: ${movements.length}`);

    if (movements.length > 0) {
        for (let i = 0; i < movements.length; i += 50) {
            const chunk = movements.slice(i, i + 50);
            await prisma.stockMovement.createMany({ data: chunk });
        }
        console.log(`  ✅ ${movements.length} mouvements de stock créés`);
    } else {
        console.log("  ⚠️ Aucune ligne de facture ou d'achat avec produit trouvée");
    }

    const total = await prisma.stockMovement.count();
    console.log(`\n📊 Total mouvements en base: ${total}`);
    console.log("✅ Seed terminé!");
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
