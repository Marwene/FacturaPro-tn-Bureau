"use client"
import type { SerializedEffet } from "@/lib/types"
import { formatTND } from "@/lib/decimal"
import { formatDate, formatDateLong } from "@/lib/utils"

const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"]

function sousCent(m: number): string {
    let r = ""
    if (m >= 20) {
        const d = Math.floor(m / 10)
        r += tens[d]
        const u = m % 10
        if (u > 0) {
            r += (d === 7 || d === 9 ? "-" + units[10 + u] : "-" + units[u])
        } else if (d === 7 || d === 9) {
            r += "-dix"
        }
    } else if (m > 0) {
        r += units[m]
    }
    return r
}

function sousMille(m: number): string {
    if (m === 0) return ""
    let r = ""
    if (m >= 100) {
        const c = Math.floor(m / 100)
        r += (c > 1 ? units[c] + " " : "") + "cent "
        m %= 100
    }
    if (m > 0) r += sousCent(m)
    return r.trim()
}

function numInWords(n: number): string {
    if (n === 0) return "zéro"
    let w = ""
    if (n >= 1000000) {
        const mil = Math.floor(n / 1000000)
        w += (mil === 1 ? "un " : sousMille(mil) + " ") + "million "
        n %= 1000000
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000)
        w += (k > 1 ? sousMille(k) + " " : "") + "mille "
        n %= 1000
    }
    if (n > 0) w += sousMille(n)
    return w.trim().toUpperCase()
}

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

