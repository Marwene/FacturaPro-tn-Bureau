# Module : Dashboard & rapports

## Fonctionnalités

- **Tableau de bord** : statistiques globales, cartes de suivi (`stat-card`), vue echéances trésorerie.
- **Rapports** : rapports générés (`/api/rapports`, `/api/reports`), exports de données, seeds de rapports (`prisma/seed-reports.ts`). Page Server Component, client logic dans `components/rapports/rapports-main-client.tsx` + `rapports-client.tsx`.
- **Notifications** : alertes d'échéance, effets impayés/payés, lecture.
- **Recherche** : recherche globale (`/api/search`, `command-palette`).
- **POS** : point de vente.
- **Upload** : logo société via `POST /api/upload` (route orpheline côté front, mais exposée → durcie). Wrappée avec `apiRoute` (config `{}` : session seule, **aucune permission ajoutée** — la route n'en imposait aucune avant). Validation centralisée par `lib/upload-guard.ts` :
  - **MIME réel par magic bytes** du contenu (JPEG `FF D8 FF`, PNG `89 50 4E 47…`, GIF `GIF87a`/`GIF89a` — 6 octets exacts, WebP `RIFF`+`WEBP` offset 8, PDF `%PDF-` dans les 1024 premiers octets) — plus de confiance dans `file.type` (déclaré par le client) ni dans le nom de fichier ;
  - **whitelist par usage** : catégorie `image` = `image/jpeg|png|webp|gif` uniquement — **SVG et HTML rejetés** (fichiers servis publiquement sous `/uploads/logos/` → XSS stocké évité) ;
  - **taille 2 Mo** (`UPLOAD_LIMITS.logo`, cohérent avec `app/actions/companies.ts`) vérifiée **avant** `arrayBuffer()` (pas de bufferisation d'un fichier géant) ;
  - **extension dérivée du MIME détecté** (`image/jpeg→jpg`, `png→png`, `webp→webp`, `gif→gif`) — l'extension client (`file.name.split(".")`) n'est plus jamais utilisée ;
  - **containment `unlink`** (cycle de correction 2026-09-25) : `resolvePublicFilePath()` résout une URL publique stockée en base et retourne `null` si elle ne commence pas par `/uploads/` ou sort de `public/` (traversal `../`) → les 4 points de suppression des routes `photo`/`fiche-technique` alors **n'appellent plus `unlink`** (log bref, flux métier inchangé, aucun 500) ; les octets validés par `validateUpload()` (`bytes`) sont ceux réécrits au disque — une seule bufferisation, octets écrits = octets validés.
- **Tâches planifiées** : `/api/cron` (relances, rappels).

## Modèles de données (Prisma)

- `Notification`, `AppSettings` (alertes), agrégats issus des autres modules.

## Fichiers clés

- `app/api/dashboard/`, `app/api/rapports/`, `app/api/reports/`, `app/api/search/`, `app/api/upload/`, `app/api/cron/`
- `lib/upload-guard.ts` — validation d'upload partagée : `detectMime()` (sniffing magic bytes), `validateUpload()` (taille → MIME déclaré → contenu réel, rend les octets `bytes` validés), `isSafeUploadId()` (anti-traversal), `resolvePublicFilePath()` (containment des `unlink` sur URL DB), `UPLOAD_LIMITS` (`logo` 2 Mo / `productPhoto` 5 Mo / `fiche` 15 Mo)
- `app/api/notifications/`
- `components/stat-card.tsx`, `components/command-palette.tsx`
- `components/dashboard/dashboard-client.tsx` (client-side dashboard rendering with mouvements, stats, charts — `ChartSection` et `FiscalChartSection` chargés via `next/dynamic` pour réduire le bundle initial)
- `components/dashboard/dashboard-section-cards.tsx` (KPI cards: CA, créances, TVA, devis, nouveaux clients)
- `components/factures/floating-alert.tsx` (composant modal centré + FAB flottant pour BLs en attente de facturation — remplace l'ancien `pending-bl-section.tsx`)
- `components/layout/app-sidebar.tsx` (sidebar with badge indicators for factures, chèques, stock alerts)

## Migration `apiRoute` — P1-5 Groupe 4 : notifications (2026-09-27)

Les **2 handlers** de `app/api/notifications/route.ts` passent par le wrapper avec la config **`{}` (session seule)**. **Aucune permission ajoutée, aucune retirée** : les 2 handlers ne faisaient que `getSessionFromRequest` + 401 (ex-L8 / ex-L36) — la config reproduit donc exactement le comportement d'origine. Les données sont **personnelles, scopées `userId: session.id`** (jamais par société) → `requireCompany` sans objet.

| Méthode → config wrapper | Statuts / corps conservés |
| --- | --- |
| GET → `{}` (ex-L8) | 200 `{ notifications, total, nonLues }` (objet simple → `NextResponse.json` du wrapper) |
| PATCH → `{}` (ex-L36) | 200 `{ success: true }` ; le narrow `body as { ids?: string[]; all?: boolean }` (ex-L40) est conservé tel quel (**narrow de type, pas un `any`**) |

- **Justification de `{}`** : aucune permission n'est vérifiée aujourd'hui sur ces 2 handlers → **rien n'est ajouté**. **La cloche du sidebar (`components/layout/notifications-popover.tsx` L29) reste accessible à tous les rôles authentifiés** ; y ajouter une permission (ex. `stocks_mouvements:voir`) aurait été une **régression 403** pour les utilisateurs qui y ont accès aujourd'hui.
- `requireCompany` non activé : le scope est `userId`, pas `companyId` (`grep -rn "requireCompany\|companyId" app/api/notifications/route.ts` → **0**).
- Méthodes strictement identiques : `GET` (consommé L29 avec `?unread=true&limit=20`) et **`PATCH`** inchangés. Les 2 `try/catch` supprimés ne faisaient que `console.error` + 500 générique (couvert par le wrapper ; nuance du tag `[api]` au lieu de `[notifications/GET]` — cf. entrée CHANGELOG `groupe4-stock-notifs-companies/P1-5`).

## Lot E2a — body → `schema` sur PATCH notifications (2026-10-22)

`PATCH /api/notifications` déclare désormais `schema: markNotificationsReadSchema` (`lib/schemas/notification.ts` : `ids: string[]?`, `all: bool?`) dans sa config `apiRoute` : le body est parsé avant le handler (échec → **422** `{ error, issues, success: false }`) et les clés inconnues sont **STRIPées** (S-7). Le `body as { ids?: string[]; all?: boolean }` (cast documenté au lot P1-5) disparaît puisque le wrapper fournit `body` typé via `z.infer`. Le marquage reste strictement scopé `userId: session.id` dans le handler ; la config garde `authOnly: true` inchangé. Le `GET` n'a pas de body : inchangé. Entrée CHANGELOG `[2026-10-22] Backend (lot-e2a-schemas-identite/E)`.

## Migration `apiRoute` — P1-5 Groupe 6 : `rapports/inventaire` (2026-09-28)

| Fichier | Handler | Config wrapper | Statuts / corps conservés |
| --- | --- | --- | --- |
| `app/api/rapports/inventaire/route.ts` | GET | `{ permission: "produits:voir" }` (littéral ex-L14) | **200** `{ stats, alertes, ruptures, mouvements }` (objets `Big` : `valeurStock`/`coutTotal` en `.toFixed(3)`, `mouvementsEntree`/`mouvementsSortie` en `.toNumber()`) |

- **0 permission ajoutée, 0 retirée** : la config reprend littéralement la ligne `checkPermission(sessionUser.role, sessionUser.permissions, "produits:voir")` d'origine (ex-L14) ; le 401 (ex-L10-13) est désormais fourni par le wrapper.
- **`requireCompany` NON activé** : le handler ne lit ni n'écrit aucun `companyId` (le rapport stock est **global**, cf. `docs/wiki/audit-scope-multi-societe.md`).
- **Calculs `Big` intacts** : boucle produits (`prixHT × stockActuel`), boucle mouvements (`ENTREE`/`SORTIE`), `alertes`/`ruptures` (`CRITIQUE`/`RUPTURE`), troncatures `.slice(0, 20)` / `.slice(0, 50)` et `serializeDecimals` inchangés. La variable morte `const now = new Date();` (ex-L20) est **conservée telle quelle** (warning `no-unused-vars` préexistant, hors périmètre de ce lot).
- `sessionUser` → suppression (jamais lu après le 401/la permission) ; imports morts purgés (`getSessionFromRequest`, `checkPermission`, `NextRequest`). Le handler ne prend que `request` (aucun `session`/`params`/`companyId` utilisé).
- **Nuance du `catch` du wrapper (signalée, non corrigée)** : le 500 d'origine était `{ error: "Erreur serveur" }` **sans** `success: false` et taggé `[rapports/inventaire/GET]` ; le wrapper renvoie `errorResponse(error.message)` (message réel, `success: false` ajouté) taggé **`[produits:voir]`** — statut 500 inchangé. Idem pour les 401/403 : corps d'origine `{ error }` brut, corps wrapper `{ error, success: false }`.
- **Méthode strictement identique** : **GET**. **Consommateur inchangé** : `hooks/use-rapport-inventaire.ts:32` (`fetch(\`/api/rapports/inventaire?periode=${periode}\`)`, TanStack Query, `throw new Error("Erreur chargement")` sur `!res.ok` → **indifférent au corps**).

## Whitelist `cron/*` — Option C1 (2026-09-28, validée par l'utilisateur)

**Décision** : les 3 routes `app/api/cron/**` restent **sans wrapper `apiRoute`** et sont documentées comme « publiques, raison » conformément au skill `api-route-guard` §2 (« la route est légitimement publique (`auth/*`, `cron/*`, webhooks BCT) → la lister explicitement … pour que `qa` puisse la whitelister consciemment »). **Alternative C2 écartée** (mode opt-in `auth: "cron"` dans le wrapper) au profit de la recommandation C1 : **`lib/api-route.ts` est resté inchangé** (`md5=437726b8c3bb0c0d0f5463e292a1064f`) — **0 ligne de code applicatif modifiée**, tâche de documentation uniquement.

| Route (GET) | Auth actuelle (depuis le lot E4, 2026-10-23) | Pourquoi ne pas la wrapper |
| --- | --- | --- |
| `app/api/cron/check-echeances/route.ts` | `guardCronRequest(request, "check-echeances")` (`lib/cron-auth.ts`) : **échec fermé** — `CRON_SECRET` absente OU header ≠ `Bearer <valeur>` → **401 `{ error: "Non autorisé", success: false }` avant toute requête DB**. *(Avant E4 : `if (CRON_SECRET && auth !== \`Bearer ${CRON_SECRET}\`)` → route **ouverte** si la variable était absente.)* — **jamais de session** | Le wrapper impose `session?.id` → 401 (`lib/api-route.ts` L26-29) sans option publique : wrappée telle quelle = **401 permanent** → relances d'échéances mortes |
| `app/api/cron/check-echeances/relance-ecart-bc/route.ts` | idem `guardCronRequest(request, "relance-ecart-bc")` (même contrat 401, même helper partagé) — **jamais de session** | Idem : 401 du wrapper = relances d'écart BC mortes |
| `app/api/cron/tmm-bct/route.ts` | **Authentification AJOUTÉE par E4** : `guardCronRequest(request, "tmm-bct")` (même contrat de refus). *(Avant E4 : **aucune authentification** — `export async function GET()` sans lecture de header.)* | Déclenché par le **cron Vercel quotidien 02:00** (`vercel.json` : `{"path": "/api/cron/tmm-bct", "schedule": "0 2 * * *"}`) — le cron Vercel n'envoie aucune session → 401 wrapper = **rafraîchissement TMM BCT cassé** |

- **Pourquoi le wrapper serait cassant** : `createHandler` (`lib/api-route.ts` L26-29) exécute `const session = await getSessionFromRequest(request)` puis `if (!session?.id) { return … 401 }` **sans option publique**. Une route wrappée qui n'a jamais de session réelle renverrait 401 à **chaque** appel, quel que soit son propre contrôle `CRON_SECRET` — le wrapping ne reproduirait pas le comportement existant, il le **casserait** (relances effets + rafraîchissement TMM BCT).
- **Zéro ligne modifiée par la tâche C1 (2026-09-28)** : ni dans les 3 fichiers `cron/*`, ni dans `lib/api-route.ts`, ni dans `vercel.json`. *(Les 3 fichiers `cron/*` ont été modifiés ensuite par le **lot E4** — voir § ci-dessous — ; `lib/api-route.ts` et `vercel.json` sont toujours inchangés.)*
- Whitelist destinée au **QA** pour un retraitement conscient (skill `api-route-guard`, §2) ; registre consolidé dans `docs/wiki/auth.md` : **11 routes sans wrapper sur 121 (110 wrappées)** = 5 auth/users + 3 taux + 3 `cron/*` (**inchangé par E4** : la whitelist C1 porte sur l'absence de wrapper, pas sur l'absence de garde).

## Durcissement E4 — garde `cron/*` échec fermé (2026-10-23, audit §3 S-8)

**Problème (S-8)** : ① `cron/check-echeances` et `cron/relance-ecart-bc` testaient `if (CRON_SECRET && auth !== …)` → la route était **ouverte quand la variable n'était pas posée** ; ② `cron/tmm-bct` n'avait **aucune** authentification.

**Correctif (lot E4, Prompt E exigence 5)** — **les 3 routes restent hors wrapper** (Option C1 toujours valable : aucune session possible), elles partagent un helper dédié :

- **`lib/cron-auth.ts` (nouveau)** — `guardCronRequest(request, routeTag)` : relit `process.env.CRON_SECRET` **à chaque appel** (jamais capté à l'import) ; `CRON_SECRET` absente **OU** header `authorization` ≠ `Bearer <valeur>` → `NextResponse` **401 `{ error: "Non autorisé", success: false }`** (`errorResponse` de `lib/schemas.ts`), sinon `null` (= passe). Comparaison à **temps constant** (empreinte sha256 + `timingSafeEqual`). Le type `NextResponse | null` rend l'oubli du `return` impossible au compile-time.
- **Ordre garanti** : la garde est la **première instruction** de chaque handler → refus **avant toute lecture/écriture DB**.
- **Pas de fuite** : corps de refus **identique** dans les deux causes (secret absent / header invalide) — ni la valeur ni l'état de la variable ne sortent ; les causes ne sont distinguées qu'en **log serveur** (`lib/logger.ts`, `logger.warn`, sans valeur : `cause: "secret-non-configuré" | "header-autorisation-invalide"`).
- **Zéro régression** : le diff de chaque route ne touche **que** la garde + son import (le `try/catch`, les requêtes DB, les réponses 200/500 sont inchangés ; `vercel.json` et `lib/api-route.ts` **intacts**).
- **Tests** : `lib/__tests__/cron-auth.test.ts` (**26 tests**) — (a) sans `CRON_SECRET` → 401 + **0 appel Prisma/métier** ; (b) variable posée + header absent / mauvais secret / sans schéma `Bearer` / `Basic` → 401 ; (c) variable + bon header → la route **passe** (200 `{alerts,total}` / `{relances}` / `{success,tmm,date}` avec `prisma`, `refreshTMM`, `relancerAlertesEcartOuvertes` mockés) ; (d) corps de refus **byte-identique** entre les deux causes + log serveur sans valeur.

### ⚠️ Conséquence de déploiement

- **`CRON_SECRET` DOIT être posée dans les variables d'environnement du projet Vercel** (Settings → Environment Variables) **avant/au déploiement**. Le cron Vercel injecte automatiquement `Authorization: Bearer ${CRON_SECRET}` sur les chemins de `vercel.json` : c'est **l'unique consommateur en clair** de `GET /api/cron/tmm-bct` (quotidien 02:00).
  - **Sans `CRON_SECRET` côté Vercel → `cron/tmm-bct` renvoie 401 à chaque exécution** et le TMM BCT **ne se rafraîchit plus** : c'est l'échec fermé voulu par l'audit S-8, pas une régression — mais il faut donc vérifier la variable **après** ce déploiement.
  - La route `GET /api/tmm-bct` (POST/GET applicatif, session) et les routes de taux **ne sont PAS concernées** (Option A″, hors périmètre E4).
- `cron/check-echeances` et `cron/check-echeances/relance-ecart-bc` **ne figurent dans aucun `vercel.json`, script ni workflow du dépôt** — `grep -rn "check-echeances\|relance-ecart-bc" app lib scripts vercel.json` → **10 lignes, toutes dans les 2 routes, `lib/cron-auth.ts`, `lib/__tests__/cron-auth.test.ts`** (0 appelant) : **aucun consommateur en repo**, donc rien à reconfigurer ici. *(À ne pas confondre avec `GET /api/effets/check-echeances` — route **session** différente, consommée par `hooks/use-effets-echeances.ts`, hors périmètre E4.)* Tout planificateur externe (Vercel Cron ajouté plus tard, GitHub Action, appel `curl`) doit désormais envoyer `Authorization: Bearer <CRON_SECRET>` **et** la variable doit exister côté cible, sous peine de 401.
- Aucune valeur de secret n'apparaît dans le code, les tests, ce wiki ni le rapport — uniquement le **nom** de la variable.

## Notes

- Les rappels (J-15/10/5/J) utilisent `AppSettings.alerteEcheanceJours` et les drapeaux `rappel*Envoye` des effets.
- **Multi-société :** Les métriques stock (Valeur, Alertes, Rupture, Mouvements) et Nouveaux Clients sont globales (toutes sociétés). Un badge "Toutes sociétés" (inline, `bg-muted`, `text-[10px]`) est affiché sur chaque carte concernée pour lever l'ambiguïté. Le badge sidebar stock utilise un style distinct (`bg-muted` au lieu de `bg-foreground`) pour signaler sa nature globale. Les métriques CA, factures, créances, devis sont scopées à la société active.

## Hors périmètre — à décider

Passe de durcissement du **2026-09-25 limitée aux 4 routes API d'upload** (`/api/upload`, `products/[id]/photo`, `products/[id]/fiches`, `products/[id]/fiche-technique`). **Non modifié**, à arbitrer pour une passe suivante :

- `app/actions/upload.ts` (`uploadFile`) : **aucune limite de taille** + `subDir` lu côté client puis passé à `path.join(process.cwd(), "public", "uploads", subDir)` → **traversal possible** (écriture hors `public/uploads/`). Risque identique en lecture/suppression selon les appelants.
- `app/actions/companies.ts` (`uploadLogo`…) : validation maison (2 Mo + type) sans sniffing du contenu, doublon partiel de `lib/upload-guard.ts`.
- `app/actions/products.ts` (`uploadFicheTechnique`, `uploadProductPhoto`…) : idem (5/15 Mo, type déclaratif uniquement, pas de magic bytes). **Risque `unlink` traversal (le plus grave des écarts restants)** : les **5 appels `unlink(path.join(cwd, "public", <url DB>))`** de ce fichier (lignes 43, 66, 106, 129, 151 — remplacement et suppression de photo/fiche technique) ne passent pas par `resolvePublicFilePath()`. Un utilisateur avec `produits:modifier` peut enregistrer `photoUrl`/`ficheTechniqueUrl` = `../../../.env` via `PUT /api/products/[id]` (champs `z.string()` sans format de contrôle dans `lib/schemas.ts`, lignes 69-70) puis déclencher la suppression → **`unlink` hors de `public/`** (fichier arbitraire supprimé). Correction : réutiliser `resolvePublicFilePath()` de `lib/upload-guard.ts` (ne pas dupliquer la logique).
- `app/api/products/[id]/fiches/[ficheId]/route.ts` (DELETE d'une fiche) : route **hors liste des 4** confirmée par le Governor — n'utilise pas `apiRoute` et supprime un fichier via `path.join(cwd, "public", fiche.url)` (url en base, non revalidée) — **suppression via URL DB sans passer par `resolvePublicFilePath()`** (même écart `unlink` traversal que `app/actions/products.ts`).

Aucune de ces server actions ni routes n'a été touchée : le périmètre de cette tâche était strictement les 4 routes API. Réutiliser `lib/upload-guard.ts` pour les aligner sans dupliquer la logique de sniffing.

## P2-7 Lot 4 — command-palette (2026-09-28)

Lot 4 du nettoyage `P2-7` (audit `AUDIT-FACTURAPRO.md` §6) sur **`components/command-palette.tsx` uniquement** — 0 autre fichier code, 0 changement visuel, 0 réorganisation JSX, 0 nouveau composant. Les **3 `useEffect` non justifiés** sont traités site par site ; l'effet raccourci clavier (ex-L125) reste **intact**.

1. **ex-L85 — data-fetching (`fetch /api/search`) → `useQuery` TanStack** : `queryKey: ["search", debouncedQuery, currentModule, selectedModule]` reprend **les 3 dépendances exactes** de l'ancien effet (mêmes déclencheurs, **aucune clé distincte ajoutée** — l'URL ne dépend que de `q`/`module`, le `selectedModule` dupliquait déjà les déclencheurs) ; `enabled: debouncedQuery.trim().length > 0` = sa garde exacte ; `placeholderData: (prev) => prev` = l'ancien effet gardait les résultats précédents pendant le fetch ; `staleTime: 0` = l'ancien effet refaisait l'appel à chaque changement de dépendances (le défaut `MEDIUM` = 2 min du provider couperait ces fetchs). `queryFn` : construction des params identique + `handleApiResponse<{ groups: SearchGroup[] }>` (pattern des hooks frères `hooks/use-effets.ts`). La réception (`setGroups` + recentrage du module, ex-L103-109) devient un **bloc d'ajustement au rendu** déclenché par `dataUpdatedAt`/identité de `groups` (mêmes moments que l'ancien `.then`) ; un second ajustement `lastGroups` conserve les derniers résultats valides quand un fetch échoue (l'ancien `.catch` ne réaffectait pas `groups`).
2. **ex-L120 — reset de l'index de sélection → dérivation au rendu** : `useState(0)` remplacé par `nav { groups, module, updatedAt, index }` + calcul direct `nav.groups === groups && nav.module === selectedModule && search.dataUpdatedAt <= nav.updatedAt ? nav.index : 0`. Mêmes déclencheurs que l'ancien effet `[selectedModule, groups]` ; `dataUpdatedAt` détecte chaque arrivée de résultat **même quand TanStack préserve l'identité du tableau** (partage structurel) ; l'inégalité `<=` ignore la remise à 0 de `dataUpdatedAt` à la transition de clé pendant le fetch — l'ancien effet ne resetait pas l'index pendant le fetch non plus. Les flèches ↑/↓ écrivent via `storeNav(index)` avec exactement les mêmes règles de boucle (max ↔ 0) que l'ancien `setSelectedItemIndex`.
3. **ex-L138 — reset d'état + focus → SPLIT effectif** : la branche reset (`setQuery("")`, `setSelectedModule(null)` ; `setGroups([])` devient mort car `groups` est dérivé de `hasSearch`) passe en **bloc d'ajustement au rendu** sur `open` — mêmes dépendances que l'ancien effet (pattern `components/effets/apercu-effet-dialog.tsx` L115-125) ; le **focus DOM impératif reste dans un `useEffect` réduit au seul focus+select**. **Justification du focus conservé** : au rendu où `open` bascule, l'input n'est pas encore monté (`ref` null) et le focus doit attendre les **50 ms** que le focus-trap Radix se pose ; un ref callback s'exécuterait au commit **sans** ce délai (décalage de comportement) — le rendu seul ne peut pas le faire de façon fiable. `clearTimeout` ajouté à la fermeture : l'ancien timer pouvait rejouer un focus sur un dialogue en cours de fermeture.
4. **ex-L125 — raccourci clavier (Ctrl+Espace / Escape) : INTACT**, contenu byte-identique, `window.addEventListener` + cleanup.

**Comportement conservé** : mêmes déclencheurs de requête (debounce 350 ms, garde `trim()`, URL `q`/`module` identique), même délai perçu, même clavier (↑/↓ avec bouclage, Entrée), même focus initial (50 ms), mêmes résultats, mêmes états loading (`isFetching` ≡ ancien `loading`) / empty / erreur. `grep -n "useEffect("` → **2 lignes** : raccourci clavier (intact) + focus réduit justifié — **la case « exactement 1 ligne » de la checklist est incompatible avec un L125 maintenu intact + un focus conservé « si conservé » (checklist 3) — écart signalé** (même procédé que le Lot 2).

## P2-7 Lot 3 — compteurs devis fraîchis à la lecture (2026-09-28)

Lot 3 de `P2-7` : le `GET /api/dashboard` appelle désormais `expireDueQuotes(prisma, companyId)` (nouvelle lib `lib/quote-expiry.ts`, prédicat verbatim `ENVOYEE`/`BROUILLON` + `dateExpiration <= now` → `EXPIREE`) **en tête du handler, avant les agrégats** — les compteurs devis du dashboard (`devisCount`, `devisMontantTotal`, `devisTauxConversion`) sont donc calculés sur un état où les devis échus sont déjà passés `EXPIREE`, à **chaque** GET, au lieu de rester périmés jusqu'à l'ouverture de /devis (ancien déclencheur client `useExpireQuotesOnMount`, supprimé). Couverture nouvelle assumée, **aucun changement de réponse HTTP** (le count d'expiration n'est pas exposé), aucune nouvelle route, 0 changement visuel, 0 changement Prisma ; même appel ajouté en tête des `GET /api/quotes` et `GET /api/quotes/[id]` — voir section « P2-7 Lot 3 » dans `docs/wiki/devis.md`.
## Lot H vague W4 — recherche globale vers `hooks/use-global-search.ts` (2026-10-24)

- `components/command-palette.tsx` : le `useQuery` inline (ex-`fetch /api/search`, migré en L85 par le lot P2-7) est déplacé dans **`useGlobalSearch(deferredQuery, currentModule, selectedModule)`** (`hooks/use-global-search.ts`, clé via `queryKeys.search.global(...)`) — `enabled` (`query.trim().length > 0`), `placeholderData: (prev) => prev` et `staleTime: 0` repris à l'identique.
- Seul le transport bouge : le rendu, les conditions d'ouverture, le raccourci Ctrl+Espace, les 2 `useEffect` conservés (listener `keydown`, focus DOM après 50 ms — justifiés dans le fichier) et les blocs d'ajustement au rendu (`lastGroups`, `prevAdjust`, `prevOpen`, `nav`) sont intacts.
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
