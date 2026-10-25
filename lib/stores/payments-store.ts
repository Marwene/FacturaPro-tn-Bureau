"use client";

import { create } from "zustand";
import { PaymentMethod } from "@/lib/types";

interface PaymentsState {
    searchInput: string;
    searchQuery: string;
    methodFilter: PaymentMethod | "ALL";
    dateFrom: string;
    dateTo: string;
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setMethodFilter: (m: PaymentMethod | "ALL") => void;
    setDateFrom: (d: string) => void;
    setDateTo: (d: string) => void;
    resetFilters: () => void;
}

export const usePaymentsStore = create<PaymentsState>((set) => ({
    searchInput: "",
    searchQuery: "",
    methodFilter: "ALL",
    dateFrom: "",
    dateTo: "",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setMethodFilter: (m) => set({ methodFilter: m }),
    setDateFrom: (d) => set({ dateFrom: d }),
    setDateTo: (d) => set({ dateTo: d }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", methodFilter: "ALL", dateFrom: "", dateTo: "" }),
}));
