# Audit Complet — Module Bon de Livraison (BL)

**Date :** 2026-09-20
**Scope :** API routes, hooks, stores, types, schemas, composants UI, pages
**Agent :** QA Agent
**Statut :** Prisma up-to-date | Lint 0 errors / 6 warnings | TSC clean

---

## 1. Vue d'ensemble

Le module Bon de Livraison (BL) couvre le cycle de vie complet : création
(avec support BL Visé sous douane / SN pour les sociétés offshore), listing
avec filtres et statistiques, consultation détaillée, changement de statut
(BROUILLON → LIVRÉ → ANNULÉ), suppression, impression PDF, et conversion
en facture.

### Architecture

| Couche | Fichiers | Rôle |
|--------|----------|------|
| API Routes (2) | `bons-livraison/route.ts`, `[id]/route.ts` | CRUD + changement statut |
| Hooks (1) | `hooks/use-bl.ts` | TanStack Query (list, detail, mutations, taux BCT) |
| Stores (1) | `lib/stores/bl-store.ts` | Zustand (list filters + form state) |
| Composants (9) | `components/bons-livraison/*` | UI complète |
| Pages (3) | `app/(app)/bons-livraison/*` | Routes Next.js App Router |

### Prisma Schema — Up to date

`npx prisma migrate status` : 17 migrations trouvées, schema à jour. Aucun drift.

### Fichiers analysés (15 fichiers, ~2100 lignes)

```
API Routes (2):
  app/api/bons-livraison/route.ts                         221 lignes
  app/api/bons-livraison/[id]/route.ts                     97 lignes

Hooks (1):
  hooks/use-bl.ts                                         290 lignes

Stores (1):
  lib/stores/bl-store.ts                                  163 lignes

Composants (9):
  components/bons-livraison/bl-client.tsx                 280 lignes
  components/bons-livraison/nouveau-bl-client.tsx         248 lignes
  components/bons-livraison/nouveau-bl-actions.tsx        158 lignes
  components/bons-livraison/bl-form-vise.tsx               79 lignes
  components/bons-livraison/bl-form-lines.tsx             187 lignes
  components/bons-livraison/bl-detail-skeleton.tsx         26 lignes
  components/bons-livraison/bl-detail-sidebar.tsx         171 lignes
  components/bons-livraison/bl-detail-client.tsx          217 lignes
  components/bons-livraison/bl-detail-actions.tsx          96 lignes

Pages (3):
  app/(app)/bons-livraison/page.tsx                        23 lignes
  app/(app)/bons-livraison/nouveau/page.tsx                12 lignes
  app/(app)/bons-livraison/[id]/page.tsx                   17 lignes
```

---

## 2. Audit Code

### 2.1 API Routes

#### Points forts

- **Wrapping apiRoute** : les 2 routes (GET, POST dans `route.ts` ; GET, PATCH,
  DELETE dans `[id]/route.ts`) sont correctement wrappées par `apiRoute` avec
  permissions et `requireCompany: true`.
- **Isolation multi-tenant** : `companyId` systématiquement vérifié via le wrapper.
- **Validation Zod** : le POST utilise `blSchema.safeParse(body)` (L127-134).
- **Calculs monétaires Big.js** : POST utilise `Big` pour tous les totaux (L145-178)
  — précision correcte pour les montants tunisiens.
- **Garde client bloqué** : `assertClientNonBloque(data.tiersId)` au L138.
- **Gestion des stocks** : PATCH appelle `handleSaleStockMovement()` au L57-67
  pour mouvementer les stocks lors du changement de statut.
- **Numérotation auto** : `nextNumber("bl", prefix, companyId)` (L143).
- **Sérialisation décimales** : `serializeDecimals()` appliquée en sortie (L65, L217).

#### Violations BLOCKER

**Aucune.** Toutes les routes API utilisent `apiRoute`.

#### Bugs identifiés

**Bug1 (Warning) — `companyId!` non null assertion inutile — L143**

```typescript
// route.ts L143
const numero = await nextNumber("bl", prefix, companyId!);
```

`companyId` est déjà garanti non-null par `requireCompany: true` dans la config
`apiRoute` (L124). Le `!` est redondant mais pas dangereux. À retirer pour la
propreté du code.

**Bug2 (Warning) — Cast `as Array<Record<string, unknown>>` — route.ts L101**

