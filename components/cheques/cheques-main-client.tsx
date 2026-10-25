"use client"

import { useState } from "react"
import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import { ChequesClient } from "@/components/cheques/cheques-client";
import { NouveauChequeDialog } from "@/components/cheques/nouveau-cheque-dialog";
import { Plus } from "lucide-react";

export function ChequesMainClient() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageBanner
        title="Chèques"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau Chèque
          </Button>
        }
      />
      <ChequesClient />
      <NouveauChequeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
