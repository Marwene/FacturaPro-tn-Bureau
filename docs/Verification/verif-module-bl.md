# Rapport d'Audit — Module Bons de Livraison (Delivery Notes)

**Date:** 2026-09-16  
**Module:** Bons de Livraison (BL)  
**Agent:** Governor Agent

---

## Résumé Exécutif

Le module Bons de Livraison est fonctionnellement complet avec un CRUD opérationnel, un Optimistic UI implémenté sur les 3 mutations principales, et une intégration propre avec les modules Stock, Factures, et Exports. Cependant, **2 problèmes de conformité CODE RULES** et **2 observations fonctionnelles** nécessitent une attention.

| Critère | Statut | Notes |
|---------|--------|-------|
| CRUD Complet | ✅ | CREATE, READ, UPDATE, DELETE, CONVERT |
| Optimistic UI | ✅ | 3 mutations avec rollback |
| Toasts Enrichis | ⚠️ | Basiques — pas de descriptions ni d'actions (vs Devis) |
| apiRoute Wrapper | ✅ | 2/2 routes utilisent le wrapper |
| Zustand Stores | ✅ | 2 stores typés (list + form) |
| TanStack Query | ✅ | Hooks pour list, detail, mutations |
| CODE RULES | ❌ | 1 violation `any` détectée |

---

## 1. Évaluation CRUD

### 1.1 Opérations CRUD

| Opération | Endpoint | Statut | Notes |
|-----------|----------|--------|-------|
| **CREATE** | `POST /api/bons-livraison` | ✅ | Valide avec `blSchema`, vérifie blocage client, génère numéro auto |
| **READ List** | `GET /api/bons-livraison` | ✅ | Recherche, filtre statut, pagination, stats agrégées |
| **READ Detail** | `GET /api/bons-livraison/[id]` | ✅ | Inclut tiers, lignes avec produits, tri par ordre |
| **UPDATE Status** | `PATCH /api/bons-livraison/[id]` | ✅ | Change statut + gestion stock (SORTIE/ENTREE) |
| **DELETE** | `DELETE /api/bons-livraison/[id]` | ✅ | Suppression physique |
| **CONVERT** | `POST /api/invoices` (via hook) | ✅ | Conversion BL → Facture avec mapping lignes |

### 1.2 Détails CREATE

- **Validation Zod** : `blSchema` dans `lib/schemas.ts` (lignes 175-194)
- **Génération numéro** : `nextNumber("bl", prefix, companyId)` avec préfixe société
- **Vérification blocage client** : `assertClientNonBloque(tiersId)` avant création
- **Calculs** : Big.js pour HT, TVA, FODEC, TTC — precision correcte
- **Multi-devises** : Calcul `montantTND` si devise ≠ TND
- **Création atomique** : BL + lignes dans une seule transaction Prisma

### 1.3 Détails UPDATE (Status)

- **Transitions supportées** : BROUILLON → LIVRE, LIVRE → ANNULE, ANNULE → BROUILLON
- **Gestion stock** : 
  - BROUILLON → LIVRE : Crée mouvements SORTIE
  - LIVRE → ANNULE : Crée mouvements ENTREE (annulation)
- **Optimistic UI** : Mise à jour immédiate du cache detail + liste

### 1.4 Détails CONVERT (BL → Facture)

- **Chargement détail** : Récupère lignes complètes avant conversion
- **Mapping** : Lignes BL → lignes facture avec préservation attributs
- **BL Visé** : Force `tauxTVA: 0`, transfère infos douane (SN, poids, colis)
- **Notes** : Ajoute "Converti depuis le BL XXX" automatiquement

---

## 2. Optimistic UI

### 2.1 Mutations avec Optimistic Update

| Mutation | Optimistic | Rollback | Invalidation | Statut |
|----------|------------|----------|--------------|--------|
| `createBL` | ✅ Ajout temp en tête de liste | ✅ Restore previous | ✅ list + dashboard | Complet |
| `updateStatus` | ✅ Mise à jour detail + liste | ✅ Restore both | ✅ list + dashboard | Complet |
| `deleteBL` | ✅ Suppression de la liste | ✅ Restore previous | ✅ list + dashboard | Complet |
| `convertToInvoice` | ❌ Pas d'optimistic | N/A | ✅ invoices + list + dashboard | Acceptable |

### 2.2 Implémentation Détails

