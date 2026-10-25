import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * C4 — Rendu SSR de l'écran de progression du login (lot C3).
 *
 * Le store est mocké (hook sélecteur) car zustand v5 fige le snapshot serveur
 * sur l'état INITIAL (`getInitialState`) : sans mock, `renderToStaticMarkup`
 * ne verrait jamais une transition postérieure à l'import du module. Les
 * transitions du vrai store sont couvertes par
 * `lib/__tests__/auth-progress-store.test.ts`.
 */

interface ScreenSlice {
    phase: string;
    percent: number;
    label: string;
    error: { code: string; message: string } | null;
}

const storeState = vi.hoisted(() => ({
    current: {
        phase: "idle",
        percent: 0,
        label: "",
        error: null,
    } as ScreenSlice,
}));

vi.mock("@/lib/stores/auth-progress-store", () => ({
    useAuthProgressStore: (selector: (state: ScreenSlice) => unknown) =>
        selector(storeState.current),
}));

import { AuthProgressScreen } from "@/components/auth/auth-progress-screen";

beforeEach(() => {
    storeState.current = { phase: "idle", percent: 0, label: "", error: null };
});

describe("AuthProgressScreen", () => {
    it("phase 'error' → rend null (la main est rendue au formulaire de login)", () => {
        storeState.current = {
            phase: "error",
            percent: 0,
            label: "",
            error: { code: "invalid_credentials", message: "Email ou mot de passe incorrect." },
        };

        expect(renderToStaticMarkup(createElement(AuthProgressScreen))).toBe("");
    });

    it("phase 'idle' → rend l'écran (formulaire remplacé pendant la connexion)", () => {
        storeState.current = { phase: "idle", percent: 0, label: "", error: null };

        const html = renderToStaticMarkup(createElement(AuthProgressScreen));
        expect(html).toContain("FacturaPro TN");
    });

    it("phase 'navigating' → affiche le jalon, le pourcentage et l'aria du progressbar", () => {
        storeState.current = {
            phase: "navigating",
            percent: 95,
            label: "Redirection vers votre espace…",
            error: null,
        };

        const html = renderToStaticMarkup(createElement(AuthProgressScreen));
        expect(html).toContain("Redirection vers votre espace…");
        expect(html).toContain('aria-valuenow="95"');
        expect(html).toContain('role="status"');
        expect(html).toContain("95 %");
    });
});
