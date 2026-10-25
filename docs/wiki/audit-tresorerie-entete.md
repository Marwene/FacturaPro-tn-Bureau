# Audit Entête Trésorerie — Explication des montants affichés

**Date :** 2026-09-13
**Corrigé le :** 2026-09-13 (4 corrections appliquées — voir section 5)
**Objet :** Comprendre d'où viennent les montants de l'entête "Trésorerie Actuelle" et comment ils sont calculés

---

## 1. Architecture des données

```
[Base Prisma] → [API /api/tresorerie] → [JSON response] → [Hook use-tresorerie.ts] → [Composant tresorerie-client.tsx]
```

- **Hook** (`hooks/use-tresorerie.ts`) : appelle `GET /api/tresorerie?days=N` via TanStack Query, avec `keepPreviousData` pour éviter le flash de chargement. Le paramètre `days` est configurable (30/60/90/120/365 jours).
- **API** (`app/api/tresorerie/route.ts`) : route GET protégée par `apiRoute.get({ requireCompany: true })`, qui extrait `companyId` depuis la session.
- **Composant** (`components/paiements/tresorerie-client.tsx`) : reçoit les données, parse les strings en `number`, et affiche dans la zone "ZONE 1: Compteur".

---

## 2. Les 4 montants principaux

### 2.1 Solde actuel (gros montant)

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Trésorerie actuelle" (montant principal en gros) |
| **Source JSON** | `solde.actuel` |
| **Requête Prisma** | `prisma.payment.aggregate({ where: { companyId }, _sum: { montant: true } })` |
| **Période** | Tous les temps (pas de filtre de date) |
| **Méthodes incluses** | Toutes (ESPECES, VIREMENT, CARTE, CHEQUE) |
| **Statuts inclus** | **TOUS** (CONFIRME + EN_ATTENTE + ANNULE) — aucun filtre sur `status` |
| **Filtre** | Uniquement la société courante (`companyId`) |

**Formule :**
```
solde_actuel = Σ payments.montant WHERE companyId = <current>
```

**Exemple concret :**
| Paiement | Montant | Méthode | Statut |
|----------|---------|---------|--------|
| #1 | 1 000 DT | ESPECES | CONFIRME |
| #2 | 500 DT | VIREMENT | EN_ATTENTE |
| #3 | 200 DT | CARTE | CONFIRME |
| **Total affiché** | **1 700 DT** | | |

> **⚠️ Point d'attention :** Les paiements `ANNULE` sont inclus dans le solde. Un paiement annulé contribue quand même au solde tant qu'il reste dans la table `payments`.

---

### 2.2 À recevoir

| Question | Réponse |
|----------|---------|
| **Label affiché** | "À recevoir" (en vert) |
| **Source JSON** | `solde.aRecevoir` |
| **Requête Prisma** | 2 requêtes combinées (chèques + effets) |
| **Période** | Tous les temps |
| **Filtres** | Chèques : `type=RECU` + `status=EN_ATTENTE` / Effets : `type=RECU` + `status NOT IN (PAYE, ANNULE)` |

**Requêtes Prisma :**
```typescript
// Chèques reçus en attente
prisma.cheque.findMany({
    where: { companyId, status: "EN_ATTENTE" },
    select: { montant: true, type: true },
})

// Effets reçus non payés
prisma.effet.findMany({
    where: { companyId, status: { notIn: ["PAYE", "ANNULE"] } },
    select: { montant: true, type: true },
})
```

**Calcul côté JS :**
```typescript
aRecevoir =
    cheques.filter(c => c.type === "RECU").reduce(sum montant)
  + effets.filter(e => e.type === "RECU").reduce(sum montant)
```

**Formule :**
```
aRecevoir = Σ(cheques.montant) WHERE status=EN_ATTENTE AND type=RECU
          + Σ(effets.montant)  WHERE status NOT IN (PAYE, ANNULE) AND type=RECU
```

**Exemple concret :**
| Instrument | Type | Montant | Statut |
|------------|------|---------|--------|
| Chèque #1 | RECU | 800 DT | EN_ATTENTE |
| Effet #1 | RECU | 1 200 DT | EN_PORTEFEUILLE |
| **Total affiché** | | **2 000 DT** | |

