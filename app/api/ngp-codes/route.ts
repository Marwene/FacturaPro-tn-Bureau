import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { ngpCodeCreateSchema } from "@/lib/schemas/ngp-code";

function generateBarcodeFromCode(code: string): string {
    return code.replace(/\s+/g, "");
}

export const GET = apiRoute.get(
  { permission: "parametres:voir", requireCompany: true },
  async (_request, { companyId }) => {
    const codes = await prisma.ngpCode.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
    });

    return { codes: serializeDecimals(codes) };
  }
);

export const POST = apiRoute.post(
  { permission: "parametres:modifier", requireCompany: true, schema: ngpCodeCreateSchema },
  async (_request, { companyId, body }) => {
    const { code, barcode, description } = body;

    const existing = await prisma.ngpCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(errorResponse("Ce code NGP existe déjà"), { status: 409 });
    }

    const generatedBarcode = barcode && barcode.trim() ? barcode.trim() : generateBarcodeFromCode(code);

    const ngpCode = await prisma.ngpCode.create({
      data: {
        code,
        barcode: generatedBarcode,
        description: description ?? null,
        companyId,
      },
    });

    return NextResponse.json({ code: serializeDecimals(ngpCode) }, { status: 201 });
  }
);
