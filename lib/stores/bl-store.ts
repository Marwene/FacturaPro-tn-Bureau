"use client";

import { create } from "zustand";
import type { DeliveryNoteStatus } from "@/lib/types";

// ─── List Store ──────────────────────────────────────────────────────────────

interface BLListState {
    searchInput: string;
    searchQuery: string;
    statusFilter: DeliveryNoteStatus | "ALL";
    deleteTarget: string | null;
    converting: string | null;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: DeliveryNoteStatus | "ALL") => void;
    setDeleteTarget: (id: string | null) => void;
    setConverting: (id: string | null) => void;
}

export const useBLListStore = create<BLListState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    deleteTarget: null,
    converting: null,
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    setDeleteTarget: (id) => set({ deleteTarget: id }),
    setConverting: (id) => set({ converting: id }),
}));

// ─── Form Store ──────────────────────────────────────────────────────────────

interface BLLineForm {
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

interface BLFormState {
    tiersId: string;
    dateCreation: string;
    dateLivraison: string;
    notes: string;
    lines: BLLineForm[];
    // BL Visé Sous Douane
    blViseActif: boolean;
    snNumero: string;
    dateSN: string;
    poidsBrut: string;
    poidsNet: string;
    nbColis: string;
    devise: string;
    tauxChange: string;
    montantTND: string;

    setTiersId: (id: string) => void;
    setDateCreation: (d: string) => void;
    setDateLivraison: (d: string) => void;
    setNotes: (n: string) => void;
    setBlViseActif: (v: boolean) => void;
    setSnNumero: (v: string) => void;
    setDateSN: (v: string) => void;
    setPoidsBrut: (v: string) => void;
    setPoidsNet: (v: string) => void;
    setNbColis: (v: string) => void;
    setDevise: (v: string) => void;
    setTauxChange: (v: string) => void;
    setMontantTND: (v: string) => void;

    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, updates: Partial<BLLineForm>) => void;
    resetForm: () => void;
}

const defaultLine = (): BLLineForm => ({
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

export const useBLFormStore = create<BLFormState>((set) => ({
    tiersId: "",
    dateCreation: new Date().toISOString().split("T")[0],
    dateLivraison: "",
    notes: "",
    lines: [defaultLine()],
    blViseActif: false,
    snNumero: "",
    dateSN: "",
    poidsBrut: "",
    poidsNet: "",
    nbColis: "",
    devise: "TND",
    tauxChange: "",
    montantTND: "",

    setTiersId: (id) => set({ tiersId: id, blViseActif: false, snNumero: "", dateSN: "", poidsBrut: "", poidsNet: "", nbColis: "", tauxChange: "", montantTND: "" }),
    setDateCreation: (d) => set({ dateCreation: d }),
    setDateLivraison: (d) => set({ dateLivraison: d }),
    setNotes: (n) => set({ notes: n }),
    setBlViseActif: (v) => set({ blViseActif: v }),
    setSnNumero: (v) => set({ snNumero: v }),
    setDateSN: (v) => set({ dateSN: v }),
    setPoidsBrut: (v) => set({ poidsBrut: v }),
    setPoidsNet: (v) => set({ poidsNet: v }),
    setNbColis: (v) => set({ nbColis: v }),
    setDevise: (v) => set({ devise: v }),
    setTauxChange: (v) => set({ tauxChange: v }),
    setMontantTND: (v) => set({ montantTND: v }),

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
            dateLivraison: "",
            notes: "",
            lines: [defaultLine()],
            blViseActif: false,
            snNumero: "",
            dateSN: "",
            poidsBrut: "",
            poidsNet: "",
            nbColis: "",
            devise: "TND",
            tauxChange: "",
            montantTND: "",
        }),
}));