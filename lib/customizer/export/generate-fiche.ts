import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import type { DesignLayer, EmbroideryLayerData } from "@/lib/customizer/types/product-customizer"
import * as fs from "fs"
import * as path from "path"

export async function genererFicheTechnique(ordreId: string, companyId: string): Promise<string> {
  const ordre = await prisma.ordreFabrication.findFirst({
    where: { id: ordreId, companyId },
    include: {
      product: true,
      variant: true,
      design: true,
    },
  })

  if (!ordre) throw new Error("OF introuvable")

  const layers = (ordre.design?.layers ?? []) as unknown as DesignLayer[]

  // Generate PDF
  const doc = new jsPDF("p", "mm", "a4")
  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2
  let y = margin

  const nl = (h: number) => { y += h }
  const hr = () => {
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    nl(4)
  }

  // Header
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("FICHE DE PRODUCTION", margin, y)
  nl(8)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(120)
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, y)
  nl(6)
  doc.setTextColor(0)
  hr()

  // Info
  const infos: [string, string][] = [
    ["Produit", ordre.product.nom],
    ["Code", ordre.product.code],
    ["Couleur", "white"],
    ["Taille", ordre.variant?.nom ?? "Standard"],
    ["Calques", `${layers.length}`],
  ]

  doc.setFontSize(9)
  const col1 = margin
  const col2 = margin + 40
  for (const [label, value] of infos) {
    doc.setFont("helvetica", "bold")
    doc.text(label + ":", col1, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, col2, y)
    nl(5)
  }
  hr()

  // Layers
  const embroideryLayers = layers.filter((l) => l.type === "embroidery")
  const textLayers = layers.filter((l) => l.type === "text")
  const imageLayers = layers.filter((l) => l.type === "image" || l.type === "logo")

  const impressionLayers = [...textLayers, ...imageLayers]
  if (impressionLayers.length > 0) {
    if (y > 230) { doc.addPage(); y = margin }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("IMPRESSION", margin, y)
    nl(7)

    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text("Emplacement", margin, y)
    doc.text("Contenu", margin + 40, y)
    doc.text("Type", margin + 110, y)
    nl(4)
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    nl(3)

    doc.setFont("helvetica", "normal")
    for (const layer of impressionLayers) {
      if (y > 275) { doc.addPage(); y = margin; doc.setFont("helvetica", "normal") }
      const view = layer.view === "back" ? "Dos" : "Côté Cœur"
      let type = ""
      if (layer.type === "text") { type = "Texte" } else { type = "Image / Logo" }
      doc.text(view, margin, y)
      doc.text(layer.name.length > 20 ? layer.name.slice(0, 20) + "…" : layer.name, margin + 40, y)
      doc.text(type, margin + 110, y)
      nl(4.5)
    }
    nl(2)
  }

  if (embroideryLayers.length > 0) {
    if (y > 210) { doc.addPage(); y = margin }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("BRODERIE", margin, y)
    nl(7)

    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text("Emplacement", margin, y)
    doc.text("Fil", margin + 40, y)
    doc.text("Point", margin + 100, y)
    doc.text("Densité", margin + 130, y)
    doc.text("Sous-couche", margin + 160, y)
    doc.text("Points", margin + 185, y)
    nl(4)
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    nl(3)

    doc.setFont("helvetica", "normal")
    for (const layer of embroideryLayers) {
      if (y > 275) { doc.addPage(); y = margin; doc.setFont("helvetica", "normal") }
      const ed = layer.data as EmbroideryLayerData
      const view = layer.view === "back" ? "Dos" : "Côté Cœur"
      doc.text(view, margin, y)
      doc.text(`${ed.threadCode ?? ""}`, margin + 40, y)
      doc.text(ed.stitchType ?? "", margin + 100, y)
      doc.text(ed.stitchDensity != null ? `${ed.stitchDensity}/10` : "", margin + 130, y)
      doc.text(ed.underlay ? "Oui" : "Non", margin + 160, y)
      doc.text((ed.estimatedStitchCount ?? 0).toLocaleString(), margin + 185, y)
      nl(4.5)
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    doc.text("FacturaPro TN", margin, 290)
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 290, { align: "right" })
  }

  // Save
  const dir = path.join(process.cwd(), "public", "fiches-techniques")
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filename = `${ordre.code}.pdf`
  const filepath = path.join(dir, filename)
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
  fs.writeFileSync(filepath, pdfBuffer)

  const url = `/fiches-techniques/${filename}`

  await prisma.ordreFabrication.update({
    where: { id: ordreId },
    data: { ficheTechniqueUrl: url },
  })

  return url
}
