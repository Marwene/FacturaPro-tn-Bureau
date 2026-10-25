# Module : Paramètres & société

## Fonctionnalités

- **Entreprises (multi-tenant)** : fiche société, fiscalité (TVA/FODEC par défaut), devises, préfixes de numérotation (FAC/DEV/BL/BC/ACH/…), année dans les numéros, logo, comptes bancaires, types de cartons associés.
- **Paramètres applicatifs** : alertes stock (seuil jours), clés d'IA (OpenAI, Gemini, Mistral, OpenRouter) — conservées côté serveur, jamais exposées. Statut des clés API (source: env var ou DB) affiché avec badge visuel, champs désactivés si configurés via env var.
- **Colisage** : gestion des types de cartons sur une page dédiée (`/parametres/app/colisage`) — CRUD via `DataTable` (recherche, colonnes visibles, pagination) et `Dialog`/`AlertDialog`, avec dimensions (L × l × h) optionnelles.
- **Rôles & permissions** : rattachement des utilisateurs aux entreprises (`user_companies`).

## Modèles de données (Prisma)

- `Company`, `AppSettings`, `CompanyBankAccount`, `CartonType`, `UserCompany`.

## Fichiers clés

- `app/api/companies/`, `app/api/settings/`, `app/api/company-bank-accounts/`
- `app/api/settings/app/status/route.ts` — endpoint statut des clés API (source: env ou DB)
- `app/api/carton-types/` — paramétrage colisage
- `app/(app)/parametres/`, `app/(app)/entreprises/` — pages UI (Server Components, client logic dans `components/entreprises/entreprises-list-client.tsx`)
- `components/parametres/carton-types-manager.tsx`
- `hooks/use-settings.ts` — requêtes/mutations paramètres (typé avec `SerializedSettings`)
- `hooks/use-carton-types.ts` — requêtes/mutations React Query ciblées entreprise

## Migration `apiRoute` — P1-5 Groupe 4 : entreprises (2026-09-27)

Les **2 routes / 5 handlers** de `app/api/companies/**` passent désormais par le wrapper `lib/api-route.ts` (`apiRoute.get/post/patch/delete`). Auparavant, les 5 handlers réimplémentaient `getSessionFromRequest` + `checkPermission` (GET collection, GET/PATCH/DELETE `[id]`) ou `getSessionFromRequest` + check de rôle (POST). Le 401, les permissions et le `catch` → 500 sont désormais centralisés par le wrapper. **Strictement conservateur : ces routes authentifiaient déjà — aucun écart de comportement.**

| Fichier (route) | Méthode → config wrapper | Statuts / corps conservés |
| --- | --- | --- |
| `app/api/companies/route.ts` | GET → `{ permission: "parametres:voir" }` (ex-L13) | 200 `{ companies }` (`NextResponse.json` + `serializeDecimals`) |
| `app/api/companies/route.ts` | POST → `{}` + **check rôle ADMIN conservé dans le handler** (ex-L55) | **201** `{ company }` via `NextResponse.json(..., { status: 201 })` explicite (sinon le wrapper rendrait 200), **403** « Action réservée aux administrateurs », **400** « Le nom est requis » (corps brut `{ error }`, **sans** `success: false`) |
| `app/api/companies/[id]/route.ts` | GET → `{ permission: "parametres:voir" }` (ex-L16) | 200 `{ company }` ; **404** « Entreprise introuvable » |
| `app/api/companies/[id]/route.ts` | PATCH → `{ permission: "parametres:modifier" }` (ex-L49) | 200 `{ company }` |
| `app/api/companies/[id]/route.ts` | DELETE → `{ permission: "parametres:modifier" }` (ex-L98) | 200 `{ success: true }` ; **400** `Impossible de supprimer cette entreprise : …` (construction `blockers[]` **conservée dans le handler**) |

> ⚠️ **Encadré — check rôle ADMIN maintenu dans le handler (POST `/api/companies`)** : le `RouteConfig` du wrapper (`lib/api-route.ts`) n'expose que `permission` et `requireCompany` — **il n'existe PAS d'option `role`**, et aucune n'a été inventée. Le contrôle d'origine `if (sessionUser.role !== "ADMIN") → 403 « Action réservée aux administrateurs »` (ex-L55) reste donc **à l'intérieur du handler**, avec `sessionUser` renommé `session` (contexte fourni par le wrapper, `session.id` utilisé pour le `userCompany.create`). **Aucune permission n'a été ajoutée au POST** (il n'y en avait aucune avant, il n'y en a aucune après).

