# Audit Complet — Module Devis

**Date** : 2026-09-20  
**Scope** : API routes, hooks, stores, composants, types, schéma Zod  
**Verdict global** : 4 erreurs TypeScript dans le module, 2 violations CODE RULES  

---

## 1. Vue d'ensemble

### Fonctionnalités couvertes
- Cycle de statuts : BROUILLON → ENVOYEE → ACCEPTEE / REFUSEE → FACTUREE / EXPIREE
- CRUD complet (GET list, POST create, GET detail, PATCH status, DELETE)
- Conversion devis → facture et devis → bon de livraison
- Expiration automatique des devis (API dédiée, appelée au montage)
- Multi-devises (TND, EUR, USD) avec taux BCT automatique
- PDF / aperçu avec options (détail taxes, notes, layout brandé)
- Optimistic updates via TanStack Query

### Fichiers principaux (17 fichiers)
| Catégorie | Fichiers |
|-----------|----------|
| API Routes | `app/api/quotes/route.ts`, `[id]/route.ts`, `[id]/convert/route.ts`, `expire/route.ts` |
| Pages | `app/(app)/devis/page.tsx`, `new/page.tsx`, `[id]/page.tsx` |
| Composants | `devis-client.tsx`, `devis-detail-client.tsx`, `nouveau-devis-client.tsx`, `nouveau-devis-actions.tsx`, `devis-preview.tsx`, `devis-detail-skeleton.tsx` |
| Hooks | `hooks/use-devis.ts` |
| Stores | `lib/stores/devis-store.ts` |
| Types | `lib/types/quote.ts` |
| Schema | `lib/schemas.ts` (quoteSchema, L127-138) |

### Dépendances avec autres modules
- **Factures** : conversion via `app/api/quotes/[id]/convert/route.ts` → `prisma.invoice.create`
- **Bons de livraison** : conversion via même route → `prisma.bonLivraison.create`
- **Clients (Tiers)** : sélection client, vérification blocage (`assertClientNonBloque`), exonération TVA
- **Produits** : sélection dans `LineItemsTable` via `useProducts()`
- **Taux BCT** : hook `useDevisTauxBCT` appelle `/api/taux-bct`
- **Société** : prefixe auto-généré (`prefixeDevis`, `prefixeFacture`, `prefixeBL`)
- **Paramètres** : `useSettings()` pour le PDF

---

## 2. Audit Code

### 2.1 API Routes

#### `app/api/quotes/route.ts` — GET (list) + POST (create)

**GET** (L11-81)
- ✅ Wrapper `apiRoute.get` avec permission `devis:voir` et `requireCompany: true`
- ✅ Recherche par numéro/client avec `mode: "insensitive"`
- ✅ Pagination (`skip`/`take`) avec comptage parallèle (`Promise.all`)
- ✅ Agrégation multi-devises : somme `totalTTC` (TND) + `montantTND` (étrangers)
- ✅ KPI : taux d'acceptation, count en attente
- ✅ Sérialisation `serializeDecimals` sur la réponse

**POST** (L83-197)
- ✅ Wrapper `apiRoute.post` avec permission `devis:creer`
- ✅ Validation Zod via `quoteSchema`
- ✅ Vérification blocage client (`assertClientNonBloque`)
- ✅ Génération numéro auto via `nextNumber("quote", prefix, companyId)`
- ✅ Calcul TVA/FODEC côté serveur avec Big.js
- ✅ Gestion TVA exonérée (L112-118)
- ✅ Calcul `montantTND` pour devises étrangères
- ⚠️ **L105** : `companyId!` — non-null assertion after `company` existence check. Techniquement safe (company exists → companyId defined), mais pourrait être évité en utilisant `companyId` directement puisque `requireCompany: true` le garantit.

#### `app/api/quotes/[id]/route.ts` — GET + PATCH + DELETE

