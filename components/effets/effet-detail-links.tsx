"use client"

import { Badge } from "@/components/ui/badge"
import { MoneyCell } from "@/components/shared/money-cell"
import { EffetStatusBadge } from "@/components/status-badge"
import Link from "next/link"
import { FileText, GitFork, ShoppingCart, ExternalLink } from "lucide-react"
import type { SerializedEffet } from "@/lib/types"
import type { EffetForDetail } from "./effet-detail-logic"

interface EffetDetailLinksProps {
    effet: EffetForDetail
    isSplitEffet: boolean
    splitSiblings: SerializedEffet[]
}

export function EffetDetailLinks({ effet, isSplitEffet, splitSiblings }: EffetDetailLinksProps) {
    return (
        <>
            {/* Notes avec badge split */}
            {effet.notes && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                    </div>
                    <div className="p-4 flex items-start gap-3 text-sm">
                        {isSplitEffet && (
                            <Badge variant="secondary" className="gap-1.5 text-xs px-2.5 py-1 shrink-0">
                                <GitFork className="h-3.5 w-3.5" />
                                {effet.tire} — SPLIT {effet.splitIndex}/{effet.splitTotal}
                            </Badge>
                        )}
                        <span>{effet.notes}</span>
                    </div>
                </div>
            )}

            {/* Split siblings */}
            {isSplitEffet && splitSiblings.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                        <GitFork className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Effets liés (Split {effet.splitIndex}/{effet.splitTotal})
                        </span>
                    </div>
                    <div className="p-2 space-y-1">
                        {[...splitSiblings].sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0)).map((e) => (
                            <Link key={e.id} href={`/effets/${e.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors group">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium">{e.numero}</span>
                                    {e.splitIndex && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 h-4">{e.splitIndex}/{effet.splitTotal}</Badge>
                                    )}
                                    <EffetStatusBadge status={e.status} />
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MoneyCell value={e.montant} className="font-medium text-foreground" />
                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Achats liés */}
            {effet.achatsLies && effet.achatsLies.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achats liés</span>
                    </div>
                    <div className="p-2 space-y-1">
                        {effet.achatsLies.map((lien) => (
                            <div key={lien.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-muted/20">
                                <span className="font-mono">{lien.achat?.numero ?? lien.achatId}</span>
                                <MoneyCell value={lien.montantAlloue} className="font-medium" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
