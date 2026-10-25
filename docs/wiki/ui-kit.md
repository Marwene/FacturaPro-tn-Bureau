# UI Kit — inventaire des composants partagés et des motifs dupliqués

- **Date** : 2026-10-18
- **Auteur** : Architecture Agent (Prompt G — P2, étape 1 : inventaire uniquement)
- **Fiche de suivi** : `docs/wiki/audit-2026-10-suivi.md`
- **Référence** : `docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md:266` (Prompt G)
- **Portée** : **inventaire strictement**. Aucun fichier `components/**` n'a été créé ou modifié lors de cette étape.
- **Graphe** : `graphify-out/graph.json` (9006 nœuds / 22271 arêtes, `graphify update .` OK le 2026-10-17)

---

## A. Graphify (STEP 1)

Requêtes lancées par l'Architecture Agent avant toute recommandation (binaire global `graphify`, pas `npx`) :

```
graphify query "dialog stat-card filter page header skeleton composants partagés"
```

Sortie (extrait, le graphe est tronqué à ~2000 tokens) :

```
Graph: graphify-out/graph.json (9006 nodes) | Traversal: BFS depth=2
Start: ['Skeleton()', 'Header()', 'Card()', 'Composants UI', 'Dialog()', 'filterFindings()', 'page()',
        'Prompt G — P2 : kit de composants partagés', 'status-badge.tsx'] | 1390 nodes found
NODE Skeleton()  [src=components/ui/skeleton.tsx loc=L3]
NODE Header()    [src=components/layout/header.tsx loc=L17]
NODE Card()      [src=components/ui/card.tsx loc=L5]
NODE Dialog()    [src=components/ui/dialog.tsx loc=L10]
NODE status-badge.tsx [src=components/status-badge.tsx loc=L1]
NODE Prompt G — P2 : kit de composants partagés [src=docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md loc=L266]
NODE stat-card.tsx [src=components/stat-card.tsx loc=L1]
NODE line-items-table.tsx [src=components/shared/line-items-table.tsx loc=L1]
NODE data-table.tsx [src=components/data-table/data-table.tsx loc=L1]
NODE confirm-delete-dialog.tsx [src=components/confirm-delete-dialog.tsx loc=L1]
NODE StatCard()  [src=components/stat-card.tsx loc=L21]
NODE ConfirmDeleteDialog() [src=components/confirm-delete-dialog.tsx loc=L27]
NODE cn()        [src=lib/utils.ts loc=L4]
NODE Skeleton()  [src=components/ui/skeleton.tsx loc=L3]
```

```
graphify query "components/shared composants réutilisables data-table StatCard confirm-delete-dialog line-items-table form-actions"
```

Sortie (extrait) :

```
Graph: graphify-out/graph.json (9006 nodes) | Traversal: BFS depth=2 | 1063 nodes found
NODE ConfirmDeleteDialog() [src=components/confirm-delete-dialog.tsx loc=L27]
NODE data-table.tsx [src=components/data-table/data-table.tsx loc=L1]
NODE StatCard()  [src=components/stat-card.tsx loc=L21]
NODE line-items-table.tsx [src=components/shared/line-items-table.tsx loc=L1]
NODE use-queries-shared.ts [src=hooks/use-queries-shared.ts loc=L1]
NODE Dialog()    [src=components/ui/dialog.tsx loc=L10]
NODE Table()     [src=components/ui/table.tsx loc=L7]
```

```
graphify explain "Prompt G — P2 : kit de composants partagés"
```

Sortie :

```
Node: Prompt G — P2 : kit de composants partagés
  ID:        docs_audits_prompts_governor_facturapro_prompt_g_p2_kit_de_composants_partagés
  Source:    docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md L266
  Type:      document
  Community: Prompts Governor — exécution de l'audit du 7 octobre 2026
  Degree:    1
Connections (1):
  <-- Prompts Governor — exécution de l'audit du 7 octobre 2026 [contains] [EXTRACTED] docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md:L266
```

```
graphify path "components/shared/line-items-table.tsx" "components/stat-card.tsx"
```

Sortie :

```
warning: target match was ambiguous (top score 341.536, runner-up 338.825)
No directed path found between 'components/shared/line-items-table.tsx' and 'components/stat-card.tsx'.
Re-run with --undirected to search ignoring edge direction.
```

**Lecture architecturale :** `line-items-table` et `stat-card` n'ont **aucune relation directe** dans le graphe — les composants partagés actuels sont des îlots consommés par des modules précis (formulaire de lignes ↔ KPI de liste), pas un kit cohérent. La communauté `utils.ts` (`cn`, `formatTND`) est le seul point de convergence réel aujourd'hui.

---

## B. Ce qui existe déjà (chemin exact + taille + consommateurs)

### B.1 Composants applicatifs

| Composant | Chemin exact | Lignes | Consommateurs |
|---|---|---:|---:|
| `DataTable` | `components/data-table/data-table.tsx` | 435 | 29 lignes d'import |
| `DataTable` (baril + types) | `components/data-table/index.ts` / `types.ts` | 2 / 52 | — |
| `StatCard` | `components/stat-card.tsx` | 104 | 26 lignes d'import (27 fichiers) |
| `StatusBadge` | `components/status-badge.tsx` | 483 | 29 fichiers consommateurs |
| `ConfirmDeleteDialog` | `components/confirm-delete-dialog.tsx` | 62 | 10 fichiers consommateurs |
| `LineItemsTable` | `components/shared/line-items-table.tsx` | 321 | 1 (`devis/nouveau-devis-client.tsx`) |
| `ProductSelect` | `components/shared/product-select.tsx` | 217 | 4 imports |
| `VariantSelect` | `components/shared/variant-select.tsx` | 48 | 2 imports |
| `FormActions` | `components/shared/form-actions.tsx` | 54 | **0** (non consommé) |

### B.2 Primitives `components/ui/` réutilisables

| Primitive | Chemin exact | Lignes | Consommateurs |
|---|---|---:|---:|
| `Dialog` | `components/ui/dialog.tsx` | 168 | 41 fichiers (`DialogContent`) |
| `Card` | `components/ui/card.tsx` | 103 | — |
| `Badge` | `components/ui/badge.tsx` | 49 | 58 fichiers (`<Badge`) |
| `Skeleton` | `components/ui/skeleton.tsx` | 13 | 51 fichiers / 186 appels |
| `Empty*` (état vide) | `components/ui/empty.tsx` | 104 | 7 fichiers |
| `Field*` (label/erreur/aide) | `components/ui/field.tsx` | 238 | **0** (non consommé) |

> **REUSE FIRST — deux découvertes majeures :**
> 1. `components/ui/empty.tsx` **est déjà un EmptyState** (`Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyMedia`) avec 7 consommateurs réels. Ne **pas** en créer un second.
> 2. `components/ui/field.tsx` **est déjà un socle FormField** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldSet`, `FieldTitle`) de 238 lignes, à **0 consommateur**. `FormField` (étape 2) doit être un wrapper **au-dessus** de `ui/field`, pas un composant from scratch.

### B.3 Librairies transversales

| Module | Chemin exact | Lignes | Usage |
|---|---|---:|---:|
| `formatTND`, `formatCurrency`, `formatPercent`, calculs | `lib/decimal.ts` | 217 | `formatTND` : 48 fichiers / 194 occurrences |
| `cn`, `formatDate`, `formatDateInput` | `lib/utils.ts` | 24 | `formatDate` importé par 28 fichiers |
| `createListStore` (search/statusFilter) | `lib/stores/create-list-store.ts` | 23 | **0** consommateur |

### B.4 Structure interne de `status-badge.tsx` (utile pour l'étape 2)

Le fichier est **déjà piloté par une table de configuration** :

```
components/status-badge.tsx:31:type StatusConfig = Record<string, { label: string; className: string; icon: React.ReactNode }>
components/status-badge.tsx:33:function GenericStatusBadge({ status, config, ... })
components/status-badge.tsx:438:const statusConfigsByType: Record<StatusType, StatusConfig>
components/status-badge.tsx:460:function StatusBadge({ type, status, className }: StatusBadgeProps)
```

13 tables de domaine (`invoiceStatusConfig`, `quoteStatusConfig`, `chequeStatusConfig`, `blStatusConfig`, `stockStatusConfig`, `achatStatusConfig`, `avoirStatusConfig`, `effetStatusConfig`, `bonCommandeStatusConfig`, `ordreFabricationStatusConfig`, `rapprochementStatusConfig`, `designStatutConfig`, `packingListStatusConfig`) + 13 wrappers `*StatusBadge` + `GenericStatusBadge`.
**Conséquence** : l'étape 2 (« StatusBadge générique piloté par une table de configuration ») porte sur la **généralisation de l'export et la réduction des wrappers**, pas sur l'invention d'un mécanisme — le mécanisme existe.

---

## C. Motifs dupliqués — occurrences réelles

Chaque occurrence ci-dessous est prouvée par la commande `grep` collée en §F (Mesures).

### C.1 Dialogs d'entité

- **41** fichiers avec `DialogContent` au total, dont **3** primitives `components/ui/` (`dialog.tsx`, `alert-dialog.tsx`, `command.tsx`) → **38** fichiers applicatifs
- **31** fichiers nommés `*dialog*.tsx` dans `components/`
- **108** `DialogFooter` dans **35** fichiers
- **116** `DialogHeader` dans **39** fichiers
- **19** `type="submit"` dans **19** fichiers (formulaire dans dialog)

Chaque dialog réimplémente : structure `DialogHeader/DialogContent/DialogFooter`, boutons `Annuler` + `Enregistrer`, état `isPending`, erreurs inline. `ConfirmDeleteDialog` couvre le seul cas « suppression ».

### C.2 Cartes KPI / stat

- `StatCard` est **bien adopté** : 26 imports / 27 fichiers.
- **9** blocs KPI locaux reprennent la classe signature de `StatCard` (`text-2xl font-semibold tabular-nums`) **sans** passer par `StatCard` :
  - `components/dashboard/dashboard-section-cards.tsx` : 6 blocs (L20, L39, L50, L67, L85, L106)
  - `components/dashboard/dashboard-client.tsx` : 3 blocs (L77, L94, L111)
- **2** valeurs KPI en `text-3xl font-bold` hors `StatCard` : `components/devis/devis-detail-client.tsx:409`, `components/effets/effet-detail-client.tsx:214`
- **1 collision de nom** : `components/produits/product-performance-chart.tsx:115` définit **son propre** `function StatCard({ label, value, unit })` (4 usages, L39-L42), qui **écrase** le `StatCard` partagé au niveau module.

### C.3 Barres de filtres

- **22** fichiers portent un état de recherche local (`setSearch` / `searchQuery` / `setSearchQuery`)
- **7** fichiers portent un `statusFilter` local (**15** occurrences) : `achats-client`, `avoirs-client`, `bons-commande-client`, `bl-client`, `devis-client`, `effets-client`, `factures-client`
- **5** fichiers combinent recherche + `Select` de statut
- **`lib/stores/create-list-store.ts` existe (23 l.) et a 0 consommateur**
- La toolbar de `DataTable` fournit **déjà** `searchValue` + `onSearchChange` + `facetedFilters` (`FacetedFilterDef`, `DateRangeFilterDef`) — mais seuls **6** fichiers l'utilisent, sur 26 consommateurs de `DataTable`

### C.4 En-têtes de page

- **0** occurrence de `PageHeader` dans le projet
- **29** `<h1` dans **29** fichiers, répartis sur **8 classes différentes** :
  - 15 × `text-lg font-semibold`
  - 4 × `text-base font-semibold`
  - 2 × `text-xl md:text-2xl font-bold tracking-tight text-foreground truncate`
  - 2 × `text-xl font-bold tracking-tight`
  - 2 × `text-lg font-semibold tracking-tight`
  - 1 × `text-sm font-medium`
  - 1 × `text-lg font-bold tracking-tight`
  - 1 × `text-2xl font-bold tracking-tight truncate`
- **20** `h1`/`h2` avec `text-lg font-semibold` (titre de section) dans 20 fichiers
- **6** fichiers `*-header*.tsx` par module (`avoir-detail-header`, `client-profile-header`, `export-detail-header`, `fournisseur-profile-header`, `scan-verif-header`, `layout/header`)

### C.5 Skeletons

- **51** fichiers contenant `<Skeleton`, **186** appels au total
- **8** fichiers skeleton dédiés (hors `components/ui/skeleton.tsx`) : `achats/achat-detail-skeleton`, `avoirs/avoir-detail-skeleton`, `bons-livraison/bl-detail-skeleton`, `dashboard/dashboard-skeleton`, `devis/devis-detail-skeleton`, `exports/export-detail-skeleton`, `exports/export-list-skeleton`, `factures/invoice-detail-skeleton`
- **35** fichiers génèrent des skeletons de liste en ligne (`Array.from({ length: ... })`)
- Routes : **1 seul** `app/(app)/loading.tsx`, **1 seul** `app/(app)/error.tsx`, aucun `not-found.tsx`, aucun `global-error.tsx` → à traiter par le **lot F** (Prompt F étape 5, `ListSkeleton` / `DetailSkeleton`), à **coordonner** avec le lot G pour ne pas créer deux fois le même composant.

### C.6 Badges de statut

- `StatusBadge` consommé par **29 fichiers** (64 occurrences hors définition)
- **43** fichiers utilisent `<Badge` **sans** `StatusBadge` (badges locaux potentiels)
- **67** occurrences `status === "` dans **22** fichiers (branches de statut en dur dans les colonnes)
- **85** `<Badge ... variant` (variantes conditionnelles)

