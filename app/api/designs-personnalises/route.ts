import { NextRequest } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { z } from "zod"

const designSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  nom: z.string().min(1),
  layers: z.any(),
  thumbnail: z.string().optional().nullable(),
})

export const GET = apiRoute.get(
  { permission: "produits:voir", requireCompany: true },
  async (request, { companyId }) => {
    const designs = await prisma.designPersonnalise.findMany({
      where: { companyId },
      include: {
        product: { select: { id: true, code: true, nom: true } },
        ordres: { select: { id: true, code: true, statut: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return { designs: serializeDecimals(designs) }
  }
)

export const POST = apiRoute.post(
  { permission: "produits:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json()
    const parsed = designSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const design = await prisma.designPersonnalise.create({
      data: {
        ...parsed.data,
        companyId,
        variantId: parsed.data.variantId || null,
        layers: parsed.data.layers,
      },
      include: { product: { select: { id: true, code: true, nom: true } } },
    })

    return { design: serializeDecimals(design) }
  }
)
