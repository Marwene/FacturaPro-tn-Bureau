# Audit Complet — Module Produits & Mouvements de Stock

**Date :** 2026-09-20  
**Agent :** QA Agent  
**Périmètre :** `app/api/products/`, `hooks/use-produits.ts`, `hooks/use-stock-movements.ts`, `hooks/use-stock-mouvements.ts`, `lib/stores/produits-store.ts`, `components/produits/`, `components/stock/mouvements-client.tsx`

---

## 1. Vue d'ensemble

### Architecture du module

| Couche | Fichiers | Rôle |
|--------|----------|------|
| **API Routes** | `app/api/products/route.ts` (GET/POST), `app/api/products/[id]/route.ts` (GET/PUT/DELETE), `app/api/products/[id]/stock-movements/route.ts` (GET/POST), `app/api/products/next-code/route.ts` (GET) | CRUD produits + mouvements de stock + génération SKU |
| **Hooks** | `use-produits.ts`, `use-stock-movements.ts`, `use-stock-mouvements.ts`, `use-product-variants.ts` | TanStack Query wrappers |
| **Store** | `lib/stores/produits-store.ts` | Filtres et état UI (Zustand) |
| **Composants** | 23 fichiers dans `components/produits/` + `components/stock/mouvements-client.tsx` | Liste, détail, formulaire, alertes, mouvements |
| **Types** | `lib/types/product.ts` | `SerializedProduct`, `ProductSupplierOption` |
| **Validation** | `lib/schemas.ts` (productSchema Zod) | Validation côté serveur |

### Flux de données

```
Store (Zustand) → Hook (TanStack Query) → API Route → Prisma → PostgreSQL
                                                  ↓
                                          serializeDecimals()
                                                  ↓
                                          Client (React)
```

---

## 2. Audit Code

### 2.1 API Routes

#### `app/api/products/route.ts` — GET (L1-106)

- **Auth/Permissions** : ✅ `getSessionFromRequest` + `checkPermission("produits:voir")`
- **Filtrage** : Recherche multi-champs (nom, code, codeBarre, description, catégorie, fournisseur)
- **Calculs** : `totalValeur` via Big.js (L67) — correct pour la précision décimale
- **Sérialisation** : `serializeDecimals()` appliqué ✅

⚠️ **Warning** : Ne passe PAS par `apiRoute` wrapper (L11-106). L'auth et permissions sont faites manuellement. La route fonctionne mais viole la règle `apiRoute` du projet.

#### `app/api/products/route.ts` — POST (L108-195)

- **Validation Zod** : ✅ `productSchema.safeParse(body)` (L116)
- **Stock logic** : `estSurCommande` gère le solde plancher (L122-124) ✅
- **QR Code** : Généré via `generateProductQRData` puis stocké dans `codeBarre` (L170-185) ✅
- **Error P2002** : Gestion du code unique (L189) ✅

⚠️ **Warning** : Même problème — pas de `apiRoute` wrapper.

#### `app/api/products/[id]/route.ts` — GET/PUT/DELETE (L1-184)

⚠️ **BLOCKER : Pas de `apiRoute` wrapper** sur les 3 méthodes. L'auth/permissions sont faites manuellement (L15-18, L71-74, L172-175).

- **PUT** : Synchronisation fournisseurs correcte (L120-138) ✅
- **DELETE** : Suppression simple sans cascade explicite — dépend des FK Prisma ⚠️
- **QR Code régénéré** à chaque PUT (L140-155) ✅

#### `app/api/products/[id]/stock-movements/route.ts` — GET/POST (L1-115)

✅ **Utilise `apiRoute`** wrapper (L8, L33) — conforme.

- **Transaction Prisma** : `$transaction` pour atomicité stock + mouvement (L63-107) ✅
- **Recalcul stockStatus** : Fait dans la transaction (L93-104) ✅

#### `app/api/products/next-code/route.ts` (L1-28)

✅ **Utilise `apiRoute`** wrapper (L6). Génération SKU basée sur le nom.

### 2.2 Hooks / State

#### `hooks/use-produits.ts` (L1-199)

- **useProduitsList** (L25-47) : TanStack Query avec filters depuis Zustand ✅
- **useProduitsMutations** (L49-177) : CRUD avec optimistic updates ✅
- **useProduitDetail** (L179-188) : Query simple ✅

🔴 **BLOCKER : `useProduitsSearchDebounce`** (L190-199) — utilise `useEffect` pour debounce :
```typescript
// L195-198
useEffect(() => {
    ref.current = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => { if (ref.current) clearTimeout(ref.current); };
}, [searchInput, setSearchQuery]);
```
**Justification manquante** : Le debounce devrait être géré via Zustand middleware ou une utility dédiée, pas via `useEffect`. C'est du data-fetching indirect (le `searchQuery` déclenche un refetch TanStack Query).

