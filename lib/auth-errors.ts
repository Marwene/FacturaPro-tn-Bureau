import { CredentialsSignin } from "next-auth";

/**
 * C2 — Codes d'erreur structurés du login (audit S-9).
 *
 * `authorize()` lève une sous-classe de `CredentialsSignin` portant un `code`
 * explicite au lieu de renvoyer `null` quand le motif est connu. @auth/core
 * propage le `code` :
 *   - via la Server Action de login (`signIn` serveur **re-lance** l'erreur
 *     AuthError, cf. `@auth/core` `isRaw && !isRedirect` → `throw`) ;
 *   - via le callback HTTP `error=CredentialsSignin&code=<code>` pour
 *     `signIn("credentials")` côté client (`next-auth/react`).
 *
 * Contrainte assumée (arbitrage C1/C2 validé) : les codes `deactivated` /
 * `unverified` distinguent le motif — l'énumération de comptes est limitée par
 * le rate-limit par compte de `lib/rate-limit.ts` (10 tentatives / 15 min).
 * `invalid_credentials` reste le motif fourre-tout (identifiants inconnus OU
 * mot de passe incorrect) : aucun signal différencié dans ce cas.
 */

export type AuthErrorCode =
    | "invalid_credentials"
    | "deactivated"
    | "unverified"
    | "rate_limited";

const AUTH_ERROR_CODES: readonly string[] = [
    "invalid_credentials",
    "deactivated",
    "unverified",
    "rate_limited",
];

/** Narrowing `string` (lempire `CredentialsSignin.code`) → union fermée `AuthErrorCode`. */
export function isAuthErrorCode(value: string): value is AuthErrorCode {
    return AUTH_ERROR_CODES.includes(value);
}

/** Identifiants inconnus ou mot de passe incorrect (aucun signal différencié). */
export class InvalidCredentialsError extends CredentialsSignin {
    constructor() {
        super();
        this.code = "invalid_credentials";
    }
}

/** Compte désactivé (`user.actif === false`). */
export class DeactivatedAccountError extends CredentialsSignin {
    constructor() {
        super();
        this.code = "deactivated";
    }
}

/** E-mail non vérifié (`user.emailVerified === null`) — la vérification précède la connexion. */
export class UnverifiedEmailError extends CredentialsSignin {
    constructor() {
        super();
        this.code = "unverified";
    }
}

/**
 * Rate-limit par compte dépassé. Le délai restant est porté par l'erreur
 * (`retryAfterSeconds`) afin d'être exposé au client au lieu d'un message
 * générique.
 */
export class RateLimitedSignInError extends CredentialsSignin {
    readonly retryAfterSeconds: number;

    constructor(retryAfterSeconds: number) {
        super();
        this.code = "rate_limited";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
