# Audit complet — FacturaPro TN

**Date :** 7 octobre 2026
**Archive analysée :** `FacturaPro.zip` (682 fichiers `.ts`/`.tsx` hors Prisma généré, ~80 450 lignes, 50 modèles Prisma, 121 routes API)
**Méthode :** analyse statique du code (grep / wc / lecture ciblée des fichiers critiques), recoupée avec `AGENTS.md`, `docs/wiki/*` et les deux audits précédents (`AUDIT-FACTURAPRO.md` du 25/09 et son suivi `docs/wiki/audit-facturapro-suivi.md`).

> **Limites de l'audit (à lire avant le reste)**
> - L'archive ne contient pas `node_modules` ni de base de données : **je n'ai pas pu exécuter** `npm run lint`, `tsc`, `vitest`, ni lancer l'application. Les chiffres sont des mesures statiques ; les diagnostics de comportement (auth, trésorerie) viennent de la lecture du code et sont marqués **[vérifié dans le code]** ou **[hypothèse à confirmer à l'exécution]**.
> - Les dossiers `.opencode/agents/` et `.agents/skills/` référencés par `AGENTS.md` **ne sont pas dans l'archive**. Je n'ai donc audité que `AGENTS.md`, `CLAUDE.md`, `skills-lock.json` et la trace laissée dans le wiki.
> - Un point de votre ressenti est **contredit par les mesures** : l'usage de `useEffect` n'est plus massif dans cette version (20 occurrences, voir §2.1). Les autres constats (mutations inline, composants géants, absence de réflexe de réutilisation, toasts pauvres) sont confirmés.

---

## 0. Résumé exécutif

| # | Axe | Verdict | Détail |
|---|---|---|---|
| 1 | **Trésorerie** | 🔴 **Ne reflète pas la réalité** | Le solde additionne **toutes** les sommes (entrées **et** sorties comptées positivement) ; chèques émis classés en entrées ; effets enregistrés comme « virements » ; chèques/effets absents du graphique. §5 |
| 2 | **Authentification** | 🔴 Bug reproductible par lecture du code | Condition de course sur le cookie `__session-marker` + mauvais `salt` JWT en HTTPS + double export dans `proxy.ts`. Écran de chargement avec progression à construire. §4 |
| 3 | **Sécurité** | 🔴 / 🟠 | Paiement imputable à la facture d'une autre société, permissions périmées dans l'API, trésorerie sans permission, clés API écrasables, `removeConsole` en prod (aucun log serveur), crons ouverts si `CRON_SECRET` absent, rotation des secrets jamais effectuée. §3 |
| 4 | Composants géants | 🟠 | 48 fichiers > 300 lignes, 11 > 500 (dont `tresorerie-client.tsx` 694 l., `effet-detail-client.tsx` 671 l., `produit-form-page.tsx` 696 l.). §2.4 |
| 5 | Mutations / fetch dans les composants | 🟠 | 45 `fetch()` dans 21 fichiers hors `app/api` + 24 `useQuery`/`useMutation` directement dans 14 composants. §2.3 |
| 6 | Réutilisation | 🟠 | `components/shared/` = 4 fichiers pour 58 `*-client.tsx` et 29 dialogs ; 3 copies de `fmt()` dans la trésorerie alors que `lib/decimal.ts` fournit `formatTND`. §2.5 |
| 7 | Toasts / gestion d'erreur | 🟠 | 267 appels, **129 `toast(` nus**, 70 titres « Erreur » génériques, **10 toasts à titre vide**, seulement 5 `action`, 78 `err.message` bruts affichés, 1 seul `loading.tsx`, 1 seul `error.tsx`, aucun `not-found`/`global-error`. §2.6 |
| 8 | Tests | 🔴 | 3 fichiers de test pour une application financière (aucun sur TVA, soldes, trésorerie, paiements). §2.8 |
| 9 | Règles `AGENTS.md` | 🟡 | Très bonnes règles, **appliquées par discipline, pas outillées** (pas de lint pour `fetch`/`useEffect`, pas de CI). §6 |
| 10 | Typage | 🟢 | 0 `@ts-ignore`, `strict: true`, `no-explicit-any: error`. 1 `any` résiduel hors tests (`export-detail-lines-table.tsx:34`). |
| 11 | Structure / stack | 🟢 | Stack moderne et cohérente (Next 16, React 19, Prisma 7, TanStack Query 5, Zustand 5, Zod 4). |

**Ordre d'attaque recommandé :** (1) sécurité bloquante + auth → (2) trésorerie (modèle de données + calcul) → (3) socle UX (toast/erreurs/composants partagés) → (4) découpage des gros composants et migration des `fetch` → (5) tests + outillage des règles.

---

## 1. Structure du projet

### 1.1 Arborescence réelle

```
app/                 Next.js App Router — (app) 23 modules, (auth), (setup), api/ (121 routes), actions/ (6)
components/          ~35 dossiers par domaine + ui/ (shadcn, 6 374 l.), shared/ (4 fichiers), data-table/
hooks/               66 fichiers (TanStack Query majoritairement)
lib/                 api-route.ts, auth.ts, session.ts, schemas/, stores/ (23), types/ (23), pdf*, ...
prisma/              schema.prisma (1 356 l., 50 modèles, 23 enums), 19 migrations, 7 scripts de seed
docs/                wiki/ (CHANGELOG 1 920 l.), audits/, Verification/, features/, case/
graphify-out/        305 Mo (graphe de dépendances versionné)
```

### 1.2 Points forts

- Découpage par domaine cohérent entre `app/(app)/`, `components/`, `docs/audits/`.
- Factory Zustand `lib/stores/create-list-store.ts`, wrapper `apiRoute` adopté sur 110/121 routes (les 11 autres sont des routes publiques ou cron, documentées).
- `QueryProvider` avec presets `STALE_TIMES` / `GC_TIMES` — bonne base.
- Traçabilité exceptionnelle (wiki + CHANGELOG + audits de module).

### 1.3 Problèmes structurels

