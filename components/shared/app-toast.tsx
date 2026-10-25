"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FLUX_ENTREE_COLOR } from "@/components/shared/flux-colors";
import {
    Check,
    CircleCheck,
    Copy,
    Loader2,
    OctagonX,
    RotateCcw,
    TriangleAlert,
} from "lucide-react";

export type AppToastVariant = "success" | "error" | "warning" | "loading";

export type AppToastAction = { label: string; onClick: () => void };

export type AppToastTech = {
    status?: number;
    code?: string;
    requestId?: string;
    time: string;
};

export type AppToastProps = {
    variant: AppToastVariant;
    title: string;
    description?: string;
    footer?: string;
    action?: AppToastAction;
    retry?: () => void;
    details?: string;
    tech?: AppToastTech;
    onDismiss?: () => void;
};

const VARIANT_ICON = {
    success: CircleCheck,
    error: OctagonX,
    warning: TriangleAlert,
    loading: Loader2,
} as const satisfies Record<AppToastVariant, typeof CircleCheck>;

const VARIANT_ICON_CLASS = {
    success: FLUX_ENTREE_COLOR,
    error: "text-destructive",
    warning: "text-amber-600 dark:text-amber-400",
    loading: "text-muted-foreground",
} as const satisfies Record<AppToastVariant, string>;

function techSummary(tech: AppToastTech): string {
    return [tech.status, tech.code, tech.requestId, tech.time]
        .filter((part): part is string | number => part !== undefined && part !== "")
        .join(" · ");
}

function CopyDetailsButton({ details }: { details: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        // Hors contexte sécurisé (HTTP), `clipboard` peut être absent : on ne
        // montre jamais un « Copié » mensonger.
        navigator.clipboard?.writeText(details)?.then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            () => {
                // Presse-papiers refusé : sans feedback.
            },
        );
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            aria-label={copied ? "Détails copiés" : "Copier les détails"}
            className="shrink-0 gap-1 text-muted-foreground/70 hover:text-foreground"
        >
            <span className="relative size-3">
                <Copy
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-0 transition-all duration-150 ease-out",
                        copied ? "scale-75 opacity-0" : "scale-100 opacity-100",
                    )}
                />
                <Check
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-0 transition-all duration-150 ease-out",
                        copied ? "scale-100 opacity-100" : "scale-75 opacity-0",
                    )}
                />
            </span>
            {copied ? "Copié" : "Copier les détails"}
        </Button>
    );
}

export function AppToast({
    variant,
    title,
    description,
    footer,
    action,
    retry,
    details,
    tech,
    onDismiss,
}: AppToastProps) {
    const Icon = VARIANT_ICON[variant];
    const hasMetaLine = footer !== undefined || tech !== undefined;
    const hasActions = action !== undefined || retry !== undefined;

    const handleAction = () => {
        action?.onClick();
        onDismiss?.();
    };

    return (
        <div className="flex w-full items-start gap-2.5" data-variant={variant}>
            <Icon
                aria-hidden="true"
                className={cn(
                    "mt-0.5 size-4 shrink-0",
                    VARIANT_ICON_CLASS[variant],
                    variant === "loading" && "animate-spin",
                )}
            />
            <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="text-sm font-medium leading-snug text-balance">{title}</p>
                {description ? (
                    <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                        {description}
                    </p>
                ) : null}
                {hasMetaLine ? (
                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/60 pt-1.5 text-xs tabular-nums text-muted-foreground/70">
                        <span className="truncate">
                            {footer ?? (tech ? techSummary(tech) : "")}
                        </span>
                        {details ? <CopyDetailsButton details={details} /> : null}
                    </div>
                ) : null}
                {hasActions ? (
                    <div className="mt-1.5 flex items-center gap-1">
                        {retry ? (
                            <Button type="button" variant="outline" size="xs" onClick={retry}>
                                <RotateCcw aria-hidden="true" />
                                Réessayer
                            </Button>
                        ) : null}
                        {action ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={handleAction}
                                className="font-medium"
                            >
                                {action.label}
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
