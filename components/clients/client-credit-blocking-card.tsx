"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CreditLimitDialog } from "./credit-limit-dialog"
import { formatTND } from "@/lib/decimal"
import { RefreshCw, Mail, ShieldAlert, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { notify } from "@/lib/notify"

interface ClientCreditBlockingCardProps {
  clientId: string
  creditLimit: string
  totalImpaye: string
  estBloque: boolean
  email?: string | null
  checkBlocage: { mutate: (args: undefined, opts: { onSuccess: (res: { message: string; estBloque?: boolean }) => void; onError: (err: { message: string }) => void }) => void; isPending: boolean }
  envoyerRappel: { mutate: (args: undefined, opts: { onSuccess: (res: { message: string }) => void; onError: (err: { message: string }) => void }) => void; isPending: boolean }
}

export function ClientCreditBlockingCard({
  clientId, creditLimit, totalImpaye, estBloque, email,
  checkBlocage, envoyerRappel,
}: ClientCreditBlockingCardProps) {
  const limit = parseFloat(creditLimit)
  const impaye = parseFloat(totalImpaye)
  const percent = limit > 0 ? Math.min((impaye / limit) * 100, 100) : 0

  return (
    <Card className="border-muted/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            Crédit & Blocage
          </CardTitle>
          {estBloque ? (
            <Badge variant="destructive" className="animate-pulse">Bloqué</Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Sain</Badge>
          )}
        </div>
        <CardDescription className="text-xs">Suivi du plafond de crédit et état de blocage.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-between items-center py-1 border-b border-muted/30">
          <span className="text-xs text-muted-foreground">Solde Impayé</span>
          <span className="text-sm font-bold text-red-600">{formatTND(totalImpaye)}</span>
        </div>

        {limit > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Utilisation du crédit</span>
              <span className={cn(
                percent >= 100 ? "text-destructive font-semibold" : percent >= 80 ? "text-amber-600 font-semibold" : "text-muted-foreground"
              )}>{percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-300",
                percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500"
              )} style={{ width: `${percent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Plafond autorisé</span>
              <span className="font-medium">{formatTND(creditLimit)}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
            <CreditCard className="size-4 text-muted-foreground" />
            Pas de limite de crédit définie.
          </div>
        )}

        {estBloque && (
          <div className="rounded-lg border border-red-200/40 bg-red-500/5 p-3 flex flex-col gap-2">
            <p className="text-xs text-red-600 leading-normal">
              Ce client a dépassé son plafond autorisé de <strong>{formatTND(creditLimit)}</strong> de <strong>{formatTND((impaye - limit).toString())}</strong>. La facturation est suspendue.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-red-300/30 text-red-700 hover:bg-red-500/10"
                onClick={() => checkBlocage.mutate(undefined, {
                  onSuccess: (res) => {
                    if (res.estBloque) notify.warning({ title: "Client toujours bloqué", description: res.message })
                    else notify.success({ title: "Blocage levé", description: res.message })
                  },
                  onError: (err) => notify.error({ title: "Vérification impossible", error: err, context: "vérification du blocage client" }),
                })}
                disabled={checkBlocage.isPending}
              >
                <RefreshCw className="size-3" /> Vérifier
              </Button>
              {email && (
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1"
                  onClick={() => envoyerRappel.mutate(undefined, {
                    onSuccess: (res) => notify.success({ title: "Rappel envoyé", description: res.message }),
                    onError: (err) => notify.error({ title: "Envoi du rappel impossible", error: err, context: "envoi du rappel de blocage" }),
                  })}
                  disabled={envoyerRappel.isPending}
                >
                  <Mail className="size-3" /> {envoyerRappel.isPending ? "Envoi..." : "Envoyer rappel"}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <CreditLimitDialog clientId={clientId} currentLimit={creditLimit} />
        </div>
      </CardContent>
    </Card>
  )
}
