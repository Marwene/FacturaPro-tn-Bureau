# Module : Authentification & utilisateurs

## Fonctionnalités

- **Connexion** (NextAuth v5) avec sessions JWT, comptes OAuth, tokens de vérification.
- **Bootstrap (premier lancement)** : à l'accès à `/login` ou `/register`, le serveur vérifie s'il existe un administrateur (`lib/bootstrap.ts`). Si aucun admin → redirection vers `/register`. Si un admin existe → `/login`, et `/register` redirige vers `/login`. L'inscription publique est fermée dès qu'un admin existe (403).
- **Étape 1 — Compte administrateur** (`/register`) : création du premier compte **ADMIN sans entreprise**, code de vérification envoyé par email. Redirection vers `/verify-email`.
- **Vérification email** : `verificationCode`, page `/verify-email`, renvoi de code via `/api/auth/resend-code`. La connexion est **bloquée tant que l'email n'est pas vérifié** (vérifié dans `authorize` + message dans le formulaire de login).
- **Étape 2 — Première société** : après login, si l'utilisateur n'a pas de société (`companyId` null), l'application redirige vers `/setup/company` — formulaire complet (nom, matricule fiscal, adresse, ville, code postal, tél, email, site web, RIB, banque, type, devise, TVA, FODEC, préfixes, format année). Création via `/api/setup/company` (transaction : société + lien + `companyId` principal). Le token JWT est resynchronisé depuis la base à chaque appel.
- **Invitations** (`/api/users`) : création d'utilisateurs par un admin, envoi d'email avec code de vérification.
- **Permissions** : `role` (ADMIN/USER) et liste `permissions` par utilisateur, vérifiées via `lib/permissions.ts`.

## Modèles de données (Prisma)

- `User`, `Account`, `Session`, `VerificationToken`, `UserCompany`, `Notification`.
- `User.companyId` est **optionnel** (`String?`) : permet au premier admin d'exister avant la création de la société.

## Fichiers clés

- `lib/bootstrap.ts` — helper `hasAdmin()` (bootstrap)
- `app/(auth)/login/page.tsx`, `components/auth/login-form.tsx` — connexion (guard serveur ; React Hook Form + Zod, `Alert` destructive inline + toast titré + compte à rebours rate-limit — lot C3) ; **guard conforme au marqueur** (2026-10-20) : la redirection « déjà authentifié » n'a lieu que si `markerSatisfied` (helper partagé) est vrai — session sans `__session-marker` conforme → rend le formulaire (correctif de boucle /login ↔ repli)
- `lib/session-marker.ts` — `__session-marker` httpOnly signé (JWS HS256, séparation de domaine, `bind` lié aux **claims stables du jeton décodé** : `${id}|${rememberMe === false}` — voir § « Correctif `bind` du marqueur » 2026-10-21) + **`markerSatisfied(cookies: CookieReader, source, token)`** : règle unique de conformité du marqueur, extraite de `proxy.ts` (2026-10-20) et partagée avec `app/(auth)/login/page.tsx` — `rememberMe !== false` → true ; sinon marqueur signé et lié aux claims du jeton réellement lu
- `app/(auth)/login/login-action.ts` — **Server Action** `loginAction` (C2) : `signIn("credentials")` côté serveur + cookie `__session-marker` httpOnly signé dans la même réponse ; **décode le JWT** (`decodeSessionToken`) pour construire le `bind` et **n'échoue jamais une connexion** si le décodage échoue (log `console.error` + marqueur absent → re-login propre au prochain passage de `proxy.ts`)
- `lib/safe-internal-path.ts` — **source unique** de validation des `callbackUrl` (anti open-redirect, correctif QA 2026-10-14) : résolution WHATWG + comparaison d'origines, remplace les 3 copies défaillantes (test de chaîne contournable par `/\` et tabulation)
- `hooks/use-login.ts` — mutation de connexion `useLogin()` : appelle `loginAction` puis enchaîne les jalons réels de l'écran de progression (C3 ; remplace l'union `LoginResult` de P2-9) ; **garde-fou de navigation post-login** (20 s, échec structuré `navigation_failed`) — voir § « Garde-fou de navigation post-login »
- `components/auth/auth-progress-screen.tsx` — écran de progression plein écran pendant le login (C3)
- `lib/stores/auth-progress-store.ts` — store Zustand de progression (`phase` / `percent` / `label` / `error`, C3)
- `hooks/use-auth.ts` — mutations partagées du parcours d'auth : register / verify-email / resend-code (C3)
- `hooks/use-dashboard.ts` (`dashboardQueryOptions`) et `hooks/use-user-companies.ts` (`userCompaniesQueryOptions`) — options partagées `useQuery` / `prefetchQuery`, réutilisées par le préchargement du login (C3)
- `app/(auth)/register/page.tsx`, `components/auth/register-form.tsx` — création du compte admin (guard serveur)
- `app/(auth)/verify-email/page.tsx` — vérification email → redirection `/login`
- `app/(setup)/setup/company/page.tsx`, `components/setup/company-setup-form.tsx` — onboarding société
- `app/api/auth/register/route.ts` — inscription bootstrap (ADMIN + code + email)
- `app/api/auth/resend-code/route.ts` — renvoi du code de vérification
- `app/api/setup/company/route.ts` — création de la première société + lien utilisateur
- `app/api/users/route.ts` — gestion des utilisateurs (CRUD + invitations, réservé ADMIN)
- `app/api/users/check-status/route.ts` — statut du compte (désactivé / email non vérifié) — **route laissée en place mais n'est plus appelée depuis le client depuis le lot C3** (2026-10-14) : les 4 codes d'erreur (`invalid_credentials` / `deactivated` / `unverified` / `rate_limited`) sont désormais renvoyés par la Server Action `loginAction` (C2)
- `lib/auth.ts` — NextAuth (authorize bloque email non vérifié ; jwt resynchronise companyId/permissions/emailVerified depuis la base)
- `lib/session.ts` — `getSessionFromRequest` (décodage salt dérivé + règle `lastActivity` + relecture DB actif/role/permissions avec cache 30 s — lot B1), `resolveCompanyId`
- `lib/session-token.ts` — source unique de lecture du cookie de session + salt JWT dérivé du nom du cookie lu (S-1, lot B1)
- `lib/session-cache.ts` — cache mémoire court (TTL 30 s) des snapshots `{actif, role, permissions}` + `invalidateUserSessionCache` (S-3, lot B1)
- `lib/__tests__/session-token.test.ts` — tests S-1/S-3 (16 tests, 0 DB)
- `lib/types/user.ts` — `SerializedUser`
- `hooks/use-users-mutations.ts` — mutations utilisateurs (create/update/delete/resendInvitation, typé avec `SerializedUser`)
- `app/layout.tsx` — layout racine : ordre **obligatoire** des providers `ThemeProvider > QueryProvider > SessionProvider > TooltipProvider` (voir § « Correctif 500 `/login` » 2026-10-21)
- `app/(app)/layout.tsx` — redirige vers `/setup/company` si `companyId` absent
- `lib/mail.ts` — templates d'emails (invitation, vérification, statut)
- `lib/permissions.ts` — garde de permissions
- `lib/rate-limit.ts` — rate limiting des routes publiques (fenêtre fixe PostgreSQL, seuils, `clientIp`, réponses 429)
- `lib/prisma.ts` — client Prisma (adapter PostgreSQL, error handling avec validation DATABASE_URL)

## Garde-fou de navigation post-login (correctif « écran figé à 95 % »)

**Problème** : après un login valide, `hooks/use-login.ts` posait 95 % puis déclenchait `router.replace(redirectTo)` **sans attendre** l'issue de la navigation ; `login-form.tsx` affichait l'écran de progression tant que `isPending || authCompleted`. Tout échec ou extrême lenteur de cette navigation (compilation Turbopack à froid, RSC qui ne se résout jamais, erreur de rendu de la route cible) laissait l'utilisateur bloqué à 95 %, sans message ni retour arrière.

**Comportement actuel** (`hooks/use-login.ts`) :

- La mutation **attend l'engagement réel** de la navigation via `awaitNavigationCommit(fromHref, NAVIGATION_TIMEOUT_MS)` : elle sonde `window.location.href` (100 ms) jusqu'à ce que l'App Router ait commité le nouvel état (signal public d'engagement — `router.replace()` de l'App Router Next 16 est `void`, il ne renvoie aucune promesse, donc `await router.replace(...)` ne serait pas un vrai garde-fou).
- **Délai** : `NAVIGATION_TIMEOUT_MS = 20_000` (constante exportée), volontairement généreux (rendu de la route cible + compilation à froid en dev).
- **Comparaison à l'URL de départ**, pas à la cible : une redirection serveur légitime post-login (`/setup/company`) ne doit pas être comptée comme un échec.
- **Chemin d'échec** (timeout ou throw synchrone du routeur) : échec **structuré** `{ ok: false, code: "navigation_failed", message }` (aucun `throw` muet) + `setError` du store → le formulaire de connexion se recharge avec l'`<Alert variant="destructive">` (titre « Redirection interrompue ») + le toast `notify.error`, et le bouton redevient actif pour une nouvelle tentative. `authCompleted` est remis à `false` au début de chaque tentative (exigence : jamais `true` si la navigation a échoué).
- **La navigation en cours n'est jamais annulée** : si elle finit par aboutir après le délai, la route cible s'affiche normalement (le formulaire est démonté).
- **Chemin nominal inchangé** : mêmes pourcentages, mêmes libellés, même écran de progression, même `router.replace` (et non `push`).
- Le store `lib/stores/auth-progress-store.ts` reste **pur état** (aucun fetch/timer) : seule son **extension de type** `AuthProgressError["code"] |= "navigation_failed"` a été ajoutée.

Fichiers : `hooks/use-login.ts`, `components/auth/login-form.tsx`, `lib/stores/auth-progress-store.ts` (type uniquement).

