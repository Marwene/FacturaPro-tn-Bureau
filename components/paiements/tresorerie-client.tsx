"use client"

import { useState } from "react"
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChartSpline, Wallet } from "lucide-react"
import { useTresorerie, type CompteFiltreTresorerie } from "@/hooks/use-tresorerie"
import { useCompanyStore } from "@/lib/stores/company-store"
import { PageHeader } from "@/components/shared/page-header"
import { KpiGrid } from "@/components/shared/kpi-grid"
import { ListSkeleton } from "@/components/shared/list-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { ChartErrorBoundary } from "@/components/shared/chart-error-boundary"
import { StatCard } from "@/components/stat-card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TresorerieVentilationMois } from "@/components/paiements/tresorerie-ventilation"
import { TresorerieComptes } from "@/components/paiements/tresorerie-comptes"
import { TresorerieProjection } from "@/components/paiements/tresorerie-projection"
import { TresorerieEcheances } from "@/components/paiements/tresorerie-echeances"
import { TresorerieEvolutionChart } from "@/components/paiements/tresorerie-evolution-chart"
import { TresorerieRecents } from "@/components/paiements/tresorerie-recents"
import { TresoreriePaiementsAttente } from "@/components/paiements/tresorerie-paiements-attente"
import { formatTND } from "@/lib/decimal"

const COMPTE_OPTIONS: Array<{ value: CompteFiltreTresorerie; label: string }> = [
    { value: "ALL", label: "Toutes les caisses" },
    { value: "CAISSE", label: "Caisse" },
    { value: "BANQUE", label: "Banque" },
]

export function TresorerieClient() {
    const [days, setDays] = useState(365)
    const [compte, setCompte] = useState<CompteFiltreTresorerie>("ALL")
    const companyId = useCompanyStore((s) => s.selectedCompanyId)
    const { data, isLoading, isError, refetch } = useTresorerie(days, compte, companyId)

    if (isLoading) return <ListSkeleton rows={6} columns={5} />
    if (isError) {
        return (
            <div className="p-6">
                <ErrorState title="Trésorerie indisponible" onRetry={() => refetch()} />
            </div>
        )
    }
    if (!data) {
        return (
            <div className="p-6">
                <Empty className="min-h-40">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><Wallet /></EmptyMedia>
                        <EmptyTitle>Aucune donnée de trésorerie</EmptyTitle>
                        <EmptyDescription>Enregistrez un règlement pour alimenter le suivi de trésorerie.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        )
    }

    const { solde, projection, ventilationMois, parCompte, recents, echeancier } = data
    const soldeNum = Number.parseFloat(solde.actuel)
    const prevNum = Number.parseFloat(solde.previsionnel)
    const enRetardNum = Number.parseFloat(solde.enRetard)

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
                <PageHeader
                    title="Trésorerie"
                    description="Position réelle, échéances et flux par mode de règlement"
                    actions={
                        <Select
                            value={compte}
                            onValueChange={(v) => {
                                if (v === "ALL" || v === "CAISSE" || v === "BANQUE") setCompte(v)
                            }}
                        >
                            <SelectTrigger className="h-9 w-[190px]" aria-label="Filtrer par compte de trésorerie">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {COMPTE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />

                <KpiGrid columns={3} className="xl:grid-cols-5">
                    <StatCard
                        title="Solde réel"
                        value={formatTND(solde.actuel)}
                        icon={Wallet}
                        subtitle={`${parCompte.length} compte${parCompte.length > 1 ? "s" : ""} de trésorerie`}
                        subtitleVariant={soldeNum < 0 ? "danger" : "default"}
                    />
                    <StatCard
                        title="À recevoir"
                        value={formatTND(solde.aRecevoir)}
                        icon={ArrowDownLeft}
                        subtitle="Encours d'encaissement"
                        subtitleVariant={Number.parseFloat(solde.aRecevoir) > 0 ? "success" : "default"}
                    />
                    <StatCard
                        title="À payer"
                        value={formatTND(solde.aPayer)}
                        icon={ArrowUpRight}
                        subtitle="Encours de décaissement"
                        subtitleVariant={Number.parseFloat(solde.aPayer) > 0 ? "danger" : "default"}
                    />
                    <StatCard
                        title="En retard"
                        value={formatTND(solde.enRetard)}
                        icon={AlertTriangle}
                        subtitle="Échéances échues"
                        subtitleVariant={enRetardNum > 0 ? "warning" : "default"}
                    />
                    <StatCard
                        title="Prévisionnel"
                        value={formatTND(solde.previsionnel)}
                        icon={ChartSpline}
                        subtitle={`Solde + à recevoir − à payer`}
                        subtitleVariant={prevNum < 0 ? "danger" : prevNum > 0 ? "success" : "default"}
                    />
                </KpiGrid>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    <TresorerieVentilationMois ventilation={ventilationMois} className="lg:col-span-2" />
                    <TresorerieComptes comptes={parCompte} />
                </div>

                <TresorerieProjection projection={projection} soldeActuel={solde.actuel} days={days} onDaysChange={setDays} />

                <TresorerieEcheances echeancier={echeancier} enRetard={solde.enRetard} compte={compte} />

                <ChartErrorBoundary>
                    <TresorerieEvolutionChart />
                </ChartErrorBoundary>

                <TresorerieRecents recents={recents} />

                <TresoreriePaiementsAttente pendingCheques={recents.pendingCheques} />
            </div>
        </div>
    )
}
