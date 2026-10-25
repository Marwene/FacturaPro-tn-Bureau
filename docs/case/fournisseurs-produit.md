# Cas d'usage : Produits multi-fournisseurs

## 📋 Contexte

Un même produit peut être acheté chez différents fournisseurs à des prix d'achat totalement différents.

**Exemple concret :**
- Produit : "Chaussure de sécurité Bellota S3"
- Fournisseur AMOUS → prix d'achat : 45,000 TND
- Fournisseur USP → prix d'achat : 52,000 TND

---

## ❌ Problème actuel

### Modèle de données existant

```prisma
model Product {
  id            String   @id @default(cuid())
  code          String   @unique
  nom           String
  description   String?
  prixAchat     Decimal  @default(0) @db.Decimal(19, 4)  // UN SEUL prix d'achat
  prixVenteHT   Decimal  @default(0) @db.Decimal(19, 4)
  // ... autres champs
}
```

### Limites

| Problème | Impact |
|----------|--------|
| Un seul `prixAchat` par produit | Impossible de stocker les prix de plusieurs fournisseurs |
| Pas de lien Product ↔ Fournisseur | On ne sait pas quel fournisseur propose quel prix |
| Pas de référence fournisseur | Le code fournisseur pour ce produit n'est pas stocké |
| Prix en dur dans le produit | Le prix varie selon le fournisseur, pas selon le produit |

---

## ✅ Solution retenue : Table de liaison `ProductSupplier`

### Nouveau modèle Prisma

```prisma
model ProductSupplier {
  id            String   @id @default(cuid())
  productId     String
  supplierId    String   // référence Tiers (fournisseur)
  purchasePrice Decimal  @db.Decimal(19, 4)  // prix d'achat chez CE fournisseur
  reference     String?  // référence/réf. fournisseur pour ce produit
  isDefault     Boolean  @default(false)     // fournisseur par défaut
  actif         Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier      Tiers    @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  @@unique([productId, supplierId])
  @@index([productId])
  @@index([supplierId])
}
```

### Modifications dans Product existant

```prisma
model Product {
  // ... champs existants ...
  prixAchat     Decimal  @default(0) @db.Decimal(19, 4)  // prix d'achat par défaut (gardé pour compatibilité)
  suppliers     ProductSupplier[]  // NOUVEAU : liaison avec les fournisseurs
}
```

---

## 🎯 Workflow de sélection dans les documents

### Principe

Lors de la création d'un Devis, BC, BL ou Facture, l'utilisateur recherche un produit. Les résultats affichent **toutes les combinaisons produit/fournisseur** disponibles.

### Exemple de recherche produit

```
Recherche : "chaussure bellota"

Résultats :
┌─────────────────────────────────────────────────────────────────────────────┐
│ Code      │ Produit                  │ Fournisseur │ Prix Achat │ Prix Vente│
│ ─────────────────────────────────────────────────────────────────────────── │
│ CHS-001   │ Chaussure sécurité       │ AMOUS       │ 45,000 TND │ 75,000 TND│
│ CHS-001   │ Chaussure sécurité       │ USP         │ 52,000 TND │ 75,000 TND│
│ CHS-002   │ Chaussure sécurité S3    │ AMOUS       │ 48,000 TND │ 80,000 TND│
└─────────────────────────────────────────────────────────────────────────────┘

→ L'utilisateur clique sur la ligne souhaitée
→ La ligne du document est remplie avec le produit + fournisseur + prix sélectionnés
```

### Avantages de cette approche

| Avantage | Description |
|----------|-------------|
| ✅ Visibilité complète | L'utilisateur voit toutes les options d'un coup |
| ✅ Comparaison directe | Les prix sont côte à côte dans les résultats |
| ✅ Sélection en un clic | Pas de étape supplémentaire de sélection fournisseur |
| ✅ Flexibilité | Peut choisir n'importe quelle combinaison produit/fournisseur |

---

## 📊 Impact sur les modules

### 1. Module Produits - Fiche produit

**Onglet "Fournisseurs" (nouveau) :**
- Liste des fournisseurs avec leurs prix d'achat
- Possibilité d'ajouter/supprimer/modifier les fournisseurs
- Indication du fournisseur par défaut
- Historique des prix (optionnel)

**Mockup UI :**

