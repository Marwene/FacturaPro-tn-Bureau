import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { formatTND } from "@/lib/decimal";
import { formatDateLong } from "@/lib/utils";
import type { SerializedEffet } from "@/lib/types";

function numInWords(num: number): string {
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    if (num === 0) return "zéro";
    let words = "";
    if (num >= 1000) { words += units[Math.floor(num / 1000)] + " mille "; num %= 1000; }
    if (num >= 100) { words += (num >= 200 ? units[Math.floor(num / 100)] : "") + " cent "; num %= 100; }
    if (num >= 20) { words += tens[Math.floor(num / 10)] + " "; num %= 10; if (num > 0) words += "-"; }
    if (num > 0) words += units[num] + " ";
    return words.trim();
}

export default async function EffetPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const headersList = await headers();
    const request = new Request("http://localhost", { headers: Object.fromEntries(headersList) });
    const sessionUser = await getSessionFromRequest(request);
    if (!sessionUser?.id) redirect("/login");

    const { id } = await params;
    const effet = await prisma.effet.findUnique({
        where: { id },
        include: {
            tireur: { select: { raisonSociale: true, adresse: true, ville: true, matriculeFiscal: true, code: true } },
            fournisseur: { select: { raisonSociale: true, adresse: true, ville: true, matriculeFiscal: true, code: true } },
            company: { select: { name: true, adresse: true, ville: true, matriculeFiscal: true, ribBancaire: true, banque: true } },
        },
    });

    if (!effet) notFound();

    const montantNum = parseFloat(effet.montant.toString());
    const isRECU = effet.type === "RECU";

    return (
        <html>
            <head>
                <title>Lettre de Change — {effet.numero}</title>
                <style>{`
                    @page { margin: 20mm; size: A4; }
                    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; margin: 0; padding: 20mm; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px; }
                    .header .sub { font-size: 11px; color: #555; }
                    .field { display: flex; border-bottom: 1px solid #000; padding: 6px 0; }
                    .field-label { width: 160px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
                    .field-value { flex: 1; font-size: 13px; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .montant-box { border: 2px solid #000; padding: 12px; text-align: center; margin: 20px 0; }
                    .montant-box .chiffres { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
                    .montant-box .lettres { font-size: 13px; margin-top: 6px; font-style: italic; }
                    .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .footer .signature { border-top: 1px solid #000; padding-top: 6px; font-size: 11px; text-align: center; }
                    .mention { font-size: 10px; color: #888; margin-top: 40px; text-align: center; font-style: italic; }
                    .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
                    hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
                `}</style>
            </head>
            <body>
                <div className="header">
                    <h1>Lettre de Change</h1>
                    <div className="sub">Relevé n° {effet.numero}</div>
                </div>

                <div className="field">
                    <div className="field-label">Lieu et date</div>
                    <div className="field-value">Tunis, le {formatDateLong(new Date())}</div>
                </div>

                <div className="field">
                    <div className="field-label">Montant en chiffres</div>
                    <div className="field-value">{montantNum.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND</div>
                </div>

                <div className="montant-box">
                    <div className="chiffres">{montantNum.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</div>
                    <div className="lettres">{numInWords(Math.floor(montantNum)).toUpperCase()} DINARS TUNISIENS</div>
                </div>

                <div className="field">
                    <div className="field-label">À payer à</div>
                    <div className="field-value">{effet.beneficiaire}</div>
                </div>

                <div className="field">
                    <div className="field-label">À l&apos;ordre de</div>
                    <div className="field-value">{effet.beneficiaire}</div>
                </div>

                <div className="field">
                    <div className="field-label">Date d&apos;échéance</div>
                    <div className="field-value">{formatDateLong(effet.dateEcheance) || "________"}</div>
                </div>

                <div className="field">
                    <div className="field-label">Tiré</div>
                    <div className="field-value">{effet.tire}{effet.tireAdresse ? ` — ${effet.tireAdresse}` : ""}</div>
                </div>

                {effet.tireBanque && (
                    <div className="field">
                        <div className="field-label">Banque du tiré</div>
                        <div className="field-value">{effet.tireBanque}</div>
                    </div>
                )}

                <hr />

                <div className="grid-2">
                    <div>
                        <p style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", margin: "0 0 4px" }}>Tireur</p>
                        {isRECU && effet.tireur ? (
                            <>
                                <div className="row"><span>Raison sociale</span><span>{effet.tireur.raisonSociale}</span></div>
                                <div className="row"><span>MF</span><span>{effet.tireur.matriculeFiscal ?? "—"}</span></div>
                                <div className="row"><span>Adresse</span><span>{effet.tireur.adresse ?? "—"}</span></div>
                                <div className="row"><span>Ville</span><span>{effet.tireur.ville ?? "—"}</span></div>
                            </>
                        ) : effet.fournisseur ? (
                            <>
                                <div className="row"><span>Raison sociale</span><span>{effet.fournisseur.raisonSociale}</span></div>
                                <div className="row"><span>MF</span><span>{effet.fournisseur.matriculeFiscal ?? "—"}</span></div>
                                <div className="row"><span>Adresse</span><span>{effet.fournisseur.adresse ?? "—"}</span></div>
                                <div className="row"><span>Ville</span><span>{effet.fournisseur.ville ?? "—"}</span></div>
                            </>
                        ) : (
                            <div className="row" style={{ color: "#999" }}>Non renseigné</div>
                        )}
                    </div>
                    <div>
                        <p style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", margin: "0 0 4px" }}>Bénéficiaire / Notre société</p>
                        {effet.company ? (
                            <>
                                <div className="row"><span>{effet.company.name}</span></div>
                                <div className="row"><span>MF: {effet.company.matriculeFiscal ?? "—"}</span></div>
                                <div className="row"><span>{effet.company.adresse ?? "—"}</span></div>
                                <div className="row"><span>{effet.company.ville ?? "—"}</span></div>
                                {effet.company.banque && <div className="row"><span>Banque: {effet.company.banque}</span></div>}
                                {effet.company.ribBancaire && <div className="row"><span>RIB: {effet.company.ribBancaire}</span></div>}
                            </>
                        ) : (
                            <div className="row" style={{ color: "#999" }}>Non renseigné</div>
                        )}
                    </div>
                </div>

                {effet.notes && (
                    <>
                        <hr />
                        <div className="row"><span style={{ fontWeight: "bold" }}>Notes:</span><span>{effet.notes}</span></div>
                    </>
                )}

                <div className="footer">
                    <div className="signature">Signature du tireur</div>
                    <div className="signature">Bon pour acceptation</div>
                </div>

                <div className="mention">
                    Document généré le {new Date().toLocaleString("fr-TN")} · {effet.numero} · Statut: {effet.status}
                </div>
            </body>
        </html>
    );
}
