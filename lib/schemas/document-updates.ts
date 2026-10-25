import { z } from "zod";
import { achatSchema } from "./achat";
import { bonCommandeSchema, bonCommandeLineSchema } from "./bon-commande";

// ─── Annexe A — groupe financier (lot E2b, exigence 6 du Prompt E) ─────────────
//
// Schémas passés à `schema:` dans la config des 9 routes du groupe financier :
//   app/api/invoices/[id] · quotes/[id] · quotes/[id]/convert ·
//   bons-commande/[id] · avoirs/[id] · achats/[id] · bons-livraison/[id] ·
//   products/[id]/stock-movements · payments/[id]
//
// Contrat (wrapper `lib/api-route.ts`, inchangé par ce lot) :
//   - le body est parsé AVANT le handler → 422 `{ error, issues, success: false }` ;
//   - le handler reçoit `body` typé `z.infer` et ne lit plus le corps lui-même ;
//   - le Zod STRIPpe les clés inconnues : un champ non déclaré ne peut plus
//     atteindre le handler (anti mass-assignment S-7) — avant la migration, les
//     handlers lisaient `body.<champ>` sans typage ni aucune validation.
//
// Chaque liste de statuts est le miroir EXACT (a) de l'enum Prisma
// correspondant (`prisma/schema.prisma`) et (b), pour invoices / quotes /
// achats / bons-livraison, de la liste déjà contrôlée manuellement dans le
// handler : les 400 « Statut invalide » devenus redondants ont été retirés,
// les contrôles dépendants de l'état (transitions de facture) sont conservés.
//
// `status` reste OPTIONNEL là où le handler le traitait comme tel
// (`if (status)`) : un payload sans statut garde exactement le comportement
// d'avant (update sans effet / 400 « Action non reconnue »).
//
// Équivalence prouvée payload par payload côté appelants réels (hooks/components/
// server actions) — voir le rapport de lot E2b.

// ─── Factures ──────────────────────────────────────────────────────────────────

/** PATCH /api/invoices/[id] — `hooks/use-invoices.ts` (`updateStatus`). */
export const invoiceStatusUpdateSchema = z.object({
    status: z
        .enum(["BROUILLON", "ENVOYEE", "PARTIELLE", "PAYEE", "EN_RETARD", "ANNULEE"])
        .optional(),
});

export type InvoiceStatusUpdateInput = z.infer<typeof invoiceStatusUpdateSchema>;

// ─── Devis ────────────────────────────────────────────────────────────────────

/** PATCH /api/quotes/[id] — `hooks/use-devis.ts` + `hooks/use-quotes-queries.ts`. */
export const quoteStatusUpdateSchema = z.object({
    status: z
        .enum(["BROUILLON", "ENVOYEE", "ACCEPTEE", "REFUSEE", "EXPIREE", "FACTUREE"])
        .optional(),
});

export type QuoteStatusUpdateInput = z.infer<typeof quoteStatusUpdateSchema>;

/**
 * POST /api/quotes/[id]/convert — `hooks/use-devis.ts` (`convertToInvoice`).
 * Corps OPTIONNEL : l'appelant POSTe sans corps (backward compat) → `undefined`
 * doit passer la validation, d'où `.optional()` racine ; `target` absent →
 * « invoice » (défaut historique du handler).
 */
export const quoteConvertSchema = z
    .object({
        target: z.enum(["invoice", "deliveryNote"]).optional(),
    })
    .optional();

export type QuoteConvertInput = z.infer<typeof quoteConvertSchema>;

// ─── Avoirs ───────────────────────────────────────────────────────────────────

/** PATCH /api/avoirs/[id] — `hooks/use-avoirs.ts` (`updateStatus`). `status` requis. */
export const avoirStatusUpdateSchema = z.object({
    status: z.enum(["BROUILLON", "EMIS", "REMBOURSE", "ANNULE"]),
});

export type AvoirStatusUpdateInput = z.infer<typeof avoirStatusUpdateSchema>;

// ─── Bons de livraison ────────────────────────────────────────────────────────

