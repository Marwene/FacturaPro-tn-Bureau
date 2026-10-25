"use server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, type PermissionKey } from "@/lib/permissions";
import { resolveCompanyIdForUser } from "@/lib/session";
import { jsonPayload, throwRouteError, throwRouteErrorWithDetails } from "@/lib/service-error";
import { createBonCommande } from "@/lib/bon-commande/create";
import { getBonCommande, updateBonCommande } from "@/lib/bon-commande/update";
import { saveBonCommandeDetailRows } from "@/lib/bon-commande/detail";
import { extractBonCommandeDetailScan } from "@/lib/bon-commande/detail-extract";
import { extractBonCommandeScan } from "@/lib/bon-commande/extract";
import { createBonLivraison } from "@/lib/bon-livraison/create";
import { createInvoice } from "@/lib/invoice/create";
import type { ExtractedData as ScanExtractedData } from "@/lib/stores/bons-commande-store";

// Server actions du module Bon de commande — **aucun tour HTTP** (lot H) :
// chaque action appelle directement le service `lib/*` partagé avec la route
// API correspondante. L'ordre des contrôles reproduce celui du wrapper
// `apiRoute` (`lib/api-route.ts`) : session → permission → résolution de la
// société → service, et les messages d'erreur sont ceux historiquement
// rejoués par `res.json()` puis `throw new Error(...)`.

type ActionSession = Session;

/** 401 historique « Non authentifié » du wrapper `apiRoute`. */
async function requireSession(): Promise<ActionSession> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Non authentifié");
    return session;
}

/**
 * Contrôle de permission identique à `apiRoute` : en cas de refus, la route
 * répondait `errorResponse(perm.error)` et l'action rejouait
 * `err.details || err.error || fallback` (OCR) ou `err.error ?? fallback`
 * selon la route appelée — d'où le `fallback` passé par chaque appelant.
 */
function requirePermission(
    session: ActionSession,
    permission: PermissionKey,
    fallback: string
): void {
    const perm = checkPermission(session.user.role, session.user.permissions, permission);
    if (!perm.allowed) throw new Error(perm.error ?? fallback);
}

/**
 * Résolution de la société cible (`requireCompany: true` côté route) : un
 * refus rendait `{ error }` sans `success:false`, lu par l'action via
 * `err.error ?? fallback` → message = `result.error`.
 */
async function requireCompany(
    session: ActionSession,
    requestedCompanyId: string | null
): Promise<string> {
    const result = await resolveCompanyIdForUser(session.user, requestedCompanyId);
    if (!result.ok) throw new Error(result.error);
    return result.companyId;
}

/** Exécute un service et rejoue le contrat `err.error ?? fallback` (routes non-OCR). */
function runService<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    return run().catch((error: unknown) => {
        throwRouteError(error, fallback);
    });
}

/** Exécute un service et rejoue le contrat `err.details || err.error || fallback` (routes OCR). */
function runServiceWithDetails<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    return run().catch((error: unknown) => {
        throwRouteErrorWithDetails(error, fallback);
    });
}

/**
 * Lecture du BC par `GET /api/bons-commande/[id]` : tout échec de la route
 * (permission, société absente, 404, 500) produisait historiquement le
 * **même** message, la réponse d'erreur n'étant pas lue.
 */
async function loadBonCommandeForValidation(
    session: ActionSession,
    bonCommandeId: string
): Promise<Awaited<ReturnType<typeof getBonCommande>>> {
    try {
        const perm = checkPermission(
            session.user.role,
            session.user.permissions,
            "bonsDeCommande:voir"
        );
        if (!perm.allowed || !session.user.companyId) {
            throw new Error("Impossible de charger le bon de commande");
        }
        return await getBonCommande(bonCommandeId, session.user.companyId);
    } catch {
        throw new Error("Impossible de charger le bon de commande");
    }
}

/**
 * `PATCH /api/bons-commande/[id] { status: "ACCEPTE" }` post-génération :
 * la réponse n'était jamais lue et **toute erreur était ignorée** (y compris
 * permission ou société) — comportement conservé à l'identique.
 */
