import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanyState {
  selectedCompanyId: string | null;
  setSelectedCompany: (id: string) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      setSelectedCompany: (id) => set({ selectedCompanyId: id }),
    }),
    { name: "company-store" }
  )
);
