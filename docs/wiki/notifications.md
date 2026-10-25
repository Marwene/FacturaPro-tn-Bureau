# Notifications & erreurs — socle (lot F.1)

Fiche du **socle UX notifications / gestion d'erreurs** établie par le lot **F.1** du Prompt F
(audit 2026-10), le 2026-10-18. Les lots **F.2** (états vide/chargement/erreur), **F.3a/F.3b**
(migration des 63 fichiers `sonner` restants) sont **livrés** — seul **F.4**
(`alert()/confirm()` + `catch` vides) reste à venir, voir §6.

## 1. Principe

Toute notification toast de l'application passe par **`lib/notify.ts`** — le **seul** fichier
autorisé à importer `sonner` (règle ESLint `no-restricted-imports`, cf. §5). Le JSX de rendu
vit dans **`components/shared/app-toast.tsx`** (header = verbe + objet, corps = phrase
actionnable, footer = référence technique discrète + « Copier les détails »).
`lib/toast.ts` (ancien wrapper P2-13) a été **supprimé** après migration de ses
10 consommateurs.

Le `<Toaster>` rendu par l'app (**`components/ui/sonner.tsx`**) est inchangé.

## 2. API publique (`lib/notify.ts`)

```ts
notify.success({ title, description?, footer?, action? })   // durée 4 s ; 5 s si action (undo)
notify.warning({ title, description?, footer?, action? })   // durée 8 s
notify.error({ title, error: unknown, context?, retry?, details? })  // persistant (défaut error sonner)
notify.promise(promise, { loading, success, error, context? })       // renvoie la promise d'origine
```

- `title` ** obligatoire** : verbe + objet (« Facture F-2026-0042 enregistrée ») — jamais « Erreur »
  seul, jamais titre vide.
- `error: unknown` est **narrowé** (`instanceof ApiError` → `instanceof Error` → chaîne → inconnu) ;
  le message serveur brut n'est jamais repris tel quel, sauf pour les 400/422 où il détaille le
  champ fautif (appendé à un message générique de validation).
- **Undo** : une suppression passe `action: { label: "Annuler", onClick: restaure }` — le toast vit
  alors 5 s et se ferme après le clic.
- **Réessayer** : le bouton n'apparaît que si `retry` est fourni **et** que l'erreur est réseau ou 5xx.

### Mapping `describeApiError(error): ErrorFacts` (exporté, testé — `lib/__tests__/notify.test.ts`)

| Cas | Message métier | retryable |
|---|---|---|
| réseau (`TypeError: fetch failed`, `navigator.onLine === false`) | Connexion impossible… | oui |
| 401 (+ codes `invalid_credentials` / `deactivated` / `unverified` / `rate_limited`) | Session expirée / message spécifique du code | non |
| 403 | Droits nécessaires refusés | non |
| 404 | Ressource introuvable… | non |
| 409 | Conflit — actualisez… | non |
| 400 / 422 | Champs invalides + message serveur de validation | non |
| 429 | Trop de requêtes — patientez | non |
| 5xx | Problème serveur — réessayez | **oui** |
| Error/chaîne non vide | message repris | non |
| inconnu / vide | message générique | non |

`ErrorFacts` = `{ message, status?, code?, requestId?, network, retryable }`.
`formatErrorDetails(...)` produit le bloc copiable : titre, contexte, statut·code, requestId,
message, horodatage (+ détails additionnels).

## 3. `lib/api-error.ts` (extension rétro-compatible)

