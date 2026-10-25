import { describe, it, expect } from "vitest";
import { DEFAULT_POST_LOGIN_ROUTE, safeInternalPath } from "@/lib/safe-internal-path";

/**
 * C2 (correctif QA) — Tests de la source unique `lib/safe-internal-path.ts`.
 *
 * Couvre les cas positifs (chemins internes, y relatifs) et surtout les
 * vecteurs de contournement du test de chaîne historique : `/\evil.com` et
 * `/<TAB>/evil.com` passaient l'ancien filtre `startsWith("//")` puis étaient
 * NORMALISÉS en `https://evil.com/` par le parseur WHATWG (open-redirect /
 * phishing post-login). La comparaison d'origine doit les refuser.
 */

describe("safeInternalPath — cas positifs (chemins internes acceptés)", () => {
    it("accepte un chemin interne absolu", () => {
        expect(safeInternalPath("/factures")).toBe("/factures");
    });

    it("accepte un chemin interne avec query string", () => {
        expect(safeInternalPath("/factures?page=2")).toBe("/factures?page=2");
    });

    it("accepte un chemin interne RELATIF (résolu contre l'origine interne)", () => {
        expect(safeInternalPath("factures")).toBe("/factures");
        expect(safeInternalPath("factures?page=2")).toBe("/factures?page=2");
    });

    it("conserve l'ancre interne (hash inoffensif)", () => {
        expect(safeInternalPath("/factures#ligne-12")).toBe("/factures#ligne-12");
    });

    it("accepte la racine et normalise la query seule", () => {
        expect(safeInternalPath("/")).toBe("/");
        expect(safeInternalPath("?page=2")).toBe("/?page=2");
    });

    it("conserve une query contenant des données externes inoffensives", () => {
        // `//` dans la QUERY ne change pas l'origine : reste interne.
        expect(safeInternalPath("/?next=//evil.com")).toBe("/?next=//evil.com");
    });
});

describe("safeInternalPath — cas refusés (retourrent null)", () => {
    it("refuse un callbackUrl scheme-relatif `//evil.com`", () => {
        expect(safeInternalPath("//evil.com")).toBeNull();
    });

    it("refuse le vecteur de contournement par BACKSLASH `/\evil.com`", () => {
        // Ancien filtre : passes (ne commence pas par `//`) → https://evil.com/.
        expect(safeInternalPath("/\\evil.com")).toBeNull();
    });

    it("refuse le vecteur de contournement par TABULATION U+0009 `/\t/evil.com`", () => {
        // Ancien filtre : la tabulation est supprimée par le parseur → `//evil.com`.
        expect(safeInternalPath("/\t/evil.com")).toBeNull();
    });

    it("refuse une URL absolue externe", () => {
        expect(safeInternalPath("https://evil.com")).toBeNull();
        expect(safeInternalPath("https://evil.com/x")).toBeNull();
    });

    it("refuse une URL externe avec port par défaut explicite `http://evil.com:80`", () => {
        expect(safeInternalPath("http://evil.com:80")).toBeNull();
    });

    it("refuse un schéma non-http (javascript:)", () => {
        expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    });

    it("refuse une URL illisible (throw du parseur)", () => {
        expect(safeInternalPath("http://[")).toBeNull();
    });

    it("refuse les valeurs vides / null / undefined", () => {
        expect(safeInternalPath("")).toBeNull();
        expect(safeInternalPath("   ")).toBeNull();
        expect(safeInternalPath(null)).toBeNull();
        expect(safeInternalPath(undefined)).toBeNull();
    });

    it("refuse une entrée qui n'est pas une chaîne (défense en profondeur typée)", () => {
        // Simule un appelant qui passerait un objet via un JSON non vérifié.
        expect(safeInternalPath({ url: "/factures" } as unknown as string)).toBeNull();
    });
});

describe("DEFAULT_POST_LOGIN_ROUTE — repli post-authentification unique", () => {
    it("vaut la racine `/` (le tableau de bord est servi à la racine, `/dashboard` n'existe pas)", () => {
        expect(DEFAULT_POST_LOGIN_ROUTE).toBe("/");
    });

    it("est lui-même un chemin interne accepté par safeInternalPath (repli toujours sûr)", () => {
        expect(safeInternalPath(DEFAULT_POST_LOGIN_ROUTE)).toBe(DEFAULT_POST_LOGIN_ROUTE);
    });
});
