# Module : Bons de Commande

## Fonctionnalités

- **Bons de commande clients** : création via scan IA (PDF/photo) ou saisie manuelle, statuts (BROUILLON/ACCEPTE/ANNULE).
- **Scan IA** : extraction des données client, lignes et totaux depuis un PDF ou une photo du bon de commande client.
- **Saisie manuelle** : formulaire complet avec sélection client (Combobox), dates, référence, lignes éditables (produit via ProductSelect partagé, description, quantité, prix, remise, TVA%, FODEC, source Stock/Production).
- **Lignes de BC** : produit, description, quantité, prix HT, remise, TVA, FODEC, type source (STOCK/PRODUCTION).
- **Totaux** : calculs HT, TVA, FODEC, timbre fiscal (fixé à 1.000 DT), TTC avec mise à jour en temps réel.
- **Création automatique client** : si le client n'existe pas, option de création automatique.
- **Validation** : vérification du rapprochement quantités avant création de BL ou Facture.
- **Rapprochement** : gestion des écarts de quantité entre BC et détail (taille/couleur/broderie/DTF). Affiché uniquement si le BC contient des lignes de production. En mode mixte (stock + production), seules les lignes production sont affichées dans la carte.

## Modèles de données (Prisma)

- `BonCommande`, `BonCommandeLine`, `BonCommandeDetail` (rapprochement), `Sequence`.

## Fichiers clés

- `app/api/bons-commande/` — CRUD bons de commande
- `app/api/bons-commande/extract/route.ts` — pipeline d'extraction IA
- `app/api/bons-commande/[id]/detail/` — rapprochement quantités
- `app/(app)/bons-commande/` — page UI (listing)
- `app/(app)/bons-commande/new/page.tsx` — page création
- `app/(app)/bons-commande/[id]/page.tsx` — page détail
- `components/bons-commande/` — écrans scan (upload, extraction, vérification) et formulaire
- `lib/stores/bons-commande-store.ts` — état du formulaire et du scan (`ScanBCState`, `BCFormState`, `BCDetailState`)
- `hooks/use-bc.ts` — hooks TanStack Query (`useBCList`, `useBCDetail`, `useBCMutations`, `useBonCommandeScan`, `useBCValidation`)
- `hooks/use-bc-rapprochement.ts` — hooks rapprochement (`useBCRapprochement`, `useBCRapprochementMutations`)
- `lib/schemas/bon-commande.ts` — schemas Zod partagés (`bonCommandeSchema`, `saveDetailSchema`, `updateDetailRowSchema`, `updateBCLineSchema`, `ordreFabricationSchema`) et types inférés (`BonCommandeInput`, `SaveDetailInput`, `UpdateDetailRowInput`, `UpdateBCLineInput`, `OrdreFabricationInput`)
- `app/actions/bons-commande.ts` — server actions (extraction, création, validation)
- `lib/sequence.ts` — numérotation (`nextNumber`)

## Architecture du formulaire

### Store Zustand
Le store `bons-commande-store.ts` contient 3 stores :
1. **`useBonsCommandeStore`** : filtres de recherche (searchInput, searchQuery, statusFilter)
2. **`useScanBCStore`** : état du scan (step, extracted, form fields, totaux éditables)
3. **`useBCFormStore`** : formulaire de création (tiersId, dates, lignes, totaux, timbreFiscal)

### Layout du formulaire
Le formulaire de création utilise un layout `grid-cols-2` avec :
- **Card "Informations BC"** : N° auto-généré (disabled), date création, date expiration, référence client
- **Card "Client"** : Combobox avec recherche, détails MF/ville, option création auto
- **Card "Lignes"** : tableau éditable avec colonnes (produit, description, qté, prix, remise, TVA%, FODEC, source)
- **Card "Notes"** : textarea pour notes/conditions
- **Card "Récapitulatif"** : Base HT, remise, Total HT, TVA, FODEC, timbre fiscal, Total TTC