- `ApiError` porte désormais `requestId?: string` et `code?: string` (code métier structuré),
  lus dans le body JSON par `readApiErrorMeta(body)` (jamais d'erreur si absent/mal typé).
- `handleApiResponse` et `readApiErrorMessage` : **contrats inchangés** (≈110 routes + consommateurs).

## 4. `lib/api-client.ts`

`apiFetch<T>(url, { method?, body?, headers?, signal?, context? })` — client HTTP unique adossé à
`handleApiResponse` (JSON serialisé automatiquement, `FormData` transmis tel quel).
**Dette datée (2026-10-18, lot F.3)** : 0 consommateur à la livraison du lot F.1 — la migration
des `fetch()` dispersés est planifiée en F.3 (règle projet « dès la 2ᵉ occurrence, on extrait »
appliquée ici sur mandate du Prompt F).

## 5. Règle ESLint

`eslint.config.mjs` : `no-restricted-imports` **en `error`** (bascule faite le 2026-10-18 à la
clôture du lot F.3b) interdisant `sonner` hors de `lib/notify.ts` et
`components/ui/sonner.tsx` (exemptés via `ignores`). Toute réintroduction d'un import
`sonner` fait échouer le lint.

## 6. Périmètre et suites

- **Lot F.1 (fait)** : socle `notify` + `app-toast` + extension `ApiError` + `apiFetch` +
  migration des **10 consommateurs de l'ex-`lib/toast.ts`** + suppression de `lib/toast.ts`
  + règle ESLint.
- **Lot F.2 (fait)** : états de chargement / erreur / vide + pages d'erreur Next.js —
  4 briques dans `components/shared/` (`ErrorState` composant `ui/empty.tsx`, `ListSkeleton`,
  `DetailSkeleton`, `ChartErrorBoundary`), `app/not-found.tsx`, `app/global-error.tsx`,
  `loading.tsx` + `error.tsx` des 9 modules + 6 `loading.tsx` de segments `[id]`,
  boundary sur 3 graphiques. API et consommateurs : `docs/wiki/ui-kit.md` §H.15.
- **Lot F.3 (fait, 2 vagues)** : migration des **61 fichiers** restants important directement `sonner`
  (63 fichiers constatés au départ − `lib/toast.ts` supprimé − `lib/notify.ts` et
  `components/ui/sonner.tsx` exemptés), puis ESLint passé en `error`.
  - **Vague 1 / lot F.3a (fait, 2026-10-18)** : **28 fichiers** migrés — détails §7.
  - **Vague 2 / lot F.3b (fait, 2026-10-18)** : **33 fichiers** à import statique + **5 sites**
    d'import dynamique `import("sonner")`** (3 fichiers) migrés, ESLint basculé en `error` —
    détails §8.
- **Lot F.4 (à venir)** : remplacement des `alert()/confirm()` (6 sites constatés) et des
  `catch` vides.

Fichiers clés : `lib/notify.ts`, `components/shared/app-toast.tsx`, `lib/api-error.ts`,
`lib/api-client.ts`, `lib/__tests__/notify.test.ts`, `eslint.config.mjs`,
`components/ui/sonner.tsx` (inchangé, exempté).

## 7. Migration des appels — vague 1 (lot F.3a, 2026-10-18)

**28 fichiers migrés** de `toast(...)`/`toast.success/error` vers `notify.*` avec enrichissement
des messages (exigence centrale : un simple renommage = rejet) :

- `hooks/` (8) : `use-companies`, `use-company-logo-upload`, `use-effets`, `use-notifications`,
  `use-pending-bl`, `use-product-fiche-technique`, `use-product-photo-upload`, `use-upload`.
- `components/bons-commande/` (8) : `bon-commande-detail-client`, `bons-commande-client`,
  `import-detail-dialog`, `production-card`, `rapprochement-card`, `scan-bc-verification-form`,
  `scan-bon-commande-client`, `validation-dialog`.
- `components/produits/` (6) : `category-tree-select`, `marque-select`, `nouveau-produit-dialog`,
  `produit-edit-dialog`, `produit-form-page`, `produits-client`.
- `components/parametres/` (6) : `carton-types-manager`, `facturation-settings-client`,
  `general-settings-client`, `ngp-settings-client`, `parametres-client`, `profil-settings-client`.

Conventions appliquées (valeur de référence pour la vague 2) :

- **Header = verbe + objet** avec l'identifiant du document quand il existe
  (« Bon de commande BC-2026-0042 créé », « Code NGP « X » supprimé ») ; jamais de titre
  générique (« Erreur », « Succès », « Error ») ni de titre vide.
- **Corps = phrase actionnable** (conséquence ou prochaine étape) ; corps omis sur les succès
  routiniers (clarify.md : « routine success should be brief »).
- **Toute erreur de mutation passe `error: unknown` à `notify.error({ title, error, context })`**
  — tous les `err.message` / `e.message` / ternaires `instanceof Error` du périmètre ont disparu
  (grep preuve : vide). `context` localise l'opération (ex. « lors de la création du bon de
  commande depuis le scan »).
