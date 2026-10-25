# Module : Devis (Quotes)

## Fonctionnalités

- **Cycle de statuts** : BROUILLON → ENVOYEE → ACCEPTEE / REFUSEE → FACTUREE (conversion en facture) / EXPIREE (automatique).
- **Création** : formulaire avec sélection client, lignes produit (quantité, prix HT, remise, TVA, FODEC), notes, dates de création/expiration.
- **Listing** : data-table avec colonnes N°, Client, Date, Expiration, Montant TTC, **Equivalent TND** (pour devis étrangers), Statut, Facture liée. Filtres par statut, recherche par numéro/client.
- **Détail** : vue complète avec layout 70/30 (grid-cols-[1fr_320px]), sidebar sticky avec Total TTC noir (shadow-lg, dark:border dark:border-white/10). **Page header** sticky avec fond semi-transparent (bg-card/50 backdrop-blur-sm), numéro de devis en text-2xl font-bold, badge de statut inline, actions rapides (Aperçu, Envoyer, Accepter, Refuser) en header. **Plus de dates dans le header** — les dates n'apparaissent QUE dans la sidebar (anti-redondance). Client card avec layout 2 colonnes sur desktop. Tableau des lignes avec alternance subtile bg-secondary/20, en-têtes uppercase tracking-wider. Récapitulatif dans une card dédiée avec progression visuelle HT → Remise → Total HT → TVA → FODEC → Timbre → Total TTC, séparateurs entre sections. Sidebar avec Total TTC hero, card métadonnées (dates + notes + facture liée), boutons secondaires (Convertir, Supprimer).
- **Conversion en facture** : un devis peut être converti en facture via l'API `/api/quotes/{id}/convert`.
- **Expiration automatique** : les devis expirés sont marqués automatiquement au montage des pages.
- **Notifications toast** : messages enrichis avec description, icônes contextuelles, et actions rapides (ex: "Voir" après création, "Voir facture" après conversion).
- **Multi-devises** : support TND, EUR, USD. Le taux de change BCT est récupéré automatiquement. L'equivalent TND est calculé et stocké pour les agrégations.

## Modèles de données (Prisma)

- `Quote` : id, numero, tiersId, dateCreation, dateExpiration, baseHT, totalHT, totalTVA, totalFodec, totalTTC, status, notes, invoiceId, **devise** (TND/EUR/USD), **tauxChange** (taux BCT), **montantTND** (equivalent en TND).
- `QuoteLine` : id, quoteId, productId, description, quantite, prixHT, remise, tauxTVA, fodec, tauxFodec, totalHT, ordre.

## Fichiers clés

- `app/api/quotes/` — CRUD devis (GET list, POST create, GET detail, PATCH status, DELETE)
- `app/api/quotes/[id]/convert` — conversion devis → facture
- `app/api/quotes/expire` — expiration automatique des devis
- `app/(app)/devis/page.tsx` — page listing devis
- `app/(app)/devis/new/page.tsx` — page création devis
- `app/(app)/devis/[id]/page.tsx` — page détail devis
- `components/devis/nouveau-devis-actions.tsx` — actions création (toast avec lien vers devis)
- `components/devis/devis-client.tsx` — composant listing avec dropdown actions (envoyer, supprimer)
- `components/devis/devis-detail-client.tsx` — composant détail avec layout 70/30 (grid-cols-[1fr_320px]), page header sticky (bg-card/50 backdrop-blur-sm, text-2xl font-bold, actions rapides inline), client card (layout 2-col), tableau alternance bg-secondary/20, récap card avec séparateurs, sidebar Total TTC hero + card métadonnées (dates, notes, facture liée) + boutons secondaires
- `components/devis/devis-detail-skeleton.tsx` — skeleton avec header sticky skeleton, client card skeleton, tableau skeleton, récap skeleton, sidebar skeleton
- `components/devis/devis-preview.tsx` — aperçu/impression PDF
- `hooks/use-devis.ts` — hooks React Query (useDevisList, useDevisDetail, useDevisMutations)
- `lib/stores/devis-store.ts` — stores Zustand (useDevisListStore, useDevisFormStore, useDevisDetailStore)
- `components/status-badge.tsx` — badges de statut avec couleurs spécifiques par statut (BROUILLON: amber, ENVOYEE: blue, ACCEPTEE: emerald, REFUSEE: red, EXPIREE: gray, FACTUREE: purple)

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-devis.ts` : effet debounce 300 ms `searchInput → setSearchQuery` (ex-L32) **supprimé** ; `useDevisSearchDebounce()` vidé (appelé par `components/devis/devis-client.tsx` → **candidat à suppression**) ; `useDevisList` lit `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1 `hooks/use-effets.ts`).
- **Conservés intacts (hors périmètre)** : `useExpireQuotesOnMount` (ex-L300, expiration des devis au montage — Lot 3) et ses imports `useEffect`/`useRef`.
- Flux inchangé : recherche serveur conservée (mécanisme différé uniquement), filtre client DataTable (`searchValue={searchInput}` / `globalFilter`) **intact**, `devis-store.searchQuery` plus lu (store non modifié).

