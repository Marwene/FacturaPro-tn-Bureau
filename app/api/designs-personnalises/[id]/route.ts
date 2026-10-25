import { NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { z } from "zod"

const updateSchema = z.object({
  nom: z.string().min(1).optional(),
  layers: z.any().optional(), // Complex JSON structure for design layers - validated at application level
  thumbnail: z.string().optional().nullable(),
  statut: z.string().optional(),
})

export const GET = apiRoute.get(
  { permission: "produits:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const design = await prisma.designPersonnalise.findFirst({
      where: { id: params.id, companyId },
      include: {
        product: { select: { id: true, code: true, nom: true } },
        ordres: { select: { id: true, code: true, statut: true } },
      },
    })
    if (!design) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    return { design: serializeDecimals(design) }
  }
)

export const PUT = apiRoute.put(
  { permission: "produits:modifier", requireCompany: true },
  async (request, { params, companyId }) => {
    const existing = await prisma.designPersonnalise.findFirst({
      where: { id: params.id, companyId },
      select: { id: true },
    })
    if (!existing) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const design = await prisma.designPersonnalise.update({
      where: { id: params.id },
      data: parsed.data,
      include: { product: { select: { id: true, code: true, nom: true } } },
    })

    return { design: serializeDecimals(design) }
  }
)

export const DELETE = apiRoute.delete(
  { permission: "produits:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const design = await prisma.designPersonnalise.findFirst({
      where: { id: params.id, companyId },
      select: { id: true },
    })
    if (!design) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

    await prisma.designPersonnalise.delete({ where: { id: params.id } })
    return { success: true }
  }
)