async function marquerBonCommandeAccepte(
    session: ActionSession,
    bonCommandeId: string,
    requestedCompanyId: string | null
): Promise<void> {
    try {
        const perm = checkPermission(
            session.user.role,
            session.user.permissions,
            "bonsDeCommande:modifier"
        );
        if (!perm.allowed) return;
        const resolved = await resolveCompanyIdForUser(session.user, requestedCompanyId);
        if (!resolved.ok) return;
        await updateBonCommande(bonCommandeId, resolved.companyId, { status: "ACCEPTE" });
    } catch {
        // Historique : réponse du PATCH jamais lue → erreurs silencieuses.
    }
}

export async function extractBonCommandeFromScan(
    formData: FormData
): Promise<{ extracted: ScanExtractedData }> {
    const session = await requireSession();
    // Route `POST /api/bons-commande/extract` : `bonsDeCommande:creer`, sans
    // `requireCompany` — `getCompanyId` ne servait que de garde booléen sur le
    // matching produit (fallback `null`, jamais 403).
    requirePermission(session, "bonsDeCommande:creer", "Erreur extraction");
    const companyId = session.user.companyId || null;

    // Historiquement la réponse passait par `res.json()` (typée `any`) : le
    // payload JSON **supprime** les clés `undefined` (`JSON.stringify`), alors
    // que le type consommateur (store) les déclare `string` — contrat inchangé,
    // seul le typage est rétabli ici (aucun `any`).
    const payload = jsonPayload(
        await runServiceWithDetails(
            () => extractBonCommandeScan(formData, companyId),
            "Erreur extraction"
        )
    );
    return payload as { extracted: ScanExtractedData };
}

export async function createBonCommandeFromExtraction(data: Record<string, unknown>) {
    const session = await requireSession();
    requirePermission(session, "bonsDeCommande:creer", "Erreur création bon de commande");
    const companyId = await requireCompany(session, null);

    return jsonPayload(
        await runService(() => createBonCommande(data, companyId), "Erreur création bon de commande")
    );
}

export async function extractBonCommandeDetailFromScan(bonCommandeId: string, formData: FormData) {
    const session = await requireSession();
    requirePermission(session, "bonsDeCommande:modifier", "Erreur extraction du détail");
    const companyId = await requireCompany(session, null);

    return jsonPayload(
        await runServiceWithDetails(
            // Lazy : le corps n'est lu qu'après le garde-fous 404 du service
            // (parité d'ordre avec la route, finding W2 du lot H).
            () => extractBonCommandeDetailScan(bonCommandeId, companyId, async () => formData),
            "Erreur extraction du détail"
        )
    );
}

export async function saveBonCommandeDetail(
    bonCommandeId: string,
    data: { sourceDocument?: string | null; rows: Record<string, unknown>[] }
) {
    const session = await requireSession();
    requirePermission(session, "bonsDeCommande:modifier", "Erreur enregistrement du détail");
    const companyId = await requireCompany(session, null);

    return jsonPayload(
        await runService(
            // Lazy : le corps n'est lu qu'après le garde-fous 404 du service
            // (parité d'ordre avec la route, finding W2 du lot H).
            () => saveBonCommandeDetailRows(bonCommandeId, companyId, async () => data),
            "Erreur enregistrement du détail"
        )
    );
}

