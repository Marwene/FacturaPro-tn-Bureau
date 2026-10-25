import { NextRequest, NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { nextNumber } from "@/lib/sequence"
import { z } from "zod"
import { repartirParTailles, validerColisage, type CartonType } from "@/lib/packing-list/colisage"
import { genererPackingDocuments } from "@/lib/packing-list/generate"
import * as fs from "fs"
import * as path from "path"

const cartonTypeSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(1),
  capacite: z.coerce.number().int().min(1),
})

const packingListSchema = z.object({
  ordreId: z.string().min(1),
  capaciteCarton: z.coerce.number().int().min(0).default(0),
  cartonTypes: z.array(cartonTypeSchema).optional().nullable(),
  cartonsManuels: z
    .array(
      z.object({
        contenu: z.record(z.string(), z.coerce.number().int().min(0)),
      })
    )
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
})

export const GET = apiRoute.get(
  { permission: "packing:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get("statut")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = { companyId }
    if (statut) where.statut = statut
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        { ordre: { code: { contains: search, mode: "insensitive" } } },
        { ordre: { tiers: { raisonSociale: { contains: search, mode: "insensitive" } } } },
      ]
    }

    const packingLists = await prisma.packingList.findMany({
      where,
      include: {
        ordre: {
          select: {
            code: true,
            product: { select: { id: true, code: true, nom: true } },
            tiers: { select: { id: true, raisonSociale: true, code: true } },
          },
        },
        cartons: { orderBy: { numero: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { packingLists: serializeDecimals(packingLists) }
  }
)

export const POST = apiRoute.post(
  { permission: "packing:creer", requireCompany: true },
  async (request: NextRequest, { companyId }) => {
    const body = await request.json()
    const parsed = packingListSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 })
    }

    const { ordreId, capaciteCarton, cartonTypes, cartonsManuels, notes } = parsed.data

    const ordre = await prisma.ordreFabrication.findFirst({
      where: { id: ordreId, companyId },
      select: { id: true, code: true, quantite: true, details: true },
    })
    if (!ordre) return NextResponse.json(errorResponse("Ordre de fabrication introuvable"), { status: 404 })

    const details = (ordre.details ?? []) as Array<{ taille?: string; quantite?: number }>
    const demande = new Map<string, number>()
    if (details.length > 0) {
      for (const d of details) {
        const taille = d.taille || "Std"
        const q = Math.max(0, Math.floor(d.quantite ?? 0))
        if (q > 0) demande.set(taille, (demande.get(taille) ?? 0) + q)
      }
    } else {
      demande.set("Std", Math.max(0, Math.floor(ordre.quantite)))
    }
    const demandeListe = Array.from(demande.entries()).map(([taille, quantite]) => ({ taille, quantite }))

    const manuels = (cartonsManuels ?? []).map((m) => ({ contenu: m.contenu, totalPieces: 0 }))

    if (manuels.length > 0) {
      const validation = validerColisage(demandeListe, manuels)
      if (!validation.ok) {
        return NextResponse.json(
          errorResponse(`Colisage manuel incohérent : ${validation.erreurs.join(" ; ")}`),
          { status: 400 }
        )
      }
    }

    // Types de cartons sélectionnés (prioritaires) sinon capacité simple
    const typesSelectionnes: CartonType[] | undefined = cartonTypes?.length
      ? cartonTypes
      : capaciteCarton > 0
        ? [{ id: "defaut", nom: "Carton", capacite: capaciteCarton }]
        : undefined

    const colisage = repartirParTailles(demandeListe, typesSelectionnes ?? [], manuels)

    if (colisage.nbCartons === 0) {
      return NextResponse.json(errorResponse("Aucune pièce à coliser"), { status: 400 })
    }

    const numero = await nextNumber("packing", "PL", companyId)

    let typesJson: unknown
    try {
      typesJson = JSON.parse(JSON.stringify(typesSelectionnes ?? []))
    } catch {
      typesJson = []
    }

    const packingList = await prisma.$transaction(async (tx) => {
      const created = await tx.packingList.create({
        data: {
          companyId,
          ordreId,
          numero,
          capaciteCarton: typesSelectionnes ? typesSelectionnes[0].capacite : colisage.capaciteCarton,
          cartonTypes: typesJson ?? undefined,
          nbCartons: colisage.nbCartons,
          totalPieces: colisage.totalPieces,
          statut: "GENERE",
          notes: notes || null,
        },
      })
      await tx.packingCarton.createMany({
        data: colisage.cartons.map((c) => ({
          packingListId: created.id,
          numero: c.numero,
          contenu: c.contenu,
          totalPieces: c.totalPieces,
          capacite: c.capacite ?? null,
          typeNom: c.typeNom ?? null,
        })),
      })
      return created
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? ""
    const generated = await genererPackingDocuments(packingList.id, companyId, baseUrl)

    const dir = path.join(process.cwd(), "public", "packing-lists")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(process.cwd(), "public", generated.packingListUrl), generated.packingBuffer)
    fs.writeFileSync(path.join(process.cwd(), "public", generated.etiquettesUrl), generated.etiquettesBuffer)

    const updated = await prisma.packingList.update({
      where: { id: packingList.id },
      data: { packingListUrl: generated.packingListUrl, etiquettesUrl: generated.etiquettesUrl },
      include: { cartons: { orderBy: { numero: "asc" } } },
    })

    return { packingList: serializeDecimals(updated) }
  }
)
