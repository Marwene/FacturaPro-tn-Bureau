"use client";

import { ArrowRight, BellRing, Hourglass, TriangleAlert } from "lucide-react";
import { useReducedMotion, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StockAlertBannerProps {
    ruptures: number;
    critiques: number;
    onGestionStock: () => void;
    className?: string;
}

export function StockAlertBanner({
    ruptures,
    critiques,
    onGestionStock,
    className,
}: StockAlertBannerProps) {
    const reduce = useReducedMotion();
    const total = ruptures + critiques;

    const description =
        ruptures > 0 && critiques > 0
            ? "Plusieurs produits en rupture ou en stock critique"
            : ruptures > 0
              ? `${ruptures} produit${ruptures > 1 ? "s" : ""} en rupture de stock`
              : `${critiques} produit${critiques > 1 ? "s" : ""} en stock critique`;

    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <Card className={cn("bg-card", className)}>
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <BellRing className="h-4 w-4" />
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                                {total}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Alertes de stock</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {ruptures > 0 && (
                            <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs">
                                <TriangleAlert className="h-3 w-3" />
                                {ruptures} en rupture
                            </Badge>
                        )}
                        {critiques > 0 && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-orange-300/60 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-700 dark:border-orange-900/60 dark:text-orange-300"
                            >
                                <Hourglass className="h-3 w-3" />
                                {critiques} en critique
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={onGestionStock}
                        >
                            Gérer
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}