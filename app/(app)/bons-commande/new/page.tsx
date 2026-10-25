import { ScanBonCommandeClient } from "@/components/bons-commande/scan-bon-commande-client";
import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewBonCommandePage() {
    return (
        <>
            <PageBanner
                title="Nouveau Bon de Commande"
                actions={
                    <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                        <Link href="/bons-commande">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Retour
                        </Link>
                    </Button>
                }
            />
            <ScanBonCommandeClient />
        </>
    );
}
