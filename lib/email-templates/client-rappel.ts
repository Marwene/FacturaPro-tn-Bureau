import type { TiersSoldeEntry, SerializedTiers } from "@/lib/types";

export function buildRappelEmailHtml(
    tiers: SerializedTiers,
    entries: TiersSoldeEntry[],
    totalDebit: string,
    totalCredit: string,
    soldeFinal: string,
    appUrl: string,
): string {
    const rows = entries.map(
        (e) => `
        <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${new Date(e.date).toLocaleDateString("fr-TN")}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${e.piece}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${e.mouvement}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${e.commentaire}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;">${parseFloat(e.debit) > 0 ? parseFloat(e.debit).toLocaleString("fr-TN", { minimumFractionDigits: 3 }) + " DT" : "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;">${parseFloat(e.credit) > 0 ? parseFloat(e.credit).toLocaleString("fr-TN", { minimumFractionDigits: 3 }) + " DT" : "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;font-weight:bold;">${parseFloat(e.solde).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT</td>
        </tr>`
    ).join("");

    return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="padding:32px 32px 0;">
<h1 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#111827;">Compte Bloqué</h1>
<p style="font-size:14px;color:#6b7280;margin:0 0 24px;">${tiers.raisonSociale} — ${tiers.code}</p>
</td></tr>
<tr><td style="padding:0 32px;">
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
<p style="font-size:14px;font-weight:600;color:#991b1b;margin:0 0 4px;">Votre compte est bloqué</p>
<p style="font-size:13px;color:#b91c1c;margin:0;">Vous avez dépassé votre limite de crédit. Veuillez régulariser votre situation pour débloquer votre compte.</p>
</div>
</td></tr>
<tr><td style="padding:0 32px;">
<h2 style="font-size:14px;font-weight:600;margin:0 0 12px;color:#111827;">Récapitulatif du Solde</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<thead>
<tr style="background:#f9fafb;">
<th style="padding:8px;font-size:11px;font-weight:600;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Date</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Pièce</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Mouvement</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Commentaire</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:right;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Débit</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:right;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Crédit</th>
<th style="padding:8px;font-size:11px;font-weight:600;text-align:right;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Solde</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
<tfoot>
<tr style="background:#f9fafb;font-weight:700;">
<td colspan="4" style="padding:8px;font-size:13px;text-align:right;border-top:2px solid #d1d5db;">Totaux</td>
<td style="padding:8px;font-size:13px;text-align:right;border-top:2px solid #d1d5db;">${parseFloat(totalDebit).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT</td>
<td style="padding:8px;font-size:13px;text-align:right;border-top:2px solid #d1d5db;">${parseFloat(totalCredit).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT</td>
<td style="padding:8px;font-size:13px;text-align:right;border-top:2px solid #d1d5db;">${parseFloat(soldeFinal).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT</td>
</tr>
</tfoot>
</table>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
<a href="${appUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;">Accéder à mon espace client</a>
<p style="font-size:12px;color:#9ca3af;margin:12px 0 0;">Ce message a été envoyé automatiquement par FacturaPro TN.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}
