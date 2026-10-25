import { useState } from "react"
import { CalendarClock, Landmark, Loader2, Pencil, Wallet } from "lucide-react"
import { SectionCard } from "@/components/shared/section-card"
import { FormField } from "@/components/shared/form-field"
import { MoneyCell } from "@/components/shared/money-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { formatDate } from "@/lib/utils"
import { usePermissions } from "@/lib/use-permissions"
import { useUpdateCompteSolde } from "@/hooks/use-tresorerie"
import type { TresorerieCompte } from "@/lib/types/tresorerie"

interface TresorerieComptesProps {
    comptes: TresorerieCompte[]
    className?: string
}

const TYPE_LABELS: Record<TresorerieCompte["type"], string> = { CAISSE: "Caisse", BANQUE: "Banque" }
const MONTANT_STOCKAGE = /^-?\d+([.,]\d{1,3})?$/

export function TresorerieComptes({ comptes, className }: TresorerieComptesProps) {
    const { can } = usePermissions()
    const peutModifier = can("paiements:modifier")
    const [compteEnEdition, setCompteEnEdition] = useState<TresorerieCompte | null>(null)
    const [soldeInitial, setSoldeInitial] = useState("")
    const [dateSoldeInitial, setDateSoldeInitial] = useState("")
    const [erreur, setErreur] = useState<string | undefined>(undefined)
    const majSolde = useUpdateCompteSolde()

    const ouvrir = (compte: TresorerieCompte) => {
        setCompteEnEdition(compte)
        setSoldeInitial(compte.soldeInitial)
        setDateSoldeInitial(compte.dateSoldeInitial.slice(0, 10))
        setErreur(undefined)
    }

    const fermer = () => {
        if (majSolde.isPending) return
        setCompteEnEdition(null)
    }

    const enregistrer = () => {
        if (!compteEnEdition) return
        const valeur = soldeInitial.trim().replace(",", ".")
        if (!MONTANT_STOCKAGE.test(valeur)) {
            setErreur("Montant invalide : utilisez un nombre à 3 décimales au maximum (ex. 1250.000).")
            return
        }
        majSolde.mutate(
            { id: compteEnEdition.id, soldeInitial: valeur, dateSoldeInitial: dateSoldeInitial || undefined },
            {
                onSuccess: () => notify.success({ title: "Solde initial mis à jour", description: `Compte ${compteEnEdition.libelle}` }),
                onError: (error) => notify.error({ title: "Solde initial non enregistré", error, context: "mise à jour du solde initial" }),
                onSettled: () => setCompteEnEdition(null),
            },
        )
    }

    return (
        <SectionCard
            title="Comptes"
            description="Solde réalisé par compte de trésorerie"
            className={className}
            contentClassName="p-0"
        >
            <div className="divide-y">
                {comptes.map((compte) => (
                    <div key={compte.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            {compte.type === "CAISSE" ? <Wallet className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{compte.libelle}</p>
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarClock className="h-3 w-3" />
                                Solde initial depuis le {formatDate(compte.dateSoldeInitial)}
                            </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[compte.type]}</Badge>
                        <MoneyCell value={compte.solde} className="text-sm font-semibold" />
                        {peutModifier && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={`Modifier le solde initial de ${compte.libelle}`}
                                onClick={() => ouvrir(compte)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <Dialog open={compteEnEdition !== null} onOpenChange={(open) => !open && fermer()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Solde initial — {compteEnEdition?.libelle}</DialogTitle>
                        <DialogDescription>
                            Le solde initial fixe le point de départ du compte ; les mouvements réalisés sont calculés à partir de cette date.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            enregistrer()
                        }}
                    >
                        <FormField label="Solde initial" required error={erreur} description="Montant en DT, 3 décimales.">
                            <Input
                                value={soldeInitial}
                                onChange={(event) => {
                                    setSoldeInitial(event.target.value)
                                    setErreur(undefined)
                                }}
                                inputMode="decimal"
                                autoComplete="off"
                                aria-invalid={erreur !== undefined}
                                placeholder="0.000"
                            />
                        </FormField>
                        <FormField label="Date du solde initial">
                            <Input
                                type="date"
                                value={dateSoldeInitial}
                                onChange={(event) => setDateSoldeInitial(event.target.value)}
                            />
                        </FormField>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={fermer} disabled={majSolde.isPending}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={majSolde.isPending}>
                                {majSolde.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                                {majSolde.isPending ? "Enregistrement…" : "Enregistrer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SectionCard>
    )
}
