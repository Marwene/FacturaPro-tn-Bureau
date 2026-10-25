import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";

export const GET = apiRoute.get(
    { permission: "produits:voir" },
    async (request) => {
        const { searchParams } = new URL(request.url);
        const periode = searchParams.get("periode") ?? "30";

        const depuis = new Date();
        const jours = parseInt(periode);
        if (!isNaN(jours)) depuis.setDate(depuis.getDate() - jours);

        const [products, movements] = await Promise.all([
            prisma.product.findMany({
                orderBy: { stockActuel: "asc" },
                include: {
                    categorie: { select: { nom: true } },
                    variants: { select: { id: true, nom: true, stockActuel: true, stockMinimum: true, actif: true, ordre: true } },
                },
            }),
            prisma.stockMovement.findMany({
                where: { createdAt: { gte: depuis } },
                orderBy: { createdAt: "desc" },
                include: {
                    product: { select: { nom: true, code: true } },
                },
            }),
        ]);

        let valeurStock = new Big(0);
        let coutTotal = new Big(0);
        const alertes: typeof products = [];
        const ruptures: typeof products = [];
        let entreeQte = new Big(0);
        let sortieQte = new Big(0);

        for (const p of products) {
            const prix = new Big(p.prixHT.toString());
            const stock = new Big(p.stockActuel.toString());
            valeurStock = valeurStock.plus(prix.times(stock));
            coutTotal = coutTotal.plus(prix.times(stock));
            if (p.stockStatus === "CRITIQUE") alertes.push(p);
            if (p.stockStatus === "RUPTURE") ruptures.push(p);
        }

        for (const m of movements) {
            const qte = new Big(m.quantite.toString());
            if (m.type === "ENTREE") entreeQte = entreeQte.plus(qte);
            else sortieQte = sortieQte.plus(qte);
        }

        return NextResponse.json({
            stats: {
                totalProduits: products.length,
                valeurStock: valeurStock.toFixed(3),
                coutTotal: coutTotal.toFixed(3),
                alertesCount: alertes.length,
                rupturesCount: ruptures.length,
                mouvementsEntree: entreeQte.toNumber(),
                mouvementsSortie: sortieQte.toNumber(),
                periode: jours,
            },
            alertes: serializeDecimals(alertes.slice(0, 20)),
            ruptures: serializeDecimals(ruptures.slice(0, 20)),
            mouvements: serializeDecimals(movements.slice(0, 50)),
        });
    }
);
