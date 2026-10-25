"use client";

import { useProduitDetail } from "@/hooks/use-produits";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/decimal";
import { StockStatusBadge } from "@/components/status-badge";
import { ProductQRCode } from "./product-qr-code";
import { ProductPerformanceChart } from "./product-performance-chart";
import { ProductStockChart } from "./product-stock-chart";
import { ChartErrorBoundary } from "@/components/shared/chart-error-boundary";
import { ProductFichesList } from "./product-fiches-list";
import { ProductSuppliersSection } from "./product-suppliers-section";
import { ProduitStockMovements } from "./product-stock-movements";
import { AjusterStockDialog } from "./adjust-stock-dialog";
import { ProduitVariantsList } from "./produit-variants-list";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Pencil, Package, Tag, DollarSign,
    Percent, BarChart3, Building2, FileText, ExternalLink,
    ShoppingCart, TrendingUp, Hash, Sparkles, QrCode, Shirt,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isProductCustomizable } from "@/lib/customizer/mockups/product-mockups";

function SkeletonBlock({ className }: { className?: string }) {
    return <Skeleton className={cn("rounded-xl", className)} />;
}

function ProduitDetailSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <SkeletonBlock className="h-8 w-80" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SkeletonBlock className="h-80" />
                    <SkeletonBlock className="h-72" />
                </div>
                <div className="space-y-6">
                    <SkeletonBlock className="h-52" />
                    <SkeletonBlock className="h-64" />
                    <SkeletonBlock className="h-40" />
                </div>
            </div>
        </div>
    );
}

import { cn } from "@/lib/utils";

