# Vérification Module Fournisseurs

**Date:** 2026-09-15
**Agent:** Governor Agent
**Scope:** Audit complet du module Fournisseurs (API, hooks, components, store, schemas, types)

---

## 1. Inventaire des fichiers

### Pages
| Fichier | Route | Rôle |
|---------|-------|------|
| `app/(app)/fournisseurs/page.tsx` | `/fournisseurs` | Listing + création |
| `app/(app)/fournisseurs/[id]/page.tsx` | `/fournisseurs/:id` | Détail fournisseur |

### API Routes
| Fichier | Méthodes | Wrapper apiRoute |
|---------|----------|-----------------|
| `app/api/fournisseurs/route.ts` | GET, POST | ❌ Non |
| `app/api/fournisseurs/[id]/route.ts` | GET, PUT, DELETE | ❌ Non |
| `app/api/fournisseurs/[id]/detail/route.ts` | GET | ❌ Non |
| `app/api/fournisseurs/[id]/documents/route.ts` | GET | ❌ Non |
| `app/api/fournisseurs/[id]/solde/route.ts` | GET | ❌ Non |
| `app/api/fournisseurs/[id]/echeances/route.ts` | GET | ❌ Non |

### Hooks
| Fichier | Fonctions |
|---------|-----------|
| `hooks/use-fournisseurs.ts` | `useFournisseursList`, `useFournisseursMutations`, `useFournisseursSearchDebounce`, `useFournisseurDetail`, `useFournisseurDocuments`, `useFournisseurSolde`, `useFournisseurEcheances` |

### Store
| Fichier | Store |
|---------|-------|
| `lib/stores/fournisseurs-store.ts` | `useFournisseursStore` (Zustand) |

### Schemas
| Fichier | Schema |
|---------|--------|
| `lib/schemas/fournisseur.ts` | `fournisseurSchema` (Zod) |

### Types
| Fichier | Types utilisés |
|---------|---------------|
| `lib/types/client.ts` | `SerializedTiers` (type partagé avec Clients) |

### Components
| Fichier | Rôle |
|---------|------|
| `components/fournisseurs/fournisseurs-client.tsx` | DataTable listing |
| `components/fournisseurs/fournisseur-dialog.tsx` | Dialog création/édition |
| `components/fournisseurs/fournisseur-detail-client.tsx` | Page détail |
| `components/fournisseurs/fournisseur-profile-header.tsx` | Header profil |
| `components/fournisseurs/fournisseur-document.tsx` | Liste documents (achats/avoirs) |
| `components/fournisseurs/fournisseur-solde.tsx` | Grand-livre fournisseur |
| `components/fournisseurs/fournisseur-echeances-card.tsx` | Card échéances |

---

## 2. Violations CODE RULES détectées

### 🔴 `any` interdit — 16 occurrences

| # | Fichier | Ligne | Code problématique | Sévérité |
|---|---------|-------|-------------------|----------|
| 1 | `fournisseur-dialog.tsx` | 22 | `fournisseur?: Record<string, any>` | 🔴 HIGH |
| 2 | `fournisseur-dialog.tsx` | 33 | `zodResolver(fournisseurSchema) as any` | 🔴 HIGH |
| 3 | `fournisseurs-client.tsx` | 142 | `r as unknown as Record<string, any>` | 🔴 HIGH |
| 4 | `fournisseurs-client.tsx` | 151 | `r as unknown as Record<string, any>` | 🔴 HIGH |
| 5 | `fournisseurs-store.ts` | 9 | `editFournisseur: Record<string, any> \| null` | 🔴 HIGH |
| 6 | `fournisseurs-store.ts` | 11 | `deleteTarget: Record<string, any> \| null` | 🔴 HIGH |
| 7 | `fournisseurs-store.ts` | 17 | `setEditFournisseur: (f: Record<string, any> \| null) => void` | 🔴 HIGH |
| 8 | `hooks/use-fournisseurs.ts` | 208 | `fournisseur: Record<string, any>` (return type) | 🔴 HIGH |
| 9 | `hooks/use-fournisseurs.ts` | 231 | `achats: any[]` | 🟡 MEDIUM |
| 10 | `hooks/use-fournisseurs.ts` | 232 | `avoirs: any[]` | 🟡 MEDIUM |
| 11 | `hooks/use-fournisseurs.ts` | 250 | `entries: any[]` | 🟡 MEDIUM |
| 12 | `hooks/use-fournisseurs.ts` | 267 | `overdue: any[]` | 🟡 MEDIUM |
| 13 | `hooks/use-fournisseurs.ts` | 268 | `upcoming: any[]`, `later: any[]` | 🟡 MEDIUM |
| 14 | `fournisseur-solde.tsx` | 104 | `(entry: any)` dans `.map()` | 🟡 MEDIUM |
| 15 | `fournisseur-echeances-card.tsx` | 61,74,86,99 | `(e: any)` dans `.map()` | 🟡 MEDIUM |
| 16 | `api/fournisseurs/[id]/echeances/route.ts` | 37-39 | `overdue: any[]`, `upcoming: any[]`, `later: any[]` | 🟡 MEDIUM |

