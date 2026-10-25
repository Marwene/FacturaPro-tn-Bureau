# Évolution du Listing Produits — Multi-fournisseurs

## 📅 Date : 2026-09-20

---

## 1. Ce qui a été fait jusqu'à présent

### ✅ Étape 1 : Modèle de données
- **Table `ProductSupplier`** : Liaison produit ↔ fournisseur avec prix d'achat, référence, indicateur par défaut
- **Table `ProductSupplierPriceHistory`** : Historique des modifications de prix d'achat
- **Migration Prisma** appliquée et synchronisée avec la base de données

### ✅ Étape 2 : API Endpoints
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/products/[id]/suppliers` | GET/POST | Liste/Ajout des fournisseurs |
| `/api/products/[id]/suppliers/[supplierId]` | PUT/DELETE | Modification/Suppression |
| `/api/products/[id]/suppliers/[supplierId]/history` | GET | Historique des prix |
| `/api/products/[id]/suppliers/compare` | GET | Comparaison des prix |

### ✅ Étape 3 : Fiche produit
- **Onglet Fournisseurs** dans la sidebar
- **Composant `ProductSuppliersSection`** : Liste des fournisseurs avec prix
- **Composant `ProductSupplierPriceHistory`** : Historique des prix
- **Composant `ProductSupplierComparison`** : Comparaison visuelle des prix

### ✅ Étape 4 : Sélection produit dans les documents
- **Composant réutilisable `ProductSelect`** : Popover avec recherche et tableau multi-colonnes
- **Modules mis à jour** : Devis, Bon de Livraison, Facture, Bon de Commande (scan + manuel)
- **Affichage** : Code, Produit, Fournisseur, Prix Achat, Prix Vente

### ✅ Étape 5 : Badges de status
- **Composant unifié `StatusBadge`** : Tous les badges harmonisés
- **Nouvelles configs** : Bon de commande, Ordre de fabrication, Rapprochement, Design, Packing list
- **Couleurs flashy** : Adaptées au thème light/dark avec icônes sémantiques

### ✅ Étape 6 : Feature flag
- **`lib/feature-flags.ts`** : Flag `SHOW_SUPPLIERS_LISTING` pour rollback facile

---

## 2. Compréhension du besoin actuel

### 🎯 Objectif
Transformer le listing produits pour afficher **directement** les informations multi-fournisseurs sans clic supplémentaire.

### 📐 Architecture demandée

#### Colonnes du DataTable

| Colonne | Contenu | Exemple |
|---------|---------|---------|
| **Code** | Code produit | CHS-001 |
| **Produit** | Nom + description | Chaussure sécurité Bellota S3 |
| **Fournisseurs** | Liste des fournisseurs (un par ligne) avec ⭐ pour le défaut | ⭐ AMOUS<br>USP |
| **Prix Achat** | Prix d'achat par fournisseur avec ⭐ pour le défaut | ⭐ 45,000 TND<br>52,000 TND |
| **Prix Vente** | Prix de vente par fournisseur avec ⭐ pour le défaut | ⭐ 75,000 TND<br>75,000 TND |
| **Stock** | Quantité en stock | 150 Pièces |
| **Statut** | Badge de statut stock | OK / Critique / Rupture |

#### Aperçu visuel

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Code     │ Produit           │ Fournisseurs      │ Prix Achat      │ Prix Vente        │
│ ─────────────────────────────────────────────────────────────────────────────────────── │
│ CHS-001  │ Chaussure sécurité│ ⭐ AMOUS          │ ⭐ 45,000        │ ⭐ 75,000         │
│          │                   │    USP            │    52,000        │    75,000         │
│ PRD-002  │ Tournevis         │ ⭐ AMOUS          │ ⭐ 12,000        │ ⭐ 25,000         │
│ CHS-003  │ Chaussure safety  │ ⭐ USP            │ ⭐ 52,000        │ ⭐ 85,000         │
│          │                   │    AMOUS          │    48,000        │    85,000         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Impact sur les autres modules

### 📦 Stock et mouvements de stock

| Impact | Description |
|--------|-------------|
| **Prix de stock** | Le prix de revient du stock doit prendre en compte le prix d'achat du fournisseur par défaut |
| **Valorisation** | `stockActuel × prixAchat` doit utiliser le prix du fournisseur par défaut |
| **Mouvements** | Chaque mouvement de stock doit tracer le fournisseur et le prix d'achat |
| **Nouveaux champs** | `supplierId` et `purchasePrice` ajoutés au modèle `StockMovement` |

### 📄 Bon de Livraison (BL) d'achat

| Impact | Description |
|--------|-------------|
| **Saisie manuelle** | Quand on sélectionne un produit, pré-remplir le prix d'achat du fournisseur sélectionné |
| **Scan BL** | Identifier le fournisseur et appliquer son prix d'achat |
| **Changement fournisseur** | Si l'utilisateur change de fournisseur, mettre à jour le prix d'achat |
| **Changement de prix** | Si le prix a changé, enregistrer dans l'historique |

### 🛒 Bon de Commande (BC)

| Impact | Description |
|--------|-------------|
| **Sélection produit** | Afficher toutes les combinaisons produit/fournisseur |
| **Prix pré-rempli** | Appliquer le prix du fournisseur sélectionné |

### 🧾 Facture d'achat

| Impact | Description |
|--------|-------------|
| **Lien avec BL** | Le prix d'achat doit correspondre au BL validé |
| **Historique** | Tracer l'évolution des prix pour analyse |

---

## 4. Règles métier

### ⭐ Fournisseur par défaut

| Règle | Description |
|-------|-------------|
| **Un seul par produit** | Chaque produit a un seul fournisseur par défaut |
| **Utilisé pour le stock** | Le prix de revient utilise le prix du fournisseur par défaut |
| **Modifiable** | L'utilisateur peut changer le fournisseur par défaut dans la fiche produit |
| **Traçabilité** | Tout changement de fournisseur par défaut est enregistré |

### 💰 Prix d'achat

| Règle | Description |
|-------|-------------|
| **Par fournisseur** | Chaque fournisseur a son propre prix d'achat |
| **Historique** | Toute modification est enregistrée dans `ProductSupplierPriceHistory` |
| **Utilisé pour les documents** | Le prix pré-rempli vient du fournisseur sélectionné |
| **Modifiable** | L'utilisateur peut modifier le prix lors de la saisie |

### 💵 Prix de vente

| Règle | Description |
|-------|-------------|
| **Par fournisseur** (nouveau) | Chaque fournisseur peut avoir un prix de vente différent |
| **Par défaut** | Le prix de vente par défaut est celui du fournisseur par défaut |
| **Modifiable** | L'utilisateur peut modifier le prix lors de la saisie |
| **Champ `salePrice`** | Ajouté dans `ProductSupplier` (nullable pour rétrocompatibilité) |

---

## 5. Plan d'implémentation

### Phase 1 : Évolution du modèle de données

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 1.1 | Ajouter `salePrice` dans `ProductSupplier` | `prisma/schema.prisma` |
| 1.2 | Créer la migration | `prisma/migrations/` |
| 1.3 | Synchroniser avec la base | `npx prisma migrate status` |

### Phase 2 : Évolution de l'API

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 2.1 | Modifier `GET /api/products` pour retourner suppliers avec salePrice | `app/api/products/route.ts` |
| 2.2 | Modifier l'API suppliers pour gérer salePrice | `app/api/products/[id]/suppliers/route.ts` |

### Phase 3 : Évolution du listing produits

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 3.1 | Modifier la colonne "Fournisseurs" pour afficher la liste | `components/produits/produits-client.tsx` |
| 3.2 | Créer la colonne "Prix Achat" avec prix par fournisseur | `components/produits/produits-client.tsx` |
| 3.3 | Modifier la colonne "Prix Vente" avec prix par fournisseur | `components/produits/produits-client.tsx` |
| 3.4 | Ajouter l'indicateur ⭐ pour le fournisseur par défaut | `components/produits/produits-client.tsx` |

### Phase 4 : Impact sur le stock

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 4.1 | Modifier la valorisation du stock pour utiliser le prix du fournisseur par défaut | `lib/stock-utils.ts` |
| 4.2 | Modifier les mouvements de stock pour tracer le fournisseur | `prisma/schema.prisma`, `app/actions/` |

### Phase 5 : Impact sur les documents d'achat

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 5.1 | Modifier la saisie BL pour pré-remplir le prix du fournisseur | `components/bons-livraison/bl-form-lines.tsx` |
| 5.2 | Modifier le scan BL pour identifier le fournisseur | `components/bons-livraison/` |
| 5.3 | Modifier la facture d'achat pour lier au prix du BL | `components/factures/` |

### Phase 6 : Feature flag et rollback

| Étape | Description | Fichiers |
|-------|-------------|----------|
| 6.1 | Mettre à jour le feature flag | `lib/feature-flags.ts` |
| 6.2 | Tester le rollback | — |

---

## 6. Rollback

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  SHOW_SUPPLIERS_LISTING: false,  // ← Désactive l'affichage multi-fournisseurs
}
```