export function ProduitDetailClient({ productId }: { productId: string }) {
    const { data, isLoading } = useProduitDetail(productId);
    const router = useRouter();

    if (isLoading) return <ProduitDetailSkeleton />;
    if (!data?.product) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Produit introuvable</p>
        </div>
    );

    const p = data.product;
    const customizable = isProductCustomizable(p.nom, p.categorieName);

    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <div className="border-b bg-muted/30">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => router.push("/produits")}>
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold tracking-tight">{p.nom}</h1>
                                <StockStatusBadge status={p.stockStatus} />
                                {p.estSurCommande && (
                                    <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium border-0 bg-amber-50 text-amber-700 border border-amber-200">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                        Sur commande
                                    </Badge>
                                )}
                                <Badge variant="outline" className="font-mono text-[10px]">{p.code}</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {customizable && (
                            <Link href={`/produits/${productId}/customizer`}>
                                <Button variant="secondary" size="sm" className="h-9 gap-2 text-xs">
                                    <Shirt className="size-3.5" /> Personnaliser
                                </Button>
                            </Link>
                        )}
                        <Link href={`/produits/${productId}/edit`}>
                            <Button variant="default" size="sm" className="h-9 gap-2 text-xs">
                                <Pencil className="size-3.5" /> Modifier
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Photo + key info row */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Package className="size-4 text-muted-foreground" />
                                    Informations générales
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fiche d&apos;identité du produit</p>
                            </div>
                            <div className="px-5 pb-5">
                                <div className="flex gap-8">
                                    {p.photoUrl ? (
                                        <div className="shrink-0">
                                            <div className="w-64 h-64 rounded-2xl overflow-hidden border-dashed bg-muted border-muted-foreground/25">
                                                <Image src={p.photoUrl} alt={p.nom} width={256} height={256} unoptimized className="w-full h-full object-cover" loading="eager" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="shrink-0 w-64 h-64 rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30">
                                            <Package className="size-10 text-muted-foreground/50" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <QuickInfo label="Catégorie" value={p.categorieName} />
                                            <QuickInfo label="Marque" value={p.marqueName} />
                                            <QuickInfo label="Fournisseur" value={p.tiersName} />
                                            <QuickInfo label="Unité" value={p.unite} />
                                            {p.quantiteParUnite && (
                                                <QuickInfo label="Qté / unité" value={`${p.quantiteParUnite} pcs`} />
                                            )}
                                            <QuickInfo label="Prix HT" value={formatTND(p.prixHT)} highlight />
                                            <QuickInfo label="Prix achat" value={p.prixAchatDefault != null ? formatTND(String(p.prixAchatDefault)) : formatTND(p.prixAchat)} />
                                        </div>
                                        {p.description && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Performance chart */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="size-4 text-muted-foreground" />
                                    Performance commerciale
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Évolution des ventes et des revenus dans le temps</p>
                            </div>
                            <div className="px-5 pb-5">
                                <ChartErrorBoundary>
                                    <ProductPerformanceChart productId={productId} />
                                </ChartErrorBoundary>
                            </div>
                        </div>

                        <Separator />

                        {/* Stock movements */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3 flex items-start justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold flex items-center gap-2">
                                        <ShoppingCart className="size-4 text-muted-foreground" />
                                        Mouvements de stock
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Entrées et sorties de stock enregistrées</p>
                                </div>
                                <AjusterStockDialog productId={productId} />
                            </div>
                            <div className="px-5 pb-5">
                                <ProduitStockMovements productId={productId} />
                            </div>
                        </div>

                        <Separator />

                        {/* Variants */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Shirt className="size-4 text-muted-foreground" />
                                    Déclinaisons
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Variantes du produit (couleur, taille, etc.)</p>
                            </div>
                            <div className="px-5 pb-5">
                                <ProduitVariantsList productId={productId} />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Stock gauge */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <BarChart3 className="size-4 text-muted-foreground" />
                                    État du stock
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Niveau actuel et seuil d&apos;alerte</p>
                            </div>
                            <div className="px-5 pb-5">
                                <ChartErrorBoundary>
                                    <ProductStockChart
                                        stockActuel={parseFloat(p.stockActuel)}
                                        stockMinimum={parseFloat(p.stockMinimum)}
                                        unite={p.unite}
                                        stockStatus={p.stockStatus}
                                    />
                                </ChartErrorBoundary>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <QrCode className="size-4 text-muted-foreground" />
                                    QR Code
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fiche produit accessible sur mobile</p>
                            </div>
                            <div className="px-5 pb-5 flex flex-col items-center gap-2">
                                <ProductQRCode codeBarre={p.codeBarre} nom={p.nom} code={p.code} large showMessage />
                            </div>
                        </div>

                        {/* Fiches techniques */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="size-4 text-muted-foreground" />
                                    Fiches techniques
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Documents PDF associés au produit</p>
                            </div>
                            <div className="px-5 pb-5">
                                <ProductFichesList productId={productId} />
                            </div>
                        </div>

                        {/* Fournisseurs */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Building2 className="size-4 text-muted-foreground" />
                                    Fournisseurs
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fournisseurs et prix d&apos;achat</p>
                            </div>
                            <div className="px-5 pb-5">
                                <ProductSuppliersSection productId={productId} />
                            </div>
                        </div>

                        {/* Fiscalité */}
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Percent className="size-4 text-muted-foreground" />
                                    Fiscalité
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">TVA, FODEC et valorisation du stock</p>
                            </div>
                            <div className="px-5 pb-5">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">TVA</span>
                                        <span className="text-sm font-semibold">{p.tauxTVA}%</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">FODEC</span>
                                        <Badge variant={p.fodec ? "default" : "outline"} className="text-[10px]">
                                            {p.fodec ? `${p.tauxFodec}%` : "Non soumis"}
                                        </Badge>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">Valeur stock</span>
                                        <span className="text-sm font-semibold">{formatTND(String(parseFloat(p.stockActuel) * parseFloat(p.prixHT)))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickInfo({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
    return (
        <div className={cn(
            "px-3 py-2.5 rounded-xl border",
            highlight && "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20"
        )}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn(
                "text-sm truncate",
                highlight && "font-bold text-emerald-700 dark:text-emerald-400"
            )}>{value ?? "—"}</p>
        </div>
    );
}
