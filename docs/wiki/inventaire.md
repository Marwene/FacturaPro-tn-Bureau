# Module : Inventaire

## Fonctionnalités

- **Produits** : code, nom, prix, TVA/FODEC, stock min/actuel, statut de stock (OK/CRITIQUE/RUPTURE), code-barres, fiche technique, estSurCommande (fait sur commande), quantiteParUnite (quantité par unité).
- **Variantes** : attributs JSON (couleur, taille…), prix et stock propres.
- **Catégories & Marques** : hiérarchie de catégories, marques.
- **Mouvements de stock** : entrées, sorties, ajustements, liés à un achat ou à une référence (vente/inventaire).
- **Fournisseurs produit** : association produit↔fournisseur avec prix d'achat, référence, et flag `isDefault` (unicité produit+fournisseur). Historique des prix d'achat consultable par fournisseur (bouton History, liste chronologique avec badges de variation).
- **Matières premières** : pour la production (tissus, fils, boutons…), liées à un fournisseur.
- **Designs personnalisés** : `layers` JSON, statut BROUILLON/VALIDE/PRODUCTION.

## Modèles de données (Prisma)

- `Product`, `ProductVariant`, `ProductSupplier`, `ProductSupplierPriceHistory`, `Categorie`, `Marque`, `StockMovement`, `FicheTechnique`, `MatierePremiere`, `DesignPersonnalise`, `ProduitComposition`.

## Fichiers clés

- `app/api/products/`, `app/api/categories/`, `app/api/marques/` — CRUD
- `app/api/products/[id]/suppliers/` — fournisseurs d'un produit (GET/POST), wrappé avec `apiRoute`
- `app/api/products/[id]/suppliers/[supplierId]/` — modification/suppression fournisseur produit (PUT/DELETE)
- `app/api/products/[id]/suppliers/[supplierId]/history/` — historique des prix d'achat d'un fournisseur produit (GET)
- `app/api/products/[id]/suppliers/compare/` — comparaison des prix entre fournisseurs pour un produit (GET, stats + détails par fournisseur)
- `app/api/products/[id]/stock-movements/` — mouvements de stock (GET/POST), wrappé avec `apiRoute` et `prisma.$transaction`
- `app/api/products/[id]/photo/` — photo produit (POST/DELETE), wrappé avec `apiRoute` (`produits:modifier`)
- `app/api/products/[id]/fiches/` — fiches techniques d'un produit (GET `produits:voir`, POST `produits:modifier`), wrappé avec `apiRoute`
- `app/api/products/[id]/fiche-technique/` — fiche technique unique du produit (POST/DELETE), wrappé avec `apiRoute` (`produits:modifier`)
- `lib/upload-guard.ts` — validation d'upload partagée (magic bytes, whitelist, tailles, extension par MIME détecté)
- `app/api/matieres-premieres/` — matières premières
- `app/api/designs-personnalises/` — designs
- `app/(app)/produits/`, `app/(app)/inventaire/`, `app/(app)/stock-mouvements/` — pages UI
- `components/stock/inventaire-client.tsx` — page inventaire (StatCard + Charts + DataTable)
- `components/stock/mouvements-client.tsx` — page mouvements de stock (StatCard + DataTable)
- `components/produits/marque-select.tsx`, `components/produits/category-tree-select.tsx` — sélecteurs inline avec création rapide
- `components/produits/product-supplier-price-history.tsx` — composant historique des prix d'achat fournisseurs (badges variation, tabular-nums ; données via hook)
- `components/produits/product-suppliers-section.tsx` — section fournisseurs produit avec intégration historique (bouton History, section expandable)
- `hooks/use-product-suppliers.ts` — état serveur du domaine fournisseurs produit (listes/ajout/suppression/défaut + historique + comparaison, clés `queryKeys.produits.*`)
- `lib/types/matiere.ts` — `SerializedMatierePremiere`
- `lib/types/design.ts` — `SerializedDesignPersonnalise`
- `hooks/use-matieres-premieres.ts`, `hooks/use-designs-personnalises.ts`
- `hooks/use-ngp-code-queries.ts` — requêtes liées codes (via produits)

## Fournisseurs Produit

### Modèle de données

