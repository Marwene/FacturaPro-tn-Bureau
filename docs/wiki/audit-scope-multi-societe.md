# Audit Ciblé — Scope Multi-Société : Product, Tiers, Categorie, Marque

**Date :** 2026-09-06  
**Statut :** DIAGNOSTIC UNIQUE — Aucune correction effectuée  
**Auteur :** Governor Agent

---

## Résumé Exécutif

**Le code actuel est architecturalement correct pour Product, Tiers, Categorie, Marque et Stock.** Ces modèles sont intentionnellement GLOBAUX (pas de `companyId`), et AUCUN filtrage par `companyId` n'est appliqué à leurs requêtes. C'est le comportement voulu : catalogue partagé, stock pool unique.

**Cependant, il y a 2 incohérences fonctionnelles mineures** dans le dashboard et la sidebar où des métriques sont mélangées (certains compteurs sont company-scoped, d'autres sont globaux), ce qui peut prêter à confusion pour l'utilisateur final.

---

## 1. Analyse du Schéma Prisma — Confirmation

### Product (`prisma/schema.prisma` L226-272)

```
companyId : ABSENT ✅
```

Champs : `id, code, nom, description, categorieId, marqueId, tiersId, photoUrl, ficheTechniqueUrl, codeBarre, prixHT, prixAchat, tauxTVA, fodec, tauxFodec, stockActuel, stockMinimum, unite, estSurCommande, quantiteParUnite, stockStatus, actif, createdAt, updatedAt`

Relations : `achatLines, avoirLines, bonCommandeLines, bonLivraisonLines, designs, fichesTechniques, invoiceLines, stockMovements, ordresFabrication, variants, categorie, marque, tiers, compositions, quoteLines`

→ **Aucun lien vers Company.** Le produit est un objet global du catalogue.

### Tiers (`prisma/schema.prisma` L152-201)

```
companyId : ABSENT ✅
```

Champs : `id, code, raisonSociale, matriculeFiscal, adresse, ville, codePostal, telephone, email, siteWeb, isClient, isFournisseur, assujettTVA, exonereTVA, tauxRetenue, creditLimit, ribBancaire, banque, notes, actif, dateBlocage, emailSentAt, devise, deviseSecondaire, contactNom, contactTel, contactFonction, createdAt, updatedAt`

Relations : `achats, avoirs, bonsCommandes, deliveryNotes, cheques, effetsFournisseur, effetsTire, exports, invoices, matieresPremieres, mouvementsFinanciers, ordresFabrication, payments, products, quotes`

→ **Aucun lien vers Company.** Le client/fournisseur est un objet global du répertoire.

### Categorie (`prisma/schema.prisma` L213-224)

```
companyId : ABSENT ✅
```

Champs : `id, nom, parentId, createdAt, updatedAt`  
Relations : `parent, enfants (arbre auto-référent), products`

→ **Aucun lien vers Company.** Les catégories sont un arbre global.

### Marque (`prisma/schema.prisma` L203-211)

```
companyId : ABSENT ✅
```

Champs : `id, nom, createdAt, updatedAt`  
Relations : `products`

→ **Aucun lien vers Company.** Les marques sont un référentiel global.

### StockMovement (`prisma/schema.prisma` L807-827)

```
companyId : ABSENT ✅
```

Champs : `id, productId, variantId, type, quantite, referenceType, referenceId, achatId, date, notes, createdAt`

→ **Aucun lien vers Company.** Les mouvements de stock sont globaux. Le `companyId` n'existe même pas dans le schéma pour le filtrage de traçabilité. C'est un choix délibéré : puisque le stock est un pool unique, la traçabilité par société n'est pas implémentée (et n'est pas nécessaire pour le fonctionnement actuel).

### Contraste : Modèles AVEC `companyId`

