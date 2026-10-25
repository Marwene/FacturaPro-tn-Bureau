import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";

export const GET = apiRoute.get(
    { permission: "produits:voir" },
    async (_request, { params }) => {
        const { id } = params;
        const product = await prisma.product.findUnique({
            where: { id },
            select: { id: true, stockActuel: true, stockMinimum: true },
        });
        if (!product) return NextResponse.json(errorResponse("Produit introuvable"), { status: 404 });

        const invoiceLines = await prisma.invoiceLine.findMany({
            where: { productId: id },
            include: { invoice: { select: { dateEmission: true } } },
            orderBy: { invoice: { dateEmission: "asc" } },
        });

        const quoteLines = await prisma.quoteLine.findMany({
            where: { productId: id },
            include: { quote: { select: { dateCreation: true } } },
            orderBy: { quote: { dateCreation: "asc" } },
        });

        const achatLines = await prisma.achatLine.findMany({
            where: { productId: id },
            include: { achat: { select: { dateFacture: true } } },
            orderBy: { achat: { dateFacture: "asc" } },
        });

        const revenueParMois: Record<string, { ventes: number; revenu: number; achats: number; cout: number }> = {};
        const addToMonth = (date: Date, field: "ventes" | "revenu" | "achats" | "cout", val: number) => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (!revenueParMois[key]) revenueParMois[key] = { ventes: 0, revenu: 0, achats: 0, cout: 0 };
            revenueParMois[key][field] += val;
        };

        for (const line of invoiceLines) {
            if (line.invoice?.dateEmission) {
                const qte = Number(line.quantite);
                const total = Number(line.totalHT);
                addToMonth(line.invoice.dateEmission, "ventes", qte);
                addToMonth(line.invoice.dateEmission, "revenu", total);
            }
        }

        for (const line of achatLines) {
            const achat = line.achat;
            if (achat?.dateFacture) {
                const qte = Number(line.quantite);
                const total = Number(line.totalHT);
                addToMonth(new Date(achat.dateFacture), "achats", qte);
                addToMonth(new Date(achat.dateFacture), "cout", total);
            }
        }

        const ventesMensuelles = Object.entries(revenueParMois)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mois, data]) => ({ mois, ...data }));

        const totalVentes = invoiceLines.reduce((acc, l) => acc + Number(l.quantite), 0);
        const totalRevenu = invoiceLines.reduce((acc, l) => acc + Number(l.totalHT), 0);
        const totalAchats = achatLines.reduce((acc, l) => acc + Number(l.quantite), 0);
        const totalCout = achatLines.reduce((acc, l) => acc + Number(l.totalHT), 0);

        return NextResponse.json({
            stats: {
                totalVentes,
                totalRevenu: totalRevenu.toFixed(3),
                totalAchats,
                totalCout: totalCout.toFixed(3),
                stockActuel: product.stockActuel.toString(),
                stockMinimum: product.stockMinimum.toString(),
                marge: totalRevenu > 0 ? ((totalRevenu - totalCout) / totalRevenu * 100).toFixed(1) : "0",
            },
            ventesMensuelles,
        });
    }
);
