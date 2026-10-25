import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { SectionCard } from "@/components/shared/section-card"
import { MoneyCell } from "@/components/shared/money-cell"
import { FLUX_ENTREE_COLOR, FLUX_SORTIE_COLOR } from "@/components/shared/flux-colors"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { MODE_REGLEMENT_ICONS, MODE_REGLEMENT_LABELS } from "@/components/shared/mode-reglement-badge"
import { cn } from "@/lib/utils"
import { presenterVentilationMois, MODES_TRESORERIE } from "@/lib/tresorerie/presentation"
import type { TresorerieData } from "@/lib/types/tresorerie"

interface TresorerieVentilationMoisProps {
    ventilation: TresorerieData["ventilationMois"]
    className?: string
}

/** Carte « Entrées / Sorties du mois » — tableau (données tabulaires), pas une pile de cartes. */
export function TresorerieVentilationMois({ ventilation, className }: TresorerieVentilationMoisProps) {
    const tableau = presenterVentilationMois(ventilation)
    const vide = tableau.totalEntrees === 0 && tableau.totalSorties === 0

    return (
        <SectionCard
            title="Entrées / Sorties du mois"
            description="Ventilation par mode de règlement, mouvements réalisés"
            className={className}
            contentClassName="p-0"
        >
            {vide ? (
                <Empty className="min-h-48 border-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><ArrowDownLeft /></EmptyMedia>
                        <EmptyTitle>Aucun mouvement ce mois-ci</EmptyTitle>
                        <EmptyDescription>
                            Les encaissements et décaissements réalisés apparaîtront ici, ventilés par mode.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                                <th scope="col" className="px-4 py-2.5 text-left font-semibold">Mode</th>
                                <th scope="col" className={cn("px-4 py-2.5 text-right font-semibold", FLUX_ENTREE_COLOR)}>
                                    <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5" />Entrées</span>
                                </th>
                                <th scope="col" className={cn("px-4 py-2.5 text-right font-semibold", FLUX_SORTIE_COLOR)}>
                                    <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" />Sorties</span>
                                </th>
                                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {MODES_TRESORERIE.map((mode) => {
                                const c = tableau.cases[mode]
                                const Icon = MODE_REGLEMENT_ICONS[mode]
                                return (
                                    <tr key={mode} className="transition-colors hover:bg-muted/30">
                                        <th scope="row" className="px-4 py-2.5 text-left font-medium">
                                            <span className="inline-flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                {MODE_REGLEMENT_LABELS[mode]}
                                            </span>
                                        </th>
                                        <td className={cn("px-4 py-2.5 text-right font-medium tabular-nums", c.entrees > 0 && FLUX_ENTREE_COLOR)}>
                                            {c.entrees > 0 ? <MoneyCell value={c.entrees} /> : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className={cn("px-4 py-2.5 text-right font-medium tabular-nums", c.sorties > 0 && FLUX_SORTIE_COLOR)}>
                                            {c.sorties > 0 ? <MoneyCell value={c.sorties} /> : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", c.net >= 0 ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR)}>
                                            {c.net === 0 ? <span className="font-normal text-muted-foreground"><MoneyCell value={0} /></span> : <>{c.net > 0 ? "+" : "−"}<MoneyCell value={Math.abs(c.net)} /></>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-muted/40 text-sm">
                                <th scope="row" className="px-4 py-2.5 text-left font-semibold">Total</th>
                                <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", FLUX_ENTREE_COLOR)}>+<MoneyCell value={tableau.totalEntrees} /></td>
                                <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", FLUX_SORTIE_COLOR)}>−<MoneyCell value={tableau.totalSorties} /></td>
                                <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums", tableau.solde >= 0 ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR)}>
                                    {tableau.solde >= 0 ? "+" : "−"}<MoneyCell value={Math.abs(tableau.solde)} />
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}
