import type { SerializedEffet } from "@/lib/types"
import { computeLettreFields } from "./print-overlay"
import { PRINT_FIELDS, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PREIMPRIME_IMAGE_SRC, PREIMPRIME_IMAGE_HEIGHT_MM, BG_BOXES } from "./gabarit"

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
