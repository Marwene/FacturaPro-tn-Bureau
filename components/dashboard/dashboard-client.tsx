"use client"

import { useReducer } from "react"
import { useReducedMotion, motion } from "motion/react"
import { TrendingDown, Package, AlertTriangle, RotateCcw } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTND } from "@/lib/decimal"
import { useDashboardData } from "@/hooks/use-dashboard"
import { SectionCardsSection, SecondaryCardsSection } from "./dashboard-section-cards"
import dynamic from "next/dynamic"

const ChartSection = dynamic(
  () => import("./dashboard-chart-section").then((mod) => mod.ChartSection),
  { loading: () => <Skeleton className="h-[350px] rounded-xl" /> }
)

const FiscalChartSection = dynamic(
  () => import("./dashboard-fiscal-chart").then((mod) => mod.FiscalChartSection),
  { loading: () => <Skeleton className="h-[350px] rounded-xl" /> }
)
import { BottomSection } from "./dashboard-bottom-section"
import { DashboardSkeleton } from "./dashboard-skeleton"
import { FloatingAlert } from "@/components/factures/floating-alert"
import { Skeleton } from "@/components/ui/skeleton"

type TimeRange = "6m" | "3m" | "30d"

const rowVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

function timeRangeReducer(state: TimeRange, action: string): TimeRange {
  if (action === "6m" || action === "3m" || action === "30d") return action
  return state
}

export function DashboardClient() {
  const reduce = useReducedMotion()
  const { data, isLoading } = useDashboardData()
  const [timeRange, dispatchTimeRange] = useReducer(timeRangeReducer, "6m")

  if (isLoading) return <DashboardSkeleton />
  if (!data) return null

  const { stats, recentInvoices, topClients, monthlyData, recentMovements } = data

  const caVariation = parseFloat(stats.chiffreAffairesVariation)
  const isPositive = caVariation >= 0

  const visibleMonthly =
    timeRange === "6m" ? monthlyData
      : timeRange === "3m" ? monthlyData.slice(-3)
        : monthlyData.slice(-1)

  const maxCA = topClients.length > 0 ? parseFloat(topClients[0].totalCA) : 1

  const rows = [
    <SectionCardsSection key="section-cards" stats={stats} caVariation={caVariation} isPositive={isPositive} />,
    <SecondaryCardsSection key="secondary-cards" stats={stats} />,
    <div key="stock" className="px-4 lg:px-6">
      <div className="grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 gap-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              Valeur du Stock
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                Toutes sociétés
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{formatTND(stats.valeurStock ?? "0")}</CardTitle>
            <CardAction><Package className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">Prix de revient HT</div>
            <div className="text-muted-foreground">Valorisation totale du stock</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              Alertes Stock
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                Toutes sociétés
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-orange-600 dark:text-orange-400">{String(stats.alertesStock)}</CardTitle>
            <CardAction><AlertTriangle className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">Produits à réapprovisionner</div>
            <div className="text-muted-foreground">Stocks sous le seuil minimum</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              Produits en Rupture
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                Toutes sociétés
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-red-600 dark:text-red-400">{String(stats.produitsRupture ?? "0")}</CardTitle>
            <CardAction><TrendingDown className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">Stock épuisé</div>
            <div className="text-muted-foreground">Nécessite un réapprovisionnement urgent</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              Mouvements Récents
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                Toutes sociétés
              </span>
            </CardDescription>
            <CardAction><RotateCcw className="size-4 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {recentMovements && recentMovements.length > 0 ? (
              <ScrollArea className="h-20 px-4">
                {recentMovements.slice(0, 4).map((m: { id: string; type: string; quantite: string; product: { nom: string } | null }) => (
                  <div key={m.id} className="flex items-center justify-between py-1 text-[11px] border-b last:border-0">
                    <span className="truncate max-w-[120px]">{m.product?.nom ?? "N/A"}</span>
                    <span className={m.type === "ENTREE" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                      {m.type === "ENTREE" ? "+" : "-"}{m.quantite}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <div className="text-[11px] text-muted-foreground px-4 py-4">Aucun mouvement</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>,
    <div key="charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
      <ChartSection monthlyData={visibleMonthly} timeRange={timeRange} onTimeRangeChange={dispatchTimeRange} />
      <FiscalChartSection monthlyData={monthlyData} />
    </div>,
    <BottomSection key="bottom" recentInvoices={recentInvoices} topClients={topClients} maxCA={maxCA} />,
  ].filter(Boolean)

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {rows.map((row, i) =>
          reduce ? (
            <div key={i}>{row as React.ReactNode}</div>
          ) : (
            <motion.div key={i} custom={i} variants={rowVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
              {row as React.ReactNode}
            </motion.div>
          )
        )}
      </div>
      <FloatingAlert />
    </div>
  )
}
