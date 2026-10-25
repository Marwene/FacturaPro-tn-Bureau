# Audit Complet — Module Bon de Commande

**Date :** 2026-09-20  
**Scope :** API routes, hooks, stores, types, schemas, composants UI, server actions  
**Agent :** QA Agent  
**Statut :** Prisma up-to-date | Lint OK | 6 erreurs TS hors scope (devis/effets/produits)

---

## 1. Vue d'ensemble

Le module Bon de Commande (BC) couvre la gestion complète du cycle de vie :
création (scan OCR ou manuelle), consultation, modification de lignes,
rapprochement quantités (BC vs détail taille/couleur/broderie/DTF),
lancement en production (OF), et validation (génération BL ou Facture).

### Architecture

| Couche | Fichiers | Role |
|--------|----------|------|
| API Routes (7) | `bons-commande/route.ts`, `[id]/route.ts`, `[id]/lines/[lineId]/route.ts`, `[id]/detail/route.ts`, `[id]/detail/extract/route.ts`, `[id]/detail/detailId/route.ts`, `extract/route.ts` | CRUD + extraction OCR + rapprochement |
| Server Actions (1) | `app/actions/bons-commande.ts` | Proxy auth vers les API routes |
| Hooks (2) | `hooks/use-bc.ts`, `hooks/use-bc-rapprochement.ts` | TanStack Query |
| Stores (1) | `lib/stores/bons-commande-store.ts` | Zustand (filters, form, scan, detail) |
| Types (1) | `lib/types/bon-commande.ts` | Interfaces serialisees |
| Schemas (1) | `lib/schemas/bon-commande.ts` | Zod validation |
| Lib (2) | `lib/bon-commande/reconciliation.ts`, `lib/bon-commande/matching.ts` | Logique metier |
| Composants (14) | `components/bons-commande/*` | UI complete |

### Prisma Schema — Up to date

`npx prisma migrate status` : 17 migrations trouvees, schema a jour. Aucun drift.

### Fichiers analyses (29 fichiers, ~5200 lignes)

```
API Routes (7):
  app/api/bons-commande/route.ts                          288 lignes
  app/api/bons-commande/[id]/route.ts                     133 lignes
  app/api/bons-commande/[id]/lines/[lineId]/route.ts      121 lignes
  app/api/bons-commande/[id]/detail/route.ts              107 lignes
  app/api/bons-commande/[id]/detail/extract/route.ts      210 lignes
  app/api/bons-commande/[id]/detail/detailId/route.ts      70 lignes
  app/api/bons-commande/extract/route.ts                  395 lignes

Server Actions (1):
  app/actions/bons-commande.ts                            243 lignes

Hooks (2):
  hooks/use-bc.ts                                         276 lignes
  hooks/use-bc-rapprochement.ts                           156 lignes

Stores (1):
  lib/stores/bons-commande-store.ts                       287 lignes

Types + Schemas + Lib (4):
  lib/types/bon-commande.ts                                66 lignes
  lib/schemas/bon-commande.ts                             106 lignes
  lib/bon-commande/reconciliation.ts                      266 lignes
  lib/bon-commande/matching.ts                             37 lignes

Composants (14):
  components/bons-commande/bons-commande-client.tsx       204 lignes
  components/bons-commande/bon-commande-detail-client.tsx 235 lignes
  components/bons-commande/validation-dialog.tsx          122 lignes
  components/bons-commande/bc-detail-sidebar.tsx          100 lignes
  components/bons-commande/rapprochement-card.tsx         330 lignes
  components/bons-commande/production-card.tsx            124 lignes
  components/bons-commande/import-detail-dialog.tsx       437 lignes
  components/bons-commande/scan-bon-commande-client.tsx   323 lignes
  components/bons-commande/scan-bc-verification-form.tsx  329 lignes
  components/bons-commande/scan-bc-upload-screen.tsx       46 lignes
  components/bons-commande/scan-bc-manual-entry.tsx       453 lignes
  components/bons-commande/scan-bc-lines-table.tsx        164 lignes
  components/bons-commande/scan-bc-extracting-screen.tsx   59 lignes
  components/bons-commande/scan-bc-error-screen.tsx        20 lignes
```

---

## 2. Audit Code

### 2.1 API Routes

#### Points forts

- **Wrapping apiRoute** : 5 routes sur 7 utilisent correctement `apiRoute`
  (`route.ts`, `[id]/route.ts`, `[id]/lines/[lineId]/route.ts`,
  `[id]/detail/route.ts`, `[id]/detail/detailId/route.ts`)
