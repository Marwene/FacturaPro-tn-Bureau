# Query keys & conventions toasts (lot H)

## 1. Registre central des query keys — `lib/query-keys.ts`

**Décision (vague W0, 2026-10-24)** : toutes les query keys TanStack Query du projet sont definies dans un seul fichier, `lib/query-keys.ts`, export unique `queryKeys`, structuree par domaine (`queryKeys.invoices.list(...)`, `queryKeys.clients.detail(id)`, etc.).

**Pourquoi** : avant ce socle, les clés étaient des tableaux littéraux dispersés dans ~67 hooks (`hooks/use-*.ts`) et plusieurs composants. Une même entité avait parfois deux racines concurrentes (voir §2), et une invalidation oubliee cible silencieusement le mauvais cache. Un registre unique rend chaque clé grepapble a un endroit et rend les vagues de migration W2/W3/W4 mecaniques.

**Règles** :
- Chaque domaine expose `all()` (racine, pour invalidation large par prefixe) puis les variantes **reelles** utilisees aujourd'hui. Aucune clé speculative n'a ete ajoutée (inventaire exhaustif par `grep -rn "queryKey" hooks/ components/ lib/ app/`).
- Les shapes reproduisent **a l'identique** les arrays historiques : migrer un hook = remplacer le tableau literal par l'appel de factory correspondant, sans bouger ni le cache ni les invalidations.
- Typage : retours `as const`, parametres primitifs (`string`, `number`, `boolean`, `string | null | undefined`). Aucune dependance du fichier vers `hooks/` (anti-cycle) : les types unions locaux des hooks (ex. `CompteFiltreTresorerie`) sont reexprimes en `string` dans les signatures.

### Domaines couverts

`achats`, `avoirs`, `bonsCommande`, `bonsLivraison`, `cartonTypes`, `categories`, `cheques`, `clients`, `clientDetail`, `companies`, `customizer`, `dashboard`, `devis`, `designsPersonnalises`, `effets`, `exports`, `fournisseurs`, `fournisseurDetail`, `inventaire`, `invoices`, `marques`, `matieresPremieres`, `ngp`, `notifications`, `ordresFabrication`, `packingLists`, `payments`, `pendingBl`, `produits`, `reports`, `search`, `settings`, `stock`, `taux`, `tresorerie`, `users`.

## 2. Racines doubles a ne pas « corriger » a l'aveugle

Ces paires coexistent reellement dans le cache (meme concept, deux histoires de refactoring inacheve). Elles sont conservees telles quelles dans `lib/query-keys.ts` avec un suffixe `legacy` / un nom distinct ; les unifier est une **migration deliberate** (changer la clé = refetch + invalidations a adapter partout), pas un nettoyage silencieux :

| Concept | Racine A | Racine B |
|---|---|---|
| Bons de livraison | `delivery-notes` (`hooks/use-bl.ts`) | `deliveryNotes` (`hooks/use-delivery-notes-queries.ts`, `components/effets/impression-effets-client.tsx`) |
| Stock (mouvements) | `stock-movements` (`hooks/use-stock-movements.ts`) | `stock-mouvements` (`hooks/use-stock-mouvements.ts`) |
| Produits (liste) | `products` 7 args — `hooks/use-produits.ts` | `products` 4 args — `hooks/use-products-queries.ts` / `hooks/use-queries-shared.ts` |
| Devis (taux BCT sync) | `taux-bct-bl-sync` (`hooks/use-bl.ts`) | `taux-bct-devis-sync` (`hooks/use-devis.ts`, ex-`components/devis/nouveau-devis-client.tsx`) |

## 3. Convention toasts — decision : callbacks côté composant

