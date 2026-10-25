import { BarChart3, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { MoneyCell } from "@/components/shared/money-cell"
import { FLUX_ENTREE_COLOR, FLUX_SORTIE_COLOR } from "@/components/shared/flux-colors"
import { formatTND, formatTNDShort } from "@/lib/decimal"
import { cn } from "@/lib/utils"
import type { TresorerieProjectionSemaine } from "@/lib/types/tresorerie"

interface TresorerieProjectionProps {
    projection: TresorerieProjectionSemaine[]
    soldeActuel: string
    days: number
    onDaysChange: (days: number) => void
}

/** Horizons de trésorerie partagés : projection (graphiques) et échéancier (filtre « J »). */
export const HORIZONS_JOURS = [30, 60, 90, 120, 365]

const chartConfig = {
    entree: { label: "Entrées", color: "var(--chart-2)" },
    sortie: { label: "Sorties", color: "var(--chart-1)" },
    soldeEstime: { label: "Solde estimé", color: "var(--primary)" },
} satisfies ChartConfig

interface ProjectionTooltipProps {
    active?: boolean
    payload?: Array<{ payload: TresorerieProjectionSemaine }>
}

function ProjectionTooltip({ active, payload }: ProjectionTooltipProps) {
    if (!active || !payload?.length) return null

    const d = payload[0].payload
    const debut = new Date(d.debut)
    const fin = new Date(debut)
    fin.setDate(fin.getDate() + 6)
    const variation = d.entree - d.sortie
    const periode = `${debut.toLocaleDateString("fr-TN", { day: "numeric", month: "long" })} → ${fin.toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}`

    return (
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold">Semaine {d.semaine}</p>
            <p className="text-[10px] text-muted-foreground mb-1.5">{periode}</p>
            <div className="grid gap-1">
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-[2px] bg-emerald-500" />
                        Entrées
                    </span>
                    <span className={cn("font-medium tabular-nums", FLUX_ENTREE_COLOR)}><MoneyCell value={d.entree} /></span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-[2px] bg-rose-500" />
                        Sorties
                    </span>
                    <span className={cn("font-medium tabular-nums", FLUX_SORTIE_COLOR)}><MoneyCell value={d.sortie} /></span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-[2px] bg-muted-foreground" />
                        Variation nette
                    </span>
                    <span className={cn("font-medium tabular-nums", variation >= 0 ? FLUX_ENTREE_COLOR : FLUX_SORTIE_COLOR)}><MoneyCell value={variation} /></span>
                </div>
                <div className="flex items-center justify-between gap-6 pt-1.5 mt-1.5 border-t">
                    <span className="text-muted-foreground">Solde estimé</span>
                    <span className="font-bold tabular-nums text-primary"><MoneyCell value={d.soldeEstime} /></span>
                </div>
            </div>
        </div>
    )
}

const projectionFallback = (soldeActuel: string): TresorerieProjectionSemaine[] => [
    { semaine: "S1", debut: new Date().toISOString(), entree: 0, sortie: 0, soldeEstime: Number.parseFloat(soldeActuel) || 0 },
]

export function TresorerieProjection({ projection, soldeActuel, days, onDaysChange }: TresorerieProjectionProps) {
    const data = projection.length > 0 ? projection : projectionFallback(soldeActuel)

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b px-5 py-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Projection du solde
                    </span>
                    <div className="hidden md:block">
                        <ToggleGroup type="single" value={String(days)} onValueChange={(v) => v && onDaysChange(Number(v))} variant="outline" className="*:data-[slot=toggle-group-item]:px-3! *:data-[slot=toggle-group-item]:text-xs">
                            {HORIZONS_JOURS.map((h) => (
                                <ToggleGroupItem key={h} value={String(h)}>{h}j</ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                    <div className="md:hidden">
                        <Select value={String(days)} onValueChange={(v) => onDaysChange(Number(v))}>
                            <SelectTrigger className="h-8 text-xs w-24" aria-label="Horizon de projection">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {HORIZONS_JOURS.map((h) => (
                                    <SelectItem key={h} value={String(h)} className="text-xs">{h} jours</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="p-4">
                    <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="fillSolde" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-soldeEstime)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--color-soldeEstime)" stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="semaine" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" tickFormatter={(v: number) => formatTNDShort(v)} width={70} />
                            <ChartTooltip cursor={false} content={<ProjectionTooltip />} />
                            <Area type="monotone" dataKey="soldeEstime" fill="url(#fillSolde)" stroke="var(--color-soldeEstime)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-soldeEstime)", strokeWidth: 0 }} activeDot={{ r: 6, fill: "var(--color-soldeEstime)", strokeWidth: 2, stroke: "var(--background)" }} />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b px-5 py-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Flux hebdomadaires
                </div>
                <div className="p-4">
                    <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                        <BarChart data={data} barGap={0} barCategoryGap="20%">
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="semaine" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" tickFormatter={(v: number) => formatTNDShort(v)} width={70} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value) => formatTND(Number(value))} />} />
                            <Bar dataKey="entree" fill="var(--color-entree)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="sortie" fill="var(--color-sortie)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ChartContainer>
                </div>
            </div>
        </div>
    )
}
