# Audit Complet — Module Facture

**Date** : 2026-09-20
**Scope** : API routes, hooks, stores, composants, types, schema Zod, Prisma schema
**Verdict global** : 0 erreur TS dans le module, 0 violation `any`, 2 `useEffect` (1 justifie, 1 duplique), 2 `as never` dans le store, 2 bugs fonctionnels, 2 duplications

---

## 1. Vue d'ensemble

### Fonctionnalites couvertes
- Cycle de statuts : BROUILLON -> ENVOYEE -> PAYEE / PARTIELLE / EN_RETARD -> ANNULEE
- CRUD complet (GET list, POST create, GET detail, PATCH status, DELETE)
- Gestion des paiements (enregistrement via `/api/payments`)
- Multi-devises (TND, EUR, USD) avec taux de change externe
- BC Vise Sous Douane (numero SN, poids, colis, devise etrangere)
- Retenue a la source (taux par client)
- FODEC (taxe sur les operations financieres)
- PDF / Impression avec buildDocumentHTML
- Optimistic updates via TanStack Query
- Statistiques agregees (total facture, encaisse, en attente, en retard)

### Fichiers principaux (16 fichiers)

| Categorie | Fichiers |
|-----------|----------|
| API Routes | `app/api/invoices/route.ts` (GET+POST), `app/api/invoices/[id]/route.ts` (GET+PATCH+DELETE) |
| Composants | `factures-client.tsx`, `facture-detail-client.tsx`, `facture-detail-info.tsx`, `facture-detail-lines.tsx`, `facture-detail-sidebar.tsx`, `facture-detail-actions.tsx`, `nouvelle-facture-client.tsx`, `nouvelle-facture-actions.tsx`, `invoice-form-lines.tsx`, `invoice-form-bc-vise.tsx`, `payment-dialog.tsx`, `invoice-detail-skeleton.tsx` |
| Hooks | `hooks/use-invoices.ts`, `hooks/use-invoices-search.ts` |
| Stores | `lib/stores/invoices-store.ts` (3 stores: list, form, payment) |
| Types | `lib/types/invoice.ts` |
| Validation | `lib/schemas.ts` (invoiceSchema L104-121, invoiceLineSchema L89-98) |
| Prisma | `prisma/schema.prisma` — models `Invoice` (L521-566) et `InvoiceLine` (L568-587) |

### Dependances avec autres modules
- **Clients (Tiers)** : selection client, verification blocage (`assertClientNonBloque`), exoneration TVA, taux retenue
- **Produits** : selection dans `InvoiceFormLines` via `useProducts()`, variantes via `VariantSelect`
- **Paiements** : enregistrement via `useCreatePaymentMutation` vers `/api/payments`
- **Effets / Cheques** : lies aux paiements, affichage dans le detail
- **Societe** : prefixe auto-genere (`prefixeFacture`), type (OFFSHORE/LOCAL) pour BC Vise
- **Parametres** : `useSettings()` pour le PDF
- **Taux de change** : API externe `open.er-api.com` via `useExchangeRate`
- **Stock** : mouvements de stock via `handleSaleStockMovement` lors changement de statut
- **Devis** : conversion devis vers facture (module externe)
- **Bons de commande** : BC Vise lie aux factures

---

## 2. Audit Code

### 2.1 API Routes

#### `app/api/invoices/route.ts` — GET (list) + POST (create)

**GET** (L11-138)
- ✅ Wrapper `apiRoute.get` avec permission `factures:voir` et `requireCompany: true`
- ✅ Recherche par numero/client avec `mode: "insensitive"`
- ✅ Filtrage par statut
- ✅ Agregation parallele des stats via `Promise.all` (L106-122)
- ✅ Serialisation des Decimals via `serializeDecimals`
- ⚠️ **L169** : `return NextResponse.json({ error: "Societe introuvable" }, { status: 400 })` — ne utilise pas `errorResponse()` contrairement aux autres routes. Incoherence de format d'erreur.
- ⚠️ **L170** : `const prefix = company?.prefixeFacture ?? "FAC"` — le `?.` est redondant car `company` vient d'etre verifie non-null a L169.

