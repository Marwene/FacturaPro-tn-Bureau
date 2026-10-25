"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientDialog } from "./client-dialog";
import { useClientsStore } from "@/lib/stores/clients-store";

export function NouveauClientDialog() {
    const { nouveauOpen, setNouveauOpen } = useClientsStore();

    return (
        <>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setNouveauOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau Client
            </Button>

            <ClientDialog open={nouveauOpen} onOpenChange={setNouveauOpen} />
        </>
    );
}