- **Isolation multi-tenant** : `companyId` systématiquement vérifié via le wrapper
- **Validation Zod** : Toutes les routes de mutation valident leur input
- **Transactions Prisma** : La creation (`POST /api/bons-commande`) utilise `$transaction`
- **Garde-fou rapprochement** : `PATCH [id]/route.ts` L36-53 bloque la suppression
  de lignes ayant deja un detail importe
- **Recompute isole** : `recomputeBonCommandeTotals()` dans `lines/[lineId]/route.ts`

#### Violations BLOCKER

**B1 — Routes extract non wrappees par `apiRoute` (2 fichiers)**

`app/api/bons-commande/extract/route.ts` L264 et
`app/api/bons-commande/[id]/detail/extract/route.ts` L99
utilisent une auth manuelle (`getSessionFromRequest` + `checkPermission`) au lieu du
wrapper `apiRoute`. Cela court-circuite le middleware d'auth centralise, les headers
de security, et le pattern standard du projet.

- `extract/route.ts` L264-395 : `export async function POST(request: NextRequest)`
- `detail/extract/route.ts` L99-210 : `export async function POST(request, { params })`

**Resolution** : migrer sur `apiRoute.post({ permission: ..., requireCompany: true }, ...)`.

#### Bugs identifies

**Bug1 (Warning) — Calcul des totaux en `number` (pas `Big`) dans PATCH [id]/route.ts L55-102**

Le `POST /api/bons-commande` utilise `Big.js` pour les calculs monetaires (precision),
mais le `PATCH [id]/route.ts` L55-97 utilise des `number` natifs :

```typescript
// [id]/route.ts L55 — BUG: number au lieu de Big
let baseHT = 0, totalHT = 0, totalTVA = 0, totalFodec = 0, totalTTC = 0;
const remise = Number(l.remise) || 0;
```

Cela peut causer des erreurs d'arrondi sur les montants. Le `lines/[lineId]/route.ts`
utilise correctement `Big.js` pour le meme calcul.

**Bug2 (Nit) — `totalHT` et `Base HT` affichent la meme valeur dans scan form**

`scan-bc-verification-form.tsx` L284 et L294 affichent deux champs editant `totalHT` :

```tsx
L284: <span className="text-muted-foreground text-xs">Total HT</span>
      <MoneyInput value={totalHT} onChange={onTotalHT} />
L292: <span className="text-muted-foreground text-xs">Base HT</span>
      <MoneyInput value={totalHT} onChange={onTotalHT} />
```

Les deux champs editent la meme variable. C'est confus — `Base HT` devrait etre
distinct ou supprime.

**Bug3 (Warning) — `companyId` non requis dans les routes extract**

`extract/route.ts` L264 n'exige pas `companyId` via `apiRoute` mais le resout
manuellement via `getCompanyId()` L357. Si la session n'a pas de company, les
produits sont charges sans filtre (`where: { actif: true }` L359) — potentiel
fuite de donnees cross-tenant.

### 2.2 Hooks / State

#### Points forts

- **TanStack Query** : `use-bc.ts` et `use-bc-rapprochement.ts` utilisent
  correctement `useQuery` et `useMutation` pour tout l'etat serveur
- **Optimistic updates** : `createBC`, `updateStatus`, `deleteBC` ont des
  `onMutate` avec rollback `onError` — implementation soignee
- **Query invalidation** : tous les `onSettled` invalident les cles pertinentes
- **Zustand** : `bons-commande-store.ts` est bien decoupe en 4 stores
  (filters, form, scan, detail) avec interfaces propres

#### Verdict useEffect

`use-bc.ts` L31-37 — `useEffect` pour debounce de recherche.
Justifie : c'est une synchronisation timer avec un etat client (pas du data-fetching).
Pattern standard du projet (present dans 10+ autres hooks).
**Severite : Accepte.**

#### Warning

**W1 — `fetch()` direct sans `handleApiResponse` dans `use-bc-rapprochement.ts`**

Les mutations `deleteDetailRow` L89, `updateDetailRow` L104, `updateLine` L121,
`launchOF` L138 utilisent `fetch()` directement dans `mutationFn` sans passer
par `handleApiResponse`. Aucune gestion centralisee des erreurs HTTP.

A l'inverse, les mutations dans `use-bc.ts` passent systématiquement par
`handleApiResponse` (L53, L69, L83, L137, L184).

Ces appels sont dans des `useMutation` TanStack Query (pattern correct), mais
le manque de `handleApiResponse` est une anomalie de consistance.

