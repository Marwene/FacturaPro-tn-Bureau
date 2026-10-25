"use client"

import { useEffetDetail, useEffetsMutations } from "@/hooks/use-effets"
import { useCompany } from "@/hooks/use-company-query"
import { useCompanyId } from "@/hooks/use-queries-shared"
import { useEffetSplits } from "@/hooks/use-effet-splits"
import { useTmmBct } from "@/hooks/use-tmm-bct"
import { EffetStatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { deserializeDecimal } from "@/lib/decimal"
import { MoneyCell } from "@/components/shared/money-cell"
import { PageHeader } from "@/components/shared/page-header"
import { FormField } from "@/components/shared/form-field"
import { formatDateShort } from "@/lib/utils"
import {
    ArrowLeft, Landmark, ArrowLeftRight, Ban, CheckCircle2, XCircle,
    Building2, Banknote, FileText, ArrowDownToLine, ArrowUpFromLine,
    ShoppingCart, Printer, Wallet, AlertTriangle, Users, User,
    GitFork, ExternalLink, CalendarDays, CreditCard,
    ChevronRight, Hash, MapPin, Building, Percent,
} from "lucide-react"
import type { EffetStatus, SerializedEffet } from "@/lib/types"
import Link from "next/link"
import { useCallback, useState } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ApercuEffetDialog } from "./apercu-effet-dialog"

function computeNetEncaisse(montant: string, taux: string, frais: string): string {
    const m = deserializeDecimal(montant)
    const t = deserializeDecimal(taux)
    const f = deserializeDecimal(frais)
    const net = m.minus(m.times(t).div(100)).minus(f)
    return net.gte(0) ? net.toFixed(4) : "0.0000"
}

const statusSteps: { key: EffetStatus; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: "EN_PORTEFEUILLE", icon: Wallet, label: "Créé" },
    { key: "REMIS_ESCOMPTE", icon: Landmark, label: "Escompté" },
    { key: "ENDOSSE", icon: ArrowLeftRight, label: "Endossé" },
    { key: "PAYE", icon: CheckCircle2, label: "Payé" },
]

