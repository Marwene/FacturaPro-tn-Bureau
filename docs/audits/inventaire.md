# Audit Complet — Module Inventaire

**Date** : 2026-09-20
**Périmètre** : `app/api/inventaire/`, `app/api/rapports/inventaire/`, `app/api/stock-mouvements/`, `app/api/products/[id]/stock-movements/`, `components/stock/`, `hooks/use-inventaire.ts`, `hooks/use-stock-mouvements.ts`, `hooks/use-rapport-inventaire.ts`, `hooks/use-stock-movements.ts`
**Méthode** : Graphify query → lecture exhaustive de chaque fichier → grep rules CODE RULES → eslint/tsc

---

## 1. Vue d'ensemble

Le module Inventaire couvre la gestion du stock produits : tableau de bord (valeur stock, alertes, ruptures, top produits par catégorie), l'historique des mouvements de stock (entrées/sorties/ajustements) avec pagination, et un rapport d'inventaire consolidé.

### Fichiers du module

| Fichier | Rôle | LOC | apiRoute |
|---------|------|-----|----------|
| `app/api/inventaire/route.ts` | Dashboard inventaire (GET) | 140 | ✅ `apiRoute.get` |
| `app/api/rapports/inventaire/route.ts` | Rapport inventaire (GET) | 83 | ❌ manuel |
| `app/api/stock-mouvements/route.ts` | Liste mouvements paginée (GET) | 86 | ❌ manuel |
| `app/api/products/[id]/stock-movements/route.ts` | Mouvements par produit (GET/POST) | 115 | ✅ `apiRoute` |
| `hooks/use-inventaire.ts` | Hook dashboard inventaire | 55 | — |
| `hooks/use-stock-mouvements.ts` | Hook liste mouvements | 48 | — |
| `hooks/use-rapport-inventaire.ts` | Hook rapport inventaire | 37 | — |
| `hooks/use-stock-movements.ts` | Hook mouvements par produit | 39 | — |
| `components/stock/inventaire-client.tsx` | Composant dashboard | 282 | — |
| `components/stock/mouvements-client.tsx` | Composant liste mouvements | 248 | — |
| `app/(app)/inventaire/page.tsx` | Page inventaire | 25 | — |
| `app/(app)/stock-mouvements/page.tsx` | Page mouvements | 11 | — |

### Architecture de données

- **Prisma models** : `Product`, `ProductVariant`, `StockMovement`, `Categorie`
- **Decimal** : quantités en `Decimal(19,3)`, prix en `Decimal(19,4)`
- **Serialization** : `serializeDecimals()` avant transport client
- **Store** : Aucun store Zustand dédié — state local dans les composants
- **Schemas** : Aucun schema Zod dédié inventaire dans `lib/schemas/` (validation inline côté API)

---

## 2. Audit Code

### 2.1 API Routes

#### ✅ `app/api/inventaire/route.ts` — Conforme

- **apiRoute** : Utilise `apiRoute.get({ permission: "produits:voir", requireCompany: false })` (ligne 5)
- **Auth** : Gérée par le wrapper
- **Performance** : `Promise.all` pour 4 requêtes parallèles (ligne 14)
- **Serialization** : `serializeDecimals(recentMovements)` (ligne 137)
- **Logic** : Calcul correct de la valorisation stock incluant les variantes (lignes 54-61, fallback `v.prixHT ?? p.prixHT`)

#### ⚠️ `app/api/rapports/inventaire/route.ts` — NON conforme (apiRoute)

- **Problème** : Auth manuelle avec `getSessionFromRequest` + `checkPermission` (lignes 10-15) au lieu du wrapper `apiRoute`
- **Impact** : Logique d'auth dupliquée, pas de gestion centralisée des erreurs
- **Ligne 8** : `export async function GET(request: NextRequest)` — route裸
- **Ligne 20** : Variable `now` assignée mais jamais utilisée (warning eslint)
- **Ligne 44-45** : `alertes` et `ruptures` typés `typeof products` — correct mais verbose

#### ⚠️ `app/api/stock-mouvements/route.ts` — NON conforme (apiRoute)

