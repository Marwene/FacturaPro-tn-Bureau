"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { CreateCompanyDialog } from "@/components/entreprises/create-company-dialog";
import { useCompaniesList } from "@/hooks/use-users";
import { Building2, Plus, FileText, Users, Globe, Building } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  type: string;
  devise: string;
  matriculeFiscal: string | null;
  ville: string | null;
  actif: boolean;
  logo: string | null;
  _count: { invoices: number; users: number };
}

export function EntreprisesListClient() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useCompaniesList<Company>();

  const companies = data?.companies ?? [];
  const stats = {
    total: companies.length,
    actives: companies.filter((c) => c.actif).length,
    totalInvoices: companies.reduce((s, c) => s + c._count.invoices, 0),
    totalUsers: companies.reduce((s, c) => s + c._count.users, 0),
  };

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: "name",
      header: "Nom",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <Link
            href={`/parametres/entreprises/${c.id}`}
            className="flex items-center gap-2.5 hover:underline"
          >
            {c.logo ? (
              <img src={c.logo} alt="" loading="lazy" className="h-7 w-7 rounded object-contain bg-muted" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-semibold shrink-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            <div>
              <span className="text-sm font-medium">{c.name}</span>
              {!c.actif && (
                <span className="ml-2 text-[10px] text-red-500 font-medium">(Désactivée)</span>
              )}
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const isOffshore = row.original.type === "OFFSHORE";
        return (
          <Badge variant={isOffshore ? "default" : "secondary"} className="text-[10px] gap-1">
            {isOffshore ? <Globe className="h-3 w-3" /> : <Building className="h-3 w-3" />}
            {isOffshore ? "Offshore" : "Locale"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "devise",
      header: "Devise",
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.devise}</span>
      ),
    },
    {
      accessorKey: "matriculeFiscal",
      header: "Mat. Fiscal",
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.original.matriculeFiscal ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "ville",
      header: "Ville",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.ville ?? "—"}</span>
      ),
    },
    {
      id: "stats",
      header: "Activité",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {row.original._count.invoices}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {row.original._count.users}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "actif",
      header: "Statut",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
            row.original.actif
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {row.original.actif ? "Actif" : "Inactif"}
        </span>
      ),
    },
  ];

  if (userRole !== "ADMIN") {
    return (
      <div className="p-4 max-w-2xl">
        <div className="rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
          Accès réservé aux administrateurs
        </div>
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
          <h1 className="text-lg font-semibold">Entreprises</h1>
          <p className="text-xs text-muted-foreground">
            Gérez vos entreprises et leurs paramètres
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle entreprise
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total" value={String(stats.total)} icon={Building2} />
        <StatCard title="Actives" value={String(stats.actives)} subtitle={`${stats.total - stats.actives} inactive${stats.total - stats.actives > 1 ? "s" : ""}`} icon={Building} variant="dark" />
        <StatCard title="Factures" value={String(stats.totalInvoices)} icon={FileText} />
        <StatCard title="Utilisateurs" value={String(stats.totalUsers)} icon={Users} />
      </div>

      <DataTable
        columns={columns}
        data={companies}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher une entreprise..."
        enableColumnVisibility
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        emptyMessage="Aucune entreprise trouvée"
      />

      {showCreate && (
        <CreateCompanyDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
