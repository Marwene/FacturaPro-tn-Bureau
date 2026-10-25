import { NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import * as fs from "fs"
import * as path from "path"

export const GET = apiRoute.get(
  { permission: "packing:voir", requireCompany: true },
  async (request, { params }) => {
    const packingList = await prisma.packingList.findFirst({
      where: { id: params.id },
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
    if (!packingList) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })
    return { packingList: serializeDecimals(packingList) }
  }
)

export const DELETE = apiRoute.delete(
  { permission: "packing:supprimer", requireCompany: true },
  async (request, { params }) => {
    const packingList = await prisma.packingList.findFirst({
      where: { id: params.id },
    })
    if (!packingList) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })

    await prisma.packingList.delete({ where: { id: params.id } })

    const dir = path.join(process.cwd(), "public", "packing-lists")
    for (const url of [packingList.packingListUrl, packingList.etiquettesUrl]) {
      if (url) {
        const filepath = path.join(process.cwd(), "public", url)
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath)
          } catch (err) {
            console.error("[packing-list] suppression du fichier généré impossible", err)
          }
        }
      }
    }
    void dir

    return { success: true }
  }
)
