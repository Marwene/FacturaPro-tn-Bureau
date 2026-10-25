import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import Big from "big.js";

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export const GET = apiRoute.get(
    { permission: "rapports:voir", requireCompany: true },
    async (request, { companyId }) => {
        const invoiceWhere = { companyId };

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") ?? new Date().getFullYear().toString());

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);
        const startOfLastYear = new Date(year - 1, 0, 1);
        const endOfLastYear = new Date(year - 1, 11, 31, 23, 59, 59);

        const [yearInvoices, lastYearInvoices] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    ...invoiceWhere,
                    dateEmission: { gte: startOfYear, lte: endOfYear },
                    status: { notIn: ["BROUILLON", "ANNULEE"] },
                },
                select: {
                    totalHT: true,
                    totalTVA: true,
                    totalFodec: true,
                    totalRetenue: true,
                    totalTTC: true,
                    tiersId: true,
                    dateEmission: true,
                    tiers: { select: { raisonSociale: true } },
                },
            }),
            prisma.invoice.findMany({
                where: {
                    ...invoiceWhere,
                    dateEmission: { gte: startOfLastYear, lte: endOfLastYear },
                    status: { notIn: ["BROUILLON", "ANNULEE"] },
                },
                select: { totalTTC: true },
            }),
        ]);

        const caAnnuel = yearInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.totalTTC.toString())),
            new Big(0)
        );
        const caLastYear = lastYearInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.totalTTC.toString())),
            new Big(0)
        );

        let caVariation = "0";
        if (caLastYear.gt(0)) {
            caVariation = caAnnuel
                .minus(caLastYear)
                .div(caLastYear)
                .times(100)
                .toFixed(1);
        }

        const tvaCollectee = yearInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.totalTVA.toString())),
            new Big(0)
        );
        const retenuesSubies = yearInvoices.reduce(
            (acc, inv) => acc.plus(new Big(inv.totalRetenue.toString())),
            new Big(0)
        );

        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        const monthlyData = [];

        for (let m = 0; m < 12; m++) {
            const mStart = new Date(year, m, 1);
            const mEnd = new Date(year, m + 1, 0, 23, 59, 59);
            const mInvs = yearInvoices.filter((inv) => {
                const d = new Date(inv.dateEmission);
                return d >= mStart && d <= mEnd;
            });

            monthlyData.push({
                mois: monthNames[m],
                ca: parseFloat(
                    mInvs
                        .reduce((acc, i) => acc.plus(new Big(i.totalTTC.toString())), new Big(0))
                        .toFixed(3)
                ),
                tva: parseFloat(
                    mInvs
                        .reduce((acc, i) => acc.plus(new Big(i.totalTVA.toString())), new Big(0))
                        .toFixed(3)
                ),
                fodec: parseFloat(
                    mInvs
                        .reduce((acc, i) => acc.plus(new Big(i.totalFodec.toString())), new Big(0))
                        .toFixed(3)
                ),
                retenue: parseFloat(
                    mInvs
                        .reduce((acc, i) => acc.plus(new Big(i.totalRetenue.toString())), new Big(0))
                        .toFixed(3)
                ),
            });
        }

        const clientMap = new Map<string, { name: string; total: Big }>();
        for (const inv of yearInvoices) {
            const existing = clientMap.get(inv.tiersId);
            const amount = new Big(inv.totalTTC.toString());
            if (existing) {
                existing.total = existing.total.plus(amount);
            } else {
                clientMap.set(inv.tiersId, {
                    name: inv.tiers?.raisonSociale ?? "Inconnu",
                    total: amount,
                });
            }
        }

        const topClients = Array.from(clientMap.entries())
            .map(([id, v]) => ({ id, raisonSociale: v.name, totalCA: v.total.toFixed(3) }))
            .sort((a, b) => parseFloat(b.totalCA) - parseFloat(a.totalCA))
            .slice(0, 5);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // "Last month" = previous calendar month
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const lastMonthInvs = yearInvoices.filter((inv) => {
            const d = new Date(inv.dateEmission);
            return d.getMonth() + 1 === lastMonth && d.getFullYear() === lastMonthYear;
        });

        const lmTVA = lastMonthInvs.reduce(
            (acc, i) => acc.plus(new Big(i.totalTVA.toString())),
            new Big(0)
        );
        const lmFodec = lastMonthInvs.reduce(
            (acc, i) => acc.plus(new Big(i.totalFodec.toString())),
            new Big(0)
        );
        const lmRetenue = lastMonthInvs.reduce(
            (acc, i) => acc.plus(new Big(i.totalRetenue.toString())),
            new Big(0)
        );

        const tejXml = `<?xml version="1.0" encoding="UTF-8"?>
<DeclarationTEJ>
  <Exercice>${year}</Exercice>
  <MoisDeclaration>${String(lastMonth).padStart(2, "0")}</MoisDeclaration>
  <TotalTVA>${lmTVA.toFixed(3)}</TotalTVA>
  <TotalFODEC>${lmFodec.toFixed(3)}</TotalFODEC>
  <TotalRetenue>${lmRetenue.toFixed(3)}</TotalRetenue>
  <NombreFactures>${lastMonthInvs.length}</NombreFactures>
  <Factures>
${lastMonthInvs.map((inv, i) => `    <Facture>
      <Numero>${i + 1}</Numero>
      <Date>${new Date(inv.dateEmission).toISOString().split("T")[0]}</Date>
      <Fournisseur>${escapeXml(inv.tiers?.raisonSociale ?? "Inconnu")}</Fournisseur>
      <MontantHT>${new Big(inv.totalHT.toString()).toFixed(3)}</MontantHT>
      <TVA>${new Big(inv.totalTVA.toString()).toFixed(3)}</TVA>
      <FODEC>${new Big(inv.totalFodec.toString()).toFixed(3)}</FODEC>
      <Retenue>${new Big(inv.totalRetenue.toString()).toFixed(3)}</Retenue>
      <MontantTTC>${new Big(inv.totalTTC.toString()).toFixed(3)}</MontantTTC>
    </Facture>`).join("\n")}
  </Factures>
</DeclarationTEJ>`;

        return {
            caAnnuel: caAnnuel.toFixed(3),
            caVariation,
            tvaCollectee: tvaCollectee.toFixed(3),
            retenuesSubies: retenuesSubies.toFixed(3),
            monthlyData,
            topClients,
            tejXmlPreview: tejXml,
        };
    },
);
