"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadProductPhoto(productId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const perm = checkPermission(
    session.user.role,
    session.user.permissions,
    "produits:modifier"
  );
  if (!perm.allowed) throw new Error(perm.error!);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit introuvable");

  const file = formData.get("photo") as File | null;
  if (!file) throw new Error("Fichier requis");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Format non supporté (JPEG, PNG, WebP, GIF)");
  if (file.size > MAX_SIZE) throw new Error("Fichier trop volumineux (max 5 Mo)");

  const ext = file.type.split("/")[1] ?? "jpg";
  const fileName = `photo-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products", productId);
  const filePath = path.join(uploadDir, fileName);
  const publicUrl = `/uploads/products/${productId}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  if (product.photoUrl) {
    const oldPath = path.join(process.cwd(), "public", product.photoUrl);
    try { await unlink(oldPath); } catch (err) { console.error("[products] suppression de l'ancienne photo impossible", err); }
  }

  await prisma.product.update({ where: { id: productId }, data: { photoUrl: publicUrl } });

  return { photoUrl: publicUrl };
}

export async function deleteProductPhoto(productId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const perm = checkPermission(
    session.user.role,
    session.user.permissions,
    "produits:modifier"
  );
  if (!perm.allowed) throw new Error(perm.error!);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product?.photoUrl) throw new Error("Aucune photo");

  const oldPath = path.join(process.cwd(), "public", product.photoUrl);
  try { await unlink(oldPath); } catch (err) { console.error("[products] suppression de la photo impossible", err); }

  await prisma.product.update({ where: { id: productId }, data: { photoUrl: null } });

  return { success: true };
}

const ALLOWED_FICHE_TYPES = ["application/pdf"];
const MAX_FICHE_SIZE = 15 * 1024 * 1024;

export async function uploadFicheTechnique(productId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const perm = checkPermission(
    session.user.role,
    session.user.permissions,
    "produits:modifier"
  );
  if (!perm.allowed) throw new Error(perm.error!);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit introuvable");

  const file = formData.get("fiche") as File | null;
  if (!file) throw new Error("Fichier requis");
  if (!ALLOWED_FICHE_TYPES.includes(file.type)) throw new Error("Format non supporté (PDF uniquement)");
  if (file.size > MAX_FICHE_SIZE) throw new Error("Fichier trop volumineux (max 15 Mo)");

  const fileName = `fiche-${Date.now()}.pdf`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products", productId);
  const filePath = path.join(uploadDir, fileName);
  const publicUrl = `/uploads/products/${productId}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  if (product.ficheTechniqueUrl) {
    const oldPath = path.join(process.cwd(), "public", product.ficheTechniqueUrl);
    try { await unlink(oldPath); } catch (err) { console.error("[products] suppression de l'ancienne fiche technique impossible", err); }
  }

  await prisma.product.update({ where: { id: productId }, data: { ficheTechniqueUrl: publicUrl } });

  return { url: publicUrl };
}

export async function deleteFicheTechnique(productId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const perm = checkPermission(
    session.user.role,
    session.user.permissions,
    "produits:modifier"
  );
  if (!perm.allowed) throw new Error(perm.error!);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product?.ficheTechniqueUrl) throw new Error("Aucune fiche technique");

  const oldPath = path.join(process.cwd(), "public", product.ficheTechniqueUrl);
  try { await unlink(oldPath); } catch (err) { console.error("[products] suppression de la fiche technique impossible", err); }

  await prisma.product.update({ where: { id: productId }, data: { ficheTechniqueUrl: null } });

  return { success: true };
}

export async function deleteProductFiche(productId: string, ficheId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const perm = checkPermission(
    session.user.role,
    session.user.permissions,
    "produits:modifier"
  );
  if (!perm.allowed) throw new Error(perm.error!);

  const fiche = await prisma.ficheTechnique.findUnique({ where: { id: ficheId } });
  if (!fiche) throw new Error("Fiche introuvable");

  const filePath = path.join(process.cwd(), "public", fiche.url);
  try { await unlink(filePath); } catch (err) { console.error("[products] suppression du fichier de la fiche impossible", err); }

  await prisma.ficheTechnique.delete({ where: { id: ficheId } });

  return { success: true };
}