Les modèles suivants ont correctement `companyId` pour le multi-tenancy :
- `Invoice` (L488), `Quote` (L558), `BonCommande` (L612), `BonLivraison` (L689)
- `Achat` (L753), `Payment` (L839), `Cheque` (L874), `Effet` (L924)
- `Export` (L992), `Avoir` (L1043), `MouvementFinancier` (L1094)
- `DesignPersonnalise` (L355), `OrdreFabrication` (L376), `PackingList` (L427)
- `CartonType` (L474), `NgpCode` (L979), `MatierePremiere` (L314), `Sequence` (L1131)

---

## 2. Audit Exhaustif du Code — Filtrage par `companyId`

### Résultat : ZÉRO occurrence de filtrage `companyId` sur Product/Tiers/Categorie/Marque

Il n'existe **aucune occurrence** dans tout le codebase où `companyId` est utilisé pour filtrer ou restreindre des requêtes sur `Product`, `Tiers`, `Categorie` ou `Marque`. Toutes les requêtes sur ces quatre modèles retournent des résultats de manière globale, quelle que soit la société connectée.

### Preuve par fichier :

#### Routes API Products

| Fichier | Ligne | Opération | Filtre `companyId` | Verdict |
|---------|-------|-----------|---------------------|---------|
| `app/api/products/route.ts` | L25-55 | `prisma.product.findMany()` | NON — filtres: search, categorie, stockStatus, prixMin/Max | ✅ Correct (global) |
| `app/api/products/route.ts` | L113-135 | `prisma.product.create()` | NON — pas de `companyId` dans `data` | ✅ Correct (global) |
| `app/api/products/[id]/route.ts` | L21-22 | `prisma.product.findUnique()` | NON | ✅ Correct (global) |
| `app/api/products/[id]/route.ts` | L78 | `prisma.product.update()` | NON | ✅ Correct (global) |
| `app/api/products/[id]/route.ts` | L141 | `prisma.product.delete()` | NON | ✅ Correct (global) |
| `app/api/products/[id]/stats/route.ts` | L15-37 | `findUnique` + `invoiceLine/quoteLine/achatLine.findMany()` | NON | ✅ Correct (global) |
| `app/api/products/[id]/stock-movements/route.ts` | L19-20 | `prisma.stockMovement.findMany()` | NON | ✅ Correct (global) |
| `app/api/products/[id]/stock-movements/route.ts` | L66-92 | `product.findUnique` + `stockMovement.create` + `product.update` | NON | ✅ Correct (global) |
| `app/api/products/[id]/variants/route.ts` | L37, L108, L122 | `productVariant` CRUD | NON | ✅ Correct (global) |
| `app/api/products/next-code/route.ts` | L13-17 | `prisma.product.findFirst()` | NON | ✅ Correct (global) — numérotation globale |

#### Routes API Clients/Fournisseurs

| Fichier | Ligne | Opération | Filtre `companyId` | Verdict |
|---------|-------|-----------|---------------------|---------|
| `app/api/clients/route.ts` | L19-34 | `prisma.tiers.findMany({ isClient: true })` | NON | ✅ Correct (global) |
| `app/api/clients/route.ts` | L37-41 | `prisma.invoice.groupBy()` (solde) | NON — solde global | ✅ Correct (global) |
| `app/api/clients/route.ts` | L97-104 | `prisma.tiers.create()` | NON | ✅ Correct (global) |
| `app/api/clients/[id]/route.ts` | L22-34 | `tiers.findUnique` + `invoice.findMany/aggregate` | NON | ✅ Correct (global) |
| `app/api/clients/[id]/route.ts` | L76 | `prisma.tiers.update()` | NON | ✅ Correct (global) |
| `app/api/clients/[id]/route.ts` | L109-118 | `invoice.count` + `tiers.delete` | NON | ✅ Correct (global) |
| `app/api/clients/[id]/detail/route.ts` | L22-47 | Agrégations multiples | NON | ✅ Correct (global) |
| `app/api/clients/[id]/solde/route.ts` | L30-63 | 4 requêtes solde | NON | ✅ Correct (global) |
| `app/api/fournisseurs/route.ts` | L18-34 | `prisma.tiers.findMany({ isFournisseur: true })` | NON | ✅ Correct (global) |
| `app/api/fournisseurs/route.ts` | L71-77 | `prisma.tiers.create()` | NON | ✅ Correct (global) |
| `app/api/fournisseurs/[id]/route.ts` | Toutes | CRUD tiers | NON | ✅ Correct (global) |

