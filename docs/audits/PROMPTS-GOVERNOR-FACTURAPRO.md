# Prompts Governor — exécution de l'audit du 7 octobre 2026

Ces prompts exécutent `AUDIT-COMPLET-FACTURAPRO-2026-10-07.md`. Ils sont écrits pour respecter `AGENTS.md` (Graphify d'abord, délégation obligatoire, CODE RULES, validation, `graphify update .`, wiki).

**Mode d'emploi**
1. Coller d'abord le **Préambule commun** (une fois par session, ou le recoller si le contexte est perdu).
2. Coller ensuite **un seul prompt à la fois**, dans l'ordre. Ne passer au suivant qu'après avoir reçu le rapport de clôture du précédent.
3. Chaque prompt se termine par une **checklist de preuves** : le Governor doit coller la sortie réelle des commandes, pas un résumé.

Ordre : **A → B → C → D1 → D2 → D3 → E → F → G → H → I → J → K → L → M**.

---

## Préambule commun (à coller avant chaque lot)

```
Tu es le GOVERNOR AGENT de FacturaPro TN. Applique AGENTS.md à la lettre pour ce lot.

Pipeline obligatoire, dans cet ordre, avec les sorties visibles :
A. GRAPHIFY RESULT  → graphify query / explain / path / affected sur le sujet du lot
B. DEPENDENCY ANALYSIS → nœuds affectés, fichiers impactés, dépendances
C. EXECUTION PLAN → étapes numérotées, fichiers par étape, sous-agent responsable
D. SEULEMENT ENSUITE : délégation aux sous-agents (backend / frontend / database / architecture / qa) via le Task tool. Tu n'écris jamais le code d'implémentation toi-même.

Chaque prompt de délégation contient : contexte Graphify, fichiers impactés, étape du plan, rôle, résultat attendu, rappel des CODE RULES, commandes de vérification.

CODE RULES rappelées à chaque sous-agent :
- `any` interdit (explicite, implicite, `as any`, `Record<string, any>`) → `unknown` + narrowing ou type Zod inféré.
- État serveur uniquement via TanStack Query dans des hooks de `hooks/` ; `fetch()` direct dans un composant interdit.
- État client partagé via Zustand (`lib/stores/create-list-store.ts` si pertinent).
- `useEffect` interdit sauf système externe non réactif, avec commentaire `// Justification useEffect : ...` ET justification dans le plan.
- Toute route API passe par `apiRoute` (nouvelle règle de ce chantier : avec `permission` et `schema` Zod).
- Aucune clé, mot de passe ou URL de connexion dans le code, le wiki ou les logs.
- REUSE FIRST (nouvelle règle de ce chantier) : avant de créer un composant ou un hook, chercher l'existant via graphify query et docs/wiki/ui-kit.md ; dès la 2e occurrence d'un motif, on extrait dans components/shared/.
- Toute modification de schema.prisma → migration + `npx prisma migrate status` propre + `npx prisma generate`.
- Tâche UI : charger les skills `impeccable` puis `make-interfaces-feel-better` avant d'écrire du JSX ; mode Operate (admin/dashboard), pas de Card par réflexe.

Vérifications obligatoires avant de clore (STEP 4.5), chaque commande lancée SEPAREMENT, sans && :
1. npm run lint
2. npx tsc --noEmit
3. npx vitest run
Le lint ne doit pas dépasser la baseline précédente et aucun fichier touché ne doit avoir d'erreur.

Clôture : graphify update . (STEP 5) puis wiki (STEP 6) : fichier du module dans docs/wiki/ + entrée CHANGELOG.md au format `- [DATE] Agent (module) : description — fichiers clés`.
Rapport final : liste exacte des fichiers modifiés, sortie brute des commandes de vérification, écarts assumés, dette restante. Ne déclare jamais un compteur ("0 any", "0 fetch") sans avoir collé la commande qui le prouve.
Si une règle ou un résultat te bloque : STOP et demande-moi, ne contourne pas.
```

---

## Prompt A — P0 : secrets, hygiène du dépôt, `next.config.ts`

```
LOT A — Secrets, hygiène, configuration Next (audit §1.3 ST-1/ST-2/ST-8, §3 S-6/S-11/S-12).

Objectif : fermer les risques opérationnels immédiats sans toucher au métier.

Étapes (sous-agent backend pour le code, architecture pour la revue) :
1. docs/wiki/incident-secrets-2026-09-25.md indique qu'aucune rotation n'a été faite. NE PAS faire la rotation toi-même : produire dans ce même fichier une checklist datée et vérifiable (AUTH_SECRET, DATABASE_URL, identifiants SMTP, clés OpenAI/Gemini/Mistral, CRON_SECRET) et me demander de confirmer chaque ligne quand c'est fait. Aucune valeur de secret dans le wiki.
2. Supprimer make-jwt.cjs (forge un JWT ADMIN avec un companyId réel). Pour check-ngp.cjs, check-tables.cjs, diag-colisage.ts, refactor.js, update_next_number.js, ts_files.txt, ts_files_filtered.txt, lint-output.txt : faire un grep de références, me lister les candidats, puis déplacer vers scripts/dev/ ceux qui servent encore et supprimer le reste APRÈS mon accord.
3. .gitignore : ajouter .env*, *.tsbuildinfo, lint-output.txt, graphify-out/cache, graphify-out/.graphify_*, public/uploads/, public/temp/. Vérifier avec git ls-files ce qui est déjà suivi et proposer les git rm --cached (ne pas les exécuter sans accord).
4. next.config.ts :
   - compiler.removeConsole → { exclude: ["error", "warn"] } en production.
   - images.remotePatterns : remplacer `**` par la liste réelle des hôtes utilisés (grep des next/image et des URLs distantes) ; si aucun hôte distant, supprimer remotePatterns.
   - Ajouter headers() : Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options (ou frame-ancestors), Referrer-Policy, Permissions-Policy, et une Content-Security-Policy en mode Report-Only d'abord.
5. Ajouter eslint globalIgnores pour prisma/generated/** et graphify-out/** dans eslint.config.mjs.

Preuves attendues : contenu final de next.config.ts, git status, `grep -rn "make-jwt" .` (vide), lint/tsc/vitest.
Ne touche à aucune route API ni au schema Prisma dans ce lot.
```

---

## Prompt B — P0 : sécurité applicative (S-1, S-2, S-3, S-4)

```
LOT B — Sécurité applicative (audit §3 : S-1 salt JWT, S-2 isolation des paiements, S-3 session périmée, S-4 permissions manquantes).

Sous-agents : backend (implémentation), qa (tests d'isolation), architecture (revue de la session unique). Graphify d'abord : graphify explain "lib/session.ts", graphify affected "getSessionFromRequest", graphify explain "apiRoute".

B1 — Session unique (S-1, S-3)
- proxy.ts et lib/session.ts décodent le JWT avec salt fixe "authjs.session-token". En HTTPS le cookie est __Secure-authjs.session-token et le salt doit être le nom du cookie. Corriger : dériver le salt du nom du cookie réellement lu, dans UNE fonction partagée lib/session-token.ts utilisée par les deux fichiers.
- Remplacer le parsing manuel de l'en-tête cookie par next/headers ou request.cookies.
- Dans getSessionFromRequest : appliquer lastActivity (même règle que le callback jwt) et relire `actif`, `role`, `permissions` depuis la base avec un cache mémoire très court (≤ 30 s, clé = userId) pour éviter une requête par appel API ; invalidation à la mise à jour d'un utilisateur. Un utilisateur désactivé ou rétrogradé doit perdre l'accès en ≤ 30 s.
- Test Vitest : token valide, token expiré (lastActivity), utilisateur désactivé, permissions modifiées, cookie __Secure- et non sécurisé.

B2 — Isolation multi-société des paiements (S-2)
- app/api/payments/route.ts : remplacer prisma.invoice.findUnique et prisma.achat.findUnique par findFirst({ where: { id, companyId } }) ; vérifier que tiersId correspond à la facture/achat (sinon 400).
- lib/invoice-payment.ts : applyPaymentToInvoice, applyPaymentToAchat, applyEffetEmisPayment reçoivent companyId et filtrent dessus ; lever une erreur typée si la ressource n'appartient pas à la société.
- Balayer app/api et lib avec `grep -rnE "findUnique\(\{ where: \{ id" ` : pour chaque occurrence, classer (a) légitime car dérivée d'une ressource déjà scopée, (b) à corriger. Corriger les (b) ; lister les (a) dans le wiki. Tiers/Product/Categorie restent hors périmètre (décision documentée audit-scope-multi-societe.md).
- Tests : un utilisateur de la société A ne peut ni lire ni payer ni annuler une facture/achat de la société B (404).

B3 — Permissions (S-4)
- Ajouter permission aux routes tresorerie, tresorerie/evolution (paiements:voir), dashboard (clé dédiée à créer dans lib/permissions.ts si absente, et à ajouter aux rôles par défaut), search, stock-mouvements, effets/* (effets:voir), notifications (auth seule assumée et documentée).
- Fournir la matrice avant/après (route → permission) dans docs/wiki/auth.md. Aucune permission retirée à un rôle existant sans mon accord.

Règles : pas de any, pas de useEffect, pas de nouveau fetch côté client. Aucun changement de schema Prisma.
Preuves : tests verts, grep des findUnique restants avec classification, matrice des permissions, lint/tsc/vitest.
```

---

## Prompt C — P0 : authentification (écran de progression + correction du retour au login)

```
LOT C — Authentification (audit §4).

Problème observé : clic "Se connecter" → spinner → skeleton → retour au login → (2e tentative) → dashboard.
Cause probable à CONFIRMER d'abord par lecture : "Se souvenir de moi" décoché → token.rememberMe=false → proxy.ts exige le cookie __session-marker → ce cookie n'est écrit que par SessionMarker (session-provider.tsx, dans un useEffect, après la navigation) → proxy supprime le cookie d'auth et redirige vers /login. Aggravants : double export (default auth + proxy) dans proxy.ts ; router.push suivi de router.refresh ; AppLayout bloque sur auth()+3 count() ; second skeleton dans DashboardClient ; /api/users/check-status public (énumération de comptes).

Sous-agents : architecture (décision marqueur), backend, frontend (charger impeccable puis make-interfaces-feel-better avant tout JSX), qa.

C1 — Décision d'architecture (avant de coder, me la soumettre)
Option 1 : Server Action de login qui appelle signIn côté serveur puis pose __session-marker en httpOnly, signé et lié au token, dans la même réponse.
Option 2 : abandonner le marqueur "fermeture du navigateur" et ne garder que l'inactivité (30 min / 7 j) déjà gérée dans le callback jwt.
Donne tes recommandations avec impacts ; attends mon choix avant C2.

C2 — Backend
- proxy.ts : un seul export (supprimer l'export default auth(...) mort), salt dérivé du cookie (réutiliser lib/session-token.ts du lot B), redirection /login → dashboard si déjà authentifié, aucune suppression de cookie sur simple absence de marqueur sans journalisation.
- lib/auth.ts : sous-classes de CredentialsSignin avec `code` = invalid_credentials | deactivated | unverified | rate_limited ; authorize les lève au lieu de renvoyer null. Le message de rate-limit expose le délai restant. Supprimer ensuite /api/users/check-status du flux de login (ou le conserver uniquement pour verify-email, sans révéler l'état avant authentification).
- app/(auth)/login/page.tsx : ne plus interroger la base à chaque rendu si évitable (cache court de hasAdmin) ; redirect si session active.
- app/(app)/layout.tsx : sortir les 3 count() du chemin critique (composant serveur de sidebar dans Suspense avec fallback), supprimer le blocage inutile.

C3 — Frontend
- lib/stores/auth-progress-store.ts (Zustand) : phase, percent, label, error.
- hooks/use-login.ts : une mutation qui enchaîne des jalons réels et met à jour le store : 0-30 % vérification des identifiants (signIn), 30-50 % session, 50-70 % profil/société/permissions (prefetchQuery), 70-95 % préchargement du dashboard (prefetchQuery /api/dashboard via hook existant), 95-100 % router.replace. Pas de router.refresh. Pas de minuteur factice : le pourcentage reflète l'avancement réel, avec interpolation animée entre jalons (motion).
- components/auth/auth-progress-screen.tsx : plein écran, logo de l'application au centre, barre (components/ui/progress.tsx), pourcentage, libellé de l'étape, role="progressbar" + aria-valuenow, respect de prefers-reduced-motion.
- components/auth/login-form.tsx : React Hook Form + Zod, à l'échec retour au formulaire avec e-mail conservé, mot de passe vidé et focus, <Alert variant="destructive"> inline avec message par code d'erreur + toast via le futur notify (si le lot F n'est pas fait, toast enrichi provisoire avec titre explicite, jamais "Erreur" seul).
- Un seul skeleton cohérent entre loading.tsx et DashboardSkeleton.
- Zéro useEffect, zéro fetch direct dans les composants d'auth (verify-email/page.tsx et register-form.tsx inclus : migrer vers hooks/use-auth.ts).

C4 — QA
Tests : succès (rememberMe on/off), mauvais mot de passe, compte désactivé, non vérifié (redirection verify-email), rate-limit, HTTPS (cookie __Secure-). Vérification manuelle décrite pas à pas dans le rapport.

Critères d'acceptation : jamais de retour au login après des identifiants valides ; un seul écran de chargement avec progression 0→100 % ; échec → login avec message explicite en moins d'une seconde après l'étape 1.
Preuves : grep de useEffect et fetch( sur components/auth et app/(auth), proxy.ts final, lint/tsc/vitest.
```

---

## Prompt D1 — P1 : trésorerie, modèle de données et backfill

```
LOT D1 — Trésorerie : modèle de données (audit §5).

Constat à re-vérifier avant de coder : app/api/tresorerie/route.ts calcule solde = Σ Payment.montant sans signe ; chèque émis encaissé classé "entrée" (cheques/[id]/encaisser) ; effets créés avec methode "VIREMENT" codée en dur (effets/[id]/route.ts, lib/invoice-payment.ts) ; PaymentMethod n'a pas EFFET ; paiements d'effets en EN_ATTENTE comptés dans le solde ; annuler/rejeter font payment.delete ; MouvementFinancier (avoirs) ignoré ; aucun compte ni solde initial.

Sous-agents : database (HARD STOP : migration + prisma migrate status + generate), architecture, qa.

Étapes :
1. Graphify : graphify explain "Payment", "Cheque", "Effet", "MouvementFinancier", "CompanyBankAccount" + graphify affected sur chacun.
2. Concevoir avec architecture puis me SOUMETTRE le schéma avant migration : enums SensMouvement (ENCAISSEMENT/DECAISSEMENT), ModeReglement (ESPECES/CHEQUE/VIREMENT/EFFET/CARTE), StatutMouvement (PREVU/REALISE/ANNULE), TypeCompte (CAISSE/BANQUE) ; modèles CompteTresorerie (companyId, type, libelle, bankAccountId?, soldeInitial, dateSoldeInitial) et MouvementTresorerie (companyId, compteId, sens, mode, statut, montant toujours positif, devise, dateOperation, dateValeur?, dateEcheance?, tiersId?, invoiceId?, achatId?, avoirId?, chequeId?, effetId?, paymentId?, reference?, annuleParId? pour la contre-passation) ; index (companyId, statut, dateValeur) et (companyId, compteId). Pas de delete : annulation = écriture inverse.
3. Migration Prisma additive (aucune colonne existante supprimée). Ajouter la valeur EFFET à l'enum PaymentMethod dans la même migration.
4. Script de backfill idempotent prisma/backfill-mouvements-tresorerie.ts :
   - sens : invoiceId → ENCAISSEMENT ; achatId → DECAISSEMENT ; sinon cheque.type / effet.type (RECU → ENCAISSEMENT, EMIS → DECAISSEMENT) ; à défaut, marquer "A_QUALIFIER" dans un rapport CSV et NE PAS inventer.
   - mode : effetId présent → EFFET ; sinon methode.
   - statut : EN_ATTENTE/CONFIRME/ANNULE → PREVU/REALISE/ANNULE.
   - un compte CAISSE et un compte BANQUE par société, solde initial = 0 (à saisir ensuite par l'utilisateur).
   - mode dry-run par défaut, écrit un rapport de réconciliation : par société, ancien "solde actuel" vs nouveau solde recalculé, et liste des paiements à qualifier.
5. Ne PAS encore modifier l'API ni l'UI de la trésorerie (lots D2/D3). Ne supprimer aucune donnée.

Preuves : schema diff, fichier de migration, `npx prisma migrate status` propre, sortie du dry-run sur la base de dev, lint/tsc/vitest.
```

---

## Prompt D2 — P1 : trésorerie, calcul pur, API, alimentation des mouvements, tests

```
LOT D2 — Trésorerie : calcul, API et écritures (audit §5.4). Prérequis : lot D1 clos.

Sous-agents : backend, qa (tests en premier ou en parallèle), architecture.

Étapes :
1. lib/tresorerie/compute.ts : fonctions PURES (aucun accès base) en Big.js/Decimal, jamais Number(), arrondi 3 décimales TND :
   - soldeReel(compte) = soldeInitial + Σ(REALISE, ENCAISSEMENT) − Σ(REALISE, DECAISSEMENT)
   - aRecevoir = Σ(PREVU, ENCAISSEMENT) ; aPayer = Σ(PREVU, DECAISSEMENT) ; enRetard = PREVU avec dateEcheance < aujourd'hui (totalisé à part)
   - previsionnel = soldeReel + aRecevoir − aPayer
   - ventilation par mode ET par sens pour un mois et pour l'évolution (espèces, chèque, virement, effet, carte)
   - projection hebdomadaire incluant les échéances en retard sur la semaine 1
2. Écritures : créer lib/tresorerie/ledger.ts (enregistrerMouvement, annulerMouvement par contre-passation) et l'appeler depuis : lib/invoice-payment.ts (3 fonctions), cheques/[id]/encaisser, annuler, rejeter, effets/[id] (PAYE, IMPAYE, REMIS_ESCOMPTE avec agios en décaissement, ENDOSSE), payments/[id] (confirmation/annulation), avoirs (MouvementFinancier). Tout dans la même transaction que l'opération métier.
   - Chèque émis : PREVU à la création, REALISE au débit — il ne peut jamais produire un ENCAISSEMENT.
   - Effet : mode EFFET, jamais VIREMENT. Corriger les 3 endroits qui codent "VIREMENT" en dur.
   - Remplacer payment.delete (annuler/rejeter chèque) par une contre-passation + statut ANNULE.
   - Corriger la confirmation d'un paiement d'effet sans facture/achat (payments/[id]/route.ts L20-21 : condition invoiceId || achatId) pour qu'un effet émis autonome puisse être confirmé.
3. app/api/tresorerie/route.ts et /evolution : réécrire en utilisant compute.ts + groupBy SQL (plus de findMany massifs ni de comptage toutes périodes), permission paiements:voir (lot B), réponse typée par un type partagé exporté depuis lib/types (supprime la duplication TresorerieData du client).
4. Tests Vitest (≥ 25) sur compute.ts et ledger.ts, dont le cas pivot : encaissement client 1 000 espèces + chèque reçu 500 encaissé + virement fournisseur 300 + chèque émis 200 débité + effet émis 400 payé → solde réel 600 ; un chèque émis n'augmente jamais le solde ; un effet n'apparaît jamais dans "virements" ; annulation = contre-passation ; arrondis à 3 décimales ; échéances en retard comptées.
5. Backfill en mode réel UNIQUEMENT après mon accord sur le rapport de réconciliation du lot D1.

Ne touche pas à l'UI (lot D3).
Preuves : sortie des tests, requête SQL de réconciliation avant/après, grep `"VIREMENT"` dans lib/ et app/api/effets (aucun code en dur pour effets), lint/tsc/vitest.
```

---

## Prompt D3 — P1 : trésorerie, interface

```
LOT D3 — Trésorerie : interface (audit §2.4, §5). Prérequis : lots D2 (et idéalement F et G).

Sous-agent frontend. Charger impeccable puis make-interfaces-feel-better avant tout JSX. Mode Operate : lisibilité, cohérence, pas de décoration.

Étapes :
1. Découper components/paiements/tresorerie-client.tsx (694 l.), tresorerie-echeances.tsx (513 l.), tresorerie-evolution-chart.tsx en : PageHeader, KpiGrid (solde réel, à recevoir, à payer, en retard, prévisionnel), carte "Entrées / Sorties du mois" ventilée par mode (espèces, chèque, virement, effet, carte), graphique d'évolution avec TOUS les modes et un sélecteur entrées/sorties, échéancier avec onglet "En retard", mouvements récents. Chaque fichier ≤ 250 lignes.
2. Remplacer les 3 fmt() locaux par formatTND (lib/decimal.ts) / cellule MoneyCell partagée. Supprimer le type TresorerieData local : importer le type partagé du lot D2.
3. Distinguer visuellement ENCAISSEMENT (entrée) et DECAISSEMENT (sortie) : signe, couleur ET icône (pas la couleur seule), badge de mode (espèces, chèque, virement, effet, carte), badge de statut (prévu / réalisé / annulé).
4. Sélecteur de compte (toutes / caisse / banque) et saisie du solde initial (permission paiements:modifier).
5. États : ListSkeleton, EmptyState, ErrorState avec "Réessayer" ; toasts via notify (lot F) avec actions "Voir le document".
6. Mutations (confirmer/annuler un mouvement) uniquement via hooks/use-tresorerie.ts ; zéro fetch, zéro useEffect, zéro useMutation dans les composants.

Critères d'acceptation : le jeu de test du lot D2 affiche solde 600 et chaque mode dans la bonne colonne et le bon sens ; aucun fichier > 250 lignes.
Preuves : wc -l des nouveaux fichiers, grep useEffect/fetch/useMutation sur components/paiements, captures décrites, lint/tsc/vitest.
```

---

## Prompt E — P1 : `apiRoute` avec schéma Zod et permission obligatoires

```
LOT E — Durcissement d'apiRoute (audit §3 S-4/S-7, §6 AG-7).

Sous-agents : backend, qa, architecture.

Étapes :
1. lib/api-route.ts : ajouter à RouteConfig `schema?: ZodType` (body) et `query?: ZodType` ; parse automatique avant le handler, 422 homogène { error, issues } ; le handler reçoit `body` et `query` typés (z.infer). `permission` devient OBLIGATOIRE sauf `{ authOnly: true }` explicite et justifié par un commentaire. Les 500 renvoient un message générique + requestId (crypto.randomUUID) ; le détail part dans le logger avec le même requestId. Plus de error.message brut au client.
2. Créer lib/logger.ts (pino ou équivalent sans dépendance lourde) : niveau par env, jamais de donnée sensible, requestId.
3. Migrer les 26 routes de l'Annexe A de l'audit vers `schema` (créer les schémas dans lib/schemas/, partagés avec les formulaires côté client) : companies, companies/[id], users, users/[id], users/me, users/me/password, users/resend-invitation, invoices/[id], quotes/[id], quotes/[id]/convert, bons-commande/[id], avoirs/[id], achats/[id], notifications, settings, settings/app, bons-livraison/[id], products/[id]/stock-movements, payments/[id], ngp-codes, ngp-codes/[id], setup/company. Les routes publiques (auth/*, users/check-status, users/verify-email) gardent leur garde propre mais valident aussi avec Zod.
4. settings/app (S-5) : ne mettre à jour une clé API que si la valeur reçue ne commence pas par "••••" ; ne jamais renvoyer une clé en clair (le PUT renvoie aujourd'hui l'objet non masqué) ; chiffrer les clés au repos (AES-256-GCM, clé d'environnement dédiée, migration des clés existantes) ; Zod.
5. Crons (S-8) : refuser si CRON_SECRET est absent (la condition actuelle `CRON_SECRET && ...` ouvre la route) ; cron/tmm-bct doit aussi être authentifié.
6. Script scripts/check-rules.mjs qui liste les routes sans permission ni schema ; il doit sortir 0 hors liste blanche documentée.

Preuves : sortie de check-rules, tests (422 sur body invalide, 403 sans permission, 500 sans fuite de message), lint/tsc/vitest.
```

---

## Prompt F — P1 : socle UX (notifications, états de chargement/erreur)

```
LOT F — Socle UX (audit §2.6, ST-6).

Sous-agents : frontend (charger impeccable puis make-interfaces-feel-better), qa.

Constat chiffré : 267 appels toast, 129 `toast(` nus, 70 titres "Erreur", 10 titres vides (nouveau-devis-actions.tsx, nouvelle-facture-actions.tsx, ...), 5 actions, 78 err.message bruts, 7 alert()/confirm() natifs, 20 catch vides ; 1 seul loading.tsx, 1 seul error.tsx, ni not-found ni global-error.

Étapes :
1. lib/notify.ts + components/shared/app-toast.tsx. API :
   notify.success({ title, description?, footer?, action? })
   notify.error({ title, error: unknown, context?, retry?, details? })
   notify.warning(...) ; notify.promise(promise, { loading, success, error })
   - Header = verbe + objet ("Facture F-2026-0042 enregistrée"), jamais "Erreur" seul, jamais vide.
   - Corps = phrase actionnable ; mapping ApiError.status → message métier (401, 403, 404, 409, 422, 429, 5xx, réseau) ; jamais le message serveur brut.
   - Footer = référence technique discrète (code, requestId, horodatage) + bouton "Copier les détails".
   - Actions : "Voir le document", "Annuler" (undo 5 s sur suppression), "Réessayer" sur réseau/5xx.
2. Étendre lib/api-error.ts (ApiError porte requestId et code métier) et créer lib/api-client.ts : apiFetch<T>() unique, typé, basé sur handleApiResponse.
3. Migrer TOUS les appels sonner vers notify, module par module (72 fichiers), en enrichissant chaque message réellement (pas un simple renommage). ESLint no-restricted-imports : sonner interdit hors lib/notify.ts.
4. Remplacer les 7 alert()/confirm() par ConfirmDialog ; traiter les 20 catch vides (journaliser ou notifier).
5. Composants partagés : EmptyState, ErrorState (avec Réessayer), ListSkeleton, DetailSkeleton ; app/not-found.tsx, app/global-error.tsx ; loading.tsx et error.tsx pour factures, clients, fournisseurs, achats, paiements, effets, cheques, produits, stock-mouvements ; ErrorBoundary autour des graphiques.
6. Les erreurs de formulaire restent affichées inline (champ + Alert en tête du dialog) ; le toast n'est jamais le seul signal.

Preuves : grep `from "sonner"` (uniquement lib/notify.ts et components/ui/sonner.tsx), grep `toast(` (0), grep `alert(|confirm(` (0), liste des loading.tsx/error.tsx, lint/tsc/vitest.
```

---

## Prompt G — P2 : kit de composants partagés

```
LOT G — Kit partagé (audit §2.5).

Sous-agents : frontend (impeccable + make-interfaces-feel-better), architecture, qa (détection de duplication).

Étapes :
1. Inventaire : graphify query sur "dialog", "stat-card", "filter", "page header", "skeleton" ; produire docs/wiki/ui-kit.md listant ce qui existe (data-table, StatCard, confirm-delete-dialog, line-items-table, form-actions, product-select, variant-select, status-badge) et les motifs dupliqués avec le nombre d'occurrences réel (mesure par grep, pas d'estimation).
2. Créer dans components/shared/ : PageHeader, KpiGrid (sur StatCard), EntityFormDialog (React Hook Form + Zod, footer standard, état pending, erreurs inline), ConfirmDialog (étendre confirm-delete-dialog), FilterBar (branchée sur lib/stores/create-list-store.ts), SectionCard, FormField, MoneyCell, DateCell, StatusBadge générique piloté par une table de configuration (remplace les 483 lignes de status-badge.tsx sans changer le rendu).
3. Supprimer les 3 fmt() de components/paiements, les formatDate locaux (effet-detail-client, lettre-de-change, product-stock-movements, effets/[id]/preview) au profit de lib/utils.ts et lib/decimal.ts.
4. Migrer 5 modules pilotes (clients, fournisseurs, achats, factures, effets) vers le kit ; chaque migration conserve le rendu (comparer avant/après) ; consigner le gain en lignes.
5. Remplacer dans docs/wiki/ui-dialogs.md la règle "≥ 2 consommateurs réels" par "dès la 2e occurrence d'un motif, on extrait" et ajouter la règle REUSE FIRST à AGENTS.md (après validation de ma part).

Critères : aucun composant partagé sans au moins 3 usages réels après migration ; zéro changement visuel non voulu ; zéro any/useEffect/fetch dans le kit.
Preuves : docs/wiki/ui-kit.md, wc -l avant/après des 5 modules, lint/tsc/vitest.
```

---

## Prompt H — P2 : migration des `fetch()` et mutations inline vers des hooks

```
LOT H — Server state dans des hooks (audit §2.3). Prérequis : lot F (notify, apiFetch).

Sous-agents : frontend, backend (pour app/actions), qa.

Périmètre exact (45 fetch / 21 fichiers + 24 useQuery/useMutation inline / 14 composants) :
- app/actions/bons-commande.ts (12 fetch : une server action ne doit pas appeler sa propre API HTTP → appeler directement la couche service/prisma, ou migrer vers une route + hook)
- components/entreprises/entreprise-banques-client.tsx, components/produits/product-suppliers-section.tsx, components/parametres/general-settings-client.tsx, profil-settings-client.tsx, facturation-settings-client.tsx, utilisateurs-settings-client.tsx, components/customizer/customizer-studio.tsx, command-palette.tsx, layout/notifications-popover.tsx, atelier/nouveau-of-dialog.tsx, achats/scan-upload-screen.tsx, auth/register-form.tsx, setup/company-setup-form.tsx, produits/etiquettes-produits-dialog.tsx, product-fiches-list.tsx, product-supplier-price-history.tsx, product-supplier-comparison.tsx, entreprises/entreprises-list-client.tsx, effets/impression-effets-client.tsx, app/(auth)/verify-email/page.tsx, app/actions/achats.ts.

Étapes : pour chaque module, hooks/use-<module>.ts exposant list/detail/create/update/delete ; queryKeys centralisées dans lib/query-keys.ts ; invalidation dans onSuccess ; toasts via notify dans le hook ou via callbacks passés par le composant (choisir une convention unique et la documenter) ; composants sans fetch, sans useQuery, sans useMutation. Corriger au passage le bug connu `_count.utilisateurs` (entreprise-detail-client.tsx:57).
Procéder par lots de 3 à 4 fichiers avec lint/tsc entre chaque lot.

Preuves finales : `grep -rn "fetch(" components app --include=*.tsx` hors app/api (vide), `grep -rn "useMutation(\|useQuery(" components app --include=*.tsx` (vide), lint/tsc/vitest.
```

---

## Prompt I — P2 : découpage des gros composants

```
LOT I — Découpage (audit §2.4). Prérequis : lot G (kit partagé).

Sous-agents : frontend (impeccable + make-interfaces-feel-better), architecture, qa.

Seuils (à outiller via ESLint max-lines dans ce lot, en warning puis en error une fois la dette résorbée) : composant ≤ 250 l., hook ≤ 200 l., page.tsx ≤ 60 l., route API ≤ 200 l.

Ordre (11 fichiers > 500 lignes, puis les 37 entre 300 et 500) : produit-form-page.tsx (696), effet-detail-client.tsx (671), inventaire-client.tsx (603), gantt-chart.tsx (561), design-canvas.tsx (553), packing-list-client.tsx (519), devis-detail-client.tsx (502), lettre-de-change.tsx (705), lib/packing-list/pdf.ts (755), status-badge.tsx (483, via le lot G), factures-client.tsx (485). Les composants de trésorerie sont traités au lot D3.

Patron par module : page.tsx (composition) → <module>-client.tsx (≤ 120 l.) → kpis / table / dialog / sidebar → hooks/use-<module>.ts → lib/stores → lib/schemas. Logique pure extraite dans des modules testables (comme effet-split-logic.ts). Rendu et comportement identiques (comparaison avant/après) sauf correction explicite signalée.

Un fichier par tâche de délégation ; lint/tsc après chaque fichier. Mettre à jour le wiki du module.
Preuves : tableau wc -l avant/après, grep useEffect/fetch/any sur les fichiers touchés, lint/tsc/vitest.
```

---

## Prompt J — P2 : formulaires `useState` → React Hook Form + Zod

```
LOT J — Formulaires (audit §2.1). Prérequis : lot G (EntityFormDialog, FormField).

Sous-agent frontend. Périmètre : components/atelier/nouveau-matiere-dialog.tsx (9 useState), nouveau-of-dialog.tsx (7), bons-commande/rapprochement-card.tsx (6), parametres/ngp-settings-client.tsx (5), entreprises/entreprise-banques-client.tsx (5), effets/apercu-effet-dialog.tsx (5), atelier/packing-list-client.tsx (5), atelier/ordres-fabrication-client.tsx (5), produits/adjust-stock-dialog.tsx (4), parametres/general-settings-client.tsx (4).

Règle : formulaire ≥ 3 champs = RHF + schéma Zod partagé avec la route (lot E) ; l'état ouvert/fermé d'un dialog reste en useState local (légitime) ; état partagé entre composants = Zustand. Pas de useEffect (valeurs dérivées au rendu, reset via defaultValues/key).
Preuves : compteur useState avant/après par fichier, tests de validation des schémas, lint/tsc/vitest.
```

---

## Prompt K — P3 : tests et outillage des règles (CI)

```
LOT K — Tests et garde-fous (audit §2.8, §6.3). À lancer en parallèle de D/E si possible.

Sous-agents : qa (tests), backend, architecture.

1. Tests prioritaires (Vitest, base de test isolée ou mocks Prisma documentés) : lib/tresorerie/*, lib/invoice-payment.ts (soldes, statuts, annulation), lib/session*.ts, lib/api-route.ts (401/403/422/500), calc-line-totals, TVA/retenue à la source/timbre, numérotation (lib/sequence.ts), status-transitions (étendre). Cible : ≥ 60 % de couverture sur ces modules ; rapport de couverture dans docs/wiki.
2. Tests d'isolation multi-société sur les routes critiques (factures, achats, paiements, chèques, effets) : société A ne voit jamais la société B.
3. ESLint (eslint.config.mjs) : no-restricted-syntax pour fetch hors hooks/ lib/ app/api ; no-restricted-imports pour sonner hors lib/notify.ts ; max-lines (warning) ; règle exigeant `// Justification useEffect :` au-dessus de chaque useEffect ; react-hooks strict.
4. scripts/check-rules.mjs (sans &&) : compteurs any, useEffect non justifiés, fetch dans composants, useMutation/useQuery dans composants, routes sans permission/schema, fichiers > seuils, toast direct. Sortie JSON + code retour ≠ 0 si dépassement.
5. .github/workflows/ci.yml : étapes séparées lint, tsc, vitest, check-rules, gitleaks (secret scan), prisma migrate status.
6. Corriger le dernier any (components/exports/export-detail-lines-table.tsx:34) et auditer les 15 `as unknown as`.

Preuves : sortie de vitest avec couverture, sortie de check-rules, fichier ci.yml, lint/tsc.
```

---

## Prompt L — P3 : performance

```
LOT L — Performance (audit §2.7).

Sous-agents : frontend, backend, architecture.

1. Mesurer d'abord (next build + sortie de taille des routes, ou @next/bundle-analyzer) et consigner les chiffres avant/après dans le wiki. Aucune optimisation sans mesure.
2. Chargement dynamique (next/dynamic, ssr:false si pertinent) pour recharts, three/@react-three, konva/react-konva, jspdf, html2canvas, xlsx, opentype.js sur les seules pages qui les utilisent.
3. GET /api/payments et autres listes non paginées : pagination serveur (cursor ou page/limit) + agrégats SQL ; hooks adaptés (keepPreviousData / placeholderData).
4. callback jwt de lib/auth.ts : supprimer la requête prisma.user.findUnique à chaque auth() (ré-synchronisation périodique ou cache ≤ 30 s, en cohérence avec le lot B).
5. app/(app)/layout.tsx : Suspense autour des compteurs de sidebar (voir lot C).
6. Index Prisma manquants repérés par EXPLAIN sur les requêtes de trésorerie et de listes (ajout par migration).
Preuves : tableau avant/après (taille JS par route, temps de réponse API p50/p95 en dev), lint/tsc/vitest.
```

---

## Prompt M — P3 : dispositif d'agents et hygiène documentaire

```
LOT M — Dispositif d'agents (audit §6). À faire en dernier, après validation de ma part de chaque changement.

Sous-agents : architecture, qa.

1. Vérifier que .opencode/agents/*.md, .opencode/plugins/graphify.js et .agents/skills/* sont bien versionnés (ils étaient absents de l'archive d'audit) ; me dire lesquels manquent.
2. Proposer (sans modifier AGENTS.md avant mon accord) : règle REUSE FIRST ; règle "dès la 2e occurrence, on extrait" ; règle toast/états/erreurs obligatoires (notify, ErrorState, EmptyState, loading.tsx/error.tsx par module) ; règle apiRoute avec permission + schema obligatoires ; trois nouveaux agents (security, test, ux-system) avec leur périmètre, leurs HARD STOP et leurs prompts-types ; mandat d'écriture de tests pour le QA Agent.
3. Compacter docs/wiki/audit-facturapro-suivi.md : un tableau d'une ligne par prompt (statut, commande de preuve unique, date) ; archiver l'historique détaillé dans docs/wiki/archive/. Supprimer le rituel d'empreinte md5 d'AUDIT-FACTURAPRO.md. Archiver CHANGELOG.md par trimestre (≥ 1 000 lignes → docs/wiki/archive/).
4. Remplacer rapport-audit.md (obsolète) par un renvoi vers l'audit courant.
5. Dans AGENTS.md, lever la contradiction "pas de &&" vs scripts de vérification (fournir des scripts Node équivalents).
6. docs/wiki/ui-kit.md et docs/wiki/auth.md à jour.
Preuves : diff proposé d'AGENTS.md (non appliqué avant accord), nouvelle taille des fichiers wiki, liste des fichiers archivés.
```

---

## Prompt de clôture global (après le lot M)

```
Governor : produis le rapport de clôture du chantier "audit du 7 octobre 2026".
Pour chaque lot A→M : statut, fichiers modifiés, preuves collées (sorties brutes).
Relance les commandes de re-mesure de l'Annexe D de l'audit et compare aux valeurs initiales (useEffect 20, fetch 45/21 fichiers, useMutation/useQuery inline 24/14 fichiers, toast( nus 129, fichiers > 300 l. 48, fichiers > 500 l. 11, routes sans permission 21, routes sans schema 26, tests 3 fichiers).
Relance scripts/check-rules.mjs, npm run lint, npx tsc --noEmit, npx vitest run (séparément).
Liste la dette restante et propose le plan du prochain trimestre.
```
