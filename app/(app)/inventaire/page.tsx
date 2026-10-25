import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { InventaireClient } from "@/components/stock/inventaire-client";
import { Package, Plus } from "lucide-react";
import Link from "next/link";

export default function InventairePage() {
    return (
        <>
            <PageBanner
                title="Inventaire"
                actions={
                    <div className="flex items-center gap-2">
                        <Link href="/produits/nouveau">
                            <Button size="sm" className="gap-1.5 text-xs">
                                <Plus className="h-3.5 w-3.5" />
                                Nouveau Produit
                            </Button>
                        </Link>
                    </div>
                }
            />
            <InventaireClient />
        </>
    );
}
