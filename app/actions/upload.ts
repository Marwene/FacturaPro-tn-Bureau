"use server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function uploadFile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Non authentifié");

    const file = formData.get("file") as File | null;
    const subDir = (formData.get("subDir") as string) || "general";
    if (!file) throw new Error("Fichier requis");

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Format non supporté");

    const ext = file.type.split("/")[1] ?? "jpg";
    const fileName = `upload-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", subDir);
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), buffer);

    return { url: `/uploads/${subDir}/${fileName}` };
}
