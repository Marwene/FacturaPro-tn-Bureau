#!/usr/bin/env node
/**
 * scripts/check-rules.mjs — **Prompt E, exigence 9** (Governor).
 *
 * Références :
 *   - docs/audits/PROMPTS-GOVERNOR-FACTURAPRO.md:230
 *     « Script scripts/check-rules.mjs qui liste les routes sans permission ni
 *       schema ; il doit sortir 0 hors liste blanche documentée. »
 *   - docs/audits/AUDIT-COMPLET-FACTURAPRO-2026-10-07.md §6.3-6 (AG-7)
 *
 * Contrôles sur **tous** les `route.ts` de `app/api` (analyse du fichier entier,
 * commentaires neutralisés — jamais une seule ligne) :
 *
 *   1. [garde]      tout appel `apiRoute.<méthode>(` doit porter
 *                   `permission: "<cle>"` **ou** `authOnly: true`.
 *   2. [wrapper]    tout handler exporté (`export const GET/POST/…` ou
 *                   `export async function GET/POST/…`) doit passer par
 *                   `apiRoute` **ou** figurer dans WHITELIST_NO_WRAPPER.
 *   3. [validation] toute route qui lit `request.json()` doit déclarer
 *                   `schema:` dans sa config `apiRoute` **ou** appeler
 *                   `.safeParse(` dans le fichier (routes publiques hors
 *                   wrapper).
 *
 * Sortie : compteurs exacts + liste détaillée des violations
 * (fichier:ligne), puis **exit 0 si 0 violation hors liste blanche, 1 sinon**
 * (code posé via `process.exitCode` pour garantir l'flush de stdout pipé).
 *
 * La **liste blanche est documentée dans ce fichier, en un seul endroit par
 * contrôle**, avec la raison écrite de chaque route et le renvoi vers le wiki :
 *   - `WHITELIST_NO_WRAPPER` (contrôle 2 uniquement) : n'exonère ni du
 *     contrôle 1 (garde) ni du contrôle 3 (validation) ;
 *   - `WHITELIST_VALIDATION` (contrôle 3 uniquement, lot E6) : route qui lit
 *     `request.json()` sans `schema:` ni `.safeParse(` mais dont le corps est
 *     **volontairement ignoré** (lecture immédiatement avortée par `.catch(`,
 *     résultat jamais lié ni exploité). Une route de cette liste qui LIERAIT ou
 *     exploiterait le corps ressort toujours en violation.
 *
 * Node standard uniquement — **aucune dépendance**.
 *
 * Usage :
 *   node scripts/check-rules.mjs                → contrôle du dépôt
 *   node scripts/check-rules.mjs --self-test    → fixtures synthétiques (0 écriture disque)
 *   npm run check-rules
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/* ------------------------------------------------------------------------- *
 *  LISTE BLANCHE — SOURCE UNIQUE, RÉVISABLE EN UN SEUL ENDREIT
 *
 *  Routes qui exportent un handler SANS passer par `lib/api-route.ts`.
 *  Chaque entrée porte sa raison écrite + le document wiki qui la justifie.
 *  Registre consolidé : docs/wiki/auth.md § « routes publiques »
 *  (« 11 routes sans wrapper ») et docs/wiki/dashboard-rapports.md
 *  § « Whitelist `cron/*` — Option C1 ».
 *
 *  Toute route ajoutée/retirée de ce tableau doit être justifiée ici ;
 *  une entrée dont le fichier n'existe plus (ou est désormais wrappé) est
 *  signalée en violation `whitelist` par le script (anti-rot).
 * ------------------------------------------------------------------------- */
