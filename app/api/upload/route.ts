import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { UPLOAD_LIMITS, validateUpload } from "@/lib/upload-guard";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// justifié : aucune PermissionKey « upload » n'existe (endpoint sans
// consommateur UI actuel — grep `api/upload` = 0 hit) ; les garde-fous sont
// délégués à validateUpload (type/MIME/taille) + session obligatoire via wrapper.
export const POST = apiRoute.post({ authOnly: true }, async (request) => {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(errorResponse("Fichier requis"), { status: 400 });
  }

  const validation = await validateUpload(file, {
    category: "image",
    maxBytes: UPLOAD_LIMITS.logo,
  });
  if (!validation.ok) {
    return NextResponse.json(errorResponse(validation.message), { status: 400 });
  }

  // Extension déduite du MIME détecté, jamais du nom fourni par le client.
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${validation.ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), validation.bytes);

  const url = `/uploads/logos/${filename}`;
  return NextResponse.json({ url });
});
