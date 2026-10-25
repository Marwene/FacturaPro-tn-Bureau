"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loginAction, type LoginActionResult } from "@/app/(auth)/login/login-action";
import { useAuthProgressStore } from "@/lib/stores/auth-progress-store";
import { useCompanyStore } from "@/lib/stores/company-store";
import { dashboardQueryOptions } from "./use-dashboard";
import { userCompaniesQueryOptions } from "./use-user-companies";

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface LoginVariables extends LoginCredentials {
    callbackUrl: string;
}

export type LoginOutcome =
    | LoginActionResult
    | { ok: false; code: "navigation_failed"; message: string };

/**
 * Garde-fou de navigation post-login (correctif « écran figé à 95 % »).
 *
 * 20 s : délai volontairement généreux. La navigation attend le rendu de la
 * route cible (compilation Turbopack à froid en dev inclus), pas une simple
 * requête API — un seuil court produirait des faux négatifs sur un premier
 * chargement légitimement lent. Passé ce délai, l'utilisateur retrouve le
 * formulaire avec une erreur actionnable plutôt qu'une barre figée.
 */
export const NAVIGATION_TIMEOUT_MS = 20_000;

/** Fréquence (ms) de vérification de l'engagement de l'URL par l'App Router. */
const NAVIGATION_POLL_MS = 100;

const NAVIGATION_TIMEOUT_MESSAGE =
    "La navigation vers votre espace a pris trop de temps. Réessayez ; si le problème persiste, rechargez la page.";

const NAVIGATION_FAILED_MESSAGE =
    "La navigation vers votre espace a échoué. Réessayez ; si le problème persiste, rechargez la page.";

type NavigationOutcome = "committed" | "timeout";

/**
 * Attend que l'App Router engage réellement une navigation, ou que le garde-fou
 * expire (équivalent encapsulé de `Promise.race` : un seul timer, nettoyé à la
 * résolution, aucune promesse orpheline).
 *
 * POURQUOI UNE OBSERVATION ET NON `await router.replace(...)`
 * -----------------------------------------------------------
 * `router.replace()` de l'App Router (Next 16) est **`void`** : il déclenche la
 * navigation via `startTransition` sans renvoyer la moindre promesse — l'attendre
 * se résoudrait au micro-tu suivant, quel que soit le sort de la navigation
 * (c'est précisément le gel à 95 % : la mutation se terminait toujours, la
 * barre restait affichée tant que la route cible ne se rendait pas).
 *
 * Le seul signal public d'engagement est la mise à jour de `window.location`,
 * effectuée par le routeur (`HistoryUpdater`) au commit du nouvel état — donc
 * APRÈS la résolution de la requête RSC de la route cible. On la sonde (polling
 * léger, hors store : le store reste pur état) jusqu'à changement ou délai max.
 *
 * COMPARAISON À L'URL DE DÉPART ET NON À LA CIBLE
 * ----------------------------------------------
 * Une redirection serveur légitime après login (`/setup/company` quand
 * `companyId` est absent, cf. `app/(app)/layout.tsx`) ferait échouer faussement
 * une comparaison stricte sur `redirectTo`. La question réelle est « ai-je
 * quitté la page de connexion ? ».
 *
 * La navigation en cours n'est JAMAIS annulée : si elle finit par aboutir après
 * le délai, la route cible s'affiche normalement (le formulaire est de toute
 * façon démonté par cette navigation tardive).
 */
async function awaitNavigationCommit(
    fromHref: string,
    timeoutMs: number
): Promise<NavigationOutcome> {
    const startedAt = Date.now();

    return new Promise<NavigationOutcome>((resolve) => {
        const intervalId = window.setInterval(() => {
            if (window.location.href !== fromHref) {
                window.clearInterval(intervalId);
                resolve("committed");
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                window.clearInterval(intervalId);
                resolve("timeout");
            }
        }, NAVIGATION_POLL_MS);
    });
}

