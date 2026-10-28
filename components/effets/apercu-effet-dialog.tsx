"use client"

import { useRef, useCallback, useState, useMemo, useLayoutEffect, type WheelEvent, type KeyboardEvent } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SerializedEffet } from "@/lib/types"
import {
    buildLettreScreenPreviewHTML,
    buildLettrePrintOverlayHTML,
    getEffetPrintWarnings,
} from "./lettre-de-change"
import {
    BASE_WIDTH_PX,
    BASE_HEIGHT_PX,
    buildInitialBatch,
    computeFitScale,
    pageIndexAfterRemove,
    previewScale,
    stepZoomIn,
    stepZoomOut,
    sumMontant,
    zoomFromWheelDelta,
} from "./apercu-effet-logic"
import { ApercuEffetRecapPanel, ApercuEffetToolbar } from "./apercu-effet-sections"

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
    const initialBatch = useMemo(
        () => buildInitialBatch(effetsProp, effet, splitEffets),
        [effetsProp, effet, splitEffets],
    )

    const items = batch ?? initialBatch
    const current = items[Math.min(pageIndex, items.length - 1)]

    const removeFromBatch = (id: string) => {
        const next = items.filter((e) => e.id !== id)
        setBatch(next)
        const nextIndex = pageIndexAfterRemove(pageIndex, next.length)
        if (nextIndex !== pageIndex) setPageIndex(nextIndex)
    }

    // Recalcule l'échelle "ajustée" (fit-to-screen) à l'ouverture et au
    // redimensionnement de la fenêtre / du panneau latéral.
    // Justification useEffect : non applicable — ResizeObserver est un système
    // externe non réactif ; useLayoutEffect permet de mesurer avant peinture.
    useLayoutEffect(() => {
        const el = stageRef.current
        if (!el || !open) return
        const compute = () => {
            const availW = el.clientWidth - 48
            const availH = el.clientHeight - 48
            setFitScale(computeFitScale(availW, availH))
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

    const scale = previewScale(fitScale, zoomPct)

    const zoomIn = useCallback(() => setZoomPct(stepZoomIn), [])
    const zoomOut = useCallback(() => setZoomPct(stepZoomOut), [])
    const zoomFit = useCallback(() => setZoomPct(100), [])

    const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        setZoomPct((z) => zoomFromWheelDelta(z, e.deltaY))
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
    const totalMontant = sumMontant(items)
    const previewSrcDoc = buildLettreScreenPreviewHTML([current], companyName, showRepères)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="p-0 overflow-hidden [&>button]:hidden flex flex-col gap-0"
                style={{ width: "100vw", maxWidth: "100vw", height: "100vh", maxHeight: "100vh", borderRadius: "0.75rem" }}
            >
                <DialogTitle className="sr-only">
                    Aperçu — {items.length > 1 ? `${items.length} effets` : current.numero}
                </DialogTitle>

                <ApercuEffetToolbar
                    current={current}
                    itemsCount={items.length}
                    pageIndex={pageIndex}
                    totalMontant={totalMontant}
                    warnings={warnings}
                    showRepères={showRepères}
                    zoomPct={zoomPct}
                    onPrev={goPrev}
                    onNext={goNext}
                    onToggleRepères={() => setShowRepères((v) => !v)}
                    onZoomOut={zoomOut}
                    onZoomIn={zoomIn}
                    onZoomFit={zoomFit}
                    onRemoveCurrent={() => removeFromBatch(current.id)}
                    onPrint={handlePrint}
                    onClose={() => onOpenChange(false)}
                />

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

                    <ApercuEffetRecapPanel
                        current={current}
                        companyName={companyName}
                        warnings={warnings}
                        items={items}
                        pageIndex={pageIndex}
                        onSelectPage={setPageIndex}
                    />
                </div>

                {/* Hidden print iframe (utilise buildLettrePrintOverlayHTML avec dimensions mm B5) */}
                <iframe ref={printFrame} className="hidden" title="print" />
            </DialogContent>
        </Dialog>
    )
}
