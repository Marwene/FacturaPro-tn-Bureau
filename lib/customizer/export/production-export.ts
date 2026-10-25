import JSZip from "jszip";
import { jsPDF } from "jspdf";
import type { DesignLayer, ProductType, TextLayerData, ImageLayerData, EmbroideryLayerData } from "../types/product-customizer";
import { DMC_THREADS } from "../embroidery/thread-colors";

export interface ExportOptions {
  productName: string;
  productType?: ProductType;
  productCode: string;
  color: string;
  size: string;
  layers: DesignLayer[];
  canvasWidth: number;
  canvasHeight: number;
  view: string;
  clientName?: string;
  material?: string;
  designType?: "ESD" | "Standard";
  snapshotFront?: HTMLCanvasElement | null;
  snapshotBack?: HTMLCanvasElement | null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportToPNG(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Échec de la génération PNG"));
    }, "image/png");
  });
}

export function exportToSVG(
  options: ExportOptions,
): string {
  const { layers, canvasWidth, canvasHeight, productName } = options;
  const lines: string[] = [];

  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`);
  lines.push(`  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${options.color}" />`);

  const sorted = [...layers].filter((l) => l.visible).sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    if (layer.type === "text") {
      const td = layer.data as TextLayerData;
      const x = layer.position.x;
      const y = layer.position.y + td.fontSize;
      const weight = td.fontWeight >= 700 ? "bold" : "normal";
      lines.push(`  <text x="${x}" y="${y}" font-family="${td.fontFamily}" font-size="${td.fontSize}" font-weight="${weight}" font-style="${td.fontStyle}" fill="${td.color}" text-anchor="${td.textAlign === "center" ? "middle" : td.textAlign === "right" ? "end" : "start"}">`);
      lines.push(`    ${escapeXml(td.text)}`);
      lines.push(`  </text>`);
    }
    if (layer.type === "image" || layer.type === "logo") {
      lines.push(`  <image x="${layer.position.x}" y="${layer.position.y}" width="${layer.size.width}" height="${layer.size.height}" href="${(layer.data as ImageLayerData).src}" />`);
    }
    if (layer.type === "embroidery") {
      const ed = layer.data as EmbroideryLayerData;
      lines.push(`  <rect x="${layer.position.x}" y="${layer.position.y}" width="${layer.size.width}" height="${layer.size.height}" fill="${ed.threadColor}" opacity="0.3" rx="2" />`);
      lines.push(`  <text x="${layer.position.x + 4}" y="${layer.position.y + 14}" font-size="10" fill="${ed.threadColor}">${ed.threadCode} - ${ed.stitchType}</text>`);
    }
  }

  lines.push(`</svg>`);
  return lines.join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateProductionSheet(options: ExportOptions): string {
  const { productName, productCode, color, size, layers, view } = options;

  const embroideryLayers = layers.filter((l) => l.type === "embroidery");
  const textLayers = layers.filter((l) => l.type === "text");
  const imageLayers = layers.filter((l) => l.type === "image" || l.type === "logo");

  const totalStitches = embroideryLayers.reduce((sum, l) => {
    return sum + ((l.data as EmbroideryLayerData).estimatedStitchCount ?? 0);
  }, 0);

  const threadColors = [...new Set(embroideryLayers.map((l) => (l.data as EmbroideryLayerData).threadCode))];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Fiche de production — ${escapeXml(productName)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; max-width: 800px; margin: auto; padding: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 20px; }
  .info-grid dt { font-weight: bold; color: #555; }
  .info-grid dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-size: 11px; }
  .stitch-chip { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin: 1px; color: #fff; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Fiche de production</h1>
  <p style="color:#666;margin-bottom:16px;">Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
  <div class="info-grid">
    <dt>Produit</dt><dd>${escapeXml(productName)}</dd>
    <dt>Code</dt><dd>${escapeXml(productCode)}</dd>
    <dt>Type</dt><dd>${options.productType ?? "Non spécifié"}</dd>
    <dt>Couleur</dt><dd>${color}</dd>
    <dt>Taille</dt><dd>${size}</dd>
    <dt>Vue</dt><dd>${view}</dd>
    <dt>Calques</dt><dd>${layers.length}</dd>
  </div>

  ${textLayers.length > 0 ? `
  <h2>Textes (${textLayers.length})</h2>
  <table>
    <tr><th>Contenu</th><th>Police</th><th>Taille</th><th>Couleur</th></tr>
    ${textLayers.map((l) => {
      const td = l.data as TextLayerData;
      return `<tr><td>${escapeXml(td.text)}</td><td>${td.fontFamily}</td><td>${td.fontSize}px</td><td>${td.color}</td></tr>`;
    }).join("")}
  </table>` : ""}

  ${embroideryLayers.length > 0 ? `
  <h2>Broderie</h2>
  <table>
    <tr><th>Position</th><th>Fil</th><th>Point</th><th>Densité</th><th>Sous-couche</th><th>Points</th></tr>
    ${embroideryLayers.map((l) => {
      const ed = l.data as EmbroideryLayerData;
      const thread = DMC_THREADS.find((t) => t.code === ed.threadCode);
      return `<tr>
        <td>${escapeXml(l.name)}</td>
        <td><span class="stitch-chip" style="background:${ed.threadColor};">${ed.threadCode}</span> ${thread?.name ?? ""}</td>
        <td>${ed.stitchType}</td>
        <td>${ed.stitchDensity}/10</td>
        <td>${ed.underlay ? "Oui" : "Non"}</td>
        <td>${ed.estimatedStitchCount.toLocaleString()}</td>
      </tr>`;
    }).join("")}
  </table>
  <p><strong>Total points :</strong> ${totalStitches.toLocaleString()} | <strong>Couleurs de fil :</strong> ${threadColors.join(", ")}</p>` : ""}

  ${imageLayers.length > 0 ? `
  <h2>Images / Logos (${imageLayers.length})</h2>` : ""}

  <p style="margin-top:32px;color:#999;font-size:10px;">FacturaPro TN — Studio de personnalisation</p>
</body></html>`;
}

export async function generateProductionPDF(options: ExportOptions): Promise<Blob> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const nl = (h: number) => { y += h }
  const hr = () => {
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    nl(4)
  }

  // --- Header ---
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

  // --- Info table ---
  const infos: [string, string][] = [
    ["Client", options.clientName ?? "—"],
    ["Produit", options.productName],
    ["Code", options.productCode],
    ["Couleur", options.color],
    ["Matière", options.material ?? "—"],
    ["Type", options.designType ?? "Standard"],
  ]

  doc.setFontSize(9)
  const col1 = margin
  const col2 = margin + 50
  for (const [label, value] of infos) {
    doc.setFont("helvetica", "bold")
    doc.text(label + ":", col1, y)
    doc.setFont("helvetica", "normal")
    doc.text(value, col2, y)
    nl(5)
  }
  hr()

  // --- Photos side by side ---
  const maxImgW = 80
  const maxImgH = 100
  const imgY = y

  if (options.snapshotFront) {
    try {
      const imgData = options.snapshotFront.toDataURL("image/png")
      const imgW = options.snapshotFront.width
      const imgH = options.snapshotFront.height
      const ratio = Math.min(maxImgW / imgW, maxImgH / imgH)
      doc.addImage(imgData, "PNG", margin, y, imgW * ratio, imgH * ratio)
    } catch { /* skip image if conversion fails */ }
  }

  if (options.snapshotBack) {
    try {
      const imgData = options.snapshotBack.toDataURL("image/png")
      const imgW = options.snapshotBack.width
      const imgH = options.snapshotBack.height
      const ratio = Math.min(maxImgW / imgW, maxImgH / imgH)
      doc.addImage(imgData, "PNG", margin + maxImgW + 10, y, imgW * ratio, imgH * ratio)
    } catch { /* skip image if conversion fails */ }
  }

  if (options.snapshotFront || options.snapshotBack) {
    y = imgY + maxImgH + 8
    hr()
  }

  // --- Get layers grouped by type ---
  const embroideryLayers = options.layers.filter((l) => l.type === "embroidery")
  const textLayers = options.layers.filter((l) => l.type === "text")
  const imageLayers = options.layers.filter((l) => l.type === "image" || l.type === "logo")

  // --- Impression (text + image layers) ---
  const impressionLayers = [...textLayers, ...imageLayers]
  if (impressionLayers.length > 0) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("IMPRESSION", margin, y)
    nl(7)

    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text("Emplacement", margin, y)
    doc.text("Contenu", margin + 40, y)
    doc.text("Type", margin + 110, y)
    doc.text("Détails", margin + 150, y)
    nl(4)
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    nl(3)

    doc.setFont("helvetica", "normal")
    for (const layer of impressionLayers) {
      const view = layer.view === "back" ? "Dos" : "Côté Cœur"
      let type = ""
      let details = ""
      if (layer.type === "text") {
        const td = layer.data as TextLayerData
        type = "Texte"
        details = `${td.fontFamily} ${td.fontSize}px`
      } else {
        type = "Image / Logo"
        details = `${Math.round(layer.size.width)}×${Math.round(layer.size.height)}px`
      }
      doc.text(view, margin, y)
      doc.text(layer.name.length > 20 ? layer.name.slice(0, 20) + "…" : layer.name, margin + 40, y)
      doc.text(type, margin + 110, y)
      doc.text(details, margin + 150, y)
      nl(4.5)

      if (y > 275) {
        doc.addPage()
        y = margin
        doc.setFont("helvetica", "normal")
      }
    }
    nl(2)
  }

  // --- Broderie ---
  if (embroideryLayers.length > 0) {
    if (y > 210) {
      doc.addPage()
      y = margin
    }

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
      const ed = layer.data as EmbroideryLayerData
      const view = layer.view === "back" ? "Dos" : "Côté Cœur"
      const thread = DMC_THREADS.find((t) => t.code === ed.threadCode)

      doc.text(view, margin, y)
      doc.text(`${ed.threadCode} ${thread?.name ?? ""}`, margin + 40, y)
      doc.text(ed.stitchType, margin + 100, y)
      doc.text(`${ed.stitchDensity}/10`, margin + 130, y)
      doc.text(ed.underlay ? "Oui" : "Non", margin + 160, y)
      doc.text(ed.estimatedStitchCount.toLocaleString(), margin + 185, y)
      nl(4.5)

      if (y > 275) {
        doc.addPage()
        y = margin
        doc.setFont("helvetica", "normal")
      }
    }

    const totalStitches = embroideryLayers.reduce((sum, l) => {
      return sum + ((l.data as EmbroideryLayerData).estimatedStitchCount ?? 0)
    }, 0)
    const threadColors = [...new Set(embroideryLayers.map((l) => (l.data as EmbroideryLayerData).threadCode))]

    nl(2)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(`Total points : ${totalStitches.toLocaleString()}  |  Fils : ${threadColors.join(", ")}`, margin, y)
    nl(4)
  }

  // --- Footer ---
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    doc.text("FacturaPro TN — Studio de personnalisation", margin, 290)
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 290, { align: "right" })
  }
  doc.setTextColor(0)

  return doc.output("blob")
}

export function downloadProductionPDF(pdfBlob: Blob, filename: string) {
  downloadBlob(pdfBlob, filename)
}

export async function exportToZIP(
  pngBlob: Blob,
  svgContent: string,
  productionSheet: string,
  productName: string,
): Promise<Blob> {
  const zip = new JSZip();
  const safeName = productName.replace(/[^a-zA-Z0-9-_]/g, "_");

  zip.file(`${safeName}.png`, pngBlob);
  zip.file(`${safeName}.svg`, svgContent);
  zip.file(`fiche-production-${safeName}.html`, productionSheet);

  return zip.generateAsync({ type: "blob" });
}

export function downloadProductionSheet(sheet: string, filename: string) {
  const blob = new Blob([sheet], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, filename);
}

export async function exportAllAndDownload(
  canvas: HTMLCanvasElement,
  options: ExportOptions,
) {
  const pngBlob = await exportToPNG(canvas, `${options.productName}.png`);
  const svgContent = exportToSVG(options);
  const sheet = generateProductionSheet(options);

  if (options.layers.length === 0 && options.productType === "t-shirt") {
    downloadBlob(pngBlob, `${options.productName}.png`);
    return;
  }

  const zipBlob = await exportToZIP(pngBlob, svgContent, sheet, options.productName);
  downloadBlob(zipBlob, `${options.productName}-production.zip`);
}