### 2.3 Types / Validation

#### Points forts

- `lib/schemas/bon-commande.ts` : schemas Zod bien structures, types derives avec `z.infer`
- `lib/types/bon-commande.ts` : interfaces serialisees coherentes avec le schema Prisma
- Separation claire entre input schema (Zod) et output types (serialized)

#### Warning

**W2 — Duplications de schemas Zod entre lib et routes API**

Les schemas Zod sont definis deux fois :
1. `lib/schemas/bon-commande.ts` (source de verite — lines L71-82 `updateBCLineSchema`)
2. Inline dans les routes :
   - `[id]/lines/[lineId]/route.ts` L9-18 (`updateLineSchema`)
   - `[id]/detail/route.ts` L10-23 (`saveDetailSchema`, `detailRowSchema`)
   - `[id]/detail/detailId/route.ts` L8-14 (`updateDetailSchema`)

Cela cree un risque de desynchronisation. Les routes devraient importer les schemas
depuis `lib/schemas/bon-commande.ts`.

---

## 3. Audit UI / Composants

#### Points forts

- **Decoupage** : 14 composants bien specialises (liste, detail, scan, rapprochement, production, validation, sidebar)
- **Statut/feedback** : `StatusBadge` reuse pour les statuts BC, OF, rapprochement
- **Skeleton states** : `bon-commande-detail-client.tsx` L47-62 a un skeleton de chargement
- **Optimistic UI** : les mutations ont des etats loading/disable sur les boutons
- **Table display** : les donnees tabulaires sont dans des `Table` (pas des `Card` genériques)
- **Drag-and-drop** : upload supporte drag-over avec feedback visuel
- **Editable inline** : `EditableQuantite` dans `rapprochement-card.tsx` permet l'edition inline

#### Warning

**W3 — `import-detail-dialog.tsx` : Dialog complexe (437 lignes, 5 modes)**

Le `ImportDetailDialog` est un `Dialog` avec 5 modes (choice, scan-upload,
scan-extracting, review, manual) et contient une liste repeatable de groupes
d'articles avec des sous-lignes. Il depasse 400 lignes.

Selon les regles CONTAINER CHOICE, un Dialog avec une sous-liste repetable
devrait etre un `Sheet` ou une page dediee.

Pas de "Structure Proposal" dans le code source justifiant ce choix.

**W4 — `rapprochement-card.tsx` (330 lignes) contient 3 sous-composants internes**

`EditableQuantite` (L25-94), `DetailRowEdit` (L96-166), `LigneRow` (L168-258)
sont des composants non exportes imbriques dans le meme fichier.
Ils devraient etre extraits dans des fichiers separes pour la lisibilite.

---

## 4. Bugs identifies

| # | Severite | Fichier | Ligne | Description |
|---|----------|---------|-------|-------------|
| Bug1 | Warning | `[id]/route.ts` | L55-97 | Calcul des totaux en `number` natif au lieu de `Big.js` — risque d'arrondi |
| Bug2 | Nit | `scan-bc-verification-form.tsx` | L284/L292 | `totalHT` affiche en double (Base HT et Total HT = meme valeur) |
| Bug3 | Warning | `extract/route.ts` | L357-361 | `companyId` optionnel = produits charges sans filtre tenant = fuite de donnees |

---

## 5. Violations CODE RULES

| Regle | Statut | Detail |
|-------|--------|--------|
| `any` interdit | **CLEAN** | Aucun `any` explicite dans les 29 fichiers du module. `Record<string, unknown>` utilise a la place (warning, pas blocker) |
| `useEffect` sans justification | **CLEAN** | 1 usage dans `use-bc.ts` L31 — justifie (debounce timer, pas data-fetching). Pattern standard du projet |
| `fetch()` dans un composant | **CLEAN** | Tous les `fetch()` sont dans des hooks TanStack Query, jamais dans du JSX |
| `apiRoute` pour nouvelles routes | **VIOLATION** | 2 routes extract (`extract/route.ts`, `detail/extract/route.ts`) n'utilisent pas `apiRoute` |
| Prisma migration drift | **CLEAN** | `npx prisma migrate status` : 17 migrations, schema up-to-date |
| Design skills (impeccable/make-interfaces-feel-better) | N/A | Pas de tache de design UI — audit de code existant |

### Record<string, unknown> (7 fichiers, 19 occurrences)

Bien que `Record<string, unknown>` ne soit pas `any` (et ne viole donc pas la regle
explicitement), c'est un pattern faiblement type. Occurrences notables :

