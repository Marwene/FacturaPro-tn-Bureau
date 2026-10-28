"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Printer,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Trash2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    LayoutGrid,
} from "lucide-react"
import type { SerializedEffet } from "@/lib/types"
import { MoneyCell } from "@/components/shared/money-cell"
import { DateCell } from "@/components/shared/date-cell"
import { cn } from "@/lib/utils"

function fieldRow(label: string, value?: ReactNode) {
    if (!value) return null
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-xs font-medium break-words">{value}</span>
        </div>
    )
}

interface ApercuEffetToolbarProps {
    current: SerializedEffet
    itemsCount: number
    pageIndex: number
    totalMontant: number
    warnings: string[]
    showRepères: boolean
    zoomPct: number
    onPrev: () => void; onNext: () => void
    onToggleRepères: () => void
    onZoomOut: () => void; onZoomIn: () => void; onZoomFit: () => void
    onRemoveCurrent: () => void; onPrint: () => void; onClose: () => void
}

export function ApercuEffetToolbar({
    current,
    itemsCount,
    pageIndex,
    totalMontant,
    warnings,
    showRepères,
    zoomPct,
    onPrev,
    onNext,
    onToggleRepères,
    onZoomOut,
    onZoomIn,
    onZoomFit,
    onRemoveCurrent,
    onPrint,
    onClose,
}: ApercuEffetToolbarProps) {
    const isBatch = itemsCount > 1
    const isReady = warnings.length === 0

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b bg-background shrink-0">
            {/* Groupe gauche : navigation + identité de l'effet */}
            <div className="flex items-center gap-3 text-sm min-w-0">
                {isBatch && (
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={pageIndex === 0}
                            onClick={onPrev}
                            title="Effet précédent (←)"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums w-14 text-center">
                            {pageIndex + 1} / {itemsCount}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={pageIndex === itemsCount - 1}
                            onClick={onNext}
                            title="Effet suivant (→)"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1" />
                    </div>
                )}
                <span className="font-semibold truncate">{current.numero}</span>
                <span className="text-muted-foreground shrink-0">·</span>
                <span className="text-muted-foreground shrink-0"><MoneyCell value={current.montant} /></span>
                <span className="text-muted-foreground shrink-0">·</span>
                <span className="text-muted-foreground capitalize shrink-0">{current.status.replace(/_/g, " ").toLowerCase()}</span>
                {isBatch && (
                    <>
                        <span className="text-muted-foreground shrink-0">·</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            Total lot : <MoneyCell value={totalMontant.toFixed(3)} />
                        </span>
                    </>
                )}
                {isReady ? (
                    <Badge variant="outline" className="gap-1 shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Prêt à imprimer
                    </Badge>
                ) : (
                    <Badge variant="destructive" className="gap-1 shrink-0" title={warnings.join(", ")}>
                        <AlertTriangle className="h-3 w-3" /> {warnings.length} champ(s) manquant(s)
                    </Badge>
                )}
            </div>

            {/* Groupe droit : calage / zoom / actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                <Button
                    variant={showRepères ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={onToggleRepères}
                    title="Afficher les cases mesurées du pré-imprimé (calibration)"
                >
                    <LayoutGrid className="h-3.5 w-3.5" /> Repères
                </Button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomOut} title="Zoom arrière (-)">
                        <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-11 text-center text-xs tabular-nums select-none">{Math.round(zoomPct)}%</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomIn} title="Zoom avant (+)">
                        <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomFit} title="Ajuster à l'écran (0)">
                        <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-4 mx-1" />

                {isBatch && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={onRemoveCurrent}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Retirer du lot
                    </Button>
                )}
                <Button variant="default" size="sm" className="gap-1.5 text-xs h-7" onClick={onPrint}>
                    <Printer className="h-3.5 w-3.5" /> Imprimer {isBatch ? `(${itemsCount})` : ""}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

interface ApercuEffetRecapPanelProps {
    current: SerializedEffet
    companyName?: string
    warnings: string[]
    items: SerializedEffet[]
    pageIndex: number
    onSelectPage: (index: number) => void
}

export function ApercuEffetRecapPanel({
    current,
    companyName,
    warnings,
    items,
    pageIndex,
    onSelectPage,
}: ApercuEffetRecapPanelProps) {
    const isBatch = items.length > 1
    const isReady = warnings.length === 0

    return (
        <div className="hidden lg:flex w-72 shrink-0 border-l bg-background flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Récapitulatif</h3>
                <p className="text-xs text-muted-foreground">Données qui seront imprimées sur le pré-imprimé</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
                {fieldRow("N° effet", current.numero)}
                {fieldRow("Bénéficiaire", current.beneficiaire)}
                {fieldRow("Tiré", current.tire)}
                {fieldRow("Adresse du tiré", current.tireAdresse)}
                {fieldRow("Montant", <MoneyCell value={current.montant} />)}
                {fieldRow("Échéance", <DateCell value={current.dateEcheance} />)}
                {fieldRow("Date de création", <DateCell value={current.dateCreation} />)}
                {fieldRow(
                    "RIB du tiré",
                    current.type === "RECU" ? current.tireur?.ribBancaire : current.companyBank?.rib
                )}
                {fieldRow("Domiciliation", current.companyBank?.nomBanque)}
                {fieldRow("Cédant", companyName)}
            </div>
            {!isReady && (
                <div className="mx-4 mb-4 mt-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> À compléter avant impression
                    </div>
                    <ul className="text-xs text-destructive/90 list-disc list-inside space-y-0.5">
                        {warnings.map((w) => (
                            <li key={w}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {isBatch && (
                <div className="mx-4 mb-4 rounded-md border p-3">
                    <div className="text-xs font-semibold mb-2">Lot ({items.length})</div>
                    <div className="flex flex-col gap-1">
                        {items.map((e, i) => (
                            <button
                                key={e.id}
                                onClick={() => onSelectPage(i)}
                                className={cn(
                                    "flex items-center justify-between text-xs rounded px-2 py-1 text-left hover:bg-muted transition-colors",
                                    i === pageIndex && "bg-muted font-medium"
                                )}
                            >
                                <span className="truncate">{e.numero}</span>
                                <MoneyCell value={e.montant} className="text-muted-foreground shrink-0 ml-2" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
