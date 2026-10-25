import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { sendMail, getMailConfig } from "@/lib/mail";
import { buildRappelEmailHtml } from "@/lib/email-templates/client-rappel";
import type { SerializedTiers, TiersSoldeEntry } from "@/lib/types";
import Big from "big.js";

export const POST = apiRoute.post(
    { permission: "clients:modifier" },
    async (request, { params }) => {
        try {
            const { id } = params;

            const client = await prisma.tiers.findUnique({ where: { id } });
            if (!client) return NextResponse.json(errorResponse("Client introuvable"), { status: 404 });
            if (!client.email) return NextResponse.json(errorResponse("Ce client n'a pas d'adresse email"), { status: 400 });

            // Fetch solde data
            const [invoices, payments, avoirs, mouvements] = await Promise.all([
                prisma.invoice.findMany({
                    where: { tiersId: id, status: { notIn: ["BROUILLON", "ANNULEE"] } },
                    select: { numero: true, dateEmission: true, totalTTC: true, notes: true },
                    orderBy: { dateEmission: "asc" },
                }),
                prisma.payment.findMany({
                    where: { tiersId: id },
                    select: { dateReglement: true, montant: true, methode: true, reference: true, notes: true },
                    orderBy: { dateReglement: "asc" },
                }),
                prisma.avoir.findMany({
                    where: { tiersId: id, status: { notIn: ["BROUILLON", "ANNULE"] } },
                    select: { numero: true, dateEmission: true, totalTTC: true, motif: true },
                    orderBy: { dateEmission: "asc" },
                }),
                prisma.mouvementFinancier.findMany({
                    where: { tiersId: id },
                    select: { dateMouvement: true, montant: true, type: true, notes: true },
                    orderBy: { dateMouvement: "asc" },
                }),
            ]);

            interface Entry { date: Date; piece: string; mouvement: string; commentaire: string; debit: string; credit: string; }
            const entries: Entry[] = [];
            let running = new Big(0);

            for (const inv of invoices) entries.push({ date: inv.dateEmission, piece: inv.numero, mouvement: "Facture", commentaire: inv.notes ?? "", debit: inv.totalTTC.toFixed(3), credit: "0" });
            for (const p of payments) entries.push({ date: p.dateReglement, piece: p.reference ?? `PAI-${Math.random().toString(36).slice(2, 10)}`, mouvement: "Paiement", commentaire: `${p.methode}${p.notes ? " — " + p.notes : ""}`, debit: "0", credit: p.montant.toFixed(3) });
            for (const a of avoirs) entries.push({ date: a.dateEmission, piece: a.numero, mouvement: "Avoir", commentaire: a.motif ?? "", debit: "0", credit: a.totalTTC.toFixed(3) });
            let mvtIdx = 0;
            for (const m of mouvements) {
                mvtIdx++;
                entries.push({ date: m.dateMouvement, piece: `MVT-${String(mvtIdx).padStart(4, "0")}`, mouvement: m.type === "CREDIT" ? "Crédit" : "Débit", commentaire: m.notes ?? "", debit: m.type === "DEBIT" ? m.montant.toFixed(3) : "0", credit: m.type === "CREDIT" ? m.montant.toFixed(3) : "0" });
            }

            entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let totalDebit = new Big(0);
            let totalCredit = new Big(0);
            let lastSolde = new Big(0);
            const soldeEntries = entries.map((e) => {
                running = running.plus(new Big(e.debit)).minus(new Big(e.credit));
                totalDebit = totalDebit.plus(e.debit);
                totalCredit = totalCredit.plus(e.credit);
                lastSolde = running;
                return { ...e, solde: running.toFixed(3) };
            });

            const clientWithCredit = {
                id: client.id,
                code: client.code,
                raisonSociale: client.raisonSociale,
                matriculeFiscal: client.matriculeFiscal,
                adresse: client.adresse,
                ville: client.ville,
                codePostal: client.codePostal,
                telephone: client.telephone,
                email: client.email,
                siteWeb: client.siteWeb ?? null,
                assujettTVA: client.assujettTVA,
                exonereTVA: client.exonereTVA,
                isClient: true,
                isFournisseur: false,
                contactNom: client.contactNom,
                contactTel: client.contactTel,
                contactFonction: client.contactFonction,
                tauxRetenue: client.tauxRetenue.toString(),
                creditLimit: client.creditLimit.toString(),
                ribBancaire: client.ribBancaire,
                banque: client.banque,
                notes: client.notes,
                actif: client.actif,
                devise: client.devise,
                deviseSecondaire: client.deviseSecondaire,
                dateBlocage: client.dateBlocage,
                emailSentAt: client.emailSentAt,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt,
            } satisfies SerializedTiers;

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            const appUrl = `${baseUrl}/clients/${id}`;
            const html = buildRappelEmailHtml(clientWithCredit, soldeEntries as TiersSoldeEntry[], totalDebit.toFixed(3), totalCredit.toFixed(3), lastSolde.toFixed(3), appUrl);

            const mailConfig = getMailConfig();
            const emailResult = await sendMail({
                to: client.email,
                subject: `FacturaPro TN — Compte bloqué : ${client.raisonSociale}`,
                html,
            });

            if (!emailResult) {
                return NextResponse.json(errorResponse("Erreur lors de l'envoi de l'email"), { status: 500 });
            }

            await prisma.tiers.update({
                where: { id },
                data: { emailSentAt: new Date() },
            });

            return NextResponse.json({ success: true, message: "Email envoyé avec succès" });
        } catch (error) {
            console.error("[clients/id/envoyer-rappel/POST]", error);
            return NextResponse.json(errorResponse("Erreur serveur"), { status: 500 });
        }
    }
);
