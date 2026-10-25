"use client";

import { create } from "zustand";
import type { AchatStatus, AchatType, AchatCategorie } from "@/lib/types";

export const ACHAT_CATEGORIE_LABELS: Record<AchatCategorie, string> = {
    MATIERES_PREMIERES: "Matières premières",
    TENUES_TRAVAIL: "Tenues de travail",
    DIVERS: "Divers",
};

interface AchatsState {
    searchInput: string;
    searchQuery: string;
    statusFilter: AchatStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: AchatStatus | "ALL") => void;
    resetFilters: () => void;
}

export const useAchatsStore = create<AchatsState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL" }),
}));

// ─── Achat Form Store ──────────────────────────────────────────────────────────

export interface AchatLineForm {
    id: string;
    productId: string | null;
    createProduct: boolean;
    description: string;
    quantite: string;
    prixAchat: string;
    remise: string;
    tauxTVA: string;
    totalHT: string;
}

export interface AchatFormState {
    tiersId: string;
    createFournisseur: boolean;
    type: AchatType;
    dateFacture: string;
    dateEcheance: string;
    referenceFournisseur: string;
    timbreFiscal: string;
    totalHT: string;
    totalTVA: string;
    totalTTC: string;
    notes: string;
    categorieAchat: AchatCategorie | null;
    blAchatId: string | null;
    lines: AchatLineForm[];
    tiersSearch: string;
    productSearch: string;

    setTiersId: (id: string) => void;
    setCreateFournisseur: (v: boolean) => void;
    setType: (t: AchatType) => void;
    setDateFacture: (d: string) => void;
    setDateEcheance: (d: string) => void;
    setReferenceFournisseur: (r: string) => void;
    setTimbreFiscal: (v: string) => void;
    setTotalHT: (v: string) => void;
    setTotalTVA: (v: string) => void;
    setTotalTTC: (v: string) => void;
    setNotes: (n: string) => void;
    setCategorieAchat: (c: AchatCategorie | null) => void;
    setBlAchatId: (id: string | null) => void;
    setTiersSearch: (v: string) => void;
    setProductSearch: (v: string) => void;

    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, updates: Partial<AchatLineForm>) => void;
    resetForm: () => void;
}

const defaultLine = (): AchatLineForm => ({
    id: crypto.randomUUID(),
    productId: null,
    createProduct: true,
    description: "",
    quantite: "1",
    prixAchat: "0",
    remise: "0",
    tauxTVA: "19",
    totalHT: "0",
});

export const useAchatFormStore = create<AchatFormState>((set) => ({
    tiersId: "",
    createFournisseur: true,
    type: "FACTURE",
    dateFacture: new Date().toISOString().split("T")[0],
    dateEcheance: "",
    referenceFournisseur: "",
    timbreFiscal: "0",
    totalHT: "",
    totalTVA: "",
    totalTTC: "",
    notes: "",
    categorieAchat: null,
    blAchatId: null,
    lines: [defaultLine()],
    tiersSearch: "",
    productSearch: "",

    setTiersId: (id) => set({ tiersId: id }),
    setCreateFournisseur: (v) => set({ createFournisseur: v }),
    setType: (t) => set({ type: t }),
    setDateFacture: (d) => set({ dateFacture: d }),
    setDateEcheance: (d) => set({ dateEcheance: d }),
    setReferenceFournisseur: (r) => set({ referenceFournisseur: r }),
    setTimbreFiscal: (v) => set({ timbreFiscal: v }),
    setTotalHT: (v) => set({ totalHT: v }),
    setTotalTVA: (v) => set({ totalTVA: v }),
    setTotalTTC: (v) => set({ totalTTC: v }),
    setNotes: (n) => set({ notes: n }),
    setCategorieAchat: (c) => set({ categorieAchat: c }),
    setBlAchatId: (id) => set({ blAchatId: id }),
    setTiersSearch: (v) => set({ tiersSearch: v }),
    setProductSearch: (v) => set({ productSearch: v }),

    addLine: () =>
        set((s) => ({ lines: [...s.lines, defaultLine()] })),

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
            createFournisseur: true,
            type: "FACTURE",
            dateFacture: new Date().toISOString().split("T")[0],
            dateEcheance: "",
            referenceFournisseur: "",
            timbreFiscal: "0",
            totalHT: "",
            totalTVA: "",
            totalTTC: "",
            notes: "",
            categorieAchat: null,
            blAchatId: null,
            lines: [defaultLine()],
            tiersSearch: "",
            productSearch: "",
        }),
}));

// ─── Scan Store ─────────────────────────────────────────────────────────────

type ScanState = "idle" | "extracting" | "extracted" | "error" | "confirming";

// Exporté (lot H) : type consommateur de `extractAchatFromScan`
// (`app/actions/achats.ts`), qui déclare sa signature avec ce type.
export interface ExtractedData {
    fournisseur: {
        raisonSociale: string | null;
        matriculeFiscal: string | null;
        adresse: string | null;
        ville: string | null;
        telephone: string | null;
        email: string | null;
    };
    referenceFournisseur: string | null;
    dateFacture: string | null;
    dateEcheance: string | null;
    timbreFiscal: number | null;
    notes: string | null;
    lines: {
        description: string;
        quantite: number;
        prixAchat: number;
        remise: number;
        tauxTVA: number;
        productId?: string | null;
    }[];
    totalHT: number | null;
    totalTVA: number | null;
    totalTTC: number | null;
}

interface ScanAchatState {
    scanState: ScanState;
    errorMsg: string;
    extracted: ExtractedData | null;
    previewUrl: string | null;
    fileName: string;
    showManual: boolean;

    setScanState: (s: ScanState) => void;
    setErrorMsg: (m: string) => void;
    setExtracted: (d: ExtractedData | null) => void;
    setPreviewUrl: (u: string | null) => void;
    setFileName: (n: string) => void;
    setShowManual: (v: boolean) => void;
    resetScan: () => void;
}

export const useScanAchatStore = create<ScanAchatState>((set) => ({
    scanState: "idle",
    errorMsg: "",
    extracted: null,
    previewUrl: null,
    fileName: "",
    showManual: false,

    setScanState: (s) => set({ scanState: s }),
    setErrorMsg: (m) => set({ errorMsg: m }),
    setExtracted: (d) => set({ extracted: d }),
    setPreviewUrl: (u) => {
        const state = useScanAchatStore.getState();
        if (state.previewUrl && state.previewUrl !== u) {
            try { URL.revokeObjectURL(state.previewUrl); } catch {}
        }
        set({ previewUrl: u });
    },
    setFileName: (n) => set({ fileName: n }),
    setShowManual: (v) => set({ showManual: v }),
    resetScan: () =>
        set({
            scanState: "idle",
            errorMsg: "",
            extracted: null,
            previewUrl: null,
            fileName: "",
            showManual: false,
        }),
}));
