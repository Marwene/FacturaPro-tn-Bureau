import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { FacturesClient } from "@/components/factures/factures-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function FacturesPage() {
  return (
    <>
      <PageBanner
        title="Factures"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/factures/new">
              <Plus className="h-3.5 w-3.5" />
              Nouvelle Facture
            </Link>
          </Button>
        }
      />
      <FacturesClient />
    </>
  );
}
