import jsPDF from "jspdf"
import * as XLSX from "xlsx"

interface ReportExportData {
    year: string
    caAnnuel: string
    caVariation: string
    tvaCollectee: string
    retenuesSubies: string
    monthlyData: Array<{ mois: string; ca: number | string; tva: number | string; fodec: number | string; retenue: number | string }>
    topClients: Array<{ raisonSociale: string; totalCA: string }>
}

export function exportReportPDF(data: ReportExportData) {
    const pdf = new jsPDF("l", "mm", "a4")
    const pgW = pdf.internal.pageSize.getWidth()
    const pgH = pdf.internal.pageSize.getHeight()
    const M = 15
    const W = pgW - M * 2

    let y = M

    // Helper
    function fmt(n: number | string): string {
        const v = typeof n === "string" ? parseFloat(n) : n
        return v.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    }

    function header(text: string) {
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(11)
        pdf.setTextColor(100)
        pdf.text(text, M, y)
        y += 6
    }

    function row(label: string, value: string) {
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(10)
        pdf.setTextColor(50)
        pdf.text(label, M, y)
        pdf.setFont("helvetica", "normal")
        pdf.text(value, M + 50, y, { align: "left" })
        y += 5.5
    }

    function checkPage() {
        if (y > pgH - 30) {
            pdf.addPage()
            y = M
        }
    }

    // ── Title ──
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.setTextColor(30)
    pdf.text(`Rapport Fiscal — ${data.year}`, M, y)
    y += 4
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(150)
    pdf.text(`Généré le ${new Date().toLocaleDateString("fr-TN")}`, M, y)
    y += 10

    // ── Key indicators ──
    header("INDICATEURS CLÉS")
    row("CA Annuel :", `${fmt(data.caAnnuel)} DT`)
    row("Variation :", `${data.caVariation}% vs ${Number(data.year) - 1}`)
    row("TVA Collectée :", `${fmt(data.tvaCollectee)} DT`)
    row("Retenues Subies :", `${fmt(data.retenuesSubies)} DT`)
    y += 6

    // ── Monthly table ──
    checkPage()
    header("ÉVOLUTION MENSUELLE")

    const cols = [35, 40, 40, 40, 40]
    const colX: number[] = []
    let cx = M
    for (const cw of cols) {
        colX.push(cx)
        cx += cw
    }
    const headers = ["Mois", "CA", "TVA", "FODEC", "Retenue"]

    // Table header
    pdf.setFillColor(245, 245, 245)
    pdf.rect(M, y - 3, W, 7, "F")
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(8)
    pdf.setTextColor(60)
    headers.forEach((h, i) => pdf.text(h, colX[i] + 1, y))
    y += 7

    // Table rows
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    data.monthlyData.forEach((m, idx) => {
        checkPage()
        if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(M, y - 3, W, 5.5, "F")
        }
        pdf.setTextColor(50)
        const vals = [m.mois, fmt(m.ca), fmt(m.tva), fmt(m.fodec), fmt(m.retenue)]
        vals.forEach((v, i) => pdf.text(v, colX[i] + 1, y))
        y += 5.5
    })

    y += 6

    // ── Top clients ──
    checkPage()
    header("TOP 5 CLIENTS")

    const clientCols = [80, 50]
    const clientColX = [M, M + 80]

    pdf.setFillColor(245, 245, 245)
    pdf.rect(M, y - 3, clientCols[0] + clientCols[1], 7, "F")
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(8)
    pdf.setTextColor(60)
    pdf.text("Client", clientColX[0] + 1, y)
    pdf.text("CA Total", clientColX[1] + 1, y)
    y += 7

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    data.topClients.forEach((c, idx) => {
        checkPage()
        if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(M, y - 3, clientCols[0] + clientCols[1], 5.5, "F")
        }
        pdf.setTextColor(50)
        pdf.text(c.raisonSociale, clientColX[0] + 1, y)
        pdf.text(`${fmt(c.totalCA)} DT`, clientColX[1] + 1, y)
        y += 5.5
    })

    // ── Footer ──
    y = pgH - 15
    pdf.setFontSize(7)
    pdf.setTextColor(180)
    pdf.text("FacturaPro TN — Rapport fiscal généré automatiquement", M, y)

    pdf.save(`Rapport-Fiscal-${data.year}.pdf`)
}

export function exportReportExcel(
    data: ReportExportData,
) {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Résumé
    const resumeData = [
        ["Indicateur", "Valeur"],
        ["CA Annuel", data.caAnnuel],
        ["Variation", `${data.caVariation}%`],
        ["TVA Collectée", data.tvaCollectee],
        ["Retenues Subies", data.retenuesSubies],
    ]
    const resumeSheet = XLSX.utils.aoa_to_sheet(resumeData)
    XLSX.utils.book_append_sheet(wb, resumeSheet, "Résumé")

    // Sheet 2: Mensuel
    const monthlyRows = [
        ["Mois", "CA", "TVA", "FODEC", "Retenue"],
        ...data.monthlyData.map((m) => [m.mois, String(m.ca), String(m.tva), String(m.fodec), String(m.retenue)]),
    ]
    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyRows)
    monthlySheet["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Mensuel")

    // Sheet 3: Top Clients
    const clientsRows = [
        ["Client", "CA Total"],
        ...data.topClients.map((c) => [c.raisonSociale, c.totalCA]),
    ]
    const clientsSheet = XLSX.utils.aoa_to_sheet(clientsRows)
    clientsSheet["!cols"] = [{ wch: 40 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, clientsSheet, "Top Clients")

    XLSX.writeFile(wb, `Rapport-Fiscal-${data.year}.xlsx`)
}
