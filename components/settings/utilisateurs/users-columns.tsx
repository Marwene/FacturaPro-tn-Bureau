"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Building2,
    MailCheck,
    MoreHorizontal,
    Pencil,
    Send,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Shield,
    User as UserIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "./users-store";

interface ColumnsOptions {
    sessionUserId?: string;
    onEdit: (user: User) => void;
    onToggleStatus: (user: User) => void;
    onResendInvitation: (userId: string) => void;
    onDelete: (user: User) => void;
}

export function buildUsersColumns({
    sessionUserId,
    onEdit,
    onToggleStatus,
    onResendInvitation,
    onDelete,
}: ColumnsOptions): ColumnDef<User>[] {
    return [
        {
            accessorKey: "name",
            header: "Nom",
            cell: ({ row }) => {
                const u = row.original;
                const initials = u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                            {initials}
                        </div>
                        <div>
                            <span className="text-sm font-medium">{u.name}</span>
                            {!u.actif && (
                                <span className="ml-2 text-[10px] text-red-500 font-medium">
                                    (Désactivé)
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => {
                const u = row.original;
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{u.email}</span>
                        {u.emailVerified ? (
                            <MailCheck className="h-3 w-3 text-emerald-500" />
                        ) : (
                            <span className="text-[10px] text-amber-600 font-medium">
                                (Non vérifié)
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "role",
            header: "Rôle",
            cell: ({ row }) => {
                const isAdmin = row.original.role === "ADMIN";
                return (
                    <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            isAdmin
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                    >
                        {isAdmin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                        {isAdmin ? "Admin" : "Utilisateur"}
                    </span>
                );
            },
        },
        {
            id: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const u = row.original;
                return (
                    <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.actif
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                    >
                        {u.actif ? "Actif" : "Inactif"}
                    </span>
                );
            },
        },
        {
            id: "companies",
            header: "Sociétés",
            cell: ({ row }) => {
                const u = row.original;
                const allCompanies = [
                    ...(u.company ? [{ name: u.company.name }] : []),
                    ...u.userCompanies.map((uc) => ({ name: uc.company.name })),
                ];
                const unique = allCompanies.filter(
                    (c, i, a) => a.findIndex((x) => x.name === c.name) === i,
                );
                return (
                    <div className="flex flex-wrap gap-1">
                        {unique.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                            unique
                                .slice(0, 2)
                                .map((c) => (
                                    <span
                                        key={c.name}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                    >
                                        <Building2 className="h-2.5 w-2.5" />
                                        {c.name}
                                    </span>
                                ))
                                .concat(
                                    unique.length > 2
                                        ? [
                                              <span
                                                  key="more"
                                                  className="text-[10px] text-muted-foreground"
                                              >
                                                  +{unique.length - 2}
                                              </span>,
                                          ]
                                        : [],
                                )
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Créé le",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.original.createdAt).toLocaleDateString("fr-FR")}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const u = row.original;
                const isSelf = u.id === sessionUserId;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2 text-sm" onClick={() => onEdit(u)}>
                                <Pencil className="h-3.5 w-3.5" /> Modifier
                            </DropdownMenuItem>
                            {!isSelf && (
                                <DropdownMenuItem
                                    className="gap-2 text-sm"
                                    onClick={() => onToggleStatus(u)}
                                >
                                    {u.actif ? (
                                        <>
                                            <ToggleRight className="h-3.5 w-3.5" /> Désactiver
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="h-3.5 w-3.5" /> Activer
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}
                            {!isSelf && (
                                <DropdownMenuItem
                                    className="gap-2 text-sm"
                                    onClick={() => onResendInvitation(u.id)}
                                >
                                    <Send className="h-3.5 w-3.5" /> Renvoyer invitation
                                </DropdownMenuItem>
                            )}
                            {!isSelf && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="gap-2 text-sm text-red-600"
                                        onClick={() => onDelete(u)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}
