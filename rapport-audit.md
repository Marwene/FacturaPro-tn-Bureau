# Rapport d'Audit — FacturaPro-TN

**Date :** 31 août 2026  
**Commit audité :** `3d74df3c`  
**Auditeur :** Cline (AI Code Auditor)  
**Périmètre :** Architecture, qualité du code, performance, sécurité, base de données

---

## Résumé Exécutif

FacturaPro-TN est une application de gestion commerciale et de facturation tunisienne construite avec Next.js 15 App Router, TypeScript, PostgreSQL/Prisma, et shadcn/ui. Le projet compte **1047 fichiers**, **~1,26 million de mots de code**, **7002 nœuds AST** et **324 communautés fonctionnelles**.

L'application couvre 19 modules métier : achats, atelier, avoirs, bons de commande, bons de livraison, chèques, clients, devis, effets, entreprises, exports, factures, fournisseurs, inventaire, paiements, paramètres, POS, produits, rapports et mouvements de stock.

### Score Global

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Architecture | 7.5/10 | Bonne structure modulaire, quelques anti-patterns SSR |
| Qualité du code | 6/10 | Typage faible par endroits, duplication dans les hooks |
| Performance | 6.5/10 | Pages client-heavy, bundle JS potentiellement élevé |
| Sécurité | 7/10 | Auth présente, permissions vérifiées, clés API exposées dans le schema |
| Base de données | 8/10 | Schema solide, indexation correcte, précision décimale |
| Maintenabilité | 6.5/10 | Codebase volumineux, documentation wiki en place |

**Moyenne pondérée : 6.9/10**

---

## 1. Architecture

### 1.1 Structure du Projet

```
app/
├── (app)/          # 19 modules métier (route group authentifié)
├── (auth)/         # login, register, verify-email
├── (setup)/        # Configuration initiale
├── actions/        # 6 Server Actions
└── api/            # 35+ API Routes REST
components/         # Composants UI organisés par module
hooks/              # ~50 hooks personnalisés (TanStack Query)
lib/                # Utilitaires, schemas Zod, PDF, email, auth
prisma/             # Schema DB + migrations + seeds
docs/wiki/          # Documentation technique
```

### 1.2 Points Forts Architecturaux

- **Route Groups Next.js** : Séparation claire `(app)`, `(auth)`, `(setup)` avec layouts dédiés
- **Multi-company** : Architecture multi-société native via `companyId` sur tous les modèles métier
- **Server Actions** : Utilisation correcte pour les mutations (achats, bons-commande, companies, notifications, products, upload)
- **API Routes REST** : Endpoints cohérents par ressource avec validation des permissions
- **Hooks TanStack Query** : Cache client, invalidation automatique, états de chargement
- **Component Library** : shadcn/ui intégré avec composants customisés par module

### 1.3 Problèmes Architecturaux Identifiés

#### P1 — Pages marquées `"use client"` au niveau page (Impact: HAUT)

Les pages suivantes sont entièrement rendues côté client, empêchant le streaming SSR et augmentant le bundle JS :

- `app/(app)/entreprises/page.tsx`
- `app/(app)/rapports/page.tsx`
- `app/(app)/fournisseurs/page.tsx`
- `app/(app)/exports/page.tsx`
- `app/(app)/parametres/securite/page.tsx`
- `app/(app)/parametres/profil/page.tsx`
- `app/(app)/parametres/entreprises/page.tsx`
- `app/(app)/parametres/entreprises/[id]/page.tsx`
- `app/(app)/parametres/entreprises/[id]/banques/page.tsx`
- `app/(app)/parametres/app/utilisateurs/page.tsx`
- `app/(app)/parametres/app/facturation/page.tsx`
- `app/(app)/parametres/app/ngp/page.tsx`
- `app/(app)/parametres/app/general/page.tsx`

**Recommandation :** Adopter le pattern Server Component + Client Component déjà utilisé par d'autres modules (ex: `factures/page.tsx` → `facture-detail-client.tsx`). La page devrait être un Server Component qui fetch les données et passe les props à un composant client.

#### P2 — Server Actions limitées (Impact: MOYEN)

Seulement 6 fichiers de Server Actions pour 19 modules métier. La majorité des mutations passent par des API Routes REST, ce qui ajoute un overhead réseau et complexifie la gestion d'état optimiste.

**Recommandation :** Migrer progressivement les mutations critiques vers des Server Actions pour bénéficier du progressive enhancement et de la simplification du cache.

#### P3 — Pas de middleware de protection global visible (Impact: MOYEN)

