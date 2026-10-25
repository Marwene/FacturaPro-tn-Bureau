# Audit Complet — FacturaPRO

**Date :** 25 septembre 2026
**Périmètre analysé :** code source complet (670 fichiers `.ts`/`.tsx`, ~79 700 lignes), `prisma/schema.prisma`, `AGENTS.md`, `.opencode/agents/*`, `.agents/skills/*`, `docs/`
**Méthode :** analyse statique directe du code (grep/wc ciblés, lecture de fichiers représentatifs), comparaison avec les règles écrites par le projet lui-même dans `AGENTS.md` et les agents `.opencode/`.

> Tous les chiffres ci-dessous sont mesurés, pas estimés. Les chemins de fichiers cités sont réels et vérifiables.

---

## 0. Résumé exécutif

Le projet a un **système de règles agentique très mature et bien pensé** (`AGENTS.md`, Governor, sous-agents spécialisés, skills `state-boundaries`/`type-safety`/`api-route-guard`). C'est rare et c'est une vraie force. Le problème n'est **pas l'absence de règles, c'est leur application inégale** : certains modules récents (effets, produits, invoices) les suivent bien ; d'autres, plus anciens ou touchés rapidement, les contournent. Il y a aussi **un vrai problème de sécurité opérationnelle immédiat** (voir §3.0) qui doit être traité avant tout le reste.

| Axe | Verdict | Détail |
|---|---|---|
| 🔴 Sécurité — fichier `.env` livré dans l'archive | **Critique, action immédiate** | §3.0 |
| 🔴 Sécurité — upload de fichiers non validé | **Critique** | §3.1 |
| 🟠 Règle `apiRoute` (auth centralisée) | 61 % de conformité (74/121 routes) | §4.1 |
| 🟠 Règle `useEffect` interdit sauf justif. | 53 occurrences, quasi aucune justifiée en commentaire | §2.1 |
| 🟠 Règle `any` interdit | 63 occurrences dans 26 fichiers | §2.2 |
| 🟡 TanStack Query / Zustand | Globalement bien adopté (72 `useQuery`, 41 `useMutation`, 22 stores Zustand) mais logique de mutation trop souvent écrite inline dans les composants au lieu d'un hook dédié | §2.3 |
| 🟡 Composants réutilisables | Le réflexe existe (`data-table`, `confirm-delete-dialog`, `create-list-store` factory) mais est sous-utilisé, et un composant générique (`entity-dialog.tsx`) est mort-né (0 usage) | §2.5 |
| 🟡 Fichiers trop longs (« god components ») | 49 fichiers > 300 lignes, 13 fichiers > 500 lignes | §2.4 |
| 🟡 Gestion des toasts | 141 appels `toast.*`, seulement 24 avec `description`, 3 avec `action` | §2.6 |
| 🟢 Typage strict global | Aucun `@ts-ignore`/`@ts-expect-error` dans tout le projet | §2.2 |
| 🟢 Multi-société (Product/Tiers/Categorie) | Comportement **volontaire et documenté** (`docs/wiki/audit-scope-multi-societe.md`), pas un bug | §3.2 |

**Priorité n°1 (aujourd'hui) :** rotation des secrets `.env` (§3.0).
**Priorité n°2 (cette semaine) :** verrouiller `/api/upload` (§3.1) et finir la migration `apiRoute` sur les routes métier restantes (§4.1).
**Priorité n°3 (sprint) :** remédiation `useEffect`/`any` module par module, extraction des mutations inline vers des hooks, consolidation des dialogs.

---

## 1. Structure du projet

### 1.1 Vue d'ensemble

```
app/                    Next.js App Router (16.2.6, React 19.2.4)
  (app)/                20 modules métier (factures, clients, achats, atelier, pos, customizer...)
  (auth)/, (setup)/     Auth + onboarding
  api/                  121 routes (route.ts)
  actions/              Server Actions
components/             ~35 dossiers par domaine + ui/ (shadcn), shared/, data-table/
hooks/                  ~70 hooks (majoritairement TanStack Query)
lib/                    stores/ (Zustand), schemas/, types/, api-route.ts, permissions.ts, session.ts...
prisma/                 schema.prisma + 19 migrations
docs/                   wiki/, audits/ (8 audits de modules déjà réalisés), Verification/
.opencode/agents/       governor, architecture, backend, database, frontend, qa
.agents/skills/         state-boundaries, type-safety, api-route-guard, impeccable, make-interfaces-feel-better
graphify-out/           graphe de dépendances (source de vérité pour les agents)
```

**Stack :** Next.js 16 / React 19 / Prisma 7 / PostgreSQL / NextAuth 5-beta / TanStack Query 5 / Zustand 5 / Zod 4 / shadcn-ui / Tailwind 4. Stack moderne et cohérente, pas de dette de version notable.

### 1.2 Observations structurelles

- **Bonne séparation par domaine** côté `components/`, `app/(app)/`, `docs/audits/` — chaque module métier (devis, bons de commande, effets…) a son dossier propre, ce qui facilite la navigation et correspond bien au découpage des sous-agents (`frontend`, `backend`).
- **`components/shared/`** existe (5 fichiers : `entity-dialog.tsx`, `form-actions.tsx`, `line-items-table.tsx`, `product-select.tsx`, `variant-select.tsx`) mais est **sous-peuplé** vu la taille du projet (35+ dossiers de composants) — signe que la mutualisation est pensée mais pas systématisée (voir §2.5).
- **`lib/stores/create-list-store.ts`** est une factory Zustand générique (23 lignes) explicitement prévue pour éviter la duplication de stores — bon pattern, mais son usage réel dans les autres stores n'est pas systématique (`avoirs-store.ts`, `bons-commande-store.ts` à 137/287 lignes ressemblent à des stores ad hoc plutôt qu'à des instances de la factory).
- **`docs/audits/`** contient déjà 8 audits de modules très détaillés (produits, factures, devis, BC, BL, achats, inventaire) rédigés par le QA Agent — **excellente pratique**, ce présent audit vient les compléter au niveau transverse plutôt que de les dupliquer.
- **Tests quasi absents** : seulement 2 fichiers de test (`lib/__tests__/decimal.test.ts`, `status-transitions.test.ts`) pour ~79 700 lignes de code métier financier (factures, effets, chèques, TVA). C'est le point le plus risqué de la base de code après la sécurité : aucune garde-fou automatisé sur les calculs financiers (Big.js, retenues, TVA, échéanciers).
- **`graphify-out/`** (graphe de connaissance versionné) est volumineux mais c'est un choix assumé du projet (source de vérité pour les agents) — pas une anomalie.

