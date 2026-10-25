"use client";

import { useSession } from "next-auth/react";
import { userHasPermission, type PermissionKey } from "./permissions";

export function usePermissions() {
    const { data: session } = useSession();
    const user = session?.user as { role?: string; permissions?: string[] } | undefined;
    const role = user?.role ?? "";
    const perms = user?.permissions ?? [];

    function can(permission: PermissionKey): boolean {
        return userHasPermission(role, perms, permission);
    }

    function canAny(permissions: PermissionKey[]): boolean {
        return permissions.some((p) => can(p));
    }

    function canAll(permissions: PermissionKey[]): boolean {
        return permissions.every((p) => can(p));
    }

    return { can, canAny, canAll, role, permissions: perms };
}