- **Problème** : Auth manuelle (lignes 9-11) sans `apiRoute`
- **Impact** : Même problème que ci-dessus — duplicated auth logic
- **Ligne 25** : Validation inline du type au lieu d'un schema Zod
- **Ligne 39-42** : Recherche avec `mode: "insensitive"` — correct PostgreSQL

#### ✅ `app/api/products/[id]/stock-movements/route.ts` — Conforme

- **apiRoute** : GET et POST wrappés (lignes 8, 33)
- **Transaction** : `prisma.$transaction` pour créer mouvement + mettre à jour stock + recalculer statut (lignes 63-107)
- **Validation** : Checks manuels mais corrects (lignes 46-54)

### 2.2 Hooks / State Management

#### ⚠️ `hooks/use-inventaire.ts` — Structure correcte, duplication potentielle

- **TanStack Query** : ✅ `useQuery<InventaireData>` (ligne 47)
- **fetch()** : Utilisé dans `queryFn` — conforme (c'est l'endroit autorisé)
- **Interface** : `InventaireData` définie localement (lignes 5-44) — pourrait être partagée
- **Query key** : `["inventaire", periode]` — correct

#### ⚠️ `hooks/use-rapport-inventaire.ts` — Duplication avec use-inventaire

- **Conflit de nom** : Exporte `InventaireData` (ligne 6) — même nom que `use-inventaire.ts` ligne 5
- **Shape différent** : Ajoute `coutTotal`, `alertes`/`ruptures` typés `SerializedProduct[]` au lieu de `topProduits`/`produitsAlerte`
- **Impact** : Si les deux hooks sont importés dans le même scope → conflit de type

#### ✅ `hooks/use-stock-mouvements.ts` — Conforme

- **TanStack Query** : ✅ (ligne 40)
- **URLSearchParams** : Paramètre générique, flexible

#### ⚠️ `hooks/use-stock-movements.ts` — Conflit de nom

- **Problème** : Deux fichiers nommés `use-stock-mouvements.ts` et `use-stock-movements.ts` — mais l'un gère la liste globale et l'autre les mouvements par produit
- **Ligne 12** : `return res.json() as Promise<{ movements: SerializedStockMovement[] }>` — cast `as` avec type importé de `@/lib/types` ✅
- **Ligne 22** : `data: { type: string; quantite: number; notes?: string }` — `type: string` devrait être `type: MouvementType` pour la sécurité de type

### 2.3 Types / Validation

- **Interfaces** : Définies localement dans chaque hook, pas dans `lib/types/`
- **StockStatus** : Importé depuis `@/lib/types` — conforme
- **MouvementType** : Importé dans `products/[id]/stock-movements/route.ts` — conforme
- **Validation** : Pas de schema Zod pour les mouvements de stock — validation inline

---

## 3. Audit UI / Composants

### 3.1 `components/stock/inventaire-client.tsx`

#### Layout

- **StatCard** : Utilisé pour les 4 stats principales + 2 secondaires ✅
- **Table** : Pour catégories, mouvements récents, top produits, alertes — approprié pour des données tabulaires ✅
- **Skeleton** : Loading state avec 4 cards + 2 zones ✅

#### Design

- **Palette** : Cohérente — emerald pour entrées, red pour sorties/ruptures, orange pour alertes/ajustements
- **Typography** : `text-xs` partout — dense mais cohérent avec le style admin
- **Dark mode** : Badges avec variants dark explicites ✅
- **Motion** : StatCard utilise `motion/react` pour animations d'entrée/hover ✅

#### Problèmes

| Sévérité | Ligne | Description |
|----------|-------|-------------|
| Nit | 61 | `variant={Number(stats.valeurStock) > 0 ? "default" : "default"}` — ternaire inutile, les deux branches retournent `"default"` |
| Nit | 82-95 | Les stats secondaires (Entrées/Sorties) ne sont que 2 sur une grille 4 colonnes — case vide à droite |
| Warning | 228 | `p.stockStatus as StockStatus` — cast `as` nécessaire car `stockStatus` est typé `string` dans l'interface `InventaireData` au lieu de `StockStatus` |