| ID | Constat | Preuve | Gravité |
|---|---|---|---|
| ST-1 | **Pollution du dépôt** : `graphify-out/` (305 Mo), `public/uploads/` (7,6 Mo de contenus utilisateur), `lint-output.txt` (UTF-16, 260 Ko), `tsconfig.tsbuildinfo` (960 Ko), `prisma/generated/` (6 Mo) | `du -sh` | 🟠 |
| ST-2 | **Scripts jetables à la racine** : `make-jwt.cjs` (forge un JWT ADMIN avec un `companyId` réel codé en dur), `check-ngp.cjs`, `check-tables.cjs`, `diag-colisage.ts`, `refactor.js`, `update_next_number.js`, `ts_files*.txt` | racine | 🟠 (sécurité : voir S-12) |
| ST-3 | **Deux rapports d'audit historiques** (`rapport-audit.md` du 31/08 obsolète : parle de « Next 15 », « 35+ routes ») et `AUDIT-FACTURAPRO.md` figé par empreinte md5 | racine | 🟡 |
| ST-4 | **`components/shared/` quasi vide** (4 fichiers) alors que 58 `*-client.tsx` et 29 dialogs existent | §2.5 | 🟠 |
| ST-5 | **Types API dupliqués côté client** : `TresorerieData` (~35 lignes) redéclaré dans `tresorerie-client.tsx` au lieu d'être inféré/partagé avec la route | `tresorerie-client.tsx:32-60` | 🟠 |
| ST-6 | **Un seul `loading.tsx`** (global `(app)`) et **un seul `error.tsx`** ; aucun `not-found.tsx` ni `global-error.tsx` | `find app` | 🟠 |
| ST-7 | **Seeds/migrations en vrac** : 7 scripts de seed/backfill dans `prisma/`, `safe_migrate.sql` hors du flux Prisma | `prisma/` | 🟡 |
| ST-8 | **`next.config.ts` minimal** : pas de headers de sécurité, `images.remotePatterns` ouvert à tout `https://**`, `removeConsole` actif en production | `next.config.ts` | 🟠 |

---

## 2. Qualité du code

### 2.1 `useEffect` — situation réelle

Mesure sur `app/ components/ hooks/ lib/` :

| Mesure | Valeur |
|---|---|
| Occurrences `useEffect(` | **20** dans 15 fichiers |
| dont composants shadcn (`components/ui/*`) | 4 |
| Commentaires `// Justification useEffect :` | 16 |
| `useLayoutEffect` | 1 (mesure DOM, autorisé) |

Les 20 sites restants sont des synchronisations avec des systèmes externes (listeners navigateur, `document.cookie`, canvas Konva, Three.js, ResizeObserver, thème). **La règle « useEffect interdit sauf justification » est respectée dans cette version.**

> Si vous voyez encore beaucoup d'effets dans votre éditeur, vérifiez que vous travaillez sur la branche qui contient les lots P2-7 (28/09 → 02/10). Le suivi wiki indique 53 → 20 occurrences.

**Point d'attention réel :** le vrai problème n'est pas `useEffect`, c'est **`useState` : 168 appels dans 71 fichiers**. Beaucoup sont légitimes (ouverture de dialog), mais plusieurs écrans reconstituent à la main des formulaires que React Hook Form + Zod devraient porter :

| Fichier | `useState` |
|---|---|
| `atelier/nouveau-matiere-dialog.tsx` | 9 |
| `atelier/nouveau-of-dialog.tsx` | 7 |
| `bons-commande/rapprochement-card.tsx` | 6 |
| `parametres/ngp-settings-client.tsx`, `entreprises/entreprise-banques-client.tsx`, `effets/apercu-effet-dialog.tsx`, `atelier/packing-list-client.tsx`, `atelier/ordres-fabrication-client.tsx` | 5 |

