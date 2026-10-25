# Module : Production / Atelier

## Fonctionnalités

- **Ordres de fabrication (OF)** : code séquentiel atomique via `nextNumber()` (OF-AAAA-NNNN, PostgreSQL upsert), produit + variante + design, quantités par taille (`details` JSON), statuts (BROUILLON → CONFIRME → EN_COURS → TERMINE → ANNULE), matières nécessaires (`OrdreMatiere`).
- **Packing lists (colisage)** : génération automatique par tailles, types de cartons, colisage manuel, documents PDF + étiquettes générés et stockés dans `public/packing-lists/`.
- **Types de cartons** : `nom`, `capacite` (pièces), **dimensions `longueur`, `largeur`, `hauteur`** (utilisées par l'API et l'UI colisage), par entreprise.
- **Designs personnalisés** : `layers` JSON (studio de personnalisation).

## Modèles de données (Prisma)

- `OrdreFabrication`, `OrdreMatiere`, `PackingList`, `PackingCarton`, `CartonType`, `DesignPersonnalise`, `ProduitComposition`.

## Fichiers clés

- `app/api/ordres-fabrication/` — CRUD OF
- `app/api/packing-list/` (+ `[id]/pdf`, `[id]/etiquettes`) — packing lists
- `app/api/carton-types/` — types de cartons
- `app/(app)/atelier/` — pages atelier / production / packing-list
- `app/(app)/parametres/app/colisage/` — paramétrage colisage
- `lib/packing-list/` (`colisage.ts`, `generate.ts`, `pdf.ts`)
- `lib/types/ordre-fabrication.ts` — `SerializedOrdreFabrication`
- `lib/types/packing-list.ts` — `SerializedPackingList`
- `lib/types/design.ts` — `SerializedDesignPersonnalise`
- `hooks/use-packing-list.ts`, `hooks/use-ordres-fabrication.ts`, `hooks/use-designs-personnalises.ts`

## Notes

- La capacité de carton = 0 signifie répartition automatique sans limite fixe.
- Les cartons enregistrés (`PackingCarton.contenu`) stockent la répartition par taille en JSON.
- **Typage (P1-4 Lot 2)** : l'UI Atelier/Planning est désormais **sans `any`** — types partagés `SerializedOrdreFabrication`, `SerializedMatierePremiere`, `SerializedDesignPersonnalise`, et un guard local `isOFDetail(v: unknown): v is OFDetail` fidèle au schéma zod (strict sur `variantId`/`variantNom`/`quantite`, tolère les champs à `.default()` côté POST).
- À centraliser dans un lot ultérieur : les 4 types locaux `OrdreAvecProduct`, `OrdrePlan` (planning), `DesignAvecRelations`, `DesignAvecProduit` (modeles/nouveau OF) → `lib/types/`.

## Typage — P1-4 lot final (2026-09-28)

