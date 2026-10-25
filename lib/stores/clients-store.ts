"use client";

import { create } from "zustand";
import type { SerializedTiers } from "@/lib/types";

interface ClientsListState {
    search: string;
    searchLoading: boolean;
    editTiers: SerializedTiers | null;
    showEditDialog: boolean;
    deleteTarget: string | null;
    nouveauOpen: boolean;
    setSearch: (q: string) => void;
    setSearchLoading: (v: boolean) => void;
    setEditTiers: (c: SerializedTiers | null) => void;
    setShowEditDialog: (v: boolean) => void;
    setDeleteTarget: (id: string | null) => void;
    setNouveauOpen: (v: boolean) => void;
}

export const useClientsStore = create<ClientsListState>((set) => ({
    search: "",
    searchLoading: false,
    editTiers: null,
    showEditDialog: false,
    deleteTarget: null,
    nouveauOpen: false,
    setSearch: (q) => set({ search: q }),
    setSearchLoading: (v) => set({ searchLoading: v }),
    setEditTiers: (c) => set({ editTiers: c }),
    setShowEditDialog: (v) => set({ showEditDialog: v }),
    setDeleteTarget: (id) => set({ deleteTarget: id }),
    setNouveauOpen: (v) => set({ nouveauOpen: v }),
}));
