import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { EffetsClient } from "@/components/effets/effets-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function EffetsPage() {
    return (
        <>
            <PageBanner
                title="Effets de Commerce"
                actions={
                    <Button size="sm" className="gap-1.5 text-xs" asChild>
                        <Link href="/effets/nouveau">
                            <Plus className="h-3.5 w-3.5" />
                            Nouvel Effet
                        </Link>
                    </Button>
                }
            />
            <EffetsClient />
        </>
    );
}
