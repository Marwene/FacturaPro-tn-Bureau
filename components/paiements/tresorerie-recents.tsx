import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react"
import { SectionCard } from "@/components/shared/section-card"
import { MoneyCell } from "@/components/shared/money-cell"
import { ModeReglementBadge } from "@/components/shared/mode-reglement-badge"
import { FLUX_ENTREE_COLOR, FLUX_SORTIE_COLOR } from "@/components/shared/flux-colors"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { StatutFluxBadge } from "@/components/paiements/statut-flux-badge"
import { cn, formatDate } from "@/lib/utils"
import { presenterRecents } from "@/lib/tresorerie/presentation"
import type { TresorerieRecents } from "@/lib/types/tresorerie"

interface TresorerieRecentsProps {
    recents: TresorerieRecents
}

const LIMITE = 12

const LIENS = [
    { href: "/paiements", label: "Paiements" },
    { href: "/effets", label: "Effets" },
    { href: "/cheques", label: "Chèques" },
]

/** Table chronologique des derniers mouvements : mode + statut + signe par ligne. */
export function TresorerieRecents({ recents }: TresorerieRecentsProps) {
    const { lignes, tableau } = presenterRecents(recents)
    const visibles = lignes.slice(0, LIMITE)

    return (
        <SectionCard
            title="Mouvements récents"
            description="30 derniers jours, tous modes de règlement"
            actions={
                <div className="flex items-center gap-3">
                    {LIENS.map((lien) => (
                        <Link
                            key={lien.href}
                            href={lien.href}
                            className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                            {lien.label}
                        </Link>
                    ))}
                </div>
            }
            contentClassName="p-0"
        >
            {visibles.length === 0 ? (
                <Empty className="min-h-40 border-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><ArrowRightLeft /></EmptyMedia>
                        <EmptyTitle>Aucun mouvement récent</EmptyTitle>
                        <EmptyDescription>Les règlements des 30 derniers jours apparaîtront ici.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-2 text-[11px]">
                        <span className="text-muted-foreground">{lignes.length} mouvement{lignes.length > 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-3 tabular-nums">
                            <span className={cn("inline-flex items-center gap-1", FLUX_ENTREE_COLOR)}>
                                <ArrowDownLeft className="h-3 w-3" />+<MoneyCell value={tableau.totalEntrees} />
                            </span>
                            <span className={cn("inline-flex items-center gap-1", FLUX_SORTIE_COLOR)}>
                                <ArrowUpRight className="h-3 w-3" />−<MoneyCell value={tableau.totalSorties} />
                            </span>
                            <span className={cn("inline-flex items-center gap-1 font-semibold", tableau.solde >= 0 ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR)}>
                                net {tableau.solde >= 0 ? "+" : "−"}<MoneyCell value={Math.abs(tableau.solde)} />
                            </span>
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Date</th>
                                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Tiers</th>
                                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Mode</th>
                                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Statut</th>
                                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {visibles.map((ligne) => (
                                    <tr key={ligne.id} className="transition-colors hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{formatDate(ligne.date)}</td>
                                        <td className="max-w-[220px] px-4 py-2.5">
                                            <p className="truncate font-medium">{ligne.tiers}</p>
                                            {ligne.reference && <p className="truncate font-mono text-[11px] text-muted-foreground">{ligne.reference}</p>}
                                        </td>
                                        <td className="px-4 py-2.5"><ModeReglementBadge mode={ligne.mode} /></td>
                                        <td className="px-4 py-2.5"><StatutFluxBadge status={ligne.statutSource} /></td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                                                ligne.sens === "entree" ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR,
                                            )}>
                                                {ligne.sens === "entree"
                                                    ? <ArrowDownLeft className="h-3.5 w-3.5" aria-label="Encaissement" />
                                                    : <ArrowUpRight className="h-3.5 w-3.5" aria-label="Décaissement" />}
                                                {ligne.signe}
                                                <MoneyCell value={ligne.montant} />
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {lignes.length > LIMITE && (
                            <div className="border-t px-4 py-2 text-right text-[11px] text-muted-foreground">
                                {lignes.length - LIMITE} mouvement{lignes.length - LIMITE > 1 ? "s" : ""} plus ancien{lignes.length - LIMITE > 1 ? "s" : ""} non affiché{lignes.length - LIMITE > 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                </>
            )}
        </SectionCard>
    )
}
