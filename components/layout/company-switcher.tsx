"use client";

import { useSession } from "next-auth/react";
import { useUserCompanies } from "@/hooks/use-user-companies";
import { useCompanyStore } from "@/lib/stores/company-store";
import { usePermissions } from "@/lib/use-permissions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, ChevronsUpDown, Globe, Settings, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyItem {
    id: string;
    name: string;
    type: string;
    devise: string;
    logo: string | null;
}

export function CompanySwitcher() {
    const { data: session } = useSession();
    const userId = (session?.user as { id?: string })?.id;
    const { can } = usePermissions();
    const router = useRouter();
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
    const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany);

    const { data, isLoading } = useUserCompanies(userId);

    const companies = data?.companies ?? [];
    const currentId = selectedCompanyId ?? data?.primaryCompanyId ?? null;
    const current = companies.find((c) => c.id === currentId);

    if (isLoading || !current) {
        return (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm font-normal" disabled>
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Chargement...</span>
            </Button>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs font-normal px-2 border-dashed"
                >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold">
                        {current.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline max-w-[100px] truncate">
                        {current.name}
                    </span>
                    <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
                <Command>
                    <CommandInput placeholder="Rechercher une entreprise..." className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty className="text-xs py-4">Aucune entreprise trouvée</CommandEmpty>
                        <CommandGroup>
                            {companies.map((c) => {
                                const isActive = c.id === currentId;
                                const isOffshore = c.type === "OFFSHORE";
                                return (
                                    <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        onSelect={() => setSelectedCompany(c.id)}
                                        className="flex items-center gap-3 py-2"
                                    >
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
                                            {c.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium truncate">{c.name}</span>
                                                {isActive && (
                                                    <Check className="h-3 w-3 shrink-0 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Badge
                                                    variant={isOffshore ? "default" : "secondary"}
                                                    className="h-4 text-[10px] gap-0.5 px-1"
                                                >
                                                    {isOffshore ? (
                                                        <Globe className="h-2.5 w-2.5" />
                                                    ) : (
                                                        <Building className="h-2.5 w-2.5" />
                                                    )}
                                                    {isOffshore ? "Offshore" : "Locale"}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {c.devise}
                                                </span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {can("parametres:voir") && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => router.push("/entreprises")}
                                        className="gap-2 py-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span className="text-xs">Gérer les entreprises</span>
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
