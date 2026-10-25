import { describe, it, expect, afterEach, vi } from "vitest";
import {
    clearRateLimit,
    clientIpFromHeaders,
    consumeRateLimit,
    rateLimitKey,
    rateLimitResponse,
    RATE_LIMIT_MESSAGE,
    type RateLimitOptions,
    type RateLimitStore,
} from "../rate-limit";

// ─── Fake store en mémoire (aucune DB dans les tests) ────────────────────────

type Bucket = { windowStart: Date; count: number };

function createFakeStore(): RateLimitStore & { buckets: Map<string, Bucket> } {
    const buckets = new Map<string, Bucket>();
    return {
        buckets,
        async increment(key: string, windowStart: Date): Promise<number> {
            const existing = buckets.get(key);
            if (existing && existing.windowStart.getTime() === windowStart.getTime()) {
                existing.count += 1;
                return existing.count;
            }
            buckets.set(key, { windowStart, count: 1 });
            return 1;
        },
        async clear(key: string): Promise<void> {
            buckets.delete(key);
        },
        async purgeOlderThan(cutoff: Date): Promise<void> {
            for (const [key, bucket] of buckets) {
                if (bucket.windowStart.getTime() < cutoff.getTime()) buckets.delete(key);
            }
        },
    };
}

afterEach(() => {
    vi.useRealTimers();
});

// ─── consumeRateLimit ────────────────────────────────────────────────────────

