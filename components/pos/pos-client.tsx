"use client";

import { useProducts } from "@/hooks/use-queries";
import { usePOSStore } from "@/lib/stores/pos-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTND } from "@/lib/decimal";
import { Search, ShoppingCart, Plus, Minus, Trash2, Package } from "lucide-react";

export function POSClient() {
    const { searchQuery, cart, setSearchQuery, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal } =
        usePOSStore();
    const { data, isLoading } = useProducts(searchQuery);
    const products = data?.products.filter((p) => p.actif) ?? [];

    const totals = getCartTotal();
    const cartCount = cart.reduce((acc, i) => acc + i.quantite, 0);

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Product Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un produit (nom, code, code-barres...)"
                            className="pl-8 h-8 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <ScrollArea className="flex-1 p-3">
                    {isLoading ? (
                        <div className="grid grid-cols-4 gap-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-36 rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-3">
                            {products.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="flex flex-col p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left group"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-2 group-hover:bg-background">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-semibold leading-tight truncate w-full">
                                        {product.nom}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {product.code}
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-bold">
                                            {formatTND(product.prixHT)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {product.stockActuel} {product.unite}
                                        </span>
                                    </div>
                                </button>
                            ))}
                            {products.length === 0 && (
                                <div className="col-span-4 flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Package className="h-10 w-10 mb-2" />
                                    <p className="text-sm">Aucun produit trouvé</p>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Cart */}
            <div className="w-72 flex flex-col border-l border-border bg-card">
                <div className="flex items-center gap-2 p-3 border-b border-border">
                    <ShoppingCart className="h-4 w-4" />
                    <h2 className="text-sm font-semibold">Ticket de Caisse</h2>
                    {cartCount > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            {cartCount} article{cartCount > 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground p-4">
                        <ShoppingCart className="h-10 w-10 opacity-30" />
                        <p className="text-sm">Panier vide</p>
                        <p className="text-xs text-center">Cliquez sur un produit pour l&apos;ajouter</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="rounded-lg border border-border p-2.5 bg-background"
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            <p className="text-xs font-medium leading-tight flex-1">
                                                {item.product.nom}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-red-500"
                                                onClick={() => removeFromCart(item.product.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={() =>
                                                        updateQuantity(item.product.id, item.quantite - 1)
                                                    }
                                                >
                                                    <Minus className="h-2.5 w-2.5" />
                                                </Button>
                                                <span className="text-xs w-6 text-center font-semibold">
                                                    {item.quantite}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={() =>
                                                        updateQuantity(item.product.id, item.quantite + 1)
                                                    }
                                                >
                                                    <Plus className="h-2.5 w-2.5" />
                                                </Button>
                                            </div>
                                            <span className="text-xs font-bold">
                                                {parseFloat(item.totalTTC).toFixed(3)} DT
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="border-t border-border p-3 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Total HT</span>
                                <span>{parseFloat(totals.totalHT).toFixed(3)} DT</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">TVA</span>
                                <span>{parseFloat(totals.totalTVA).toFixed(3)} DT</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-sm font-bold">
                                <span>Total TTC</span>
                                <span>{parseFloat(totals.totalTTC).toFixed(3)} DT</span>
                            </div>
                            <Button className="w-full h-8 text-sm mt-1">
                                Valider la vente
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={clearCart}
                            >
                                Vider le panier
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
