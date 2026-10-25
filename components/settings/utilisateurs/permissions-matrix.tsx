"use client";

import { PERMISSION_GROUPS } from "@/lib/permissions";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";

export function PermissionsMatrix({
    value,
    onChange,
}: {
    value: string[];
    onChange: (perms: string[]) => void;
}) {
    function togglePermission(perm: string) {
        onChange(
            value.includes(perm)
                ? value.filter((p) => p !== perm)
                : [...value, perm]
        );
    }

    function toggleGroup(groupKey: string) {
        const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
        if (!group) return;
        const groupPerms = Object.keys(group.permissions);
        const allSelected = groupPerms.every((p) => value.includes(p));
        onChange(
            allSelected
                ? value.filter((p) => !groupPerms.includes(p))
                : [...value.filter((p) => !groupPerms.includes(p)), ...groupPerms]
        );
    }

    const entries = Object.entries(PERMISSION_GROUPS);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">
                    Accorder des autorisations spécifiques
                </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map(([groupKey, group]) => {
                    const groupPerms = Object.keys(group.permissions);
                    const allSelected = groupPerms.every((p) => value.includes(p));
                    const someSelected = groupPerms.some((p) => value.includes(p));

                    return (
                        <GroupCheckbox
                            key={groupKey}
                            groupKey={groupKey}
                            label={group.label}
                            groupPerms={groupPerms}
                            allSelected={allSelected}
                            someSelected={someSelected}
                            value={value}
                            onToggleGroup={toggleGroup}
                            onTogglePermission={togglePermission}
                            permissions={group.permissions as Record<string, string>}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function GroupCheckbox({
    groupKey,
    label,
    groupPerms,
    allSelected,
    someSelected,
    value,
    onToggleGroup,
    onTogglePermission,
    permissions,
}: {
    groupKey: string;
    label: string;
    groupPerms: string[];
    allSelected: boolean;
    someSelected: boolean;
    value: string[];
    onToggleGroup: (key: string) => void;
    onTogglePermission: (perm: string) => void;
    permissions: Record<string, string>;
}) {
    return (
        <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
                <div>
                    <Checkbox
                        ref={(el) => { if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected && !allSelected; }}
                        checked={allSelected}
                        onCheckedChange={() => onToggleGroup(groupKey)}
                        className="h-3.5 w-3.5"
                    />
                </div>
                <Label
                    className="text-xs font-medium cursor-pointer"
                    onClick={() => onToggleGroup(groupKey)}
                >
                    {label}
                </Label>
                {allSelected && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        Tout
                    </span>
                )}
            </div>
            {groupPerms.length > 1 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    {Object.entries(permissions).map(([perm, permLabel]) => (
                        <label
                            key={perm}
                            className="flex items-center gap-1.5 cursor-pointer py-0.5"
                        >
                            <Checkbox
                                checked={value.includes(perm)}
                                onCheckedChange={() => onTogglePermission(perm)}
                                className="h-3 w-3"
                            />
                            <span className="text-[11px] text-muted-foreground leading-none pt-px">
                                {permLabel}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