**createBL** (`hooks/use-bl.ts`, lignes 102-165) :
- Crée un objet `optimisticBL` avec ID temporaire `temp-${Date.now()}`
- Ajoute en tête de liste avec statut BROUILLON
- Incrémente les compteurs stats (total + 1, brouillons + 1)
- Rollback complet sur erreur

**updateStatus** (`hooks/use-bl.ts`, lignes 167-216) :
- Met à jour le cache detail avec le nouveau statut
- Met à jour la liste en filtrant l'élément modifié
- Rollback des deux caches sur erreur

**deleteBL** (`hooks/use-bl.ts`, lignes 218-248) :
- Filtre l'élément supprimé de la liste
- Rollback sur erreur

---

## 3. Toasts de Notifications

### 3.1 Inventaire des Toasts

| Fichier | Toast | Type | Description | Action |
|---------|-------|------|-------------|--------|
| `nouveau-bl-actions.tsx:76` | "Veuillez sélectionner un client" | error | ✅ | ❌ |
| `nouveau-bl-actions.tsx:80` | "Ajoutez au moins une ligne" | error | ✅ | ❌ |
| `nouveau-bl-actions.tsx:90` | "Bon de livraison créé" | default | ❌ | ❌ |
| `nouveau-bl-actions.tsx:94` | err.message | error | ✅ | ❌ |
| `nouveau-bl-actions.tsx:105` | "BL et Facture créés" | default | ❌ | ❌ |
| `nouveau-bl-actions.tsx:109` | "Erreur lors de la création" | error | ✅ | ❌ |
| `bl-detail-client.tsx:53` | "Bon de livraison marqué comme livré" | default | ❌ | ❌ |
| `bl-detail-client.tsx:62` | "Bon de livraison annulé" | default | ❌ | ❌ |
| `bl-detail-client.tsx:70` | "Bon de livraison supprimé" | default | ❌ | ❌ |
| `bl-client.tsx:106` | "Bon de livraison supprimé" | default | ❌ | ❌ |
| `bl-client.tsx:114` | "Facture créée depuis le BL ${bl.numero}" | default | ❌ | ❌ |
| `bl-client.tsx:117` | err.message | error | ✅ | ❌ |
| `bl-client.tsx:147` | "Bon de livraison marqué comme livré" | default | ❌ | ❌ |
| `bl-client.tsx:160` | "Bon de livraison repassé en brouillon" | default | ❌ | ❌ |
| `bl-client.tsx:173` | "Bon de livraison annulé" | default | ❌ | ❌ |

**Total : 15 toasts** — 0 avec `toast.success()`, 0 avec description sur les succès, 0 avec action buttons.

### 3.2 Comparaison avec Module Devis

Le module Devis utilise des toasts enrichis :

```tsx
// Devis (enrichi)
toast.success("Devis créé", {
    description: `Devis ${data.quote.numero} créé avec succès`,
    action: {
        label: "Voir",
        onClick: () => router.push(`/devis/${data.quote.id}`),
    },
});

// BL (actuel — basique)
toast("Bon de livraison créé");
```

**Écart constaté** : Les toasts BL manquent de :
- `toast.success()` au lieu de `toast()` pour les succès
- `description` avec le numéro du BL créé
- `action` avec bouton "Voir" pour naviguer vers le détail

---

## 4. API Routes

### 4.1 wrapper apiRoute

| Route | Handler | Permissions | wrapper apiRoute | Statut |
|-------|---------|-------------|------------------|--------|
| `POST /api/bons-livraison` | `bonsLivraison:creer` | `requireCompany` | ✅ | Conforme |
| `GET /api/bons-livraison` | `bonsLivraison:voir` | `requireCompany` | ✅ | Conforme |
| `GET /api/bons-livraison/[id]` | `bonsLivraison:voir` | `requireCompany` | ✅ | Conforme |
| `PATCH /api/bons-livraison/[id]` | `bonsLivraison:modifier` | `requireCompany` | ✅ | Conforme |
| `DELETE /api/bons-livraison/[id]` | `bonsLivraison:supprimer` | `requireCompany` | ✅ | Conforme |

### 4.2 Validation

- **Schéma Zod** : `blSchema` pour la création
- **Validation status** : Array `["BROUILLON", "LIVRE", "ANNULE"]` pour PATCH
- **Vérification companyId** : Présente dans toutes les routes

### 4.3 Gestion d'Erreurs

- Erreurs Prisma catchées et transformées en réponses JSON propres
- Messages d'erreur explicites pour l'utilisateur
- Status codes appropriés (400, 404, 500)

---

