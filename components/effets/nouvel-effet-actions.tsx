"use client"

import { useRouter } from "next/navigation"
import { useEffetsMutations } from "@/hooks/use-effets"
import { useCompany } from "@/hooks/use-company-query"
import { useActiveCompanyId } from "@/hooks/use-active-company"
import { useEffetFormStore } from "@/lib/stores/effet-form-store"
import { notify } from "@/lib/notify"
import { resolveEffetForm } from "./effet-form-utils"
import { Button } from "@/components/ui/button"
import { X, Send, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function NouvelEffetActions() {
    const router = useRouter()
    const { createEffet } = useEffetsMutations()
    const [isPending, setIsPending] = useState(false)
    const companyId = useActiveCompanyId()
    const { data: companyData } = useCompany(companyId)

    const handleCreate = async () => {
        // Lecture non abonnée du store (même sémantique que l'ancien `getEffetFormData()`
        // appelé dans le handler) + dérivé pur pour obtenir tire/beneficiaire résolus.
        const form = resolveEffetForm(useEffetFormStore.getState().form, companyData?.company)
        if (form.type === "EMIS" && !form.fournisseurId) {
            notify.warning({
                title: "Sélectionnez un fournisseur",
                description: "Un effet émis doit être rattaché à un fournisseur : choisissez-en un dans « Achats liés » avant de créer l'effet.",
            })
            return
        }
        if (!form.tire || !form.montant || !form.dateEcheance) {
            const manquants = [
                !form.tire ? "le tiré" : null,
                !form.montant ? "le montant" : null,
                !form.dateEcheance ? "la date d'échéance" : null,
            ].filter((champ): champ is string => champ !== null)
            notify.warning({
                title: "Complétez les champs obligatoires",
                description: `Encore à renseigner : ${manquants.join(", ")}. Complétez le formulaire puis relancez la création.`,
            })
            return
        }

        setIsPending(true)
        const payload: Record<string, unknown> = {
            type: form.type,
            montant: parseFloat(form.montant),
            dateCreation: form.dateCreation,
            dateEcheance: form.dateEcheance,
            tire: form.tire,
            tireAdresse: form.tireAdresse || null,
            tireBanque: form.tireBanque || null,
            beneficiaire: form.beneficiaire,
            tireurId: form.tireurId || null,
            fournisseurId: form.fournisseurId || null,
            companyBankAccountId: form.companyBankAccountId || null,
            invoiceId: form.invoiceId || null,
            notes: form.notes || null,
            ordrePaiementNumero: form.ordrePaiementNumero || null,
            achatsLies: form.achatsLies.filter((a) => a.achatId && a.montantAlloue),
        }

        try {
            const result = await createEffet.mutateAsync(payload)
            router.push(`/effets/${result.effet.id}`)
        } catch (error) {
            notify.error({
                title: "Création de l'effet impossible",
                error,
                context: "lors de la création de l'effet",
            })
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/effets"><X className="h-3.5 w-3.5" />Annuler</Link>
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Créer l&apos;effet
            </Button>
        </div>
    )
}
