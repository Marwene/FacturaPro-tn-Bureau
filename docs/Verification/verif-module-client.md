# Rapport d'Audit — Module Clients (Tiers)

**Date :** 2026-09-13  
**Agent :** Governor Agent  
**Statut :** ✅ Toutes les corrections appliquées

---

## 1. Graphify — Analyse

Le graph knowledge contient **7 673 nodes** et **20 180 edges**. Le module Clients est connecté aux communautés suivantes :
- `serializeDecimals` (API routes)
- `produits-client.tsx` (UI components)
- `optimistic-utils.ts` (patterns)

---

## 2. Architecture du Module

### Fichiers identifiés

| Couche | Fichier | Rôle |
|--------|---------|------|
| **API** | `app/api/clients/route.ts` | GET (list + stats), POST (create) |
| **API** | `app/api/clients/[id]/route.ts` | GET (detail), PUT (update), DELETE |
| **API** | `app/api/clients/[id]/detail/route.ts` | GET (stats détaillées + blocage) |
| **API** | `app/api/clients/[id]/solde/route.ts` | GET (Grand-Livre) |
| **API** | `app/api/clients/[id]/documents/route.ts` | GET (devis/BC/BL/factures/avoirs) |
| **API** | `app/api/clients/[id]/credit-limit/route.ts` | PATCH (limite crédit) |
| **API** | `app/api/clients/[id]/check-blocage/route.ts` | POST (vérif blocage) |
| **API** | `app/api/clients/[id]/envoyer-rappel/route.ts` | POST (email rappel) |
| **Hook** | `hooks/use-clients.ts` | TanStack Query (list, mutations, detail, solde, documents, blocage) |
| **Store** | `lib/stores/clients-store.ts` | Zustand (search, dialogs, delete target) |
| **UI** | `components/clients/clients-client.tsx` | DataTable listing |
| **UI** | `components/clients/client-dialog.tsx` | Dialog création/modification |
| **UI** | `components/clients/nouveau-client-dialog.tsx` | Bouton "Nouveau Client" |
| **UI** | `components/clients/client-detail-client.tsx` | Page détail (stats, docs, solde) |
| **Page** | `app/(app)/clients/page.tsx` | Route `/clients` |
| **Page** | `app/(app)/clients/[id]/page.tsx` | Route `/clients/[id]` |

---

## 3. Évaluation CRUD

| Opération | API | Hook | Optimistic UI | Statut |
|-----------|-----|------|---------------|--------|
| **CREATE** | `POST /api/clients` | `createClient` | ✅ Ajout temp + rollback | ✅ Complet |
| **READ (list)** | `GET /api/clients` | `useClientsList` | — | ✅ Complet |
| **READ (detail)** | `GET /api/clients/[id]` | `useClientDetail` | — | ✅ Complet |
| **UPDATE** | `PUT /api/clients/[id]` | `updateClient` | ✅ Mise à jour temp + rollback | ⚠️ **BUG** |
| **DELETE** | `DELETE /api/clients/[id]` | `deleteClient` | ✅ Suppression temp + rollback | ✅ Complet |

---

## 4. Bugs & Problèmes Détectés

### 🔴 BUG CRITIQUE — Mismatch HTTP Method

```
Hook (hooks/use-clients.ts:92)  →  method: "PATCH"
API (app/api/clients/[id]/route.ts:55)  →  export async function PUT
```

**Impact** : La modification d'un client renvoie **405 Method Not Allowed**. Le bouton "Modifier" dans le dialog est cassé.

---

### ⚠️ PROBLÈME — `any` dans les types

```typescript
// hooks/use-clients.ts:242-248
export function useClientDocuments(id: string) {
    return useQuery({
        ...
        return res.json() as Promise<{
            devis: any[];        // ← any
            bonsCommandes: any[];
            bonsLivraison: any[];
            factures: any[];
            avoirs: any[];
        }>;
    });
}
```

**Impact** : Violation des CODE RULES (`any` interdit). Aucun type safety sur les documents.

---

### ⚠️ PROBLÈME — `as any` dans le dialog

```typescript
// components/clients/client-dialog.tsx:29
const form = useForm<TiersInput>({
    resolver: zodResolver(tiersSchema) as any,  // ← as any
```

**Impact** : Violation des CODE RULES. Le cast masque un incompatibilité potentielle entre `zodResolver` et le schéma.

---

### ⚠️ PROBLÈME — Optimistic Update incomplet (updateClient)

```typescript
// hooks/use-clients.ts:109-111
qc.setQueryData<{ clients: SerializedTiers[] }>(listKey, {
    ...previous,
    clients: previous.clients.map((c) =>
        c.id === id ? { ...c, ...data } as SerializedTiers : c  // ← data est Record<string, unknown>
    ),
});
```

**Impact** : Le spread `{ ...c, ...data }` peut écraser des champs avec des valeurs inattendues car `data` n'est pas typé `Partial<SerializedTiers>`.

---

### ⚠️ PROBLÈME — Pas de validation avant optimistic update

Le `createClient` ajoute un client temporaire avec des champs potentiels `undefined` :
```typescript
const optimisticClient = {
    id: `temp-${Date.now()}`,
    code: "...",
    nom: (data.nom as string) ?? "Nouveau client",  // ← "nom" n'existe pas dans SerializedTiers
    ...
} as unknown as SerializedTiers;
```

**Impact** : Le cast `as unknown as SerializedTiers` masque des champs inexistants (`nom` n'est pas dans le schéma Tiers).

---

## 5. Résumé des Corrections Appliquées

| # | Sévérité | Problème | Correction | Statut |
|---|----------|----------|------------|--------|
| 1 | 🔴 **CRITIQUE** | PUT vs PATCH mismatch | `PUT` → `PATCH` dans `app/api/clients/[id]/route.ts` | ✅ |
| 2 | ⚠️ MOYEN | `any[]` dans `useClientDocuments` | Types `TiersDocumentSummary` et `TiersDocumentsResponse` créés dans `lib/types/client.ts` | ✅ |
| 3 | ⚠️ MOYEN | `as any` dans `zodResolver` | `useForm<TiersInput>` → `useForm<z.input<typeof tiersSchema>>`, suppression du cast | ✅ |
| 4 | ⚠️ FAIBLE | Optimistic update non typé | `Record<string, unknown>` → `Partial<SerializedTiers>` | ✅ |
| 5 | ⚠️ FAIBLE | Champs `nom` inexistant | Supprimé, utilisation de `raisonSociale` | ✅ |

**Bonus :** Fix du type `DocumentItem` dans `components/clients/client-document.tsx` pour supporter `dateCreation` et `dateEmission` (mismatch avec les types de documents).

---

## 6. Verdict

| Critère | Statut |
|---------|--------|
| CRUD complet (API) | ✅ Oui |
| Optimistic UI (hooks) | ✅ Oui (create/update/delete) |
| Store Zustand | ✅ Oui |
| Type safety | ✅ Corrigé (2 violations `any` supprimées) |
| Fonctionnel | ✅ Corrigé (PUT/PATCH mismatch résolu) |

**Le module Clients a un CRUD complet avec Optimistic UI. Tous les bugs ont été corrigés.**

---

## 7. Prochaines Étapes

1. ~~Corriger le mismatch PUT/PATCH (critique)~~ ✅ Fait
2. ~~Corriger les violations `any` (moyen)~~ ✅ Fait
3. ~~Valider les optimistic updates (faible)~~ ✅ Fait
4. Revoir le module Fournisseurs (même schéma `tiers`)
