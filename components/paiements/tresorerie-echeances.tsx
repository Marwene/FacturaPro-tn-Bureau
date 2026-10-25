"use client"

import { useCallback, useMemo, useState } from "react"
import { useTresorerieEcheances } from "@/hooks/use-tresorerie-echeances"
import type { CompteFiltreTresorerie } from "@/hooks/use-tresorerie"
import { useCompanyStore } from "@/lib/stores/company-store"
import { endOfWeek, isAfter, isBefore, isSameDay, startOfDay, addDays, format } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertTriangle, CalendarDays } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { DataTable } from "@/components/data-table"
import { MoneyCell } from "@/components/shared/money-cell"
import { FLUX_ENTREE_COLOR, FLUX_SORTIE_COLOR } from "@/components/shared/flux-colors"
import { echeancesColumns, echeancesFacetedFilters } from "@/components/paiements/tresorerie-echeances-columns"
import { CalendrierEcheances, type PeriodeEcheances } from "@/components/paiements/tresorerie-echeances-calendar"
import { HORIZONS_JOURS } from "@/components/paiements/tresorerie-projection"
import { statutFluxAffiche } from "@/lib/tresorerie/presentation"
import { cn } from "@/lib/utils"
import type { TresorerieEcheancierLigne } from "@/lib/types/tresorerie"

interface TresorerieEcheancesProps {
    echeancier: TresorerieEcheancierLigne[]
    enRetard: string
    compte: CompteFiltreTresorerie
}

type OngletEcheances = "all" | "traite" | "cheque" | "retard"

const estEnRetard = (ligne: TresorerieEcheancierLigne): boolean =>
    new Date(ligne.date).getTime() < startOfDay(new Date()).getTime() && statutFluxAffiche(ligne.status) === "prevu"

