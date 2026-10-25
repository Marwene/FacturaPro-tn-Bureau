import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { ProduitsClient } from "@/components/produits/produits-client";
import { ProduitsActions } from "@/components/produits/produits-actions";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ProduitsPage() {
  return (
    <>
      <PageBanner
        title="Produits & Stock"
        actions={
          <div className="flex items-center gap-2">
            <ProduitsActions />
            <Link href="/produits/nouveau">
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Nouveau Produit
              </Button>
            </Link>
          </div>
        }
      />
      <ProduitsClient />
    </>
  );
}
