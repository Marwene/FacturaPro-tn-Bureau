"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useProductVariants } from "@/hooks/use-product-variants"
import type { SerializedProductVariant } from "@/lib/types"

interface VariantSelectProps {
    productId: string | null
    value: string | null
    onChange: (variantId: string | null) => void
    disabled?: boolean
}

export function VariantSelect({ productId, value, onChange, disabled }: VariantSelectProps) {
    const { data, isLoading } = useProductVariants(productId ?? "")

    const variants = (data?.variants ?? []) as SerializedProductVariant[]
    const activeVariants = variants.filter((v) => v.actif)
    if (activeVariants.length === 0) return null

    return (
        <Select
            value={value ?? "default"}
            onValueChange={(v) => onChange(v === "default" ? null : v)}
            disabled={disabled}
        >
            <SelectTrigger className="h-7 text-xs w-36 bg-background">
                <SelectValue placeholder="Déclinaison" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="default" className="text-xs text-muted-foreground">
                    {isLoading ? "Chargement..." : "Défaut"}
                </SelectItem>
                {activeVariants.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.nom}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
