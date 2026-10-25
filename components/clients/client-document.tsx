"use client";

import { useClientDocuments } from "@/hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import Link from "next/link";
import { ArrowRight, FileText, FileSpreadsheet, ClipboardList, Package, Receipt } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

// Types
interface DocumentItem {
    id: string;
    numero?: string;
    reference?: string;
    dateCreation?: string;
    dateEmission?: string;
    totalTTC?: string | number;
    status: string;
    tiers?: { name: string };
}

interface DocTypeConfig {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    route: string;
}

const typeConfig: Record<string, DocTypeConfig> = {
    devis: {
        key: "devis",
        label: "Devis",
        icon: FileText,
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        route: "devis",
    },
    bonsCommandes: {
        key: "bonsCommandes",
        label: "Bons de Commandes",
        icon: ClipboardList,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        route: "bons-commande",
    },
    bonsLivraison: {
        key: "bonsLivraison",
        label: "Bons de Livraisons",
        icon: Package,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-950/30",
        route: "bons-livraison",
    },
    factures: {
        key: "factures",
        label: "Factures",
        icon: Receipt,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30",
        route: "factures",
    },
    avoirs: {
        key: "avoirs",
        label: "Avoirs",
        icon: FileSpreadsheet,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        route: "avoirs",
    },
};

function DocumentDataTable({ docs, docType, isLoading }: {
    docs: DocumentItem[];
    docType: DocTypeConfig;
    isLoading: boolean
}) {

    const router = useRouter();

    const columns = useMemo<ColumnDef<DocumentItem>[]>(() => [
        {
            id: "document",
            accessorFn: (row) => `${row.numero || row.reference || row.id} ${row.tiers?.name || ""}`,
            header: "Document",
            cell: ({ row }) => {
                const doc = row.original;
                const Icon = docType.icon;
                return (
                    <Link
                        href={`/${docType.route}/${doc.id}`}
                        className="flex items-center gap-3 group"
                    >
                        <div className={`rounded-full p-1.5 ${docType.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${docType.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-tight">
                                {doc.numero || doc.reference || `#${doc.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <DateCell value={doc.dateCreation ?? doc.dateEmission} /> · {doc.tiers?.name ?? ""}
                            </p>
                        </div>
                    </Link>
                );
            },
        },
        {
            accessorKey: "totalTTC",
            header: "Montant",
            cell: ({ getValue }) => (
                <MoneyCell value={String(getValue() ?? "0")} className="text-xs font-semibold" />
            ),
        },
        {
            accessorKey: "status",
            header: "Statut",
            cell: ({ getValue }) => (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    {String(getValue())}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const doc = row.original;
                return (
                    <Link
                        href={`/${docType.route}/${doc.id}`}
                        className="flex justify-end"
                    >
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                );
            },
        },
    ], [docType]);

    return (
        <DataTable
            columns={columns}
            data={docs}
            loading={isLoading}
            onRowClick={(doc) => {
                router.push(`/${docType.route}/${doc.id}`);
            }}
            searchPlaceholder={`Rechercher ${docType.label}...`}
            enableColumnVisibility={false}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
            renderEmpty={() => (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <docType.icon className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">Aucun document trouvé</p>
                </div>
            )}
        />
    );
}

export function ClientDocumentsList({ clientId, filterType }: { clientId: string; filterType?: string }) {
    const { data, isLoading } = useClientDocuments(clientId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const docType = filterType ? typeConfig[filterType] : null;
    const docs = data?.[filterType as keyof typeof data] ?? [];

    if (!docType) {
        return <p className="text-sm text-muted-foreground">Type de document invalide</p>;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <docType.icon className={`h-4 w-4 ${docType.color}`} />
                    {docType.label}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <DocumentDataTable
                    docs={docs as DocumentItem[]}
                    docType={docType}
                    isLoading={isLoading}
                />
            </CardContent>
        </Card>
    );
}