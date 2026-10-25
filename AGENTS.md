<!-- GRAPHIFY SYSTEM ACTIVATED -->

# Facturapro-tn AI EXECUTION SYSTEM

This project uses a STRICT agentic workflow.

Graphify is the SINGLE SOURCE OF TRUTH for all codebase understanding.

---

## 🚨 GLOBAL RULES (NON NEGOTIABLE)

You are FORBIDDEN from writing code before completing Graphify analysis.

You MUST NEVER:
- guess file locations
- grep/search manually
- assume architecture
- duplicate existing logic


You MUST always output:

A. GRAPHIFY RESULT
B. DEPENDENCY ANALYSIS
C. EXECUTION PLAN
D. ONLY THEN TOOL USAGE
---

## 🚫 CODE RULES (NON NEGOTIABLE — MÊME STATUT QUE GRAPHIFY)

Ces règles ont EXACTEMENT le même statut que les règles Graphify ci-dessus : les violer est un HARD STOP, pas une recommandation. Elles s'appliquent à TOUS les agents (Governor + sous-agents), à chaque tâche, sans exception implicite.

### Typage
- `any` est INTERDIT (explicite `: any`, `as any`, `<any>`, `any[]`, `Record<string, any>`, et implicite via paramètre non typé).
  Si le typage est complexe : utiliser `unknown` + narrowing, un type Zod inféré (`z.infer<typeof schema>`), ou un générique contraint.
- Avant de committer/terminer une tâche : `any` ne doit apparaître dans AUCUN fichier modifié. Un seul `any` restant = tâche non terminée.

