"use client"

import { useState, useMemo } from "react"
import { useOrdresFabrication } from "@/hooks/use-ordres-fabrication"
import { usePackingListMutations } from "@/hooks/use-packing-list"
import { useCartonTypes } from "@/hooks/use-carton-types"
import { repartirParTailles, validerColisage, type CartonType } from "@/lib/packing-list/colisage"
import { notify } from "@/lib/notify"
import type { PackingOFDetail } from "@/lib/types"

interface CartonEdit {
  numero: number
  contenu: Record<string, number>
  typeNom?: string
  capacite?: number
}

interface OrdreFabrication {
  id: string
  code: string
  statut: string
  quantite: number
  product?: { nom?: string | null } | null
  tiers?: { raisonSociale?: string | null } | null
  details?: Array<{ taille?: string; quantite?: number }>
}

function getDemande(ordre: OrdreFabrication | null): PackingOFDetail[] {
  if (!ordre?.details || ordre.details.length === 0) {
    return [{ taille: "Std", quantite: Math.max(0, Math.floor(ordre?.quantite ?? 0)) }]
  }
  const map = new Map<string, number>()
  for (const d of ordre.details) {
    const taille = d.taille || "Std"
    const q = Math.max(0, Math.floor(d.quantite ?? 0))
    if (q > 0) map.set(taille, (map.get(taille) ?? 0) + q)
  }
  return Array.from(map.entries()).map(([taille, quantite]) => ({ taille, quantite }))
}

export function useNouveauColisage({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: ordresData } = useOrdresFabrication()
  const { create } = usePackingListMutations()
  const { data: cartonTypesData } = useCartonTypes()

  const ordres = useMemo(
    () => (ordresData?.ordres ?? []) as OrdreFabrication[],
    [ordresData]
  )
  const filteredOrdres = useMemo(
    () => ordres.filter((o) => !["BROUILLON", "ANNULE"].includes(o.statut)),
    [ordres]
  )

  const cartonTypesConfig: CartonType[] = useMemo(
    () => (cartonTypesData?.cartonTypes ?? []) as CartonType[],
    [cartonTypesData]
  )

  const [ordreId, setOrdreId] = useState("")
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [cartons, setCartons] = useState<CartonEdit[]>([])
  const [notes, setNotes] = useState("")
  const [touched, setTouched] = useState(false)

  const ordre = useMemo(
    () => filteredOrdres.find((o) => o.id === ordreId) ?? null,
    [filteredOrdres, ordreId]
  )
  const demande = useMemo(() => (ordre ? getDemande(ordre) : []), [ordre])
  const tailles = useMemo(
    () =>
      Array.from(new Set(demande.map((d) => d.taille))).sort((a, b) =>
        a.localeCompare(b, "fr", { numeric: true })
      ),
    [demande]
  )

  // Types sélectionnés (tous par défaut si aucune sélection explicite).
  // selectedTypes ne doit JAMAIS être vide : si le filtrage par selectedTypeIds
  // ne retourne rien, on retombe sur tous les types configurés, sinon sur le fallback.
  const selectedTypes = useMemo(() => {
    const all = cartonTypesConfig.length > 0 ? cartonTypesConfig : [{ id: "defaut", nom: "Carton", capacite: 24 }]
    if (selectedTypeIds.length > 0) {
      const filtered = all.filter((t) => selectedTypeIds.includes(t.id))
      if (filtered.length > 0) return filtered
    }
    return all
  }, [cartonTypesConfig, selectedTypeIds])

  // Répartition de base automatique : recalculée dès que l'OF, les types
  // sélectionnés, la config de cartons ou la demande évoluent. Ajustement au
  // rendu (React « storing information from previous renders ») et non
  // useEffect : mêmes déclencheurs que l'ancien effet ([open, ordre,
  // demandeKey, selectedTypes]) — sentinel `null` au montage pour consommer le
  // premier passage (l'ancien effet tournait aussi au montage), écritures
  // seulement si le dialog est ouvert ET qu'un OF est sélectionné (même garde
  // `if (!open || !ordre) return`), donc aucun reset quand le dialog est fermé.
  const demandeKey = JSON.stringify(demande)
  const [prevRep, setPrevRep] = useState<{ open: boolean; ordre: OrdreFabrication | null; key: string; types: CartonType[] } | null>(null)
  if (
    prevRep === null ||
    prevRep.open !== open ||
    prevRep.ordre !== ordre ||
    prevRep.key !== demandeKey ||
    prevRep.types !== selectedTypes
  ) {
    setPrevRep({ open, ordre, key: demandeKey, types: selectedTypes })
    if (open && ordre) {
      const base = repartirParTailles(demande, selectedTypes, [])
      setCartons(
        base.cartons.map((c) => ({
          numero: c.numero,
          contenu: { ...c.contenu },
          typeNom: c.typeNom,
          capacite: c.capacite,
        }))
      )
      setTouched(false)
    }
  }

  const validation = useMemo(() => {
    return validerColisage(demande, cartons.map((c) => ({ contenu: c.contenu })))
  }, [demande, cartons])

  const totalDistribue = cartons.reduce((s, c) => {
    return s + Object.values(c.contenu).reduce((a, b) => a + b, 0)
  }, 0)

  function setCell(cartonNumero: number, taille: string, value: string) {
    setTouched(true)
    const q = Math.max(0, parseInt(value) || 0)
    setCartons((prev) =>
      prev.map((c) => (c.numero === cartonNumero ? { ...c, contenu: { ...c.contenu, [taille]: q } } : c))
    )
  }

  async function handleCreate() {
    if (!ordre) return
    const maxCap = selectedTypes.reduce((m, t) => Math.max(m, t.capacite), 0)
    try {
      await create.mutateAsync({
        ordreId,
        capaciteCarton: maxCap,
        cartonTypes: selectedTypes.map((t) => ({ id: t.id, nom: t.nom, capacite: t.capacite })),
        cartonsManuels: cartons.map((c) => ({ contenu: c.contenu })),
        notes: notes || null,
      })
      onOpenChange(false)
      setOrdreId("")
      setNotes("")
      notify.success({ title: "Colisage généré", description: "Le packing list est prêt à être imprimé." })
    } catch (err: unknown) {
      notify.error({ title: "Colisage non généré", error: err, context: "génération du colisage" })
    }
  }

  return {
    filteredOrdres,
    ordre,
    ordreId,
    setOrdreId,
    cartonTypesConfig,
    selectedTypeIds,
    setSelectedTypeIds,
    cartons,
    setCartons,
    notes,
    setNotes,
    touched,
    setTouched,
    selectedTypes,
    demande,
    tailles,
    validation,
    totalDistribue,
    setCell,
    handleCreate,
    create,
  }
}
