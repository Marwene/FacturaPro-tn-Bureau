import { Ban, CheckCircle2, Clock, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FLUX_ENTREE_COLOR } from "@/components/shared/flux-colors"
import { statutFluxAffiche, type StatutFluxAffiche } from "@/lib/tresorerie/presentation"

const STATUT_CONFIG: Record<StatutFluxAffiche, { label: string; icon: LucideIcon; className: string }> = {
    prevu: { label: "Prévu", icon: Clock, className: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    realise: { label: "Réalisé", icon: CheckCircle2, className: `border-transparent bg-emerald-500/10 ${FLUX_ENTREE_COLOR}` },
    annule: { label: "Annulé", icon: Ban, className: "border-transparent bg-muted text-muted-foreground" },
}

interface StatutFluxBadgeProps {
    status: string
    className?: string
}

/** Badge statut ramené au trinôme prévu / réalisé / annulé — icône + libellé + couleur. */
export function StatutFluxBadge({ status, className }: StatutFluxBadgeProps) {
    const config = STATUT_CONFIG[statutFluxAffiche(status)]
    const Icon = config.icon
    return (
        <Badge variant="outline" title={status} className={cn("gap-1.5 font-normal", config.className, className)}>
            <Icon data-icon="inline-start" />
            {config.label}
        </Badge>
    )
}
