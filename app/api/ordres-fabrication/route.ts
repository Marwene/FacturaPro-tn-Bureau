import { apiRoute } from "@/lib/api-route"
import { prisma } from "@/lib/prisma"
import { serializeDecimals } from "@/lib/decimal"
import { errorResponse } from "@/lib/schemas"
import { nextNumber } from "@/lib/sequence"
import { z } from "zod"

const ordreSchema = z.object({
  productId: z.string().min(1),
  tiersId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  designId: z.string().optional().nullable(),
  bonCommandeLineId: z.string().optional().nullable(),
  quantite: z.coerce.number().int().min(1),
  dateDebut: z.string().optional().nullable(),
  dateFin: z.string().optional().nullable(),
  dateLivraison: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  details: z
    .array(
      z.object({
        variantId: z.string(),
        variantNom: z.string(),
        taille: z.string().default(""),
        couleur: z.string().default(""),
        quantite: z.coerce.number().int().min(0),
        quantiteProduite: z.coerce.number().int().min(0).default(0),
      })
    )
    .optional()
    .nullable(),
})

export const GET = apiRoute.get(
  { permission: "production:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get("statut")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = { companyId }
    if (statut) where.statut = statut
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
      ]
    }

    const ordres = await prisma.ordreFabrication.findMany({
      where,
      include: {
        tiers: { select: { id: true, raisonSociale: true, code: true } },
        product: { select: { id: true, code: true, nom: true, photoUrl: true } },
        variant: { select: { id: true, nom: true } },
        design: { select: { id: true, nom: true, thumbnail: true } },
        bonCommandeLine: { select: { id: true, description: true, statutRapprochement: true, bonCommande: { select: { id: true, numero: true } } } },
        matieres: {
          include: { matiere: { select: { id: true, code: true, nom: true, unite: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { ordres: serializeDecimals(ordres) }
  }
)

export const POST = apiRoute.post(
  { permission: "production:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json()
    const parsed = ordreSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Données invalides", parsed.error.issues)
    }

    const { productId, tiersId, variantId, designId, bonCommandeLineId, quantite, dateDebut, dateFin, dateLivraison, notes, details } = parsed.data

    // Garde-fou : un OF rattaché à une ligne de Bon de Commande ne peut être
    // créé que si le rapprochement quantités (BC vs BC détaillé) est soldé.
    // Sans rattachement à un BC (production hors-commande), aucun blocage.
    if (bonCommandeLineId) {
      const ligne = await prisma.bonCommandeLine.findFirst({
        where: { id: bonCommandeLineId, bonCommande: { companyId } },
        select: { id: true, description: true, quantite: true, quantiteDetaillee: true, statutRapprochement: true, typeSource: true },
      })

      if (!ligne) {
        return errorResponse("La ligne de bon de commande indiquée est introuvable")
      }

      if (ligne.statutRapprochement !== "RECONCILIE") {
        const libelle =
          ligne.statutRapprochement === "EN_ATTENTE_DETAIL"
            ? "le bon de commande détaillé n'a pas encore été importé pour cet article"
            : `écart de quantité détecté (commandé: ${ligne.quantite.toString()}, détaillé: ${ligne.quantiteDetaillee.toString()})`

        return errorResponse(
          `Impossible de générer l'OF pour "${ligne.description}" : ${libelle}. Le rapprochement doit être soldé avant production.`
        )
      }
    }

    const code = await nextNumber("ordre-fabrication", "OF", companyId)

    const ordre = await prisma.ordreFabrication.create({
      data: {
        companyId,
        code,
        productId,
        tiersId: tiersId || null,
        variantId: variantId || null,
        designId: designId || null,
        bonCommandeLineId: bonCommandeLineId || null,
        quantite,
        details: details || undefined,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
        notes: notes || null,
      },
      include: { product: { select: { id: true, code: true, nom: true } } },
    })

    return { ordre: serializeDecimals(ordre) }
  }
)
