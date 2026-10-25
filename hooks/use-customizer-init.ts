"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useProduitDetail } from "@/hooks/use-produits";
import { useProductStore, type CustomizerProduct } from "@/lib/customizer/stores/product-store";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import {
    detectProductType,
    getDefaultView,
    getViewConfig,
} from "@/lib/customizer/mockups/product-mockups";
import type { DesignLayer } from "@/lib/customizer/types/product-customizer";
import type { SerializedDesignPersonnalise } from "@/lib/types";

/**
 * Init « à la volée » du studio : dérive le produit sélectionné (store
 * Zustand) dès que le détail produit est chargé. Ex-inline de
 * `components/customizer/customizer-studio.tsx` — clé
 * `["customizer-product-init", productId]`, `enabled` et `staleTime: 0`
 * identiques.
 */
export function useCustomizerProductInit(productId: string) {
    const { data: product } = useProduitDetail(productId);

    return useQuery({
        queryKey: queryKeys.customizer.productInit(productId),
        enabled: Boolean(product?.product),
        staleTime: 0,
        queryFn: async () => {
            const p = product?.product;
            if (!p) return null;
            const nextProduct: CustomizerProduct = {
                id: p.id,
                code: p.code,
                nom: p.nom,
                photoUrl: p.photoUrl,
                prixHT: Number(p.prixHT),
                categorie: p.categorieId
                    ? { id: p.categorieId, nom: p.categorieName ?? "" }
                    : null,
                tiersName: p.tiersName ?? null,
            };
            if (!useProductStore.getState().selectedProduct) {
                const nextType =
                    detectProductType(nextProduct.nom, nextProduct.categorie?.nom) ?? "t-shirt";
                const canvas = useCanvasStore.getState();
                if (!getViewConfig(nextType, canvas.currentView)) {
                    canvas.setCurrentView(getDefaultView(nextType));
                }
                useProductStore.getState().setSelectedProduct(nextProduct);
            }
            return nextProduct;
        },
    });
}

/**
 * Chargement d'un design existant dans le studio : hydrate le store des
 * couches. Ex-inline de `components/customizer/customizer-studio.tsx` — clé
 * `["customizer-design-init", designId]`, `enabled`, `staleTime: 0`,
 * `retry: false`, `refetchOnReconnect: false` et `placeholderData` identiques.
 */
export function useCustomizerDesignInit(designId?: string) {
    return useQuery({
        queryKey: queryKeys.customizer.designInit(designId),
        enabled: Boolean(designId),
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
        queryFn: async () => {
            if (!designId) return null;
            try {
                const res = await fetch(`/api/designs-personnalises/${designId}`);
                const body = (await res.json()) as { design?: SerializedDesignPersonnalise };
                if (!body.design) return null;
                const layers = body.design.layers;
                if (Array.isArray(layers)) {
                    useLayerStore.getState().setLayers(layers as DesignLayer[]);
                }
                return body.design;
            } catch {
                return null;
            }
        },
    });
}
