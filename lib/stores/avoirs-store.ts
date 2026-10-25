"use client";

import { create } from "zustand";
import type { AvoirStatus, AvoirType } from "@/lib/types";

// ─── List Store ──────────────────────────────────────────────────────────────

interface AvoirsState {
    searchInput: string;
    searchQuery: string;
    statusFilter: string;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: string) => void;
    resetFilters: () => void;
}

export const useAvoirsStore = create<AvoirsState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL" }),
}));

// ─── Avoir Form Store ────────────────────────────────────────────────────────

interface AvoirLineForm {
    id: string;
    productId: string | null;
    description: string;
    quantite: string;
    prixHT: string;
    remise: string;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
}

interface AvoirFormState {
    type: AvoirType;
    tiersId: string;
    invoiceId: string;
    dateEmission: string;
    motif: string;
    notes: string;
    lines: AvoirLineForm[];
    tiersSearch: string;
    invoiceSearch: string;
    productSearch: string;

    setType: (t: AvoirType) => void;
    setTiersId: (id: string) => void;
    setInvoiceId: (id: string) => void;
    setDateEmission: (d: string) => void;
    setMotif: (m: string) => void;
    setNotes: (n: string) => void;
    setTiersSearch: (v: string) => void;
    setInvoiceSearch: (v: string) => void;
    setProductSearch: (v: string) => void;
    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, data: Partial<AvoirLineForm>) => void;
    resetForm: () => void;
}

function createLine(id: string): AvoirLineForm {
    return {
        id,
        productId: null,
        description: "",
        quantite: "1",
        prixHT: "0",
        remise: "0",
        tauxTVA: "19",
        fodec: false,
        tauxFodec: "1",
    };
}

let lineCounter = 0;

const defaultForm: Omit<AvoirFormState, "setType" | "setTiersId" | "setInvoiceId" | "setDateEmission" | "setMotif" | "setNotes" | "setTiersSearch" | "setInvoiceSearch" | "setProductSearch" | "addLine" | "removeLine" | "updateLine" | "resetForm"> = {
    type: "SIMPLE",
    tiersId: "",
    invoiceId: "",
    dateEmission: new Date().toISOString().slice(0, 10),
    motif: "",
    notes: "",
    lines: [createLine("line_0")],
    tiersSearch: "",
    invoiceSearch: "",
    productSearch: "",
};

export const useAvoirFormStore = create<AvoirFormState>((set) => ({
    ...defaultForm,

    setType: (t) => set({ type: t, tiersId: "", invoiceId: "" }),
    setTiersId: (id) => set({ tiersId: id }),
    setInvoiceId: (id) => set({ invoiceId: id }),
    setDateEmission: (d) => set({ dateEmission: d }),
    setMotif: (m) => set({ motif: m }),
    setNotes: (n) => set({ notes: n }),
    setTiersSearch: (v) => set({ tiersSearch: v }),
    setInvoiceSearch: (v) => set({ invoiceSearch: v }),
    setProductSearch: (v) => set({ productSearch: v }),

    addLine: () => {
        lineCounter++;
        const id = `line_${lineCounter}`;
        set((s) => ({ lines: [...s.lines, createLine(id)] }));
    },

    removeLine: (id) => {
        set((s) => {
            if (s.lines.length <= 1) return s;
            return { lines: s.lines.filter((l) => l.id !== id) };
        });
    },

    updateLine: (id, data) => {
        set((s) => ({
            lines: s.lines.map((l) => (l.id === id ? { ...l, ...data } : l)),
        }));
    },

    resetForm: () => {
        lineCounter = 0;
        set({
            ...defaultForm,
            lines: [createLine("line_0")],
        });
    },
}));
