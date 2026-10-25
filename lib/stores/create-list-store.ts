import { create } from "zustand"

interface ListStore<T extends string> {
  searchInput: string
  searchQuery: string
  statusFilter: T | "ALL"
  setSearchInput: (q: string) => void
  setSearchQuery: (q: string) => void
  setStatusFilter: (s: T | "ALL") => void
  resetFilters: () => void
}

export function createListStore<T extends string>(defaultStatus: T) {
  return create<ListStore<T>>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL" as T | "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL" as T | "ALL" }),
  }))
}
