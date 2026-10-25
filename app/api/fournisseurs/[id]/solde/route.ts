import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import Big from "big.js";

interface FournisseurSoldeEntry {
    id: string;
    date: Date;
    piece: string;
    mouvement: string;
    commentaire: string;
    debit: string;
    credit: string;
    solde: string;
}

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to);

        const [achats, mouvements, avoirs] = await Promise.all([
            prisma.achat.findMany({
                where: {
                    tiersId: id,
                    companyId,
                    status: { notIn: ["BROUILLON", "ANNULEE"] },
                    ...(from || to ? { dateFacture: dateFilter } : {}),
                },
                select: { id: true, numero: true, dateFacture: true, totalTTC: true, notes: true, status: true },
                orderBy: { dateFacture: "asc" },
            }),
            prisma.mouvementFinancier.findMany({
                where: {
                    tiersId: id,
                    companyId,
                    ...(from || to ? { dateMouvement: dateFilter } : {}),
                },
                select: { id: true, dateMouvement: true, montant: true, type: true, notes: true },
                orderBy: { dateMouvement: "asc" },
            }),
            prisma.avoir.findMany({
                where: {
                    tiersId: id,
                    companyId,
                    status: { notIn: ["BROUILLON", "ANNULE"] },
                    ...(from || to ? { dateEmission: dateFilter } : {}),
                },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, motif: true, status: true },
                orderBy: { dateEmission: "asc" },
            }),
        ]);

        const entries: FournisseurSoldeEntry[] = [];
        let runningSolde = new Big(0);

        function addEntry(date: Date, piece: string, mouvement: string, commentaire: string, debit: string, credit: string) {
            runningSolde = runningSolde.plus(new Big(debit)).minus(new Big(credit));
            entries.push({
                id: `${mouvement}-${piece}-${entries.length}`,
                date, piece, mouvement, commentaire, debit, credit,
                solde: runningSolde.toFixed(3),
            });
        }

        for (const a of achats) {
            addEntry(a.dateFacture, a.numero, "Facture achat", a.notes ?? "", a.totalTTC.toFixed(3), "0");
        }

        for (const m of mouvements) {
            const label = m.type === "CREDIT" ? "Crédit" : "Paiement fournisseur";
            addEntry(m.dateMouvement, `MVT-${m.id.slice(0, 8)}`, label, m.notes ?? "", m.type === "DEBIT" ? "0" : m.montant.toFixed(3), m.type === "DEBIT" ? m.montant.toFixed(3) : "0");
        }

        for (const a of avoirs) {
            addEntry(a.dateEmission, a.numero, "Avoir", a.motif ?? "", "0", a.totalTTC.toFixed(3));
        }

        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        runningSolde = new Big(0);
        let totalDebit = new Big(0);
        let totalCredit = new Big(0);
        for (const e of entries) {
            runningSolde = runningSolde.plus(new Big(e.debit)).minus(new Big(e.credit));
            e.solde = runningSolde.toFixed(3);
            totalDebit = totalDebit.plus(e.debit);
            totalCredit = totalCredit.plus(e.credit);
        }

        return {
            entries,
            totalDebit: totalDebit.toFixed(3),
            totalCredit: totalCredit.toFixed(3),
            soldeFinal: runningSolde.toFixed(3),
        };
    }
);
