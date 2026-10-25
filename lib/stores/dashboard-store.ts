"use client";

import { create } from "zustand";

type DocType = "devis" | "bon-commande" | "bon-livraison" | "facture" | "avoir";

interface DashboardState {
    nouveauOpen: boolean;
    selectedDocType: DocType | null;
    setNouveauOpen: (v: boolean) => void;
    setSelectedDocType: (v: DocType | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    nouveauOpen: false,
    selectedDocType: null,
    setNouveauOpen: (v) => set({ nouveauOpen: v }),
    setSelectedDocType: (v) => set({ selectedDocType: v, ...(v ? {} : {}) }),
}));