### C.7 Cellules monétaires — `fmt()` locaux

- **3** fichiers de `components/paiements` définissent `const fmt` (confirmant le « 3 fmt() » du prompt) :
  - `components/paiements/tresorerie-client.tsx:47`
  - `components/paiements/tresorerie-echeances.tsx:53`
  - `components/paiements/tresorerie-evolution-chart.tsx:14`
- plus **2** `fmtShort` (`tresorerie-client.tsx:50`, `tresorerie-evolution-chart.tsx:17`)
- **5** `new Intl.NumberFormat` locaux, tous dans `components/paiements/`
- **0** `fmt()` dans `lib/` hormis `lib/decimal.ts:59` (interne à `formatTND`)
- 11 `toLocaleString()` locaux dans `components`/`app` (dont 5 monétaires hors `components/ui`)
- Référence cible déjà existante : `formatTND` (`lib/decimal.ts:38`) = **48 fichiers / 194 occurrences**

### C.8 `formatDate` locaux

- **7** définitions/exports `formatDate` au total, dont **4 définitions locales** :
  - `components/effets/effet-detail-client.tsx:31` `function formatDate(...)`
  - `components/effets/lettre-de-change.tsx:5` `function formatDate(...)` + `:9` `function formatDateShort(...)`
  - `components/produits/product-stock-movements.tsx:15` `function formatDate(date: Date)`
  - `app/(app)/effets/[id]/preview/page.tsx:8` `function formatDate(...)`
- Référence cible déjà existante : `lib/utils.ts:8` `export function formatDate(...)`, importée par **28** fichiers
- **97** lignes mentionnant `formatDate`, dont **58** appels hors définitions locales

---

## D. Recommandations par motif

Règle appliquée : **REUSE FIRST** — « extraire dans `components/shared/` » uniquement quand **aucun** composant couvrant le motif n'existe ; sinon « réutiliser l'existant ».

