# Module : Facturation

## Fonctionnalités

- **Factures** : création, édition, suppression, numérotation par entreprise (`Sequence`), statuts (BROUILLON → PAYEE) avec **validation des transitions** (ex: PAYEE/ANNULEE sont terminaux), suivi douane (`bcVise`, `dateSN`, `poids`, `nbColis`), devises et taux de change.
- **Devis (quotes)** : cycle BROUILLON → ENVOYEE → ACCEPTEE → FACTUREE, conversion en facture (`invoiceId`).
- **Avoirs (notes de crédit)** : type SIMPLE / FINANCIER, remboursement, mouvements financiers liés.
- **Bons de commande** (`bons-commande`) : statuts BROUILLON / ACCEPTE / ANNULE. La data-table liste les colonnes N° BC, Réf. Client (`referenceClient`), Client (`tiers.raisonSociale`), Date, Total TTC, Statut et Actions (`BCRowActions`).
- **Bons de livraison** (`bons-livraison`) : statuts (BROUILLON, LIVRE, ANNULE), visa sous douane (`blVise`, `snNumero`, poids), export des lignes. Le listing **et la page détail** affichent un badge "Facturé le : N° (date)" (violet) quand un BL est lié à une facture.
- **Modes de facturation depuis BL** : le dialog "Générer une facture pour" propose deux choix — **Facture consolidée** (défaut, tous les BLs en une facture, comportement historique) ou **Facture par Bon de livraison** (une facture distincte par BL). Le champ Notes a été supprimé définitivement (UI + API).
- **Anti double-facturation / suppression protégée** : un BL lié à une facture ne peut pas être refacturé (filtre `invoices: { none: {} }`), et `DELETE /api/invoices/[id]` renvoie une 400 structurée quand la facture est liée à au moins un BL — le frontend affiche alors une boîte "Suppression impossible".
- **Factures groupées par BL** : conversion de facture avec lignes groupées visuellement par Bon de Livraison via `blGroupedInvoiceToDocumentOptions()`. Les séparateurs BL (`isGroupHeader`) affichent un bandeau avec numéro et date de livraison dans le PDF.

## Modèles de données (Prisma)

- `Invoice`, `InvoiceLine`, `Quote`, `QuoteLine`, `Avoir`, `AvoirLine`, `BonCommande`, `BonCommandeLine`, `BonLivraison`, `BonLivraisonLine`, `InvoiceBonLivraison` (table de liaison), `Payment` (lié), `Sequence`.

## Types TypeScript

- `SerializedDeliveryNote` — inclut le champ optionnel `invoices` (array de `{ invoice: { id, numero, dateEmission, status } }`) pour afficher le badge "Facturé" dans le listing.
- **UI du module Avoir sans `any` (2026-09-26)** : les 7 composants de `components/avoirs/` sont désormais typés sans `any` ni directive `eslint-disable` — types utilisés : `SerializedTiers`, `SerializedInvoice`, `SerializedProduct`, `SerializedAvoir`, `SerializedAvoirLine`, `SerializedPayment` (callbacks fournisseurs typés structurellement `{ id, raisonSociale }`, contravariance Combobox).
- **Racine profonde restante** : `hooks/use-fournisseurs-queries.ts:6` déclare `fournisseurs: Record<string, unknown>[]` au lieu de `SerializedTiers[]` — à typer en lot ultérieur.

## Fichiers clés

