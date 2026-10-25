import { BonsCommandeClient } from "@/components/bons-commande/bons-commande-client";
import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function BonsCommandePage() {
    return (
        <>
            <PageBanner
                title="Bons de Commande"
                actions={
                    <Link href="/bons-commande/new">
                        <Button size="sm" className="gap-1.5 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Nouveau Bon de Commande
                        </Button>
                    </Link>
                }
            />
            <BonsCommandeClient />
        </>
    );
}
