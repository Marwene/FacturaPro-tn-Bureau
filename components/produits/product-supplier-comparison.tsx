"use client";

import { Trophy, TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatTND } from "@/lib/decimal";
import { useSupplierComparison } from "@/hooks/use-product-suppliers";

interface ProductSupplierComparisonProps {
  productId: string;
}

export function ProductSupplierComparison({ productId }: ProductSupplierComparisonProps) {
  const { data, isLoading, error } = useSupplierComparison(productId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Erreur lors du chargement
      </p>
    );
  }

  const { suppliers, stats } = data;

  if (suppliers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Aucun fournisseur à comparer
      </p>
    );
  }

  const bestPrice = stats.bestSupplier?.price ?? 0;
  const maxPrice = stats.maxPrice || 1;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Moyen</p>
          <p className="text-sm font-semibold tabular-nums">{formatTND(String(stats.avgPrice))}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Écart max</p>
          <p className="text-sm font-semibold tabular-nums">{formatTND(String(stats.priceRange))}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fournisseurs</p>
          <p className="text-sm font-semibold tabular-nums">{stats.count}</p>
        </div>
      </div>

      {/* Best price card */}
      {stats.bestSupplier && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
              Meilleur prix
            </p>
            <p className="text-sm font-semibold truncate">{stats.bestSupplier.name}</p>
          </div>
          <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300 shrink-0">
            {formatTND(String(stats.bestSupplier.price))}
          </p>
        </div>
      )}

      {/* Supplier list */}
      <div className="space-y-2">
        {suppliers.map((supplier) => {
          const fillPercent = bestPrice > 0
            ? Math.min((supplier.purchasePrice / maxPrice) * 100, 100)
            : 0;
          const isBest = supplier.priceVsBest === 0;
          const diffVsBest = supplier.priceVsBest;

          return (
            <div
              key={supplier.id}
              className="rounded-lg border bg-muted/30 p-2.5 space-y-2"
            >
              {/* Header: name + badges */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate min-w-0 flex-1">
                  {supplier.supplierName}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {isBest && (
                    <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                      <Trophy className="size-3" />
                      Meilleur
                    </Badge>
                  )}
                  {supplier.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Défaut</Badge>
                  )}
                </div>
              </div>

              {/* Progress bar + price */}
              <div className="flex items-center gap-2.5">
                <Progress value={fillPercent} className="h-1.5 flex-1" />
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {formatTND(String(supplier.purchasePrice))}
                </span>
              </div>

              {/* Price vs best */}
              {!isBest && (
                <div className="flex items-center gap-1 text-xs">
                  {diffVsBest > 0 ? (
                    <>
                      <TrendingUp className="size-3 text-destructive" />
                      <span className="text-destructive tabular-nums">
                        +{formatTND(String(diffVsBest))}
                      </span>
                      <span className="text-muted-foreground">vs meilleur</span>
                    </>
                  ) : diffVsBest < 0 ? (
                    <>
                      <TrendingDown className="size-3 text-emerald-600" />
                      <span className="text-emerald-600 tabular-nums">
                        {formatTND(String(diffVsBest))}
                      </span>
                      <span className="text-muted-foreground">vs meilleur</span>
                    </>
                  ) : (
                    <>
                      <Minus className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Identique au meilleur</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