---

## 2. Qualité du code

### 2.1 `useEffect` — règle violée fréquemment sans justification écrite

Règle du projet (`AGENTS.md`, `state-boundaries/SKILL.md`) : `useEffect` interdit sauf synchronisation avec un système externe non réactif, **avec commentaire explicite juste au-dessus justifiant pourquoi**.

- **53 occurrences** de `useEffect(` dans **38 fichiers**.
- Auto-vérification demandée par le skill (`grep -n "useEffect(" <fichier>` + commentaire au-dessus) : en l'état, la quasi-totalité des occurrences n'a **aucun commentaire de justification**. Exemple représentatif : `components/produits/produit-form-page.tsx` (690 lignes) combine `useQuery` correct pour le code produit **et** un `useEffect` (L132) sans commentaire, dans le même fichier — signe d'un mélange de patterns plutôt que d'une vraie exception justifiée.
- Cas plausibles de vraie exception (mesure DOM, listener navigateur) à vérifier module par module — mais tant qu'il n'y a pas de commentaire, le skill considère que **c'est une violation par défaut**, pas un doute.

### 2.2 Typage — `any` présent malgré l'interdiction stricte

- **63 occurrences** de `: any` / `as any` / `<any>` / `any[]` / `Record<string, any>` dans **26 fichiers**.
- **0 occurrence** de `@ts-ignore` / `@ts-expect-error` — point positif : quand le typage est difficile, l'équipe ne contourne pas via ces échappatoires, elle utilise `any` directement (moins grave à corriger, car pas de suppression d'erreur silencieuse, mais reste une violation de la règle projet).
- `type-safety/SKILL.md` documente déjà un cas précis rencontré (`const overdue: any[] = []` → `FactureAvecClient[]`) — le pattern de correction est donc déjà écrit, il reste à l'appliquer aux 26 fichiers restants.
- `eslint.config.mjs` hérite seulement de `eslint-config-next` (core-web-vitals + typescript) **sans règle explicite `@typescript-eslint/no-explicit-any: "error"`** — la règle est donc portée uniquement par la discipline humaine/agent, pas outillée. C'est un gain rapide : l'ajouter au config ferait échouer `npm run lint` sur les 63 occurrences existantes et empêcherait toute régression future.

### 2.3 TanStack Query / Zustand — bien adopté globalement, mais mutations trop souvent inline

- **72 `useQuery(`**, **41 `useMutation(`**, **22 stores Zustand** dans `lib/stores/` — l'architecture cible est largement en place, ce n'est *pas* un projet qui ignore ces outils.
- Le vrai problème que vous avez identifié est réel mais plus précis qu'« absence de TanStack Query » : dans plusieurs composants (`components/effets/nouvel-effet-client.tsx`, `components/cheques/nouveau-cheque-dialog.tsx`, `components/entreprises/entreprise-detail-client.tsx`, `components/produits/produit-form-page.tsx`…) les `useQuery`/`useMutation` **sont bien utilisés, mais écrits directement dans le composant** avec le `fetch()` inline, au lieu d'être extraits dans un hook réutilisable sous `hooks/` comme le fait le reste du projet (`hooks/use-produits.ts`, `hooks/use-clients.ts`, etc.). Conséquence concrète : la logique d'appel à `/api/effets/documents-lies` ou `/api/companies/[id]` n'est pas testable isolément, pas réutilisable ailleurs, et duplique la gestion d'erreur à chaque écran.
- Deux fichiers font pire — `fetch()` **sans** `useQuery`/`useMutation` du tout : `components/auth/login-form.tsx` et `components/parametres/securite-settings-client.tsx` (changement de mot de passe). Pour ce dernier en particulier, l'absence de `useMutation` veut dire pas d'état `isPending` standard, pas d'invalidation de cache cohérente, gestion d'erreur ad hoc.
- Les stores Zustand eux-mêmes sont sains dans leur usage (pas de données serveur qui s'y glissent, conformément à la règle des 150 lignes du skill `state-boundaries`) à l'exception de `bons-commande-store.ts` (287 lignes) à vérifier en priorité contre le seuil du skill.

### 2.4 Fichiers trop longs (« god components/hooks »)

| Seuil | Nombre de fichiers |
|---|---|
| > 300 lignes | 49 |
| > 500 lignes | 13 |

Top offenders (composants) :

| Fichier | Lignes |
|---|---|
| `components/effets/nouvel-effet-client.tsx` | **1141** |
| `components/effets/lettre-de-change.tsx` | 705 |
| `components/paiements/tresorerie-client.tsx` | 694 |
| `components/produits/produit-form-page.tsx` | 690 |
| `components/effets/effet-detail-client.tsx` | 671 |
| `components/stock/inventaire-client.tsx` | 603 |
| `components/planning/gantt-chart.tsx` | 560 |

Top offenders (hooks/lib) : `lib/packing-list/pdf.ts` (755), `lib/customizer/mockups/product-mockups.ts` (457), `lib/schemas.ts` (354, un seul fichier Zod pour tout le projet), `hooks/use-effets.ts` (350).

Le module **Effets** concentre à lui seul 3 des plus gros fichiers du projet (1141 + 705 + 671 lignes) — c'est le candidat n°1 pour un découpage (formulaire, aperçu/impression, logique d'échéancier, logique de collision de dates devraient être des sous-composants/hooks séparés).

