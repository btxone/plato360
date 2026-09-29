import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, locations } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";

export const runtime = "nodejs";

const maxLogoBytes = 5 * 1024 * 1024;
const supportedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const formData = await request.formData();
    const entry = formData.get("logo");
    if (!entry || typeof entry === "string") return NextResponse.json({ error: "Seleccioná una imagen para el logo." }, { status: 400 });
    const extension = supportedTypes.get(entry.type);
    if (!extension) return NextResponse.json({ error: "El logo debe estar en formato PNG, JPG o WebP." }, { status: 400 });
    if (entry.size === 0 || entry.size > maxLogoBytes) return NextResponse.json({ error: "El logo debe pesar entre 1 byte y 5 MB." }, { status: 400 });

    const requestedLocationId = formData.get("locationId");
    const locationId = await resolveLocationId(actor, typeof requestedLocationId === "string" ? requestedLocationId : undefined);
    const fileName = `${locationId}-${randomUUID()}.${extension}`;
    const relativePath = path.join("assets", "uploads", "logos", fileName);
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(await entry.arrayBuffer()));

    const logoUrl = `/${relativePath.replaceAll(path.sep, "/")}`;
    const db = getDb();
    const [location] = await db.update(locations).set({ logoUrl, updatedAt: new Date() }).where(eq(locations.id, locationId)).returning();
    await db.insert(auditLogs).values({ locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.logo_uploaded", entityType: "location", entityId: locationId, metadata: { logoUrl, contentType: entry.type, size: entry.size } });
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("catalog.logo_upload", error);
    return NextResponse.json({ error: "No se pudo subir el logo." }, { status: 500 });
  }
}