```
┌─────────────────────────────────────────────────────────────┐
│ Chaussure de sécurité Bellota S3                            │
├─────────────────────────────────────────────────────────────┤
│ [Général] [Fournisseurs] [Stock] [Variantes]                │
├─────────────────────────────────────────────────────────────┤
│ Fournisseurs                                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Fournisseur    │ Prix d'achat │ Référence    │ Par défaut│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ AMOUS          │ 45,000 TND   │ BEL-S3-AMOUS │ ✓         │ │
│ │ USP            │ 52,000 TND   │ BEL-S3-USP   │           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Ajouter un fournisseur]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Sélection produit dans les documents

**Composant de recherche produit :**

```
┌─────────────────────────────────────────────────────────────┐
│ Rechercher un produit...                                   │
├─────────────────────────────────────────────────────────────┤
│ Code      │ Produit                  │ Fourni. │ Achat │ Vente│
│ ─────────────────────────────────────────────────────────── │
│ CHS-001   │ Chaussure sécurité       │ AMOUS   │ 45,000│ 75,000│
│ CHS-001   │ Chaussure sécurité       │ USP     │ 52,000│ 75,000│
│ CHS-002   │ Chaussure sécurité S3    │ AMOUS   │ 48,000│ 80,000│
└─────────────────────────────────────────────────────────────┘
```

### 3. Ligne de document remplie

Après sélection, la ligne du document contient :
- **Produit** : Chaussure de sécurité Bellota S3
- **Fournisseur** : AMOUS (stocké pour référence)
- **Prix d'achat** : 45,000 TND (pour les documents d'achat)
- **Prix de vente** : 75,000 TND (pour les documents de vente)
- **Référence fournisseur** : BEL-S3-AMOUS (optionnel)

---

## 🔧 API endpoint proposé

### GET /api/products/search?q=chaussure&supplierId=xxx

Retourne les produits avec leurs fournisseurs et prix.

```json
{
  "results": [
    {
      "productId": "abc123",
      "code": "CHS-001",
      "nom": "Chaussure de sécurité Bellota S3",
      "prixVenteHT": 75.000,
      "suppliers": [
        {
          "productSupplierId": "def456",
          "supplierId": "ghi789",
          "supplierName": "AMOUS",
          "purchasePrice": 45.000,
          "reference": "BEL-S3-AMOUS",
          "isDefault": true
        },
        {
          "productSupplierId": "jkl012",
          "supplierId": "mno345",
          "supplierName": "USP",
          "purchasePrice": 52.000,
          "reference": "BEL-S3-USP",
          "isDefault": false
        }
      ]
    }
  ]
}
```

### POST /api/products/[id]/suppliers

Ajoute un fournisseur à un produit.

```json
{
  "supplierId": "mno345",
  "purchasePrice": 52.000,
  "reference": "BEL-S3-USP",
  "isDefault": false
}
```

---

## 📈 Avantages

| Avantage | Description |
|----------|-------------|
| ✅ Prix par fournisseur | Chaque fournisseur a son propre prix d'achat |
| ✅ Fournisseur par défaut | Pré-remplissage automatique |
| ✅ Historique | Suivi des prix dans le temps (optionnel) |
| ✅ Comparaison | Possibilité de comparer les prix |
| ✅ Références | Référence du fournisseur pour chaque produit |
| ✅ Sélection intuitive | Un seul clic pour sélectionner produit + fournisseur + prix |
| ✅ Compatibilité | L'ancien champ `prixAchat` reste pour la rétrocompatibilité |

---

## ⚠️ Points d'attention

1. **Migration** : Nécessite une migration Prisma pour ajouter la table `ProductSupplier`
2. **Données existantes** : Les produits existants avec un `prixAchat` > 0 pourraient être migrés automatiquement
3. **UI** : Le composant de recherche produit doit afficher les fournisseurs dans les résultats
4. **Performance** : Les jointures Product ↔ ProductSupplier ↔ Tiers doivent être optimisées

---

## 📝 Résumé

La solution `ProductSupplier` permet de gérer les produits multi-fournisseurs avec les fonctionnalités suivantes :

1. **Fiche produit** : onglet "Fournisseurs" pour gérer les fournisseurs et leurs prix
2. **Recherche produit** : affiche toutes les combinaisons produit/fournisseur avec leurs prix
3. **Sélection en un clic** : l'utilisateur choisit la combinaison souhaitée
4. **Historique et comparaison** : fonctionnalités optionnelles pour suivre l'évolution des prix

Cette solution est compatible avec le modèle existant et peut être implémentée progressivement.