- **`notify.warning` pour les gardes de validation locales** (quantité invalide, client non
  renseigné, article manquant, fournisseur déjà associé, prix de vente = prix d'achat, nom/
  capacité de carton) : feedback de saisie ≠ erreur système — 8 s ambre au lieu d'un toast
  d'erreur persistant.
- **`retry` ajouté uniquement si relance idempotente réelle en portée** : extraction OCR du
  détail (`import-detail-dialog` — re-upload du même `File`, lecture seule) ; re-`mutate` du
  même payload dans le callback `onError` pour les **modifications** de settings
  (`parametres-client`), types de carton (`carton-types-manager`) et codes NGP
  (`ngp-settings-client`). **`retry` NON ajouté sur les créations** (produit, bon de commande
  scan/manuel, BL, facture, effets, catégorie, marque, code NGP, type de carton) : rejeu après
  échec réseau/5xx ambigu = risque de doublon serveur. **Pas d'action « Annuler » (undo)**
  inventée : aucune route de rétablissement n'existe dans le périmètre (suppressions = DELETE
  définitif).
- **Aucune navigation dupliquée** : là où un `router.push` suivait déjà le succès (détail BC,
  détail produit, liste entreprises/factures), il est conservé tel quel et **aucune `action`
  « Voir le document »** n'est ajoutée au toast.
- **Durées** : aucune option `duration` explicite n'existait dans le périmètre → **aucune durée
  perdue** ; le socle applique ses durées propres (4 s succès / 5 s avec action / 8 s warning /
  persistant en erreur).
- **Cas `profil-settings-client`** : le body d'erreur JSON (`{ error }`) est reconstruit en
  `new Error(body.error ?? …)` pour préserver le message métier serveur via `describeApiError`
  (un objet brut ne serait pas reconnu → message générique).
- **Dette signalée (hors lot, sans changement de data-flow)** : `general-settings-client` et
  `facturation-settings-client` lancent `new Error("Failed")` dans leur `mutationFn` (pas de
  `handleApiResponse`) → la description du toast d'erreur affichera « Failed » en attendant
  leur bascule sur `apiFetch`/`handleApiResponse` (dette F.3 — changer le `mutationFn` ici
  aurait modifié le data-flow, interdit dans ce lot).

**Vérifications (2026-10-18, sorties exactes)** : `npm run lint` → **✖ 438 problems
(35 errors, 403 warnings)** (baseline 466 − 28) ; `npm run lint 2>&1 | grep -c
"no-restricted-imports"` → **33** (61 − 28) ; `npx tsc --noEmit` → **0 erreur** ;
`npx vitest run` → **20 fichiers / 341 tests**, 0 régression ; greps `from "sonner"` /
`any`/`useEffect`/`err.message`/`title: "Erreur"|"Succès"|""` sur les 28 fichiers → **vides**.

Fichiers clés : les 28 fichiers listés ci-dessus (importent désormais `@/lib/notify` uniquement ;
`lib/notify.ts` et `components/ui/sonner.tsx` inchangés).

## 8. Migration des appels — vague 2 (lot F.3b, 2026-10-18) + bascule ESLint

**36 fichiers migrés** (33 à import statique `from "sonner"` + 3 contenant des imports
dynamiques `import("sonner")` pour 5 sites) — **fin de la migration `sonner` dans
l'application** :

- `components/achats/` (4 — dont `scan-upload-screen` avec import dynamique) :
  `achat-detail-client`, `achat-detail-sidebar`, `achats-client`, `scan-upload-screen`.
- `hooks/` (2 — imports dynamiques, chargement paresseux supprimé) : `use-achats` (1 site),
  `use-bc` (3 sites).
- `components/atelier/packing-list-client` ; `components/avoirs/` (4) :
  `avoir-detail-client`, `avoir-dialog`, `avoirs-client`, `nouvel-avoir-client` ;
  `components/bons-livraison/` (2) : `bl-client`, `bl-detail-client` ;
  `components/cheques/nouveau-cheque-dialog` ; `components/clients/` (4) :
  `client-blocage-banner`, `client-credit-blocking-card`, `client-dialog`,
  `credit-limit-dialog` ; `components/dashboard/nouveau-dialog` ;
  `components/devis/` (2) : `devis-client`, `devis-detail-client` ;
  `components/effets/use-nouvel-effet` ; `components/entreprises/` (3) :
  `company-logo-upload`, `create-company-dialog`, `entreprise-banques-client` ;
  `components/exports/` (4) : `export-detail-client`, `export-list-columns`,
  `modifier-export-dialog`, `nouvel-export-dialog` ; `components/factures/` (2) :
  `facture-detail-client`, `factures-client` ;
  `components/fournisseurs/fournisseur-dialog` ; `components/paiements/` (2) :
  `paiements-client`, `tresorerie-client` ; `components/rapports/rapports-client` ;
  `components/setup/company-setup-form`.

