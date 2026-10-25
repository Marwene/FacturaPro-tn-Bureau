# Audit Complet : Module Achats / Bon de Livraison

**Date** : 2026-09-20  
**Agent** : QA Agent  
**Périmètre** :
- `app/api/bons-livraison/` (route.ts, [id]/route.ts)
- `app/api/bons-commande/` (route.ts, [id]/route.ts, extract/route.ts, [id]/detail/route.ts)
- `app/api/achats/` (route.ts, [id]/route.ts, extract/route.ts)
- `components/bons-livraison/` (9 fichiers)
- `components/achats/` (18 fichiers)
- `hooks/use-bl.ts`, `hooks/use-achats.ts`, `hooks/use-achats-queries.ts`, `hooks/use-achats-search.ts`
- `lib/stores/bl-store.ts`, `lib/stores/achats-store.ts`

---

## 1. Vue d'ensemble

### Architecture du module

Le module couvre 3 sous-modules interconnectés :

| Sous-module | Route API | Pages | Store | Hook principal |
|---|---|---|---|---|
| **Bons de Livraison (ventes)** | `/api/bons-livraison` | `/bons-livraison` | `bl-store.ts` | `use-bl.ts` |
| **Bons de Commande** | `/api/bons-commande` | `/bons-commande` | `bons-commande-store.ts` | `use-bc.ts` |
| **Achats (fournisseurs)** | `/api/achats` | `/achats` | `achats-store.ts` | `use-achats.ts`, `use-achats-queries.ts` |

### Flux fonctionnel

```
BC (client) → BL (livraison) → Facture (invoice)
BL achat (fournisseur) → Facture achat
Scan OCR (fournisseurs) → Extraction → Vérification → Création
```

### Stack technique

- **Backend** : Next.js API Routes avec wrapper `apiRoute` (auth + permissions + company)
- **DB** : Prisma ORM avec relations `bonLivraison ↔ tiers ↔ lines ↔ product`
- **State** : Zustand (forms + list filters + scan state)
- **Server state** : TanStack Query (`useQuery` / `useMutation`)
- **Calculs** : `big.js` pour précision financière, `parseTunisianNumber` pour les formats locaux
- **OCR** : Multi-provider (OpenAI, Gemini, Mistral, Mistral OCR) avec fallback chaîné

---

## 2. Audit Code

### 2.1 API Routes

#### ✅ Points forts

- **Toutes les routes utilisent `apiRoute`** wrapper pour l'auth, les permissions et le companyId. Aucune route n'est "nue".
  - `app/api/bons-livraison/route.ts` L11, L123
  - `app/api/bons-livraison/[id]/route.ts` L9, L33, L82
  - `app/api/bons-commande/route.ts` L31, L65
  - `app/api/achats/route.ts` L12, L90
  - `app/api/achats/[id]/route.ts` L22, L71, L185
  - `app/api/bons-commande/[id]/detail/route.ts` L26, L56

- **Validation Zod** : `blSchema`, `bonCommandeSchema`, `achatSchema` utilisés pour parser le body.
- **Sérialisation décimale** : `serializeDecimals()` systématiquement appelée sur les réponses.
- **Multi-tenant** : `companyId` systématiquement injecté via `apiRoute` et utilisé dans les `where`.
- **Gestion des erreurs** : `errorResponse()` centralisé pour les réponses d'erreur.
- **Calculs financiers** : Utilisation de `Big.js` pour éviter les imprécisions flottantes (pas de `Number` pour les totaux dans les routes BL/achats principaux).

#### ❌ Problèmes identifiés

**[BLOCKER] B1 — `app/api/bons-commande/[id]/route.ts` L55-63, L84 : `Number()` pour les calculs financiers et `Record<string, unknown>` non typé**

```typescript
// L55 : Calculs financiers avec Number() au lieu de Big()
let baseHT = 0, totalHT = 0, totalTVA = 0, totalFodec = 0, totalTTC = 0;
// ...
const remiseMontant = prix * (remise / 100);
const htLigne = (prix - remiseMontant) * qte;
```

