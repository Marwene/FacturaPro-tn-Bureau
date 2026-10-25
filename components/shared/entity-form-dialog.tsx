"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import { CircleAlert, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface EntityFormDialogProps<TIn extends FieldValues, TOut extends FieldValues> {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    schema: z.ZodType<TOut, TIn>
    defaultValues: DefaultValues<TIn>
    onSubmit: (values: TOut) => void
    isPending?: boolean
    submitLabel?: string
    pendingLabel?: string
    cancelLabel?: string
    size?: "sm" | "md" | "lg"
    children: (form: UseFormReturn<TIn, unknown, TOut>) => React.ReactNode
}

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-2xl",
}

/**
 * Dialog de formulaire d'entité : RHF + Zod, footer standard (Annuler /
 * Enregistrer avec état pending + spinner), erreurs inline par champ (via
 * `FormField`) et Alert récapitulatif en tête de formulaire.
 *
 * Contrat de conteneur : 1 à 3 sections courtes sans défilement sur un
 * laptop. Au-delà (listes répétables : contacts, documents, banques), utiliser
 * une page dédiée (précedent : `components/produits/produit-form-page.tsx`).
 */
export function EntityFormDialog<TIn extends FieldValues, TOut extends FieldValues>({
    open,
    onOpenChange,
    title,
    description,
    schema,
    defaultValues,
    onSubmit,
    isPending = false,
    submitLabel = "Enregistrer",
    pendingLabel = "Enregistrement...",
    cancelLabel = "Annuler",
    size = "md",
    children,
}: EntityFormDialogProps<TIn, TOut>) {
    const form = useForm<TIn, unknown, TOut>({
        resolver: zodResolver<TIn, unknown, TOut>(schema),
        defaultValues,
    })

    const { errors } = form.formState
    const hasErrors = Object.keys(errors).length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("max-h-[90vh] overflow-y-auto", sizeClasses[size])}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
                    {hasErrors && (
                        <Alert variant="destructive">
                            <CircleAlert />
                            <AlertDescription>
                                {errors.root?.message ?? "Veuillez corriger les erreurs ci-dessous."}
                            </AlertDescription>
                        </Alert>
                    )}
                    {children(form)}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {cancelLabel}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? pendingLabel : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
