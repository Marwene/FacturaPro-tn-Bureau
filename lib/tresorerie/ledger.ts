/**
 * Écritures du grand livre de trésorerie — lot D2.
 *
 * Toutes les fonctions ci-dessous prennent en premier argument le client de
 * base à utiliser : LE MÊME `tx` que l'opération métier appelante (aucune
 * écriture n'est faite hors de la transaction métier).
 *
 * Règles figées (décisions utilisateur D1) :
 * 1. Contre-passation pure : l'originale reste REALISE (`annuleParId` renseigné
 *    sur l'originale, pointant vers l'écriture inverse) et l'inverse est REALISE
 *    au sens opposé, datée du jour de l'annulation. L'option « originale → ANNULE »
 *    est INTERDITE : elle donnerait solde = −X au lieu de 0.
 * 2. `annuleParId` vit sur l'écriture ORIGINALE (sens littéral de « annulé par »).
 * 3. Annulation d'un PREVU (ou A_QUALIFIER) → statut ANNULE, SANS écriture inverse.
 * 4. `montant` est TOUJOURS strictement positif : le sens porte le signe.
 * 5. `cleSource` produit par `lib/tresorerie/source-keys.ts`, format identique au
 *    backfill D1 (ré-exécution du backfill = 0 doublon).
 */
import Big from "big.js";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import type {
    ModeReglement,
    MouvementTresorerie,
    PaymentMethod,
    PaymentStatus,
    SensMouvement,
    StatutMouvement,
    TypeCompte,
} from "@/prisma/generated/prisma/client";
import { estAnnule, type DecimalLike } from "./compute";
import {
    cleSourceContrepassation,
    cleSourcePayment,
} from "./source-keys";
import { modeReglementPourPayment, paymentStatut, resolveSens } from "./sens";

export type LedgerDb = Prisma.TransactionClient | typeof prisma;

export class MontantNonPositifError extends Error {
    constructor() {
        super("Le montant d'un mouvement de trésorerie doit être strictement positif.");
        this.name = "MontantNonPositifError";
    }
}

export class MouvementIntrouvableError extends Error {
    constructor() {
        super("Mouvement de trésorerie introuvable.");
        this.name = "MouvementIntrouvableError";
    }
}

export class MouvementDejaAnnuleError extends Error {
    constructor() {
        super("Ce mouvement de trésorerie est déjà annulé.");
        this.name = "MouvementDejaAnnuleError";
    }
}

export class SensIncontournableError extends Error {
    constructor() {
        super("Un mouvement de sens A_QUALIFIER ne peut pas faire l'objet d'une contre-passation.");
        this.name = "SensIncontournableError";
    }
}

export type CompteTresorerieType = TypeCompte;

/** A_QUALIFIER ou espèces → CAISSE, sinon BANQUE (règle du backfill D1, inchangée). */
export function typeComptePour(sens: SensMouvement, mode: ModeReglement): CompteTresorerieType {
    return sens === "A_QUALIFIER" || mode === "ESPECES" ? "CAISSE" : "BANQUE";
}

export function sensInverse(sens: SensMouvement): SensMouvement {
    if (sens === "ENCAISSEMENT") return "DECAISSEMENT";
    if (sens === "DECAISSEMENT") return "ENCAISSEMENT";
    throw new SensIncontournableError();
}

export interface EnregistrerMouvementInput {
    companyId: string;
    compteType: CompteTresorerieType;
    sens: SensMouvement;
    mode: ModeReglement;
    statut: StatutMouvement;
    /** Toujours strictement positif — le sens porte le signe. */
    montant: DecimalLike | string;
    dateOperation: Date;
    dateValeur?: Date | null;
    dateEcheance?: Date | null;
    cleSource: string | null;
    tiersId?: string | null;
    invoiceId?: string | null;
    achatId?: string | null;
    avoirId?: string | null;
    chequeId?: string | null;
    effetId?: string | null;
    paymentId?: string | null;
    mouvementFinancierId?: string | null;
    libelle?: string | null;
    reference?: string | null;
    notes?: string | null;
}

/**
 * Crée une écriture du grand livre.
 * Le compte (CAISSE/BANQUE) est résolu par `upsert` AVANT la création de
 * l'écriture (Prisma interdit de mixer `compte: { connectOrCreate }` et les
 * clés étrangères scalaires dans le même create) — les deux appels partagent
 * la transaction de l'appelant, l'opération reste atomique et idempotente.
 */
