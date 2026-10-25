"use client";

import { create } from "zustand";
import type { BonCommandeStatus } from "@/lib/types";

interface BonsCommandeState {
    searchInput: string;
    searchQuery: string;
    statusFilter: BonCommandeStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: BonCommandeStatus | "ALL") => void;
    resetFilters: () => void;
}

export const useBonsCommandeStore = create<BonsCommandeState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL" }),
}));

// ─── Bon de Commande Form Store ────────────────────────────────────────────

export interface BCLineForm {
    id: string;
    productId: string | null;
    createProduct: boolean;
    description: string;
    quantite: string;
    prixHT: string;
    remise: string;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
    totalHT: string;
    typeSource: "PRODUCTION" | "STOCK";
}

export interface BCFormState {
    tiersId: string;
    tiersSearch: string;
    createClient: boolean;
    dateCreation: string;
    dateExpiration: string;
    referenceClient: string;
    notes: string;
    timbreFiscal: string;
    totalHT: string;
    totalTVA: string;
    totalTTC: string;
    productSearch: string;
    lines: BCLineForm[];

    setTiersId: (id: string) => void;
    setTiersSearch: (v: string) => void;
    setCreateClient: (v: boolean) => void;
    setDateCreation: (d: string) => void;
    setDateExpiration: (d: string) => void;
    setReferenceClient: (r: string) => void;
    setNotes: (n: string) => void;
    setTimbreFiscal: (v: string) => void;
    setTotalHT: (v: string) => void;
    setTotalTVA: (v: string) => void;
    setTotalTTC: (v: string) => void;
    setProductSearch: (v: string) => void;

    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, updates: Partial<BCLineForm>) => void;
    resetForm: () => void;
}

const defaultBCLine = (): BCLineForm => ({
    id: crypto.randomUUID(),
    productId: null,
    createProduct: false,
    description: "",
    quantite: "1",
    prixHT: "0",
    remise: "0",
    tauxTVA: "19",
    fodec: false,
    tauxFodec: "1",
    totalHT: "0",
    typeSource: "STOCK",
});

// ─── Scan Store ─────────────────────────────────────────────────────────────

type ScanStep = "idle" | "uploading" | "extracting" | "success" | "error";

// Exporté (lot H) : type consommateur de `extractBonCommandeFromScan`
// (`app/actions/bons-commande.ts`), qui déclare sa signature avec ce type.
export interface ExtractedData {
    clientName: string;
    referenceBC: string;
    dateDocument: string;
    notes: string;
    lines: Array<{
        id: string;
        productId: string | null;
        createProduct: boolean;
        description: string;
        quantite: string;
        prixHT: string;
        remise: string;
        tauxTVA: string;
        fodec: boolean;
        tauxFodec: string;
        totalHT: string;
        typeSource: "PRODUCTION" | "STOCK";
    }>;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
}

interface ScanBCState {
    step: ScanStep;
    extracted: ExtractedData | null;
    errorMsg: string;
    showManual: boolean;
    dragOver: boolean;
    formTiersId: string;
    formDate: string;
    formRef: string;
    formNotes: string;
    formRefClient: string;
    formDateExpiration: string;
    createClient: boolean;
    totalHT: string;
    totalTVA: string;
    totalTTC: string;
    timbreFiscal: string;

    setStep: (s: ScanStep) => void;
    setExtracted: (d: ExtractedData | null) => void;
    setErrorMsg: (m: string) => void;
    setShowManual: (v: boolean) => void;
    setDragOver: (v: boolean) => void;
    setFormTiersId: (id: string) => void;
    setFormDate: (d: string) => void;
    setFormRef: (r: string) => void;
    setFormNotes: (n: string) => void;
    setFormRefClient: (r: string) => void;
    setFormDateExpiration: (d: string) => void;
    setCreateClient: (v: boolean) => void;
    setTotalHT: (v: string) => void;
    setTotalTVA: (v: string) => void;
    setTotalTTC: (v: string) => void;
    setTimbreFiscal: (v: string) => void;
    resetScan: () => void;
}