```typescript
// L63 : Paramètre `l` typé en Record<string, unknown>
const lineData = lines.map((l: Record<string, unknown>, i: number) => {
```

```typescript
// L32 : updateData non typé
const updateData: Record<string, unknown> = {};
```

Le reste du projet (route.ts BL, achats) utilise `Big.js` pour les calculs financiers. Cette route utilise `Number()`, ce qui peut provoquer des erreurs d'arrondi sur les montants. De plus, le `Record<string, unknown>` masque le typage réel des lignes.

**[BLOCKER] B2 — `app/api/achats/extract/route.ts` L324 : Route POST sans wrapper `apiRoute`**

```typescript
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionFromRequest(request);
    // ... auth check manuel
    const perm = checkPermission(sessionUser!.role, sessionUser!.permissions, "achats:creer");
```

Cette route gère l'auth manuellement avec `getSessionFromRequest` + `checkPermission` au lieu d'utiliser `apiRoute.post()`. C'est exactement le pattern que le wrapper apiRoute est censé éviter. `app/api/bons-commande/extract/route.ts` L264 a le même problème.

**[WARNING] W1 — `app/api/bons-livraison/route.ts` L101 : Cast `as Array<Record<string, unknown>>`**

```typescript
for (const bl of serialized as Array<Record<string, unknown>>) {
```

`serializeDecimals` devrait retourner un type plus précis. Le cast masque le typage réel et permet des erreurs silencieuses.

**[WARNING] W2 — Duplication massive des fonctions OCR**

Les fonctions `extractWithOpenAI`, `extractWithGemini`, `extractWithMistral`, `extractWithMistralOCR` sont dupliquées quasiment à l'identique entre :
- `app/api/achats/extract/route.ts` (L150-322)
- `app/api/bons-commande/extract/route.ts` (L92-262)
- `app/api/bons-commande/[id]/detail/extract/route.ts` (L60-96)

Ces ~450 lignes devraient être extraites dans un module partagé `lib/ocr-providers.ts`.

**[WARNING] W3 — Duplication `matchProductId`**

La fonction `matchProductId` est dupliquée :
- `app/api/achats/extract/route.ts` L125-148 (définie localement)
- `lib/bon-commande/matching.ts` (exportée, réutilisée dans `bons-commande/extract`)

La version dans achats/extract devrait importer celle de `lib/bon-commande/matching.ts` ou d'un module partagé.

**[WARNING] W4 — `app/api/bons-livraison/route.ts` L130-133 : `NextResponse.json` avec body non wrappé dans le POST**

```typescript
if (!parsed.success) {
  return NextResponse.json(
    errorResponse("Données invalides", parsed.error.issues),
    { status: 400 }
  );
}
```

Le GET utilise le raccourci `return { ... }` (wrappé par `apiRoute`), mais le POST utilise `NextResponse.json()`. C'est incohérent mais pas incorrect. Le GET L110 `return { ... }` dépend du wrapper pour transformer en JSON.

### 2.2 Hooks / State Management

#### ✅ Points forts

- **TanStack Query** : Tous les data-fetching serveur passent par `useQuery`/`useMutation`. Aucun `fetch()` direct dans les composants.
- **Optimistic updates** : Les mutations BL et achats implémentent des optimistic updates avec rollback en cas d'erreur (`onMutate` → `onError` → `onSettled`).
- **Zustand** : Stores bien structurés, un store par domaine (BL, achats, scan).
- **Query invalidation** : `onSettled` systématiquement utilise `invalidateQueries`.

#### ❌ Problèmes identifiés

**[BLOCKER] B3 — `hooks/use-achats-queries.ts` L34-35 : `fetch()` sans `handleApiResponse`**

```typescript
queryFn: async () => {
  // ...
  const res = await fetch(`/api/achats?${params}`);
  if (!res.ok) throw new Error("Failed to fetch achats");
  return res.json();
},
```