**POST** (L140-259)
- ✅ Wrapper `apiRoute.post` avec permission `factures:creer`
- ✅ Validation Zod via `invoiceSchema`
- ✅ Verification client non bloque (`assertClientNonBloque`)
- ✅ Generation numero auto via `nextNumber`
- ✅ Calcul precis avec `Big.js` (pas de `parseFloat` pour l'arithmetique)
- ✅ Serialisation des Decimals
- ⚠️ **L213-217** : Logique conditionnelle imbriquee pour `computedMontantTND` — difficile a lire. Pourrait etre extraite dans une fonction helper.

#### `app/api/invoices/[id]/route.ts` — GET + PATCH + DELETE

**GET** (L10-38)
- ✅ Wrapper `apiRoute.get` avec permission `factures:voir`
- ✅ Verification `companyId` pour isolation multi-tenant
- ✅ Include relationnel complet (tiers, lines, payments)

**PATCH** (L40-94)
- ✅ Wrapper `apiRoute.patch` avec permission `factures:modifier`
- ✅ Validation des transitions de statut via `isValidInvoiceTransition`
- ✅ Messages d'erreur informatifs avec transitions autorisees
- ✅ Mouvements de stock via `handleSaleStockMovement`
- **[BUG]** L84-86 : `prisma.invoice.update` ne met a jour QUE le champ `status`, meme si `body` contient d'autres champs. Le PATCH est partiel — toute modification autre que le statut est ignoree silencieusement.
- ⚠️ **L86** : `data: { status: status as InvoiceStatus }` — le cast est necessaire car `status` vient de `body`. Pourrait etre type via Zod.

**DELETE** (L96-111)
- ✅ Wrapper `apiRoute.delete` avec permission `factures:supprimer`
- ✅ Verification existence et isolation
- ⚠️ Pas de verification que la facture n'a pas de paiements lies avant suppression.
- ⚠️ Pas de verification que la facture n'est pas en statut PAYEE.

### 2.2 Hooks / State

#### `hooks/use-invoices.ts`

**`useInvoiceSearchDebounce`** (L28-40)
- ✅ Debounce 300ms via `useRef` + `setTimeout`
- ✅ Cleanup au demontage
- **[DUP]** Meme logique que `useInvoicesSearch` dans `hooks/use-invoices-search.ts` (voir Section 4)

**`useInvoiceList`** (L58-75)
- ✅ TanStack Query avec queryKey structuree
- ✅ `placeholderData: (prev) => prev` pour eviter le flash de chargement
- ✅ `fetch()` uniquement dans `queryFn` (conforme aux regles)

**`useInvoiceDetail`** (L79-90)
- ✅ Query conditionnelle via `enabled: !!id`
- ✅ `handleApiResponse` pour la gestion d'erreurs

**`useExchangeRate`** (L94-106)
- ✅ `staleTime: 300_000` (5 min) pour eviter les appels repeter
- ✅ `retry: 1` pour la robustesse
- ⚠️ **L98** : Appel a une API externe (`open.er-api.com`) directement dans le hook. Si l'API est indisponible, pas de fallback.

**`useInvoiceMutations`** (L110-257)
- ✅ Optimistic UI pour create, updateStatus, delete
- ✅ Rollback en cas d'erreur
- ✅ Invalidation des queries liees au dashboard
- ⚠️ **L116** : `mutationFn: async (data: Record<string, unknown>)` — le parametre est `Record<string, unknown>` au lieu d'un type specialise. Perte de type safety.
- ⚠️ **L133** : `tiersId: (data.tiersId as string) ?? ""` — cast necessaire a cause du type `Record<string, unknown>`.
- ⚠️ **L276, L282** : `data.invoiceId as string` et `variables.invoiceId as string` — casts necessaires a cause du type `Record<string, unknown>`.

**`useCreatePaymentMutation`** (L261-289)
- ✅ Invalidation des queries liees
- **[WARNING]** Pas de rollback en cas d'erreur (pas de `onMutate` retour avec `previous`)
- ⚠️ **L266** : `mutationFn: async (data: Record<string, unknown>)` — meme probleme de type que ci-dessus.

#### `hooks/use-invoices-search.ts`

- **[DUP]** 100% redondant avec `useInvoiceSearchDebounce` dans `use-invoices.ts` (voir Section 4)
- ⚠️ Hook orphelin — pas utilise par aucun composant

### 2.3 Stores

#### `lib/stores/invoices-store.ts`

**`useInvoicesStore`** (L8-26)
- ✅ Store Zustand pour l'etat de la liste (search, status filter)
- ✅ Interface typée `InvoicesState`
- ✅ Action `resetFilters` pour la reinitialisation

**`useInvoiceFormStore`** (L30-166)
- ✅ Store Zustand pour le formulaire de creation
- ✅ Interface `InvoiceLineForm` bien typee
- ✅ `defaultLine()` avec `crypto.randomUUID()`
- ⚠️ **L118** : `setTiersId` reinitialise les champs BC Vise — logique metier dans le store (peut surprendre).

**`usePaymentFormStore`** (L170-202)
- ✅ Store Zustand pour le formulaire de paiement
- ✅ `setOpen` avec reset conditionnel du formulaire
- ⚠️ **L199** : `value as never` — cast pour contourner la restriction TypeScript sur l'index signature. Fonctionnel mais pas ideal pour la type safety.
- ⚠️ **L176** : `PaymentFormData.methode` est limite a 3 valeurs mais le composant `payment-dialog.tsx` affiche ces options via un tableau hardcode (L96). Risque de divergence si un mode est ajoute.

### 2.4 Types / Validation

#### `lib/types/invoice.ts`
- ✅ Interfaces bien structurees avec tous les champs Prisma
- ✅ Utilisation de types existants (`SerializedTiers`, `SerializedProduct`, `SerializedPayment`)
- ⚠️ **L44, L65-66** : `dateEmission: Date`, `createdAt: Date`, `updatedAt: Date` — ces types sont `Date` mais apres serialisation JSON, ils deviennent des strings. Risque de runtime error si non traite.

#### `lib/schemas.ts` — `invoiceSchema` (L104-121)
- ✅ Validation complete avec Zod
- ✅ Champs requis et optionnels bien definis
- ✅ `z.coerce.number()` pour les champs numeriques
- ✅ `min(1)` pour `lines` et `tiersId`
---

## 3. Audit UI / Composants

### `factures-client.tsx` — Liste des factures
- ✅ DataTable avec colonnes definies (L32-274)
- ✅ Statistiques en haut via `StatCard`
- ✅ Filtrage par statut via `FacetedFilterDef`
- ✅ Empty state avec illustration
- ✅ Skeleton de chargement
- ⚠️ **L87-237** : La colonne `paymentStatus` fait ~150 lignes de logique inline. Devrait etre un composant separe (`PaymentStatusCell`).
- ⚠️ **L305** : Le bouton d'actions (MoreHorizontal) n'a pas d'etat disabled/loading.
- ⚠️ **L349-360** : Le bouton "Supprimer" n'a pas de confirmation dialog — suppression directe au clic.

### `facture-detail-client.tsx` — Detail facture
- ✅ Layout responsive (grid 3 colonnes)
- ✅ KPI cards (Total TTC, Paye, Reste, Retenue)
- ✅ Sous-composants bien decoupes (Info, Lines, Sidebar, Actions)
- ✅ Gestion du loading via skeleton
- ⚠️ **L37-45** : Cast inline du client `as { raisonSociale: string; ... }` — devrait utiliser un type dedie.

### `facture-detail-actions.tsx` — Actions du detail
- ✅ Boutons contextuels selon le statut
- ✅ Loading state via `isPending`
- ⚠️ **L81** : Le bouton "Marquer Payee" a des classes hardcodees (`bg-emerald-600 hover:bg-emerald-700`) au lieu d'utiliser une variante de bouton existante.

### `facture-detail-info.tsx` — Informations
- ✅ Layout en grille 2 colonnes
- ✅ Barre de progression avec couleurs conditionnelles
- ✅ Notes conditionnelles

### `facture-detail-lines.tsx` — Lignes + Paiements
- ✅ Table avec toutes les colonnes
- ✅ Badge pour la methode de paiement
- ✅ Affichage conditionnel de la section paiements

### `facture-detail-sidebar.tsx` — Sidebar
- ✅ Card Client avec infos completes
- ✅ Card BC Vise conditionnelle
- ✅ Card Recapitulatif avec calculs
- ✅ Affichage devise etrangere avec conversion TND
- ⚠️ **L159+L162** : Double `<Separator />` — probablement une erreur (doublon visuel).

### `nouvelle-facture-client.tsx` — Formulaire de creation
- ✅ Layout en grille 2 colonnes
- ✅ Combobox client avec recherche
- ✅ Affichage badges TVA/RS du client
- ✅ Recapitulatif dynamique
- **[BUG]** L46-48 : Appel a `form.setTauxChange(exchangeRate)` pendant le rendu (pas dans un `useEffect` ni un callback). Cela provoque un re-render a chaque fois que le taux change, potentiellement un loop infini.
- **[BUG]** L77-84 : Appel a `form.setMontantTND(computed)` pendant le rendu — meme probleme que ci-dessus.

### `nouvelle-facture-actions.tsx` — Actions de creation
- ✅ Validation cote client (tiersId, lines)
- ✅ Deux options : Brouillon / Creer et Envoyer
- ✅ Loading state via `isPending`
- ⚠️ **L45-55** : La validation est basique (pas de Zod cote formulaire). Le schema Zod cote API peut rejeter des values validees cote client.

### `payment-dialog.tsx` — Dialog de paiement
- ✅ Formulaire complet (montant, methode, reference, date)
- ✅ Tooltip d'aide pour les modes de paiement
- ✅ Validation basique (montant > 0)
- ⚠️ **L66** : Pas de validation en temps reel du montant (pas de borne max).

### `invoice-form-lines.tsx` — Lignes du formulaire
- ✅ Table editable avec toutes les colonnes
- ✅ Selecteur produit avec variantes
- ✅ Calcul HT en temps reel
- ✅ Suppression de ligne desactivee si derniere ligne
- ⚠️ Pas de validation des champs numeriques (quantite, prix) cote formulaire.

### `invoice-form-bc-vise.tsx` — BC Vise
- ✅ Switch pour activer/desactiver
- ✅ Champs conditionnels (SN, date, poids, devise, taux)
- ✅ Selecteur de devise

### `invoice-detail-skeleton.tsx` — Skeleton
- ✅ Layout similaire a la page reelle
- ✅ Placeholder pour KPI cards, sidebar, lignes

---

## 4. Bugs identifies

| # | Severite | Fichier | Ligne | Description |
|---|----------|---------|-------|-------------|
| 1 | **BUG** | `app/api/invoices/[id]/route.ts` | L84-86 | PATCH ne met a jour que le champ `status`. Toute tentative de modifier d'autres champs (notes, dateEcheance, etc.) est ignoree silencieusement. Le `body` est parse mais jamais applique. |
| 2 | **BUG** | `nouvelle-facture-client.tsx` | L46-48 | `form.setTauxChange(exchangeRate)` appele pendant le rendu du composant. En React, les appels directs a des setters d'etat pendant le render (hors useEffect/callback) causent des re-renders en boucle. Doit etre deplace dans un `useEffect` avec justification ou un callback. |
| 3 | **BUG** | `nouvelle-facture-client.tsx` | L77-84 | `form.setMontantTND(computed)` appele pendant le rendu — meme probleme que le bug #2. |
| 4 | **WARNING** | `hooks/use-invoices.ts` | L261-289 | `useCreatePaymentMutation` n'a pas de `onMutate` avec rollback. Si l'API echoue, l'UI n'est pas restauree (pas de optimistic update, mais les queries sont invalidatees avant confirmation). |
| 5 | **WARNING** | `app/api/invoices/[id]/route.ts` | L96-111 | DELETE ne verifie pas si la facture a des paiements lies ni si elle est en statut PAYEE. |

---

## 5. Violations CODE RULES

### `any` (explicite ou implicite)
- ✅ **CLEAN** — Aucun `any` detecte dans les fichiers modifies du module (grep `: any`, `as any`, `<any>`, `any[]`, `Record<string, any>` = 0 match).

### `useEffect` sans justification
- ⚠️ `hooks/use-invoices.ts` L33 — `useEffect` dans `useInvoiceSearchDebounce`. **JUSTIFIE** : debounce de l'input de recherche — synchronisation d'un etat client (searchInput) vers un autre (searchQuery) avec delai. Conforme car ce n'est ni du data-fetching ni de la synchronisation serveur.
- ⚠️ `hooks/use-invoices-search.ts` L10 — `useEffect` identique. **NON JUSTIFIE** car c'est une duplication du hook ci-dessus. Ce hook est orphelin (pas importe par composant).
- **[BUG]** `nouvelle-facture-client.tsx` L46-48, L77-84 — Appels a `setTauxChange`/`setMontantTND` pendant le render **SANS useEffect**. C'est un pattern incorrect (appel direct au render) qui aurait du etre dans un `useEffect` avec dependencies, ou mieux, un calcul derive au rendu.

### `fetch()` direct dans un composant
- ✅ **CLEAN** — Tous les `fetch()` sont dans les hooks (`use-invoices.ts`) dans les fonctions `queryFn`/`mutationFn` de TanStack Query. Aucun `fetch()` dans un composant React.

### Nouvelle route API sans `apiRoute`
- ✅ **CLEAN** — Les deux routes (`/api/invoices/route.ts` et `/api/invoices/[id]/route.ts`) utilisent le wrapper `apiRoute` pour toutes les methodes (GET, POST, PATCH, DELETE).

### Schema Prisma sans migration
- ✅ **CLEAN** — `npx prisma migrate status` : "Database schema is up to date!" (17 migrations, aucune en attente).

### `as never` dans le store
- ⚠️ `lib/stores/invoices-store.ts` L199 — `value as never` dans `usePaymentFormStore.setField`. Fonctionnel mais bypass la type safety. Alternative : typer correctement avec une map de types ou `Record<string, string>`.
---

## 6. Ameliorations suggerees

### Priorite HAUTE (bugs / securite)

1. **[BUG] Patch partiel** (`app/api/invoices/[id]/route.ts` L84-86) — Appliquer le spread du body pour les champs autorises (notes, dateEcheance, etc.) en plus du `status`. Ou lever une erreur explicite si des champs inconnus sont envoyes.

2. **[BUG] Setters pendant le render** (`nouvelle-facture-client.tsx` L46-48, L77-84) — Deplacer `form.setTauxChange(exchangeRate)` et `form.setMontantTND(computed)` dans un `useEffect` avec `[exchangeRate, form.bcViseActif, form.devise]` comme dependencies. Mieux : calculer `montantTND` au moment du submit plutot que de le stocker dans le store.

3. **DELETE sans garde** (`app/api/invoices/[id]/route.ts` L96-111) — Ajouter une verification : si `existing.status === "PAYEE"` ou `existing.payments.length > 0`, refuser la suppression.

### Priorite MOYENNE (type safety / architecture)

4. **Type safety des mutations** (`hooks/use-invoices.ts`) — Remplacer `Record<string, unknown>` par des interfaces dediees (`CreateInvoiceInput`, `UpdateStatusInput`, `CreatePaymentInput`) pour eliminer les casts `as string` dans les optimistic updates.

5. **Duplication hook search** (`hooks/use-invoices-search.ts`) — Supprimer `use-invoices-search.ts` (orphelin, 100% redondant avec `useInvoiceSearchDebounce` dans `use-invoices.ts`).

6. **Type dedie client** (`facture-detail-client.tsx` L37-45) — Creer un type `InvoiceClientInfo` au lieu du cast inline `as { raisonSociale: string; ... }`.

7. **Rollback payment** (`hooks/use-invoices.ts` L261-289) — Ajouter un `onMutate` avec rollback dans `useCreatePaymentMutation` pour etre coherent avec les autres mutations.

### Priorite BASSE (qualite code / UX)

8. **Extraire PaymentStatusCell** (`factures-client.tsx` L87-237) — La colonne `paymentStatus` fait ~150 lignes. Extraire dans un composant `PaymentStatusCell` pour la lisibilite.

9. **Separator double** (`facture-detail-sidebar.tsx` L159+L162) — Supprimer le doublon.

10. **Confirmation delete** (`factures-client.tsx` L349-360) — Ajouter un `AlertDialog` avant la suppression.

11. **ErrorResponse** (`app/api/invoices/route.ts` L169) — Utiliser `errorResponse()` au lieu de `NextResponse.json({ error: ... })` pour la cohérence.

12. **as never** (`lib/stores/invoices-store.ts` L199) — Remplacer par un typage correct : `Record<keyof PaymentFormData, string>` ou un generic setter type-safe.

13. **Validation formulaire** (`nouvelle-facture-actions.tsx`) — Utiliser le meme schema Zod que l'API pour la validation cote client (partage du schema).

14. **Hardcoded classes** (`facture-detail-actions.tsx` L81) — Utiliser une variante de bouton existante (`variant="success"`) au lieu de classes CSS hardcodees.

---

## 7. Liaison avec autres modules

| Module | Type de liaison | Fichiers lies |
|--------|----------------|---------------|
| **Clients (Tiers)** | Selection, verification blocage, exoneration TVA, taux retenue | `nouvelle-facture-client.tsx` (Combobox), `facture-detail-sidebar.tsx` (affichage), `app/api/invoices/route.ts` (assertClientNonBloque) |
| **Produits** | Selection dans formulaire, variantes | `invoice-form-lines.tsx` (ProductSelect, VariantSelect) |
| **Paiements** | Enregistrement depuis detail facture | `hooks/use-invoices.ts` (useCreatePaymentMutation), `payment-dialog.tsx` |
| **Effets** | Liés aux paiements, affichage detail | `factures-client.tsx` L92-101 (effets lies) |
| **Cheques** | Liés aux paiements, affichage detail | `factures-client.tsx` L93-101 (cheques lies) |
| **Societe** | Prefixe auto, type OFFSHORE/LOCAL | `app/api/invoices/route.ts` L168-170 (company.prefixeFacture), `nouvelle-facture-client.tsx` L40 (companyType) |
| **Parametres** | PDF / Impression | `facture-detail-client.tsx` L27-28 (useSettings) |
| **Taux de change** | API externe | `hooks/use-invoices.ts` L94-106 (useExchangeRate) |
| **Stock** | Mouvements lors changement statut | `app/api/invoices/[id]/route.ts` L71-82 (handleSaleStockMovement) |
| **Devis** | Conversion devis -> facture | Module externe (devis-detail-client.tsx) |
| **Bons de commande** | BC Vise | `invoice-form-bc-vise.tsx`, `facture-detail-sidebar.tsx` L65-103 |
| **Dashboard** | Stats agregees | `hooks/use-invoices.ts` L176-178 (invalidation dashboard queries) |
