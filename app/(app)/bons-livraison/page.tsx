import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { BLClient } from "@/components/bons-livraison/bl-client";

export default function BonsLivraisonPage() {
  return (
    <>
      <PageBanner
        title="Bons de Livraison"
        actions={
          <Link href="/bons-livraison/nouveau">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nouveau BL
            </Button>
          </Link>
        }
      />
      <BLClient />
    </>
  );
}
