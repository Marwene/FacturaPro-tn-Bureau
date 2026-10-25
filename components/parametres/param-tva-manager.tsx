"use client"

import { Plus } from "lucide-react"
import { Button } from "../ui/button"

export function TVASettingsManager() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Paramètres de TVA</h1>
                    <p className="text-xs text-muted-foreground">
                        Configurez les types de TVA utilisés pour la facturation et les déclarations.
                    </p>
                </div>
                <Button size="sm" className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un type de TVA
                </Button>
            </div>
        </div>
    )
}