#### Routes API Catégories/Marques

| Fichier | Ligne | Opération | Filtre `companyId` | Verdict |
|---------|-------|-----------|---------------------|---------|
| `app/api/categories/route.ts` | L16-19 | `prisma.categorie.findMany()` | NON | ✅ Correct (global) |
| `app/api/categories/route.ts` | L40 | `prisma.categorie.create()` | NON | ✅ Correct (global) |
| `app/api/categories/[id]/route.ts` | L28, L45-47 | `update` + `delete` (cascading) | NON | ✅ Correct (global) |
| `app/api/marques/route.ts` | L15-18 | `prisma.marque.findMany()` | NON | ✅ Correct (global) |
| `app/api/marques/route.ts` | L39 | `prisma.marque.create()` | NON | ✅ Correct (global) |
| `app/api/marques/[id]/route.ts` | L26, L43-44 | `update` + `delete` (cascading) | NON | ✅ Correct (global) |

#### Routes Stock

| Fichier | Ligne | Opération | Filtre `companyId` | Verdict |
|---------|-------|-----------|---------------------|---------|
| `app/api/stock-mouvements/route.ts` | L23-61 | `stockMovement.findMany/groupBy` | NON — mouvements globaux | ✅ Correct (global) |
| `app/api/inventaire/route.ts` | L20-68 | `product.findMany` + `stockMovement.groupBy` | NON | ✅ Correct (global) |
| `app/api/rapports/inventaire/route.ts` | L26-39 | `product.findMany` + `stockMovement.findMany` | NON | ✅ Correct (global) |
| `lib/stock-utils.ts` | L113-169 | `stockMovement.create` + `product.update` | NON | ✅ Correct (global) |

#### Hooks

| Fichier | Filtre `companyId` | Verdict |
|---------|---------------------|---------|
| `hooks/use-produits.ts` | NON — query key sans companyId, appel `/api/products` sans param | ✅ Correct |
| `hooks/use-clients.ts` | NON — query key `["clients"]`, appel `/api/clients` sans param | ✅ Correct |
| `hooks/use-clients-queries.ts` | NON — query key `clients(search)`, pas de companyId | ✅ Correct |
| `hooks/use-categories.ts` | NON — query key `["categories"]` | ✅ Correct |
| `hooks/use-marques.ts` | NON — query key `["marques"]` | ✅ Correct |

#### Search / Command Palette

| Fichier | Module | Filtre `companyId` | Verdict |
|---------|--------|---------------------|---------|
| `lib/search.ts` L26-49 | `clients` | NON — param reçu mais ignoré | ✅ Correct (global) |
| `lib/search.ts` L54-77 | `fournisseurs` | NON — param reçu mais ignoré | ✅ Correct (global) |
| `lib/search.ts` L82-103 | `produits` | NON — param reçu mais ignoré | ✅ Correct (global) |
| `lib/search.ts` L108-129 | `factures` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L134-155 | `devis` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L160-181 | `bons-commande` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L186-207 | `bons-livraison` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L212-234 | `avoirs` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L239-261 | `achats` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L266-286 | `paiements` | OUI — `{ companyId }` | ✅ Correct (scopé) |
| `lib/search.ts` L291-312 | `exports` | OUI — `{ companyId }` | ✅ Correct (scopé) |

#### Permissions

| Fichier | Vérification |
|---------|-------------|
| `lib/permissions.ts` L256-264 | `checkPermission()` vérifie uniquement le rôle et les permissions — AUCUN contrôle de société. Un utilisateur avec le bon rôle peut modifier n'importe quel produit/fournisseur, quelle que soit la société. |

---

## 3. Vérification des Routes API — Pas de Filtrage Récemment Introduit

### `app/api/products/route.ts` — Analyse du wrapper

