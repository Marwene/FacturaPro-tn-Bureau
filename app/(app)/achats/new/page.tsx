import { PageBanner } from "@/components/shared/page-banner";
import { ScanAchatClient } from "@/components/achats/scan-achat-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NouvelAchatPage(props: { searchParams?: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  const type = searchParams?.type === "BL" ? "BL" : "FACTURE";

  return (
    <>
      <PageBanner
        title="Nouvel Achat"
        actions={
          <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
            <Link href="/achats">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </Link>
          </Button>
        }
      />
      <ScanAchatClient type={type} />
    </>
  );
}
