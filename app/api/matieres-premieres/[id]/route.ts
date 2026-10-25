import { NextRequest, NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { z } from "zod"

const matiereUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  nom: z.string().min(1).optional(),
  type: z.string().optional(),
  unite: z.string().optional(),
  prixUnitaire: z.coerce.number().min(0).optional(),
  stockActuel: z.coerce.number().optional(),
  stockMinimum: z.coerce.number().optional(),
  fournisseurId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  actif: z.boolean().optional(),
})

export const GET = apiRoute.get(
  { permission: "matieres:voir", requireCompany: true },
  async (request, { params }) => {
    const matiere = await prisma.matierePremiere.findFirst({
      where: { id: params.id },
      include: { fournisseur: { select: { id: true, raisonSociale: true } } },
    })
    if (!matiere) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })
    return { matiere: serializeDecimals(matiere) }
  }
)

export const PUT = apiRoute.put(
  { permission: "matieres:modifier", requireCompany: true },
  async (request, { params }) => {
    const body = await request.json()
    const parsed = matiereUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const matiere = await prisma.matierePremiere.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return { matiere: serializeDecimals(matiere) }
  }
)

export const DELETE = apiRoute.delete(
  { permission: "matieres:supprimer", requireCompany: true },
  async (request, { params }) => {
    await prisma.matierePremiere.delete({ where: { id: params.id } })
    return { success: true }
  }
)
