"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { EtiquettesProduitsDialog } from "./etiquettes-produits-dialog";

export function ProduitsActions() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
                <Tag className="h-3.5 w-3.5" />
                Étiquettes
            </Button>
            <EtiquettesProduitsDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
