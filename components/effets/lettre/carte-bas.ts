import type { SerializedEffet } from "@/lib/types"
import { formatTND } from "@/lib/decimal"

export type CarteBasParams = {
    ribParts: string[]
    montant: SerializedEffet["montant"]
    companyBank: SerializedEffet["companyBank"]
    tire: SerializedEffet["tire"]
    tireAdresse: SerializedEffet["tireAdresse"]
    tireBanque: SerializedEffet["tireBanque"]
}

export function renderLettreCarteBasHTML({ ribParts, montant, companyBank, tire, tireAdresse, tireBanque }: CarteBasParams): string {
    return `<!-- ROW 5: RIB détaillé | Valeur | Domiciliation -->
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
            ${formatTND(montant)}
        </div>
    </div>
    <div>
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px;text-align:right;display:flex;justify-content:space-between;">
            <span>Domiciliation</span><span>اسم وعنوان الفرع المسحوب عليه</span>
        </div>
        <div style="border:1px solid #9ca3af;min-height:80px;background:#f9fafb;padding:6px 8px;">
            ${companyBank ? `
                <div style="font-weight:bold;font-size:10px;">${companyBank.nomBanque}</div>
                <div style="font-size:8px;margin-top:2px;">${companyBank.agence ?? ""}</div>
                <div style="font-size:8px;">${companyBank.rib ? `RIB: ${companyBank.rib}` : ""}</div>
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
            <div style="font-weight:bold;font-size:10px;">${tire}</div>
            <div style="font-size:8px;margin-top:2px;">${tireAdresse ?? ""}</div>
            <div style="font-size:8px;">${tireBanque ? `Banque: ${tireBanque}` : ""}</div>
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