### État et data-fetching
- Tout état serveur (données venant de l'API/DB) DOIT passer par TanStack Query (`useQuery` / `useMutation`). `fetch()` direct dans un composant est INTERDIT — créer ou réutiliser un hook dans `hooks/`.
- Tout état client partagé entre composants DOIT passer par un store Zustand. Réutiliser le pattern factory de `lib/stores/create-list-store.ts` quand c'est pertinent plutôt que dupliquer un store ad hoc.
- `useEffect` est INTERDIT sauf pour une synchronisation avec un système externe non réactif (ex: mesure de layout DOM, souscription à une API navigateur, listener tiers). Le data-fetching, la synchronisation avec l'état serveur, et le debounce de recherche NE SONT JAMAIS des raisons valables — utiliser TanStack Query / Zustand à la place.
  Si un agent pense avoir besoin d'un `useEffect`, il doit d'abord justifier explicitement dans son plan (STEP 3) pourquoi TanStack Query / Zustand / un calcul dérivé au rendu ne suffisent pas. Sans cette justification écrite → STOP.

### API routes
- Toute nouvelle route API DOIT utiliser le wrapper `apiRoute` (`lib/api-route.ts` ou équivalent) pour l'auth, la validation et la gestion d'erreurs centralisées. Une route sans ce wrapper = tâche non terminée, sauf justification explicite dans le plan.

### Base de données
- Voir les règles MANDATORY du Database Agent ci-dessous (section SPECIALIZED AGENTS) : elles ont le même statut HARD STOP.

### Frontend / UI
- Voir les règles du Frontend Agent ci-dessous : le chargement des skills de design est HARD STOP, pas une suggestion.

### Validation avant de clore une tâche
- Avant STEP 5 (update graph) et STEP 6 (wiki), le Governor DOIT faire exécuter `npm run lint` et `npx tsc --noEmit` sur les fichiers modifiés (ou l'ensemble du projet si pertinent) par le sous-agent QA.
- Si le lint ou le typecheck remonte une erreur liée aux règles ci-dessus (`no-explicit-any`, etc.) dans un fichier touché par la tâche → STOP, corriger, revalider. Une tâche n'est PAS terminée tant que ces commandes ne sont pas propres sur les fichiers modifiés.

---

## TOOL EXECUTION RULE

When executing commands:

- NEVER concatenate commands using &&
- NEVER use bash syntax
- ALWAYS execute commands separately
- ALWAYS use `graphify ...` (binaire Python global, PAS `npx graphify`) for Graphify operations

DEFAULT BEHAVIOR IS FORBIDDEN.

The model MUST NOT:
- start with file search
- start with coding
- start with debugging

The ONLY valid starting point is Graphify.

DeepSeek Flash behavior rule:

If unsure → ALWAYS call Graphify first.
If multiple files → MUST call Graphify.
If database involved → MUST call Graphify.
If API involved → MUST call Graphify.

## 🧠 EXECUTION PIPELINE (MANDATORY)

Every request MUST follow this sequence:

### STEP 1 — GRAPHIFY (HARD REQUIREMENT)
Use ONE of:
- graphify query "<request>"
- graphify explain "<concept>"
- graphify path "<A>" "<B>"
- graphify affected "<node>"

### STEP 2 — ANALYSIS
From Graphify output:
- list affected nodes
- list impacted files
- identify dependencies

### STEP 3 — PLAN
- create step-by-step implementation plan
- reuse existing modules when possible
- avoid duplication

### STEP 4 — IMPLEMENTATION
ONLY NOW write or modify code.
Code produced at this step MUST comply with the CODE RULES section above (no `any`, no unjustified `useEffect`, TanStack Query for server state, Zustand for shared client state, `apiRoute` wrapper for API routes).

### STEP 4.5 — CODE RULES VALIDATION (MANDATORY, HARD STOP)
Before moving to STEP 5:
- Run `npm run lint` and `npx tsc --noEmit` on the modified files.
- If any error touches a modified file (especially `no-explicit-any`, unused vars from removed `useEffect`, etc.) → STOP, fix, re-run.
- Confirm no `any`, no unjustified `useEffect`, no direct `fetch()` bypassing TanStack Query, and no API route bypassing `apiRoute` were introduced.
Only when this step is clean does the task move to STEP 5.

### STEP 5 — UPDATE GRAPH
After changes:
- graphify update .

**FAILURE PROCEDURE (MANDATORY — no silent skip allowed):**
`graphify update .` is meant to be an incremental, AST-only operation with no API cost — it
should be fast even for small edits. If it times out, errors, or otherwise fails to complete:
1. Retry ONCE.
2. If it still fails: this is a HARD STOP on STEP 5, not a reason to improvise a shortcut.
   You MUST NOT decide on your own that "the change is small so I'll skip it" or any similar
   self-authorized workaround — that reasoning is explicitly forbidden, no matter how minor
   the change seems.
3. Do NOT silently proceed to STEP 6. Instead:
   - Report clearly that the Graphify graph is now in DRIFT relative to the codebase.
   - Add this drift as a known issue entry in `docs/wiki/CHANGELOG.md`.
   - Flag to the user that `graphify update .` is failing (possible cause: it should be
     incremental/AST-only per the `graphify` skill notes below — a full extraction on 2 files
     suggests a config or cache problem in `.opencode/plugins/graphify.js`, not just slowness).
   - Ask the user how to proceed instead of deciding unilaterally.
This applies regardless of how small or "obviously safe" the change looks — STEP 5 has no
size-based exception.

### STEP 6 — UPDATE WIKI (MANDATORY)
The specialized agent responsible for the modified area MUST document the change:
- update the module file in `docs/wiki/` (functionalities, models, key files)
- add an entry to `docs/wiki/CHANGELOG.md` (format: `- [DATE] Agent (module) : description — fichiers clés`)
- NEVER write secrets (API keys, passwords, connection strings) in the wiki
Every add, modification, or manipulation must be traceable in this wiki.
STEP 6 does not substitute for STEP 5. Both are mandatory and independent — a documented
change with a drifted graph is still an incomplete task (see STEP 5 failure procedure above).

---

## 🧱 GOVERNOR AGENT RULES

There is ONE main orchestrator: GOVERNOR AGENT.

The Governor Agent MUST:
- call Graphify first
- delegate tasks to sub-agents
- ensure plan exists before execution
- validate final output

No agent may bypass Governor.

---

## 🤝 DELEGATION RULE (MANDATORY — APPROUVÉE PAR L'UTILISATEUR)

Pour CHAQUE demande, quelle que soit sa nature ou sa taille, le Governor DOIT déléguer l'implémentation à un sous-agent via le Task tool. Le Governor n'écrit JAMAIS lui-même le code d'implémentation d'une tâche déléguée.

- Correspondance des rôles :
  - Exploration / recherche / lecture de code → `explore`
  - Implémentation Backend → `backend` ; Frontend → `frontend` ; Database → `database` ; Architecture → `architecture` ; QA → `qa`
  - Tâches générales multi-étapes ou hors périmètre des rôles ci-dessus → `general` (le prompt nomme explicitement le rôle à jouer)
- Le prompt de délégation DOIT contenir : le contexte Graphify, les fichiers impactés, l'étape précise du plan, le rôle à jouer, le résultat attendu, un rappel explicite des CODE RULES applicables au rôle (any/useEffect/TanStack/Zustand/apiRoute/skills design/prisma status selon le cas), et les commandes de vérification (lint / tsc) à exécuter.
- Le Governor conserve : Graphify (STEP 1), l'analyse (STEP 2), le plan (STEP 3), la délégation, la validation finale (lint / tsc + revue du diff), `graphify update .` (STEP 5), et le contrôle du STEP 6 (wiki) par le sous-agent responsable.
- Interdiction de court-circuit : le Governor ne remplace pas le sous-agent sur une tâche déléguée ; il orchestre et valide uniquement.
- Les tâches d'orchestration (Graphify, wiki, commit, commandes d'infra) restent gérées par le Governor.

---

## 🧩 SPECIALIZED AGENTS

### Architecture Agent
- dependency analysis
- system design
- Graphify interpretation

### Backend Agent
- API routes
- server actions
- business logic

### Frontend Agent
- Next.js App Router
- UI components
- shadcn/ui integration
- **Impeccable skill** (`.agents/skills/impeccable`) — design, redesign, critique, audit, polish, animate, and all UI/UX tasks. This project is admin/dashboard software: always work in Impeccable's **Operate mode** (scanability, consistency, native expectations), never in Persuade/marketing mode.
- **Make-interfaces-feel-better skill** (`.agents/skills/make-interfaces-feel-better`) — design engineering principles for polish: animations, hover states, shadows, borders, typography, icons, micro-interactions.
- **HARD STOP** : ces deux skills DOIVENT être chargés (`skill: "impeccable"` puis `skill: "make-interfaces-feel-better"`) AVANT d'écrire le moindre JSX pour une tâche de design/UI — au même titre que Graphify. Si l'agent frontend produit une interface sans avoir chargé ces skills, la tâche est considérée comme non conforme et doit être refaite. Une interface "générique" (composants shadcn par défaut sans direction visuelle, sans micro-interactions, sans réflexion produit, tout emballé dans des `<Card>` par habitude) est un motif de rejet par le QA Agent.
- **Design system de référence** : le projet n'a pas de `DESIGN.md`/`PRODUCT.md` — cause directe de l'incohérence visuelle entre modules (le dashboard ne ressemble pas au reste de l'appli). Avant toute nouvelle tâche UI significative : `impeccable init` puis `impeccable document` pour établir ce référentiel une bonne fois, et toute nouvelle tâche UI doit être vérifiée contre lui. Voir le détail complet dans `.opencode/agents/frontend.md`.
- Voir aussi la section CODE RULES : `any` interdit, `useEffect` interdit sauf justification, TanStack Query pour le fetching, Zustand pour l'état partagé.

### Database Agent
- Prisma schema
- migrations
- relations
- **HARD STOP** : après toute modification de schéma, exécuter `npx prisma migrate status`. Si un drift est signalé, il DOIT être résolu (migration générée + `npx prisma generate`) avant de considérer la tâche terminée — ne jamais laisser `schema.prisma` en avance ou en retard sur les migrations appliquées.
- Voir les règles MANDATORY complètes dans `.opencode/agents/database.md`.

### QA Agent
- review code
- detect duplication
- enforce type safety

Each specialized agent MUST record its own changes in `docs/wiki/` (module file + CHANGELOG.md) as part of STEP 6.

---

## 🚨 HARD STOP CONDITION

If Graphify has NOT been executed:

STOP immediately.
Ask for Graphify execution before continuing.

The SAME hard stop applies if, at the end of a task:
- any modified file contains `any` (explicit or implicit),
- any modified file contains an unjustified `useEffect`,
- server state is fetched without TanStack Query,
- shared client state bypasses Zustand,
- a new API route bypasses the `apiRoute` wrapper without justification,
- `npm run lint` / `npx tsc --noEmit` report errors on modified files,
- a Prisma schema change was made without a matching migration (drift),
- a frontend design task was done without loading `impeccable` and `make-interfaces-feel-better`.

In any of these cases: STOP, fix the violation, re-validate, THEN continue to STEP 5/6.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## CHANTIER AUDIT 2026-10 (règles supplémentaires)
- Audit de référence : docs/audits/AUDIT-COMPLET-FACTURAPRO-2026-10-07.md
- Chaque lot : Graphify d'abord, plan, délégation aux sous-agents, jamais de code écrit par le Governor.
- Vérifications finales, une commande à la fois : npm run lint, npx tsc --noEmit, npx vitest run.
- Ne jamais annoncer un compteur sans coller la commande qui le prouve.
- En cas de blocage ou de décision d'architecture : s'arrêter et me demander.
- REUSE FIRST : chercher un composant ou hook existant avant d'en créer un. **Dès la 2ᵉ occurrence d'un motif, on extrait** dans `components/shared/` — et la brique est **branchée sur ce 2ᵉ consommateur dans le même lot** : pas de brique créée « au cas où » (règle étendue le 2026-10-18 par l'utilisateur, détails et garde-fous dans `docs/wiki/ui-dialogs.md` §6 ; précedents : `entity-dialog.tsx` et `filter-bar.tsx` = code mort supprimé). Seuil de vivacité : **≥ 3 usages réels**, sinon suppression ou adoption étendue à un site réel — jamais un usage artificiel.