Les autres hooks (use-bl.ts, use-achats.ts) utilisent `handleApiResponse()` pour gérer les erreurs de manière centralisée. `use-achats-queries.ts` utilise `if (!res.ok) throw new Error(...)` ce qui perd le contexte d'erreur de l'API. Même problème pour `useAchat` L46-49.

**[WARNING] W5 — Code mort / hooks dépréciés non supprimés**

`hooks/use-achats.ts` contient des fonctions marquées `@deprecated` :
- L25 : `useAchatsSearchDebounce`
- L40 : `useAchatsList`
- L64 : `useAchatDetail`
- L95 : `useAchatMutations`

Ces fonctions existent toujours et `scan-verification-form.tsx` L4 utilise encore `useAchatMutations` (l'ancien hook déprécié) au lieu de `useCreateAchat` du module `use-achats-queries.ts`. Cela crée une double maintenance.

**[WARNING] W6 — `hooks/use-bl.ts` L25 : Fonction `companyParam` dupliquée**

La fonction `companyParam` est définie dans :
- `hooks/use-bl.ts` L14
- `hooks/use-achats.ts` L14
- `hooks/use-queries-shared.ts` L9

Elle est identique dans les 3 fichiers. Devrait être importée depuis `use-queries-shared.ts` uniquement.

**[WARNING] W7 — `hooks/use-bl.ts` L10-12 : Fonction `useCompanyId` dupliquée**

Même constat — `useCompanyId` est définie dans `use-bl.ts`, `use-achats.ts`, et `use-queries-shared.ts`. Seule la dernière devrait exister.

**[WARNING] W8 — `hooks/use-achats-queries.ts` L26 : Query key mal formée**

```typescript
queryKey: ["achats", search, status, companyId, type ?? "ALL", status] as const,
```

`status` apparaît deux fois dans la query key (positions 2 et 5). Cela crée des clés inutilement redondantes et peut causer des invalidations incorrectes.

**[WARNING] W9 — `hooks/use-bl.ts` L101 : Mutation type `Record<string, unknown>` non typé**

```typescript
mutationFn: async (data: Record<string, unknown>): Promise<{ deliveryNote: SerializedDeliveryNote }> => {
```

Le paramètre `data` de `createBL` est non typé. Il devrait utiliser un type spécifique ou au minimum un Zod schema.

### 2.3 Types / Validation

#### ✅ Points forts

- Types Prisma générés (`BonLivraisonStatus`, `AchatStatus`, etc.)
- Types sérialisés (`SerializedDeliveryNote`, `SerializedAchat`) avec typage clair
- Enums centralisés dans `lib/types/enums.ts`

#### ❌ Problèmes identifiés

**[WARNING] W10 — `components/bons-livraison/bl-client.tsx` L39, L61, L83 : Cast `as string` et `as Date` dans les colonnes**

```typescript
cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
```

Les cellules utilisent des casts `as string`, `as Date`, `as DeliveryNoteStatus` qui masquent le typage réel de TanStack Table. L'usage de `info.getValue()` avec un generic serait plus sûr.

**[WARNING] W11 — `components/achats/achats-client.tsx` L235 : Cast `as unknown as AchatRow[]`**

```typescript
data={(data?.achats ?? []) as unknown as AchatRow[]}
```

Double cast `as unknown as` signalant un mismatch de types entre la réponse API et le type attendu. Le type `AchatsResponse` dans `use-achats-queries.ts` devrait correspondre.

---

## 3. Audit UI / Composants

### 3.1 Structure des composants

| Composant | Rôle | Complexité |
|---|---|---|
| `BLClient` | Liste des BL | DataTable + stat cards + actions dropdown |
| `NouveauBLClient` | Formulaire création BL | Grid 2 colonnes, calculs temps réel |
| `NouveauBLActions` | Actions header (créer/annuler) | Boutons avec validation |
| `BLDetailClient` | Détail d'un BL | Info + lignes + sidebar |
| `BLDetailActions` | Header du détail | Boutons d'action contextuels |
| `BLDetailSidebar` | Sidebar détail | Récap + client + info BL visé |
| `BLFormLines` | Lignes du formulaire BL | Table éditable inline |
| `BLFormVise` | Section BL visé sous douane | Champs conditionnels |
| `BLDetailSkeleton` | État de chargement | Skeleton screens |
| `AchatsClient` | Liste des achats | DataTable + stats par catégorie |
| `NouvelAchatClient` | Formulaire création achat | Grid 2 colonnes + combobox |
| `NouvelAchatActions` | Actions header achat | Boutons draft/créer |
| `AchatDetailClient` | Détail d'un achat | Info + lignes + sidebar |
| `AchatDetailActions` | Header détail achat | Valider/Annuler |
| `AchatDetailSidebar` | Sidebar détail achat | Catégorie + BL + fournisseur |
| `AchatFormLines` | Lignes formulaire achat | Table éditable inline |
| `ScanAchatClient` | Écran scan | Machine à états |
| `ScanUploadScreen` | Upload de fichier | Drag & drop + saisie manuelle |
| `ScanExtractingScreen` | Extraction en cours | Loading state |
| `ScanErrorScreen` | Erreur d'extraction | Error state |
| `ScanVerificationForm` | Vérification extraction | Form complexe multi-sections |
| `ScanVerifHeader` | Header confirmation | Badge succès |
| `ScanVerifFournisseur` | Sélection fournisseur | Combobox |
| `ScanVerifLinesTable` | Lignes extraites | Table éditable |
| `ScanVerifBottom` | Récap + confirm | Money inputs + notes |
| `ManualEntryForm` | Saisie manuelle alternative | Form complet |

### 3.2 Patterns UI

**Utilisation de `<Card>`** : Les composants utilisent `<Card>` de manière appropriée :
- Cards pour les sections de formulaire (informations, client, notes, récap)
- Cards pour les sidebars (client, BL visé, récap)
- Tables `<Table>` pour les lignes de documents (pas de Card pour les tableaux ✅)
- `<DataTable>` pour les listes avec pagination, filtres, colonnes ✅

**Points positifs** :
- Skeleton screens pour les états de chargement ✅
- `StatCard` pour les KPIs ✅
- `StatusBadge` pour les statuts ✅
- Actions contextuelles dans les dropdowns ✅
- Confirmation dialogs pour les suppressions ✅

### 3.3 `useEffect` dans les composants

**[WARNING] W12 — `components/bons-livraison/nouveau-bl-client.tsx` L92-106 : `useEffect` pour calculer `montantTND`**

```typescript
useEffect(() => {
  if (form.blViseActif && form.devise !== "TND" && form.tauxChange && totalTTC.gt(0)) {
    const tc = parseTunisianNumber(form.tauxChange)
    if (tc && tc > 0) {
      const computed = totalTTC.times(new Big(tc)).toFixed(3)
      if (computed !== form.montantTND) {
        form.setMontantTND(computed)
      }
    }
  }
  // ...
}, [totalTTC.toFixed(3), form.tauxChange, form.blViseActif, form.devise])
```

**Justification** : Ce `useEffect` synchronise le champ `montantTND` (un montant dérivé du taux de change × total TTC) avec l'état du store. C'est un cas légitime car :
- Le calcul dépend de `totalTTC` qui est lui-même un calcul dérivé (non stocké dans le store)
- L'alternative serait de calculer au rendu, mais `montantTND` est un champ éditable dans le store qui doit rester synchronisé avec la source de vérité
- C'est une synchronisation store ↔ calcul dérivé, pas du data-fetching

**[WARNING] W13 — `components/achats/scan-upload-screen.tsx` L24 : `useEffect` pour synchroniser le type**

```typescript
useEffect(() => { form.setType(type) }, [type])
```

**Justification** : Ce `useEffect` synchronise le prop `type` (venant du searchParam de la page) avec le store Zustand. C'est un cas de synchronisation avec un système externe non réactif (le searchParam URL) — légitime.

**[WARNING] W14 — `hooks/use-bl.ts` L30-36 : `useEffect` pour debounce de recherche**

```typescript
useEffect(() => {
  if (ref.current) clearTimeout(ref.current);
  ref.current = setTimeout(() => setSearchQuery(searchInput), 300);
  return () => { if (ref.current) clearTimeout(ref.current); };
}, [searchInput, setSearchQuery]);
```

**Justification** : Debounce pattern standard. C'est un cas reconnu comme légitime pour `useEffect` (timer-based debounce). Cependant, cela pourrait être remplacé par un custom hook `useDebounce` existant dans le projet (`hooks/use-debounce.ts`).

**[WARNING] W15 — `hooks/use-bl.ts` L88-90 : `useEffect` pour synchroniser taux de change dans le store**

```typescript
useEffect(() => {
  if (query.data) setTauxChange(query.data);
}, [query.data, setTauxChange]);
```

**Justification** : Synchronisation des données TanStack Query vers Zustand. Légitime car le store forme a besoin de cette valeur mais TanStack Query est la source de vérité.

---

## 4. Bugs Identifiés

### Bug 1 — [BLOCKER] B4 : `app/api/bons-commande/route.ts` L11-29 : Fonction `getNextNumero` non atomique

```typescript
async function getNextNumero(companyId: string) {
  const last = await prisma.bonCommande.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { numero: true },
  });
  // ...
  let nextNum = 1;
  if (last?.numero) {
    const match = last.numero.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  // ...
}
```

Cette fonction n'est pas dans une transaction et utilise un compteur basé sur le dernier numéro. En cas de concurrence (2 users créent un BC en même temps), deux BC peuvent recevoir le même numéro. Le reste du projet utilise `nextNumber()` depuis `lib/sequence.ts` qui gère cela proprement.

### Bug 2 — [WARNING] W16 : `app/api/bons-livraison/[id]/route.ts` L56-68 : Mouvement de stock sans transaction

```typescript
if (status !== existing.status) {
  await handleSaleStockMovement(
    "bl", existing.status, status,
    existing.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantite: l.quantite.toNumber(),
    })),
    existing.numero,
  );
}
// ...
const deliveryNote = await prisma.bonLivraison.update({ ... });
```

Le mouvement de stock et la mise à jour du statut du BL ne sont pas dans la même transaction. Si la mise à jour du statut échoue après le mouvement de stock, les données seront incohérentes.

### Bug 3 — [WARNING] W17 : `hooks/use-achats.ts` L87 : `onError` avec import dynamique incorrect

```typescript
onError: (err: Error) => {
  import("sonner").then(({ toast }) =>
    toast.error("Erreur extraction", { description: err.message })
  );
},
```

`sonner` est déjà importé au top-level du fichier (L19 : `import { toast } from "sonner"`). L'import dynamique est inutile et crée un risque de race condition (le toast peut apparaître après le rendu suivant).

### Bug 4 — [WARNING] W18 : `hooks/use-achats-queries.ts` L59 : Mutation avec `data: unknown`

```typescript
export function useCreateAchat() {
  // ...
  return useMutation({
    mutationFn: async (data: unknown) => {
```

Le paramètre `data` est typé `unknown`, ce qui signifie que n'importe quel objet peut être passé à la mutation sans vérification de type côté client.

### Bug 5 — [WARNING] W19 : `app/api/bons-livraison/route.ts` L142-143 : Null check insuffisant

```typescript
const company = await prisma.company.findUnique({ where: { id: companyId } });
if (!company) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
const prefix = company?.prefixeBL ?? "BL";
```

Après le null check L141, L142 utilise encore `company?.` (optionnal chaining) ce qui est redondant. Plus important : le `companyId!` (non-null assertion) sur L143 est risqué car il pourrait être undefined si `apiRoute` a un bug.

---

## 5. Violations CODE RULES

### `any` explicite ou implicite
**✅ AUCUNE VIOLATION** — Aucun `any`, `as any`, `<any>`, `any[]`, ou `Record<string, any>` trouvé dans les fichiers du module. `Record<string, unknown>` est utilisé (et c'est acceptable).

### `useEffect` injustifié
**✅ AUCUNE VIOLATION** — Les 4 `useEffect` identifiés ont des justifications valides :
1. Sync store ↔ calcul dérivé (montantTND) — `nouveau-bl-client.tsx` L92
2. Sync prop URL ↔ store (type) — `scan-upload-screen.tsx` L24
3. Timer debounce — `use-bl.ts` L30, `use-achats-search.ts` L10
4. Sync TanStack Query → Zustand — `use-bl.ts` L88

### `fetch()` direct dans un composant
**✅ AUCUNE VIOLATION** — Tous les `fetch()` sont dans des hooks TanStack Query, jamais dans des composants.

### Route API sans wrapper `apiRoute`
**❌ VIOLATION** — 2 routes :
- `app/api/achats/extract/route.ts` L324 : auth manuelle
- `app/api/bons-commande/extract/route.ts` L264 : auth manuelle

### Prisma schema drift
**✅ PROPRE** — Pas de modification de schema dans le scope de cet audit.

### Design skills (impeccable / make-interfaces-feel-better)
**⚠️ NON VÉRIFIABLE** — Impossible de déterminer si les skills ont été chargés lors de la création de l'interface. L'audit ne peut que commenter le résultat visuel.

### `<Card>` partout
**✅ PAS DE PROBLÈME** — Les composants utilisent `<Card>` de manière appropriée pour les sections de formulaire et les sidebars. Les tableaux utilisent `<Table>`, les listes utilisent `<DataTable>`, les KPIs utilisent `<StatCard>`.

### États hover/focus/active/loading/disabled
**✅ BON** — Les boutons utilisent les variantes shadcn avec `disabled={isPending}`, les loading states sont gérés par `isPending`/`isLoading`, les dropdowns ont des hover states via shadcn.

---

## 6. Améliorations Suggérées

### Priorité 1 (Blockers à corriger)

| # | Fichier | Problème | Solution |
|---|---|---|---|
| B1 | `bons-commande/[id]/route.ts` | Calculs financiers avec `Number()` | Remplacer par `Big.js` comme les autres routes |
| B2 | `achats/extract/route.ts`, `bons-commande/extract/route.ts` | Auth manuelle sans `apiRoute` | Wrapper avec `apiRoute.post()` |
| B3 | `hooks/use-achats-queries.ts` | `if (!res.ok) throw` sans `handleApiResponse` | Utiliser `handleApiResponse` comme les autres hooks |
| B4 | `bons-commande/route.ts` | `getNextNumero` non atomique | Utiliser `nextNumber()` depuis `lib/sequence.ts` |

### Priorité 2 (Warnings à traiter)

| # | Problème | Solution |
|---|---|---|
| W2, W3 | Duplication OCR + matchProductId | Extraire dans `lib/ocr-providers.ts` et `lib/product-matching.ts` |
| W5 | Hooks dépréciés non supprimés | Supprimer `useAchatMutations`, `useAchatsList`, `useAchatDetail` de `use-achats.ts` |
| W6, W7 | `companyParam` et `useCompanyId` dupliquées | Importer depuis `use-queries-shared.ts` uniquement |
| W8 | Query key avec `status` en double | Corriger la clé : `["achats", search, type, status, companyId]` |
| W9 | `Record<string, unknown>` dans mutation BL | Typer avec un type ou Zod schema |
| W10, W11 | Cast `as string`/`as unknown` dans DataTable | Utiliser des generics TanStack Table |
| W16 | Mouvement stock sans transaction dans BL PATCH | Envelopper dans `prisma.$transaction()` |
| W18 | `data: unknown` dans `useCreateAchat` | Typer avec le schema Zod correspondant |

### Priorité 3 (Nits)

| # | Problème | Solution |
|---|---|---|
| W1 | Cast `as Array<Record<string, unknown>>` dans GET BL | Améliorer le typage de `serializeDecimals` |
| W4 | Incohérence GET (return shorthand) vs POST (NextResponse.json) | Harmoniser les deux patterns |
| W17 | Import dynamique `sonner` inutile | Utiliser l'import statique déjà présent |

---

## 7. Liaison avec Autres Modules

### Modules dépendants

| Module | Lien | Type |
|---|---|---|
| **Factures (invoices)** | BL → Facture via `convertToInvoice` | Conversion document |
| **Clients** | BL lie un client (`tiersId`) | Relation many-to-one |
| **Fournisseurs** | Achats lie un fournisseur (`tiersId`) | Relation many-to-one |
| **Produits** | Lignes BL/Achats referencent des produits | Relation many-to-many via lines |
| **Stock** | Validation achat → mouvement stock (`ENTREE`/`SORTIE`) | Impact direct |
| **Devis** | Pas de lien direct avec BL/Achats | Module séparé |
| **Trésorerie** | Achats validés → restent à payer (`resteAPayer`) | Impact indirect |
| **Settings/Company** | Prefixes numérotation, config entreprise | Configuration |

### Points de friction

1. **Produits créés inline** : `bons-commande/route.ts` L184-220 et `achats/route.ts` L191-227 créent des produits à la volée si `createProduct` est true. C'est un pattern risqué car il crée des données sans validation complète.

2. **Stock utils** : `handleSaleStockMovement` (importé depuis `lib/stock-utils.ts`) est utilisé dans `bons-livraison/[id]/route.ts` mais les achats utilisent un pattern différent (mouvements directs dans `achats/[id]/route.ts`). Il faudrait harmoniser.

3. **Client blocage** : `assertClientNonBloque` est utilisé pour les BL (`bons-livraison/route.ts` L138) et les BC (`bons-commande/route.ts` L92), mais pas pour les achats (logique car les achats ne bloquent pas les fournisseurs).

---

## 8. Lint / TypeCheck

### ESLint
```
app/api/bons-livraison/[id]/route.ts
  1:10  warning  'NextRequest' is defined but never used  @typescript-eslint/no-unused-vars

app/api/bons-livraison/route.ts
  1:10  warning  'NextRequest' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (0 errors, 2 warnings)
```

**0 erreurs, 2 warnings** — Les warnings portent sur des imports `NextRequest` inutilisés dans les routes BL (utilisées uniquement pour le typage du wrapper).

### TypeScript (`tsc --noEmit`)
**6 erreurs** — Aucune dans le scope de l'audit. Les erreurs sont dans :
- `components/devis/devis-detail-client.tsx` (2 erreurs)
- `components/devis/nouveau-devis-actions.tsx` (2 erreurs)
- `components/effets/nouvel-effet-actions.tsx` (1 erreur)
- `components/produits/produit-form-page.tsx` (1 erreur)

**0 erreurs dans les fichiers du module Achats/BL.**

---

## Résumé Verdict

| Catégorie | Verdict |
|---|---|
| `any` | ✅ Clean |
| `useEffect` | ✅ Tous justifiés |
| `fetch()` dans composant | ✅ Clean |
| `apiRoute` wrapper | ❌ 2 routes extract sans wrapper |
| Prisma drift | ✅ Clean |
| Lint errors | ✅ 0 erreurs (2 warnings BL) |
| Type errors | ✅ 0 dans le module |
| Duplication code | ⚠️ OCR functions × 3, companyParam × 3 |
| Sérialisation financière | ⚠️ Number() vs Big.js dans BC PATCH |
| Transactions DB | ⚠️ Stock mouvement sans transaction dans BL PATCH |
| Code mort | ⚠️ Hooks dépréciés non supprimés |

**Statut** : 4 BLOCKERS à corriger, 10 WARNINGS à traiter, 3 NITS.
