import { NextRequest, NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { z } from "zod"

const ordreUpdateSchema = z.object({
  tiersId: z.string().optional().nullable(),
  quantite: z.coerce.number().int().min(1).optional(),
  statut: z.enum(["BROUILLON", "CONFIRME", "EN_COURS", "TERMINE", "ANNULE"]).optional(),
  dateDebut: z.string().optional().nullable(),
  dateFin: z.string().optional().nullable(),
  dateLivraison: z.string().optional().nullable(),
  ficheTechniqueUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const GET = apiRoute.get(
  { permission: "production:voir", requireCompany: true },
  async (request, { params }) => {
    const ordre = await prisma.ordreFabrication.findFirst({
      where: { id: params.id },
      include: {
        tiers: { select: { id: true, raisonSociale: true, code: true, adresse: true, telephone: true, email: true, matriculeFiscal: true } },
        product: { select: { id: true, code: true, nom: true, photoUrl: true } },
        variant: { select: { id: true, nom: true, attributs: true } },
        design: true,
        matieres: {
          include: { matiere: true },
        },
      },
    })
    if (!ordre) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })
    return { ordre: serializeDecimals(ordre) }
  }
)

export const PUT = apiRoute.put(
  { permission: "production:modifier", requireCompany: true },
  async (request, { params }) => {
    const body = await request.json()
    const parsed = ordreUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (data.dateDebut) data.dateDebut = new Date(data.dateDebut as string)
    if (data.dateFin) data.dateFin = new Date(data.dateFin as string)
    if (data.dateLivraison) data.dateLivraison = new Date(data.dateLivraison as string)

    const ordre = await prisma.ordreFabrication.update({
      where: { id: params.id },
      data,
    })

    return { ordre: serializeDecimals(ordre) }
  }
)

export const DELETE = apiRoute.delete(
  { permission: "production:supprimer", requireCompany: true },
  async (request, { params }) => {
    await prisma.ordreFabrication.delete({ where: { id: params.id } })
    return { success: true }
  }
)