```typescript
// route.ts L101
for (const bl of serialized as Array<Record<string, unknown>>) {
```

Le cast est utilisé pour accéder dynamiquement aux propriétés `blViseActif`,
`snNumero`, `tiersId`, et injecter `invoice`. C'est un pattern defensif mais
affaiblit le typage. Une meilleure approche : typer explicitement ou utiliser
`Object.assign`.

**Bug3 (Warning) — `NextRequest` importé mais non utilisé — route.ts L1, [id]/route.ts L1**

```typescript
import { NextRequest, NextResponse } from "next/server";
```

Dans les deux fichiers API, `NextRequest` n'est jamais utilisé directement —
le wrapper `apiRoute` le gère. Lint signale cette erreur (0 error, warning only).

**Bug4 (Nit) — GET BL list: pas de validation des query params `skip`/`take` — L17-18**

```typescript
// route.ts L17-18
const skip = parseInt(searchParams.get("skip") ?? "0", 10);
const take = parseInt(searchParams.get("take") ?? "50", 10);
```

Pas de bornes sur `take` — un client malveillant pourrait passer `take=100000`.
Ajouter une validation (`Math.min(take, 200)`).

**Bug5 (Warning) — Requête N+1 conditionnelle pour les factures liées — L67-108**

```typescript
// route.ts L67-108
if (blViseActif === "true") {
  const snNumbers = [...new Set(deliveryNotes.filter(...).map(...))];
  if (snNumbers.length > 0) {
    const linkedInvoices = await prisma.invoice.findMany({...});
    // ... mappe les factures sur chaque BL
  }
}
```

La requête pour les factures liées n'est exécutée que si `blViseActif=true`, mais
elle parcourt les BLs sérialisés (déjà en mémoire) pour injecter `invoice`.
C'est correct mais pourrait être déplacé dans un service dédié si le volume croît.

### 2.2 Hooks / State

#### Points forts

- **TanStack Query** : `useBLList`, `useBLDetail`, `useBLTauxBCT` utilisent
  correctement `useQuery`.
- **Mutations avec optimistic updates** : `createBL`, `updateStatus`, `deleteBL`
  ont des `onMutate` avec rollback `onError` — pattern solide.
- **Query invalidation** : tous les `onSettled` invalident les clés pertinentes
  (`bls()`, `dashboard(companyId)`).
- **Zustand** : `bl-store.ts` bien structuré en 2 stores (List + Form).
- **Debounce search** : `useBLSearchDebounce()` utilise `useRef` + `setTimeout`
  — pattern standard.

#### Violations BLOCKER

**Aucune.** Tous les fetches passent par TanStack Query. Pas de `fetch()` direct
dans un composant.

#### Bugs identifiés

**Bug6 (Warning) — `useEffect` sans justification claire — use-bl.ts L88-92**

```typescript
// use-bl.ts L88-92
useEffect(() => {
  if (query.data) setTauxChange(query.data);
}, [query.data, setTauxChange]);
```

Ce `useEffect` synchronise le résultat du query TanStack vers le store Zustand.
C'est un pattern « bridge » courant mais techniquement un anti-pattern :
le store devrait être mis à jour via `onSuccess` du query ou un sélecteur dérivé.
Cependant, dans ce contexte (taux BCT externe → form store), c'est tolérable
car c'est une synchronisation avec un système externe non réactif (API BCT).
**Verdict : justifié mais fragile.**

**Bug7 (Warning) — `useEffect` debounce search — use-bl.ts L30-36**

```typescript
// use-bl.ts L30-36
useEffect(() => {
  if (ref.current) clearTimeout(ref.current);
  ref.current = setTimeout(() => setSearchQuery(searchInput), 300);
  return () => { if (ref.current) clearTimeout(ref.current); };
}, [searchInput, setSearchQuery]);
```

