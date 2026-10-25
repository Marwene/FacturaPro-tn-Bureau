"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024;

export async function uploadCompanyLogo(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Entreprise introuvable");

  const file = formData.get("logo") as File | null;
  if (!file) throw new Error("Fichier requis");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Format non supporté");
  if (file.size > MAX_SIZE) throw new Error("Fichier trop volumineux (max 2 Mo)");

  const ext = file.type.split("/")[1] ?? "jpg";
  const fileName = `logo-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "companies", companyId);
  const filePath = path.join(uploadDir, fileName);
  const publicUrl = `/uploads/companies/${companyId}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  if (company.logo) {
    const oldPath = path.join(process.cwd(), "public", company.logo);
    try { await unlink(oldPath); } catch (err) { console.error("[companies] suppression de l'ancien logo impossible", err); }
  }

  await prisma.company.update({ where: { id: companyId }, data: { logo: publicUrl } });

  return { url: publicUrl };
}

export async function deleteCompanyLogo(companyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.logo) throw new Error("Aucun logo");

  const oldPath = path.join(process.cwd(), "public", company.logo);
  try { await unlink(oldPath); } catch (err) { console.error("[companies] suppression du logo impossible", err); }

  await prisma.company.update({ where: { id: companyId }, data: { logo: null } });

  return { success: true };
}