describe("consumeRateLimit", () => {
    it("reste sous la limite : ok:true et remaining décroissant", async () => {
        const store = createFakeStore();
        const opts: RateLimitOptions = { limit: 3, windowMs: 60_000 };
        const key = rateLimitKey("test", "ip", "1.2.3.4");

        const d1 = await consumeRateLimit(key, opts, store);
        expect(d1).toMatchObject({ ok: true, remaining: 2 });
        const d2 = await consumeRateLimit(key, opts, store);
        expect(d2).toMatchObject({ ok: true, remaining: 1 });
        const d3 = await consumeRateLimit(key, opts, store);
        expect(d3).toMatchObject({ ok: true, remaining: 0 });

        // resetAt = fin de fenêtre fixe
        if (!d1.ok) throw new Error("d1 devrait être ok");
        expect(d1.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("au-delà de la limite : ok:false avec retryAfterSeconds > 0", async () => {
        const store = createFakeStore();
        const opts: RateLimitOptions = { limit: 2, windowMs: 60_000 };
        const key = rateLimitKey("test", "ip", "5.6.7.8");

        await consumeRateLimit(key, opts, store);
        await consumeRateLimit(key, opts, store);
        const blocked = await consumeRateLimit(key, opts, store);

        expect(blocked.ok).toBe(false);
        if (blocked.ok) throw new Error("la 3e tentative devrait être bloquée");
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
        expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("nouvelle fenêtre : compteur remis à zéro", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-25T12:00:30.000Z"));

        const store = createFakeStore();
        const opts: RateLimitOptions = { limit: 1, windowMs: 60_000 };
        const key = rateLimitKey("test", "ip", "9.9.9.9");

        const first = await consumeRateLimit(key, opts, store);
        expect(first).toMatchObject({ ok: true, remaining: 0 });
        const second = await consumeRateLimit(key, opts, store);
        expect(second.ok).toBe(false);

        // Fenêtre suivante (12:01:00 → 12:02:00)
        vi.setSystemTime(new Date("2026-09-25T12:01:30.000Z"));
        const afterWindow = await consumeRateLimit(key, opts, store);
        expect(afterWindow).toMatchObject({ ok: true, remaining: 0 });
    });

    it("fail-open : une erreur du store autorise la requête", async () => {
        const failingStore: RateLimitStore = {
            async increment(): Promise<number> {
                throw new Error("db down");
            },
            async clear(): Promise<void> {
                throw new Error("db down");
            },
            async purgeOlderThan(): Promise<void> {
                throw new Error("db down");
            },
        };
        const decision = await consumeRateLimit(
            rateLimitKey("test", "ip", "10.0.0.1"),
            { limit: 1, windowMs: 60_000 },
            failingStore
        );
        expect(decision.ok).toBe(true);
    });
});

// ─── clearRateLimit ──────────────────────────────────────────────────────────

describe("clearRateLimit", () => {
    it("remet le compteur à zéro", async () => {
        const store = createFakeStore();
        const opts: RateLimitOptions = { limit: 1, windowMs: 60_000 };
        const key = rateLimitKey("login", "account", "user@example.tn");

        await consumeRateLimit(key, opts, store);
        const blocked = await consumeRateLimit(key, opts, store);
        expect(blocked.ok).toBe(false);

        await clearRateLimit(key, store);

        const afterClear = await consumeRateLimit(key, opts, store);
        expect(afterClear).toMatchObject({ ok: true, remaining: 0 });
    });
});

// ─── rateLimitKey ────────────────────────────────────────────────────────────

describe("rateLimitKey", () => {
    it("normalise l'email (trim + minuscules)", () => {
        expect(rateLimitKey("login", "account", "  User@Example.TN ")).toBe(
            "login:account:user@example.tn"
        );
    });

    it("normalise l'IP (trim, casse IPv6)", () => {
        expect(rateLimitKey("nextauth", "ip", " 203.0.113.7 ")).toBe(
            "nextauth:ip:203.0.113.7"
        );
        expect(rateLimitKey("nextauth", "ip", "2001:DB8::1")).toBe(
            "nextauth:ip:2001:db8::1"
        );
    });

    it("construit `${scope}:${dimension}:${identifier}`", () => {
        expect(rateLimitKey("verify-email", "email", "a@b.tn")).toBe(
            "verify-email:email:a@b.tn"
        );
    });

    it("identifiant très long (>254) : clé bornée à 500 caractères max, déterministe", () => {
        const longId = `${"a".repeat(300)}@example.tn`;
        const key = rateLimitKey("resend-code", "email", longId);

        expect(key.length).toBeLessThanOrEqual(500);
        // Déterminisme après troncature : deux entrées identiques → même clé.
        expect(rateLimitKey("resend-code", "email", longId)).toBe(key);
        // L'identifiant est tronqué à 254 (RFC 5321), préfixe inclus dans la borne.
        expect(key).toBe(
            `resend-code:email:${longId.trim().toLowerCase().slice(0, 254)}`.slice(0, 500)
        );
    });

    it("casse mixte / espaces : même clé qu'après normalisation (déterministe)", () => {
        expect(rateLimitKey("resend-code", "email", "  User@Example.TN ")).toBe(
            rateLimitKey("resend-code", "email", "user@example.tn")
        );
        expect(rateLimitKey("nextauth", "ip", " 2001:DB8::1 ")).toBe(
            rateLimitKey("nextauth", "ip", "2001:db8::1")
        );
    });
});

// ─── clientIpFromHeaders ─────────────────────────────────────────────────────

describe("clientIpFromHeaders", () => {
    it("prend le 1er saut de x-forwarded-for (multi-valeurs, trim)", () => {
        const headers = new Headers({
            "x-forwarded-for": " 203.0.113.5 , 10.0.0.1, 172.16.0.1",
        });
        expect(clientIpFromHeaders(headers)).toBe("203.0.113.5");
    });

    it("retombe sur x-real-ip", () => {
        const headers = new Headers({ "x-real-ip": " 198.51.100.9 " });
        expect(clientIpFromHeaders(headers)).toBe("198.51.100.9");
    });

    it("retombe sur x-real-ip si x-forwarded-for est vide", () => {
        const headers = new Headers({ "x-forwarded-for": "", "x-real-ip": "1.1.1.1" });
        expect(clientIpFromHeaders(headers)).toBe("1.1.1.1");
    });

    it("fallback 'unknown' sans aucun header", () => {
        expect(clientIpFromHeaders(new Headers())).toBe("unknown");
    });
});

// ─── rateLimitResponse ───────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
    it("répond 429 avec header Retry-After et shape { error }", async () => {
        const response = rateLimitResponse({ ok: false, retryAfterSeconds: 42 });
        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("42");

        const body: unknown = await response.json();
        expect(body).toMatchObject({
            error: RATE_LIMIT_MESSAGE,
            success: false,
        });
    });
});
