import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import type { InventaireData } from "@/hooks/use-inventaire"
import type { MouvementJour } from "@/lib/inventaire-logic"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

type Categorie = InventaireData["categories"][number]

const mouvementChartConfig = {
    entrees: { label: "Entrées", color: "var(--chart-1)" },
    sorties: { label: "Sorties", color: "var(--chart-5)" },
} satisfies ChartConfig

const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--primary)",
    "var(--muted-foreground)",
]

interface InventaireChartsProps {
    periode: number
    categories: Categorie[]
    chartData: MouvementJour[]
}

export function InventaireCharts({ periode, categories, chartData }: InventaireChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardTitle>Entrées vs Sorties</CardTitle>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">
                            Mouvements sur {periode} jours
                        </span>
                        <span className="@[540px]/card:hidden">{periode} jours</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <ChartContainer
                        config={mouvementChartConfig}
                        className="aspect-auto h-[250px] w-full"
                    >
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="jour"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                className="fill-muted-foreground text-xs"
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                className="fill-muted-foreground text-xs"
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent />}
                            />
                            <Bar
                                dataKey="entrees"
                                fill="var(--color-entrees)"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="sorties"
                                fill="var(--color-sorties)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardTitle>Répartition par Catégorie</CardTitle>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">
                            Distribution des produits
                        </span>
                        <span className="@[540px]/card:hidden">Catégories</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    {categories.length === 0 ? (
                        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                            Aucune catégorie
                        </div>
                    ) : (
                        <ChartContainer
                            config={Object.fromEntries(
                                categories.map((c, i) => [
                                    c.nom,
                                    {
                                        label: c.nom,
                                        color: PIE_COLORS[i % PIE_COLORS.length],
                                    },
                                ])
                            )}
                            className="aspect-auto h-[250px] w-full"
                        >
                            <PieChart>
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) =>
                                                `${value} produit${Number(value) > 1 ? "s" : ""}`
                                            }
                                        />
                                    }
                                />
                                <Pie
                                    data={categories}
                                    dataKey="count"
                                    nameKey="nom"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    strokeWidth={2}
                                    stroke="var(--background)"
                                >
                                    {categories.map((_, i) => (
                                        <Cell
                                            key={i}
                                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
