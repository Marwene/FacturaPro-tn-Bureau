import { jsPDF } from "jspdf"
import type { Carton } from "./colisage"
import {
  sortTailles,
  fmtDate,
  ACCENT,
  DARK,
  GRAY,
  LIGHT_GRAY,
  A4_LABEL_W,
  A4_LABEL_H,
  A4_COLS,
  A4_ROWS,
  A4_MARGIN,
  A4_TOP_MARGIN,
  type PackingListPDFData,
} from "./pdf-shared"

/**
 * Planche A4 : 4 étiquettes par page (2×2), 99.1×139 mm chacune.
 * Extrait verbatim de l'ancienne branche `format === "a4"` de genererEtiquettesPDF
 * (l'indentation d'origine de l'extraction est conservée : aucune instruction déplacée).
 */
export function genererEtiquettesA4(data: PackingListPDFData, qr: string): Buffer {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const drawLabel = (carton: Carton, offsetX: number, offsetY: number, labelW: number, labelH: number) => {
      const M = 4
      const tW = labelW - M * 2

      // ── 1. Bandeau supérieur
      doc.setFillColor(...ACCENT)
      doc.rect(offsetX, offsetY, labelW, 9, "F")

      if (data.company.logo) {
        try { doc.addImage(data.company.logo, "PNG", offsetX + M, offsetY + 1, 7, 7) } catch { /* */ }
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.text(data.company.nom || "Entreprise", offsetX + M + 8.5, offsetY + 5.5)
      } else {
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.text(data.company.nom || "Entreprise", offsetX + M + 1, offsetY + 5.5)
      }

      doc.setFillColor(255, 255, 255)
      doc.roundedRect(offsetX + labelW - 28, offsetY + 1, 24, 6, 1, 1, "F")
      doc.setTextColor(...ACCENT)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6)
      doc.text("EXPÉDITION", offsetX + labelW - 16, offsetY + 5, { align: "center" })

      // ── 2. DESTINATAIRE
      let y = offsetY + 11

      doc.setFillColor(...ACCENT)
      doc.roundedRect(offsetX + M, y, 28, 4, 0.8, 0.8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(5)
      doc.text("SHIP TO / DESTINATAIRE", offsetX + M + 1.5, y + 2.8)

      y += 5
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...ACCENT)
      doc.setLineWidth(0.6)
      doc.roundedRect(offsetX + M, y, tW, 22, 1, 1, "FD")

      doc.setTextColor(...DARK)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      const clientNom = data.tiers?.raisonSociale ?? "—"
      const nomLines = doc.splitTextToSize(clientNom, tW - 4)
      let ty = y + 5
      for (const l of nomLines.slice(0, 2)) {
        doc.text(l, offsetX + M + 2, ty)
        ty += 4.5
      }

      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.setTextColor(80)
      const toLines = [
        [data.tiers?.adresse, data.tiers?.ville].filter((x): x is string => !!x).join(", "),
        data.tiers?.telephone,
      ].filter((x): x is string => !!x)
      for (const line of toLines) {
        for (const wrapped of doc.splitTextToSize(line, tW - 4)) {
          if (ty > y + 20) break
          doc.text(wrapped, offsetX + M + 2, ty)
          ty += 3
        }
      }

      // ── 3. EXPÉDITEUR + COLIS
      y += 24
      doc.setFillColor(...LIGHT_GRAY)
      doc.roundedRect(offsetX + M, y, tW, 14, 1, 1, "F")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(5)
      doc.setTextColor(120)
      doc.text("SHIP FROM / EXPÉDITEUR", offsetX + M + 2, y + 3)

      doc.setTextColor(30)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6.5)
      doc.text(data.company.nom || "Entreprise", offsetX + M + 2, y + 6)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(5)
      doc.setTextColor(80)
      let fy = y + 9
      const fromAddr = [data.company.adresse, data.company.ville].filter(Boolean).join(", ")
      if (fromAddr) { doc.text(fromAddr.substring(0, 35), offsetX + M + 2, fy); fy += 2.5 }

      const rightCol = offsetX + M + tW / 2 + 2
      doc.setFont("helvetica", "bold")
      doc.setFontSize(5)
      doc.setTextColor(120)
      doc.text("COLIS", rightCol, y + 3)
      doc.setTextColor(30)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.text(`N° ${carton.numero}/${data.nbCartons} — ${carton.totalPieces} p.`, rightCol, y + 6.5)
      if (carton.typeNom) doc.text(carton.typeNom, rightCol, y + 9.5)

      // ── 4. Bandeau références
      y += 16
      doc.setFillColor(...GRAY)
      doc.rect(offsetX, y, labelW, 7, "F")
      doc.setTextColor(...ACCENT)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6)
      doc.text(`PL ${data.numero}`, offsetX + M + 1, y + 3.5)
      doc.setTextColor(50)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(5.5)
      doc.text(`OF: ${data.ordre.code}`, offsetX + M + 25, y + 3.5)
      doc.text(fmtDate(data.ordre.dateLivraison), offsetX + labelW - M - 1, y + 3.5, { align: "right" })
      doc.setFont("helvetica", "bold")
      doc.setFontSize(5)
      doc.text("MODÈLE", offsetX + M + 1, y + 6.5)
      doc.setFont("helvetica", "normal")
      const modele = doc.splitTextToSize(data.produit.nom, tW - 30)
      doc.text(modele[0], offsetX + M + 13, y + 6.5)

      // ── 5. Tableau tailles
      y += 9
      doc.setFillColor(...ACCENT)
      doc.rect(offsetX + M, y, tW, 4, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(5.5)
      doc.text("TAILLE", offsetX + M + 2, y + 2.8)
      doc.text("QTE", offsetX + M + tW - 2, y + 2.8, { align: "right" })
      y += 4

      const tailles = sortTailles(Object.keys(carton.contenu))
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      let rowIdx = 0
      for (const t of tailles) {
        if (y > offsetY + labelH - 22) break
        if (rowIdx % 2 === 0) {
          doc.setFillColor(250, 250, 252)
          doc.rect(offsetX + M, y - 2.5, tW, 3.8, "F")
        }
        doc.setTextColor(30)
        doc.text(t, offsetX + M + 2, y)
        doc.text(String(carton.contenu[t] ?? 0), offsetX + M + tW - 2, y, { align: "right" })
        y += 3.8
        rowIdx++
      }

      // Total
      y = Math.max(y, offsetY + labelH - 20)
      doc.setDrawColor(...ACCENT)
      doc.setLineWidth(0.3)
      doc.line(offsetX + M, y, offsetX + M + tW, y)
      y += 1
      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.setTextColor(...ACCENT)
      doc.text("TOTAL", offsetX + M + 2, y + 1)
      doc.text(`${carton.totalPieces} pièce${carton.totalPieces > 1 ? "s" : ""}`, offsetX + M + tW - 2, y + 1, { align: "right" })

      // ── 6. QR Code + N° COLIS
      y += 4
      const qrSize = 14
      const qrX = offsetX + M + 1
      doc.addImage(qr, "PNG", qrX, y, qrSize, qrSize)

      const trackX = qrX + qrSize + 3
      const trackW = tW - qrSize - 5
      doc.setFillColor(...LIGHT_GRAY)
      doc.roundedRect(trackX, y, trackW, qrSize, 1, 1, "F")
      doc.setTextColor(120)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(5)
      doc.text("N° COLIS", trackX + 2, y + 3.5)
      doc.setTextColor(...ACCENT)
      doc.setFontSize(18)
      doc.text(`${carton.numero}`, trackX + trackW / 2, y + 10, { align: "center" })
      doc.setTextColor(80)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.text(`sur ${data.nbCartons}`, trackX + trackW / 2, y + qrSize - 2, { align: "center" })

      // ── 7. Pied de page
      doc.setDrawColor(210, 210, 215)
      doc.setLineWidth(0.15)
      doc.line(offsetX + M, offsetY + labelH - 4, offsetX + labelW - M, offsetY + labelH - 4)
      doc.setTextColor(140)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(4)
      doc.text(`${data.company.nom || "FacturaPro TN"} • ${data.ordre.code}`, offsetX + M, offsetY + labelH - 1.5)
      doc.text(`Colis ${carton.numero}/${data.nbCartons}`, offsetX + labelW - M, offsetY + labelH - 1.5, { align: "right" })
    }

    // Place 4 labels per page (2 cols × 2 rows)
    data.cartons.forEach((carton, idx) => {
      const posOnPage = idx % (A4_COLS * A4_ROWS)
      if (posOnPage === 0 && idx > 0) doc.addPage()
      const col = posOnPage % A4_COLS
      const row = Math.floor(posOnPage / A4_COLS)
      const offsetX = A4_MARGIN + col * A4_LABEL_W
      const offsetY = A4_TOP_MARGIN + row * A4_LABEL_H
      drawLabel(carton, offsetX, offsetY, A4_LABEL_W, A4_LABEL_H)
    })

    return Buffer.from(doc.output("arraybuffer"))
}