Conventions appliquées (identiques à la vague 1, §7) + cas propres à la vague 2 :

- **Header = verbe + objet avec l'identifiant du document** quand il existe :
  `Achat A-2026-0042 validé`, `BL BL-2026-0007 livré`, `Devis D-2026-003 accepté`,
  `Export E-2026-002 validé`, `Facture F-2026-0042 payée`, `Chèque 12345 créé`,
  `Compte bancaire « BIAT » créé`, `Entreprise « X » créée`, `Client « X » créé`…
  Tous les `title: "Erreur"` / `"Succès"` / `"Error"` / `"Succes"` (fautes d'orthographe
  comprises) ont disparu.
- **Toute erreur de mutation passe `error: unknown`** à `notify.error({ title, error,
  context })` ; **tous les `err.message` bruts et ternaires `instanceof Error` du canal toast
  ont disparu** (grep preuve : vide sur les 36 fichiers). Les mutations qui n'avaient **aucun**
  retour d'erreur (silencieuses) reçoivent un `onError: notify.error` — le canal d'erreur
  est l'objet même du lot.
- **`retry` : aucun ajout** dans cette vague — les 5 sites d'import dynamique sont des
  extractions (lecture) et créations ; rejeu d'une création = risque de doublon, et les
  erreurs remontées sont des `Error` de server-action (ni statut, ni réseau détectable en
  portée) → le socle n'afficherait pas le bouton de toute façon.
- **`action` conservée telle quelle** là où une navigation existait déjà : « Voir »
  (`router.push("/factures")`, `bl-client` conversion BL→facture) et « Voir facture »
  (`router.push(/factures/:id)`, `devis-detail-client` conversion devis→facture).
  **Aucune action undo inventée** (aucune route de restauration ; suppressions = DELETE
  définitif).
- **`notify.warning` pour les gardes de validation locales et refus de fichier** (taille
  max 2 Mo/20 Mo avec nom du fichier, client/BL/ligne requis, blocage client toujours actif
  après re-vérification) ; `notify.warning` conserve aussi les semantics d'origine sur les
  annulations de BL et devis refusé.
- **Messages serveur conservés en `description`** quand ils portent une info métier
  (`check-blocage` : « Client bloqué — limite de crédit dépassée. »), le titre restant
  verbe + objet côté client (`Client toujours bloqué` / `Blocage levé`).
- **Doublon supprimé** : `create-company-dialog` catchait l'upload en plus du toast du hook
  `useFileUpload` (déjà notifié en vague 1) — le catch local est vidé (commenté) pour éviter
  un double toast.
- **Hors-canal signalé** : `scan-upload-screen` `scan.setErrorMsg(err.message)` (état inline
  de l'écran d'erreur du scan, pas un toast) unifié via `describeApiError(err).message` ;
  `lib/__tests__/notify.test.ts` contient un `title: "Erreur"` qui est un **fixture de test**
  du bloc « Copier les détails », pas un titre UI — laissé tel quel.
- **Icons sonner perdues** : les options `icon:` (Send, CheckCircle, XCircle, ReceiptText,
  Trash2) n'ont pas d'équivalent dans `notify` (le socle gère ses propres variantes) —
  supprimées ; `CheckCircle` rendu inutilisé dans `devis-detail-client` a été retiré de
  l'import.

**Bascule ESLint (fin du lot)** : grep `from "sonner" | import("sonner")` hors
`lib/notify.ts` / `components/ui/sonner.tsx` → **vide** → règle `no-restricted-imports`
passée de `warn` à **`error`** dans `eslint.config.mjs` (commentaire provisoire remplacé).