Le module gère les produits multi-fournisseurs grâce aux modèles suivants :

- **ProductSupplier** : Table de liaison entre Product et Tiers (fournisseur)
  - `productId` : ID du produit
  - `supplierId` : ID du fournisseur (Tiers)
  - `purchasePrice` : Prix d'achat chez ce fournisseur
  - `reference` : Référence du fournisseur pour ce produit
  - `isDefault` : Indique si c'est le fournisseur par défaut
  - `actif` : Statut actif/inactif

- **ProductSupplierPriceHistory** : Historique des modifications de prix
  - `productSupplierId` : ID de l'association ProductSupplier
  - `purchasePrice` : Prix d'achat à ce moment
  - `changedAt` : Date de la modification
  - `changedBy` : ID de l'utilisateur ayant fait la modification
  - `reason` : Raison de la modification

### Endpoints API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/products/[id]/suppliers` | GET | Liste les fournisseurs d'un produit |
| `/api/products/[id]/suppliers` | POST | Ajoute un fournisseur à un produit |
| `/api/products/[id]/suppliers/[supplierId]` | PUT | Modifie un fournisseur produit |
| `/api/products/[id]/suppliers/[supplierId]` | DELETE | Supprime un fournisseur produit |
| `/api/products/[id]/suppliers/[supplierId]/history` | GET | Historique des prix d'un fournisseur |
| `/api/products/[id]/suppliers/compare` | GET | Compare les prix entre fournisseurs |

### Composants UI

- **ProductSuppliersSection** : Section dans la fiche produit pour gérer les fournisseurs
- **ProductSupplierPriceHistory** : Affiche l'historique des prix d'un fournisseur
- **ProductSupplierComparison** : Compare visuellement les prix entre fournisseurs

### Fonctionnalités

1. **Gestion des fournisseurs** : Ajouter, modifier, supprimer des fournisseurs pour un produit
2. **Fournisseur par défaut** : Un fournisseur peut être marqué comme par défaut
3. **Historique des prix** : Suivi automatique des modifications de prix
4. **Comparaison** : Vue comparative des prix entre fournisseurs avec barres de progression
5. **Sélection enrichie** : Dans les documents (Devis, BC, BL, Facture), le select produit affiche les combinaisons produit/fournisseur avec leurs prix
6. **Création multi-fournisseurs** : Le formulaire de création/modification de produit permet d'ajouter plusieurs fournisseurs avec leur prix d'achat et référence. Les suppliers sont créés/synchronisés via les API POST/PUT `/api/products` (champ `suppliers` optionnel dans le body)

## Uploads produits (durcissement 2026-09-25)

Les 3 routes d'upload produit sont wrappées avec `apiRoute` (session + permission centralisées, `NextResponse.json` explicite, catch 500 géré par le wrapper) et validées par `lib/upload-guard.ts` :

| Route | Méthode | Permission | Catégorie | Taille max | Fichier écrit |
|-------|---------|-----------|-----------|-----------|---------------|
| `/api/products/[id]/photo` | POST | `produits:modifier` | `image` (JPEG/PNG/WebP/GIF) | 5 Mo | `public/uploads/products/<id>/photo-<ts>.<ext>` |
| `/api/products/[id]/photo` | DELETE | `produits:modifier` | — | — | supprime l'ancien fichier |
| `/api/products/[id]/fiches` | GET | `produits:voir` | — | — | — |
| `/api/products/[id]/fiches` | POST | `produits:modifier` | `pdf` | 15 Mo | `public/uploads/products/<id>/fiche-<ts>-<rand>.pdf` |
| `/api/products/[id]/fiche-technique` | POST | `produits:modifier` | `pdf` | 15 Mo | `public/uploads/products/<id>/fiche-technique-<ts>.pdf` |
| `/api/products/[id]/fiche-technique` | DELETE | `produits:modifier` | — | — | supprime l'ancien fichier |

Contrôles appliqués, dans l'ordre :