/**
 * PATCH /api/bons-livraison/[id] — `hooks/use-bl.ts` +
 * `hooks/use-delivery-notes-queries.ts`. `status` requis (le handler répondait
 * déjà « Statut requis »). `FACTURE` (enum Prisma) n'est PAS accepté : c'est
 * un statut posé par les routes de conversion, jamais par un PATCH utilisateur.
 */
export const deliveryNoteStatusUpdateSchema = z.object({
    status: z.enum(["BROUILLON", "LIVRE", "ANNULE"]),
});

export type DeliveryNoteStatusUpdateInput = z.infer<typeof deliveryNoteStatusUpdateSchema>;

// ─── Achats ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/achats/[id] — `hooks/use-achats.ts` (`updateStatus`),
 * `hooks/use-achats-queries.ts` (`useUpdateAchatStatus`, `useUpdateAchatMeta`).
 * Dérivé de `achatSchema` (`.pick`) : `blAchatId` / `categorieAchat` gardent la
 * définition unique de création ; `status` complète le schéma (absent de la
 * création, qui passe par `asDraft`).
 */
export const achatUpdateSchema = achatSchema
    .pick({ blAchatId: true, categorieAchat: true })
    .extend({
        status: z.enum(["BROUILLON", "VALIDEE", "ANNULEE"]).optional(),
    });

export type AchatUpdateInput = z.infer<typeof achatUpdateSchema>;

// ─── Bons de commande ─────────────────────────────────────────────────────────

/**
 * PATCH /api/bons-commande/[id] — `hooks/use-bc.ts` (`updateStatus`) et la
 * server action `app/actions/bons-commande.ts` (`{ status: "ACCEPTE" }`).
 * `notes` dérivé de `bonCommandeSchema` ; `lines` réutilise
 * `bonCommandeLineSchema` (le handler remplace toutes les lignes — delete +
 * recreate — après le garde-fou rapprochement).
 */
export const bonCommandeUpdateSchema = bonCommandeSchema
    .pick({ notes: true })
    .extend({
        status: z.enum(["BROUILLON", "ACCEPTE", "ANNULE"]).optional(),
        lines: z.array(bonCommandeLineSchema).optional(),
    });

export type BonCommandeUpdateInput = z.infer<typeof bonCommandeUpdateSchema>;

// ─── Paiements ────────────────────────────────────────────────────────────────

/**
 * PATCH /api/payments/[id] — `hooks/use-payments-queries.ts` (`useUpdatePayment`)
 * : confirmation de virement `{ status: "CONFIRME" }`, édition
 * `reference` / `notes` / `dateReglement`.
 * Champs redéfinis (et non dérivés de `paymentSchema`) : Zod 4 refuse
 * `.pick()` sur un schéma portant `.refine()` (« .pick() cannot be used on
 * object schemas containing refinements »), et la création impose
 * `invoiceId`/`montant`/`methode` que ce PATCH n'écrit pas.
 */
export const paymentUpdateSchema = z.object({
    status: z.enum(["EN_ATTENTE", "CONFIRME", "ANNULE"]).optional(),
    reference: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    dateReglement: z.string().min(1, "Date de règlement invalide").optional(),
});

export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

// ─── Mouvements de stock ──────────────────────────────────────────────────────

/**
 * POST /api/products/[id]/stock-movements — `hooks/use-stock-movements.ts`
 * (`useCreateStockMovement`) ← `components/produits/adjust-stock-dialog.tsx`
 * (`quantite` envoyée en nombre, d'où `z.coerce.number()`).
 * `referenceType` reste figé sur « INVENTAIRE » côté handler : non déclaré ici
 * → impossible de l'injecter.
 */
export const stockMovementCreateSchema = z.object({
    type: z.enum(["ENTREE", "SORTIE", "AJUSTEMENT"]),
    quantite: z.coerce.number().positive("Quantité doit être positive"),
    notes: z.string().optional(),
    supplierId: z.string().nullable().optional(),
    purchasePrice: z.coerce.number().min(0, "Prix d'achat invalide").nullable().optional(),
});

export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>;
