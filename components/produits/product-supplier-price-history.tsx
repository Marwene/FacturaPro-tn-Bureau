"use client";

import { formatTND } from "@/lib/decimal";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useSupplierPriceHistory } from "@/hooks/use-product-suppliers";

interface PriceHistoryProps {
  productId: string;
  supplierId: string;
}

export function ProductSupplierPriceHistory({
  productId,
  supplierId,
}: PriceHistoryProps) {
  const { data, isLoading } = useSupplierPriceHistory(productId, supplierId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Aucun historique de prix
      </p>
    );
  }

  const { history } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {history.length} modification{history.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {history.map((entry, index) => {
          const prevEntry = history[index + 1];
          const priceDiff = prevEntry
            ? entry.purchasePrice - prevEntry.purchasePrice
            : 0;
          const isFirst = index === 0;

          return (
            <div
              key={entry.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <History className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {formatTND(entry.purchasePrice)}
                    </span>
                    {isFirst && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        Actuel
                      </Badge>
                    )}
                    {!isFirst && priceDiff !== 0 && (
                      <Badge
                        variant={
                          priceDiff > 0 ? "destructive" : "default"
                        }
                        className="text-[10px] px-1.5 py-0 gap-0.5"
                      >
                        {priceDiff > 0 ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <TrendingDown className="size-2.5" />
                        )}
                        {priceDiff > 0 ? "+" : ""}
                        {formatTND(priceDiff)}
                      </Badge>
                    )}
                    {!isFirst && priceDiff === 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 gap-0.5"
                      >
                        <Minus className="size-2.5" />
                        Identique
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.changedAt).toLocaleDateString("fr-TN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.changedBy && ` · par ${entry.changedBy}`}
                    {entry.reason && ` · ${entry.reason}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
