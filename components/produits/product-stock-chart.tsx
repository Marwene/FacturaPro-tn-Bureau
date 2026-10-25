"use client";

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
    ChartContainer,
    type ChartConfig,
} from "@/components/ui/chart";

interface ProductStockChartProps {
    stockActuel: number;
    stockMinimum: number;
    unite: string;
    stockStatus: string;
}

export function ProductStockChart({ stockActuel, stockMinimum, unite, stockStatus }: ProductStockChartProps) {
    const isLow = stockStatus === "CRITIQUE" || stockStatus === "RUPTURE";
    const ratio = stockMinimum > 0 ? Math.min(1, stockActuel / stockMinimum) : stockActuel > 0 ? 1 : 0;
    const endAngle = 90 + (ratio * 270);
    const barColor = stockActuel === 0 ? "var(--chart-5)" : stockActuel <= stockMinimum ? "var(--chart-4)" : "var(--chart-2)";

    const chartConfig = {
        stock: { label: "Stock", color: barColor },
    } satisfies ChartConfig;

    const chartData = [{ name: "stock", stock: ratio * 100, fill: barColor }];

    return (
        <div className="flex flex-col items-center gap-3">
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square w-full max-w-[200px]"
            >
                <RadialBarChart
                    data={chartData}
                    startAngle={90}
                    endAngle={endAngle}
                    innerRadius={75}
                    outerRadius={110}
                    barSize={20}
                >
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                        <Label
                            content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) - 8}
                                                className="fill-foreground text-3xl font-black tabular-nums"
                                            >
                                                {stockActuel}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 16}
                                                className="fill-muted-foreground text-xs"
                                            >
                                                {Math.round(ratio * 100)}% / {unite}
                                            </tspan>
                                        </text>
                                    );
                                }
                            }}
                        />
                    </PolarRadiusAxis>
                    <RadialBar
                        dataKey="stock"
                        cornerRadius={10}
                        background={{ fill: "hsl(var(--muted))" }}
                    />
                </RadialBarChart>
            </ChartContainer>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Seuil min: <strong className="text-foreground">{stockMinimum}</strong></span>
                <span className="text-muted-foreground/40">|</span>
                <span>Statut: <strong className={isLow ? "text-chart-5" : "text-chart-2"}>{stockStatus}</strong></span>
            </div>

            {stockActuel === 0 && (
                <div className="w-full rounded-lg bg-chart-5/10 border border-chart-5/20 px-3 py-2 text-xs text-chart-5 font-medium text-center">
                    Produit en rupture de stock
                </div>
            )}
            {isLow && stockActuel > 0 && (
                <div className="w-full rounded-lg bg-chart-4/10 border border-chart-4/20 px-3 py-2 text-xs text-chart-4 font-medium text-center">
                    Stock critique — réapprovisionnement recommandé
                </div>
            )}
            {!isLow && stockActuel > 0 && (
                <div className="w-full rounded-lg bg-chart-2/10 border border-chart-2/20 px-3 py-2 text-xs text-chart-2 font-medium text-center">
                    Stock suffisant
                </div>
            )}
        </div>
    );
}