La route utilise `getSessionFromRequest` + `checkPermission` (pas le wrapper `apiRoute`). Pas de `companyId` résolu, pas de filtrage. Aucune influence d'un pattern de migration vers `apiRoute`.

### `app/api/clients/route.ts` — Analyse du wrapper

Même pattern : `getSessionFromRequest` + `checkPermission`. Pas de `companyId`, pas de filtrage.

### `app/api/fournisseurs/route.ts` — Analyse du wrapper

Même pattern. Pas de `companyId`, pas de filtrage.

### `app/api/categories/route.ts` et `app/api/marques/route.ts`

Même pattern. Pas de `companyId`, pas de filtrage.

**Conclusion :** Aucun filtrage `companyId` n'a été introduit par erreur lors d'une migration. Ces routes n'ont jamais utilisé le wrapper `apiRoute` avec `requireCompany: true`, et n'ont jamais filtré par société. Le pattern est cohérent depuis le début.

---

## 4. Traçage Complet du Comportement Réel

### Scénario : Société A crée un produit → Société B le voit-elle ?

**Chemin complet :**

```
1. POST /api/products (Société A)
   → getSessionFromRequest() → sessionUser.id (pas de companyId utilisé)
   → checkPermission("produits:creer") → OK
   → prisma.product.create({ data: { code, nom, ... } }) ← PAS de companyId
   → Produit créé dans la table `products` SANS association à une société
   
2. GET /api/products (Société B)
   → getSessionFromRequest() → sessionUser.id (pas de companyId utilisé)
   → checkPermission("produits:voir") → OK
   → prisma.product.findMany({ where: { AND: [search, categorie, ...] } })
   → PAS de filtre companyId → RETOURNE TOUS les produits, y compris ceux créés par A
   
3. Réponse : Société B voit le produit créé par Société A avec stockActuel à jour ✅
```

**Verdict : OUI, la société B voit immédiatement le produit créé par la société A.** C'est le comportement voulu.

### Scénario : Société A vend une unité → Le stock baisse pour toutes les sociétés ?

**Chemin complet :**

```
1. Validation facture (Société A)
   → handleSaleStockMovement() dans lib/stock-utils.ts
   → tx.stockMovement.create({ productId, type: "SORTIE", ... }) ← PAS de companyId
   → tx.product.update({ where: { id: productId }, data: { stockActuel: { increment: -1 } } })
   → stockActuel du produit global est décrémenté
   
2. GET /api/products (Société B)
   → prisma.product.findMany() ← PAS de filtre
   → Le produit affiche le stockActuel décrémenté
   
3. Réponse : Société B voit le stock baissé ✅
```

**Verdict : OUI, une vente par la société A fait baisser le stock vu par toutes les autres sociétés.** C'est le comportement voudu (pool unique).

---

## 5. Incohérences Fonctionnelles Détectées

### 5.1 Dashboard — Métriques mixtes (Company-scoped vs Global)

Dans `app/api/dashboard/route.ts`, la route utilise `requireCompany: true` (L12) et résout `companyId`. Cependant :

| Métrique | Ligne | Filtre `companyId` | Cohérence |
|----------|-------|---------------------|-----------|
| Chiffre d'affaires (invoices) | L37-54 | OUI (`invoiceWhere`) | ✅ |
| Nombre factures trimestre | L55-57 | OUI (`invoiceWhere`) | ✅ |
| **Nombre clients total** | **L58** | **NON** — `tiers.count({ actif: true })` | ⚠️ **Global** |
| **Nouveaux clients du mois** | **L59-61** | **NON** — `tiers.count({ createdAt })` | ⚠️ **Global** |
| **Alertes stock** | **L62-64** | **NON** — `product.count({ stockStatus })` | ⚠️ **Global** |
| Factures récentes | L65-72 | OUI (`invoiceWhere`) | ✅ |
| Top clients | L73-79 | OUI (`invoiceWhere`) | ✅ |
| Stats devis | L80-88 | OUI (`invoiceWhere`) | ✅ |
| **Valeur stock** | **L89-92** | **NON** — `product.findMany({})` | ⚠️ **Global** |
| **Mouvements récents** | **L93-100** | **NON** — `stockMovement.findMany({})` | ⚠️ **Global** |
| **Produits en rupture** | **L101-103** | **NON** — `product.count({ stockStatus })` | ⚠️ **Global** |

