"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatTND } from "@/lib/decimal"

const chartConfig = {
  ca: { label: "CA", color: "var(--primary)" },
  tva: { label: "TVA", color: "var(--primary)" },
  fodec: { label: "FODEC", color: "var(--chart-2)" },
  retenue: { label: "Retenue", color: "var(--chart-3)" },
} satisfies ChartConfig

type TimeRange = "6m" | "3m" | "30d"

export function ChartSection({
  monthlyData, timeRange, onTimeRangeChange,
}: {
  monthlyData: Record<string, string>[]
  timeRange: TimeRange
  onTimeRangeChange: (v: string) => void
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Chiffre d&apos;Affaires Mensuel</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Évolution sur les 6 derniers mois (TND)</span>
          <span className="@[540px]/card:hidden">6 derniers mois</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup type="single" value={timeRange} onValueChange={onTimeRangeChange} variant="outline" className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex">
            <ToggleGroupItem value="6m">6 mois</ToggleGroupItem>
            <ToggleGroupItem value="3m">3 mois</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 jours</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" size="sm" aria-label="Choisir une période">
              <SelectValue placeholder="6 mois" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="6m" className="rounded-lg">6 mois</SelectItem>
              <SelectItem value="3m" className="rounded-lg">3 mois</SelectItem>
              <SelectItem value="30d" className="rounded-lg">30 jours</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="fillCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ca)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-ca)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value) => formatTND(typeof value === "number" ? value : 0)} />} />
            <Area type="natural" dataKey="ca" fill="url(#fillCA)" stroke="var(--color-ca)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-ca)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--color-ca)", strokeWidth: 2, stroke: "var(--background)" }} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
