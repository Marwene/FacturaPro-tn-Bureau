import { create } from "zustand";
import type { AuthErrorCode } from "@/lib/auth-errors";

/**
 * C3 — Store de progression du login (état client partagé entre `use-login()`
 * qui écrit et `components/auth/auth-progress-screen.tsx` qui lit).
 *
 * Pur état : aucun fetch, aucune animation, aucun timer. Chaque saut de
 * `percent` est produit par un jalon réel résolu dans `hooks/use-login.ts`
 * (promesses réelles uniquement, aucun minuteur factice).
 */
export type AuthProgressPhase =
    | "idle"
    | "credentials"
    | "session"
    | "profile"
    | "dashboard"
    | "navigating"
    | "error";

/**
 * Codes d'erreur portés par `error`. `navigation_failed` (garde-fou de
 * `hooks/use-login.ts`) signale une redirection post-login échouée ou dépassant
 * `NAVIGATION_TIMEOUT_MS` — la session est déjà établie, seul le saut de
 * navigation a échoué (d'où un libellé distinct de « Erreur de connexion »).
 * Extension de type uniquement : aucun état, timer ni fetch ajouté au store.
 */
export interface AuthProgressError {
    code: AuthErrorCode | "unknown" | "navigation_failed";
    message: string;
    retryAfterSeconds?: number;
}

interface AuthProgressState {
    phase: AuthProgressPhase;
    percent: number;
    label: string;
    error: AuthProgressError | null;
    setProgress: (phase: AuthProgressPhase, percent: number, label: string) => void;
    setError: (error: AuthProgressError) => void;
    reset: () => void;
}

const INITIAL_STATE = {
    phase: "idle",
    percent: 0,
    label: "",
    error: null,
} as const;

export const useAuthProgressStore = create<AuthProgressState>()((set) => ({
    ...INITIAL_STATE,
    setProgress: (phase, percent, label) => set({ phase, percent, label, error: null }),
    setError: (error) => set({ phase: "error", error }),
    reset: () => set({ ...INITIAL_STATE }),
}));