export async function enregistrerMouvement(
    db: LedgerDb,
    input: EnregistrerMouvementInput,
): Promise<MouvementTresorerie> {
    const montant = input.montant instanceof Big ? input.montant : new Big(String(input.montant));
    if (montant.lte(0)) {
        throw new MontantNonPositifError();
    }
    const dateValeur = input.dateValeur ?? (input.statut === "REALISE" ? input.dateOperation : null);

    const compte = await db.compteTresorerie.upsert({
        where: { companyId_type: { companyId: input.companyId, type: input.compteType } },
        update: {},
        create: {
            companyId: input.companyId,
            type: input.compteType,
            libelle: input.compteType === "CAISSE" ? "Caisse" : "Banque",
            soldeInitial: 0,
            // 1970 : aucun filtrage artificiel — le solde initial est
            // ensuite saisi par l'utilisateur avec sa propre date.
            dateSoldeInitial: new Date(0),
        },
        select: { id: true },
    });

    return db.mouvementTresorerie.create({
        data: {
            companyId: input.companyId,
            compteId: compte.id,
            sens: input.sens,
            mode: input.mode,
            statut: input.statut,
            montant: montant.toFixed(4),
            dateOperation: input.dateOperation,
            dateValeur,
            dateEcheance: input.dateEcheance ?? null,
            tiersId: input.tiersId ?? null,
            invoiceId: input.invoiceId ?? null,
            achatId: input.achatId ?? null,
            avoirId: input.avoirId ?? null,
            chequeId: input.chequeId ?? null,
            effetId: input.effetId ?? null,
            paymentId: input.paymentId ?? null,
            mouvementFinancierId: input.mouvementFinancierId ?? null,
            libelle: input.libelle ?? null,
            reference: input.reference ?? null,
            notes: input.notes ?? null,
            cleSource: input.cleSource,
        },
    });
}

/** Vue structurelle du `Payment` nécessaire à l'écriture de son mouvement. */
export interface PaiementSource {
    id: string;
    companyId: string;
    montant: DecimalLike;
    methode: PaymentMethod;
    status: PaymentStatus;
    dateReglement: Date;
    tiersId: string | null;
    invoiceId: string | null;
    achatId: string | null;
    avoirId: string | null;
    chequeId: string | null;
    effetId: string | null;
    reference: string | null;
}

/**
 * Écriture du mouvement d'un `Payment` : sens résolu comme le backfill D1
 * (l'instrument prime sur le document), mode EFFET dès qu'un effet est
 * référencé (jamais VIREMENT), statut déduit du statut du paiement.
 */
export async function enregistrerMouvementPourPayment(
    db: LedgerDb,
    paiement: PaiementSource,
): Promise<MouvementTresorerie> {
    const [cheque, effet] = await Promise.all([
        paiement.chequeId === null
            ? Promise.resolve(null)
            : db.cheque.findUnique({
                where: { id: paiement.chequeId },
                select: { type: true, dateEcheance: true },
            }),
        paiement.effetId === null
            ? Promise.resolve(null)
            : db.effet.findUnique({
                where: { id: paiement.effetId },
                select: { type: true, dateEcheance: true },
            }),
    ]);

    const resolution = resolveSens({
        chequeType: cheque?.type ?? null,
        effetType: effet?.type ?? null,
        invoiceId: paiement.invoiceId,
        achatId: paiement.achatId,
        avoirId: paiement.avoirId,
    });
    const mode = modeReglementPourPayment({
        effetId: paiement.effetId,
        chequeId: paiement.chequeId,
        methode: paiement.methode,
    });
    const { statut, motif } = paymentStatut(paiement.status);

    return enregistrerMouvement(db, {
        companyId: paiement.companyId,
        compteType: typeComptePour(resolution.sens, mode),
        sens: resolution.sens,
        mode,
        statut,
        montant: paiement.montant,
        dateOperation: paiement.dateReglement,
        dateEcheance: effet?.dateEcheance ?? cheque?.dateEcheance ?? null,
        cleSource: cleSourcePayment(paiement.id),
        tiersId: paiement.tiersId,
        invoiceId: paiement.invoiceId,
        achatId: paiement.achatId,
        avoirId: paiement.avoirId,
        chequeId: paiement.chequeId,
        effetId: paiement.effetId,
        paymentId: paiement.id,
        reference: paiement.reference,
        notes: joinMotifs(resolution.motif, motif),
    });
}

function joinMotifs(...motifs: Array<string | null>): string | null {
    const conserves = motifs.filter((motif): motif is string => motif !== null);
    return conserves.length > 0 ? conserves.join(" | ") : null;
}

/**
 * Retire une écriture PRÉVUE qui vient d'être supplantée (un instrument prévu
 * dont la réalisation passe désormais par un `Payment` couvrant, par exemple).
 * Seules les écritures PREVU sont mises à ANNULE ; une écriture déjà REALISE
 * doit être contre-passée (cf. `annulerMouvement`), jamais « retirée ».
 */
