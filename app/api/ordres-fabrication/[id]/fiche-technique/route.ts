import { NextResponse } from "next/server"
import { apiRoute } from "@/lib/api-route"
import { genererFicheTechnique } from "@/lib/customizer/export/generate-fiche"
import { prisma } from "@/lib/prisma"
import * as fs from "fs"
import * as path from "path"

export const GET = apiRoute.get(
  { permission: "production:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const ordre = await prisma.ordreFabrication.findFirst({
      where: { id: params.id },
      select: { id: true, ficheTechniqueUrl: true, code: true },
    })
    if (!ordre) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    }

    if (ordre.ficheTechniqueUrl) {
      const filepath = path.join(process.cwd(), "public", ordre.ficheTechniqueUrl)
      if (fs.existsSync(filepath)) {
        const html = fs.readFileSync(filepath, "utf-8")
        return new NextResponse(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      }
    }

    const url = await genererFicheTechnique(params.id, companyId)
    const filepath = path.join(process.cwd(), "public", url)
    const html = fs.readFileSync(filepath, "utf-8")
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
)

export const POST = apiRoute.post(
  { permission: "production:modifier", requireCompany: true },
  async (request, { params, companyId }) => {
    const url = await genererFicheTechnique(params.id, companyId)
    return { url }
  }
)
