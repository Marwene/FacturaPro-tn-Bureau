"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { MoneyCell } from "@/components/shared/money-cell"
import { EffetStatusBadge } from "@/components/status-badge"
import { formatDateShort } from "@/lib/utils"
import Link from "next/link"
import {
    ArrowLeft, Landmark, ArrowLeftRight, Ban, CheckCircle2, XCircle,
    Building2, ArrowDownToLine, ArrowUpFromLine,
    GitFork, CalendarDays, ChevronRight, Wallet,
} from "lucide-react"
import type { EffetStatus } from "@/lib/types"
import type { EffetForDetail } from "./effet-detail-logic"

const statusSteps: { key: EffetStatus; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: "EN_PORTEFEUILLE", icon: Wallet, label: "Créé" },
    { key: "REMIS_ESCOMPTE", icon: Landmark, label: "Escompté" },
    { key: "ENDOSSE", icon: ArrowLeftRight, label: "Endossé" },
    { key: "PAYE", icon: CheckCircle2, label: "Payé" },
]

export function EffetDetailHero({ effet, isRECU, isSplitEffet }: { effet: EffetForDetail; isRECU: boolean; isSplitEffet: boolean }) {
    return (
        <>
            {/* Breadcrumb + back */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Link href="/effets" className="hover:text-foreground transition-colors">Effets</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{effet.numero}</span>
            </div>

            {/* Hero section */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/30 p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1.5" asChild>
                                <Link href="/effets"><ArrowLeft className="h-4 w-4" /></Link>
                            </Button>
                            <PageHeader title={effet.numero} className="min-w-0" />
                            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                                {isRECU ? <ArrowDownToLine className="h-3 w-3 text-blue-600" /> : <ArrowUpFromLine className="h-3 w-3 text-amber-600" />}
                                {isRECU ? "Reçu" : "Émis"}
                            </Badge>
                            <EffetStatusBadge status={effet.status} />
                            {isSplitEffet && (
                                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                                    <GitFork className="h-3 w-3" />
                                    Split {effet.splitIndex}/{effet.splitTotal}
                                </Badge>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-1 text-[10px]">
                            {statusSteps.map((step, i) => {
                                const Icon = step.icon
                                const currentIndex = statusSteps.findIndex((s) => s.key === effet.status)
                                const done = i <= currentIndex && effet.status !== "IMPAYE"
                                const active = i === currentIndex && effet.status !== "IMPAYE"
                                const isLast = i === statusSteps.length - 1
                                return (
                                    <div key={step.key} className="flex items-center gap-1">
                                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${active ? "bg-primary/10 text-primary font-semibold" :
                                            done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                "bg-muted text-muted-foreground"
                                            }`}>
                                            <Icon className="h-3 w-3" />
                                            <span className="hidden sm:inline">{step.label}</span>
                                        </div>
                                        {!isLast && <div className={`h-px w-3 ${i < currentIndex && effet.status !== "IMPAYE" ? "bg-emerald-400" : "bg-border"}`} />}
                                    </div>
                                )
                            })}
                            {(effet.status === "IMPAYE" || effet.status === "ANNULE") && (
                                <>
                                    <div className="h-px w-3 bg-red-400" />
                                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${effet.status === "IMPAYE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                        "bg-muted text-muted-foreground"
                                        }`}>
                                        {effet.status === "IMPAYE" ? <Ban className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        <span className="hidden sm:inline">{effet.status === "IMPAYE" ? "Impayé" : "Annulé"}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Quick meta row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Échéance {formatDateShort(effet.dateEcheance)}</span>
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {effet.tire}</span>
                        </div>
                    </div>

                    {/* Montant — bien en évidence */}
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Montant</p>
                        <p className="text-3xl font-bold tracking-tight"><MoneyCell value={effet.montant} /></p>
                        {effet.tauxEscompte && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Taux {effet.tauxEscompte}% · Net {effet.netEncaisse ? <MoneyCell value={effet.netEncaisse} /> : "—"}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