> **Note :** Les chèques/effets `EMIS` (qu'on doit payer) ne sont PAS comptés ici. Seuls les RECU le sont.

---

### 2.3 À payer

| Question | Réponse |
|----------|---------|
| **Label affiché** | "À payer" (en rouge) |
| **Source JSON** | `solde.aPayer` |
| **Requête Prisma** | Mêmes requêtes que "À recevoir" (chèques + effets déjà fetchés) |
| **Période** | Tous les temps |
| **Filtres** | Chèques : `type=EMIS` + `status=EN_ATTENTE` / Effets : `type=EMIS` + `status NOT IN (PAYE, ANNULE)` |

**Calcul côté JS :**
```typescript
aPayer =
    cheques.filter(c => c.type === "EMIS").reduce(sum montant)
  + effets.filter(e => e.type === "EMIS").reduce(sum montant)
```

**Formule :**
```
aPayer = Σ(cheques.montant) WHERE status=EN_ATTENTE AND type=EMIS
       + Σ(effets.montant)  WHERE status NOT IN (PAYE, ANNULE) AND type=EMIS
```

**Exemple concret :**
| Instrument | Type | Montant | Statut |
|------------|------|---------|--------|
| Chèque #2 | EMIS | 300 DT | EN_ATTENTE |
| Effet #2 | EMIS | 500 DT | REMIS_ESCOMPTE |
| **Total affiché** | | **800 DT** | |

---

### 2.4 Prévisionnel

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Prévisionnel" (vert ou rouge selon signe) |
| **Source JSON** | `solde.previsionnel` |
| **Requête Prisma** | Aucune — c'est un calcul dérivé |
| **Période** | Calcul dérivé des composants ci-dessus |

**Formule :**
```
previsionnel = Solde actuel + À recevoir - À payer
```

C'est le solde théorique si tous les engagements futurs (chèques et effets en cours) se matérialisent.

**Exemple concret :**
```
1 700 (solde) + 2 000 (à recevoir) - 800 (à payer) = 2 900 DT
```

---

## 3. Les sous-badges (mois en cours)

### 3.1 Entrées mois

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Entrées mois" |
| **Source JSON** | `solde.entreesMois` |
| **Requête Prisma** | `prisma.payment.aggregate({ where: { companyId, dateReglement: { gte: debutMois, lte: finMois } }, _sum: { montant: true } })` |
| **Période** | Mois en cours (du 1er au dernier jour) |
| **Méthodes** | Toutes |
| **Statuts** | Tous |

**Formule :**
```
entreesMois = Σ(payments.montant) WHERE companyId=X AND dateReglement BETWEEN 1er_du_mois AND dernier_du_mois
```

**Exemple concret :** Mois de septembre 2026 :
| Paiement | Montant | Date |
|----------|---------|------|
| Virement | 3 000 DT | 5 sept |
| Espèces | 1 500 DT | 10 sept |
| **Total affiché** | **4 500 DT** | |

> **⚠️ Point d'attention :** Malgré le label "Entrées", ce champ inclut **tous les paiements du mois**, y compris ceux liés à des achats (fournisseurs = sorties). Le filtre ne distingue pas `invoiceId` (entrée client) vs `achatId` (sortie fournisseur).

---

### 3.2 Espèces mois

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Espèces" (icône Banknote) |
| **Source JSON** | `solde.especesMois` |
| **Requête Prisma** | `prisma.payment.aggregate({ where: { companyId, methode: "ESPECES", dateReglement: { gte: debutMois, lte: finMois } }, _sum: { montant: true } })` |
| **Période** | Mois en cours |
| **Méthode** | ESPECES uniquement |

**Formule :**
```
especesMois = Σ(payments.montant) WHERE methode=ESPECES AND dateReglement BETWEEN 1er_du_mois AND dernier_du_mois
```

---

### 3.3 Virements mois

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Virements" (icône Building) |
| **Source JSON** | `solde.virementsMois` |
| **Requête Prisma** | `prisma.payment.aggregate({ where: { companyId, methode: "VIREMENT", dateReglement: { gte: debutMois, lte: finMois } }, _sum: { montant: true } })` |
| **Période** | Mois en cours |
| **Méthode** | VIREMENT uniquement |

**Formule :**
```
virementsMois = Σ(payments.montant) WHERE methode=VIREMENT AND dateReglement BETWEEN 1er_du_mois AND dernier_du_mois
```

> **Note :** `chequesMois` est calculé côté API mais jamais affiché dans le header.

---

### 3.4 Projection horizon

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Proj. {N}j" (icône ChartSpline) |
| **Source JSON** | `solde.projectionHorizon` |
| **Requête Prisma** | Aucune — c'est un calcul itératif basé sur l'échéancier |
| **Période** | Les N jours suivants (configurable) |

**Algorithme :**
```
cumul_0 = Solde actuel + À recevoir - À payer (= Prévisionnel)

Pour chaque semaine w = 1..N :
    cumul_w = cumul_{w-1} + Σ(echeancier entrees semaine w) - Σ(echeancier sorties semaine w)

projectionHorizon = cumul_N
```

L'échéancier combine :
1. Futurs chèques (`status=EN_ATTENTE`, `dateEcheance` dans `[now, horizon]`)
2. Futurs effets (`status NOT IN (PAYE, ANNULE)`, `dateEcheance` dans `[now, horizon]`)
3. Paiements récents (30 jours)

---

### 3.5 Sorties (calculé côté client)

| Question | Réponse |
|----------|---------|
| **Label affiché** | "Sorties {N}j" |
| **Source JSON** | Pas dans `solde` — calculé côté client depuis `echeancier` |
| **Calcul côté client** | `echeancier.filter(e => e.flux === "sortie").reduce(sum montant)` |

**Formule :**
```
sorties_Nj = Σ(echeancier.montant) WHERE flux="sortie"
```

---

## 4. Tableau récapitulatif

| # | Label affiché | Source JSON | Période | Méthodes | Statuts filtrés | Formule |
|---|---------------|-------------|---------|----------|-----------------|---------|
| 1 | Solde actuel | `solde.actuel` | Tous les temps | Toutes | **Tous** (y compris ANNULE) | `Σ payments.montant` |
| 2 | À recevoir | `solde.aRecevoir` | Tous les temps | Chèques + Effets | Chèques: `EN_ATTENTE`, Effets: `NOT IN (PAYE, ANNULE)` | `Σ type=RECU` |
| 3 | À payer | `solde.aPayer` | Tous les temps | Chèques + Effets | Chèques: `EN_ATTENTE`, Effets: `NOT IN (PAYE, ANNULE)` | `Σ type=EMIS` |
| 4 | Prévisionnel | `solde.previsionnel` | — | — | — | `actuel + aRecevoir - aPayer` |
| 5 | Entrées mois | `solde.entreesMois` | Mois en cours | Toutes | **Tous** | `Σ payments.montant WHERE date BETWEEN 1er mois AND fin mois` |
| 6 | Espèces mois | `solde.especesMois` | Mois en cours | ESPECES | **Tous** | `Σ payments.montant WHERE methode=ESPECES AND date BETWEEN ...` |
| 7 | Virements mois | `solde.virementsMois` | Mois en cours | VIREMENT | **Tous** | `Σ payments.montant WHERE methode=VIREMENT AND date BETWEEN ...` |
| 8 | Projection horizon | `solde.projectionHorizon` | N jours | Chèques+Effets | Idem aRecevoir/aPayer | Boucle itérative semaine par semaine |
| 9 | Sorties (client) | `echeancier` filtré | N jours | Toutes | `flux === "sortie"` | `Σ echeancier.montant WHERE flux=sortie` |

---

## 5. Points d'attention identifiés

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1 | **Le solde actuel inclut les paiements ANNULÉS** | Un paiement annulé contribue au solde tant qu'il reste dans la table `payments`. Il faudrait ajouter `status: { not: "ANNULE" }` au filtre. | Haute |
| 2 | **"Entrées mois" inclut les paiements fournisseurs** | Le label dit "entrées" mais il inclut aussi les sorties (paiements achats `achatId`). Le filtre ne distingue pas `invoiceId` vs `achatId`. | Haute |
| 3 | **Les sous-badges mois ne filtrent pas par statut** | Un virement `ANNULE` compterait dans "Virements mois". Idem pour espèces et chèques. | Moyenne |
| 4 | **"À recevoir / À payer" n'est pas borné temporellement** | Un chèque en attente dont l'échéance est dans 2 ans est compté dans "À recevoir" même s'il ne figure pas dans la projection. | Basse |
| 5 | **`chequesMois` calculé mais jamais affiché** | L'API retourne `solde.chequesMois` mais le composant ne l'affiche pas dans le header. | Basse |

---

## 6. Recommandations de correction

### Correction 1 : Exclure les paiements ANNULÉS du solde actuel

Dans `app/api/tresorerie/route.ts`, modifier la requête du solde actuel :

```typescript
// Avant
const soldeAgg = await prisma.payment.aggregate({
    where: { companyId },
    _sum: { montant: true },
})

// Après
const soldeAgg = await prisma.payment.aggregate({
    where: { companyId, status: { not: "ANNULE" } },
    _sum: { montant: true },
})
```

### Correction 2 : Distinguer entrées clients vs sorties fournisseurs

Dans `app/api/tresorerie/route.ts`, modifier la requête des entrées mois :

```typescript
// Avant
const entreesMoisAgg = await prisma.payment.aggregate({
    where: {
        companyId,
        dateReglement: { gte: debutMois, lte: finMois }
    },
    _sum: { montant: true },
})

// Après
const entreesMoisAgg = await prisma.payment.aggregate({
    where: {
        companyId,
        dateReglement: { gte: debutMois, lte: finMois },
        invoiceId: { not: null },  // Paiements clients uniquement
    },
    _sum: { montant: true },
})
```

### Correction 3 : Filtrer les sous-badges par statut

Appliquer le même filtre `status: { not: "ANNULE" }` aux requêtes `especesMoisAgg`, `virementsMoisAgg`, et `chequesMoisAgg`.

### Correction 4 : Afficher `chequesMois` dans le header

Ajouter `chequesMois` au type `TresorerieData` côté frontend et l'afficher dans la ligne de sous-titre.
