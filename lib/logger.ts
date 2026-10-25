// lib/logger.ts
// Logger applicatif JSON-lines — ZÉRO dépendance (lot E1, Prompt E).
//
// JUSTIFICATION du choix « sans dépendance » (et non pino) : le prompt impose
// « pino OU équivalent sans dépendance lourde ». Cet environnement a un store
// pnpm corrompu documenté (docs/wiki/CHANGELOG.md § Known Issues) où chaque
// `npm install` est à risque — installer pino n'apporte ici rien que cette
// centaine de lignes ne couvre pas (niveau par env, requestId par requête,
// JSON lines, zéro donnée sensible). Aucune dépendance n'a été installée.
//
// Contrats :
//   - Niveau par variable d'env `LOG_LEVEL` = debug | info | warn | error |
//     silent (défaut "info") — lu à chaque émission (testable sans re-import).
//   - `createRequestId()` : `crypto.randomUUID()` appelé UNE fois par requête ;
//     le même identifiant est exposé au client dans le 500 (lib/api-route.ts)
//     et journalisé côté serveur avec le détail de l'exception.
//   - JAMAIS de donnée sensible : toute clé de contexte dont le nom ressemble à
//     un secret (mot de passe, token, cookie, clé API…) est remplacée par
//     "[redacted]" avant écriture, la profondeur/troncature est bornée, et le
//     JSON est reconstruit from scratch (jamais de sérialisation d'objet brut
//     du caller). Le message lui-même reste sous notre contrôle : les routes
//     passent des tags littéraux, pas des données utilisateur.

/** Niveaux possibles, dans l'ordre croissant de sévérité. */
const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 50,
};

function isLogLevel(value: string): value is LogLevel {
    return (LOG_LEVELS as readonly string[]).includes(value);
}

/** Niveau actif (env `LOG_LEVEL`, défaut `info`, valeur inconnue = défaut). */
function resolveLevel(): LogLevel {
    const raw = process.env.LOG_LEVEL?.toLowerCase() ?? "";
    return isLogLevel(raw) ? raw : "info";
}

/** Clés de contexte jamais écrites en clair (jetons, secrets, cookies…). */
const SENSITIVE_KEY =
    /pass(word|wd)?|motdepasse|token|secret|cookie|authorization|api[-_]?key|credential|bearer|jwt|session/i;

const REDACTED = "[redacted]";
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 4000;

/**
 * Normalise une valeur vers un type JSON sûr : les clés sensibles sont
 * masquées, la profondeur et la taille sont bornées (les objets circulaires
 * sont donc coupés), les `bigint`/`symbol`/fonctions sont convertis en texte.
 * Retourne uniquement des types JSON — `JSON.stringify` ne peut pas lever.
 */
function sanitize(value: unknown, depth: number): unknown {
    if (value === null) return null;
    switch (typeof value) {
        case "string":
            return value.length > MAX_STRING_LENGTH
                ? `${value.slice(0, MAX_STRING_LENGTH)}…[tronqué]`
                : value;
        case "number":
        case "boolean":
            return value;
        case "bigint":
            return `${value.toString()}n`;
        case "undefined":
            return null;
        case "function":
            return "[function]";
        case "symbol":
            return value.toString();
        default:
            break;
    }
    if (depth >= MAX_DEPTH) return "[profondeur limitée]";
    if (value instanceof Error) {
        // Détail d'exception réservé aux logs serveur (jamais renvoyé au client).
        return { name: value.name, message: value.message, stack: value.stack ?? null };
    }
    if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, depth + 1));
    }
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        out[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, depth + 1);
    }
    return out;
}

/** Émet une ligne JSON sur la sortie standard si le niveau est actif. */
function emit(
    level: Exclude<LogLevel, "silent">,
    message: string,
    context?: Record<string, unknown>,
): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[resolveLevel()]) return;
    const payload: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level,
        msg: sanitize(message, 0),
    };
    if (context) {
        const sanitized = sanitize(context, 0);
        // Narrowing défensif : sanitize renvoie un objet pour un contexte objet,
        // on ne l'fusionne jamais sur un primitif par sécurité.
        if (typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized)) {
            Object.assign(payload, sanitized);
        }
    }
    const line = JSON.stringify(payload) ?? "{}";
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
}

/**
 * Identifiant de corrélation par requête (`crypto.randomUUID()`).
 * Exposé au client dans la réponse 500 du wrapper `apiRoute` et repris tel quel
 * dans la ligne de log serveur portant le détail de l'exception.
 */
export function createRequestId(): string {
    return crypto.randomUUID();
}

/** Journalisation structurée. `context` est assaini avant écriture. */
export const logger = {
    debug: (message: string, context?: Record<string, unknown>): void =>
        emit("debug", message, context),
    info: (message: string, context?: Record<string, unknown>): void =>
        emit("info", message, context),
    warn: (message: string, context?: Record<string, unknown>): void =>
        emit("warn", message, context),
    error: (message: string, context?: Record<string, unknown>): void =>
        emit("error", message, context),
};
