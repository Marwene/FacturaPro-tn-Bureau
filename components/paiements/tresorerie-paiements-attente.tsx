"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Clock } from "lucide-react"
import { usePaymentsList, useUpdatePayment } from "@/hooks/use-queries"
import { ModeReglementBadge } from "@/components/shared/mode-reglement-badge"
import { MoneyCell } from "@/components/shared/money-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import type { TresorerieRecents } from "@/lib/types/tresorerie"

interface TresoreriePaiementsAttenteProps {
    pendingCheques: TresorerieRecents["pendingCheques"]
}

interface LigneAttente {
    id: string
    montant: number
    date: string
    label: string
    reference: string | null
    type: "CHEQUE" | "VIREMENT"
    invoiceId?: string | null
    achatId?: string | null
}

export function TresoreriePaiementsAttente({ pendingCheques }: TresoreriePaiementsAttenteProps) {
    const router = useRouter()
    const { data, isLoading } = usePaymentsList({ status: "EN_ATTENTE" })
    const updatePayment = useUpdatePayment()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const pendingPayments = useMemo(() => data?.payments ?? [], [data?.payments])

    const allPending = useMemo<LigneAttente[]>(() => {
        const paiements: LigneAttente[] = pendingPayments.map((p) => ({
            id: p.id,
            montant: Number.parseFloat(p.montant),
            date: p.dateReglement instanceof Date ? p.dateReglement.toISOString() : String(p.dateReglement),
            label: p.tiers?.raisonSociale ?? "—",
            reference: p.reference,
            type: "VIREMENT",
            invoiceId: p.invoiceId,
            achatId: p.achatId,
        }))
        const cheques: LigneAttente[] = pendingCheques.map((c) => ({
            id: `cheque-${c.id}`,
            montant: c.montant,
            date: c.date,
            label: c.client ?? c.beneficiaire,
            reference: c.numero,
            type: "CHEQUE",
        }))
        return [...paiements, ...cheques].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [pendingPayments, pendingCheques])

    const allSelected = pendingPayments.length > 0 && selectedIds.size === pendingPayments.length
    const someSelected = selectedIds.size > 0 && !allSelected

    const toggleAll = useCallback(() => {
        setSelectedIds(allSelected || someSelected ? new Set<string>() : new Set(pendingPayments.map((p) => p.id)))
    }, [allSelected, someSelected, pendingPayments])

    const toggleOne = useCallback((id: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleBulkConfirm = useCallback(async () => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return

        const results = await Promise.allSettled(
            ids.map((id) => updatePayment.mutateAsync({ id, status: "CONFIRME" })),
        )

        const succeeded = results.filter((r) => r.status === "fulfilled").length
        const failed = results.length - succeeded

        if (succeeded > 0) {
            notify.success({ title: `${succeeded} paiement${succeeded > 1 ? "s" : ""} confirmé${succeeded > 1 ? "s" : ""}` })
        }
        if (failed > 0) {
            const firstRejected = results.find((r) => r.status === "rejected")
            notify.error({
                title: `${failed} paiement${failed > 1 ? "s" : ""} non confirmé${failed > 1 ? "s" : ""}`,
                error: firstRejected && firstRejected.status === "rejected" ? firstRejected.reason : "Erreur inconnue lors de la confirmation.",
                context: "confirmation en masse des paiements",
            })
        }
        setSelectedIds(new Set())
    }, [selectedIds, updatePayment])

    const handleConfirm = useCallback((ligne: LigneAttente) => {
        const lien = ligne.invoiceId
            ? `/factures/${ligne.invoiceId}`
            : ligne.achatId
                ? `/achats/${ligne.achatId}`
                : null
        updatePayment.mutate(
            { id: ligne.id, status: "CONFIRME" },
            {
                onSuccess: () =>
                    notify.success({
                        title: "Paiement confirmé",
                        ...(lien
                            ? { action: { label: "Voir le document", onClick: () => router.push(lien) } }
                            : {}),
                    }),
                onError: (error) => notify.error({ title: "Confirmation impossible", error, context: "confirmation du paiement" }),
            },
        )
    }, [updatePayment, router])

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
        )
    }

    if (allPending.length === 0) return null

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paiements en attente</span>
                    <Badge variant="outline" className="text-[10px]">{allPending.length}</Badge>
                </div>
                {selectedIds.size > 0 && (
                    <Button size="sm" className="h-7 text-xs" disabled={updatePayment.isPending} onClick={handleBulkConfirm}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Confirmer la sélection ({selectedIds.size})
                    </Button>
                )}
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th scope="col" className="w-10 px-4 py-2.5">
                                    <Checkbox
                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                        onCheckedChange={toggleAll}
                                        aria-label="Sélectionner tous les paiements"
                                    />
                                </th>
                                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Date</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Référence</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Client</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mode</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Montant</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {allPending.map((item) => (
                                <tr
                                    key={item.id}
                                    className={cn("transition-colors hover:bg-muted/30", selectedIds.has(item.id) && "bg-muted/20")}
                                >
                                    <td className="px-4 py-2.5">
                                        <Checkbox
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={() => toggleOne(item.id)}
                                            aria-label={`Sélectionner ${item.label}`}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString("fr-TN")}</td>
                                    <td className="px-4 py-2.5 text-xs font-medium font-mono">{item.reference ?? "—"}</td>
                                    <td className="max-w-[200px] truncate px-4 py-2.5 text-xs font-medium">{item.label}</td>
                                    <td className="px-4 py-2.5">
                                        <ModeReglementBadge mode={item.type} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                        <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                            <MoneyCell value={item.montant} />
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {item.id.startsWith("cheque-") ? (
                                            <span className="text-xs text-muted-foreground" title="Un chèque en attente se confirme depuis le module Chèques">
                                                Module Chèques
                                            </span>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                aria-label={`Confirmer le paiement de ${item.label}`}
                                                disabled={updatePayment.isPending}
                                                onClick={() => handleConfirm(item)}
                                            >
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
