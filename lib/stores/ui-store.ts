"use client";

import { create } from "zustand";
import type { QuoteStatus } from "@/lib/types";

// ─── Clients Store ────────────────────────────────────────────────────────────

interface ClientsState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
    searchQuery: "",
    setSearchQuery: (q) => set({ searchQuery: q }),
}));

// ─── Quotes Store ─────────────────────────────────────────────────────────────

interface QuotesState {
    searchInput: string;
    searchQuery: string;
    statusFilter: QuoteStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: QuoteStatus | "ALL") => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
}));

// ─── Cheques Store ────────────────────────────────────────────────────────────

import { ChequeType } from "@/lib/types";

interface ChequesState {
    activeTab: ChequeType | "EN_ATTENTE";
    setActiveTab: (tab: ChequeType | "EN_ATTENTE") => void;
}

export const useChequesStore = create<ChequesState>((set) => ({
    activeTab: "EN_ATTENTE",
    setActiveTab: (tab) => set({ activeTab: tab }),
}));

// ─── Reports Store ────────────────────────────────────────────────────────────

interface ReportsState {
    selectedYear: string;
    setSelectedYear: (y: string) => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
    selectedYear: new Date().getFullYear().toString(),
    setSelectedYear: (y) => set({ selectedYear: y }),
}));

// ─── Bons de Livraison Store ──────────────────────────────────────────────────

import type { DeliveryNoteStatus } from "@/lib/types";

interface BonsLivraisonState {
    searchInput: string;
    searchQuery: string;
    statusFilter: DeliveryNoteStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: DeliveryNoteStatus | "ALL") => void;
}

export const useBonsLivraisonStore = create<BonsLivraisonState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
}));


