import { describe, it, expect, vi } from "vitest";

// `next-auth` (v5 beta) importe `next/server` sans suffixe .js, non résolvable
// depuis un test node (node_modules externalisé) — la base est mockée avec la
// même sémantique que la classe réelle (`Error` + `code`), comme `prisma` l'est
// dans `session-token.test.ts`.
vi.mock("next-auth", () => ({
    CredentialsSignin: class CredentialsSignin extends Error {
        code = "CredentialsSignin";
    },
}));

import { CredentialsSignin } from "next-auth";
import {
    isAuthErrorCode,
    InvalidCredentialsError,
    DeactivatedAccountError,
    UnverifiedEmailError,
    RateLimitedSignInError,
    type AuthErrorCode,
} from "@/lib/auth-errors";

/**
 * C4 — Codes d'erreur structurés du login (lot C2, audit S-9) : couvre le
 * narrowing `isAuthErrorCode` et le portage de `retryAfterSeconds` par
 * `RateLimitedSignInError`.
 */

describe("isAuthErrorCode (narrowing)", () => {
    it("accepte les 4 codes du contrat", () => {
        const codes: string[] = [
            "invalid_credentials",
            "deactivated",
            "unverified",
            "rate_limited",
        ];
        for (const code of codes) {
            expect(isAuthErrorCode(code)).toBe(true);
        }
    });

    it("refuse tout autre code (y compris casse et ancien code générique)", () => {
        for (const code of ["", "session_expired", "CredentialsSignin", "RATE_LIMITED", "unknown"]) {
            expect(isAuthErrorCode(code)).toBe(false);
        }
    });

    it("restreint `string` à l'union fermée AuthErrorCode", () => {
        const raw: string = "deactivated";
        if (isAuthErrorCode(raw)) {
            const typed: AuthErrorCode = raw;
            expect(typed).toBe("deactivated");
        } else {
            expect.fail("le code 'deactivated' doit être reconnu");
        }
    });
});

describe("Sous-classes de CredentialsSignin (lib/auth.ts les lève)", () => {
    it("chaque erreur porte son code et est une CredentialsSignin", () => {
        const expectations: Array<[CredentialsSignin, AuthErrorCode]> = [
            [new InvalidCredentialsError(), "invalid_credentials"],
            [new DeactivatedAccountError(), "deactivated"],
            [new UnverifiedEmailError(), "unverified"],
            [new RateLimitedSignInError(90), "rate_limited"],
        ];

        for (const [error, code] of expectations) {
            expect(error).toBeInstanceOf(CredentialsSignin);
            expect(error.code).toBe(code);
        }
    });

    it("RateLimitedSignInError porte retryAfterSeconds (exposé au client)", () => {
        const error = new RateLimitedSignInError(42);
        expect(error.retryAfterSeconds).toBe(42);
        expect(error.code).toBe("rate_limited");
    });
});