## P2-7 Lot 3 — expiration serveur à la lecture (2026-09-28)

Lot 3 de `P2-7` : **l'expiration automatique des devis passe côté serveur (Option A — write-on-read, pas de cron)**. Le `useEffect` `useExpireQuotesOnMount` (ex-`hooks/use-devis.ts:285-295`, catégorie « data-mutation au montage ») est **supprimé** : `hooks/use-devis.ts` perd son **unique** `useEffect` (imports `useEffect`/`useRef` purgés de ce fichier). **0 `useEffect` ajouté, 0 `any`, 0 ligne de JSX modifiée (0 changement visuel), 0 changement Prisma (`prisma/schema.prisma` inchangé — pas de migration), aucune nouvelle route.**

- **Nouvelle lib `lib/quote-expiry.ts` — `expireDueQuotes(db, companyId): Promise<number>`** : prédicat **verbatim** de `POST /api/quotes/expire` (statuts `ENVOYEE`/`BROUILLON`, `dateExpiration <= now` → `EXPIREE`), paramètre typé `PrismaClient` (import `type` depuis `@/prisma/generated/prisma/client` = chemin du client généré du projet, convention `lib/prisma.ts`).
- **Appel en tête des 3 GET** (après résolution `companyId`, avant tout calcul ; le count n'est **pas** exposé côté HTTP) :
  - `GET /api/quotes` (`app/api/quotes/route.ts`) — liste + stats (`enAttente`, `tauxAcceptation`) lues sur état frais ;
  - `GET /api/quotes/[id]` (`app/api/quotes/[id]/route.ts`) — **parité stricte** avec l'ancien déclencheur page détail ;
  - `GET /api/dashboard` (`app/api/dashboard/route.ts`) — **couverture nouvelle assumée** : les compteurs devis du dashboard (`devisCount`, `devisMontantTotal`, `devisTauxConversion`) sont désormais frais à chaque GET, au lieu de rester périmés jusqu'à l'ouverture de /devis.
- **Route `POST /api/quotes/expire` CONSERVÉE** et refactorée sur la même lib — réponse `{ success, expired }` inchangée ; elle **n'est plus appelée par le client** (0 consommateur restant).
- **Client purgé** :
  - `hooks/use-devis.ts` : suppression de `useExpireQuotesOnMount` (commentaire de section + `useRef` anti-double-run inclus), de la mutation `expireQuotes` (ex-L215-253, optimistic update ne couvrant que `ENVOYEE`) et de son exposition au `return` de `useDevisMutations()` — les 4 autres mutations (`createQuote`, `updateStatus`, `convertToInvoice`, `deleteQuote`) et le type de retour restent **intacts** ;
  - `components/devis/devis-client.tsx` : **seulement** le retrait de `useExpireQuotesOnMount` de l'import (L3) et de l'appel (ex-L112) ;
  - `components/devis/devis-detail-client.tsx` : **seulement** idem import (L3) + appel (ex-L48) ;
  - **doublon mort supprimé** : `useExpireQuotes` (`hooks/use-quotes-queries.ts` ex-L133-147, 0 usage hors re-export) + son nom retiré de la liste de re-export `hooks/use-queries.ts:13` (les 7 autres noms de cette ligne conservés, vérifiés).
- **Incohérence `BROUILLON` résolue en faveur du serveur** (documentée `docs/audits/devis.md:96`) : la règle serveur expire aussi les `BROUILLON` et est conservée verbatim dans la lib ; l'optimistic client (qui ne couvrait que `ENVOYEE`) disparaît avec la mutation — plus de double comportement.
- **Comportement / delta** : la **première lecture** (liste, détail, dashboard) renvoie l'état expiré ; **−1 requête POST au montage** (plus d'appel `POST /api/quotes/expire` côté client), aucun `fetch` nouveau côté serveur-state (tout reste TanStack).
- **Suite de l'inventaire** : le Lot 2 notait `useExpireQuotesOnMount` « conservé intact — Lot 3 » (ci-dessus) → **traité, supprimé** ; inventaire projet → **22 occurrences / 16 fichiers = 20 justifiées + 2 non justifiées** (restants : `hooks/use-debounce.ts:8/:22` = fichier orphelin, suppression en attente d'accord utilisateur).

