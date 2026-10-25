# Module : Trésorerie

## Fonctionnalités

- **Paiements** : réglés par ESPECES / CHEQUE / VIREMENT / CARTE / EFFET, rattachés à une facture ou un avoir.
- **Chèques** : type RECU / EMIS, banque, statuts (EN_ATTENTE → ENCAISSE / REJETE / ANNULE). Validation : `tiersId` obligatoire (client pour RECU, fournisseur pour EMIS). Les chèques sans facture liée créent des paiements autonomes qui n'affectent pas de solde de facture.
- **Rejet/Annulation cheque** : les cheques en attente peuvent etre rejetes (`POST /api/cheques/[id]/rejeter`) ou annules (`POST /api/cheques/[id]/annuler`). Si le cheque est lie a un paiement, celui-ci est supprime et le solde facture/achat est reinitialise. Utilise `prisma.$transaction` pour l'atomicite.
- **Effets de commerce** : cycle complet (EN_PORTEFEUILLE → REMIS_ESCOMPTE → ENDOSSE → IMPAYE → PAYE), escompte, frais, protêt, rappels J-15/J-10/J-5/J, split d'effet, liaison achats, compte bancaire société. Le listing affiche : N° Effet, ordre de paiement, Type, Tiré, Tireur, Montant, Banque (EMIS : banque du tiré `tireBanque` ; RECU : banque du bénéficiaire `companyBank.nomBanque`), Échéance, Statut.
- **Assistant de création multi-effets EMIS** : depuis le formulaire EMIS, « Échéances à venir » ouvre un assistant qui liste les échéances futures (filtre 30/60/90/120 j + pagination serveur, clic = pré-remplissage) et découpe les achats sélectionnés en N effets EMIS (auto-split au-dessus d'un seuil configurable par entreprise, lignes entièrement éditables, confirmation avec badges « Split i/N » et lien vers chaque détail).
- **Comptes bancaires société** : banque, RIB, agence, défaut.
- **Taux de change** : `taux-bct`, `taux-change` (BCT), conversion vers TND sur documents.
- **TMM (Taux du Marché Monétaire BCT)** : stocké dans `AppSettings` (`tmmTaux Decimal(5,2)`, `tmmMajLe DateTime?`) — utilisé pour le calcul de l'escompte des effets RECU (TMM + 3% banque). Routes `GET/POST /api/tmm-bct` (GET : cache AppSettings < 24h sinon refresh BCT depuis `stat_page.jsp?id=129` avec fallback sur le cache en cas d'échec ; POST : force le refresh) et cron `GET /api/cron/tmm-bct` (Vercel quotidien 02:00 via `vercel.json` ; **depuis le lot E4 2026-10-23 : garde `CRON_SECRET` échec fermé — `Authorization: Bearer <CRON_SECRET>` exigé, sinon 401, et `CRON_SECRET` doit être posée côté Vercel** ; détail `dashboard-rapports.md` § Durcissement E4). Le dialog « Remettre à l'escompte » (effet RECU, hook `useTmmBct`) auto-calcule `tauxEscompte = TMM + 3%` (libellé d'aide « TMM x% + 3% banque », saisie manuelle si TMM indisponible) et le **net encaissé** (`montant − montant×taux/100 − frais`, `computeNetEncaisse`) avec récapitulatif en lecture seule Valeur nominale / Escompte / Net — le champ net reste éditable (imposé par l'agent de banque) mais est recalculé en direct. Le montant d'escompte `montant × taux/100` est calculé au submit et stocké dans `frais` (affiché « Escompte » dans le Financier). Le paiement d'un effet RECU escompté (`netEncaisse` défini) applique le **net encaissé** à la facture liée au lieu du montant nominal — ligne « Net encaissé » + sous-texte « appliqué à la facture {numero} » dans la confirmation de paiement.
- **Alerte échéances** : notifications d'échéance (`Notification`). Route `GET /api/effets/check-echeances` avec cooldown en mémoire (1 email par effet par heure max) — email envoyé uniquement à l'admin de la société, notifications in-app créées pour tous les utilisateurs actifs.
- **Échéancier unifié (Trésorerie)** : l'API `/api/tresorerie` retourne un `echeancier` combinant effets, chèques et paiements récents (30j passé + horizon futur). Chaque item inclut : `date`, `flux` (entree/sortie), `source` (effet/cheque/especes/virement/carte), `montant`, `numero`, `contrepartie`, `status`, `id`, `type`, `ordrePaiementNumero`. Les effets exposent `ordrePaiementNumero` (champ Prisma), les chèques utilisent leur `numero` comme référence, les paiements utilisent `reference` (ou `id` si absent). Le `flux` des paiements est déduit de la relation : `invoiceId` → entrée (paiement client), `achatId` → sortie (paiement fournisseur), défaut → entrée.
- **Architecture Single Source of Truth (Phase 5)** : Le solde réel = Σ Payment (toutes méthodes, tout temps). Les engagements futurs = Chèques EN_ATTENTE + Effets non PAYE/ANNULE. L'échéancier futur = Chèques EN_ATTENTE + Effets non PAYE/ANNULE avec dateEcheance dans [now, horizon]. Les mouvements récents (30j) = Payment avec liens vers chèque/effet. L'échéancier unifié = engagements futurs + paiements réalisés récents. Les récents par méthode = Payment groupé par méthode (ESPECES/VIREMENT/CARTE/CHEQUE) sur 30j. L'agrégat mensuel retourne `{ especesMois, virementsMois, cartesMois, chequesMois }`.
- **Statut des paiements (EN_ATTENTE / CONFIRME)** : les paiements par VIREMENT sont créés avec `status: "EN_ATTENTE"` et ne mettent à jour les montants `montantPaye`/`resteAPayer` de la facture qu'à la confirmation (`PATCH /api/payments/[id]` avec `status: "CONFIRME"`). Les autres méthodes (ESPECES, CARTE, CHEQUE, EFFET) sont immédiatement `CONFIRME`. Le listing paiements affiche le statut avec icônes (CheckCircle vert pour CONFIRME, Clock orange pour EN_ATTENTE) et propose une action "Confirmer" pour les virements en attente. Un paiement `EN_ATTENTE` peut être supprimé sans impact sur les montants facture.

## Modèles de données (Prisma)

- `Payment`, `Cheque`, `Effet`, `EffetAchat`, `CompanyBankAccount`, `MouvementFinancier`, `Notification`, `Sequence`.

## Fichiers clés

- `app/api/payments/`, `app/api/cheques/`, `app/api/effets/` — CRUD
- `app/api/effets/documents-lies/route.ts` — factures/achats liés pour un tiers (filtre montantPaye: 0)
- `app/api/achats/[id]/route.ts` — détail achat avec paiements liés
- `app/api/tresorerie/`, `app/api/company-bank-accounts/`, `app/api/taux-bct/`, `app/api/taux-change/`, `app/api/tmm-bct/`, `app/api/cron/tmm-bct/`
- `app/api/tresorerie/comptes/[id]/route.ts` — PATCH compte de trésorerie (solde initial, lot D3.1)
- `app/(app)/paiements/`, `app/(app)/paiements/cartes/`, `app/(app)/cheques/`, `app/(app)/effets/` — pages UI (Server Components, client logic dans les composants `*-client.tsx` / `*-main-client.tsx`)
- `hooks/use-cheques.ts`, `hooks/use-effets.ts`, `hooks/use-tresorerie.ts`, `hooks/use-tresorerie-echeances.ts`, `hooks/use-payments-queries.ts`, `hooks/use-payments-search.ts`
- `app/api/cheques/[id]/rejeter/route.ts`, `app/api/cheques/[id]/annuler/route.ts` — rejet/annulation cheque
- `lib/types/cheque.ts`, `lib/types/effet.ts`, `lib/types/payment.ts`
- `lib/invoice-payment.ts` — fonctions `applyPaymentToInvoice`, `applyPaymentToAchat`
- `components/paiements/tresorerie-client.tsx`, `components/paiements/tresorerie-echeances.tsx` — **13 fichiers ≤ 250 lignes depuis le lot D3.2** (découpage complet du dossier `components/paiements/` : voir § D3.2)
- `lib/tresorerie/presentation.ts` + `lib/__tests__/tresorerie-presentation.test.ts` — mapping pur de présentation et ses **13 tests** (lot D3.2)
- `components/shared/mode-reglement-badge.tsx`, `components/shared/flux-colors.ts` — 2 briques partagées créées par le lot D3.2 (consommateurs détaillés : `docs/wiki/ui-kit.md` § H.16)

## Migration `apiRoute` — P1-5 Groupe 6 : `effets/check-echeances` (2026-09-28)

| Fichier | Handler | Config wrapper | Statuts / corps conservés |
| --- | --- | --- | --- |
| `app/api/effets/check-echeances/route.ts` | GET | `{}` (session seule à l'origine, ex-L20-21) | **200** cooldown `{ alerts: [], total: 0, message: "Cooldown actif, réessayez plus tard" }` ; **200** `{ alerts, total }` |

- **0 permission ajoutée, 0 retirée** : la route ne faisait que `getSessionFromRequest` + 401 (ex-L20-21) → config `{}`. `requireCompany` **NON activé** : le `companyId` se lit depuis le **query param OU la session** (`new URL(request.url).searchParams.get("companyId") ?? session.companyId`, ex-L28) — imposer la résolution du wrapper couperait ce contournement.
- **Logique préservée à l'identique** : cooldown 1 h (`COOLDOWN_MS` + compteur **module-level** `let lastRunTime`, ex-L6-7), test du cooldown **avant** toute requête DB, `prisma.effet.update` par rappel (`alertKey` = `rappel15j/10j/5j/JourEnvoye`), `prisma.notification.createMany` pour tous les utilisateurs actifs, `sendEmail(...).catch(() => {})` (fire-and-forget) vers l'admin de la société, réponse `{ alerts, total }`.
- `sessionUser` → `session` ; imports morts purgés (`getSessionFromRequest`, `NextRequest`, `errorResponse` — devenu inutilisable une fois le 401 et le `catch` externes supprimés).
- **Nuance du `catch` du wrapper (signalée, non corrigée)** : tag `[api]` au lieu de `[effets/check-echeances/GET]`, et `errorResponse(error.message)` (**message réel**) au lieu du 500 générique « Erreur serveur » (statut 500 inchangé).
- **Méthode strictement identique** : **GET**. **Consommateur inchangé** : `hooks/use-effets-echeances.ts:15` (TanStack Query, `refetchInterval` 300000).

### Décision Option A″ (2026-09-28, validée par l'utilisateur)

**`app/api/taux-bct/route.ts` (GET), `app/api/tmm-bct/route.ts` (GET + POST) et `app/api/taux-change/[devise]/route.ts` (GET) sont laissées MANUELLES (non wrappées) : zéro ligne modifiée dans ces 3 fichiers.**

- **Raison : ce sont des routes publiques par conception.** Elles font **0 appel `getSessionFromRequest`**, **0 permission**, et ne traitent **aucune donnée interne** : ce sont des **proxys d'API externes** (`https://www.bct.gov.tn/bct/siteprod/cours.jsp` pour `taux-bct` et `tmm-bct`, `open.er-api.com` pour `taux-change`), avec un `catch` renvoyant **502** en cas d'échec du tiers. Le wrapper impose `session?.id` → **401** : les wraper rendrait ces proxys inutilisables, et forcerait d'**inventer** une permission qui n'existe pas (interdit). `taux-change/[devise]` n'a de plus **0 appelant** dans le projet (`grep -rn "/api/taux-change" app components hooks lib` → 0) et le **POST** de `tmm-bct` non plus (seul le GET est consommé par `hooks/use-tmm-bct.ts:8`) ; `taux-bct` est lui appelé sans session par `hooks/use-bl.ts:79` et `hooks/use-devis.ts:47`.
- **Alternative B″ écartée** : wrapper ces 3 routes avec `apiRoute` a été explicitement écarté par l'utilisateur au profit de l'**Option A″** (laisser manuelles + documenter). **`lib/api-route.ts` est inchangé** (`md5=437726b8c3bb0c0d0f5463e292a1064f`), aucun flag `public` ajouté.
- Whitelisting conscient pour le QA (skill `api-route-guard`, §2 « route légitimement publique → lister explicitement dans le rapport de sortie ») : routes sans wrapper = **12 / 121**, soit **3 routes de taux** + 5 endpoints publics auth/users + 3 `cron/*` + 1 `setup/company`.

## P2-7 Lot 1 — module Effets sans `useEffect` (2026-09-28)

Nettoyage des **2 `useEffect` non justifiés** du module Effets (audit `AUDIT-FACTURAPRO.md` §6 ; inventaire Governor : **53 occurrences / 38 fichiers — 19 justifiées conservées avec justification écrite, 34 non justifiées identifiées ; Lot 1 livré = 2 supprimés → 32 restantes** ; post-lot `grep -rn "useEffect(" --include=*.ts --include=*.tsx app components hooks lib` → **51** occurrences / 36 fichiers).

1. **`components/effets/apercu-effet-dialog.tsx` (ex-L116, effet `[open, pageIndex]`)** — reset du zoom à 100 % à l'ouverture et à chaque changement de page. **Supprimé** et remplacé par un **bloc d'ajustement au rendu** (nouvelles L115-125, pattern React « storing information from previous renders ») qui suit `prevView { open, pageIndex }` — **exactement les dépendances de l'ancien effet** — et exécute `setPrevView(...)` + `setZoomPct(100)` dès qu'elles changent. Choix motivé (plutôt que « reset dans les handlers ») : `onOpenChange(true)` **ne se déclenche jamais** dans ce dialog (aucun `DialogTrigger` ; les 2 consommateurs ouvrent via `setShowPreview(true)` / `setPreviewOpen(true)` en dehors du Dialog), et le 4ᵉ chemin de changement de page est un `onClick` **JSX** (clic sur la liste du lot, ex-L360) ; le bloc couvre donc l'ouverture **et** les 4 chemins (`goPrev`, `goNext`, `removeFromBatch`, clic liste) par construction, sans toucher au JSX. **0 écart de comportement visible** (zoom 100 % dès l'ouverture et après chaque navigation conservés ; le reset est en plus désormais appliqué au rendu plutôt qu'après peinture → plus aucune frame affichant l'ancien zoom).
2. **`hooks/use-effets.ts` (ex-L53, debounce 300 ms `searchInput → setSearchQuery`)** — **supprimé, hook entier `useEffetSearchDebounce` retiré**. Remplacement : `useEffetsList` lit `searchInput` (store, L50) et calcule `const deferredSearch = useDeferredValue(searchInput)` (L53), utilisé dans le `queryKey` (L56) **et** le paramètre `search` de la `queryFn` (L59) à la place de `searchQuery`. Flux : input DataTable (`searchValue={searchInput}` — filtre client **inchangé**) → store Zustand → `useDeferredValue` → `queryKey` → `fetch /api/effets?search=…`. Le champ `searchQuery` du store n'est plus lu (store laissé tel quel, hors périmètre).
3. **`components/effets/effets-client.tsx`** — appel `useEffetSearchDebounce()` (ex-L52) et import purgés ; `grep -rn "useEffetSearchDebounce" --include=*.ts --include=*.tsx .` → **vide**.

**`useLayoutEffect` conservé (ex-L100, ResizeObserver fit-to-screen)** : **JUSTIFIÉ** — mesure de layout DOM (`clientWidth`/`clientHeight` du stage) + souscription `ResizeObserver` avec cleanup à l'unmount : c'est le cas explicitement autorisé par les CODE RULES (synchronisation avec un système externe non réactif), hors périmètre de ce nettoyage. Le `setTimeout` de `handlePrint` (ex-L155) est dans un handler = conforme, non touché.

## P2-7 Lot 2 — debounces recherche (2026-09-28)

Suppression des **debounce `useEffect` non justifiés** des hooks de trésorerie (suite directe du Lot 1 ci-dessus ; audit `AUDIT-FACTURAPRO.md` §6, 12 sites). Aucun `useEffect` ajouté.

1. **`hooks/use-bl.ts` (ex-L30, debounce 300 ms `searchInput → setSearchQuery`)** — **supprimé** ; `useBLSearchDebounce()` vidé (appelé par `components/bons-livraison/bl-client.tsx` L118 → **candidat à suppression**, retrait de l'appel + import à valider) ; `useBLList` lit `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1). **Conservé intact (hors périmètre)** : l'effet de `useBLTauxBCT` qui répercute le taux BCT fetché dans le store de formulaire (ex-L88 → **L77** après décalage dû aux suppressions) + son import.
2. **`hooks/use-payments-search.ts` (ex-L12, debounce 300 ms `searchInput → setSearchQuery`)** — effet **supprimé, aucun déféré ajouté** : c'était un **write sans aucun lecteur** — `components/paiements/paiements-client.tsx` L168 lit `searchInput` brut (L175 `search: searchInput || undefined`) et `grep -rn "searchQuery" --include=*.ts --include=*.tsx app components hooks lib | grep -v "lib/stores/"` ne retourne **aucun lecteur** de `payments-store.searchQuery` → le champ est désormais **jamais écrit ni lu** (store non modifié, hors périmètre). Signature inchangée : `{ searchInput, setSearchInput, methodFilter, setMethodFilter }` (appel `components/paiements/paiements-client.tsx` L168).
3. `hooks/use-devis.ts` (mentionné ici pour `tresorerie`) : traité dans `docs/wiki/devis.md` (« P2-7 Lot 2 ») — `useExpireQuotesOnMount` conservé intact.

**Filtre client invariable** : les DataTables lisent `searchValue={searchInput}` / `globalFilter` → **inchangé** (aucun `components/` touché hors `fournisseurs-client.tsx`).

## P2-7 Lot 7 — filtre méthode paiements (2026-09-28)

- `components/paiements/paiements-client.tsx` ex-L170 : effet `if (defaultMethod) setMethodFilter(defaultMethod)` **supprimé** → **dérivation à la lecture** `method: defaultMethod ?? methodFilter` dans `usePaymentsList` (la prop EST la valeur : `grep -rn "setMethodFilter"` → 0 appelant hors l'ex-effet, seul lecteur du champ = cette query ; la DataTable filtre côté client sans toucher le store). `setMethodFilter` retiré de la destructuration (L168), import `useEffect` purgé. **Écart positif assumé** : l'ex-effet forçait 2 requêtes au montage (`queryKey` de `usePaymentsList` inclut `method` : render 1 avec la valeur store périmée, correction post-commit) → 1 seule requête avec la bonne méthode, écran final identique. Détail complet : entrée CHANGELOG `[2026-09-28] Frontend (p2-7-lot7-divers/P2-7)`.

## P2-8 — hooks inline Effets/Chèques (2026-09-30)

Extraction des **4 sites `useQuery`/`fetch()` inline** des 2 fichiers du module vers `hooks/use-effets.ts` (audit `AUDIT-FACTURAPRO.md` §6, `P2-8`). **0 ligne de JSX modifiée**, 0 changement visuel.

| Site (AVANT) | Endpoint / clé | Extrait (APRÈS) |
| --- | --- | --- |
| `nouvel-effet-client.tsx` (ex-`SplitRowEcheanceCollision`, query `["echeance-collision", date, companyId]`, `enabled: !!date`, retour `data.collisions` / `[]` sur `!ok`) | `GET /api/effets/check-echeances?date=…&companyId=…` | `useEcheanceCollision(date, companyId)` (`hooks/use-effets.ts:138`) |
| `nouvel-effet-client.tsx` (query `["documents-lies", form.type, entityId]`, `enabled: !!entityId`) | `GET /api/effets/documents-lies?type=…&entityId=…` | `useDocumentsLies({ type, entityId })` (`hooks/use-effets.ts:110`) |
| `nouvel-effet-client.tsx` (`handleSuggestEcheance`, `fetch` + `res.json()` + `if (!res.ok) return`) | `GET /api/effets/echeances-suggestion?montant=…` (paramètre omis si `form.montant` falsy) | `useSuggestEcheances()` (`hooks/use-effets.ts:160`) — `mutateAsync({ montant })` |
| `nouveau-cheque-dialog.tsx` (query `["documents-lies", form.type, form.tiersId]`, `enabled: !!form.tiersId && form.type === "RECU"`) | idem | `useDocumentsLies({ type, entityId, enabled })` |

- **`useDocumentsLies` partagé effets/chèques** placé dans `hooks/use-effets.ts` (end-point et clé `["documents-lies"]` déjà hébergés là par `useEffetsMutations`) — **aucun `hooks/use-entreprises.ts` créé**, la clé `["company", id]` restant portée par `hooks/use-company-query.ts`.
- **Sémantique d'erreur conservée à l'identique** : garde `if (!res.ok)` avant tout parsing sur les 3 queries (donc **aucune 1re tentative de retry React Query** déclenchée par une réponse d'erreur, comme dans l'inline), `mutateAsync` renvoyant `null` si `!res.ok` reproduit exactement l'ancien `if (!res.ok) return`.
- **Clés de requête bit-for-bit identiques** : `["documents-lies", type, entityId]`, `["echeance-collision", date, companyId]` (aucun `enabled` ajouté ni retiré ; `entityId = undefined` côté effets / `""` côté chèque produit la même clé que l'inline).
- `DocumentLie`, `EcheanceCollision`, `EcheanceSuggestion` exportés depuis `hooks/use-effets.ts` ; les 2 interfaces locales homonymes supprimées des composants (`nouveau-cheque-dialog.tsx:28` importe désormais `useDocumentsLies` depuis `@/hooks/use-effets`).
- Détail complet, écarts assumés et vérifications : entrée CHANGELOG `[2026-09-30] Frontend (p2-8-hooks-inline/P2-8)`.

## P2-10 — Découpe de `nouvel-effet-client.tsx` (2026-10-01)

Découpage du god component **`components/effets/nouvel-effet-client.tsx` (1141 → 66 lignes, −94 %**, cible audit ≤ 350) en **container + contrôleur + 5 sous-composants + 2 modules de logique + 1 store Zustand** (audit `AUDIT-FACTURAPRO.md` §6 « Découper `nouvel-effet-client.tsx` », prompt `P2-10`). **0 changement visuel**, payload de création **byte-identique** ; verdict QA **APPROVE WITH DEBT** ; STEP 5 `graphify update .` exécutée par le Governor → **8637 nodes / 21428 edges / 428 communautés**.

### Fonctionnalité

Le container ne conserve que la **composition** des colonnes et le **toggle type** RECU/EMIS. Toute la logique de formulaire migre dans `useNouvelEffet` (13 `useState` locaux + tous les handlers + `buildSplit()` + dérivés), toute la logique de split pure migre dans `effet-split-logic.ts`, et l'**état partagé** entre le formulaire (`NouvelEffetClient`) et la barre d'actions (`NouvelEffetActions`, **frère** dans `app/(app)/effets/nouveau/page.tsx` L8-9, pas descendant) passe d'une variable module mutable à un store Zustand. La disparition la plus notable : l'**ancien effet de bord exécuté au moment du render** (ex-L152-163 / ex-L169-181) qui **écrivait dans le store pendant le rendu** et forçait un `forceUpdate()` — remplacé par un **resolver pur** `resolveEffetForm(form, company)` (spread + littéraux, 0 cast) évalué à chaque lecture.

### Fichiers clés (11 fichiers)

| Fichier | Lignes | Rôle |
| --- | --- | --- |
| `components/effets/nouvel-effet-client.tsx` | **1141 → 66** (réécrit) | container : composition + toggle type uniquement (cible audit ≤ 350) |
| `components/effets/use-nouvel-effet.ts` | 337 (créé) | contrôleur : 13 `useState`, tous les handlers (`toggleDoc`, `handleTypeChange`, `handleTireurSelect`, `handleFournisseurSelect`, `handleCreateSplit`, `handleSuggestEcheance`, achats…), `buildSplit()`, dérivés (`computeSplitState`) ; exposé via `export type NouvelEffetController = ReturnType<typeof useNouvelEffet>` (**0 `any`**) ; **0 `useEffect`, 0 `fetch`** — écritures uniquement dans les callbacks (aucune émission au corps du hook) |
| `components/effets/effet-form-utils.ts` | 49 (créé) | `resolveEffetForm(form, company)` : resolver **pur** (spread + littéraux, 0 cast) qui remplace l'ancien effet de bord au render ; + `formatAdresse` |
| `components/effets/effet-split-logic.ts` | 146 (créé) | logique split pure extraite du JSX : `round3`, `generateSplit` (seuil `parseFloat(seuilSplitEffet ?? "") \|\| 11500`, `crypto.randomUUID`), `appendSplitRow`, `setSplitRowField`, `removeSplitRow`, `setSplitAllocField`, `removeSplitAlloc`, `appendSplitAlloc`, `computeSplitState` (validations + `splitErrors` + `formatTND`) — **identique au caractère près** du code inline d'origine (diff contre `FacturaPRO.zip`) |
| `lib/stores/effet-form-store.ts` | 41 (créé) | `useEffetFormStore` (pattern `create<State>()` des stores siblings), remplace `export let effetFormData` + `getEffetFormData()` / `updateEffetForm()` / `resetEffetForm()` (**0 appelant résiduel**, seul un commentaire les mentionne) |
| `components/effets/nouvel-effet-parties.tsx` | 177 (créé) | carte « Parties prenantes » (RECU/EMIS) |
| `components/effets/nouvel-effet-main-column.tsx` | 82 (créé) | colonne centrale — racine **fragment** : les 3 enfants de `space-y-6` restent identiques |
| `components/effets/nouvel-effet-sidebar.tsx` | 161 (créé) | colonne latérale |
| `components/effets/nouvel-effet-split-dialog.tsx` | 303 (créé) | dialog de split multi-effets |
| `components/effets/split-row-echeance-collision.tsx` | 43 (créé) | tooltip de collision d'échéance par ligne de split |
| `components/effets/nouvel-effet-actions.tsx` | **67 → 74** (réécrit) | payload **byte-identique** ; seule substitution : `const form = getEffetFormData()` → `const form = resolveEffetForm(useEffetFormStore.getState().form, companyData?.company)` (+ `useCompany(companyId)` ajouté, même query cache que le container) |

### Architecture avant → après

- **AVANT** : variable module `export let effetFormData` (+ `getEffetFormData()` / `updateEffetForm()` / `resetEffetForm()`) comme source d'état partagée ; **effet de bord exécuté au render** (ex-L152-163 / ex-L169-181) écrivant dans le store **pendant le rendu** et déclenchant un `forceUpdate()` ; monolithe de **1141 lignes** mêlant JSX, logique de split et handlers.
- **APRÈS** : store Zustand `useEffetFormStore` (`lib/stores/effet-form-store.ts`) + **resolver pur** `resolveEffetForm` (aucune écriture au rendu, recalcul à chaque lecture) + hook contrôleur `useNouvelEffet` (écritures **uniquement** dans les callbacks) + container **66 lignes** qui compose 5 sous-composants ; logique de split isolée dans un module pur testable.

### Parité (preuves QA — diffs réels contre `FacturaPRO.zip`)

- Régions JSX **toggle / parties / détails financiers / notes / sidebar / split dialog / tooltip collision = IDENTICAL**.
- **0 wrapper `<div>`/`<section>` ajouté** aux **6 points d'insertion** (balance container **6/6**, les 3 enfants de `space-y-6` inchangés avant et après).
- Seul écart structurel : extraction du bloc « Notre compte bancaire » en `<CompteBancaireField>` (corps identique, appelé 2×) = **licite** (déduplication).
- **Contrôles** : `npx tsc --noEmit` → **0** ; `npm run lint` → **417 (44 errors, 373 warnings)** = baseline ; `npx eslint` sur les **11 fichiers** → **0** ; greps `any` / `useEffect(` / `fetch(` / `@ts-ignore` / `eslint-disable` sur les 11 → **vides** ; 4 md5 de contrôle inchangés ; `prisma migrate status` → up to date ; périmètre `find -newermt` = **exactement les 11 fichiers**.

### Dettes et écarts déclarés (QA « APPROVE WITH DEBT »)

1. **W1 — divergence assumée (sens = correction de bug)** : l'ancien écrivait `beneficiaire` **dans le store** → après un changement de société active en cours de saisie RECU, l'ancien gardait le nom de l'ancienne société ; le nouveau `resolveEffetForm` **recalcule à chaque lecture** → suit la nouvelle société. Scénario **atteignable** (société active commutable), **aucun champ éditable impacté** (`beneficiaire` / `tire` / `tireAdresse` sont affichés en `<p>`).
2. **W2** : les 2 cartes « Société » (RECU/EMIS) restent **dupliquées** dans `nouvel-effet-parties.tsx` : **L63-77 / L157-171**, 15 lignes × 2 dont **12 identiques** (3 divergentes : libellé du titre, expression Nom, expression Adresse) — dette assumée, à factoriser dans un lot dédup.
3. **N2** : `GenerateSplitParams` (L18-23) et `AppendSplitRowParams` (L48-52) de `effet-split-logic.ts` partagent **3 lignes** → `AppendSplitRowParams = Omit<GenerateSplitParams, "seuilSplitEffet">` lors d'un prochain passage.
4. **N3** : naming `lib/stores/effet-form-store.ts` (infixe `-form-` **unique**) vs siblings `achats-store.ts` / `devis-store.ts`… (le list-store `effets-store.ts` existe déjà) — à trancher au prochain lot store.
5. **W3** : `nouvel-effet-actions.tsx` gagne une dépendance à `useCompany(companyId)` (coupling nouveau, mais **même query cache**, lecture **non abonnée** dans le handler = sémantique équivalente à l'ancien `getEffetFormData()`).
6. **Convention validée (D18)** : `components/effets/use-nouvel-effet.ts` est le **seul** `use-*` sous `components/` — verdict **ACCEPT** : les **67 fichiers de `hooks/`** sont des **data-hooks TanStack** (AGENTS.md n'impose `hooks/` que pour le data-fetching), ce fichier est un **contrôleur de page** (13 `useState`, 0 fetch) → colocation avec son seul importateur = pratique standard. **Règle à retenir** : *données → `hooks/`, contrôleur colocalisé → à côté de son container, état partagé → `lib/stores/`*.
7. **Hors périmètre à signaler (préexistant, non créé par ce lot)** : duplication du payload `tire`/`tireAdresse`/`tireBanque`/`beneficiaire || null` entre `nouvel-effet-actions.tsx:41` et `use-nouvel-effet.ts:243` (aurait pu être mutualisé en `buildEffetPayload()`) ; carte Client/Fournisseur dupliquée **38 l. × 2** ; le **dialog split** contient **3 sections + sous-liste répétable + scroll** (`max-h-[80vh]`) → s'il avait été créé ici, la règle CONTAINER CHOICE imposait un **`Sheet` ou une page dédiée** (transposé à l'identique de l'original = hors périmètre de P2-10, à traiter dans un lot ultérieur).
8. **Persistance store inchangée** : l'ancien `effetFormData` n'était **jamais réinitialisé** (`resetEffetForm()` : 0 appelant) ; le nouveau `resetForm` a lui aussi **0 appelant** → les deux persistent entre les visites = **parité**.
9. **NIT levé, cohérence vérifiée** : l'original du zip fait **1141** lignes (`wc -l` sur `FacturaPRO.zip`, confirmé), pas 1112 — `grep -rn "1112" AUDIT-FACTURAPRO.md docs/wiki/` → **vide** ; l'audit (L103, L113, L248, L449) et le suivi (ligne 24) citent tous **1141** = cohérent.

- Détail complet, preuves QA et vérifications : entrée CHANGELOG `[2026-10-01] Frontend (p2-10-decoupe/P2-10)` ; avancement : `docs/wiki/audit-facturapro-suivi.md` (ligne `P2-10` + bilan).

## P3-14 — tests split effets + TMM (2026-10-08)

Lot **P3-14** (tests de la logique financière, dernier prompt du chantier audit §6) : la logique pure du module Effets et le parseur TMM BCT sont désormais couverts par des tests.

- **`lib/__tests__/effet-split-logic.test.ts` (créé, 32 tests)** couvre `components/effets/effet-split-logic.ts` : `round3` (flottant `0.1+0.2` → 0.3, arrondi half-up 3 décimales, sous-millime → 0), `generateSplit` (seuil défaut **11500**, `k = ceil(reste/seuil)`, dernière tranche `reste − seuil×(k−1)`, montants `toFixed(3)`, ids `crypto.randomUUID` (format v4 + unicité), `ordrePaiementNumero` séquentiel, priorité `resteAPayer ?? totalTTC`, skip `reste <= 0`, date du jour en fallback, partition exacte du reste), `computeSplitState` (`totalACouvrir`/`totalReparti`, **tolérance 0.001** des deux côtés, `uncoveredAchats` + message « Montants restants non couverts » formaté `formatTND`, `rowsValid`/`splitValid` + 3 messages d'erreur, cas sans document sélectionné), et les **7 helpers** (`appendSplitRow`, `setSplitRowField`, `removeSplitRow`, `setSplitAllocField`, `removeSplitAlloc`, `appendSplitAlloc`) avec preuves d'**immutabilité** (input non muté, lignes non ciblées identiques référentiellement).
- **`lib/__tests__/tmm-bct.test.ts` (créé, 6 tests)** couvre `parseTMM` (`lib/tmm-bct.ts`) avec un mini-HTML fixture : extraction d'un taux `0 < x < 30` (point et virgule décimale), sélection de la ligne « Money Market Average Rate (TMM) » parmi d'autres lignes, throw « Could not parse TMM » pour un taux ≥ 30, = 0, ou une page sans ligne TMM. **Note** : `vi.mock("@/lib/prisma")` est obligatoire dans ce test car `lib/prisma.ts` instancie un `PrismaClient` au import (DATABASE_URL) ; `parseTMM` lui-même est pur.
- **Config** : `vitest.config.ts` ajoute `".opencode"` aux `exclude` (3 Failed Suites zod parasites éliminées). `npx vitest run` → **7 fichiers / 169 tests, 0 échec** ; tsc **0** ; lint **415 (42/373)** = baseline.
- **Dette documentée (décision Q2(a), reportée au chantier 2026-10-07 Prompt K)** : les **soldes clients/fournisseurs et les balances de paiement** restent **inline dans les routes Prisma** (`app/api/clients/[id]/solde`, `lib/invoice-payment.ts`, `app/api/payments/[id]`) → **extraction d'un helper pur requise** avant de pouvoir les tester (non couverts par ce lot, périmètre limité aux modules purs existants).
- Détail complet : entrée CHANGELOG `[2026-10-08] Backend (p3-14-tests-financiers/P3-14)` ; fiche Facturation : `docs/wiki/facturation.md` § P3-14 (correctifs `lib/decimal.ts`) ; avancement : `docs/wiki/audit-facturapro-suivi.md` (ligne `P3-14` + bilan **14 ✅ / 0 ⚠️ / 0 ❌**).

## B2 — Isolation multi-société des paiements (2026-10-09)

Lot **B2** (Prompt B, P0 — faille S-2 de l'audit 2026-10) : une société ne peut plus lire, payer ni annuler/supprimer une ressource paiement/facture/achat d'une autre société.

- **`lib/invoice-payment.ts`** : nouvelle erreur typée **`PaymentResourceNotFoundError`** (`resource: "invoice" | "achat" | "effet"`, `resourceId`, message métier, `name` renseigné). Les 3 fonctions filtre désormais **toutes** leurs lectures **et** écritures sur `companyId` :
  - `applyPaymentToInvoice(params: ApplyPaymentToInvoiceParams, tx?)` → `invoice.findFirst({ where: { id: params.invoiceId, companyId: params.companyId } })` + `invoice.update({ where: { id, companyId } })` ;
  - `applyPaymentToAchat(achatId, montant, opts, tx?)` → `achat.findFirst({ where: { id: achatId, companyId: opts.companyId } })` + `achat.update({ where: { id, companyId } })` ;
  - `applyEffetEmisPayment(params, tx?)` → vérifie l'effet référencé (`effet.findFirst({ where: { id: effetId, companyId } })`) avant la création du `Payment`.
  - Helper privé `assertEffetBelongsToCompany` appelé par les 3 fonctions quand `effetId` est présent. `companyId` faisait déjà partie des params des 3 fonctions (aucun changement de signature côté appelants).
- **`app/api/payments/route.ts` (POST)** : `invoice`/`achat` lus via `findFirst({ where: { id, companyId } })` → **404** si étranger ; contrôle de cohérence **`tiersId`** du payload contre `invoice.tiersId` / `achat.tiersId` → **400** avec message explicite ; les appels `apply*` sont entourés d'un `catch` qui traduit `PaymentResourceNotFoundError` en **404**.
- **Consommateurs** : `app/api/effets/[id]/route.ts` (PATCH) et `app/api/cheques/[id]/encaisser/route.ts` (POST) traduisent l'erreur typée en **404** (ils passaient déjà `companyId` depuis la session : effets L105/L113/L117, encaisser L43). `app/api/payments/[id]/route.ts` était déjà 100 % scopé (`findFirst({ id, companyId })` L15 et L182) — inchangé.
- **(b) corrigés par le balayage `findUnique`** : `app/api/effets/splits/route.ts` (effet par paramètre → `findFirst` scopé), `app/api/ngp-codes/[id]/route.ts` (GET/PATCH/DELETE : `requireCompany: true` ajouté + `findFirst({ id, companyId })` + update scopé), `app/api/carton-types/[id]/route.ts` (GET/PUT/DELETE : scope `OR: [{ companyId }, { companyId: null }]` identique à la route liste, garde 404 avant suppression). Aucun `permission:` ajouté ni retiré (permissions = lot B3).
- **Tests** : `lib/__tests__/payments-isolation.test.ts` (**13 tests**, mocks Prisma `vi.hoisted` + session réelle signée) : GET liste scopé, GET facture étrangère 404, POST facture/achat étrangers 404, `tiersId` incohérent 400 (facture + achat), POST valide 201, PATCH annulation / DELETE d'un paiement étranger 404, et les 3 erreurs typées + scoping des écritures.
- **Classification du balayage `findUnique` (39 occurrences restantes)** : consignée dans `docs/wiki/audit-scope-multi-societe.md` §7 — (a) scopage amont prouvé, (b) corrigé, hors périmètre Tiers/Product/Categorie.
- Détail complet : entrée CHANGELOG `[2026-10-09] Backend (lot-b2-isolation-paiements/B2)`.

## D1 — Modèle de données de trésorerie + backfill (2026-10-16)

Lot **D1** (Prompt D1, P1 — audit §5). **Modèle de données uniquement** : aucune API, aucune UI, aucun code applicatif modifié (tout est reporté en **D2**). Le constat de l'audit est confirmé dans le code réel : `app/api/tresorerie/route.ts:26` calcule `solde = Number(soldeAgg._sum?.montant || 0)` = **Σ sans signe** (entrées et sorties mélangées) avec 7 conversions `Number()`, et il n'existe **aucune notion de compte ni de solde initial**.

### Nouveaux modèles

- **`CompteTresorerie`** (`comptes_tresorerie`) : `companyId`, `type: TypeCompte` (CAISSE/BANQUE), `libelle`, `companyBankAccountId?`, `soldeInitial Decimal @default(0) @db.Decimal(19,4)`, `dateSoldeInitial DateTime`. **`@@unique([companyId, type])`** → **exactement 2 comptes par société** (décision utilisateur ; une entreprise multi-banques ne rattache qu'une seule, dette assumée).
- **`MouvementTresorerie`** (`mouvements_tresorerie`) : 24 colonnes — `sens`, `mode`, `statut`, **`montant` toujours positif** (`Decimal(19,4)` ; le signe vient de `sens`), `devise` (défaut `TND`), `montantTND?`, `dateOperation`, `dateValeur?`, `dateEcheance?`, FK `tiers`/`invoice`/`achat`/`avoir`/`cheque`/`effet`/`payment`/`mouvementFinancier`, `libelle`/`reference`/`notes`, **`cleSource String? @unique`** (clé d'idempotence), contre-passation **`annuleParId?`** + `annuleLe?`.
- **Enums créés** : `SensMouvement { ENCAISSEMENT DECAISSEMENT A_QUALIFIER }`, `ModeReglement { ESPECES CHEQUE VIREMENT EFFET CARTE }`, `StatutMouvement { PREVU REALISE ANNULE A_QUALIFIER }`, `TypeCompte { CAISSE BANQUE }`. **`PaymentMethod` += `EFFET`** (valeur Prisma **seulement** — `lib/types/enums.ts` et `lib/schemas.ts` restent volontairement en retard jusqu'à D2 pour ne pas modifier `POST /api/payments`).

### Règles à connaître (figées dans le schéma, implémentées en D2)

- **Contre-passation, pas de delete** : l'écriture d'origine **reste `REALISE`** (`annuleParId` renseigné) ; l'écriture inverse est `REALISE` avec **sens opposé** et `dateOperation` = jour de l'annulation. `annuleParId` vit sur l'**écriture origneale** et pointe vers celle qui l'a annulée (sens littéral). Le prédicat « annulé » se fait via un **helper unique `estAnnule()`** partagé D2/D3. *(L'option hybride « origine → ANNULE + inverse → REALISE » a été **explicitement écartée** : elle donne `solde = −1000` au lieu de `0`.)*
- **`soldeReel` devra filtrer `dateOperation >= compte.dateSoldeInitial`** — sinon saisir un solde initial plus tard re-sommerait tout l'historique par-dessus.
- **`paymentId` est SANS `@unique`** : un paiement peut produire 2 mouvements (escompte = encaissement net + agios en décaissement, D2).
- **`onDelete`** : `Restrict` sur `companyId`/`compteId`/`annuleParId` (intégrité structurelle) ; **`SetNull`** sur les 8 FK métier. *(Le `Restrict` partout a été écarté avec preuves : `app/api/effets/[id]` a un `DELETE` qui réussit aujourd'hui et `payments/[id]` supprime légitimement un paiement `EN_ATTENTE` → ces routes échoueraient en 500 dès D2.)*
- **Index** : `(companyId, statut, dateValeur|dateOperation|dateEcheance)`, `(companyId, compteId, statut, sens)`, + **12 index FK explicites** — PostgreSQL ne crée pas d'index FK automatiquement (preuve : migration d'init, `payments_invoiceId_fkey` sans `payments_invoiceId_idx`).

### Migrations (100 % additives)

- `20261016190215_add_tresorerie_ledger` (150 lignes) : 4 `CREATE TYPE`, 1 `ALTER TYPE "PaymentMethod" ADD VALUE 'EFFET'`, 2 `CREATE TABLE`, 14 index, FK.
- `20261016192747_add_a_qualifier_statut_mouvement` : `ALTER TYPE "StatutMouvement" ADD VALUE 'A_QUALIFIER'` (contradiction de mapping remontée en STOP et tranchée par l'utilisateur).
- **Aucun `DROP`, aucune `ALTER COLUMN`, 0 colonne existante supprimée/modifiée.** `npx prisma migrate status` → **« 21 migrations found / Database schema is up to date! »**.

### Backfill `prisma/backfill-mouvements-tresorerie.ts`

- **Dry-run PAR DÉFAUT** (0 écriture) ; écriture réelle uniquement avec `--execute` (**jamais exécuté à ce jour**). Rapports dans `prisma/backfill-reports/` (dossier **gitignoré** depuis D1 : contient des montants).
- **Idempotence** : `cleSource` déterministe (`payment:<id>` / `cheque:<id>` / `effet:<id>` / `mf:<id>`) + `createMany({ skipDuplicates: true })` → ré-exécution = 0 doublon. **Format à respecter en D2** (`lib/tresorerie/ledger.ts`) sous peine de dupliquer.
- **Sources** : `Payment`, **`Cheque` sans `paymentId`**, **`Effet` sans `paymentId`**, `MouvementFinancier` (les 2 derniers sont indispensables, sinon `à recevoir` tomberait à ~0 en D2).
- **`sens`** : **l'instrument prime sur le document** — contradiction (ex. `invoiceId` non-null + `Cheque.type = EMIS`) → **`A_QUALIFIER`**, jamais deviné. Ce point corrige l'ordre du prompt initial, qui **aurait reproduit le bug T-2** de l'audit.
- **`MouvementFinancier`** : **toutes les lignes en `A_QUALIFIER`** (décision utilisateur) — `getMouvementType(tiersId)` renvoie toujours `CREDIT`, mapper donnerait un sens faux. CSV de suggestion : `isClient → décaissement`, `isFournisseur → encaissement`.
- **Dry-run exécuté sur la base de dev** : 1 société, 2 comptes à créer, **5 mouvements** (3 `Payment` + 1 `Cheque` + 1 `Effet`), 0 `A_QUALIFIER`, **ancien solde = nouveau solde = 6389.6000**, écart 0.

### ⚠️ Fenêtre D1 → D2 (acceptée par l'utilisateur)

Tant que `lib/tresorerie/ledger.ts` (D2) n'est pas actif, tout `Payment`/`Cheque`/`Effet` créé **n'aura aucun mouvement**. Le backfill est donc **re-jouable** et devra être **re-exécuté au déploiement de D2** (idempotent), juste avant d'activer les écritures du ledger.

### Reporté en D2 (non touché ici)

`lib/types/enums.ts` + `lib/schemas.ts` (unions TS `PaymentMethod`), les 3 `methode: "VIREMENT"` en dur (`lib/invoice-payment.ts:193`, `app/api/effets/[id]/route.ts:105` et `:113`), les 5 `prisma.payment.delete` de `payments/[id]`, l'API et l'UI de trésorerie, `compute.ts` + `ledger.ts`.

- Détail complet : entrée CHANGELOG `[2026-10-16] Database (lot-d1-modele-donnees/Prompt-D1)`.

## D2 — Écriture du ledger de trésorerie (2026-10-16)

Le ledger `MouvementTresorerie` est désormais **la source unique** des soldes et il est
**écrit à chaque point de mutation métier** (lot D2).

### Modules `lib/tresorerie/` (inventaire EXACT — 4 fichiers)

> ⚠️ Le rapport de livraison D2 a annoncé à tort `lib/tresorerie/agios.ts`,
> `lib/tresorerie/estimate.ts`, `lib/tresorerie/types.ts` et `lib/tresorerie/index.ts` :
> **ces 4 fichiers n'ont JAMAIS existé** (correction D2 du 2026-10-16). La logique
> est consolidée dans les 4 modules ci-dessous + `lib/types/tresorerie.ts` —
> aucun autre module n'a été livré dans `lib/tresorerie/`.

- `source-keys.ts` — identifiants stables d'une source : `payment:<id>`, `cheque:<id>`,
  `effet:<id>`, `mf:<id>` (+ suffixes `:agios` et `:contrepassation`, la seule chaîne
  de 2 suffixes autorisée étant `effet:<id>:agios:contrepassation`). Helpers
  `cleSourcePayment`/`cleSourceCheque`/`cleSourceEffet`/`cleSourceMouvementFinancier`,
  `cleSourceAvecSuffixe`/`cleSourceAgios`/`cleSourceContrepassation`, parseur
  `analyserCleSource` (préfixe + id + chaîne de suffixes, tout le reste rejeté).
- `sens.ts` — catalogue partagé `SENSE_BY_TYPE` (sens attendu par type de mouvement,
  avec exception `DEPENSE` ↔ `A_QUALIFIER`), `resolveSens` (override récurrents/conversions,
  `avoir` inversé), `resolveMode` (override récurrents), `resolveStatutForType` (les effets
  sont `PREVU` à la création), plus `paymentMethodToMode` / `modeReglementPourPayment` /
  `paymentStatut` / `chequeStatut` / `effetStatut` et les types littéraux partagés
  (`SenseInput`, `MoveStatutInput`, `MoveModeInput`) — importés aussi par
  `prisma/backfill-mouvements-tresorerie.ts` (plus de copie locale divergente).
- `compute.ts` — calcul **pur** de `TresorerieData` (Big.js décimal, zéro `Number()` sur
  les montants) : conversions (`toBig`/`arrondiTND`/`montantTND`/`bigVersNombre`), prédicats
  (`estAnnule` — définition unique du repo —, `dansFenetreSolde`), soldes (`soldeReel`,
  `aRecevoir`, `aPayer`, `enRetard`/`enRetardParSens`, `previsionnel`), `ventilation`
  (par mode ET par sens), `projectionHebdomadaire`.
- `ledger.ts` — persistance : `enregistrerMouvement`, `enregistrerMouvementPourPayment`,
  `retirerMouvementPrevu` (PREVU→ANNULE avec note, jamais de suppression),
  `annulerMouvement` (contre-passation pure), `synchroniserMouvementPaiement`
  (1 payment ↔ annulation/contre-passation dans la `$transaction` de l'appelant),
  `typeComptePour`/`sensInverse` et les erreurs métier (`MontantNonPositifError`,
  `MouvementIntrouvableError`, `MouvementDejaAnnuleError`, `SensIncontournableError`).
- `lib/types/tresorerie.ts` — types API/UI partagés (`TresorerieData`, `TresorerieSolde`,
  `TresorerieEcheancierLigne`, `TresorerieProjectionSemaine`, `TresorerieVentilationMode`,
  `TresorerieCompte`, `TresorerieRecents`, `EvolutionMonth`, `TresorerieEvolutionData`,
  `ModeReglementTresorerieAffiche`) : les interfaces dupliquées dans
  `hooks/use-tresorerie.ts` et `hooks/use-tresorerie-evolution.ts` ont été supprimées, et
  `components/paiements/tresorerie-client.tsx` importe désormais `TresorerieData` d'ici
  (sa copie locale divergente supprimée — correction D2 du 2026-10-16).

### Inventaire exact des fichiers livrés par le lot D2

| Fichier | Rôle |
| --- | --- |
| `lib/tresorerie/source-keys.ts` | clés déterministes `cleSource` (source unique du format) |
| `lib/tresorerie/sens.ts` | règles sens/mode/statut partagées live + backfill |
| `lib/tresorerie/compute.ts` | calcul pur des soldes (Big.js, 0 `Number()`) |
| `lib/tresorerie/ledger.ts` | écriture du grand livre (helpers persistance) |
| `lib/types/tresorerie.ts` | types partagés API/UI |
| `lib/invoice-payment.ts` | écriture `payment:<id>` à toutes les sources |
| `lib/schemas.ts` + `lib/types/enums.ts` | `PaymentMethod` += `EFFET` |
| `app/api/payments/[id]/route.ts` | PATCH ×3 + DELETE annulation |
| `app/api/cheques/route.ts` | création PREVU `cheque:<id>` |
| `app/api/cheques/[id]/encaisser/route.ts` | encaissement + retrait PREVU |
| `app/api/cheques/[id]/annuler/route.ts` | paiement conservé `ANNULE` + synchro + retrait PREVU |
| `app/api/cheques/[id]/rejeter/route.ts` | idem rejet |
| `app/api/effets/route.ts` | création PREVU `effet:<id>` |
| `app/api/effets/[id]/route.ts` | confirmation/encaissement, escompte (2 lignes), PAYE, ANNULE, DELETE |
| `app/api/avoirs/[id]/route.ts` | mouvement `A_QUALIFIER` `mf:<id>` |
| `app/api/tresorerie/route.ts` + `app/api/tresorerie/evolution/route.ts` | lecture calculée depuis le ledger |
| `hooks/use-tresorerie.ts` + `hooks/use-tresorerie-evolution.ts` | TanStack Query, types importés |
| `lib/__tests__/tresorerie-compute.test.ts` (31) / `tresorerie-ledger.test.ts` (27) / `tresorerie-source-keys.test.ts` (7) / `tresorerie-effets-escompte.test.ts` | tests D2 |
| `lib/__tests__/payments-isolation.test.ts` | mock `$transaction` enrichi (aucune assertion affaiblie) |

*(Schéma et migrations `MouvementTresorerie`/`CompteTresorerie` + `prisma/backfill-mouvements-tresorerie.ts`
sont la livraison du lot **D1**, partagée avec D2 — voir § D1.)*

### Points d'écriture branchés

| Point | Écriture ledger |
| --- | --- |
| `lib/invoice-payment.ts` (création + confirmation paiement, toutes sources) | upsert `payment:<id>` selon `status` + capture `effetId`/`chequeId` ; `CREDIT_NOTE` → **contre-passation** (correction : créait un encaissement parasite) ; règle PAYE → retrait du `effet:<id>` |
| `app/api/payments/[id]` PATCH (confirm/cancel/patch statut) | `synchroniserMouvementPaiement` dans la `$transaction` |
| `app/api/payments/[id]` DELETE | **devient une annulation** : la ligne est conservée (`status=ANNULE`) au lieu d'être supprimée, soldes inversés uniquement si `CONFIRME`, ledger contre-passé — la clé `success: true` et la shape de réponse sont conservées |
| `app/api/cheques/route.ts` POST | mouvement `PREVU` `cheque:<id>` (échéance = date d'encaissement) |
| `app/api/cheques/[id]/encaisser` | encaissement `REALISE` + retrait du `PREVU` |
| `app/api/cheques/[id]/annuler` et `/rejeter` | ligne `Payment` **conservée en `ANNULE`** (plus de `payment.delete` — correction D2 du 2026-10-16), mouvement `payment:<id>` synchronisé (`ANNULE` ou contre-passation), retrait du `PREVU` `cheque:<id>` |
| `app/api/effets/route.ts` POST | mouvement `PREVU` `effet:<id>` (échéance = date d'échéance) |
| `app/api/effets/[id]` PATCH | `CONFIRMATION`/`ENCAISSE` → `REALISE` (contre-passation si `REMIS_ESCOMPTE` déjà réalisé) ; `REMIS_ESCOMPTE` → deux lignes (`effet:<id>` encaissé + `effet:<id>:agios` décaissé) ; `PAYE` → retrait du `PREVU` ; `ANNULE` → `annulerMouvement` (y compris les agios) |
| `app/api/effets/[id]` DELETE | retrait du `PREVU` orphelin (si déjà `REALISE`, contre-passation) |
| `app/api/avoirs/[id]` PATCH (status) | mouvement `A_QUALIFIER` `mf:<id>` dans la même `$transaction` |

### API `GET /api/tresorerie` (réécriture ledger)

- Soldes, encaissements/décaissements du mois, `parMethode`, `parCategorie` et
  `alertes.comptesASolder` calculés depuis `compute.ts` (ledger), plus :
  - `solde.enRetard` (nouveau) ;
  - `ventilationMois` (nouveau) : ventilation du mois courant par statut ;
  - `parCompte` (nouveau) : `[{ nom, solde }]` par compte de trésorerie.
- Toutes les clés de réponse précédentes sont conservées : `periode`, `solde`, `entreesMois`,
  `sortiesMois`, `mouvements` (journal, limit 100), `parMethode`, `parCategorie`, `alertes`
  (`retardsPaiement`, `retardsEncaissement`, `aRecevoir`, `aPayer`, `chequesEnAttente`,
  `effetsEnAttente`, `effetsEnRetard`, `comptesASolder`, `nbTotal`, `nbUrgentes`).
- `aRecevoir`/`aPayer` = attentes chèques + effets + **paiements en attente** (sous-ensemble
  strict de la règle 7 assumé : le ledger est la source unique).
- `methode` filtre désormais sur le ledger (`mode`) et non plus sur `Payment.method`.

### API `GET /api/tresorerie/evolution`

- Alimentée par `evolutionParMois` (ledger `REALISE`, mouvements annulés/contre-passés exclus),
  avec `entreesMois`/`sortiesMois` dérivés des mouvements (et non plus des sommes de paiements),
  plus `montantRetard` et les nouveaux agrégats `cheques`, `effets`, `entrees`, `sorties`.
- Anciennes clés conservées : `mois`, `encaissements`, `decaissements`, `soldeFin`,
  `nbEncaissements`, `nbDecaissements`, `facturesEmises`, `facturesPayees`, `totalFacturesEmises`,
  `totalFacturesPayees`, `tauxRecouvrement`.

### Arbitrage `aRecevoir` + garde-fou double-comptage (2026-10-16)

- **Règle arbitrée par l'utilisateur (2026-10-16, MAINTENUE)** : `aRecevoir` = Σ
  `PREVU ∧ ENCAISSEMENT`, **y compris les paiements `EN_ATTENTE`** (`paymentStatut`
  mappe `EN_ATTENTE` → `PREVU`, `lib/tresorerie/sens.ts:136-145`) — un virement annoncé
  et saisi est de l'argent attendu ; l'exclure **cacherait** un argent annoncé au
  dirigeant. Règle **figée par un test explicite** :
  `lib/__tests__/tresorerie-compute.test.ts` → `it("RÈGLE FIGÉE : aRecevoir inclut les
  paiements EN_ATTENTE (arbitrage utilisateur 2026-10-16)")`.
- **Vérification structurelle du double-comptage — CONCLUSION : aucun double-comptage
  possible** sur les 3 points de mutation examinés :
  - `POST /api/payments` : `paymentSchema` (`lib/schemas.ts:210-221`) **n'accepte ni
    `chequeId` ni `effetId`** (z.object → clés inconnues stripées) ; les appels
    `applyPaymentToInvoice`/`applyPaymentToAchat` (`app/api/payments/route.ts:129,182`)
    passent donc `chequeId: null` / `effetId: null`. Un `Payment EN_ATTENTE` n'existe
    ici que pour les virements (`route.ts:191`), sans instrument.
  - `POST /api/cheques/[id]/encaisser` : crée bien le `Payment` avec `chequeId`
    (`route.ts:46,61`) mais en statut **`CONFIRME`** (défaut `lib/invoice-payment.ts:88`)
    → mouvement `payment:<id>` **REALISE** ; le `PREVU` `cheque:<id>` est retiré dans la
    **même transaction** (`route.ts:71-75`). Jamais deux `PREVU` coexistants.
  - `PATCH /api/effets/[id] → PAYE` : crée un `Payment` **`EN_ATTENTE` avec `effetId`
    non-null** (`route.ts:114,122,126`) — ce couple existe, MAIS le `PREVU` `effet:<id>`
    est retiré (ou contre-passé si déjà `REALISE`) dans la **même transaction**
    (`route.ts:134-151`). Le ledger à l'état de repos ne contient donc **qu'une seule**
    écriture `PREVU` d'encaissement pour la somme.
  - `PATCH /api/payments/[id]` ne peut pas rattacher un instrument plus tard (mise à jour
    limitée à `reference`/`notes`/`dateReglement`/`statut`, `route.ts:178-190`).
- **Garde-fous écrits** : 2 tests preuve rejouent les séquences exactes des routes sur un
  ledger en mémoire et assertent l'absence de doublement —
  `lib/__tests__/tresorerie-ledger.test.ts` → `describe("ledger — garde-fou
  double-comptage (Payment instrumenté vs PREVU de l'instrument)")`.
- **`analyserCleSource` parse désormais ses propres clés double-suffixe** (correction D2
  du 2026-10-16) : `effet:<id>:agios:contrepassation` (produit par `annulerMouvement` sur
  une écriture d'agios, `ledger.ts:336`) est accepté ; `:agios` puis `:contrepassation`
  est la **seule** chaîne de 2 autorisée (ordre significatif), tout suffixe inconnu,
  répétition ou préfixe inconnu reste rejeté. Sans cela, ces lignes étaient invisibles
  pour le front D3 alors que le parseur est annoncé comme l'analyseur unique.

### Corrections de bugs

- `app/api/effets/[id]/route.ts` : deux écritures `mode: "VIREMENT"` corrigées en `EFFET`.
- `lib/schemas.ts` + `lib/types/enums.ts` : `"EFFET"` ajouté à `PaymentMethod`.
- `app/api/payments/[id]` DELETE : suppression → annulation (le ledger ne tolère pas de
  suppression de lignes historiques).
- `app/api/cheques/[id]/annuler` et `/rejeter` : les 2 derniers `payment.delete`
  résiduels supprimés → ligne `Payment` **conservée `ANNULE`** + synchronisation du
  mouvement dans la même transaction (correction D2 du 2026-10-16 — aligné sur
  `payments/[id]` DELETE).
- `components/paiements/tresorerie-client.tsx` : copie locale divergente de
  `TresorerieData` supprimée, le composant **importe** le type de
  `lib/types/tresorerie.ts` (source de vérité) (correction D2 du 2026-10-16).
- `lib/tresorerie/source-keys.ts` : `analyserCleSource` accepte la chaîne
  `agios:contrepassation` (voir § arbitrage ci-dessus).

### Tests (nouveaux)

- `lib/__tests__/tresorerie-compute.test.ts` (31) — décimal (pivot `solde = 600`),
  règles d'alerte, aRecevoir/aPayer (dont le **test de règle figée `EN_ATTENTE`**),
  évolution, modes, échéances, parCompte.
- `lib/__tests__/tresorerie-ledger.test.ts` (27) — synchronisation payment, retraits PREVU,
  contre-passation, annulation, enregistrement avoir, + **2 tests garde-fou
  double-comptage** (ledger en mémoire rejouant les séquences des routes).
- `lib/__tests__/tresorerie-source-keys.test.ts` (7) — parsing des source keys, dont le
  double-suffixe `agios:contrepassation` et le rejet des combinaisons invalides.
- `lib/__tests__/payments-isolation.test.ts` — le mock `$transaction` fournit désormais un
  client « modèle » (`tx.payment.*`, `tx.compteTresorerie.upsert`,
  `tx.mouvementTresorerie.*`), le `beforeEach` utilise `vi.resetAllMocks()` (aucune assertion
  affaiblie).

## D3.1 — Filtre par compte, échéancier « en retard » et route PATCH compte (2026-10-20)

Lot **D3.1** (Prompt D3, API — audit 2026-10 §5) : les corrections backend du prompt trésorerie.
L'UI correspondante (dashboard trésorerie) est documentée par le lot **D3.2** (`docs/wiki/ui-kit.md`
et la section UI de cette fiche, côté Frontend).

### `GET /api/tresorerie` — nouveau paramètre `compte`

- **Paramètre query optionnel `compte=CAISSE|BANQUE`** validé par un `z.enum` (`compteQuerySchema`,
  `app/api/tresorerie/route.ts:27`) : paramètre absent → aucun filtrage (comportement antérieur
  strictement conservé) ; paramètre invalide → **422** `{ error, issues }` (message métier
  « Paramètre « compte » invalide : attendu « CAISSE » ou « BANQUE ». »).
- **Portée : TOUTES les agrégations de la réponse** sont restreintes quand le filtre est actif —
  KPI `solde` (solde réel), `ventilationMois`, `echeancier`, `projection`, `recents` et `parCompte`.
- **Filtrage SQL via 3 vues du filtre** (jamais de filtrage post-agrégation côté JS) :
  - `filtreCompteType` — lignes de `comptes_tresorerie` restreintes au type sélectionné ;
  - `filtreMouvement` — écritures du grand livre rattachées au compte (`compte: { type }`) ;
  - `filtreInstrument` — rattachement des instruments (chèques/effets) au compte : un
    instrument n'a **pas** de `compteId` direct → le rattachement passe par **leur écriture au
    grand livre** (source unique d'attribution, helper `typeComptePour` de
    `lib/tresorerie/ledger.ts`).
- **0 `Number()`** sur les montants ; la réponse passe `satisfies TresorerieData`.
- **Correctif QA** : `parCompte` est désormais construit par **mapping explicite** (fin du
  destructuring `_soldeBig` qui laissait un champ parasite dans la réponse).

### Échéancier : échéances passées encore `PREVU` visibles (audit §5.5)

- Suppression de la **borne basse `gte: now`** sur les **2 requêtes** chèques/effets de
  l'échéancier (comportement par défaut conservé sur l'horizon : **T-6 jours** en arrière).
- Conséquence : une échéance **passée** encore `PREVU` (non encaissée/non payée) apparaît au
  **détail** de l'échéancier — le total `solde.enRetard` (calculé par `compute.ts`) et son détail
  sont désormais cohérents (avant : un total pouvait signaler du retard que le détail ne montrait pas).

### Nouvelle route `PATCH /api/tresorerie/comptes/[id]`

- `apiRoute` (`lib/api-route.ts`) + `permission: "paiements:modifier"` + `requireCompany` :
  lecture/écriture strictement scopées à la société de la session.
- **Schéma Zod** : `soldeInitial` = string décimale (≤ 15 chiffres entiers, ≤ 3 décimales),
  `dateSoldeInitial` = ISO optionnel (défaut : date courante à l'écriture).
- **404** si le compte est introuvable pour la société (`findFirst({ id, companyId })`).
- **Réponse** : `{ compte: TresorerieCompte }` avec le `solde` **recalculé** via `soldeReel`
  (fenêtre `dateSoldeInitial` appliquée — cf. règle D1 : saisir un solde initial ne re-somme pas
  tout l'historique antérieur).

### Tests (nouveaux)

- `lib/__tests__/tresorerie-echeancier-retard.test.ts` (**4 tests**) : cohérence total
  `solde.enRetard` ↔ détail de l'échéancier, absence de `gte: now` dans les 2 requêtes
  chèques/effets, filtrage par `compte`, **422** sur paramètre `compte` invalide.

### Preuves de validation (STEP 4.5)

- `npx tsc --noEmit` → **0 erreur** ; `npm run lint` → **397 problems (35 errors, 362 warnings)**
  = baseline préexistante, 0 nouveau ; `npx vitest run` → **22 fichiers / 364 tests** verts ;
  `npx prisma migrate status` → **up to date** (aucune modification de schéma dans ce lot) ;
  `graphify update .` (STEP 5, Governor) → **9304 nœuds**.
- Détail complet : entrée CHANGELOG `[2026-10-20] Backend (lot-d31-api-tresorerie/Prompt-D3)`.

## D3.2 — Écran trésorerie : découpage UI, briques partagées, présentation pure (2026-10-20)

Frontend du lot D3.2 (`lot-d32-ui-tresorerie/Prompt-D3`). Aucun fichier API ni migration dans
ce lot : il découpe l'écran, externalise la présentation et crée 2 briques partagées. La partie
API du chantier D (route `comptes/[id]`, paramètre `compte`, wrappers `annulerMouvement`) est
documentée en § D3.1 ci-dessus (lot `lot-d31-api-tresorerie/Prompt-D3`).

### Arbitrages d'architecture (validés avant implémentation)

- **1-A — sélecteur de compte** : filtrage complet côté API (paramètre `compte=CAISSE|BANQUE`
  sur `GET /api/tresorerie`, validé par Zod, couvert par la permission `paiements:voir` → toute
  la page se filtre). Écartées : B (filtre client partiel, incohérent avec les KPI) et C (soldes
  uniquement, les autres panneaux restaient non filtrés).
- **2-A — mutations** : 1 seule route neuve `PATCH /api/tresorerie/comptes/[id]` (wrapper
  `apiRoute` + `permission: "paiements:modifier"` + schéma Zod) pour le solde initial ; les
  actions « confirmer / annuler » sont des wrappers `useMutation` sur les endpoints existants
  (`payments/[id]`, `effets/[id]`, `cheques/[id]` → `annulerMouvement()`). Écartées : B
  (endpoint générique = logique dupliquée) et C (report du solde initial au lot E).

### Structure de l'écran (Structure Proposal enregistrée)

Page unique, pas de onglets imbriqués, ordre de lecture = du « où j'en suis » vers le détail
chronologique :

1. `PageHeader` + sélecteur de compte (filtre API 1-A).
2. `KpiGrid` : 5 KPI (Solde réel, À recevoir, À payer, En retard, Prévisionnel).
3. Grille : ventilation (`lg:col-span-2`) + comptes.
4. Projection (qui pilote les horizons).
5. Échéancier (onglets Tout / Traité / Chèques / En retard + calendrier + horizons).
6. Évolution (`ChartErrorBoundary` : aires empilées sur 5 modes de paiement, `ToggleGroup`
   Entrées/Sorties, `MOIS_OPTIONS = [3, 6, 9, 12]`).
7. Mouvements récents + paiements en attente.

Seul nouveau conteneur modale du lot : le **dialog « solde initial »** — 1 section / 2 champs →
`Dialog` (conforme au seuil container ; le formulaire Tiers, à 3+ sections avec sous-listes,
reste une page dédiée). Bouton bridé par `can("paiements:modifier")`.

### Découpage — 13 fichiers `components/paiements/`, tous ≤ 250 lignes

Lignes mesurées le 2026-10-20 (`wc -l components/paiements/*.tsx` → 13 fichiers,
1 846 lignes au total, max = 244).

| Fichier | Lignes | Rôle |
| --- | ---: | --- |
| `tresorerie-client.tsx` | 145 | Shell de la page (ordonnance complète ci-dessus) |
| `paiements-client.tsx` | 84 | Page/liste Paiements |
| `paiements-columns.tsx` | 188 | Colonnes du tableau Paiements |
| `statut-flux-badge.tsx` | 28 | Badge statut de flux (module-local, 2 consommateurs) |
| `tresorerie-comptes.tsx` | 148 | Panneau comptes (dialog solde initial inclus) |
| `tresorerie-ventilation.tsx` | 93 | Ventilation par mode de paiement |
| `tresorerie-projection.tsx` | 152 | Projection de trésorerie (horizons) |
| `tresorerie-echeances.tsx` | 244 | Échéancier (onglets + calendrier) |
| `tresorerie-echeances-calendar.tsx` | 85 | Calendrier des échéances |
| `tresorerie-echeances-columns.tsx` | 164 | Colonnes de l'échéancier |
| `tresorerie-evolution-chart.tsx` | 173 | Évolution (aires empilées sur 5 modes, bornes mois/flux) |
| `tresorerie-recents.tsx` | 121 | Mouvements récents |
| `tresorerie-paiements-attente.tsx` | 221 | Paiements en attente (confirm/annuler) |

### `lib/tresorerie/presentation.ts` — calculs de présentation pur

Transforme les lignes brutes en data de rendu (projections, agrégats, statuts) **sans** hook ni
accès API, couvert par `lib/__tests__/tresorerie-presentation.test.ts` (13 tests, dont le pivot
solde 600). Une seule source pour le re-render au changement de filtre.

### Hooks

- `hooks/use-tresorerie.ts` : queryKey enrichie par le filtre 1-A →
  `["tresorerie", days, compte, companyId]` + `?params` ; `useUpdateCompteSolde` (PATCH
  `tresorerie/comptes/[id]`) invalide les 3 clés `TRESORERIE_KEYS` (`tresorerie`,
  `tresorerie-full`, `tresorerie-evolution`).
- `hooks/use-payments-queries.ts` : mutations confirm/annuler invalident la clé
  `["tresorerie"]` (3 sites : lignes 100, 170, 219) → KPI/panneaux recalculés sans reload.

### Briques partagées (détail : `ui-kit.md` § H.16)

- `components/shared/mode-reglement-badge.tsx` (54 l.) — source unique des 5 modes de
  règlement : `MODE_REGLEMENT_LABELS`, `MODE_REGLEMENT_ICONS`, `modeReglementLabel`,
  `modeReglementIcon`, `ModeReglementBadge`. Elle remplace les copies locales
  `METHOD_LABELS` / `METHOD_ICONS` de `paiements-client` et `tresorerie-client` et les helpers
  inline dupliqués — **6 fichiers** consommateurs du module (3 rendent le composant, 2 n'utilisent
  que libellé/icône, 1 que les constantes).
- `components/shared/flux-colors.ts` (11 l.) — `FLUX_ENTREE_COLOR` / `FLUX_SORTIE_COLOR` :
  remplace les copies `entreeColor` / `sortieColor` de `tresorerie-recents` et
  `tresorerie-ventilation` et les strings inlinées de `tresorerie-echeances`,
  `tresorerie-echeances-columns`, `tresorerie-projection` — **7 fichiers**, **22 sites**
  d'usage hors imports.

### États et micro-interactions

Skeletons de chargement alignés sur la forme du contenu, états vides rédigés (aucune carte
produit décorative), erreurs isolées par panneau, `refetch()` piloté par TanStack Query ;
transitions CSS courtes sur hover/focus des lignes et boutons, `tabular-nums` sur tous les
montants. Aucun `transition: all`, aucune animation one-shot, aucun `useEffect` ajouté.

### Preuves (commandes exécutées le 2026-10-20)

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Découpage ≤ 250 l. | `wc -l components/paiements/*.tsx` | **13 fichiers, total 1846, max 244** (`tresorerie-echeances.tsx`) |
| Lint du périmètre | `npx eslint components/paiements components/shared/mode-reglement-badge.tsx components/shared/flux-colors.ts lib/tresorerie/presentation.ts lib/__tests__/tresorerie-presentation.test.ts hooks/use-tresorerie.ts hooks/use-payments-queries.ts` | **0 problème** |
| Lint global (baseline D3.1) | `npm run lint` | `✖ 397 problems (35 errors, 362 warnings)` — inchangé |
| Typecheck | `npx tsc --noEmit` | **0 erreur** |
| Tests | `npx vitest run` | **22 fichiers, 364 tests** |
| Tests présentation | `npx vitest run lib/__tests__/tresorerie-presentation.test.ts` | **13 passed** |
| Interdits typage | `grep -rn ": any\b\|as any\b\|@ts-ignore\|eslint-disable" <13 fichiers + 2 briques + presentation.ts + 2 hooks>` | **0 occurrence** |
| Interdits état | `grep -rn "useEffect(\|useMutation(\|fetch(" components/paiements` | **1 ligne** = `refetch()` TanStack → 0 `useEffect`, 0 `fetch()`, 0 `useMutation` en composants |
| Mutations TanStack | `grep -rn "useMutation(" components/paiements hooks/use-tresorerie.ts hooks/use-payments-queries.ts` | **4** (`use-tresorerie:38`, `use-payments-queries:42,129,178`) |
| ModeReglementBadge | `grep -rln "mode-reglement-badge" components/ \| grep -v shared/mode-reglement-badge` | **6 fichiers** consommateurs |
| flux-colors | `grep -rln "flux-colors" components/ \| grep -v shared/flux-colors` ; `grep -rn "FLUX_ENTREE_COLOR\|FLUX_SORTIE_COLOR" components/ \| grep -v shared/flux-colors \| grep -vc import` | **7 fichiers**, **22 sites** d'usage |

### Notes / points ouverts

1. Compteurs du brief de livraison non repris tels quels, non reproduits : le brief annonçait
   **15 tests** de présentation → mesurés **13** (confirmé par la commande ci-dessus et par le
   rapport de livraison D3.2 qui lui-même annonce 13).
2. Le brief annonçait **9 consommateurs** `flux-colors` → mesurés **7 fichiers** (le rapport
   d'extraction du lot annonçait déjà 7).
3. Max de lignes : livraison annoncée **243** → mesuré **244** (`tresorerie-echeances.tsx`, +1
   ligne post-correctifs QA : extraction de `HORIZONS_JOURS`, balisage `scope="col"`).
4. **Report arbitré (QA P2)** : en-têtes de section ad hoc non migrés vers `SectionCard` —
   `tresorerie-projection.tsx:88,133`, `tresorerie-echeances.tsx:117,135`,
   `tresorerie-paiements-attente.tsx:140` (motif `text-xs font-semibold uppercase`) vs
   `SectionCard` utilisée dans `tresorerie-ventilation.tsx:22`, `tresorerie-comptes.tsx:63`,
   `tresorerie-recents.tsx:31`.
5. **Calendrier** (QA P2) : cibles `size-7` (28 px) < 44 px de la cible tactile WCAG 2.5.5 /
   SC 2.5.8 — à traiter dans la passe `impeccable critique`.
6. **Micro-pas typographique à arbitrer dans `DESIGN.md`** : `text-[10px]`/`text-[11px]`
   (10/11 px) — **221 occurrences / 79 fichiers** dans le repo (`grep -rno "text-\[1[01]px\]" …`
   → 221, `grep -rlo …` → 79), **17 occurrences / 7 fichiers** dans ce module —, alors que
   l'échelle `DESIGN.md` § `Typography → Hierarchy` plafonne à **Caption = 0.75rem (12 px)** :
   10/11 px sont hors échelle. (Revue QA : 15× `design-system-font-size`, seul finding détecté
   par `impeccable audit`.)
7. **Aucun e2e** : `find . -name "*.spec.ts" -not -path "./node_modules/*"` → **0 fichier**, et
   `package.json` ne dépend ni de Playwright ni de Cypress → 0 scénario pour la trésorerie comme
   pour le reste de l'app (dette globale, pas spécifique à ce lot).

## Notes

- Les rappels d'échéance sont tracés par drapeaux `rappel*Envoye`.
- Le split d'effet (`splitGroup`, `splitIndex`, `splitTotal`) permet de découper un effet en plusieurs.
- Un effet `EMIS` exige un `fournisseurId` (validation `effetSchema` / `batchSchema` + garde front).
- Le paiement d'un effet `EMIS` crée une ligne `Payment` (`methode: "EFFET"`, `invoiceId` null, `tiersId` = fournisseur) et toutes les écritures (achats + effet + payment) s'exécutent dans une transaction unique. `Payment.invoiceId` est nullable (migration `payment_invoice_optional`).
- **Liaison bidirectionnelle Payment ↔ Cheque/Effet** : à l'encaissement d'un chèque (`POST /api/cheques/[id]/encaisser`) ou au passage à PAYE d'un effet (`PATCH /api/effets/[id]`), le `Payment` créé reçoit `chequeId` ou `effetId` et l'instrument reçoit le `paymentId` (champs Prisma `Payment.chequeId`, `Payment.effetId`, `Cheque.paymentId`, `Effet.paymentId`). L'opération encaissement chèque utilise `prisma.$transaction` pour garantir l'atomicité (création payment + update cheque). La méthode de paiement est `CHEQUE` (enum `PaymentMethod` étendu).
- En sélectionnant des « Achats impayés » (sidebar), la liste « Achats liés » affiche le **numéro** de chaque achat (l'id reste transmis au serveur) et le champ **Montant (DT)** des détails financiers est auto-rempli avec le total des achats/factures sélectionnés (il reste éditable manuellement).
- Formulaire EMIS : la carte « Parties prenantes » présente **deux blocs côte à côte** — « Fournisseur (Tireur / Bénéficiaire) » (combobox ; Nom/Adresse/Banque/RIB en lecture seule dès la sélection, depuis la fiche `Tiers`) et « Société (Tiré / Émetteur) » (Nom/Adresse de la société courante chargés par défaut — résolution `selectedCompanyId ?? primaryCompanyId` via le hook partagé `useActiveCompanyId()` ; seul le compte bancaire se sélectionne via « Notre compte bancaire » → RIB exact affiché, multi-banques).
- Formulaire RECU : la carte « Parties prenantes » présente **deux blocs côte à côte** — « Société (Tireur / Bénéficiaire) » (Nom + **adresse concaténée (adresse, ville, code postal)** de la société courante en lecture seule depuis `companyData` + select « Notre compte bancaire » → RIB exact affiché, message d'aide si aucun compte) et « Client (Tiré / Émetteur) » (combobox client ; Nom, **adresse concaténée (adresse, ville, code postal)**, Banque, RIB en lecture seule dès la sélection, depuis la fiche `Tiers`).
- Assistant EMIS : `POST /api/effets/batch` accepte `ordrePaiementNumero` par effet et pose `splitGroup`/`splitIndex`/`splitTotal` quand le lot contient >1 effet ; `GET /api/effets/echeances-a-venir` accepte `horizon` (30/60/90/120), `page`, `pageSize` → `{ echeances, total, page, pageSize }`.
- Seuil de split : `Company.seuilSplitEffet` (Decimal, défaut 11 500, éditable dans Paramètres → Entreprises) — au-delà, un achat est proposé en plusieurs effets (`ceil(resteAPayer / seuil)`), montants modifiables tant que chaque achat est intégralement couvert.
- **Documents liés (RECU)** : la route `GET /api/effets/documents-lies?type=invoice&entityId=...` liste uniquement les factures sans aucun paiement (`montantPaye: 0`) pour éviter de rattacher une facture déjà partiellement soldée à un nouvel effet.
## Lot F.4 — fin des alert/confirm natifs, effets (2026-10-18)

- `nouvel-effet-actions.tsx` : les 2 `alert()` de garde de saisie (fournisseur manquant pour EMIS ; tiré/montant/date d'échéance manquants) deviennent `notify.warning` (canal avis 8 s, header verbe+objet, corps listant **exactement** les champs manquants) ; l'`alert()` d'erreur de création devient `notify.error({ title: "Création de l'effet impossible", error, context })` avec l'erreur réelle du `mutateAsync` (le hook `createEffet` ne notifie pas — rollback optimiste seul — donc pas de double toast).
- `use-nouvel-effet.ts` + `nouvel-effet-split-dialog.tsx` : le `window.confirm("Répartir automatiquement remplacera…")` de `handleAutoRepartir` est remplacé par un `ConfirmDialog` (variante `default`, `icon={Sparkles}`, `confirmLabel="Répartir"`) rendu dans le dialog de découpe — état `autoRepartirConfirmOpen` + `applyAutoRepartir()` exposés par le contrôleur `NouvelEffetController`. La garde n'est posée que si `splitDirty` (identique à l'ancien comportement).
- `use-nouvel-effet.ts` `handleSuggestEcheance` : catch vide → `notify.error` (les suggestions sont une action explicite de l'utilisateur).
- Détail complet : `docs/wiki/notifications.md` §9 + entrée CHANGELOG `[2026-10-18] Frontend (lot-f4-alert-confirm-catch/F)`.

## Lot E2b — validation Zod du PATCH paiement (groupe financier, 2026-10-23)

- `PATCH /api/payments/[id]` : `schema: paymentUpdateSchema` — **redéfini** (pas dérivé de `paymentSchema` : Zod 4 refuse `.pick()` sur un schéma portant `.refine()`, et la création impose `invoiceId`/`montant`/`methode` que ce PATCH n'écrit pas). Champs : `status` (`PaymentStatus`), `reference`/`notes` (string nullable optionnels), `dateReglement` (string ISO). **La logique métier est intacte** : confirmation EN_ATTENTE → CONFIRME et annulation CONFIRME → ANNULE avec reversement de solde facture **et** achat en Big.js, dans une `$transaction` — seule la lecture du corps passe par le `body` Zod-typé.
- Appelants : `hooks/use-payments-queries.ts` (`useUpdatePayment` — confirmation de virement `{ status: "CONFIRME" }`, édition reference/notes/dateReglement).

## Lot H vague W4 — impression des effets vers `hooks/use-effets.ts` (2026-10-24)

- `components/effets/impression-effets-client.tsx` : le hook local `useEmisEffets(status)` (`fetch /api/effets?type=EMIS&status=…`, clé `["effets","EMIS",status,companyId]`) est déplacé dans **`hooks/use-effets.ts`** et branché sur `queryKeys.effets.emisList(status, companyId)`.
- La société reste lue dans **`useCompanyStore((s) => s.selectedCompanyId)`** (et non `useActiveCompanyId`) : c'est la source exacte de l'inline, dont la clé de cache ne devait pas bouger (le fallback « company primaire » aurait produit une autre clé).
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