**Convention retenue** : les toasts (`lib/notify.ts`, `notify.success/error/warning` — jamais d'import direct de `sonner`) sont appeles **depuis le composant**, via les callbacks `onSuccess` / `onError` passes a `mutation.mutate(vars, callbacks)`.

**Fichier de reference** : `components/clients/client-dialog.tsx` (motif canonique :

```ts
updateClient.mutate({ id, data }, {
  onSuccess,
  onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "mise à jour du client" }),
});
```

**Justification par l'analyse des deux motifs du repo (REUSE FIRST)** :
- Motif A — toast **dans le hook** (`hooks/use-companies.ts`, `hooks/use-users-mutations.ts`) : 11 fichiers hooks / 39 appels `notify.` au total.
- Motif B — toast **dans le composant** (callbacks `mutate(vars, { onSuccess, onError })` ou `mutateAsync` puis `notify`) : **65 fichiers composants / 269 appels `notify.`**, plus 181 blocs `onSuccess:`/`onError:` passes depuis les composants.

Le motif B domine largement (≈ 7x en fichiers, ≈ 7x en appels) : c'est lui la convention. Raison produit en cohérence : le composant possede le contexte UX (redaction du message, quel dialog fermer, ou rediriger) et peut reutiliser le meme `onSuccess` pour plusieurs mutations ; le hook reste donnees + invalidation, reutilisable avec des copies differentes.

**Exception (motif A conserve, pas reécrit)** : un hook peut appeler `notify` lui-meme quand le toast est lie a un effet transversal qu'il possede — `update()` de session NextAuth + `router.push` (`useSetupCompany`, `useUpdateProfil`) ou copie identique imposee a tous les appelants (CRUD users). Regle : si l'effet de bord UX appartient au hook (session/routing) **et** qu'un seul comportement est correct pour tous les appelants, le toast vit dans le hook ; sinon il vit dans le composant.

## 4. Etat / migration

- `lib/query-keys.ts` est pose (vague W0) ; le branchement des ~67 hooks est le travail des vagues W2/W3/W4, qui consomment ce registre des leur debut.
- **Branches au registre au 2026-10-24** (grep `lib/query-keys` dans `hooks/`) : domaine `companies` + `settings` (lots precedents F/E), et **domaine `produits` complet par le lot h3** (`hooks/use-product-suppliers.ts` [nouveau], `use-product-fiche-technique.ts`, `use-product-variants.ts`, `use-products-for-labels.ts` — 5 composants `components/produits/` plus aucun `fetch`/`useQuery`/`useMutation` inline).
- **Lot h2 (vague W2, 2026-10-24)** : domaines `settings` (`use-settings.ts` — dont `app()`/`apiKeyStatus()`), `companies` (`use-companies.ts`, `use-company-query.ts`, nouveau `use-company-bank-accounts.ts`) et `users` (`use-users.ts` — `users.all()` pour la liste) branchés ; `companies.detail(id)` élargi `string | null` (array `["company", id]` préservé tel quel). 5 composants `components/parametres/` + `components/entreprises/` plus aucun `fetch`/`useQuery`/`useMutation` inline.
- **Lot h4 (vague W4, 2026-10-24)** : domaines `notifications` (`unread()`), `search` (`global()`), `effets` (`emisList()`), `customizer` (`productInit()`/`designInit()`), `bonsCommande` (`produitsSelect()`), `devis` (`dateExpirationInit()`/`montantTnd()`), `taux` (`bctDevisSync()`), `achats` (`scanTypeInit()`) et `bonsLivraison` (`montantTnd()`) branchés : les 11 `useQuery` inline restants de `components/` (8 fichiers) sont déplacés dans 2 nouveaux hooks (`hooks/use-global-search.ts`, `hooks/use-customizer-init.ts`) et 6 hooks existants étendus. `components/` et `app/` (hors `app/api`) sont à **zéro `fetch()` et zéro `useQuery`/`useMutation`/`useQueries` inline**.
- Toute **nouvelle** query key ajoutee depuis ce jour doit passer par `lib/query-keys.ts` (ajout d'un domaine ou d'une variante), pas par un tableau literal dans un hook.
