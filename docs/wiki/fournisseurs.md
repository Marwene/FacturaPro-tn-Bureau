# Module : Fournisseurs

## Fonctionnalités

- **Liste fournisseurs** : recherche (debounce 500ms), statuts (actif/inactif), colonnes (code, raison sociale, matricule fiscal, ville, contact, personne, statut). Page Server Component, client logic dans `components/fournisseurs/fournisseurs-main-client.tsx` + `fournisseurs-client.tsx`.
- **CRUD** : création/édition via `FournisseurDialog`, suppression avec confirmation.
- **Détail fournisseur** : stats (achats TTC, payé, impayé, avoirs), documents (achats, avoirs), grand livre (mouvements, solde), échéances (en retard, à venir, plus tard).
- **Intégration** : lié aux achats, avoirs, effets, bons de commande, factures, trésorerie.

## Modèles de données (Prisma)

- `Tiers` (modèle unique Client/Fournisseur, champs `isClient`, `isFournisseur`).
- `ProductSupplier` — liaison produit/fournisseur avec prix d'achat, référence, flag `isDefault`.
- `ProductSupplierPriceHistory` — historique des changements de prix d'achat (champs: `purchasePrice`, `changedAt`, `changedBy`, `reason`). Relation one-to-many avec `ProductSupplier` (cascade delete).
- Relations : `Achat`, `Avoir`, `Effet`, `BonCommande`, `Facture`.

## Types (lib/types/client.ts)

- `SerializedTiers` — modèle complet sérialisé pour le client/fournisseur.
- `TiersDetailStats`, `TiersDocument`, `TiersSoldeEntry`, `TiersSoldeResponse`, `TiersBlocageInfo`, `TiersDocumentSummary`, `TiersDocumentsResponse`.

## Types spécifiques fournisseurs (hooks/use-fournisseurs.ts)

- `FournisseurDetailResponse` — réponse du détail (fournisseur + stats).
- `FournisseurAchatSummary`, `FournisseurAvoirSummary` — résumés de documents.
- `FournisseurDocumentsResponse` — liste achats + avoirs.
- `FournisseurSoldeEntry`, `FournisseurSoldeResponse` — mouvements grand livre.
- `FournisseurEcheanceItem`, `FournisseurEcheancesResponse` — échéances.

## Fichiers clés

- `app/api/fournisseurs/` — CRUD fournisseurs.
- `app/api/fournisseurs/[id]/detail/route.ts` — GET (stats détaillées).
- `app/api/fournisseurs/[id]/documents/route.ts` — GET (achats + avoirs).
- `app/api/fournisseurs/[id]/solde/route.ts` — GET (grand livre).
- `app/api/fournisseurs/[id]/echeances/route.ts` — GET (échéances).
- `hooks/use-fournisseurs.ts` — hooks TanStack Query (`useFournisseursList`, `useFournisseursMutations`, `useFournisseurDetail`, `useFournisseurDocuments`, `useFournisseurSolde`, `useFournisseurEcheances`, `useFournisseursSearchDebounce`).
- `lib/stores/fournisseurs-store.ts` — store Zustand (recherche, édition, suppression).
- `components/fournisseurs/fournisseur-dialog.tsx` — formulaire création/édition.
- `components/fournisseurs/fournisseurs-client.tsx` — liste + actions.
- `components/fournisseurs/fournisseur-document.tsx` — affichage documents.
- `components/fournisseurs/fournisseur-solde.tsx` — grand livre.
- `components/fournisseurs/fournisseur-echeances.tsx` — échéances.

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-fournisseurs.ts` : effet debounce 500 ms `searchInput → setSearchQuery` + `setSearchLoading` (ex-L248) **supprimé** ; `useFournisseursSearchDebounce()` vidé (appelé par `components/fournisseurs/fournisseurs-client.tsx` → **candidat à suppression**) ; `useFournisseursList` lit `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1 `hooks/use-effets.ts`).
- **Flag de chargement** : `fournisseurs-store.searchLoading` n'est plus piloté (store non modifié, champ devenu mort) → `fournisseurs-client.tsx` utilise le flag natif de la query TanStack : `loading={isFetching}` (L185) à la place de `loading={isLoading || searchLoading}` (ex-L186) — **identique en sémantique** (`isLoading ⟹ isFetching`) et **conforme au précédent frère** `components/bons-livraison/bl-client.tsx:263` qui passe déjà `loading={isFetching}` ; seul JSX touché par le lot.
- Flux inchangé : recherche serveur conservée (mécanisme différé uniquement), filtre client DataTable (`searchValue={searchInput}` / `globalFilter`) **intact**, `searchQuery` du store plus lu.

## Notes

- Module partagé avec les clients (même modèle `Tiers`, mêmes hooks de base).
- La recherche suit `searchInput` → `useDeferredValue` → `queryKey` (voir « P2-7 Lot 2 » ci-dessus) ; le `useEffect` de debounce historique a été supprimé.
- Toutes les données serveur passent par TanStack Query, état client partagé via Zustand.
- Aucun `any` dans les fichiers du module (typage strict avec interfaces dédiées).

## Règle companyId

| Données | Scope | `companyId` dans Prisma ? |
|---------|-------|--------------------------|
| **Tiers** (clients/fournisseurs) | Global | ❌ Non |
| **Achat**, **Avoir**, **MouvementFinancier**, **Effet** | Société | ✅ Oui |

- Routes CRUD fournisseurs (`GET/POST/PUT/DELETE /api/fournisseurs`) : **pas de companyId** — Tiers est global.
- Routes transactionnelles (`detail`, `documents`, `solde`, `echeances`) : **companyId requis** — agrègent des modèles sociétisés.
- Voir `docs/wiki/audit-scope-multi-societe.md` pour le détail de l'audit multi-société.