**Impact :** Le dashboard affiche un mélange de métriques company-scoped (CA, factures, devis) et globales (clients, stock, mouvements). L'utilisateur voit "15 alertes stock" alors que cela inclut les produits de TOUTES les sociétés. C'est techniquement correct (le stock est global), mais visuellement trompeur si l'utilisateur s'attend à voir "ses" alertes.

### 5.2 Sidebar — Badge alertes stock global

Dans `app/(app)/layout.tsx` L13 :

```typescript
prisma.product.count({ where: { stockStatus: { in: ["CRITIQUE", "RUPTURE"] } } }),
```

Le badge d'alertes stock dans la sidebar est **global** — il affiche le nombre total de produits en alerte critique/rupture sur TOUTES les sociétés. À côté, `invoiceCount` et `chequeCount` sont correctement scopés par `companyId` (L11-12).

**Impact :** Si la société A a 0 produit en alerte mais la société B en a 10, la société A verra quand même un badge "10" dans sa sidebar. C'est incohérent avec les autres badges (factures, chèques) qui sont scopés.

### 5.3 Solde client — Agrégation global

Dans `app/api/clients/route.ts` L37-41 :

```typescript
const invoiceSums = await prisma.invoice.groupBy({
    by: ["tiersId"],
    where: { status: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] } },
    _sum: { resteAPayer: true },
});
```

Le calcul du solde (créances) d'un client agrège les factures de **TOUTES les sociétés**. Si un client a des factures chez la société A et la société B, son solde affiché est la somme des deux.

**Impact :** Un client apparaît avec un solde de 50,000 DT alors que la société A ne lui doit que 20,000 DT (les 30,000 restants viennent de factures de la société B). C'est techniquement correct (le client est global), mais peut surprendre l'utilisateur.

---

## 6. Conclusion

### Ce qui est CORRECT (conforme au design produit)

1. **Product, Tiers, Categorie, Marque n'ont pas de `companyId`** — c'est intentionnel et architecturalement correct pour un catalogue partagé.
2. **Le stock (`stockActuel`) est un pool unique** — une vente par n'importe quelle société décrémente le stock global.
3. **Les routes API ne filtrent pas par `companyId`** pour ces modèles — c'est cohérent.
4. **Les hooks et composants ne passent pas de `companyId`** — c'est cohérent.
5. **La commande palette recherche globalement** les produits, clients, fournisseurs — c'est cohérent.
6. **Les permissions sont rôle-based**, pas company-based, pour Product/Tiers — c'est cohérent.

### Ce qui était INCOHÉRENT (corrigé le 2026-09-06)

| # | Problème | Fichier | Ligne | Résolution |
|---|----------|---------|-------|------------|
| 1 | Dashboard : "Nombre clients total" est global | `app/api/dashboard/route.ts` | L58 | ✅ Badge "Toutes sociétés" sur carte Nouveaux Clients |
| 2 | Dashboard : "Nouveaux clients du mois" est global | `app/api/dashboard/route.ts` | L59-61 | ✅ Badge "Toutes sociétés" sur carte Nouveaux Clients |
| 3 | Dashboard : "Valeur stock" est global | `app/api/dashboard/route.ts` | L89-92 | ✅ Badge "Toutes sociétés" sur carte Valeur du Stock |
| 4 | Dashboard : "Mouvements récents" est global | `app/api/dashboard/route.ts` | L93-100 | ✅ Badge "Toutes sociétés" sur carte Mouvements Récents |
| 5 | Sidebar : badge alertes stock est global | `app/(app)/layout.tsx` | L13 | ✅ Badge sidebar style distinct (`bg-muted` au lieu de `bg-foreground`) |
| 6 | Solde client agrège les factures de toutes les sociétés | `app/api/clients/route.ts` | L37-41 | ✅ Indicateur "(toutes sociétés)" dans en-tête colonne Solde |

