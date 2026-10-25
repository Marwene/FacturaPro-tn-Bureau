"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  tva: { label: "TVA", color: "var(--primary)" },
  fodec: { label: "FODEC", color: "var(--chart-2)" },
  retenue: { label: "Retenue", color: "var(--chart-3)" },
} satisfies ChartConfig

export function FiscalChartSection({ monthlyData }: { monthlyData: Record<string, string>[] }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Récapitulatif Fiscal</CardTitle>
        <CardDescription>TVA, FODEC et Retenues (TND)</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={monthlyData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v === "tva" ? "TVA" : v === "fodec" ? "FODEC" : "Retenue"} />
            <Bar dataKey="tva" fill="var(--color-tva)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="fodec" fill="var(--color-fodec)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="retenue" fill="var(--color-retenue)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
