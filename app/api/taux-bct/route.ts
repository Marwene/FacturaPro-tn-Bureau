import { NextRequest, NextResponse } from "next/server";

const BCT_URL = "https://www.bct.gov.tn/bct/siteprod/cours.jsp?la=AN";

async function fetchBCTRates(): Promise<{ EUR: number; USD: number }> {
  const res = await fetch(BCT_URL, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`BCT returned ${res.status}`);
  }
  const html = await res.text();

  const currencies = ["EUR", "USD"] as const;
  const rates: Partial<Record<string, number>> = {};

  for (const code of currencies) {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<td[^>]*>\\s*${escaped}\\s*</td>\\s*<td[^>]*>\\s*<div[^>]*>\\s*(\\d+)\\s*</div>\\s*</td>\\s*<td[^>]*>\\s*<div[^>]*>\\s*([\\d.]+)\\s*</div>`,
      "i"
    );
    const match = html.match(pattern);
    if (match) {
      const unit = parseInt(match[1], 10);
      const value = parseFloat(match[2]);
      rates[code] = unit > 0 ? value / unit : value;
    }
  }

  if (!rates.EUR || !rates.USD) {
    throw new Error("Could not parse BCT rates");
  }

  return { EUR: rates.EUR, USD: rates.USD };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const devise = searchParams.get("devise")?.toUpperCase();

    const rates = await fetchBCTRates();

    if (devise && rates[devise as keyof typeof rates]) {
      return NextResponse.json({
        success: true,
        devise,
        taux: Number((rates[devise as keyof typeof rates]).toFixed(4)),
        date: new Date().toISOString(),
        source: "BCT",
      });
    }

    return NextResponse.json({
      success: true,
      ...rates,
      date: new Date().toISOString(),
      source: "BCT",
    });
  } catch (err) {
    console.error("BCT rate fetch error:", err);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer les taux BCT" },
      { status: 502 }
    );
  }
}
