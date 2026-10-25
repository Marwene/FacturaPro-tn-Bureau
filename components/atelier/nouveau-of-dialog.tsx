"use client"

import { useState, useMemo } from "react"
import { useOrdreFabricationMutations, useOFProductsSelect } from "@/hooks/use-ordres-fabrication"
import { useDesignsPersonnalises } from "@/hooks/use-designs-personnalises"
import { useProductVariants } from "@/hooks/use-product-variants"
import { useClientsList } from "@/hooks/use-clients"
import type { SerializedProductVariant, DesignAvecProduit } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedProductId?: string
  preselectedDesignId?: string
}

export function NouveauOFDialog({ open, onOpenChange, preselectedProductId, preselectedDesignId }: Props) {
  const [productId, setProductId] = useState(preselectedProductId ?? "")
  const [tiersId, setTiersId] = useState("")
  const [designId, setDesignId] = useState(preselectedDesignId ?? "")
  const [quantite, setQuantite] = useState("1")
  const [dateLivraison, setDateLivraison] = useState("")
  const [notes, setNotes] = useState("")
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({})
  const { create } = useOrdreFabricationMutations()
  const { data: clientsData } = useClientsList()
  const { data: designsData } = useDesignsPersonnalises()
  const { data: variantsData } = useProductVariants(productId)
  const [loading, setLoading] = useState(false)

  // Liste des produits (hooks/use-ordres-fabrication.ts — clé, `enabled: open`,
  // staleTime 0 et retry false identiques à l'ex-useEffect fetch).
  const { data: productsData } = useOFProductsSelect(open)

  const clients = clientsData?.clients ?? []
  const designs: DesignAvecProduit[] = designsData?.designs ?? []
  const variants = variantsData?.variants ?? []
  const products = productsData ?? []

  // Pré-sélection depuis les props (ex-useEffect [preselectedProductId,
  // preselectedDesignId]) → ajustement au rendu : mêmes déclencheurs (identité
  // des deux props) et mêmes gardes truthy ; le montage est couvert par
  // l'initialisation des useState ci-dessus, où l'ex-effet réécrivait la même
  // valeur à l'identique.
  const [prevPreselect, setPrevPreselect] = useState<{ productId?: string; designId?: string }>({
    productId: preselectedProductId,
    designId: preselectedDesignId,
  })
  if (prevPreselect.productId !== preselectedProductId || prevPreselect.designId !== preselectedDesignId) {
    setPrevPreselect({ productId: preselectedProductId, designId: preselectedDesignId })
    if (preselectedProductId) setProductId(preselectedProductId)
    if (preselectedDesignId) setDesignId(preselectedDesignId)
  }

  const { tailles, couleurs, gridVariants, hasMatrix } = useMemo(() => {
    const t = new Set<string>()
    const c = new Set<string>()
    const g: Record<string, Record<string, SerializedProductVariant[]>> = {}

    for (const v of variants as SerializedProductVariant[]) {
      if (!v.attributs) continue
      const taille = v.attributs["Taille"] ?? ""
      const couleur = v.attributs["Couleur"] ?? ""
      if (taille) t.add(taille)
      if (couleur) c.add(couleur)
      if (!g[taille]) g[taille] = {}
      if (!g[taille][couleur]) g[taille][couleur] = []
      g[taille][couleur].push(v)
    }

    const sortedT = Array.from(t).sort()
    const sortedC = Array.from(c).sort()
    const hasM = sortedT.length > 0 && sortedC.length > 0

    return { tailles: sortedT, couleurs: sortedC, gridVariants: g, hasMatrix: hasM }
  }, [variants])

  const totalQuantite = useMemo(() => {
    if (hasMatrix) {
      return Object.values(qtyMap).reduce((s, v) => s + (parseInt(v) || 0), 0)
    }
    return parseInt(quantite) || 0
  }, [qtyMap, quantite, hasMatrix])

  function getVariantQuantite(variantId: string): string {
    return qtyMap[`qty-${variantId}`] ?? ""
  }

  function setVariantQuantite(variantId: string, val: string) {
    setQtyMap((prev) => ({ ...prev, [`qty-${variantId}`]: val }))
  }

  function getTailleTotal(taille: string): number {
    let total = 0
    for (const couleur of couleurs) {
      const variants = gridVariants[taille]?.[couleur] ?? []
      for (const v of variants) {
        total += parseInt(qtyMap[`qty-${v.id}`]) || 0
      }
    }
    return total
  }

  function getCouleurTotal(couleur: string): number {
    let total = 0
    for (const taille of tailles) {
      const variants = gridVariants[taille]?.[couleur] ?? []
      for (const v of variants) {
        total += parseInt(qtyMap[`qty-${v.id}`]) || 0
      }
    }
    return total
  }

  async function handleSubmit() {
    if (!productId || !totalQuantite) return
    setLoading(true)
    try {
      const details = hasMatrix
        ? Object.entries(qtyMap)
            .filter(([k, v]) => k.startsWith("qty-") && parseInt(v) > 0)
            .map(([k, v]) => {
              const variantId = k.replace("qty-", "")
              const variant = (variants as SerializedProductVariant[]).find((x) => x.id === variantId)
              return {
                variantId,
                variantNom: variant?.nom ?? "",
                taille: variant?.attributs?.["Taille"] ?? "",
                couleur: variant?.attributs?.["Couleur"] ?? "",
                quantite: parseInt(v) || 0,
                quantiteProduite: 0,
              }
            })
        : []

      const qte = hasMatrix ? totalQuantite : parseInt(quantite)

      await create.mutateAsync({
        productId,
        tiersId: tiersId || null,
        designId: designId || null,
        quantite: qte,
        dateLivraison: dateLivraison || null,
        notes: notes || null,
        details: details.length > 0 ? details : null,
      })
      onOpenChange(false)
      setQuantite("1"); setDateLivraison(""); setNotes(""); setDesignId(""); setTiersId(""); setQtyMap({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Nouvel ordre de fabrication</DialogTitle>
          <DialogDescription className="text-xs">
            Total : <strong>{totalQuantite}</strong> pièce{totalQuantite > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Client</Label>
            <select
              value={tiersId}
              onChange={(e) => setTiersId(e.target.value)}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="">Sélectionner un client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.raisonSociale}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Produit</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="">Sélectionner un produit...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.nom}{p.categorieName ? ` (${p.categorieName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {hasMatrix && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 text-left font-medium text-muted-foreground">Taille \ Couleur</th>
                    {couleurs.map((c) => (
                      <th key={c} className="p-1.5 text-center font-medium text-muted-foreground min-w-[72px]">
                        {c}
                      </th>
                    ))}
                    <th className="p-1.5 text-center font-medium text-muted-foreground min-w-[56px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tailles.map((taille) => (
                    <tr key={taille}>
                      <td className="p-1.5 text-left font-medium">{taille}</td>
                      {couleurs.map((couleur) => {
                        const variants = gridVariants[taille]?.[couleur] ?? []
                        if (variants.length === 0) {
                          return <td key={couleur} className="p-1.5 text-center text-muted-foreground/40">&mdash;</td>
                        }
                        const v = variants[0]
                        return (
                          <td key={couleur} className="p-1">
                            <Input
                              type="number"
                              min={0}
                              value={getVariantQuantite(v.id)}
                              onChange={(e) => setVariantQuantite(v.id, e.target.value)}
                              className="h-7 w-full text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                          </td>
                        )
                      })}
                      <td className="p-1.5 text-center font-semibold">{getTailleTotal(taille)}</td>
                    </tr>
                  ))}
                </tbody>
                {couleurs.length > 0 && (
                  <tfoot>
                    <tr>
                      <td className="p-1.5 text-left font-semibold text-muted-foreground">Total</td>
                      {couleurs.map((c) => (
                        <td key={c} className="p-1.5 text-center font-semibold">{getCouleurTotal(c)}</td>
                      ))}
                      <td className="p-1.5 text-center font-semibold">{totalQuantite}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div>
            <Label className="text-xs">Design personnalisé (optionnel)</Label>
            <select
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="">Sélectionner un design...</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom} — {d.product?.nom ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date livraison</Label>
              <Input type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-sm" placeholder="Optionnelle" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !productId || totalQuantite < 1}>
            {loading ? "Création..." : "Créer l'OF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