**Recommandation :** règle « formulaire ≥ 3 champs = React Hook Form + schéma Zod partagé » ; l'état d'ouverture des dialogs reste local (c'est correct).

### 2.2 Typage

- `strict: true`, 0 `@ts-ignore`/`@ts-expect-error`, règle ESLint `no-explicit-any: error` **active**.
- Mesure : 4 `as any` + 4 `eslint-disable` dans `lib/__tests__/decimal.test.ts` (mocks Prisma Decimal, justifiés) ; **1 vrai `any` hors tests** : `components/exports/export-detail-lines-table.tsx:34` (`type NgpCodeish = Record<string, any>` + `eslint-disable`). Le suivi wiki annonce « `any` = 0 » : c'est **faux d'une unité**.
- 15 `as unknown as` à auditer (contournements de typage probables autour de Prisma/Decimal).
- `lib/auth.ts` et `lib/session.ts` castent massivement (`token.x as string`, `(session.user as {...})`) : `types/next-auth.d.ts` existe mais n'est pas exploité à fond.

### 2.3 Server state : `fetch` et mutations dans les composants

Règle `AGENTS.md` : *« `fetch()` direct dans un composant est INTERDIT »*. Mesure :

| Mesure | Valeur |
|---|---|
| `fetch(` hors `app/api` | **45 occurrences / 21 fichiers** |
| `useQuery`/`useMutation` directement dans des composants (hors `hooks/`) | **24 appels / 14 fichiers** |
| `useMutation` totaux | 132 ; `useQuery` totaux : 75 |

Fichiers en infraction (par ordre de gravité) :

| Fichier | `fetch` | `useQuery/useMutation` inline |
|---|---|---|
| `app/actions/bons-commande.ts` | 12 | — (server action qui fait des fetch : à revoir) |
| `components/entreprises/entreprise-banques-client.tsx` | 5 | 5 |
| `components/produits/product-suppliers-section.tsx` | 5 | 3 |
| `components/parametres/general-settings-client.tsx` | 3 | 3 |
| `components/parametres/profil-settings-client.tsx` | 2 | 1 |
| `components/parametres/facturation-settings-client.tsx` | 2 | 2 |
| `app/(auth)/verify-email/page.tsx` | 2 | — |
| `components/customizer/customizer-studio.tsx` | 1 | 2 |
| 12 autres (`command-palette`, `notifications-popover`, `nouveau-of-dialog`, `scan-upload-screen`, `register-form`, `company-setup-form`, `etiquettes-produits-dialog`, `product-fiches-list`, `product-supplier-*`, `entreprises-list-client`, `impression-effets-client`, `utilisateurs-settings-client`) | 1 chacun | 1 pour certains |

> Le suivi wiki signalait déjà « ~30 sites `fetch()` restants » (dette P2-8). **Elle n'a pas été traitée.**

**Plan de correction :** pour chaque module, un fichier `hooks/use-<module>.ts` qui expose `useXxxList`, `useXxx(id)`, `useCreateXxx`, `useUpdateXxx`, `useDeleteXxx` ; `onSuccess` invalide les `queryKeys` ; les composants ne contiennent plus ni `fetch` ni `useMutation`. Centraliser les `queryKeys` (`lib/query-keys.ts`) et un `apiFetch<T>()` typé unique (basé sur `handleApiResponse`).

### 2.4 Composants et pages trop longs

48 fichiers > 300 lignes, **11 > 500** (hors `components/ui`, hors tests) :

| Lignes | Fichier | Problème dominant |
|---|---|---|
| 755 | `lib/packing-list/pdf.ts` | génération PDF monolithique |
| 705 | `components/effets/lettre-de-change.tsx` | rendu + formatage + mise en page mélangés |
| 696 | `components/produits/produit-form-page.tsx` | formulaire + variantes + fiches + QR |
| **694** | **`components/paiements/tresorerie-client.tsx`** | types API + helpers + 6 sections UI + mutation |
| 671 | `components/effets/effet-detail-client.tsx` | détail + actions + dialogs |
| 603 | `components/stock/inventaire-client.tsx` | liste + saisie + export |
| 561 | `components/planning/gantt-chart.tsx` | rendu + interactions |
| 553 | `components/customizer/canvas/design-canvas.tsx` | canvas + événements |
| 519 | `components/atelier/packing-list-client.tsx` | liste + dialogs + cartons |
| **513** | **`components/paiements/tresorerie-echeances.tsx`** | tableau + filtres + actions |
| 502 | `components/devis/devis-detail-client.tsx` | détail + actions |
| 485 | `components/factures/factures-client.tsx` | liste + KPIs + dialogs |
| 483 | `components/status-badge.tsx` | 20+ badges dans un seul fichier |

**Seuils à adopter (et à outiller avec ESLint `max-lines`)** : composant ≤ 250 lignes, hook ≤ 200, page `app/**/page.tsx` ≤ 60 (composition uniquement), route API ≤ 200.

**Patron cible d'une page :**

```
app/(app)/<module>/page.tsx            → Header + <ModuleClient /> (≤ 30 l.)
components/<module>/<module>-client.tsx → composition (≤ 120 l.)
components/<module>/<module>-kpis.tsx   → <KpiGrid items={...} />
components/<module>/<module>-table.tsx  → <DataTable columns={...} />
components/<module>/<module>-dialog.tsx → <EntityFormDialog schema={...} />
hooks/use-<module>.ts                   → queries + mutations
lib/stores/<module>-store.ts            → filtres / sélection (create-list-store)
lib/schemas/<module>.ts                 → Zod partagé client + serveur
```

### 2.5 Réutilisation des composants

Constat : le réflexe « créer un nouveau composant pour chaque tâche » est confirmé.

| Indicateur | Mesure |
|---|---|
| `components/shared/` | 4 fichiers (`form-actions`, `line-items-table`, `product-select`, `variant-select`) |
| `*-client.tsx` | 58 |
| Fichiers `*dialog*.tsx` | 29 |
| Fichiers `*skeleton*.tsx` spécifiques | 8 |
| Fichiers important `Card` | 76 |
| `StatCard` utilisé | 28 fichiers (**bon exemple**) |
| `DataTable` partagé utilisé | 23 fichiers (**bon exemple**) |
| Définitions locales de formatage monnaie/date | `fmt` ×3 dans `components/paiements/*`, `formatDate` ×5 (alors que `lib/utils.ts#formatDate` et `lib/decimal.ts#formatTND` existent) |
| 30 usages directs de `Intl.NumberFormat` / `toLocaleString` | dispersés |

Aggravant : la règle publiée dans `docs/wiki/ui-dialogs.md` (« **≥ 2 consommateurs réels avant toute brique partagée** ») pousse structurellement à la duplication. À remplacer par : **« dès la 2ᵉ occurrence d'un motif, on extrait »**, avec l'obligation de chercher d'abord dans un inventaire.

**Bibliothèque partagée à créer (`components/shared/`)** :

| Composant | Remplace |
|---|---|
| `PageHeader` (titre, description, actions, breadcrumb) | en-têtes copiés par module |
| `KpiGrid` + `StatCard` (déjà là) | cartes KPI écrites à la main (ex. trésorerie) |
| `EntityFormDialog` (RHF + Zod + footer standard + état pending) | 29 dialogs |
| `ConfirmDialog` (étendre `confirm-delete-dialog`) | confirmations ad hoc |
| `EmptyState`, `ErrorState`, `ListSkeleton`, `DetailSkeleton` | 8 skeletons spécifiques + états vides répétés |
| `MoneyCell`, `DateCell`, `StatusBadge` générique piloté par config | `fmt` locaux, 483 l. de badges |
| `FilterBar` (recherche + sélecteurs + reset) branchée sur `create-list-store` | barres de filtre par module |
| `SectionCard` (titre, action, contenu) | `<Card>` réécrits |
| `FormField` RHF (label, erreur, aide) | `Label + Input` répétés |
| `AuthProgressScreen` | voir §4 |

### 2.6 Gestion d'erreur et toasts

Mesures (`sonner`, 72 fichiers) :

| Mesure | Valeur |
|---|---|
| Appels toast | **267** (`toast.error` 94, `toast.success` 44, **`toast(` nus 129**) |
| Avec `description` | 133 |
| Avec `action` (annuler, voir, réessayer…) | **5** |
| Titre générique « Erreur » | **70** |
| **Titre vide** (`toast.error("", { description })`) | **10** (`nouveau-devis-actions.tsx:39,43`, `nouvelle-facture-actions.tsx:47,51`, …) |
| `err.message` brut affiché | 78 |
| `alert(` / `confirm(` natifs | 7 |
| `catch {}` vides | 20 |
| Wrapper de toast centralisé | **inexistant** (P2-13 jamais exécuté) |

Conséquences : messages incohérents (`toast("Erreur", …)` vs `toast.error(…)`), erreurs techniques exposées (« API Error 500 »), aucune action de récupération, aucun contexte (quel document ? quel montant ?).

**Solution : `lib/notify.ts` + `components/shared/app-toast.tsx`**

```ts
notify.success({ title, description?, footer?, action?: { label, onClick } })
notify.error({ title, error: unknown, context?: string, retry?: () => void, details?: boolean })
notify.warning(...)  notify.promise(promise, { loading, success, error })
```

Règles de contenu :
- **Header** : verbe + objet (« Facture F-2026-0042 enregistrée »), jamais « Erreur » seul.
- **Corps** : une phrase actionnable, jamais de message serveur brut (mapping `ApiError.status` → message métier : 401/403/404/409/422/429/5xx + réseau).
- **Footer** : référence technique discrète (code, `requestId`, horodatage) pour le support ; bouton « Copier les détails ».
- **Actions** : « Voir la facture », « Annuler » (undo 5 s sur suppressions), « Réessayer » sur erreurs réseau/5xx.
- Un toast ne doit **jamais** être le seul signal d'une erreur de formulaire : erreurs de champs inline + `Alert` en tête de dialog.
- ESLint `no-restricted-imports` sur `sonner` hors `lib/notify.ts`.

**Résilience UI à ajouter :** `loading.tsx` + `error.tsx` par module (au moins factures, clients, achats, paiements, effets, stock), `not-found.tsx`, `global-error.tsx`, `ErrorBoundary` autour des graphiques.

Côté serveur : `apiRoute` renvoie `error.message` brut sur 500 et **n'a pas de validation intégrée** malgré ce que prétend `AGENTS.md` (« auth, validation, error handling ») — voir S-7.

### 2.7 Performance

| ID | Constat | Impact |
|---|---|---|
| PF-1 | `jwt` callback (`lib/auth.ts`) exécute `prisma.user.findUnique` **à chaque appel de `auth()`** (layout + chaque page serveur) | latence + charge DB |
| PF-2 | `app/(app)/layout.tsx` : `auth()` + 3 `count()` bloquent le premier rendu de **toutes** les pages | écran blanc / skeleton long |
| PF-3 | `GET /api/tresorerie` : ~20 requêtes Prisma, `count()` toutes périodes, pas de pagination, agrégations en JS avec `Number()` | lenteur + erreurs d'arrondi (voir §5) |
| PF-4 | `GET /api/payments` charge **tous** les paiements (pas de pagination) puis recalcule en JS | croissance linéaire |
| PF-5 | Une seule page `page.tsx` marquée `"use client"` sur 72 (bon) mais les `*-client.tsx` chargent tout côté client ; graphiques `recharts`, `three`, `konva`, `jspdf`, `xlsx` sans `dynamic()` à vérifier | bundle |
| PF-6 | `images.remotePatterns` ouvert à `**` : l'optimiseur d'images devient un proxy public | coût + abus |

### 2.8 Tests

3 fichiers (`decimal`, `rate-limit`, `status-transitions`). **Aucun test** sur : calcul de solde de facture/achat, annulation de paiement, cycle de vie chèque/effet, trésorerie, TVA/retenue à la source, numérotation, `apiRoute`, `session`. Pour une application où une erreur de signe fausse la trésorerie (§5), c'est le risque n°1 après la sécurité.

---

## 3. Sécurité

Légende : 🔴 critique · 🟠 élevé · 🟡 moyen · 🟢 faible. **[V]** = vérifié dans le code ; **[?]** = à confirmer à l'exécution.

| ID | Gravité | Constat | Preuve | Correctif |
|---|---|---|---|---|
| **S-1** | 🔴 [?] | **Salt JWT figé** `"authjs.session-token"` alors qu'en HTTPS le cookie est `__Secure-authjs.session-token` (le salt Auth.js = nom du cookie). Le décodage échoue → en production HTTPS, `proxy.ts` redirige vers `/login` et `getSessionFromRequest` renvoie `null` (401 sur toutes les API) | `proxy.ts:46-50`, `lib/session.ts:66-71` | Dériver le salt du nom de cookie réellement lu ; idéalement utiliser `auth()` / `getToken({ req, secureCookie })` |
| **S-2** | 🟠 [V] | **Paiement imputable à la facture/achat d'une autre société** : `POST /api/payments` fait `invoice.findUnique({ where: { id } })` et `achat.findUnique({ where: { id } })` sans `companyId` ; `applyPaymentToInvoice/Achat` (lib) idem ; `tiersId` du body non contrôlé | `app/api/payments/route.ts:112-118,148-154`, `lib/invoice-payment.ts:24,87` | `findFirst({ where: { id, companyId } })` partout + vérifier `tiersId` ; test d'isolation |
| **S-3** | 🟠 [V] | **Rôle/permissions/désactivation périmés dans l'API** : `getSessionFromRequest` décode le JWT à la main (cookie parsé manuellement) sans relire la DB ; un utilisateur désactivé ou rétrogradé garde son accès jusqu'à 7 jours ; `lastActivity` (30 min) n'est pas appliqué aux routes API | `lib/session.ts:51-82`, `lib/auth.ts:99-130` | Une seule source de session (`auth()`), cache court de la ré-synchro, vérif `actif` + `tokenVersion` |
| **S-4** | 🟠 [V] | **Routes sans permission** (auth seule) exposant des données sensibles : `/api/tresorerie` (**solde**), `/api/tresorerie/evolution`, `/api/dashboard` (CA, impayés), `/api/search`, `/api/stock-mouvements`, `/api/notifications`, 6 routes `/api/effets/*` | 21 routes sans `permission:` | Ajouter `paiements:voir`, `dashboard:voir`, `effets:voir`, … ; rendre `permission` **obligatoire** dans `apiRoute` (liste blanche explicite) |
| **S-5** | 🟠 [V] | **Clés API (OpenAI/Gemini/Mistral)** : en clair en base ; **globales** (pas par société) ; le formulaire pré-remplit la valeur **masquée** (`••••••••abcd`) puis `PUT` la renvoie telle quelle → **la vraie clé est écrasée par la valeur masquée** ; la réponse du `PUT` renvoie les clés **non masquées** ; body non validé | `app/api/settings/app/route.ts:33-62`, `general-settings-client.tsx:269` | Ne mettre à jour que si la valeur ne commence pas par `••••` ; chiffrer au repos (AES-GCM + clé d'env) ; Zod ; ne jamais renvoyer la clé |
| **S-6** | 🟠 [V] | **`compiler.removeConsole` en production** supprime aussi les `console.error` serveur : `apiRoute` logue ses erreurs avec `console.error` → **aucun log d'erreur en production** | `next.config.ts`, `lib/api-route.ts:63` | `removeConsole: { exclude: ["error","warn"] }` + logger structuré (pino) avec `requestId` |
| **S-7** | 🟡 [V] | **26 routes lisent `request.json()` sans schéma Zod** (`users/[id]`, `companies/[id]`, `settings`, `payments/[id]`, `invoices/[id]`, `quotes/[id]`, `achats/[id]`, `avoirs/[id]`…) → mass-assignment, états incohérents ; `apiRoute` renvoie `error.message` (messages Prisma) au client sur 500 | liste dans l'annexe A | Ajouter `schema?: ZodType` à `apiRoute` (parse automatique + 422 homogène), message générique + `requestId` en 500 |
| **S-8** | 🟡 [V] | **Crons** : `check-echeances` et `relance-ecart-bc` testent `CRON_SECRET && auth !== …` → **ouverts si la variable est absente** ; `cron/tmm-bct` n'a **aucune** authentification | `app/api/cron/*` | Refuser (500/401) si `CRON_SECRET` absent ; vérifier le header Vercel Cron |
| **S-9** | 🟡 [V] | **Énumération de comptes** : `/api/users/check-status` (public) révèle « désactivé / non vérifié » par email, alors que `authorize` renvoie volontairement `null` sans distinction | `hooks/use-login.ts`, `app/api/users/check-status` | Fusionner dans le flux d'authentification, réponse uniforme, code d'erreur typé (`CredentialsSignin`) |
| **S-10** | 🟡 [V] | **Cookie `__session-marker`** : non signé, non `HttpOnly`, n'importe quelle valeur passe → la logique « fermer le navigateur = déconnexion » est contournable | `lib/providers/session-provider.tsx:18` | Remplacer (voir §4) |
| **S-11** | 🟡 [V] | **Pas d'en-têtes de sécurité** (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) ; `remotePatterns` ouvert | `next.config.ts` | `headers()` dans `next.config.ts` |
| **S-12** | 🔴/🟠 [V] | **Secrets** : l'incident du 25/09 (`.env` livré dans l'archive) a été documenté mais le wiki indique **« aucune rotation effectuée »** ; `make-jwt.cjs` forge un token ADMIN | `docs/wiki/incident-secrets-2026-09-25.md`, `docs/wiki/audit-facturapro-suivi.md` (P0-1) | **Faire la rotation maintenant** (`AUTH_SECRET`, DB, SMTP, clés IA) ; supprimer `make-jwt.cjs` ; `.gitignore` + secret-scan en CI |
| **S-13** | 🟡 [V] | **Suppressions physiques de pièces financières** : `payment.delete` dans `cheques/[id]/annuler` et `rejeter` ; **aucun journal d'audit** (aucun modèle `AuditLog`) | `app/api/cheques/[id]/annuler/route.ts:75`, `rejeter/route.ts:75` | Écritures d'annulation (contre-passation) + table `AuditLog` (qui/quoi/avant/après) |
| **S-14** | 🟢 | Multi-société : `Tiers`/`Product`/`Categorie` partagés entre sociétés (**décision documentée** `audit-scope-multi-societe.md`). Risque résiduel : solde client/fournisseur et `matriculeFiscal @unique` global | schema | Confirmer la décision avec le métier ; sinon scoper par `companyId` |

**Ce qui est bien fait :** bcrypt, rate-limit en base (`RateLimitBucket`) sur les 5 endpoints d'auth, `upload-guard` (magic bytes, taille, whitelist MIME), `requireCompany` + `resolveCompanyId`, vérification `allowedCompanyIds`, 404 si ressource hors société sur la plupart des routes métier (`findFirst({ id, companyId })`).

---

## 4. Authentification — diagnostic et cible

### 4.1 Ce que vous observez

> Clic « Se connecter » → spinner → skeleton → retour au login → (nouvelle tentative) → dashboard.

### 4.2 Cause la plus probable **[V dans le code / comportement à confirmer à l'exécution]**

1. `login-form.tsx` : la case « Se souvenir de moi » est **décochée par défaut** → `rememberMe = false`.
2. `signIn(..., { redirect: false })` pose le cookie JWT avec `rememberMe: false`, puis le composant fait `router.push(callbackUrl)` **immédiatement**.
3. `proxy.ts` : si `token.rememberMe === false` il exige le cookie `__session-marker`. Or ce cookie n'est écrit que par `SessionMarker` (`session-provider.tsx`) **dans un `useEffect`, après que `useSession()` ait fini de se mettre à jour** — donc *après* la navigation.
4. Le `proxy` ne trouve pas le marqueur → **supprime le cookie d'authentification et redirige vers `/login`**. Entre-temps l'utilisateur a vu : spinner (mutation) → `app/(app)/loading.tsx` (skeleton) → retour login.
5. À la tentative suivante, le marqueur existe (écrit entre-temps, cookie de session qui survit) → ça passe. D'où le « marche à la deuxième fois ».

**Facteurs aggravants :**
- `proxy.ts` exporte **à la fois** `export default auth(...)` et `export async function proxy(...)`. Le `default` redirigerait `/login` vers lui-même s'il était actif : **un des deux est du code mort** et le comportement dépend de la version de Next → à supprimer.
- `router.push()` **puis** `router.refresh()` : double rendu serveur.
- `AppLayout` : `auth()` (→ requête DB du callback `jwt`) + 3 `count()` avant tout affichage ; puis `DashboardClient` refait un fetch et affiche **un second skeleton** (`DashboardSkeleton`).
- `LoginPage` interroge la DB (`hasAdmin()`) à chaque affichage et ne redirige pas un utilisateur déjà connecté.
- Le salt JWT (S-1) casse l'authentification en HTTPS.
- Aucun message d'erreur persistant : seulement des `toast("Erreur", …)` sans état dans le formulaire ; le rate-limit (`authorize` → `null`) apparaît comme « identifiants incorrects ».

### 4.3 Comportement cible

```
[Login] clic → [Écran AuthProgress plein écran : logo centré + barre + %]
   ├─ succès  → 100 % → redirection dashboard (données déjà préchargées)
   └─ échec   → retour [Login] : champ email conservé, mot de passe vidé + focus,
                bannière d'erreur inline (Alert) + toast enrichi
```

**Étapes pondérées (progression réelle, pas un minuteur factice) :**

| Étape | Plage | Contenu |
|---|---|---|
| 1. Vérification des identifiants | 0 → 30 % | `signIn` (credentials) |
| 2. Ouverture de session | 30 → 50 % | cookie posé, lecture de la session |
| 3. Profil, permissions, société | 50 → 70 % | `prefetchQuery` company + permissions |
| 4. Préparation du tableau de bord | 70 → 95 % | `prefetchQuery` `/api/dashboard` |
| 5. Redirection | 95 → 100 % | `router.replace` (sans `refresh`) |

Interpolation animée entre deux jalons (`motion` déjà dans le projet) pour un affichage fluide ; `aria-valuenow`, `role="progressbar"`, `prefers-reduced-motion` respecté.

**Architecture proposée :**
- `lib/stores/auth-progress-store.ts` (Zustand : `phase`, `percent`, `label`, `error`) ;
- `hooks/use-login.ts` : mutation unique orchestrant les étapes et mettant à jour le store (**sans** `useEffect`) ;
- `components/auth/auth-progress-screen.tsx` (logo SVG de l'application + `Progress` shadcn + pourcentage) ;
- `components/auth/login-form.tsx` allégé (RHF + Zod) + `<Alert variant="destructive">` inline ;
- **Erreurs typées** : sous-classes de `CredentialsSignin` (`code: "invalid_credentials" | "deactivated" | "unverified" | "rate_limited"`) renvoyées par `authorize` → plus besoin de `check-status` public (supprime S-9) ; message de rate-limit avec délai restant ;
- **Marqueur « fermeture du navigateur »** : généré **côté serveur** dans la même réponse que la connexion (Server Action de login qui appelle `signIn` puis `cookies().set("__session-marker", <valeur signée liée au token>, { httpOnly: true, sameSite: "lax", secure })`) — ou abandonner ce mécanisme et ne garder que l'inactivité de 30 min déjà implémentée dans le callback `jwt` ;
- `proxy.ts` : un seul export, sel dérivé du nom de cookie, un seul chemin d'auth ; redirection `/login` → dashboard si déjà authentifié ;
- `app/(app)/layout.tsx` : sortir les 3 `count()` du chemin critique (`Suspense` + composant serveur dédié pour la sidebar) ; supprimer `router.refresh()` ; un seul skeleton cohérent avec le dashboard (retirer `loading.tsx` générique ou le rendre identique).

### 4.4 Critères d'acceptation

- Connexion valide avec « se souvenir » **coché ou non** : jamais de retour au login, un seul chargement visible, barre 0 → 100 %.
- Mauvais mot de passe : retour au login en < 1 s après la fin de l'étape 1, message explicite, e-mail conservé.
- Compte désactivé / non vérifié / bloqué temporairement : trois messages distincts, sans fuite d'information avant authentification.
- Aucun `useEffect`, aucun `fetch` direct dans `login-form.tsx`.
- Test Playwright/Vitest : scénarios succès, échec, rate-limit, rememberMe on/off.

---

## 5. Trésorerie — reflète-t-elle réellement les flux ?

### 5.1 Réponse courte

**Non.** La page affiche des montants, mais le calcul central (`app/api/tresorerie/route.ts`) ne distingue pas fiablement les **entrées** des **sorties** et ne traite pas les **quatre modes** (espèces, chèques, virements, effets de commerce) comme des flux de même rang.

### 5.2 Ce que le code fait réellement

| Indicateur affiché | Calcul actuel | Réalité |
|---|---|---|
| **Solde actuel** | `Σ payment.montant` pour `status ≠ ANNULE`, toutes périodes, **sans signe** | Paiements **fournisseurs additionnés** aux encaissements clients → **solde faux** (surévalué) |
| Prévisionnel | `solde + aRecevoir − aPayer` | Hérite de l'erreur du solde |
| Entrées du mois | `Σ payment` avec `invoiceId ≠ null` | **Sans filtre de statut** (paiements annulés comptés) ; exclut les chèques/effets reçus sans facture |
| Sorties du mois | `Σ payment` avec `achatId ≠ null` | Ignore chèques/effets émis sans achat lié |
| À recevoir / À payer | chèques `EN_ATTENTE` + effets non `PAYE/ANNULE` par `type` | Correct dans l'esprit, mais **inclut les effets `IMPAYE`** et mélange échéances futures et en retard |
| Échéancier + projection hebdo | `dateEcheance ∈ [now, horizon]` | **Les échéances en retard disparaissent** de la projection |
| Sens d'un mouvement réalisé | `invoiceId ? "entree" : achatId ? "sortie" : "entree"` | **Tout paiement sans lien = entrée par défaut** |

### 5.3 Défauts constatés **[V]**

| ID | Gravité | Défaut | Où |
|---|---|---|---|
| T-1 | 🔴 | Solde = somme non signée : sorties comptées comme entrées | `tresorerie/route.ts` §1 |
| T-2 | 🔴 | **Chèque émis « encaissé »** : `encaisser` ne gère que les chèques liés à une facture ; sinon crée un `Payment` sans `invoiceId` ni `achatId` → classé **entrée** | `cheques/[id]/encaisser/route.ts:50-60` |
| T-3 | 🔴 | **Effets enregistrés comme `VIREMENT`** (`methode: "VIREMENT"` codé en dur) ; l'enum `PaymentMethod` n'a pas de valeur `EFFET` → les effets de commerce sont **fondus dans les virements** (KPI « virements du mois », graphique) | `effets/[id]/route.ts:105,113`, `lib/invoice-payment.ts:141-153`, enum `PaymentMethod` |
| T-4 | 🟠 | Paiements d'effets créés en `EN_ATTENTE` et **comptés dans le solde** ; un effet émis « standalone » (sans achat/facture) **ne peut jamais être confirmé** (la confirmation exige `invoiceId \|\| achatId`) | `payments/[id]/route.ts:20-21`, `lib/invoice-payment.ts` |
| T-5 | 🟠 | Graphique d'évolution : seulement espèces / virements / cartes — **chèques et effets absents** ; sens « paiement » = `invoiceId = null` (inclut chèques reçus autonomes) | `tresorerie/evolution/route.ts` |
| T-6 | 🟠 | Échéances **en retard** exclues (`dateEcheance >= now`) de l'échéancier et de la projection | `tresorerie/route.ts` §3 |
| T-7 | 🟠 | Aucun modèle de **comptes** (caisse / banque) ni de **solde initial** : impossible de rapprocher avec un relevé ; `CompanyBankAccount` existe mais n'est lié à aucun mouvement | schema |
| T-8 | 🟠 | **`MouvementFinancier`** (remboursements d'avoirs) ignoré par la trésorerie | schema + route |
| T-9 | 🟡 | Cumuls avec `Number()` (flottants) alors que le projet impose Big.js/Decimal ; `PF-3` | `tresorerie/route.ts` |
| T-10 | 🟡 | Multi-devises : `Payment.montant` additionné sans conversion (facture en EUR/USD) **[?]** | `Payment`, `Invoice.devise` |
| T-11 | 🟡 | Escompte (`REMIS_ESCOMPTE`), endossement (`ENDOSSE`), impayé (`IMPAYE`), chèque rejeté : pas d'écriture de trésorerie correspondante (agios, retour d'impayé) ; `annuler`/`rejeter` **suppriment** le paiement au lieu de contre-passer | `effets/[id]/route.ts`, `cheques/[id]/rejeter` |
| T-12 | 🟡 | `GET /api/tresorerie` sans permission (S-4) ; type `TresorerieData` dupliqué côté client (ST-5) | — |

### 5.4 Modèle cible

Introduire un **registre de mouvements de trésorerie** explicite, alimenté par des écritures (jamais de suppression) :

```prisma
enum SensMouvement { ENCAISSEMENT DECAISSEMENT }
enum ModeReglement { ESPECES CHEQUE VIREMENT EFFET CARTE }
enum StatutMouvement { PREVU REALISE ANNULE }
enum TypeCompte { CAISSE BANQUE }

model CompteTresorerie {
  id String @id @default(cuid())
  companyId String
  type TypeCompte
  libelle String
  bankAccountId String?          // lien vers CompanyBankAccount
  soldeInitial Decimal @db.Decimal(19,4) @default(0)
  dateSoldeInitial DateTime
  ...
}

model MouvementTresorerie {
  id String @id @default(cuid())
  companyId String
  compteId String
  sens SensMouvement
  mode ModeReglement
  statut StatutMouvement
  montant Decimal @db.Decimal(19,4)      // toujours positif ; le signe vient de `sens`
  devise String @default("TND")
  dateOperation DateTime                  // date d'émission / de règlement
  dateValeur DateTime?                    // date d'encaissement / de débit réel
  dateEcheance DateTime?                  // pour chèques/effets prévus
  tiersId String?
  invoiceId String?  achatId String?  avoirId String?
  chequeId String?   effetId String?  paymentId String?
  reference String?
  annuleParId String?                     // contre-passation (pas de delete)
  ...
  @@index([companyId, statut, dateValeur])
}
```

**Règles de calcul (une seule fonction pure testée, `lib/tresorerie/compute.ts`)** :
- `Solde réel (compte)` = `soldeInitial + Σ(REALISE, ENCAISSEMENT) − Σ(REALISE, DECAISSEMENT)` ;
- `À recevoir` = `Σ(PREVU, ENCAISSEMENT)` ; `À payer` = `Σ(PREVU, DECAISSEMENT)` ; **en retard** = `PREVU` avec `dateEcheance < today` (affiché à part) ;
- `Prévisionnel` = solde réel + à recevoir − à payer ;
- Ventilation par `mode` (espèces / chèque / virement / effet / carte) **et** par sens, pour le mois et pour la courbe d'évolution ;
- Chèque reçu : `PREVU` à l'enregistrement → `REALISE` à l'encaissement ; chèque émis : `PREVU` → `REALISE` au débit ; effet : idem, + cas escompte (encaissement net + agios en décaissement) et impayé (contre-passation) ;
- Tous les calculs en `Big`/`Decimal`, agrégation en SQL (`groupBy`) et non en JS.

**Migration de données (sans casse)** : script de backfill idempotent qui dérive `sens` depuis l'existant (`invoiceId → ENCAISSEMENT`, `achatId → DECAISSEMENT`, sinon `cheque.type` / `effet.type`), `mode` depuis `methode` **ou** présence de `effetId` (→ `EFFET`), `statut` depuis `PaymentStatus`. Garder `Payment` comme source documentaire ; `MouvementTresorerie` devient la source de la trésorerie. Rapport de réconciliation avant/après (écart de solde par société).

### 5.5 Critères d'acceptation

- Jeu de test : encaissement client 1 000 (espèces) + chèque reçu 500 encaissé + virement fournisseur 300 + chèque émis 200 débité + effet émis 400 payé → **solde = 1 000 + 500 − 300 − 200 − 400 = 600** ; chaque mode apparaît dans la bonne colonne.
- Chèque émis ne peut **jamais** augmenter le solde ; effet n'apparaît **jamais** comme virement.
- Paiement annulé : une écriture de contre-passation, aucun `delete`.
- Échéances en retard visibles et totalisées.
- ≥ 25 tests Vitest sur `compute.ts` (signes, annulations, mois, devises, arrondis 3 décimales).

---

## 6. Agents et respect des règles imposées

### 6.1 Qualité du dispositif (`AGENTS.md`)

**Points forts**
- Pipeline strict (Graphify → analyse → plan → implémentation → validation → mise à jour du graphe → wiki), délégation obligatoire Governor → sous-agents, « HARD STOP » explicites.
- Règles de code claires (`any`, `useEffect`, TanStack Query, Zustand, `apiRoute`), validation lint/tsc avant clôture, traçabilité wiki.
- Les lots P0 → P2-12 ont réellement réduit la dette (53 → 20 `useEffect`, 12 `any` → 0 sauf 1, 110/121 routes sous `apiRoute`, découpage de `nouvel-effet-client.tsx` 1141 → 66 lignes).

**Faiblesses**

| ID | Constat | Conséquence |
|---|---|---|
| AG-1 | **Règles non outillées** : rien dans ESLint pour interdire `fetch` dans `components/`, `useEffect` sans commentaire, `sonner` hors wrapper, fichiers > N lignes ; pas de CI | les infractions reviennent (45 `fetch` restants) |
| AG-2 | **Tolérance de la dette** : « propre sur les fichiers modifiés » + baseline lint **417 problèmes (44 erreurs)** acceptée | la dette ne baisse que là où on passe |
| AG-3 | **Aucune règle « REUSE FIRST »** : le Governor cherche des fichiers (Graphify) mais pas de composant existant ; la règle « ≥ 2 consommateurs » (`ui-dialogs.md`) décourage l'extraction | duplication systématique (§2.5) |
| AG-4 | **Aucune règle UX transverse** : toasts, états vides/erreur/chargement, auth/transitions ne sont dans le périmètre d'aucun agent ; le Frontend Agent est jugé sur l'esthétique (skills Impeccable) | toasts pauvres, auth sans écran de progression |
| AG-5 | **Pas d'agent Sécurité ni Performance ni Test** ; le QA Agent « review » mais n'a pas de mandat d'écrire des tests | 3 fichiers de test, S-2/S-3 passés inaperçus |
| AG-6 | **Rapport de suivi illisible** : les cellules du tableau `audit-facturapro-suivi.md` atteignent des milliers de caractères ; `CHANGELOG.md` 1 920 lignes ; ritual « empreinte md5 de l'audit » | coût de contexte élevé, peu de valeur de lecture |
| AG-7 | **Vérifications affirmées sans preuve reproductible** : « `any` = 0 » (faux : 1), « 0 route sans wrapper métier » vs 21 routes sans permission | confiance excessive dans les auto-rapports |
| AG-8 | **Refactors « byte-identiques »** par prudence (P2-10) : bien pour la sûreté, mais l'équipe d'agents ne corrige pas les défauts fonctionnels rencontrés (ex. `resolveEffetForm`, effets-virements) | les bugs métier restent |
| AG-9 | `.opencode/agents/*` et `.agents/skills/*` absents de l'archive | non auditables ; vérifier qu'ils sont bien versionnés |
| AG-10 | Contradiction : « ne jamais utiliser `&&` » dans les commandes mais scripts de vérification du wiki en pipelines | friction pour les agents |

### 6.2 Matrice de conformité mesurée

| Règle | Seuil | Mesure | Statut |
|---|---|---|---|
| `any` interdit | 0 | 1 hors tests + 4 en tests justifiés | 🟡 |
| `useEffect` interdit sauf justification | 0 non justifié | 20 (16 commentaires de justification + 4 shadcn) | 🟢 |
| `fetch()` interdit dans les composants | 0 | **45 / 21 fichiers** | 🔴 |
| TanStack Query pour le server state | 100 % | `useMutation/useQuery` inline dans 14 composants | 🟠 |
| Zustand pour l'état partagé | — | 22 stores (bon) ; mêlé à du `useState` pour des formulaires | 🟡 |
| `apiRoute` sur les routes | 100 % | 110/121 (11 exceptions documentées) | 🟢 |
| Validation d'entrée | — | 26 routes sans Zod | 🟠 |
| Lint/tsc propres | 0 | baseline 417 (44 erreurs) en dernier suivi ; impossible à rejouer ici | 🟡 [?] |
| Tests | — | 3 fichiers | 🔴 |
| Wiki + CHANGELOG | à jour | à jour (volumineux) | 🟢 |
| Skills design chargés | oui | non vérifiable (dossiers absents) | ⚪ |

### 6.3 Évolutions recommandées du dispositif

1. **Outiller** : ESLint `no-restricted-syntax` (`fetch` hors `hooks/`/`lib/`/`app/api`), `no-restricted-imports` (`sonner`), `max-lines` (250 composants / 200 hooks), règle custom `useEffect` sans `// Justification`, `eslint-plugin-react-hooks` strict ; CI GitHub Actions : `lint`, `tsc`, `vitest`, `gitleaks`.
2. **Ajouter 3 agents** : `security` (revue IDOR/permissions/secrets à chaque PR), `test` (écrit les tests avant/avec le correctif), `ux-system` (toasts, états, auth, accessibilité, kit partagé).
3. **Règle REUSE FIRST** dans `AGENTS.md` : avant tout nouveau composant → `graphify query "composant <besoin>"` + lecture de `docs/wiki/ui-kit.md` (inventaire du kit partagé) ; justification écrite si création.
4. **Budget de dette** : chaque lot touche aussi N fichiers en infraction (« boy-scout rule ») ; le lint baseline ne peut que baisser.
5. **Rapport de suivi compact** : 1 ligne par prompt (statut, preuve en une commande, date), détails dans le CHANGELOG ; supprimer le rituel md5.
6. **Preuves exécutables** : un script `scripts/check-rules.mjs` (sans `&&`) qui sort les compteurs (`any`, `useEffect`, `fetch`, routes sans permission, fichiers > 300 l.) ; le Governor le lance au début et à la fin de chaque tâche.

---

## 7. Plan d'optimisation priorisé

| Priorité | Lot | Contenu | Effort |
|---|---|---|---|
| **P0** | A | Rotation des secrets, suppression `make-jwt.cjs`, `.gitignore`, `removeConsole` corrigé | 0,5 j |
| **P0** | B | S-1 (salt), S-2 (isolation paiements), S-3 (session unique), S-4 (permissions) + tests d'isolation | 2 j |
| **P0** | C | Auth : bug marqueur, `proxy.ts`, erreurs typées, écran de progression | 2 j |
| **P1** | D | Trésorerie : modèle `MouvementTresorerie` + calcul pur testé + migration/backfill + UI | 5 j |
| **P1** | E | `apiRoute` avec `schema` Zod obligatoire + permission obligatoire + erreurs normalisées ; migrer les 26 routes | 2 j |
| **P1** | F | Socle UX : `notify`, `ErrorState`/`EmptyState`/skeletons, `loading/error/not-found/global-error` | 2 j |
| **P2** | G | Kit partagé (`PageHeader`, `KpiGrid`, `EntityFormDialog`, `FilterBar`, cellules monnaie/date) | 3 j |
| **P2** | H | Migration des 45 `fetch` + 24 hooks inline vers `hooks/*` | 3 j |
| **P2** | I | Découpage des 11 fichiers > 500 lignes puis des 37 > 300 | 5 j |
| **P2** | J | Formulaires `useState` → RHF + Zod (atelier, paramètres, banques) | 2 j |
| **P3** | K | Tests (cible : trésorerie, paiements, soldes, TVA, session, `apiRoute`) + CI | 3 j |
| **P3** | L | Performance : `dynamic()` pour recharts/three/konva/jspdf/xlsx, requêtes paginées, `Suspense` layout | 2 j |
| **P3** | M | Hygiène dépôt (`graphify-out`, uploads, scripts racine), dispositif d'agents (§6.3) | 1 j |

**Objectifs mesurables en fin de plan :** 0 `fetch` hors hooks, 0 composant > 400 lignes, 0 route sans `permission` + schéma, ≥ 60 % de couverture sur `lib/tresorerie`, `lib/invoice-payment`, `lib/session`, toast centralisé à 100 %, solde de trésorerie réconcilié au dinar près sur le jeu de test.

---

## Annexe A — Routes qui lisent le body sans schéma Zod (26)

`companies`, `companies/[id]`, `users`, `users/[id]`, `users/me`, `users/me/password`, `users/resend-invitation`, `users/check-status`, `users/verify-email`, `auth/resend-code`, `auth/register`, `invoices/[id]`, `quotes/[id]`, `quotes/[id]/convert`, `bons-commande/[id]`, `avoirs/[id]`, `achats/[id]`, `notifications`, `settings`, `settings/app`, `bons-livraison/[id]`, `products/[id]/stock-movements`, `payments/[id]`, `ngp-codes`, `ngp-codes/[id]`, `setup/company`.

## Annexe B — Routes `apiRoute` sans `permission`

`effets/documents-lies`, `effets/suggest-echeances`, `effets/echeance-collision`, `effets/echeances-a-venir`, `effets/splits`, `effets/check-echeances`, `user/companies`, `users`, `users/[id]`, `users/me`, `users/me/password`, `users/resend-invitation`, `search`, `upload`, `notifications`, `tresorerie`, `tresorerie/evolution`, `products/next-code`, `stock-mouvements`, `setup/company`, `dashboard`. *(Les routes `users/*` vérifient le rôle ADMIN dans le handler ; `me`, `user/companies`, `notifications`, `setup/company` sont légitimement sans permission métier.)*

## Annexe C — Routes publiques / cron sans `apiRoute` (11)

`auth/[...nextauth]`, `auth/register`, `auth/resend-code`, `users/check-status`, `users/verify-email`, `taux-bct`, `tmm-bct`, `taux-change/[devise]`, `cron/tmm-bct`, `cron/check-echeances`, `cron/check-echeances/relance-ecart-bc`.

## Annexe D — Commandes de re-mesure (à exécuter une par une, sans `&&`)

```
grep -rn "useEffect(" app components hooks lib --include=*.ts --include=*.tsx
grep -rn "fetch(" components app --include=*.ts --include=*.tsx
grep -rn "useMutation(\|useQuery(" components app --include=*.ts --include=*.tsx
grep -rnE "toast\(" app components hooks lib --include=*.ts --include=*.tsx
find app components hooks lib -name "*.tsx" -o -name "*.ts"
npm run lint
npx tsc --noEmit
npx vitest run
```