> ⚠️ **Correctif 2026-10-21 — la cause racine du symptôme « Redirection interrompue » *reproductible à chaque tentative* n'était PAS cette navigation** : c'était le `bind` du `__session-marker` (empreinte de la valeur exacte du cookie), rendu invalide par la rotation du JWT Auth.js dès le jalon `useSession().update()` (30 %) → `proxy.ts` supprimait les cookies et rebondissait sur `/login` à URL finale identique → garde-fou 20 s déclenché. **Le garde-fou 20 s est conservé tel quel** : il continue de protéger des vrais hangs (compilation à froid, RSC qui ne se résout pas, erreur de rendu de la cible) décrits ci-dessus. Voir la section suivante.

## Correctif — `bind` du marqueur sur claims stables / rotation Auth.js (2026-10-21)

**Bug** : « connexion bloquée à 95 % / **Redirection interrompue** », reproductible à **chaque** tentative, uniquement avec « Se souvenir de moi » **décoché** (`rememberMe = false`).

**Cause racine** : `bind` du `__session-marker` = `SHA-256(valeur exacte du cookie de session)`. Or Auth.js **re-signe le JWT à chaque lecture de session** (`@auth/core/lib/actions/session.js:40-48`, « Refresh JWT expiry by re-signing it ») et `lib/auth.ts:152` y écrit `lastActivity` → la **valeur du cookie change** dès le jalon `useSession().update()` (**30 %** de la progression, aller-retour réel sur `/api/auth/session`) :

1. `verifySessionMarker` → `false` (empreinte obsolète) ;
2. `proxy.ts:95-108` supprime les **4 cookies** d'auth et rebondit sur `/login?callbackUrl=X` ;
3. l'URL finale est **identique à l'URL de départ** → `window.location` ne bouge pas → `awaitNavigationCommit` ne détecte aucun engagement → garde-fou 20 s de `hooks/use-login.ts` → **« Redirection interrompue »** (symptôme = navigation ; racine = marqueur).

