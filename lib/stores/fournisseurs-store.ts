"use client";

import { create } from "zustand";
import type { SerializedTiers } from "@/lib/types";

interface FournisseursListState {
    searchInput: string;
    searchQuery: string;
    searchLoading: boolean;
    editFournisseur: SerializedTiers | null;
    showEditDialog: boolean;
    deleteTarget: SerializedTiers | null;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setSearchLoading: (v: boolean) => void;
    setEditFournisseur: (f: SerializedTiers | null) => void;
    setShowEditDialog: (v: boolean) => void;
    setDeleteTarget: (f: SerializedTiers | null) => void;
}

export const useFournisseursStore = create<FournisseursListState>((set) => ({
    searchInput: "",
    searchQuery: "",
    searchLoading: false,
    editFournisseur: null,
    showEditDialog: false,
    deleteTarget: null,
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setSearchLoading: (v) => set({ searchLoading: v }),
    setEditFournisseur: (f) => set({ editFournisseur: f }),
    setShowEditDialog: (v) => set({ showEditDialog: v }),
    setDeleteTarget: (f) => set({ deleteTarget: f }),
}));
