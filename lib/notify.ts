// lib/notify.ts
// Socle unique de notifications de l'application (lot F.1 du Prompt F).
// Seul fichier autorisé à importer `sonner` (cf. règle ESLint no-restricted-imports) ;
// le JSX de rendu vit dans `components/shared/app-toast.tsx`.

import { createElement } from "react";
import { toast } from "sonner";
import { AppToast, type AppToastAction, type AppToastTech } from "@/components/shared/app-toast";
import { ApiError, readApiErrorMessage } from "@/lib/api-error";

export type NotifyAction = AppToastAction;

export type NotifyOptions = {
    title: string;
    description?: string;
    footer?: string;
    action?: NotifyAction;
};

export type NotifyErrorOptions = {
    title: string;
    error: unknown;
    /** Contexte métier de l'opération (ex. « création de la facture »). */
    context?: string;
    /** À fournir sur erreur réseau / 5xx : affiche le bouton « Réessayer ». */
    retry?: () => void;
    /** Informations techniques additionnelles ajoutées au bloc « Copier les détails ». */
    details?: string;
};

export type NotifyPromiseOptions = {
    loading: string;
    success: string;
    error: string;
    context?: string;
};

export type ErrorFacts = {
    message: string;
    status?: number;
    code?: string;
    requestId?: string;
    network: boolean;
    retryable: boolean;
};

const STATUS_MESSAGES: Record<number, string> = {
    400: "La demande est invalide.",
    401: "Session expirée. Reconnectez-vous pour continuer.",
    403: "Accès refusé : vous n'avez pas les droits nécessaires pour cette action.",
    404: "Ressource introuvable : elle a peut-être été supprimée. Actualisez la page.",
    409: "Conflit avec l'état actuel : l'opération est peut-être déjà en cours. Actualisez puis réessayez.",
    422: "Certains champs sont invalides.",
    429: "Trop de requêtes. Patientez quelques secondes avant de réessayer.",
};

const AUTH_CODE_MESSAGES: Record<string, string> = {
    invalid_credentials: "Identifiants incorrects. Vérifiez votre email et votre mot de passe.",
    deactivated: "Ce compte est désactivé. Contactez votre administrateur.",
    unverified: "Email non vérifié. Vérifiez votre boîte de réception puis saisissez le code reçu.",
    rate_limited: "Trop de tentatives. Patientez un instant avant de réessayer.",
};

const SERVER_5XX_MESSAGE =
    "Le serveur rencontre un problème. Réessayez dans un instant ; si cela persiste, contactez le support.";
const NETWORK_MESSAGE =
    "Connexion impossible. Vérifiez votre accès Internet puis réessayez.";
const UNKNOWN_MESSAGE =
    "Une erreur inattendue s'est produite. Réessayez ; si le problème persiste, contactez le support.";

const SUCCESS_DURATION_MS = 4000;
const UNDO_DURATION_MS = 5000;
const WARNING_DURATION_MS = 8000;

function statusMessage(status: number): string {
    if (status >= 500) return SERVER_5XX_MESSAGE;
    return STATUS_MESSAGES[status] ?? UNKNOWN_MESSAGE;
}

