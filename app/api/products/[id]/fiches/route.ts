import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { UPLOAD_LIMITS, isSafeUploadId, validateUpload } from "@/lib/upload-guard";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const GET = apiRoute.get(
  { permission: "produits:voir" },
  async (_request, { params }) => {
    const { id } = params;

    const fiches = await prisma.ficheTechnique.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });

    const legacyFiche = await prisma.product.findUnique({
      where: { id },
      select: { ficheTechniqueUrl: true },
    });

    return NextResponse.json({
      fiches,
      legacyFicheUrl: legacyFiche?.ficheTechniqueUrl ?? null,
    });
  }
);

export const POST = apiRoute.post(
  { permission: "produits:modifier" },
  async (request, { params }) => {
    const { id } = params;
    if (!isSafeUploadId(id)) {
      return NextResponse.json(errorResponse("Identifiant de produit invalide"), { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json(errorResponse("Produit introuvable"), { status: 404 });

    const formData = await request.formData();
    const file = formData.get("fiche");
    if (!(file instanceof File)) {
      return NextResponse.json(errorResponse("Fichier requis"), { status: 400 });
    }

    const validation = await validateUpload(file, {
      category: "pdf",
      maxBytes: UPLOAD_LIMITS.fiche,
    });
    if (!validation.ok) {
      return NextResponse.json(errorResponse(validation.message), { status: 400 });
    }

    const rawNom = formData.get("nom");
    const nomForm = typeof rawNom === "string" ? rawNom.trim() : "";
    const name = nomForm || file.name.replace(/\.pdf$/i, "") || "Fiche technique";

    // L'extension est fixée sur le MIME détecté (application/pdf → pdf).
    const fileName = `fiche-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${validation.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products", id);
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/products/${id}/${fileName}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, validation.bytes);

    const fiche = await prisma.ficheTechnique.create({
      data: { productId: id, nom: name, url: publicUrl },
    });

    return NextResponse.json({ fiche }, { status: 201 });
  }
);