/**
 * C3 — Connexion par la Server Action `loginAction` (C2), avec chaîne de jalons
 * RÉELS pour l'écran de progression :
 *
 *   0 → 30 %  « Vérification des identifiants… »  = `loginAction` résolue
 *                                                       (identifiants acceptés)
 *  30 → 50 %  « Ouverture de la session… »        = `useSession().update()` résolu
 *                                                       (aller-retour réel sur
 *                                                       /api/auth/session : le
 *                                                       session client next-auth
 *                                                       est rafraîchi — remplace
 *                                                       l'ancien `router.refresh`)
 *  50 → 70 %  « Chargement de votre profil et de vos sociétés… »
 *                                          = `prefetchQuery` `user-companies`
 *                                            résolu (consommateurs réels :
 *                                            company-switcher, useActiveCompanyId)
 *  70 → 95 %  « Préparation du tableau de bord… » = `prefetchQuery` `dashboard`
 *                                            résolu (consommateur réel :
 *                                            DashboardClient → rendu instantané)
 *  95 → 100 % « Redirection vers votre espace… »  = `router.replace(redirectTo)`
 *                                            ENGAGÉE (URL commitée par
 *                                            l'App Router) — garde-fou 20 s
 *                                            (`NAVIGATION_TIMEOUT_MS`) : au-delà
 *                                            → échec structuré `navigation_failed`
 *
 * Aucun minuteur factice : chaque saut de pourcentage correspond à une promesse
 * réelle résolue. Pas de `router.refresh()` : le cookie de session (et le
 * marqueur httpOnly signé) sont déjà posés par la réponse de la Server Action,
 * donc le RSC render de `(app)/layout.tsx` voit la session sans refresh, et le
 * session client next-auth est rafraîchi par `update()`.
 *
 * La navigation est faite avec `router.replace` seul : après un login, la page
 * de connexion ne doit pas rester dans l'historique de navigation.
 */
export function useLogin() {
    const qc = useQueryClient();
    const router = useRouter();
    const { update } = useSession();
    const setProgress = useAuthProgressStore((s) => s.setProgress);
    const setError = useAuthProgressStore((s) => s.setError);

    return useMutation<LoginOutcome, Error, LoginVariables>({
        mutationFn: async ({ email, password, rememberMe, callbackUrl }) => {
            setProgress("credentials", 0, "Vérification des identifiants…");

            const result = await loginAction({ email, password, rememberMe }, callbackUrl);
            if (!result.ok) {
                setError({
                    code: result.code,
                    message: result.message,
                    retryAfterSeconds: result.retryAfterSeconds,
                });
                return result;
            }

            setProgress("session", 30, "Ouverture de la session…");
            const session = await update();

            setProgress("profile", 50, "Chargement de votre profil et de vos sociétés…");
            const userId = (session?.user as { id?: string } | undefined)?.id;
            await qc.prefetchQuery(userCompaniesQueryOptions(userId));

            setProgress("dashboard", 70, "Préparation du tableau de bord…");
            await qc.prefetchQuery(
                dashboardQueryOptions(useCompanyStore.getState().selectedCompanyId)
            );

            setProgress("navigating", 95, "Redirection vers votre espace…");
            // URL figée AVANT le déclenchement : c'est la référence « je suis
            // encore sur la page de connexion » du garde-fou.
            const fromHref = window.location.href;
            try {
                router.replace(result.redirectTo);
            } catch {
                // Échec synchrone du routeur (ex. href malformé) : échec
                // structuré, jamais un throw muet (TanStack ne l'attribuerait
                // à aucune étape lisible).
                setError({ code: "navigation_failed", message: NAVIGATION_FAILED_MESSAGE });
                return { ok: false, code: "navigation_failed", message: NAVIGATION_FAILED_MESSAGE };
            }

            const navigation = await awaitNavigationCommit(fromHref, NAVIGATION_TIMEOUT_MS);
            if (navigation === "timeout") {
                setError({ code: "navigation_failed", message: NAVIGATION_TIMEOUT_MESSAGE });
                return { ok: false, code: "navigation_failed", message: NAVIGATION_TIMEOUT_MESSAGE };
            }

            return result;
        },
    });
}