**Correctif (Option 1 validée par l'utilisateur)** :

- **Nouvelle sémantique du `bind`** : `tokenBinding` porte désormais les **claims stables** `${token.id}|${token.rememberMe === false}` via `canonicalBinding` (`lib/session-marker.ts:112-117`) — sérialisation sans ambiguïté (`id` = cuid/uuid sans `|`, flag réduit à un booléen littéral). La rotation du JWS étant **inévitable**, le lien porte sur l'identité (id + `rememberMe`) et non sur l'empreinte du jeton.
- **Signatures API** : `createSessionMarker(token)` / `verifySessionMarker(marker, token)` reçoivent désormais le **JWT décodé** (plus la chaîne brute). `markerSatisfied(cookies, source, token)` **garde sa signature** → **`proxy.ts` et `app/(auth)/login/page.tsx` inchangés**.
- **`app/(auth)/login/login-action.ts`** : décode le jeton lu (`decodeSessionToken`) pour construire le `bind`, et **n'échoue jamais une connexion** si le décodage échoue (2 gardes `console.error` + retour sans marqueur → re-login propre au prochain passage de `proxy.ts`).
- **Crypto inchangée** : JWS compact **HS256**, clé HMAC dérivée `SHA-256("facturapro:session-marker:v1:" ‖ AUTH_SECRET)` (séparation de domaine), **aucun `exp`** (durée de vie portée par le session cookie lui-même), issuer `facturapro-session-marker`.
- **Séparation des utilisateurs préservée** : un marqueur d'un **autre utilisateur** → `false`, un **flip `rememberMe`** → `false` (le JWT reste signé par Auth.js avec `AUTH_SECRET`, dont dérive la clé du marqueur).

**Test pivot** : marqueur créé sur `token_v1` → **satisfait sur `token_v2`** (rotation Auth.js, mêmes claims) — verrouille la résilience à la rotation. Tests de séparation associés (autre utilisateur → false ; flip `rememberMe` → false).

**Écart de comportement assumé (pas de chemin legacy)** : les marqueurs signés sous l'ancienne empreinte (`SHA-256(valeur exacte du jeton)`) sont rejetés → **chaque utilisateur connecté en `rememberMe = false` avec un ancien marqueur devra se reconnecter une fois** au déploiement. Aucun mécanisme de migration n'a été ajouté.

**Vérifications (2026-10-21, sorties exactes)** : `npx tsc --noEmit` → **0 erreur** ; `npm run lint` → **397 (35 errors, 362 warnings)** = baseline ; `npx vitest run` → **22 fichiers / 369 tests** ; tests dédiés au marqueur → **38 verts**. STEP 5 : `graphify update .` → graphe **9 335 nœuds**.

**Fichiers** : `lib/session-marker.ts` (`canonicalBinding`, `tokenBinding`, `createSessionMarker`, `verifySessionMarker`), `app/(auth)/login/login-action.ts`, `lib/__tests__/session-marker.test.ts`, `lib/__tests__/proxy-authz.test.ts`. Inchangés : `proxy.ts`, `app/(auth)/login/page.tsx`, `hooks/use-login.ts`.

## Rate limiting

Protection des **5 endpoints publics d'authentification** contre le brute-force et le spam, sans aucune dépendance npm nouvelle.

| Endpoint | Clés | Seuils (constantes exportées de `lib/rate-limit.ts`) |
|---|---|---|
| `POST /api/auth/[...nextauth]` (connexion) | IP au niveau de la route **+** compte dans `authorize()` | IP 15 / 5 min (`NEXTAUTH_IP_LIMIT`) ; compte 10 / 15 min (`LOGIN_ACCOUNT_LIMIT`, **remis à zéro au login réussi**) |
| `POST /api/auth/register` | IP | 5 / heure (`REGISTER_IP_LIMIT`) |
| `POST /api/auth/resend-code` | IP + email | IP 10 / h (`RESEND_CODE_IP_LIMIT`) ; email 5 / h (`RESEND_CODE_EMAIL_LIMIT`) |
| `POST /api/users/check-status` | IP | 30 / 5 min (`CHECK_STATUS_IP_LIMIT`) |
| `POST /api/users/verify-email` | IP + email | IP 15 / 15 min (`VERIFY_EMAIL_IP_LIMIT`) ; email 10 / 15 min (`VERIFY_EMAIL_EMAIL_LIMIT`) |

- **Clés** : `${scope}:${dimension}:${identifiant}` via `rateLimitKey()` (email trimé/minuscules, IP normalisée). Ex. `login:account:user@x.tn`, `nextauth:ip:203.0.113.5`.
- **Mécanisme — fenêtre fixe en PostgreSQL** : modèle `RateLimitBucket` (table `rate_limit_buckets`, migration `20260925212657_add_rate_limit_buckets`). Début de fenêtre aligné sur `floor(now / windowMs) * windowMs`. Incrément = **un seul upsert atomique** `INSERT … ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "windowStart" = EXCLUDED."windowStart" THEN count+1 ELSE 1 END … RETURNING count` → pas de TOCTOU. L'état est partagé entre instances serverless (Vercel) via la seule base déjà utilisée par `authorize()`.
- **Stock injectable** : `interface RateLimitStore { increment, clear, purgeOlderThan }` — store par défaut Prisma (import paresseux `./prisma`), store fake en mémoire injecté dans les tests (`lib/__tests__/rate-limit.test.ts`, 13 tests, 0 DB).
- **Fail-open** : toute erreur de store → `console.warn` bref + requête autorisée (si la DB tombe, `authorize()` échoue déjà).
- **Purge opportuniste** : au plus 1 `DELETE … WHERE "windowStart" < now() - 24h` toutes les 5 minutes (compteur en mémoire de module). Pas de cron.
- **Bloqué** → `429` + header `Retry-After` + `errorResponse(...)` (`{ error, success:false }`) via `rateLimitResponse()`. Dans `authorize()`, un compte bloqué retourne `null` **sans message distinctif** (anti-énumération). Aucun status/shape existant modifié hors ajout du 429.
- **`apiRoute` non applicable (justification)** : `lib/api-route.ts` impose `session?.id` → 401. Ces 5 endpoints sont **publics par nature** (connexion, inscription, renvoi/verification d'email, check-status — appelés sans session) : les wraper avec `apiRoute` les rendrait inutilisables. `lib/api-route.ts` n'a pas été modifié (pas de flag `public`), et rien n'a été réimplémenté à la main (ces routes n'avaient/ont pas d'auth). Elles sont listées publiquement ici pour la whitelisting consciente du QA (skill `api-route-guard`, §2).
- **Alternatives écartées** : *Redis/Upstash* → nouvelle dépendance npm + nouvel infra à opérer (aucune clé REDIS/UPSTASH dans `.env`) ; *in-memory* → état par instance serverless (cold start, multi-instances non partagé).
- ⚠️ **Hypothèse de topologie IP** : extraction via le 1er saut de `x-forwarded-for` — valable car Vercel écrase ce header (doc officielle, anti-spoofing). À revoir si un CDN/proxy est placé devant Vercel (→ header dédié du provider / Verified Proxy) ou en self-host (XFF piloté par le client).
- ⚠️ **Fallback `"unknown"`** : si aucun header IP n'est présent, tous les clients partagent le même compteur `…:ip:unknown` → la limite IP se comporte comme un plafond global. Les dimensions par compte/email restent inchangées.
- **PII** : l'identifiant (email) est stocké en clair dans la clé primaire de `rate_limit_buckets` (nécessité d'un lookup direct). Accepté pour ce volume ; alternative ultérieure : SHA-256 de l'identifiant dans la clé.
- **Bornage des clés** : identifiant normalisé (trim + minuscules) puis tronqué à **254** caractères (longueur max email RFC 5321), clé finale tronquée à **500** caractères — la PK reste bornée même si le corps de requête n'est pas validé. Normalisation déterministe (2 entrées identiques → même clé).

## Migration `apiRoute` — P1-5 Groupe 5 (2026-09-28)

Les **4 fichiers restants** de `app/api/users/**` (7 handlers) ont été migrés vers le wrapper `lib/api-route.ts` (audit transverse `P1-5`, dernier groupe). `app/api/users/route.ts` était **déjà wrappé** (inchangé).

| Fichier | Handler | Config | Statuts / corps conservés |
|---|---|---|---|
| `app/api/users/[id]/route.ts` | GET | `{}` | **404** « Utilisateur introuvable » ; **200** `{ user }` (aucune permission à l'origine, session seule) |
| `app/api/users/[id]/route.ts` | PATCH | `{}` | **403** « Accès refusé » (rôle ADMIN **dans** le handler) ; **200** `{ user }` |
| `app/api/users/[id]/route.ts` | DELETE | `{}` | **403** « Accès refusé » (ADMIN) ; **400** « Vous ne pouvez pas supprimer votre propre compte » (`id === session.id`) ; **200** `{ success: true }` |
| `app/api/users/me/route.ts` | GET | `{}` | **200** `{ user }` |
| `app/api/users/me/route.ts` | PATCH | `{}` | **200** `{ user }` (`name`/`email` seulement) |
| `app/api/users/me/password/route.ts` | PATCH | `{}` | **400** « Tous les champs sont requis » · **400** « Le nouveau mot de passe doit contenir au moins 6 caractères » · **400** « Compte OAuth — modification du mot de passe non disponible » · **400** « Mot de passe actuel incorrect » ; **200** `{ success: true }` |
| `app/api/users/resend-invitation/route.ts` | POST | `{}` | **403** « Accès refusé » (ADMIN) ; **400** « ID utilisateur requis » ; **404** « Utilisateur introuvable » ; **200** `{ success: true }` |

- **0 permission ajoutée, 0 retirée** : le wrapper fournit exactement le 401 d'origine (`errorResponse("Non authentifié")`) ; aucune de ces routes ne l'appelait (`checkPermission` absent des 4 fichiers), la config est donc `{}` partout. Le 401 manuel (`getSessionFromRequest` + `NextResponse.json`) a été supprimé des 7 handlers.
- **Logique métier intouchée** : `bcrypt.hash(pw, 12)` si `≥ 6`, remplacement des affectations `userCompany` (`deleteMany` + `createMany`), les 4 validations 400 du mot de passe. `sendMail({…})` du PATCH `users/[id]` reste **sans `await`** (fire-and-forget, ex-L105 — ne pas y ajouter d'`await`, sinon le `catch` du wrapper transformerait une erreur SMTP en 500) ; `sendMail` de `resend-invitation` reste **avec `await`** (ex-L42).
- **`params` résolus par le wrapper** : `const { id } = params;` **sans `await`** (l'origine faisait `await params`). Méthodes strictement identiques : GET/PATCH/DELETE, GET/PATCH, PATCH, POST.
- **Note rôle ADMIN** : `RouteConfig` (`lib/api-route.ts`) n'a **pas** d'option rôle (à l'époque : `permission` / `requireCompany`) → les 3 checks `session.role !== "ADMIN"` restent **dans** les handlers, sur `session` (ex-`sessionUser`). *(État actuel depuis le lot E1 : `permission` **ou** `authOnly: true` + `requireCompany` / `schema` / `query` — toujours aucune option rôle, voir § Durcissement lot E1.)*
- ~~**Nuance du `catch` du wrapper (signalée, non corrigée)** : le `catch` renvoie `errorResponse(error.message)` (message réel, pas « Erreur serveur ») au lieu du 500 générique des `try/catch` supprimés.~~ → **CORRIGÉ le 2026-10-22 (lot E1)** : le `catch` renvoie désormais `{ error: "Erreur serveur", requestId }` (jamais `error.message`) et journalise le détail sous le même `requestId` — voir § Durcissement `apiRoute` lot E1.
- **`requireCompany` non activé** : contrairement à `app/api/users/route.ts` wrappé avec `requireCompany: true` (qui lit `where: { companyId }` et écrit `companyId` à la création), **aucun de ces 4 handlers ne lit ni n'écrit `companyId` de contexte** : profil propre (`session.id`), user par `id`, affectations gérées via le champ `body.companyIds`. `grep -rn "companyId" <4 fichiers>` → **5 lignes, toutes préexistantes et non liées au wrapper** : `companyId: true` (2×, champs de `select`), `body.companyIds` (3×, corps de requête — dont `companyId: cid` construit depuis le `body`). Le wrapper ne résout donc pas la société pour ces routes (`companyId = ""` jamais lu).
- **Consommateurs inchangés** (aucun `.tsx`/hook modifié) : `hooks/use-users-mutations.ts` (PATCH `users/[id]` L67, DELETE L104, POST `resend-invitation` L133), `components/parametres/profil-settings-client.tsx` (GET `users/me` L24, PATCH L38), `components/parametres/securite-settings-client.tsx` (PATCH `users/me/password` L31).

### Décision Option A (2026-09-28, validée par l'utilisateur)

**`app/api/users/check-status/route.ts` et `app/api/users/verify-email/route.ts` sont laissées MANUELLES (non wrappées), zéro ligne modifiée.**

- **Raison** : ces 2 endpoints sont **publiques par conception** — appelés pré-auth depuis `components/auth/login-form.tsx:33` et `app/(auth)/verify-email/page.tsx:32`, avec rate-limit IP/email dans `lib/rate-limit.ts` (L72-79). Le wrapper impose `session?.id` → 401 : les wraper casserait la connexion et la vérification d'email. Justification écrite de longue date dans ce fichier, § Rate limiting (« `apiRoute` non applicable », L57).
- **Alternative B écartée** : ne **pas** patcher `lib/api-route.ts` avec un flag `public` — l'option a été explicitement écartée au profit de l'Option A (laisser ces 2 routes manuelles et documentées). **`lib/api-route.ts` est inchangé** dans cette tâche.
- Whitelisting conscient pour le QA (skill `api-route-guard`, §2 — « la route est légitimement publique (`auth/*`, `cron/*`, webhooks BCT) → la lister explicitement … pour que `qa` puisse la whitelister consciemment ») : état final **11 routes sans wrapper sur 121 (110 wrappées)** = **5 endpoints publics auth/users** (`[...nextauth]`, `register`, `resend-code`, `check-status`, `verify-email` — raison : le wrapper impose `session?.id` → 401, or ces routes sont appelées **pré-auth**) + **3 routes de taux** (`taux-bct`, `tmm-bct`, `taux-change/[devise]` — **Option A″**, détail `docs/wiki/tresorerie.md` § Décision Option A″) + **3 routes `cron/*`** (**Option C1**, raison route par route `docs/wiki/dashboard-rapports.md` § Whitelist `cron/*` — Option C1).

## Contrôle automatisé des règles des routes — `scripts/check-rules.mjs` (2026-10-23, lot E5)

La liste blanche « 11 routes sans wrapper » n'est plus seulement documentaire : elle est **machine-vérifiable** (exigence 9 du Prompt E).

- **Commande** : `node scripts/check-rules.mjs`, alias `npm run check-rules` — script **Node standard sans aucune dépendance** (`scripts/check-rules.mjs`, ES module, `node` suffit).
- **Source unique des listes blanches** : **deux** constantes **dans le script**, chacune avec la **raison écrite** et le **renvoi wiki** de chaque route (celui-ci, `tresorerie.md` § Option A″, `dashboard-rapports.md` § Whitelist `cron/*`) : ① `WHITELIST_NO_WRAPPER` (couvre le contrôle ②) ; ② `WHITELIST_VALIDATION` (**contrôle ③ seulement**, ajout lot E6 — voir ci-dessous). Toute modification se fait là, en un seul endroit ; une entrée dont le fichier disparaît **ou** (liste ①) qui devient wrappée déclenche une violation `whitelist` (anti-rot).
- **3 contrôles** appliqués aux `route.ts` de `app/api` sur le **fichier entier** (commentaires neutralisés par un mini-lexeur) : ① **garde** — chaque `apiRoute.<méthode>(` doit porter `permission: "<cle>"` ou `authOnly: true` ; ② **wrapper** — un handler exporté sans passer par `apiRoute` doit figurer dans la liste blanche ; ③ **validation** — `request.json()` doit être couvert par `schema:` (config `apiRoute`) ou `.safeParse(` dans le fichier. **`WHITELIST_NO_WRAPPER` ne couvre QUE le contrôle ② ; `WHITELIST_VALIDATION` ne couvre QUE le contrôle ③, et uniquement pour un corps VOLONTAIREMENT IGNORÉ** (helper `bodyReadIgnored()` : chaque lecture immédiatement avortée par `.catch(`, résultat **jamais affecté ni exploité**) : une route listée qui LIERAIT ou exploiterait le corps (`const body = await request.json()`) ressort **toujours** en violation (self-test cas `m`), et une route **non** listée avec un corps ignoré aussi (cas `n`).
- **`WHITELIST_VALIDATION` (1 entrée, lot E6)** : `app/api/users/check-status/route.ts` — `request.json().catch(() => null)` lu **uniquement** pour comptabiliser le rate-limit IP (parité « corps malformé/vide compte aussi »), corps **jamais** lié ni exploité ; arbitrage anti-énumération S-9 / C2 / E2a (réponse générique pré-auth). Raison écrite complète + renvoi : constante `WHITELIST_VALIDATION` dans le script.
- **Codes retour** : `0` si 0 violation hors liste blanche, `1` sinon ; `--self-test` exécute le détecteur sur **15** fixtures synthétiques **en mémoire** (0 écriture disque) et imprime `SELF-TEST OK` + exit 0.
- **État au 2026-10-23 (lot E6)** : 123 routes · 192 appels `apiRoute` (**175 `permission` + 17 `authOnly`, 0 sans garde**) · 11 routes sans wrapper **toutes whitelistées** · 24 configs `schema:` · 47 fichiers `.safeParse(` · 45 lectures `request.json()` · 1 entrée `WHITELIST_VALIDATION` utilisée. **0 violation → `exit 0`** : les 3 violations ouvertes du lot E5 sont clôturées — les 2 routes `carton-types` migrées vers `schema:` (`cartonTypeInputSchema` unique dans le nouveau `lib/schemas/carton-type.ts`, helper dupliqué supprimé des 2 routes ; la `ZodError` → 500 devient un **422** contractuel E1, `permission` inchangée) et `app/api/users/check-status/route.ts:38` blanchie pour le contrôle ③ via `WHITELIST_VALIDATION` (corps ignoré, 1 entrée). Détail et preuves : entrée CHANGELOG `[2026-10-23] Backend (lot-e6-cloture-check-rules/E)`.

## Migration `apiRoute` — `setup/company` (2026-09-28)

`app/api/setup/company/route.ts` (1 handler **POST**, onboarding société) migré vers le wrapper `lib/api-route.ts` — sous-groupe **7a de P1-5** (audit transverse ; **décision C1 prise le 2026-09-28** pour les `3 × cron/*` : whitelist explicite « publiques, raison » au lieu d'un wrapper — voir `docs/wiki/dashboard-rapports.md` § Whitelist `cron/*` — Option C1).

- **Config à l'origine `{}` strictement** : aucune permission n'existait à l'origine (la route authentifiait par session seule). *(Depuis le lot E1 : `{ authOnly: true }` + commentaire `// justifié : …` — voir § Durcissement lot E1.)*
- **`requireCompany` NON activé — et INTERDIT ici** : c'est l'étape d'onboarding, l'utilisateur n'a **pas encore** de `companyId` (c'est justement cette route qui le crée). Activer l'option ferait appeler `resolveCompanyId` dans le wrapper → échec avant même la création de la société. Le handler lit `session.companyId` uniquement comme **booléen de garde** (« déjà configurée ? »).
- **Comportement conservé à l'identique** :
  - **401** `errorResponse("Non authentifié")` — le bloc manuel (`getSessionFromRequest` + 401, ex-L10-11) a été supprimé, le wrapper produit **exactement** la même réponse ;
  - **400** « Votre société est déjà configurée » (si `session.companyId` présent) ;
  - **400** « Le nom est requis » ;
  - **201** `NextResponse.json({ company: serializeDecimals(company) }, { status: 201 })` — réponse `NextResponse` passée telle quelle (le wrapper la renvoie intacte, ex-L52) ;
  - la `$transaction` inchangée : `company.create` + `user.update` (`companyId` principal + `userCompanies.create`).
- **`sessionUser` → `session`** (2 usages : `session.companyId` de la garde, `session.id` du `user.update`) ; le `try/catch` global (ex-L9/L72-75) est supprimé — le wrapper centralise le 500.
- ~~**Nuance du `catch` du wrapper (signalée, non corrigée)** : il renvoie `errorResponse(error.message)` (message réel, ex. erreur Prisma)~~ → **CORRIGÉ le 2026-10-22 (lot E1)** : 500 générique `{ error: "Erreur serveur", requestId }`, détail au logger — voir § Durcissement `apiRoute` lot E1.

## Mutation de connexion `useLogin()` — P2-9 (2026-10-01)

> ⚠️ **Partiellement remplacé par le lot C3 (2026-10-14)** : `useLogin()` n'appelle plus
> `POST /api/users/check-status` ni `signIn("credentials")` côté client — elle appelle la
> Server Action `loginAction` (C2) et pilote l'écran de progression. Voir § Connexion C3 ci-dessous.
> Seul le **pattern** décrit ici (0 toast / 0 navigation dans le hook, toasts et redirections
> côté composant) reste d'application.

`hooks/use-login.ts` — migration du `fetch()` brut de `components/auth/login-form.tsx` vers TanStack Query (audit `AUDIT-FACTURAPRO.md` §6, `P2-9`).

- **Une seule mutation** `useLogin()` : `POST /api/users/check-status` (le **catch silencieux** d'origine est conservé — un échec de cette route n'empêche pas la connexion) puis `signIn("credentials", { redirect: false })`.
- **Retour : union discriminé `LoginResult`** = `deactivated` | `unverified` | `invalid-credentials` | `success` | `no-session`. Le hook **n'affiche aucun toast et ne navigue pas** : le formulaire décide du traitement de chaque branche.
- **Endpoints appelés** : `POST /api/users/check-status` (statut du compte) et le callback NextAuth `credentials` (via `signIn`).
- **Où vit le toast** : côté composant — `components/auth/login-form.tsx` affiche les toasts et effectue les redirections, avec des **libellés strictement identiques** à l'ancien inline. Le reset du formulaire se fait via `useRef` (0 `useEffect`).
- Détail complet, parité comportementale et vérifications : entrée CHANGELOG `[2026-10-01] Frontend (p2-9-useMutation/P2-9)`.

## Connexion C3 — Server Action + écran de progression (2026-10-14)

Lot **C3 (frontend) du Prompt C — P0 Authentification**, livré **ensemble avec C2** (backend) :
l'ancien marqueur de session client (`document.cookie = "__session-marker=1"` dans
`lib/providers/session-provider.tsx`) est devenu obsolète et contre-productif (il échoue la
vérification de signature du marqueur httpOnly posé par la Server Action).

### Flux complet

1. `components/auth/login-form.tsx` — **React Hook Form + Zod** (schéma `loginSchema` local,
   convention `docs/wiki/ui-dialogs.md` §3 règle 4), `useMutation` via `useLogin()`.
2. `hooks/use-login.ts` — `useLogin()` appelle **`loginAction`** (Server Action C2) puis
   enchaîne des **jalons réels** (aucun minuteur factice — chaque saut de pourcentage correspond
   à une promesse réelle résolue) :
   - **0 → 30 %** « Vérification des identifiants… » = `loginAction` résolue ;
   - **30 → 50 %** « Ouverture de la session… » = `useSession().update()` résolu (aller-retour réel
     sur `/api/auth/session` : rafraîchit le session client next-auth — **remplace l'ancien
     `router.refresh()`**, qui est **interdit** au lot C3) ;
   - **50 → 70 %** « Chargement de votre profil et de vos sociétés… » = `prefetchQuery`
     `userCompaniesQueryOptions` (consommateurs réels : `company-switcher`, `useActiveCompanyId`) ;
   - **70 → 95 %** « Préparation du tableau de bord… » = `prefetchQuery` `dashboardQueryOptions`
     (consommateur réel : `DashboardClient` → rendu instantané) ;
   - **95 → 100 %** = **`router.replace(redirectTo)` seul** (pas de `push`, pas de `refresh` —
     la page de connexion ne doit pas rester dans l'historique ; le RSC render de
     `(app)/layout.tsx` voit la session grâce aux cookies posés par la réponse d'action).
3. `lib/stores/auth-progress-store.ts` — store Zustand partagé (`phase` / `percent` / `label` /
   `error`) : écrit par `useLogin()`, lu par l'écran de progression. Pur état, 0 fetch, 0 timer.
4. `components/auth/auth-progress-screen.tsx` — plein écran, logo au centre, barre
   `components/ui/progress.tsx`, pourcentage interpolé par un spring `motion` (**coupé sous
   `prefers-reduced-motion`** via `spring.jump`), `role="progressbar"` + `aria-valuemin/max/now`,
   libellé d'étape en `role="status"` `aria-live="polite"`.

### Échec

- `loginAction` renvoie `{ ok: false, code, message, retryAfterSeconds? }` → le hook écrit le
  store (`phase: "error"`) et **retourne** le résultat (pas de throw pour un échec métier).
- Le formulaire reprend la main : **e-mail conservé, mot de passe vidé, focus posé sur le champ**,
  `<Alert variant="destructive">` **inline** avec `result.message` tel quel + **toast titré**
  (`Connexion refusée` / `Compte désactivé` / `Email non vérifié` / `Trop de tentatives` — jamais
  un toast « Erreur » seul), et **compte à rebours** (`retryAfterSeconds`) qui désactive le bouton
  pendant la fenêtre rate-limit.
- `code: "unverified"` → toast + redirection `push /verify-email?email=…` (comportement conservé).
- Erreur d'infrastructure (throw de l'action) → toast titré « Erreur de connexion » + alerte
  inline « Une erreur est survenue. Vérifiez votre connexion puis réessayez. ».

### Suppressions / migrations

- **`fetch("/api/users/check-status")`** et **`signIn("credentials")` client** supprimés de
  `hooks/use-login.ts` (appel de la route supprimé du flux de login ; la route backend C2 reste
  en place, non consommée).
- **`SessionMarker`** (+ son `useEffect` / `document.cookie`) **supprimé** de
  `lib/providers/session-provider.tsx` — le marqueur httpOnly signé est posé par la Server
  Action. `AutoLogout` et `InactivityDialog` **strictement inchangés**.
- `components/auth/register-form.tsx` et `app/(auth)/verify-email/page.tsx` migrés vers
  **`hooks/use-auth.ts`** (`useRegister` / `useVerifyEmail` / `useResendCode`, TanStack Query) —
  libellés, toasts et redirections **byte-identiques** (les toasts et les redirections restent côté composant, convention P2-9).
- **Un seul skeleton** : `app/(app)/loading.tsx` rend désormais `DashboardSkeleton`
  (composant unique partagé) + les fallbacks `dynamic()` de `dashboard-client.tsx` utilisent le
  même `Skeleton` → **zéro flash de mise en page** entre la frontière de chargement du segment et
  le chargement de données du dashboard.

### Vérifications (2026-10-14)

`npx tsc --noEmit` → 0 erreur · `npm run lint` → 406 problems (35 errors, 371 warnings) = baseline,
**0 problème sur les 12 fichiers touchés** (`npx eslint <fichiers>` → exit 0) · `npx vitest run` →
10 files / 208 tests passed · greps `any` / `useEffect(` / `fetch(` / `check-status` : conformes
(2 `useEffect` avec justification écrite — compte à rebours `setInterval` + pilotage de la
MotionValue `motion` ; `fetch(` uniquement dans le `postJson` des `mutationFn` de `hooks/use-auth.ts`,
patron TanStack du projet).


## Correctif QA — open-redirect `callbackUrl` (2026-10-14)

**Blocage levé** (rejet QA du lot C2, vérifié empiriquement) : `safeInternalPath` était **tripliqué**
(`proxy.ts`, `app/(auth)/login/login-action.ts`, `app/(auth)/login/page.tsx`) et son filtre par test
de chaîne `startsWith("/") && !startsWith("//")` était **contournable** — le parseur WHATWG
normalise certains caractères en séparateur d'autorité :

- `/\evil.com` (backslash U+005C) → **passe** le filtre → `new URL("/\\evil.com", base)` = `https://evil.com/` ;
- `/<TAB>/evil.com` (tabulation U+0009) → **passe** le filtre (supprimée par le parseur) → `https://evil.com/` .

Vecteurs exploités sur `/login?callbackUrl=/\evil.com` et `/register` (utilisateur déjà
authentifié) → `Location: https://evil.com/` (phishing post-login).

### Correctif

- **`lib/safe-internal-path.ts` (source unique, +15 tests)** : au lieu du test de chaîne, **résout**
  l'entrée via `new URL(raw, base)` (try/catch → `null` si illisible) contre une **origine interne
  factice non routable** (`https://facturapro-internal.invalid`) puis **compare les origines**
  (`url.origin` ≠ origine interne → `null`). Le retour est **reconstruit** depuis
  `pathname + search + hash` — jamais la chaîne brute, donc toujours un chemin relatif interne sûr
  pour un en-tête `Location`. Le `hash` est conservé (ancre inoffensive, fragment jamais transmis
  au serveur). Garde `typeof raw !== "string"` (défense en profondeur : `callbackUrl` hors schéma
  Zod dans `loginAction`, arguments de Server Action non vérifiés côté client).
- **Les 3 copies supprimées** → import de la source unique ; **aucun autre changement
  comportemental** dans les 3 fichiers (auth, codes d'erreur, Set-Cookie et marqueur intacts ;
  repli `?? "/dashboard"` inchangé chez chaque appelant).
- **Tests** : `lib/__tests__/safe-internal-path.test.ts` (15 cas positifs/refus) + 2 tests
  d'intégration dans `lib/__tests__/proxy-authz.test.ts` (les 2 vecteurs `/\` et tab → redirect
  piégé `/dashboard` constaté). 240 tests d'origine intacts, **0 test ajusté** (aucun n'encodait
  l'ancien comportement défectueux).

### Vérifications (2026-10-14)

`npx tsc --noEmit` → 0 erreur · `npm run lint` → **✖ 406 problems (35 errors, 371 warnings)** =
baseline, 0 ligne mentionnant les fichiers modifiés · `npx vitest run` → **15 files / 257 tests
passed** (baseline 14/240) · `grep "startsWith(\"//\")\|safeInternalPath"` → **1 seule définition**
(`lib/safe-internal-path.ts`, le reste = imports/call sites/docblocks) · grep
`: any|as any|@ts-ignore|eslint-disable` sur les 6 fichiers → **vide (exit 1)** ·
`graphify update .` → `Rebuilt: 8868 nodes, 21891 edges, 412 communities` (exit 0, aucun drift).


## Correctif — repli post-login unique `DEFAULT_POST_LOGIN_ROUTE` (2026-10-19)

**Constat** (reproduit en exécution : dev server + base Neon + navigateur headless) : le tableau de
bord est servi à la **racine** (`app/(app)/page.tsx`) et la route `/dashboard` **n'existe pas**
(HTTP 404 « Page introuvable »), alors que 3 code paths l'utilisaient comme **repli de redirection
post-authentification** → tout `callbackUrl` absent, vide ou refusé (anti open-redirect) après un
login envoyait l'utilisateur sur un 404 — barre de progression bloquée en fin d'authentification.

- **Source unique** : `DEFAULT_POST_LOGIN_ROUTE = "/"` exportée par `lib/safe-internal-path.ts`
  (le module déjà maison de `safeInternalPath`, importé par les 3 appelants), docblock expliquant le
  choix de la racine (`/dashboard` = route fantôme). Reprise dans les 3 call sites : `proxy.ts`
  (redirection « déjà authentifié » sur `/login` / `/register`), `app/(auth)/login/login-action.ts`
  (`redirectTo` du `loginAction`), `app/(auth)/login/page.tsx` (session déjà active). **Zéro
  littéral `"/dashboard"` restant** dans le code applicatif.
- **Tests** : `lib/__tests__/proxy-authz.test.ts` aligné — les 6 assertions de `Location` de repli
  attendent désormais `http://localhost:3000/` (titres + commentaires mis à jour) ; les tests qui
  employaient `/dashboard` comme **chemin protégé fictif** utilisent maintenant `/factures` (vrai
  chemin de l'app) pour lever l'ambiguïté avec le repli. +2 tests dans
  `lib/__tests__/safe-internal-path.test.ts` verrouillant la constante (`=== "/"` et « repli toujours
  un chemin interne accepté par `safeInternalPath` »).

### Vérifications (2026-10-19)

`npx vitest run lib/__tests__/proxy-authz.test.ts lib/__tests__/safe-internal-path.test.ts` →
2 files / 34 tests passed · `npx vitest run` → 20 files / 343 tests passed · `npx tsc --noEmit` →
exit 0, 0 erreur · `npm run lint` → **✖ 406 problems (35 errors, 371 warnings)** = baseline inchangé,
`npx eslint <6 fichiers touchés>` → exit 0 · grep `"/dashboard"` sur `app lib components hooks
proxy.ts` → **vide**. Note environnement : `.next/dev/types/` (artefact gitignoré du dev server,
écriture interrompue → 25 erreurs `tsc` HORS source) régénéré via `npx next typegen` + purge du
répertoire stale ; aucun fichier source concerné.


## Durcissement des sessions — Lot B1 (S-1 salt JWT + S-3 session périmée, 2026-10-09)

Corrections des deux failles P0 de l'audit 2026-10 (`docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md`, Prompt B), **sans changer le contrat `SessionUser` ni les signatures consommées par les ~110 routes sous `apiRoute`**.

### S-1 — salt JWT dérivé du nom du cookie réellement lu

- **Problème** : Auth.js dérive le salt de chiffrement du JWT **du nom du cookie de session** ; l'ancien code décodait toujours avec le littéral fixe `"authjs.session-token"` alors que le cookie réellement présent peut être `"__Secure-authjs.session-token"` (production HTTPS) → déchiffrement impossible (jetons prod non validables côté proxy/API).
- **Correctif** : `lib/session-token.ts` = source unique de vérité. `readSessionTokenFromRequest()` lit le cookie (via `request.cookies` sur `NextRequest`, fallback parsing de l'en-tête `Cookie` pour un `Request` nu — ex. `app/(app)/effets/[id]/preview/page.tsx` qui reconstruit la requête depuis `headers()`), priorise `__Secure-`, et **retourne le nom du cookie lu** ; `decodeSessionToken()` utilise ce nom comme salt. Utilisé par **`proxy.ts` ET `lib/session.ts`** — zéro duplication, plus aucun littéral salt ailleurs que dans ce module. `encodeSessionToken()` (symétrique) sert les tests.
- `proxy.ts` utilise maintenant les constantes `SESSION_COOKIE_NAME` / `SECURE_SESSION_COOKIE_NAME` (y compris pour les `cookies.delete`), et n'a plus de `try/catch` dédié au decode (`decodeSessionToken` ne throw jamais, retourne `null`).

### S-3 — expiration par inactivité + relecture DB avec cache court

- **`getSessionFromRequest` (`lib/session.ts`)** applique **la règle `lastActivity` du callback jwt (`lib/auth.ts`)** — même comportement : token sans `lastActivity` → pas de blocage ; `now - lastActivity > maxInactivity` → `null` (401), où `maxInactivity` = 30 min sans « Se souvenir de moi », 7 j avec. **Pas de sliding** ici (lecture seule, impossible de réécrire le cookie depuis un handler) — le sliding reste porté par le callback jwt (navigations pages via le proxy).
- **Relecture DB** de `actif` / `role` / `permissions` via `lib/session-cache.ts` : `getUserSessionSnapshot(userId)` (Map mémoire **par instance**, TTL **30 s** — `USER_SESSION_CACHE_TTL_MS`) → **1 requête DB au plus toutes les 30 s par utilisateur**, pas une par appel API. `actif=false` → `null` (401) ; utilisateur supprimé → `null`.
- **Invalidation** : `invalidateUserSessionCache(userId)` appelée après chaque mutation user : `app/api/users/[id]/route.ts` (PATCH + DELETE), `app/api/users/me/route.ts`, `app/api/users/me/password/route.ts`, `app/api/users/resend-invitation/route.ts`, `app/api/users/verify-email/route.ts`, `app/api/setup/company/route.ts` (1 import + 1 ligne par fichier). Désactivation/rétrogradation : **immédiate** si passée par une de ces routes, **≤ 30 s** sinon (TTL).
- **Fail DB** : si la lecture DB échoue, on conserve les valeurs du token (convention du callback jwt qui conserve le token existant) et **rien n'est mis en cache** → nouvelle tentative au prochain appel.
- ⚠️ **Comportement nouveau assumé** : une activité **exclusivement API** (XHR) ne sliding pas `lastActivity` → après 30 min d'inactivité page (sans rememberMe), les appels API retournent 401 comme `auth()` le ferait déjà côté serveur components. Cohérent avec S-3 voulue.
- ⚠️ **Cache par instance serveur** : sur Vercel serverless, chaque instance a son propre cache → l'invalidation explicite ne couvre que l'instance qui a servi la mutation ; le **TTL 30 s est la garantie universelle**.

### Tests

`lib/__tests__/session-token.test.ts` (16 tests, mocks Prisma/`next` comme `tmm-bct.test.ts`) : token valide ; sans cookie ; token corrompu ; `lastActivity` expiré (refus) + rememberMe 7 j (accepté) ; `actif=false` (refus) ; utilisateur supprimé ; permissions modifiées visibles après invalidation ; désactivation visible après expiration du cache 30 s (fake timers) ; fail DB → valeurs token ; salt correct cookie `__Secure-` **et** cookie nu ; token encodé avec salt différent du cookie lu → refus ; lecture via `request.cookies` (NextRequest) et via en-tête (Request nu, priorité `__Secure-`).

## S-4 — renforcements 2026-10 (lot B3)

Durcissement P0 de l'audit 2026-10 (`docs/audits/AUDIT-COMPLET-FACTURAPRO-2026-10-07.md` § S-4, prompt `docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md` Prompt B) : les routes ci-dessous n'avaient que l'authentification (`apiRoute` sans `permission:`) alors qu'elles exposent des données sensibles (solde, CA, impayés, recherche globale transverse, stock, effets). Seul le champ `permission:` de la config `apiRoute` a été touché — **aucun handler, aucun `schema.prisma`, aucun composant**.

### Matrice avant / après (route → permission)

| Route (handler) | Permission AVANT | Permission APRÈS |
|---|---|---|
| `GET /api/tresorerie` | *(aucune — auth seule)* | **`paiements:voir`** (réutilisée) |
| `GET /api/tresorerie/evolution` | *(aucune — auth seule)* | **`paiements:voir`** (réutilisée) |
| `GET /api/dashboard` | *(aucune — auth seule)* | **`dashboard:voir`** (réutilisée, clé déjà au catalogue) |
| `GET /api/search` | *(aucune — auth seule)* | **`search:voir`** (**créée** — groupe `search` au catalogue) |
| `GET /api/stock-mouvements` | *(aucune — auth seule)* | **`produits:voir`** (réutilisée — choix motivé ci-dessous) |
| `GET /api/effets` | `effets:voir` | `effets:voir` (inchangée) |
| `POST /api/effets` | `effets:creer` | `effets:creer` (inchangée) |
| `GET /api/effets/[id]` | `effets:voir` | `effets:voir` (inchangée) |
| `PATCH /api/effets/[id]` | `effets:modifier` | `effets:modifier` (inchangée — pas de régression vers `voir`) |
| `DELETE /api/effets/[id]` | `effets:supprimer` | `effets:supprimer` (inchangée) |
| `POST /api/effets/batch` | `effets:creer` | `effets:creer` (inchangée) |
| `GET /api/effets/check-echeances` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/effets/documents-lies` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/effets/echeance-collision` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/effets/echeances-a-venir` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/effets/splits` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/effets/suggest-echeances` | *(aucune — auth seule)* | **`effets:voir`** (réutilisée) |
| `GET /api/notifications` | *(aucune — auth seule)* | **inchangée — auth seule assumée** (voir encadré) |
| `PATCH /api/notifications` | *(aucune — auth seule)* | **inchangée — auth seule assumée** (voir encadré) |

> **Encadré — `notifications` : auth seule assumée (décision, pas un oubli)** : les 2 handlers de `app/api/notifications/route.ts` restaient sur `{}` (aucun `permission:`). La donnée est déjà intrinsèquement scopée à l'utilisateur (`where: { userId: session.id }`) et la cloche de notifications (`components/layout/notifications-popover.tsx`) est un ornement universel de l'appli : l'exiger une permission particulière casserait la sonnerie pour tout USER sans cette clé. Whitelist explicite pour le QA (skill `api-route-guard` §2). *(Depuis le lot E1 : matérialisé par `{ authOnly: true }` + commentaire `// justifié : …` — voir § Durcissement lot E1.)*

> **Choix motivé — `stock-mouvements` → `produits:voir` (et non `stock:voir`)** : le catalogue `PERMISSION_GROUPS` n'a **pas** de clé `stock:voir` ; le groupe existant s'appelle déjà **« Produits & Stock »** (`produits:voir` / `creer` / `modifier` / `supprimer`), et la route sœur `app/api/products/[id]/stock-movements/route.ts` (mêmes données, historique de mouvements d'un produit) était **déjà gateée en `produits:voir`** depuis le 2026-09-27 (Option A, `docs/wiki/inventaire.md`), tout comme `/api/inventaire`, `/api/products`, `/api/categories`, `/api/marques`, `/api/rapports/inventaire`. Créer une clé `stock:voir` parallèle fragmenterait ce groupe et forcerait les admins à re-granter l'accès à des utilisateurs qui ont déjà `produits:voir` — option écartée au profit de la réutilisation (REUSE FIRST).

### Catalogue `lib/permissions.ts` — ajouts uniquement

- **Créée** : `search:voir` (nouveau groupe `search`, libellé « Recherche globale », case à cocher dans `components/settings/utilisateurs/permissions-matrix.tsx` qui lit `PERMISSION_GROUPS`). C'est le **seul** ajout au fichier — preuve par le diff : +6 lignes, 0 suppression de clé ni de groupe.
- **Réutilisées sans modification** : `paiements:voir`, `dashboard:voir`, `effets:voir`, `produits:voir` (existaient déjà dans le catalogue).
- **Aucune permission retirée** à un rôle/utilisateur existant : interdiction formelle du prompt, respectée à la lettre (diff ci-dessus + routes : aucune permission d'origine n'a été remplacée par une autre — les 12 handlers qui avaient déjà une permission la conservent).

### ⚠️ Note d'architecture — il n'existe PAS de matrice rôle→permissions par défaut

Le prompt B3 demandait d'« ajouter les clés aux rôles par défaut (ADMIN, ACCOUNTANT, COMMERCIAL, PRODUCTION…) ». **Ces rôles métier n'existent pas dans ce codebase** — preuve :

- `prisma/schema.prisma` : `enum UserRole { ADMIN USER }` (L1213-1216) — c'est l'**unique** énumération de rôles ;
- aucun `ROLE_PERMISSIONS` / `DEFAULT_PERMISSIONS` / matrice rôle→permissions nulle part (`grep -rn "ROLE_PERMISSIONS\|DEFAULT_PERMISSIONS\|defaultPermissions" lib app prisma components` → vide) ;
- le modèle réel (documenté en tête de cette page, § Fonctionnalités) : **`ADMIN` bypass total** (`userHasPermission` dans `lib/permissions.ts` : `role === "ADMIN" → true`) + **liste `permissions` explicite par utilisateur `USER`** (défaut `[]` à la création — `create-user-dialog.tsx`), choisie par un admin via `PermissionsMatrix` qui lit `PERMISSION_GROUPS`.

**Conséquence — équivalent fonctionnel de « l'ajout aux rôles par défaut »** : ajouter une clé à `PERMISSION_GROUPS` = la rendre **assignable** dans la matrice (donc « visible pour les rôles métier ») ; `ADMIN` l'a automatiquement (bypass) ; un compte `USER` doit se la voir accorder dans Paramètres → Utilisateurs (comme pour toutes les autres permissions du catalogue). **Aucun mechanisme de grant par défaut n'a été inventé** (ce serait un choix d'architecture nécessitant un accord utilisateur) ; si le Governor souhaite un backfill (ex. grant `dashboard:voir`/`search:voir` à tous les `USER` existants), c'est une décision à part entière.

### Notes comportementales assumées

- **`search:voir` gate la palette de recherche globale** (`/api/search`, consommée par `components/command-palette.tsx`) : un USER sans cette clé reçoit désormais 403 sur la recherche (audit S-4 voulait cette fermeture).
- **Sidebar / effets** : `components/layout/app-sidebar.tsx` affiche « Effets de Commerce » sous `paiements:voir` alors que les routes `/api/effets*` exigent `effets:voir` (déjà le cas avant ce lot pour GET/POST principaux) — décalage préexistant, non introduit ici, signalé tel quel.
- **`requireCompany` inchangé partout** : seul le champ `permission` a été ajouté ; `check-echeances` et `stock-mouvements` gardent leur absence de `requireCompany` d'origine.

### Backfill a′ — exécuté le 2026-10-09 (option approuvée par l'utilisateur)

La note d'architecture ci-dessus (« si le Governor souhaite un backfill… c'est une décision à part entière ») a été tranchée par l'utilisateur : **option a′** = backfill **uniquement** `dashboard:voir` + `search:voir` sur les comptes `USER` existants.

- **Script one-shot** : `scripts/dev/backfill-dashboard-search-permissions.ts` — **dry-run par défaut** (0 écriture), écriture réelle uniquement avec `--execute` ; union seule via `permissions: { push: manquantes }` (aucun retrait possible, **idempotent**) ; ne lit que `id` + `permissions` des comptes `role = USER` (aucun e-mail, aucun secret imprimé) ; clés validées contre `ALL_PERMISSION_KEYS` du catalogue.
- **Exécution du 2026-10-09** : la base ciblée par `DATABASE_URL` (`.env`, endpoint Neon effectif) ne contient que **1 compte, `role = ADMIN`** → **0 compte `USER`**, donc **N = 0** : le backfill a été exécuté (dry-run → `--execute` → re-dry-run) et est **sans effet** sur cette base, avec **0 écriture**.
- **Périmètre strict respecté** : `paiements:voir`, `effets:voir`, `produits:voir` **restent à accorder explicitement** à chaque `USER` via Paramètres → Utilisateurs (`PermissionsMatrix`) — le backfill a′ ne les touche pas, et ne touche jamais aux `ADMIN` (bypass, `user.permissions` inutile).
- ⚠️ **Observation environnement (non corrigée ici, hors périmètre)** : `.env` contient **deux** lignes `DATABASE_URL` (L14 et L17) ; `dotenv`/`@next/env` font gagner la **dernière** (L17). L'ancienne (L14) pointe vers un autre endpoint Neon qui contient 1 compte `role = SUPER_ADMIN` (valeur hors `enum UserRole` actuel) — aucun compte `USER` non plus, donc le périmètre a′ aurait été vide des deux côtés, mais la duplication est un piège à arbitrer par le Governor.

### Fichiers touchés (lot B3)

`lib/permissions.ts` (+groupe `search`) ; `app/api/tresorerie/route.ts`, `app/api/tresorerie/evolution/route.ts`, `app/api/dashboard/route.ts`, `app/api/search/route.ts`, `app/api/stock-mouvements/route.ts`, `app/api/effets/check-echeances/route.ts`, `app/api/effets/documents-lies/route.ts`, `app/api/effets/echeance-collision/route.ts`, `app/api/effets/echeances-a-venir/route.ts`, `app/api/effets/splits/route.ts`, `app/api/effets/suggest-echeances/route.ts` (config uniquement) ; `scripts/dev/backfill-dashboard-search-permissions.ts` (backfill a′, voir ci-dessus) ; cette page + entrée CHANGELOG. **0 test cassé** (`npx vitest run` → 9 files / 198 tests verts : `payments-isolation.test.ts` mocke `role: "ADMIN"` → bypass, aucun mock d'absence de permission à ajuster).



## Correctif 500 `/login` — ordre obligatoire des providers racine (2026-10-21)

**Symptôme** : `GET /login?callbackUrl=%2F` → **500**, crash au rendu racine
`No QueryClient set, use QueryClientProvider to set one` (chaîne `useLogout` →
`useAutoLogout` → `AutoLogout`, monté par `SessionProvider`).

**Cause** : `app/layout.tsx` montait `<SessionProvider>` **au-dessus** de `<QueryProvider>` →
`AutoLogout`, qui utilise `useMutation` TanStack, n'avait aucun `QueryClient` parent.

**Ordre obligatoire (verrouillé par un commentaire JSX dans `app/layout.tsx`)** :

`ThemeProvider > QueryProvider > SessionProvider > TooltipProvider > {children} + Toaster`

- **Risque de régression** : si quelqu'un remonte `SessionProvider` (ou insère un provider
  utilisant TanStack Query au-dessus de `QueryProvider`), **toute la racine re-crashed et
  `/login` redevient 500** — le message d'erreur n'apparaît d'ailleurs pas dans les logs
  serveur, seulement dans le rendu. Ne pas réordonner ces providers sans relire le
  commentaire du layout.
- **Contrainte vérifiée avant le choix de l'ordre** : `lib/providers/query-provider.tsx` et
  `lib/providers/theme-provider.tsx` n'utilisent **aucun** `useSession` → les placer au-dessus
  de `SessionProvider` est sans risque.
- **Fichier modifié** : `app/layout.tsx` **uniquement** (correctif 1 fichier ; les 3 autres
  fichiers de la feature logout intouchés).

**Preuves (2026-10-21)** : `curl http://localhost:3111/login` → **200** (avant : 500) ;
`npx tsc --noEmit` → **0 erreur** ; `npm run lint` → **396 (35 errors, 361 warnings)**, 0 finding
sur `app/layout.tsx` ; `npx vitest run` → **22 fichiers / 369 tests** ; graphe → **9 336 nœuds**.


## Durcissement `apiRoute` — lot E1 (2026-10-22)

### Nouveau contrat `createHandler`

`RouteConfig` est désormais une **union discriminée** : tout appelant DOIT fournir soit
`permission: "<cle:action>"`, soit `authOnly: true` (les deux = erreur TS). Toute route créée
sans ces options ne compile plus. Ajouter un `permission` peut faire 403 des comptes existants :
`authOnly: true` + une tâche de backfill est préféré au risque de casser.

- `requireCompany: true` reste appliqué **après** le 401/403, jamais avant (pas de fuite de contrat).
- Nouveau : validation Zod **en 422** sur `schema` (corps) et `query` (query-string), **avant** le
  handler — contrat `{ error: "Données invalides", issues, success: false }` (mêmes clés que
  `errorResponse`, lisible par `describeApiError`).
- Nouveau : le 500 ne renvoie plus `error.message` mais un message générique `Erreur serveur` +
  `requestId` ; le détail part côté serveur via `lib/logger.ts` (JSON-lines sans dépendance,
  niveau `LOG_LEVEL`, clés sensibles `token/password/secret/authorization/…` → `[redacted]`,
  troncature des valeurs longues). Chaque réponse 500 et chaque log serveur partagent le même
  `requestId` pour la corrélation.

### Classification des 18 handlers sans permission (avant → après)

18 handlers sur **13 fichiers** — inventaire réellement appliqué :

| Route | Après E1 | Justification |
|---|---|---|
| `GET /api/products/next-code` | `permission: "produits:voir"` | seule option sans risque : unique consommateur `useProduitNextCode` vit dans la page produits déjà derrière `produits:voir` (précédent Option A 2026-09-27) |
| `GET /api/company-bank-accounts` | `authOnly: true` | **BACKFILL REQUIS** : consommé aussi par le module effets (`hooks/use-effets.ts`) ; la cible sera `parametres:voir` une fois les effets habilités (`requireCompany` garantit le scopage) |
| `GET/PATCH /api/notifications` | `authOnly: true` | notifications personnelles scopées `session.id` côté handler — aucune PermissionKey ne s'applique (chacun lit les siennes) |
| `POST /api/companies` | `authOnly: true` | création/init de société ; contrôle porté par le handler (rôle ADMIN + garde « une seule societe ») |
| `POST /api/auth/logout` | `authOnly: true` | logout : tout utilisateur authentifié a le droit de se déconnecter |
| `POST /api/setup/company` | `authOnly: true` | setup de 1ʳᵉ société (compte de démo) ; aucune PermissionKey applicable avant habilitation |
| `POST /api/upload` | `authOnly: true` | upload authentifié ; contrôle de quota/type porté par le handler |
| `GET /api/user/companies` | `authOnly: true` | liste des sociétés de l'utilisateur connecté, scopée `session.id` |
| `GET/PATCH/DELETE /api/users/[id]` | `authOnly: true` | gestion des utilisateurs ; cible future : rôle de l'utilisateur demandé. **Voir §7.4 audit scope** : pas de vérif de societe sur le GET → possible IDOR à traiter dans le backfill |
| `GET/PATCH /api/users/me` | `authOnly: true` | profil de l'utilisateur connecté, scopé `session.id` |
| `PATCH /api/users/me/password` | `authOnly: true` | changement de son propre mot de passe, scopé `session.id` |
| `POST /api/users/resend-invitation` | `authOnly: true` | renvoi d'invitation ; contrôle porté par le handler |
| `GET/POST /api/users` | `authOnly: true` | liste/création d'utilisateurs de la societe (`requireCompany`) ; cible future : `utilisateurs:voir` / `utilisateurs:creer` une fois habilitées |

**BACKFILL REQUIS** : `GET /api/company-bank-accounts` → `parametres:voir` une fois le module
effets habilité par ce permission. Les autres lignes du tableau listent la cible future.

### État de l'inventaire après E1

192/192 handlers de `app/api/**/route.ts` ont une protection explicite (**175 `permission`, 17
`authOnly`**), 0 sans garde — inventoire vérifié par script (regex sur l'objet de config passé à
`apiRoute.<get|post|put|patch|delete>`).

### Tests

`lib/__tests__/api-route.test.ts` (14 tests) : 401 sans session, 403 sans permission, 422 corps,
422 query-string, 500 sans fuite de `error.message` (le `requestId` du corps correspond bien au
champ du log serveur), `authOnly` authentifié-passant, ordre des gardes (401 puis 403 avant
`requireCompany`).


## Migration body → `schema` — lot E2a (Annexe A, identité/paramètres/catalogue) (2026-10-22)

La lecture du body des routes suivantes passe par le champ `schema` de la config `apiRoute`
(parse avant handler, échec → **422** `{ error: "Données invalides", issues, success: false }`,
**STRIP des clés inconnues** = correction mass-assignment S-7) ; `await request.json()` supprimé
de chaque handler migré :

| Route | Schéma (`lib/schemas/`) | Champs couverts |
|---|---|---|
| `POST /api/users` | `user.ts` → `createUserSchema` | `name`/`email` min 1, `password` min 6, `role` enum `ADMIN\|USER`?, `permissions`/`companyIds` `string[]`? |
| `PATCH /api/users/[id]` | `user.ts` → `updateUserSchema` | `name`/`email`?, `role` enum?, `password` min 6?, `permissions`?, `actif` bool?, `companyIds`? ; `data` typé `Prisma.UserUpdateInput` (était `Record<string, unknown>`) |
| `PATCH /api/users/me` | `user.ts` → `meUpdateSchema` | `name`?, `email`? |
| `PATCH /api/users/me/password` | `user.ts` → `changePasswordSchema` | `currentPassword` min 1, `newPassword` min 6 (les 2 anciens 400 manuels disparaissent au profit du 422 ; les 400 OAuth / « mot de passe actuel incorrect » restent dans le handler) |
| `POST /api/users/resend-invitation` | `user.ts` → `resendInvitationSchema` | `userId` min 1, `password`? (sans min — fallback aléatoire conservé) |
| `POST /api/setup/company` | `company.ts` → `companySetupSchema` | identité/fiscal complète, `name` requis, `type`/`devise` defaultnés (400 « Le nom est requis » manuel remplacé par le 422) |

**Routes publiques NON wrappées** (le wrapper imposerait un 401 — cf. § « Rate limiting ») mais
désormais validées avec `safeParse` + **le même contrat 422** que le wrapper (via `errorResponse`
de `lib/schemas.ts`), sans changer le reste du comportement (ordre des rate limits IP→email,
403 « inscription fermée », 404, 409, catch 500, JSON malformé toujours en 500) :

| Route | Schéma | Champs |
|---|---|---|
| `POST /api/auth/register` | `auth.ts` → `registerSchema` | `name`/`email` min 1, `password` min 6 |
| `POST /api/auth/resend-code` | `auth.ts` → `resendCodeSchema` | `email` min 1 |
| `POST /api/users/verify-email` | `auth.ts` → `verifyEmailSchema` | `email` min 1, `code` min 1 |

**Non migrée — `POST /api/users/check-status`** : le body n'est lu que pour être *comptabilisé*
dans le rate limit IP (« un corps malformé ou vide compte aussi », parité historique) et n'est
jamais exploité — ajouter une validation changerait ce comportement documenté. Aucune ligne
modifiée.

**Durcissement assumé (aucun formulaire in-repo impacté)** : un `password` < 6 sur
`PATCH /api/users/[id]` est désormais rejeté en 422 (avant : silencieusement ignoré, le
`edit-user-dialog` impose déjà `minLength=6` et n'envoie jamais un password vide).

Preuves + liste complète : entrée CHANGELOG `[2026-10-22] Backend (lot-e2a-schemas-identite/E)`.

## Lot E2c (6c) — formulaires branchés sur les schémas partagés (2026-10-23)

Suite du lot E2a : les formulaires consommateurs des routes du tableau ci-dessus valident
désormais avec **les mêmes schémas `lib/schemas/*` que le serveur** (source unique de règles,
zéro `lib/schemas/*` réécrit, 0 changement visuel, 0 changement de data-flow). Détail entreprise/
NGP : `docs/wiki/parametres.md` § E2c.

| Formulaire | Schéma | Mécanisme | Règles avant → après |
|---|---|---|---|
| `register-form.tsx` | `registerSchema` | `safeParse` dans `handleSubmit` avant `mutateAsync` (échec → `notify.warning`) | `required` ×3 + `minLength={6}` retirés (couverts par `min(1)`/`min(6)`) ; `type="email"`/`type="password"` conservés |
| `company-setup-form.tsx` | `companySetupSchema` | `safeParse` avant le `fetch` existant ; `setIsLoading(true)` déplacé **après** le safeParse | `required` du `name` retiré (couvert par `min(1)`) ; l'astérisque du label est purement visuel, conservé |
| `create-user-dialog.tsx` (**+ `create-user-login-fields.tsx`**) | `createUserSchema` | `zodResolver` sur le formulaire **parent** (le sous-composant n'a pas de formulaire propre ; le Governor n'avait pas repéré le parent — `useForm(` hors regex) ; `selectedCompanyIds` lu via `form.getValues` (champ UI stripé par le resolver) | dans `create-user-login-fields` : `required` name/email + `required`/`minLength` password retirés (couverts par le resolver) ; **`pattern` email conservé** (`createUserSchema.email` n'a que `min(1)` — retrait = assouplissement non couvert) ; messages inline `formState.errors.*` inchangés (copies du schéma désormais) ; type `CreateUserLoginFormValues = Pick<CreateUserInput, …> & { role; permissions; selectedCompanyIds }` |
| `edit-user-dialog.tsx` | `updateUserSchema` | **`safeParse` du payload delta + `setError`** (PAS de `zodResolver` : il rejetterait le `password: ""` « laisser vide pour conserver » à `min(6)` et bloquerait toute sauvegarde sans nouveau mdp) | `minLength={6}` du password retiré (couvert) ; `required` name/email **conservés** (optionnels dans le schéma → UI plus stricte) ; erreur affichée via **`FieldError`** (`text-[11px]`) sous l'input, `clearErrors()` au resubmit valide |
| `profil-settings-client.tsx` | `meUpdateSchema` | `safeParse` avant le `fetch` PATCH existant (échec → `notify.warning` ; `setIsSaving` après le safeParse) | `required` name/email **conservés** (optionnels dans le schéma) |
| `securite-settings-client.tsx` | `changePasswordSchema` | `safeParse` **après** la garde d'égalité actuel/mis à jour (même toast « Mots de passe différents » en tête), avant `mutateAsync` — data-flow `useChangePassword` intact | `required`+`minLength` de `currentPassword`/`newPassword` retirés (couverts par `min(1)`/`min(6)`) ; `required`+`minLength` de `confirmPassword` **conservés** (champ absent du schéma) |

- **Le « durcissement silencieux » E2a est désormais intercepté côté client** : un `password`
  < 6 dans `edit-user-dialog` est signalé en inline `FieldError` (avant : bulle native
  `minLength`), et un `code` NGP vidé en inline-edit est bloqué par `notify.warning` (avant :
  422 serveur).
- Aucun composant, style ni toast de succès modifié ; `sonner`/`alert()` jamais utilisés.
- Preuves + tableau complet : entrée CHANGELOG `[2026-10-23] Frontend (lot-e2c-schema-partage-formulaires/E)`.

## Lot E2f — correctifs QA du cycle E (2026-10-23)

Revue `qa` du 2026-10-23 sur le branchement E2c : **2 BLOQUANTS + 3 WARNINGS**, tous traités ici.
Périmètre strict = ces 5 findings, **0 changement visuel** (Operate / conformité uniquement).

| Finding | Fichier | Correction |
|---|---|---|
| **B1** | `company-setup-form.tsx` | Envoi de `JSON.stringify(payload)` (brut) → **`createCompany.mutate(parsed.data)`** : le type `z.infer` du schéma part désormais au serveur. Échec `safeParse` → `notify.warning` + **rien envoyé** (déjà le cas, conservé) |
| **B2** | `company-setup-form.tsx`, `profil-settings-client.tsx` | `fetch()` + `useState(isLoading/isSaving)` remplacés par **`useMutation`** dans `hooks/` (REUSE FIRST : aucun hook `profil`/`setup` existant) : **`useSetupCompany`** (`hooks/use-companies.ts`), **`useUpdateProfil`** (`hooks/use-users-mutations.ts`), **`useProfilQuery`** (`hooks/use-users.ts` — le GET `["me"]` inline est monté en hook lui aussi, sinon le composant contiendrait encore un `fetch(`). États dérivés de `isPending` ; invalidations `["companies"]`/`["user-companies"]`/`["me"]` (setup) et `["me"]` (profil) ; mêmes payloads, mêmes messages d'erreur, mêmes toasts, même redirection ; **0 `useEffect`** |
| **W1** | `edit-user-dialog.tsx`, `profil-settings-client.tsx` | Commentaire `// justifié : …` juste au-dessus de chaque `required` résiduel. **Profil** = choix 1 (les 2 champs sont **toujours** dans le payload). **Edit-user** = **DÉCISION REQUISE** : le payload delta n'envoie `name`/`email` **que s'ils changent** → la formulation « toujours envoyé » y est fausse, commentaire reformulé avec une justification exacte (`required` bloque la saisie vide que le schéma PATCH optionnel sans `min` laisserait passer). **Aucun `required` retiré, aucun schéma rendu plus strict** |
| **W2** | `securite-settings-client.tsx` | `minLength={6}` **déplacé de `confirmPassword` vers `newPassword`** (seul champ porteur de `changePasswordSchema`), `required` conservé sur la confirmation ; les 2 résidus justifiés en commentaire. **Nuance remontée** : `changePasswordSchema` n'a **aucun `refine`** (l'égalité est contrôlée dans le handler) → formulation du mandat adaptée pour rester exacte ; **0 règle de schéma changée** |
| **W3** | `create-user-dialog.tsx` | **STOP / DÉCISION REQUISE — fichier inchangé**. Preuve compilée (3 fichiers de test puis supprimés) : `type = z.input<typeof createUserSchema>` **seul** compile ✓ ; avec `& { selectedCompanyIds: string[] }` (champ UI **absent du schéma**) → **TS2322 sur `ResolverOptions`** ✗ ; cast simple `as Resolver<…>` → **TS2352** ✗. Satisfaire W3 exigerait de **sortir `selectedCompanyIds` du formulaire RHF** (refactor hors périmètre) ou de **créer un champ dans le schéma** (interdit) → remonté au Governor avec les 2 options |

- Aucun fichier `lib/schemas/*`, aucune route `app/api/**`, `lib/api-route.ts` ni `prisma/` touché ;
  0 dépendance installée ; `create-user-dialog.tsx` inchangé.
- Preuves + tableau complet : entrée CHANGELOG `[2026-10-23] Frontend (lot-e2f-correctifs-qa/E)`.

## Lot E2g — W3 levé : cast `as unknown as Resolver` supprimé (2026-10-23)

Correctif unique du finding **W3** d'E2f (revue `qa`), voie A du Governor : **renommer le champ
form UI `selectedCompanyIds` en `companyIds`** (nom canonique déjà présent dans
`createUserSchema`) plutôt que de sortir le champ du formulaire ou de toucher au schéma.

- **`create-user-login-fields.tsx`** : `CreateUserLoginFormValues` n'est plus un type manuel
  (`Pick<CreateUserInput, …> & { role: string; permissions: string[]; selectedCompanyIds: string[] }`)
  mais **`z.input<typeof createUserSchema>`** — source unique = le schéma partagé.
- **`create-user-dialog.tsx`** : `resolver: zodResolver(createUserSchema)` **sans aucun cast** ;
  `defaultValues` / `watch` / `getValues` / `setValue` / `handleSubmit` portent `companyIds`.
  Champs optionnels du schéma (`role`, `permissions`, `companyIds`) : lecture via `?? "USER"` /
  `?? []` (valeur par défaut du formulaire, jamais déclenchée en runtime) — payload **identique**,
  y compris `permissions` conditionnées au rôle et `companyIds` vidé → `undefined`.
- **`create-user-companies-section.tsx`** : prop `selectedCompanyIds` rendue **optionnelle** ;
  l'état « coché » dérive de `selectedCompanies` quand la prop est absente. Nécessaire car le
  composant est **partagé avec `edit-user-dialog.tsx`** (hors périmètre), qui continue de passer
  la prop → **0 changement pour l'édition, 0 changement visuel**.
- **`edit-user-dialog.tsx` inchangé** (mandat) : il utilise `safeParse` en delta, pas `zodResolver`
  → aucun cast à supprimer de son côté ; il passe encore `selectedCompanyIds`, toujours accepté.
- Preuves + sorties exactes : entrée CHANGELOG `[2026-10-23] Frontend (lot-e2g-w3-cast-resolver/E)`.


## Notes

- Le hash de mot de passe ne doit jamais être renvoyé dans une réponse API.
- Flux premier lancement : `/login` → `/register` (admin) → `/verify-email` → `/login` → `/setup/company` → `/`.
- Le schéma Prisma définit la relation avec `user_companies` (snake_case) dans le modèle `user`. Le client Prisma doit utiliser `user_companies` et non `userCompanies` (camelCase) dans les requêtes `include` / `select`.
