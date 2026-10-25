# Module : CRM (Tiers)

## Fonctionnalités

- **Tiers** : modèle unique Client / Fournisseur (`isClient`, `isFournisseur`), avec code, raison sociale, matricule fiscal, contacts.
- **Paramètres commerciaux** : assujettissement TVA, exonération, taux de retenue, limite de crédit, blocage (`dateBlocage`), devise.
- **Utilisation** : lié aux factures, devis, achats, bons, effets, exports, produits, matières premières, ordres de fabrication.

## Modèles de données (Prisma)

- `Tiers` (+ relations vers les documents et modules métier).

## Types (lib/types/client.ts)

- `SerializedTiers` — modèle complet sérialisé pour le client
- `TiersDetailStats` — statistiques détaillées (CA, payé, impayé)
- `TiersDocument` — document lié (devis/BC/BL/facture/avoir)
- `TiersSoldeEntry` / `TiersSoldeResponse` — mouvements Grand Livre
- `TiersBlocageInfo` — état de blocage crédit
- `TiersDocumentSummary` — résumé de document (id, numéro, date, totalTTC, statut)
- `TiersDocumentsResponse` — réponse API documents (devis, BC, BL, factures, avoirs)

## Fichiers clés

- `app/api/clients/`, `app/api/fournisseurs/` — CRUD par rôle
- `app/api/clients/[id]/route.ts` — GET (détail), PATCH (modification), DELETE
- `app/api/clients/[id]/documents/route.ts` — GET (devis/BC/BL/factures/avoirs)
- `app/api/clients/[id]/solde/route.ts` — GET (Grand Livre)
- `app/api/clients/[id]/detail/route.ts` — GET (stats détaillées + blocage)
- `app/api/clients/[id]/credit-limit/route.ts` — PATCH (limite crédit)
- `app/api/clients/[id]/envoyer-rappel/` — envoi d'un rappel de solde par email
- `app/(app)/clients/`, `app/(app)/fournisseurs/` — pages UI
- `components/clients/client-dialog.tsx` — dialog création/modification
- `components/clients/clients-client.tsx` — DataTable listing
- `components/clients/client-detail-client.tsx` — page détail
- `hooks/use-clients.ts` — TanStack Query (list, mutations, detail, solde, documents, blocage)
- `lib/stores/clients-store.ts` — Zustand (search, dialogs)
- `lib/schemas.ts` — `tiersSchema` (Zod v4)
- `lib/types/client.ts` — types sérialisés

## Migration `apiRoute` — P1-5 Groupe 1 (2026-09-27)

Les **8 routes** `app/api/clients/**` passent désormais par le wrapper `lib/api-route.ts` (`apiRoute.get/post/patch/delete`). Plus aucune ne réimplémente `getSessionFromRequest` + `checkPermission` : le wrapper gère le 401 (session absente), la permission et le `catch` global → 500.

| Fichier (route) | Méthode → `permission` | Statuts / corps conservés |
| --- | --- | --- |
| `app/api/clients/route.ts` | GET → `clients:voir` ; POST → `clients:creer` | 200 `{clients, stats}` ; **201** `{client}` (NextResponse explicite, le wrapper rendrait 200), **400** « Données invalides », **409** « Code ou matricule fiscal déjà utilisé » (catch `P2002` conservé dans le handler), 500 (wrapper) |
| `app/api/clients/[id]/route.ts` | GET → `clients:voir` ; PATCH → `clients:modifier` ; DELETE → `clients:supprimer` | 200 `{client, invoices}` / `{client}` / `{success:true}` ; **404** « Client introuvable » ; **400** validation ; **409** `P2002` (catch conservé) ; **409** « factures actives » ; il n'existe **pas de PUT** (PATCH seul, conforme à `hooks/use-clients.ts`) |
| `app/api/clients/[id]/detail/route.ts` | GET → `clients:voir` | 200 `{client, stats, blocage}` ; **404** « Client introuvable » |
| `app/api/clients/[id]/documents/route.ts` | GET → `clients:voir` | 200 `{devis, bonsCommandes, bonsLivraison, factures, avoirs}` |
| `app/api/clients/[id]/solde/route.ts` | GET → `clients:voir` | 200 `{entries, totalDebit, totalCredit, soldeFinal}` |
| `app/api/clients/[id]/check-blocage/route.ts` | POST → `clients:voir` | 200 `{…result, message}` |
| `app/api/clients/[id]/credit-limit/route.ts` | PATCH → `clients:modifier` | 200 `{client}` ; **400** « Données invalides » |
| `app/api/clients/[id]/envoyer-rappel/route.ts` | POST → `clients:modifier` | 200 `{success, message}` ; **404** « Client introuvable » ; **400** « Ce client n'a pas d'adresse email » ; **500** « Erreur lors de l'envoi de l'email » (géré **dans** le handler, jamais absorbé par le catch global) |

Décisions :

- **`requireCompany` NON activé** sur les 8 routes (`grep -rn "companyId" app/api/clients` → **0**) : le modèle `Tiers` est volontairement **global** (voir `docs/wiki/audit-scope-multi-societe.md`) — ajouter un filtrage `companyId` casserait ce comportement voulu.
- **`try/catch` locaux** : conservés uniquement là où ils portent une logique métier — `P2002` → 409 (POST `/clients`, PATCH `/clients/[id]`) et l'envoi d'email (`envoyer-rappel`, dont le 500 métier reste un `return` du handler) ; supprimés partout où ils ne faisaient que le 500 générique « Erreur serveur », désormais couvert + journalisé (tag = permission) par le wrapper.
- Aucun `any` / `@ts-ignore` ; `params` est fourni typé `Record<string, string>` par le wrapper ; imports morts (`getSessionFromRequest`, `checkPermission`, `NextRequest`, destructuration `session`) supprimés.

## Notes

- `code` et `email` sont indexés ; `matriculeFiscal` unique.
- Un tiers peut être à la fois client et fournisseur.
- La route API update utilise PATCH (pas PUT) — cohérence avec le hook `use-clients.ts`.
- Le hook `useClientDocuments` utilise `TiersDocumentsResponse` (pas `any[]`).