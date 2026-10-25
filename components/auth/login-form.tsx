"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { notify } from "@/lib/notify";
import { DEFAULT_POST_LOGIN_ROUTE } from "@/lib/safe-internal-path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLogin } from "@/hooks/use-login";
import { useAuthProgressStore, type AuthProgressError } from "@/lib/stores/auth-progress-store";
import { AuthProgressScreen } from "./auth-progress-screen";

/**
 * C3 — Formulaire de connexion : React Hook Form + Zod (convention du projet,
 * cf. `docs/wiki/ui-dialogs.md` §3 règle 4), mutation via `useLogin()`
 * (Server Action `loginAction` + chaîne de jalons réels).
 *
 * À l'échec : retour au formulaire (e-mail conservé, mot de passe vidé, focus
 * posé dessus), `<Alert variant="destructive">` inline avec le message du code
 * d'erreur + toast titré via le socle `@/lib/notify` (lot F.1), et compte à
 * rebours visible en cas de rate-limit.
 */
const loginSchema = z.object({
    email: z.string().trim().min(1, "Email requis").email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis"),
    rememberMe: z.boolean(),
});

type LoginInput = z.infer<typeof loginSchema>;

const UNEXPECTED_ERROR: AuthProgressError = {
    code: "unknown",
    message: "Une erreur est survenue. Vérifiez votre connexion puis réessayez.",
};

const ERROR_TITLES: Record<AuthProgressError["code"], string> = {
    invalid_credentials: "Connexion refusée",
    deactivated: "Compte désactivé",
    unverified: "Email non vérifié",
    rate_limited: "Trop de tentatives",
    unknown: "Erreur de connexion",
    // La session est déjà établie : seul le saut de navigation a échoué
    // (garde-fou `NAVIGATION_TIMEOUT_MS` de `hooks/use-login.ts`).
    navigation_failed: "Redirection interrompue",
};

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || DEFAULT_POST_LOGIN_ROUTE;
    const reduce = useReducedMotion();
    const { mutateAsync, isPending } = useLogin();
    const storeError = useAuthProgressStore((s) => s.error);
    const setStoreError = useAuthProgressStore((s) => s.setError);
    // État local de « connexion aboutie » : contrairement à la phase du store (qui
    // survit aux navigations client), il ne survit PAS au démontage du formulaire —
    // impossible d'afficher un écran de progression orphelin sur une visite future
    // de /login.
    const [authCompleted, setAuthCompleted] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "", rememberMe: false },
    });

    // Justification useEffect : minuteur `setInterval` navigateur (1 s) pour le compte à
    // rebours rate-limit — l'écoulement du temps est un système externe non réactif (aucun
    // état React ne le produit ; même motif justifié dans `hooks/use-auto-logout.ts`).
    useEffect(() => {
        if (countdown <= 0) return;
        const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [countdown]);

    async function handleSubmit(values: LoginInput) {
        setCountdown(0);
        // Nouvelle tentative possible : l'écran de progression ne doit jamais
        // rester affiché si la mutation se termine en échec (le `showProgress`
        // ci-dessous combine `isPending || authCompleted`).
        setAuthCompleted(false);
        try {
            const outcome = await mutateAsync({ ...values, callbackUrl });

            if (outcome.ok) {
                // La navigation (`router.replace`) est déjà déclenchée et ATTENDUE
                // par le hook : l'écran de progression reste affiché jusqu'au
                // démontage, et un échec/timeout de navigation revient ici en
                // échec structuré plutôt que de figer la barre à 95 %.
                setAuthCompleted(true);
                return;
            }

            notify.error({ title: ERROR_TITLES[outcome.code], error: outcome.message, context: "connexion" });
            form.reset({ email: values.email, password: "", rememberMe: values.rememberMe });
            if ("retryAfterSeconds" in outcome && outcome.retryAfterSeconds) {
                setCountdown(outcome.retryAfterSeconds);
            }
            form.setFocus("password");
            if (outcome.code === "unverified") {
                router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
            }
        } catch {
            // Échec d'infrastructure (la Server Action n'a jamais renvoyé de résultat
            // structuré) : titre explicite + message détaillé, jamais un toast « Erreur ».
            notify.error({ title: ERROR_TITLES.unknown, error: UNEXPECTED_ERROR.message, context: "connexion" });
            setStoreError(UNEXPECTED_ERROR);
            form.reset({ email: values.email, password: "", rememberMe: values.rememberMe });
            form.setFocus("password");
        }
    }

    const emailError = form.formState.errors.email;
    const passwordError = form.formState.errors.password;
    const showProgress = isPending || authCompleted;

    return (
        <AnimatePresence mode="wait" initial={false}>
            {showProgress ? (
                <AuthProgressScreen key="progress" />
            ) : (
                <motion.div
                    key="form"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
                                <Building2 className="h-6 w-6 text-background" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl">FacturaPro TN</CardTitle>
                            <CardDescription>
                                Connectez-vous à votre compte
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={form.handleSubmit(handleSubmit)}
                                noValidate
                                className="space-y-4"
                            >
                                {storeError && (
                                    <motion.div
                                        initial={reduce ? false : { opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <Alert variant="destructive">
                                            <AlertCircle />
                                            <AlertTitle>{ERROR_TITLES[storeError.code]}</AlertTitle>
                                            <AlertDescription>
                                                {storeError.message}
                                                {countdown > 0 && (
                                                    <span className="mt-1 block font-medium tabular-nums">
                                                        Réessayez dans {countdown} s.
                                                    </span>
                                                )}
                                            </AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="vous@exemple.com"
                                        autoComplete="email"
                                        aria-invalid={emailError ? true : undefined}
                                        {...form.register("email")}
                                    />
                                    {emailError && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {emailError.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Mot de passe</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••"
                                        autoComplete="current-password"
                                        aria-invalid={passwordError ? true : undefined}
                                        {...form.register("password")}
                                    />
                                    {passwordError && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {passwordError.message}
                                        </p>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-foreground"
                                        {...form.register("rememberMe")}
                                    />
                                    <span className="text-muted-foreground">Se souvenir de moi</span>
                                </label>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isPending || countdown > 0}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Connexion...
                                        </>
                                    ) : (
                                        "Se connecter"
                                    )}
                                </Button>
                            </form>
                            <Separator className="my-4" />
                            <p className="text-center text-xs text-muted-foreground">
                                Les comptes sont créés et invités par votre administrateur.
                                {" "}
                                <Link href="/verify-email" className="text-foreground font-medium hover:underline">
                                    Vérifier mon email
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