#### `hooks/use-stock-movements.ts` (L1-39)

- **useStockMovements** (L6-16) : Query ✅
- **useCreateStockMovement** (L18-38) : Mutation avec invalidation ✅

🔴 **BLOCKER : `fetch()` direct sans `handleApiResponse`** (L10-12) :
```typescript
// L10-12
const res = await fetch(`/api/products/${productId}/stock-movements`);
if (!res.ok) throw new Error("Erreur chargement mouvements de stock");
return res.json() as Promise<{ movements: SerializedStockMovement[] }>;
```
Comparé à `use-produits.ts` qui utilise `handleApiResponse`, celui-ci gère l'erreur de manière ad-hoc. Pas de gestion des erreurs d'auth (401) ou de permissions (403).

#### `hooks/use-stock-mouvements.ts` (L1-48)

🔴 **Doublon suspect** : Deux hooks pour les mouvements de stock :
- `use-stock-movements.ts` — mouvements par produit (`/api/products/{id}/stock-movements`)
- `use-stock-mouvements.ts` — mouvements globaux (`/api/stock-mouvements`)

Le second hook (L39-47) définit ses propres types `Mouvement` et `MouvementsData` (L5-37) au lieu de réutiliser `lib/types`. C'est un **doublon de types**.

#### `lib/stores/produits-store.ts` (L1-46)

✅ Simple et clean. Filtres UI dans Zustand. Pas de `any`.

### 2.3 Types / Validation

#### `lib/types/product.ts` (L1-46)

✅ Typé proprement. `SerializedProduct` avec tous les champs.

#### `components/produits/produit-form-page.tsx`

🔴 **BLOCKER : 6 occurrences de `any`** :

| Ligne | Code | Problème |
|-------|------|----------|
| L43 | `{ product?: Record<string, any> }` | Props non typées |
| L60 | `resolver: zodResolver(productSchema) as any` | Cast pour masquer incompatibilité react-hook-form / Zod |
| L84 | `useState<any[]>(...)` | Variants non typés |
| L86 | `product.variants.map((v: any)` | Iteration non typée |
| L206 | `catch (err: any)` | Erreur non typée |
| L662 | `(f: any)` | Fournisseur non typé |

#### `components/produits/produit-edit-dialog.tsx`

🔴 **BLOCKER : 2 occurrences de `any`** :

| Ligne | Code | Problème |
|-------|------|----------|
| L32 | `product: Record<string, any>` | Props non typées |
| L41 | `resolver: zodResolver(productSchema) as any` | Même cast que le form page |

#### `components/produits/nouveau-produit-dialog.tsx`

🔴 **BLOCKER : 1 occurrence de `any`** :

| Ligne | Code | Problème |
|-------|------|----------|
| L38 | `resolver: zodResolver(productSchema) as any` | Même cast |

#### `components/produits/product-performance-chart.tsx`

🔴 **BLOCKER : 2 occurrences de `any`** :

| Ligne | Code | Problème |
|-------|------|----------|
| L68 | `formatter={(value: any, name: any) => {` | Types callback recharts |

---

## 3. Audit UI / Composants

### Structure des composants

| Composant | Type | Pattern |
|-----------|------|---------|
| `produits-client.tsx` | Liste | DataTable + StatCards + Filters |
| `produit-detail-client.tsx` | Détail | Page layout 3 colonnes |
| `produit-form-page.tsx` | Formulaire | Form complet 3 colonnes |
| `nouveau-produit-dialog.tsx` | Dialog | Formulaire simplifié |
| `produit-edit-dialog.tsx` | Dialog | Formulaire simplifié |
| `adjust-stock-dialog.tsx` | Dialog | Formulaire mouvement |
| `product-stock-movements.tsx` | Table | Liste mouvements |
| `stock-alert-banner.tsx` | Banner | Alertes stock |

### Conformité Design

- ✅ Utilisation de `StatCard`, `StockStatusBadge`, `DataTable` — composants partagés
- ✅ `StockAlertBanner` avec animation `motion/react` et respect `useReducedMotion`
- ✅ `Empty` state avec illustration dans la liste
- ✅ Badges colorés pour les types de mouvements
- ✅ Progress bar pour le stock (L165-174 dans `produits-client.tsx`)

### Dialog > 3 sections ?