- `route.ts` L38 : `where: Record<string, unknown>`
- `[id]/route.ts` L32, L63, L106 : `updateData`, `lineData`, `ld`
- `extract/route.ts` L90, L225, L261, L314, L354, L355, L370
- `detail/extract/route.ts` L60, L96, L158
- `app/actions/bons-commande.ts` L26, L71, L134, L150, L210

---

## 6. Ameliorations suggerees

### Priorite Haute (a corriger)

1. **Migrer les 2 routes extract sur `apiRoute`** — Court-circuite l'auth centralise.
   Risque securite reel (pas de middleware company check centralise).

2. **Unifier les calculs monetaires en `Big.js`** — `PATCH [id]/route.ts` L55 utilise
   `number` natif. Risque d'arrondi sur les montants. Aligner sur `Big.js`
   comme dans `route.ts` (POST) et `lines/[lineId]/route.ts`.

3. **Rendre `companyId` obligatoire dans les routes extract** — Empecher la fuite
   cross-tenant en filtrant les produits par `companyId` dans les requetes Prisma.

### Priorite Moyenne (a ameliorer)

4. **Importer les schemas Zod depuis `lib/schemas/bon-commande.ts`** au lieu de
   les reduplicuer inline dans 3 routes API. Risque de desynchronisation.

5. **Unifier le pattern `handleApiResponse`** dans `use-bc-rapprochement.ts` —
   Les 4 mutations sans ce wrapper sont une anomalie de consistance.

6. **Extraire les sous-composants de `rapprochement-card.tsx`** en fichiers separes
   (`editable-quantite.tsx`, `detail-row-edit.tsx`, `ligne-row.tsx`).

7. **Convertir `import-detail-dialog.tsx` en Sheet ou page dediee** —
   437 lignes, 5 modes, sous-liste repetable. Le Dialog n'est pas le bon container.

### Priorite Basse (nit)

8. **Corriger le champ `totalHT` double** dans `scan-bc-verification-form.tsx` L284/L292.

9. **Typing plus strict pour `Record<string, unknown>`** — Creer des types propres
   pour les filtres de recherche, les data d'update, et les payloads OCR.

---

## 7. Liaison avec autres modules

| Module lie | Nature de la liaison | Fichiers concernes |
|------------|---------------------|--------------------|
| **Bons de Livraison** | Validation BC genere un BL (`POST /api/bons-livraison`) | `app/actions/bons-commande.ts` L164-190 |
| **Factures** | Validation BC genere une Facture (`POST /api/invoices`) | `app/actions/bons-commande.ts` L193-242 |
| **Ordres de Fabrication** | Lancement OF depuis BC (`POST /api/ordres-fabrication`) | `hooks/use-bc-rapprochement.ts` L135-153 |
| **Clients (Tiers)** | Creation auto client depuis scan OCR | `route.ts` L99-119, `app/actions/bons-commande.ts` L26-46 |
| **Produits** | Creation auto produit depuis scan (`createProduct`) | `route.ts` L184-220 |
| **Notifications** | Alertes email + in-app sur ecarts de rapprochement | `lib/bon-commande/reconciliation.ts` L129-217 |
| **Dashboard** | Stats BC sur le dashboard (`countDraft`, `countAccepted`) | `route.ts` L47-61, `hooks/use-bc.ts` L23 |
| **Company** | `prefixeBC` pour numerotation, `type` pour BC vise offshore | `route.ts` L18, `app/actions/bons-commande.ts` L197-208 |
| **Session/Auth** | `getSessionFromRequest` (routes extract) / `apiRoute` (5 routes) | `extract/route.ts`, `detail/extract/route.ts` |
| **Mail** | Envoi email d'alerte ecart quantite | `lib/bon-commande/reconciliation.ts` L193-204 |

---

## Resume des findings

| Severite | Count | Details |
|----------|-------|---------|
| **BLOCKER** | 2 | B1 (apiRoute manquant), B3 (companyId non requis) |
| **Warning** | 4 | Bug1 (Big.js), W1 (handleApiResponse), W2 (schemas dupliques), W3 (Dialog complexe) |
| **Nit** | 3 | Bug2 (totalHT double), W4 (composants imbriques), typing Record |

**Verdict** : Le module est globalement bien structure et suit les patterns du projet
(TanStack Query, Zustand, Zod, apiRoute). Les 2 blockers concernent les routes
extract qui n'utilisent pas `apiRoute` et un risque de fuite cross-tenant.
Le calcul monetaire en `number` dans le PATCH est un bug latent.
