"use client";

import { create } from "zustand";
import { type ExportLineForm, type BLWithVisé } from "./export-store-shared";

interface ExportCreateFormState {
    tiersId: string;
    dateCreation: string;
    decVente: string;
    dateDecVente: string;
    simultanee: string;
    dateSimultanee: string;
    notes: string;
    lines: ExportLineForm[];
    selectedBlId: string;
    selectedBl: BLWithVisé | null;
    setTiersId: (id: string) => void;
    setDateCreation: (d: string) => void;
    setDecVente: (v: string) => void;
    setDateDecVente: (v: string) => void;
    setSimultanee: (v: string) => void;
    setDateSimultanee: (v: string) => void;
    setNotes: (v: string) => void;
    setSelectedBlId: (id: string) => void;
    selectBl: (bl: BLWithVisé | null) => void;
    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, field: keyof ExportLineForm, value: string) => void;
    reset: () => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const useExportCreateFormStore = create<ExportCreateFormState>((set, get) => ({
    tiersId: "",
    dateCreation: today(),
    decVente: "",
    dateDecVente: "",
    simultanee: "",
    dateSimultanee: "",
    notes: "",
    lines: [],
    selectedBlId: "",
    selectedBl: null,

    setTiersId: (id) => set({ tiersId: id, selectedBlId: "", lines: [], selectedBl: null }),
    setDateCreation: (d) => set({ dateCreation: d }),
    setDecVente: (v) => set({ decVente: v }),
    setDateDecVente: (v) => set({ dateDecVente: v }),
    setSimultanee: (v) => set({ simultanee: v }),
    setDateSimultanee: (v) => set({ dateSimultanee: v }),
    setNotes: (v) => set({ notes: v }),
    setSelectedBlId: (id) => set({ selectedBlId: id }),

    selectBl: (bl) => {
        if (!bl || !Array.isArray(bl.lines)) {
            set({ selectedBl: null, selectedBlId: "", lines: [], decVente: "", dateDecVente: "" });
            return;
        }
        const blDate = bl.dateCreation?.split("T")[0] ?? "";
        const invoice = bl.invoice;
        const invoiceId = invoice?.id ?? null;
        const invoiceNumero = invoice?.numero ?? "";
        const invoiceDate = invoice?.dateEmission?.split("T")[0] ?? "";
        set({
            selectedBl: bl,
            selectedBlId: bl.id,
            decVente: bl.snNumero ?? "",
            dateDecVente: blDate,
            lines: bl.lines.map((l) => ({
                id: crypto.randomUUID(),
                ngpCodeId: "",
                ngpCode: "",
                barcode: "",
                snNumero: bl.snNumero ?? "",
                quantite: l.quantite,
                quantiteBL: l.quantite,
                resteQuantite: "0",
                bonLivraisonId: bl.id,
                bonLivraisonNumero: bl.numero,
                dateBL: blDate,
                invoiceId,
                invoiceNumero,
                dateFact: invoiceDate,
            })),
        });
    },

    addLine: () => {
        const { selectedBl } = get();
        if (!selectedBl) return;
        const blDate = selectedBl.dateCreation?.split("T")[0] ?? "";
        const invoiceDate = selectedBl.invoice?.dateEmission?.split("T")[0] ?? "";
        set((s) => ({
            lines: [...s.lines, {
                id: crypto.randomUUID(),
                ngpCodeId: "",
                ngpCode: "",
                barcode: "",
                snNumero: selectedBl.snNumero ?? "",
                quantite: "",
                quantiteBL: "",
                resteQuantite: "",
                bonLivraisonId: selectedBl.id,
                bonLivraisonNumero: selectedBl.numero,
                dateBL: blDate,
                invoiceId: selectedBl.invoice?.id ?? null,
                invoiceNumero: selectedBl.invoice?.numero ?? "",
                dateFact: invoiceDate,
            }],
        }));
    },

    removeLine: (id) => set((s) => ({ lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== id) : s.lines })),

    updateLine: (id, field, value) =>
        set((s) => ({
            lines: s.lines.map((l) => {
                if (l.id !== id) return l;
                return { ...l, [field]: value };
            }),
        })),

    reset: () =>
        set({
            tiersId: "",
            dateCreation: today(),
            decVente: "",
            dateDecVente: "",
            simultanee: "",
            dateSimultanee: "",
            notes: "",
            lines: [],
            selectedBlId: "",
            selectedBl: null,
        }),
}));
