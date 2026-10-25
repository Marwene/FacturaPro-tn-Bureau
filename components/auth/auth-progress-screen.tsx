"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuthProgressStore } from "@/lib/stores/auth-progress-store";

/**
 * C3 — Écran de progression plein écran pendant la connexion.
 *
 * Entièrement piloté par `lib/stores/auth-progress-store.ts` (écrit par
 * `hooks/use-login.ts`) : le pourcentage n'avance que sur des jalons RÉELS
 * (aucun timer factice), l'interpolation entre deux jalons est animée par un
 * spring `motion` et coupée sous `prefers-reduced-motion`.
 *
 * État d'erreur géré : `phase === "error"` → l'écran se retire (rendu `null`)
 * et rend la main au formulaire de connexion, qui affiche l'`Alert`
 * destructive inline + le focus sur le mot de passe (item 4 du lot C3).
 */
export function AuthProgressScreen() {
    const phase = useAuthProgressStore((s) => s.phase);
    const percent = useAuthProgressStore((s) => s.percent);
    const label = useAuthProgressStore((s) => s.label);
    const reduce = useReducedMotion();

    const spring = useSpring(percent, { stiffness: 140, damping: 24, restDelta: 0.1 });
    const displayedPercent = useTransform(spring, (value) => `${Math.round(value)} %`);

    // Justification useEffect : pilotage de la MotionValue du spring `motion` — souscription
    // tierce non réactive (le store Zustand ne notifie pas motion et inversement). L'effet ne
    // déclenche aucun travail : il interpole visuellement un pourcentage déjà résolu.
    useEffect(() => {
        if (reduce) spring.jump(percent);
        else spring.set(percent);
    }, [percent, spring, reduce]);

    if (phase === "error") return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-foreground">
                <Building2 className="h-7 w-7 text-background" aria-hidden="true" />
            </div>
            <p className="text-base font-medium">FacturaPro TN</p>

            <div className="w-full max-w-72 space-y-2.5">
                <Progress
                    value={percent}
                    role="progressbar"
                    aria-label="Progression de la connexion"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1.5"
                />
                <div className="flex items-baseline justify-between gap-4 text-xs">
                    <span role="status" aria-live="polite" className="min-w-0 truncate text-muted-foreground">
                        {label}
                    </span>
                    <motion.span className="shrink-0 font-medium tabular-nums text-foreground">
                        {displayedPercent}
                    </motion.span>
                </div>
            </div>
        </motion.div>
    );
}
