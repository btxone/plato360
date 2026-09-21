import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { isAdminRequest } from "@/lib/admin-auth";

const restaurantId = "casa-brasa";
const maxFileBytes = 12 * 1024 * 1024;

function unauthorized() {
  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
}

const safeName = (name: string) => name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]+/g, "-")
  .replace(/^-|-$/g, "") || "imagen";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  if (!env.BUCKET) return NextResponse.json({ error: "El almacenamiento de imágenes todavía no está disponible" }, { status: 503 });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const targetId = typeof formData.get("targetId") === "string" ? String(formData.get("targetId")) : "new-dish";
    if (!files.length) return NextResponse.json({ error: "Seleccioná al menos una imagen" }, { status: 400 });

    const uploaded = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Solo se pueden subir imágenes" }, { status: 415 });
      if (file.size > maxFileBytes) return NextResponse.json({ error: "Cada imagen debe pesar menos de 12 MB" }, { status: 413 });
      const key = `uploads/${restaurantId}/video-references/${safeName(targetId)}/${crypto.randomUUID()}-${safeName(file.name)}`;
      await env.BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { restaurantId, targetId, originalName: file.name },
      });
      uploaded.push({ key, url: `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`, name: file.name, type: file.type, size: file.size });
    }

    return NextResponse.json({ files: uploaded }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/uploads] failed to upload images", error);
    return NextResponse.json({ error: "No pudimos guardar las imágenes" }, { status: 503 });
  }
}
