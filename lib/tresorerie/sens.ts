/**
 * Règles de résolution du sens / du mode / du statut d'un mouvement de
 * trésorerie — lot D2.
 *
 * Ce module est PARTAGÉ entre le backfill D1 (`prisma/backfill-mouvements-
 * tresorerie.ts`) et l'écriture live (`lib/tresorerie/ledger.ts`) : une seule
 * définition de ces règles dans le repo, pour que le live produise exactement
 * les mêmes écritures que le backfill (idempotence de `cleSource`).
 *
 * Les fonctions ci-dessous sont pures (aucun accès base) mais typer les enums
 * générés par Prisma pour rester exhaustives : toute nouvelle valeur d'enum
 * casse le build plutôt que de tomber dans un `default` silencieux.
 */
import type {
    ChequeStatus,
    ChequeType,
    EffetStatus,
    EffetType,
    ModeReglement,
    PaymentMethod,
    PaymentStatus,
    SensMouvement,
    StatutMouvement,
} from "@/prisma/generated/prisma/client";

export interface SensContext {
    chequeType: ChequeType | null;
    effetType: EffetType | null;
    invoiceId: string | null;
    achatId: string | null;
    avoirId: string | null;
}

export interface SensResolution {
    sens: SensMouvement;
    motif: string | null;
    indice: SensMouvement | null;
}

/**
 * Sens du mouvement — priorité stricte : l'instrument (chèque/effet) prime sur
 * le document (facture/achat/avoir). Toute contradiction → A_QUALIFIER (jamais
 * deviner). Un chèque/effet EMIS ne peut donc JAMAIS produire un ENCAISSEMENT.
 */
export function resolveSens(ctx: SensContext): SensResolution {
    const hasInvoice = ctx.invoiceId !== null;
    const hasAchat = ctx.achatId !== null;
    const hasAvoir = ctx.avoirId !== null;

    if (ctx.chequeType !== null && ctx.effetType !== null) {
        return {
            sens: "A_QUALIFIER",
            motif: "instrument-contradictoire: cheque+effet sur la même écriture",
            indice: null,
        };
    }

    let instrument: SensMouvement | null = null;
    let instrumentLabel: string | null = null;
    if (ctx.chequeType !== null) {
        instrument = ctx.chequeType === "RECU" ? "ENCAISSEMENT" : "DECAISSEMENT";
        instrumentLabel = `cheque.${ctx.chequeType}`;
    } else if (ctx.effetType !== null) {
        instrument = ctx.effetType === "RECU" ? "ENCAISSEMENT" : "DECAISSEMENT";
        instrumentLabel = `effet.${ctx.effetType}`;
    }

    if (hasInvoice && hasAchat) {
        return {
            sens: "A_QUALIFIER",
            motif: "document-contradictoire: invoiceId+achatId",
            indice: instrument,
        };
    }

    const documentSens: SensMouvement | null = hasInvoice
        ? "ENCAISSEMENT"
        : hasAchat
            ? "DECAISSEMENT"
            : null;
    const documentLabel: string | null = hasInvoice ? "invoice" : hasAchat ? "achat" : null;

    if (
        instrument !== null &&
        documentSens !== null &&
        instrument !== documentSens &&
        instrumentLabel !== null &&
        documentLabel !== null
    ) {
        return {
            sens: "A_QUALIFIER",
            motif: `instrument-contradictoire: ${instrumentLabel} vs ${documentLabel}`,
            indice: instrument,
        };
    }
    if (instrument !== null) {
        return { sens: instrument, motif: null, indice: instrument };
    }
    if (documentSens !== null) {
        return { sens: documentSens, motif: null, indice: documentSens };
    }
    if (hasAvoir) {
        return { sens: "A_QUALIFIER", motif: "avoir: direction non determinable", indice: null };
    }
    return { sens: "A_QUALIFIER", motif: "aucune source de direction", indice: null };
}

/** PaymentMethod → ModeReglement (énumération exhaustive). */
export function paymentMethodToMode(methode: PaymentMethod): ModeReglement {
    switch (methode) {
        case "ESPECES":
            return "ESPECES";
        case "CHEQUE":
            return "CHEQUE";
        case "VIREMENT":
            return "VIREMENT";
        case "EFFET":
            return "EFFET";
        case "CARTE":
            return "CARTE";
    }
}

/** Mode porté par l'instrument du paiement (effet > chèque > méthode), comme le backfill. */
export function modeReglementPourPayment(params: {
    effetId: string | null;
    chequeId: string | null;
    methode: PaymentMethod;
}): ModeReglement {
    if (params.effetId !== null) return "EFFET";
    if (params.chequeId !== null) return "CHEQUE";
    return paymentMethodToMode(params.methode);
}

/** Statut du mouvement déduit du statut du Payment source. */
export function paymentStatut(status: PaymentStatus): { statut: StatutMouvement; motif: string | null } {
    switch (status) {
        case "EN_ATTENTE":
            return { statut: "PREVU", motif: null };
        case "CONFIRME":
            return { statut: "REALISE", motif: null };
        case "ANNULE":
            return { statut: "ANNULE", motif: null };
    }
}

/** Statut du mouvement déduit du statut du Chèque côté source (sans payment couvrant). */
export function chequeStatut(status: ChequeStatus): { statut: StatutMouvement; motif: string | null } {
    switch (status) {
        case "EN_ATTENTE":
            return { statut: "PREVU", motif: null };
        case "ANNULE":
            return { statut: "ANNULE", motif: null };
        case "ENCAISSE":
            return { statut: "A_QUALIFIER", motif: "cheque-encaisse-sans-paiement" };
        case "REJETE":
            return { statut: "A_QUALIFIER", motif: "cheque-rejete-sans-paiement" };
    }
}

/** Statut du mouvement déduit du statut de l'Effet côté source (sans payment couvrant). */
export function effetStatut(status: EffetStatus): { statut: StatutMouvement; motif: string | null } {
    switch (status) {
        case "EN_PORTEFEUILLE":
            return { statut: "PREVU", motif: null };
        case "REMIS_ESCOMPTE":
            return { statut: "PREVU", motif: null };
        case "ENDOSSE":
            return { statut: "PREVU", motif: null };
        case "PAYE":
            return { statut: "A_QUALIFIER", motif: "effet-paye-sans-paiement" };
        case "IMPAYE":
            return { statut: "A_QUALIFIER", motif: "effet-impaye" };
        case "ANNULE":
            return { statut: "ANNULE", motif: null };
    }
}
