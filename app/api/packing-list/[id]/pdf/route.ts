import { NextRequest, NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { errorResponse } from "@/lib/schemas"
import { genererPackingDocuments } from "@/lib/packing-list/generate"
import * as fs from "fs"
import * as path from "path"

export const GET = apiRoute.get(
  { permission: "packing:voir", requireCompany: true },
  async (request: NextRequest, { params, companyId }) => {
    const packingList = await prisma.packingList.findFirst({
      where: { id: params.id, companyId },
    })
    if (!packingList) return NextResponse.json(errorResponse("Introuvable"), { status: 404 })

    let filepath = packingList.packingListUrl
      ? path.join(process.cwd(), "public", packingList.packingListUrl)
      : ""

    if (!filepath || !fs.existsSync(filepath)) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? ""
      const generated = await genererPackingDocuments(params.id, companyId, baseUrl)
      const dir = path.join(process.cwd(), "public", "packing-lists")
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(process.cwd(), "public", generated.packingListUrl), generated.packingBuffer)
      filepath = path.join(process.cwd(), "public", generated.packingListUrl)
      await prisma.packingList.update({
        where: { id: params.id },
        data: { packingListUrl: generated.packingListUrl, etiquettesUrl: generated.etiquettesUrl },
      })
    }

    const buffer = fs.readFileSync(filepath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${packingList.numero}-packing-list.pdf"`,
      },
    })
  }
)
