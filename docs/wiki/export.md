# Module : Export (NGP)

## Fonctionnalités

- **Exports** : déclarations d'export (numéro, déclaration de vente, simultanée), statuts (BROUILLON → EN_COURS → VALIDE → ANNULE).
- **Lignes d'export** : rattachées à un bon de livraison, une facture et/ou un code NGP, avec quantités BL, reste, numéros de BL/facture et dates.
- **Codes NGP** : code + code-barres + description, par entreprise, réutilisables dans les lignes d'export.

## Modèles de données (Prisma)

- `Export`, `ExportLine`, `NgpCode`.

## Fichiers clés

- `app/api/exports/`, `app/api/ngp-codes/` — CRUD
- `app/(app)/exports/` — pages UI (Server Component, client logic dans `components/exports/exports-main-client.tsx` + `exports-client.tsx`)
- `hooks/use-exports.ts`, `hooks/use-ngp-code-queries.ts`
- `lib/stores/export-store-*` — état (création / édition)

## Notes

- La gestion de l'export utilise un store partagé (`lib/stores/export-store-shared.ts`) entre création et édition.
- Le POST `/api/exports` valide le corps de la requête avec Zod (`exportSchema`, `exportLineSchema`) avant insertion en base.
- Le PATCH `/api/exports/[id]` valide le corps de la requête avec Zod (`exportPatchSchema`, `exportPatchLineSchema`) avant mise à jour. Tous les champs sont optionnels (mise à jour partielle).

## Typage — P1-4 lot final (2026-09-28)

- `components/exports/export-list-columns.tsx` : signature de `useExportColumns` purgée des 3 `any` — `updateExport`/`deleteExport` typés `ExportMutations["updateExport"]` / `ExportMutations["deleteExport"]` (`type ExportMutations = ReturnType<typeof useExportMutations>`, import `type` depuis `@/hooks/use-exports`), `openEditDialog: (exp: ExportRow) => void` (`ExportRow = SerializedExport`, type du store `export-store-list.ts`).
- `lib/export-csv.ts` : générique contraint `exportCSV<T extends Record<string, unknown>>` et lecture de cellule `r[c.key]` au lieu de `(r as any)[c.key]` ; `Column<T>` inchangé. `exportCSV` n'a actuellement **0 appelant** dans le projet (seul réexporté par `lib/export-utils.ts`).
- Types/signatures uniquement : 0 changement de logique, de rendu ou de comportement. `components/exports/export-detail-lines-table.tsx` faisait partie de la liste P1-4 du 2026-09-27 mais a été reconnu **périmé** et n'a pas été rouvert.

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-exports.ts` : effet debounce 300 ms `searchInput → setSearchQuery` (ex-L42) **supprimé** ; `useExportSearchDebounce()` vidé (appelé par `components/exports/exports-client.tsx` → **candidat à suppression**) ; `useExportList` lit `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1 `hooks/use-effets.ts`) ; import `useEffect`/`useRef` purgé.
- Flux inchangé : recherche serveur conservée (mécanisme différé uniquement), filtre client DataTable (`searchValue={searchInput}` / `globalFilter`) **intact**, `export-store-list.searchQuery` plus lu (store non modifié).

## Lot F.4 — confirm() natif → ConfirmDialog (2026-10-18)

- `export-detail-client.tsx` : le `if (confirm("Supprimer cet export ?")) deleteExport.mutate(...)` inline dans la prop `onDelete` devient un `<ConfirmDialog>` (`components/confirm-delete-dialog.tsx`) — état `deleteOpen`, `onDelete={() => setDeleteOpen(true)}`, `onConfirm` = **le même** `deleteExport.mutate(exp.id, { onSuccess, onError })` (callbacks notify + `router.push("/exports")` inchangés), `isLoading={deleteExport.isPending}`, titre = texte exact de l'ancien `confirm`, description nommant l'export (`exp.numero`).
- Détail complet : `docs/wiki/notifications.md` §9 + entrée CHANGELOG `[2026-10-18] Frontend (lot-f4-alert-confirm-catch/F)`.
