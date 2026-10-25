import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { expireDueQuotes } from "@/lib/quote-expiry";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import type { InvoiceStatus } from "@/prisma/generated/prisma/client";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const CHART_EXCLUDED: InvoiceStatus[] = ["BROUILLON", "ANNULEE"];

export const GET = apiRoute.get(
    { permission: "dashboard:voir", requireCompany: true },
    async (_request, { companyId }) => {
        // Write-on-read : expire les devis échus AVANT les agrégats (devisCount, taux de conversion…)
        await expireDueQuotes(prisma, companyId);

        const invoiceWhere = { companyId };

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfYear = new Date(year, 0, 1);
        const startOfMonth = new Date(year, month, 1);
        const startOfQuarter = new Date(year, Math.floor(month / 3) * 3, 1);

        const [
            allInvoices,
            quarterCount,
            clientCount,
            newClientsCount,
            stockAlerts,
            recentInvoices,
            topClients,
            quoteStats,
            quoteStatsForeign,
            stockValue,
            recentMovements,
            ruptureCount,
        ] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    ...invoiceWhere,
                    dateEmission: { gte: startOfYear },
                    status: { notIn: CHART_EXCLUDED },
                },
                select: {
                    totalTTC: true,
                    montantPaye: true,
                    resteAPayer: true,
                    totalHT: true,
                    totalTVA: true,
                    totalFodec: true,
                    totalRetenue: true,
                    dateEmission: true,
                    status: true,
                },
            }),
            prisma.invoice.count({
                where: { ...invoiceWhere, dateEmission: { gte: startOfQuarter } },
            }),
            prisma.tiers.count({ where: { actif: true } }),
            prisma.tiers.count({
                where: { createdAt: { gte: startOfMonth } },
            }),
            prisma.product.count({
                where: { stockStatus: { in: ["CRITIQUE", "RUPTURE"] } },
            }),
            prisma.invoice.findMany({
                where: invoiceWhere,
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    tiers: { select: { raisonSociale: true, ville: true } },
                },
            }),
            prisma.invoice.groupBy({
                by: ["tiersId"],
                where: { ...invoiceWhere, status: { notIn: CHART_EXCLUDED } },
                _sum: { totalTTC: true },
                orderBy: { _sum: { totalTTC: "desc" } },
                take: 5,
            }),
            prisma.quote.aggregate({
                where: { ...invoiceWhere, devise: "TND" },
                _count: true,
                _sum: { totalTTC: true },
            }),
            prisma.quote.aggregate({
                where: { ...invoiceWhere, devise: { not: "TND" }, montantTND: { not: null } },
                _sum: { montantTND: true },
            }),
            prisma.product.findMany({
                where: {},
                select: { prixHT: true, stockActuel: true },
            }),
            prisma.stockMovement.findMany({
                where: {},
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    product: { select: { nom: true, code: true } },
                },
            }),
            prisma.product.count({
                where: { stockStatus: "RUPTURE" },
            }),
        ]);

        const ca = allInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.totalTTC.toString())),
            new Big(0)
        );

        const thisMonthEnd = new Date(year, month + 1, 0);
        const lastMonthStart = new Date(year, month - 1, 1);
        const lastMonthEnd = new Date(year, month, 0);

        const caThisMonth = allInvoices
            .filter((inv) => inv.dateEmission >= startOfMonth && inv.dateEmission <= thisMonthEnd)
            .reduce((acc, inv) => acc.plus(new Big(inv.totalTTC.toString())), new Big(0));

        const caLastMonth = allInvoices
            .filter((inv) => inv.dateEmission >= lastMonthStart && inv.dateEmission <= lastMonthEnd)
            .reduce((acc, inv) => acc.plus(new Big(inv.totalTTC.toString())), new Big(0));

        let variation = "0";
        if (caLastMonth.gt(0)) {
            variation = caThisMonth
                .minus(caLastMonth)
                .div(caLastMonth)
                .times(100)
                .toFixed(1);
        }

        const pendingInvoices = allInvoices.filter(
            (inv) => inv.status === "ENVOYEE" || inv.status === "PARTIELLE"
        );
        const overdueInvoices = allInvoices.filter(
            (inv) => inv.status === "EN_RETARD"
        );

        const creances = pendingInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.resteAPayer.toString())),
            new Big(0)
        );
        const retard = overdueInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.resteAPayer.toString())),
            new Big(0)
        );

        const tvaMois = caThisMonth.times(0.19).div(1.19);

        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const mStart = new Date(year, month - i, 1);
            const mEnd = new Date(year, month - i + 1, 0);

            const mInvoices = allInvoices.filter(
                (inv) => inv.dateEmission >= mStart && inv.dateEmission <= mEnd
            );

            const mCA = mInvoices.reduce(
                (acc, inv) => acc.plus(new Big(inv.totalHT.toString())),
                new Big(0)
            );
            const mTVA = mInvoices.reduce(
                (acc, inv) => acc.plus(new Big(inv.totalTVA.toString())),
                new Big(0)
            );
            const mFodec = mInvoices.reduce(
                (acc, inv) => acc.plus(new Big(inv.totalFodec.toString())),
                new Big(0)
            );
            const mRetenue = mInvoices.reduce(
                (acc, inv) => acc.plus(new Big(inv.totalRetenue.toString())),
                new Big(0)
            );

            monthlyData.push({
                mois: MONTH_NAMES[mStart.getMonth()],
                ca: parseFloat(mCA.toFixed(3)),
                tva: parseFloat(mTVA.toFixed(3)),
                fodec: parseFloat(mFodec.toFixed(3)),
                retenue: parseFloat(mRetenue.toFixed(3)),
            });
        }

        const topTiersIds = topClients.map((c) => c.tiersId);
        const topTiersData = await prisma.tiers.findMany({
            where: { id: { in: topTiersIds } },
            select: { id: true, raisonSociale: true },
        });

        const topClientsResult = topClients.map((tc) => {
            const tiers = topTiersData.find((c) => c.id === tc.tiersId);
            return {
                id: tc.tiersId,
                raisonSociale: tiers?.raisonSociale ?? "Inconnu",
                totalCA: tc._sum?.totalTTC?.toString() ?? "0",
            };
        });

        const devisCount = quoteStats._count;
        // Montant total en TND : devis TND (totalTTC) + devis étrangers (montantTND)
        const devisMontantTotalTND = new Big(quoteStats._sum.totalTTC?.toString() ?? "0")
            .plus(new Big(quoteStatsForeign._sum.montantTND?.toString() ?? "0"));
        const devisMontantTotal = devisMontantTotalTND.toString();
        const devisConverted = await prisma.quote.count({
            where: { ...invoiceWhere, status: "FACTUREE" },
        });
        const devisTauxConversion = devisCount > 0
            ? Math.round((devisConverted / devisCount) * 100)
            : 0;

        const totalStockValue = stockValue.reduce(
            (acc, p) => acc.plus(new Big(p.prixHT.toString()).times(new Big(p.stockActuel.toString()))),
            new Big(0)
        );

        return {
            stats: {
                chiffreAffaires: ca.toFixed(3),
                chiffreAffairesVariation: variation,
                creancesEnAttente: creances.toFixed(3),
                creancesFactures: pendingInvoices.length,
                montantEnRetard: retard.toFixed(3),
                retardFactures: overdueInvoices.length,
                tvaDuMois: tvaMois.toFixed(3),
                totalFactures: allInvoices.length,
                totalFacturesTrimestre: quarterCount,
                nouveauxClients: clientCount,
                nouveauxClientsMois: newClientsCount,
                alertesStock: stockAlerts,
                valeurStock: totalStockValue.toFixed(3),
                produitsRupture: ruptureCount,
                devisCount,
                devisMontantTotal,
                devisTauxConversion,
            },
            recentInvoices: serializeDecimals(recentInvoices),
            topClients: topClientsResult,
            monthlyData,
            recentMovements: serializeDecimals(recentMovements),
        };
    },
);
