"use client"

import { useState } from "react"
import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { FournisseursClient } from "@/components/fournisseurs/fournisseurs-client";
import { FournisseurDialog } from "@/components/fournisseurs/fournisseur-dialog";
import { Plus } from "lucide-react";

export function FournisseursMainClient() {
    const [showCreate, setShowCreate] = useState(false);

    return (
        <>
            <PageBanner
                title="Fournisseurs"
                actions={
                    <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Nouveau Fournisseur
                    </Button>
                }
            />
            <FournisseursClient />
            <FournisseurDialog open={showCreate} onOpenChange={setShowCreate} />
        </>
    );
}