export async function validateBonCommande(input: {
    bonCommandeId: string;
    companyId: string | null;
    target: "BL" | "FACTURE";
}) {
    const session = await requireSession();
    const bc = await loadBonCommandeForValidation(session, input.bonCommandeId);

    // Garde-fou : le BC ne peut être honoré (BL ou Facture) tant que les lignes
    // destinées à la production (typeSource: PRODUCTION) présentent un écart
    // de quantité entre le BC et son détail (taille/couleur/broderie/DTF).
    // Les lignes prises en stock (typeSource: STOCK) ne bloquent jamais.
    const lignesBloquantes = bc.lines.filter(
        (l) => l.typeSource === "PRODUCTION" && l.statutRapprochement !== "RECONCILIE"
    );

    if (lignesBloquantes.length > 0) {
        const details = lignesBloquantes
            .map((l) => {
                const statut = l.statutRapprochement === "EN_ATTENTE_DETAIL" ? "détail non importé" : "écart de quantité";
                return `"${l.description}" (${statut})`;
            })
            .join(", ");
        throw new Error(
            `Le bon de commande ne peut pas être honoré : rapprochement quantités non soldé pour ${details}. Importez ou corrigez le bon de commande détaillé avant de générer un ${input.target === "BL" ? "bon de livraison" : "une facture"}.`
        );
    }

    // Le BC lu via `res.json()` fournissait des `Decimal` déjà sérialisés en
    // chaînes : `.toString()` reproduit exactement le payload historique.
    const lines = bc.lines.map((l) => ({
        productId: l.productId,
        description: l.description,
        quantite: l.quantite.toString(),
        prixHT: l.prixHT.toString(),
        remise: l.remise.toString(),
        tauxTVA: l.tauxTVA.toString(),
        fodec: l.fodec,
        tauxFodec: l.tauxFodec.toString(),
        totalHT: l.totalHT.toString(),
    }));

    if (input.target === "BL") {
        requirePermission(session, "bonsLivraison:creer", "Erreur création BL");
        const companyId = await requireCompany(session, input.companyId);

        const payload = {
            tiersId: bc.tiersId,
            dateCreation: new Date().toISOString().split("T")[0],
            dateLivraison: new Date().toISOString().split("T")[0],
            notes: `Issu du ${bc.numero}`,
            sourceBC: input.bonCommandeId,
            lines,
        };

        const body = await runService(
            () => createBonLivraison(payload, companyId),
            "Erreur création BL"
        );
        await marquerBonCommandeAccepte(session, input.bonCommandeId, input.companyId);

        return jsonPayload({ type: "BL" as const, ...body });
    }

    // Cible « facture » : le client était lu via `GET /api/clients/[id]`
    // (permission `clients:voir`) et la société via `GET /api/companies/[id]`
    // (permission `parametres:voir`) ; **tout échec était silencieux** et
    // laissait les valeurs par défaut en place.
    let client: { devise: string; deviseSecondaire: string | null } | null = null;
    const clientPerm = checkPermission(
        session.user.role,
        session.user.permissions,
        "clients:voir"
    );
    if (clientPerm.allowed) {
        const tiers = await prisma.tiers.findUnique({ where: { id: bc.tiersId } });
        if (tiers) client = { devise: tiers.devise, deviseSecondaire: tiers.deviseSecondaire };
    }

    let companyType: string | null = null;
    if (input.companyId) {
        const companyPerm = checkPermission(
            session.user.role,
            session.user.permissions,
            "parametres:voir"
        );
        if (companyPerm.allowed) {
            const company = await prisma.company.findUnique({ where: { id: input.companyId } });
            companyType = company?.type ?? null;
        }
    }

    const clientDevise = client?.devise || "TND";
    const clientDeviseSec = client?.deviseSecondaire || null;
    const bcViseActif = companyType === "OFFSHORE" && (clientDevise === "TND" || clientDeviseSec === "TND");

    const payload: Record<string, unknown> = {
        tiersId: bc.tiersId,
        dateEmission: new Date().toISOString().split("T")[0],
        dateEcheance: "",
        notes: `Issu du ${bc.numero}`,
        sourceBC: input.bonCommandeId,
        lines,
        bcViseActif,
        bcViseNumero: bc.numero,
        poids: "",
        nbColis: "",
        devise: clientDevise === "TND" ? "EUR" : "TND",
        tauxChange: "",
        montantTND: "",
    };

    requirePermission(session, "factures:creer", "Erreur création facture");
    const companyId = await requireCompany(session, input.companyId);
    const body = await runService(() => createInvoice(payload, companyId), "Erreur création facture");
    await marquerBonCommandeAccepte(session, input.bonCommandeId, input.companyId);

    return jsonPayload({ type: "FACTURE" as const, ...body });
}
