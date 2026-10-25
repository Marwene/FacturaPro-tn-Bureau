"use client"

import { useRef, useCallback, useState, useMemo, useLayoutEffect, type WheelEvent, type KeyboardEvent } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
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
import {
    buildLettreScreenPreviewHTML,
    buildLettrePrintOverlayHTML,
    getEffetPrintWarnings,
    LETTRE_PAGE_WIDTH_MM,
    LETTRE_PAGE_HEIGHT_MM,
} from "./lettre-de-change"
import { MoneyCell } from "@/components/shared/money-cell"
import { DateCell } from "@/components/shared/date-cell"
import { cn } from "@/lib/utils"

interface ApercuEffetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    companyName?: string
    /** Effet unique (rétro-compatibilité écran de détail). Ignoré si `effets` est fourni. */
    effet?: SerializedEffet
    /** Effets liés issus d'un fractionnement (rétro-compatibilité). Ignoré si `effets` est fourni. */
    splitEffets?: SerializedEffet[]
    /** Lot d'un ou plusieurs effets à parcourir/imprimer (nouvel écran d'impression groupée). */
    effets?: SerializedEffet[]
}

// Dimensions de référence (px CSS) du gabarit de page à l'échelle 100% de
// zoom "ajusté" — le composant recalcule ensuite un facteur d'échelle pour
// remplir l'espace disponible, puis applique le zoom utilisateur par-dessus.
const BASE_WIDTH_PX = 640
const BASE_HEIGHT_PX = Math.round((BASE_WIDTH_PX * LETTRE_PAGE_HEIGHT_MM) / LETTRE_PAGE_WIDTH_MM)

const ZOOM_MIN = 40
const ZOOM_MAX = 250
const ZOOM_STEP = 15

function fieldRow(label: string, value?: React.ReactNode) {
    if (!value) return null
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-xs font-medium break-words">{value}</span>
        </div>
    )
}

