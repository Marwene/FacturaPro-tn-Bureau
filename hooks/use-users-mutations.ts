"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { notify } from "@/lib/notify";
import { useUsersStore } from "@/components/settings/utilisateurs/users-store";
import { ChangePasswordError, readApiErrorMessage } from "@/lib/api-error";
import type { MeUpdateInput } from "@/lib/schemas/user";
import type { SerializedUser } from "@/lib/types";

export { ChangePasswordError };

interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: string;
    permissions?: string[];
    companyIds?: string[];
}

interface UpdateUserData {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    permissions?: string[];
    actif?: boolean;
    companyIds?: string[];
}

interface UsersResponse {
    users: SerializedUser[];
}

interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

interface ChangePasswordResponse {
    success: boolean;
}

export function useUsersMutations() {
    const qc = useQueryClient();
    const setShowCreate = useUsersStore((s) => s.setShowCreate);
    const setEditingUser = useUsersStore((s) => s.setEditingUser);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

    const create = useMutation({
        mutationFn: async (data: CreateUserData) => {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) ?? "");
            }
            return res.json();
        },
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: ["users"] });
        },
        onError: (err: Error) => notify.error({ title: "Invitation non envoyée", error: err, context: "création de l'utilisateur" }),
        onSuccess: () => {
            setShowCreate(false);
            notify.success({
                title: "Invitation envoyée",
                description: "L'utilisateur recevra ses accès par email",
            });
        },
        onSettled: () => { invalidate(); },
    });

    const update = useMutation({
        mutationFn: async ({ id, ...data }: UpdateUserData) => {
            const res = await fetch(`/api/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) ?? "");
            }
            return res.json();
        },
        onMutate: async ({ id, ...data }) => {
            await qc.cancelQueries({ queryKey: ["users"] });
            const previous = qc.getQueryData<UsersResponse>(["users"]);
            if (previous) {
                qc.setQueryData<UsersResponse>(["users"], {
                    ...previous,
                    users: previous.users.map((u: SerializedUser) =>
                        u.id === id ? { ...u, ...data } : u
                    ),
                });
            }
            return { previous };
        },
        onError: (err: Error, _vars, context) => {
            if (context?.previous) qc.setQueryData(["users"], context.previous);
            notify.error({ title: "Mise à jour impossible", error: err, context: "modification de l'utilisateur" });
        },
        onSuccess: () => {
            setEditingUser(null);
            notify.success({ title: "Utilisateur mis à jour" });
        },
        onSettled: () => { invalidate(); },
    });

    const remove = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) ?? "");
            }
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["users"] });
            const previous = qc.getQueryData<UsersResponse>(["users"]);
            if (previous) {
                qc.setQueryData<UsersResponse>(["users"], {
                    ...previous,
                    users: previous.users.filter((u: SerializedUser) => u.id !== id),
                });
            }
            return { previous };
        },
        onError: (err: Error, _id, context) => {
            if (context?.previous) qc.setQueryData(["users"], context.previous);
            notify.error({ title: "Suppression impossible", error: err, context: "suppression de l'utilisateur" });
        },
        onSuccess: () => {
            notify.success({ title: "Utilisateur supprimé" });
        },
        onSettled: () => { invalidate(); },
    });

    const resendInvitation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch("/api/users/resend-invitation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) ?? "");
            }
        },
        onError: (err: Error) => notify.error({ title: "Renvoi impossible", error: err, context: "renvoi de l'invitation" }),
        onSuccess: () => {
            notify.success({
                title: "Invitation renvoyée",
                description: "Un email a été envoyé avec les nouveaux accès",
            });
        },
    });

    return { create, update, remove, resendInvitation };
}

export function useChangePassword() {
    return useMutation<ChangePasswordResponse, Error, ChangePasswordData>({
        mutationFn: async ({ currentPassword, newPassword }): Promise<ChangePasswordResponse> => {
            const res = await fetch("/api/users/me/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new ChangePasswordError(readApiErrorMessage(body));
            }
            return { success: true };
        },
    });
}

interface MeUpdateResponse {
    user: { id: string; name: string | null; email: string | null; image: string | null };
}

/** PATCH /api/users/me — mise à jour du profil, puis resynchronisation de la session NextAuth. */
export function useUpdateProfil() {
    const qc = useQueryClient();
    const { update: updateSession } = useSession();

    return useMutation({
        mutationFn: async (data: MeUpdateInput): Promise<MeUpdateResponse> => {
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? "Réponse invalide du serveur");
            }
            return (await res.json()) as MeUpdateResponse;
        },
        onSuccess: async ({ user: updated }) => {
            await updateSession({ user: { name: updated.name, email: updated.email } });
            qc.invalidateQueries({ queryKey: ["me"] });
            notify.success({ title: "Profil mis à jour" });
        },
        onError: (err: unknown) => {
            notify.error({
                title: "Mise à jour du profil impossible",
                error: err,
                context: "lors de la mise à jour du profil",
            });
        },
    });
}
