"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading?: boolean;
    confirmLabel?: string;
    pendingLabel?: string;
    cancelLabel?: string;
    /** Variante du bouton de confirmation + de la média (défaut destructif identique à l'ancien ConfirmDeleteDialog). */
    variant?: "destructive" | "default";
    /** Icône de la média (défaut Trash2, identique à l'ancien ConfirmDeleteDialog). */
    icon?: LucideIcon;
    iconClassName?: string;
}

/**
 * Confirmation générique (AlertDialog) — étend l'ancien ConfirmDeleteDialog :
 * les valeurs par défaut (bouton destructif, Trash2, libellés « Supprimer » /
 * « Suppression... » / « Annuler ») sont strictement identiques à l'ancien
 * rendu, donc les 10 consommateurs existants sont sans régression. La variante
 * `default` + `icon` permet les confirmations non destructives.
 */
function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    isLoading,
    confirmLabel = "Supprimer",
    pendingLabel = "Suppression...",
    cancelLabel = "Annuler",
    variant = "destructive",
    icon: Icon = Trash2,
    iconClassName,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <div
                            className={cn(
                                "flex items-center justify-center size-8 rounded-full",
                                variant === "destructive"
                                    ? "bg-red-100 dark:bg-red-900/30"
                                    : "bg-muted",
                                iconClassName,
                            )}
                        >
                            <Icon
                                className={cn(
                                    "size-5",
                                    variant === "destructive"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-foreground",
                                )}
                            />
                        </div>
                    </AlertDialogMedia>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        variant={variant}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? pendingLabel : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export { ConfirmDialog, ConfirmDialog as ConfirmDeleteDialog };