### Résolution

Option 1 appliquée : indicateur visuel "Toutes sociétés" sur les métriques globales. Badge inline `rounded-md`, `text-[10px]`, tokens achromatiques (`bg-muted`, `text-muted-foreground`, `border-border`). Aucune couleur nouvelle — mode clair/sombre géré par les CSS variables.

---

## 7. Balayage `findUnique({ where: { id` — classification (Lot B2, 2026-10-09)

**Commande :** `grep -rnE "findUnique\(\{ where: \{ id" app/api lib` → **39 occurrences** après corrections du lot B2.

### 7.1 (b) corrigés par le lot B2 (7 occurrences, sorties du grep)

| Fichier:ligne | Ressource | Correction |
|---|---|---|
| `lib/invoice-payment.ts:21` | Invoice | `findFirst({ where: { id, companyId } })` + `PaymentResourceNotFoundError` → 404 côté routes |
| `lib/invoice-payment.ts:90` | Achat | idem |
| `app/api/effets/splits/route.ts:26` | Effet | `findFirst({ where: { id: effetId, companyId } })` — aucun scopage amont (paramètre public) |
| `app/api/ngp-codes/[id]/route.ts:15` | NgpCode | `findFirst({ id, companyId })` + `requireCompany: true` ajouté (route liste déjà scopée L15) |
| `app/api/ngp-codes/[id]/route.ts:31` | NgpCode | idem + `update({ where: { id, companyId } })` |
| `app/api/carton-types/[id]/route.ts:31` | CartonType | `findFirst({ id, OR: [{ companyId }, { companyId: null }] })` — même sémantique que la route liste L31 |
| `app/api/carton-types/[id]/route.ts:46` | CartonType | idem + garde 404 avant `delete` (L71, non couvert par le grep mais même route) |

Hors motif mais corrigé sur mandate explicite : `app/api/payments/route.ts` L111 (`achat`) et L150 (`invoice`) — `findUnique` multiligne → `findFirst({ id, companyId })`.

Hors motif (multiligne, non couvert par le grep) corrigé le **2026-10-09** sur arbitrage Governor : `app/api/avoirs/[id]/route.ts:61` (PATCH) — `avoir.findUnique({ where: { id } })` → `findFirst({ where: { id, companyId } })` (404 « Avoir non trouvé » déjà présent) + **garde DELETE scopée** ajoutée L98-104 (même route, aucun read amont avant `avoir.delete` — précédent `carton-types` L71) ; GET L17-18 déjà scopé, inchangé.

### 7.2 (a) — scopage amont prouvé (20 occurrences)

| Fichier:ligne | Preuve du scopage |
|---|---|
| `app/api/achats/route.ts:128` | `company.findUnique({ where: { id: companyId } })` — l'id EST le `companyId` de session (`requireCompany: true`) |
| `app/api/avoirs/route.ts:81` | idem |
| `app/api/bons-commande/route.ts:18` | idem |
| `app/api/bons-livraison/route.ts:152` | idem |
| `app/api/exports/route.ts:95` | idem |
| `app/api/invoices/from-bl/route.ts:148` | idem |
| `app/api/invoices/route.ts:168` | idem |
| `app/api/quotes/[id]/convert/route.ts:56` | idem |
| `app/api/quotes/route.ts:106` | idem |
| `app/api/settings/route.ts:9` et `:19` | idem |
| `lib/packing-list/generate.ts:37` | idem |
| `app/api/cheques/[id]/annuler/route.ts:29` | chèque lu en `findFirst({ id, companyId })` L13-15 ; `paymentId` dérivé de ce chèque |
| `app/api/cheques/[id]/annuler/route.ts:32` et `:57` | dérivés du payment lui-même dérivé du chèque scopé L13-15 |
| `app/api/cheques/[id]/encaisser/route.ts:31` | chèque scopé L13-15 ; `invoiceId` dérivé |
| `app/api/cheques/[id]/rejeter/route.ts:29`, `:32`, `:57` | chèque scopé L13-15 |
| `app/api/effets/[id]/route.ts:102` | effet scopé `findFirst({ id, companyId })` L38-41 ; `invoiceId` dérivé (et `applyPaymentToInvoice` re-vérifie désormais `companyId`) |

