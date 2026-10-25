import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { UPLOAD_LIMITS, isSafeUploadId, resolvePublicFilePath, validateUpload } from "@/lib/upload-guard";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

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

    // L'extension est fixée sur le MIME détecté (application/pdf → pdf).
    const fileName = `fiche-technique-${Date.now()}.${validation.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products", id);
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/products/${id}/${fileName}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, validation.bytes);

    if (product.ficheTechniqueUrl) {
      const oldPath = resolvePublicFilePath(product.ficheTechniqueUrl);
      if (oldPath === null) {
        console.warn("[fiche-technique] suppression ignorée : URL hors de /uploads/");
      } else {
        try { await unlink(oldPath); } catch (err) { console.error("[fiche-technique] suppression de l'ancienne fiche impossible", err); }
      }
    }

    await prisma.product.update({ where: { id }, data: { ficheTechniqueUrl: publicUrl } });

    return NextResponse.json({ ficheTechniqueUrl: publicUrl });
  }
);

export const DELETE = apiRoute.delete(
  { permission: "produits:modifier" },
  async (_request, { params }) => {
    const { id } = params;
    if (!isSafeUploadId(id)) {
      return NextResponse.json(errorResponse("Identifiant de produit invalide"), { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product?.ficheTechniqueUrl) {
      return NextResponse.json(errorResponse("Aucune fiche technique"), { status: 404 });
    }

    const oldPath = resolvePublicFilePath(product.ficheTechniqueUrl);
    if (oldPath === null) {
      console.warn("[fiche-technique] suppression ignorée : URL hors de /uploads/");
    } else {
      try { await unlink(oldPath); } catch (err) { console.error("[fiche-technique] suppression de la fiche impossible", err); }
    }

    await prisma.product.update({ where: { id }, data: { ficheTechniqueUrl: null } });

    return NextResponse.json({ success: true });
  }
);