### 🔴 API Routes sans wrapper `apiRoute` — 6 routes

Toutes les routes fournisseurs réimplémentent manuellement l'auth/permissions au lieu d'utiliser `apiRoute` :

```ts
// Pattern actuel (copié-collé dans chaque route) :
const sessionUser = await getSessionFromRequest(request);
if (!sessionUser?.id) return NextResponse.json(errorResponse("Non authentifié"), { status: 401 });
const perm = checkPermission(sessionUser.role, sessionUser.permissions, "fournisseurs:voir");
if (!perm.allowed) return NextResponse.json(errorResponse(perm.error!), { status: perm.status! });

// Devrait être :
export const GET = apiRoute.get({ requireCompany: true }, async (req, { companyId }) => { ... });
```

### 🟡 PUT au lieu de PATCH

`app/api/fournisseurs/[id]/route.ts` exporte `PUT` alors que le hook utilise `method: "PUT"` (cohérent) mais le pattern de l'app est PATCH pour les updates. Vérifier la convention.

### 🟡 Optimistic update spread non typé

`hooks/use-fournisseurs.ts` ligne 121-122 :
```ts
fournisseurs: previous.fournisseurs.map((f) =>
    f.id === id ? { ...f, ...data } : f  // data est Record<string, unknown>
),
```
Le spread `...data` peut écraser des champs avec des types incorrects.

### 🟡 DELETE sans vérification des enregistrements liés

`api/fournisseurs/[id]/route.ts` DELETE supprime directement sans vérifier si le fournisseur a des achats, avoirs, paiements ou effets liés. Risque de données orphelines.

---

## 3. Comparaison avec le module Clients

| Aspect | Clients | Fournisseurs | Écart |
|--------|---------|-------------|-------|
| Schema | `tiersSchema` (partagé dans `lib/schemas.ts`) | `fournisseurSchema` (dedans dans `lib/schemas/fournisseur.ts`) | ⚠️ Duplication |
| Types | `SerializedTiers` (partagé) | `SerializedTiers` (partagé) | ✅ OK |
| Dialog prop type | `SerializedTiers` | `Record<string, any>` | ❌ Régression |
| zodResolver cast | `zodResolver(tiersSchema)` ( propre) | `zodResolver(fournisseurSchema) as any` | ❌ Régression |
| Optimistic update type | `Partial<SerializedTiers>` | `Record<string, any>` | ❌ Régression |
| apiRoute wrapper | ❌ Non plus | ❌ Non | ⚠️ Commun |
| Search debounce | Store + debounce hook | Store + debounce hook | ✅ Identique |
| Stat cards | 4 cards | 4 cards | ✅ Identique |
| Tabs détail | devis/BC/BL/factures/avoirs | achats/avoirs + grand-livre | ✅ Adapté |
| Échéances | ✅ Oui | ✅ Oui | ✅ Identique |

---

## 4. Plan de correction

