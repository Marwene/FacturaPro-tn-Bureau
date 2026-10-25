import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field"

interface FormFieldProps {
    label: string
    error?: string
    description?: string
    required?: boolean
    children: React.ReactNode
    className?: string
}

/**
 * Wrapper applicatif au-dessus de `components/ui/field.tsx` (Field/FieldLabel/
 * FieldError — socle shadcn à 0 consommateur avant ce lot). Ajoute l'astérisque
 * « requis », la bascule description ↔ erreur et le marquage `data-invalid`
 * qui déclenche la couleur destructive du socle.
 *
 * Utilisation avec react-hook-form :
 *   <FormField label="Code" required error={form.formState.errors.code?.message}>
 *     <Input {...form.register("code")} aria-invalid={!!form.formState.errors.code} />
 *   </FormField>
 */
export function FormField({
    label,
    error,
    description,
    required,
    children,
    className,
}: FormFieldProps) {
    return (
        <Field data-invalid={error ? true : undefined} className={className}>
            <FieldLabel className="text-xs">
                {label}
                {required && (
                    <span aria-hidden="true" className="text-destructive">
                        *
                    </span>
                )}
            </FieldLabel>
            <FieldContent>
                {children}
                {description && !error && <FieldDescription>{description}</FieldDescription>}
                {error && <FieldError>{error}</FieldError>}
            </FieldContent>
        </Field>
    )
}
