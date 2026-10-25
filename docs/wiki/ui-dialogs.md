# UI — Dialogs d'entité : créer vs réutiliser

Fiche transverse sur **comment construire (et ne pas construire) un dialog d'entité** dans FacturaPro.
Établie par le lot **P2-11** (décision B = **supprimer** `components/shared/entity-dialog.tsx`), le 2026-10-02,
complétée par le lot **P2-12** (même jour) : **`components/confirm-delete-dialog.tsx` = brique de référence
pour toute confirmation de suppression** — voir §3, règle 7.

## 1. Constat P2-11 (preuves)

Le wrapper partagé `components/shared/entity-dialog.tsx` (50 lignes, 1338 o) était candidat à la factorisation
des dialogs d'entité (clients, fournisseurs, paiements…). Le préalable a prouvé qu'il était **mort** :

- **0 importeur** : `grep -rn "EntityDialog\|entity-dialog" --include=*.ts --include=*.tsx app components hooks lib`
  → seules **3 lignes**, toutes dans le fichier lui-même (L7 `interface EntityDialogProps`, L18 `export function EntityDialog`, L27 `}: EntityDialogProps`).
- **0 consommateur Graphify** : `graphify explain "entity-dialog.tsx"` → nœud `components_shared_entity_dialog`,
  degree 10, **100 % arêtes sortantes** (il importe, personne ne l'importe) ;
  `graphify affected "components_shared_entity_dialog" --depth 3` → **"No affected nodes found."**
- **26 dialogs réels** dans le code (fichiers avec `DialogContent`, hors `components/ui/` et hors primitives) :
  - **23/26** ont déjà leur `DialogFooter` ;
  - **23/26** personnalisent déjà `DialogContent className` (largeur + `max-h`/`overflow`) ;
  - **8/26** sont en React Hook Form (`avoir-dialog`, `client-dialog`, `create-company-dialog`,
    `fournisseur-dialog`, `nouveau-produit-dialog`, `produit-edit-dialog`, `create-user-dialog`, `edit-user-dialog`).
- **API incompatible avec les 3 dialogs analysés** — `fournisseur-dialog.tsx` (192 l.),
  `client-dialog.tsx` (143 l.), `payment-dialog.tsx` (130 l.) :
  - **footer hors `<form>`** : `EntityDialog` rend ses boutons dans un `<div>` **après** `{children}` →
    impossible de les placer dans le formulaire du consommateur, alors que les 3 dialogs placent
    `DialogFooter` **dans** le `<form>` avec `type="submit"` ;
  - **aucun passage de `className` sur `DialogContent`** : le wrapper rend `<DialogContent>` nu →
    aucune des 3 largeurs (`sm:max-w-2xl max-h-[90vh] overflow-y-auto`, idem, `sm:max-w-md`) n'est exprimable ;
  - **label statique** : `submitLabel = "Enregistrer"` en dur, alors que les dialogs réels dépendent de
    `const isEdit = !!entity` (`isEdit ? "Mettre à jour" : "Créer le Fournisseur"`, états `Mise à jour...`/`Création...`) ;
  - **`DialogTitle` non stylé** : les dialogs du domaine utilisent `className="text-sm font-semibold"`.

## 2. Décision B — Supprimer (validée par l'utilisateur, 2026-10-02)

**`components/shared/entity-dialog.tsx` a été supprimé** (`rm`, 50 lignes, 0 importeur, **0 changement visuel**).

Justification : une brique partagée qui n'a **jamais** été consommée, dont l'API est structurellement
incompatible avec les seuls dialogs du domaine réels, et dont le bénéfice théorique (économiser ~15 lignes)
est inférieur au coût d'une 4ᵉ couche d'abstraction au-dessus des primitives `components/ui/dialog.tsx`.
Le code mort supprimé vaut mieux qu'une API devenue un piège : elle donnait l'illusion d'un « pattern
approuvé » alors que son API forçait à contourner le `<form>`, la largeur et les labels dynamiques.

## 3. Règle « Dialogs d'entité : créer vs réutiliser »

1. **Brique de base = primitives `components/ui/dialog.tsx`** (`Dialog` / `DialogContent` / `DialogHeader` /
   `DialogTitle` / `DialogFooter`). `DialogFooter` se place **DANS** le `<form>`, avec le bouton de soumission
   `type="submit"` + `size="sm"`, des **labels dynamiques create/edit** (`isEdit ? … : …`) et les **états
   pending** (`isPending` → `Mise à jour...` / `Création...` ou équivalent).

2. **Ne jamais recréer `components/shared/entity-dialog.tsx`** (supprimé en P2-11 : 0 importeur, API inadaptée —
   footer hors `<form>`, pas de passage de `className` sur `DialogContent`, labels statiques, `DialogTitle` non
   stylé). Toute proposition future d'« EntityDialog générique » doit **d'abord prouver** qu'elle couvre
   simultanément : `className` sur `DialogContent` (largeur **+** `max-h`/`overflow`), footer **dans** le form,
   label dynamique `isEdit` (libellé + pending), et `DialogTitle` stylé — c'est-à-dire reproduire exactement ce
   que les 26 dialogs font déjà localement.

3. **Dialog 100 % standard** (header + children + 2 boutons, aucune customisation de largeur) →
   **composant local d'environ 30 lignes sur primitives**, pas de wrapper partagé.

4. **Dialog avec formulaire** → **React Hook Form + Zod dans le module**, mutations via les hooks TanStack du
   module (`hooks/use-*.ts`), shell local composé sur primitives. Aucune logique de formulaire dans un shell partagé.

5. **Avant de créer un nouveau dialog** : consulter `components/confirm-delete-dialog.tsx` (confirmations),
   `components/factures/payment-dialog.tsx` (formulaire contrôlé par props, sans `<form>`) et **le dialog du
   domaine le plus proche** comme référence — **recopier le patron du module**, ne pas inventer un nouveau shell.

6. **Extraction des briques partagées : « dès la 2ᵉ occurrence d'un motif, on extrait »** (règle mise à jour
   le **2026-10-18** par l'utilisateur, en remplacement de l'ancienne règle « ≥ 2 consommateurs réels au moment
   de la création, sinon refusée »). La brique se crée **au moment où le motif réellement se produit une
   2ᵉ fois**, et elle doit être **branchée sur ce 2ᵉ consommateur dans le même lot** — jamais créée
   « au cas où ». **Deux garde-fous tirés du lot G (2026-10-18)** s'ajoutent à la règle :
   - **Pas de brique spéculative** : une brique créée sans consommateur réel dans son lot est du code mort
     (ce qui est arrivé à `entity-dialog.tsx` ~3 mois, puis à `filter-bar.tsx` du lot G — créé, puis
     **supprimé** le même jour car redondant avec la toolbar de `DataTable`).
   - **Seuil de vivacité** : tout composant partagé doit atteindre **≥ 3 usages réels** ; en dessous, il est
     soit supprimé, soit son adoption est **étendue à un site réel** — **jamais** atteint par un usage artificiel.
     (`EntityFormDialog` = 1 usage réel au 2026-10-18, seuil 3 **reporté au lot J** — dette datée, pas ignorée.)

