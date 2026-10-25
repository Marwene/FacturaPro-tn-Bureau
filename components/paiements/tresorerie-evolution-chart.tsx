"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useCompanyStore } from "@/lib/stores/company-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useTresorerieEvolution } from "@/hooks/use-tresorerie-evolution"
import { MoneyCell } from "@/components/shared/money-cell"
import { formatTNDShort } from "@/lib/decimal"

const FLUX_OPTIONS = [
    { value: "encaissement", label: "Entrées" },
    { value: "paiement", label: "Sorties" },
] as const

const MOIS_OPTIONS = [3, 6, 9, 12]

const chartConfig = {
    especes: { label: "Espèces", color: "var(--chart-2)" },
    virements: { label: "Virements", color: "var(--chart-3)" },
    cheques: { label: "Chèques", color: "var(--chart-4)" },
    effets: { label: "Effets", color: "var(--chart-5)" },
    cartes: { label: "Cartes", color: "var(--chart-1)" },
} satisfies ChartConfig

interface EvolutionTooltipProps {
    active?: boolean
    payload?: Array<{ dataKey: string; value: number; payload: { label: string } }>
}

function EvolutionTooltip({ active, payload }: EvolutionTooltipProps) {
    if (!active || !payload?.length) return null

    const rows = payload.filter((item) => item.value != null && item.value !== 0)
    const total = payload.reduce((acc, item) => acc + (Number(item.value) || 0), 0)

    return (
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold mb-1.5">{payload[0].payload.label}</p>
            <div className="grid gap-1">
                {rows.map((item) => {
                    const config = chartConfig[item.dataKey as keyof typeof chartConfig]
                    const color = config?.color ?? "var(--muted-foreground)"
                    return (
                        <div key={item.dataKey} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: color }} />
                                {config?.label ?? item.dataKey}
                            </span>
                            <span className="font-medium tabular-nums" style={{ color }}><MoneyCell value={item.value} /></span>
                        </div>
                    )
                })}
                <div className="flex items-center justify-between gap-6 border-t pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums text-primary"><MoneyCell value={total} /></span>
                </div>
            </div>
        </div>
    )
}

export function TresorerieEvolutionChart() {
    const [flux, setFlux] = useState<"encaissement" | "paiement">("encaissement")
    const [mois, setMois] = useState(3)
    const companyId = useCompanyStore((s) => s.selectedCompanyId)

    const { data, isLoading, isFetching } = useTresorerieEvolution(mois, flux, companyId)

    const months = data?.months ?? []
    const fluxLabel = flux === "encaissement" ? "Entrées" : "Sorties"

    return (
        <Card>
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5">
                    <CardTitle>Évolution des flux</CardTitle>
                    <CardDescription>
                        {fluxLabel} des {mois} derniers mois
                    </CardDescription>
                </div>
                <div className="relative flex items-center gap-2 px-2">
                    <ToggleGroup type="single" value={flux} onValueChange={(v) => v && setFlux(v as "encaissement" | "paiement")} variant="outline" className="*:data-[slot=toggle-group-item]:px-3! *:data-[slot=toggle-group-item]:text-xs">
                        {FLUX_OPTIONS.map((o) => (
                            <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
                        <SelectTrigger className="w-[140px] border-0 bg-transparent focus:ring-0 focus:bg-transparent">
                            <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {MOIS_OPTIONS.map((m) => (
                                <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                {isLoading && (
                    <div className="grid gap-4" aria-busy="true" aria-label="Chargement de l’évolution">
                        <Skeleton className="h-[250px] w-full rounded-xl" />
                        <div className="flex gap-4">
                            {FLUX_OPTIONS.map((o) => (
                                <Skeleton key={o.value} className="h-4 w-24 rounded-md" />
                            ))}
                        </div>
                    </div>
                )}
                {!isLoading && months.length === 0 && (
                    <Empty className="min-h-[250px] border-0 p-6">
                        <EmptyMedia variant="icon">
                            <TrendingUp />
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>Aucun flux sur la période</EmptyTitle>
                            <EmptyDescription>
                                Aucune écriture {fluxLabel.toLowerCase()} sur les {mois} derniers mois.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
                {!isLoading && months.length > 0 && (
                <div className={cn("transition-opacity", isFetching && "opacity-60")}>
                    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                        <AreaChart data={months}>
                            <defs>
                                <linearGradient id="fill-especes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-especes)" stopOpacity={0.75} />
                                    <stop offset="95%" stopColor="var(--color-especes)" stopOpacity={0.06} />
                                </linearGradient>
                                <linearGradient id="fill-virements" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-virements)" stopOpacity={0.75} />
                                    <stop offset="95%" stopColor="var(--color-virements)" stopOpacity={0.06} />
                                </linearGradient>
                                <linearGradient id="fill-cheques" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-cheques)" stopOpacity={0.75} />
                                    <stop offset="95%" stopColor="var(--color-cheques)" stopOpacity={0.06} />
                                </linearGradient>
                                <linearGradient id="fill-effets" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-effets)" stopOpacity={0.75} />
                                    <stop offset="95%" stopColor="var(--color-effets)" stopOpacity={0.06} />
                                </linearGradient>
                                <linearGradient id="fill-cartes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-cartes)" stopOpacity={0.75} />
                                    <stop offset="95%" stopColor="var(--color-cartes)" stopOpacity={0.06} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} className="fill-muted-foreground text-xs" />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatTNDShort} className="fill-muted-foreground text-xs" width={70} />
                            <ChartTooltip cursor={false} content={<EvolutionTooltip />} />
                            <Area type="monotone" dataKey="especes" stackId="1" stroke="var(--color-especes)" fill="url(#fill-especes)" />
                            <Area type="monotone" dataKey="virements" stackId="1" stroke="var(--color-virements)" fill="url(#fill-virements)" />
                            <Area type="monotone" dataKey="cheques" stackId="1" stroke="var(--color-cheques)" fill="url(#fill-cheques)" />
                            <Area type="monotone" dataKey="effets" stackId="1" stroke="var(--color-effets)" fill="url(#fill-effets)" />
                            <Area type="monotone" dataKey="cartes" stackId="1" stroke="var(--color-cartes)" fill="url(#fill-cartes)" />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                </div>
                )}
            </CardContent>
        </Card>
    )
}