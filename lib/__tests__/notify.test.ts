import { describe, expect, it } from "vitest";
import { ApiError, readApiErrorMeta } from "@/lib/api-error";
import { describeApiError, formatErrorDetails } from "@/lib/notify";

function apiError(
    status: number,
    body?: unknown,
    meta?: { requestId?: string; code?: string },
): ApiError {
    return new ApiError(status, String(body), body, meta);
}

describe("describeApiError", () => {
    it("mappe le 401 vers une session expirée", () => {
        const facts = describeApiError(apiError(401));
        expect(facts.status).toBe(401);
        expect(facts.message).toContain("Reconnectez-vous");
        expect(facts.retryable).toBe(false);
        expect(facts.network).toBe(false);
    });

    it("affine le 401 selon le code métier", () => {
        expect(
            describeApiError(apiError(401, undefined, { code: "invalid_credentials" })).message,
        ).toContain("Identifiants incorrects");
        expect(describeApiError(apiError(401, undefined, { code: "deactivated" })).message).toContain(
            "désactivé",
        );
        expect(describeApiError(apiError(401, undefined, { code: "rate_limited" })).message).toContain(
            "Trop de tentatives",
        );
    });

    it("mappe le 403 vers un accès refusé", () => {
        expect(describeApiError(apiError(403)).message).toContain("droits nécessaires");
    });

    it("mappe le 404 vers une ressource introuvable", () => {
        expect(describeApiError(apiError(404)).message).toContain("introuvable");
    });

    it("mappe le 409 vers un conflit actionnable", () => {
        expect(describeApiError(apiError(409)).message).toContain("Actualisez");
    });

    it("détaille le message serveur sur un 422 de validation", () => {
        const facts = describeApiError(apiError(422, { error: "Le code doit faire 10 caractères." }));
        expect(facts.message).toContain("invalides");
        expect(facts.message).toContain("Le code doit faire 10 caractères.");
    });

    it("mappe le 429 vers une pause demandée", () => {
        expect(describeApiError(apiError(429)).message).toContain("Patientez");
    });

    it("mappe les 5xx vers un problème serveur réessayable", () => {
        const facts = describeApiError(apiError(503));
        expect(facts.message).toContain("serveur");
        expect(facts.retryable).toBe(true);
    });

    it("détecte une erreur réseau (TypeError: fetch failed)", () => {
        const facts = describeApiError(new TypeError("fetch failed"));
        expect(facts.network).toBe(true);
        expect(facts.retryable).toBe(true);
        expect(facts.message).toContain("Connexion impossible");
    });

    it("reprend un message d'erreur existant non vide", () => {
        expect(describeApiError(new Error("BL créé mais ID introuvable")).message).toBe(
            "BL créé mais ID introuvable",
        );
    });

    it("accepte une chaîne brute", () => {
        expect(describeApiError("Les mots de passe ne correspondent pas.").message).toBe(
            "Les mots de passe ne correspondent pas.",
        );
    });

    it("tombe sur un message générique pour une erreur vide ou inconnue", () => {
        expect(describeApiError(new Error("")).message).toContain("inattendue");
        expect(describeApiError(undefined).message).toContain("inattendue");
        expect(describeApiError(null).message).toContain("inattendue");
        expect(describeApiError(42).message).toContain("inattendue");
    });

    it("remonte requestId et code métier de l'ApiError", () => {
        const facts = describeApiError(
            apiError(500, { error: "boom" }, { requestId: "req_abc123", code: "internal" }),
        );
        expect(facts.requestId).toBe("req_abc123");
        expect(facts.code).toBe("internal");
    });
});

describe("readApiErrorMeta", () => {
    it("lit requestId et code quand ils sont présents et typés", () => {
        expect(readApiErrorMeta({ requestId: "r1", code: "deactivated" })).toEqual({
            requestId: "r1",
            code: "deactivated",
        });
    });

    it("ignore les valeurs de mauvais type sans lever", () => {
        expect(readApiErrorMeta({ requestId: 42, code: { nested: true } })).toEqual({
            requestId: undefined,
            code: undefined,
        });
    });

    it("gère les corps non-objets", () => {
        expect(readApiErrorMeta(undefined)).toEqual({});
        expect(readApiErrorMeta("oops")).toEqual({});
        expect(readApiErrorMeta(null)).toEqual({});
    });
});

describe("formatErrorDetails", () => {
    it("produit un bloc technique copiable complet", () => {
        const facts = describeApiError(
            apiError(500, { error: "boom" }, { requestId: "req_1" }),
        );
        const details = formatErrorDetails({
            title: "Facture non créée",
            context: "création de la facture",
            facts,
            time: "14:32",
            extra: "Détail perso",
        });
        expect(details).toContain("Facture non créée");
        expect(details).toContain("Contexte : création de la facture");
        expect(details).toContain("Statut : 500");
        expect(details).toContain("Requête : req_1");
        expect(details).toContain("Horodatage : 14:32");
        expect(details).toContain("Détail perso");
    });

    it("utilise des tirets quand les métadonnées manquent", () => {
        const facts = describeApiError("boom");
        const details = formatErrorDetails({ title: "Erreur", facts, time: "09:00" });
        expect(details).toContain("Statut : —");
        expect(details).toContain("Requête : —");
    });
});
