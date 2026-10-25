"use client";

import { create } from "zustand";
import { emptyLine, type ExportLineForm } from "./export-store-shared";
import type { SerializedExport } from "@/lib/types";

interface ExportEditFormState {
    decVente: string;
    dateDecVente: string;
    simultanee: string;
    dateSimultanee: string;
    notes: string;
    status: string;
    lines: ExportLineForm[];
    populate: (exp: SerializedExport) => void;
    setDecVente: (v: string) => void;
    setDateDecVente: (v: string) => void;
    setSimultanee: (v: string) => void;
    setDateSimultanee: (v: string) => void;
    setNotes: (v: string) => void;
    setStatus: (v: string) => void;
    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, field: keyof ExportLineForm, value: string) => void;
    reset: () => void;
}

export const useExportEditFormStore = create<ExportEditFormState>((set) => ({
    decVente: "",
    dateDecVente: "",
    simultanee: "",
    dateSimultanee: "",
    notes: "",
    status: "BROUILLON",
    lines: [],

    populate: (exp) => {
        set({
            decVente: exp.decVente ?? "",
            dateDecVente: exp.dateDecVente ? exp.dateDecVente.split("T")[0] : "",
            simultanee: exp.simultanee ?? "",
            dateSimultanee: exp.dateSimultanee ? exp.dateSimultanee.split("T")[0] : "",
            notes: exp.notes ?? "",
            status: exp.status,
            lines: (exp.lines ?? []).map((l) => ({
                id: crypto.randomUUID(),
                ngpCodeId: l.ngpCodeId ?? "",
                ngpCode: l.ngpCode ?? "",
                barcode: l.barcode ?? "",
                snNumero: l.snNumero ?? "",
                quantite: l.quantite ?? "",
                quantiteBL: l.quantiteBL ?? "",
                resteQuantite: l.resteQuantite ?? "",
                bonLivraisonId: l.bonLivraisonId ?? null,
                bonLivraisonNumero: l.bonLivraisonNumero ?? "",
                dateBL: l.dateBL ? l.dateBL.split("T")[0] : "",
                invoiceId: l.invoiceId ?? null,
                invoiceNumero: l.invoiceNumero ?? "",
                dateFact: l.dateFact ? l.dateFact.split("T")[0] : "",
            })),
        });
    },

    setDecVente: (v) => set({ decVente: v }),
    setDateDecVente: (v) => set({ dateDecVente: v }),
    setSimultanee: (v) => set({ simultanee: v }),
    setDateSimultanee: (v) => set({ dateSimultanee: v }),
    setNotes: (v) => set({ notes: v }),
    setStatus: (v) => set({ status: v }),

    addLine: () => set((s) => ({ lines: [...s.lines, emptyLine()] })),
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
            decVente: "",
            dateDecVente: "",
            simultanee: "",
            dateSimultanee: "",
            notes: "",
            status: "BROUILLON",
            lines: [],
        }),
}));

interface ExportDetailEditState {
    isEditing: boolean;
    decVente: string;
    dateDecVente: string;
    simultanee: string;
    dateSimultanee: string;
    notes: string;
    lines: ExportLineForm[];
    startEditing: (exp: SerializedExport) => void;
    cancelEditing: () => void;
    setDecVente: (v: string) => void;
    setDateDecVente: (v: string) => void;
    setSimultanee: (v: string) => void;
    setDateSimultanee: (v: string) => void;
    setNotes: (v: string) => void;
    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, field: keyof ExportLineForm, value: string) => void;
}

export const useExportDetailEditStore = create<ExportDetailEditState>((set) => ({
    isEditing: false,
    decVente: "",
    dateDecVente: "",
    simultanee: "",
    dateSimultanee: "",
    notes: "",
    lines: [],

    startEditing: (exp) => {
        set({
            isEditing: true,
            decVente: exp.decVente ?? "",
            dateDecVente: exp.dateDecVente ? exp.dateDecVente.split("T")[0] : "",
            simultanee: exp.simultanee ?? "",
            dateSimultanee: exp.dateSimultanee ? exp.dateSimultanee.split("T")[0] : "",
            notes: exp.notes ?? "",
            lines: (exp.lines ?? []).map((l) => ({
                id: crypto.randomUUID(),
                ngpCodeId: l.ngpCodeId ?? "",
                ngpCode: l.ngpCode ?? "",
                barcode: l.barcode ?? "",
                snNumero: l.snNumero ?? "",
                quantite: l.quantite ?? "0",
                quantiteBL: l.quantiteBL ?? "",
                resteQuantite: l.resteQuantite ?? "",
                bonLivraisonId: l.bonLivraisonId ?? "",
                bonLivraisonNumero: l.bonLivraisonNumero ?? "",
                dateBL: l.dateBL ? l.dateBL.split("T")[0] : "",
                invoiceId: l.invoiceId ?? null,
                invoiceNumero: l.invoiceNumero ?? "",
                dateFact: l.dateFact ? l.dateFact.split("T")[0] : "",
            })),
        });
    },

    cancelEditing: () => set({ isEditing: false }),

    setDecVente: (v) => set({ decVente: v }),
    setDateDecVente: (v) => set({ dateDecVente: v }),
    setSimultanee: (v) => set({ simultanee: v }),
    setDateSimultanee: (v) => set({ dateSimultanee: v }),
    setNotes: (v) => set({ notes: v }),

    addLine: () =>
        set((s) => ({ lines: [...s.lines, { id: crypto.randomUUID(), ngpCodeId: "", ngpCode: "", barcode: "", snNumero: "", quantite: "0", quantiteBL: "", resteQuantite: "", bonLivraisonId: "", bonLivraisonNumero: "", dateBL: "", invoiceId: null, invoiceNumero: "", dateFact: "" }] })),

    removeLine: (id) =>
        set((s) => ({ lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== id) : s.lines })),

    updateLine: (id, field, value) =>
        set((s) => ({
            lines: s.lines.map((l) => {
                if (l.id !== id) return l;
                return { ...l, [field]: value };
            }),
        })),
}));