const WHITELIST_NO_WRAPPER = [
  {
    path: "app/api/auth/[...nextauth]/route.ts",
    reason:
      "NextAuth v5 : `GET = handlers.GET` + `POST` = le flux de connexion/CSRF lui-même, appelé pré-auth. Le wrapper impose `session?.id` → 401 : wrappée, l'entrée d'auth renverrait 401 en permanence.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » + § « Migration apiRoute P1-5 Groupe 5 »",
  },
  {
    path: "app/api/auth/register/route.ts",
    reason:
      "Inscription publique pré-auth (rate-limit IP), validée par `registerSchema.safeParse` avec le même contrat 422 (lot E2a). Le wrapper imposerait un 401.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » / § Rate limiting",
  },
  {
    path: "app/api/auth/resend-code/route.ts",
    reason:
      "Renvoi du code de vérification pré-auth (rate-limit IP), validé par `resendCodeSchema.safeParse` (lot E2a). Le wrapper imposerait un 401.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » / § Rate limiting",
  },
  {
    path: "app/api/users/check-status/route.ts",
    reason:
      "Réponse générique anti-énumération appelée pré-auth depuis le login (C2 / audit S-9), rate-limit IP ; le corps n'est lu que pour la comptabilisation du rate limit et n'est jamais exploité. Le wrapper imposerait un 401.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » + § « Décision Option A » (2026-09-28)",
  },
  {
    path: "app/api/users/verify-email/route.ts",
    reason:
      "Vérification d'e-mail pré-auth (rate-limit IP + e-mail), validée par `verifyEmailSchema.safeParse` (lot E2a). Le wrapper imposerait un 401.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » + § « Décision Option A » (2026-09-28)",
  },
  {
    path: "app/api/taux-bct/route.ts",
    reason:
      "Option A″ : proxy public de la BCT, 0 appel `getSessionFromRequest`, 0 permission, aucune donnée interne ; appelé sans session par `hooks/use-bl.ts` et `hooks/use-devis.ts`. Wrappée = 401 permanent + permission à inventer (interdit).",
    docs: "docs/wiki/tresorerie.md § « Décision Option A″ » (2026-09-28)",
  },
  {
    path: "app/api/tmm-bct/route.ts",
    reason:
      "Option A″ : proxy public de la BCT ; GET consommé sans session par `hooks/use-tmm-bct.ts`, POST déclenché hors session. Même refus de wrapper.",
    docs: "docs/wiki/tresorerie.md § « Décision Option A″ » (2026-09-28)",
  },
  {
    path: "app/api/taux-change/[devise]/route.ts",
    reason:
      "Option A″ : proxy public open.er-api.com, aucun appelant en repo, aucune session possible. Wrappée = 401 permanent.",
    docs: "docs/wiki/tresorerie.md § « Décision Option A″ » (2026-09-28)",
  },
  {
    path: "app/api/cron/check-echeances/route.ts",
    reason:
      "Option C1 : déclenché par un planificateur externe sans session ; garde propre `guardCronRequest(request, \"check-echeances\")` (échec fermé, lot E4). Wrappée = 401 permanent → relances d'échéances mortes.",
    docs: "docs/wiki/dashboard-rapports.md § « Whitelist `cron/*` — Option C1 »",
  },
  {
    path: "app/api/cron/check-echeances/relance-ecart-bc/route.ts",
    reason:
      "Option C1 : idem — planificateur externe sans session, garde `guardCronRequest(request, \"relance-ecart-bc\")` (lot E4). Wrappée = 401 permanent.",
    docs: "docs/wiki/dashboard-rapports.md § « Whitelist `cron/*` — Option C1 »",
  },
  {
    path: "app/api/cron/tmm-bct/route.ts",
    reason:
      "Option C1 : cron Vercel quotidien 02:00 (aucune session injectée) ; authentification `guardCronRequest(request, \"tmm-bct\")` ajoutée au lot E4. Wrappée = 401 permanent → rafraîchissement TMM BCT cassé.",
    docs: "docs/wiki/dashboard-rapports.md § « Whitelist `cron/*` — Option C1 »",
  },
];

/* ------------------------------------------------------------------------- *
 *  LISTE BLANCHE « CORPS LU NON EXPLOITÉ » — CONTRÔLE 3 UNIQUEMENT (lot E6)
 *
 *  Routes qui lisent `request.json()` sans `schema:` ni `.safeParse(` parce
 *  que le corps est lu **uniquement pour comptabiliser le rate-limit IP**
 *  (parité « corps malformé/vide compte aussi ») et n'est **jamais lié ni
 *  exploité**. Mêmes garanties que WHITELIST_NO_WRAPPER : source unique, raison
 *  écrite + renvoi wiki, et anti-rot (fichier absent → violation `whitelist`).
 *
 *  Périmètre VOLONTAIREMENT étroit : l'exemption ne vaut que si chaque lecture
 *  du corps est immédiatement avortée par `.catch(` et que son résultat n'est
 *  jamais affecté (`const body = await request.json()` → violation, même pour
 *  une route listée). Registre : docs/wiki/auth.md § « check-rules ».
 * ------------------------------------------------------------------------- */
const WHITELIST_VALIDATION = [
  {
    path: "app/api/users/check-status/route.ts",
    reason:
      "`request.json().catch(() => null)` lu puis jeté : la lecture sert uniquement à comptabiliser le rate-limit IP (parité corps malformé/vide) ; aucun état de compte n'est renvoyé avant authentification (réponse générique anti-énumération C2 / audit S-9 / arbitrage E2a). Aucun `schema:` ni `.safeParse(` n'a de sens : il n'y a rien à valider.",
    docs: "docs/wiki/auth.md § « apiRoute non applicable (justification) » + § « check-rules : liste WHITELIST_VALIDATION » (2026-10-23, lot E6)",
  },
];

