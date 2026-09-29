import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, candidateCampaigns, mediaAssets } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";

export const runtime = "nodejs";

const supportedTypes = new Map([
  ["image/png", { extension: "png", kind: "image" as const }],
  ["image/jpeg", { extension: "jpg", kind: "image" as const }],
  ["image/webp", { extension: "webp", kind: "image" as const }],
  ["video/mp4", { extension: "mp4", kind: "video" as const }],
  ["video/webm", { extension: "webm", kind: "video" as const }],
  ["video/quicktime", { extension: "mov", kind: "video" as const }],
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const db = getDb();
    const [candidate] = await db.select({ id: candidateCampaigns.id, locationId: candidateCampaigns.locationId }).from(candidateCampaigns).where(eq(candidateCampaigns.id, id)).limit(1);
    if (!candidate || (actor.role !== "superadmin" && actor.locationId !== candidate.locationId)) throw new PermissionDeniedError();

    const formData = await request.formData();
    const entry = formData.get("file");
    const requestedKind = formData.get("kind");
    if (!entry || typeof entry === "string") return NextResponse.json({ error: "Seleccioná una imagen o un video." }, { status: 400 });
    if (requestedKind !== "image" && requestedKind !== "video") return NextResponse.json({ error: "El tipo de medio no es válido." }, { status: 400 });
    const definition = supportedTypes.get(entry.type);
    if (!definition || definition.kind !== requestedKind) return NextResponse.json({ error: requestedKind === "video" ? "El archivo debe ser un video MP4, WebM o MOV." : "El archivo debe ser una imagen PNG, JPG o WebP." }, { status: 400 });
    const maxBytes = requestedKind === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (entry.size === 0 || entry.size > maxBytes) return NextResponse.json({ error: requestedKind === "video" ? "El video debe pesar entre 1 byte y 100 MB." : "La imagen debe pesar entre 1 byte y 10 MB." }, { status: 400 });

    const fileName = `${randomUUID()}.${definition.extension}`;
    const relativePath = path.join("assets", "uploads", "candidates", candidate.id, fileName);
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(await entry.arrayBuffer()));

    const storageKey = relativePath.replaceAll(path.sep, "/");
    const [media] = await db.insert(mediaAssets).values({
      locationId: candidate.locationId,
      kind: definition.kind,
      storageState: "final",
      storageKey,
      mimeType: entry.type,
      sizeBytes: entry.size,
      uploadedByUserId: actor.userId,
    }).returning();
    await db.insert(auditLogs).values({ locationId: candidate.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "candidate.media_uploaded", entityType: "candidate_campaign", entityId: candidate.id, metadata: { mediaId: media.id, storageKey, kind: definition.kind, mimeType: entry.type, sizeBytes: entry.size } });
    return NextResponse.json({ storageKey, mediaId: media.id });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("candidate.media_upload", error);
    return NextResponse.json({ error: "No se pudo subir el medio." }, { status: 500 });
  }
}
