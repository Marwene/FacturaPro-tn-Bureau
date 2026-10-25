"use client";

import { create } from "zustand";

export interface UserCompany {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    actif: boolean;
    emailVerified: string | null;
    image: string | null;
    createdAt: string;
    company: { id: string; name: string } | null;
    userCompanies: { company: UserCompany }[];
}

export interface UsersStats {
    total: number;
    actifs: number;
    inactifs: number;
    enAttente: number;
}

interface UsersStore {
    search: string;
    showCreate: boolean;
    editingUser: User | null;
    setSearch: (q: string) => void;
    setShowCreate: (v: boolean) => void;
    setEditingUser: (u: User | null) => void;
    reset: () => void;
}

export const useUsersStore = create<UsersStore>((set) => ({
    search: "",
    showCreate: false,
    editingUser: null,
    setSearch: (q) => set({ search: q }),
    setShowCreate: (v) => set({ showCreate: v }),
    setEditingUser: (u) => set({ editingUser: u }),
    reset: () => set({ search: "", showCreate: false, editingUser: null }),
}));