### 3.2 `components/stock/mouvements-client.tsx`

#### Layout

- **Filtres** : Recherche débouncée + select type + pagination ✅
- **Stats** : 4 cartes colorées (total, entrées, sorties, solde net) ✅
- **Table** : 7 colonnes, données bien structurées ✅

#### Design

- **Pagination** : Précédent/Suivant avec disabled states ✅
- **Badges** : Couleurs cohérentes avec inventaire-client
- **Liens** : Produits cliquables vers `/produits/${m.product.id}` ✅

#### Problèmes

| Sévérité | Ligne | Description |
|----------|-------|-------------|
| Warning | 3 | `useState` importé — acceptable car état UI local (filtres, pagination), pas de données serveur |
| Warning | 78-129 | Les 4 stat cards sont des `<Card>` bruts avec du layout inline — duplication du pattern `StatCard` existant |
| Nit | 165 | `toLocaleDateString("fr-TN")` — le locale `"fr-TN"` n'existe pas dans la spec JS, fallback sur `"fr"` |

---

## 4. Bugs identifiés

| # | Sévérité | Fichier | Ligne | Description |
|---|----------|---------|-------|-------------|
| 1 | **BLOCKER** | `app/api/rapports/inventaire/route.ts` | 8 | Route non wrappée avec `apiRoute` — auth manuelle, pas de gestion d'erreur centralisée |
| 2 | **BLOCKER** | `app/api/stock-mouvements/route.ts` | 7 | Route non wrappée avec `apiRoute` — auth manuelle, pas de gestion d'erreur centralisée |
| 3 | **HIGH** | `hooks/use-inventaire.ts` + `hooks/use-rapport-inventaire.ts` | 5, 6 | Conflit d'export `InventaireData` — même nom, shapes différents |
| 4 | **HIGH** | Duplicated hooks | — | `hooks/use-stock-mouvements.ts` (liste) et `hooks/use-stock-movements.ts` (par produit) — confusion de nommage |
| 5 | **MEDIUM** | `app/api/rapports/inventaire/route.ts` | 20 | Variable `now` assignée jamais utilisée |
| 6 | **LOW** | `components/stock/inventaire-client.tsx` | 61 | Ternaire inutile `variant="default" ? "default" : "default"` |
| 7 | **LOW** | `components/stock/mouvements-client.tsx` | 165 | Locale `"fr-TN"` non standard |

---

## 5. Violations CODE RULES

### `any` (explicite ou implicite)

✅ **Aucune violation détectée** — grep `: any|as any|<any>|any[]|Record<string, any>` n'a retourné aucun résultat dans les fichiers du module.

### `useEffect` injustifié

✅ **Aucune violation dans les fichiers du module.** Le seul `useEffect` dans la chaîne est dans `hooks/use-debounce.ts` (lignes 8-11) — synchronisation timer DOM, justifiée.

### `fetch()` direct dans un composant

✅ **Aucune violation** — tout `fetch()` est dans un `queryFn` de TanStack Query, ce qui est conforme.

### Routes API sans `apiRoute`

❌ **2 violations** :
- `app/api/rapports/inventaire/route.ts` — auth manuelle (lignes 10-15)
- `app/api/stock-mouvements/route.ts` — auth manuelle (lignes 9-11)

### Prisma schema drift

✅ **Aucun drift** — `npx prisma migrate status` confirme "Database schema is up to date!".

### Design skills (impeccable / make-interfaces-feel-better)

⚠️ **Non vérifiable** — pas de trace du chargement de ces skills dans les composants du module. Le module utilise des patterns UI cohérents (StatCard, Table, Badge) mais sans documentation du processus de design.

---

## 6. Améliorations suggérées

### Priorité 1 — Blocs fonctionnels

| # | Amélioration | Impact |
|---|-------------|--------|
| 1 | **Wrapp `apiRoute`** les 2 routes non wrappées (`rapports/inventaire`, `stock-mouvements`) | Sécurité, maintenance |
| 2 | **Renommer** `hooks/use-stock-mouvements.ts` (par produit) → `hooks/use-product-stock-movements.ts` | Clarté |
| 3 | **Résoudre le conflit** `InventaireData` entre `use-inventaire.ts` et `use-rapport-inventaire.ts` — soit un type partagé dans `lib/types/`, soit un renommage | Type safety |