1. **`isSafeUploadId(id)`** (`^[A-Za-z0-9_-]{1,64}$`) avant tout `path.join(..., id)` → 400 sinon (anti-traversal, défense en profondeur au-delà de la validation Prisma).
2. **Taille** (`UPLOAD_LIMITS.productPhoto` 5 Mo / `UPLOAD_LIMITS.fiche` 15 Mo) vérifiée **avant** `arrayBuffer()` → 400 « Fichier trop volumineux (max X Mo) ».
3. **MIME déclaré** (`file.type`, alias `image/jpg` accepté) : doit appartenir à la whitelist de la catégorie → échec rapide sinon. **SVG/HTML interdits** (fichiers servis publiquement → XSS stocké).
4. **Contenu réel** : sniffing des magic bytes (`detectMime`) — doit être non-null **et** dans la whitelist de la catégorie → sinon 400 « Contenu du fichier non conforme à son type ». Un PDF renommé `.png`, un HTML, un SVG sont rejetés ici.
5. **Extension sur disque dérivée du MIME détecté** (jamais `file.name` ni `file.type`) : `jpg`/`png`/`webp`/`gif`/`pdf`.

**Cycle de correction (2026-09-25) — comportement `unlink` modifié :** la suppression de l'ancien fichier (POST et DELETE de `photo` et `fiche-technique`) passe désormais par `resolvePublicFilePath()` (`lib/upload-guard.ts`) : toute URL stockée en base qui ne commence pas par `/uploads/` ou qui résout hors de `public/` (traversal type `../../../.env`, écrit possible via `PUT /api/products/[id]`) retourne `null` → **aucun `unlink` appelé** (seulement un `console.warn` bref), le reste du flux métier (update Prisma + réponse) se déroulant normalement — suppression best-effort, **aucun 500** pour une URL invalide. Par ailleurs, `validateUpload()` rend les octets déjà validés (`bytes`) et chaque route écrit **ces octets-là** sans seconde `file.arrayBuffer()` (une seule bufferisation, octets écrits = octets validés), et le sniff GIF exige les 6 octets exacts `GIF87a`/`GIF89a`.

Les **shapes de réponse sont inchangées** : `{ photoUrl }`, `{ fiche }` (201), `{ ficheTechniqueUrl }`, `{ success: true }`, `{ fiches, legacyFicheUrl }`. Chemins publics existants (`/uploads/products/<id>/…`) conservés.

## Migration `apiRoute` — P1-5 Groupe 2 (2026-09-27)

Les **5 routes restantes** de `app/api/products/**` passent désormais par le wrapper `lib/api-route.ts` (`apiRoute.get/post/put/delete`). Elles étaient les **seules** du dossier à réimplémenter `getSessionFromRequest` + `checkPermission` ; les 9 autres routes produits (`fiche-technique`, `fiches`, `photo`, `stock-movements`, `suppliers/**`, `next-code`) étaient déjà wrappées et n'ont **pas** été touchées. Plus aucune route du dossier ne réimplémente la session/la permission : le wrapper gère le 401 (session absente), la permission et le `catch` global → 500.

| Fichier (route) | Méthode → `permission` | Statuts / corps conservés |
| --- | --- | --- |
| `app/api/products/route.ts` | GET → `produits:voir` (ex-L15) ; POST → `produits:creer` (ex-L112) | 200 `{products, stats, categories}` ; **201** `{product}` (`NextResponse.json(..., {status:201})` explicite — le wrapper rendrait 200), **400** « Données invalides », **409** « Code produit déjà utilisé » (catch `P2002` conservé dans le handler), 500 (wrapper) |
| `app/api/products/[id]/route.ts` | GET → `produits:voir` (ex-L17) ; **PUT** → `produits:modifier` (ex-L73) ; DELETE → `produits:supprimer` (ex-L174) | 200 `{product}` / `{product}` / `{success:true}` ; **404** « Produit introuvable » ; **400** « Données invalides » ; **409** `P2002` (catch conservé) ; 500 (wrapper, y compris `P2025` du `delete`) |
| `app/api/products/[id]/stats/route.ts` | GET → `produits:voir` (ex-L12) | 200 `{stats, ventesMensuelles}` ; **404** « Produit introuvable » |
| `app/api/products/[id]/variants/route.ts` | GET → `produits:voir` (ex-L33) ; **PUT** → `produits:modifier` (ex-L61) | 200 `{variants}` (GET et PUT) ; **400** « Données invalides » |
| `app/api/products/[id]/fiches/[ficheId]/route.ts` | DELETE → `produits:modifier` (ex-L14) | 200 `{success:true}` ; **404** « Fiche introuvable » ; `unlink()` du fichier **conservé dans le handler** (best-effort, `catch` silencieux inchangé) |