export async function retirerMouvementPrevu(
    db: LedgerDb,
    params: { companyId: string; cleSource: string; motif: string },
): Promise<MouvementTresorerie | null> {
    const mouvement = await db.mouvementTresorerie.findUnique({
        where: { cleSource: params.cleSource },
    });
    if (mouvement === null || mouvement.companyId !== params.companyId) {
        return null;
    }
    if (mouvement.statut !== "PREVU") {
        return mouvement;
    }
    return db.mouvementTresorerie.update({
        where: { id: mouvement.id },
        data: { statut: "ANNULE", notes: joinMotifs(params.motif, mouvement.notes) },
    });
}

export interface ResultatAnnulation {
    origine: MouvementTresorerie;
    inverse: MouvementTresorerie | null;
}

/**
 * Annulation d'une écriture.
 * - PREVU / A_QUALIFIER → statut ANNULE, sans écriture inverse (règle 3).
 * - REALISE → contre-passation (règle 1) : création d'une écriture inverse au
 *   sens opposé datée de l'annulation, et `annuleParId`/`annuleLe` renseignés
 *   sur l'ORIGINALE qui reste REALISE (règle 2).
 */
export async function annulerMouvement(
    db: LedgerDb,
    params: { companyId: string; mouvementId: string; annuleLe?: Date; motif?: string | null },
): Promise<ResultatAnnulation> {
    const origine = await db.mouvementTresorerie.findFirst({
        where: { id: params.mouvementId, companyId: params.companyId },
    });
    if (origine === null) {
        throw new MouvementIntrouvableError();
    }
    if (estAnnule(origine)) {
        throw new MouvementDejaAnnuleError();
    }

    const annuleLe = params.annuleLe ?? new Date();

    if (origine.statut !== "REALISE") {
        const miseAJour = await db.mouvementTresorerie.update({
            where: { id: origine.id },
            data: {
                statut: "ANNULE",
                annuleLe,
                notes: joinMotifs(params.motif ?? null, origine.notes),
            },
        });
        return { origine: miseAJour, inverse: null };
    }

    const inverse = await db.mouvementTresorerie.create({
        data: {
            companyId: origine.companyId,
            compteId: origine.compteId,
            sens: sensInverse(origine.sens),
            mode: origine.mode,
            statut: "REALISE",
            montant: origine.montant,
            devise: origine.devise,
            montantTND: origine.montantTND,
            dateOperation: annuleLe,
            dateValeur: annuleLe,
            dateEcheance: null,
            tiersId: origine.tiersId,
            invoiceId: origine.invoiceId,
            achatId: origine.achatId,
            avoirId: origine.avoirId,
            chequeId: origine.chequeId,
            effetId: origine.effetId,
            paymentId: origine.paymentId,
            mouvementFinancierId: origine.mouvementFinancierId,
            libelle: origine.libelle === null ? "Contre-passation" : `Contre-passation — ${origine.libelle}`,
            reference: origine.reference,
            notes: params.motif ?? null,
            cleSource: origine.cleSource === null ? null : cleSourceContrepassation(origine.cleSource),
            annuleLe,
        },
    });

    const origineMiseAJour = await db.mouvementTresorerie.update({
        where: { id: origine.id },
        data: { annuleParId: inverse.id, annuleLe },
    });

    return { origine: origineMiseAJour, inverse };
}

export interface ResultatSynchronisation {
    mouvement: MouvementTresorerie;
    inverse: MouvementTresorerie | null;
}

/**
 * Synchronise le mouvement d'un `Payment` avec l'évolution de son statut :
 * - EN_ATTENTE → CONFIRME : le PRÉVU devient REALISE (dateValeur = date de règlement).
 * - → ANNULE : contre-passation si le mouvement était REALISE, sinon ANNULE (règle 3).
 */
export async function synchroniserMouvementPaiement(
    db: LedgerDb,
    params: {
        paiement: PaiementSource;
        nouveauStatut: PaymentStatus;
        annuleLe?: Date;
        motif?: string | null;
    },
): Promise<ResultatSynchronisation | null> {
    const cleSource = cleSourcePayment(params.paiement.id);
    const mouvement = await db.mouvementTresorerie.findUnique({ where: { cleSource } });
    if (mouvement === null || mouvement.companyId !== params.paiement.companyId) {
        return null;
    }
    if (estAnnule(mouvement)) {
        return { mouvement, inverse: null };
    }

    if (params.nouveauStatut === "ANNULE") {
        const resultat = await annulerMouvement(db, {
            companyId: params.paiement.companyId,
            mouvementId: mouvement.id,
            annuleLe: params.annuleLe,
            motif: params.motif ?? null,
        });
        return { mouvement: resultat.origine, inverse: resultat.inverse };
    }

    if (params.nouveauStatut === "CONFIRME" && mouvement.statut === "PREVU") {
        const realise = await db.mouvementTresorerie.update({
            where: { id: mouvement.id },
            data: {
                statut: "REALISE",
                dateOperation: params.paiement.dateReglement,
                dateValeur: params.paiement.dateReglement,
            },
        });
        return { mouvement: realise, inverse: null };
    }

    return { mouvement, inverse: null };
}
