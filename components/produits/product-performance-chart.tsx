"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatTND } from "@/lib/decimal";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { useProductStats } from "@/hooks/use-product-stats";

const chartConfig = {
    revenu: { label: "Revenu", color: "var(--chart-1)" },
    cout: { label: "Coût d'achat", color: "var(--chart-3)" },
    ventes: { label: "Ventes (unités)", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ProductPerformanceChart({ productId }: { productId: string }) {
    const { data, isLoading } = useProductStats(productId);

    if (isLoading) return <Skeleton className="h-80 rounded-xl" />;
    if (!data?.ventesMensuelles?.length) {
        return (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Aucune donnée de vente pour ce produit
            </div>
        );
    }

    const { stats, ventesMensuelles } = data;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Ventes totales" value={`${stats.totalVentes}`} unit="unités" />
                <StatCard label="Revenu" value={formatTND(stats.totalRevenu)} />
                <StatCard label="Marge" value={`${stats.marge}%`} />
                <StatCard label="Coût d'achat" value={formatTND(stats.totalCout)} />
            </div>
            <div>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <AreaChart data={ventesMensuelles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="fillRevenu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-revenu)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-revenu)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fillCout" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-cout)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="var(--color-cout)" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis
                            dataKey="mois"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent formatter={(value, name) => {
                                if (name === "revenu" || name === "cout") {
                                    return formatTND(String(value));
                                }
                                return value;
                            }} />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area
                            type="monotone"
                            dataKey="revenu"
                            stroke="var(--color-revenu)"
                            strokeWidth={2}
                            fill="url(#fillRevenu)"
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="cout"
                            stroke="var(--color-cout)"
                            strokeWidth={2}
                            fill="url(#fillCout)"
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
            <div>
                <ChartContainer config={chartConfig} className="h-16 w-full">
                    <BarChart data={ventesMensuelles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                        <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={4} tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Bar dataKey="ventes" fill="var(--color-ventes)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
    return (
        <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className="text-base font-bold tabular-nums">{value}</p>
            {unit && <p className="text-[10px] text-muted-foreground -mt-0.5">{unit}</p>}
        </div>
    );
}
