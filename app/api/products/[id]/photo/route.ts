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
    const file = formData.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json(errorResponse("Fichier requis"), { status: 400 });
    }

    const validation = await validateUpload(file, {
      category: "image",
      maxBytes: UPLOAD_LIMITS.productPhoto,
    });
    if (!validation.ok) {
      return NextResponse.json(errorResponse(validation.message), { status: 400 });
    }

    // Extension déduite du MIME détecté (JPEG → jpg, PNG → png, etc.).
    const fileName = `photo-${Date.now()}.${validation.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products", id);
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/products/${id}/${fileName}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, validation.bytes);

    // Delete old photo if exists (best-effort, chemin contenu dans public/)
    if (product.photoUrl) {
      const oldPath = resolvePublicFilePath(product.photoUrl);
      if (oldPath === null) {
        console.warn("[photo] suppression ignorée : URL hors de /uploads/");
      } else {
        try { await unlink(oldPath); } catch (err) { console.error("[photo] suppression de l'ancienne photo impossible", err); }
      }
    }

    await prisma.product.update({ where: { id }, data: { photoUrl: publicUrl } });

    return NextResponse.json({ photoUrl: publicUrl });
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
    if (!product?.photoUrl) return NextResponse.json(errorResponse("Aucune photo"), { status: 404 });

    const oldPath = resolvePublicFilePath(product.photoUrl);
    if (oldPath === null) {
      console.warn("[photo] suppression ignorée : URL hors de /uploads/");
    } else {
      try { await unlink(oldPath); } catch (err) { console.error("[photo] suppression de la photo impossible", err); }
    }

    await prisma.product.update({ where: { id }, data: { photoUrl: null } });

    return NextResponse.json({ success: true });
  }
);
