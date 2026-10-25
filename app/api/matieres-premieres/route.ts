import { NextRequest } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { z } from "zod"

const matiereSchema = z.object({
  code: z.string().min(1),
  nom: z.string().min(1),
  type: z.string(),
  unite: z.string(),
  prixUnitaire: z.coerce.number().min(0).default(0),
  stockActuel: z.coerce.number().default(0),
  stockMinimum: z.coerce.number().default(0),
  fournisseurId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

export const GET = apiRoute.get(
  { permission: "matieres:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = { companyId }
    if (type) where.type = type
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }

    const matieres = await prisma.matierePremiere.findMany({
      where,
      include: { fournisseur: { select: { id: true, raisonSociale: true } } },
      orderBy: { code: "asc" },
    })

    return { matieres: serializeDecimals(matieres) }
  }
)

export const POST = apiRoute.post(
  { permission: "matieres:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json()
    const parsed = matiereSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const matiere = await prisma.matierePremiere.create({
      data: { ...parsed.data, companyId },
    })

    return { matiere: serializeDecimals(matiere) }
  }
)
