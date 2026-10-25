"use client";

import { useFournisseurEcheances, type FournisseurEcheanceItem } from "@/hooks/use-fournisseurs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { AlertTriangle, CalendarClock, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FournisseurEcheancesCard({ fournisseurId }: { fournisseurId: string }) {
    const { data, isLoading } = useFournisseurEcheances(fournisseurId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Échéances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    const hasOverdue = data && data.overdue.length > 0;
    const hasUpcoming = data && data.upcoming.length > 0;

    return (
        <Card className={cn(hasOverdue && "border-red-300 dark:border-red-800")}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CalendarClock className="size-4" />
                    Échéances de paiement
                </CardTitle>
                {hasOverdue && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                        {data!.overdue.length} en retard
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {!data || (data.overdue.length === 0 && data.upcoming.length === 0 && data.later.length === 0) ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        Aucune échéance à venir
                    </p>
                ) : (
                    <>
                        {hasOverdue && (
                            <div>
                                <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                                    <AlertTriangle className="size-3" />
                                    En retard (<MoneyCell value={data!.totalOverdue} />)
                                </p>
                                <div className="flex flex-col gap-1">
                                    {data!.overdue.slice(0, 5).map((e: FournisseurEcheanceItem) => (
                                        <EcheanceRow key={e.id} echeance={e} type="overdue" />
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasUpcoming && (
                            <div>
                                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                    <Clock className="size-3" />
                                    Cette semaine (<MoneyCell value={data!.totalUpcoming} />)
                                </p>
                                <div className="flex flex-col gap-1">
                                    {data!.upcoming.slice(0, 5).map((e: FournisseurEcheanceItem) => (
                                        <EcheanceRow key={e.id} echeance={e} type="upcoming" />
                                    ))}
                                </div>
                            </div>
                        )}
                        {data.later.length > 0 && (
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                                    À venir ({data.later.length})
                                </p>
                                <div className="flex flex-col gap-1">
                                    {data.later.slice(0, 3).map((e: FournisseurEcheanceItem) => (
                                        <EcheanceRow key={e.id} echeance={e} type="later" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function EcheanceRow({ echeance, type }: { echeance: FournisseurEcheanceItem; type: "overdue" | "upcoming" | "later" }) {
    const daysUntilDue = echeance.daysUntilDue ?? 0;
    const label = type === "overdue"
        ? `J+${Math.abs(daysUntilDue)}`
        : type === "upcoming"
            ? `J-${daysUntilDue}`
            : `J-${daysUntilDue}`;

    return (
        <Link
            href={`/achats/${echeance.id}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                    "text-[10px] font-mono font-semibold shrink-0 w-8",
                    type === "overdue" && "text-red-600",
                    type === "upcoming" && "text-amber-600",
                    type === "later" && "text-muted-foreground",
                )}>
                    {label}
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{echeance.numero || `#${echeance.id.slice(0, 8)}`}</p>
                    <p className="text-[10px] text-muted-foreground"><DateCell value={echeance.dateEcheance} /></p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <MoneyCell value={String(echeance.totalTTC ?? "0")} className="text-xs font-semibold" />
                <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </Link>
    );
}