function isBrowserOffline(): boolean {
    return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkError(error: unknown): boolean {
    if (isBrowserOffline()) return true;
    return (
        error instanceof TypeError &&
        /fetch failed|load failed|networkerror|failed to fetch/i.test(error.message)
    );
}

/**
 * Mappe une erreur quelconque (`unknown`) vers un message métier actionnable et
 * les faits techniques associés. Fonction pure et exportée (tests unitaires).
 * Le message serveur brut n'est jamais repris tel quel, sauf pour les erreurs
 * de validation (400/422) où il détaille le champ fautif.
 */
export function describeApiError(error: unknown): ErrorFacts {
    if (error instanceof ApiError) {
        const serverMessage = readApiErrorMessage(error.body);
        const validationDetail =
            (error.status === 400 || error.status === 422) && serverMessage
                ? ` ${serverMessage}`
                : "";
        const authMessage =
            error.status === 401 && error.code ? AUTH_CODE_MESSAGES[error.code] : undefined;
        return {
            message: `${authMessage ?? statusMessage(error.status)}${validationDetail}`,
            status: error.status,
            code: error.code,
            requestId: error.requestId,
            network: false,
            retryable: error.status >= 500,
        };
    }
    if (isNetworkError(error)) {
        return { message: NETWORK_MESSAGE, network: true, retryable: true };
    }
    if (error instanceof Error && error.message.trim()) {
        return { message: error.message.trim(), network: false, retryable: false };
    }
    if (typeof error === "string" && error.trim()) {
        return { message: error.trim(), network: false, retryable: false };
    }
    return { message: UNKNOWN_MESSAGE, network: false, retryable: false };
}

/**
 * Formate le bloc technique copiable (« Copier les détails ») d'un toast d'erreur.
 */
export function formatErrorDetails(input: {
    title: string;
    context?: string;
    facts: ErrorFacts;
    time: string;
    extra?: string;
}): string {
    const { facts } = input;
    const head = [
        input.title,
        `Contexte : ${input.context ?? "—"}`,
        `Statut : ${facts.status ?? "—"}${facts.code ? ` · Code : ${facts.code}` : ""}`,
        `Requête : ${facts.requestId ?? "—"}`,
        `Message : ${facts.message}`,
        `Horodatage : ${input.time}`,
    ].join("\n");
    return input.extra ? `${head}\n${input.extra}` : head;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function errorToastProps(options: NotifyErrorOptions): {
    title: string;
    description: string;
    tech: AppToastTech;
    details: string;
    retry?: () => void;
} {
    const facts = describeApiError(options.error);
    const time = formatTime(new Date());
    const retryableNow = facts.network || (facts.status !== undefined && facts.status >= 500);
    return {
        title: options.title,
        description: facts.message,
        tech: { status: facts.status, code: facts.code, requestId: facts.requestId, time },
        details: formatErrorDetails({
            title: options.title,
            context: options.context,
            facts,
            time,
            extra: options.details,
        }),
        retry: options.retry && retryableNow ? options.retry : undefined,
    };
}

export const notify = {
    success(options: NotifyOptions): void {
        toast.custom(
            (id) =>
                createElement(AppToast, {
                    variant: "success",
                    title: options.title,
                    description: options.description,
                    footer: options.footer,
                    action: options.action,
                    onDismiss: () => toast.dismiss(id),
                }),
            // Une action « Annuler » (undo) reste cliquable 5 s ; 4 s sinon.
            { duration: options.action ? UNDO_DURATION_MS : SUCCESS_DURATION_MS },
        );
    },

    warning(options: NotifyOptions): void {
        toast.custom(
            (id) =>
                createElement(AppToast, {
                    variant: "warning",
                    title: options.title,
                    description: options.description,
                    footer: options.footer,
                    action: options.action,
                    onDismiss: () => toast.dismiss(id),
                }),
            { duration: WARNING_DURATION_MS },
        );
    },

    error(options: NotifyErrorOptions): void {
        const props = errorToastProps(options);
        toast.custom((id) =>
            createElement(AppToast, {
                variant: "error",
                ...props,
                onDismiss: () => toast.dismiss(id),
            }),
            // Pas de durée : comme le défaut `error` natif de sonner, le toast
            // reste affiché (lecture + copie des détails) jusqu'au dismiss.
            { duration: Number.POSITIVE_INFINITY },
        );
    },

    promise<T>(promise: Promise<T>, messages: NotifyPromiseOptions): Promise<T> {
        toast.promise(promise, {
            loading: createElement(AppToast, { variant: "loading", title: messages.loading }),
            success: createElement(AppToast, { variant: "success", title: messages.success }),
            error: (err: unknown) => {
                const props = errorToastProps({ title: messages.error, error: err, context: messages.context });
                return createElement(AppToast, { variant: "error", ...props });
            },
        });
        return promise;
    },
};
