import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import type { TiersSoldeEntry } from "@/lib/types";

export const GET = apiRoute.get(
    { permission: "clients:voir" },
    async (request, { params }) => {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to);

        const [invoices, payments, avoirs, mouvements] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    tiersId: id,
                    status: { notIn: ["BROUILLON", "ANNULEE"] },
                    ...(from || to ? { dateEmission: dateFilter } : {}),
                },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, notes: true, status: true },
                orderBy: { dateEmission: "asc" },
            }),
            prisma.payment.findMany({
                where: {
                    tiersId: id,
                    ...(from || to ? { dateReglement: dateFilter } : {}),
                },
                select: { id: true, dateReglement: true, montant: true, methode: true, reference: true, notes: true },
                orderBy: { dateReglement: "asc" },
            }),
            prisma.avoir.findMany({
                where: {
                    tiersId: id,
                    status: { notIn: ["BROUILLON", "ANNULE"] },
                    ...(from || to ? { dateEmission: dateFilter } : {}),
                },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, motif: true, status: true },
                orderBy: { dateEmission: "asc" },
            }),
            prisma.mouvementFinancier.findMany({
                where: {
                    tiersId: id,
                    ...(from || to ? { dateMouvement: dateFilter } : {}),
                },
                select: { id: true, dateMouvement: true, montant: true, type: true, notes: true },
                orderBy: { dateMouvement: "asc" },
            }),
        ]);

        const entries: TiersSoldeEntry[] = [];
        let runningSolde = new Big(0);

        // Helper to add an entry
        function addEntry(date: Date, piece: string, mouvement: string, commentaire: string, debit: string, credit: string) {
            runningSolde = runningSolde.plus(new Big(debit)).minus(new Big(credit));
            entries.push({
                id: `${mouvement}-${piece}-${entries.length}`,
                date,
                piece,
                mouvement,
                commentaire,
                debit,
                credit,
                solde: runningSolde.toFixed(3),
            });
        }

        // Invoices → Debit
        for (const inv of invoices) {
            addEntry(inv.dateEmission, inv.numero, "Facture", inv.notes ?? "", inv.totalTTC.toFixed(3), "0");
        }

        // Payments → Credit
        for (const p of payments) {
            const label = p.reference ? `${p.methode} ${p.reference}` : p.methode;
            addEntry(p.dateReglement, p.reference ?? `PAI-${p.id.slice(0, 8)}`, "Paiement", `${label}${p.notes ? " — " + p.notes : ""}`, "0", p.montant.toFixed(3));
        }

        // Avoirs → Credit
        for (const a of avoirs) {
            addEntry(a.dateEmission, a.numero, "Avoir", a.motif ?? "", "0", a.totalTTC.toFixed(3));
        }

        // Mouvements financiers
        for (const m of mouvements) {
            const label = m.type === "CREDIT" ? "Crédit" : "Débit";
            addEntry(m.dateMouvement, `MVT-${m.id.slice(0, 8)}`, label, m.notes ?? "", m.type === "DEBIT" ? m.montant.toFixed(3) : "0", m.type === "CREDIT" ? m.montant.toFixed(3) : "0");
        }

        // Sort by date
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Recalculate running solde after sort
        runningSolde = new Big(0);
        let totalDebit = new Big(0);
        let totalCredit = new Big(0);
        for (const e of entries) {
            runningSolde = runningSolde.plus(new Big(e.debit)).minus(new Big(e.credit));
            e.solde = runningSolde.toFixed(3);
            totalDebit = totalDebit.plus(e.debit);
            totalCredit = totalCredit.plus(e.credit);
        }

        return NextResponse.json({
            entries,
            totalDebit: totalDebit.toFixed(3),
            totalCredit: totalCredit.toFixed(3),
            soldeFinal: runningSolde.toFixed(3),
        });
    }
);