- `nouveau-produit-dialog.tsx` : Dialog avec 3 sections séparées par `<Separator />` (Infos, Prix/Fiscalité, Stock) + scroll overflow. ⚠️ **Limite** — pourrait beneficié d'un Sheet pour un form plus long.
- `produit-edit-dialog.tsx` : Même structure.
- `produit-form-page.tsx` : ✅ **Page dédiée** — pas un Dialog, c'est le bon pattern.
- `adjust-stock-dialog.tsx` : ✅ Simple, 3 champs, pas de scroll nécessaire.

---

## 4. Bugs Identifiés

### 🔴 BLOCKER

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| B1 | `produit-form-page.tsx` | L192 | **TypeScript Error TS2339** : `Property 'product' does not exist on type 'SerializedProduct'`. Le `mutateAsync` retourne `SerializedProduct` mais le code attend `{ product: SerializedProduct }`. Ligne : `const newId = res.product.id` |
| B2 | `use-stock-movements.ts` | L10-12 | **Pas de gestion d'erreur standardisée** : `fetch()` direct sans `handleApiResponse`, les erreurs 401/403 ne sont pas traitées proprement |
| B3 | `hooks/use-produits.ts` | L195-198 | **`useEffect` pour debounce** : Devrait utiliser un debounce natif TanStack Query (`debouncedQueryKey`) ou un middleware Zustand |

### ⚠️ WARNING

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| W1 | `app/api/products/route.ts` | L1-106 | **Pas de `apiRoute` wrapper** — auth/permissions manuelles |
| W2 | `app/api/products/[id]/route.ts` | L1-184 | **Pas de `apiRoute` wrapper** — auth/permissions manuelles |
| W3 | `use-stock-mouvements.ts` | L5-37 | **Doublon de types** : `Mouvement` et `MouvementsData` définis localement au lieu de réutiliser `lib/types` |
| W4 | `nouveau-produit-dialog.tsx` | L77 | **Dialog `max-h-[90vh] overflow-y-auto`** : Le formulaire dépasse un viewport normal. Devrait être un Sheet ou une page dédiée |
| W5 | `produit-edit-dialog.tsx` | L72 | **Même problème** que W4 |
| W6 | `mouvements-client.tsx` | L78-129 | **4 `<Card>` pour des stats** : Les 4 cartes (Total, Entrées, Sorties, Solde) devraient être des `StatCard` comme dans `produits-client.tsx` |

### ℹ️ NIT

| # | Fichier | Ligne | Description |
|---|---------|-------|-------------|
| N1 | `produit-form-page.tsx` | L39 | `UNITES` défini en dur — pourrait être une constante partagée dans `lib/` |
| N2 | `nouveau-produit-dialog.tsx` | L31 | `UNITES` dupliqué — même constante |
| N3 | `produit-edit-dialog.tsx` | L29 | `UNITES` dupliqué — même constante |
| N4 | `product-stock-movements.tsx` | L9 | `typeConfig` utilise `Record<string, ...>` — acceptable mais pourrait être un union type |

---

## 5. Violations CODE RULES

### `any` (explicite) — 🔴 BLOCKER

**13 occurrences** dans les fichiers audités :

| Fichier | Lignes | Type |
|---------|--------|------|
| `produit-form-page.tsx` | L43, L60, L84, L86, L206, L662 | `Record<string, any>`, `as any`, `any[]`, `(v: any)`, `(err: any)`, `(f: any)` |
| `produit-edit-dialog.tsx` | L32, L41 | `Record<string, any>`, `as any` |
| `nouveau-produit-dialog.tsx` | L38 | `as any` |
| `product-performance-chart.tsx` | L68 | `(value: any, name: any)` |

### `useEffect` sans justification — 🔴 BLOCKER

| Fichier | Ligne | Justification | Verdict |
|---------|-------|---------------|---------|
| `use-produits.ts` | L195 | Debounce search → setQuery | ❌ **Non justifié** — utiliser debounce utility |
| `produit-form-page.tsx` | L132 | Sync auto-SKU code depuis API | ⚠️ **Partiellement justifié** — sync avec réponse API, mais pourrait être un calcul dérivé |

### `fetch()` direct dans composant — ✅ CLEAN

Aucun `fetch()` direct dans les composants. Tout passe par les hooks TanStack Query.

### `apiRoute` manquant — 🔴 BLOCKER

| Route | Méthodes | Verdict |
|-------|----------|---------|
| `app/api/products/route.ts` | GET, POST | ❌ Pas de wrapper |
| `app/api/products/[id]/route.ts` | GET, PUT, DELETE | ❌ Pas de wrapper |
| `app/api/products/[id]/stock-movements/route.ts` | GET, POST | ✅ Utilise `apiRoute` |
| `app/api/products/next-code/route.ts` | GET | ✅ Utilise `apiRoute` |

