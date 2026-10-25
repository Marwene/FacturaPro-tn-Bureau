import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, CircleMinus, CirclePlus } from "lucide-react"
import type { FacetedFilterDef } from "@/components/data-table/types"
import { MoneyCell } from "@/components/shared/money-cell"
import { FLUX_ENTREE_COLOR, FLUX_SORTIE_COLOR } from "@/components/shared/flux-colors"
import { ModeReglementBadge, modeReglementLabel } from "@/components/shared/mode-reglement-badge"
import { EffetStatusBadge, ChequeStatusBadge } from "@/components/status-badge"
import type { EffetStatus, ChequeStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { modeDepuisSource } from "@/lib/tresorerie/presentation"
import type { TresorerieEcheancierLigne } from "@/lib/types/tresorerie"

function daysUntil(d: string): string {
    const diff = Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return "Aujourd'hui"
    if (diff === 1) return "Demain"
    if (diff < 0) return `Il y a ${Math.abs(diff)}j`
    return `J+${diff}`
}

const STATUS_LABELS: Record<string, string> = {
    EN_PORTEFEUILLE: "Portefeuille", REMIS_ESCOMPTE: "Escompte", ENDOSSE: "Endossé",
    IMPAYE: "Impayé", PAYE: "Payé", EN_ATTENTE: "Attente", ENCAISSE: "Encaissé",
    REJETE: "Rejeté", ANNULE: "Annulé",
}

function FluxCell({ flux }: { flux: TresorerieEcheancierLigne["flux"] }) {
    const entree = flux === "entree"
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums",
                entree ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR,
            )}
        >
            {entree ? <CirclePlus className="h-4 w-4" aria-label="Encaissement" /> : <CircleMinus className="h-4 w-4" aria-label="Décaissement" />}
            <span aria-hidden="true">{entree ? "+" : "−"}</span>
        </span>
    )
}

function StatutCell({ ligne }: { ligne: TresorerieEcheancierLigne }) {
    const { status, source } = ligne
    if (!status) return null

    if (status === "REALISE" || source === "realise") {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn("inline-flex items-center gap-1.5", FLUX_ENTREE_COLOR)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        <span className="text-xs font-medium">Réalisé</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Paiement {ligne.instrumentType ? `(${ligne.instrumentType})` : "Direct"}</p>
                        <p className="text-xs">Référence: {ligne.ordrePaiementNumero}</p>
                        <p className="text-xs">Tiers: {ligne.contrepartie}</p>
                        <p className="text-xs">Montant: <MoneyCell value={ligne.montant} /></p>
                        <p className="text-xs">Date: {format(new Date(ligne.date), "dd/MM/yyyy")}</p>
                        <p className="text-xs">Flux: {ligne.flux === "entree" ? "Entrée" : "Sortie"}</p>
                        {ligne.chequeId && <p className="text-xs">Chèque lié: {ligne.chequeId}</p>}
                        {ligne.effetId && <p className="text-xs">Effet lié: {ligne.effetId}</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        )
    }

    if (source === "effet") return <EffetStatusBadge status={status as EffetStatus} />
    if (source === "cheque") return <ChequeStatusBadge status={status as ChequeStatus} />

    return (
        <Badge variant="outline" className="h-4 border-0 px-1.5 py-0 text-[10px] font-mono">
            {STATUS_LABELS[status] ?? status}
        </Badge>
    )
}

/** Filtres à facettes des colonnes ci-dessous (ids = colonnes définies ici). */
export const echeancesFacetedFilters: FacetedFilterDef[] = [
    {
        columnId: "flux",
        title: "Flux",
        options: [
            { label: "Entrée", value: "entree", icon: CirclePlus },
            { label: "Sortie", value: "sortie", icon: CircleMinus },
        ],
    },
    {
        columnId: "status",
        title: "Statut",
        options: [
            { label: "En portefeuille", value: "EN_PORTEFEUILLE" },
            { label: "Remis escompte", value: "REMIS_ESCOMPTE" },
            { label: "Endossé", value: "ENDOSSE" },
            { label: "Impayé", value: "IMPAYE" },
            { label: "Payé", value: "PAYE" },
            { label: "En attente", value: "EN_ATTENTE" },
            { label: "Encaissé", value: "ENCAISSE" },
            { label: "Rejeté", value: "REJETE" },
            { label: "Annulé", value: "ANNULE" },
        ],
    },
]

export const echeancesColumns: ColumnDef<TresorerieEcheancierLigne>[] = [
    {
        accessorKey: "numero",
        header: "N°",
        cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.numero}</span>,
    },
    {
        accessorKey: "ordrePaiementNumero",
        header: "Réf. Paiement",
        cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{row.original.ordrePaiementNumero ?? "—"}</span>,
    },
    {
        accessorKey: "date",
        header: "Date Échéance",
        cell: ({ row }) => <span className="font-mono text-sm">{format(new Date(row.original.date), "dd/MM/yyyy")}</span>,
        sortingFn: (a, b) => new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
    },
    {
        accessorKey: "contrepartie",
        header: "Tiers (Client/Fournisseur)",
        cell: ({ row }) => <span className="block max-w-[180px] truncate text-sm">{row.original.contrepartie}</span>,
    },
    {
        id: "flux",
        accessorKey: "flux",
        header: "Flux",
        cell: ({ row }) => <FluxCell flux={row.original.flux} />,
    },
    {
        accessorKey: "source",
        header: "Mode",
        cell: ({ row }) => {
            const mode = modeDepuisSource(row.original.source)
            return mode ? <ModeReglementBadge mode={mode} /> : <span className="text-sm text-muted-foreground">{modeReglementLabel(row.original.source)}</span>
        },
    },
    {
        accessorKey: "montant",
        header: "Montant",
        cell: ({ row }) => <MoneyCell value={row.original.montant} className="text-sm font-semibold" />,
        sortingFn: "basic",
    },
    {
        id: "jours",
        header: "J-",
        cell: ({ row }) => <span className="font-mono text-sm text-muted-foreground">{daysUntil(row.original.date)}</span>,
        sortingFn: (a, b) => new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StatutCell ligne={row.original} />,
    },
]
