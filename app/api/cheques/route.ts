import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { chequeSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import { enregistrerMouvement, typeComptePour } from "@/lib/tresorerie/ledger";
import { resolveSens } from "@/lib/tresorerie/sens";
import { cleSourceCheque } from "@/lib/tresorerie/source-keys";

export const GET = apiRoute.get(
  { permission: "cheques:voir", requireCompany: true },
  async (request, { params, session, companyId }) => {
    const cheques = await prisma.cheque.findMany({
      where: { companyId },
      include: {
        tiers: {
          select: { raisonSociale: true, ville: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const recus = cheques.filter((c) => c.type === "RECU");
    const emis = cheques.filter((c) => c.type === "EMIS");
    const enAttente = cheques.filter((c) => c.status === "EN_ATTENTE");
    const encaisses = cheques.filter((c) => c.status === "ENCAISSE");

    const montantRecus = recus.reduce(
      (acc, c) => acc.plus(new Big(c.montant.toString())),
      new Big(0)
    );
    const montantEmis = emis.reduce(
      (acc, c) => acc.plus(new Big(c.montant.toString())),
      new Big(0)
    );
    const montantEnAttente = enAttente.reduce(
      (acc, c) => acc.plus(new Big(c.montant.toString())),
      new Big(0)
    );
    const montantEncaisses = encaisses.reduce(
      (acc, c) => acc.plus(new Big(c.montant.toString())),
      new Big(0)
    );

    return {
      cheques: serializeDecimals(cheques),
      stats: {
        recusCount: recus.length,
        recusMontant: montantRecus.toFixed(3),
        emisCount: emis.length,
        emisMontant: montantEmis.toFixed(3),
        enAttenteCount: enAttente.length,
        enAttenteMontant: montantEnAttente.toFixed(3),
        encaissesCount: encaisses.length,
        encaissesMontant: montantEncaisses.toFixed(3),
      },
    };
  }
);

export const POST = apiRoute.post(
  { permission: "cheques:creer", requireCompany: true },
  async (request, { params, session, companyId }) => {
    const body = await request.json();
    const parsed = chequeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const data = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const cheque = await tx.cheque.create({
        data: {
          numero: data.numero,
          banque: data.banque ?? null,
          type: data.type,
          tiersId: data.tiersId ?? null,
          invoiceId: data.invoiceId ?? null,
          beneficiaire: data.beneficiaire,
          montant: data.montant.toString(),
          dateEmission: new Date(data.dateEmission),
          dateEcheance: new Date(data.dateEcheance),
          banqueBeneficiaire: data.banqueBeneficiaire ?? null,
          notes: data.notes ?? null,
          companyId,
        },
        include: {
          tiers: { select: { raisonSociale: true } },
        },
      });

      // Chèque émis ou reçu = flux prévu au sens de l'instrument (règle D2 :
      // le chèque prime sur la facture). Ecriture retirée/contre-passée plus
      // tard par encaisser / annuler / rejeter.
      const resolution = resolveSens({
        chequeType: data.type,
        effetType: null,
        invoiceId: data.invoiceId ?? null,
        achatId: null,
        avoirId: null,
      });
      await enregistrerMouvement(tx, {
        companyId,
        compteType: typeComptePour(resolution.sens, "CHEQUE"),
        sens: resolution.sens,
        mode: "CHEQUE",
        statut: "PREVU",
        montant: data.montant.toString(),
        dateOperation: new Date(data.dateEmission),
        dateEcheance: new Date(data.dateEcheance),
        cleSource: cleSourceCheque(cheque.id),
        tiersId: data.tiersId ?? null,
        invoiceId: data.invoiceId ?? null,
        chequeId: cheque.id,
        libelle: `Chèque ${data.type === "RECU" ? "reçu" : "émis"} ${data.numero}`,
        reference: data.numero,
      });

      return cheque;
    });

    return NextResponse.json(
      { cheque: serializeDecimals(result) },
      { status: 201 }
    );
  }
);