**GET** (L8-30)
- ✅ Wrapper `apiRoute.get` avec permission `devis:voir`
- ✅ Inclut `tiers` complet + `lines` avec `product`
- ✅ Vérification `companyId` (isolation multi-tenant)

**PATCH** (L32-64)
- ⚠️ **Problème de design** : PATCH ne supporte QUE le changement de statut. Le body est `const { status } = await request.json()` — si un champ `status` n'est envoyé, la route retourne 400 "Action non reconnue". C'est une API REST inutilement restrictive. La logique de mise à jour complète (notes, dates, lignes) n'est pas supportée.
- ⚠️ **L47** : validation des statuts par array hardcoded `["BROUILLON", "ENVOYEE", ...]`. Devrait être dérivée du type `QuoteStatus` ou d'un enum Zod pour éviter le drift.

**DELETE** (L66-81)
- ✅ Wrapper `apiRoute.delete` avec permission `devis:supprimer`
- ✅ Vérification existence + `companyId`
- ⚠️ **Pas de vérification de statut** : un devis FACTUREE ou ACCEPTEE peut être supprimé. Seul le frontend impose la règle (`canDelete = BROUILLON || REFUSEE || EXPIREE`), pas le backend.

#### `app/api/quotes/[id]/convert/route.ts` — POST (conversion)

- ✅ Wrapper `apiRoute.post` avec permission `devis:modifier`
- ✅ Supporte deux cibles : `invoice` et `deliveryNote`
- ✅ Vérification double conversion (`existing.invoiceId`, `existing.bonLivraisonId`)
- ✅ Calcul retenue à la source via `tiers.tauxRetenue`
- ✅ Numérotation auto via `nextNumber`
- ⚠️ **L70-83** : recalcule les totaux à partir des lignes stockées au lieu de utiliser `existing.totalHT/totalTVA`. Pas un bug (les lignes sont la source de vérité), mais diverge du pattern `POST` qui stocke les totaux calculés.
- ⚠️ **Pas de transaction Prisma** : la création facture + mise à jour quote n'est pas atomique. Si la mise à jour quote échoue, la facture existe orpheline.

#### `app/api/quotes/expire/route.ts` — POST (expiration)

- ✅ Wrapper `apiRoute.post` avec permission `devis:modifier`
- ✅ Expire les devis ENVOYEE ET BROUILLON avec dateExpiration passée
- ⚠️ **Incohérence** : expire aussi les devis BROUILLON, mais le frontend ne considère que ENVOYEE pour l'expiration (`useExpireQuotesOnMount` vérifie `q.status === "ENVOYEE"`). Les devis BROUILLON expirés par l'API ne seront pas reflectés correctement dans le optimistic update.

### 2.2 Hooks & State

#### TanStack Query (`hooks/use-devis.ts`)

**Query Keys** (L18-23)
- ✅ Pattern standardisé : `["quotes", search, status, companyId]`
- ✅ Clé dashboard séparée : `["dashboard", companyId]`

**useDevisList** (L59-79)
- ✅ Construction params dynamique
- ✅ `placeholderData: (prev) => prev` pour éviter le flash de chargement
- ✅ Type retour explicite via `handleApiResponse`

**useDevisDetail** (L83-94)
- ✅ `enabled: !!id` — pas de fetch si pas d'id
- ✅ Include tiers complet

**useDevisMutations** (L98-292)
- ✅ Optimistic updates sur toutes les mutations
- ✅ Rollback `onError`
- ✅ Invalidation large (`["quotes"]`) pour couvrir tous les filtres
- ✅ Invalidation dashboard après chaque mutation

**useExpireQuotesOnMount** (L296-305)
- ⚠️ **`useEffect` sans justification écrite** — le code fait un `expireQuotes.mutate()` au montage du composant. C'est un side effect serveur, pas une sync avec un système externe non réactif. Devrait idéalement être un `useEffect` dans un layout ou un hook dédié avec justification, ou utiliser un mechanisme serveur (middleware, etc.).
- ⚠️ **`eslint-disable-line`** sur L305 — masque la violation de rules of hooks.

