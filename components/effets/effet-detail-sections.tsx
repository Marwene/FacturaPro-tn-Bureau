"use client"

import { Separator } from "@/components/ui/separator"
import { formatDateShort } from "@/lib/utils"
import {
    Building2, FileText, User, GitFork, AlertTriangle,
    Hash, MapPin, Building, ArrowLeftRight, CreditCard, CalendarDays,
} from "lucide-react"
import type { CompanyDetail } from "@/hooks/use-company-query"
import type { EffetForDetail } from "./effet-detail-logic"

interface EffetDetailSectionsProps {
    effet: EffetForDetail
    isRECU: boolean
    company: CompanyDetail | null | undefined
}

export function EffetDetailSections({ effet, isRECU, company }: EffetDetailSectionsProps) {
    const benAdresse = isRECU ? (company?.adresse ?? "—") : (effet.fournisseur?.adresse)
    const benBanque = isRECU ? (effet.companyBank?.nomBanque ?? "—") : (effet.fournisseur?.banque ?? "—")
    const benRib = isRECU ? (effet.companyBank?.rib ?? "") : (effet.fournisseur?.ribBancaire ? ` ${effet.fournisseur?.ribBancaire}` : "")
    const showBenAdresse = isRECU ? !!company?.adresse : !!effet.tireAdresse
    const showBenRib = isRECU ? !!effet.companyBank?.rib : !!effet.companyBank

    return (
        <>
            {/* Parties prenantes — disposition visuelle */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bénéficiaire</span>
                    </div>
                    <p className="font-bold text-sm">{effet.beneficiaire}</p>
                    {effet.fournisseur?.banque && <p className="text-xs text-muted-foreground mt-1">{effet.fournisseur?.banque}</p>}
                    {company?.matriculeFiscal && <p className="text-xs text-muted-foreground mt-1">MF: {company.matriculeFiscal}</p>}
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Building className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emetteur</span>
                    </div>
                    <p className="font-bold text-sm truncate">{effet.tire}</p>
                    {effet.tireBanque && <p className="text-xs text-muted-foreground mt-1">{effet.tireBanque}</p>}
                </div>
            </div>

            {/* Infos détaillées — flow visuel */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails Emetteur</span>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                        <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Tiré:</span>
                            <span className="font-medium">{effet.tire}</span>
                        </div>
                        {effet.tireAdresse && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Adresse:</span>
                                <span className="font-medium">{effet.tireAdresse}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Banque:</span>
                            <span className="font-medium">{effet.tireBanque ?? "—"}</span>
                        </div>
                        {effet.companyBank && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">RIB:</span>
                                <span className="font-medium">{effet.companyBank.rib ? ` ${effet.companyBank.rib}` : ""}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Création:</span>
                            <span className="font-medium">{formatDateShort(effet.dateCreation)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Échéance:</span>
                            <span className="font-medium">{formatDateShort(effet.dateEcheance)}</span>
                        </div>
                        {effet.ordrePaiementNumero && (
                            <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Ordre paiement:</span>
                                <span className="font-medium font-mono">{effet.ordrePaiementNumero}</span>
                            </div>
                        )}
                        {effet.dateRemise && (
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Remise:</span>
                                <span className="font-medium">{formatDateShort(effet.dateRemise) || "—"}</span>
                            </div>
                        )}
                        {effet.endosseLe && (
                            <div className="flex items-center gap-2">
                                <GitFork className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Endossé le:</span>
                                <span className="font-medium">{formatDateShort(effet.endosseLe) || "—"}</span>
                            </div>
                        )}
                        {effet.endosseA && (
                            <div className="flex items-center gap-2 col-span-2">
                                <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Endossé à:</span>
                                <span className="font-medium">{effet.endosseA}</span>
                            </div>
                        )}
                        {effet.motifImpaye && (
                            <div className="flex items-center gap-2 col-span-2">
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Motif impayé:</span>
                                <span className="font-medium text-red-600">{effet.motifImpaye}</span>
                            </div>
                        )}
                    </div>
                </div>
                <Separator />
                <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails Bénéficiaire</span>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                        <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Tireur:</span>
                            <span className="font-medium">{effet.beneficiaire}</span>
                        </div>
                        {showBenAdresse && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">Adresse:</span>
                                <span className="font-medium">{benAdresse}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground text-xs w-24">Banque:</span>
                            <span className="font-medium">{benBanque}</span>
                        </div>
                        {showBenRib && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground text-xs w-24">RIB:</span>
                                <span className="font-medium">{benRib}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