- `lib/calc-line-totals.ts` — utilitaire partagé de calcul des totaux de ligne (HT, TVA, FODEC, TTC) pour tous les types de documents (factures, devis, BL, avoirs, achats)
- `app/api/invoices/route.ts` — GET (listing avec paiements **et effets RECU** inclus) + POST (création facture)
- `app/api/invoices/[id]/route.ts` — GET détail (inclut `bonsLivraison` avec numéro/date), PATCH modification, DELETE suppression **bloqué (400) si la facture est liée à des BLs** : `{ error: "Facture liée à des bons de livraison", invoiceNumero, blNumeros: string[] }`
- `app/api/invoices/pending-bl/route.ts` — GET des BLs en attente de facturation (status LIVRE, sans facture liée), groupés par client
- `app/api/invoices/from-bl/route.ts` — POST création de facture depuis des BLs sélectionnés. Body : `{ clientId, blIds, dateEmission?, dateEcheance?, mode: "consolidee" | "par_bl" }` (Zod, `mode` défaut `consolidee`, **champ `notes` supprimé**). Réponse toujours `{ invoices: [{ id, numero }] }`. Mode `par_bl` : numéros générés en amont (`nextNumber`) puis création de toutes les factures dans **une seule `prisma.$transaction`** (un trou de numérotation après rollback est acceptable). Le statut des BLs reste LIVRE — la relation `invoices` indique qu'ils sont facturés (aucune mise à jour de statut).
- `app/api/quotes/` — CRUD devis
- `app/api/avoirs/` — CRUD avoirs
- `app/api/bons-commande/`, `app/api/bons-livraison/` — CRUD BC / BL. L'API GET `/api/bons-livraison` inclut les factures liées via la relation `invoices` (pour afficher le badge "Facturé" dans le listing).
- `app/(app)/factures/`, `app/(app)/devis/`, `app/(app)/avoirs/` — pages UI
- `lib/invoice-payment.ts` — logique de paiement / soldes factures
- `components/factures/payment-dialog.tsx` — dialog d'enregistrement de paiement (méthodes : ESPECES, VIREMENT, CARTE ; chèque/effet via module dédié)
- `components/factures/factures-client.tsx` — listing factures avec colonne "Statut Paiement" (icone colorée + tooltip détail des paiements liés)
- ~~`components/factures/pending-bl-alert.tsx`~~ — supprimé, remplacé par `floating-alert.tsx`
- `components/factures/floating-alert.tsx` — composant modal centré + FAB flottant pour BLs en attente. Le FAB est rendu via `createPortal` pour être toujours visible (z-index 9999), avec des couleurs dynamiques (rouge=0%, orange=1-49%, jaune=50-99%, vert=100%). Le modal affiche la liste des clients avec bouton "Générer" par client, ouvrant le `GenerateInvoiceDialog`. Animations Framer Motion, persistance localStorage via Zustand store. Rappels automatiques décroissants (30→15→5→2 min, max 4/jour).
- `lib/stores/pending-bl-store.ts` — Zustand store avec persistance localStorage pour l'état du FloatingAlert (isMinimized, dismissedToday, reminderCount, nextReminderMinutes). Rappels automatiques décroissants (30→15→5→2 min, max 4/jour).
- `components/factures/generate-invoice-dialog.tsx` — dialog de sélection de BLs et génération de facture, avec **RadioGroup 2 choix** (`consolidee` défaut / `par_bl`), bouton dynamique ("Générer la facture" / "Générer N factures"), disabled si 0 BL sélectionné. Un HoverCard avec icône Info affiche les détails du BL (produits, quantités, prix HT, total HT) au survol. Le champ Notes a été retiré.
- `components/factures/factures-client.tsx` — gestion de l'erreur 400 de suppression : type guard `ApiError.body` (`invoiceNumero` + `blNumeros`) puis `AlertDialog` "Suppression impossible" (message singulier/pluriel selon le nombre de BLs).
- `components/factures/facture-detail-lines.tsx` — affichage des lignes avec groupement par BL quand applicable (séparateur 📦 par BL)
- `components/factures/facture-detail-client.tsx` — détail facture avec impression/PDF utilisant `blGroupedInvoiceToDocumentOptions` quand des BLs sont liés
- `components/bons-livraison/bl-client.tsx` — listing des BLs avec colonne "Statut" : `DeliveryNoteStatusBadge` + badge `QuoteInvoicedBadge` violet (`invoicedBadgeVioletClass`) "Facturé le: numéro (date)" quand le BL est lié à une facture.
- `components/bons-livraison/bl-detail-actions.tsx` — page détail BL : badge `QuoteInvoicedBadge` violet affiché à côté du badge de statut quand `linkedInvoice` existe (numéro + date via `formatDate`).
- `components/status-badge.tsx` — `QuoteInvoicedBadge` / `invoicedBadgeConfig` réutilisables (génériques) : label "Facturé le : {numero} ({date})" **uniquement si les props sont fournies**, sinon "Facturé" (usage devis conservé). Export `invoicedBadgeVioletClass` (violet) — **appliqué uniquement sur les sites BL**, la config par défaut reste grise.
- `hooks/use-pending-bl.ts` — hooks TanStack Query pour BLs en attente (`usePendingBLs`) et création de facture depuis BLs (`useCreateInvoiceFromBL`, mutation avec `mode`, réponse `{ invoices }`, invalidation `pending-bl` / `invoices` / `delivery-notes` / `dashboard`). Le type `PendingBL` inclut `lines` avec `totalHT` pour l'affichage dans le HoverCard.
- `app/api/bons-livraison/[id]/route.ts` — GET détail inclut désormais `invoices → invoice { id, numero, dateEmission, status }` pour le badge de la page détail.
- `lib/pdf-types.ts` — types `DocumentLine` (avec champs BL optionnels : `blNumero`, `blDate`, `isGroupHeader`) et `DocumentPDFOptions`
- `lib/pdf-builder.ts` — `buildDocumentHTML()` génère le HTML du PDF, gère les séparateurs BL
- `lib/pdf-converters.ts` — converters : `invoiceToDocumentOptions()`, `blGroupedInvoiceToDocumentOptions()`, `deliveryNoteToDocumentOptions()`, `quoteToDocumentOptions()`
- `lib/export-utils.ts` — ré-exports de tous les converters (dont `blGroupedInvoiceToDocumentOptions`)

