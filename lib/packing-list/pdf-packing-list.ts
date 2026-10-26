import { jsPDF } from "jspdf"
import { agregerParTaille, sortTailles, fmtDate, type PackingListPDFData } from "./pdf-shared"

/**
 * Génère le Packing List PDF (format paysage A4).
 */
export async function genererPackingListPDF(data: PackingListPDFData): Promise<Buffer> {
  const doc = new jsPDF("l", "mm", "a4")
  const pgW = doc.internal.pageSize.getWidth()
  const pgH = doc.internal.pageSize.getHeight()
  const M = 12
  const W = pgW - M * 2
  let y = M

  const nl = (h: number) => { y += h }
  const checkPage = () => {
    if (y > pgH - 25) {
      doc.addPage()
      y = M
    }
  }

  // ── En-tête ──────────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.rect(0, 0, pgW, 30, "F")
  doc.setFillColor(30, 30, 30)
  doc.rect(0, 30, pgW, 1, "F")

  if (data.company.logo) {
    try {
      doc.addImage(data.company.logo, "PNG", M, 5, 20, 20)
    } catch {
      /* logo illisible : on ignore */
    }
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(30)
  doc.text(data.company.nom || "Entreprise", M + 24, 12)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100)
  const adresse = [data.company.adresse, data.company.codePostal, data.company.ville].filter(Boolean).join(", ")
  if (adresse) doc.text(adresse, M + 24, 18)
  const contact = [data.company.telephone, data.company.email].filter(Boolean).join(" | ")
  if (contact) doc.text(contact, M + 24, 23)
  if (data.company.matriculeFiscal) {
    doc.text(`Mat. fiscal : ${data.company.matriculeFiscal}`, M + 24, 28)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(30)
  doc.text("PACKING LIST", pgW - M, 14, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(`N° : ${data.numero}`, pgW - M, 21, { align: "right" })
  doc.text(`Date : ${fmtDate(data.dateCreation)}`, pgW - M, 26, { align: "right" })

  y = 40

  // ── Infos OF / Client ────────────────────────────────────────────────────
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(M, y, W, 26, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(40)
  doc.text(`Ordre de fabrication : ${data.ordre.code}`, M + 4, y + 7)
  doc.text(`Modèle : ${data.produit.nom}`, M + 4, y + 14)
  doc.text(`Livraison : ${fmtDate(data.ordre.dateLivraison)}`, M + 4, y + 21)

  if (data.tiers) {
    doc.text("Client :", pgW / 2 + 8, y + 7)
    doc.setFont("helvetica", "bold")
    doc.text(data.tiers.raisonSociale, pgW / 2 + 8, y + 14)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(90)
    const clientAdresse = [data.tiers.adresse, data.tiers.ville].filter(Boolean).join(", ")
    if (clientAdresse) doc.text(clientAdresse, pgW / 2 + 8, y + 20)
    if (data.tiers.telephone) doc.text(`Tél : ${data.tiers.telephone}`, pgW / 2 + 8, y + 24)
    doc.setFontSize(10)
  }
  y += 34

  // ── Détail par taille ────────────────────────────────────────────────────
  checkPage()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.text("DÉTAIL DE LA COMMANDE", M, y)
  nl(6)

  const parTaille = agregerParTaille(data.details)
  const tailles = sortTailles(Object.keys(parTaille))
  const colW = (W - 90) / Math.max(1, tailles.length)
  const colX: number[] = []
  let cx = M
  for (const cw of [90, colW, colW]) { colX.push(cx); cx += cw }

  doc.setFillColor(235, 235, 235)
  doc.rect(M, y - 3.5, W, 8, "F")
  doc.setFontSize(8)
  doc.setTextColor(50)
  doc.text("Modèle", M + 2, y)
  tailles.forEach((t, i) => {
    doc.text(t, colX[1] + (i + 0.5) * colW, y, { align: "center" })
  })
  doc.text("Total", colX[2] + (tailles.length - 0.5) * colW, y, { align: "center" })
  y += 8

  let totalLigne = 0
  tailles.forEach((t) => { totalLigne += parTaille[t] ?? 0 })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(50)
  checkPage()
  doc.setFillColor(250, 250, 250)
  doc.rect(M, y - 3.5, W, 6.5, "F")
  doc.setFont("helvetica", "bold")
  doc.text(data.produit.nom, M + 2, y)
  tailles.forEach((t, i) => {
    doc.text(String(parTaille[t] ?? 0), colX[1] + (i + 0.5) * colW, y, { align: "center" })
  })
  doc.text(String(totalLigne), colX[2] + (tailles.length - 0.5) * colW, y, { align: "center" })
  y += 6.5
  doc.setDrawColor(200)
  doc.line(M, y, M + W, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(`Total pièces : ${totalLigne}`, M + 2, y)
  nl(8)

  // ── Répartition par carton ───────────────────────────────────────────────
  checkPage()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.text("RÉPARTITION PAR CARTON", M, y)
  nl(6)

  const capLabel = data.capaciteCarton > 0 ? ` (capacité : ${data.capaciteCarton} pièces/carton)` : " (sans limite de capacité)"
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(90)
  doc.text(`Nombre total de colis : ${data.nbCartons}${capLabel}`, M, y)
  nl(5)

  doc.setFillColor(235, 235, 235)
  doc.rect(M, y - 3.5, W, 8, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(50)
  doc.text("N° Carton", M + 2, y)
  tailles.forEach((t, i) => {
    doc.text(t, colX[1] + (i + 0.5) * colW, y, { align: "center" })
  })
  doc.text("Total", colX[2] + (tailles.length - 0.5) * colW, y, { align: "center" })
  y += 8

  doc.setFont("helvetica", "normal")
  for (const carton of data.cartons) {
    checkPage()
    doc.setFillColor(250, 250, 250)
    doc.rect(M, y - 3.5, W, 6.5, "F")
    doc.text(String(carton.numero), M + 2, y)
    if (carton.typeNom) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.setTextColor(90)
      doc.text(carton.typeNom, M + 12, y)
      doc.setFontSize(8)
      doc.setTextColor(50)
    }
    tailles.forEach((t, i) => {
      doc.text(String(carton.contenu[t] ?? 0), colX[1] + (i + 0.5) * colW, y, { align: "center" })
    })
    doc.setFont("helvetica", "bold")
    doc.text(String(carton.totalPieces), colX[2] + (tailles.length - 0.5) * colW, y, { align: "center" })
    doc.setFont("helvetica", "normal")
    y += 6.5
  }
  doc.setDrawColor(200)
  doc.line(M, y, M + W, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(30)
  doc.text(`TOTAL COLIS : ${data.nbCartons}`, M + 2, y)

  // ── Pied de page ─────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    doc.text(data.company.nom || "FacturaPro TN", M, pgH - 7)
    doc.text(`Page ${i} / ${pageCount}`, pgW - M, pgH - 7, { align: "right" })
  }

  return Buffer.from(doc.output("arraybuffer"))
}
