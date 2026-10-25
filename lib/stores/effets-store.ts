"use client";
import { create } from "zustand";
import type { EffetStatus, EffetType } from "@/lib/types";

interface EffetsState {
    searchInput: string;
    searchQuery: string;
    statusFilter: EffetStatus | "ALL";
    typeFilter: EffetType | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: EffetStatus | "ALL") => void;
    setTypeFilter: (t: EffetType | "ALL") => void;
    resetFilters: () => void;
}

export const useEffetsStore = create<EffetsState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    typeFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    setTypeFilter: (t) => set({ typeFilter: t }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL", typeFilter: "ALL" }),
}));