## P2-13 — wrapper de toast `lib/toast.ts` (2026-10-08)

- Migration de l'import `sonner` → **`@/lib/toast`** (**1 ligne** par fichier) sur `components/factures/nouvelle-facture-actions.tsx`, `components/devis/nouveau-devis-actions.tsx` et `components/bons-livraison/nouveau-bl-actions.tsx` (les BL n'ont pas de fiche dédiée : module *Facturation* du `docs/wiki/README.md`).
- Les **6 titres vides** `toast.error("", { description: … })` de ces 3 fichiers (« Veuillez sélectionner un client », « Ajoutez au moins une ligne », « Ajoutez au moins une ligne de facturation ») **restent vides** ; les **3 options `action { label, onClick }`** (« BL créé », « BL et Facture créés », « Devis créé ») sont typées par le type `ExternalToast` de sonner et transmises telles quelles ; titres/descriptions/variantes/messages strictement identiques, **0 ligne de JSX touchée**.
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-08] Frontend (p2-13-toast-wrapper/P2-13)`.
- **Lot F.3b (2026-10-18)** : les toasts des écrans factures (`factures-client`,
  `facture-detail-client`), BL (`bl-client`, `bl-detail-client`) et du reste du périmètre
  (avoirs, exports, fournisseurs, paiements, trésorerie, setup…) sont migrés vers
  **`@/lib/notify`** avec header verbe + objet (« Facture F-2026-0042 payée ») — voir
  `docs/wiki/notifications.md` §8.

## P3-14 — tests de la logique financière + 3 correctifs `lib/decimal.ts` (2026-10-08)

- Lot **P3-14** (dernier prompt du chantier audit §6, validé par l'utilisateur) : les **tests existants + le JSDoc sont la spec** ; 3 bugs de `lib/decimal.ts` corrigés pour s'y aligner :
  - **`formatCurrency` fallback devise inconnue** : une devise absente de `DEVISE_SYMBOLS` (ex. `XYZ`) tombe dans le fallback TND **3 décimales** (`formatCurrency("100", "XYZ")` → `"100,000 DT"` ; avant `"100,00 DT"`). Le `decimals` est dérivé de la présence réelle de la devise, plus jamais de `devise === "TND"` seul.
  - **`formatCurrency` string non parsable** : le `catch` utilise les décimales de la devise (`"abc"`/EUR → `"0,00€"` ; avant `"0,000€"`). La branche null/vide garde `"0,000"` (spec du test `formatCurrency(null, "USD")` → `"$0,000"`).
  - **`parseTunisianNumber("1.500")` → `1500`** (avant `1.5`) : convention TN du JSDoc — un point suivi de **exactement 3 chiffres** = séparateur de milliers (`"12.345.678"` → 12345678 ; sinon dernier point décimal : `"30.00"` → 30, `"1.5"` → 1.5). Branche virgule inchangée (`"1,5"` → 1.5, `"1.500,5"` → 1500.5). **Impact** : saisie utilisateur/OCR des factures/devis/BL/avoirs/achats (`parseTunisianNumber` appelé ~100 fois dans `components/`) — les formats TN à virgule et les décimales 1-2/4+ chiffres sont strictement inchangés.
- **Tests** : `lib/__tests__/decimal.test.ts` étendu **54 → 69** (retenue 0 %/100 %, arrondi Big.js `0.1+0.2` → TVA exactement `0.057`, montants nuls HT/TVA/FODEC/retenue, `formatCurrency` EUR/USD ; les 54 d'origine intacts ; 4 `as any` préexistants supprimés) + **`lib/__tests__/calc-line-totals.test.ts` créé (17 tests)** : remise %, FODEC on/off, **`exonereTVA=true` → TVA=0 mais FODEC inchangé** (piloté par `line.fodec` seul — comportement réel du code, figé par un test documenté), taux 0/7/19 %, quantité/prix nuls, fallback `prixAchat`, invariant `ht + fodec + tva === ttc` (ligne + facture mixte).
- **Config** : `vitest.config.ts` — `".opencode"` ajouté aux `exclude` (3 Failed Suites zod parasites sous `.opencode/node_modules`). `npx vitest run` → **7 fichiers / 169 tests, 0 Failed Suite, 0 échec** ; `npx tsc --noEmit` → **0** ; `npm run lint` → **415 (42 errors, 373 warnings)** = baseline.
- **Dette documentée (décision Q2(a) de l'utilisateur, reportée au chantier 2026-10-07 Prompt K)** : les **soldes clients/fournisseurs et balances de paiement** restent **inline dans les routes Prisma** (`app/api/clients/[id]/solde`, `lib/invoice-payment.ts`, `app/api/payments/[id]`) → **extraction d'un helper pur requise** pour pouvoir les tester en unitaire (aucun test n'a pu être écrit dessus dans ce lot, périmètre volontairement limité aux modules purs).
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-08] Backend (p3-14-tests-financiers/P3-14)` ; avancement : `docs/wiki/audit-facturapro-suivi.md` (ligne `P3-14` + bilan **14 ✅ / 0 ⚠️ / 0 ❌**, chantier audit §6 clôturé).

