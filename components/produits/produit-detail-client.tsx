"use client";

import { useProduitDetail } from "@/hooks/use-produits";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { isProductCustomizable } from "@/lib/customizer/mockups/product-mockups";
import { ArrowLeft, Pencil, Shirt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProduitDetailMainColumn, ProduitDetailSidebar } from "./produit-detail-sections";

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
                    <ProduitDetailMainColumn product={p} productId={productId} />
                    <ProduitDetailSidebar product={p} productId={productId} />
                </div>
            </div>
        </div>
    );
}
