import type { SerializedQuote, SerializedQuoteLine, SerializedInvoice, SerializedInvoiceLine, SerializedDeliveryNote, SerializedDeliveryNoteLine, SerializedTiers, SerializedSettings } from "@/lib/types";
import type { DocumentLine, DocumentPDFOptions } from "./pdf-types";

function p(v: string) { return parseFloat(v); }

function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleDateString("fr-FR");
}

function clientLines(tiers?: SerializedTiers): string[] {
  if (!tiers) return [];
  return [
    ...(tiers.matriculeFiscal ? [`MF: ${tiers.matriculeFiscal}`] : []),
    ...(tiers.adresse ? [tiers.adresse] : []),
    ...(tiers.ville ? [tiers.ville] : []),
    ...(tiers.telephone ? [`Tél: ${tiers.telephone}`] : []),
    ...(tiers.email ? [tiers.email] : []),
  ];
}

function makeCompany(settings?: SerializedSettings) {
  if (!settings) return undefined;
  return {
    name: settings.raisonSociale,
    address: [settings.adresse, settings.ville, settings.codePostal].filter(Boolean).join(", "),
    phone: settings.telephone,
    email: settings.email,
    mf: settings.matriculeFiscal,
  };
}

type QuoteLine = SerializedQuoteLine;
type InvoiceLine = SerializedInvoiceLine;
type DeliveryLine = SerializedDeliveryNoteLine;

function makeLines(lines: QuoteLine[] | InvoiceLine[] | DeliveryLine[]): DocumentLine[] {
  return lines.map((l) => ({
    code: (l.product as { code?: string } | undefined)?.code ?? "",
    desc: l.description,
    qty: p(l.quantite),
    price: p(l.prixHT),
    tva: p(l.tauxTVA),
    fodec: l.fodec,
  }));
}

export function quoteToDocumentOptions(
  quote: SerializedQuote,
  settings?: SerializedSettings,
  options?: DocumentPDFOptions["options"],
  companyOverride?: DocumentPDFOptions["company"]
): DocumentPDFOptions {
  const lines = makeLines(quote.lines ?? []);

  // Calculer la remise totale
  let remiseTotale = 0;
  for (const line of quote.lines ?? []) {
    const qty = parseFloat(line.quantite) || 0;
    const prix = parseFloat(line.prixHT) || 0;
    const rem = parseFloat(line.remise) || 0;
    const baseLine = qty * prix;
    const remiseAmount = baseLine * (rem / 100);
    remiseTotale += remiseAmount;
  }

  const devise = quote.devise ?? "TND";
  const tauxChange = quote.tauxChange ?? undefined;

  return {
    docType: "DEVIS",
    docNumber: quote.numero,
    topRightLines: [
      `Création: ${fmtDate(quote.dateCreation)}`,
      ...(quote.dateExpiration ? [`Expiration: ${fmtDate(quote.dateExpiration)}`] : []),
      ...(devise !== "TND" ? [`Devise: ${devise}`] : []),
      ...(devise !== "TND" && tauxChange ? [`Taux BCT: ${tauxChange}`] : []),
    ],
    party: {
      title: "Client",
      name: quote.tiers?.raisonSociale ?? "",
      lines: clientLines(quote.tiers),
    },
    lines,
    totals: {
      subtotal: p(quote.baseHT),
      remise: remiseTotale,
      fodec: p(quote.totalFodec),
      tva: p(quote.totalTVA),
      stamp: devise === "TND" ? 1.000 : 0,
      total: p(quote.totalTTC) + (devise === "TND" ? 1.000 : 0),
    },
    notes: quote.notes || "Ce devis n'est valable que 10 jours. Dépassant la date d'échéance, l'offre n'est plus valable.",
    devise,
    tauxChange: devise !== "TND" && tauxChange ? tauxChange : undefined,
    company: companyOverride ?? makeCompany(settings),
    options,
  };
}

export function deliveryNoteToDocumentOptions(
  bl: SerializedDeliveryNote,
  settings?: SerializedSettings,
  options?: DocumentPDFOptions["options"],
  companyOverride?: DocumentPDFOptions["company"]
): DocumentPDFOptions {
  const lines = makeLines(bl.lines ?? []);
  const bcVise = bl.blViseActif
    ? {
      numero: bl.snNumero ?? undefined,
      date: bl.dateSN ? bl.dateSN.split("T")[0] : undefined,
      poidsBrut: bl.poidsBrut ?? undefined,
      poids: bl.poidsNet ?? undefined,
      nbColis: bl.nbColis ?? undefined,
      devise: bl.devise,
      tauxChange: bl.tauxChange ?? undefined,
      montantTND: bl.montantTND ?? undefined,
    }
    : undefined;

  return {
    docType: "BON DE LIVRAISON",
    docNumber: bl.numero,
    topRightLines: [
      `Création: ${fmtDate(bl.dateCreation)}`,
      ...(bl.dateLivraison ? [`Livraison: ${fmtDate(bl.dateLivraison)}`] : []),
    ],
    party: {
      title: "Client",
      name: bl.tiers?.raisonSociale ?? "",
      lines: clientLines(bl.tiers),
    },
    lines,
    totals: {
      subtotal: p(bl.baseHT),
      fodec: p(bl.totalFodec),
      tva: p(bl.totalTVA),
      stamp: 0,
      total: p(bl.totalTTC),
    },
    notes: bl.notes ?? undefined,
    devise: bl.devise,
    bcVise,
    company: companyOverride ?? makeCompany(settings),
    options,
  };
}

