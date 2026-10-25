import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { expireDueQuotes } from "@/lib/quote-expiry";

export const POST = apiRoute.post(
  { permission: "devis:modifier", requireCompany: true },
  async (request, { companyId }) => {
    const expired = await expireDueQuotes(prisma, companyId);

    return {
      success: true,
      expired,
    };
  }
);