## 5. State Management

### 5.1 Zustand Stores

| Store | Fichier | Champs | Statut |
|-------|---------|--------|--------|
| `useBLListStore` | `lib/stores/bl-store.ts` | searchInput, searchQuery, statusFilter, deleteTarget, converting | ✅ Typé |
| `useBLFormStore` | `lib/stores/bl-store.ts` | tiersId, dateCreation, dateLivraison, notes, lines, blViseActif, ... | ✅ Typé |

**Notes** :
- `setTiersId()` reset les champs BL Visé quand le client change — logique métier correcte
- Utilise `crypto.randomUUID()` pour les IDs temporaires (client-only, correct)

### 5.2 TanStack Query Hooks

| Hook | Fichier | Type | Statut |
|------|---------|------|--------|
| `useBLSearchDebounce()` | `hooks/use-bl.ts` | UI (debounce) | ✅ |
| `useBLList()` | `hooks/use-bl.ts` | Query (list) | ✅ |
| `useBLDetail(id)` | `hooks/use-bl.ts` | Query (detail) | ✅ |
| `useBLTauxBCT(devise)` | `hooks/use-bl.ts` | Query (exchange rate) | ✅ |
| `useBLMutations()` | `hooks/use-bl.ts` | Mutations (4) | ✅ |

**Query Keys** :
- `bls(search, status, companyId)` — Liste
- `bl(id, companyId)` — Détail
- `dashboard(companyId)` — Dashboard

---

## 6. Composants

### 6.1 Inventaire

| Composant | Fichier | Lignes | Rôle |
|-----------|---------|--------|------|
| `BLClient` | `bl-client.tsx` | 263 | Liste + KPI + actions ligne |
| `NouveauBLClient` | `nouveau-bl-client.tsx` | 248 | Formulaire création |
| `NouveauBLActions` | `nouveau-bl-actions.tsx` | 146 | Boutons actions création |
| `BLFormVise` | `bl-form-vise.tsx` | 79 | Section BL Visé (douane) |
| `BLFormLines` | `bl-form-lines.tsx` | 191 | Éditeur lignes |
| `BLDetailClient` | `bl-detail-client.tsx` | 211 | Vue détail |
| `BLDetailActions` | `bl-detail-actions.tsx` | 96 | Barre actions détail |
| `BLDetailSidebar` | `bl-detail-sidebar.tsx` | 171 | Sidebar récapitulatif |
| `BLDetailSkeleton` | `bl-detail-skeleton.tsx` | 26 | Loading skeleton |

**Total : 9 composants** — Architecture propre, séparation des responsabilités.

### 6.2 Layout Détail

- **Grille 70/30** : Colonne principale (infos + lignes) / Sidebar (récap + client)
- **KPI Cards** : 3 cartes (Total HT, TVA, Total TTC)
- **Actions** : Toolbar sticky avec boutons contextuels selon statut

---

## 7. Intégrations Externes

| Module | Type d'intégration | Statut |
|--------|-------------------|--------|
| **Stock** | `handleSaleStockMovement("bl", ...)` | ✅ |
| **Factures** | Conversion BL → Facture | ✅ |
| **Exports** | Champs `quantiteBL`, `dateBL` | ✅ |
| **Bon de Commande** | BC → BL possible | ✅ |
| **Dashboard** | Stats agrégées | ✅ |
| **Navigation** | Sidebar + palette commandes | ✅ |

---

## 8. Conformité CODE RULES

### 8.1 Violations Détectées

| # | Sévérité | Fichier | Ligne | Problème |
|---|----------|---------|-------|----------|
| 1 | **MOYEN** | `nouveau-bl-actions.tsx` | 102 | `(result as any)?.deliveryNote` — cast `any` explicite |
| 2 | **FAIBLE** | `hooks/use-bl.ts` vs `hooks/use-delivery-notes-queries.ts` | — | Hooks dupliqués avec clés de cache différentes (`"delivery-notes"` vs `"deliveryNotes"`) |

### 8.2 Détail Violation #1

```tsx
// Actuel (NON-CONFORME)
const result = await createBL.mutateAsync(buildPayload(form.blViseActif));
const bl = (result as any)?.deliveryNote;

// Correction recommandée
const result = await createBL.mutateAsync(buildPayload(form.blViseActif));
const bl = result?.deliveryNote; // Type inféré correctement
```

Le type de retour de `createBL.mutateAsync` devrait être typé pour éviter le cast `any`.

### 8.3 Détail Violation #2

