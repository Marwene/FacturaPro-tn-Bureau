import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { ngpCodeUpdateSchema } from "@/lib/schemas/ngp-code";

function generateBarcodeFromCode(code: string): string {
    return code.replace(/\s+/g, "");
}

export const GET = apiRoute.get(
  { permission: "parametres:voir", requireCompany: true },
  async (_request, { params, companyId }) => {
    const { id } = params;
    const code = await prisma.ngpCode.findFirst({ where: { id, companyId } });
    if (!code) {
      return NextResponse.json(errorResponse("Code NGP introuvable"), { status: 404 });
    }

    return { code: serializeDecimals(code) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "parametres:modifier", requireCompany: true, schema: ngpCodeUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;
    const { code, barcode, description } = body;

    const existing = await prisma.ngpCode.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(errorResponse("Code NGP introuvable"), { status: 404 });
    }

    if (code && code !== existing.code) {
      const duplicate = await prisma.ngpCode.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json(errorResponse("Ce code NGP existe déjà"), { status: 409 });
      }
    }

    const finalCode = code !== undefined ? code : existing.code;
    const finalBarcode = barcode !== undefined ? (barcode ?? null) : (code !== undefined && barcode === undefined ? generateBarcodeFromCode(finalCode) : existing.barcode);

    const updated = await prisma.ngpCode.update({
      where: { id, companyId },
      data: {
        ...(code !== undefined ? { code: finalCode } : {}),
        ...(finalBarcode !== existing.barcode || code !== undefined ? { barcode: finalBarcode } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
      },
    });

    return { code: serializeDecimals(updated) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "parametres:modifier", requireCompany: true },
  async (_request, { params, companyId }) => {
    const { id } = params;
    const existing = await prisma.ngpCode.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json(errorResponse("Code NGP introuvable"), { status: 404 });
    }
    await prisma.ngpCode.delete({ where: { id } });

    return { success: true };
  }
);