### Saisie manuelle
Le mode saisie manuelle (`scan-bc-manual-entry.tsx`) permet :
- Sélection client (Combobox)
- Dates (création, expiration)
- Référence client
- Lignes éditables avec :
  - Sélecteur produit (ProductSelect partagé, champ vente)
  - Description
  - Quantité
  - Prix HT
  - Remise %
  - TVA %
  - FODEC (checkbox)
  - Source (Stock/Production)
- Timbre fiscal
- Total TTC calculé

## Migration `apiRoute` — P1-5 Groupe 6 : extractions BC (2026-09-28)

Les **2 routes d'extraction** de `app/api/bons-commande/**` passent par le wrapper `lib/api-route.ts` (les autres routes du dossier l'étaient déjà). **Aucune permission ajoutée ni retirée** (littéraux repris des lignes `checkPermission(...)` d'origine).

| Fichier | Handler | Config wrapper | Statuts / corps conservés |
| --- | --- | --- | --- |
| `app/api/bons-commande/extract/route.ts` | POST | `{ permission: "bonsDeCommande:creer" }` (littéral ex-L270) | **400** « Fichier requis » · **400** « Fichier trop volumineux (max 20 Mo) » · **400** « Aucune clé API configurée. Configurez OpenAI, Gemini ou Mistral dans Paramètres > Général > IA. » · **500** « Tous les fournisseurs IA ont échoué. Dernière erreur : … » (suffixe PDF conservé) ; **200** `{ extracted }` |
| `app/api/bons-commande/[id]/detail/extract/route.ts` | POST | `{ permission: "bonsDeCommande:modifier", requireCompany: true }` (littéral ex-L105) | **404** « Bon de commande introuvable » · **400** « Fichier requis » · **400** « Fichier trop volumineux (max 20 Mo) » · **400** « Clé Mistral non configurée. Configurez-la dans Paramètres > Général > IA (seul Mistral OCR gère les PDF). » ; **200** `{ extracted: { lines, lignesDisponibles, nonRapprochees } }` |

> ⚠️ **Encadré — `requireCompany: true` activé sur `[id]/detail/extract` UNIQUEMENT** : ce handler faisait **déjà** une résolution manuelle `resolveCompanyId(request, sessionUser)` avec gestion 401/403 (ex-L108-112) → le wrapper fait exactement la même chose (`resolveCompanyId` appelée par `createHandler`), le bloc manuel a donc été **supprimé** et `companyId` provient du contexte. **Écart de corps à connaître** : l'ancien bloc renvoyait `errorResponse(companyResult.error)` (donc `{ error, success: false }`), le wrapper renvoie **`{ error }` seul** (sans `success: false`) sur ces 401/403 — seul `success:false` disparaît, le statut (401/403) et le message sont identiques. Côté client, `app/actions/bons-commande.ts:61` lit `err.details || err.error` → **le corps est lu correctement**, aucun consommateur à toucher. **Sur `extract`, `requireCompany` est NON activé** : même raison que `app/api/achats/extract` (`companyId` = booléen de garde sur `getCompanyId` fallback `null` → un `requireCompany: true` transformerait « produits vides » en 403), `const companyId = await getCompanyId(request, session);` (ex-L357) est conservé dans le handler.

- **`catch` INTERNES conservés impérativement** : la boucle providers de `extract` (ex-L329-339, fallback Mistral OCR → OpenAI → Gemini → Mistral) est de la **logique métier** ; `detail/extract` n'a **aucun catch interne** (un seul appel `extractWithMistralOCR`, ex-L157). Seuls les `try/catch` **externes** des 2 handlers ont été supprimés (couverts par le wrapper).
- **Nuance du `catch` du wrapper (signalée, non « corrigée »)** : `errorResponse(error.message)` (message réel) + tag `[${permission ?? "api"}]` → **`[bonsDeCommande:creer]`** et **`[bonsDeCommande:modifier]`**, au lieu des tags fichier `[bons-commande/extract/POST]` / `[bons-commande/detail/extract/POST]`. L'ancien fallback d'erreur non-`Error` était **« Erreur extraction »** → le wrapper affichera **« Erreur serveur »** (statut 500 inchangé).
- **`params` résolu par le wrapper** : `const { id: bonCommandeId } = params;` **sans `await`** (l'origine faisait `await params`). **Méthodes strictement identiques** : POST ×2.
- **Consommateurs inchangés** : `app/actions/bons-commande.ts` — `extractBonCommandeFromScan` (POST `bons-commande/extract`, L16) et `extractBonCommandeDetailFromScan` (POST `[id]/detail/extract`, L59), tous deux avec `Cookie: cookieStore.toString()` → la session est trouvée par le wrapper ; `err.details || err.error` lu sur les 4xx/5xx. Aucun `.tsx`, hook ni store modifié.

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-bc.ts` : effet debounce 300 ms `searchInput → setSearchQuery` (ex-L31) **supprimé** ; `useBCSearchDebounce()` vidé (appelé par `components/bons-commande/bons-commande-client.tsx` → **candidat à suppression**, retrait de l'appel à valider) ; `useBCList` lit `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1 `hooks/use-effets.ts`).
- Flux inchangé : recherche serveur conservée (mécanisme différé uniquement), filtre client DataTable (`searchValue={searchInput}` / `globalFilter`) **intact**, `bons-commande-store.searchQuery` plus lu (store non modifié).

## P2-12 — suppression BC sur `ConfirmDeleteDialog` (2026-10-02)

- La confirmation de suppression du menu d'actions de `components/bons-commande/bons-commande-client.tsx` (`BCRowActions`) est migrée du `AlertDialog` artisanal vers **`components/confirm-delete-dialog.tsx`** (audit `AUDIT-FACTURAPRO.md` §6, lot `P2-12`).
- **Parité** : `title={`Supprimer le bon de commande ${bc.numero} ?`}` (interpolation conservée), description identique (l'ancien texte coupé en 2 lignes JSX = 1 espace au rendu), `onConfirm={handleDelete}` inchangé, `onOpenChange={setConfirmOpen}` inchangé, `isLoading={deleteBC.isPending}` remplace les 2 `disabled={deleteBC.isPending}` des boutons Annuler/Confirmer.
- **Effet assumé** : pendant le pending, le bouton affiche désormais `Suppression...` (défaut de la brique) au lieu de `Supprimer` désactivé — alignement sur les 5 autres sites migrés.
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-02] Frontend (p2-12-confirm-delete/P2-12)`.

## Notifications — migration socle `notify` (lot F.3a, 2026-10-18)

Les 8 fichiers `components/bons-commande/` important `sonner` ont été migrés vers
`notify.*` (`lib/notify.ts`) avec messages enrichis (header verbe+objet, corps actionnable,
erreurs via `notify.error({ title, error: unknown, context })`) : suppressions/annulations
nomment le numéro du BC, gardes de saisie (client non renseigné, quantité invalide, article
manquant) passent en `notify.warning`, extraction OCR du détail gère un `retry` (re-upload
lecture seule) — **aucun `retry` sur les créations** (risque de doublon), **aucun undo inventé**,
navigations `router.push` existantes inchangées. Conventions détaillées :
`docs/wiki/notifications.md` §7 ; entrée CHANGELOG `[2026-10-18] Frontend (lot-f3a-sonner-migration/F)`.

## Notes

- Le BC est unique par `(numero, companyId)`.
- La validation avant BL/Facture vérifie le rapprochement des quantités pour les lignes de type PRODUCTION.
- Les lignes de type STOCK ne bloquent jamais la validation.
- Le store utilise `parseTunisianNumber` pour supporter les formats numériques tunisiens (espaces insécables, virgules).

## Lot E2b — validation Zod du PATCH BC (groupe financier, 2026-10-23)

- `PATCH /api/bons-commande/[id]` : `schema: bonCommandeUpdateSchema` — `notes` **dérivé** de `bonCommandeSchema` (`.pick`, définition unique avec la création), `status` optionnel (`BROUILLON|ACCEPTE|ANNULE`), `lines` réutilise `bonCommandeLineSchema`. Le garde-fou « lignes avec détail importé » (409) et le recalcul des totaux sont inchangés.
- Deux appelants réels : `hooks/use-bc.ts` (`updateStatus`) et la server action `app/actions/bons-commande.ts` (`{ status: "ACCEPTE" }` ×2) — payloads validés champ par champ.

## Lot H1 — server actions sans tour HTTP (2026-10-24)

- **`app/actions/bons-commande.ts` : 12 `fetch()` supprimés**, zéro appel HTTP restant (`grep -rn "fetch(" app/actions/` → vide). Les 5 exports (`extractBonCommandeFromScan`, `createBonCommandeFromExtraction`, `extractBonCommandeDetailFromScan`, `saveBonCommandeDetail`, `validateBonCommande`) appellent **directement les services partagés avec les routes API** (option (b) — une seule implémentation, jamais dupliquée) :
  - `lib/bon-commande/create.ts` ← `POST /api/bons-commande` ;
  - `lib/bon-commande/update.ts` (`getBonCommande`, `updateBonCommande`) ← `GET/PATCH /api/bons-commande/[id]` ;
  - `lib/bon-commande/detail.ts` (`saveBonCommandeDetailRows`) ← `POST [id]/detail` ;
  - `lib/bon-commande/detail-extract.ts` ← `POST [id]/detail/extract` ;
  - `lib/bon-commande/extract.ts` ← `POST extract` ;
  - `lib/bon-livraison/create.ts` ← `POST /api/bons-livraison` (validation du BL) ;
  - `lib/invoice/create.ts` ← `POST /api/invoices` (validation de la facture).
- **Contrats strictement identiques** (succès *et* erreurs) : les services lèvent `ServiceError(status, body)` reproduisant l'ancien `NextResponse.json(errorResponse(...), { status })` (400 `Données invalides`, 404 `Introuvable`/`Bon de commande introuvable`/`Client introuvable`, 403 `Client requis`, `{error:"Société introuvable"}`) ; l'action rejoue le contrat historique `err.error ?? fallback` (ou `err.details || err.error || fallback` pour l'OCR) avec les messages `Erreur extraction`, `Erreur création bon de commande`, `Erreur extraction du détail`, `Erreur enregistrement du détail`, `Erreur création BL`, `Erreur création facture`, `Non authentifié`, `Impossible de charger le bon de commande` — et `jsonPayload()` (round-trip JSON) reproduit l'ancien `res.json()` (clés `undefined` supprimées, Decimals en string).
- **Ordre des contrôles = ordre `apiRoute`** : session → permission → résolution société (`resolveCompanyIdForUser`, miroir du `requireCompany` 403) → service ; dans `validateBonCommande`, `PATCH {status:"ACCEPTE"}` post-génération **reste ignoré en cas d'échec** et les lectures silencieuses clients/companies (`clients:voir`/`parametres:voir`) gardent leur ordre.
- **`getBonCommandeRapprochement` supprimée** : 0 consommateur dans le dépôt (`hooks/use-bc-rapprochement.ts` fait lui-même le GET en `fetch`).
- **Routes API devenues des wrappers fins** sous `apiRoute` (mêmes permissions) ; validation Zod déplacée **dans les services** (contrat 400 historique) — seul `PATCH [id]` garde `schema: bonCommandeUpdateSchema` (422 d'E2b conservé).
- **Typage** : `ExtractedData` exporté depuis `lib/stores/bons-commande-store.ts` (type des retours extract, cast JSON documenté, **0 `any`**).
- Détail complet, preuves et compteur `schema:` : entrée CHANGELOG `[2026-10-24] Backend (lot-h1-server-actions/H)`.
