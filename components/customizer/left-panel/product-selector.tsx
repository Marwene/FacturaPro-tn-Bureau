"use client";

import { useProductStore } from "@/lib/customizer/stores/product-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

interface ProductSelectorProps {
  onSelectProduct: () => void;
}

export function ProductSelector({ onSelectProduct }: ProductSelectorProps) {
  const selectedProduct = useProductStore((s) => s.selectedProduct);
  const selectedVariant = useProductStore((s) => s.selectedVariant);
  const selectedColor = useProductStore((s) => s.selectedColor);
  const selectedSize = useProductStore((s) => s.selectedSize);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Produit</Label>
        {selectedProduct ? (
          <div className="mt-1 flex items-center justify-between rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{selectedProduct.nom}</p>
                <p className="text-xs text-muted-foreground">{selectedProduct.code}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onSelectProduct}>
              Changer
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="mt-1 w-full" onClick={onSelectProduct}>
            <Package className="mr-2 h-4 w-4" />
            Sélectionner un produit
          </Button>
        )}
      </div>

      {selectedProduct && (
        <>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Variante</Label>
            <p className="mt-1 text-sm">{selectedVariant?.nom ?? "Par défaut"}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Couleur</Label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded-full border"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm">{selectedColor}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Taille</Label>
              <p className="mt-1 text-sm font-medium">{selectedSize}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
