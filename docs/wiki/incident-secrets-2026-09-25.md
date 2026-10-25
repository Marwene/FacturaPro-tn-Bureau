# Incident — Fuite de `.env` via export zip (rotation des secrets)

| | |
| --- | --- |
| **Date** | 2026-09-25 |
| **Auteur** | Governor Agent — incident response |
| **Statut** | **OUVERT** — rotation à exécuter par l'équipe infra |
| **Sévérité** | **Élevée** — secrets potentiellement compromis |
| **Nature** | Documentation / traçabilité uniquement — **aucune rotation effectuée** (hors périmètre de cette fiche) |

---

## 1. Résumé de l'incident

Le fichier `.env` à la racine du projet contient des secrets de production (noms de variables uniquement, **aucune valeur n'est reproduite ici**) :

- `DATABASE_URL`
- `AUTH_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- `Mistral-Ai-OCR3`

Ce fichier a été inclus dans un export zip (`FacturaPRO.zip`, ~37 Mo, présent à la racine du projet), livré **hors du contrôle git habituel** (pas de revue, règle `.gitignore` non appliquée par un commit). L'archive est donc considérée **potentiellement compromise** : toute personne ayant reçu, cloné ou stocké ce zip dispose des secrets ci-dessus.

**Règle absolue appliquée à ce document** : aucune valeur de secret, aucun début de valeur, aucun hash, aucun indice de longueur ou de contenu — **uniquement des noms de variables** et des commandes génériques avec placeholders (`<NOUVEAU_MDP>`).

**Conséquences probables en cas d'exploitation** :

| Secret | Impact d'une exploitation |
| --- | --- |
| `AUTH_SECRET` | Forgery de cookies de session → hijack de session, accès au compte admin |
| `DATABASE_URL` | Accès direct à la base de données en écriture (lecture/exfiltration/suppression de données clients) |
| `SMTP_USER` / `SMTP_PASS` | Envoi d'emails en votre nom (spam, phishing de vos clients/fournisseurs, épuisement de quota) |
| `Mistral-Ai-OCR3` | Abus de la clé API OCR (coûts, quota, usage en votre nom) |

---

## 2. Périmètre / preuves collectées

Constats établis par le Governor. **Aucune valeur de secret n'est listée ci-dessous.**

| # | Constat | Portée |
| --- | --- | --- |
| **F1** | `/workspace/facturapro-tn-bureau` **n'est pas un dépôt git** (ni `.git`, ni parent jusqu'à `/`, ni `*.bundle` dans l'export). `git log -p -- .env`, `git branch -a`, `git status` échouent : `fatal: not a git repository`. | La vérification d'historique git est **impossible sur cet export** (voir §3). |
| **F2** | `.gitignore` ligne 34 contient `.env*`. | `.env` est ignoré par défaut côté git — **mais cela ne prouve rien** sur l'historique passé ni sur les commits déjà poussés. |
| **F3** | `FacturaPRO.zip` (racine du projet) contient une copie de `.env` **identique octet à octet** à `.env` local (`cmp -s` = 0). | **Artefact compromis principal.** |
| **F4** | `__MACOSX/._.env` dans le zip : métadonnées Finder, 176 o, **aucune valeur de secret**. | Non compromettant. |
| **F5** | Scan binaire de 1075 fichiers (arbre de travail + extraction complète du zip, hors `node_modules` / `__MACOSX`) : les valeurs de `AUTH_SECRET`, `DATABASE_URL`, `SMTP_PASS`, `SMTP_HOST` et `Mistral-Ai-OCR3` n'apparaissent **que** dans `.env`. | Périmètre de fuite limité au zip pour ces secrets. |
| **F6** | La valeur de `SMTP_USER` apparaît **aussi** dans 2 PDF : `public/packing-lists/PL-2026-0001-etiquettes.pdf` et `public/packing-lists/PL-2026-0001-packing-list.pdf` (présents aussi dans le zip). Ces fichiers sont sous `public/` (servis statiquement par Next.js) mais bien ignorés par git (`/public/packing-lists`). | **Second artefact compromis** : à régénérer/purger (voir §5). |
| **F7** | `SMTP_FROM`, `SMTP_FROM_NAME`, `NEXTAUTH_PUBLIC_URL` retrouvés dans le code sont des valeurs publiques par défaut (adresse d'expédition générique, nom d'affichage de la marque, URL publique). | **Ne sont PAS des secrets** — aucune rotation nécessaire. |
| **F8** | `.env` contient un secret **supplémentaire** non listé initialement : la clé `Mistral-Ai-OCR3`. Et une ligne `DATABASE_URL` en **doublon** (2 lignes actives). | À ajouter à la rotation + nettoyage du doublon. |

---

## 3. Résultat de la vérification git

### 3.1 Ce qui a été demandé

Exécuter `git log -p -- .env` sur **toutes les branches** du dépôt pour déterminer si `.env` (ou une valeur de secret) a déjà été commité.

### 3.2 Résultat constaté

**Impossible à exécuter sur cet export.**

```
$ git log -p -- .env
fatal: not a git repository (or any of the parent directories): .git

$ git branch -a
fatal: not a git repository (or any of the parent directories): .git
```

- Aucun répertoire `.git/` dans l'arbre, ni dans aucun parent jusqu'à `/`.
- Aucun `*.bundle` dans l'export.

### 3.3 Interprétation honnête

> **NON VÉRIFIÉ ici.**

Cela ne constitue **ni une preuve de présence, ni une preuve d'absence** de `.env` dans l'historique git. Le constat F2 (`.env*` dans `.gitignore`) ne prouve rien non plus sur les commits réalisés avant l'ajout de cette règle, ni sur ce qui a pu être poussé sur un remote. La question reste **ouverte** et doit être tranchée sur le dépôt canonique.

### 3.4 Commandes exactes à exécuter sur le dépôt canonique (équipe infra)

À lancer depuis la racine du **vrai** dépôt git, sur toutes les refs locales et distantes.

**1. Aperçu rapide — a-t-on jamais ajouté `.env` ?**

```bash
git log --all --full-history --diff-filter=A -- .env
git log --all --full-history --oneline -- .env
```

**2. Historique complet des diffs touchant `.env`**

```bash
git log -p --all -- .env
git log -p --all --full-history -- .env
```

**3. Recherche de motifs de secret dans l'historique (variante sécurisée — n'affiche que le hash de commit, jamais le contenu)**

```bash
git log --all -S 'AUTH_SECRET' --oneline -- .env
git log --all -S 'SMTP_PASS' --oneline -- .env
git log --all -S 'DATABASE_URL' --oneline -- .env
git log --all -S 'Mistral' --oneline -- .env
```

Variante `git grep` sur toutes les révisions (⚠️ à utiliser avec prudence, elle afficherait la ligne correspondante **avec sa valeur** — ne l'exécuter que dans une console locale non enregistrée, ou limiter la sortie aux hashs de commit) :

```bash
git rev-list --all | while read c; do git grep -I -l -e "<MOTIF>" "$c" -- .env >/dev/null 2>&1 && echo "$c"; done
```

**4. Remotes et refs distantes (un remote oublié = historique non couvert)**

```bash
git remote -v
git ls-remote --heads origin
git ls-remote --tags origin
```

> Répéter pour **chaque** remote listé (`origin`, `upstream`, etc.). Une branche supprimée côté serveur reste consultable tant qu'elle existe sur le serveur.

**5. Objets perdus, stash et reflog local**

```bash
git fsck --lost-found
git stash list
git reflog --all
```

**6. En cas de trouvaille — procédure obligatoire**

1. Rotation **immédiate** de tous les secrets présents dans le commit trouvé.
2. Purge de l'historique : `git filter-repo --invert-paths --path .env` (ou BFG : `bfg --delete-files .env`).
3. **Force-push** de toutes les branches concernées + purge des caches/clones internes.
4. **Rotation encore une fois après la purge** (les secrets ont été exposés avant la purge, ils restent compromis).
5. Suppression des tags/releases contenant l'archive.
6. Traçabilité : archiver le lien du commit et la preuve de purge dans le ticket d'incident.

### 3.5 Éléments de contexte de la vérification

Constats **F2 → F8** (§2) constituent le contexte : règle `.gitignore` actuelle (F2), artefact zip compromis (F3), metadata zip inoffensive (F4), scan binaire négatif hors `.env` (F5), contamination secondaire des PDF (F6), valeurs non secrètes (F7), secret bonus + doublon (F8). **Aucun de ces constats ne se substitue à la vérification git ci-dessus.**

---

## 4. Checklist de rotation

> Chaque item est actionnable et traçable. **Responsable par défaut : équipe infra** (à signer dans le ticket).

### 4.1 `AUTH_SECRET` (cookies de session / NextAuth)

- [ ] Conséquence d'une fuite : **hijack de session possible** (forgery de cookie) — traiter en priorité.
- [ ] Régénérer une nouvelle valeur localement : `openssl rand -base64 32`
- [ ] Mettre à jour la valeur dans le secret manager / variables d'env de production (Vercel ou équivalent) — **sans déployer** avant l'étape correspondante du plan (§5).
- [ ] Redémarrer / redéployer l'application avec la nouvelle valeur.
- [ ] Invalider les sessions existantes (logout global / purge des sessions côté serveur si stockées).
- [ ] Vérifier : login/logout, refresh de session, expiration correcte.
- [ ] Archiver la preuve de rotation dans le ticket — **resp. infra : ______**

### 4.2 Mot de passe de la base de données (`DATABASE_URL`)

- [ ] Créer un **nouvel utilisateur/mot de passe** côté provider (Neon / Supabase / Scaleway / RDS / … selon infra) **OU** rotation du password du user existant.
- [ ] Préparer le nouvel `DATABASE_URL` complet dans le secret manager (sans le déployer).
- [ ] Déployer / redémarrer avec la nouvelle valeur.
- [ ] **Supprimer le doublon de ligne `DATABASE_URL`** constaté dans `.env` (F8) — il ne doit rester qu'une ligne active.
- [ ] Vérifier : requêtes Prisma (lecture + écriture), healthcheck de l'app.
- [ ] Révoquer l'ancien mot de passe chez le provider **après validation**.
- [ ] Archiver la preuve de rotation dans le ticket — **resp. infra : ______**

### 4.3 Identifiants SMTP (`SMTP_USER` + `SMTP_PASS`)

- [ ] Rotation côté fournisseur d'email / serveur SMTP : créer un **2e credential en parallèle** si possible (révocation différée).
- [ ] Mettre à jour **les 2 variables** (`SMTP_USER`, `SMTP_PASS`) dans le secret manager.
- [ ] Déployer / redémarrer.
- [ ] Tester un envoi réel (ex. rappel client / email de test) — vérifier réception et expéditeur.
- [ ] **Supprimer / régénérer les 2 PDF contaminés** sous `public/packing-lists/` (F6) :
  - [ ] `PL-2026-0001-etiquettes.pdf`
  - [ ] `PL-2026-0001-packing-list.pdf`
- [ ] Purger tout CDN / cache statique / reverse-proxy pointant sur ces PDF.
- [ ] Révoquer l'ancien credential SMTP **après validation**.
- [ ] Archiver la preuve de rotation dans le ticket — **resp. infra : ______**

### 4.4 Bonus — `Mistral-Ai-OCR3` (clé API OCR, hors périmètre initial mais exposée pareil)

- [ ] Régénérer la clé côté Mistral (crédérial de secours si disponible).
- [ ] Mettre à jour la variable dans le secret manager, redéployer.
- [ ] Vérifier : un OCR de test passe.
- [ ] Révoquer l'ancienne clé après validation.
- [ ] Archiver la preuve dans le ticket — **resp. infra : ______**

### 4.5 Nettoyage connexe

- [ ] Supprimer le doublon `DATABASE_URL` dans `.env` (F8).
- [ ] Créer un `.env.example` (noms de variables **sans valeurs**) s'il est manquant.
- [ ] Détruire / retirer `FacturaPRO.zip` de toute distribution (voir §5, étape finale).

### 4.6 Checklist de rotation — LOT A (2026-10-07)

> Tableau de suivi ajouté dans le cadre du **LOT A** de l'audit 2026-10. **Aucune rotation n'a été effectuée** lors de la rédaction de cette section : les colonnes « Rotation effectuée le » et « Vérifié par » sont volontairement laissées vides.
>
> **Chaque ligne de ce tableau doit être confirmée par l'utilisateur / l'équipe infra** avant d'être cochée ou datée. En l'absence de preuve archivée dans le ticket d'incident, la colonne « Dernière rotation connue » porte la valeur **« Inconnue (non tracée) »** — elle ne doit être remplacée que par une date vérifiable.
>
> **Aucune valeur de secret, aucun mot de passe, aucune URL de connexion et aucune clé API ne figurent dans ce tableau** — uniquement des noms de variables (règle absolue du §1).

| Secret | Dernière rotation connue | Rotation effectuée le | Vérifié par | Commentaire |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | Inconnue (non tracée) | | | Priorité 1 — procédure en §4.1 (hijack de session possible) |
| `DATABASE_URL` | Inconnue (non tracée) | | | Procédure en §4.2 — supprimer aussi le doublon de ligne (F8) |
| Identifiants SMTP (`SMTP_USER` + `SMTP_PASS`) | Inconnue (non tracée) | | | Procédure en §4.3 — régénérer/purger les 2 PDF contaminés (F6) |
| Clé `OPENAI_API_KEY` | Inconnue (non tracée) | | | Clé IA — lue via `lib/api-keys.ts` (env ou `AppSettings`) ; à inventorier côté provider |
| Clé `GEMINI_API_KEY` | Inconnue (non tracée) | | | Clé IA — lue via `lib/api-keys.ts` (env ou `AppSettings`) ; à inventorier côté provider |
| Clé `MISTRAL_API_KEY` | Inconnue (non tracée) | | | Clé IA — lue via `lib/api-keys.ts` ; à rapprocher de `Mistral-Ai-OCR3` (§4.4) et confirmer si même credential |
| `CRON_SECRET` | Inconnue (non tracée) | | | Non listé dans l'incident du 25/09 — rotation à confirmer (routes `app/api/cron/**`) |

---

## 5. Plan d'action ordonné (ordre non négociable)

**Règle cardinale : pour CHAQUE secret, régénérer la nouvelle valeur CÔTÉ PROVIDER / plateforme AVANT de la modifier dans l'environnement de prod — jamais l'inverse — afin d'éviter toute coupure de service.**

**Règle de fenêtre :** exécuter les rotations pendant une fenêtre de maintenance, **jamais en parallèle de l'heure de pointe** ; ne tourner qu'**UN secret à la fois** et valider entre chacun.

### Étape 0 — Pré-requis

1. Inventaire des environnements qui consomment ces variables : **Vercel/prod, preview, CI, staging**, workers éventuels.
2. Création du ticket d'incident (référence : `incident-secrets-2026-09-25`).
3. **Gel des déploiements** le temps de la fenêtre de rotation.
4. Identification du responsable de fenêtre + créneau communiqué à l'équipe.

### Étape 1 — `AUTH_SECRET`

- **1.a** Régénérer la nouvelle valeur chez le provider / plateforme (ou `openssl rand -base64 32` côté infra si le secret est géré en interne) **sans révoquer l'ancienne**.
- **1.b** Préparer la nouvelle valeur dans le secret manager / variables d'env de prod (**sans la déployer**).
- **1.c** Déployer / redémarrer avec la nouvelle valeur.
- **1.d** Valider : healthcheck, login/logout, expiration de session.
- **1.e** RÉVOQUER l'ancienne valeur chez le provider (**uniquement après validation**).
- **1.f** Archiver la preuve de rotation dans le ticket.
- → Pause de validation avant de passer à l'étape 2.

### Étape 2 — Mot de passe de base de données (`DATABASE_URL`)

- **2.a** Créer / régénérer le credential côté provider (nouveau user ou rotation du password) **sans révoquer l'ancien**.
- **2.b** Préparer le nouvel `DATABASE_URL` dans le secret manager (sans le déployer). Préparer aussi la suppression du doublon (F8).
- **2.c** Déployer / redémarrer avec la nouvelle valeur.
- **2.d** Valider : requêtes Prisma (lecture + écriture), healthcheck.
- **2.e** RÉVOQUER l'ancien credential chez le provider (**après validation**).
- **2.f** Archiver la preuve de rotation dans le ticket.
- → Pause de validation.

### Étape 3 — Identifiants SMTP (`SMTP_USER` + `SMTP_PASS`)

- **3.a** Créer un 2e credential SMTP chez le fournisseur en parallèle de l'ancien (rotation sans coupure).
- **3.b** Préparer les 2 nouvelles variables dans le secret manager (sans les déployer).
- **3.c** Déployer / redémarrer avec les nouvelles valeurs.
- **3.d** Valider : envoi d'un email de test réel (rappel client), réception + bon expéditeur.
- **3.e** RÉVOQUER l'ancien credential SMTP (**après validation**).
- **3.f** Archiver la preuve de rotation dans le ticket.
- → Pause de validation.

### Étape 4 — `Mistral-Ai-OCR3` (bonus) + nettoyage

- **4.a** Régénérer la clé côté provider sans révoquer l'ancienne.
- **4.b** Préparer la nouvelle valeur dans le secret manager (sans la déployer).
- **4.c** Déployer / redémarrer.
- **4.d** Valider : un job OCR de test.
- **4.e** RÉVOQUER l'ancienne clé (**après validation**).
- **4.f** Archiver la preuve + **supprimer le doublon `DATABASE_URL`** dans `.env`.

### Étape 5 — Vérification git sur le dépôt canonique

1. Exécuter **toutes** les commandes de §3.4 sur le dépôt réel (toutes branches, tous remotes, reflog, stash).
2. **Si trouvaille** : rotation immédiate → purge (`git filter-repo` / BFG) → force-push → **rotation encore une fois après purge**.
3. Si rien : archiver la sortie des commandes comme preuve de non-exposition.

### Étape 6 — Purge des artefacts

- [ ] **`FacturaPRO.zip` à détruire / retirer de toute distribution** (artefact compromis, F3) — vérifier les destinations déjà envoyées (§6).
- [ ] **Rotation des PDF contaminés** sous `public/packing-lists/` (F6) + purge des caches/CDN.
- [ ] **Créer `.env.example`** manquant (noms de variables, aucune valeur).
- [ ] Règle d'export : **exclure `.env*` ET `public/packing-lists` de toute future archive** (script de build/export, CI, rule de packaging).
- [ ] Renforcer `.gitignore` si besoin (couverture `.env.*`, `.env.production`, etc.).

### Étape finale — Clôture

1. Revue de la checklist §4 (toutes les cases cochées + responsable nommé).
2. Mise à jour du statut de cette fiche : **OUVERT → CLOS**.
3. Entrée de changelog posée (voir `CHANGELOG.md`).
4. Rétrospective : comment un zip contenant `.env` a pu être généré et distribué.

---

## 6. Ce qui a été vérifié / ce qui reste à vérifier

| Sujet | État | Détail |
| --- | --- | --- |
| Arbre de travail + extraction du zip (1075 fichiers, hors `node_modules`/`__MACOSX`) : présence des valeurs de secrets | ✅ **Vérifié** | F5 — valeurs de `AUTH_SECRET`, `DATABASE_URL`, `SMTP_PASS`, `SMTP_HOST`, `Mistral-Ai-OCR3` uniquement dans `.env` |
| Présence d'une copie de `.env` dans `FacturaPRO.zip` | ✅ **Vérifié** | F3 — identique octet à octet |
| Contenu de `__MACOSX/._.env` | ✅ **Vérifié** | F4 — aucune valeur de secret |
| Contamination des PDF sous `public/packing-lists/` | ✅ **Vérifié** | F6 — 2 fichiers concernés |
| Présence de `.env` dans `.gitignore` | ✅ **Vérifié** | F2 — règle `.env*` à la ligne 34 |
| Statut git de l'export | ✅ **Vérifié** | F1 — **ce n'est pas un dépôt git** |
| **Historique git du dépôt canonique** (toutes branches/remotes) | ❌ **NON VÉRIFIÉ** | Impossible sur cet export (`fatal: not a git repository`) — §3.4 à exécuter |
| Journaux d'accès provider (DB, SMTP, API OCR) | ❌ **NON VÉRIFIÉ** | À consulter côté provider : y a-t-il eu connexion avec les identifiants depuis la mise en ligne du zip ? |
| Qui a déjà reçu / cloné / stocké `FacturaPRO.zip` ? | ❌ **NON VÉRIFIÉ** | Réseau de distribution, backups, machines tierces, boîtes mail |
| Statut des secrets chez les providers (révoqués ou non) | ❌ **NON VÉRIFIÉ** | **Aucune rotation n'a encore été effectuée** |
| Présence des secrets hors arbre de travail + zip scannés (logs, CI, backups, artefacts) | ⚠️ **Partiellement vérifié** | Périmètre scanné = arbre de travail + zip uniquement |

---

## 7. Liens

- Entrée de changelog : `docs/wiki/CHANGELOG.md`
- Sommaire du wiki : `docs/wiki/README.md`
- Règle wiki : **ne jamais écrire de secrets** — ce document n'en contient aucun (vérifié par scan automatique).
