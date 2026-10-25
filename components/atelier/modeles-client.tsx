"use client"

import { useState } from "react"
import { useDesignsPersonnalises, useDesignPersonnaliseMutations } from "@/hooks/use-designs-personnalises"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { NouveauOFDialog } from "@/components/atelier/nouveau-of-dialog"
import { Layers, Trash2, ExternalLink, Clock, Package, Plus } from "lucide-react"
import Link from "next/link"
import type { DesignAvecRelations } from "@/lib/types"

export function ModelesClient() {
  const { data, isLoading } = useDesignsPersonnalises()
  const { deleteDesign } = useDesignPersonnaliseMutations()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [ofDialog, setOfDialog] = useState<{ open: boolean; designId: string; productId: string }>({
    open: false, designId: "", productId: "",
  })
  const designs: DesignAvecRelations[] = data?.designs ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Modèles personnalisés</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Chargement...</div>
      ) : designs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-8 w-8" />
          Aucun modèle personnalisé enregistré
          <Button variant="outline" size="sm" asChild>
            <Link href="/produits">Choisir un produit</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {designs.map((d) => (
            <div key={d.id} className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:bg-muted/30">
              <Link href={`/produits/${d.productId}/customizer?designId=${d.id}`} className="block">
                <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center">
                  {d.thumbnail ? (
                    <img src={d.thumbnail} alt={d.nom} className="h-full w-full object-contain p-2" />
                  ) : (
                    <Layers className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
              </Link>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/produits/${d.productId}/customizer?designId=${d.id}`} className="text-sm font-medium hover:underline truncate block">
                      {d.nom}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.product?.code} — {d.product?.nom}
                    </p>
                  </div>
                  <StatusBadge type="design" status={d.statut} className="shrink-0 text-[10px]" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {(d.ordres?.length as number) ?? 0} OF
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" asChild>
                    <Link href={`/produits/${d.productId}/customizer?designId=${d.id}`}>
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                    onClick={() => setOfDialog({ open: true, designId: d.id, productId: d.productId })}
                  >
                    <Plus className="h-3 w-3" />
                    OF
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ConfirmDeleteDialog
                    open={deleteId === d.id}
                    onOpenChange={(o) => setDeleteId(o ? d.id : null)}
                    onConfirm={() => { deleteDesign.mutate(d.id); setDeleteId(null) }}
                    title="Supprimer le modèle ?"
                    description="Cette action est irréversible. Les OF liés ne seront pas supprimés."
                    isLoading={deleteDesign.isPending}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NouveauOFDialog
        open={ofDialog.open}
        onOpenChange={(o) => setOfDialog((prev) => ({ ...prev, open: o }))}
        preselectedProductId={ofDialog.productId}
        preselectedDesignId={ofDialog.designId}
      />
    </div>
  )
}
