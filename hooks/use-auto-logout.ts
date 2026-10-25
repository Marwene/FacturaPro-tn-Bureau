"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/use-auth";

const INACTIVITY_LIMIT = 30 * 60 * 1000;     // 30 minutes — total inactivity before logout
const WARNING_BEFORE_MS = 2 * 60 * 1000;      // Show warning 2 minutes before logout
const CHECK_INTERVAL = 1_000;                 // Check every second (for smooth countdown)

export function useAutoLogout() {
    const { data: session } = useSession();
    const router = useRouter();
    // `logout.mutate` a une identité stable (TanStack Query v5) : safe à citer
    // dans les dépendances de l'effet sans recréer l'intervalle à chaque rendu.
    const { mutate: logoutMutate } = useLogout();
    const lastActivity = useRef(Date.now());
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(120);

    /** Déconnexion SERVEUR (`/api/auth/logout`) puis navigation — jamais `signOut()` seul. */
    const logoutToLogin = useCallback(() => {
        logoutMutate(undefined, {
            onSuccess: ({ redirectTo }) => router.push(redirectTo),
        });
    }, [logoutMutate, router]);

    const resetTimer = useCallback(() => {
        lastActivity.current = Date.now();
        setShowWarning(false);
        setRemainingSeconds(120);
    }, []);

    const handleLogout = useCallback(() => {
        logoutToLogin();
    }, [logoutToLogin]);

    const handleStayConnected = useCallback(() => {
        // Touch the server session to keep it alive
        fetch("/api/auth/session", { method: "GET" }).catch(() => {});
        resetTimer();
    }, [resetTimer]);

    // Justification useEffect : listeners d'activité navigateur (mousemove/keydown/click/scroll/touchstart) + timer setInterval (1 s) — mesure en temps réel de l'inactivité de 30 min contre Date.now pour déclencher l'avertissement puis la déconnexion serveur (non réactif : le temps et les événements souris/clavier viennent du navigateur, aucun état React ne les produit).
    useEffect(() => {
        if (!session?.user) return;

        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

        function handleActivity() {
            // Only reset if the warning isn't showing
            // (so user interaction during warning doesn't hide it)
            if (!showWarning) {
                lastActivity.current = Date.now();
            }
        }

        events.forEach((event) =>
            window.addEventListener(event, handleActivity, { passive: true })
        );

        const interval = setInterval(() => {
            const elapsed = Date.now() - lastActivity.current;
            const left = INACTIVITY_LIMIT - elapsed;

            if (left <= 0) {
                clearInterval(interval);
                // Inactivité dépassée : destruction de la session côté serveur
                // (cookies d'auth + marqueur + cache de session de l'instance).
                logoutToLogin();
                return;
            }

            if (left <= WARNING_BEFORE_MS) {
                setShowWarning(true);
                setRemainingSeconds(Math.ceil(left / 1000));
            } else {
                setShowWarning(false);
                setRemainingSeconds(Math.ceil(WARNING_BEFORE_MS / 1000));
            }
        }, CHECK_INTERVAL);

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, handleActivity)
            );
            clearInterval(interval);
        };
    }, [session?.user, showWarning, logoutToLogin]);

    return {
        showWarning,
        remainingSeconds,
        handleStayConnected,
        handleLogout,
        resetTimer,
    };
}