**Vérifications (2026-10-18, sorties exactes)** : `npm run lint` → **✖ 405 problems
(35 errors, 370 warnings)** (= baseline d'avant F.1) ; `npm run lint 2>&1 | grep -c
"no-restricted-imports"` → **0** ; `npx tsc --noEmit` → **0 erreur** ; `npx vitest run` →
**20 fichiers / 341 tests**, 0 régression ; grep périmètre `sonner` → **vide** ; greps
`any`/`ts-ignore`/`eslint-disable`/`useEffect(`, `err.message`, `title générique` sur les 36
fichiers → **vides** ; `alert(`/`confirm(` → **6** (inchangé, lot F.4).

## 9. Lot F.4 — alert/confirm éliminés, catch traités (2026-10-18)

Dernier lot du socle UX : **plus aucun `alert()`/`confirm()` natif** dans `app/` + `components/`
et **tous les `catch` vides du périmètre sont traités et justifiés**.

### 9.1 `alert()`/`confirm()` → `notify` / `ConfirmDialog` (7 sites, 6 listés + 1 bonus)

| Site (avant) | Après | Brique |
|---|---|---|
| `nouvel-effet-actions.tsx:26` `alert("Veuillez sélectionner un fournisseur…")` | `notify.warning({ title: "Sélectionnez un fournisseur", description: … })` | canal avis 8 s — garde de saisie locale, pas une erreur système |
| `nouvel-effet-actions.tsx:30` `alert("Veuillez remplir le tiré…")` | `notify.warning({ title: "Complétez les champs obligatoires", description: "Encore à renseigner : <liste dynamique des champs manquants>. …" })` | idem — le corps liste **exactement** ce qui manque (le tiré / le montant / la date d'échéance) |
| `nouvel-effet-actions.tsx:57` `alert("Erreur lors de la création de l'effet.")` | `catch (error) { notify.error({ title: "Création de l'effet impossible", error, context: "lors de la création de l'effet" }) }` | erreur réelle du `mutateAsync` (le hook `createEffet` n'a **pas** d'`onError` notify — rollback optimiste seul — donc **pas de double toast**, vérifié) |
| `export-detail-client.tsx:122` `if (confirm("Supprimer cet export ?")) deleteExport.mutate(...)` | `<ConfirmDialog>` rendu en JSX, `onDelete → setDeleteOpen(true)`, `onConfirm` = **le même** `deleteExport.mutate(exp.id, { onSuccess, onError })` byte-identique, `isLoading={deleteExport.isPending}`, titre = texte exact de l'ancien `confirm` | `components/confirm-delete-dialog.tsx` |
| `ngp-settings-client.tsx:152` `if (confirm("Supprimer ce code NGP ?"))` | état `deletingCode` (ligne cible) + `<ConfirmDialog>` en fin de page, `onConfirm` = même `deleteNgp.mutate(row.id, …)` + mêmes callbacks notify | idem |
| `utilisateurs-settings-client.tsx:51` `if (confirm(\`Supprimer ${user.name} ? …\`))` | état `deletingUser` + `<ConfirmDialog>`, `title={\`Supprimer ${user.name} ?\`}` + `description="Cette action est irréversible."` (**mots exacts** de l'ancien `confirm`), `onConfirm` = même `mutations.remove.mutate(id)` (le hook notifie déjà succès/erreur), `isLoading={mutations.remove.isPending}` | idem |
| **Bonus hors liste Governor** : `use-nouvel-effet.ts:202` `window.confirm("Répartir automatiquement remplacera…")` (fichier `.ts`, non repéré par le grep `.tsx` du lot) | état `autoRepartirConfirmOpen` + `applyAutoRepartir()` exposés par le contrôleur, `<ConfirmDialog variant="default" icon={Sparkles} confirmLabel="Répartir">` rendu dans `nouvel-effet-split-dialog.tsx` (AlertDialog Radix au-dessus du Dialog, pattern supporté) | confirmation **non destructive** → variante `default` |

Aucun `await` de confirmation n'était au milieu d'une chaîne d'instructions : les 3 confirm de
suppression vivaient dans des handlers/onClick, la conversion en `AlertDialog` préserve le
**déclenchement exact** des mutations (même payload, mêmes callbacks, aucun changement de hook).

### 9.2 `catch` vides — décompte et traitement

- **Compteur brut `grep -rn "catch {" app components hooks` : 25 → 8.** La baisse vient du fait
  que les catch traités deviennent `catch (err)`/`catch (error)` (plus de littéral `catch {`).
- **Vrais catch vides (corps vide ou seul commentaire) relevés : 19**, tous traités :
  - **`console.error("[tag] …", err)` — 14 sites server-side** (le `notify` client n'existe pas
    côté server action/route ; convention `[tag]` déjà présente en `console.warn`) : suppression
    best-effort de fichiers `unlink`/`unlinkSync` dans `app/actions/companies.ts` ×2, `app/actions/products.ts` ×5,
    `app/api/packing-list/[id]/route.ts` ×1, `app/api/products/[id]/fiche-technique/route.ts` ×2,
    `app/api/products/[id]/fiches/[ficheId]/route.ts` ×1, `app/api/products/[id]/photo/route.ts` ×2,
    et `app/api/quotes/[id]/convert/route.ts` ×1 (corps optionnel). **Justification** : nettoyage
    défensif — l'opération métier (update DB) réussit quoi qu'il arrive, l'utilisateur n'a rien
    à faire ; la trace serveur suffit au diagnostic.
  - **`convert/route.ts` — cas particulier** : l'appelant frontend POSTe **sans corps** (chemin
    normal), donc un `console.error` inconditionnel serait du bruit à chaque conversion. Traitement :
    lecture `request.text()` puis `JSON.parse` **uniquement si corps non vide** — corps vide =
    silence (backward compat), corps malformé réel = trace. Comportement strictement identique.
  - **`notify.error` — 2 sites client** : `use-nouvel-effet.ts` `handleSuggestEcheance` (l'utilisateur
    a demandé les suggestions — un échec silencieux laisse un vide inexplicable ; le hook
    `useSuggestEcheances` n'a pas d'`onError`) et `produit-form-page.tsx` `handlePhotoRemove`
    (action explicite de l'utilisateur, la photo reste affichée si ça échoue).
- **4 catch vides restants (commentés) inchangés — déjà traités en amont** : `use-nouvel-effet.ts`
  (`useBatchCreateEffets` notifie), `create-company-dialog.tsx` et `produit-variants-section.tsx`
  (`useFileUpload` notifie — commentaire « // silent » **inexact corrigé** en la justification
  réelle), `login-form.tsx`/`use-auth.ts` ne sont pas vides (corps plein : `notify.error`+`setState`,
  `throw` de repli).
- **4 `catch {` non vides hors périmètre** : `packing-list/route.ts:130` (`typesJson = []`),
  `customizer-studio.tsx:119` (`return null`), `effets-client.tsx:62` (`return new Set()`),
  `use-auth.ts:46` (`throw`).

**Vérifications (2026-10-18, sorties exactes)** : `npm run lint` → **✖ 405 problems (35 errors,
370 warnings)** (identique baseline) ; `npx tsc --noEmit` → **0 erreur** ; `npx vitest run` →
**20 fichiers / 341 tests**, 0 régression ; `grep -rn "\balert(\|\bconfirm(" app components
--include=*.tsx` → **vide (0)** ; `grep -rn "window.confirm\|window.alert" app components hooks`
→ **vide** ; `catch {` → **25 → 8** (tous justifiés, cf. §9.2) ; greps `any`/`ts-ignore`/
`eslint-disable`/`useEffect(`, `from "sonner"`, `AlertDialog` sur les 15 fichiers modifiés →
**vides** (le seul important `AlertDialog` reste `components/confirm-delete-dialog.tsx`).
Détection impeccable : 21 findings, **tous `advisory` pré-existants** (`text-[10px]` hors ramp
sur lignes non touchées) — **aucun finding introduit**.

## Lot H vague W4 — badge de notifications vers un hook (2026-10-24)

- `components/layout/notifications-popover.tsx` : le `useQuery` inline (`fetch("/api/notifications?unread=true&limit=20")`, clé `["notifications","unread"]`, `refetchInterval: 60000`) est déplacé dans **`useUnreadNotifications()`** (`hooks/use-notifications.ts`, clé via `queryKeys.notifications.unread()`) ; l'`interface Notification` locale devient `NotificationItem`/`UnreadNotificationsResponse` exportées du hook. Rendu, conditions d'ouverture et badge **inchangés**.
- `useMarkNotificationsRead` : invalidation `["notifications"]` → `queryKeys.notifications.all()` (même array, aucun déplacement de cache).
- Détail complet et preuves : entrée CHANGELOG `[2026-10-24] Frontend (lot-h4-vagues-finales/H)`.