Décisions :

- **`requireCompany` NON activé** sur les 5 routes (`grep -rn "companyId" app/api/products` → **0**) : le modèle `Product` est volontairement **global** (voir `docs/wiki/audit-scope-multi-societe.md`) — ne **pas** copier le `requireCompany: true` de la référence `app/api/effets/[id]/route.ts`, qui est faux pour les produits. Les routes `stock-movements` qui portaient déjà `requireCompany: false` explicitement sont inchangées.
- **PUT conservé** (contrairement au Groupe 1 `clients` qui n'a que PATCH) : il est **réellement consommé** côté client — `hooks/use-produits.ts` L118 `PUT /api/products/${id}` et `hooks/use-product-variants.ts` L24 `PUT .../variants` ; `hooks/use-product-stats.ts` L27 consomme le GET `/stats`.
- **`try/catch` locaux** : conservés uniquement là où ils portent une logique métier — `P2002` → 409 (POST `/products`, PUT `/products/[id]`) et `unlink()` best-effort (`fiches/[ficheId]`) ; supprimés partout où ils ne faisaient que le 500 générique « Erreur serveur », désormais couvert + journalisé (tag = permission) par le wrapper. `DELETE /products/[id]` ne porte aucun try/catch : `P2025` part au 500 du wrapper, comportement inchangé.
- Aucun `any` / `@ts-ignore` ajouté ; `params` est fourni typé `Record<string, string>` par le wrapper ; imports morts (`getSessionFromRequest`, `checkPermission`, `NextRequest`, destructuration `session` / `id` inutilisée) supprimés ; aucune route API ajoutée hors du wrapper.

## Migration `apiRoute` — P1-5 Groupe 3 (2026-09-27)

Les **4 routes / 8 handlers** de `app/api/categories/**` et `app/api/marques/**` passent désormais par le wrapper `lib/api-route.ts` (`apiRoute.get/post/put/delete`). Auparavant, les 8 handlers réimplémentaient `getSessionFromRequest` + `checkPermission` — sauf les **2 GET collection**, qui étaient **totalement non authentifiés** (`export async function GET()` sans `request`, sans session, sans permission). Le wrapper gère désormais le 401 (session absente), la permission et le `catch` global → 500.

| Fichier (route) | Méthode → `permission` | Statuts / corps conservés |
| --- | --- | --- |
| `app/api/categories/route.ts` | **GET → `produits:voir` (NOUVEAU — Option A)** ; POST → `produits:creer` (ex-L31) | 200 `{categories}` ; **201** `{categorie}` (`NextResponse.json(..., {status:201})` explicite — le wrapper rendrait 200), **400** « Données invalides » |
| `app/api/categories/[id]/route.ts` | PUT → `produits:modifier` (ex-L18) ; DELETE → `produits:supprimer` (ex-L40) | 200 `{categorie}` / `{success:true}` ; **400** « Données invalides » ; 500 (wrapper, y compris erreur Prisma du `delete`) |
| `app/api/marques/route.ts` | **GET → `produits:voir` (NOUVEAU — Option A)** ; POST → `produits:creer` (ex-L30) | 200 `{marques}` ; **201** `{marque}`, **400** « Données invalides » |
| `app/api/marques/[id]/route.ts` | PUT → `produits:modifier` (ex-L17) ; DELETE → `produits:supprimer` (ex-L39) | 200 `{marque}` (PUT, **sans** `serializeDecimals`, identique à l'origine) / `{success:true}` ; **400** « Données invalides » ; 500 (wrapper) |

**Décision Option A — les 2 GET rendus authentifiés (avant/après voulu et tracé) :**

- **Avant** : `GET /api/categories` (ex-L14) et `GET /api/marques` (ex-L13) renvoyaient **`200` à n'importe quel client anonyme** (aucune session vérifiée). Le wrapper exige **toujours** une session : les laisser tels quels était impossible.
- **Après** : les 2 GET sont wrappés avec `permission: "produits:voir"` → **`401` si anonyme**, **`403` sans `produits:voir`**, `200` sinon. Ce changement de comportement est **voulu** et décision **validée par l'utilisateur le 2026-09-27**.
- **Justification vérifiée avant décision** : seuls consommateurs = `components/produits/category-tree-select.tsx` et `components/produits/marque-select.tsx`, utilisés uniquement par `nouveau-produit-dialog.tsx`, `produit-edit-dialog.tsx`, `produit-form-page.tsx` — tous sous `app/(app)/layout.tsx` qui fait `redirect("/login")` sans session → **aucun consommateur anonyme** ; convention du projet : `app/api/carton-types/route.ts` (donnée de référence équivalente) wrappe déjà son GET avec `packing:voir`.
- Un commentaire en tête des 2 GET (`// Lecture gateée par produits:voir depuis le 2026-09-27 (Option A, …) — était publique avant.`) rend l'écart traçable **dans le code**.

**Décisions :**

- **`requireCompany` NON activé** sur les 4 routes (`grep -rn "companyId" app/api/categories app/api/marques` → **0**) : `Categorie` et `Marque` sont **volontairement globales** — `docs/wiki/audit-scope-multi-societe.md` § « Routes API Catégories/Marques » confirme : `findMany`/`create`/`update`/`delete` **sans** filtre `companyId`, verdict « ✅ Correct (global) ». Aucun `companyId` ni `requireCompany: true` ajouté.
- **Méthodes strictement identiques** : `GET`/`POST` sur les collections, **`PUT`/`DELETE`** sur `[id]` (pas de `PUT` → `PATCH`) — `PUT` est réellement consommé via `useCategorieMutations` / `useMarqueMutations` ; `hooks/use-categories.ts` (GET L35, POST L53, DELETE L69) et `hooks/use-marques.ts` (GET L23, POST L35, DELETE L51) inchangés.
- **`try/catch` supprimés** là où ils ne faisaient que `console.error` + 500 générique « Erreur serveur » (couverts + journalisés par le wrapper). **Aucun `catch` portait une logique métier** dans ce périmètre (vérifié : **0 occurrence de `P2002`** sur les 4 fichiers). Un `DELETE` échouant (erreur Prisma) partait déjà au 500 : **comportement inchangé**, rien n'a été « corrigé ».
- Aucun `any` / `@ts-ignore` ajouté ; `params` est fourni typé `Record<string, string>` par le wrapper ; imports morts (`getSessionFromRequest`, `checkPermission`, `NextRequest`, destructuration `session`) supprimés.

## Migration `apiRoute` — P1-5 Groupe 4 : stock-mouvements (2026-09-27)

La route `app/api/stock-mouvements/route.ts` (1 handler `GET`) passe par le wrapper avec la config **`{}` (session seule)**. L'ex-L9 ne faisait que `getSessionFromRequest` + 401 — **aucune `checkPermission`** → **aucune permission ajoutée** (y ajouter `stocks_mouvements:voir` aurait été une régression 403 pour les rôles sans cette clé). 401/`catch` → 500 désormais centralisés par le wrapper ; le `try/catch` supprimé ne faisait que `console.error("[stock-mouvements/GET]")` + 500 « Erreur serveur ».

| Méthode → config wrapper | Statuts / corps conservés |
| --- | --- |
| GET → `{}` (ex-L9) | 200 `{ mouvements, stats }` (via `NextResponse.json` + `serializeDecimals`, corps strictement identique) |

- **`requireCompany` NON activé (décision)** : `StockMovement` est **global** — `docs/wiki/audit-scope-multi-societe.md` L140 (« `app/api/stock-mouvements/route.ts` … Filtre `companyId` : **NON — mouvements globaux** / verdict ✅ Correct (global) ») et la requête `findMany`/`groupBy` n'applique **aucun** filtre `companyId`. `grep -rn "requireCompany\|companyId" app/api/stock-mouvements/route.ts` → **0**.
- **Méthode strictement identique** : `GET` seul, consommé par `hooks/use-stock-mouvements.ts` L43 (`fetch(\`/api/stock-mouvements?${params}\`)`) — inchangé.
- **Nuance du `catch` du wrapper (signalée, non « corrigée »)** : il renvoie `errorResponse(error.message)` (message réel) et taggue `[api]` au lieu de `[stock-mouvements/GET]` — comportement déjà en production sur les routes migrées.

## Hors périmètre — à décider

Les **server actions** `app/actions/upload.ts`, `app/actions/companies.ts` et `app/actions/products.ts` n'ont **pas** été modifiées (périmètre de la passe = routes API uniquement). `uploadFile` reste sans limite de taille et accepte un `subDir` client (traversal possible). Détail dans `docs/wiki/dashboard-rapports.md` (rubrique « Hors périmètre — à décider »).

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-produits.ts` : effet debounce 300 ms `searchInput → setSearchQuery` (ex-L195) **supprimé** ; `useProduitsSearchDebounce()` vidé (**0 appelant** → candidat à suppression) ; imports `useEffect`/`useRef` purgés. **`useProduitsList` n'a PAS été migrée** (écart délibéré, voir ci-dessous) : elle lit toujours `produits-store.searchQuery`.
- **Raison du non-migrage** : (1) `produits-store.searchQuery` n'a **aucun writer** (`useProduitsSearchDebounce` = 0 appelant) → le `search` serveur produits est **dormant**, le relier à `useDeferredValue` **réactiverait** la recherche serveur (réactivation interdite par la clause « 0 changement de comportement ») ; (2) `GET /api/products` calcule ses **`stats` sur le jeu filtré** → les 4 KPI `StatCards` de `components/produits/produits-client.tsx` changeraient en tapant dans la recherche.
- **Dette documentée (patch proposé, non appliqué)** : brancher `searchInput` + `useDeferredValue(searchInput)` dans `useProduitsList` (3 lignes, pattern Lot 1) **après** décision produit sur les stats agrégées (exiger `stats` hors filtre côté API).

## P2-7 Lot 7 — SKU auto produit (2026-09-28)

- `components/produits/produit-form-page.tsx` ex-L154 : effet `if (nextCode?.code && !isEdit) form.setValue("code", …)` **supprimé** → **affichage dérivé** `codeValue = !isEdit && nextCode?.code ? nextCode.code : watched.code` (Input `{...form.register("code")}` + `value={isEdit ? undefined : codeValue}`, `readOnly` inchangé ; `qrPreviewData` suit `codeValue`) + `placeholderData: (prev) => prev` sur la query next-code (≡ l'effet : valeur conservée pendant le re-fetch) + **lecture au submit** via `handleFormSubmit` (`setValue` avant `form.handleSubmit(onSubmit)`). Route « `setValue` au rendu » écartée : `reset()` RHF réécrirait les champs édités (`_reset(keepFieldsRef)` sans `keepDirtyValues`, source vérifiée) ; `productSchema.code` min 1 (`lib/schemas.ts:63`) garanti par la lecture au submit. Import `useEffect` purgé, `type FormEvent` ajouté. Détail complet : entrée CHANGELOG `[2026-09-28] Frontend (p2-7-lot7-divers/P2-7)`.

## P2-8 — hooks inline formulaire Produit (2026-09-30)

Extraction des **5 sites `useQuery`/`fetch()` inline** de `components/produits/produit-form-page.tsx` vers `hooks/` (audit `AUDIT-FACTURAPRO.md` §6, `P2-8`). **0 ligne de JSX modifiée**, 0 changement visuel.

| Site (AVANT) | Endpoint / clé | Extrait (APRÈS) |
| --- | --- | --- |
| query `["product-next-code", deferredNom]` (`enabled: !isEdit && !!deferredNom`, `placeholderData`, `if (!res.ok) throw new Error("Erreur")`) | `GET /api/products/next-code?nom=…` | `useProduitNextCode(deferredNom, !isEdit && !!deferredNom)` (`hooks/use-produits.ts:189`) |
| `handlePhotoSelect` (`fetch` + toast « Erreur upload photo ») | `POST /api/products/[id]/photos` (FormData) | `useProduitFichiersMutations().uploadPhoto` (`hooks/use-produits.ts:206`) |
| `handleFicheSelect` (toast « Erreur upload fiche ») | `POST /api/products/[id]/fiches` (FormData) | `.uploadFiche` |
| `handlePhotoRemove` (toast « Erreur suppression photo », pas de throw) | `DELETE /api/products/[id]/photos?nom=…` | `.deletePhoto` (renvoie `null` sans throw si `!res.ok`, comportement conservé) |
| `onSubmit` création/édition : `PUT /api/products/[id]/variants` **sans invalidation** | `PUT /api/products/[id]/variants` | `useSyncProductVariants()` (`hooks/use-product-variants.ts:18`) — signature **sans paramètre**, `mutateAsync({ productId, variants })` |

- **Dépendance `productId` déplacée dans les variables de la mutation** (la version d'avant prenait `productId` en argument d'hook → appel conditionnel au rendu, hors-règles) ; `onSuccess(_data, { productId })` reprend le même argument.
- **`refetchCode` (ex-`refetchCode`, variable inutilisée) supprimé** avec la déstructuration `const { data: nextCode, refetch: refetchCode }` → **−1 warning lint** (`no-unused-vars`), baseline passée de 418 à 417 problems (0 erreur nouvelle).
- **Écart assumé (non observable)** : le PUT des variantes gagne en mode création les invalidations `["product-variants", productId]` + `["product", productId]` (l'inline ne faisait qu'attendre la réponse), `["products"]` étant déjà invalidé par `createProduct.onSettled` juste avant — le composant enchaîne immédiatement `router.push` et **aucune de ces 2 clés n'est en cache à ce stade**.
- **Toasts/messages conservés littéralement** (`"Erreur upload photo"`, `"Erreur upload fiche"`, `"Erreur suppression photo"` ; les 3 fichiers utilisent `toast.error(err.message)` préservé tel quel).
- Détail complet, écarts assumés et vérifications : entrée CHANGELOG `[2026-09-30] Frontend (p2-8-hooks-inline/P2-8)`.

## Notifications — migration socle `notify` (lot F.3a, 2026-10-18)

Les 6 fichiers `components/produits/` + `hooks/use-product-photo-upload.ts` +
`hooks/use-product-fiche-technique.ts` + `hooks/use-upload.ts` important `sonner` ont été migrés
vers `notify.*` avec messages enrichis (header verbe+objet nommant le produit — « Produit « X »
modifié », « Catégorie « X » créée » ; erreurs via `notify.error({ title, error: unknown,
context })` ; gardes de saisie — prix de vente = prix d'achat, fournisseur déjà associé — en
`notify.warning`) ; les `router.push` de succès du formulaire produit sont conservés tels quels
(aucune action de toast dupliquant la navigation). Conventions : `docs/wiki/notifications.md` §7 ;
entrée CHANGELOG `[2026-10-18] Frontend (lot-f3a-sonner-migration/F)`.

## Notes

- Les quantités sont en `Decimal(19,3)`, les prix en `Decimal(19,4)`.
- **Valorisation stock** : `GET /api/inventaire` calcule la valeur du stock en incluant les variantes actives (`v.prixHT ?? p.prixHT` pour fallback). Les top produits et catégories incluent le stock combiné parent + variantes. Corrigé le 2026-09-06.
- **Sécurité multi-tenant** : Toutes les routes API de `designs-personnalises/[id]` filtrent par `companyId` pour isoler les données entre sociétés. Vérifié le 2026-09-06.
## Lot F.4 — catch vides produits traités (2026-10-18)

- `produit-form-page.tsx` `handlePhotoRemove` : catch vide → `notify.error({ title: "Suppression de la photo impossible", error, context })` (action explicite de l'utilisateur ; le catch n'était atteint que si `handleApiResponse` throw malgré `res.ok`).
- `produit-variants-section.tsx` `handlePhotoUpload` : catch vide **déjà notifié en amont** par le hook `useFileUpload` (`onError: notify.error`) — commentaire « // silent » inexact remplacé par la justification réelle (aucun double toast).
- Détail complet : `docs/wiki/notifications.md` §9 + entrée CHANGELOG `[2026-10-18] Frontend (lot-f4-alert-confirm-catch/F)`.

## Lot E2b — validation Zod du POST mouvement de stock (groupe financier, 2026-10-23)

- `POST /api/products/[id]/stock-movements` : `schema: stockMovementCreateSchema` — `type` borné à l'enum `MouvementType`, `quantite` en `z.coerce.number().positive()` (le composant `adjust-stock-dialog.tsx` l'envoie en **nombre**, pas en string). Les 400 « Type de mouvement invalide » / « Quantité doit être positive » sont retirés (redondants). `referenceType` reste **figé** sur « INVENTAIRE » côté handler et non déclaré dans le schéma → non injectable (anti mass-assignment).
- Correction de libellé : c'est un **POST** (création), pas un PATCH comme l'indiquait le prompt E2.

## Lot H vague W3 — état serveur des 5 composants fournisseurs/fiches/étiquettes vers `hooks/` (2026-10-24)

Migration **ZÉRO changement visuel / ZÉRO changement de contrat API** : seuls `fetch()` inline,
`useQuery`/`useMutation`/`useQueries` inline ont été déplacés vers `hooks/` ; payloads, URLs,
messages d'erreur, clés de cache et invalidations sont strictement identiques (shapes reproduites
à l'identique via le registre `lib/query-keys.ts` posé par W0).

| Composant (AVANT) | Extrait (APRÈS) |
| --- | --- |
| `product-suppliers-section.tsx` : 3 `useQuery` inline (`["product-suppliers", productId]` → `GET /api/products/[id]/suppliers`, `["suppliers-list"]` → `GET /api/fournisseurs`) + 3 `useMutation` inline (POST/DELETE/PUT `…/suppliers`) | `useProductSuppliers`, `useSupplierOptions`, `useAddProductSupplier`, `useDeleteProductSupplier`, `useSetDefaultProductSupplier` (`hooks/use-product-suppliers.ts`, nouveau) |
| `product-supplier-price-history.tsx` : `useQuery` inline `["price-history", productId, supplierId]` | `useSupplierPriceHistory` (même fichier, `enabled: !!productId && !!supplierId` conservé) |
| `product-supplier-comparison.tsx` : `useQuery` inline `["supplier-comparison", productId]` | `useSupplierComparison` (même fichier, `error` restitué identiquement) |
| `product-fiches-list.tsx` : `useQuery` inline `["product", "fiches", productId]` | `useProductFiches` (ajouté à `hooks/use-product-fiche-technique.ts`, déjà importé par le composant pour `deleteFiche` → REUSE FIRST) |
| `etiquettes-produits-dialog.tsx` : `useQueries` inline par produit sélectionné (`["product-variants", id]`, 20 lignes) | `useProductVariantsList(selectedIds)` (ajouté à `hooks/use-product-variants.ts`, rend la `Map` déjà construite) |

**Décisions notables :**

- **Toasts : aucun ajout** — ces mutations n'avaient aucun toast avant ; en ajouter serait un
  changement visuel (interdit par le mandat). Le side-effect UI (reset du dialog d'ajout) reste
  **côté composant** via `mutate(vars, { onSuccess })` (convention `docs/wiki/query-keys.md` §3) ;
  l'invalidation de cache reste **dans le hook** (données).
- **Clés de cache inchangées** : `queryKeys.produits.{suppliers,suppliersList,priceHistory,supplierComparison,fiches,variants,listForLabels,detail,all}()` reproduisent à l'identique les arrays historiques → aucun refetch ni re-ciblage d'invalidation.
- **`useQueries` du dialog étiquettes sans `enabled` ajouté** (comportement d'appel préservé tel quel, y compris pendant dialogue fermé s'il reste des IDs sélectionnés).
- **Réutilisation sans doublon** : `useFournisseursList`/`useFournisseurs` existants (`["fournisseurs", search]`) n'ont **pas** été détournés — le composant consomme la racine distincte `["suppliers-list"]` historique (double racine documentée dans le registre), donc un hook dédié.
- `grep -rn "fetch(" components/produits` → **vide** ; `grep -rn "useQuery(\|useMutation(" components/produits` → **vide** ; idem `useQueries(`.
- Détail complet et sorties de vérification : entrée CHANGELOG `[2026-10-24] Frontend (lot-h3-produits/H)`.