- `components/customizer/canvas/design-canvas.tsx` : les 3 casts `as any` des handlers du `<Stage>` Konva ont été supprimés — `onClick` et `onTap` passent `handleStageClick`, dont la signature est resserrée de `Konva.KonvaEventObject<unknown>` à `Konva.KonvaEventObject<Event>` (commun dominé de `MouseEvent` et `TouchEvent` attendus par react-konva) ; `onMouseDown` passe `handleSelectionChange` (déjà `Konva.KonvaEventObject<Event>`).
- `lib/customizer/export/generate-fiche.ts` : `const ed = layer.data as any` → `as EmbroideryLayerData` (type exporté de `lib/customizer/types/product-customizer.ts`, ajouté à l'import `type` existant).
- `lib/customizer/export/production-export.ts` : `(layer.data as any).src` → `(layer.data as ImageLayerData).src`, aligné sur `as TextLayerData` / `as EmbroideryLayerData` déjà utilisés dans le fichier (`ImageLayerData` ajouté à l'import `type`).
- Types/signatures uniquement : 0 ligne de JSX de rendu modifiée, 0 changement de logique.

## P2-7 Lot 5 — customizer (2026-09-28)

Lot 5 du nettoyage `P2-7` (audit `AUDIT-FACTURAPRO.md` §6) sur **`components/customizer/customizer-studio.tsx` + `components/customizer/canvas/design-canvas.tsx` uniquement** — 0 autre fichier code, 0 changement visuel, 0 réorganisation JSX, 0 nouveau composant. Les **3 `useEffect` non justifiés** sont traités site par site ; l'effet `useImageLoader` (`design-canvas.tsx:24`, synchronisation de l'image externe `window.Image` ↔ état) reste **intact et justifié**.

1. **`design-canvas.tsx` ex-L209 — garde de vue (`currentView` vs `productType`) → supprimée, corrigée à la source dans le studio** : la garde vit désormais **(a)** dans le `queryFn` d'init produit (vue validée contre `detectProductType(...) ?? "t-shirt"` — le `?? "t-shirt"` = paramètre par défaut de `<DesignCanvas productType={productType}>` — **avant** d'écrire `selectedProduct`, pour qu'aucun rendu intermédiaire ne voie un type de vue invalide) et **(b)** dans l'export fiche : `backSupported = getViewConfig(productType ?? "t-shirt", "back") !== undefined` conditionne la bascule `back`. Imports morts purgés (`getDefaultView`, type `CanvasView`). Seuls writers de vue restants : boutons de vue du canvas (vues valides par construction) et export fiche (garde ci-dessus).
2. **`customizer-studio.tsx` ex-L178 — init du store produit → `useQuery` de continuation sans réseau** : `queryKey: ["customizer-product-init", productId]`, `enabled: Boolean(product?.product)` (arrivée de `useProduitDetail`), `staleTime: 0` (rejoue à chaque montage comme l'ex-effet) ; `queryFn` = mapping `SerializedProduct → CustomizerProduct` + écritures **hors render** (`useProductStore.getState()` / `useCanvasStore.getState()`) ; garde `!selectedProduct` **conservée** ; selector `setSelectedProduct` ex-L53 supprimé (devenu mort) ; cast `(p as { tiersName?: string | null })` remplacé par `p.tiersName` (champ présent sur `SerializedProduct`).
3. **`customizer-studio.tsx` ex-L193 — fetch du design → `useQuery` dédié** : `queryKey: ["customizer-design-init", designId]` — **racine distincte de `queryKeys.designs()`** (`["designs-personnalises"]`, invalidée par les 3 mutations : un refetch réécrirait les layers par-dessus le canvas) ; `enabled: Boolean(designId)`, `staleTime: 0` + `retry: false` + `refetchOnReconnect: false` (≡ 1 appel silencieux par montage de l'ex-effet, `.catch(() => {})` → `catch → null`), `placeholderData: (prev) => prev` (l'ex-effet ne réinit pas l'id au changement de `designId`) ; `setLayers` dans le `queryFn` si `Array.isArray(layers)` + `as DesignLayer[]` (`layers: unknown` sur `SerializedDesignPersonnalise`) ; état renommé `lastSavedDesignId` + dérivation au rendu `savedDesignId = designQuery.data?.id ?? lastSavedDesignId` (priorité identique : serveur puis local).

**Mécanisme (alternative motivée à l'« ajustement au rendu »)** : écrire un store partagé pendant le render est un bug ouvert React 19 (`react-dom-client.development.js:16378-16399` → *"Cannot update a component while rendering a different component"*, Zustand v5 notifie synchrone = react/react#31730) ; la continuation TanStack (writes dans `queryFn`, hors cycle de rendu) est retenue : ni `useEffect` ajouté, ni nouveau store.

**Écarts assumés** : (1) **bug résiduel conservé** — le store module persiste entre navigations et l'init ne réécrit pas si `selectedProduct` est déjà présent (studio A → studio B ré-affiche le produit A ; identique avant/après, non corrigé) ; (2) **export « fiche » pour `bottle`/`sticker`** (seuls types sans vue `back`) : l'ex-effet réinitialisait la bascule `back` → le PDF recevait un **doublon de la vue face** en colonne droite ; désormais la capture est sautée → `snapshotBack: null` → page droite absente (l'ancien comportement était un bug de fiche de production) ; (3) **durcissement `Array.isArray`** : l'ex-effet passait toute valeur truthy à `setLayers` (implicite `any`) — une non-tableau aurait planté le canvas, désormais ignorée ; (4) micro-écarts TanStack : cache déjà en mémoire au montage (même nombre d'appels, latence nulle), `refetchOnReconnect` forcé à `false` pour l'init design (défaut provider absent de l'ex-effet).

**Comportement conservé** : même produit initialisé avec les mêmes champs, même validation de vue au montage, même restauration layers + id de design, même priorité serveur/local du `savedDesignId`, même bascule face/dos de l'export fiche pour les types à 2 vues. `grep -rn "useEffect(" <les 2 fichiers>` → **exactement 1 ligne** (`design-canvas.tsx:24`).

**Vérifications (résumé)** : lint fichiers → studio **0 problème**, `design-canvas.tsx` **19 erreurs préexistantes intouchées** (`useImageLoader` L25 + refs Konva L302-310/L374-375) ; `npm run lint` → **✖ 424 problems (46 errors, 378 warnings)** vs baseline **427 (46/381)** = erreurs **46 → 46 (0 nouveau)**, warnings **−3** (imports morts purgés) ; `npx tsc --noEmit --incremental false` → **exactement les 5 préexistantes** ; périmètre `find -newermt` → **2 fichiers `.tsx`** ; `md5sum` AUDIT + `lib/api-route.ts` inchangés ; inventaire projet → **34 occurrences / 25 fichiers** (baseline 37/26) = **20 justifiées + 14 non justifiées**. Détail complet : entrée CHANGELOG `[2026-09-28] Frontend (p2-7-lot5-customizer/P2-7)`.

## P2-7 Lot 7 — nouveau-of-dialog + packing-list (2026-09-28)

Lot 7 du nettoyage `P2-7` (audit `AUDIT-FACTURAPRO.md` §6) sur **`components/atelier/nouveau-of-dialog.tsx` + `components/atelier/packing-list-client.tsx` uniquement** — 3 `useEffect` non justifiés traités, 0 `useEffect` ajouté, 0 ligne de JSX modifiée. Les 2 erreurs `react-hooks/set-state-in-effect` de `nouveau-of-dialog.tsx` (seules erreurs lint du périmètre avant tâche) disparaissent.

1. **`nouveau-of-dialog.tsx` ex-L51 — fetch `GET /api/products?limit=500` → `useQuery`** : `queryKey: ["of-products-select", 500]`, `enabled: open` (≡ garde `if (!open) return`), `staleTime: 0` (re-fetch à chaque réouverture ≡ effet), `retry: false` (≡ `.catch(() => {})`, 1 tentative), sans check `res.ok` (parity avec l'ancienne réponse ignorée silencieusement) ; `const products = productsData ?? []` remplace `useState` + `setProducts`. **Écart assumé** : à la réouverture le cache est servi pendant la revalidation (l'effet vidait → flash « select vide »).
2. **`nouveau-of-dialog.tsx` ex-L62 — pré-sélection des props → ajustement au rendu local** : sentinel `prevPreselect {productId, designId}` (initialisé aux props), déclencheurs = identité des 2 props, gardes truthy `if (preselectedProductId)` / `if (preselectedDesignId)` identiques à l'effet ; l'init `useState(preselectedProductId ?? "")` couvre le montage.
3. **`packing-list-client.tsx` ex-L133 — répartition de base cartons → ajustement au rendu local** : sentinel `null`-init `{open, ordre, key: demandeKey, types: selectedTypes}` (le `null` consomme le 1er passage, comme l'effet au montage), déclencheurs = les 4 dépendances exactes `[open, ordre, demandeKey, selectedTypes]`, **garde `if (open && ordre)`** conservée (aucun reset quand le dialog est fermé) ; écrits identiques `setCartons(map…)` + `setTouched(false)` ; **`eslint-disable` ex-L136 supprimé** + warning `exhaustive-deps` `demande` (ex-L146) disparu ; import `useEffect` purgé. `repartirParTailles` (`lib/packing-list/colisage.ts`, pure) inchangée.

**Vérifications (résumé)** : `grep -n "useEffect(\|useLayoutEffect(" <les 2 fichiers>` → **vide** ; `npx eslint <les 5 fichiers du lot>` → **0 erreur** (baseline : 2 erreurs) ; `npm run lint` → **✖ 420 problems (44 errors, 376 warnings)** vs baseline **424 (46/378)** = **−2 erreurs** (les 2 ciblées, 0 nouvelle) ; `npx tsc --noEmit --incremental false` → **exactement les 5 préexistantes** ; inventaire projet → **28 occurrences / 20 fichiers** (34/25) = **20 justifiées + 8 non justifiées**. Détail complet : entrée CHANGELOG `[2026-09-28] Frontend (p2-7-lot7-divers/P2-7)`.

## Centralisation des types atelier + fix `tsc` (2026-09-30)

Tâche transverse « 5 erreurs `tsc` préexistantes + types dupliqués atelier → `lib/types/` » (orchestration Governor, exécution sous-agent `general`, rôle mixte Backend/typage). **`npx tsc --noEmit` : 5 erreurs → 0.** 0 ligne de JSX, 0 changement visuel, 0 `useEffect`, 0 `any`.

### A) Fix des 5 erreurs `tsc` — le hook avait tort, pas le composant

Les routes API renvoient une **enveloppe** `{ … }`, les `handleApiResponse<T>` des hooks déclaraient le corps nu. **Aucun composant modifié** (les lecteurs étaient justes en runtime) :

| Hook | Avant | Après | Preuve route |
|---|---|---|---|
| `hooks/use-devis.ts:186` `convertToInvoice` | `{ invoiceId: string }` | `{ invoice: SerializedInvoice }` | `quotes/[id]/convert/route.ts:152` → `{ invoice }` |
| `hooks/use-devis.ts:96` `createQuote` | `SerializedQuote` | `{ quote: SerializedQuote }` | `quotes/route.ts:197` → `{ quote }` |
| `hooks/use-effets.ts:192` `createEffet` | `SerializedEffet` | `{ effet: SerializedEffet }` | `effets/route.ts:95` → `{ effet }` |

Corrige : `devis-detail-client.tsx:153/156` (TS2551 ×2), `nouveau-devis-actions.tsx:54/57` (TS2339 ×2), `nouvel-effet-actions.tsx:48` (TS2339). 1 seul consommateur par mutation, aucun impact ailleurs.

### B) Types centralisés (ex-déclarations locales atelier/planning)

| Nouveau type | `lib/types/` | Ex-local |
|---|---|---|
| `ProductRef { id, code, nom }` | `product.ts` | forme répétée ×4 |
| `OrdreAvecProduct extends SerializedOrdreFabrication` | `ordre-fabrication.ts` | `ordres-fabrication-client.tsx:49` |
| `OrdrePlan` (mapped, hérite de `OrdreAvecProduct`) | `ordre-fabrication.ts` | `planning-client.tsx:33` |
| `OFDetailLine` (7 champs) | `ordre-fabrication.ts` | `interface OFDetail` `ordres-fabrication-client.tsx:102` |
| `DesignAvecProduit extends SerializedDesignPersonnalise` | `design.ts` | `nouveau-of-dialog.tsx:22` |
| `DesignAvecRelations extends DesignAvecProduit` | `design.ts` | `modeles-client.tsx:17` |
| `PackingOFDetail { taille, quantite }` | `packing-list.ts` | `interface OFDetail` `packing-list-client.tsx:40` |

Tous exportés par le barrel `lib/types/index.tsx`. Les 5 déclarations locales sont **supprimées**, remplacées par `import type { … } from "@/lib/types"`.

**Décisions notables** :
- **Les 2 `OFDetail` homonymes à formes différentes ne sont PAS fusionnés** (interdit : la déduplication ne s'applique qu'aux structures identiques) → renommés et séparés par fichier.
- **`DesignAvecRelations ⊃ DesignAvecProduit`** est désormais explicite dans le type (la redondance était en dur).
- **`OrdrePlan` reste un `type` mapped, pas un `interface extends`** : l'`extends` déclenchait `TS2322` dans `planning-client.tsx:82` (`TimelineSlotData.data: Record<string, unknown>` — un `interface` n'a pas d'*implicit index signature*, une mapped type si). Structure identique, 0 cast, 0 consommateur modifié.

**Vérifications** : `npx tsc --noEmit --incremental false` → **exit 0 / 0 erreur** ; `npm run lint` → **✖ 418 (44 errors, 374 warnings)** = baseline ; grep `any`/`@ts-ignore`/`eslint-disable` → vide ; grep déclarations locales → vide ; périmètre `find -newermt` → **12 fichiers** ; `md5sum` AUDIT + wrapper inchangés ; skill `type-safety` chargé, skills design non chargés (0 JSX). Détail complet : entrée CHANGELOG `[2026-09-30] General (tsc-fix-et-centralisation-types)`.

## P2-12 — suppressions sur `ConfirmDeleteDialog` (2026-10-02)

4 confirmations de suppression artisanales du module remplacées par la brique de référence **`components/confirm-delete-dialog.tsx`** (audit `AUDIT-FACTURAPRO.md` §6, lot `P2-12`) :

| Fichier | Titre (identique) | Pending → `isLoading` | Libellé |
|---|---|---|---|
| `modeles-client.tsx` | Supprimer le modèle ? | `deleteDesign.isPending` (**ajout** — aucun avant) | défauts |
| `ordres-fabrication-client.tsx` (bloc suppression) | Supprimer l'OF ? | `remove.isPending` | défauts |
| `packing-list-client.tsx` | Supprimer le colisage ? | `remove.isPending` | défauts |
| `planning-client.tsx` | Retirer du planning ? | `update.isPending` | **`confirmLabel="Retirer"`** (préservé) |

- **Callbacks inchangés** : `handleDelete` (OF, colisage), `handleUnschedule` (planning), `() => { deleteDesign.mutate(d.id); setDeleteId(null) }` (modèles — le `setDeleteId(null)` est conservé pour parité exacte, doublon idempotent avec `onOpenChange`).
- **`AlertDialogTrigger` des modèles converti** : bouton poubelle avec `onClick={() => setDeleteId(d.id)}` + `<ConfirmDeleteDialog open={deleteId === d.id}>` — même emplacement, mêmes classes, même icône `Trash2`.
- **Descriptions interpolées** : templates `${…?.code ?? ""}` / `${…?.numero ?? ""}` dont la sortie est **identique à l'ancien JSX** (y compris pendant l'animation de fermeture, sans `undefined`).
- **CONSERVÉ en `AlertDialog`** : le bloc **« Changer le statut »** de `ordres-fabrication-client.tsx` (confirmation d'action avec description en `<strong>`, pas une suppression).
- Vérifications + détail complet : entrée CHANGELOG `[2026-10-02] Frontend (p2-12-confirm-delete/P2-12)`.

## Lot H vague W4 — studio de personnalisation & sélecteur produits OF vers `hooks/` (2026-10-24)

- **Nouveau `hooks/use-customizer-init.ts`** : les 2 `useQuery` inline de `components/customizer/customizer-studio.tsx` y sont déplacés — `useCustomizerProductInit(productId)` (dérive le produit sélectionné dans le store Zustand, clé `queryKeys.customizer.productInit` + `enabled: Boolean(product?.product)` + `staleTime: 0`) et `useCustomizerDesignInit(designId)` (hydrate `useLayerStore`, clé `queryKeys.customizer.designInit`, `enabled`/`staleTime: 0`/`retry: false`/`refetchOnReconnect: false`/`placeholderData` identiques). Le premier hook interne `useProduitDetail(productId)` (retiré du composant, qui ne s'en servait plus).
- **`hooks/use-ordres-fabrication.ts`** gagne `useOFProductsSelect(open)` (+ interface exportée `OFProductOption`) : ex-`fetch("/api/products?limit=500")` inline de `components/atelier/nouveau-of-dialog.tsx`, clé `queryKeys.bonsCommande.produitsSelect(500)` = `["of-products-select", 500]`, `enabled: open`, `staleTime: 0`, `retry: false`.
- Aucun changement visuel, aucune contrainte de cache déplacée.
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