export function EffetDetailClient({ id }: { id: string }) {
    const { data, isLoading, isError } = useEffetDetail(id)
    const { updateStatus } = useEffetsMutations()
    const [actionDialog, setActionDialog] = useState<{
        action: EffetStatus
        title: string
        fields?: { key: string; label: string; type: string }[]
    } | null>(null)
    const [actionData, setActionData] = useState<Record<string, string>>({})
    const [showPreview, setShowPreview] = useState(false)
    const [confirmPayOpen, setConfirmPayOpen] = useState(false)
    const companyId = useCompanyId()
    const { data: companyData } = useCompany(companyId ?? null)

    const handleAction = useCallback(() => {
        if (!actionDialog) return
        const payload: Record<string, unknown> = { status: actionDialog.action }
        for (const [k, v] of Object.entries(actionData)) payload[k] = v
        const montant = data?.effet?.montant
        if (actionDialog.action === "REMIS_ESCOMPTE" && montant && actionData.tauxEscompte && actionData.tauxEscompte.trim() !== "") {
            payload.frais = deserializeDecimal(montant).times(deserializeDecimal(actionData.tauxEscompte)).div(100).toFixed(4)
        }
        updateStatus.mutate({ id, ...payload })
        setActionDialog(null)
        setActionData({})
    }, [actionDialog, actionData, data, id, updateStatus])

    const { data: splitData } = useEffetSplits(id)

    const isRECU = data?.effet?.type === "RECU"
    const montantEffet = data?.effet?.montant ?? "0"
    const isEscompteRecu = isRECU && actionDialog?.action === "REMIS_ESCOMPTE"
    const { data: tmmData, isLoading: tmmLoading } = useTmmBct(!!isEscompteRecu)
    const [prefilledTmm, setPrefilledTmm] = useState<string | null>(null)

    if (isEscompteRecu && tmmData?.tmm && prefilledTmm !== tmmData.tmm) {
        setPrefilledTmm(tmmData.tmm)
        setActionData((prev) => {
            if (prev.tauxEscompte && prev.tauxEscompte.trim() !== "") return prev
            const taux = deserializeDecimal(tmmData.tmm).plus(3).toFixed(2)
            return {
                ...prev,
                tauxEscompte: taux,
                netEncaisse: computeNetEncaisse(montantEffet, taux, prev.frais ?? ""),
            }
        })
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-3 gap-6">
                    <Skeleton className="h-40 col-span-2 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Effet introuvable
            </div>
        )
    }

    const { effet, payEligibility } = data
    const isSplitEffet = !!(effet.splitGroup && effet.splitTotal && effet.splitTotal > 1)
    const splitSiblings = (splitData?.effets ?? []).filter((e: SerializedEffet) => e.id !== id)
    const escompte = deserializeDecimal(effet.montant).times(deserializeDecimal(actionData.tauxEscompte ?? "0")).div(100).toFixed(4)
    const benAdresse = isRECU ? (companyData?.company?.adresse ?? "—") : (effet.fournisseur?.adresse)
    const benBanque = isRECU ? (effet.companyBank?.nomBanque ?? "—") : (effet.fournisseur?.banque ?? "—")
    const benRib = isRECU ? (effet.companyBank?.rib ?? "") : (effet.fournisseur?.ribBancaire ? ` ${effet.fournisseur?.ribBancaire}` : "")
    const showBenAdresse = isRECU ? !!companyData?.company?.adresse : !!effet.tireAdresse
    const showBenRib = isRECU ? !!effet.companyBank?.rib : !!effet.companyBank

    const handleFieldChange = (key: string, value: string) => {
        setActionData((prev) => {
            const next = { ...prev, [key]: value }
            if (isEscompteRecu && (key === "tauxEscompte" || key === "frais")) {
                next.netEncaisse = computeNetEncaisse(effet.montant, next.tauxEscompte ?? "", next.frais ?? "")
            }
            return next
        })
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Breadcrumb + back */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Link href="/effets" className="hover:text-foreground transition-colors">Effets</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{effet.numero}</span>
            </div>

            {/* Hero section */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/30 p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1.5" asChild>
                                <Link href="/effets"><ArrowLeft className="h-4 w-4" /></Link>
                            </Button>
                            <PageHeader title={effet.numero} className="min-w-0" />
                            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                                {isRECU ? <ArrowDownToLine className="h-3 w-3 text-blue-600" /> : <ArrowUpFromLine className="h-3 w-3 text-amber-600" />}
                                {isRECU ? "Reçu" : "Émis"}
                            </Badge>
                            <EffetStatusBadge status={effet.status as EffetStatus} />
                            {isSplitEffet && (
                                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                                    <GitFork className="h-3 w-3" />
                                    Split {effet.splitIndex}/{effet.splitTotal}
                                </Badge>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-1 text-[10px]">
                            {statusSteps.map((step, i) => {
                                const Icon = step.icon
                                const currentIndex = statusSteps.findIndex((s) => s.key === effet.status)
                                const done = i <= currentIndex && effet.status !== "IMPAYE"
                                const active = i === currentIndex && effet.status !== "IMPAYE"
                                const isLast = i === statusSteps.length - 1
                                return (
                                    <div key={step.key} className="flex items-center gap-1">
                                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${active ? "bg-primary/10 text-primary font-semibold" :
                                            done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                "bg-muted text-muted-foreground"
                                            }`}>
                                            <Icon className="h-3 w-3" />
                                            <span className="hidden sm:inline">{step.label}</span>
                                        </div>
                                        {!isLast && <div className={`h-px w-3 ${i < currentIndex && effet.status !== "IMPAYE" ? "bg-emerald-400" : "bg-border"}`} />}
                                    </div>
                                )
                            })}
                            {(effet.status === "IMPAYE" || effet.status === "ANNULE") && (
                                <>
                                    <div className="h-px w-3 bg-red-400" />
                                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${effet.status === "IMPAYE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                        "bg-muted text-muted-foreground"
                                        }`}>
                                        {effet.status === "IMPAYE" ? <Ban className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        <span className="hidden sm:inline">{effet.status === "IMPAYE" ? "Impayé" : "Annulé"}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Quick meta row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Échéance {formatDateShort(effet.dateEcheance)}</span>
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {effet.tire}</span>
                        </div>
                    </div>

                    {/* Montant — bien en évidence */}
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Montant</p>
                        <p className="text-3xl font-bold tracking-tight"><MoneyCell value={effet.montant} /></p>
                        {effet.tauxEscompte && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Taux {effet.tauxEscompte}% · Net {effet.netEncaisse ? <MoneyCell value={effet.netEncaisse} /> : "—"}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Colonne principale — Parties + Financier */}
                <div className="col-span-2 space-y-6">
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
                            {companyData?.company?.matriculeFiscal && <p className="text-xs text-muted-foreground mt-1">MF: {companyData.company.matriculeFiscal}</p>}
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

                    {/* Notes avec badge split */}
                    {effet.notes && (
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                            </div>
                            <div className="p-4 flex items-start gap-3 text-sm">
                                {isSplitEffet && (
                                    <Badge variant="secondary" className="gap-1.5 text-xs px-2.5 py-1 shrink-0">
                                        <GitFork className="h-3.5 w-3.5" />
                                        {effet.tire} — SPLIT {effet.splitIndex}/{effet.splitTotal}
                                    </Badge>
                                )}
                                <span>{effet.notes}</span>
                            </div>
                        </div>
                    )}

                    {/* Split siblings */}
                    {isSplitEffet && splitSiblings.length > 0 && (
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                                <GitFork className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Effets liés (Split {effet.splitIndex}/{effet.splitTotal})
                                </span>
                            </div>
                            <div className="p-2 space-y-1">
                                {[...splitSiblings].sort((a: SerializedEffet, b: SerializedEffet) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0)).map((e: SerializedEffet) => (
                                    <Link key={e.id} href={`/effets/${e.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium">{e.numero}</span>
                                            {e.splitIndex && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 h-4">{e.splitIndex}/{effet.splitTotal}</Badge>
                                            )}
                                            <EffetStatusBadge status={e.status as EffetStatus} />
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MoneyCell value={e.montant} className="font-medium text-foreground" />
                                            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Achats liés */}
                    {effet.achatsLies && effet.achatsLies.length > 0 && (
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achats liés</span>
                            </div>
                            <div className="p-2 space-y-1">
                                {effet.achatsLies.map((lien) => (
                                    <div key={lien.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-muted/20">
                                        <span className="font-mono">{lien.achat?.numero ?? lien.achatId}</span>
                                        <MoneyCell value={lien.montantAlloue} className="font-medium" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Colonne droite — sticky */}
                <div className="space-y-4">
                    <div className="sticky top-20 space-y-4">
                        {/* Financier */}
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financier</span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Valeur nominale</span>
                                    <MoneyCell value={effet.montant} className="font-bold text-base" />
                                </div>
                                {effet.tauxEscompte && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Taux</span>
                                        <span>{effet.tauxEscompte}%</span>
                                    </div>
                                )}
                                {effet.frais && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Escompte</span>
                                        <span className="text-red-600">-<MoneyCell value={effet.frais} /></span>
                                    </div>
                                )}
                                {effet.netEncaisse && (
                                    <>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium">Net encaissé</span>
                                            <MoneyCell value={effet.netEncaisse} className="font-bold text-emerald-600" />
                                        </div>
                                    </>
                                )}
                                {effet.fraisProtet && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Protêt</span>
                                        <MoneyCell value={effet.fraisProtet} className="text-red-600" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="px-4 py-3 border-b bg-muted/20">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
                            </div>
                            <div className="p-2 space-y-1">
                                {effet.type === "EMIS" && (
                                    <Button variant="default" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => setShowPreview(true)}>
                                        <Printer className="h-3.5 w-3.5" /> Aperçu / Imprimer
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                                    onClick={() => setActionDialog({
                                        action: "REMIS_ESCOMPTE", title: "Remettre à l'escompte", fields: [
                                            { key: "tauxEscompte", label: "Taux (%)", type: "number" },
                                            { key: "netEncaisse", label: "Net encaissé (DT)", type: "number" },
                                        ]
                                    })}
                                    disabled={effet.status !== "EN_PORTEFEUILLE"}>
                                    <Landmark className="h-3.5 w-3.5" /> Escompte
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                                    onClick={() => setActionDialog({ action: "ENDOSSE", title: "Endosser", fields: [{ key: "endosseA", label: "Endossé à", type: "text" }] })}
                                    disabled={effet.status !== "EN_PORTEFEUILLE"}>
                                    <ArrowLeftRight className="h-3.5 w-3.5" /> Endosser
                                </Button>
                                <Button variant="destructive" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                                    onClick={() => setActionDialog({
                                        action: "IMPAYE", title: "Marquer impayé", fields: [
                                            { key: "motifImpaye", label: "Motif", type: "text" },
                                            { key: "fraisProtet", label: "Frais de protêt (DT)", type: "number" },
                                        ]
                                    })}
                                    disabled={effet.status !== "REMIS_ESCOMPTE" && effet.status !== "ENDOSSE"}>
                                    <Ban className="h-3.5 w-3.5" /> Impayé
                                </Button>
                                <Separator className="my-1" />
                                {effet.status !== "PAYE" && effet.status !== "ANNULE" && payEligibility && (
                                    <div className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${payEligibility.canPay
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                        }`}>
                                        {payEligibility.canPay ? (
                                            <>
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Paiement autorisé
                                                </span>
                                                <span className="mt-1 block opacity-80">
                                                    {payEligibility.hoursElapsed}h ouvrées écoulées (min. {payEligibility.hoursRequired}h).
                                                    {effet.invoice && <> La facture {effet.invoice.numero} sera mise à jour.</>}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <AlertTriangle className="h-3.5 w-3.5" /> Paiement en attente
                                                </span>
                                                <span className="mt-1 block opacity-80">
                                                    {payEligibility.hoursElapsed}h / {payEligibility.hoursRequired}h ouvrées — payable à partir du {formatDateShort(payEligibility.payableAt) || "—"}.
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <Button variant="default" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                                    onClick={() => setConfirmPayOpen(true)}
                                    disabled={effet.status === "PAYE" || effet.status === "ANNULE" || !payEligibility?.canPay}>
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Payé
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 text-red-600 hover:text-red-700"
                                    onClick={() => updateStatus.mutate({ id, status: "ANNULE" as EffetStatus })}
                                    disabled={effet.status === "PAYE" || effet.status === "ANNULE"}>
                                    <Ban className="h-3.5 w-3.5" /> Annuler
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action dialogs */}
            <Dialog open={!!actionDialog} onOpenChange={(o) => { if (!o) setActionDialog(null) }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{actionDialog?.title}</DialogTitle>
                        <DialogDescription>Confirmez sur {effet.numero}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {actionDialog?.fields?.map((f) => (
                            <FormField key={f.key} label={f.label} className="gap-1">
                                <Input type={f.type} className="h-8 text-sm" value={actionData[f.key] ?? ""}
                                    onChange={(e) => handleFieldChange(f.key, e.target.value)} />
                                {isEscompteRecu && f.key === "tauxEscompte" && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {tmmLoading
                                            ? "Chargement du TMM…"
                                            : tmmData?.tmm
                                                ? `TMM ${tmmData.tmm}% + 3% banque`
                                                : "TMM indisponible — saisir manuellement"}
                                    </p>
                                )}
                            </FormField>
                        ))}
                        {isEscompteRecu && (
                            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Valeur nominale</span>
                                    <MoneyCell value={effet.montant} className="font-medium" />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Escompte ({actionData.tauxEscompte ?? "0"}%)</span>
                                    <span className="text-red-600">-<MoneyCell value={escompte} /></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs font-medium">Net encaissé</span>
                                    <MoneyCell value={actionData.netEncaisse} className="font-bold text-emerald-600" />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setActionDialog(null)}>Annuler</Button>
                        <Button size="sm" onClick={handleAction}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation paiement */}
            <Dialog open={confirmPayOpen} onOpenChange={setConfirmPayOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirmer le paiement</DialogTitle>
                        <DialogDescription>
                            Confirmez que le paiement de cet effet a bien été effectué. Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Effet</span>
                            <span className="font-mono font-medium">{effet.numero}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Montant</span>
                            <MoneyCell value={effet.montant} className="font-semibold" />
                        </div>
                        {isRECU && effet.netEncaisse && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Net encaissé</span>
                                <div className="text-right">
                                    <MoneyCell value={effet.netEncaisse} className="font-semibold text-emerald-600" />
                                    {effet.invoice && (
                                        <p className="text-[10px] text-muted-foreground">appliqué à la facture {effet.invoice.numero}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {effet.invoice && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Facture liée</span>
                                <span className="font-mono font-medium">{effet.invoice.numero}</span>
                            </div>
                        )}
                        {isRECU && effet.invoice && (
                            <p className="text-[11px] text-muted-foreground pt-1">
                                {effet.netEncaisse
                                    ? `Le net encaissé sera enregistré en trésorerie et appliqué à la facture ${effet.invoice.numero} (montant payé / reste à payer).`
                                    : `Le paiement sera enregistré et la facture ${effet.invoice.numero} mise à jour (montant payé / reste à payer).`}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setConfirmPayOpen(false)}>Annuler</Button>
                        <Button size="sm" onClick={() => {
                            updateStatus.mutate({ id, status: "PAYE" as EffetStatus })
                            setConfirmPayOpen(false)
                        }}>
                            Confirmer le paiement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview */}
            <ApercuEffetDialog
                effet={effet}
                open={showPreview}
                onOpenChange={setShowPreview}
                companyName={companyData?.company?.name}
                splitEffets={isSplitEffet ? splitSiblings : undefined}
            />
        </div>
    )
}
