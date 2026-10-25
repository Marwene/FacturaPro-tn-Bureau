"use client"

import { TrendingDown, TrendingUp, FileText, Clock, Receipt, Users } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTND } from "@/lib/decimal"

export function SectionCardsSection({
  stats, caVariation, isPositive,
}: {
  stats: Record<string, string>
  caVariation: number
  isPositive: boolean
}) {
  return (
    <div className="*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Chiffre d&apos;Affaires</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.chiffreAffaires)}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {isPositive ? "+" : ""}{caVariation.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositive ? "En hausse" : "En baisse"} ce mois
            {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">Évolution vs. mois dernier</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Créances en Attente</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.creancesEnAttente)}</CardTitle>
          <CardAction><FileText className="size-4 text-muted-foreground" /></CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">{stats.creancesFactures} factures impayées</div>
          <div className="text-muted-foreground">En attente de règlement</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Montant en Retard</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.montantEnRetard)}</CardTitle>
          <CardAction>
            <Badge variant="outline" className={Number(stats.retardFactures) > 0 ? "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400" : ""}>
              <Clock className="size-3" />{stats.retardFactures}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {Number(stats.retardFactures) > 0 ? "Factures urgentes" : "Aucun retard"}
          </div>
          <div className="text-muted-foreground">Dépassent l&apos;échéance</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>TVA du Mois</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.tvaDuMois)}</CardTitle>
          <CardAction><Receipt className="size-4 text-muted-foreground" /></CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">À déclarer avant le 20</div>
          <div className="text-muted-foreground">Taxe sur la valeur ajoutée</div>
        </CardFooter>
      </Card>
    </div>
  )
}

export function SecondaryCardsSection({ stats }: { stats: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      <Card className="@container/card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        <CardHeader>
          <CardDescription>Total Devis</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{String(stats.devisCount)}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="size-3" />{stats.devisTauxConversion}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Taux de conversion <TrendingUp className="size-4" /></div>
          <div className="text-muted-foreground">Devis transformés en factures</div>
        </CardFooter>
      </Card>
      <Card className="@container/card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            Nouveaux Clients
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
              Toutes sociétés
            </span>
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{String(stats.nouveauxClients)}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1"><Users className="size-3" />+{stats.nouveauxClientsMois}</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Acquisitions ce mois <Users className="size-4" /></div>
          <div className="text-muted-foreground">Nouveaux clients enregistrés</div>
        </CardFooter>
      </Card>
    </div>
  )
}