export const useScanBCStore = create<ScanBCState>((set) => ({
    step: "idle",
    extracted: null,
    errorMsg: "",
    showManual: false,
    dragOver: false,
    formTiersId: "",
    formDate: new Date().toISOString().split("T")[0],
    formRef: "",
    formNotes: "",
    formRefClient: "",
    formDateExpiration: "",
    createClient: true,
    totalHT: "",
    totalTVA: "",
    totalTTC: "",
    timbreFiscal: "0",

    setStep: (s) => set({ step: s }),
    setExtracted: (d) =>
        set({
            extracted: d,
            totalHT: d ? String(d.totalHT ?? "") : "",
            totalTVA: d ? String(d.totalTVA ?? "") : "",
            totalTTC: d ? String(d.totalTTC ?? "") : "",
        }),
    setErrorMsg: (m) => set({ errorMsg: m }),
    setShowManual: (v) => set({ showManual: v }),
    setDragOver: (v) => set({ dragOver: v }),
    setFormTiersId: (id) => set({ formTiersId: id }),
    setFormDate: (d) => set({ formDate: d }),
    setFormRef: (r) => set({ formRef: r }),
    setFormNotes: (n) => set({ formNotes: n }),
    setFormRefClient: (r) => set({ formRefClient: r }),
    setFormDateExpiration: (d) => set({ formDateExpiration: d }),
    setCreateClient: (v) => set({ createClient: v }),
    setTotalHT: (v) => set({ totalHT: v }),
    setTotalTVA: (v) => set({ totalTVA: v }),
    setTotalTTC: (v) => set({ totalTTC: v }),
    setTimbreFiscal: (v) => set({ timbreFiscal: v }),
    resetScan: () =>
        set({
            step: "idle",
            extracted: null,
            errorMsg: "",
            showManual: false,
            dragOver: false,
            formTiersId: "",
            formDate: new Date().toISOString().split("T")[0],
            formRef: "",
            formNotes: "",
            formRefClient: "",
            formDateExpiration: "",
            createClient: true,
            totalHT: "",
            totalTVA: "",
            totalTTC: "",
            timbreFiscal: "0",
        }),
}));

// ─── Detail Store ───────────────────────────────────────────────────────────

interface BCDetailState {
    showValidation: boolean;
    setShowValidation: (v: boolean) => void;
}

export const useBCDetailStore = create<BCDetailState>((set) => ({
    showValidation: false,
    setShowValidation: (v) => set({ showValidation: v }),
}));

export const useBCFormStore = create<BCFormState>((set) => ({
    tiersId: "",
    tiersSearch: "",
    createClient: true,
    dateCreation: new Date().toISOString().split("T")[0],
    dateExpiration: "",
    referenceClient: "",
    notes: "",
    timbreFiscal: "0",
    totalHT: "",
    totalTVA: "",
    totalTTC: "",
    productSearch: "",
    lines: [defaultBCLine()],

    setTiersId: (id) => set({ tiersId: id }),
    setTiersSearch: (v) => set({ tiersSearch: v }),
    setCreateClient: (v) => set({ createClient: v }),
    setDateCreation: (d) => set({ dateCreation: d }),
    setDateExpiration: (d) => set({ dateExpiration: d }),
    setReferenceClient: (r) => set({ referenceClient: r }),
    setNotes: (n) => set({ notes: n }),
    setTimbreFiscal: (v) => set({ timbreFiscal: v }),
    setTotalHT: (v) => set({ totalHT: v }),
    setTotalTVA: (v) => set({ totalTVA: v }),
    setTotalTTC: (v) => set({ totalTTC: v }),
    setProductSearch: (v) => set({ productSearch: v }),

    addLine: () =>
        set((s) => ({ lines: [...s.lines, defaultBCLine()] })),

    removeLine: (id) =>
        set((s) => ({
            lines: s.lines.filter((l) => l.id !== id),
        })),

    updateLine: (id, updates) =>
        set((s) => ({
            lines: s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

    resetForm: () =>
        set({
            tiersId: "",
            tiersSearch: "",
            createClient: true,
            dateCreation: new Date().toISOString().split("T")[0],
            dateExpiration: "",
            referenceClient: "",
            notes: "",
            timbreFiscal: "0",
            totalHT: "",
            totalTVA: "",
            totalTTC: "",
            productSearch: "",
            lines: [defaultBCLine()],
        }),
}));