## P2-7 Lot 6 — calculs financiers devis/BL (2026-09-28)

Lot 6 de `P2-7` (audit `AUDIT-FACTURAPRO.md` §6) : **les 5 `useEffect` non justifiés « calculs financiers »**, **3 fichiers code uniquement** (`components/devis/nouveau-devis-client.tsx`, `components/bons-livraison/nouveau-bl-client.tsx`, `hooks/use-bl.ts`), **0 `useEffect` ajouté**, **0 ligne de JSX modifiée** (0 changement visuel), 0 store créé, 0 route API, 0 fichier hors périmètre. **Formules, arrondis et payload inchangés** — `nouveau-devis-actions.tsx`, `nouveau-bl-actions.tsx`, `bl-form-vise.tsx` et `use-devis.ts` **non modifiés**.

- `grep -n "useEffect(" <les 3 fichiers>` → **vide (exit 1)** ; `hooks/use-devis.ts:289` (`useExpireQuotesOnMount`, Lot 3) reste **intact** = le seul `useEffect` de ce pôle.
- **Mécanisme général** : les 5 effets écrivaient un store partagé. Ils deviennent des `useQuery` dont le **`queryFn` écrit via `getState()` hors cycle de rendu** (pattern `components/achats/scan-upload-screen.tsx`, `components/customizer/customizer-studio.tsx`) — un ajustement au rendu déclencherait le warning React *"Cannot update a component while rendering…"* (react#31730, Zustand v5 notifie synchrone) car `NouveauDevisActions` / `BLFormVise` / `NouveauBLActions` sont abonnés dès le premier render.
- **Déclencheurs identiques** : `queryKey` = dépendances exactes de l'ex-effet ; `staleTime: 0` (run à chaque montage et à chaque bascule de clé ≡ `deps`) ; `retry: false` ; `refetchOnReconnect: false` ; défaut global `refetchOnWindowFocus: false` (`lib/providers/query-provider.tsx`) → **aucun run au-delà des déclencheurs de l'ex-effet**.

### Les 5 sites

- **① `nouveau-devis-client.tsx` ex-L29 — init `dateExpiration` (10 j) → `useQuery` `["devis-date-expiration-init", form.dateCreation]`**. Formule identique : `d = new Date(dateCreation)` → `d.setDate(d.getDate() + 10)` → `setDateExpiration(d.toISOString().split("T")[0])` (biais UTC conservé tel quel), garde `dateCreation && !dateExpiration` reprise en garde d'idempotence. Déclencheurs identiques (montage + `dateCreation`, **jamais** sur une simple édition de `dateExpiration`, `staleTime: 0`). Lecteur : `buildPayload()` (`nouveau-devis-actions.tsx:20`).
- **② ex-L47 — sync `tauxChange` BCT → store → `useQuery` `["taux-bct-devis-sync", form.devise, tauxBCTQuery.data]` avec `enabled: tauxBCTQuery.data != null`** (≡ garde exacte de l'effet). `tauxChange` reste dérivé au rendu (`tauxBCTQuery.data ?? form.tauxChange`); écriture `getState()` + garde `store.tauxChange !== taux`. `useDevisTauxBCT` **inchangé**. Lecteur : `buildPayload()` (`nouveau-devis-actions.tsx:23`).
- **③ ex-L93 — `montantTND` (état dérivé, lu uniquement au submit) → `useQuery` `["devis-montant-tnd", tauxChange, form.devise, totalTTC.toString()]`** = les **3 dépendances exactes** de l'ex-effet. Formule **identique** : si `devise !== "TND" && tauxChange` → `timbreFiscal = devise === "TND" ? Big("1.000") : Big(0)` (branche TND morte ici mais conservée verbatim) → `(totalTTC + timbreFiscal) × Big(tauxChange)` → **`toFixed(4)`**, écrit si ≠ du store ; sinon `setMontantTND("")` si ≠ `""`. **Lecteur unique : `buildPayload()`** — le JSX affiche « Équivalent TND » calculé en direct, indépendamment du store.
- **④ `nouveau-bl-client.tsx` ex-L92 — `montantTND` → `useQuery` `["bl-montant-tnd", totalTTC.toFixed(3), form.tauxChange, form.blViseActif, form.devise]`** = les **4 dépendances exactes** de l'ex-effet. Formule **identique** : si `blViseActif && devise !== "TND" && tauxChange && totalTTC > 0` → `tc = parseTunisianNumber(tauxChange)`, si `tc > 0` → `totalTTC × Big(tc)` → **`toFixed(3)`** si ≠ du store ; sinon si `blViseActif && (devise === "TND" || !tauxChange || totalTTC == 0)` → `""` si ≠ `""` ; sinon **aucune écriture** (cas `totalTTC < 0`). Lecteurs : `bl-form-vise.tsx:71` (Input affiché/saisissable), `nouveau-bl-actions.tsx:43` (`buildPayload`) et `:61` (`buildInvoicePayload`).
- **⑤ `hooks/use-bl.ts` ex-L77 — sync taux BCT → store BL → query de synchro séparée `["taux-bct-bl-sync", devise, query.data]` avec `enabled: !!query.data`**. `useBLTauxBCT` **inchangé** (`staleTime: 300_000`, `retry: 1`, `fetch /api/taux-bct`). **Écart assumé** : le setter est dans une query de synchro **séparée** et non dans la `queryFn` de la query taux — un run de `queryFn` implique un fetch, alors que l'ex-effet se déclenchait aussi quand `data` revenait **depuis le cache sans refetch** (bascule devise EUR→USD→EUR sous les 300 s de `staleTime`), auquel cas le taux serait resté celui de l'autre devise.

### Conservation stricte

- Payload **inchangé** : `dateExpiration`, `tauxChange`, `montantTND` produits sous les mêmes conditions qu'avant (`nouveau-devis-actions.tsx` / `nouveau-bl-actions.tsx` non modifiés).
- `totalTTC` (boucle `calcLineTotals` + `plus`) et `parseTunisianNumber` **intacts** ; `Big`, `Math` et l'ordre d'opérations inchangés.
- Aucun nouveau `fetch` : les 5 sites font des calculs/écritures, pas d'appel réseau (les seuls `fetch` du lot restent dans la `queryFn` de `useBLTauxBCT`, préexistante).

## P2-13 — wrapper de toast `lib/toast.ts` (2026-10-08)

- `components/devis/nouveau-devis-actions.tsx` : import `toast` → **`@/lib/toast`** (1 ligne) ; les **2 titres vides** `toast.error("", …)` restent vides et le toast « Devis créé » conserve son `action { label: "Voir", onClick }` — textes strictement identiques, **0 ligne de JSX touchée** (les autres sites devis, dont les imports dynamiques de `use-bc.ts`, sont hors périmètre).
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-08] Frontend (p2-13-toast-wrapper/P2-13)`.

## Notes

- Les toasts passent par le socle **`@/lib/notify`** (lot F.3b, 2026-10-18) :
  `notify.success/warning/error` avec header verbe + objet (« Devis D-2026-003 accepté »).
- Les icônes lucide-react **dans les toasts** (`Send`, `CheckCircle`, `XCircle`,
  `ReceiptText`, `Trash2` — option `icon:` de sonner) ont été **supprimées** avec la
  migration : `notify` gère ses propres variantes. Les mêmes icônes restent utilisées dans
  les boutons et menus.
- **Actions bar** : actions principales (Aperçu, Envoyer, Accepter, Refuser) en header sticky pour accessibilité permanente. Actions secondaires (Convertir, Supprimer) dans la sidebar. Boutons size="sm" en header, size="sm" en sidebar avec variant="destructive" pour Supprimer (text-destructive + hover:bg-destructive/10).
- **KPI layout** : layout 70/30 (`grid-cols-[1fr_320px]`) avec sidebar sticky (`lg:sticky lg:top-20 lg:self-start`). Total TTC dans un bloc noir avec `shadow-lg` (light) / `dark:border dark:border-white/10` (dark). Les montants utilisent `tabular-nums` pour éviter les décalages.
- **Page header** : sticky (`sticky top-0 z-10`) avec fond semi-transparent (`bg-card/50 backdrop-blur-sm`). Numéro de devis en `text-2xl font-bold tracking-tright`. Badge de statut inline. Actions rapides en `size="sm"` avec icônes seules sur mobile (`hidden sm:inline`).
- **Anti-redondance** : les dates (Créé le, Expire le) n'apparaissent QUE dans la sidebar — supprimées du page header pour éviter la duplication signalée par l'utilisateur.
- **Client card** : layout 2 colonnes sur desktop (`grid grid-cols-1 sm:grid-cols-2`), label "Client" en uppercase tracking-wider avec icône dans un bg-secondary, padding `p-5`.
- **Tableau lignes** : en-têtes en `text-[11px] uppercase tracking-wider`, alternance subtile (`bg-secondary/20` sur lignes impaires), hover `bg-secondary/40` avec `transition-colors duration-150`. Codes produit en `font-mono text-[11px]`.
- **Récapitulatif** : card dédiée avec header "Récapitulatif" + nombre de lignes, séparateurs entre sections, progression visuelle HT → Remise → Total HT → TVA → FODEC → Timbre → Total TTC. Total TTC en `text-lg font-bold` pour emphasis.
- **Polish** : `active:scale-[0.96]` sur boutons, `text-pretty` sur adresse client, `rounded-lg` (10px) conforme à l'échelle DESIGN.md. Pas de `hover:shadow-sm` sur les cards au repos (conforme à la Structural Shadow Rule).
- Le hook `useDevisMutations` gère les mutations avec optimistic updates via React Query.
- Le payload de création utilise `tiersId` (et non `clientId`) pour lier le client au devis.
- La section Récapitulatif du formulaire affiche : Base HT, Remise, Total HT, TVA, FODEC, Timbre fiscal (1.000 DT), Total TTC.
- **Affichage remise** : si toutes les lignes avec remise ont le même taux, le pourcentage exact est affiché (ex: `10%`). Si les taux diffèrent, un pourcentage moyen pondéré est affiché avec le préfixe `~` (ex: `~3.1%`).
- **TVA exonérée** : pour les clients avec `exonereTVA = true`, le taux TVA est forcé à 0 % et le FODEC est désactivé sur toutes les lignes du devis. Lors du changement de client, la logique `handleClientChange` dans `nouveau-devis-client.tsx` restaure automatiquement la TVA par défaut (19 %) et le FODEC du produit pour les clients non exonérés. La vérification s'effectue à la fois côté client (`LineItemsTable`, `nouveau-devis-actions.tsx`) et côté serveur (`app/api/quotes/route.ts`).
- **Multi-devises** : la devise sélectionnée (TND, EUR, USD) s'applique aux lignes du devis via la prop `currency` passée à `LineItemsTable`. Le formatage des prix et totaux utilise `formatCurrency()`.
- **Calcul montantTND** : lors de la création, si `devise !== "TND"` et `tauxChange` existe, `montantTND = totalTTC * tauxChange`. Ce montant est utilisé pour les agrégations (listing, dashboard) afin de ne jamais mélanger les devises.
- **Agrégation montant total** : le "Montant Total" du listing et du dashboard somme les `totalTTC` pour les devis TND et les `montantTND` pour les devis étrangers.
- **Sync taux BCT** : le taux de change BCT est automatiquement synchronisé dans le form store (`useDevisFormStore`) — initialement via un `useEffect` dans `nouveau-devis-client.tsx`, **remplacé par une `useQuery` de synchro (`["taux-bct-devis-sync", …]`, écriture `getState()` dans le `queryFn`) au Lot 6 (2026-09-28)** — afin que `buildPayload()` l'inclue dans le payload de création.
- **Payload création multi-devises** : `buildPayload()` inclut désormais `devise`, `tauxChange` et `montantTND` dans le payload envoyé à l'API. Sans ces champs, tous les devis étaient créés avec `devise: "TND"` par défaut, ce qui cassait l'affichage dans le listing (colonne "Equivalent TND" vide), le détail (pas de devise EUR), et le PDF (devise affichée en TND).
- **Auto-refresh listing** : l'invalidation React Query après création/suppression de devis utilise `["quotes"]` comme préfixe au lieu de `queryKeys.quotes()` qui passait des arguments `undefined`. Cela permet l'invalidation correcte de toutes les queries de listing quel que soit le filtre actif.
- **Sélecteur de devise manuel** : le formulaire de création de devis inclut un `<Select>` pour la devise (TND/EUR/USD) pré-rempli avec la devise du client. Un champ "Taux de change" conditionnel s'affiche si la devise est différente de TND, avec récupération automatique du taux BCT.

## PDF Devis

- **Remise dans récapitulatif PDF** : la ligne Remise s'affiche en orange dans le tableau des totaux du PDF si `remise > 0`.
- **Note par défaut** : "Ce devis n'est valable que 10 jours. Dépassant la date d'échéance, l'offre n'est plus valable."
- **Texte "Arrêté"** : "Arrête le présent devis" avec mention de la devise et conversion en TND si applicable.
- **Devise** : le PDF affiche la devise du devis (symbole € pour EUR, $ pour USD). Si devise étrangère, le taux BCT et l'equivalent TND sont affichés.
- **FODEC** : affichée uniquement pour devise TND.
- **Séparation bcVise / tauxChange** : pour les devis, le taux de change est passé via le champ `tauxChange` de `DocumentPDFOptions` (et non via `bcVise`). La section "Bon de commande visé sous douane" (`bcVise`) est réservée aux bons de livraison et factures uniquement. Le champ `bcVise` des devis a été supprimé pour éviter l'affichage incorrect de cette section dans l'aperçu et le PDF.
- **Fichiers clés** : `lib/pdf-types.ts`, `lib/pdf-converters.ts`, `lib/pdf-builder.ts`

## Migration

- **2026-08-29** : Fix migration échouée `20260828000000_add_devise_fields_to_quote`. Les colonnes `devise`, `tauxChange`, `montantTND` existaient en base mais Prisma ne les跟踪ait pas. Résolu via `prisma migrate resolve --applied`. Aucune modification de code nécessaire — tout était déjà implémenté.

## Lot E2b — validation Zod des PATCH/POST de devis (groupe financier, 2026-10-23)

- `PATCH /api/quotes/[id]` : `schema: quoteStatusUpdateSchema` — `status` **optionnel** (le handler ne faisait que `if (status)`, sinon 400 « Action non reconnue »). Le payload `{convertToInvoice: true}` de `useConvertQuoteToInvoice` (hook **sans consommateur** actuel) est stripé par Zod → `status` absent → même 400 « Action non reconnue » qu'avant (équivalence prouvée).
- `POST /api/quotes/[id]/convert` : `schema: quoteConvertSchema` — **racine `.optional()`** car l'appelant frontend (`use-devis.ts` → `convertToInvoice`) POSTe **sans corps** ; `undefined` doit passer la validation, `target` absent → « invoice » (défaut historique). Une cible hors enum → 422 wrapper (avant : 400 manuel avec `CONVERT_TARGETS`, retiré — le const ne servait plus qu'au type, dérivé du schéma).
- `write-on-read` (`expireDueQuotes`) et tout le calcul financier de conversion (Big.js, retenue, numérotation) sont inchangés.

## Lot H vague W4 — requêtes init/sync du devis et du BL vers `hooks/` (2026-10-24)

- **`hooks/use-devis.ts`** gagne 3 hooks reprenant verbatim les `useQuery` inline de `components/devis/nouveau-devis-client.tsx` : `useDevisDateExpirationInit(dateCreation)` (clé `queryKeys.devis.dateExpirationInit`), `useDevisTauxChangeSync(devise, taux)` (clé `queryKeys.taux.bctDevisSync`, `enabled: taux != null`) et `useDevisMontantTndSync(tauxChange, devise, totalTTC)` (clé `queryKeys.devis.montantTnd`, `totalTTC.toString()`). `staleTime: 0`, `retry: false`, `refetchOnReconnect: false` et l'écriture store via `getState()` (hors cycle de rendu, pas de warning react#31730) sont conservés tels quels.
- **`hooks/use-bl.ts`** gagne `useBLMontantTndSync(totalTTC, tauxChange, blViseActif, devise)` — ex-`useQuery<string>` inline de `components/bons-livraison/nouveau-bl-client.tsx`, clé `queryKeys.bonsLivraison.montantTnd(totalTTC.toFixed(3), tauxChange, blViseActif, devise)`, mêmes branches/gardes (`computed !== montantTND`, repli `""`).
- Les 2 composants n'ont plus aucune `useQuery` inline ; JS(X) et contrats inchangés.
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
