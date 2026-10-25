"use client";

import { useState } from "react";
import { useClientDetail, useClientBlocageMutations } from "@/hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTND } from "@/lib/decimal";
import {
    Mail, Phone, FileText, ClipboardList, Package,
    Receipt, FileSpreadsheet, AlertCircle,
    CreditCard, ShieldAlert
} from "lucide-react";
import { ClientDialog } from "./client-dialog";
import { ClientDocumentsList } from "./client-document";
import { ClientSoldeTable } from "./client-solde";
import { ClientBlocageBanner } from "./client-blocage-banner";
import { ClientProfileHeader } from "./client-profile-header";
import { ClientCreditBlockingCard } from "./client-credit-blocking-card";
import { ClientDetailsSidebar } from "./client-details-sidebar";
import { cn } from "@/lib/utils";

function MetricCard({ title, value, subtitle, icon: Icon, iconClassName, }: {
    title: string; value: string; subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClassName?: string;
}) {
    return (
        <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border-muted/50")}>
            <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{title}</span>
                    <div className={cn("p-1.5 rounded-lg bg-muted/40", iconClassName)}>
                        <Icon className="size-4" />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg md:text-xl font-bold tracking-tight">{value}</h3>
                    {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

function ClientDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="size-16 rounded-full" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-6 w-48" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                </div>
                <Skeleton className="h-9 w-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-[450px] rounded-xl" />
                </div>
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function ClientDetailClient({ clientId }: { clientId: string }) {
    const { data, isLoading } = useClientDetail(clientId);
    const { checkBlocage, envoyerRappel } = useClientBlocageMutations(clientId);
    const [showEditDialog, setShowEditDialog] = useState(false);

    if (isLoading) return <ClientDetailSkeleton />;
    if (!data) return <p className="text-sm text-muted-foreground p-4">Client introuvable</p>;

    const { client, stats, blocage } = data;

    return (
        <div className="flex flex-col gap-6 p-3 md:p-4">
            <ClientBlocageBanner clientId={clientId} blocage={blocage} clientEmail={client.email} />

            <ClientProfileHeader
                raisonSociale={client.raisonSociale}
                actif={client.actif}
                email={client.email}
                telephone={client.telephone}
                siteWeb={client.siteWeb}
                adresse={client.adresse}
                ville={client.ville}
                codePostal={client.codePostal}
                onEdit={() => setShowEditDialog(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <KpiGrid columns={4} className="grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard title="Chiffre d'affaires" value={formatTND(stats.totalCA)} subtitle={`${stats.nbFactures} facture(s)`} icon={FileText} iconClassName="text-emerald-600 bg-emerald-500/10" />
                        <MetricCard title="Total Payé" value={formatTND(stats.totalPaye)} subtitle="Montant encaissé" icon={Receipt} iconClassName="text-blue-600 bg-blue-500/10" />
                        <MetricCard title="Total Impayé" value={formatTND(stats.totalImpaye)} subtitle={`${stats.nbFacturesImpayees} non payée(s)`} icon={AlertCircle} iconClassName="text-red-600 bg-red-500/10" />
                        <MetricCard title="Avoirs" value={formatTND(stats.totalAvoirs)} subtitle={`${stats.nbAvoirs} avoir(s)`} icon={FileSpreadsheet} iconClassName="text-purple-600 bg-purple-500/10" />
                    </KpiGrid>

                    <Tabs defaultValue="devis" className="w-full">
                        <TabsList variant="line" className="w-full justify-start border-b border-muted/55 rounded-none h-10 p-0 bg-transparent gap-6 flex flex-wrap">
                            {[
                                { value: "devis", icon: FileText, label: "Devis", count: stats.nbDevis },
                                { value: "bonsCommandes", icon: ClipboardList, label: "B.C.", count: stats.nbBC },
                                { value: "bonsLivraison", icon: Package, label: "B.L.", count: stats.nbBL },
                                { value: "factures", icon: Receipt, label: "Factures", count: stats.nbFactures },
                                { value: "avoirs", icon: FileSpreadsheet, label: "Avoirs", count: stats.nbAvoirs },
                            ].map(({ value, icon: Icon, label, count }) => (
                                <TabsTrigger key={value} value={value} className="pb-2">
                                    <Icon />
                                    {label}
                                    <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px] font-normal">{count}</Badge>
                                </TabsTrigger>
                            ))}
                            <TabsTrigger value="solde" className="pb-2 sm:ml-auto">
                                <CreditCard /> Grand-Livre
                            </TabsTrigger>
                        </TabsList>
                        {["devis", "bonsCommandes", "bonsLivraison", "factures", "avoirs"].map((t) => (
                            <TabsContent key={t} value={t} className="mt-3 ml-3 focus-visible:outline-none">
                                <ClientDocumentsList clientId={clientId} filterType={t} />
                            </TabsContent>
                        ))}
                        <TabsContent value="solde" className="mt-3 focus-visible:outline-none">
                            <ClientSoldeTable clientId={clientId} />
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="flex flex-col gap-6">
                    <ClientCreditBlockingCard
                        clientId={clientId}
                        creditLimit={client.creditLimit}
                        totalImpaye={stats.totalImpaye}
                        estBloque={blocage.estBloque}
                        email={client.email}
                        checkBlocage={checkBlocage}
                        envoyerRappel={envoyerRappel}
                    />
                    <ClientDetailsSidebar
                        code={client.code}
                        matriculeFiscal={client.matriculeFiscal}
                        exonereTVA={client.exonereTVA}
                        assujettTVA={client.assujettTVA}
                        tauxRetenue={client.tauxRetenue}
                        devise={client.devise}
                        deviseSecondaire={client.deviseSecondaire}
                        banque={client.banque}
                        ribBancaire={client.ribBancaire}
                        notes={client.notes}
                    />
                </div>
            </div>

            <ClientDialog client={client} open={showEditDialog} onOpenChange={setShowEditDialog} />
        </div>
    );
}
