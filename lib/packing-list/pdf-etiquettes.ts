import QRCode from "qrcode"
import { genererEtiquettesA4 } from "./pdf-etiquettes-a4"
import { genererEtiquettesTSC } from "./pdf-etiquettes-tsc"
import type { EtiquetteFormat, PackingListPDFData } from "./pdf-shared"

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: "M",
  })
}

/**
 * Génère le PDF des étiquettes de colisage.
 *
 * Format "tsc200" : portrait 100×150 mm, une étiquette par page (imprimante thermique TSC T200).
 * Format "a4" : A4 portrait, 4 étiquettes par page (imprimante jet d'encre système, 99.1×139 mm chacune).
 */
export async function genererEtiquettesPDF(data: PackingListPDFData, format: EtiquetteFormat = "tsc200"): Promise<Buffer> {
  const qr = await qrDataUrl(data.pdfUrl)

  if (format === "a4") {
    return genererEtiquettesA4(data, qr)
  }

  return genererEtiquettesTSC(data, qr)
}
