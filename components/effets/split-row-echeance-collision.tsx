"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveCompanyId } from "@/hooks/use-active-company";
import { useEcheanceCollision } from "@/hooks/use-effets";
import { AlertTriangle } from "lucide-react";

export function SplitRowEcheanceCollision({ date }: { date: string }) {
    const companyId = useActiveCompanyId()
    const { data: collisions = [], isLoading } = useEcheanceCollision(date, companyId)
    if (isLoading || collisions.length === 0) return null
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Collision d'échéance possible"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-amber-600 dark:text-amber-400 cursor-help"
                >
                    <AlertTriangle className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-amber-950 text-amber-100 border border-amber-500/40">
                <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                        Collision possible
                    </p>
                    <ul>
                        {collisions.map((c) => (
                            <li key={c.id} className="text-[11px]">
                                {`N°${c.numero} — ${new Date(c.dateEcheance).toLocaleDateString("fr-TN")}`}
                            </li>
                        ))}
                    </ul>
                    <p className="text-[10px] text-amber-300/70 mt-1">
                        Un effet EMIS arrive à échéance à cette même date.
                    </p>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}
