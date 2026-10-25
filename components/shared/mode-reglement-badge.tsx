import type { LucideIcon } from "lucide-react"
import { Banknote, Building, CreditCard, FileCheck, Landmark } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { estModeReglement } from "@/lib/tresorerie/presentation"
import type { ModeReglementTresorerieAffiche } from "@/lib/types/tresorerie"

/**
 * Libellés et icônes des 5 modes de règlement — source unique du module
 * (les copies `METHOD_LABELS` / `METHOD_ICONS` locales de `paiements-client`
 * et `tresorerie-client` sont remplacées par ces exports, lot D3.2).
 */
export const MODE_REGLEMENT_LABELS: Record<ModeReglementTresorerieAffiche, string> = {
    ESPECES: "Espèces",
    CHEQUE: "Chèque",
    VIREMENT: "Virement",
    EFFET: "Effet",
    CARTE: "Carte",
}

export const MODE_REGLEMENT_ICONS: Record<ModeReglementTresorerieAffiche, LucideIcon> = {
    ESPECES: Banknote,
    CHEQUE: FileCheck,
    VIREMENT: Building,
    EFFET: Landmark,
    CARTE: CreditCard,
}

export function modeReglementLabel(value: string): string {
    return estModeReglement(value) ? MODE_REGLEMENT_LABELS[value] : value
}

export function modeReglementIcon(value: string): LucideIcon | undefined {
    return estModeReglement(value) ? MODE_REGLEMENT_ICONS[value] : undefined
}

interface ModeReglementBadgeProps {
    mode: string
    className?: string
}

/** Badge « mode de règlement » (icône + libellé) — jamais la couleur seule. */
export function ModeReglementBadge({ mode, className }: ModeReglementBadgeProps) {
    if (!estModeReglement(mode)) {
        return <span className={cn("text-xs text-muted-foreground", className)}>{mode}</span>
    }
    const Icon = MODE_REGLEMENT_ICONS[mode]
    return (
        <Badge variant="secondary" className={cn("gap-1.5 font-normal", className)}>
            <Icon data-icon="inline-start" />
            {MODE_REGLEMENT_LABELS[mode]}
        </Badge>
    )
}