export function buildLettrePreviewHTML(effet: SerializedEffet, companyName?: string): string {
    const content = renderLettreCardsHTML(effet, companyName)
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Traite ${effet.numero}</title>
<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:9pt;color:#000;background:#fff;width:100%;height:100%;}
    h1,h2{font-weight:bold}
    @page{size:A4 landscape;margin:5mm}
    @media print{body{width:297mm;height:210mm;padding:2mm} .no-print{display:none}}
    @media screen{body{padding:0} .lettre-wrap{transform-origin:0 0}}
</style></head>
<body>${content}</body></html>`
}

// ============================================================================
// IMPRESSION SUR PRÉ-IMPRIMÉ (overlay) — à calibrer avec la grille millimétrée
// ============================================================================
//
// Contrairement à buildLettreHTML (qui dessine une carte complète avec ses
// propres cadres/couleurs, pour l'aperçu à l'écran), cette fonction n'imprime
// QUE le texte, positionné en absolu en millimètres, par-dessus le papier
// pré-imprimé de la banque. Aucun cadre, aucune couleur, aucun fond : tout ça
// existe déjà sur le papier.
//
// COMMENT CALIBRER :
// 1. Imprimez grille-calibration-mm.html et posez votre traite dessus.
// 2. Pour chaque champ ci-dessous, relevez le coin haut-gauche (top/left) et
//    la taille de la case (width/height) en mm sur la grille.
// 3. Remplacez les valeurs dans PRINT_FIELDS. Faites un test d'impression
//    RÉEL sur le papier pré-imprimé (Échelle = 100%, Marges = Aucune) et
//    ajustez de ±1-2mm si besoin — c'est normal de faire 2-3 essais.
// 4. Ajustez PAGE_WIDTH_MM / PAGE_HEIGHT_MM à la taille exacte de votre
//    papier (mesurée à plat, non plié).

// COMMENT CALIBRER (si votre pré-imprimé diffère de celui calibré ici) :
// 1. Imprimez grille-calibration-mm.html et posez votre traite dessus.
// 2. Pour chaque champ ci-dessous, relevez le coin haut-gauche (top/left) et
//    la taille de la case (width/height) en mm sur la grille.
// 3. Remplacez les valeurs dans PRINT_FIELDS. Faites un test d'impression
//    RÉEL sur le papier pré-imprimé (Échelle = 100%, Marges = Aucune) et
//    ajustez de ±1-2mm si besoin — c'est normal de faire 2-3 essais.
// 4. Ajustez PAGE_WIDTH_MM / PAGE_HEIGHT_MM à la taille exacte de votre
//    papier (mesurée à plat, non plié).
//
// Calibration actuelle : dérivée par mesure directe (grille 5mm superposée)
// sur un exemplaire réel photographié du pré-imprimé "Lettre de Change"
// tunisien, format B5 (176 x 250mm). Le contenu imprimé n'occupe que le
// haut de la feuille (~0-108mm) ; le reste du B5 est vierge sur ce modèle.
// Fiable à ±1-2mm — un test d'impression réel reste recommandé avant tirage
// en volume, une photo n'ayant pas la précision d'un scanner à plat.

export const LETTRE_PAGE_WIDTH_MM = 176 // B5
export const LETTRE_PAGE_HEIGHT_MM = 250 // B5
const PAGE_WIDTH_MM = LETTRE_PAGE_WIDTH_MM
const PAGE_HEIGHT_MM = LETTRE_PAGE_HEIGHT_MM

// Photo du pré-imprimé réel (posée dans public/), utilisée UNIQUEMENT dans
// l'aperçu écran comme calque de fond pour vérifier le calage des champs.
// Jamais incluse dans le HTML envoyé à l'impression (buildLettrePrintOverlayHTML).
const PREIMPRIME_IMAGE_SRC = "/effets/lettre-de-change-preimprime.jpg"
// Dimensions réelles du fichier image (px) — la photo ne couvre que la partie
// haute imprimée du B5 (le reste de la feuille, ~114-250mm, est vierge sur ce
// modèle). On dérive sa hauteur en mm à partir de son ratio, pour l'étirer à
// la largeur exacte de la page (176mm) sans la déformer.
const PREIMPRIME_IMAGE_PX = { width: 836, height: 540 }
const PREIMPRIME_IMAGE_HEIGHT_MM = (PAGE_WIDTH_MM * PREIMPRIME_IMAGE_PX.height) / PREIMPRIME_IMAGE_PX.width

type PrintField = {
    top: number
    left: number
    width: number
    height?: number
    fontSize?: number // en pt
    bold?: boolean
    align?: "left" | "center" | "right"
    dir?: "ltr" | "rtl"
    mono?: boolean // pour les chiffres du RIB, alignés en colonnes
    multiline?: boolean // pour adresse/domiciliation sur 2-3 lignes
}

const PRINT_FIELDS: Record<string, PrintField> = {
    // Ligne "A [lieu] / Le [date]" — Ordre de paiement (haut, dupliqué avec lieuCreation/dateCreation plus bas)
    lieuOrdre: { top: 8, left: 70, width: 68, fontSize: 10, bold: true },
    dateOrdre: { top: 17, left: 70, width: 68, fontSize: 10, bold: true },
    // Échéance (haut)
    echeance: { top: 15, left: 62, width: 36, height: 8, fontSize: 10, bold: true, align: "center" },
    // RIB simple (sous Échéance, une seule ligne continue)
    ribSimple: { top: 20, left: 8, width: 50, height: 7, fontSize: 8, mono: true },
    // Montant (haut droite, 1ère occurrence)
    montantChiffres: { top: 14, left: 142, width: 34, height: 10, fontSize: 12, bold: true, align: "center" },
    // Bénéficiaire ("payer à l'ordre de")
    beneficiaire: { top: 32, left: 98, width: 76, height: 8, fontSize: 10, bold: true },
    // Montant (2e occurrence, sous "payer à l'ordre de")
    montantChiffres2: { top: 30, left: 142, width: 34, height: 12, fontSize: 12, bold: true, align: "center" },
    // Montant en lettres — pleine largeur, une seule ligne
    montantLettresFr: { top: 44, left: 8, width: 166, height: 8, fontSize: 9, bold: true },
    // Lieu et date de création (bas, dupliqué avec lieuOrdre/dateOrdre)
    lieuDateCreation: { top: 54, left: 8, width: 87, height: 8, fontSize: 9 },
    echeance2: { top: 54, left: 97, width: 41, height: 8, fontSize: 9, align: "center" },
    // Nom du cédant
    cedant: { top: 54, left: 140, width: 34, height: 8, fontSize: 8 },
    // RIB détaillé (4 cases)
    ribCodeEtab: { top: 60, left: 8, width: 19, height: 8, fontSize: 9, align: "center", mono: true },
    ribCodeAgence: { top: 60, left: 28, width: 19, height: 8, fontSize: 9, align: "center", mono: true },
    ribCompte: { top: 60, left: 48, width: 34, height: 8, fontSize: 9, align: "center", mono: true },
    ribCle: { top: 60, left: 83, width: 11, height: 8, fontSize: 9, align: "center", mono: true },
    // Valeur en
    valeurEn: { top: 58, left: 97, width: 40, height: 10, fontSize: 10, bold: true, align: "center" },
    // Domiciliation (banque du tiré) — multi-ligne
    domiciliationBanque: { top: 58, left: 140, width: 35, height: 20, fontSize: 8, multiline: true },
    // Nom et adresse du Tiré — multi-ligne
    tireNomAdresse: { top: 68, left: 60, width: 36, height: 14, fontSize: 8, multiline: true },
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

function computeLettreFields(effet: SerializedEffet, companyName?: string): Record<string, string> {
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

const pctX = (mm: number) => (mm / PAGE_WIDTH_MM) * 100
const pctY = (mm: number) => (mm / PAGE_HEIGHT_MM) * 100

/**
 * Aperçu écran fidèle à l'impression réelle : mêmes champs, mêmes positions
 * relatives (converties en % de la page B5 pour s'adapter à la taille de
 * l'écran), affichés en bleu par-dessus la photo réelle du pré-imprimé (voir
 * renderLettreBackgroundImage) — jamais imprimés avec ce fond, qui n'est là
 * que pour vérifier visuellement le calage à l'écran.
 */
function renderPrintFieldScreen(key: string, text: string): string {
    const f = PRINT_FIELDS[key]
    if (!f || !text) return ""
    const styles = [
        `position:absolute`,
        `top:${pctY(f.top)}%`,
        `left:${pctX(f.left)}%`,
        `width:${pctX(f.width)}%`,
        f.height ? `height:${pctY(f.height)}%` : "",
        `font-size:${((f.fontSize ?? 9) / PAGE_WIDTH_MM) * 22}cqw`,
        `font-family:${f.mono ? "'Courier New',monospace" : "Arial,sans-serif"}`,
        f.bold ? "font-weight:bold" : "",
        `text-align:${f.align ?? "left"}`,
        f.dir ? `direction:${f.dir}` : "",
        f.multiline ? "white-space:normal;line-height:1.2" : "white-space:nowrap",
        "overflow:hidden",
        "color:#1d4ed8",
        // Halo blanc pour rester lisible par-dessus la photo du pré-imprimé
        // (texte imprimé, filigranes, couleurs) sans masquer les cases.
        "text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff,0 0 5px #fff",
        "z-index:2",
    ].filter(Boolean).join(";")
    return `<div style="${styles}">${text.split("\n").join("<br/>")}</div>`
}

type BgBox = { top: number; left: number; width: number; height: number }

// Cases (bordures) du pré-imprimé, mesurées sur un exemplaire réel (grille
// 5mm superposée à une photo du document). Reconstitution approximative à
// but de repère visuel — pas une reproduction pixel-perfect.
const BG_BOXES: BgBox[] = [
    { top: 8, left: 8, width: 50, height: 19 }, // Signature du tiré
    { top: 8, left: 62, width: 78, height: 19 }, // Échéance / A / Le / Ordre de paiement
    { top: 13, left: 142, width: 34, height: 12 }, // Montant 1
    { top: 28, left: 8, width: 50, height: 18 }, // Tireur
    { top: 28, left: 60, width: 80, height: 18 }, // Contre cette LC / payer à l'ordre de
    { top: 28, left: 142, width: 34, height: 14 }, // Montant 2
    { top: 42, left: 8, width: 168, height: 11 }, // Montant en lettres
    { top: 50, left: 8, width: 168, height: 14 }, // Lieu/Date création / Échéance / Cédant / Codes
    { top: 54, left: 60, width: 1, height: 10 },
    { top: 54, left: 97, width: 1, height: 10 },
    { top: 54, left: 140, width: 1, height: 10 },
    { top: 54, left: 8, width: 87, height: 30 }, // RIB détaillé
    { top: 60, left: 28, width: 1, height: 8 },
    { top: 60, left: 48, width: 1, height: 8 },
    { top: 60, left: 83, width: 1, height: 8 },
    { top: 54, left: 97, width: 43, height: 14 }, // Valeur en
    { top: 54, left: 140, width: 36, height: 26 }, // Domiciliation
    { top: 68, left: 8, width: 25, height: 12 }, // Acceptation
    { top: 68, left: 33, width: 25, height: 12 }, // Aval
    { top: 64, left: 58, width: 39, height: 16 }, // Nom et adresse du Tiré
    { top: 68, left: 140, width: 36, height: 12 }, // Signature du tireur
]

/**
 * Calque de fond de l'aperçu écran : la photo réelle du pré-imprimé, étirée
 * à la largeur exacte de la page B5 (176mm) en conservant son ratio. Jamais
 * inclus dans le HTML d'impression réelle (buildLettrePrintOverlayHTML) —
 * sur le papier physique, ce fond existe déjà, imprimé par la banque.
 *
 * `showRepères` superpose en plus les cases mesurées (BG_BOXES) en semi-
 * transparent : utile pendant une phase de calibration pour vérifier que les
 * cases mesurées correspondent bien à celles visibles sur la photo.
 */
function renderLettreBackgroundImage(showRepères?: boolean): string {
    const image = `<img src="${PREIMPRIME_IMAGE_SRC}" alt="" style="position:absolute;top:0;left:0;width:100%;height:${pctY(PREIMPRIME_IMAGE_HEIGHT_MM)}%;object-fit:fill;z-index:0;pointer-events:none;user-select:none;" draggable="false" />`

    if (!showRepères) return image

    const boxes = BG_BOXES.map((b) => {
        if (b.width <= 1) {
            return `<div style="position:absolute;top:${pctY(b.top)}%;left:${pctX(b.left)}%;width:1px;height:${pctY(b.height)}%;background:#16a34a;z-index:1;"></div>`
        }
        return `<div style="position:absolute;top:${pctY(b.top)}%;left:${pctX(b.left)}%;width:${pctX(b.width)}%;height:${pctY(b.height)}%;border:1px solid #16a34a;background:rgba(22,163,74,0.06);box-sizing:border-box;z-index:1;"></div>`
    }).join("\n")

    return image + boxes
}

function renderLettreScreenPreview(effet: SerializedEffet, companyName?: string, showRepères?: boolean): string {
    const fields = computeLettreFields(effet, companyName)
    return `<div class="lc-page" style="position:relative;container-type:inline-size;width:100%;aspect-ratio:${PAGE_WIDTH_MM}/${PAGE_HEIGHT_MM};background:#fff;margin:0 auto;overflow:hidden;">
${renderLettreBackgroundImage(showRepères)}
${Object.entries(fields).map(([key, text]) => renderPrintFieldScreen(key, text)).join("\n")}
</div>`
}

/**
 * Aperçu écran — reflète exactement ce qui sera imprimé (mêmes champs, même
 * calage relatif), affiché par-dessus la photo réelle du pré-imprimé pour
 * vérifier visuellement le calage. Cette photo de fond est un repère visuel
 * écran uniquement et n'est jamais envoyée à l'impression.
 */
export function buildLettreScreenPreviewHTML(effets: SerializedEffet[], companyName?: string, showRepères?: boolean): string {
    const pages = effets.map((e, i) => {
        const content = renderLettreScreenPreview(e, companyName, showRepères)
        return i < effets.length - 1 ? `${content}<div style="page-break-after:always;break-after:page"></div>` : content
    }).join("\n")

    // <base> explicite : un document chargé via iframe[srcdoc] a pour URL
    // "about:srcdoc", donc une image référencée en chemin absolu comme
    // "/effets/xxx.jpg" ne se résout pas de façon fiable contre l'origine du
    // site dans tous les navigateurs sans cette balise — c'est ce qui
    // empêchait la photo de fond de s'afficher.
    const origin = typeof window !== "undefined" ? window.location.origin : ""

    return `<!DOCTYPE html>
        <html><head><meta charset="utf-8"><base href="${origin}/"><title>Traites (${effets.length})</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            html,body{width:100%;height:100%}
            body{background:#fff;color:#000;font-family:Arial,sans-serif}
            img{max-width:none}
        </style></head>
        <body>${pages}</body></html>`
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

export function buildLettreHTML(effets: SerializedEffet[], companyName?: string): string {
    const pages = effets.map((e, i) => {
        const content = renderLettreCardsHTML(e, companyName)
        if (i < effets.length - 1) {
            return `${content}<div style="page-break-after:always;break-after:page"></div>`
        }
        return content
    }).join("\n")

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Traites (${effets.length})</title>
<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:9pt;color:#000;background:#f3f4f6;width:100%;min-height:100vh}
    @media print{@page{margin:0}}
</style></head>
<body>${pages}</body></html>`
}

function renderLettreCardsHTML(effet: SerializedEffet, companyName?: string): string {
    const m = parseFloat(effet.montant)
    const isRECU = effet.type === "RECU"
    const ville = isRECU ? (effet.tireur?.ville ?? "Tunis") : (effet.fournisseur?.ville ?? "Tunis")
    const tireurNom = isRECU ? (companyName ?? "") : (effet.fournisseur?.raisonSociale ?? "")
    const tireurAdresse = isRECU ? "" : (effet.fournisseur?.adresse ?? "")
    const tireurMF = isRECU ? "" : (effet.fournisseur?.matriculeFiscal ?? "")
    const tiréRIB = isRECU ? (effet.tireur?.ribBancaire ?? "") : (effet.companyBank?.rib ?? "")

    const ribParts = tiréRIB ? [tiréRIB.slice(0, 5), tiréRIB.slice(5, 10), tiréRIB.slice(10, 15), tiréRIB.slice(15, 20)] : ["", "", "", ""]
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

    return `<div class="lettre-wrap" style="width:100%;height:100%;display:flex;flex-direction:column;background:#f3f4f6;padding:8px;">
<div style="max-width:1100px;width:100%;margin:0 auto;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid #ccc;display:flex;flex-direction:column;">

<!-- HEADER -->
<div style="position:relative;background:linear-gradient(to bottom,#fee2e2,#fff);border-bottom:4px double #b91c1c;padding:8px 16px;">
    <div style="position:absolute;inset:0;opacity:0.1;background:repeating-linear-gradient(45deg,transparent,transparent 10px,#dc2626 10px,#dc2626 11px);"></div>
    <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:9px;font-weight:bold;color:#991b1b;line-height:1.3;">
            République<br/>Tunisienne
        </div>
        <div style="text-align:center;">
            <div style="font-size:22px;font-weight:bold;color:#991b1b;font-style:italic;">Lettre de Change</div>
            <div style="font-size:16px;font-weight:bold;color:#b91c1c;">Bill of exchange</div>
        </div>
        <div style="font-size:9px;font-weight:bold;color:#991b1b;line-height:1.3;text-align:right;">
            الجمهورية<br/>التونسية<br/>
            <span style="font-size:20px;">كمبيالة</span>
        </div>
    </div>
</div>

<!-- BODY -->
<div style="padding:16px;display:flex;flex-direction:column;gap:10px;font-size:9pt;">

<!-- ROW 1 -->
<div style="display:grid;grid-template-columns:3fr 5fr 4fr;gap:8px;">
    <!-- Signature tiré -->
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>Signature du tiré</span><span>إمضاء المسحوب عليه</span>
        </div>
        <div style="border:1px solid #9ca3af;height:90px;background:#f9fafb;"></div>
    </div>
    <!-- Echéance + RIB -->
    <div style="display:flex;flex-direction:column;gap:6px;">
        <div>
            <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
                <span>Echéance</span><span>حلول الأجل</span>
            </div>
            <div style="font-size:10px;font-weight:bold;padding:4px 8px;border:1px solid #9ca3af;background:#fff;">
                ${formatDateLong(effet.dateEcheance)}
            </div>
        </div>
        <div>
            <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
                <span>RIB ou RIP du Tiré</span><span>المعرف البنكي أو البريدي للمسحوب عليه</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:2px;">
                ${ribParts.map(p => `<div style="border:1px solid #9ca3af;height:34px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:10px;font-weight:bold;background:#fff;">${p}</div>`).join("")}
            </div>
        </div>
    </div>
    <!-- Ordre + Montant -->
    <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:8px;font-weight:bold;margin-bottom:1px;text-align:right;display:flex;justify-content:space-between;">
            <span>Ordre de paiement L·C N°</span><span>أمر بالدفع الكمبيالة عدد</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
            <span style="font-size:8px;">لـ</span>
            <div style="flex:1;border-bottom:1px solid #000;padding:2px 4px;font-weight:bold;font-size:10px;">${effet.numero}</div>
            <span style="font-size:8px;">في</span>
            <div style="width:60px;border-bottom:1px solid #000;padding:2px 4px;font-size:9px;">${new Date().toLocaleDateString("fr-TN")}</div>
        </div>
        <div>
            <div style="font-size:8px;font-weight:bold;margin-bottom:2px;text-align:right;display:flex;justify-content:space-between;">
                <span>Montant</span><span>المبلغ</span>
            </div>
            <div style="border:1px solid #d8b4fe;height:34px;background:repeating-linear-gradient(45deg,#f3e8ff,#f3e8ff 2px,#e9d5ff 2px,#e9d5ff 4px);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;">
                ${formatTND(effet.montant)}
            </div>
        </div>
    </div>
</div>

<!-- ROW 2 -->
<div style="display:grid;grid-template-columns:3fr 5fr 4fr;gap:8px;">
    <!-- Tireur -->
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>Tireur</span><span>الساحب</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:70px;background:#f9fafb;padding:6px 8px;">
            <div style="font-weight:bold;font-size:10px;">${tireurNom}</div>
            <div style="font-size:8px;margin-top:2px;">${tireurMF ? `MF: ${tireurMF}` : ""}</div>
            <div style="font-size:8px;">${tireurAdresse}</div>
        </div>
    </div>
    <!-- Protestable + Payer -->
    <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="font-size:8px;font-weight:bold;max-width:60%;">
                Contre cette lettre de change (Protestable*)<br/>
                <span style="font-weight:normal;font-size:7px;">مقابل هاته الكمبيالة (القابلة للاحتجاج *)</span>
            </div>
            <div style="display:flex;gap:8px;font-size:8px;padding-top:4px;">
                <span style="display:flex;align-items:center;gap:3px;"><span style="display:inline-block;width:12px;height:12px;border:1px solid #000;background:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;">✓</span> نعم</span>
                <span style="display:flex;align-items:center;gap:3px;"><span style="display:inline-block;width:12px;height:12px;border:1px solid #000;background:#fff;"></span> لا</span>
            </div>
        </div>
        <div>
            <div style="font-size:8px;font-weight:bold;margin-bottom:2px;text-align:right;display:flex;justify-content:space-between;">
                <span>Payer à l'ordre de</span><span>إدفعوا لأمر</span>
            </div>
            <div style="border:1px solid #d8b4fe;height:34px;background:repeating-linear-gradient(45deg,#f3e8ff,#f3e8ff 2px,#e9d5ff 2px,#e9d5ff 4px);display:flex;align-items:center;padding:0 8px;font-weight:bold;font-size:11px;">
                ${effet.beneficiaire}
            </div>
        </div>
    </div>
    <!-- Montant -->
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:2px;text-align:right;display:flex;justify-content:space-between;">
            <span>Montant</span><span>المبلغ</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:70px;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;">
            ${formatTND(effet.montant)}
        </div>
    </div>
</div>

<!-- ROW 3: Montant en lettres -->
<div style="display:grid;grid-template-columns:1fr ;gap:8px;">
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:2px;">Montant en lettres</div>
        <div style="border-bottom:2px solid #d8b4fe;height:28px;display:flex;align-items:center;padding:0 6px;font-size:10px;font-weight:bold;font-style:italic;background:repeating-linear-gradient(45deg,#f3e8ff,#f3e8ff 2px,#e9d5ff 2px,#e9d5ff 4px);">
            ${montantEnLettres}
        </div>
    </div>
    
</div>

<!-- ROW 4: Lieu+date | Échéance | Cédant | Codes -->
<div style="display:grid;grid-template-columns:2fr 1.5fr 1.5fr 1.5fr;gap:8px;">
    <div>
        <div style="font-size:7px;font-weight:bold;margin-bottom:2px;">Lieu et date de création<div style="font-size:6px;">مكان وتاريخ الاحداث</div></div>
        <div style="border:1px solid #9ca3af;height:28px;display:flex;align-items:center;padding:0 6px;font-size:9px;">${ville}, le ${formatDate(effet.dateCreation)}</div>
    </div>
    <div>
        <div style="font-size:7px;font-weight:bold;margin-bottom:2px;">Echéance<div style="font-size:6px;">حلول الأجل</div></div>
        <div style="border:1px solid #9ca3af;height:28px;display:flex;align-items:center;padding:0 6px;font-size:9px;">${formatDate(effet.dateEcheance)}</div>
    </div>
    <div>
        <div style="font-size:7px;font-weight:bold;margin-bottom:2px;">Nom du cédant<div style="font-size:6px;">اسم المحيل</div></div>
        <div style="border:1px solid #9ca3af;height:28px;display:flex;align-items:center;padding:0 6px;font-size:8px;">${companyName ?? ""}</div>
    </div>
    <div>
        <div style="font-size:7px;font-weight:bold;margin-bottom:2px;text-align:right;display:flex;justify-content:space-between;">
            <span>Codes réservés</span><span>رموز خاصة</span>
        </div>
        <div style="display:flex;gap:2px;">
            <div style="flex:1;border:1px solid #9ca3af;height:28px;"></div>
            <div style="width:20px;border:1px solid #9ca3af;height:28px;"></div>
            <div style="width:20px;border:1px solid #9ca3af;height:28px;"></div>
        </div>
    </div>
</div>

<!-- ROW 5: RIB détaillé | Valeur | Domiciliation -->
<div style="display:grid;grid-template-columns:4fr 2fr 4fr;gap:8px;">
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>RIB ou RIP du Tiré</span><span>المعرف البنكي أو البريدي للمسحوب عليه</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px;">
            ${["Code établ.", "Code Agence", "N° de Compte", "Clé"].map((lbl, i) => `
                <div>
                    <div style="font-size:7px;">${lbl}</div>
                    <div style="border:1px solid #9ca3af;height:26px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:9px;font-weight:bold;background:#fff;">${ribParts[i] || ""}</div>
                </div>
            `).join("")}
        </div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>Valeur en</span><span>القيمة بـ</span>
        </div>
        <div style="border:1px solid #d8b4fe;height:34px;background:repeating-linear-gradient(45deg,#f3e8ff,#f3e8ff 2px,#e9d5ff 2px,#e9d5ff 4px);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">
            ${formatTND(effet.montant)}
        </div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;text-align:right;display:flex;justify-content:space-between;">
            <span>Domiciliation</span><span>اسم وعنوان الفرع المسحوب عليه</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;padding:6px 8px;">
            ${effet.companyBank ? `
                <div style="font-weight:bold;font-size:10px;">${effet.companyBank.nomBanque}</div>
                <div style="font-size:8px;margin-top:2px;">${effet.companyBank.agence ?? ""}</div>
                <div style="font-size:8px;">${effet.companyBank.rib ? `RIB: ${effet.companyBank.rib}` : ""}</div>
            ` : `<div style="font-size:8px;color:#999;">—</div>`}
        </div>
    </div>
</div>

<!-- ROW 6: Acceptation | Aval | Tiré | Signature -->
<div style="display:grid;grid-template-columns:3fr 2fr 4fr 3fr;gap:8px;">
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>Acceptation</span><span>القبول</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;"></div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;display:flex;justify-content:space-between;">
            <span>Aval</span><span>الكفالة</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;"></div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;">
            Nom et adresse du Tiré<div style="font-size:7px;">اسم وعنوان المسحوب عليه</div>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;padding:6px 8px;">
            <div style="font-weight:bold;font-size:10px;">${effet.tire}</div>
            <div style="font-size:8px;margin-top:2px;">${effet.tireAdresse ?? ""}</div>
            <div style="font-size:8px;">${effet.tireBanque ? `Banque: ${effet.tireBanque}` : ""}</div>
        </div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;text-align:right;display:flex;justify-content:space-between;">
            <span>Signature du tireur</span><span>توقيع الساحب</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;"></div>
    </div>
</div>

<!-- Footer -->
<div style="display:flex;justify-content:space-between;font-size:7px;color:#666;padding-top:6px;border-top:1px solid #ccc;">
    <span>* mettre X dans la case correspondante.</span>
    <span>* تضع علامة X في المربع المناسب</span>
</div>
</div>

<!-- Timbre fiscal -->
<div style="display:flex;justify-content:flex-end;padding:8px 16px 12px;">
    <div style="border:2px solid #1e40af;padding:6px;text-align:center;display:flex;align-items:center;gap:6px;">
        <div style="font-size:8px;font-weight:bold;color:#991b1b;writing-mode:vertical-rl;text-orientation:mixed;">LETTRE DE CHANGE</div>
        <div style="border:2px solid #1e40af;border-radius:4px;width:50px;height:64px;display:flex;align-items:center;justify-content:center;background:#eff6ff;">
            <div style="color:#1e40af;font-size:8px;">🏛️</div>
        </div>
        <div style="font-size:16px;font-weight:bold;color:#991b1b;writing-mode:vertical-rl;text-orientation:mixed;">كمبيالة</div>
    </div>
</div>

    </div>
</div>`
}


