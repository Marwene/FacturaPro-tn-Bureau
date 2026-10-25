"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, UserCheck, UserX, MailCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-delete-dialog";
import {
    useUsersStore,
    type User,
} from "@/components/settings/utilisateurs/users-store";
import { buildUsersColumns } from "@/components/settings/utilisateurs/users-columns";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { CreateUserDialog } from "@/components/settings/utilisateurs/create-user-dialog";
import { EditUserDialog } from "@/components/settings/utilisateurs/edit-user-dialog";
import { useUsersMutations } from "@/hooks/use-users-mutations";
import { useUsersList } from "@/hooks/use-users";

export function UtilisateursSettingsClient() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role;

    const search = useUsersStore((s) => s.search);
    const setSearch = useUsersStore((s) => s.setSearch);
    const showCreate = useUsersStore((s) => s.showCreate);
    const setShowCreate = useUsersStore((s) => s.setShowCreate);
    const editingUser = useUsersStore((s) => s.editingUser);
    const setEditingUser = useUsersStore((s) => s.setEditingUser);

    const { data, isLoading } = useUsersList(userRole === "ADMIN");

    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const users = data?.users ?? [];
    const stats = data?.stats;
    const mutations = useUsersMutations();

    const toggleStatus = (user: User) => {
        mutations.update.mutate({ id: user.id, actif: !user.actif });
    };

    const handleDelete = (user: User) => {
        setDeletingUser(user);
    };

    const columns = buildUsersColumns({
        sessionUserId: (session?.user as { id?: string })?.id,
        onEdit: setEditingUser,
        onToggleStatus: toggleStatus,
        onResendInvitation: (userId) => mutations.resendInvitation.mutate(userId),
        onDelete: handleDelete,
    });

    if (userRole !== "ADMIN") {
        return (
            <div className="p-4 max-w-2xl">
                <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Accès réservé aux administrateurs
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Utilisateurs</h1>
                    <p className="text-xs text-muted-foreground">
                        Invitez et gérez les membres de votre équipe
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Inviter un utilisateur
                </Button>
            </div>

            {stats && (
                <div className="grid grid-cols-4 gap-3">
                    <StatCard title="Total" value={String(stats.total)} icon={Users} />
                    <StatCard
                        title="Actifs"
                        value={String(stats.actifs)}
                        subtitle={`${stats.inactifs} inactif${stats.inactifs > 1 ? "s" : ""}`}
                        icon={UserCheck}
                        variant="dark"
                    />
                    <StatCard
                        title="En attente"
                        value={String(stats.enAttente)}
                        subtitle="Email non vérifié"
                        subtitleVariant="warning"
                        icon={MailCheck}
                    />
                    <StatCard
                        title="Inactifs"
                        value={String(stats.inactifs)}
                        subtitle={`${Math.round((stats.actifs / stats.total) * 100)}% d'actifs`}
                        subtitleVariant={stats.inactifs > 0 ? "danger" : "success"}
                        icon={UserX}
                    />
                </div>
            )}

            {users.length > 0 && (
                <DataTable
                    columns={columns}
                    data={users}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Rechercher un utilisateur..."
                    enableColumnVisibility
                    pageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                    emptyMessage="Aucun utilisateur trouvé"
                />
            )}

            {showCreate && (
                <CreateUserDialog
                    open={showCreate}
                    onOpenChange={setShowCreate}
                    onSubmit={(data) => mutations.create.mutate(data)}
                    isLoading={mutations.create.isPending}
                />
            )}

            {editingUser && (
                <EditUserDialog
                    user={editingUser}
                    open={!!editingUser}
                    onOpenChange={(open) => !open && setEditingUser(null)}
                    onSubmit={(data) =>
                        mutations.update.mutate({ id: editingUser.id, ...data })
                    }
                    isLoading={mutations.update.isPending}
                />
            )}

            <ConfirmDialog
                open={!!deletingUser}
                onOpenChange={(open) => {
                    if (!open) setDeletingUser(null);
                }}
                onConfirm={() => {
                    if (deletingUser) mutations.remove.mutate(deletingUser.id);
                }}
                title={`Supprimer ${deletingUser?.name ?? ""} ?`}
                description="Cette action est irréversible."
                isLoading={mutations.remove.isPending}
            />
        </div>
    );
}
