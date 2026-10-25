"use client";

import { create } from "zustand";
import type { QuoteStatus } from "@/lib/types";

// ─── List Store ──────────────────────────────────────────────────────────────

interface DevisListState {
    searchInput: string;
    searchQuery: string;
    statusFilter: QuoteStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: QuoteStatus | "ALL") => void;
}

export const useDevisListStore = create<DevisListState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
}));

// ─── Print Options Store ─────────────────────────────────────────────────────

interface PrintOptionsState {
    includeTaxBreakdown: boolean;
    includeNotes: boolean;
    useBrandedPrint: boolean;
    setTax: (v: boolean) => void;
    setNotes: (v: boolean) => void;
    setBranded: (v: boolean) => void;
    reset: () => void;
}

export const usePrintOptionsStore = create<PrintOptionsState>((set) => ({
    includeTaxBreakdown: true,
    includeNotes: true,
    useBrandedPrint: true,
    setTax: (v) => set({ includeTaxBreakdown: v }),
    setNotes: (v) => set({ includeNotes: v }),
    setBranded: (v) => set({ useBrandedPrint: v }),
    reset: () => set({ includeTaxBreakdown: true, includeNotes: true, useBrandedPrint: true }),
}));

// ─── Detail Store ────────────────────────────────────────────────────────────

interface DevisDetailState {
    previewOpen: boolean;
    setPreviewOpen: (v: boolean) => void;
}

export const useDevisDetailStore = create<DevisDetailState>((set) => ({
    previewOpen: false,
    setPreviewOpen: (v) => set({ previewOpen: v }),
}));

// ─── Form Store ──────────────────────────────────────────────────────────────

interface DevisLineForm {
    id: string;
    productId: string | null;
    variantId: string | null;
    description: string;
    quantite: string;
    prixHT: string;
    remise: string;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
    totalHT: string;
}

interface DevisFormState {
    tiersId: string;
    dateCreation: string;
    dateExpiration: string;
    notes: string;
    lines: DevisLineForm[];
    devise: string;
    tauxChange: string;
    montantTND: string;
    exonereTVA: boolean;

    setTiersId: (id: string) => void;
    setDateCreation: (d: string) => void;
    setDateExpiration: (d: string) => void;
    setNotes: (n: string) => void;
    setDevise: (v: string) => void;
    setTauxChange: (v: string) => void;
    setMontantTND: (v: string) => void;
    setExonereTVA: (v: boolean) => void;

    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, updates: Partial<DevisLineForm>) => void;
    resetForm: () => void;
}

const defaultLine = (): DevisLineForm => ({
    id: crypto.randomUUID(),
    productId: null,
    variantId: null,
    description: "",
    quantite: "1",
    prixHT: "0",
    remise: "0",
    tauxTVA: "19",
    fodec: false,
    tauxFodec: "1",
    totalHT: "0",
});

export const useDevisFormStore = create<DevisFormState>((set) => ({
    tiersId: "",
    dateCreation: new Date().toISOString().split("T")[0],
    dateExpiration: "",
    notes: "",
    lines: [defaultLine()],
    devise: "TND",
    tauxChange: "",
    montantTND: "",
    exonereTVA: false,

    setTiersId: (id) => set({ tiersId: id }),
    setDateCreation: (d) => set({ dateCreation: d }),
    setDateExpiration: (d) => set({ dateExpiration: d }),
    setNotes: (n) => set({ notes: n }),
    setDevise: (v) => set({ devise: v }),
    setTauxChange: (v) => set({ tauxChange: v }),
    setMontantTND: (v) => set({ montantTND: v }),
    setExonereTVA: (v) => set({ exonereTVA: v }),

    addLine: () =>
        set((s) => ({ lines: [...s.lines, defaultLine()] })),

    removeLine: (id) =>
        set((s) => ({
            lines: s.lines.filter((l) => l.id !== id),
        })),

    updateLine: (id, updates) =>
        set((s) => ({
            lines: s.lines.map((l) =>
                l.id === id ? { ...l, ...updates } : l
            ),
        })),

    resetForm: () =>
        set({
            tiersId: "",
            dateCreation: new Date().toISOString().split("T")[0],
            dateExpiration: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 10);
                return d.toISOString().split("T")[0];
            })(),
            notes: "",
            lines: [defaultLine()],
            devise: "TND",
            tauxChange: "",
            montantTND: "",
            exonereTVA: false,
        }),
}));
