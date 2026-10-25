import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { DevisClient } from "@/components/devis/devis-client";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function DevisPage() {
  return (
    <>
      <PageBanner
        title="Devis"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/devis/new">
              <Plus className="h-3.5 w-3.5" />
              Nouveau Devis
            </Link>
          </Button>
        }
      />
      <DevisClient />
    </>
  );
}