7. **Toute confirmation de suppression = `components/confirm-delete-dialog.tsx`** (brique de référence,
   lot **P2-12** du 2026-10-02). Ne **jamais** recréer un `AlertDialog` artisanal « Supprimer … ? » :
   la brique impose le shell standard (`AlertDialogContent size="sm"` + `AlertDialogMedia` poubelle rouge,
   footer Annuler/Confirmer `variant="destructive"`, état `isLoading` qui désactive les 2 boutons) et
   expose `title` / `description` / `onConfirm` + **2 libellés optionnels** `confirmLabel` (défaut
   `Supprimer`) et `pendingLabel` (défaut `Suppression...`) pour préserver un libellé métier
   (ex. `confirmLabel="Retirer"` dans `planning-client.tsx`). **Adoption : 10 fichiers** (4 d'origine
   `produits-client`, `bl-client`, `clients-client`, `fournisseurs-client` + 6 migrés P2-12 :
   `modeles-client`, `ordres-fabrication-client` (bloc suppression), `packing-list-client`,
   `bons-commande-client`, `carton-types-manager`, `planning-client`).
   **Cas où le `AlertDialog` reste légitime** (ne pas migrer) : une confirmation qui **n'est pas** une
   suppression et/ou dont le contenu dépasse la brique — ex. bloc « Changer le statut » de
   `ordres-fabrication-client.tsx` (description JSX avec `<strong>`), « Suppression impossible » de
   `factures-client.tsx` (avertissement + « J'ai compris »), `layout/inactivity-dialog.tsx` (session).

## Voir aussi

- [CHANGELOG.md](CHANGELOG.md) — entrée `[2026-10-02] Frontend (p2-11-entity-dialog/P2-11)`.
- [CHANGELOG.md](CHANGELOG.md) — entrée `[2026-10-02] Frontend (p2-12-confirm-delete/P2-12)`
  (6 migrations + extension `confirmLabel`/`pendingLabel` de la brique).
- [audit-facturapro-suivi.md](audit-facturapro-suivi.md) — lignes `P2-11` et `P2-12` (✅ le 2026-10-02).
- `DESIGN.md` § Components — n'avait **aucune** section Dialog : cette fiche comble ce vide pour les dialogs.
