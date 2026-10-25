"use client";

import { create } from "zustand";
import type { SerializedExport } from "@/lib/types";

interface ExportListState {
    searchInput: string;
    searchQuery: string;
    statusFilter: string;
    editDialogOpen: boolean;
    editExportData: SerializedExport | null;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: string) => void;
    openEditDialog: (data: SerializedExport) => void;
    closeEditDialog: () => void;
}

export const useExportListStore = create<ExportListState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    editDialogOpen: false,
    editExportData: null,
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    openEditDialog: (data) => set({ editExportData: data, editDialogOpen: true }),
    closeEditDialog: () => set({ editDialogOpen: false, editExportData: null }),
}));