**useDevisSearchDebounce** (L27-39)
- ✅ Pattern debounce classique avec `useRef` + `setTimeout`
- ⚠️ `useEffect` utilisé pour le debounce — acceptable (c'est une synchronisation temporelle locale), mais pourrait utiliser un hook dédié comme `useDebouncedValue`.

**`Record<string, unknown>`** (L104)
- ⚠️ `mutationFn: async (data: Record<string, unknown>)` — type trop large pour le paramètre de création. Devrait utiliser `QuoteInput` (le type Zod inféré) pour la type safety.

#### Zustand Stores (`lib/stores/devis-store.ts`)

- ✅ 4 stores bien séparés : List, PrintOptions, Detail, Form
- ✅ Interface typée pour chaque store
- ✅ `reset()` sur PrintOptions et Form
- ✅ `defaultLine()` factory pour les lignes

**DevisFormState** (L76-167)
- ✅ Champs formulaire complets (tiersId, dates, lines, devise, taux, notes)
- ✅ Actions CRUD lignes (add, remove, update)
- ⚠️ **Champ `exonereTVA`** stocké dans le store mais pas dans le payload de création (`buildPayload()` dans `nouveau-devis-actions.tsx` ne l'inclut pas). Le champ est utilisé uniquement pour décider du taux TVA à envoyer côté client.

### 2.3 Types & Validation

#### Schema Zod (`lib/schemas.ts`, L127-140)

```typescript
export const quoteSchema = z.object({
    tiersId: z.string().min(1, "Tiers requis"),
    dateCreation: z.string().min(1, "Date requise"),
    dateExpiration: z.string().optional().nullable(),
    lines: z.array(invoiceLineSchema).min(1, "Au moins une ligne requise"),
    notes: z.string().optional().nullable(),
    devise: z.string().default("TND"),
    tauxChange: decimalString.optional().nullable(),
    montantTND: decimalString.optional().nullable(),
});
```

- ✅ `tiersId` requis
- ✅ `lines` avec minimum 1 ligne
- ✅ Réutilise `invoiceLineSchema` (pas de duplication)
- ⚠️ **`devise` non contraint** : `z.string().default("TND")` accepte n'importe quelle string. Devrait être `z.enum(["TND", "EUR", "USD"])`.
- ⚠️ **Pas de validation `dateCreation` en tant que date** : c'est juste `z.string().min(1)`. Le serveur fait `new Date(data.dateCreation)` sans vérifier la validité.

#### Types TypeScript (`lib/types/quote.ts`)

- ✅ Interface `SerializedQuote` complète
- ✅ Tous les champs sont explicitement typés
- ⚠️ **Champ manquant** : `bonLivraisonId` est dans le modèle Prisma mais pas dans `SerializedQuote`. La conversion → bon de livraison ne peut pas être vérifiée côté client.
- ⚠️ **Champ manquant** : `variantId` dans `SerializedQuoteLine` — le Prisma schema a `variantId String?` mais le type TS ne l'inclut pas.

---

## 3. Audit UI/Composants

### 3.1 Structure des composants

```
components/devis/
├── devis-client.tsx          (listing — 240 lignes)
├── devis-detail-client.tsx   (détail — 504 lignes)
├── devis-detail-skeleton.tsx (skeleton — 99 lignes)
├── devis-preview.tsx         (PDF dialog — 157 lignes)
├── nouveau-devis-client.tsx  (formulaire — 346 lignes)
└── nouveau-devis-actions.tsx (actions header — 86 lignes)
```

- ✅ Séparation listing / détail / création / preview
- ✅ Skeleton loading pour le détail
- ✅ Actions séparées du formulaire (`nouveau-devis-actions.tsx`)

### 3.2 UX/UI

**Listing (`devis-client.tsx`)**
- ✅ DataTable avec colonnes : N°, Client, Date, Expiration, Montant TTC, Equivalent TND, Statut, Facture
- ✅ Filtre par statut (Select)
- ✅ Recherche par numéro/client
- ✅ Actions dropdown : Voir, Envoyer, Convertir, Supprimer
- ✅ KPI cards : Total, Montant, Taux acceptation, En attente
- ✅ Loading skeleton (4 cards + table)
- ⚠️ **L153-158** : "Convertir en facture" redirige vers la page détail au lieu de déclencher la conversion directement. L'option de conversion dans le dropdown est un lien, pas une action.
- ⚠️ **Pas de confirmation** avant suppression (directement `deleteQuote.mutate` au clic)

**Détail (`devis-detail-client.tsx`)**
- ✅ Layout 70/30 (grid-cols-[1fr_320px]) avec sidebar sticky
- ✅ Page header sticky avec backdrop-blur
- ✅ Total TTC hero block (fond sombre, shadow-lg)
- ✅ Tableau lignes avec alternance bg-secondary/20
- ✅ Récapitulatif avec progression HT → Remise → TVA → FODEC → Timbre → TTC
- ✅ Actions contextuelles selon le statut (Envoyer, Accepter, Refuser)
- ✅ Toast enrichi avec actions (Voir facture après conversion)
- ✅ `active:scale-[0.96]` sur les boutons (micro-interaction)
- ⚠️ **L154** : `data.invoice.id` — erreur TypeScript (le type retour est `{ invoiceId: string }`, pas `{ invoice: { id: string } }`)

**Formulaire création (`nouveau-devis-client.tsx`)**
- ✅ Layout 2 colonnes (infos devis + client)
- ✅ Sélecteur client avec affichage badges (TVA, devise)
- ✅ `LineItemsTable` réutilisé (composant shared)
- ✅ Récapitulatif live avec remise, TVA, FODEC, timbre
- ✅ Sélecteur devise avec taux BCT automatique
- ✅ TVA exonérée gérée (taux 0, fodec désactivé)
- ⚠️ **3 `useEffect`** dans ce composant (voir section 5)

**Preview PDF (`devis-preview.tsx`)**
- ✅ Dialog avec options (tax breakdown, notes, branded)
- ✅ Prévisualisation iframe avec mise à jour live
- ✅ Options gérées via Zustand store
- ✅ Impression via `window.open` + `autoPrint`

### 3.3 Conformité design system

- ✅ Utilisation cohérente des composants shadcn (Button, Card, Table, Select, Dialog, Badge, Separator, Input, Textarea)
- ✅ Icônes lucide-react
- ✅ `tabular-nums` sur tous les montants
- ✅ `text-xs` / `text-[11px]` pour les labels de colonnes
- ✅ `rounded-lg` (10px) conforme à l'échelle
- ✅ Skeleton loading patterns
- ⚠️ Pas de `DESIGN.md` ou `PRODUCT.md` — le design system n'est pas formalisé par document. La cohérence visuelle est maintenue par convention mais peut diverger entre modules.

---

## 4. Bugs identifiés

### 🔴 Critiques (fonctionnels)

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| 1 | `devis-detail-client.tsx` | 154, 157 | **Erreur TS2551** : `data.invoice.id` — le type retour de `convertToInvoice` est `{ invoiceId: string }`, pas `{ invoice: { id: string } }`. Le code compile mais `data.invoice` est `undefined` au runtime. La navigation vers la facture après conversion échoue silencieusement. |
| 2 | `nouveau-devis-actions.tsx` | 54, 57 | **Erreur TS2339** : `data.quote.numero` et `data.quote.id` — le type retour de `createQuote` est `SerializedQuote`, pas `{ quote: SerializedQuote }`. Le toast de succès ne peut pas afficher le numéro du devis. |

### 🟠 Moyens (UX)

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| 3 | `app/api/quotes/[id]/route.ts` | 66-81 | **Suppression sans vérification de statut** — un devis FACTUREE ou ACCEPTEE peut être supprimé via l'API. La protection est uniquement frontend (`canDelete`). |
| 4 | `app/api/quotes/expire/route.ts` | 13 | **Expire aussi BROUILLON** — l'API expire les devis ENVOYEE et BROUILLON, mais le optimistic update frontend (`useExpireQuotesOnMount`) ne traite que ENVOYEE. Incohérence. |
| 5 | `hooks/use-devis.ts` | 104 | **`Record<string, unknown>`** — le paramètre de `createQuote` est trop large. N'importe quel objet est accepté, sans validation type. |
| 6 | `app/api/quotes/[id]/convert/route.ts` | 106-155 | **Pas de transaction Prisma** — création facture + mise à jour quote non atomique. Risque d'orphelin si la 2e opération échoue. |

### 🟡 Mineurs (cosmétiques)

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| 7 | `app/api/quotes/expire/route.ts` | 1 | **Imports inutilisés** : `NextRequest`, `NextResponse` (lint warning) |
| 8 | `app/api/quotes/route.ts` | 1 | **Import inutilisé** : `NextRequest` (lint warning) |
| 9 | `nouveau-devis-actions.tsx` | 9 | **Import inutilisé** : `Send` (lint warning) |
| 10 | `lib/schemas.ts` | 135 | **`devise` non contraint** — `z.string().default("TND")` au lieu de `z.enum(["TND", "EUR", "USD"])` |
| 11 | `lib/types/quote.ts` | — | **Champs manquants** : `bonLivraisonId` et `variantId` absents du type `SerializedQuote` / `SerializedQuoteLine` |

---

## 5. Violations CODE RULES

### `any` explicite/implicite
- ✅ **Aucun `any` explicite** dans les fichiers du module (grep vérifié)
- ✅ `Record<string, unknown>` utilisé à la place de `Record<string, any>` (hooks/use-devis.ts:104)
- ⚠️ **`as string` casts** multiples dans `devis-client.tsx` (L36, L58, L65, L75, L92) — ce sont des type assertions nécessaires pour le typage TanStack Table, pas des `any`. Acceptable mais pourrait être amélioré avec des generics.

### `useEffect` injustifié
- ⚠️ **`hooks/use-devis.ts:300`** — `useExpireQuotesOnMount` : `useEffect` pour déclencher une mutation serveur au montage. Pas une sync avec un système externe non réactif. **Sans justification écrite dans le plan**.
- ⚠️ **`nouveau-devis-client.tsx:29`** — Auto-remplissage date expiration : `useEffect` sur `form.dateCreation`. C'est un calcul dérivé, pas un side effect serveur. Pourrait être un calcul inline au rendu ou un handler.
- ⚠️ **`nouveau-devis-client.tsx:47`** — Sync taux BCT dans le store : `useEffect` sur `tauxBCTQuery.data`. C'est une synchronisation d'état client (Zustand) avec un résultat query. Pourrait être un calcul dérivé au rendu.
- ⚠️ **`nouveau-devis-client.tsx:93`** — Calcul `montantTND` : `useEffect` sur `tauxChange`, `devise`, `totalTTC`. C'est un calcul dérivé qui pourrait être fait au rendu sans `useEffect`.
- ✅ **`hooks/use-devis.ts:32`** — Debounce search : `useEffect` pour debounce est acceptable (synchronisation temporelle).

### fetch direct sans TanStack Query
- ✅ Tous les `fetch()` dans `hooks/use-devis.ts` sont dans des `useQuery` ou `useMutation` hooks — **pas de fetch direct dans un composant**.

### Routes API sans apiRoute wrapper
- ✅ Toutes les routes (`quotes/route.ts`, `[id]/route.ts`, `[id]/convert/route.ts`, `expire/route.ts`) utilisent `apiRoute.get/post/patch/delete`.

### Prisma migration drift
- ✅ `npx prisma migrate status` : "Database schema is up to date!" — **pas de drift**.

---

## 6. Améliorations suggérées

### Quick wins
1. **Fix erreurs TypeScript** : corriger `data.invoice.id` → `data.invoiceId` dans `devis-detail-client.tsx` L154/157, et `data.quote.numero`/`data.quote.id` → `data.numero`/`data.id` dans `nouveau-devis-actions.tsx` L54/57
2. **Nettoyer imports inutilisés** : `NextRequest`, `NextResponse`, `Send`
3. **Contraindre `devise`** : `z.enum(["TND", "EUR", "USD"])` dans le schema Zod
4. **Ajouter `bonLivraisonId` et `variantId`** aux types `SerializedQuote` / `SerializedQuoteLine`

### Améliorations moyennes
5. **Transaction Prisma** dans la route convert : `prisma.$transaction([invoice.create, quote.update])`
6. **Vérification statut backend** pour la suppression (rejeter FACTUREE/ACCEPTEE)
7. **Type `QuoteInput`** pour le paramètre de `createQuote` au lieu de `Record<string, unknown>`
8. **Aligner expire** : l'API expire BROUILLON+ENVOYEE, mais le frontend ne traite que ENVOYEE — harmoniser
9. **Remplacer les `useEffect` de calcul** par des calculs dérivés au rendu ou des handlers

### Refactoring majeur
10. **Extraire la logique de calcul financier** (Big.js) en utilitaire partagé entre POST create, PATCH detail, et convert — actuellement dupliquée entre `route.ts` (L107-153), `convert/route.ts` (L62-85), et `devis-detail-client.tsx` (L66-105)
11. **Créer un `DESIGN.md`** formalisant le design system (couleurs, espacements, patterns de composants) pour éviter la divergence entre modules

---

## 7. Liaison avec autres modules

### Factures (conversion devis → facture)
- **Route** : `app/api/quotes/[id]/convert/route.ts`
- **Mécanisme** : crée une `Invoice` à partir des lignes du devis, met à jour le statut du devis en FACTUREE, lie le `invoiceId`
- **Lien UI** : toast avec bouton "Voir facture" qui redirige vers `/factures/{id}`
- **Problème** : pas de transaction atomique (voir §4, bug #6)

### Produits (sélection dans les lignes)
- **Hook** : `useProducts()` dans `nouveau-devis-client.tsx`
- **Composant shared** : `LineItemsTable` (composant shared avec les factures)
- **Exonération TVA** : quand un client exonéré est sélectionné, les lignes existantes sont mises à jour (tauxTVA → 0, fodec → false)

### Clients (sélection client)
- **Hook** : `useClients()` dans `nouveau-devis-client.tsx`
- **Vérification blocage** : `assertClientNonBloque()` appelée côté serveur à la création
- **Auto-devise** : la devise du client pré-remplit le sélecteur de devise
- **Exonération TVA** : badges visuels + calcul adapté côté client et serveur

### Bons de commande
- **Pas de conversion directe** devis → bon de commande dans le module actuel
- **Lien indirect** : la conversion devis → facture est indépendante des bons de commande

### Bons de livraison
- **Route** : `app/api/quotes/[id]/convert/route.ts` avec `target: "deliveryNote"`
- **Mécanisme** : crée un `BonLivraison` à partir des lignes du devis, lie le `bonLivraisonId`
- **Limite** : le type `SerializedQuote` ne contient pas `bonLivraisonId` (impossible de vérifier côté UI si déjà converti en BL)

---

## 8. Résumé des métriques

| Métrique | Valeur |
|----------|--------|
| Erreurs TypeScript (module devis) | **4** (2 fichiers) |
| Warnings lint (module devis) | **4** (imports inutilisés) |
| Violations `any` | **0** |
| Violations `useEffect` (justification manquante) | **4** |
| Violations `fetch` direct | **0** |
| Violations `apiRoute` | **0** |
| Prisma drift | **0** |
| Bugs critiques | **2** |
| Bugs moyens | **4** |
| Bugs mineurs | **5** |
| Fichiers analysés | **17** |
