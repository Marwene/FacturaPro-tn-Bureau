import type { DocumentPDFOptions } from "./pdf-types";
import { montantEnLettres } from "./pdf-numbers";

function escapeHTML(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

const fmtCurrency = (n: number, devise = "TND") => {
  const locale = devise === "USD" ? "en-US" : "fr-FR";
  const digits = devise === "TND" ? 3 : 2;
  const formatted = n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (devise === "USD") return `$${formatted}`;
  if (devise === "EUR") return `${formatted} €`;
  return `${formatted} DT`;
};

export function buildDocumentHTML(
  opts: DocumentPDFOptions,
  renderOpts: { autoPrint?: boolean } = {}
): string {
  const {
    docType,
    docNumber,
    topRightLines = [],
    party,
    lines,
    totals,
    notes,
    company,
    options,
  } = opts;
  const includeTaxBreakdown = options?.includeTaxBreakdown ?? true;
  const includeNotes = options?.includeNotes ?? true;

  const co = {
    name: company?.name ?? "FacturaPro TN",
    tagline: company?.tagline ?? "Gestion commerciale & fiscale",
    address: company?.address ?? "12 Avenue Habib Bourguiba, 1000 Tunis",
    phone: company?.phone ?? "+216 71 000 000",
    email: company?.email ?? "contact@facturapro.tn",
    mf: company?.mf ?? "0000000/A/M/000",
  };

  const lineRows = lines
    .map(
      (l) => {
        if (l.isGroupHeader) {
          return `
        <tr class="bl-group-header">
          <td colspan="5" style="background:#f1f5f9;padding:10px 14px;border-bottom:2px solid #cbd5e1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">📦</span>
              <div>
                <span style="font-weight:700;font-size:13px;color:#0f172a;">${escapeHTML(l.blNumero ?? "")}</span>
                ${l.blDate ? `<span style="margin-left:12px;font-size:11px;color:#64748b;">Livré le ${escapeHTML(l.blDate)}</span>` : ""}
              </div>
            </div>
          </td>
        </tr>`;
        }
        return `
      <tr>
        <td class="mono">${escapeHTML(l.code)}</td>
        <td>
          <div class="strong">${escapeHTML(l.desc)}</div>
          <div class="muted xs">TVA ${l.tva}%${l.fodec ? " · FODEC 1%" : ""}</div>
        </td>
        <td class="right num">${l.qty}</td>
        <td class="right num">${fmtCurrency(l.price, opts.devise)}</td>
        <td class="right num strong">${fmtCurrency(l.qty * l.price, opts.devise)}</td>
      </tr>`;
      }
    )
    .join("");

  const extrasRows = (totals.extras || [])
    .map(
      (e) => `<tr><td>${escapeHTML(e.label)}</td><td class="right num ${e.emphasis === "success" ? "ok" : e.emphasis === "danger" ? "bad" : ""
      }">${fmtCurrency(e.value, opts.devise)}</td></tr>`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escapeHTML(docType)} ${escapeHTML(docNumber)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#0f172a;background:#fff}
  .page{padding:20mm 18mm}
  .muted{color:#64748b}
  .xs{font-size:10px}
  .strong{font-weight:600}
  .right{text-align:right}
  .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#475569}
  .ok{color:#16a34a}
  .bad{color:#dc2626;font-weight:600}
  .header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #0f172a;padding-bottom:16px}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;letter-spacing:.04em}
  .brand h1{font-size:16px;margin:0;letter-spacing:-.01em}
  .brand .tag{font-size:11px;color:#64748b;margin-top:2px}
  .doc-meta{text-align:right}
  .doc-type{font-size:11px;letter-spacing:.18em;color:#64748b;text-transform:uppercase}
  .doc-num{font-size:22px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:2px}
  .doc-meta .line{font-size:11px;color:#475569;margin-top:2px}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
  .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px}
  .card .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}
  .card .name{font-weight:700;font-size:13px}
  .card .row{font-size:11px;color:#475569;margin-top:2px}
  .bcvise{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:14px;font-size:11px;display:flex;flex-wrap:wrap;gap:4px 18px}
  .bcvise .lbl{color:#166534;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:.07em;width:100%;margin-bottom:2px}
  .bcvise .item{white-space:nowrap}
  .bcvise .item .k{color:#475569}
  .bcvise .item .v{font-weight:600;color:#0f172a;margin-left:4px}
  table.items{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}
  table.items thead th{background:#0f172a;color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.06em;padding:10px;text-align:left}
  table.items thead th.right{text-align:right}
  table.items tbody td{padding:10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  table.items tbody tr:nth-child(even) td{background:#f8fafc}
  .totals-wrap{display:grid;grid-template-columns:1fr 280px;gap:16px;margin-top:14px}
  .notes{font-size:11px;color:#475569;border-left:3px solid #e2e8f0;padding:4px 8px;background:#f8fafc;border-radius:0 8px 8px 0}
  table.totals{width:100%;border-collapse:collapse;font-size:12px}
  table.totals td{padding:6px 10px}
  table.totals tr.sep td{border-top:1px solid #e2e8f0}
  table.totals tr.grand td{background:#0f172a;color:#fff;font-weight:700;font-size:14px;padding:10px}
  table.totals tr.grand td.right{font-size:16px}
  .amount-words{margin-top:14px;font-size:10px;color:#334155;font-style:italic;line-height:1.5}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  @media print{ .page{padding:14mm} button{display:none} }
</style></head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="logo">FP</div>
      <div>
        <h1>${escapeHTML(co.name)}</h1>
        <div class="tag">${escapeHTML(co.tagline)}</div>
        <div class="tag" style="margin-top:6px">${escapeHTML(co.address)}</div>
        <div class="tag">Tél ${escapeHTML(co.phone)} · ${escapeHTML(co.email)}</div>
        <div class="tag">MF ${escapeHTML(co.mf)}</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${escapeHTML(docType)}</div>
      <div class="doc-num">${escapeHTML(docNumber)}</div>
      ${topRightLines.map((l) => `<div class="line">${escapeHTML(l)}</div>`).join("")}
    </div>
  </div>
  <div class="parties">
    <div class="card">
      <div class="label">Émetteur</div>
      <div class="name">${escapeHTML(co.name)}</div>
      <div class="row">${escapeHTML(co.address)}</div>
      <div class="row">MF ${escapeHTML(co.mf)}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHTML(party.title)}</div>
      <div class="name">${escapeHTML(party.name)}</div>
      ${(party.lines || []).map((l) => `<div class="row">${escapeHTML(l)}</div>`).join("")}
    </div>
  </div>
  ${opts.bcVise
      ? `<div class="bcvise">
          <div class="lbl">Bon de commande visé sous douane</div>
          ${opts.bcVise.numero ? `<span class="item"><span class="k">N° SN</span><span class="v">${escapeHTML(opts.bcVise.numero)}</span></span>` : ""}
          ${opts.bcVise.date ? `<span class="item"><span class="k">Date SN</span><span class="v">${escapeHTML(opts.bcVise.date)}</span></span>` : ""}
          ${opts.bcVise.poidsBrut ? `<span class="item"><span class="k">Poids Brut</span><span class="v">${escapeHTML(opts.bcVise.poidsBrut)} kg</span></span>` : ""}
          ${opts.bcVise.poids != null ? `<span class="item"><span class="k">Poids Net</span><span class="v">${opts.bcVise.poids} kg</span></span>` : ""}
          ${opts.bcVise.nbColis != null ? `<span class="item"><span class="k">Nb Colis</span><span class="v">${opts.bcVise.nbColis}</span></span>` : ""}
          ${opts.bcVise.devise ? `<span class="item"><span class="k">Devise</span><span class="v">${escapeHTML(opts.bcVise.devise)}</span></span>` : ""}
          ${opts.bcVise.tauxChange ? `<span class="item"><span class="k">Taux</span><span class="v">${escapeHTML(opts.bcVise.tauxChange)}</span></span>` : ""}
          ${opts.bcVise.montantTND ? `<span class="item"><span class="k">Mt TND</span><span class="v">${parseFloat(opts.bcVise.montantTND).toFixed(3)} DT</span></span>` : ""}
        </div>`
      : ""
    }
  <table class="items">
    <thead><tr><th style="width:14%">Code</th><th>Désignation</th><th class="right" style="width:8%">Qté</th><th class="right" style="width:14%">P.U. HT</th><th class="right" style="width:16%">Total HT</th></tr></thead>
    <tbody>${lineRows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:18px">Aucune ligne</td></tr>`}</tbody>
  </table>
  <div class="totals-wrap" style="${includeNotes ? "" : "grid-template-columns:1fr"}">
    ${includeNotes
      ? `<div class="notes">${notes ? escapeHTML(notes) : docType === "DEVIS" ? "Ce devis n'est valable que 10 jours. Dépassant la date d'échéance, l'offre n'est plus valable." : "Conditions : règlement à réception. Tout retard de paiement entraînera l'application de pénalités conformément à la législation en vigueur."}</div>`
      : ""
    }
    <table class="totals" style="${includeNotes ? "" : "max-width:320px;margin-left:auto"}">
      ${includeTaxBreakdown
      ? `<tr><td>Sous-total HT</td><td class="right num">${fmtCurrency(totals.subtotal, opts.devise)}</td></tr>
                 ${(totals.remise ?? 0) > 0 ? `<tr><td style="color:#ea580c">Remise</td><td class="right num" style="color:#ea580c">-${fmtCurrency(totals.remise!, opts.devise)}</td></tr>` : ""}
                 ${totals.fodec > 0 ? `<tr><td>FODEC (1%)</td><td class="right num">${fmtCurrency(totals.fodec, opts.devise)}</td></tr>` : ""}
                 <tr><td>TVA</td><td class="right num">${fmtCurrency(totals.tva, opts.devise)}</td></tr>
                 ${totals.stamp > 0 ? `<tr class="sep"><td>Timbre fiscal</td><td class="right num">${fmtCurrency(totals.stamp, opts.devise)}</td></tr>` : ""}`
      : ""
    }
      <tr class="grand"><td>Total TTC</td><td class="right num">${fmtCurrency(totals.total, opts.devise)}</td></tr>
      ${extrasRows}
    </table>
  </div>
  <div class="amount-words">Arrête ${docType === "FACTURE" ? "la présente facture" : docType === "DEVIS" ? "le présent devis" : "le présent bon de livraison"} à la somme de : ${montantEnLettres(totals.total, opts.devise)}
  ${opts.devise && opts.devise !== "TND" && opts.tauxChange ? 
    `<br/>(soit ${montantEnLettres(Number(totals.total) * Number(opts.tauxChange), "TND")} - Taux BCT: ${opts.tauxChange})` : 
    ""}
  </div>
  <div class="footer">
    <div>${escapeHTML(co.name)} · MF ${escapeHTML(co.mf)}</div>
    <div>Généré le ${new Date().toLocaleString("fr-FR")}</div>
  </div>
</div>
${renderOpts.autoPrint ? `<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>` : ""}
</body></html>`;
}

export function exportDocumentPDF(opts: DocumentPDFOptions) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  w.document.write(buildDocumentHTML(opts, { autoPrint: true }));
  w.document.close();
}
