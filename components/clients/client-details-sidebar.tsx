"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CreditCard, BadgeInfo } from "lucide-react"

interface ClientDetailsSidebarProps {
  code: string
  matriculeFiscal?: string | null
  exonereTVA: boolean
  assujettTVA: boolean
  tauxRetenue: string
  devise: string
  deviseSecondaire?: string | null
  banque?: string | null
  ribBancaire?: string | null
  notes?: string | null
}

export function ClientDetailsSidebar({
  code, matriculeFiscal, exonereTVA, assujettTVA, tauxRetenue,
  devise, deviseSecondaire, banque, ribBancaire, notes,
}: ClientDetailsSidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            Détails Professionnels
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Code Client</span>
            <Badge variant="outline" className="font-mono text-[11px] font-semibold">{code}</Badge>
          </div>
          {matriculeFiscal && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Matricule Fiscal</span>
              <span className="font-mono text-xs font-medium select-all">{matriculeFiscal}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Régime TVA</span>
            <Badge variant="outline" className="text-[10px]">
              {exonereTVA ? "Exonéré TVA" : assujettTVA ? "Assujetti TVA" : "Non assujetti"}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Retenue à la Source</span>
            <span className="font-medium text-xs">{parseFloat(tauxRetenue) > 0 ? `${tauxRetenue}%` : "Aucune"}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Devise Principale</span>
            <span className="font-medium text-xs">{devise}</span>
          </div>
          {deviseSecondaire && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Devise Secondaire</span>
              <span className="font-medium text-xs">{deviseSecondaire}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {(banque || ribBancaire) && (
        <Card className="border-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Coordonnées Bancaires
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {banque && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Banque</span>
                <span className="font-medium text-xs">{banque}</span>
              </div>
            )}
            {ribBancaire && (
              <div className="flex flex-col gap-1 text-xs pt-1 border-t border-muted/30">
                <span className="text-muted-foreground">RIB</span>
                <span className="font-mono text-xs bg-muted/30 p-1.5 rounded select-all tracking-wider text-center">{ribBancaire}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {notes && (
        <Card className="border-muted/50 bg-amber-500/5 border-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
              <BadgeInfo className="size-4" /> Notes internes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-700 whitespace-pre-line leading-relaxed">{notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