export function invoiceToDocumentOptions(
  invoice: SerializedInvoice,
  settings?: SerializedSettings,
  options?: DocumentPDFOptions["options"],
  companyOverride?: DocumentPDFOptions["company"]
): DocumentPDFOptions {
  const lines = makeLines(invoice.lines ?? []);
  const extras: DocumentPDFOptions["totals"]["extras"] = [];
  const paye = p(invoice.montantPaye);
  const reste = p(invoice.resteAPayer);
  if (paye > 0) extras.push({ label: "Montant payé", value: paye, emphasis: "success" });
  if (reste > 0) extras.push({ label: "Reste à payer", value: reste, emphasis: "danger" });

  const bcVise = invoice.bcViseActif
    ? {
      numero: invoice.bcViseNumero ?? undefined,
      date: invoice.dateSN ? invoice.dateSN.split("T")[0] : undefined,
      poidsBrut: invoice.poidsBrut ?? undefined,
      poids: invoice.poids ?? undefined,
      nbColis: invoice.nbColis ?? undefined,
      devise: invoice.devise,
      tauxChange: invoice.tauxChange ?? undefined,
      montantTND: invoice.montantTND ?? undefined,
    }
    : undefined;

  return {
    docType: "FACTURE",
    docNumber: invoice.numero,
    topRightLines: [
      `Émission: ${fmtDate(invoice.dateEmission)}`,
      ...(invoice.dateEcheance ? [`Échéance: ${fmtDate(invoice.dateEcheance)}`] : []),
    ],
    party: {
      title: "Client",
      name: invoice.tiers?.raisonSociale ?? "",
      lines: clientLines(invoice.tiers),
    },
    lines,
    totals: {
      subtotal: p(invoice.baseHT),
      fodec: p(invoice.totalFodec),
      tva: p(invoice.totalTVA),
      stamp: 0,
      total: p(invoice.totalTTC),
      extras,
    },
    notes: invoice.notes ?? undefined,
    devise: invoice.devise,
    bcVise,
    company: companyOverride ?? makeCompany(settings),
    options,
  };
}

export function blGroupedInvoiceToDocumentOptions(
  invoice: SerializedInvoice,
  blGroups: Array<{
    blNumero: string;
    blDate: Date | string | null;
    lines: SerializedInvoiceLine[];
  }>,
  settings?: SerializedSettings,
  options?: DocumentPDFOptions["options"],
  companyOverride?: DocumentPDFOptions["company"]
): DocumentPDFOptions {
  const docLines: DocumentLine[] = [];

  for (const group of blGroups) {
    docLines.push({
      code: "",
      desc: "",
      qty: 0,
      price: 0,
      tva: 0,
      fodec: false,
      blNumero: group.blNumero,
      blDate: group.blDate ? fmtDate(group.blDate) : undefined,
      isGroupHeader: true,
    });

    for (const line of group.lines) {
      docLines.push({
        code: (line.product as { code?: string } | undefined)?.code ?? "",
        desc: line.description,
        qty: p(line.quantite),
        price: p(line.prixHT),
        tva: p(line.tauxTVA),
        fodec: line.fodec,
      });
    }
  }

  const extras: DocumentPDFOptions["totals"]["extras"] = [];
  const paye = p(invoice.montantPaye);
  const reste = p(invoice.resteAPayer);
  if (paye > 0) extras.push({ label: "Montant payé", value: paye, emphasis: "success" });
  if (reste > 0) extras.push({ label: "Reste à payer", value: reste, emphasis: "danger" });

  return {
    docType: "FACTURE",
    docNumber: invoice.numero,
    topRightLines: [
      `Émission: ${fmtDate(invoice.dateEmission)}`,
      ...(invoice.dateEcheance ? [`Échéance: ${fmtDate(invoice.dateEcheance)}`] : []),
    ],
    party: {
      title: "Client",
      name: invoice.tiers?.raisonSociale ?? "",
      lines: clientLines(invoice.tiers),
    },
    lines: docLines,
    totals: {
      subtotal: p(invoice.baseHT),
      fodec: p(invoice.totalFodec),
      tva: p(invoice.totalTVA),
      stamp: 0,
      total: p(invoice.totalTTC),
      extras,
    },
    notes: invoice.notes ?? undefined,
    devise: invoice.devise,
    company: companyOverride ?? makeCompany(settings),
    options,
  };
}
