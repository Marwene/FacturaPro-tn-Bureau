"use client"

import { Inbox, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNouvelEffet } from "./use-nouvel-effet";
import { NouvelEffetPartiesPrenantes } from "./nouvel-effet-parties";
import { NouvelEffetMainColumn } from "./nouvel-effet-main-column";
import { NouvelEffetSidebar } from "./nouvel-effet-sidebar";
import { NouvelEffetSplitDialog } from "./nouvel-effet-split-dialog";

export function NouvelEffetClient() {
    const ctrl = useNouvelEffet()
    const { isRECU, isEMIS, handleTypeChange } = ctrl

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-6">
                {/* Type toggle */}
                <div className="flex items-center gap-3 mb-8">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type d&apos;effet</span>
                    <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
                        <button
                            type="button"
                            onClick={() => handleTypeChange("RECU")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                isRECU ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Inbox className="h-4 w-4" />
                            Reçu
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">— le client nous paie</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange("EMIS")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                isEMIS ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Send className="h-4 w-4" />
                            Émis
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">— nous payons le fournisseur</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                    {/* --- MAIN COLUMN --- */}
                    <div className="space-y-6">
                        {/* Entité */}
                        <NouvelEffetPartiesPrenantes ctrl={ctrl} />
                        <NouvelEffetMainColumn ctrl={ctrl} />
                    </div>

                    {/* --- SIDEBAR --- */}
                    <NouvelEffetSidebar ctrl={ctrl} />
                </div>
            </div>

            {/* EMIS: assistant de création multi-effets (split) */}
            <NouvelEffetSplitDialog ctrl={ctrl} />
        </div>
    )
}
