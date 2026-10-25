import { jsPDF } from "jspdf"
import QRCode from "qrcode"
import type { Carton } from "./colisage"

export interface PackingDetail {
  taille: string
  quantite: number
}

export interface PackingListPDFData {
  company: {
    nom: string
    adresse?: string | null
    ville?: string | null
    codePostal?: string | null
    telephone?: string | null
    email?: string | null
    matriculeFiscal?: string | null
    logo?: string | null
  }
  ordre: {
    code: string
    dateLivraison?: Date | string | null
  }
  tiers?: {
    raisonSociale: string
    adresse?: string | null
    ville?: string | null
    telephone?: string | null
    email?: string | null
  } | null
  produit: { nom: string; code: string }
  numero: string
  dateCreation: Date | string
  capaciteCarton: number
  details: PackingDetail[]
  cartons: Carton[]
  nbCartons: number
  totalPieces: number
  pdfUrl: string
}

export type EtiquetteFormat = "tsc200" | "a4"

function agregerParTaille(details: PackingDetail[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const d of details) {
    const taille = d.taille || "Std"
    map[taille] = (map[taille] ?? 0) + d.quantite
  }
  return map
}

function sortTailles(tailles: string[]): string[] {
  return [...tailles].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("fr-FR")
}

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: "M",
  })
}

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

const ETIQUETTE_W = 100
const ETIQUETTE_H = 150

// A4 system printer: page 99.1×139 mm divided into 4 labels (2×2)
const A4_LABEL_W = 99.1
const A4_LABEL_H = 139
const A4_COLS = 2
const A4_ROWS = 2
const A4_PAGE_W = 210
const A4_PAGE_H = 297
const A4_MARGIN = (A4_PAGE_W - A4_COLS * A4_LABEL_W) / 2
const A4_TOP_MARGIN = 10

/**
 * Génère le PDF des étiquettes de colisage.
 *
 * Format "tsc200" : portrait 100×150 mm, une étiquette par page (imprimante thermique TSC T200).
 * Format "a4" : A4 portrait, 4 étiquettes par page (imprimante jet d'encre système, 99.1×139 mm chacune).
 */
export async function genererEtiquettesPDF(data: PackingListPDFData, format: EtiquetteFormat = "tsc200"): Promise<Buffer> {
  const qr = await qrDataUrl(data.pdfUrl)

  const ACCENT: [number, number, number] = [77, 20, 140]
  const DARK: [number, number, number] = [30, 30, 30]
  const GRAY: [number, number, number] = [236, 236, 241]
  const LIGHT_GRAY: [number, number, number] = [245, 245, 245]

  if (format === "a4") {
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
