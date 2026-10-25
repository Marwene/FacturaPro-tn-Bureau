"use client";

import { useMutation } from "@tanstack/react-query";
import { readApiErrorMessage, ApiError } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-client";

/**
 * C3 — Mutations partagées du parcours d'authentification (inscription publique
 * bootstrap + vérification e-mail), migrées depuis les `fetch()` directs de
 * `components/auth/register-form.tsx` et `app/(auth)/verify-email/page.tsx`
 * vers TanStack Query, sans changement de comportement visible (libellés,
 * toasts, redirections strictement identiques — les toasts et les redirections
 * restent côté composant, convention P2-9).
 */
interface PostJsonResult {
    ok: boolean;
    body: unknown;
}

async function postJson(url: string, payload: unknown): Promise<PostJsonResult> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return { ok: res.ok, body: await res.json() };
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

export interface RegisterResponse {
    user: unknown;
    emailSent: boolean;
    verificationCode?: string;
}

export function useRegister() {
    return useMutation<RegisterResponse, Error, RegisterInput>({
        mutationFn: async ({ name, email, password }) => {
            let result: PostJsonResult;
            try {
                result = await postJson("/api/auth/register", { name, email, password });
            } catch {
                // Parité stricte avec l'ancien `register-form.tsx` : toute erreur
                // réseau/parse était attrapée côté composant et affichée
                // « Une erreur est survenue » (le message brut du fetch ne doit
                // jamais fuyer dans l'UI).
                throw new Error("Une erreur est survenue");
            }
            if (!result.ok) throw new Error(readApiErrorMessage(result.body));
            return result.body as RegisterResponse;
        },
    });
}

export interface VerifyEmailInput {
    email: string;
    code: string;
}

export interface VerifyEmailResponse {
    message: string;
}

export function useVerifyEmail() {
    return useMutation<VerifyEmailResponse, Error, VerifyEmailInput>({
        mutationFn: async ({ email, code }) => {
            const { ok, body } = await postJson("/api/users/verify-email", { email, code });
            if (!ok) throw new Error(readApiErrorMessage(body));
            return body as VerifyEmailResponse;
        },
    });
}

export interface ResendCodeInput {
    email: string;
}

export interface ResendCodeResponse {
    emailSent: boolean;
    verificationCode?: string;
}

export function useResendCode() {
    return useMutation<ResendCodeResponse, Error, ResendCodeInput>({
        mutationFn: async ({ email }) => {
            const { ok, body } = await postJson("/api/auth/resend-code", { email });
            if (!ok) throw new Error(readApiErrorMessage(body));
            return body as ResendCodeResponse;
        },
    });
}

export interface LogoutResponse {
    success: boolean;
    redirectTo: string;
}

/** Repli contractuel : on va TOUJOURS au login, même si la destruction n'a pas pu être confirmée. */
const LOGOUT_FALLBACK: LogoutResponse = { success: false, redirectTo: "/login" };

/**
 * C3 — Déconnexion.
 *
 * La destruction de la session est **serveur** (`POST /api/auth/logout`, qui
 * efface les 4 cookies d'authentification + purge le cache de session de
 * l'instance) : ce hook ne fait qu'y adosser la navigation. `signOut()` de
 * `next-auth/react` n'effaçait que les cookies Auth.js — notre
 * `__session-marker` survivait à la déconnexion.
 *
 * Contractuel : la mutation **résout toujours**. Une déconnexion ne doit jamais
 * layer l'utilisateur bloqué sur une erreur réseau — `success: false` signale
 * que la destruction côté serveur n'a pas pu être confirmée (le 401 « session
 * déjà absente » est considéré comme une destruction acquise, non une erreur).
 */
export function useLogout() {
    return useMutation<LogoutResponse, Error, void>({
        mutationFn: async () => {
            try {
                return await apiFetch<LogoutResponse>("/api/auth/logout", {
                    method: "POST",
                    context: "déconnexion",
                });
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) {
                    // Session déjà absente/expirée : la destruction demandée est
                    // déjà acquise côté serveur.
                    return { success: true, redirectTo: "/login" };
                }
                return LOGOUT_FALLBACK;
            }
        },
    });
}