/* ------------------------------------------------------------------------- *
 *  ANALYSE LEXICALE
 * ------------------------------------------------------------------------- */

/** Commentaires neutralisés (remposés d'espaces, lignes conservées) : aucun
 *  motif détecté ne peut provenir d'un commentaire. Chaine/regex préservés. */
function stripComments(src) {
  const out = src.split("");
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = i + 1 < n ? src[i + 1] : "";
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") {
        out[i] = " ";
        i++;
      }
    } else if (c === "/" && next === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < n) {
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
      }
    } else if (c === '"' || c === "'" || c === "`") {
      i = skipQuoted(src, i);
    } else if (c === "/" && startsRegexAt(src, i)) {
      i = skipRegex(src, i);
    } else {
      i++;
    }
  }
  return out.join("");
}

function skipQuoted(src, start) {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      i += 2;
      continue;
    }
    if (src[i] === quote) return i + 1;
    i++;
  }
  return src.length;
}

function skipRegex(src, start) {
  let i = start + 1;
  let inClass = false;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "\n") return i;
    if (inClass) {
      if (c === "]") inClass = false;
      i++;
      continue;
    }
    if (c === "[") {
      inClass = true;
      i++;
      continue;
    }
    if (c === "/") {
      i++;
      break;
    }
    i++;
  }
  while (i < src.length && /[a-z]/i.test(src[i])) i++;
  return i;
}

const REGEX_PRECEDING_CHARS = new Set([
  "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";",
  "+", "-", "*", "%", "~", "^", "<", ">", "\n", "\r", "\t", " ",
]);
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return", "typeof", "case", "in", "of", "new", "delete", "void",
  "instanceof", "do", "else", "yield", "await", "throw",
]);

/** `/` débutant une regex littérale (sinon division) — évite d'interpréter un
 *  `/` de regex comme l'ouverture d'un commentaire. */
function startsRegexAt(code, slashIndex) {
  let i = slashIndex - 1;
  while (i >= 0 && (code[i] === " " || code[i] === "\t" || code[i] === "\n" || code[i] === "\r")) i--;
  if (i < 0) return true;
  const c = code[i];
  if (REGEX_PRECEDING_CHARS.has(c)) return true;
  if (!/[\w$]/.test(c)) return false;
  let j = i;
  while (j >= 0 && /[\w$]/.test(code[j])) j--;
  return REGEX_PRECEDING_KEYWORDS.has(code.slice(j + 1, i + 1));
}

function buildLineStarts(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineOf(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Objet littéral équilibré commençant à `start` (index de `{`). */
function readObjectLiteral(code, start) {
  let depth = 0;
  let i = start;
  while (i < code.length) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipQuoted(code, i);
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return code.slice(start, i + 1);
    }
    i++;
  }
  return code.slice(start);
}

/* ------------------------------------------------------------------------- *
 *  MOTIFS
 * ------------------------------------------------------------------------- */