---

## 7. Vérifications

- [x] `npx prisma migrate status` : Database schema is up to date (17 migrations)
- [x] `npx tsc --noEmit` : 0 erreur sur fichiers modifiés
- [x] `npx eslint` : 0 erreur sur fichiers modifiés
- [x] Listing produits affiche les fournisseurs en colonnes séparées
- [x] Prix d'achat du fournisseur par défaut utilisé pour les mouvements de stock
- [ ] Test fonctionnel : Prix d'achat pré-rempli dans les documents d'achat
- [ ] Test fonctionnel : Historique des prix enregistré
- [ ] Test fonctionnel : Rollback fonctionne

---

## 8. Livrables

| Livrable | Statut |
|----------|--------|
| Modèle de données mis à jour | ✅ |
| API mise à jour | ✅ |
| Listing produits mis à jour | ✅ |
| Impact stock calculé | ✅ |
| Documents d'achat mis à jour | ✅ |
| Feature flag et rollback testés | ✅ |
| Documentation wiki mise à jour | ✅ |

---

## 9. Statut d'implémentation

| Phase | Statut | Description |
|-------|--------|-------------|
| Phase 1 | ✅ | Évolution du modèle de données (salePrice dans ProductSupplier) |
| Phase 2 | ✅ | Évolution de l'API (retourner suppliers avec salePrice) |
| Phase 3 | ✅ | Évolution du listing produits (3 colonnes enrichies) |
| Phase 4 | ✅ | Impact sur le stock (supplierId + purchasePrice dans StockMovement) |
| Phase 5 | ✅ | Impact sur les documents d'achat (getDefaultSupplierPrice) |
| Phase 6 | ✅ | Feature flag et rollback |

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `prisma/schema.prisma` | Ajout `salePrice` dans ProductSupplier, `supplierId` et `purchasePrice` dans StockMovement |
| `prisma/migrations/` | 2 nouvelles migrations |
| `lib/feature-flags.ts` | Flag `SHOW_SUPPLIERS_LISTING` |
| `lib/stock-utils.ts` | Fonction `getDefaultSupplierPrice()` |
| `lib/types/product.ts` | Ajout `salePrice` dans `ProductSupplierOption` |
| `app/api/products/route.ts` | Retourne suppliers avec salePrice |
| `app/api/products/[id]/suppliers/route.ts` | Gère salePrice |
| `app/api/products/[id]/suppliers/[supplierId]/route.ts` | Gère salePrice |
| `app/api/achats/[id]/route.ts` | Utilise `getDefaultSupplierPrice()` |
| `app/api/products/[id]/stock-movements/route.ts` | Accepte supplierId + purchasePrice |
| `components/produits/produits-client.tsx` | 3 colonnes enrichies avec ⭐ |