### Prisma Schema Drift — ✅ CLEAN

Pas de modification de schéma dans cette session d'audit.

### Design Skills (impeccable / make-interfaces-feel-better) — ⚠️ NON VÉRIFIABLE

L'audit ne peut pas déterminer si ces skills ont été chargés lors de la création des composants. L'UI semble cohérente (pas de shadcn par défaut), mais c'est un point à vérifier avec le Governor.

---

## 6. Améliorations Suggérées

### Priorité Haute (avant prochaine itération)

1. **Typage `produit-form-page.tsx`** : Remplacer `Record<string, any>` par un type `ProductFormData` dérivé de `z.infer<typeof productSchema>`. Le cast `as any` sur `zodResolver` peut être résolu en utilisant le bon type générique react-hook-form.

2. **Wrapper `apiRoute` sur les routes principales** : Les routes `products/route.ts` et `products/[id]/route.ts` devraient passer au `apiRoute` wrapper pour la cohérence et la maintenance.

3. **Standardiser les erreurs dans les hooks** : `use-stock-movements.ts` devrait utiliser `handleApiResponse` comme `use-produits.ts`.

4. **Résoudre le TS2339** : `produit-form-page.tsx` L192 — le type de retour de `createProduct.mutateAsync` doit correspondre à `{ product: SerializedProduct }`.

### Priorité Moyenne

5. **Déplacer `UNITES` dans `lib/`** : Constante partagée entre 3 fichiers.

6. **Fusionner les types de mouvements** : `use-stock-mouvements.ts` devrait importer `SerializedStockMovement` depuis `lib/types` au lieu de définir ses propres interfaces.

7. **Convertir les dialogs en Sheets** : `nouveau-produit-dialog` et `produit-edit-dialog` débordent du viewport.

8. **Utiliser `StatCard` dans `mouvements-client.tsx`** : Les 4 cartes statistiques devraient réutiliser le composant existant.

### Priorité Basse

9. **Ajouter `loading` states** aux boutons d'action dans les dialogs.

10. **Considérer le préfixe `fetch()` dans hooks** : Centraliser la configuration (headers, error handling) dans un utilitaire dédié.

---

## 7. Liaison avec Autres Modules

### Modules dépendants

| Module | Lien | Nature |
|--------|------|--------|
| **Fournisseurs** | `ProductSuppliersSection`, `product-supplier-comparison.tsx` | FK `productSupplier` → `supplier` |
| **Catégories** | `CategoryTreeSelect`, `use-categories.ts` | FK `product` → `categorie` |
| **Marques** | `MarqueSelect`, `use-marques.ts` | FK `product` → `marque` |
| **Factures** | Mouvements `referenceType: "VENTE"` | Lien logique via `stockMovement` |
| **Achats** | Mouvements `referenceType: "ACHAT"` | Lien logique via `stockMovement` |
| **Inventaire** | `use-inventaire.ts`, `use-rapport-inventaire.ts` | Lit les `stockMovement` |
| **Dashboard** | `use-dashboard.ts` | Aggregate stats produits |
| **Customizer** | `isProductCustomizable()`, `/produits/{id}/customizer` | Feature flag |
| **Packing List** | `use-packing-list.ts` | Référence `product` |
| **Exports** | `use-exports.ts` | Export catalogue produits |

### Modules impactés par les `any`

Les 13 `any` dans `produit-form-page.tsx` propagent l'insécurité de type vers :
- `use-product-variants.ts` (via `variants` non typé)
- `use-fournisseurs-queries.ts` (via `formSuppliers` non typé)

---

## Résumé Exécutif

| Catégorie | Statut | Détail |
|-----------|--------|--------|
| **TypeScript** | ❌ 1 erreur TS2339 + 13 `any` | Bloquant |
| **CODE RULES** | ❌ `useEffect` non justifié + `apiRoute` manquant | Bloquant |
| **Doublons** | ⚠️ 2 hooks mouvements + `UNITES` ×3 | Warning |
| **Design** | ✅ Globalement cohérent | — |
| **Sécurité** | ✅ Auth + permissions sur toutes les routes | — |
| **Performance** | ✅ TanStack Query + optimistic updates | — |
| **Prisma** | ✅ Transactions atomiques pour stock | — |

**Verdict** : Le module est fonctionnellement solide mais presenta 3 blockers (any, useEffect, apiRoute) qui doivent être résolus avant toute nouvelle itération.