La vérification des permissions semble faite manuellement dans chaque route/action via `checkPermission()`. Un middleware Next.js centraliserait la protection des routes `(app)/`.

---

## 2. Qualité du Code

### 2.1 Typage TypeScript

#### Usage de `any` — 41 occurrences détectées

**Catégorie A — Session user non typé (6 occurrences)**
```typescript
// app/actions/products.ts
(session.user as any).role
(session.user as any).permissions
```
**Recommandation :** Créer un type `SessionUser` étendant le type NextAuth et l'utiliser globalement.

**Catégorie B — Types de retour API non typés dans les hooks (~20 occurrences)**
```typescript
// hooks/use-ordres-fabrication.ts
return res.json() as Promise<{ ordres: any[] }>
// hooks/use-packing-list.ts
return res.json() as Promise<{ packingLists: any[] }>
// hooks/use-matieres-premieres.ts
return res.json() as Promise<{ matieres: any[] }>
```
**Recommandation :** Définir des interfaces de réponse API partagées dans `lib/types/` et les réutiliser dans les hooks.

**Catégorie C — Transaction Prisma non typée**
```typescript
// lib/stock-utils.ts
async function recalculateStockStatusTx(tx: any, productId: string)
```
**Recommandation :** Utiliser le type `Prisma.TransactionClient` fourni par le client Prisma généré.

**Catégorie D — Customizer layer.data non typé**
```typescript
// lib/customizer/export/production-export.ts
(layer.data as any).src
```
**Recommandation :** Définir une union type discriminée pour les layers du customizer.

### 2.2 Patterns de Code

#### Hook Pattern Cohérent
Les hooks suivent un pattern uniforme avec TanStack Query :
- `useXxxQueries.ts` — queries (getList, getDetail)
- `useXxx.ts` — mutations (create, update, delete)
- Séparation propre entre lecture et écriture

#### Validation Zod
Schemas Zod présents dans `lib/schemas/` et `lib/schemas.ts` pour la validation des entrées. Bonne pratique.

#### Error Handling
Pattern consistant dans les hooks :
```typescript
if (!res.ok) throw new Error("Erreur chargement")
```
Certains hooks ont un error handling plus détaillé :
```typescript
if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
```
**Recommandation :** Standardiser sur le pattern détaillé partout et créer une classe d'erreur custom `ApiError`.

### 2.3 Duplication

- **Permissions check** : `(session.user as any).role` / `.permissions` répété 6+ fois dans `app/actions/products.ts`
- **Error messages** : `"Erreur chargement"` dupliqué dans ~20 hooks sans contextualisation
- **Decimal formatting** : Logique de formatage décimal probablement dupliquée entre modules facture/devis/avoirs/BC/BL

---

## 3. Performance

### 3.1 Rendu Côté Client Excessif

266 fichiers contiennent `"use client"`. Bien que beaucoup soient des composants UI interactifs (normal), les 13 pages listées en §1.3 forcent un rendu 100% client.

**Impact estimé :**
- TTFB dégradé (pas de streaming HTML)
- Bundle JS initial élevé (React + logique métier téléchargée avant affichage)
- LCP/FCP pénalisés sur connexion lente

### 3.2 Data Fetching

- **TanStack Query** : Bonne utilisation du cache client avec staleTime/refetchInterval
- **Pas de prefetching serveur visible** : Les données ne sont pas préchargées dans les Server Components
- **N+1 potentiel** : Certaines listes avec détails (clients avec devis/factures/avoirs) pourraient nécessiter des requêtes agrégées

### 3.3 Bundle Size

Dépendances lourdes identifiées :
- **Three.js** (`three`, `@react-three/fiber`, `@react-three/drei`) — Customizer 3D
- **Recharts** — Graphiques dashboard/rapports
- **jspdf + jspdf-autotable** — Génération PDF client-side
- **xlsx** — Export Excel
- **lucide-react** — Icônes (tree-shakeable)

**Recommandation :** Vérifier le dynamic import de Three.js et Recharts pour éviter leur inclusion dans le bundle initial.

### 3.4 Images et Assets

- Upload de logos (`company-logo-upload`, `product-photo-upload`)
- Pas de configuration `next/image` remote patterns visible dans `next.config.ts`
- Pas de stratégie d'optimisation d'images documentée

---

## 4. Sécurité

### 4.1 Authentification

- NextAuth.js avec provider credentials
- Modèle `accounts` + `user` avec relations
- Sessions avec expiration
- Vérification d'email (`verify-email`)

### 4.2 Autorisation

