"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Building2, Check, ChevronsUpDown, X } from "lucide-react";

interface CreateUserCompaniesSectionProps {
    companies: { id: string; name: string }[];
    /**
     * IDs sélectionnés. Optionnel : s'il est absent (dialog de création),
     * l'état « coché » est dérivé de `selectedCompanies` — donnée équivalente,
     * calculée par le formulaire parent.
     */
    selectedCompanyIds?: string[];
    selectedCompanies: { id: string; name: string }[];
    onToggleCompany: (id: string) => void;
}

export function CreateUserCompaniesSection({
    companies,
    selectedCompanyIds,
    selectedCompanies,
    onToggleCompany,
}: CreateUserCompaniesSectionProps) {
    const checkedIds = selectedCompanyIds ?? selectedCompanies.map((c) => c.id);
    return (
        <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1">
                    <span className="text-xs font-semibold text-foreground">
                        Sociétés
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                        Limiter l&apos;accès à certaines sociétés
                    </p>
                </div>
            </div>
            <div className="space-y-1.5">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "h-9 w-full justify-between text-sm font-normal",
                                selectedCompanies.length === 0 && "text-muted-foreground"
                            )}
                        >
                            <span className="truncate">
                                {selectedCompanies.length === 0
                                    ? "Sélectionner des sociétés..."
                                    : selectedCompanies.map((c) => c.name).join(", ")
                                }
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Rechercher une société..." />
                            <CommandEmpty>Aucune société trouvée</CommandEmpty>
                            <CommandGroup className="max-h-48 overflow-y-auto">
                                {companies.map((c) => (
                                    <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        onSelect={() => onToggleCompany(c.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-3.5 w-3.5",
                                                checkedIds.includes(c.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {c.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                {selectedCompanies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedCompanies.map((c) => (
                            <Badge
                                key={c.id}
                                variant="secondary"
                                className="gap-1 text-xs px-2 py-0 h-5 font-normal"
                            >
                                <Building2 className="h-2.5 w-2.5 shrink-0" />
                                {c.name}
                                <button
                                    type="button"
                                    className="ml-0.5 hover:text-foreground text-muted-foreground"
                                    onClick={() => onToggleCompany(c.id)}
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