### Priorité 1 — Supprimer les `any` (16 occurrences)

**Étape 1 :** Corriger le store `fournisseurs-store.ts`
- Remplacer `Record<string, any>` par `SerializedTiers` pour `editFournisseur` et `deleteTarget`

**Étape 2 :** Corriger le dialog `fournisseur-dialog.tsx`
- Remplacer `fournisseur?: Record<string, any>` par `fournisseur?: SerializedTiers`
- Supprimer `as any` du `zodResolver` (utiliser `z.input<typeof fournisseurSchema>` comme le clients)

**Étape 3 :** Corriger le listing `fournisseurs-client.tsx`
- Supprimer les double casts `as unknown as Record<string, any>` → utiliser `r` directement (déjà typé `SerializedTiers`)

**Étape 4 :** Corriger les types retour des hooks `use-fournisseurs.ts`
- Créer des interfaces typées pour `FournisseurDetailResponse`, `FournisseurDocumentsResponse`, `FournisseurSoldeResponse`, `FournisseurEcheancesResponse`
- Remplacer tous les `any[]` par les types concrets

**Étape 5 :** Corriger les composants `fournisseur-solde.tsx` et `fournisseur-echeances-card.tsx`
- Utiliser les interfaces créées à l'étape 4 au lieu de `any`

**Étape 6 :** Corriger la route API `echeances/route.ts`
- Typer `overdue`, `upcoming`, `later` avec une interface `EcheanceItem`

### Priorité 2 — Wrapper `apiRoute` (6 routes)

**Étape 7 :** migrer toutes les routes fournisseurs vers `apiRoute` :
- `app/api/fournisseurs/route.ts` → `apiRoute.get()` + `apiRoute.post()`
- `app/api/fournisseurs/[id]/route.ts` → `apiRoute.get()` + `apiRoute.put()` + `apiRoute.delete()`
- `app/api/fournisseurs/[id]/detail/route.ts` → `apiRoute.get()`
- `app/api/fournisseurs/[id]/documents/route.ts` → `apiRoute.get()`
- `app/api/fournisseurs/[id]/solde/route.ts` → `apiRoute.get()`
- `app/api/fournisseurs/[id]/echeances/route.ts` → `apiRoute.get()`

### Priorité 3 — Corrections fonctionnelles

**Étape 8 :** Vérifier PUT vs PATCH
- Si le hook utilise PUT, garder PUT mais documenter la convention
- Si la convention est PATCH, migrer le hook et la route

**Étape 9 :** Optimistic update typé
- Remplacer `Record<string, unknown>` dans `mutationFn` par `FournisseurInput`
- Typer correctement le spread dans `onMutate`

**Étape 10 :** DELETE avec vérification
- Ajouter une vérification des enregistrements liés (achats, avoirs, paiements, effets) avant suppression
- Retourner une erreur 409 avec le détail des enregistrements bloquants

### Priorité 4 — Nettoyage

**Étape 11 :** Unifier les schemas
- Évaluer si `fournisseurSchema` doit remplacer `tiersSchema` ou si on garde les deux
- Si les deux sont identiques, supprimer la duplication

---

## 5. Vérifications requises

Avant de valider chaque étape :
- [ ] `npx tsc --noEmit` — 0 erreurs
- [ ] `npm run lint` — 0 erreurs
- [ ] Aucun `any` dans les fichiers modifiés
- [ ] Aucun `useEffect` injustifié
- [ ] TanStack Query pour tout data fetching
- [ ] Zustand pour état partagé
- [ ] `apiRoute` wrapper sur toutes les routes API

---

## 6. Résumé des risques

| Risque | Impact | Probabilité |
|--------|--------|-------------|
| `any` → runtime error silencieux | Élevé | Moyenne |
| DELETE sans vérification → données orphelines | Élevé | Faible |
| Optimistic update écrase des champs | Moyen | Moyenne |
| apiRoute absent → auth manuelle fragile | Moyen | Élevée |
| Schema dupliqué → divergence future | Faible | Élevée |