export function ApercuEffetDialog({
    effet,
    open,
    onOpenChange,
    companyName,
    splitEffets,
    effets: effetsProp,
}: ApercuEffetDialogProps) {
    const printFrame = useRef<HTMLIFrameElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const [batch, setBatch] = useState<SerializedEffet[] | null>(null)
    const [pageIndex, setPageIndex] = useState(0)
    const [showRepères, setShowRepères] = useState(false)
    const [fitScale, setFitScale] = useState(1)
    const [zoomPct, setZoomPct] = useState(100)

    // Le lot effectif : celui fourni explicitement (écran d'impression groupée),
    // sinon reconstruit depuis l'ancien mode (effet + splitEffets), avec retrait
    // local possible via `batch` (l'utilisateur peut exclure un effet du tirage).
    const initialBatch = useMemo(() => {
        if (effetsProp?.length) return effetsProp
        if (effet) return splitEffets?.length ? [effet, ...splitEffets] : [effet]
        return []
    }, [effetsProp, effet, splitEffets])

    const items = batch ?? initialBatch
    const current = items[Math.min(pageIndex, items.length - 1)]

    const removeFromBatch = (id: string) => {
        const next = items.filter((e) => e.id !== id)
        setBatch(next)
        if (pageIndex >= next.length) setPageIndex(Math.max(0, next.length - 1))
    }

    // Recalcule l'échelle "ajustée" (fit-to-screen) à l'ouverture et au
    // redimensionnement de la fenêtre / du panneau latéral.
    useLayoutEffect(() => {
        const el = stageRef.current
        if (!el || !open) return
        const compute = () => {
            const availW = el.clientWidth - 48
            const availH = el.clientHeight - 48
            const scale = Math.min(availW / BASE_WIDTH_PX, availH / BASE_HEIGHT_PX, 1.6)
            setFitScale(Math.max(scale, 0.15))
        }
        compute()
        const ro = new ResizeObserver(compute)
        ro.observe(el)
        return () => ro.disconnect()
    }, [open])

    // Revient au zoom "ajusté" (100 %) quand on ouvre le dialog ou change de
    // page. Ajustement au rendu (React : « storing information from previous
    // renders ») et non useEffect : la détection observe `open` et `pageIndex`,
    // les mêmes dépendances que l'ancien effet, donc tous les chemins de
    // changement de page (goPrev, goNext, removeFromBatch, clic liste du lot)
    // et toutes les ouvertures passent par ici, quel que soit le déclencheur.
    const [prevView, setPrevView] = useState({ open, pageIndex })
    if (prevView.open !== open || prevView.pageIndex !== pageIndex) {
        setPrevView({ open, pageIndex })
        setZoomPct(100)
    }

    const scale = fitScale * (zoomPct / 100)

    const zoomIn = useCallback(() => setZoomPct((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP)), [])
    const zoomOut = useCallback(() => setZoomPct((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP)), [])
    const zoomFit = useCallback(() => setZoomPct(100), [])

    const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        setZoomPct((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z - e.deltaY * 0.4))))
    }, [])

    const goPrev = useCallback(() => setPageIndex((i) => Math.max(0, i - 1)), [])
    const goNext = useCallback(() => setPageIndex((i) => Math.min(items.length - 1, i + 1)), [items.length])

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "ArrowLeft") goPrev()
        else if (e.key === "ArrowRight") goNext()
        else if (e.key === "+" || e.key === "=") zoomIn()
        else if (e.key === "-") zoomOut()
        else if (e.key === "0") zoomFit()
    }, [goPrev, goNext, zoomIn, zoomOut, zoomFit])

    const handlePrint = useCallback(() => {
        if (items.length === 0) return
        // Impression réelle sur le papier pré-imprimé : overlay texte seul, en mm.
        // Le rendu écran (buildLettreScreenPreviewHTML) ne sert qu'à l'aperçu ci-dessous.
        const html = buildLettrePrintOverlayHTML(items, companyName)
        const iframe = printFrame.current
        if (!iframe) return
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (!doc) return
        doc.open()
        doc.write(html)
        doc.close()
        setTimeout(() => {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
        }, 300)
    }, [items, companyName])

    if (!current) return null

    const warnings = getEffetPrintWarnings(current)
    const isReady = warnings.length === 0
    const totalMontant = items.reduce((s, e) => s + parseFloat(e.montant || "0"), 0)
    const previewSrcDoc = buildLettreScreenPreviewHTML([current], companyName, showRepères)
    const zoomPctDisplay = Math.round(zoomPct)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="p-0 overflow-hidden [&>button]:hidden flex flex-col gap-0"
                style={{ width: "100vw", maxWidth: "100vw", height: "100vh", maxHeight: "100vh", borderRadius: "0.75rem" }}
            >
                <DialogTitle className="sr-only">
                    Aperçu — {items.length > 1 ? `${items.length} effets` : current.numero}
                </DialogTitle>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b bg-background shrink-0">
                    {/* Groupe gauche : navigation + identité de l'effet */}
                    <div className="flex items-center gap-3 text-sm min-w-0">
                        {items.length > 1 && (
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={pageIndex === 0}
                                    onClick={goPrev}
                                    title="Effet précédent (←)"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground tabular-nums w-14 text-center">
                                    {pageIndex + 1} / {items.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={pageIndex === items.length - 1}
                                    onClick={goNext}
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
                        {items.length > 1 && (
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
                            onClick={() => setShowRepères((v) => !v)}
                            title="Afficher les cases mesurées du pré-imprimé (calibration)"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Repères
                        </Button>

                        <Separator orientation="vertical" className="h-4 mx-1" />

                        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut} title="Zoom arrière (-)">
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-11 text-center text-xs tabular-nums select-none">{zoomPctDisplay}%</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn} title="Zoom avant (+)">
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomFit} title="Ajuster à l'écran (0)">
                                <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-4 mx-1" />

                        {items.length > 1 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs h-7"
                                onClick={() => removeFromBatch(current.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Retirer du lot
                            </Button>
                        )}
                        <Button variant="default" size="sm" className="gap-1.5 text-xs h-7" onClick={handlePrint}>
                            <Printer className="h-3.5 w-3.5" /> Imprimer {items.length > 1 ? `(${items.length})` : ""}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Corps : zone de calage (photo du pré-imprimé + données) + panneau récapitulatif */}
                <div className="flex-1 flex min-h-0">
                    <div
                        ref={stageRef}
                        className="flex-1 min-w-0 bg-neutral-200 overflow-auto outline-none"
                        onWheel={handleWheel}
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                    >
                        {/* Ce conteneur grandit avec son contenu (min-h/w-full = juste un minimum),
                            et la page est centrée dedans via margin:auto plutôt que
                            justify/items-center : avec overflow:auto, centrer via flex
                            items/justify-center rogne le début du contenu qui déborde
                            (bug CSS connu) — margin:auto reste scrollable jusqu'en haut/à
                            gauche même très zoomé. */}
                        <div className="min-h-full min-w-full flex box-border p-6">
                            <div
                                style={{
                                    width: BASE_WIDTH_PX * scale,
                                    height: BASE_HEIGHT_PX * scale,
                                    margin: "auto",
                                }}
                                className="shrink-0"
                            >
                                <iframe
                                    key={current.id}
                                    srcDoc={previewSrcDoc}
                                    style={{ width: BASE_WIDTH_PX, height: BASE_HEIGHT_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
                                    className="border-0 bg-white shadow-2xl"
                                    title={`Aperçu ${current.numero}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Panneau récapitulatif — vérifier les données sans dépendre du zoom */}
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

                        {items.length > 1 && (
                            <div className="mx-4 mb-4 rounded-md border p-3">
                                <div className="text-xs font-semibold mb-2">Lot ({items.length})</div>
                                <div className="flex flex-col gap-1">
                                    {items.map((e, i) => (
                                        <button
                                            key={e.id}
                                            onClick={() => setPageIndex(i)}
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
                </div>

                {/* Hidden print iframe (utilise buildLettrePrintOverlayHTML avec dimensions mm B5) */}
                <iframe ref={printFrame} className="hidden" title="print" />
            </DialogContent>
        </Dialog>
    )
}