> ⚠️ **Encadré — `requireCompany` NON activé sur `app/api/companies/**` (décision assumée)** : ce sont des routes **cross-company d'administration** — le GET liste **toutes** les sociétés (`prisma.company.findMany` sans filtre) et le PATCH/DELETE s'appliquent à **n'importe laquelle** via l'`id` de route. `resolveCompanyId()` renverrait la company du user (la liste ne montrerait plus qu'une société) ou échouerait → **régression garantie** si `requireCompany: true` était activé. `grep -rn "requireCompany" app/api/companies` → **0** ; les 23 occurrences de `companyId` restantes sont **toutes préexistantes** et non liées au wrapper (SQL brut du GET, `userCompany.create` du POST, 20 counts `where: { companyId: id }` du DELETE).

- **Méthodes strictement identiques** : `GET`/`POST` (collection), **`PATCH`** (pas de transformation) et `DELETE` sur `[id]` — consommés par `hooks/use-companies.ts` (POST L10), `hooks/use-users.ts` (GET L14), `components/entreprises/entreprise-detail-client.tsx` (GET L30, PATCH L42, DELETE L60), `components/parametres/facturation-settings-client.tsx` (GET L22, PATCH L31), `app/actions/bons-commande.ts` (GET L199).
- Les 5 `try/catch` supprimés ne faisaient que `console.error` + 500 générique « Erreur serveur » (couverts par le wrapper).
- **Nuance du `catch` du wrapper (signalée, non « corrigée »)** : il renvoie `errorResponse(error.message)` (message réel) et taggue `[${permission ?? "api"}]` au lieu du tag fichier (`[companies/GET]`) — comportement **déjà en production** sur l'ensemble des routes migrées, hors périmètre de correction ici.

## Migration `apiRoute` — P1-5 Groupe 6 : `user/companies` (2026-09-28)

| Fichier | Handler | Config wrapper | Statuts / corps conservés |
| --- | --- | --- | --- |
| `app/api/user/companies/route.ts` | GET | `{}` (session seule à l'origine, ex-L8-11) | **404** « Utilisateur introuvable » ; **200** `{ companies, primaryCompanyId }` |

- **0 permission ajoutée, 0 retirée** : la route ne faisait que `getSessionFromRequest` + 401 → config `{}` (identique au traitement de `app/api/users/**` au Groupe 5).
- **`requireCompany` NON activé** : la route lit `user.companyId` / `user.userCompanies` **depuis la base** via `session.id` (jamais le `companyId` de contexte ni le query param) — résoudre la société via le wrapper serait inutile (`companyId = ""` jamais lu).
- **Logique préservée à l'identique** : `prisma.user.findUnique` (404 si absent), concaténation `company` + `userCompanies`, **déduplication** par `id` (`filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)`) et réponse `{ companies, primaryCompanyId: user.companyId }`.
- `sessionUser` → `session` (`session.id` au `where`) ; request devenu inutile → paramètre `_request` non lu (comme `app/api/users/me/route.ts`) ; imports morts purgés (`getSessionFromRequest`, `NextRequest`).
- **Nuance du `catch` du wrapper (signalée, non corrigée)** : tag `[api]` au lieu de `[user/companies/GET]`, et `errorResponse(error.message)` (message réel) au lieu du 500 générique « Erreur serveur » (statut 500 inchangé ; le **404 utilise déjà `errorResponse()`** → corps identique).
- **Méthode strictement identique** : **GET**. **Consommateurs inchangés** : `hooks/use-user-companies.ts:16` (TanStack Query) → `components/layout/company-switcher.tsx:43` (switcheur de société) et `hooks/use-active-company.ts:11`. Le 404 et les échecs (`throw new Error("Failed")` sur `!res.ok`) sont traités indifféremment du corps.

## P2-8 — hooks inline Entreprises (2026-09-30)

Extraction des **3 sites `useQuery`/`useMutation` inline** de `components/entreprises/entreprise-detail-client.tsx` vers des hooks (audit `AUDIT-FACTURAPRO.md` §6, `P2-8`). **0 ligne de JSX modifiée**, 0 changement visuel.

| Site (AVANT) | Endpoint / clé | Extrait (APRÈS) |
| --- | --- | --- |
| query `["company", companyId]` → `res.json()` non typé (`const company = data?.company`) | `GET /api/companies/[id]` | `useCompany(companyId)` (`hooks/use-company-query.ts:37`, type `CompanyDetail` ajouté) |
| mutation `PATCH /api/companies/[id]` (FormData → JSON, invalidations `["company", id]` + `["companies"]`, toasts « Société mise à jour » / « Erreur mise à jour ») | `PATCH /api/companies/[id]` | `useUpdateCompany(companyId)` (`hooks/use-companies.ts:34`) |
| mutation `DELETE /api/companies/[id]` (invalidation `["companies"]`, toast, `router.push("/parametres/entreprises")`, message `err.error` brut) | `DELETE /api/companies/[id]` | `useDeleteCompany(companyId)` (`hooks/use-companies.ts:59`) |

- **Réutilisation, pas de duplication** : la lecture réutilise `useCompany` (clé `["company", id]` déjà détenue par ce hook) ; `hooks/use-company-query.ts` reçoit le type `CompanyDetail` / `CompanyDetailResponse` + `handleApiResponse` (au lieu d'un `res.json()` `any`), et `hooks/use-companies.ts` complète `useCreateCompany` par les 2 mutations. **Aucun `hooks/use-entreprises.ts` créé** — il aurait dupliqué la définition de la clé `["company", id]` (consigne « RÉUTILISER sans dupliquer »).
- `router` / `qc` / imports `useRouter` + `useQuery`/`useMutation`/`useQueryClient`/`toast` supprimés du composant (ils n'existaient plus que pour ces 3 sites).
- **`data!.company` (L39)** : `data` étant désormais typé, l'expression d'origine `data?.company` devenait `CompanyDetail | undefined` alors que le composant déréférençait `company` sans garde depuis toujours → assertion ajoutée **hors JSX**, comportement runtime inchangé (crash identique si le GET échoue). L'alternative `data?.company!` a été rejetée par lint (`no-non-null-asserted-optional-chain`).
- **Bug préexistant signalé au P2-8, CORRIGÉ au lot H (2026-10-24)** : le JSX lisait `company._count.utilisateurs` alors que `GET /api/companies/[id]` renvoie `_count: {invoices, users, userCompanies}` → le compteur « N utilisateurs » s'affichait **vide**. Corrigé en `company._count.users` (même relation que la colonne « Utilisateurs » de la liste `entreprises-list-client`), champ `_count.utilisateurs?` retiré de `CompanyDetail`. **Donnée affichée qui change** : « 12 factures ·  utilisateurs » → « 12 factures · 3 utilisateurs » (valeur réelle, aucune API modifiée).
- Détail complet, écarts assumés et vérifications : entrée CHANGELOG `[2026-09-30] Frontend (p2-8-hooks-inline/P2-8)`.

## Mot de passe — `useChangePassword()` (2026-10-01)

Migration du `fetch()` brut de `components/parametres/securite-settings-client.tsx` vers TanStack Query (audit `AUDIT-FACTURAPRO.md` §6, `P2-9`).

- **Export** : `useChangePassword()` depuis **`hooks/use-users-mutations.ts`** (export indépendant — 0 `useQueryClient`, 0 `useUsersStore`, 0 invalidation de clés).
- **Endpoint** : `PATCH /api/users/me/password`.
- **Erreur** : classe **`ChangePasswordError`** — `message` et `description` portent le message serveur, lu via le helper `readApiErrorMessage(body: unknown)` (champ `error` absent ou non-string → `undefined`).
- **Côté composant** : `isSaving` → **`isPending`**, reset du formulaire via **`useRef`** (0 `useEffect`), toasts et libellés **strictement identiques** et toujours affichés par `securite-settings-client.tsx`.
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-01] Frontend (p2-9-useMutation/P2-9)`.

## P2-12 — types de carton sur `ConfirmDeleteDialog` (2026-10-02)

- La confirmation de suppression de `components/parametres/carton-types-manager.tsx` migre du `AlertDialog` artisanal vers **`components/confirm-delete-dialog.tsx`** (audit `AUDIT-FACTURAPRO.md` §6, lot `P2-12`).
- **Parité** : `title="Supprimer le type de carton ?"`, description identique (`&quot;` JSX → `"` littéral + `${deleteTarget?.nom ?? ""}`), `onConfirm={handleDelete}` et `onOpenChange` inchangés, `isLoading={remove.isPending}` remplace le ternaire inline `remove.isPending ? "Suppression..." : "Supprimer"`.
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-02] Frontend (p2-12-confirm-delete/P2-12)`.

## P2-13 — wrapper de toast + consolidation erreurs API (2026-10-08)

- `hooks/use-users-mutations.ts` : import `toast` → **`@/lib/toast`** (8 appels, arguments inchangés) ; **`readApiErrorMessage` et `ChangePasswordError` déplacées dans `lib/api-error.ts`** (source unique, byte-identiques, contrats distincts de `handleApiResponse` préservés) avec **`export { ChangePasswordError }`** re-exporté depuis le hook → `securite-settings-client.tsx` conserve son import existant et compile sans changement (`npx tsc --noEmit` → 0).
- `components/parametres/securite-settings-client.tsx` : import `toast` → `@/lib/toast` (3 appels : `Erreur` / `Succès` / `Erreur` + `instanceof ChangePasswordError`, tous strictement identiques).
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-08] Frontend (p2-13-toast-wrapper/P2-13)`.

## Notifications — migration socle `notify` (lot F.3a, 2026-10-18)

Les 6 fichiers `components/parametres/` + `hooks/use-companies.ts` + `hooks/use-notifications.ts`
important `sonner` ont été migrés vers `notify.*` avec messages enrichis (header verbe+objet
nommant l'objet quand il existe — « Type de carton « X » créé », « Code NGP « X » supprimé » ;
erreurs via `notify.error({ title, error: unknown, context })`, `retry` sur les **modifications**
settings/carton/NGP — payload re-muté en portée, jamais sur les créations) ; gardes de saisie
valides en `notify.warning`. Dette signalée sans y remédier (hors lot) : `general-settings-client`
et `facturation-settings-client` lancent toujours `new Error("Failed")` en `mutationFn` →
description d'erreur « Failed » jusqu'à leur bascule `apiFetch` (F.3). Conventions :
`docs/wiki/notifications.md` §7 ; entrée CHANGELOG `[2026-10-18] Frontend (lot-f3a-sonner-migration/F)`.

## Notes

- `Company.cartonTypeIds` liste les IDs de types de cartons associés à l'entreprise.
- Les clés API stockées dans `AppSettings` ne doivent jamais apparaître dans les réponses API ou le wiki.
- GET et PUT `/api/settings/app` masquent **toutes** les colonnes de clés (4/4, `openrouterApiKey` comprise — fuite corrigée au lot E3), format `••••••••abcd` (4 derniers caractères seulement). Les valeurs masquées reçues en PUT sont **ignorées** (jamais réécrites — garde-fou `••••`) et les clés sont chiffrées AES-256-GCM au repos (`APP_KEYS_ENCRYPTION_KEY`, cf. section E3). Le wrapper `apiRoute` gère l'auth/permissions (`parametres:voir` / `parametres:modifier`) **et** la validation Zod (`appSettingsUpdateSchema`).
- GET `/api/settings/app/status` retourne le statut de chaque clé API (source: env var ou DB) via `getApiKeyStatus()` de `lib/api-keys.ts`. Utilisé pour afficher des badges visuels et désactiver les champs configurés via env var.
## Lot F.4 — confirm() natifs → ConfirmDialog, settings utilisateurs & NGP (2026-10-18)

- `ngp-settings-client.tsx` : le `if (confirm("Supprimer ce code NGP ?"))` dans la colonne actions devient un `<ConfirmDialog>` piloté par l'état `deletingCode` (ligne cible) — `onConfirm` = même `deleteNgp.mutate(id, { onSuccess, onError })`, `isLoading={deleteNgp.isPending}`, titre = texte exact de l'ancien `confirm`.
- `utilisateurs-settings-client.tsx` : le `if (confirm(\`Supprimer ${user.name} ? Cette action est irréversible.\`))` devient un `<ConfirmDialog>` piloté par l'état `deletingUser` — titre + description conservent **mot pour mot** l'ancien `confirm` ; `onConfirm` = même `mutations.remove.mutate(id)` (le hook `useUsersMutations.remove` notifie déjà succès/erreur), `isLoading={mutations.remove.isPending}`.
- Aucun changement de mutation ni de store (`users-store` inchangé).
- Détail complet : `docs/wiki/notifications.md` §9 + entrée CHANGELOG `[2026-10-18] Frontend (lot-f4-alert-confirm-catch/F)`.

## Lot E2a — migration body → `schema` (Annexe A, identité/paramètres/catalogue) (2026-10-22)

La lecture du body de **POST `/api/companies`**, **PATCH `/api/companies/[id]`**, **PUT `/api/settings`** et **POST/PATCH `/api/ngp-codes`** (+`[id]`) passe par le champ `schema` de la config `apiRoute` : le wrapper parse avant le handler (échec → **422** `{ error: "Données invalides", issues, success: false }`) et **STRIPe les clés inconnues** (correction mass-assignment S-7 — ex. impossible d'injecter un champ hors liste dans `prisma.company.update`). `await request.json()` supprimé de ces 5 handlers.

- **Schémas** (nouveaux, dans `lib/schemas/` — `lib/schemas.ts` non modifié, `settingsSchema` client NON réutilisable car shape différent) :
  - `lib/schemas/company.ts` : `companyCreateSchema` (POST `/api/companies` — `name` requis, `type`/`devise` defaultnés), `companyUpdateSchema` (PATCH `[id]` — lecture exhaustive du handler dont `logo`, `actif`, `seuilSplitEffet`), `companySettingsUpdateSchema` (PUT `/api/settings` — sous-ensemble réellement lu ; `raisonSociale`/`alerte*` du formulaire client étaient déjà ignorés avant, désormais stripés au même effet net), `companySetupSchema` (voir `docs/wiki/auth.md`).
  - `lib/schemas/ngp-code.ts` : `ngpCodeCreateSchema` / `ngpCodeUpdateSchema` (`code` min 1, `barcode`/`description` nullish).
- **Non-régression taux** : `tauxTVADefaut`/`tauxFodecDefaut` sont des unions permissives `string | number | null` **sans coercion** — `z.coerce.number()` transformerait le `null` (JSON.stringify d'un `NaN` quand le champ est vidé dans `facturation-settings-client`) en `0` et casserait le fallback `?? existing`. `seuilSplitEffet` (Decimal Prisma) reste un pass-through `string | number` (le formulaire détail envoie la string brute d'un FormData).
- **PATCH `/api/ngp-codes/[id]`** : un `code` vidé dans l'inline-edit (`ngp-settings-client`) était **écrit en base** ; désormais 422.
- **GET** `companies`, `companies/[id]`, `settings`, `ngp-codes`, `ngp-codes/[id]` : inchangés (aucun body).
- Aucune permission ni garde modifiée ; `requireCompany` inchangé partout.
- Preuves + liste complète : entrée CHANGELOG `[2026-10-22] Backend (lot-e2a-schemas-identite/E)`.

## Lot E2c (6c) — formulaires branchés sur les schémas partagés (2026-10-23)

Suite du lot E2a : les formulaires consommateurs des routes migrées valident désormais avec **les mêmes schémas `lib/schemas/*` que le serveur** (source unique de règles). Aucun schéma n'a été modifié, aucun conteneur ni style n'a bougé.

| Formulaire | Schéma | Mécanisme | Règles avant → après |
|---|---|---|---|
| `create-company-dialog.tsx` | `companyCreateSchema` | `zodResolver` + `as Resolver<CompanyCreateInput>` (motif `parametres-client.tsx:23`) | `name` : `register(..., { required: true })` → retiré (couvert par `min(1)`) ; erreur affichée via **`FieldError`** (`ui/field.tsx`, `text-[11px]`) sous l'input |
| `entreprise-detail-client.tsx` | `companyUpdateSchema` | `safeParse(Object.fromEntries(FormData.entries()))` dans le handler ; **`updateMutation.mutate(formData)` inchangé** (le hook reconvertit FormData → JSON) | aucun retrait : `required` sur `name` **conservé** (le schéma déclare `name` optionnel = mise à jour partielle → l'UI reste volontairement plus stricte) ; échec safeParse → `notify.warning` |
| `ngp-settings-client.tsx` | `ngpCodeCreateSchema` / `ngpCodeUpdateSchema` | `safeParse` avant `createNgp.mutate` / `updateNgp.mutate` | **garde manuelle `if (!newCode.trim()) return;` (L64) remplacée** par le safeParse (échec → `notify.warning` « Code NGP requis » au lieu d'un retour silencieux) ; l'inline-edit vide est désormais **bloqué côté client** (le 422 serveur E2a reste le garde-fou) ; le `disabled={!newCode.trim()}` du bouton « Créer » est conservé (affordance, pas une règle) |

- **Payloads inchangés** sur saisie valide : create = mêmes clés (les valeurs optionnelles `"" || null` passent telles quelles), NGP = `{ id, code, description }` identiques (le safeParse ne trim que sur create, comme avant).
- `facturation-settings-client` et `parametres-client` **non touchés** : ils utilisent le `settingsSchema` client de `lib/schemas.ts` (shape différent, déjà tranché au lot E2a — voir encadré E2a ci-dessus).
- Preuves + tableau complet : entrée CHANGELOG `[2026-10-23] Frontend (lot-e2c-schema-partage-formulaires/E)` ; côté utilisateurs/profil/sécurité/`register`/onboarding : `docs/wiki/auth.md` § E2c.

## Lot E2f — correctifs QA (profil / sécurité / setup) (2026-10-23)

Revue `qa` du 2026-10-23 sur les formulaires d'E2c (détail complet : `docs/wiki/auth.md` § E2f) :

- **`profil-settings-client.tsx`** : le GET `["me"]` et le PATCH `/api/users/me` quittent le composant
  (`fetch` + `useState(isSaving)`) pour les hooks **`useProfilQuery`** (`hooks/use-users.ts`) et
  **`useUpdateProfil`** (`hooks/use-users-mutations.ts`) — état dérivé de `isPending`, invalidation
  `["me"]`, mêmes toasts et même `updateSession` ; **B1/B2** : plus aucun `fetch(` dans le composant.
- **`securite-settings-client.tsx`** : `minLength={6}` déplacé de `confirmPassword` vers `newPassword`
  (seul champ porteur de la règle `changePasswordSchema`), résidus justifiés par un commentaire
  `// justifié :` ; `useChangePassword` et le schéma **inchangés**.
- **`company-setup-form.tsx`** (onboarding société) : envoie désormais **`parsed.data`** (B1) via le
  nouveau hook **`useSetupCompany`** (`hooks/use-companies.ts`).
- **`create-user-dialog.tsx`** : cast `as unknown as Resolver<…>` **supprimé** au lot **E2g**
  (champ form UI `selectedCompanyIds` renommé `companyIds`, type dérivé `z.input<typeof createUserSchema>`)
  — voir `docs/wiki/auth.md` § E2g.
- Preuves : entrée CHANGELOG `[2026-10-23] Frontend (lot-e2f-correctifs-qa/E)`.

## Lot E3 — clés API : garde-fou `••••`, masquage exhaustif, Zod PUT, chiffrement AES-256-GCM + backfill (2026-10-23)

Audit §3 **S-5**, exigence 7 du Prompt E. Aucun `.tsx` touché, 0 migration, 0 dépendance installée.

### Fuites corrigées (mesurées avant/après par tests rouges → verts)

Le modèle `AppSettings` porte **4 colonnes `*ApiKey`** (`openaiApiKey`, `geminiApiKey`, `mistralApiKey`, `openrouterApiKey` — toutes dans `DB_KEY_MAP`), mais l'ancienne route n'en masquait que 3 :

| Endpoint | Défaut (avant) | Correction (après) |
|---|---|---|
| `GET /api/settings/app` | 3 colonnes masquées → **`openrouterApiKey` renvoyée en clair** | `maskAppSettingsKeys(settings)` : 4/4 masquées |
| `PUT /api/settings/app` | réponse `{ settings }` **non masquée** → les 4 colonnes en clair après chaque écriture | réponse `maskAppSettingsKeys(settings)` |
| `GET /api/settings/app/status` | vérifié : ne renvoie que `{ configured, source }` | inchangé (aucune valeur) |

Le masquage s'applique à la **valeur stockée** (chiffrée ou non) : aucun déchiffrement en GET → aucun risque de 500 si la clé d'env manque. Helpers `maskApiKey` / `maskAppSettingsKeys` dans `lib/api-keys.ts`, **pilotés par `DB_KEY_MAP`** (exhaustif par construction : une future colonne listée est masquée sans autre modification).

### Garde-fou `••••` (règle 1) + chiffrement à l'écriture

`preparerClePourStockage()` (`lib/api-keys-crypto.ts`) décide de l'écriture d'une clé reçue du PUT :

- valeur masquée `••••…` (renvoyée par GET, pré-remplie dans le formulaire) → `undefined` : **jamais réécrite**, la vraie clé n'est plus jamais écrasée ;
- `""` → `""` non chiffré (sinon un chiffrement de chaîne vide ferait passer la clé pour « configurée ») ; `null` → effacement explicite ; absent → colonne non touchée ;
- sinon → **chiffrement AES-256-GCM** si `APP_KEYS_ENCRYPTION_KEY` est posée, sinon repli en clair documenté.

### Chiffrement AES-256-GCM au repos (`lib/api-keys-crypto.ts`)

- Format stocké **auto-descriptif et détectable** : `enc:v1:<iv_b64>:<tag_b64>:<ct_b64>` (IV 12 o aléatoire, auth tag GCM 16 o) — détection **par préfixe explicite** (`isChiffre`), jamais devinée ; `enc:v2:…` (version future) n'est pas interprétée à tort.
- **Dérivation** : `sha256(utf8(APP_KEYS_ENCRYPTION_KEY))` → 32 o, **justifiée en commentaire** dans le module (valeur d'env à forte entropie machine → un KDF (scrypt/PBKDF2) serait un coût sans bénéfice ; `node:crypto` suffit, zéro dépendance). La valeur de la variable n'est **jamais** journalisée, retournée ou écrite dans un rapport.
- **Repli (décision utilisateur 2026-10-23, respecté à la lettre)** : env absente → `chiffrer()` retourne la valeur telle quelle (écriture en clair) + `logger.warn` structuré **à chaque écriture** ; aucun 500, aucune rupture en dev ; le backfill `--execute` **sort en exit 1** avec la marche à suivre plutôt que de figer des valeurs illisibles.
- **Lecture rétro-compatible (2 états)** : `getApiKey()` détecte le préfixe — valeur chiffrée → déchiffrée ; valeur en clair (fenêtre de migration) → retournée telle quelle. Échec (env retirée après chiffrement, donnée altérée — authentification GCM) → `logger.error` + `null`, **aucune exception propagée** (pas de 500).

### Zod sur `PUT /api/settings/app` (dernière route Annexe A)

`appSettingsUpdateSchema` dans **`lib/schemas/settings.ts`** (nouveau) : `alerteStockActif` booléen optionnel, `alerteEcheanceJours` coerce int 1..90 (bornes reprises de `settingsSchema`), les 4 clés en `string | null` optionnelles. **`settingsSchema` de `lib/schemas.ts` n'a pas été réutilisé ni modifié** : il exige `raisonSociale` et ne contient aucun champ de clé — ses chemins d'import (`components/parametres/parametres-client.tsx`) sont intacts. Échec → 422 homogène `{ error, issues, success:false }` ; la garde `permission` (`parametres:modifier`) est inchangée ; les clés inconnues du body sont stripées (anti mass-assignment).

### Backfill : `scripts/dev/backfill-chiffrement-cles-api.ts`

- **Dry-run par défaut** (0 écriture) ; `--execute` pour l'écriture réelle ; **idempotent** : une colonne déjà au format `enc:v1:` est exclue de l'écriture → ré-exécution = 0 modification.
- Compteurs exacts AVANT/APRÈS : colonnes vides / à chiffrer (en clair) / déjà chiffrées / en clair restantes (re-comptage post-écriture : > 0 → exit 1).
- **`--execute` sans `APP_KEYS_ENCRYPTION_KEY` → exit non-zero** avec la marche à suivre (génération + `.env` + relance), **aucune écriture**.
- Aucun secret imprimé (colonnes et compteurs uniquement ; ni `DATABASE_URL`, ni valeur de clé). Motifs repris des backfills D1 (`prisma/backfill-mouvements-tresorerie.ts`) et B3 (`scripts/dev/backfill-dashboard-search-permissions.ts`).

### Exigence de déploiement (production)

> **`APP_KEYS_ENCRYPTION_KEY` doit être posée dans le `.env` du serveur de production avant d'utiliser l'écriture des clés.** Génération : `openssl rand -base64 32` (une forte entropie machine, jamais une phrase). Sans cette variable, l'application fonctionne mais écrit les clés **en clair** (repli documenté) ; avec elle, lancez `npx tsx scripts/dev/backfill-chiffrement-cles-api.ts --execute` une fois pour chiffrer l'existant. **Changer cette variable après coup rend les valeurs déjà chiffrées illisibles** : ne la réinitialiser qu'accompagné d'un re-chiffrement complet. Aucune valeur de secret n'est documentée ici — voir l'incident de rotation `docs/wiki/incident-secrets-2026-09-25.md` pour les pratiques.

### Tests & vérifications

- `lib/__tests__/api-keys-crypto.test.ts` (**22 tests**) : roundtrip chiffrage/déchiffrement (clair jamais stocké, IV aléatoire), format `enc:v1:`, repli env absente (warn sans la valeur), altération GCM, garde-fou `••••`, lecture 2 états via `getApiKey` (Prisma mocké), routes réelles GET/PUT/status (session signée réelle, même harness que `api-route.test.ts`). Les 4 tests de route **échouaient sur l'ancienne route** (fuite `openrouterApiKey`, réécriture du masque, clé en clair, 422 absent) puis sont passés après correction.
- Sorties exactes : entrée CHANGELOG `[2026-10-23] Backend (lot-e3-cles-api-chiffrement/E)`.

## Lot H, vague W2 — Paramètres & Entreprises : l'état serveur quitte les composants (2026-10-24)

Les **5 composants du périmètre** (`general-settings-client`, `facturation-settings-client`, `utilisateurs-settings-client`, `entreprise-banques-client`, `entreprises-list-client`) ne contiennent plus **aucun `fetch(`, aucun `useQuery(`, aucun `useMutation(`** — preuve : `grep -rn "fetch(" components/parametres components/entreprises` et `grep -rn "useQuery(\|useMutation(" components/parametres components/entreprises` → **vides** (12 sites inline migrés : 3 + 2 + 1 + 5 + 1). **0 changement visuel, 0 changement de contrat API** (URLs, payloads, réponses, messages d'erreur, clés et invalidations identiques).

### REUSE FIRST — 4 hooks existants étendus, 1 seul créé

| Besoin | Hook | Décision |
| --- | --- | --- |
| GET/PUT `/api/settings/app` + GET `/status` | `hooks/use-settings.ts` : **`useAppSettings`**, **`useApiKeyStatus`**, **`useUpdateAppSettings`** ajoutés | module settings déjà existant → étendu, pas de `hooks/use-app-settings.ts` |
| GET `/api/companies` (liste) | `hooks/use-users.ts` : **`useCompaniesList<T>` rendu générique** (`T extends {id, name}`) | le fetch existait déjà (dialogs utilisateur) → **0 nouveau fetch**, 1 seul implémente la requête |
| GET `/api/users` (liste + stats) | `hooks/use-users.ts` : **`useUsersList(enabled?)`** ajouté | module `use-users.ts` déjà existant |
| GET/PATCH `/api/companies/[id]` (facturation) | `hooks/use-company-query.ts` (`useCompany`) + `hooks/use-companies.ts` (**`useUpdateCompany`**) | déjà les 2 seuls consommateurs du détail entreprise |
| Comptes bancaires (list + create + update + delete) | **`hooks/use-company-bank-accounts.ts` (NOUVEAU)** | **aucun module ne détenait le CRUD** ; la simple liste existait dans `hooks/use-effets.ts` → ce dernier **délègue** désormais au hook canonique (1 implémentation, 1 clé), **0 consommateur touché** (`useCompanyBankAccounts()` zéro-arg gardée pour effets/cheques) ; la factory locale `queryKeys.bankAccounts` (doublon de `queryKeys.companies.bankAccounts`) est supprimée |

### Convention toasts (W0 §3) appliquée

Les toasts passent **côté composant** via `mutate(vars, { onSuccess, onError })` (`notify` + `describeApiError`, **0 import `sonner`**) : messages **repris mot pour mot** de l'implémentation inline précédente. `useUpdateCompany` perd ses 2 toasts (2 appelants avec 2 messages différents → l'exception « motif A » ne s'applique plus) et ne fait plus qu'**invalidation** ; `entreprise-detail-client` et `facturation-settings-client` passent chacun leurs propres callbacks. Inchangés par choix : `useDeleteCompany` (toast + `router.push` = exception session/routing) et `useUsersMutations` (copie identique imposée à tous les appelants).

### Points de contrat vérifiés

- **`useUpdateCompany` : `FormData` → `CompanyUpdateInput`** (type Zod `lib/schemas/company.ts`) : le détail envoie désormais `parsed.data` (le `safeParse` existait déjà, ses 13 champs = les 13 du formulaire → body **byte-identique**) et la facturation construit son objet avec **les mêmes expressions qu'avant** (`parseFloat(fd.get(...) as string)` → `NaN` → `null` en JSON conservé, cf. encadré E2a).
- **Clés** : 6 factories `queryKeys` utilisées — `settings.all/app/apiKeyStatus`, `companies.all/detail/bankAccounts`, `users.all` ; `companies.detail(id)` élargi `string | null` pour préserver l'array exact `["company", null]` des requêtes désactivées.
- **`enabled` inchangé** : `useUsersList(userRole === "ADMIN")`, `useCompany(companyId ?? null)`, `useCompanyBankAccounts(companyId)` (paramètre de route toujours non vide).
- **Dette inchangée volontairement** : `new Error("Failed")` / `"Failed to load key status"` conservés dans les `mutationFn` de `use-settings.ts` (signalés au § « Dette signalée sans y remédier » ci-dessus, hors périmètre de ce lot).
- **`useEffect`** : aucun ajout. Le seul présent dans les fichiers touchés est `useUnsavedChangesWarning` (`hooks/use-settings.ts`), **préexistant et justifié en commentaire** (listener `beforeunload`, API navigateur non réactive).

### Vérifications (sorties exactes)

- `npx tsc --noEmit` → `EXIT=0`
- `npm run lint` → `✖ 385 problems (35 errors, 350 warnings)` (**identique à la baseline, 0 nouveau**)
- `npx eslint <5 composants + 6 hooks + lib/query-keys.ts>` → `0 errors, 1 warning` (le `no-img-element` de `entreprises-list-client.tsx` est **préexistant**, déjà dans la baseline)
- `npx vitest run` → `Test Files 25 passed (25)` / `Tests 431 passed (431)` (**identique à la baseline**)
- `grep` `\bany\b` / `as any` / `@ts-ignore` / `from "sonner"` sur les fichiers du lot → **vides**
- `detect.mjs` (impeccable) → 3 findings **advisory préexistants** (`text-[10px]` hors rampe DESIGN.md, markup antérieur au lot) : non corrigés volontairement, corriger = changer le rendu (lot à **0 changement visuel**).
- Détail complet : entrée CHANGELOG `[2026-10-24] Frontend (lot-h2-parametres-entreprises/H)`.