Deux hooks implémentent les mêmes requêtes :
- `hooks/use-bl.ts` : Hook principal avec optimistic UI (clés: `"delivery-notes"`)
- `hooks/use-delivery-notes-queries.ts` : Hook legacy sans optimistic UI (clés: `"deliveryNotes"`)

**Risque** : Fragmentation du cache, confusion pour les développeurs.

---

## 9. Observations Fonctionnelles

| # | Sévérité | Description |
|---|----------|-------------|
| 1 | **MOYEN** | **Pas de garde serveur pour suppression BL LIVRE** — La route `DELETE /api/bons-livraison/[id]` ne vérifie pas le statut. Un appel API direct pourrait supprimer un BL livré sans annulation de stock. La garde est uniquement côté UI (`bl-detail-actions.tsx`). |
| 2 | **FAIBLE** | **Type hack SN_VISE** — `"SN_VISE" as DeliveryNoteStatus` dans `bl-client.tsx:91` pour l'affichage du badge. `SN_VISE` n'est pas une valeur valide de `DeliveryNoteStatus`. |
| 3 | **INFO** | **Mutations séquentielles dans handleSaveBoth** — Si `convertToInvoice` échoue après `createBL` réussi, le BL existe mais pas la facture. L'utilisateur reçoit un toast d'erreur mais le BL est orphelin. |

---

## 10. Inventaire Fichiers

| Catégorie | Count | Fichiers |
|-----------|-------|----------|
| Modèles Prisma | 2 | `BonLivraison`, `BonLivraisonLine` |
| Définitions types | 1 | `lib/types/delivery-note.ts` |
| Définitions enums | 1 | `lib/types/enums.ts` |
| Schéma Zod | 1 | `lib/schemas.ts` (lignes 175-194) |
| Stores Zustand | 1 | `lib/stores/bl-store.ts` (2 stores) |
| Hooks custom | 2 | `hooks/use-bl.ts`, `hooks/use-delivery-notes-queries.ts` |
| Routes API | 2 | `app/api/bons-livraison/route.ts`, `app/api/bons-livraison/[id]/route.ts` |
| Routes pages | 3 | `page.tsx`, `nouveau/page.tsx`, `[id]/page.tsx` |
| Composants | 9 | Voir section 6.1 |
| Libs helpers | 3 | `lib/calc-line-totals.ts`, `lib/check-client-blocage.ts`, `lib/stock-utils.ts` |
| **Total fichiers BL** | **25** | |

---

## 11. Recommandations

### Priorité Haute

1. **Corriger le cast `any`** dans `nouveau-bl-actions.tsx:102`
   - Typer correctement le retour de `createBL.mutateAsync()`
   - Impact : Conformité CODE RULES

2. **Supprimer le hook dupliqué** `hooks/use-delivery-notes-queries.ts`
   - Vérifier qu'aucun composant ne l'importe
   - Supprimer la réexport dans `hooks/use-queries.ts`
   - Impact : Propreté du code, éviter confusion

### Priorité Moyenne

3. **Enrichir les toasts** avec descriptions et actions (comme module Devis)
   - Ajouter `toast.success()` avec description incluant le numéro BL
   - Ajouter bouton "Voir" pour navigation directe
   - Impact : UX

4. **Ajouter garde serveur** pour suppression BL LIVRE
   - Vérifier statut avant suppression dans `DELETE /api/bons-livraison/[id]`
   - Retourner 400 si statut = LIVRE
   - Impact : Intégrité données

### Priorité Basse

5. **Corriger le type hack SN_VISE**
   - Étendre le type ou utiliser une valeur valide pour le badge
   - Impact : Propreté typage

---

## 12. Vérifications Techniques

- **TypeScript** : `npx tsc --noEmit` — 0 erreurs
- **ESLint** : `npx eslint` — 0 erreurs, warnings mineurs
- **Prisma** : `npx prisma migrate status` — Pas de drift

---

## Conclusion

Le module Bons de Livraison est **fonctionnellement complet** avec un CRUD solide, un Optimistic UI bien implémenté, et des intégrations propres avec les modules Stock et Factures. 

**Non-conformité CODE RULES** : 1 violation `any` détectée (priorité haute).  
**Amélioration UX** : Les toasts sont fonctionnels mais basiques comparés au module Devis.  
**Sécurité** : Garde serveur manquante pour suppression BL livré.

**Statut global** : ⚠️ **Conforme avec réserves** — nécessite correction du `any` avant validation finale.