Ce `useEffect` est un debounce de recherche. Il est techniquement justifié
(c'est une synchronisation timer, pas du data-fetching), mais le pattern
pourrait être remplacé par un hook `useDebouncedValue` plus réutilisable.
**Verdict : justifié.**

**Bug8 (Warning) — `useEffect` montantTND — nouveau-bl-client.tsx L92-106**

```typescript
// nouveau-bl-client.tsx L92-106
useEffect(() => {
  if (form.blViseActif && form.devise !== "TND" && form.tauxChange && totalTTC.gt(0)) {
    const tc = parseTunisianNumber(form.tauxChange)
    if (tc && tc > 0) {
      const computed = totalTTC.times(new Big(tc)).toFixed(3)
      if (computed !== form.montantTND) {
        form.setMontantTND(computed)
      }
    }
  } else if (...) {
    if (form.montantTND !== "") form.setMontantTND("")
  }
}, [totalTTC.toFixed(3), form.tauxChange, form.blViseActif, form.devise])
```

Ce `useEffect` calcule `montantTND` en fonction de `totalTTC` et du taux de change.
C'est un calcul dérivé qui pourrait idéalement être un sélecteur Zustand dérivé
ou un `useMemo`. L'ESLint signale des dependencies manquantes (`form`, `totalTTC`).
**Verdict : justifié (calcul dépendant de l'état externe du store) mais le
dependency array est incomplet — `form.setMontantTND` et `form.montantTND` manquent.**

**Bug9 (Warning) — `Record<string, unknown>` dans mutationFn — use-bl.ts L101**

```typescript
// use-bl.ts L101
mutationFn: async (data: Record<string, unknown>): Promise<{ deliveryNote: SerializedDeliveryNote }> => {
```

Le paramètre `data` de `createBL` utilise `Record<string, unknown>` au lieu d'un
type dérivé du schema Zod. C'est un point de fragilité type-safe — le payload
n'est pas validé côté client avant envoi.

**Bug10 (Warning) — `Record<string, unknown>` pour le payload facture — use-bl.ts L243**

```typescript
// use-bl.ts L243
const payload: Record<string, unknown> = { ... };
```

Même problème que Bug9 — le payload de conversion en facture n'est pas typé.

**Bug11 (Warning) — Cast `as SerializedDeliveryNote` — use-bl.ts L188**

```typescript
// use-bl.ts L188
b.id === id ? { ...b, status } as SerializedDeliveryNote : b
```

Le cast est nécessaire car le spread ne preserve pas le type nominal. C'est un
pattern courant mais affaiblit le typage.

**Bug12 (Nit) — `buildInvoicePayload` assigné mais jamais utilisé — nouveau-bl-actions.tsx L48-72**

```typescript
// nouveau-bl-actions.tsx L48
const buildInvoicePayload = () => ({ ... });
```

Cette fonction est définie mais jamais appelée. Code mort.

### 2.3 Stores (Zustand)

#### Points forts

- **Séparation nette** : 2 stores distincts (`BLListState` pour les filtres,
  `BLFormState` pour le formulaire).
- **Interface propre** : tous les setters sont typés.
- **Reset function** : `resetForm()` remet tout à zéro.
- **Default line factory** : `defaultLine()` utilise `crypto.randomUUID()`.

#### Violations BLOCKER

**Aucune.**

#### Bugs identifiés

**Bug13 (Nit) — `resetForm` duplique l'initialisation — bl-store.ts L146-162**

Le `resetForm` recopie manuellement toutes les valeurs par défaut au lieu de
réutiliser une fonction `getDefaultState()`. Si un champ est ajouté à
`BLFormState`, il faudra le modifier à deux endroits. Pattern DRY manquant.

### 2.4 Types / Validation

#### Points forts

- **Types importés depuis `lib/types`** : `SerializedDeliveryNote`,
  `SerializedDeliveryNoteLine`, `DeliveryNoteStatus` — source centralisée.
- **Schema Zod** : `blSchema` utilisé pour la validation POST.

#### Bugs identifiés

**Bug14 (Warning) — Pas de types dédiés pour le module BL — lib/types/**

Contrairement au module BC qui a `lib/types/bon-commande.ts`, le module BL
n'a pas de fichier de types dédié. Les types sont dans `lib/types/index.tsx`
(fichier global). Cela peut créer des imports circulaires à terme.

---

## 3. Audit UI / Composants

#### Points forts

- **Skeleton states** : `BLDetailSkeleton` et le loading state de `bl-client.tsx`
  (L221-231) offrent un feedback visuel pendant le chargement.
- **Stat cards** : grille de 4 KPIs (Total BL, Montant, Livrés, Brouillons)
  bien structurée.
- **DataTable** : réutilisation du composant `DataTable` central avec colonnes
  personnalisées, filtres, et pagination.
- **Actions contextuelles** : le menu dropdown adapte ses options au statut du BL.
- **BL Visé** : composant dédié `BLFormVise` avec switch et champs conditionnels.
- **Sidebar détaillée** : `BLDetailSidebar` affiche client, BL visé, et récapitulatif.
- **Impression/PDF** : `BLDetailClient` intègre les fonctions d'export.
- **Conversion BL→Facture** : `convertToInvoice` dans `useBLMutations` gère
  la conversion avec optimistic update.

#### Bugs identifiés

**Bug15 (Warning) — `Badge` importé mais non utilisé — bl-client.tsx L7**

```typescript
// bl-client.tsx L7
import { Badge } from "@/components/ui/badge";
```

Import mort. Lint le signale.

**Bug16 (Nit) — `handleConvertToInvoice` avec `console.error` — bl-client.tsx L127**

```typescript
// bl-client.tsx L127
console.error("Conversion BL -> Facture échouée:", err);
```

Le `console.error` dans un handler d'erreur de mutation est redondant avec
`toast.error` juste en dessous. À supprimer en production.

**Bug17 (Warning) — Table HTML native dans `bl-form-lines.tsx` L75-181**

Le formulaire de lignes utilise une balise `<table>` HTML native au lieu du
composant `<Table>` de shadcn/ui utilisé dans `bl-detail-client.tsx`. Cela
crée une incohérence visuelle (pas de hover states, pas de styling shadcn).

**Bug18 (Nit) — Pas de loading state sur les boutons d'action du formulaire — nouveau-bl-actions.tsx**

Les boutons "Créer le BL" et "Créer BL + Facture" ont `disabled={isPending}`
mais n'affichent pas un spinner/indicator de chargement clair (juste le texte
"Création..."). Un `Loader2` animé serait plus standard.

**Bug19 (Nit) — `ConfirmDeleteDialog` sans numéro de BL — bl-client.tsx L270-277**

```tsx
// bl-client.tsx L275
description={`Êtes-vous sûr de vouloir supprimer le bon de livraison ? Cette action est irréversible.`}
```

Le numéro du BL n'est pas affiché dans la description du dialog. L'utilisateur
ne sait pas quel BL il supprime.

---

## 4. Violations CODE RULES

### 4.1 `any` (explicite ou implicite)

**✅ CLEAN** — Aucun `any` explicite (`: any`, `as any`, `<any>`, `any[]`,
`Record<string, any>`) trouvé dans les fichiers du module.

### 4.2 `useEffect` sans justification

**⚠️ 3 useEffect identifiés, tous avec justification :**

| Fichier | Ligne | Justification | Verdict |
|---------|-------|---------------|---------|
| `use-bl.ts` | L30-36 | Debounce timer (pas data-fetching) | ✅ Justifié |
| `use-bl.ts` | L88-92 | Bridge query→store (sync externe) | ✅ Justifié (fragile) |
| `nouveau-bl-client.tsx` | L92-106 | Calcul dérivé tauxChange→montantTND | ⚠️ Justifié mais deps incomplètes |

### 4.3 `fetch()` direct dans un composant

**✅ CLEAN** — Tous les `fetch()` sont dans `hooks/use-bl.ts` (dans des
fonctions `queryFn`/`mutationFn` de TanStack Query), pas dans des composants.

### 4.4 API route sans `apiRoute`

**✅ CLEAN** — Les 2 fichiers API (`route.ts` et `[id]/route.ts`) utilisent
tous le wrapper `apiRoute`.

### 4.5 Prisma schema sans migration

**✅ CLEAN** — `npx prisma migrate status` retourne "Database schema is up to date!".

### 4.6 Design skills (impeccable / make-interfaces-feel-better)

**⚠️ Non vérifiable** — Les skills n'ont pas été chargés pour cette session
d'audit (c'est un audit code, pas une tâche de design). Cependant, l'absence
de micro-interactions (hover states sur les lignes du tableau, animations
d'entrée) et l'utilisation d'une table HTML native dans `bl-form-lines.tsx`
suggèrent que les skills n'ont pas été utilisés lors de la création initiale
du module.

### 4.7 Tout enveloppé dans `<Card>`

**⚠️ Partiel** — Le formulaire (`nouveau-bl-client.tsx`) utilise `<Card>` pour
chaque section (Informations, Client, Notes, Récapitulatif). C'est acceptable
pour un formulaire mais le récapitulatif (L205-244) pourrait être un composant
dédié `SummaryPanel` plus dense.

---

## 5. Bugs identifiés (résumé)

| # | Sévérité | Fichier | Ligne | Description |
|---|----------|---------|-------|-------------|
| Bug1 | Warning | route.ts | L143 | `companyId!` non null assertion inutile |
| Bug2 | Warning | route.ts | L101 | Cast `as Array<Record<string, unknown>>` affaiblit le typage |
| Bug3 | Warning | route.ts, [id]/route.ts | L1 | `NextRequest` importé mais non utilisé |
| Bug4 | Nit | route.ts | L17-18 | Pas de bornes sur `take` query param |
| Bug5 | Warning | route.ts | L67-108 | Requête conditionnelle pour factures liées (pattern defensif) |
| Bug6 | Warning | use-bl.ts | L88-92 | useEffect bridge query→store (justifié mais fragile) |
| Bug7 | Warning | use-bl.ts | L30-36 | useEffect debounce (justifié, pattern réutilisable manquant) |
| Bug8 | Warning | nouveau-bl-client.tsx | L92-106 | useEffect calcul dérivé avec deps incomplètes |
| Bug9 | Warning | use-bl.ts | L101 | `Record<string, unknown>` au lieu d'un type Zod |
| Bug10 | Warning | use-bl.ts | L243 | `Record<string, unknown>` pour payload facture |
| Bug11 | Warning | use-bl.ts | L188 | Cast `as SerializedDeliveryNote` |
| Bug12 | Nit | nouveau-bl-actions.tsx | L48 | `buildInvoicePayload` code mort |
| Bug13 | Nit | bl-store.ts | L146-162 | `resetForm` duplique l'initialisation (DRY) |
| Bug14 | Warning | lib/types | — | Pas de types dédiés au module BL |
| Bug15 | Warning | bl-client.tsx | L7 | `Badge` importé mais non utilisé |
| Bug16 | Nit | bl-client.tsx | L127 | `console.error` redondant en production |
| Bug17 | Warning | bl-form-lines.tsx | L75 | Table HTML native au lieu de shadcn `<Table>` |
| Bug18 | Nit | nouveau-bl-actions.tsx | — | Pas de spinner de chargement sur les boutons |
| Bug19 | Nit | bl-client.tsx | L275 | Dialog suppression sans numéro de BL |

---

## 6. Améliorations suggérées

### Priorité Haute

1. **Typage des payloads** (Bug9, Bug10) : Remplacer `Record<string, unknown>`
   par des types dérivés de `blSchema` (`z.infer<typeof blSchema>`) dans
   `useBLMutations`. Utiliser `lib/schemas` pour la validation côté client.

2. **Types dédiés** (Bug14) : Créer `lib/types/bon-livraison.ts` avec
   `DeliveryNoteFormData`, `DeliveryNoteListItem`, `DeliveryNoteDetail`
   pour isoler les types du module.

3. **Table HTML → shadcn Table** (Bug17) : Remplacer `<table>` dans
   `bl-form-lines.tsx` par le composant `<Table>` de shadcn/ui pour
   l'cohérence visuelle.

### Priorité Moyenne

4. **Extraire le calcul remise/TVA** : Le calcul de `remisePercent` et
   `tauxTVAMoyen` est dupliqué entre `nouveau-bl-client.tsx` (L51-86) et
   `bl-detail-sidebar.tsx` (L24-59). Créer une fonction `calcRecapTotals(lines)`
   dans `lib/calc-line-totals.ts` ou un hook `useRecapCalculations`.

5. **`resetForm` DRY** (Bug13) : Extraire `getDefaultFormState()` et la
   réutiliser dans `defaultLine()` et `resetForm()`.

6. **Spinner sur les boutons** (Bug18) : Ajouter `<Loader2 className="animate-spin" />`
   dans les boutons de création cuando `isPending`.

7. **Dialog suppression avec numéro** (Bug19) : Passer `bl.numero` dans la
   description du `ConfirmDeleteDialog`.

### Priorité Basse

8. **Nettoyer les imports morts** (Bug3, Bug15) : Supprimer `NextRequest` et
   `Badge` des imports.

9. **Supprimer `buildInvoicePayload`** (Bug12) : Code mort dans
   `nouveau-bl-actions.tsx`.

10. **Supprimer `console.error`** (Bug16) : Redondant avec `toast.error`.

11. **Bornes sur `take`** (Bug4) : `Math.min(take, 200)` côté serveur.

---

## 7. Liaison avec autres modules

### Dépendances directes

| Module | Lien | Type |
|--------|------|------|
| `lib/schemas.ts` | `blSchema`, `errorResponse` | Validation Zod |
| `lib/api-route.ts` | `apiRoute` wrapper | Auth + permissions |
| `lib/decimal.ts` | `serializeDecimals`, `formatCurrency`, `parseTunisianNumber` | Utilitaires monétaires |
| `lib/sequence.ts` | `nextNumber` | Numérotation auto |
| `lib/prisma.ts` | `prisma` client | Accès DB |
| `lib/check-client-blocage.ts` | `assertClientNonBloque` | Règle métier |
| `lib/stock-utils.ts` | `handleSaleStockMovement` | Mouvement stock |
| `lib/calc-line-totals.ts` | `calcLineTotals` | Calcul HT/TVA/FODEC |
| `lib/export-utils.ts` | `exportDocumentPDF`, `buildDocumentHTML`, `deliveryNoteToDocumentOptions` | Impression/PDF |
| `lib/stores/company-store.ts` | `useCompanyStore` | Company ID |
| `hooks/use-queries.ts` | `useClients`, `useCompany`, `useProducts`, `useSettings` | Données partagées |
| `components/stat-card.tsx` | `StatCard` | KPI cards |
| `components/status-badge.tsx` | `DeliveryNoteStatusBadge` | Badges statut |
| `components/data-table.tsx` | `DataTable` | Table paginée |
| `components/confirm-delete-dialog.tsx` | `ConfirmDeleteDialog` | Dialog suppression |
| `components/shared/product-select.tsx` | `ProductSelect`, `buildProductSelectOptions` | Sélection produit |
| `components/shared/variant-select.tsx` | `VariantSelect` | Sélection déclinaison |

### Modules consommateurs (BL → autres)

| Module | Lien | Type |
|--------|------|------|
| `invoices` (Factures) | `convertToInvoice` → `POST /api/invoices` | Conversion BL→Facture |
| `dashboard` | `queryKeys.dashboard()` invalidation | Stats globales |

### Pattern partagé avec autres modules

- **Store pattern** : `bl-store.ts` suit exactement le même pattern que
  `bons-commande-store.ts`, `invoices-store.ts`, `devis-store.ts`, etc.
  (interface + `create<State>()` + setters + `resetForm`).
- **Hook pattern** : `use-bl.ts` suit le même pattern que `use-bc.ts`
  (queryKeys + useQuery + useMutation + optimistic updates).
- **Composant pattern** : la structure `*-client.tsx` / `*-actions.tsx` /
  `*-skeleton.tsx` est cohérente avec les autres modules.

### Modules potentiellement impactés par des changements BL

- **Factures** : la conversion BL→Facture dépend du payload structuré
  (`/api/invoices`). Un changement dans les champs BL visé doit être
  répercuté côté facture.
- **Stocks** : le changement de statut BL déclenche des mouvements de stock.
  `handleSaleStockMovement` est partagé avec les factures.
- **Dashboard** : les stats BL sont invalidées lors de chaque mutation.
  Le dashboard doit afficher les mêmes KPIs que la page BL list.

---

## Résumé

| Catégorie | Count |
|-----------|-------|
| **Blockers** | 0 |
| **Warnings** | 12 |
| **Nits** | 7 |
| **Lint errors** | 0 (6 warnings ESLint) |
| **TSC errors** | 0 |
| **Prisma drift** | 0 |

Le module BL est **fonctionnellement solide** — les API routes sont bien wrappées,
les mutations ont des optimistic updates, les calculs utilisent Big.js, et le
multi-tenant est respecté. Les améliorations portent principalement sur le typage
(`Record<string, unknown>` → types Zod), la duplication de calculs (remise/TVA),
et la cohérence UI (table HTML native vs shadcn).