export function TresorerieEcheances({ echeancier: propEcheancier, enRetard, compte }: TresorerieEcheancesProps) {
    const [horizon, setHorizon] = useState(365)
    const [periode, setPeriode] = useState<PeriodeEcheances>("all")
    const [jourSelectionne, setJourSelectionne] = useState<Date | undefined>(undefined)
    const [moisAffiche, setMoisAffiche] = useState<Date>(new Date())
    const [onglet, setOnglet] = useState<OngletEcheances>("all")
    const [search, setSearch] = useState("")

    const today = startOfDay(new Date())
    const companyId = useCompanyStore((s) => s.selectedCompanyId)
    const { data: fullData } = useTresorerieEcheances(compte, companyId)
    const allEcheances = fullData?.echeancier ?? propEcheancier

    const horizonFiltered = useMemo(() => {
        const cutoff = addDays(today, horizon)
        return allEcheances.filter((e) => {
            const d = new Date(e.date)
            return d >= today && d <= cutoff
        })
    }, [allEcheances, horizon, today])

    const { entreeDays, sortieDays } = useMemo(() => {
        const entree: Date[] = []
        const sortie: Date[] = []
        for (const item of horizonFiltered) {
            const d = new Date(item.date)
            if (item.flux === "entree") entree.push(d)
            else sortie.push(d)
        }
        return { entreeDays: entree, sortieDays: sortie }
    }, [horizonFiltered])

    const filteredItems = useMemo(() => {
        if (jourSelectionne) return horizonFiltered.filter((e) => isSameDay(new Date(e.date), jourSelectionne))
        if (periode === "today") return horizonFiltered.filter((e) => isSameDay(new Date(e.date), today))
        if (periode === "week") {
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
            return horizonFiltered.filter((e) => {
                const d = new Date(e.date)
                return (isAfter(d, today) || isSameDay(d, today)) && isBefore(d, weekEnd)
            })
        }
        return horizonFiltered
    }, [horizonFiltered, periode, jourSelectionne, today])

    const retardItems = useMemo(() => {
        const base = jourSelectionne
            ? allEcheances.filter((e) => isSameDay(new Date(e.date), jourSelectionne))
            : allEcheances
        return base.filter(estEnRetard)
    }, [allEcheances, jourSelectionne])

    const tabFilteredItems = useMemo(() => {
        if (onglet === "retard") return retardItems
        if (onglet === "traite") return filteredItems.filter((e) => e.source === "effet")
        if (onglet === "cheque") return filteredItems.filter((e) => e.source === "cheque")
        return filteredItems
    }, [filteredItems, retardItems, onglet])

    const tabCounts = useMemo(() => ({
        all: filteredItems.length,
        traite: filteredItems.filter((e) => e.source === "effet").length,
        cheque: filteredItems.filter((e) => e.source === "cheque").length,
        retard: retardItems.length,
    }), [filteredItems, retardItems])

    const filteredEntrees = tabFilteredItems.filter((e) => e.flux === "entree").reduce((s, e) => s + e.montant, 0)
    const filteredSorties = tabFilteredItems.filter((e) => e.flux === "sortie").reduce((s, e) => s + e.montant, 0)
    const horizonEntrees = horizonFiltered.filter((e) => e.flux === "entree").reduce((s, e) => s + e.montant, 0)
    const horizonSorties = horizonFiltered.filter((e) => e.flux === "sortie").reduce((s, e) => s + e.montant, 0)
    const entreeCount = horizonFiltered.filter((e) => e.flux === "entree").length
    const sortieCount = horizonFiltered.filter((e) => e.flux === "sortie").length

    const handleDaySelect = useCallback((date: Date | undefined) => {
        setJourSelectionne(date ?? undefined)
        if (date) setMoisAffiche(date)
    }, [])

    if (allEcheances.length === 0) {
        return (
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Échéances</span>
                </div>
                <Empty className="min-h-40">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                        <EmptyTitle>Aucune échéance</EmptyTitle>
                        <EmptyDescription>Aucune échéance à venir sur la période chargée.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Échéances</span>
                </div>
                <div className="flex items-center gap-3">
                    {horizonFiltered.length > 0 && (
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {entreeCount} entrées (<MoneyCell value={horizonEntrees} />)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {sortieCount} sorties (<MoneyCell value={horizonSorties} />)
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        {HORIZONS_JOURS.map((h) => (
                            <button
                                key={h}
                                onClick={() => setHorizon(h)}
                                className={cn(
                                    "rounded-md px-2 py-1 font-mono text-[10px] transition-colors",
                                    horizon === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                                )}
                            >
                                {h}j
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
                <CalendrierEcheances
                    periode={periode}
                    onPeriodeChange={(p) => { setPeriode(p); setJourSelectionne(undefined) }}
                    jourSelectionne={jourSelectionne}
                    onJourChange={handleDaySelect}
                    moisAffiche={moisAffiche}
                    onMoisChange={setMoisAffiche}
                    joursEntree={entreeDays}
                    joursSortie={sortieDays}
                />

                <div className="min-h-0">
                    <Tabs value={onglet} onValueChange={(v) => setOnglet(v as OngletEcheances)} className="mb-3">
                        <TabsList>
                            <TabsTrigger value="all" className="text-xs">Tout <span className="ml-1 text-muted-foreground">({tabCounts.all})</span></TabsTrigger>
                            <TabsTrigger value="traite" className="text-xs">Traites <span className="ml-1 text-muted-foreground">({tabCounts.traite})</span></TabsTrigger>
                            <TabsTrigger value="cheque" className="text-xs">Chèques <span className="ml-1 text-muted-foreground">({tabCounts.cheque})</span></TabsTrigger>
                            <TabsTrigger value="retard" className="text-xs">
                                En retard <span className="ml-1 text-muted-foreground">({tabCounts.retard})</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {onglet === "retard" && (
                        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Échéances échues
                            </span>
                            <MoneyCell value={enRetard} className="font-semibold tabular-nums text-amber-700 dark:text-amber-400" />
                            <span className="text-muted-foreground">{tabCounts.retard} détail{tabCounts.retard > 1 ? "s" : ""} affichable{tabCounts.retard > 1 ? "s" : ""}</span>
                        </div>
                    )}

                    {tabFilteredItems.length > 0 && onglet !== "retard" && (
                        <div className="mb-3 flex items-center gap-4 px-1">
                            <span className="text-[10px] text-muted-foreground">
                                {jourSelectionne
                                    ? format(jourSelectionne, "d MMMM yyyy", { locale: fr })
                                    : periode === "today" ? "Aujourd'hui"
                                        : periode === "week" ? "Cette semaine"
                                            : `Prochains ${horizon} jours`}
                            </span>
                            {filteredEntrees > 0 && (
                                <span className={cn("text-[11px] font-medium", FLUX_ENTREE_COLOR)}>+<MoneyCell value={filteredEntrees} /></span>
                            )}
                            {filteredSorties > 0 && (
                                <span className={cn("text-[11px] font-medium", FLUX_SORTIE_COLOR)}>−<MoneyCell value={filteredSorties} /></span>
                            )}
                            <span className={cn(
                                "ml-auto text-[11px] font-bold",
                                filteredEntrees - filteredSorties >= 0 ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR,
                            )}>
                                Solde: <MoneyCell value={filteredEntrees - filteredSorties} />
                            </span>
                        </div>
                    )}

                    <DataTable
                        columns={echeancesColumns}
                        data={tabFilteredItems}
                        searchValue={search}
                        onSearchChange={setSearch}
                        searchPlaceholder="Rechercher par numéro, tiers..."
                        facetedFilters={echeancesFacetedFilters}
                        pageSize={15}
                        pageSizeOptions={[10, 15, 20, 50]}
                        enableMultiSort
                        emptyMessage={onglet === "retard" ? "Aucune échéance détaillée en retard" : "Aucune échéance pour cette période"}
                    />
                </div>
            </div>

            <Separator className="mt-6" />
        </div>
    )
}