## Notes

- **Statut des BL facturés** : reste `LIVRE` (jamais `FACTURE`) — la stat "Livrés" inclut donc les BL facturés, conforme au besoin métier. Aucune migration Prisma liée à cette évolution.
- Les totaux (`baseHT`, `totalTVA`, `totalFodec`, `totalTTC`) sont stockés en `Decimal`.
- Le calcul des totaux de ligne est centralisé dans `lib/calc-line-totals.ts` (fonction `calcLineTotals`). Les anciennes copies locales ont été supprimées de tous les composants.
- Chaque document est unique par `(numero, companyId)`.
- Le payload de création de devis utilise `tiersId` (et non `clientId`) pour lier le client au devis.
- La section Récapitulatif du formulaire de devis affiche : Base HT, Remise (conditionnelle, pourcentage moyen), Total HT, TVA, FODEC (conditionnelle), Timbre fiscal (1.000 DT fixe), et Total TTC incluant le timbre.
## Lot E2b — validation Zod des PATCH de statut (groupe financier, 2026-10-23)

- `PATCH /api/invoices/[id]` : `schema: invoiceStatusUpdateSchema` (`lib/schemas/document-updates.ts`, `.optional()` — le handler ne faisait que `if (status)`). Le 400 « Statut invalide » manuel (liste strictement identique à l'enum Zod) est retiré ; le contrôle de **transition** dépendant de l'état (`isValidInvoiceTransition`, 400 avec la liste des transitions autorisées) est **conservé** — il ne peut pas vivre dans le schéma.
- `PATCH /api/avoirs/[id]` : `schema: avoirStatusUpdateSchema` — `status` **requis** (le handler répondait déjà « Statut requis » en 400). Aucune autre modification du handler (mouvement financier + ledger inchangés).
- `PATCH /api/bons-livraison/[id]` : `schema: deliveryNoteStatusUpdateSchema` — `status` **requis**, jeu `BROUILLON|LIVRE|ANNULE` (l'enum Prisma `FACTURE` n'est jamais posé par un PATCH utilisateur, seulement par les routes de conversion). Les 400 « Statut requis »/« Statut invalide » sont retirés ; `handleSaleStockMovement` inchangé.
- Tous les handlers lisent `body` (typé `z.infer`) au lieu de `request.json()` ; les clés inconnues sont stripées par Zod (anti mass-assignment S-7).

## Lot H1 — création facture/BL partagée route ↔ action (2026-10-24)

- **`POST /api/invoices`** : le corps de création est extrait dans **`lib/invoice/create.ts`** (`createInvoice`), partagé avec la server action `validateBonCommande` (`app/actions/bons-commande.ts`) — plus de `fetch()` entre l'action et la route. Contrats identiques : validation Zod **dans le service** → **400** `errorResponse("Données invalides", issues)` (contrat historique de ce POST, vérifié sur l'index — ce route n'avait jamais `schema:` wrapper), 404 `Client introuvable`, 400 `{error:"Société introuvable"}`, **201** côté route ; l'action rejoue son message `Erreur création facture`.
- **`GET /api/invoices`** : **restauré verbatim** (listing avec stats `factures:voir`) — une réécriture de ce GET (auth manuelle sur `getBearerToken`/`verifyAuthToken` inexistants + pagination) avait été introduite pendant le lot puis détectée et corrigée ; aucun autre changement sur ce handler.
- **`POST /api/bons-livraison`** : corps extrait dans **`lib/bon-livraison/create.ts`** (`createBonLivraison`), partagé `route ↔ action` (validation BL de `validateBonCommande`) — mêmes contrats (400 `Données invalides`, 400 `Société introuvable`, 201 ; fallback action `Erreur création BL`).
- **Ordre des contrôles = ordre `apiRoute`** dans l'action : session → permission `factures:creer`/`bonsLivraison:creer` → résolution société → service ; le `PATCH /api/bons-commande/[id] {status:"ACCEPTE"}` post-génération reste **ignoré en cas d'échec** ; les lectures silencieuses client/devise et société (`clients:voir`/`parametres:voir`) gardent leur ordre et leur échec silencieux.
- **Route = wrapper fin sous `apiRoute`** (permissions inchangées `factures:voir`/`factures:creer`, `bonsLivraison:creer`/`bonsLivraison:voir`) via `withServiceErrors` + `readRequestBody` (`lib/service-route.ts`).
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Backend (lot-h1-server-actions/H)`.