- Système de permissions matriciel (`permissions-matrix.tsx`)
- Vérification `checkPermission(role, permissions, resource:action)` dans les API routes et Server Actions
- Rôle utilisateur par entreprise (`user_companies`)

### 4.3 Données Sensibles

#### P4 — Clés API dans le schema Prisma (Impact: HAUT)
```prisma
model app_settings {
  openaiApiKey    String? @default("")
  geminiApiKey    String? @default("")
  mistralApiKey   String? @default("")
  openrouterApiKey String? @default("")
}
```
Les clés API IA sont stockées en clair dans la base de données. Bien que le schema Prisma ne contienne pas les valeurs réelles, cette architecture expose les clés via toute query `app_settings.findFirst()`.

**Recommandation :** Stocker les clés API dans des variables d'environnement serveur uniquement, jamais dans la base de données accessible côté client.

### 4.4 Validation des Entrées

- Schemas Zod utilisés pour la validation
- Protection contre les injections SQL via Prisma ORM (parameterized queries)
- Pas de sanitization XSS explicite visible (Next.js escape par défaut dans JSX)

### 4.5 CORS et Headers

- `next.config.ts` contient des configurations de headers CSP
- API routes protégées par vérification de session

---

## 5. Base de Données

### 5.1 Schema Prisma

- **Provider :** PostgreSQL
- **Modèles :** 30+ tables couvrant l'ensemble du domaine métier
- **Relations :** Cascade delete correctement configuré
- **Index :** Index composés sur `[companyId, status]` pour les requêtes fréquentes

### 5.2 Précision Financière

Tous les montants utilisent `Decimal(19, 4)` — précision adéquate pour la comptabilité tunisienne (millimes).

### 5.3 Multi-Tenancy

Architecture multi-company native :
- `companyId` présent sur tous les modèles métier
- Contraintes uniques composées `[numero, companyId]`
- Isolation des données par société

### 5.4 Points d'Attention DB

- **Pas de soft delete visible** : Les suppressions sont physiques (CASCADE)
- **Pas d'audit trail** : Pas de table d'historique des modifications
- **Pas de verrouillage pessimiste** : Risque de race conditions sur les stocks/mouvements
- **Sequences** : Numérotation gérée applicativement (risque de doublons sous concurrence)

---

## 6. Recommandations Priorisées

### Critique (à traiter immédiatement)

| # | Problème | Effort | Impact |
|---|----------|--------|--------|
| 1 | Clés API en base de données | Moyen | Sécurité |
| 2 | Type `SessionUser` manquant | Faible | Qualité/Type Safety |
| 3 | Types de retour API dans les hooks | Moyen | Qualité/Maintenabilité |

### Important (prochain sprint)

| # | Problème | Effort | Impact |
|---|----------|--------|--------|
| 4 | Pages `"use client"` → Server Components | Élevé | Performance |
| 5 | Transaction Prisma typée | Faible | Qualité |
| 6 | Error handling standardisé | Moyen | Maintenabilité |
| 7 | Dynamic imports Three.js/Recharts | Moyen | Performance |

### Amélioration (backlog)

| # | Problème | Effort | Impact |
|---|----------|--------|--------|
| 8 | Middleware auth global | Moyen | Sécurité |
| 9 | Soft delete + audit trail | Élevé | Intégrité données |
| 10 | Migration mutations → Server Actions | Élevé | Architecture |
| 11 | Prefetching serveur | Moyen | Performance |
| 12 | Optimisation images | Moyen | Performance |

---

## 7. Métriques Codebase

| Métrique | Valeur |
|----------|--------|
| Fichiers totaux | 1047 |
| Mots de code | ~1,258,573 |
| Nœuds AST | 7002 |
| Edges (dépendances) | 19197 |
| Communautés | 324 |
| Modules métier | 19 |
| API Routes | 35+ |
| Server Actions | 6 |
| Hooks personnalisés | ~50 |
| Composants UI | 266 (client) |
| Modèles Prisma | 30+ |
| Occurrences `any` | 41 |
| Pages client-only | 13 |

---

## Conclusion

FacturaPro-TN est une application de gestion commerciale mature et fonctionnellement complète. L'architecture modulaire est bien pensée, le schema de base de données est solide, et les choix technologiques sont pertinents pour le contexte tunisien.

Les principaux axes d'amélioration concernent :
1. **La sécurité** des clés API (à externaliser en variables d'environnement)
2. **La performance SSR** (convertir les pages client-only en Server Components)
3. **Le typage TypeScript** (éliminer les 41 occurrences de `any`)
4. **L'intégrité des données** (ajouter soft delete et audit trail)

Le projet est en état de production avec une dette technique modérée et bien identifiée.