const RE_API_ROUTE_CALL = /(?<![\w$])apiRoute\s*\.\s*(get|post|put|patch|delete)\s*\(/g;
const RE_EXPORT_HANDLER =
  /(?<![\w$])export\s+(?:async\s+)?(function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
const RE_BODY_READ = /(?<![\w$])request\s*\.\s*json\s*\(/g;
const RE_SAFE_PARSE = /(?<![\w$])safeParse(?:Async)?\s*\(/;
const RE_ZOD_PARSE = /(?<!JSON)\.parse\s*\(/;
const RE_PERMISSION = /(?<![\w$])permission\s*:\s*["']/;
const RE_AUTH_ONLY = /(?<![\w$])authOnly\s*:\s*true\b/;
// `json_schema:` (routes OCR `extract`) est EXCLU par le lookbehind `[\w$]`.
const RE_SCHEMA = /(?<![\w$])schema\s*:/;
const RE_QUERY = /(?<![\w$])query\s*:/;
// Contrôle 3 — lecture du corps NON exploitée (exemption WHITELIST_VALIDATION) :
// `const body = await request.json()` affecte le résultat → exploitation possible.
const RE_BODY_BOUND = /=\s*(?:await\s+)?request\s*\.\s*json\s*\(/;
// Lecture immédiatement avortée : `request.json().catch(` → le jeton est suivi.
const RE_BODY_ABORTED = /request\s*\.\s*json\s*\(\s*\)\s*\.\s*catch\s*\(/g;

/**
 * Corps lu mais **volontairement ignoré** : aucune affectation du résultat
 * (`= await request.json()`) ET chaque lecture est immédiatement avortée par
 * `.catch(`. C'est la seule configuration que `WHITELIST_VALIDATION` exonère
 * du contrôle 3 — un corps lié ou exploité reste une violation, même pour une
 * route listée.
 * @param {string} code code commentaires neutralisés
 * @returns {boolean}
 */
function bodyReadIgnored(code) {
  if (RE_BODY_BOUND.test(code)) return false;
  RE_BODY_READ.lastIndex = 0;
  let reads = 0;
  while (RE_BODY_READ.exec(code) !== null) reads++;
  RE_BODY_ABORTED.lastIndex = 0;
  let aborted = 0;
  while (RE_BODY_ABORTED.exec(code) !== null) aborted++;
  return reads > 0 && aborted === reads;
}

/* ------------------------------------------------------------------------- *
 *  CŒUR DU DÉTECTEUR (pur — sans I/O : réutilisable par --self-test)
 * ------------------------------------------------------------------------- */

/**
 * @param {Array<{ path: string, content: string }>} files
 * @param {{ fullRepo?: boolean }} [options] `fullRepo: false` = jeu de
 *   fixtures partiel (le contrôle « entrée de liste blanche dont le fichier
 *   est absent » n'a alors aucun sens ; le dépôt réel passe par `true`).
 * @returns {{ counters: Record<string, number>, violations: Array<{ path: string, line: number, type: string, message: string }> }}
 */
function analyze(files, options = {}) {
  const fullRepo = options.fullRepo !== false;
  const whitelistPaths = new Set(WHITELIST_NO_WRAPPER.map((entry) => entry.path));
  const validationWhitelistPaths = new Set(WHITELIST_VALIDATION.map((entry) => entry.path));
  const presentPaths = new Set();
  const wrappedWhitelistPaths = new Set();

  const counters = {
    routes: 0,
    apiCalls: 0,
    guardedPermission: 0,
    guardedAuthOnly: 0,
    unguarded: 0,
    exportedHandlers: 0,
    handlersViaApiRoute: 0,
    handlersBare: 0,
    routesWithoutWrapper: 0,
    whitelistedRoutes: 0,
    routesWithoutWrapperNotWhitelisted: 0,
    schemaConfigs: 0,
    queryConfigs: 0,
    filesWithSafeParse: 0,
    bodyReads: 0,
    filesWithBodyRead: 0,
    whitelistEntries: WHITELIST_NO_WRAPPER.length,
    whitelistUsed: 0,
    whitelistObsolete: 0,
    validationWhitelistEntries: WHITELIST_VALIDATION.length,
    validationWhitelistUsed: 0,
    validationWhitelistObsolete: 0,
  };
  const violations = [];

  for (const file of files) {
    const rel = file.path;
    presentPaths.add(rel);
    counters.routes++;

    const code = stripComments(file.content);
    const lineStarts = buildLineStarts(code);
    const at = (offset) => lineOf(lineStarts, offset);

    // ---- contrôles 1 + 3 (appels apiRoute) --------------------------------
    const calls = [];
    RE_API_ROUTE_CALL.lastIndex = 0;
    let match;
    while ((match = RE_API_ROUTE_CALL.exec(code)) !== null) {
      const line = at(match.index);
      const openParen = match.index + match[0].length - 1;
      let cfgStart = openParen + 1;
      while (cfgStart < code.length && /\s/.test(code[cfgStart])) cfgStart++;
      const config = code[cfgStart] === "{" ? readObjectLiteral(code, cfgStart) : "";

      const hasPermission = RE_PERMISSION.test(config);
      const hasAuthOnly = RE_AUTH_ONLY.test(config);
      const hasSchema = RE_SCHEMA.test(config);
      const hasQuery = RE_QUERY.test(config);

      counters.apiCalls++;
      if (hasPermission) counters.guardedPermission++;
      if (hasAuthOnly) counters.guardedAuthOnly++;
      if (hasSchema) counters.schemaConfigs++;
      if (hasQuery) counters.queryConfigs++;

      if (!hasPermission && !hasAuthOnly) {
        counters.unguarded++;
        violations.push({
          path: rel,
          line,
          type: "garde",
          message:
            `apiRoute.${match[1]}( sans \`permission: "<cle>"\` ni \`authOnly: true\` dans la config`,
        });
      }

      calls.push({ line, method: match[1], hasSchema });
    }

    // ---- contrôle 2 (handlers exportés) -----------------------------------
    const bareHandlers = [];
    RE_EXPORT_HANDLER.lastIndex = 0;
    while ((match = RE_EXPORT_HANDLER.exec(code)) !== null) {
      counters.exportedHandlers++;
      const kind = match[1];
      const name = match[2];
      const line = at(match.index);
      const nameEnd = match.index + match[0].length;
      let viaApiRoute = false;
      if (kind === "const") {
        // `export const X = …` : le init doit être un appel apiRoute.<m>.
        const init = /^\s*(?::[\s\S]*?)?=\s*apiRoute\s*\.\s*(?:get|post|put|patch|delete)\s*\(/.exec(
          code.slice(nameEnd),
        );
        viaApiRoute = init !== null;
      }
      if (viaApiRoute) counters.handlersViaApiRoute++;
      else {
        counters.handlersBare++;
        bareHandlers.push({ line, name });
      }
    }

    const usesWrapper = calls.length > 0;
    if (bareHandlers.length > 0 && !usesWrapper) counters.routesWithoutWrapper++;

    const whitelisted = whitelistPaths.has(rel);
    if (whitelisted) {
      counters.whitelistedRoutes++;
      if (usesWrapper) wrappedWhitelistPaths.add(rel);
      else counters.whitelistUsed++;
    } else if (bareHandlers.length > 0 && !usesWrapper) {
      counters.routesWithoutWrapperNotWhitelisted++;
    }

    for (const handler of bareHandlers) {
      if (!whitelisted) {
        violations.push({
          path: rel,
          line: handler.line,
          type: "wrapper",
          message:
            `handler ${handler.name} exporté sans passer par \`apiRoute\` — route absente de la liste blanche (WHITELIST_NO_WRAPPER)`,
        });
      }
    }

    // ---- contrôle 3 (lecture du corps) ------------------------------------
    const hasSafeParse = RE_SAFE_PARSE.test(code);
    if (hasSafeParse) counters.filesWithSafeParse++;

    const bodyReads = [];
    RE_BODY_READ.lastIndex = 0;
    while ((match = RE_BODY_READ.exec(code)) !== null) bodyReads.push(at(match.index));

    if (bodyReads.length > 0) {
      counters.bodyReads += bodyReads.length;
      counters.filesWithBodyRead++;
      const validated = hasSafeParse || calls.some((call) => call.hasSchema);
      const whitelistedValidation = validationWhitelistPaths.has(rel);
      if (validated) {
        // Contrôle 3 satisfait par `schema:` ou `.safeParse(`.
      } else if (whitelistedValidation && bodyReadIgnored(code)) {
        // Corps lu mais VOLONTAIREMENT ignoré (comptabilisation rate-limit) :
        // exemption documentée du contrôle 3 (WHITELIST_VALIDATION, lot E6).
        counters.validationWhitelistUsed++;
      } else {
        const zodParse = RE_ZOD_PARSE.test(code);
        const note = zodParse
          ? " — note : un `.parse()` Zod est présent (validation existante) mais une ZodError non convertie atterrit dans le catch du wrapper → 500 au lieu du 422 `lib/api-route.ts` : à migrer vers `schema:`"
          : "";
        const whitelistNote = whitelistedValidation
          ? " — route présente dans WHITELIST_VALIDATION mais le corps est lié/exploité (l'exemption ne couvre que la lecture avortée et jetée)"
          : "";
        for (const line of bodyReads) {
          violations.push({
            path: rel,
            line,
            type: "validation",
            message:
              `\`request.json()\` lu sans \`schema:\` (config apiRoute) ni \`.safeParse(\` dans le fichier${note}${whitelistNote}`,
          });
        }
      }
    }
  }

  // ---- hygiène de la liste blanche (anti-rot) -----------------------------
  for (const entry of WHITELIST_NO_WRAPPER) {
    if (!presentPaths.has(entry.path)) {
      if (!fullRepo) continue; // jeu de fixtures partiel : « absent » non significatif
      counters.whitelistObsolete++;
      violations.push({
        path: entry.path,
        line: 1,
        type: "whitelist",
        message: "entrée de liste blanche obsolète : fichier absent de app/api (à retirer de WHITELIST_NO_WRAPPER)",
      });
    } else if (wrappedWhitelistPaths.has(entry.path)) {
      counters.whitelistObsolete++;
      violations.push({
        path: entry.path,
        line: 1,
        type: "whitelist",
        message: "entrée de liste blanche obsolète : la route est désormais wrappée par `apiRoute` (à retirer de WHITELIST_NO_WRAPPER)",
      });
    }
  }

  // ---- hygiène de WHITELIST_VALIDATION (anti-rot, contrôle 3) -------------
  for (const entry of WHITELIST_VALIDATION) {
    if (!presentPaths.has(entry.path)) {
      if (!fullRepo) continue; // jeu de fixtures partiel : « absent » non significatif
      counters.validationWhitelistObsolete++;
      violations.push({
        path: entry.path,
        line: 1,
        type: "whitelist",
        message: "entrée de liste blanche obsolète : fichier absent de app/api (à retirer de WHITELIST_VALIDATION)",
      });
    }
  }

  return { counters, violations };
}

function exitCodeFor(violations) {
  return violations.length > 0 ? 1 : 0;
}

/* ------------------------------------------------------------------------- *
 *  LECTURE DU DÉPÔT
 * ------------------------------------------------------------------------- */

function collectRouteFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectRouteFiles(full, out);
    else if (/^route\.(ts|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function readRepoRoutes() {
  const files = collectRouteFiles(join(ROOT, "app", "api"), []).sort();
  return files.map((full) => ({
    path: relative(ROOT, full).split(sep).join("/"),
    content: readFileSync(full, "utf8"),
  }));
}

/* ------------------------------------------------------------------------- *
 *  RAPPORT
 * ------------------------------------------------------------------------- */

function pad(label, value) {
  return `  ${label.padEnd(46, ".")} ${String(value)}`;
}

function printReport(counters, violations) {
  console.log("check-rules.mjs — Prompt E exigence 9 — contrôles app/api/**/route.ts");
  console.log(`exécution : ${new Date().toISOString()} — node ${process.version}`);
  console.log("");

  console.log(
    `LISTE BLANCHE « routes sans wrapper » — ${counters.whitelistEntries} entrées ` +
      "(source unique : WHITELIST_NO_WRAPPER dans scripts/check-rules.mjs)",
  );
  console.log(
    "  détails : docs/wiki/auth.md § routes publiques · docs/wiki/dashboard-rapports.md § Whitelist cron/*",
  );
  for (const entry of WHITELIST_NO_WRAPPER) {
    console.log(`  - ${entry.path}`);
    console.log(`      raison : ${entry.reason}`);
    console.log(`      wiki   : ${entry.docs}`);
  }
  console.log("");

  console.log(
    `LISTE BLANCHE « corps lu non exploité » (contrôle 3 seulement) — ${counters.validationWhitelistEntries} entrées ` +
      "(source unique : WHITELIST_VALIDATION dans scripts/check-rules.mjs)",
  );
  console.log("  détails : docs/wiki/auth.md § check-rules (lot E6)");
  for (const entry of WHITELIST_VALIDATION) {
    console.log(`  - ${entry.path}`);
    console.log(`      raison : ${entry.reason}`);
    console.log(`      wiki   : ${entry.docs}`);
  }
  console.log("");

  console.log("COMPTEURS");
  console.log(pad("routes analysées", counters.routes));
  console.log(pad("appels apiRoute", counters.apiCalls));
  console.log(pad("  avec permission:", counters.guardedPermission));
  console.log(pad("  avec authOnly: true", counters.guardedAuthOnly));
  console.log(pad("  sans garde (VIOLATION)", counters.unguarded));
  console.log(pad("handlers exportés", counters.exportedHandlers));
  console.log(pad("  via apiRoute", counters.handlersViaApiRoute));
  console.log(pad("  hors apiRoute", counters.handlersBare));
  console.log(pad("routes sans wrapper", counters.routesWithoutWrapper));
  console.log(pad("  whitelistées", counters.whitelistedRoutes));
  console.log(pad("  non whitelistées (VIOLATION)", counters.routesWithoutWrapperNotWhitelisted));
  console.log(pad("configs apiRoute avec schema:", counters.schemaConfigs));
  console.log(pad("configs apiRoute avec query:", counters.queryConfigs));
  console.log(pad("fichiers avec .safeParse(", counters.filesWithSafeParse));
  console.log(pad("lectures request.json()", counters.bodyReads));
  console.log(pad("  sur fichiers", counters.filesWithBodyRead));
  console.log(pad("entrées liste blanche utilisées", counters.whitelistUsed));
  console.log(pad("entrées liste blanche obsolètes", counters.whitelistObsolete));
  console.log(pad("entrées WHITELIST_VALIDATION utilisées", counters.validationWhitelistUsed));
  console.log(pad("entrées WHITELIST_VALIDATION obsolètes", counters.validationWhitelistObsolete));
  console.log("");

  console.log(`VIOLATIONS (${violations.length})`);
  if (violations.length === 0) {
    console.log("  (aucune)");
  } else {
    const sorted = [...violations].sort((a, b) =>
      a.path === b.path ? a.line - b.line : a.path.localeCompare(b.path),
    );
    for (const v of sorted) console.log(`  ${v.path}:${v.line}: [${v.type}] ${v.message}`);
  }
  console.log("");

  const code = exitCodeFor(violations);
  if (code === 0) {
    console.log("RÉSULTAT : 0 violation hors liste blanche → exit 0");
  } else {
    console.log(`RÉSULTAT : ${violations.length} violation(s) hors liste blanche → exit ${code}`);
  }
}

/* ------------------------------------------------------------------------- *
 *  SELF-TEST — fixtures synthétiques EN MÉMOIRE (0 écriture disque, 0 fichier
 *  temporaire dans le dépôt). Prouve que le détecteur détecte réellement.
 * ------------------------------------------------------------------------- */

const FIXTURES = [
  {
    id: "a",
    title: "config apiRoute sans garde → violation `garde`",
    expect: ["garde"],
    files: [
      {
        path: "app/api/__selftest__/no-guard/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "export const GET = apiRoute.get(",
          "  { requireCompany: true },",
          "  async () => ({ ok: true }),",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "b",
    title: "handler exporté sans wrapper, hors liste blanche → violation `wrapper`",
    expect: ["wrapper"],
    files: [
      {
        path: "app/api/__selftest__/bare/route.ts",
        content: [
          "export async function POST(request: NextRequest) {",
          "  return NextResponse.json({ ok: true });",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "c",
    title: "corps lu sans `schema:` ni `.safeParse(` → violation `validation`",
    expect: ["validation"],
    files: [
      {
        path: "app/api/__selftest__/body/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "export const POST = apiRoute.post(",
          '  { permission: "parametres:creer" },',
          "  async (request) => {",
          "    const body = await request.json();",
          "    return body;",
          "  },",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "d",
    title: "route whitelistée + `.safeParse(` → 0 violation",
    expect: [],
    files: [
      {
        path: "app/api/auth/register/route.ts",
        content: [
          "export async function POST(request: NextRequest) {",
          "  const parsed = registerSchema.safeParse(await request.json());",
          '  if (!parsed.success) return NextResponse.json({ error: "ko" }, { status: 422 });',
          "  return NextResponse.json({ ok: true });",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "e",
    title: "code retour : jeu conforme → exit 0",
    exitCode: true,
    expect: [],
    files: [
      {
        path: "app/api/__selftest__/conforme/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "const updateSchema = z.object({ nom: z.string() });",
          "export const PATCH = apiRoute.patch(",
          "  { authOnly: true, schema: updateSchema },",
          "  async (_request, { body }) => ({ body }),",
          ");",
          "export const GET = apiRoute.get(",
          '  { permission: "parametres:voir" },',
          "  async () => ({ ok: true }),",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "f",
    title: "`json_schema:` (routes OCR `extract`) ne satisfait PAS le contrôle 3",
    expect: ["validation"],
    files: [
      {
        path: "app/api/__selftest__/extract/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "const OCR_JSON_SCHEMA = { type: 'object' };",
          "function payload() { return { json_schema: { schema: OCR_JSON_SCHEMA } }; }",
          "export const POST = apiRoute.post(",
          '  { permission: "factures:creer" },',
          "  async (request) => {",
          "    const body = await request.json();",
          "    return { body, schema: payload() };",
          "  },",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "g",
    title: "corps lu dans une SOUS-FONCTION → violation `validation` (fichier entier)",
    expect: ["validation"],
    files: [
      {
        path: "app/api/__selftest__/subfn/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "export const POST = apiRoute.post(",
          '  { permission: "factures:creer" },',
          "  async () => handleIt(),",
          ");",
          "async function handleIt() {",
          "  const body = await request.json();",
          "  return body;",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "h",
    title: "route whitelistée (wrapper) mais corps lu sans validation → violation `validation` (WHITELIST_NO_WRAPPER ne couvre que le contrôle 2)",
    expect: ["validation"],
    files: [
      {
        path: "app/api/auth/resend-code/route.ts",
        content: [
          "export async function POST(request: NextRequest) {",
          "  await request.json().catch(() => null);",
          "  return NextResponse.json({ ok: true });",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "i",
    title: "appel apiRoute mentionné uniquement dans un COMMENTAIRE → violation `wrapper` (commentaires neutralisés)",
    expect: ["wrapper"],
    files: [
      {
        path: "app/api/__selftest__/comment/route.ts",
        content: [
          "// export const GET = apiRoute.get({ permission: 'parametres:voir' }, h);",
          "export async function GET() {",
          "  return null;",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "j",
    title: "route whitelistée qui utilise désormais `apiRoute` → violation `whitelist` (anti-rot)",
    expect: ["whitelist"],
    files: [
      {
        path: "app/api/cron/tmm-bct/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "export const GET = apiRoute.get(",
          '  { permission: "parametres:voir" },',
          "  async () => ({ ok: true }),",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "m",
    title: "route dans WHITELIST_VALIDATION mais corps LIÉ/exploité sans validation → violation `validation` (l'exemption ne couvre que la lecture jetée)",
    expect: ["validation"],
    files: [
      {
        path: "app/api/users/check-status/route.ts",
        content: [
          "export async function POST(request: NextRequest) {",
          "  const body = await request.json().catch(() => null);",
          "  return NextResponse.json({ ok: true, email: body?.email });",
          "}",
        ].join("\n"),
      },
    ],
  },
  {
    id: "n",
    title: "route NON listée avec corps ignoré (`.catch(() => null)`) → violation `validation` (l'exemption est étroite, jamais implicite)",
    expect: ["validation"],
    files: [
      {
        path: "app/api/__selftest__/ignored-body/route.ts",
        content: [
          'import { apiRoute } from "@/lib/api-route";',
          "export const POST = apiRoute.post(",
          '  { permission: "parametres:creer" },',
          "  async (request) => {",
          "    await request.json().catch(() => null);",
          "    return { ok: true };",
          "  },",
          ");",
        ].join("\n"),
      },
    ],
  },
  {
    id: "o",
    title: "route dans WHITELIST_VALIDATION, corps lu puis avorté/jeté → 0 violation (exemption contrôlée du contrôle 3)",
    expect: [],
    files: [
      {
        path: "app/api/users/check-status/route.ts",
        content: [
          "export async function POST(request: NextRequest) {",
          "  await request.json().catch(() => null);",
          "  return NextResponse.json({ ok: true });",
          "}",
        ].join("\n"),
      },
    ],
  },
];

function runSelfTest() {
  console.log("check-rules.mjs — SELF-TEST (fixtures synthétiques en mémoire, 0 écriture disque)");
  console.log("");

  let failures = 0;

  for (const fixture of FIXTURES) {
    const { violations } = analyze(fixture.files, { fullRepo: false });

    if (fixture.exitCode === true) {
      const code = exitCodeFor(violations);
      const ok = code === 0;
      if (!ok) failures++;
      console.log(`  [${ok ? "OK" : "ÉCHEC"}] (${fixture.id}) ${fixture.title}`);
      console.log(`           → code retour attendu 0, obtenu ${code}`);
      continue;
    }

    const got = violations.map((v) => v.type).sort();
    const want = [...fixture.expect].sort();
    const ok = got.length === want.length && got.every((type, i) => type === want[i]);
    if (!ok) failures++;
    console.log(`  [${ok ? "OK" : "ÉCHEC"}] (${fixture.id}) ${fixture.title}`);
    console.log(`           → violations attendues [${want.join(", ") || "aucune"}], obtenues [${got.join(", ") || "aucune"}]`);
    for (const v of violations) console.log(`             ${v.path}:${v.line}: [${v.type}] ${v.message}`);
  }

  // 5ᵉ cas négatif explicite : le code de sortie doit être 1 dès qu'UNE
  // violation existe (et 0 sur un jeu propre) — prouve que le script ne
  // renvoie pas toujours 0.
  const dirty = analyze(
    [
      {
        path: "app/api/__selftest__/dirty/route.ts",
        content: "export async function GET() { return null; }\n",
      },
    ],
    { fullRepo: false },
  );
  const dirtyCode = exitCodeFor(dirty.violations);
  const dirtyOk = dirtyCode === 1;
  if (!dirtyOk) failures++;
  console.log(`  [${dirtyOk ? "OK" : "ÉCHEC"}] (k) fixture violée seule → exit 1 attendu, obtenu ${dirtyCode}`);

  // Contrôle de non-régression : un jeu strictement conforme sort 0.
  const clean = analyze(FIXTURES.find((f) => f.id === "e").files, { fullRepo: false });
  const cleanCode = exitCodeFor(clean.violations);
  const cleanOk = cleanCode === 0;
  if (!cleanOk) failures++;
  console.log(`  [${cleanOk ? "OK" : "ÉCHEC"}] (l) jeu conforme seul → exit 0 attendu, obtenu ${cleanCode}`);

  console.log("");
  if (failures > 0) {
    console.log(`SELF-TEST ÉCHEC — ${failures} cas en échec`);
    process.exitCode = 1;
    return;
  }
  console.log(`SELF-TEST OK — ${FIXTURES.length + 2} cas`);
  process.exitCode = 0;
}

/* ------------------------------------------------------------------------- *
 *  POINT D'ENTRÉE
 * ------------------------------------------------------------------------- */

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }
  const files = readRepoRoutes();
  const { counters, violations } = analyze(files);
  printReport(counters, violations);
  process.exitCode = exitCodeFor(violations);
}

main();
