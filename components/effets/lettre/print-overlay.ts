import type { SerializedEffet } from "@/lib/types"
import { formatTND } from "@/lib/decimal"
import { formatDate } from "@/lib/utils"
import { numInWords } from "./num-in-words"
import { PRINT_FIELDS, PAGE_WIDTH_MM, PAGE_HEIGHT_MM } from "./gabarit"

/**
 * Vérifie que les champs indispensables à l'impression sur le pré-imprimé
 * sont bien renseignés. Utilisé avant l'impression pour éviter de gâcher du
 * papier pré-imprimé sur un effet incomplet.
 */
export function getEffetPrintWarnings(effet: SerializedEffet): string[] {
    const warnings: string[] = []
    const isRECU = effet.type === "RECU"
    const tiréRIB = isRECU ? effet.tireur?.ribBancaire : effet.companyBank?.rib

    if (!effet.beneficiaire) warnings.push("Bénéficiaire manquant")
    if (!tiréRIB || tiréRIB.length < 20) warnings.push("RIB du tiré incomplet")
    if (!effet.tire) warnings.push("Nom du tiré manquant")
    if (!effet.tireAdresse) warnings.push("Adresse du tiré manquante")
    if (!effet.companyBank && !isRECU) warnings.push("Domiciliation bancaire manquante")
    if (!effet.dateEcheance) warnings.push("Échéance manquante")
    if (!(parseFloat(effet.montant) > 0)) warnings.push("Montant invalide")
    return warnings
}
function renderPrintField(key: string, text: string): string {
    const f = PRINT_FIELDS[key]
    if (!f || !text) return ""
    const styles = [
        `position:absolute`,
        `top:${f.top}mm`,
        `left:${f.left}mm`,
        `width:${f.width}mm`,
        f.height ? `height:${f.height}mm` : "",
        `font-size:${f.fontSize ?? 9}pt`,
        `font-family:${f.mono ? "'Courier New',monospace" : "Arial,sans-serif"}`,
        f.bold ? "font-weight:bold" : "",
        `text-align:${f.align ?? "left"}`,
        f.dir ? `direction:${f.dir}` : "",
        f.multiline ? "white-space:normal;line-height:1.25" : "white-space:nowrap",
        "overflow:hidden",
    ].filter(Boolean).join(";")
    return `<div style="${styles}">${text.split("\n").join("<br/>")}</div>`
}

export function computeLettreFields(effet: SerializedEffet, companyName?: string): Record<string, string> {
    const m = parseFloat(effet.montant)
    const isRECU = effet.type === "RECU"
    const ville = isRECU ? (effet.tireur?.ville ?? "Tunis") : (effet.fournisseur?.ville ?? "Tunis")
    const tiréRIB = isRECU ? (effet.tireur?.ribBancaire ?? "") : (effet.companyBank?.rib ?? "")
    const ribParts = tiréRIB ? [tiréRIB.slice(0, 2), tiréRIB.slice(2, 5), tiréRIB.slice(5, 18), tiréRIB.slice(18, 20)] : ["", "", "", ""]

    const intDinars = Math.floor(m)
    const millimes = Math.round((m - intDinars) * 1000)
    let montantEnLettres = ""
    if (intDinars > 0) {
        montantEnLettres = numInWords(intDinars) + " DINARS TUNISIENS"
        if (millimes > 0) montantEnLettres += " ET " + numInWords(millimes) + " MILLIMES"
    } else if (millimes > 0) {
        montantEnLettres = numInWords(millimes) + " MILLIMES"
    } else {
        montantEnLettres = "ZÉRO DINARS TUNISIENS"
    }

    return {
        lieuOrdre: ville,
        dateOrdre: formatDate(effet.dateCreation),
        echeance: formatDate(effet.dateEcheance),
        ribSimple: tiréRIB,
        montantChiffres: formatTND(effet.montant),
        montantChiffres2: formatTND(effet.montant),
        valeurEn: formatTND(effet.montant),
        beneficiaire: effet.beneficiaire ?? "",
        montantLettresFr: montantEnLettres,
        lieuDateCreation: `${ville}, le ${formatDate(effet.dateCreation)}`,
        echeance2: formatDate(effet.dateEcheance),
        cedant: companyName ?? "",
        ribCodeEtab: ribParts[0],
        ribCodeAgence: ribParts[1],
        ribCompte: ribParts[2],
        ribCle: ribParts[3],
        domiciliationBanque: effet.companyBank
            ? [effet.companyBank.nomBanque, effet.companyBank.agence].filter(Boolean).join("\n")
            : "",
        tireNomAdresse: [effet.tire, effet.tireAdresse].filter(Boolean).join("\n"),
    }
}

function renderLettrePrintOverlay(effet: SerializedEffet, companyName?: string): string {
    const fields = computeLettreFields(effet, companyName)
    return `<div style="position:relative;width:${PAGE_WIDTH_MM}mm;height:${PAGE_HEIGHT_MM}mm;">
${Object.entries(fields).map(([key, text]) => renderPrintField(key, text)).join("\n")}
</div>`
}
/** Impression réelle sur le papier pré-imprimé — overlay texte seul, positions en mm. */
export function buildLettrePrintOverlayHTML(effets: SerializedEffet[], companyName?: string): string {
    const pages = effets.map((e, i) => {
        const content = renderLettrePrintOverlay(e, companyName)
        return i < effets.length - 1 ? `${content}<div style="page-break-after:always;break-after:page"></div>` : content
    }).join("\n")

    return `<!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Traites (${effets.length})</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#fff;color:#000}
            @page{size:${PAGE_WIDTH_MM}mm ${PAGE_HEIGHT_MM}mm;margin:0}
            @media screen{
                /* En écran, on ajoute juste un contour pointillé pour visualiser la page pendant la calibration */
                body{padding:10px}
                body>div{outline:1px dashed #ccc}
            }
        </style></head>
        <body>${pages}</body></html>`
}
