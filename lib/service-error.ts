import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/schemas";

/**
 * Contrôle d'erreur des **services partagés** (lot H — suppression du tour HTTP
 * des server actions) : une fonction `lib/*` est appelée à la fois par la route
 * API (via `withServiceErrors`, `lib/service-route.ts`) et par la server action
 * (via `throwRouteError` / `throwRouteErrorWithDetails` ci-dessous).
 *
 * `body` est le corps JSON **exact** que la route renvoyait historiquement
 * (statut + `errorResponse(message, details)` de `lib/schemas.ts`, ou un corps
 * littéral `{ error }`) : rejoué tel quel côté route, relu ici pour reconstituer
 * le message du `throw` côté action — les deux contrats d'erreur restent donc
 * identiques à l'ancien comportement `fetch() → res.json() → throw`.
 */
export class ServiceError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : "Erreur");
    this.name = "ServiceError";
    this.status = status;
    this.body = body;
  }

  /** `ServiceError` sur le contrat `errorResponse(message, details)` (400/403/404/409…). */
  static response(status: number, message: string, details?: unknown): ServiceError {
    return new ServiceError(status, { ...errorResponse(message, details) });
  }
}

/** Présence « truthy » d'un champ de corps (miroir de `||` : `""`, `0`, `false`, `null`, `undefined` passent au suivant). */
function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "" && value !== false && value !== 0;
}

/** Coercition identique à `new Error(valeur)` : `String(valeur)` (tableaux joints par des virgules). */
function asMessage(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

function messageFromBody(error: ServiceError, fallback: string, preferDetails: boolean): string {
  const details = error.body.details;
  const routeError = error.body.error;
  // `err.details || err.error || fallback` (routes OCR)…
  if (preferDetails && isPresent(details)) return asMessage(details);
  // …ou `err.error ?? fallback` (toutes les autres), selon le contrat historique.
  if (routeError !== undefined && routeError !== null) return asMessage(routeError);
  return fallback;
}

function raiseAsActionError(error: unknown, fallback: string, preferDetails: boolean): never {
  if (error instanceof ServiceError) {
    throw new Error(messageFromBody(error, fallback, preferDetails));
  }
  // Hors contrat métier : la route historique laissait le wrapper `apiRoute`
  // répondre 500 `{ error: "Erreur serveur" }` → même message côté action, le
  // détail restant tracé côté serveur (jamais exposé au client, cf. lot E1).
  logger.error("[server-action] erreur non contrôlée du service", { error });
  throw new Error("Erreur serveur");
}

/** Contrat historique `throw new Error(err.error ?? fallback)`. */
export function throwRouteError(error: unknown, fallback: string): never {
  return raiseAsActionError(error, fallback, false);
}

/** Contrat historique `throw new Error(err.details || err.error || fallback)` (routes OCR). */
export function throwRouteErrorWithDetails(error: unknown, fallback: string): never {
  return raiseAsActionError(error, fallback, true);
}

/**
 * Renvoie **exactement** ce que `res.json()` renvoyait avant la suppression du
 * `fetch()` : `Date → ISO 8601`, `Decimal → chaîne`, clés `undefined` droppées.
 * Sans ce passage, la server action renverrait des instances `Decimal`/`Date`
 * sérialisées différemment par React Server Components → payload modifié.
 */
export function jsonPayload<T>(value: T): T {
  const roundTripped: unknown = JSON.parse(JSON.stringify(value));
  return roundTripped as T;
}
