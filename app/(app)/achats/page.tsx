import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { AchatsClient } from "@/components/achats/achats-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function AchatsPage() {
  return (
    <>
      <PageBanner
        title="Achats"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/achats/new?type=FACTURE">
              <Plus className="h-3.5 w-3.5" />
              Nouvel Achat
            </Link>
          </Button>
        }
      />
      <AchatsClient type="FACTURE" />
    </>
  );
}
