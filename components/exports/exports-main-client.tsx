"use client"

import { useState } from "react"
import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { ExportsClient } from "@/components/exports/exports-client";
import { NouvelExportDialog } from "@/components/exports/nouvel-export-dialog";
import { Plus } from "lucide-react";

export function ExportsMainClient() {
    const [dialogOpen, setDialogOpen] = useState(false);
    return (
        <>
            <PageBanner
                title="Exports"
                actions={
                    <Button size="sm" className="gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Nouvel Export
                    </Button>
                }
            />
            <ExportsClient />
            <NouvelExportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
    );
}
