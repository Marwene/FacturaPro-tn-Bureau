import { prisma } from "@/lib/prisma"
import { genererPackingListPDF, genererEtiquettesPDF, type PackingListPDFData, type EtiquetteFormat } from "./pdf"
import type { Carton } from "./colisage"

export interface GenerationResult {
  packingBuffer: Buffer
  etiquettesBuffer: Buffer
  packingListUrl: string
  etiquettesUrl: string
  pdfUrl: string
}

/**
 * Recharge une Packing List et génère ses deux documents :
 * le Packing List PDF (paysage) et les étiquettes de colisage (portrait).
 */
export async function genererPackingDocuments(
  packingListId: string,
  companyId: string,
  baseUrl: string,
  etiquetteFormat: EtiquetteFormat = "tsc200"
): Promise<GenerationResult> {
  const packingList = await prisma.packingList.findFirst({
    where: { id: packingListId, companyId },
    include: {
      ordre: {
        include: {
          product: { select: { id: true, code: true, nom: true } },
          tiers: true,
        },
      },
      cartons: { orderBy: { numero: "asc" } },
    },
  })
  if (!packingList) throw new Error("Packing list introuvable")

  const company = await prisma.company.findUnique({ where: { id: companyId } })

  const details = ((packingList.ordre.details ?? []) as Array<{ taille?: string; quantite?: number }>)
    .map((d) => ({ taille: d.taille || "Std", quantite: Math.max(0, Math.floor(d.quantite ?? 0)) }))
    .filter((d) => d.quantite > 0)
  if (details.length === 0) details.push({ taille: "Std", quantite: packingList.totalPieces })

  const cartons: Carton[] = packingList.cartons.map((c) => ({
    numero: c.numero,
    contenu: (c.contenu ?? {}) as Record<string, number>,
    totalPieces: c.totalPieces,
    capacite: c.capacite ?? undefined,
    typeNom: c.typeNom ?? undefined,
  }))

  const pdfUrl = `${baseUrl}/api/packing-list/${packingList.id}/pdf`

  const data: PackingListPDFData = {
    company: company
      ? {
          nom: company.name,
          adresse: company.adresse,
          ville: company.ville,
          codePostal: company.codePostal,
          telephone: company.telephone,
          email: company.email,
          matriculeFiscal: company.matriculeFiscal,
          logo: company.logo,
        }
      : { nom: "Entreprise" },
    ordre: {
      code: packingList.ordre.code,
      dateLivraison: packingList.ordre.dateLivraison,
    },
    tiers: packingList.ordre.tiers
      ? {
          raisonSociale: packingList.ordre.tiers.raisonSociale,
          adresse: packingList.ordre.tiers.adresse,
          ville: packingList.ordre.tiers.ville,
          telephone: packingList.ordre.tiers.telephone,
          email: packingList.ordre.tiers.email,
        }
      : null,
    produit: packingList.ordre.product,
    numero: packingList.numero,
    dateCreation: packingList.createdAt,
    capaciteCarton: packingList.capaciteCarton,
    details,
    cartons,
    nbCartons: packingList.nbCartons,
    totalPieces: packingList.totalPieces,
    pdfUrl,
  }

  const packingBuffer = await genererPackingListPDF(data)
  const etiquettesBuffer = await genererEtiquettesPDF(data, etiquetteFormat)

  return {
    packingBuffer,
    etiquettesBuffer,
    packingListUrl: `/packing-lists/${packingList.numero}-packing-list.pdf`,
    etiquettesUrl: `/packing-lists/${packingList.numero}-etiquettes.pdf`,
    pdfUrl,
  }
}
