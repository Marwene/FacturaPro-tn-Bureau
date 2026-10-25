"use client"

import { useState } from "react";
import { useFournisseurDetail } from "@/hooks/use-fournisseurs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTND } from "@/lib/decimal";
import {
    ShoppingCart, FileSpreadsheet, Building2,
    User, CreditCard, Landmark, FileText, Hash, Phone,
    Receipt, AlertCircle
} from "lucide-react";
import { FournisseurProfileHeader } from "./fournisseur-profile-header";
import { FournisseurDocumentsList } from "./fournisseur-document";
import { FournisseurSoldeTable } from "./fournisseur-solde";
import { FournisseurEcheancesCard } from "./fournisseur-echeances-card";
import { FournisseurDialog } from "./fournisseur-dialog";
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

function FournisseurDetailSkeleton() {
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

export function FournisseurDetailClient({ fournisseurId }: { fournisseurId: string }) {
    const { data, isLoading } = useFournisseurDetail(fournisseurId);
    const [showEditDialog, setShowEditDialog] = useState(false);

    if (isLoading) return <FournisseurDetailSkeleton />;
    if (!data) return <p className="text-sm text-muted-foreground p-4">Fournisseur introuvable</p>;

    const { fournisseur, stats } = data;

    return (
        <div className="flex flex-col gap-6 p-3 md:p-4">
            <FournisseurProfileHeader
                raisonSociale={fournisseur.raisonSociale}
                actif={fournisseur.actif}
                email={fournisseur.email}
                telephone={fournisseur.telephone}
                siteWeb={fournisseur.siteWeb}
                adresse={fournisseur.adresse}
                ville={fournisseur.ville}
                codePostal={fournisseur.codePostal}
                onEdit={() => setShowEditDialog(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <KpiGrid columns={4} className="grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard title="CA Fournisseur" value={formatTND(stats.totalAchatsTTC)} subtitle={`${stats.nbAchats} facture(s)`} icon={ShoppingCart} iconClassName="text-orange-600 bg-orange-500/10" />
                        <MetricCard title="Total Payé" value={formatTND(stats.totalPaye)} subtitle="Montant réglé" icon={Receipt} iconClassName="text-emerald-600 bg-emerald-500/10" />
                        <MetricCard title="Total Impayé" value={formatTND(stats.totalImpaye)} subtitle={`${stats.nbAchatsImpayes} en retard`} icon={AlertCircle} iconClassName="text-red-600 bg-red-500/10" />
                        <MetricCard title="Avoirs" value={formatTND(stats.totalAvoirsTTC)} subtitle={`${stats.nbAvoirs} avoir(s)`} icon={FileSpreadsheet} iconClassName="text-purple-600 bg-purple-500/10" />
                    </KpiGrid>

                    <Tabs defaultValue="achats" className="w-full">
                        <TabsList variant="line" className="w-full justify-start border-b border-muted/55 rounded-none h-10 p-0 bg-transparent gap-6 flex flex-wrap">
                            {[
                                { value: "achats", icon: ShoppingCart, label: "Achats", count: stats.nbAchats },
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
                        {["achats", "avoirs"].map((t) => (
                            <TabsContent key={t} value={t} className="mt-3 ml-3 focus-visible:outline-none">
                                <FournisseurDocumentsList fournisseurId={fournisseurId} filterType={t} />
                            </TabsContent>
                        ))}
                        <TabsContent value="solde" className="mt-3 focus-visible:outline-none">
                            <FournisseurSoldeTable fournisseurId={fournisseurId} />
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="flex flex-col gap-6">
                    <FournisseurEcheancesCard fournisseurId={fournisseurId} />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="size-4" />
                                Informations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            <InfoRow icon={Hash} label="Code" value={fournisseur.code} />
                            <InfoRow icon={FileText} label="Mat. Fiscal" value={fournisseur.matriculeFiscal} />
                            <InfoRow icon={User} label="Contact" value={fournisseur.contactNom} />
                            <InfoRow icon={Phone} label="Tél. contact" value={fournisseur.contactTel} />
                            <InfoRow icon={Landmark} label="Banque" value={fournisseur.banque} />
                            <InfoRow icon={CreditCard} label="RIB" value={fournisseur.ribBancaire} />
                            {fournisseur.notes && <InfoRow icon={FileText} label="Notes" value={fournisseur.notes} />}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <FournisseurDialog fournisseur={fournisseur} open={showEditDialog} onOpenChange={setShowEditDialog} />
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground min-w-[80px]">{label}</span>
            <span className="font-medium truncate">{value}</span>
        </div>
    );
}