| # | Motif | Décision | Nom proposé | Raison (preuve) | Consommateurs attendus |
|---|---|---|---|---|---|
| 1 | En-tête de page | **Extraire** | `PageHeader` | 0 `PageHeader`, 29 `<h1>` sur 8 classes | clients, fournisseurs, achats, factures, effets + parametres, produits, stock, cheques, avoirs, devis, bons-*, rapports, entreprises (lots D3/F) |
| 2 | Grille KPI | **Extraire** (sur l'existant) | `KpiGrid` (wrappant `StatCard`) | `StatCard` existe (104 l., 26 imports) mais 9 blocs KPI locaux + 1 homonyme local | dashboard (9 blocs), les 5 modules pilotes, listes D3 |
| 3 | Carte stat unitaire | **Réutiliser** | `StatCard` (inchangé) — corriger le homonyme de `product-performance-chart.tsx:115` | 26 imports prouvent l'adoption | idem |
| 4 | Dialog d'entité | **Extraire** | `EntityFormDialog` (RHF + Zod, footer standard, pending, erreurs inline) | 38 fichiers applicatifs `DialogContent`, 108 `DialogFooter`, 0 `EntityFormDialog` | clients, fournisseurs, achats, factures, effets + lot J (`nouveau-matiere-dialog`, `nouveau-of-dialog`, `rapprochement-card`, `ngp-settings-client`, `entreprise-banques-client`, `apercu-effet-dialog`, `packing-list-client`, `ordres-fabrication-client`, `adjust-stock-dialog`, `general-settings-client`) |
| 5 | Confirmation | **Étendre l'existant** | `ConfirmDialog` = `components/confirm-delete-dialog.tsx` élargi (message/variante) | 10 consommateurs déjà en place, **3** `confirm()` natifs restants (`exports/export-detail-client.tsx:109`, `parametres/ngp-settings-client.tsx:141`, `parametres/utilisateurs-settings-client.tsx:51`) | ces 3 fichiers + nouveaux dialogs |
| 6 | Barre de filtres | **Retiré le 2026-10-18** — motif absorbé par la toolbar `DataTable` | *(brique supprimée — voir §H.13)* | `data-table.tsx:147-160` rend lui-même l'`Input` de recherche (`searchValue`) et les listes passent leur filtre de statut via `toolbarActions` → aucune barre séparée nécessaire | — |
| 7 | Section / carte de section | **Extraire** | `SectionCard` | **0** composant `SectionCard` réel (seul `SectionCardsSection` du dashboard, `components/dashboard/dashboard-section-cards.tsx:8`) | détail (5 modules pilotes), parametres, entreprises |
| 8 | Champ de formulaire | **Réutiliser l'existant** (wrapper) | `FormField` = wrapper de `components/ui/field.tsx` | `ui/field.tsx` 238 l. à **0** consommateur | lot J (10 formulaires) + EntityFormDialog |
| 9 | État vide | **Réutiliser l'existant** | `Empty*` (`components/ui/empty.tsx`) — **ne pas créer `EmptyState`** | 7 consommateurs réels déjà | modules sans état vide (fournisseurs, achats, entrepôts, parametres) |
| 10 | Skeleton | **Extraire** (coordonné lot F) | `ListSkeleton` + `DetailSkeleton` | 186 appels / 51 fichiers, 8 fichiers skeleton ad hoc, 35 maps `Array.from` | loading.tsx des 9 modules cités en lot F + listes pilotes |
| 11 | Badge de statut | **Extraire / généraliser l'existant** | `StatusBadge` générique (table de config) | 483 l., 13 configs internes, `GenericStatusBadge` déjà présent ; 43 fichiers en `<Badge>` hors kit | les 43 fichiers `<Badge>`-sans-`StatusBadge`, dont clients, fournisseurs, produits, factures, exports |
| 12 | Cellule monétaire | **Extraire** | `MoneyCell` | 3 `fmt()` locaux + 5 `Intl.NumberFormat` locaux dans `components/paiements` | les 5 modules pilotes + trésorerie (lot D3) |
| 13 | Cellule date | **Extraire** | `DateCell` | 4 `formatDate` locaux | les 5 modules pilotes + stock-mouvements, effets/preview |

### Cohérence des décisions

- **Extraire (5 nouveaux fichiers dans `components/shared/`)** : `PageHeader`, `KpiGrid`, `EntityFormDialog`, `SectionCard`, `MoneyCell`, `DateCell` (6 en comptant les cellules) + extension de `confirm-delete-dialog.tsx` en `ConfirmDialog`. La 7ᵉ brique prévue — la barre de filtres — a été **retirée le 2026-10-18** (redondante avec la toolbar `DataTable`, voir §H.13) : ne pas la recréer.
- **Réutiliser sans créer** : `StatCard`, `DataTable` (toolbar de filtre), `ui/field` → `FormField`, `ui/empty` → état vide, `ui/skeleton` → socle des skeletons, `StatusBadge` (généralisation interne), `formatTND`, `formatDate`, `createListStore`.
- **À corriger sans créer** : homonyme `StatCard` local dans `components/produits/product-performance-chart.tsx:115` ; `components/shared/form-actions.tsx` (0 consommateur → adopter ou supprimer, ne pas dupliquer).

### Critère du Prompt G

> « aucun composant partagé sans au moins 3 usages réels après migration »

Sous ce seuil au moment de l'inventaire : `LineItemsTable` (1), `VariantSelect` (2), `FormActions` (0), `ui/field` (0), `createListStore` (0). Le plan de migration (étape 4) doit leur donner ≥ 3 consommateurs ou les retirer.

---

## E. Ambiguïtés et écarts avec l'énoncé du Prompt G

> **STOP signalé — chemins annoncés par le prompt qui n'existent pas (non inventés) :**

1. **`components/factures/effet-detail-client.tsx`** → **n'existe pas**.
   Réel : `components/effets/effet-detail-client.tsx` (671 l. selon le lot I).
   Preuve : `ls components/factures/` ne contient pas `effet-detail-client.tsx`.
2. **`app/api/effets/[id]/preview`** → **n'existe pas** (`app/api/effets/[id]/` ne contient que `route.ts`).
   Réel : `app/(app)/effets/[id]/preview/page.tsx`.
   Preuve : `find app -path "*effets*preview*" -type f` → `app/(app)/effets/[id]/preview/page.tsx`.
3. **`components/stat-card` (dossier)** → **n'existe pas** comme dossier ; c'est un fichier simple `components/stat-card.tsx`.
4. **`SectionCard`** annoncé comme existant potentiel → **0 composant réel** (voir §C/D ligne 7).

Autres points à trancher par le Governor :

5. **`components/shared/form-actions.tsx` : 0 consommateur** (preuve §F). Composant mort — à adopter dans `EntityFormDialog` ou à supprimer. Ne pas le « retrouver » comme s'il était en service.
6. **`lib/stores/create-list-store.ts` : 0 consommateur** (preuve §F). La brique censée être son **premier** consommateur a été **retirée le 2026-10-18** (§H.13) — ce n'est donc plus un motif pour (re)créer une barre de filtres ; à réévaluer au lot J (adoption pour un autre usage, ou retrait de `createListStore`).
7. **`components/ui/field.tsx` : 0 consommateur** alors que `ui/empty.tsx` en a 7 → incohérence d'adoption des primitives shadcn. Décider si `FormField` wrappe `ui/field` (recommandé) ou si `ui/field` est retiré.
8. **Coordonnation lot F / lot G** : `ListSkeleton`, `DetailSkeleton`, `EmptyState`, `ErrorState` relèvent du **Prompt F étape 5**, et `EmptyState` a **déjà** un équivalent (`ui/empty.tsx`). Risque de double création entre les deux lots — à arbitrer avant l'étape 2.
9. **`docs/wiki/ui-dialogs.md`** existe (7550 octets, 2026-10-02) et sera modifié à l'**étape 5** du Prompt G — hors périmètre de cet inventaire.
10. **CHANGELOG** : cette étape ne modifie aucun code. Conformément à la consigne du Governor (« un seul fichier livré : `docs/wiki/ui-kit.md` »), l'entrée `docs/wiki/CHANGELOG.md` n'a **pas** été ajoutée ici — à traiter par le Governor au STEP 6.

---

## F. Mesures — commandes exactes et sorties

> Toutes les commandes ont été exécutées depuis `/workspace/facturapro-tn-bureau`, une à la fois.

### F.1 Tailles des composants (wc -l)

```bash
wc -l components/shared/form-actions.tsx components/shared/line-items-table.tsx components/shared/product-select.tsx components/shared/variant-select.tsx components/status-badge.tsx components/confirm-delete-dialog.tsx components/stat-card.tsx components/data-table/data-table.tsx components/data-table/index.ts components/data-table/types.ts lib/stores/create-list-store.ts lib/decimal.ts lib/utils.ts
```

```
   54 components/shared/form-actions.tsx
  321 components/shared/line-items-table.tsx
  217 components/shared/product-select.tsx
   48 components/shared/variant-select.tsx
  483 components/status-badge.tsx
   62 components/confirm-delete-dialog.tsx
  104 components/stat-card.tsx
  435 components/data-table/data-table.tsx
    2 components/data-table/index.ts
   52 components/data-table/types.ts
   23 lib/stores/create-list-store.ts
  217 lib/decimal.ts
   24 lib/utils.ts
 2042 total
```

```bash
wc -l components/ui/skeleton.tsx components/ui/badge.tsx components/ui/dialog.tsx components/ui/card.tsx components/ui/empty.tsx components/ui/field.tsx
```

```
   13 components/ui/skeleton.tsx
   49 components/ui/badge.tsx
  168 components/ui/dialog.tsx
  103 components/ui/card.tsx
  104 components/ui/empty.tsx
  238 components/ui/field.tsx
  675 total
```

### F.2 Dialogs

```bash
grep -rln "DialogContent" components app --include=*.tsx | wc -l
grep -rln "DialogContent" components/ui/*.tsx
grep -rln "DialogContent" components app --include=*.tsx | grep -v "^components/ui/" | wc -l
```
```
41
components/ui/alert-dialog.tsx
components/ui/command.tsx
components/ui/dialog.tsx
38
```

```bash
find components -name "*dialog*.tsx" -type f | wc -l
```
```
31
```

```bash
grep -rn "DialogFooter" components app --include=*.tsx | wc -l
grep -rln "DialogFooter" components app --include=*.tsx | wc -l
grep -rn "DialogHeader" components app --include=*.tsx | wc -l
grep -rln "DialogHeader" components app --include=*.tsx | wc -l
```
```
108
35
116
39
```

```bash
grep -rn "type=\"submit\"" components app --include=*.tsx | wc -l
grep -rln "type=\"submit\"" components app --include=*.tsx | wc -l
```
```
19
19
```

```bash
grep -rn "ConfirmDialog" components app lib --include=*.tsx --include=*.ts | wc -l
grep -rn "EntityFormDialog" components app lib --include=*.tsx --include=*.ts | wc -l
```
```
0
0
```

### F.3 ConfirmDeleteDialog et `confirm()` natifs

```bash
grep -rln "ConfirmDeleteDialog" components app --include=*.tsx | wc -l
grep -rn "import.*ConfirmDeleteDialog" components app --include=*.tsx | wc -l
```
```
11
10
```
(11 = 10 consommateurs + `components/confirm-delete-dialog.tsx` lui-même)

```bash
grep -rn "confirm(" components app --include=*.tsx
```
```
components/exports/export-detail-client.tsx:109:  onDelete={() => { if (confirm("Supprimer cet export ?")) ...
components/parametres/ngp-settings-client.tsx:141:  if (confirm("Supprimer ce code NGP ?")) {
components/parametres/utilisateurs-settings-client.tsx:51:  if (confirm(`Supprimer ${user.name} ? Cette action est irréversible.`)) {
```
```
3
```

### F.4 StatCard / KPI

```bash
grep -rln "StatCard" components app --include=*.tsx | wc -l
grep -rn "import.*StatCard" components app --include=*.tsx | wc -l
```
```
28
26
```

```bash
grep -rn "text-2xl font-semibold" components app --include=*.tsx | grep -v "components/stat-card.tsx"
```
```
components/dashboard/dashboard-client.tsx:77:            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.valeurStock ?? "0")}</CardTitle>
components/dashboard/dashboard-client.tsx:94:            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-orange-600 dark:text-orange-400">{String(stats.alertesStock)}</CardTitle>
components/dashboard/dashboard-client.tsx:111:           <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-red-600 dark:text-red-400">{String(stats.produitsRupture ?? "0")}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:20:          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.chiffreAffaires)}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:39:          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.creancesEnAttente)}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:50:          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.montantEnRetard)}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:67:          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.tvaDuMois)}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:85:          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{String(stats.devisCount)}</CardTitle>
components/dashboard/dashboard-section-cards.tsx:106:         <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{String(stats.nouveauxClients)}</CardTitle>
```
```
9
```

```bash
grep -rn "function StatCard\|const StatCard" components app --include=*.tsx
```
```
components/produits/product-performance-chart.tsx:115:function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
components/stat-card.tsx:21:export function StatCard({
```

```bash
grep -rn "text-3xl font-bold\|text-3xl font-semibold" components app --include=*.tsx | wc -l
```
```
2
```

### F.5 Filtres

```bash
grep -rln "setSearch\|searchQuery\|setSearchQuery" components app --include=*.tsx | wc -l
```
```
22
```

```bash
grep -rn "statusFilter" components app --include=*.tsx | wc -l
grep -rln "statusFilter" components app --include=*.tsx
```
```
15
components/achats/achats-client.tsx
components/avoirs/avoirs-client.tsx
components/bons-commande/bons-commande-client.tsx
components/bons-livraison/bl-client.tsx
components/devis/devis-client.tsx
components/effets/effets-client.tsx
components/factures/factures-client.tsx
```

```bash
grep -rn "createListStore" components app hooks lib --include=*.tsx --include=*.ts | grep -v "lib/stores/create-list-store.ts"
```
```
(empty — 0 consommateur)
```

```bash
grep -rln "FacetedFilterDef" components app --include=*.tsx | wc -l
grep -rln "FacetedFilterDef" components app --include=*.tsx
```
```
6
components/achats/achats-client.tsx
components/avoirs/avoirs-client.tsx
components/factures/factures-client.tsx
components/paiements/paiements-client.tsx
components/stock/inventaire-client.tsx
components/stock/mouvements-client.tsx
```

```bash
grep -rn "@/components/data-table" components app --include=*.tsx | wc -l
```
```
29
```

### F.6 En-têtes de page

```bash
grep -rn "PageHeader" components app lib --include=*.tsx --include=*.ts | wc -l
```
```
0
```

```bash
grep -rln "<h1" components app --include=*.tsx | wc -l
grep -rn "<h1" components app --include=*.tsx | wc -l
```
```
29
29
```

```bash
grep -rhn "<h1[^>]*className=\"[^\"]*\"" components app --include=*.tsx -o | sed 's/.*className="//; s/".*//' | sort | uniq -c | sort -rn
```
```
     15 text-lg font-semibold
      4 text-base font-semibold
      2 text-xl md:text-2xl font-bold tracking-tight text-foreground truncate
      2 text-xl font-bold tracking-tight
      2 text-lg font-semibold tracking-tight
      1 text-sm font-medium
      1 text-lg font-bold tracking-tight
      1 text-2xl font-bold tracking-tight truncate
```

```bash
grep -rn "<h1[^>]*text-lg font-semibold\|<h2[^>]*text-lg font-semibold" components app --include=*.tsx | wc -l
```
```
20
```

### F.7 Skeletons

```bash
grep -rln "<Skeleton" components app --include=*.tsx | wc -l
grep -rn "<Skeleton" components app --include=*.tsx | wc -l
```
```
51
186
```

```bash
find components -name "*skeleton*.tsx" -type f | sort
```
```
components/achats/achat-detail-skeleton.tsx
components/avoirs/avoir-detail-skeleton.tsx
components/bons-livraison/bl-detail-skeleton.tsx
components/dashboard/dashboard-skeleton.tsx
components/devis/devis-detail-skeleton.tsx
components/exports/export-detail-skeleton.tsx
components/exports/export-list-skeleton.tsx
components/factures/invoice-detail-skeleton.tsx
components/ui/skeleton.tsx
```

```bash
grep -rln "Array.from({ length:" components app --include=*.tsx | wc -l
find app -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" | sort
```
```
35
app/(app)/error.tsx
app/(app)/loading.tsx
```

### F.8 Badges de statut

```bash
grep -rln "StatusBadge" components app --include=*.tsx | wc -l
```
```
30
```
(30 = 29 consommateurs + `components/status-badge.tsx`)

```bash
grep -rln "<Badge" components app --include=*.tsx | grep -v "^components/ui/" | wc -l
comm -23 <(grep -rln "<Badge" components app --include=*.tsx | grep -v "^components/ui/" | sort) <(grep -rln "StatusBadge" components app --include=*.tsx | sort) | wc -l
```
```
58
43
```

```bash
grep -rn "status === \"" components app --include=*.tsx | wc -l
grep -rln "status === \"" components app --include=*.tsx | wc -l
grep -rn "<Badge" components app --include=*.tsx | grep -c "variant"
```
```
67
22
85
```

```bash
grep -rn "StatusBadge" components app --include=*.tsx | grep -v "components/status-badge.tsx" | wc -l
```
```
64
```

### F.9 Cellules monétaires / `fmt()` locaux

```bash
grep -rn "const fmt\|function fmt" components app lib hooks --include=*.ts --include=*.tsx
```
```
components/paiements/tresorerie-client.tsx:47:const fmt = (n: number | string) => FMT.format(typeof n === "string" ? parseFloat(n) : n)
components/paiements/tresorerie-client.tsx:50:const fmtShort = (n: number | string) => SHORT_FMT.format(typeof n === "string" ? parseFloat(n) : n)
components/paiements/tresorerie-echeances.tsx:53:const fmt = (n: number | string) => FMT.format(typeof n === "string" ? parseFloat(n) : n)
components/paiements/tresorerie-evolution-chart.tsx:14:const fmt = (n: number | string) => FMT.format(typeof n === "string" ? parseFloat(n) : n)
components/paiements/tresorerie-evolution-chart.tsx:17:const fmtShort = (n: number | string) => SHORT_FMT.format(typeof n === "string" ? parseFloat(n) : n)
lib/decimal.ts:59:    const fmt = known ?? DEVISE_SYMBOLS.TND;
lib/packing-list/pdf.ts:58:function fmtDate(d: Date | string | null | undefined): string {
lib/pdf-builder.ts:10:const fmtCurrency = (n: number, devise = "TND") => {
lib/pdf-converters.ts:6:function fmtDate(v: Date | string | null | undefined): string {
```
```
10
```

```bash
grep -rn "new Intl.NumberFormat" components app lib --include=*.tsx --include=*.ts
```
```
components/paiements/tresorerie-client.tsx:46:const FMT = new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
components/paiements/tresorerie-client.tsx:49:const SHORT_FMT = new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
components/paiements/tresorerie-echeances.tsx:52:const FMT = new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
components/paiements/tresorerie-evolution-chart.tsx:13:const FMT = new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
components/paiements/tresorerie-evolution-chart.tsx:16:const SHORT_FMT = new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
```
```
5
```

```bash
grep -rln "formatTND" components app --include=*.tsx | wc -l
grep -rn "formatTND" components app --include=*.tsx | wc -l
grep -rn "toLocaleString" components app --include=*.tsx | wc -l
```
```
48
194
11
```

### F.10 `formatDate` locaux

```bash
grep -rn "function formatDate\|const formatDate" components app lib hooks --include=*.ts --include=*.tsx
```
```
components/effets/effet-detail-client.tsx:31:function formatDate(date: Date | string | null): string {
components/effets/lettre-de-change.tsx:5:function formatDate(d: Date | string | null): string {
components/effets/lettre-de-change.tsx:9:function formatDateShort(d: Date | string | null): string {
components/produits/product-stock-movements.tsx:15:function formatDate(date: Date) {
app/(app)/effets/[id]/preview/page.tsx:8:function formatDate(date: Date | string | null): string {
lib/utils.ts:8:export function formatDate(date: Date | string): string {
lib/utils.ts:17:export function formatDateInput(date: Date | string | null | undefined): string {
```
```
7
```

```bash
for f in $(grep -rln "formatDate" components app --include=*.tsx); do if ! grep -q "formatDate" <(grep -n "from \"@/lib/utils\"" "$f"); then echo "$f"; fi; done
```
```
components/effets/effet-detail-client.tsx
components/effets/lettre-de-change.tsx
components/produits/product-stock-movements.tsx
app/(app)/effets/[id]/preview/page.tsx
```
```
4
```

```bash
grep -rn "formatDate" components app --include=*.tsx | wc -l
grep -rn "formatDate(" components app --include=*.tsx | grep -v "function formatDate\|const formatDate\|formatDateInput" | wc -l
```
```
97
58
```

### F.11 Composants sans consommateur

```bash
grep -rn "form-actions" components app --include=*.tsx --include=*.ts
```
```
(empty — 0 consommateur)
```

```bash
grep -rn "ui/empty" components app --include=*.tsx | wc -l
grep -rn "from \"@/components/ui/field\"" components app --include=*.tsx | wc -l
grep -rn "SectionCard" components app lib --include=*.tsx --include=*.ts | wc -l
grep -rn "FormField" components app lib --include=*.tsx --include=*.ts | wc -l
grep -rn "FilterBar" components app lib --include=*.tsx --include=*.ts | wc -l
grep -rn "MoneyCell\|DateCell" components app lib --include=*.tsx --include=*.ts | wc -l
grep -rn "EmptyState" components app lib --include=*.tsx --include=*.ts | wc -l
```
```
7
0
3
0
0
0
0
```

```bash
grep -rn "@/components/shared/" components app --include=*.tsx | wc -l
```
```
7
```

### F.12 Modules pilotes

```bash
for d in clients fournisseurs achats factures effets; do printf "%s: " "$d"; find components/$d -name "*.tsx" -type f | xargs wc -l | tail -1; done
```
```
clients:  1656 total
fournisseurs: 1195 total
achats:  2364 total
factures: 2602 total
effets:  3236 total
```

```bash
wc -l components/clients/clients-client.tsx components/fournisseurs/fournisseurs-client.tsx components/achats/achats-client.tsx components/factures/factures-client.tsx components/effets/effets-client.tsx
```
```
  239 components/clients/clients-client.tsx
  214 components/fournisseurs/fournisseurs-client.tsx
  222 components/achats/achats-client.tsx
  485 components/factures/factures-client.tsx
  323 components/effets/effets-client.tsx
 1483 total
```

### F.13 État vide / routes

```bash
grep -rn "EmptyState" components app lib --include=*.tsx --include=*.ts | wc -l
find app -name "loading.tsx" -o -name "error.tsx" | sort
```
```
0
app/(app)/error.tsx
app/(app)/loading.tsx
```

---

## G. Synthèse

- **Motifs inventoriés** : **10** (dialogs d'entité, cartes KPI/stat, barres de filtres, en-têtes de page, skeletons, badges de statut, cellules monétaires `fmt()`, `formatDate` locaux, états vides, sections `SectionCard`).
- **Composants existants** : 9 applicatifs (`DataTable`, `StatCard`, `StatusBadge`, `ConfirmDeleteDialog`, `LineItemsTable`, `ProductSelect`, `VariantSelect`, `FormActions`) + 6 primitives `ui/` réutilisables (`Dialog`, `Card`, `Badge`, `Skeleton`, `Empty`, `Field`) + 3 librairies (`lib/decimal.ts`, `lib/utils.ts`, `lib/stores/create-list-store.ts`).
- **À extraire dans `components/shared/`** : `PageHeader`, `KpiGrid`, `EntityFormDialog`, `ConfirmDialog` (extension), `SectionCard`, `FormField` (wrapper `ui/field`), `MoneyCell`, `DateCell`, `StatusBadge` générique — **moins la barre de filtres, retirée le 2026-10-18** (redondante avec la toolbar `DataTable`, §H.13).
- **À réutiliser sans créer** : `StatCard`, `DataTable` (toolbar), `ui/empty`, `ui/skeleton`, `formatTND`, `formatDate`, `createListStore`.
- **Zéro code applicatif produit à cette étape.**

---

## H. Livré le 2026-10-18 — étapes 2 et 3 (Frontend Agent, Prompt G — P2)

- **Auteur** : Frontend Agent. Étape 2 = création des briques ; étape 3 = suppression des formats locaux. L'étape 1 (inventaire) reste celle de l'Architecture Agent ci-dessus.
- **Frontières respectées** : aucune migration de module (étape 4 du prompt = lot suivant, seuls les fichiers `fmt`/`formatDate` ont été touchés), aucun `ListSkeleton`/`DetailSkeleton`/`EmptyState`/`ErrorState`/`loading.tsx`/`error.tsx`/`not-found.tsx`/`global-error.tsx` (lot F), `AGENTS.md` et `docs/wiki/ui-dialogs.md` intacts, 0 route API, 0 `schema.prisma`, 0 commit.
- **Vérifications finales** (commandes exécutées, sorties dans §H.8) : lint **retour exact à la baseline 406**, `tsc` **0 erreur**, `vitest` **19 fichiers / 323 tests**.

> **🚨 Mise à jour du 2026-10-18 (lot G.6 de clôture) — deux décisions utilisateur appliquées telles quelles, voir §H.13 :**
> 1. **`FilterBar` a été SUPPRIMÉE** (`components/shared/filter-bar.tsx`, 116 l. → supprimé) : redondante avec la toolbar de `DataTable`. Toutes les mentions ci-dessous qui la présentent comme une brique à extraire/adopter sont **obsolètes** — ne pas la recréer.
> 2. **`EntityFormDialog` a désormais 1 usage réel** (`avoir-dialog.tsx`) ; le seuil « ≥ 3 usages » est **reporté au lot J** (dette datée, §H.13). Les compteurs d'usage à jour sont en §H.13.

### H.1 Briques créées dans `components/shared/` (étape 2)

| Composant | Fichier | Lignes | API (props) | Consommateurs actuels |
|---|---|---:|---|---:|
| `PageHeader` | `components/shared/page-header.tsx` | 24 | `{ title: string; description?: string; actions?: ReactNode; className?: string }` — `<h1>` unifié `text-xl font-semibold tracking-tight` (fin des 8 classes divergentes de §C.4) | 0 (migration des 29 `<h1>` = étape 4) |
| `KpiGrid` | `components/shared/kpi-grid.tsx` | 26 | `{ children: ReactNode; columns?: 2 \| 3 \| 4; className?: string }` — **conteneur** de grille responsive ; les cartes restent des `StatCard` passées en enfants (aucune duplication) | 0 (dashboard + listes = étape 4) |
| `EntityFormDialog` | `components/shared/entity-form-dialog.tsx` | 109 | `{ open, onOpenChange, title, description?, schema: z.ZodType<TOut, TIn>, defaultValues, onSubmit: (v: TOut) => void, isPending?, submitLabel?, pendingLabel?, cancelLabel?, size?: "sm"\|"md"\|"lg", children: (form: UseFormReturn) => ReactNode }` — RHF + Zod, footer standard dans le `<form>`, spinner + pending, Alert récapitulatif en tête (`errors.root`), erreurs inline via `FormField` | 0 (lote J + 5 modules pilotes = étape 4) |
| `SectionCard` | `components/shared/section-card.tsx` | 51 | `{ title?, description?, actions?, children, headingLevel?: "h2"\|"h3" (défaut h2), className?, contentClassName? }` — `Card` + header sémantique + `CardAction` | 0 (pages de détail = étape 4) |
| `FormField` | `components/shared/form-field.tsx` | 54 | `{ label: string; error?: string; description?: string; required?: boolean; children: ReactNode; className? }` — **wrapper au-dessus de `components/ui/field.tsx`** (`Field`/`FieldLabel`/`FieldContent`/`FieldDescription`/`FieldError`), ajoute l'astérisque requis, la bascule description ↔ erreur et `data-invalid` | 0 (adopter dans `EntityFormDialog` + lot J) |
| `MoneyCell` | `components/shared/money-cell.tsx` | 16 | `{ value: string \| number \| null \| undefined; className? }` — `formatTND` de `lib/decimal.ts` + `tabular-nums` | **3** : `paiements/tresorerie-client.tsx`, `paiements/tresorerie-echeances.tsx`, `paiements/tresorerie-evolution-chart.tsx` |
| `DateCell` | `components/shared/date-cell.tsx` | 19 | `{ value: Date \| string \| null \| undefined; fallback?: string (défaut « — »); className? }` — `formatDate` de `lib/utils.ts`, fallback muted pour date absente | 0 (colonnes de listes = étape 4) |

Tous ≤ 250 lignes (critère du prompt respecté).

**Mises à jour du 2026-10-18 (lot G.6, §H.13)** :
- La **8ᵉ brique** de cette table (barre de filtres, 116 l.) a été **supprimée le 2026-10-18** → déplacée dans la section « brique retirée » §H.13. Le tableau ci-dessus ne liste plus que les briques en service.
- `EntityFormDialog` : **consommateurs 0 → 1** (`components/avoirs/avoir-dialog.tsx`, 2026-10-18) — seuil « ≥ 3 » reporté au lot J (§H.13 B).

### H.2 `StatusBadge` générique — vérification (point 10 du prompt) : **CONFORME, rien réécrit**

`components/status-badge.tsx` satisfait déjà « générique piloté par table de config » : `StatusConfig` (L31) = `Record<string, { label; className; icon }>`, `GenericStatusBadge({ status, config })` (L33) = moteur générique, `statusConfigsByType` (L438) = 13 tables de domaine, `StatusBadge({ type, status })` (L460) = façade par type. **Aucune réécriture, aucun export ajouté** (conformément à la consigne « vérifier uniquement »).
**Point d'attention remonté au Governor (non traité ici)** : `GenericStatusBadge` n'est **pas exporté** — un domaine hors des 13 types existants ne peut pas piloter le badge avec sa propre config sans modifier ce fichier. À arbitrer en étape 4/5 (export d'une ligne, sans risque) si un besoin réel apparaît.

### H.3 `FormActions` — verdict : **conservé intact, NON réutilisé pour `EntityFormDialog`**

`components/shared/form-actions.tsx` (54 l., 0 consommateur) n'a pas été supprimé ni modifié. **Raison** : son contrat est **page-level**, pas dialog — `backHref: string` + bouton Annuler rendu en `<Link>` (navigation), actions pilotées par `onClick` (**pas de `type="submit"`**, donc inutilisable tel quel dans un `<form>` RHF), barre `sticky bottom-0` avec `border-t` conçue pour le pied d'une page, icône par défaut `Send`. L'adopter pour le footer d'un dialog imposerait de changer son API (submit semantics + suppression du Link) — soit le modifier pour un contexte qu'il n'a pas été conçu pour. Il reste disponible pour les **pages de formulaire pleine largeur** (ex. futur formulaire Tiers de type `produit-form-page.tsx`) ; sa pertinence sera revue au seuil « ≥ 3 usages réels » (étape 4 ou retrait).

### H.4 `ConfirmDialog` — extension de `components/confirm-delete-dialog.tsx` (zéro régression)

- Le fichier exporte désormais **`ConfirmDialog` + l'alias `ConfirmDeleteDialog`** (mêmes props). Les **10 consommateurs existants** (imports vérifiés : modeles-client, ordres-fabrication-client, packing-list-client, bons-commande-client, bl-client, clients-client, fournisseurs-client, carton-types-manager, planning-client, produits-client) n'ont **aucun changement de comportement** : les défauts (`variant="destructive"`, icône `Trash2`, libellés « Supprimer » / « Suppression... » / « Annuler », média rouge) produisent exactement l'ancien rendu.
- **Nouveauxlibellés dynamiques** : `cancelLabel?`, `variant?: "destructive" | "default"`, `icon?: LucideIcon`, `iconClassName?` — couvre les 3 `confirm()` natifs restants (§F.3) et les confirmations non destructives.

### H.5 Étendue des sources uniques (additions **additives** dans `lib/`)

Le remplacement « byte-identique » (étape 3) exigeait deux formats introuvables dans les sources existantes ; plutôt que de garder des copies locales, ils ont été **ajoutés aux sources uniques** (aucune signature existante modifiée, 0 régression sur les 194 `formatTND` / 28 `formatDate` existants) :

| Fonction | Fichier | Rôle | Remplace |
|---|---|---|---|
| `formatDateShort(date)` | `lib/utils.ts` | « 5 janv. 2024 » (fr-TN, mois abrégé), null → `""` | `formatDate` local de `effet-detail-client.tsx` |
| `formatDateLong(date)` | `lib/utils.ts` | « 5 janvier 2024 » (fr-TN, mois en toutes lettres), null → `""` | `formatDate` longs de `lettre-de-change.tsx` et `app/(app)/effets/[id]/preview/page.tsx` |
| `formatDateTime(date)` | `lib/utils.ts` | « 05 janv. 2024, 10:30 » (fr-FR), null → `""` | `formatDate` datetime de `product-stock-movements.tsx` |
| `formatTNDNumber(value)` | `lib/decimal.ts` | groupement TND + 3 décimales **sans symbole** (contexts « +… », « · » déjà unitaires) | `fmt()` sans suffixe `DT` |
| `formatTNDShort(value)` | `lib/decimal.ts` | groupement TND, 0 décimale, sans symbole (ticks d'axes de graphes) | `fmtShort()` |

### H.6 Étape 3 — formats locaux supprimés (remplacements réels)

**`fmt()` / `fmtShort` / `Intl.NumberFormat` (5 définitions + 3 `fmt` + 2 `fmtShort` supprimés)** :
- `components/paiements/tresorerie-client.tsx` : `FMT`, `fmt`, `SHORT_FMT`, `fmtShort` supprimés → 14 sites `{fmt(x)} DT` → `formatTND`/`<MoneyCell>`, 4 sites sans suffixe → `formatTNDNumber`, 2 `tickFormatter` → `formatTNDShort`, 1 `formatter` tooltip → `formatTND(Number(value))` (plus de `as number`).
- `components/paiements/tresorerie-echeances.tsx` : `FMT`, `fmt` supprimés → 8 sites → `<MoneyCell>` (dont la cellule « Montant » du tableau).
- `components/paiements/tresorerie-evolution-chart.tsx` : `FMT`, `fmt`, `SHORT_FMT`, `fmtShort` supprimés → 2 tooltips → `<MoneyCell>`, 1 `tickFormatter` → `formatTNDShort`.

**`formatDate` locaux (4 définitions / 97 lignes / 58 appels)** :
- `components/effets/effet-detail-client.tsx` : définition supprimée, 6 appels → `formatDateShort` (+ `|| "—"` sur les champs nullables `dateRemise`/`endosseLe`/`payableAt`, rendu inchangé).
- `components/effets/lettre-de-change.tsx` : `formatDate` + `formatDateShort` supprimés → 6 appels courts → `formatDate` (source `lib/utils`), 1 appel long → `formatDateLong`.
- `components/produits/product-stock-movements.tsx` : définition supprimée, 1 appel → `formatDateTime`.
- `app/(app)/effets/[id]/preview/page.tsx` : définition supprimée, 2 appels → `formatDateLong` (+ fallback `|| "________"` conservé).

**Preuve de rendu** (script `/tmp/opencode/compare-fmt.mjs`, exécuté) : décimales, arrondis, suffixe « DT » et dates **strictement identiques** avant/après sur un échantillon de 8 valeurs (dont 0, négatives, ≥ 1 M, arrondis .9994) et 2 dates. **Seule différence** : le codepoint **invisible** de l'espace de groupement passe de `U+202F` (espace fine insécable, sortie `Intl.NumberFormat` locale) à `U+00A0` (insécable standard) — c'est **exactement le séparateur déjà utilisé par `formatTND` dans ses 194 occurrences** ; les paiements s'alignent ainsi sur la source unique. Aucune décimale ne bouge.

### H.7 Points remontés au Governor (sans improvisation)

1. **Frontière étape 2/4** : `createListStore`, `PageHeader`, `KpiGrid`, `SectionCard`, `FormField`, `DateCell`, `EntityFormDialog` sont livrés avec **0 consommateur** — les frontières de lot (« aucune migration de module ici ») interdisent de les brancher dans ce lot ; leurs premiers consommateurs arrivent à l'étape 4 (migration des modules pilotes). Le critère « ≥ 3 usages réels » du Prompt G sera donc évalué **après** l'étape 4. (La barre de filtres, 8ᵉ brique de cette frontière, a été **retirée le 2026-10-18** : §H.13 A.)
2. **`GenericStatusBadge` non exporté** (§H.2) — arbitrage export en étape 4/5 si besoin réel.
3. **`FormActions`** : à adopter (pages de formulaire) ou retirer au seuil des 3 usages (§H.3) — pas de suppression unilatérale dans ce lot.
4. **STEP 5 (`graphify update .`)** : réservé au Governor selon la règle de délégation — non exécuté par ce sous-agent.
5. **Brique RETIRÉE — barre de filtres (décision du 2026-10-18)** : `components/shared/filter-bar.tsx` supprimée à **0 consommateur** (le motif « recherche + statut » est déjà porté par la toolbar de `DataTable`, `data-table.tsx:147-160` + `toolbarActions`, sur les 26 listes). Le plan de « sites restants » (avoirs, bons-commande, bons-livraison, devis, produits, stock, paramètres) est **annulé** : ne pas recréer cette brique. Détail et preuve : §H.13 A.
6. **`EntityFormDialog` : 1 consommateur depuis le 2026-10-18** (`components/avoirs/avoir-dialog.tsx`, lot G.6, §H.13 B). `client-dialog`/`fournisseur-dialog` (4 sections + scroll) restent hors contrat → arbitrage conteneur attendu (Sheet à onglets ou page dédiée type `produit-form-page`) ; conversion RHF+Zod = changement de structure. **Seuil « ≥ 3 usages » reporté au lot J** (décision utilisateur) — dette datée en §H.13 B, aucun usage artificiel créé.

### H.8 Vérifications finales — commandes et sorties

```bash
npm run lint
```
```
✖ 406 problems (35 errors, 371 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```
(baseline exacte — 0 nouveau ; un warning `cn` inutilisé dans `form-field.tsx` avait temporairement porté le total à 407, corrigé immédiatement)

```bash
npx tsc --noEmit
```
```
(0 erreur — sortie vide)
```

```bash
npx vitest run
```
```
 Test Files  19 passed (19)
      Tests  323 passed (323)
```

```bash
grep -rn ": any\b\|as any\b\|@ts-ignore\|eslint-disable" components/shared/
```
```
(vide)
```

```bash
grep -rn "const fmt \|formatDate = " components/paiements components/effets components/achats components/factures
```
```
(vide — exit 1)
```

```bash
wc -l components/shared/*.tsx
```
```
   24 components/shared/page-header.tsx
   26 components/shared/kpi-grid.tsx
  109 components/shared/entity-form-dialog.tsx
  116 components/shared/filter-bar.tsx
   51 components/shared/section-card.tsx
   54 components/shared/form-field.tsx
   16 components/shared/money-cell.tsx
   19 components/shared/date-cell.tsx
  321 components/shared/line-items-table.tsx
  217 components/shared/product-select.tsx
   48 components/shared/variant-select.tsx
  985 total
```
(chaque fichier ≤ 250 lignes)

### H.9 Étape 4 — lot 1/2 : migration clients / fournisseurs / achats vers le kit (Frontend Agent, Prompt G — 2026-10-18)

- **Périmètre** : 21 fichiers dans `components/clients/`, `components/fournisseurs/`, `components/achats/`. **Zéro changement de logique** : aucun hook, store, route API, `fetch`, `schema.prisma`, TanStack Query ni Zustand modifié ; 0 `any` ; 0 `useEffect` ajouté ; aucune règle de données touchée (validation RHF, ternaires, mutations identiques byte à byte).
- **Principe de rendu** : classes canoniques du kit adoptées là où intrinsèques (h1 `PageHeader`, `tabular-nums`, `FieldError`, astérisque requis en `destructive`), espacement d'origine **préservé via les knobs** : `className="gap-1"` (≡ `space-y-1` de 4 px), `contentClassName="pt-3"` (restaure exactement le `pb-3` des anciens headers — écart header/contenu identique : 16 px de `gap` + 12 px), `className="min-w-0"` sur `PageHeader` (préserve le truncate), `className="gap-1 w-auto"` sur les `FormField` en ligne flex (sinon le `w-full` de `Field` étire les champs).

**Usages par brique — avant (état fin étape 3) → après (état fin lot 1/2), fichiers consommateurs (`grep -rln`) :**

| Brique | Avant | Après | Seuil ≥ 3 |
|---|---:|---:|---|
| `PageHeader` | 0 | **3** (client-profile-header, fournisseur-profile-header, achat-detail-actions) | ✅ |
| `KpiGrid` | 0 | **6** (clients-client, client-detail-client, fournisseurs-client, fournisseur-detail-client, achats-client, achat-detail-client) | ✅ |
| `SectionCard` | 0 | **5** (client-solde, fournisseur-solde, achat-detail-client, achat-detail-sidebar, nouvel-achat-client) | ✅ |
| `FormField` | 0 | **8** (client-dialog, credit-limit-dialog, client-solde, fournisseur-dialog, fournisseur-solde, achat-detail-sidebar, nouvel-achat-client, manual-entry-form) | ✅ |
| `MoneyCell` | 3 | **15** (+12 fichiers de ce lot ; les 3 d'origine : paiements/…) | ✅ |
| `DateCell` | 0 | **7** (client-solde, client-document, fournisseur-solde, fournisseur-echeances-card, fournisseur-document, achats-client, achat-detail-client) | ✅ |
| `ConfirmDialog` | 10 | **10** (inchangé — clients/fournisseurs utilisaient déjà l'alias `ConfirmDeleteDialog`, 10 consommateurs intacts) | ✅ |
| ~~barre de filtres~~ | 0 | **0** | ❌ — **brique retirée le 2026-10-18**, voir §H.13 A (le motif est porté par la toolbar `DataTable`) |
| `EntityFormDialog` | 0 | **0** | ❌ — voir §H.7 point 6 (1 usage depuis le 2026-10-18, §H.13 B) |

**`wc -l` avant → après (21 fichiers) :**

| Fichier | Avant | Après | Δ |
|---|---:|---:|---:|
| clients/client-profile-header.tsx | 96 | 97 | +1 |
| clients/clients-client.tsx | 239 | 240 | +1 |
| clients/client-detail-client.tsx | 172 | 173 | +1 |
| clients/client-dialog.tsx | 143 | 164 | +21 |
| clients/credit-limit-dialog.tsx | 88 | 88 | 0 |
| clients/client-solde.tsx | 187 | 171 | −16 |
| clients/client-document.tsx | 216 | 214 | −2 |
| fournisseurs/fournisseur-profile-header.tsx | 95 | 96 | +1 |
| fournisseurs/fournisseurs-client.tsx | 214 | 215 | +1 |
| fournisseurs/fournisseur-detail-client.tsx | 172 | 173 | +1 |
| fournisseurs/fournisseur-dialog.tsx | 192 | 190 | −2 |
| fournisseurs/fournisseur-echeances-card.tsx | 132 | 132 | 0 |
| fournisseurs/fournisseur-solde.tsx | 180 | 164 | −16 |
| fournisseurs/fournisseur-document.tsx | 183 | 181 | −2 |
| achats/achat-detail-actions.tsx | 63 | 64 | +1 |
| achats/achats-client.tsx | 222 | 224 | +2 |
| achats/achat-detail-client.tsx | 132 | 124 | −8 |
| achats/achat-detail-sidebar.tsx | 151 | 135 | −16 |
| achats/nouvel-achat-client.tsx | 193 | 162 | −31 |
| achats/manual-entry-form.tsx | 254 | 251 | −3 |
| achats/achat-form-lines.tsx | 177 | 177 | 0 |

**Deltas de rendu assumés (canon kit, non des régressions)** :
- h1 des profils client/fournisseur : `text-xl md:text-2xl font-bold` → `text-xl font-semibold` (titre unifié `PageHeader`).
- h1 de `achat-detail-actions` : `text-base font-semibold` → `text-xl font-semibold`.
- Titres de cartes : `text-sm font-semibold` → `font-heading text-base font-medium` (via `SectionCard`, conforme à DESIGN.md).
- Erreurs de champs : `<p class="text-xs text-red-500">` → `FieldError` `text-sm text-destructive` + `data-invalid` sur le champ (conforme à la spec « label adjacent en destructive »).
- Astérisque requis : `Label + " *"` → `*` en `text-destructive` séparé (aria-hidden).
- `tabular-nums` ajouté par `MoneyCell`/`DateCell` sur les colonnes monétaires et datées (anti layout-shift sur valeurs dynamiques).
- **Edge case d'amélioration** : `formatDate("")` (« Invalid Date ») dans les colonnes documents devient « — » via le fallback `DateCell` (colonnes `dateCreation ?? dateEmission` et `dateFacture || dateEmission` des listes documents client/fournisseur).

**Décisions d'arbitrage remontées (non tranchées dans ce lot)** :
1. **`client-dialog.tsx` et `fournisseur-dialog.tsx` NON migrés vers `EntityFormDialog`** : 4 sections logiques (identité, contacts, notes, switches TVA/drapeaux) + `max-h-[90vh] overflow-y-auto` — hors contrat « 1–3 sections sans scroll » de la brique. Migration RHF+Zod = changement de structure → arbitrage conteneur attendu (Sheet à onglets ou page dédiée type `produit-form-page`).
2. **`credit-limit-dialog.tsx`** : rentre dans le contrat d'`EntityFormDialog`, mais la conversion RHF+Zod serait un changement de logique de formulaire → `FormField` seulement, conversion signalée.
3. **Barre de filtres = 0 usage dans ce lot** : la recherche et le filtre statut de clients/fournisseurs/achats vivent dans la toolbar `DataTable` (`searchValue`/`facetedFilters`) — brancher une barre de filtres ici serait un usage artificiel. **La brique a été retirée le 2026-10-18** (§H.13 A) : la liste des « sites naturels restants » est annulée.
4. **Aucun `ConfirmDialog` ajouté** : la suppression d'achat (dropdown achats-client) n'a aucune confirmation aujourd'hui — en ajouter une serait un **changement de comportement** → signalé, pas improvisé.
5. **Barre de filtres < 3 usages** : évaluation close par le **retrait effectif du 2026-10-18** (voir point 3 et §H.13 A) — aucune adoption artificielle créée.
6. **`EntityFormDialog` < 3 usages** : premiers consommateurs prévus au lot J (dialogs RHF+Zod) + factures/effets — à réévaluer là. **État au 2026-10-18 : 1 usage réel** (`avoir-dialog`, §H.13 B) ; seuil formellement reporté au lot J.
7. **Skips assumés** : `CardTitle` avec icône (SectionCard n'accepte qu'un titre string : cartes « Documents »/« Échéances »/« Informations »/« Saisie manuelle » gardent leur `Card`), rangées Switch (Label en row, `FormField` non adapté), ternaires `parseFloat(x) > 0 ? formatTND : "—"` conservés (logique métier), imports pré-existants déjà inutilisés non touchés (ne pas bouger la baseline lint).

**Détection impeccable (`detect.mjs --json` sur les 21 fichiers) : 14 findings, 0 introduit par ce lot.** Tous portent sur des lignes d'origine non modifiées : 2 warnings `ai-color-palette` (tableau `getGradientBg` des profils, lignes 17) et 12 advisories `design-system-font-size` (littéraux `text-[9px]`/`text-[10px]`/`text-[11px]` pré-existants sur badges/subtitles). Aucun de mes ajouts ne contient `text-[…]` ni classe de gradient.

### H.10 Vérifications finales du lot 1/2 — commandes et sorties exactes

```bash
npm run lint
```
```
✖ 406 problems (35 errors, 371 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```
(baseline exacte — 0 nouveau problème)

```bash
npx tsc --noEmit
```
```
(0 erreur — sortie vide)
```

```bash
npx vitest run
```
```
 Test Files  19 passed (19)
      Tests  323 passed (323)
   Duration  20.86s
```

```bash
grep -rnE "(: *any\b|<any>|as any\b|any\[\]|Record<string, *any>)" <21 fichiers modifiés>
```
```
( vide — exit 1 )
```

```bash
grep -rn "useEffect" <21 fichiers modifiés>
```
```
( vide — exit 1 )
```

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json <21 fichiers modifiés>
```
```
14 findings (2 ai-color-palette + 12 design-system-font-size) — tous pré-existants, 0 introduit par ce lot (détail §H.9)
```

### H.11 Étape 4 — lot 2/2 : migration factures / effets vers le kit (Frontend Agent, Prompt G — 2026-10-18)

- **Périmètre** : 16 fichiers dans `components/factures/` et `components/effets/`. **Zéro changement de logique** : aucun hook, store (`effet-form-store` intact), route API, `fetch`, `schema.prisma`, TanStack Query ni Zustand modifié ; 0 `any` ; 0 `useEffect` ajouté (les 2 `useEffect`/`useLayoutEffect` restants sont pré-existants et justifiés : interval de `floating-alert.tsx:136`, ResizeObserver de `apercu-effet-dialog.tsx:101`) ; aucune règle de données touchée.
- **Principe de rendu** (identique au lot 1, §H.9) : classes canoniques du kit adoptées là où intrinsèques, espacement d'origine **préservé via les knobs** (`contentClassName="pt-3"`/`"pt-2"`/`"p-0 pt-3"`, `className="gap-1"` sur les `FormField`, `className="min-w-0"` sur les `PageHeader` des vues hero).

**Usages par brique — avant (état fin lot 1/2) → après (état fin lot 2/2), consommateurs du lot entre parenthèses :**

| Brique | Avant | Après | Seuil ≥ 3 |
|---|---:|---:|---|
| `PageHeader` | 3 | **6** (+ facture-detail-actions, effet-detail-client, impression-effets-client) | ✅ |
| `KpiGrid` | 6 | **10** (+ factures-client, facture-detail-client, effets-client, impression-effets-client) | ✅ |
| `SectionCard` | 5 | **9** (+ facture-detail-info ×2, facture-detail-lines ×2, facture-detail-sidebar ×3, nouvelle-facture-client ×4) | ✅ |
| `FormField` | 8 | **12** (+ payment-dialog ×3, nouvelle-facture-client ×4, invoice-form-bc-vise ×8, effet-detail-client ×map dialog) | ✅ |
| `MoneyCell` | 15 | **23** (+ facture-detail-sidebar, floating-alert, effets-client, impression-effets-client, effet-detail-client ×13, nouvel-effet-sidebar ×5, nouvel-effet-split-dialog ×3, apercu-effet-dialog ×4) | ✅ |
| `DateCell` | 7 | **15** (+ factures-client ×2, facture-detail-info ×2, facture-detail-lines, facture-detail-sidebar, effets-client, impression-effets-client, nouvel-effet-split-dialog ×2, apercu-effet-dialog ×2) | ✅ |
| `ConfirmDialog` | 10 | **10** (inchangé — les dialogs factures/effets ont un corps custom, pas un simple texte de confirmation, hors contrat de la brique) | ✅ |
| ~~barre de filtres~~ | 0 | **0** | ❌ — **brique retirée le 2026-10-18** (§H.13 A) : aucun des « sites restants » n'a été branché, le motif appartient à la toolbar `DataTable` |
| `EntityFormDialog` | 0 | **0** | ❌ — voir §H.7 point 6 (`payment-dialog` sans RHF+Zod ; `generate-invoice-dialog` = 4 sections + liste répétable → arbitrage conteneur attendu) — **1 usage depuis le 2026-10-18** (§H.13 B) |

**`wc -l` avant → après (16 fichiers, total 4108 → 4037, −71) :**

| Fichier | Avant | Après | Δ |
|---|---:|---:|---:|
| factures/facture-detail-actions.tsx | 93 | 94 | +1 |
| factures/factures-client.tsx | 485 | 482 | −3 |
| factures/facture-detail-client.tsx | 221 | 222 | +1 |
| factures/facture-detail-info.tsx | 68 | 52 | −16 |
| factures/facture-detail-lines.tsx | 174 | 160 | −14 |
| factures/facture-detail-sidebar.tsx | 194 | 178 | −16 |
| factures/payment-dialog.tsx | 130 | 128 | −2 |
| factures/nouvelle-facture-client.tsx | 229 | 205 | −24 |
| factures/invoice-form-bc-vise.tsx | 76 | 68 | −8 |
| factures/floating-alert.tsx | 353 | 354 | +1 |
| effets/effets-client.tsx | 323 | 326 | +3 |
| effets/impression-effets-client.tsx | 243 | 246 | +3 |
| effets/effet-detail-client.tsx | 667 | 668 | +1 |
| effets/nouvel-effet-sidebar.tsx | 161 | 161 | 0 |
| effets/apercu-effet-dialog.tsx | 388 | 389 | +1 |
| effets/nouvel-effet-split-dialog.tsx | 303 | 304 | +1 |

(`generate-invoice-dialog.tsx` et `invoice-form-lines.tsx` : volontairement intacts — voir décisions 2 et 5 ci-dessous.)

**Deltas de rendu assumés (canon kit, non des régressions)** :
- h1 : `text-base font-bold` → `text-xl font-semibold` (`facture-detail-actions`) ; hero détail effet : titre + description unifiés via `PageHeader` ; description de header `text-xs` → `text-sm` (canon `PageHeader`).
- Titres de cartes : → `font-heading text-base font-medium` (via `SectionCard`, conforme à DESIGN.md), écart header/contenu restauré via `contentClassName` (`pt-3`/`pt-2`/`p-0 pt-3`).
- Labels : → `leading-snug` (`FormField`/`FieldLabel`).
- `tabular-nums` ajouté par `MoneyCell`/`DateCell` sur colonnes monétaires et datées (anti layout-shift).
- Astérisque requis et `FieldError` : canon déjà couvert par le lot 1 (§H.9).
- Hint `text-[11px]` sous champ : `FieldDescription` `text-xs` + `mt-0.5` (gap 4 px au lieu de 2 px) — seul écart de densité assumé dans `invoice-form-bc-vise`.

**Décisions d'arbitrage remontées (non tranchées dans ce lot)** :
1. **`payment-dialog.tsx` NON migré vers `EntityFormDialog`** : store local + validation maison, sans RHF+Zod — la conversion serait un changement de logique → `FormField` uniquement (3 champs), conversion signalée. Le champ « Mode de Paiement » garde son `<div>`+`Label` (tooltip inline dans le label, pas adapté à `FieldLabel`).
2. **`generate-invoice-dialog.tsx` intact** : 4 sections logiques (informations, client, lignes répétables, récapitulatif) + `overflow-y-auto` → hors contrat « 1–3 sections sans scroll » d'`EntityFormDialog`. **Structure Proposal** à trancher par le Governor : Sheet à onglets (rapide, mais limite les sous-listes) ou page dédiée type `produit-form-page` (recouvre le pattern Produit, adapté aux lignes répétables).
3. **`KpiGrid` 5 colonnes** (`effets-client`) : le knob `columns` ne couvre que 2/3/4 — bypass via `className="grid-cols-2 sm:grid-cols-5 lg:grid-cols-5"` (twMerge). **Remonté** : soit étendre le knob à 5, soit laisser le bypass.
4. **Barre de filtres = 0 usage dans ce lot** : factures, effets et impression utilisent la toolbar `DataTable` (`searchValue` + `facetedFilters`) — brancher une barre de filtres serait un usage artificiel. **Brique retirée le 2026-10-18** (§H.13 A) ; la liste des « sites restants » est annulée.
5. **Skips assumés** : `formatDateShort` ≠ `DateCell` (format abrégé « 5 janv. » de `effet-detail-client`) ; labels `text-muted-foreground` des formulaires nouvel-effet (couleur portée par le parent) ; `toLocaleDateString` weekday (sidebar effet) et `toLocaleString` montant sidebar (formats hors `formatTND`) ; `fr-FR`/HTML print d'`impression-effets-client` (document d'impression, pas un écran) ; h1 du preview print = document d'impression ; sections custom à icône/gradient ≠ `SectionCard` ; cartes à header action (`invoice-form-lines`, `invoice-form-bc-vise`) gardent leur `Card` ; dialogs à corps custom ≠ `ConfirmDialog` ; `formatCurrency(x, devise)` multi-devise ≠ `MoneyCell` (TND uniquement) ; skeletons intacts (lot F) ; imports pré-existants inutilisés non touchés (baseline lint) ; `formatTND` conservé là où c'est un argument string de `StatCard` ou un value/placeholder d'`Input` (payment-dialog).
6. **Équivalences vérifiées avant conversion** : `formatTND(x) ≡ formatCurrency(x, "TND")` (source unique `lib/decimal.ts`) ; `toLocaleDateString("fr-TN")` par défaut ≡ `formatDate` (`lib/utils.ts`) → `DateCell` sans delta de rendu sur les colonnes listes.

**Détection impeccable (`detect.mjs --json` sur les 16 fichiers) : 21 findings (20 `design-system-font-size` + 1 `design-system-radius`), 0 introduit par ce lot.** Baseline reconstituée via `git show :<file>` : 21 findings strictement identiques, tous portent sur des lignes d'origine non modifiées (`text-[9px]`/`text-[10px]`/`text-[11px]`, `borderRadius 0.75rem`).

### H.12 Vérifications finales du lot 2/2 — commandes et sorties exactes

```bash
npm run lint
```
```
✖ 406 problems (35 errors, 371 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```
(baseline exacte — 0 nouveau problème)

```bash
npx tsc --noEmit
```
```
(0 erreur — sortie vide)
```

```bash
npx vitest run
```
```
 Test Files  19 passed (19)
      Tests  323 passed (323)
```

```bash
grep -rnE "(: *any\b|<any>|as any\b|any\[\]|Record<string, *any>|@ts-ignore|eslint-disable)" <16 fichiers modifiés>
```
```
( vide — exit 1 )
```

```bash
grep -rn "useEffect\|useLayoutEffect" <16 fichiers modifiés>
```
```
components/factures/floating-alert.tsx:136:  useEffect(() => {   (pré-existant, interval justifié en commentaire)
components/effets/apercu-effet-dialog.tsx:101:  useLayoutEffect(() => {   (pré-existant, ResizeObserver)
```
(0 ajouté par ce lot)

```bash
wc -l <16 fichiers modifiés>
```
```
( table du §H.11 — 4108 → 4037 lignes )
```

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json <16 fichiers modifiés>
```
```
21 findings (20 design-system-font-size + 1 design-system-radius) — baseline identique 21 → 21, 0 introduit par ce lot (détail §H.11)
```

---

### H.13 Lot G.6 de clôture (2026-10-18) — `FilterBar` retirée + 1ᵉʳ usage d'`EntityFormDialog`

> Deux **décisions utilisateur du 2026-10-18**, appliquées telles quelles, sans ré-interprétation.
> **Conteneur** : aucune création de conteneur — `avoir-dialog` reste un **Dialog** (2 sections courtes, 0 `max-h`/`ScrollArea` ajoutés, rendu sans défilement sur laptop) ; seul son shell est remplacé par la brique `EntityFormDialog`. Aucun champ n'a été ajouté ni déplacé.

#### A. Brique retirée — `FilterBar` : redondante avec `DataTable`

- **DÉCISION : `components/shared/filter-bar.tsx` (116 l.) a été SUPPRIMÉE le 2026-10-18. Ne pas la recréer.**
- **Motif (tranché, non ré-investigué)** : `components/data-table/data-table.tsx:147-160` rend lui-même l'`Input` de recherche quand `searchValue` est passé, et les listes passent leur `<Select>` de statut via `toolbarActions` → le motif « recherche + statut » est déjà absorbé par la toolbar de `DataTable` (**26 listes**). Les deux listes sans `DataTable` (`matieres-premieres-client`, `pos-client`) n'ont **aucun** filtre de statut → aucun site naturel restant. Les listes « sites restants » des §H.7/§H.9/§H.11 sont **annulées**.
- **Preuve post-suppression** (commande exécutée une à la fois) :

  ```bash
  grep -rn "filter-bar\|FilterBar" components app hooks lib --include=*.ts --include=*.tsx
  ```
  ```
  (vide — exit 1)
  ```

  Avant suppression, la même commande ne renvoyait que les **6 lignes du fichier lui-même** (`components/shared/filter-bar.tsx:16,21,28,45,56`) → **aucun importeur, 0 consommateur** → suppression sans casse.
- **Conséquence** : `lib/stores/create-list-store.ts` reste à 0 consommateur (§E point 6) — ce n'est **plus** un motif pour (re)créer une barre de filtres.
- **Si un besoin réel apparaît** (filtre que la toolbar `DataTable` ne couvre pas) → l'examiner comme **extension de la toolbar `DataTable`**, jamais comme barre séparée.
- **Mentions restantes dans ce fichier** (volontairement conservées, aucune ne la présente comme disponible) : (i) **sorties de commandes datées** des lots antérieurs — §F.11 (`grep … | wc -l` → 0) et §H.8 (`116 components/shared/filter-bar.tsx` dans le `wc -l`) : preuves historiques qu'elle était à 0 usage ; (ii) **marqueurs de retrait** explicites (encadré §H, §D ligne 6, §E point 6, §G, note §H.1, §H.7 points 1 et 5).

#### B. `EntityFormDialog` — migration d'`avoir-dialog.tsx` (1ᵉʳ usage réel)

- **Migration** : `components/avoirs/avoir-dialog.tsx` **260 → 254 lignes (−6)**. Remplacé : le shell (`Dialog` + `DialogHeader`/`DialogTitle` + `<form>` + `DialogFooter`) → brique `EntityFormDialog`. Conservés **à l'identique** : `quickAvoirSchema` (inchangé byte à byte), `onSubmit` (payload, callbacks `onSuccess`/`onError`, `toast`, `router.refresh`), `isPending` (`createAvoir.isPending`), libellés (« Nouvel Avoir », « Créer l'Avoir »/« Création... », « Annuler »), erreurs inline `text-xs text-red-500` des 2 sous-sections, hooks de données (`useAvoirMutations`, `useClients`, `useFournisseurs`, `useInvoices`), **0 route API, 0 store, 0 `any`, 0 `useEffect` ajouté**.
- **Render-prop** : `children(form)` rend les Tabs `SIMPLE`/`FINANCIER`, les 2 sous-sections (`avoir-dialog-simple-section`, `avoir-dialog-financier-section` — signatures inchangées), les champs Date/Motif/Notes, et les handlers `setValue` ; toutes les valeurs dérivées (`watch`, `filtered*`, `selected*`) sont calculées dans le render-prop, donc re-rendues par `useForm` de la brique.
- **Adaptation structurelle unique (remontée, pas improvisée)** : `onSubmit` est une prop de la brique, donc le `form` interne n'est pas dans la portée du composant parent. Pour conserver **exactement** l'appel `form.reset()` du `onSuccess`, un `formRef` est renseigné paresseusement dans le render-prop (`if (formRef.current !== form) formRef.current = form` — l'identité du form RHF est stable) et **lu uniquement** dans le callback de mutation (contexte événement, jamais au rendu). `react-hooks/refs` ne le signale pas (vérifié sur un probe : l'écriture dans une flèche passée en `children` n'est pas marquée, contrairement à l'écriture dans le corps du composant). **Alternative non retenue** : ajouter un 2ᵉ argument `form` à `onSubmit` de la brique — elle modifie l'API prescrite de `EntityFormDialog` → arbitrage Governor (dette listée ci-dessous).
- **Dette datée (seuil utilisateur explicite)** : *le seuil « ≥ 3 usages » pour `EntityFormDialog` est reporté au lot J (formulaires `useState` → React Hook Form + Zod)* — **1 usage au 2026-10-18 (`avoir-dialog`) ; 3 atteindra au lot J**. Aucun usage artificiel n'a été créé. Ce n'est pas un échec masqué.
- **Deltas de rendu assumés (canon de la brique, non des régressions)** :
  | Élément | Avant | Après | Source |
  |---|---|---|---|
  | Largeur du dialog | `sm:max-w-lg` (32rem) | `sm:max-w-md` (28rem) via `size="md"` | **Le mapping `size` de la brique (sm 24 / md 28 / lg 42rem) n'a pas d'équivalent 32rem** → `md` retenu (défaut de la brique + précédent : `payment-dialog` = `sm:max-w-md`). Δ −64px assumé, les 2 onglets longs (≈300px) tiennent dans 416px utiles. Alternative rejetée : `lg` = +160px (écart bien plus visible). |
  | Titre | `<DialogTitle className="text-sm font-semibold">` | `DialogTitle` canon `font-heading text-base leading-none font-medium` | style par défaut de `ui/dialog.tsx:133` |
  | Pied de formulaire | boutons `size="sm"` (h-7, `text-[0.8rem]`) | `size="default"` (h-8) | footer standard de la brique |
  | Contenu | pas de limite | `max-h-[90vh] overflow-y-auto` ajouté (filet de sécurité, ne scrolle pas au rendu réel) | `entity-form-dialog.tsx:76` |
  | `<form>` | sans `noValidate` | `noValidate` (pas d'attribut natif `required` côté avant → aucun changement de comportement) | idem |
  | Récapitulatif d'erreurs | absent | `Alert variant="destructive"` `role="alert"` en tête de formulaire, **uniquement après un échec de validation** : « Veuillez corriger les erreurs ci-dessous. » (`errors.root` jamais renseigné ici) | contrat de la brique |
  | Déclencheur, champs, erreurs inline, erreurs Zod | — | **inchangés** | — |

#### C. Consommateurs réels finaux des 9 briques du kit (2026-10-18, fin lot G.6)

Méthode : fichiers contenant le nom de la brique **hors son propre fichier de définition** (`grep -rln … | grep -v components/shared/`, et exclusion de `confirm-delete-dialog.tsx` pour `ConfirmDialog`) — méthode qui **reproduit exactement** la baseline du prompt (23/12/11/15/10/10/6/0/0 avant ce lot).

| Brique | Fichiers consommateurs | Seuil ≥ 3 |
|---|---:|---|
| `MoneyCell` | **23** | ✅ |
| `FormField` | **12** | ✅ |
| `SectionCard` | **11** | ✅ |
| `DateCell` | **15** | ✅ |
| `ConfirmDialog` | **10** | ✅ |
| `KpiGrid` | **10** | ✅ |
| `PageHeader` | **6** | ✅ |
| `EntityFormDialog` | **1** (`components/avoirs/avoir-dialog.tsx`) | ❌ — **seuil reporté au lot J** (dette datée §H.13 B) |
| `FilterBar` | **— (brique supprimée le 2026-10-18)** | n/a — §H.13 A |

### H.14 Vérifications finales du lot G.6 — commandes et sorties exactes

```bash
npm run lint
```
```
✖ 405 problems (35 errors, 370 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```
**0 nouveau problème : 35 erreurs strictement inchangées vs la baseline `✖ 406 problems (35 errors, 371 warnings)` ; 1 warning de moins (371 → 370).** Provenance exacte du −1, vérifiée fichier par fichier :
- au début du lot : `npx eslint components/avoirs/avoir-dialog.tsx components/shared/entity-form-dialog.tsx` → `✖ 2 problems (0 errors, 2 warnings)` : `72:23 react-hooks/incompatible-library` (« `form.watch()` … cannot be memoized safely ») + `103:15 no-unused-vars` (`isFinance`, pré-existant) ;
- à la fin : `npx eslint components/avoirs/avoir-dialog.tsx` → `✖ 1 problem (0 errors, 1 warning)` : `63:15 no-unused-vars` (`isFinance`, conservé volontairement pour ne pas bouger la baseline) ;
- `react-hooks/incompatible-library` disparaît mécaniquement car `form.watch()` est passé dans le corps du composant à l'intérieur du render-prop `children(form)` — **aucune règle n'a été désactivée** (grep `eslint-disable` → vide ci-dessous), et le React Compiler n'est **pas** actif au build (`next.config.ts` ne définit ni `reactCompiler`, ni `__NEXT_ENABLE_REACT_COMPILER`) ;
- `components/shared/filter-bar.tsx` avait **0** problème lint (compte : 404 autres fichiers inchangés + 2 avant = 406 → 404 + 1 après = 405).

```bash
npx tsc --noEmit
```
```
(0 erreur — sortie vide, exit 0)
```

```bash
npx vitest run
```
```
 Test Files  19 passed (19)
      Tests  323 passed (323)
```

```bash
grep -rn "filter-bar\|FilterBar" components app hooks lib --include=*.ts --include=*.tsx
```
```
(vide — exit 1)
```

```bash
grep -rnE ":\s*any\b|as any\b|@ts-ignore|eslint-disable|useEffect\(" components/avoirs/avoir-dialog.tsx components/shared/entity-form-dialog.tsx
```
```
(vide — exit 1)
```

```bash
git show :components/avoirs/avoir-dialog.tsx | wc -l   # avant
wc -l components/avoirs/avoir-dialog.tsx                # après
```
```
260
254 components/avoirs/avoir-dialog.tsx
```

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json <fichier avant>  # version index, copiée temporairement in-project
node .agents/skills/impeccable/scripts/detect.mjs --json components/avoirs/avoir-dialog.tsx
```
```
[]   (avant)
[]   (après)
```
→ **0 finding, 0 introduit par ce lot** (le détecteur est opérationnel : test de contrôle sur `components/factures/floating-alert.tsx` renvoie bien ses `design-system-font-size` connus). **`impeccable critique`/`audit`** : revue heuristique du delta faite en mode **Operate** sur la seule surface touchée (le shell du dialog) — voir les verdicts ci-dessous ; aucune règle de `DESIGN.md` violée (densité, `font-heading`, tokens `destructive`, `tabular-nums` : inchangés car le contenu n'a pas bougé).

**Audit (5 dimensions, périmètre = le shell du dialog) :**

| # | Dimension | Score | Constat |
|---|---|---|---|
| 1 | Accessibilité | 3 | `DialogTitle` présent (pas d'avertissement Radix), `role="alert"` sur le récapitulatif d'erreur, bouton de soumission désactivé + spinner pendant `isPending`, erreurs inline associées au champ. Retardataire : cibles de 32 px (`h-8`) sous 44 px — **dense admin assumé**, pré-existant au canon de `ui/button.tsx`. |
| 2 | Performance | 4 | Aucun render-path supplémentaire : les valeurs dérivées sont recalculées dans le render-prop à chaque rendu de la brique (équivalent au corps du composant avant). 1 `useRef` en plus, 0 `useEffect`, 0 fetch. |
| 3 | Theming | 4 | 0 couleur hardcodée ajoutée (les `text-red-500` inline sont pré-existants des sous-sections, non touchés). |
| 4 | Responsive | 3 | Δ largeur 32→28rem assumé (table §H.13 B) ; `sm:max-w-*` + `max-w-[calc(100%-2rem)]` conservent le mobile, `max-h-[90vh]` évite le débordement vertical. |
| 5 | Intégrité d'implémentation | 4 | Détecteur 0 → 0 ; shell 100 % issu de la brique partagée ; aucune logique dupliquée. |
| **Total** | | **18/20** | **Excellent (finition)** — les 2 points perdus sont le Δ de largeur (documenté) et les cibles tactiles denses (héritées du kit). |

**Critique (mode Operate, delta uniquement)** : hiérarchie et densité identiques à l'état antérieur (le contenu n'a pas changé) ; point fort = le récapitulatif `role="alert"` ajouté par la brique améliore la lisibilité d'un échec de validation sans doublonner les erreurs de champ ; points de vigilance remontés sans y toucher : (1) le `Alert` récapitulatif s'affiche au-dessus des onglets — acceptable pour 2 champs erronés, à revoir si un formulaire à 6 champs l'adopte au lot J ; (2) le mapping `size` d'`EntityFormDialog` ne couvre pas l'ancien 32rem — extension du knob à trancher au lot J (même nature que le knob `columns` de `KpiGrid`).

---

### H.15 Lot F.2 (2026-10-18) — briques d'état (chargement / erreur / vide) + pages d'erreur Next.js

Lot **F.2** du Prompt F (audit 2026-10), livré par le Frontend Agent. Fiche complémentaire :
`docs/wiki/notifications.md` (socle F.1). **Aucune brique `EmptyState` recréée** : la primitif
`components/ui/empty.tsx` (104 l., 7 consommateurs) reste la source unique — `ErrorState`
la **compose**. Aucun changement de data-flow (TanStack Query inchangé, 0 `fetch()`,
0 `useEffect` ajouté).

#### API des 4 briques (`components/shared/`)

| Brique | Fichier (lignes) | API | Contrat |
|---|---|---|---|
| `ErrorState` | `error-state.tsx` (50) | `title?` (défaut « Une erreur est survenue »), `description?` (défaut « Impossible de charger ces données. Réessayez dans un instant. »), `digest?` (référence serveur), `onRetry?` (affiche le bouton « Réessayer » + `RefreshCw`), `className?` | Composition `Empty` de `ui/empty.tsx` (**inchangée**), `role="alert"`, icône `AlertTriangle` en `EmptyMedia variant="icon"` `bg-destructive/10 text-destructive` — même cadre visuel que l'état vide. Pas de `Card` : c'est un état de zone, pas un conteneur de contenu. |
| `ListSkeleton` | `list-skeleton.tsx` (54) | `rows?` (8), `columns?` (5), `className?` | Barre titre+action, barre de filtres, en-tête de colonnes + `rows` lignes (colonne 0 en `flex-[2]`). `role="status"` + `<span class="sr-only">Chargement…</span>`, lignes `aria-hidden`. |
| `DetailSkeleton` | `detail-skeleton.tsx` (43) | `className?` | En-tête fiche (icône 9×9 + titre + 2 actions + 2 badges) puis grille `lg:grid-cols-3` (blocs 2/1). Même a11y que `ListSkeleton`. |
| `ChartErrorBoundary` | `chart-error-boundary.tsx` (48) | `children`, `title?` (défaut « Graphique indisponible »), `className?` | Class component React (`getDerivedStateFromError` / `componentDidCatch` → `console.error`). Fallback = `ErrorState` (« Réessayer » = `reset()` de la boundary). |

Rythme commun repris du shell (`DashboardSkeleton`) : `px-4 lg:px-6`, `gap-4 md:gap-6 py-4 md:py-6`,
`rounded-xl` — zéro token nouveau, 0 couleur hardcodée.

#### Consommateurs réels (méthode `grep -rln` hors fichier de définition)

| Brique | Consommateurs | Détail |
|---|---|---|
| `ErrorState` | **10** | 9 `error.tsx` de module + `ChartErrorBoundary` |
| `ListSkeleton` | **9** | `loading.tsx` des 9 modules : `factures`, `clients`, `fournisseurs`, `achats`, `paiements`, `effets`, `cheques`, `produits`, `stock-mouvements` (segments réels `app/(app)/…`, vérifiés par `find`) |
| `DetailSkeleton` | **6** | `loading.tsx` des seuls segments `[id]` du lot : `factures`, `clients`, `fournisseurs`, `produits`, `effets`, `achats` — adoption réelle dans le lot (règle `ui-dialogs.md` §6 : pas de brique « au cas où ») |
| `ChartErrorBoundary` | **3** | `tresorerie-client.tsx:539` (`TresorerieEvolutionChart`), `produit-detail-client.tsx` (`ProductPerformanceChart` + `ProductStockChart`) — **pages entières non wrappées** |

#### Pages globales Next.js

- **`app/not-found.tsx`** (33 l., server component) : `Empty` + `FileQuestion` + « Retour à l'accueil » (`Button asChild` + `Link "/"`).
- **`app/global-error.tsx`** (139 l., client) : **100 % autonome** — le root layout ayant échoué, CSS global et composants partagés peuvent être indisponibles : styles inline + `<style>` (variant dark via `prefers-color-scheme`) + SVG en dur, **zéro import hors React/Next**. Rend `<html lang="fr"><body>`, « Réessayer » (`reset`) + « Recharger la page » (`window.location.reload()`), `digest` affiché.

#### Décisions et remontés (sans improviser)

1. **`ui/empty.tsx` non modifié** : `ErrorState` compose ses sous-composants (`Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`) — les 7 consommateurs existants sont préservés à l'identique. `grep -rln "EmptyState" components app --include=*.tsx` → **vide** (aucun doublon, aucune ancienne copie locale).
2. **Skeletons TanStack Query locaux non migrés** (`InvoiceDetailSkeleton`, `AchatDetailSkeleton`, `DevisDetailSkeleton`, `AvoirDetailSkeleton`, `BLDetailSkeleton`, `ExportListSkeleton`/`ExportDetailSkeleton`, skeletons inline `client`/`fournisseur`/`produit`) : ce sont des états `isLoading` **client** (données serveur), périmètre différent des **frontières de route** Next.js livrées ici. `DetailSkeleton` (fichiers `[id]/loading.tsx`) couvre le stream serveur ; la refonte des skeletons client vers les briques = lot ultérieur (dette tracée, non bloquante).
3. **`app/(app)/loading.tsx` et `app/(app)/error.tsx` préexistants conservés** (choix C3 « zéro flash » du dashboard ; boundary racine `(app)`) — les `loading.tsx`/`error.tsx` de module prennent le dessus au plus proche du segment, mécanique Next.js standard.
4. **`DashboardChartSection` / `DashboardFiscalChart` = orphelins** (0 consommateur hors leur fichier) : non wrappés, non touchés — remonté au Governor.
5. **Pas d'`error.tsx` par `[id]`** : la boundary `<module>/error.tsx` absorbe déjà les erreurs des sous-routes.
6. **Global-error autonome en dur** (seul fichier du lot à styles inline) : c'est le point de dernier recours de Next.js — justifié par l'échec possible du layout racine, pas par préférence stylistique.

#### Vérifications (sorties exactes, fin de lot)

```
npm run lint                                  → ✖ 466 problems (35 errors, 431 warnings)   [baseline inchangée, 0 nouveau]
npm run lint | grep -c no-restricted-imports  → 61                                         [0 fichier sonner migré]
npx tsc --noEmit                              → (vide) 0 erreur
npx vitest run                                → Test Files 20 passed (20) — Tests 341 passed (341)
grep -rnE ": any|as any|@ts-ignore|eslint-disable|useEffect\(" <30 fichiers créés>          → (vide, exit 1)
wc -l <30 fichiers créés>                     → max 139 (app/global-error.tsx), tous ≤ 250
find app -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" -o -name "global-error.tsx" | sort
                                               → 28 fichiers : 2 globaux + 2 `(app)` préexistants + 9 modules × (loading+error) + 6 `[id]/loading.tsx`
grep -rln "EmptyState" components app --include=*.tsx                                   → (vide, exit 1)
```

**`impeccable` (Operate) + `make-interfaces-feel-better`** : skills chargés avant tout JSX.
Critique/audit du delta : erreurs et vides partagent le même cadre visuel (`Empty`) → un seul
réflexe « zone sans contenu » ; boutons sur le canon `ui/button.tsx` (hover/focus/active/disabled
natifs, densité admin `h-7` assumée — cible < 44 px = héritage du kit, non introduit) ;
skeuomorphism zéro ; a11y : `role="alert"` sur les erreurs, `role="status"` + `sr-only` sur les
squelettes, `aria-hidden` sur les lignes décoratives ; 0 couleur hardcodée (tokens `destructive`,
`muted`, `background`) ; 0 finding impeccable introduit. Les transitions sont portées par
`Button` (`transition-all`) — aucun `transition: all` ajouté, aucune animation one-shot.

### H.16 Lot D3.2 (2026-10-20) — 2 briques extraites de l'écran trésorerie (Frontend, `lot-d32-ui-tresorerie/Prompt-D3`)

Extraction **au 2ᵉ usage réel** (règle 2026-10-18), dans le module trésorerie
(`components/paiements/`). Contexte et preuves complets : `tresorerie.md` § D3.2.

| Brique | Fichier | Lignes | Exports | Consommateurs |
| --- | --- | ---: | --- | --- |
| Badge mode de règlement | `components/shared/mode-reglement-badge.tsx` | 54 | `MODE_REGLEMENT_LABELS`, `MODE_REGLEMENT_ICONS`, `modeReglementLabel`, `modeReglementIcon`, `ModeReglementBadge` | **6 fichiers** |
| Couleurs de flux | `components/shared/flux-colors.ts` | 11 | `FLUX_ENTREE_COLOR`, `FLUX_SORTIE_COLOR` | **7 fichiers**, 22 sites d'usage |

- `mode-reglement-badge` remplace les copies locales `METHOD_LABELS` / `METHOD_ICONS` de
  `paiements-client` et `tresorerie-client` et les helpers inline dupliqués — **6 fichiers** :
  `paiements-client.tsx` (libellé + icône), `paiements-columns.tsx` (libellé + icône),
  `tresorerie-echeances-columns.tsx` (badge + libellé),
  `tresorerie-paiements-attente.tsx` (badge), `tresorerie-recents.tsx` (badge),
  `tresorerie-ventilation.tsx` (constantes `MODE_REGLEMENT_*`).
- `flux-colors` remplace des paires de couleurs dupliquées **dans 7 fichiers** :
  `statut-flux-badge.tsx`, `tresorerie-echeances.tsx`, `tresorerie-echeances-columns.tsx`,
  `tresorerie-projection.tsx`, `tresorerie-recents.tsx`, `tresorerie-ventilation.tsx`,
  `components/shared/app-toast.tsx`.
- `StatutFluxBadge` (`components/paiements/statut-flux-badge.tsx`, 28 l.) reste **module-local** :
  2 consommateurs seulement → non promu au kit (seuil ≥ 3 non atteint).

Preuves (2026-10-20) :

```
$ grep -rln "mode-reglement-badge" components/ | grep -v shared/mode-reglement-badge | sort
components/paiements/paiements-client.tsx
components/paiements/paiements-columns.tsx
components/paiements/tresorerie-echeances-columns.tsx
components/paiements/tresorerie-paiements-attente.tsx
components/paiements/tresorerie-recents.tsx
components/paiements/tresorerie-ventilation.tsx
→ 6 fichiers

$ grep -rln "flux-colors" components/ | grep -v shared/flux-colors | sort
components/paiements/statut-flux-badge.tsx
components/paiements/tresorerie-echeances-columns.tsx
components/paiements/tresorerie-echeances.tsx
components/paiements/tresorerie-projection.tsx
components/paiements/tresorerie-recents.tsx
components/paiements/tresorerie-ventilation.tsx
components/shared/app-toast.tsx
→ 7 fichiers

$ grep -rn "FLUX_ENTREE_COLOR\|FLUX_SORTIE_COLOR" components/ | grep -v shared/flux-colors | grep -vc import
22 → 22 sites d'usage hors imports
```

Note de compteur : le brief de livraison annonçait **9 consommateurs** `flux-colors` — non
reproduit, mesuré **7 fichiers** par la commande ci-dessus (le rapport d'extraction du lot
annonçait déjà 7).