### Priorité 2 — Consolidation

| # | Amélioration | Impact |
|---|-------------|--------|
| 4 | **Fusionner** `app/api/inventaire/route.ts` et `app/api/rapports/inventaire/route.ts` en un seul endpoint avec paramètre `mode=dashboard|report` | Réduction duplication (déjà signalé arch-review #2.21) |
| 5 | **Créer** `lib/schemas/stock.ts` avec un `stockMovementSchema` Zod pour la validation des mouvements | Sécurité, conformité |
| 6 | **Extraire** les interfaces `InventaireData`, `Mouvement`, `MouvementsData` dans `lib/types/` | Réutilisabilité |

### Priorité 3 — UX / Polish

| # | Amélioration | Impact |
|---|-------------|--------|
| 7 | **Utiliser `StatCard`** dans `mouvements-client.tsx` au lieu de `<Card>` bruts pour les stats | Cohérence visuelle |
| 8 | **Corriger** le ternaire mort `variant` (ligne 61 inventaire-client) | Code propre |
| 9 | **Remplacer** `toLocaleDateString("fr-TN")` par `"fr-FR"` ou un formattage manuel | Locale correcte |
| 10 | **Créer un store Zustand** `inventaire-store.ts` si des filtres/pagination doivent être partagés entre vues | State management |

---

## 7. Liaison avec autres modules

### Dépendances sortantes

| Module | Relation | Fichiers |
|--------|----------|----------|
| **Produits** | Le module inventaire lit `Product`, `ProductVariant`, `Categorie` via Prisma | `app/api/inventaire/route.ts`, `app/api/products/[id]/stock-movements/route.ts` |
| **Achats** | Les mouvements de stock peuvent être liés à un achat (`referenceType`) | `app/api/products/[id]/stock-mouvements/route.ts` (ligne 69) |
| **Fournisseurs** | `supplierId` et `purchasePrice` optionnels sur les mouvements | `app/api/products/[id]/stock-mouvements/route.ts` (lignes 41-43) |
| **UI Components** | `StatCard`, `StockStatusBadge`, `Badge`, `Table`, `Skeleton` | Partout |

### Dépendances entrantes

| Module | Relation |
|--------|----------|
| **Dashboard** | Le dashboard principal peut consommer les stats inventaire |
| **Achats** | La création d'un achat peut déclencher un mouvement de stock `ENTREE` |
| **Factures / BL** | La validation peut déclencher un mouvement `SORTIE` |
| **Rapports** | Le module rapports (`/rapports/inventaire`) est une vue spécialisée de l'inventaire |

### Risques cross-module

- La duplication des endpoints inventaire/rapports-inventaire (arch-review #2.21) signifie qu'un correctif de calcul de valorisation dans l'un ne sera pas répercuté dans l'autre.
- L'absence de `apiRoute` sur `stock-mouvements` signifie que les permissions ne sont pas vérifiées de la même manière que les autres routes → risque de régression si la logique d'auth change.

---

## Résumé exécutif

| Catégorie | Verdict |
|-----------|---------|
| **Type safety** | ✅ Clean — aucun `any` |
| **useEffect** | ✅ Clean — aucun injustifié |
| **fetch()** | ✅ Conforme — dans queryFn uniquement |
| **apiRoute** | ❌ 2 routes non wrappées (BLOCKER) |
| **Prisma drift** | ✅ Aucun |
| **Lint** | ⚠️ 1 warning (variable `now` inutilisée) |
| **TSC** | ✅ 0 erreurs dans les fichiers du module |
| **Design skills** | ⚠️ Non vérifiable — pas de trace |
| **Duplication** | ⚠️ 2 endpoints quasi-identiques + 2 hooks de nom similaire |
| **Total violations** | **2 BLOCKER** (apiRoute), **2 HIGH** (conflits noms), **2 WARNING**, **3 NIT** |
