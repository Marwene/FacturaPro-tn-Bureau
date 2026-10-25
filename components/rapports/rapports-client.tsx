"use client"

import { useState } from "react"
import { useReports } from "@/hooks/use-queries"
import { useReportsStore } from "@/lib/stores/ui-store"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatTND } from "@/lib/decimal"
import { exportReportPDF, exportReportExcel } from "@/lib/export-report"
import { Download, FileText, TrendingUp, TrendingDown, BarChart3, FileSpreadsheet, FileDown, Building2 } from "lucide-react"
import { notify } from "@/lib/notify"

const COLORS = ["#f97316", "#14b8a6", "#6b7280", "#8b5cf6", "#f59e0b"]

const chartConfig = {
    ca: { label: "CA", color: "var(--chart-2)" },
    tva: { label: "TVA", color: "var(--chart-1)" },
    fodec: { label: "FODEC", color: "var(--chart-3)" },
    retenue: { label: "Retenue", color: "var(--chart-4)" },
} satisfies ChartConfig

export function RapportsClient() {
    const { selectedYear, setSelectedYear } = useReportsStore()
    const { data, isLoading } = useReports(selectedYear)
    const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null)

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

    const handleExportPDF = async () => {
        if (!data) return
        setExporting("pdf")
        try {
            exportReportPDF({ ...data, year: selectedYear })
            notify.success({ title: `Rapport ${selectedYear} exporté en PDF` })
        } catch (err) {
            console.error("[PDF export]", err)
            notify.error({ title: "Export PDF impossible", error: err, context: "export du rapport en PDF" })
        } finally {
            setExporting(null)
        }
    }

    const handleExportExcel = async () => {
        if (!data) return
        setExporting("xlsx")
        try {
            exportReportExcel({ ...data, year: selectedYear })
            notify.success({ title: `Rapport ${selectedYear} exporté en Excel` })
        } catch (err) {
            console.error("[Excel export]", err)
            notify.error({ title: "Export Excel impossible", error: err, context: "export du rapport en Excel" })
        } finally {
            setExporting(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-72 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        )
    }

    if (!data) return null

    const caVariation = parseFloat(data.caVariation)

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-200/50 dark:border-orange-900/50 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Rapport Fiscal</h1>
                            <p className="text-xs text-muted-foreground">Synthèse annuelle {selectedYear}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="h-8 text-xs gap-1.5" disabled={exporting !== null}>
                                    <FileDown className="h-3.5 w-3.5" />
                                    {exporting === "pdf" ? "PDF..." : exporting === "xlsx" ? "Excel..." : "Export"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={handleExportPDF} className="text-xs gap-2">
                                    <FileText className="h-3.5 w-3.5 text-rose-500" />
                                    PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportExcel} className="text-xs gap-2">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                                    Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <StatCard
                        title="CA Annuel"
                        value={formatTND(data.caAnnuel)}
                        subtitle={`${caVariation >= 0 ? "+" : ""}${data.caVariation}% vs ${Number(selectedYear) - 1}`}
                        subtitleVariant={caVariation >= 0 ? "success" : "danger"}
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="TVA Collectée"
                        value={formatTND(data.tvaCollectee)}
                        subtitle="À reverser"
                        subtitleVariant="warning"
                        icon={BarChart3}
                    />
                    <StatCard
                        title="Retenues Subies"
                        value={formatTND(data.retenuesSubies)}
                        subtitle="Récupérables"
                        subtitleVariant="success"
                        icon={TrendingDown}
                    />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="border-b bg-gradient-to-r from-orange-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Évolution du CA</span>
                        </div>
                        <div className="p-4">
                            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                                <AreaChart data={data.monthlyData}>
                                    <defs>
                                        <linearGradient id="fillCA" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-ca)" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="var(--color-ca)" stopOpacity={0.03} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={60} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value) => formatTND(typeof value === "number" ? value : 0)} />} />
                                    <Area type="monotone" dataKey="ca" fill="url(#fillCA)" stroke="var(--color-ca)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-ca)", strokeWidth: 0 }} activeDot={{ r: 6, fill: "var(--color-ca)", strokeWidth: 2, stroke: "var(--background)" }} />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Répartition fiscale mensuelle</span>
                        </div>
                        <div className="p-4">
                            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                                <BarChart data={data.monthlyData} barGap={0} barCategoryGap="16%">
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" width={60} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value) => formatTND(typeof value === "number" ? value : 0)} />} />
                                    <Bar dataKey="tva" fill="var(--color-tva)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                                    <Bar dataKey="fodec" fill="var(--color-fodec)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                                    <Bar dataKey="retenue" fill="var(--color-retenue)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="border-b bg-gradient-to-r from-violet-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-violet-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top 5 clients</span>
                        </div>
                        <div className="p-4 flex items-center gap-6">
                            <ChartContainer config={chartConfig} className="w-[180px] h-[180px] shrink-0">
                                <PieChart>
                                    <Pie
                                        data={data.topClients}
                                        cx="50%" cy="50%"
                                        outerRadius={78}
                                        innerRadius={44}
                                        dataKey={(d: Record<string, unknown>) => parseFloat(d.totalCA as string)}
                                        nameKey="raisonSociale"
                                    >
                                        {data.topClients.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatTND(typeof value === "number" ? value : 0)} />} />
                                </PieChart>
                            </ChartContainer>
                            <div className="flex-1 space-y-2 min-w-0">
                                {data.topClients.map((client, idx) => (
                                    <div key={client.id} className="flex items-center gap-2.5">
                                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-xs truncate flex-1">{client.raisonSociale}</span>
                                        <span className="text-xs font-semibold tabular-nums whitespace-nowrap">{formatTND(client.totalCA)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="border-b bg-gradient-to-r from-amber-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Export TEJ XML</span>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-muted-foreground mb-3">Déclaration fiscale Tunisienne — {selectedYear}</p>
                            <pre className="text-[10px] bg-muted rounded-lg p-3 overflow-auto max-h-28 font-mono leading-relaxed border">
                                {data.tejXmlPreview}
                            </pre>
                            <div className="flex items-center gap-2 mt-3">
                                <Button size="sm" className="h-8 text-xs gap-1.5" variant="outline" onClick={() => {
                                    const blob = new Blob([data.tejXmlPreview], { type: "application/xml" })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement("a")
                                    a.href = url; a.download = `TEJ-${selectedYear}.xml`
                                    a.click(); URL.revokeObjectURL(url)
                                }}>
                                    <Download className="h-3.5 w-3.5" />
                                    Télécharger XML
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