### 7.3 Hors périmètre — décision documentée (19 occurrences, inchangées)

**Tiers (6)** — `app/api/bons-commande/[id]/route.ts:59`, `app/api/clients/[id]/envoyer-rappel/route.ts:16`, `app/api/clients/[id]/route.ts:14`, `app/api/fournisseurs/[id]/detail/route.ts:10`, `app/api/fournisseurs/[id]/route.ts:12`, `app/api/products/[id]/suppliers/route.ts:67`.
**Product (10)** — `app/api/achats/[id]/route.ts:11`, `app/api/products/[id]/fiche-technique/route.ts:17` et `:66`, `app/api/products/[id]/fiches/route.ts:39`, `app/api/products/[id]/photo/route.ts:17` et `:67`, `app/api/products/[id]/stock-movements/route.ts:56`, `app/api/products/[id]/suppliers/route.ts:58`, `lib/stock-utils.ts:39` et `:67`.
**Categorie (2)** — `app/api/products/[id]/route.ts:73`, `app/api/products/route.ts:117`.
**Module Product — FicheTechnique (1)** — `app/api/products/[id]/fiches/[ficheId]/route.ts:13` (dérivée du module Product exclu).

Raison : `Product`, `Tiers`, `Categorie`, `Marque` n'ont **pas de `companyId`** dans `prisma/schema.prisma` (référentiels globaux volontaires, §1 de ce document) → rien à scoper sans changement de schéma, explicitement hors périmètre B2.

### 7.4 Observations hors motif (occurrences multiligne, NON couvertes par la commande du lot B2)

Détectées par recherche multiligne complémentaire — **non corrigées ici** (décision Governor requise) :

- ✅ `app/api/avoirs/[id]/route.ts:61` (`avoir.findUnique`, modèle avec `companyId`) : **corrigé le 2026-10-09** (arbitrage Governor, mandat Backend) — `findFirst({ where: { id, companyId } })` + 404 dans le handler PATCH ; garde DELETE scopée ajoutée (même route, aucun read amont) ; GET déjà scopé L17-18. Voir §7.1.
- `app/api/companies/[id]/route.ts:9` : `company.findUnique` par id de route, sans `requireCompany` — décision d'architecture (lecture de société par id).
- `app/api/users/[id]/route.ts:10`, `app/api/users/resend-invitation/route.ts:19` : `user.findUnique` scopé par permissions, pas par société — décision Governor.
- (a) déjà scopés : `app/api/bons-commande/[id]/lines/[lineId]/route.ts:114` (amont L66-67 `findFirst({ id: lineId, bonCommandeId: id, bonCommande: { companyId } })`), `lib/bon-commande/reconciliation.ts:25` (appelants déjà scopés), `app/api/user/companies/route.ts:7`, `app/api/users/me/route.ts:8`, `app/api/users/me/password/route.ts:25`, `lib/auth.ts:141`, `lib/session-cache.ts:31` (session/utilisateur courant), `app/api/payments/route.ts:138` et `:194` (`payment.findUnique` du paiement créé dans la même requête avec `companyId`).
- Hors périmètre Tiers/Product (multiligne) : `achats/route.ts:106`, `bons-commande/route.ts:85`, `clients/[id]/detail/route.ts:14`, `invoices/route.ts:157`, `quotes/[id]/convert/route.ts:66`, `quotes/route.ts:117`, `lib/check-client-blocage.ts:12`, `lib/stock-utils.ts:167`, routes `products/*` (6).

---

*Document généré par le Governor Agent le 2026-09-06. Mis à jour le 2026-09-06 après implémentation des badges visuels. §7 ajouté le 2026-10-09 par le Backend Agent (lot B2 isolation multi-société des paiements).*
