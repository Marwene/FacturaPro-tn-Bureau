import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { AchatsClient } from "@/components/achats/achats-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function BLAchatsPage() {
  return (
    <>
      <PageBanner
        title="Achats — BL"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/achats/new?type=BL">
              <Plus className="h-3.5 w-3.5" />
              Nouveau BL
            </Link>
          </Button>
        }
      />
      <AchatsClient type="BL" />
    </>
  );
}
