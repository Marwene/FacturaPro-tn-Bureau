# Module : Achats

## Fonctionnalités

- **Achats fournisseurs** : type BL ou FACTURE, référence fournisseur, date d'échéance, statuts (BROUILLON/VALIDEE/ANNULEE).
- **Catégorie d'achat** : `MATIERES_PREMIERES` / `TENUES_TRAVAIL` / `DIVERS` (null si non renseigné) ; libellés dans `ACHAT_CATEGORIE_LABELS` (`lib/stores/achats-store.ts`).
- **Rattachement BL ↔ Facture** : une facture (`type=FACTURE`) peut être liée à un BL (`blAchatId`), exposé via `blAchat` (détail) et `facturesLiees` ; le stock n'est pas re-débité par la facture liée.
- **Coûts par catégorie** : `GET /api/achats` retourne `parCategorie` (totalTTC par catégorie) affiché sur la liste des achats.
- **Lignes d'achat** : produit, quantité, prix d'achat, TVA, remise.
- **Totaux OCR éditables (zéro calcul)** : `POST /api/achats` accepte `totalHT`, `totalTVA` et `totalTTC` optionnels (montants extraits par l'OCR, éditables côté UI) ; s'ils sont fournis ils font foi (`finalHT`/`finalTVA`/`finalTTC`), sinon fallback sur le calcul depuis les lignes (saisie manuelle) ; `finalTTC = finalHT + finalTVA + timbreFiscal` (si `totalTTC` non fourni) alimente `baseHT`, `totalHT`, `totalTVA`, `totalTTC` et `resteAPayer` — `app/api/achats/route.ts`, `lib/schemas/achat.ts`. Le **Total TTC n'est plus calculé** dans l'écran de vérification du scan : il vient du store (`AchatFormState.totalTTC`, pré-rempli par `applyExtractedData` depuis `data.totalTTC`) et est éditable au même format monétaire que la carte « Données extraites » (ex : « 11 775,000 ») via le composant `MoneyInput` (`formatInputNumber` réutilise `parseTunisianNumber`).
- **Timbre fiscal (UI)** : champ éditable « Timbre fiscal » dans le récapitulatif de vérification du scan (`scan-verif-bottom.tsx`) et en saisie manuelle (`manual-entry-form.tsx`), stocké sous forme de chaîne dans le store (`timbreFiscal`, défaut `"0"`, setter `setTimbreFiscal`) ; pré-rempli depuis l'extraction (`applyExtractedData`) ; envoyé au backend dans les payloads `timbreFiscal: parseTunisianNumber(form.timbreFiscal) || 0` (scan + nouveau formulaire) ; ligne « Timbre fiscal » dans les données extraites et dans le récapitulatif du détail (sidebar). Il n'entre plus dans un calcul de TTC côté scan (le TTC vient de l'OCR).
- **Intégration stock** : création de mouvements de stock (entrée) lors de la validation.
- **Paiement** : montant payé / reste à payer, liaisons avec effets de commerce (`EffetAchat`).
- **Scan / extraction IA** : `POST /api/achats/extract` — type de document `BL` ou `FACTURE`, extraction par Mistral OCR (`mistral-ocr-latest`, JSON schema strict) puis fallbacks OpenAI gpt-4o / Gemini 2.0-flash / Mistral pixtral ; matching automatique des produits (codeBarre, code, nom) avec `productId` par ligne ; extraction du **timbre fiscal** (`timbreFiscal` : nombre ou null, montant du timbre s'il figure sur la facture) ; la réponse utilise la clé `fournisseur` (et non `tiers`) — consommée par le formulaire de scan qui pré-sélectionne les lignes via `productId`.
- **Création automatique fournisseur/produits** : `POST /api/achats` accepte `createFournisseur` (défaut false) + objet `fournisseur` (`raisonSociale`, `matriculeFiscal?`, `adresse?`, `ville?`, `telephone?`, `email?`) → si `tiersId` vide et raison sociale fournie, le fournisseur est trouvé (matricule fiscal / raison sociale insensible à la casse) ou créé ; par ligne `createProduct` (défaut false) → si `productId` null + `createProduct` + description, le produit est créé (code `P-`, nom = description, prix/TVA de la ligne). Côté UI : bannière ambre dans le formulaire de scan « Fournisseur introuvable — il sera créé automatiquement » avec checkbox « Créer le fournisseur automatiquement » (`createFournisseur` du store) ; checkbox « Créer le produit » par ligne sans produit dans `ScanVerifLinesTable`. Payload front : champ `tiersId` (et non `fournisseurId`) dans `scan-verification-form.tsx` et `buildPayload` de `nouvel-achat-actions.tsx`.

## Modèles de données (Prisma)

- `Achat`, `AchatLine`, `StockMovement` (lié), `EffetAchat` (liaison), `Sequence`.

## Fichiers clés

- `app/api/achats/` — CRUD achats
- `app/api/achats/extract/route.ts` — pipeline d'extraction OCR/vision (Mistral OCR + fallbacks)
- `app/(app)/achats/` — page UI
- `components/achats/` — écrans scan (upload, extraction, vérification) et formulaire
- `lib/stores/achats-store.ts` — état du formulaire et du scan (`ExtractedData`, `productId` par ligne, `categorieAchat`, `blAchatId`, `timbreFiscal`, `totalTTC`, `ACHAT_CATEGORIE_LABELS`, `createFournisseur`, `createProduct` par ligne)
- `hooks/use-achats-queries.ts` — hooks TanStack Query (`useAchats`, `useAchatBls`, `useUpdateAchatMeta`, …)
- `lib/sequence.ts` — numérotation (`nextNumber`)

## Migration `apiRoute` — P1-5 Groupe 6 : extraction achats (2026-09-28)

`app/api/achats/extract/route.ts` (POST) passe par le wrapper `lib/api-route.ts`. Le handler réimplémentait `getSessionFromRequest` + 401 (ex-L326-328) puis `checkPermission(..., "achats:creer")` (ex-L330-331) : ces 3 responsabilités sont désormais centralisées par le wrapper. **Aucune permission ajoutée ni retirée.**

| Fichier | Handler | Config wrapper | Statuts / corps conservés |
| --- | --- | --- | --- |
| `app/api/achats/extract/route.ts` | POST | `{ permission: "achats:creer" }` (littéral ex-L330) | **400** « Fichier requis » · **400** « Fichier trop volumineux (max 20 Mo) » · **400** « Aucune clé API configurée. Configurez OpenAI, Gemini ou Mistral dans Paramètres > Général > IA. » · **500** « Tous les fournisseurs IA ont échoué. Dernière erreur : … » (suffixe PDF conservé) ; **200** `{ extracted }` |

- **`requireCompany` NON activé (décision assumée)** : `const companyId = await getCompanyId(request, session);` (ex-L420) est **conservé dans le handler**. Dans ce fichier `companyId` n'est utilisé que comme **booléen de garde** (`companyId ? findMany : []`), et `getCompanyId` (`lib/session.ts` L45-51) n'est autre que `resolveCompanyId` **avec fallback `null`** au lieu d'erreur → activer `requireCompany: true` transformerait un « pas de société → `products = []` → matching vide » en **403**, soit un **changement de comportement**. Aucun `companyId` de contexte n'est lu ailleurs.
- **`sessionUser` → `session`** (contexte fourni par le wrapper) ; `params` inexistant sur cette route ; imports morts purgés (`getSessionFromRequest`, `checkPermission`, `NextRequest`).
- **`catch` INTERNES conservés impérativement** : la boucle providers (ex-L390-400, `try { … } catch (err) { lastError = …; continue; }`) est de la **logique métier** (fallback Mistral OCR → OpenAI → Gemini → Mistral) et n'a pas été touchée ; seuls le `try/catch` externe du handler et son `console.error("[achats/extract/POST]")` ont été supprimés (couverts par le wrapper).
- **Nuance du `catch` du wrapper (signalée, non « corrigée »)** : le wrapper renvoie `errorResponse(error.message)` (**message réel**) et taggue `[${permission ?? "api"}]`, soit `[achats]` ici, au lieu du tag fichier `[achats/extract/POST]`. L'ancien catch externe retournait `error.message` **ou**, si l'erreur n'était pas une instance `Error`, le fallback **« Erreur extraction »** ; le wrapper affichera **« Erreur serveur »** dans ce cas. Le statut reste **500** dans les deux cas — nuance signalée, volontairement non corrigée (relèverait d'un patch de `lib/api-route.ts`, hors périmètre).
- **Méthode strictement identique** : **POST**. **Consommateur inchangé** : `app/actions/achats.ts` (`extractAchatFromScan`, `fetch(baseUrl + "/api/achats/extract", { headers: { Cookie: cookieStore.toString() } })`, L15) — la session portée par le cookie y est trouvée par le wrapper ; il lit `err.error` (corps `errorResponse`) sur les 4xx/5xx. Aucun `.tsx`, hook ni store modifié.

## P2-7 Lot 2 — debounces recherche (2026-09-28)

- `hooks/use-achats.ts` : effet debounce 300 ms `searchInput → setSearchQuery` (ex-L31) **supprimé** — `useAchatsSearchDebounce()` (ex-L26-38) vidé (**0 appelant** → candidat à suppression), `useAchatsList` (ex-L41, `@deprecated`, 0 appelant) migre sur `searchInput` + `useDeferredValue(searchInput)` dans le `queryKey` **et** la `queryFn` (pattern Lot 1 `hooks/use-effets.ts`) ; import `useEffect`/`useRef` purgé.
- `hooks/use-achats-search.ts` : effet ex-L10 supprimé ; `useAchatsSearch()` (0 import hors fichier → **candidat à suppression**) ne retourne plus que `{ searchInput, setSearchInput }`.
- `hooks/use-achats-queries.ts` **non touché** (hors périmètre de ce lot) : `useAchatsList` y lit toujours `achats-store.searchQuery`, dont la valeur est `""` **avant comme après** (ses 2 seuls auteurs étaient des hooks **jamais montés**) → recherche serveur achats **dormante inchangée**, filtre client DataTable (`searchValue={searchInput}` / `globalFilter`) **inchangé**.

## P2-7 Lot 7 — scan-upload (2026-09-28)

- `components/achats/scan-upload-screen.tsx` ex-L24 : effet `form.setType(type)` **supprimé** → `useQuery` de continuation `["achats-scan-type-init", type]` (`staleTime: 0` = re-init à chaque montage comme l'effet, `retry: false` ≡ l'ex-`.catch` silencieux, toujours `enabled`) ; la `queryFn` écrit via `useAchatFormStore.getState()` avec garde d'idempotence, **hors cycle de rendu** (écrire le store pendant le render déclencherait le warning React 19 *« Cannot update a component while rendering… »* / react#31730 — l'écran de vérification/erreur reste abonné au premier render du switch). Import `useEffect` purgé → `grep -n "useEffect("` sur le fichier → **vide**. `resetForm` (`type: "FACTURE"`) intact. Détail complet : entrée CHANGELOG `[2026-09-28] Frontend (p2-7-lot7-divers/P2-7)`.

## P2-13 — wrapper de toast `lib/toast.ts` (2026-10-08)

- `components/achats/nouvel-achat-actions.tsx` + `components/achats/scan-verification-form.tsx` : import `toast` → **`@/lib/toast`** (**1 ligne** par fichier). Les **4 titres vides** `toast.error("", { description: … })` (« Veuillez sélectionner un fournisseur », « Ajoutez au moins une ligne d'achat » ×2 sites) **restent vides** — le wrapper transmet `title`/`options` tels quels ; variantes et messages strictement identiques, **0 ligne de JSX touchée**.
- `hooks/use-achats.ts` (import dynamique `import("sonner")`) **non touché** en P2-13 (hors
  périmètre du lot) — **migré vers `notify` en lot F.3b** (2026-10-18, voir
  `docs/wiki/notifications.md` §8), comme les 3 autres fichiers du module
  (`achat-detail-client`, `achat-detail-sidebar`, `achats-client`) et
  `components/achats/scan-upload-screen.tsx` (4ᵉ import dynamique).
- Détail complet et vérifications : entrée CHANGELOG `[2026-10-08] Frontend (p2-13-toast-wrapper/P2-13)`.

## Notes

- Unique par `(numero, companyId)`.
- Un achat peut être alloué sur plusieurs effets de commerce via `EffetAchat`.
- Migration `achat_bl_relation_categorie` (15/08/2026) : enum `AchatCategorie` + self-relation "AchatBL". Les achats existants gardent `categorieAchat = null` et `blAchatId = null`.
- Migration `achat_timbre_fiscal` (15/08/2026) : champ `timbreFiscal Decimal @default(0) @db.Decimal(19,4)` sur `Achat`, ajouté au TTC (`totalTTC = totalHT + totalTVA + timbreFiscal`) et à l'extraction OCR/vision. Les achats existants gardent `timbreFiscal = 0`.
## Lot E2b — validation Zod du PATCH achat (groupe financier, 2026-10-23)

- `PATCH /api/achats/[id]` : `schema: achatUpdateSchema` — **dérivé** de `achatSchema` (`.pick({ blAchatId, categorieAchat })`, définitions uniques partagées avec la création) `.extend({ status optionnel })`. Les 400 manuels « Statut invalide » / « Catégorie d'achat invalide » (listes strictement identiques aux enums Zod) sont retirés ; la logique d'entrée/sortie de stock (`handleSaleStockMovement`-like inline, `recalcAchatStockStatus`) est inchangée.

## Lot H1 — server action sans tour HTTP (2026-10-24)

- **`app/actions/achats.ts` : le `fetch()` unique supprimé** (`grep -rn "fetch(" app/actions/` → vide). `extractAchatFromScan` appelle **directement** `lib/achats/extract.ts`, service partagé avec la route `POST /api/achats/extract` (une seule implémentation, jamais dupliquée).
- **Contrats strictement identiques** : ordre des contrôles = ordre `apiRoute` (session → permission `achats:creer` → service ; `companyId` = garde booléen `session.user.companyId || null`, jamais 403 — identique à l'ancien `getCompanyId` de route) ; les erreurs du service (`ServiceError` : 400 `Fichier requis` / `Fichier trop volumineux (max 20 Mo)` / `Aucune clé API…`, 500 `Tous les fournisseurs IA ont échoué…`) sont rejouées par `throwRouteError` avec le fallback historique **`Erreur d'extraction`**, et `perm.error` prime sur le fallback (ancien `err.error ?? fallback`).
- **`jsonPayload()` (round-trip JSON)** reproduit l'ancien `res.json()` : clés `undefined` supprimées, payload `{ extracted }` **byte-identique** pour `hooks/use-achats.ts` / le store.
- **Typage** : `ExtractedData` exporté depuis `lib/stores/achats-store.ts` (le type du retour extract, cast JSON documenté, **0 `any`**).
- La route `POST /api/achats/extract` est désormais un wrapper fin sous `apiRoute` (`achats:creer`) déléguant au même service.
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Backend (lot-h1-server-actions/H)`.

## Lot H vague W4 — init `type` de l'écran de scan vers `hooks/use-achats-queries.ts` (2026-10-24)

- `components/achats/scan-upload-screen.tsx` : le `useQuery` inline d'init du store `type` depuis l'URL est déplacé dans **`useAchatScanTypeInit(type)`** — clé `queryKeys.achats.scanTypeInit(type)` = `["achats-scan-type-init", type]`, `staleTime: 0` (re-init à chaque montage), `retry: false`, garde d'idempotence `if (store.type !== type)` conservée, écriture via `getState()` hors cycle de rendu.
- Aucun changement visuel, aucun contrat API touché (l'écran ne fait aucun autre appel inline).
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
