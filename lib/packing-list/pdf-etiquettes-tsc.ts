import { jsPDF } from "jspdf"
import type { Carton } from "./colisage"
import { sortTailles, fmtDate, ETIQUETTE_W, ETIQUETTE_H, ACCENT, DARK, GRAY, LIGHT_GRAY, type PackingListPDFData } from "./pdf-shared"

/**
 * Format TSC T200 : 100×150 mm, une étiquette par page (imprimante thermique).
 * Extrait verbatim de l'ancienne branche par défaut de genererEtiquettesPDF
 * (aucune instruction déplacée ni réordonnée).
 */
export function genererEtiquettesTSC(data: PackingListPDFData, qr: string): Buffer {
  // ── Format TSC T200 (100×150 mm, 1 étiquette par page) ──────────────────
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [ETIQUETTE_W, ETIQUETTE_H],
  })

  const W = ETIQUETTE_W
  const H = ETIQUETTE_H
  const M = 5

  const drawLabelTSC = (carton: Carton) => {
    // ── 1. Bandeau supérieur (branding transporteur) ───────────────────────
    doc.setFillColor(...ACCENT)
    doc.rect(0, 0, W, 11, "F")

    if (data.company.logo) {
      try { doc.addImage(data.company.logo, "PNG", M, 1.5, 8, 8) } catch { /* */ }
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(data.company.nom || "Entreprise", M + 10, 7)
    } else {
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(data.company.nom || "Entreprise", M + 2, 7)
    }

    doc.setFillColor(255, 255, 255)
    doc.roundedRect(W - 32, 2, 27, 7, 1, 1, "F")
    doc.setTextColor(...ACCENT)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text("EXPÉDITION", W - 18.5, 6.6, { align: "center" })

    // ── 2. DESTINATAIRE
    let y = 13.5

    doc.setFillColor(...ACCENT)
    doc.roundedRect(M, y, 30, 4.5, 0.8, 0.8, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.5)
    doc.text("SHIP TO / DESTINATAIRE", M + 1.5, y + 3.2)

    y += 6
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.8)
    doc.roundedRect(M, y, W - M * 2, 27, 1, 1, "FD")

    doc.setTextColor(...DARK)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    const clientNom = data.tiers?.raisonSociale ?? "—"
    const nomLines = doc.splitTextToSize(clientNom, W - M * 2 - 6)
    let ty = y + 7
    for (const l of nomLines.slice(0, 2)) {
      doc.text(l, M + 3, ty)
      ty += 6
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(80)
    const toLines = [
      [data.tiers?.adresse, data.tiers?.ville].filter((x): x is string => !!x).join(", "),
      data.tiers?.telephone,
      data.tiers?.email,
    ].filter((x): x is string => !!x)
    for (const line of toLines) {
      for (const wrapped of doc.splitTextToSize(line, W - M * 2 - 6)) {
        if (ty > y + 25) break
        doc.text(wrapped, M + 3, ty)
        ty += 3.5
      }
    }

    // ── 3. EXPÉDITEUR + COLIS
    y = 49
    doc.setFillColor(...LIGHT_GRAY)
    doc.roundedRect(M, y, W - M * 2, 17, 1, 1, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.5)
    doc.setTextColor(120)
    doc.text("SHIP FROM / EXPÉDITEUR", M + 2, y + 3.5)

    doc.setTextColor(30)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(data.company.nom || "Entreprise", M + 2, y + 7)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.setTextColor(80)
    let fy = y + 10
    const fromLines = [
      [data.company.adresse, data.company.codePostal, data.company.ville].filter(Boolean).join(", "),
      [data.company.telephone, data.company.email].filter(Boolean).join(" | "),
      data.company.matriculeFiscal ? `MF: ${data.company.matriculeFiscal}` : "",
    ].filter(Boolean)
    for (const line of fromLines) {
      for (const wrapped of doc.splitTextToSize(line, (W - M * 2) / 2 - 3)) {
        if (fy > y + 16) break
        doc.text(wrapped, M + 2, fy)
        fy += 3
      }
    }

    const rightCol = M + (W - M * 2) / 2 + 2
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.5)
    doc.setTextColor(120)
    doc.text("COLIS / PACKAGE", rightCol, y + 3.5)

    doc.setTextColor(30)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.text(`N° ${carton.numero} / ${data.nbCartons}`, rightCol, y + 7)
    doc.text(`${carton.totalPieces} pièce${carton.totalPieces > 1 ? "s" : ""}`, rightCol, y + 10.5)
    if (carton.typeNom) doc.text(carton.typeNom, rightCol, y + 14)

    // ── 4. Bandeau références
    y = 68
    doc.setFillColor(...GRAY)
    doc.rect(0, y, W, 9, "F")

    doc.setTextColor(...ACCENT)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text(`PL ${data.numero}`, M + 2, y + 4)

    doc.setTextColor(50)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.text(`OF: ${data.ordre.code}`, M + 32, y + 4)
    doc.text(fmtDate(data.ordre.dateLivraison), W - M - 2, y + 4, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(6)
    doc.text("MODÈLE", M + 2, y + 8)
    doc.setFont("helvetica", "normal")
    const modele = doc.splitTextToSize(data.produit.nom, W - 75)
    doc.text(modele[0], 18, y + 8)

    // ── 5. Tableau contenu du carton (tailles)
    y = 79
    const tW = W - M * 2

    doc.setFillColor(...ACCENT)
    doc.rect(M, y, tW, 5, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.text("TAILLE", M + 3, y + 3.7)
    doc.text("QUANTITÉ", W - M - 3, y + 3.7, { align: "right" })
    y += 5

    const tailles = sortTailles(Object.keys(carton.contenu))
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    let rowIdx = 0
    for (const t of tailles) {
      if (y > 115) break
      if (rowIdx % 2 === 0) {
        doc.setFillColor(250, 250, 252)
        doc.rect(M, y - 3.1, tW, 4.8, "F")
      }
      doc.setTextColor(30)
      doc.text(t, M + 3, y)
      doc.text(String(carton.contenu[t] ?? 0), W - M - 3, y, { align: "right" })
      y += 4.8
      rowIdx++
    }

    y = Math.max(y, 108) + 0.5
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.4)
    doc.line(M, y - 2.5, M + tW, y - 2.5)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(...ACCENT)
    doc.text("TOTAL", M + 3, y + 1)
    doc.text(`${carton.totalPieces} pièce${carton.totalPieces > 1 ? "s" : ""}`, W - M - 3, y + 1, { align: "right" })

    // ── 6. QR Code + N° COLIS
    const qrSize = 17
    const qrX = M + 2
    const qrY = 123
    doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize)
    doc.setTextColor(100)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5)
    doc.text("Scanner", qrX + qrSize / 2, qrY + qrSize + 3.2, { align: "center" })

    const trackX = qrX + qrSize + 4
    const trackW = W - M * 2 - qrSize - 6
    const trackY = qrY
    const trackH = qrSize + 3.5

    doc.setFillColor(...LIGHT_GRAY)
    doc.roundedRect(trackX, trackY, trackW, trackH, 1, 1, "F")

    doc.setTextColor(120)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.5)
    doc.text("N° COLIS", trackX + 3, trackY + 4)

    doc.setTextColor(...ACCENT)
    doc.setFontSize(24)
    doc.text(`${carton.numero}`, trackX + trackW / 2, trackY + 13, { align: "center" })

    doc.setTextColor(80)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.text(`sur ${data.nbCartons}`, trackX + trackW / 2, trackY + trackH - 2.5, { align: "center" })

    // ── 7. Pied de page
    doc.setDrawColor(210, 210, 215)
    doc.setLineWidth(0.2)
    doc.line(M, H - 6, W - M, H - 6)

    doc.setTextColor(140)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5)
    doc.text(`${data.company.nom || "FacturaPro TN"} • ${data.ordre.code}`, M, H - 3)
    doc.text(`Colis ${carton.numero}/${data.nbCartons}`, W - M, H - 3, { align: "right" })
  }

  data.cartons.forEach((carton, idx) => {
    if (idx > 0) doc.addPage()
    drawLabelTSC(carton)
  })

  return Buffer.from(doc.output("arraybuffer"))
}
