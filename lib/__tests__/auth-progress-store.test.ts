import { describe, it, expect, beforeEach } from "vitest";
import { useAuthProgressStore } from "@/lib/stores/auth-progress-store";

/**
 * C4 — Store de progression du login (lot C3) : transitions de phase /
 * percent / label, restitution de la main au formulaire sur `phase === "error"`
 * (le composant `AuthProgressScreen` rend `null` sur cette phase — testé dans
 * `components/__tests__/auth-progress-screen.test.ts`).
 */

beforeEach(() => {
    useAuthProgressStore.getState().reset();
});

describe("useAuthProgressStore — état initial", () => {
    it("démarre à idle / 0 % / sans label ni erreur", () => {
        const state = useAuthProgressStore.getState();
        expect(state.phase).toBe("idle");
        expect(state.percent).toBe(0);
        expect(state.label).toBe("");
        expect(state.error).toBeNull();
    });
});

describe("useAuthProgressStore — setProgress", () => {
    it("applique phase / percent / label et efface une erreur éventuelle", () => {
        useAuthProgressStore.getState().setError({
            code: "invalid_credentials",
            message: "Email ou mot de passe incorrect.",
        });

        useAuthProgressStore.getState().setProgress("credentials", 0, "Vérification des identifiants…");

        const state = useAuthProgressStore.getState();
        expect(state.phase).toBe("credentials");
        expect(state.percent).toBe(0);
        expect(state.label).toBe("Vérification des identifiants…");
        expect(state.error).toBeNull();
    });

    it("suit la chaîne de jalons réels de use-login (0 → 30 → 50 → 70 → 95)", () => {
        const { setProgress } = useAuthProgressStore.getState();
        const expected: Array<[Parameters<typeof setProgress>[0], number]> = [
            ["credentials", 0],
            ["session", 30],
            ["profile", 50],
            ["dashboard", 70],
            ["navigating", 95],
        ];

        for (const [phase, percent] of expected) {
            setProgress(phase, percent, `jalon ${phase}`);
            const state = useAuthProgressStore.getState();
            expect(state.phase).toBe(phase);
            expect(state.percent).toBe(percent);
        }
    });
});

describe("useAuthProgressStore — setError", () => {
    it("passe en phase error avec le payload complet (code + message)", () => {
        useAuthProgressStore.getState().setError({
            code: "unverified",
            message: "Veuillez vérifier votre e-mail avant de vous connecter.",
        });

        const state = useAuthProgressStore.getState();
        expect(state.phase).toBe("error");
        expect(state.error).toEqual({
            code: "unverified",
            message: "Veuillez vérifier votre e-mail avant de vous connecter.",
        });
    });

    it("conserve retryAfterSeconds pour le compte à rebours rate-limit", () => {
        useAuthProgressStore.getState().setError({
            code: "rate_limited",
            message: "Trop de tentatives. Réessayez dans 90 secondes.",
            retryAfterSeconds: 90,
        });

        expect(useAuthProgressStore.getState().error?.retryAfterSeconds).toBe(90);
    });

    it("accepte le code fourre-tout 'unknown' (échec d'infrastructure)", () => {
        useAuthProgressStore.getState().setError({
            code: "unknown",
            message: "Une erreur est survenue.",
        });

        expect(useAuthProgressStore.getState().error?.code).toBe("unknown");
    });
});

describe("useAuthProgressStore — reset", () => {
    it("restaure l'état initial complet", () => {
        useAuthProgressStore.getState().setProgress("session", 30, "Ouverture de la session…");
        useAuthProgressStore.getState().setError({ code: "unknown", message: "x" });

        useAuthProgressStore.getState().reset();

        const state = useAuthProgressStore.getState();
        expect(state).toMatchObject({ phase: "idle", percent: 0, label: "", error: null });
    });
});
