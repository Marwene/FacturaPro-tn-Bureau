import type { SerializedEffet } from "@/lib/types"
import { formatTND } from "@/lib/decimal"
import { formatDate, formatDateLong } from "@/lib/utils"
import { numInWords } from "./num-in-words"
import { renderLettreCarteBasHTML } from "./carte-bas"

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

${renderLettreCarteBasHTML({
    ribParts,
    montant: effet.montant,
    companyBank: effet.companyBank,
    tire: effet.tire,
    tireAdresse: effet.tireAdresse,
    tireBanque: effet.tireBanque,
})}`
}