### 2.5 Réutilisabilité des composants — le réflexe existe mais n'est pas systématique

- **Bons signaux existants** : `components/data-table/data-table.tsx` est un vrai composant générique bien utilisé à travers le projet ; `components/confirm-delete-dialog.tsx` est une modale de confirmation réutilisable adoptée dans 9 modules (planning, factures, bons-commande, ateliers…) ; `lib/stores/create-list-store.ts` est une factory de store.
- **Mais** : `components/shared/entity-dialog.tsx` (50 lignes), pourtant conçu comme la brique générique pour les formulaires d'entité, a **0 import ailleurs dans le projet** — c'est un composant mort, probablement un refactor commencé puis abandonné pendant que chaque module continuait à créer son propre dialog (`fournisseur-dialog.tsx`, `nouveau-client-dialog.tsx`, `nouveau-produit-dialog.tsx`, `payment-dialog.tsx`, `nouveau-cheque-dialog.tsx`… 31 fichiers `*dialog*.tsx`).
- Plusieurs fichiers (`components/factures/factures-client.tsx` notamment) réimportent `AlertDialog` brut (le primitif shadcn) pour refaire une confirmation de suppression, **alors que `confirm-delete-dialog.tsx` existe déjà** pour exactement ce cas — exemple concret du symptôme que vous décrivez : un nouveau composant est écrit pour une tâche au lieu de réutiliser l'existant.
- **Recommandation concrète** : soit finir la migration vers `entity-dialog.tsx` (et l'imposer via QA), soit le supprimer s'il est obsolète — un composant partagé non utilisé est une dette silencieuse (il continue d'apparaître dans les résultats de recherche/Graphify comme option valide alors qu'il ne l'est plus en pratique).

### 2.6 Gestion des erreurs et toasts

- **141 appels** `toast.success/error/info/warning(...)` dans le projet — la stack `sonner` est bien en place et systématiquement utilisée pour le feedback utilisateur (pas de `alert()` ni de gestion d'erreur silencieuse détectée).
- Seulement **24 appels sur 141** incluent un `description` (contexte détaillé) et **3 seulement** incluent une `action` (bouton « Annuler », « Réessayer », « Voir »). La majorité des toasts d'erreur se limite à un titre court (ex. `toast.error("Erreur")`), ce qui correspond exactement à ce que vous avez observé : pas d'enrichissement systématique alors que `sonner` le permet nativement (`title`, `description`, `action`, `cancel`, durée).
- Il n'existe pas de wrapper centralisé (`lib/toast.ts` ou équivalent) qui normaliserait le format des toasts d'erreur API (ex. afficher automatiquement le message serveur en `description` + une action « Réessayer » qui relance la mutation) — chaque composant réinvente son propre appel `toast.error(...)`, ce qui explique l'hétérogénéité.

---

## 3. Sécurité de l'application

### 3.0 🔴 CRITIQUE — Fichier `.env` livré dans l'archive du projet

Le fichier `.env` présent à la racine de l'archive contient des identifiants en clair : `DATABASE_URL`, `AUTH_SECRET`, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`. Il est correctement listé dans `.gitignore` (`.env*`), donc **a priori pas commité dans git** — mais il a été inclus dans le **zip livré** (à moi, à un tiers, à un audit...). Dès qu'un secret sort du contrôle d'accès prévu (dépôt git privé + machines autorisées), il doit être considéré comme potentiellement compromis.

**Action immédiate recommandée, indépendamment du reste de cet audit :**
1. Régénérer `AUTH_SECRET` (NextAuth) immédiatement.
2. Faire tourner le mot de passe de la base de données (`DATABASE_URL`) et celui du compte SMTP.
3. Vérifier qu'aucun de ces secrets n'a jamais été poussé dans un historique git, même sur une branche supprimée.
4. Ne plus jamais inclure `.env` dans un export/zip du projet — ajouter un script de packaging qui l'exclut explicitement, ou exporter uniquement via `git archive`.

Je n'ai reproduit aucune valeur de ce fichier dans ce document.

### 3.1 🔴 CRITIQUE — Upload de fichiers non validé (`app/api/upload/route.ts`)

```ts
const ext = file.name.split(".").pop() ?? "png";
const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
await writeFile(path.join(uploadDir, filename), buffer);
```

- **Aucune vérification de type MIME** ni de contenu réel du fichier (seul le nom fourni par le client détermine l'extension écrite sur disque).
- **Aucune limite de taille**.
- Le fichier est écrit dans `public/uploads/logos/`, un répertoire **servi publiquement** par Next.js.
- Risque concret : upload d'un `.svg` ou `.html` contenant du JavaScript → XSS stocké si le fichier est ensuite ouvert directement dans un navigateur (comportement par défaut de `public/`) ; upload de fichiers volumineux en boucle → épuisement disque (DoS) faute de limite de taille ; usurpation d'extension pour des fichiers non-image sur un champ censé être un logo d'entreprise.
- La route vérifie bien la session (`getSessionFromRequest`) donc ce n'est pas ouvert à un utilisateur non authentifié — mais **tout utilisateur authentifié**, même avec des permissions basses, peut exploiter ceci.

**Recommandation :** whitelist stricte de MIME types (`image/png`, `image/jpeg`, `image/webp`…) vérifiée sur le buffer réel (pas sur le nom de fichier), limite de taille (`formData` + vérif `file.size`), et envisager un renommage total de l'extension basé sur le MIME détecté plutôt que sur l'input utilisateur. Ce même pattern doit être vérifié sur les autres endpoints d'upload (`app/api/products/[id]/photo`, `app/api/products/[id]/fiches`, `app/api/products/[id]/fiche-technique` — mêmes risques probables, à auditer avec le même gabarit).

### 3.2 🟢 Confirmé sain — portée multi-société de Product/Tiers/Categorie/Marque/Stock

Ces modèles n'ont volontairement **pas** de `companyId` (catalogue et stock partagés entre sociétés) — c'est documenté et tracé de bout en bout dans `docs/wiki/audit-scope-multi-societe.md` (déjà réalisé par le Governor le 2026-09-06). Ce n'est pas un oubli, ne pas le re-traiter comme un bug. Ce document note cependant deux incohérences mineures déjà connues (métriques dashboard mélangeant compteurs globaux et scopés) — non re-détaillées ici, voir le document original.

Point non résolu à surveiller dans ce même document : `lib/permissions.ts` (`checkPermission()`) ne vérifie que le rôle/les permissions, **jamais l'appartenance à une société** pour les entités qui, elles, sont scopées par société (Invoice, Devis, BC, BL, Achat, Paiement, Chèque, Effet...). Si un utilisateur peut légitimement changer de société active côté session, il faut confirmer que **chaque route `apiRoute` avec `requireCompany: true` utilise bien le `companyId` résolu côté serveur** (et non un `companyId` transmis par le client) pour toutes les opérations d'écriture — à vérifier explicitement route par route lors de la remédiation §4.1, car c'est là que se jouerait une éventuelle fuite inter-société sur les documents financiers (contrairement au catalogue, qui est volontairement global).

### 3.3 Authentification

- Mots de passe hashés avec `bcryptjs` (`bcrypt.hash(password, 12)`) — coût de 12, correct.
- **Aucun rate-limiting détecté** sur les routes d'authentification (`/api/auth/*`, `/api/users/check-status`) — pas d'occurrence de `rateLimit`/`rate-limit` dans le code. Un endpoint de login sans limitation de tentatives est exposé au brute-force/credential stuffing, particulièrement sensible pour une application de facturation.
- `next-auth` en version **5.0.0-beta.31** — une beta en production mérite une vigilance de veille sur les CVE et un plan de migration vers la version stable dès qu'elle sort.

### 3.4 Base de données

- **1 seule occurrence** de `$queryRaw`/`$executeRaw` dans tout le projet (`app/api/companies/route.ts`) — bonne nouvelle, la surface d'injection SQL est minimale. À vérifier ponctuellement que les paramètres y sont bien passés via template tag Prisma (`prisma.$queryRaw\`...${var}...\``) et non par concaténation de chaîne.
- Le reste du projet passe exclusivement par le client Prisma généré (paramétrage automatique) — bon niveau de protection par défaut contre l'injection SQL.

### 3.5 Autres points

- Pas de configuration CORS personnalisée détectée sur les routes API — comportement par défaut Next.js (same-origin), cohérent pour une app qui ne sert pas de public API tierce.
- `AGENTS.md` demande explicitement de ne jamais écrire de secrets dans le wiki (`docs/wiki/`) — bonne pratique déjà actée dans les règles projet, aucun secret trouvé dans `docs/` lors de cet audit.

---

## 4. Qualité des agents et respect des règles imposées

Le système d'agents (`Governor` + `architecture`/`backend`/`frontend`/`database`/`qa`) est **bien conçu sur le papier** : séparation claire des rôles, checklist obligatoire, hard-stops explicites, delegation forcée, vérification lint/tsc avant clôture. Le problème observé n'est pas la conception des règles, c'est **le taux d'application réel** mesuré dans le code livré.

### 4.1 Règle `apiRoute` obligatoire — 61 % de conformité

- **121 routes** API au total.
- **74 routes (61 %)** utilisent correctement le wrapper `apiRoute.get/post/put/patch/delete`.
- **47 routes (39 %)** ne l'utilisent pas et réimplémentent manuellement `getSessionFromRequest` + `checkPermission` — exactement le pattern que le skill `api-route-guard/SKILL.md` a été créé pour éliminer (le skill cite lui-même « 0 route sur 111 ne l'utilisait » comme constat historique ayant motivé sa création — la migration est en cours mais **pas terminée**, il en reste 47 aujourd'hui contre l'objectif de 0).
- Sur ces 47, une partie est légitimement publique ou spéciale (`auth/*`, `cron/*`, `setup/company`) mais **la majorité concerne des entités métier centrales** qui devraient être migrées : `clients`, `products`, `categories`, `marques`, `stock-mouvements`, `notifications`, `companies`, `users`, `carton-types`, `upload`.
- Conséquence directe : logique d'auth dupliquée 47 fois au lieu d'être centralisée, risque d'incohérence si la logique de permission évolue (il faudrait la changer à 47 endroits au lieu d'un seul), et c'est précisément ce que `api-route-guard/SKILL.md` documente comme le problème à ne pas reproduire.

### 4.2 Règle `useEffect interdit sans justification` — non respectée dans la quasi-totalité des cas

Voir §2.1. Le skill `state-boundaries` demande un commentaire explicite au-dessus de chaque `useEffect` restant ; en pratique, la vérification (`grep -n "useEffect(" <fichier>`) montre que ce commentaire est quasi systématiquement absent. Sur 53 occurrences, cela représente un volume de dette conforme aux dires de l'utilisateur (« utilisation massive »), mais concentré dans une minorité de fichiers (38 fichiers sur 670, donc pas généralisé — plutôt quelques modules mal alignés que l'ensemble du projet).

### 4.3 Règle `any` interdit — non respectée sur 26 fichiers

Voir §2.2. Même profil : violation réelle et mesurée, mais localisée (26 fichiers sur 670), pas systémique.

### 4.4 Règle Frontend (skills `impeccable` / `make-interfaces-feel-better`, DESIGN.md)

- **`DESIGN.md` / `PRODUCT.md` n'existent pas à la racine du projet** — `frontend.md` identifie pourtant cela explicitement comme « la cause directe de l'incohérence visuelle entre modules » et demande de lancer `impeccable init` puis `impeccable document` **avant toute nouvelle tâche UI significative**. Ce point n'a pas encore été traité alors que la règle existe depuis la rédaction de `frontend.md`. C'est probablement une cause structurelle derrière votre observation de composants créés au cas par cas plutôt que réutilisés : sans référentiel de design écrit, chaque agent frontend (ou développeur) recrée sa propre interprétation au lieu de vérifier contre un existant formalisé.
- Sans exécuter réellement `impeccable audit`/`critique` (hors périmètre de cet audit statique), impossible de confirmer si le chargement des skills a été fait pour chaque tâche UI passée — c'est un point à faire vérifier par le QA Agent sur les prochaines tâches, pas rétroactivement sur tout l'historique.

### 4.5 Règle Database (`prisma migrate status` propre)

19 migrations présentes, nommage cohérent et chronologique, correspondance visible entre les migrations et l'évolution du schéma (ex. `add_payment_status`, `add_product_suppliers`, `add_sale_price_to_product_suppliers`) — **bon signal que la règle « toujours générer une migration » est globalement respectée**. Impossible de vérifier `prisma migrate status` sans base de données connectée (hors périmètre de cet audit statique) ; à faire exécuter par le Database Agent en tâche de suivi.

### 4.6 Requirements Checklist du Governor

La mécanique de checklist du Governor (extraction avant délégation, vérification ✅/❌/⚠️ après implémentation) est une bonne pratique anti-dérive. Elle n'est vérifiable qu'à l'usage (logs de session), pas depuis le code livré — recommandation : archiver systématiquement les checklists produites par le Governor dans `docs/wiki/` ou un dossier `docs/checklists/` pour qu'elles deviennent, elles aussi, auditable a posteriori (aujourd'hui rien ne permet de vérifier rétrospectivement si cette étape a été suivie pour telle ou telle fonctionnalité déjà livrée).

### 4.7 Synthèse conformité

| Règle (`AGENTS.md`) | Conformité mesurée |
|---|---|
| `apiRoute` wrapper obligatoire | 61 % (74/121) |
| `any` interdit | 96 % des fichiers concernés sont propres (26/670 en infraction) |
| `useEffect` justifié en commentaire | Quasi 0 % des occurrences ont le commentaire requis |
| TanStack Query pour état serveur | Largement adopté, mais souvent inline plutôt qu'en hook dédié |
| Zustand pour état client partagé | Bien adopté (22 stores), tailles globalement sous contrôle |
| `DESIGN.md`/`PRODUCT.md` (frontend.md) | Non fait |
| Migrations Prisma à jour | Cohérent dans l'historique (statut live non vérifiable ici) |
| `@ts-ignore`/`@ts-expect-error` bannis | 100 % — 0 occurrence |

---

## 5. Plan d'optimisation et d'amélioration priorisé

### P0 — Immédiat (sécurité, avant toute autre tâche)
1. Rotation des secrets `.env` (§3.0).
2. Verrouillage de `app/api/upload/route.ts` et audit du même pattern sur les 3 autres endpoints d'upload produit (§3.1).
3. Ajout d'un rate-limiting basique sur `/api/auth/*` et `/api/users/check-status` (§3.3).

### P1 — Cette semaine (dette de règles à fort effet de levier)
4. Ajouter `@typescript-eslint/no-explicit-any: "error"` dans `eslint.config.mjs` pour outiller la règle existante, puis corriger les 26 fichiers listés (§2.2) — méthode déjà documentée dans `type-safety/SKILL.md`.
5. Terminer la migration `apiRoute` sur les 47 routes restantes, en commençant par les entités métier (`clients`, `products`, `categories`, `marques`, `stock-mouvements`, `notifications`) plutôt que les routes légitimement publiques (§4.1).
6. Générer `DESIGN.md`/`PRODUCT.md` via `impeccable init` + `impeccable document` (§4.4) — débloque la cohérence visuelle et donne enfin un référentiel contre lequel le QA Agent peut rejeter les interfaces génériques.

### P2 — Ce sprint (qualité de code / DX)
7. Passer en revue les 53 `useEffect` : pour chacun, soit ajouter le commentaire de justification requis par `state-boundaries`, soit le remplacer par `useQuery`/dérivation au rendu. Prioriser `produit-form-page.tsx` et le module Effets.
8. Extraire les `useQuery`/`useMutation` actuellement inline dans les composants (`nouvel-effet-client.tsx`, `nouveau-cheque-dialog.tsx`, `entreprise-detail-client.tsx`, `produit-form-page.tsx`) vers des hooks dédiés sous `hooks/`, à l'image de `use-produits.ts`/`use-clients.ts`.
9. Convertir `login-form.tsx` et `securite-settings-client.tsx` (fetch brut sans TanStack Query) vers `useMutation`.
10. Découper les 13 fichiers > 500 lignes, en commençant par `nouvel-effet-client.tsx` (1141 lignes) : séparer formulaire / logique de collision d'échéances / aperçu-impression en fichiers distincts.
11. Trancher sur `components/shared/entity-dialog.tsx` : le généraliser à tous les formulaires d'entité (fournisseur, client, produit, chèque…) ou le supprimer s'il est obsolète — ne pas le laisser comme dette silencieuse.
12. Remplacer les `AlertDialog` réimplémentés à la main (`factures-client.tsx` et autres) par `confirm-delete-dialog.tsx`.
13. Créer un wrapper de toast centralisé (ex. `lib/toast.ts` avec `notifyError(error, { retry? })`) qui impose systématiquement `description` (message serveur) et, quand pertinent, une `action` (Réessayer/Annuler/Voir) — puis migrer les 141 appels existants progressivement, module par module.

### P3 — Continu
14. Ajouter des tests unitaires sur la logique financière (Big.js, calculs de TVA/retenue, échéanciers d'effets) — actuellement 2 fichiers de test pour tout le projet, c'est le point de risque silencieux le plus important à moyen terme.
15. Archiver les Requirements Checklists du Governor dans `docs/checklists/` pour rendre son propre processus auditable a posteriori.
16. Étendre `components/shared/` avec les patterns qui se répètent réellement (repérés via `impeccable extract`, déjà prévu dans `frontend.md`).

---

## 6. Prompts prêts à exécuter pour le Governor

Ces prompts sont écrits pour être collés tels quels au Governor. Chacun respecte le format attendu par `governor.md` (une tâche par prompt, contexte + fichiers déjà identifiés fournis pour éviter une re-exploration inutile — le Governor doit quand même lancer Graphify en STEP 1, ces prompts ne le dispensent pas de la pipeline, ils l'accélèrent). À exécuter dans l'ordre P0 → P3 ci-dessus, pas en parallèle sur les points qui touchent les mêmes fichiers (ex. #5 et #8 touchent parfois les mêmes composants).

### Prompt P0-1 — Secrets .env
```
Le fichier .env à la racine du projet contient des secrets (DATABASE_URL, AUTH_SECRET,
SMTP_USER, SMTP_PASS) qui ont été inclus par erreur dans un export/zip du projet livré
en dehors du contrôle git habituel. Ils doivent être considérés comme potentiellement
compromis.

Tâche : documenter dans docs/wiki/CHANGELOG.md une entrée d'incident (sans jamais
recopier les valeurs des secrets), puis produire une checklist de rotation :
AUTH_SECRET, mot de passe de la base de données (DATABASE_URL), identifiants SMTP.
Vérifier aussi qu'aucun de ces secrets n'apparaît dans l'historique git du dépôt
(git log -p -- .env sur toutes les branches) et rapporter le résultat.
Ne PAS effectuer la rotation toi-même (accès infra hors périmètre) : produire le plan
d'action précis à exécuter manuellement par l'équipe infra, avec l'ordre des étapes
(régénérer le secret côté provider AVANT de le changer dans l'environnement de prod
pour éviter une coupure de service).
```

### Prompt P0-2 — Sécurisation de l'upload de fichiers
```
Rôle à jouer : backend.

Contexte : app/api/upload/route.ts (et par le même pattern probable :
app/api/products/[id]/photo/route.ts, app/api/products/[id]/fiches/route.ts,
app/api/products/[id]/fiche-technique/route.ts) acceptent un upload de fichier sans
validation de type MIME réel ni limite de taille, et déterminent l'extension écrite
sur disque à partir du nom de fichier fourni par le client (file.name.split(".").pop()).
Les fichiers sont écrits dans public/uploads/**, un répertoire servi publiquement.

Tâche :
1. Lancer Graphify sur ces 4 routes pour confirmer la liste exacte des endpoints d'upload
   du projet et leurs appelants.
2. Pour chaque route d'upload identifiée : valider le type MIME réel du fichier (pas le nom),
   whitelister les types acceptés selon l'usage (images pour logo/photo produit, PDF pour
   fiche technique), imposer une limite de taille explicite, et dériver l'extension écrite
   sur disque à partir du MIME détecté plutôt que du nom fourni par le client.
3. Respecter les CODE RULES du projet (any interdit, apiRoute wrapper si la route n'est pas
   encore migrée — dans ce cas migrer aussi vers apiRoute dans la même tâche).
4. Documenter le changement dans docs/wiki/ (module concerné) + CHANGELOG.md.
5. Lancer npm run lint et npx tsc --noEmit sur les fichiers modifiés avant de clore.
```

### Prompt P0-3 — Rate limiting sur l'authentification
```
Rôle à jouer : backend puis architecture si un choix de librairie est nécessaire.

Contexte : aucun rate-limiting n'existe actuellement sur les routes app/api/auth/*
et app/api/users/check-status/route.ts, exposant l'application au brute-force sur
les identifiants.

Tâche :
1. Graphify sur ces routes pour confirmer tous les points d'entrée d'authentification
   du projet (y compris [...nextauth]/route.ts).
2. Proposer et implémenter une limitation de tentatives (par IP + par compte) adaptée
   au contexte de déploiement du projet (vérifier d'abord s'il existe déjà une
   infrastructure Redis/KV disponible via Graphify/lib/ avant d'en introduire une
   nouvelle dépendance).
3. Respecter apiRoute wrapper si applicable, any interdit, tests si la stack de test
   le permet.
4. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P1-4 — Interdiction outillée de `any` + nettoyage des 26 fichiers
```
Rôle à jouer : qa pour l'étape 1, puis backend/frontend selon les fichiers pour l'étape 2.

Tâche :
1. Ajouter la règle "@typescript-eslint/no-explicit-any": "error" dans eslint.config.mjs.
2. Lancer npm run lint sur tout le projet pour obtenir la liste exhaustive et à jour des
   violations (elle peut différer légèrement des 63 occurrences / 26 fichiers mesurés lors
   de cet audit si le code a évolué depuis).
3. Pour chaque fichier en violation : dériver le type correct selon la méthode de
   .agents/skills/type-safety/SKILL.md (Prisma.XGetPayload pour les données Prisma,
   z.infer<typeof schema> pour les données validées Zod, unknown + narrowing en dernier
   recours). Ne jamais utiliser @ts-ignore ou @ts-expect-error.
4. Traiter les fichiers par lot cohérent (ex. tous les hooks d'un même module ensemble)
   pour limiter le nombre de PR/tâches.
5. Après chaque lot : npm run lint et npx tsc --noEmit doivent être propres sur les
   fichiers modifiés avant de passer au lot suivant.
6. Documenter dans docs/wiki/CHANGELOG.md.
```

### Prompt P1-5 — Finir la migration `apiRoute` (routes métier prioritaires)
```
Rôle à jouer : backend.

Contexte : 47 routes sur 121 n'utilisent pas encore le wrapper apiRoute
(lib/api-route.ts), en violation de .agents/skills/api-route-guard/SKILL.md. Traiter
en priorité les routes métier suivantes (ordre proposé, une tâche par groupe) :
  Groupe 1 : app/api/clients/** (route.ts, [id]/route.ts, [id]/detail, [id]/check-blocage,
             [id]/credit-limit, [id]/envoyer-rappel, [id]/solde, [id]/documents)
  Groupe 2 : app/api/products/** (route.ts, [id]/route.ts, [id]/stats, [id]/fiche-technique,
             [id]/variants, [id]/photo, [id]/fiches, [id]/fiches/[ficheId])
  Groupe 3 : app/api/categories/**, app/api/marques/**
  Groupe 4 : app/api/stock-mouvements/route.ts, app/api/notifications/route.ts,
             app/api/companies/route.ts, app/api/companies/[id]/route.ts
  Groupe 5 : app/api/users/** restantes (check-status, [id], me, me/password,
             resend-invitation, verify-email)

Pour chaque groupe :
1. Graphify sur les fichiers du groupe.
2. Migrer chaque route vers apiRoute.get/post/put/patch/delete en conservant EXACTEMENT
   la même logique métier et les mêmes permissions déjà en place (checkPermission actuel
   à retrouver dans le code existant, ne pas les deviner).
3. Rappel important : Product/Tiers/Categorie/Marque/Stock sont volontairement globaux
   (pas de companyId) — voir docs/wiki/audit-scope-multi-societe.md. Migrer vers apiRoute
   avec requireCompany: false pour ces routes (auth + permission uniquement), ne PAS
   ajouter de filtrage companyId qui casserait le comportement volontaire.
4. Pour app/api/auth/*, cron/*, setup/company : NE PAS migrer sans confirmation — lister-les
   explicitement dans le rapport de sortie comme "routes publiques/spéciales, raison : ...",
   conformément à la procédure décrite dans api-route-guard/SKILL.md.
5. any interdit, npm run lint + npx tsc --noEmit propres avant de clore chaque groupe.
6. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P1-6 — Générer DESIGN.md / PRODUCT.md
```
Rôle à jouer : frontend.

Tâche : DESIGN.md et PRODUCT.md n'existent pas à la racine du projet, ce que
frontend.md identifie comme la cause de l'incohérence visuelle entre modules.
1. Charger skill: "impeccable".
2. Lancer `impeccable init` pour capturer PRODUCT.md.
3. Lancer `impeccable document` pour générer DESIGN.md à partir du code existant,
   en traitant l'incohérence actuelle comme la base de l'audit, pas comme la cible.
4. Une fois généré, produire un résumé des écarts les plus visibles entre modules
   (ex. dashboard vs. reste de l'app) pour prioriser les futurs passages de
   `impeccable critique`/`audit` module par module.
5. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-7 — Nettoyage des `useEffect` non justifiés (module Effets en premier)
```
Rôle à jouer : frontend.

Contexte : 53 occurrences de useEffect dans 38 fichiers, quasi aucune n'a le commentaire
de justification requis par .agents/skills/state-boundaries/SKILL.md. Commencer par le
module avec la plus forte concentration : components/effets/ (nouvel-effet-client.tsx,
lettre-de-change.tsx, effet-detail-client.tsx) et components/produits/produit-form-page.tsx.

Pour chaque useEffect trouvé (grep -n "useEffect(" <fichier>) :
1. Déterminer s'il s'agit réellement d'une synchronisation avec un système externe non
   réactif (mesure DOM, API navigateur, souscription tierce) — seul cas légitime.
2. Si oui : ajouter le commentaire de justification explicite juste au-dessus.
3. Si non (data-fetching, état dérivé recopié, debounce réinventé) : remplacer par
   useQuery, un calcul dérivé au rendu (useMemo si coûteux), ou hooks/use-debounce.ts
   existant — ne jamais réimplémenter setTimeout/clearTimeout pour un debounce.
4. any interdit, npm run lint + npx tsc --noEmit propres.
5. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-8 — Extraire les mutations/queries inline vers des hooks dédiés
```
Rôle à jouer : frontend.

Contexte : plusieurs composants écrivent leurs useQuery/useMutation avec fetch() inline
au lieu de les extraire dans un hook sous hooks/, à l'inverse du pattern déjà en place
dans hooks/use-produits.ts, hooks/use-clients.ts, etc. Fichiers concernés en priorité :
components/effets/nouvel-effet-client.tsx, components/cheques/nouveau-cheque-dialog.tsx,
components/entreprises/entreprise-detail-client.tsx, components/produits/produit-form-page.tsx.

Pour chaque fichier :
1. Identifier chaque useQuery/useMutation inline et son fetch() associé.
2. Créer ou compléter un hook existant sous hooks/ (nommage cohérent avec l'existant,
   ex. hooks/use-effets.ts pour le module effets) qui encapsule query key, queryFn/
   mutationFn, et invalidation de cache.
3. Remplacer l'appel inline dans le composant par l'appel au hook.
4. Vérifier qu'aucune régression de comportement (mêmes query keys, même invalidation).
5. any interdit, npm run lint + npx tsc --noEmit propres.
6. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-9 — Migrer login-form.tsx et securite-settings-client.tsx vers useMutation
```
Rôle à jouer : frontend.

Tâche : components/auth/login-form.tsx et components/parametres/securite-settings-client.tsx
utilisent fetch() directement sans passer par TanStack Query, en violation de la règle
"tout état serveur DOIT passer par TanStack Query". Convertir les deux appels en
useMutation, avec gestion cohérente de isPending/erreur, et remplacer les toasts
associés par des toasts enrichis (description = message serveur), conformément au
point P2-13. any interdit, npm run lint + npx tsc --noEmit propres. Documenter dans
docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-10 — Découper `nouvel-effet-client.tsx` (1141 lignes)
```
Rôle à jouer : architecture pour la proposition de découpage, puis frontend pour
l'implémentation.

Tâche architecture :
1. Graphify sur components/effets/nouvel-effet-client.tsx pour identifier tous ses
   consommateurs et dépendances avant tout découpage.
2. Proposer un découpage en sous-composants/hooks cohérents (ex. : formulaire principal,
   logique de collision d'échéances [déjà un useQuery séparé visible en L91-94],
   sélection de documents liés [L192-196], logique de suggestion d'échéances [L308]),
   sans changer le comportement fonctionnel.

Tâche frontend (une fois le découpage validé) :
3. Implémenter le découpage proposé, en extrayant les useQuery inline identifiés en
   P2-8 vers des hooks dédiés au passage si pertinent pour éviter un double effort.
4. any interdit, useEffect avec justification, npm run lint + npx tsc --noEmit propres.
5. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-11 — Trancher sur `entity-dialog.tsx`
```
Rôle à jouer : architecture puis frontend.

Contexte : components/shared/entity-dialog.tsx (50 lignes) n'a aucun import ailleurs
dans le projet — composant partagé mort ou abandonné, pendant que chaque module
continue de créer son propre dialog (fournisseur-dialog.tsx, nouveau-client-dialog.tsx,
nouveau-produit-dialog.tsx, payment-dialog.tsx, nouveau-cheque-dialog.tsx...).

Tâche :
1. Lire entity-dialog.tsx et 2-3 dialogs existants représentatifs (fournisseur-dialog.tsx,
   nouveau-client-dialog.tsx) pour évaluer si entity-dialog.tsx peut réellement les
   remplacer sans perte de fonctionnalité.
2. Décision A (généraliser) : migrer progressivement les dialogs d'entité simples vers
   entity-dialog.tsx, un module à la fois, en vérifiant à chaque fois la Requirements
   Checklist du Governor pour ne rien perdre fonctionnellement.
   Décision B (supprimer) : si le composant est réellement obsolète/inadapté au besoin
   actuel, le supprimer et documenter pourquoi dans docs/wiki/CHANGELOG.md pour éviter
   qu'un futur agent ne le redécouvre et ne le réutilise par erreur.
3. Dans tous les cas, produire une recommandation explicite pour les prochains dialogs
   d'entité (créer un nouveau dialog vs. réutiliser) à ajouter dans docs/wiki/ ou
   frontend.md pour que ce ne soit plus un choix implicite.
```

### Prompt P2-12 — Remplacer les AlertDialog artisanaux par confirm-delete-dialog.tsx
```
Rôle à jouer : frontend.

Contexte : components/factures/factures-client.tsx et d'autres fichiers réimportent
AlertDialog (primitif shadcn) pour recréer une confirmation de suppression, alors que
components/confirm-delete-dialog.tsx existe déjà et est utilisé dans 9 autres modules.

Tâche :
1. Graphify sur components/confirm-delete-dialog.tsx pour lister tous ses usages actuels
   et confirmer son API (props attendues).
2. Lister tous les fichiers utilisant AlertDialog directement pour un cas de confirmation
   de suppression (pas les autres usages légitimes d'AlertDialog s'il y en a).
3. Remplacer chaque usage identifié par confirm-delete-dialog.tsx en conservant le
   comportement exact (libellés, callback de confirmation).
4. any interdit, npm run lint + npx tsc --noEmit propres.
5. Documenter dans docs/wiki/ + CHANGELOG.md.
```

### Prompt P2-13 — Wrapper de toast centralisé
```
Rôle à jouer : architecture pour la conception, frontend pour la migration.

Contexte : 141 appels toast.success/error dans le projet, seulement 24 avec description
et 3 avec action. Pas de wrapper centralisé.

Tâche architecture :
1. Concevoir lib/toast.ts (ou emplacement équivalent cohérent avec lib/) exposant au
   minimum notifySuccess(title, opts?) et notifyError(error, opts?: { description?,
   action?: { label, onClick } }), qui impose par défaut une description à partir du
   message d'erreur serveur (err.message) plutôt que de la rendre optionnelle à chaque
   appel.
2. Ne pas casser l'API de sonner déjà utilisée ailleurs — ce wrapper doit rester un fin
   enrichissement, pas une réécriture de sonner.

Tâche frontend :
3. Migrer les appels toast.error(...) des mutations les plus critiques en premier
   (paiements, factures, effets, chèques — modules à impact financier direct), puis
   étendre progressivement.
4. any interdit, npm run lint + npx tsc --noEmit propres.
5. Documenter dans docs/wiki/ + CHANGELOG.md, module par module au fur et à mesure
   de la migration (ne pas attendre la migration complète des 141 appels pour
   documenter).
```

### Prompt P3-14 — Tests sur la logique financière
```
Rôle à jouer : qa pour l'identification du périmètre, backend pour l'écriture des tests.

Contexte : seulement 2 fichiers de test (lib/__tests__/decimal.test.ts,
status-transitions.test.ts) pour tout le projet, alors que la logique financière
(Big.js, calculs de TVA/retenue, échéanciers d'effets, soldes clients) est le cœur
métier de l'application et n'a aucune garde-fou automatisé en dehors de ces 2 fichiers.

Tâche :
1. Graphify sur lib/ pour lister tous les modules de calcul financier existants
   (recherche de Big.js, calculs de TVA, retenue à la source, échéanciers).
2. Prioriser par criticité : calcul des montants de facture (HT/TVA/TTC/retenue),
   calcul des échéances d'effets, calcul du solde client (rapprochement avec
   docs/audits/produits-mouvements.md et les autres audits de module déjà réalisés
   pour repartir de leur cartographie plutôt que de la refaire).
3. Écrire des tests unitaires (vitest, déjà configuré) pour chaque fonction de calcul
   identifiée, avec des cas limites (montants à zéro, retenue à 100%, devises
   secondaires, arrondis Big.js).
4. any interdit dans le code de test également.
5. Documenter la couverture ajoutée dans docs/wiki/ + CHANGELOG.md.
```

---

*Fin de l'audit. Les données chiffrées ci-dessus ont été mesurées le 25 septembre 2026 sur l'archive fournie ; toute évolution du code depuis rendra certains chiffres légèrement obsolètes — les prompts du §6 demandent systématiquement à Graphify de reconfirmer l'état réel avant modification, conformément à la pipeline du projet.*
