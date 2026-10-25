"use client";

import { create } from "zustand";
import type { SortingState } from "@tanstack/react-table";

interface ProduitsListState {
    searchInput: string;
    searchQuery: string;
    categorieFilter: string;
    stockStatusFilter: string;
    prixMinFilter: string;
    prixMaxFilter: string;
    supplierFilter: string;
    nouveauOpen: boolean;
    sorting: SortingState;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setCategorieFilter: (c: string) => void;
    setStockStatusFilter: (s: string) => void;
    setPrixMinFilter: (p: string) => void;
    setPrixMaxFilter: (p: string) => void;
    setSupplierFilter: (s: string) => void;
    setNouveauOpen: (v: boolean) => void;
    setSorting: (s: SortingState) => void;
}

export const useProduitsStore = create<ProduitsListState>((set) => ({
    searchInput: "",
    searchQuery: "",
    categorieFilter: "ALL",
    stockStatusFilter: "ALL",
    prixMinFilter: "",
    prixMaxFilter: "",
    supplierFilter: "ALL",
    nouveauOpen: false,
    sorting: [],
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setCategorieFilter: (c) => set({ categorieFilter: c }),
    setStockStatusFilter: (s) => set({ stockStatusFilter: s }),
    setPrixMinFilter: (p) => set({ prixMinFilter: p }),
    setPrixMaxFilter: (p) => set({ prixMaxFilter: p }),
    setSupplierFilter: (s) => set({ supplierFilter: s }),
    setNouveauOpen: (v) => set({ nouveauOpen: v }),
    setSorting: (s) => set({ sorting: s }),
}));
