"use client";

import { create } from "zustand";
import { SerializedProduct } from "@/lib/types";
import { calcFodec } from "@/lib/decimal";
import Big from "big.js";

interface CartItem {
    product: SerializedProduct;
    quantite: number;
    prixHT: string;
    totalHT: string;
    fodec: string;
    totalTTC: string;
}

interface POSState {
    searchQuery: string;
    cart: CartItem[];
    tiersId: string | null;

    setSearchQuery: (q: string) => void;
    setTiersId: (id: string | null) => void;
    addToCart: (product: SerializedProduct) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, qty: number) => void;
    clearCart: () => void;

    // Computed helpers (not state, but derived)
    getCartTotal: () => { totalHT: string; totalTVA: string; totalFodec: string; totalTTC: string };
}

function computeLineTotal(product: SerializedProduct, qty: number) {
    const prix = new Big(product.prixHT);
    const taux = new Big(product.tauxTVA).div(100);
    const totalHT = prix.times(qty);
    const totalTVA = totalHT.times(taux);
    const fodec = calcFodec(totalHT, product.fodec, product.tauxFodec);
    const totalTTC = totalHT.plus(totalTVA).plus(fodec);
    return {
        totalHT: totalHT.toFixed(3),
        fodec: fodec.toFixed(3),
        totalTTC: totalTTC.toFixed(3),
    };
}

export const usePOSStore = create<POSState>((set, get) => ({
    searchQuery: "",
    cart: [],
    tiersId: null,

    setSearchQuery: (q) => set({ searchQuery: q }),
    setTiersId: (id) => set({ tiersId: id }),

    addToCart: (product) =>
        set((s) => {
            const existing = s.cart.find((i) => i.product.id === product.id);
            const currentQty = existing?.quantite ?? 0;
            const requestedQty = currentQty + 1;

            // Stock validation
            const stockActuel = new Big(product.stockActuel);
            if (stockActuel.lt(requestedQty)) {
                throw new Error(
                    `Stock insuffisant pour "${product.nom}". Disponible: ${product.stockActuel}, Demandé: ${requestedQty}`
                );
            }

            if (existing) {
                const totals = computeLineTotal(product, requestedQty);
                return {
                    cart: s.cart.map((i) =>
                        i.product.id === product.id
                            ? { ...i, quantite: requestedQty, ...totals }
                            : i
                    ),
                };
            }
            const totals = computeLineTotal(product, 1);
            return {
                cart: [
                    ...s.cart,
                    {
                        product,
                        quantite: 1,
                        prixHT: product.prixHT,
                        ...totals,
                    },
                ],
            };
        }),

    removeFromCart: (productId) =>
        set((s) => ({ cart: s.cart.filter((i) => i.product.id !== productId) })),

    updateQuantity: (productId, qty) =>
        set((s) => {
            if (qty <= 0) {
                return { cart: s.cart.filter((i) => i.product.id !== productId) };
            }

            // Stock validation
            const item = s.cart.find((i) => i.product.id === productId);
            if (item) {
                const stockActuel = new Big(item.product.stockActuel);
                if (stockActuel.lt(qty)) {
                    throw new Error(
                        `Stock insuffisant pour "${item.product.nom}". Disponible: ${item.product.stockActuel}, Demandé: ${qty}`
                    );
                }
            }

            return {
                cart: s.cart.map((i) => {
                    if (i.product.id !== productId) return i;
                    const totals = computeLineTotal(i.product, qty);
                    return { ...i, quantite: qty, ...totals };
                }),
            };
        }),

    clearCart: () => set({ cart: [], tiersId: null }),

    getCartTotal: () => {
        const { cart } = get();
        let totalHT = new Big(0);
        let totalTVA = new Big(0);
        let totalFodec = new Big(0);
        for (const item of cart) {
            const ht = new Big(item.totalHT);
            const tva = ht.times(new Big(item.product.tauxTVA).div(100));
            const fodec = calcFodec(ht, item.product.fodec, item.product.tauxFodec);
            totalHT = totalHT.plus(ht);
            totalTVA = totalTVA.plus(tva);
            totalFodec = totalFodec.plus(fodec);
        }
        const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);
        return {
            totalHT: totalHT.toFixed(3),
            totalTVA: totalTVA.toFixed(3),
            totalFodec: totalFodec.toFixed(3),
            totalTTC: totalTTC.toFixed(3),
        };
    },
}));
