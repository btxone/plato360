import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, qrCodes } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { createQrCode, getQrToken, QrFeatureDisabledError, InvalidQrError } from "@/lib/qr";

export const runtime = "nodejs";

const createSchema = z.object({
  kind: z.enum(["fixed", "dynamic"]),
  tableLabel: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  locationId: z.string().uuid().optional(),
});

function publicQr(qr: typeof qrCodes.$inferSelect) {
  const appUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const token = getQrToken(qr);
  return {
    id: qr.id,
    locationId: qr.locationId,
    kind: qr.kind,
    status: qr.status,
    tableLabel: qr.tableLabel,
    publicId: qr.publicId,
    expiresAt: qr.expiresAt,
    revokedAt: qr.revokedAt,
    createdByUserId: qr.createdByUserId,
    lastUsedAt: qr.lastUsedAt,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
    entryUrl: `${appUrl}/carta?qr=${encodeURIComponent(token)}`,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin" && actor.role !== "mozo") throw new PermissionDeniedError();
    const requestedLocationId = new URL(request.url).searchParams.get("locationId") ?? undefined;
    const locationId = await resolveLocationId(actor, requestedLocationId);
    const db = getDb();
    const rows = await db.select().from(qrCodes).where(eq(qrCodes.locationId, locationId)).orderBy(asc(qrCodes.tableLabel), asc(qrCodes.createdAt));
    return NextResponse.json({ locationId, qrCodes: rows.map(publicQr) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudieron consultar los códigos QR." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin" && actor.role !== "mozo") throw new PermissionDeniedError();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos del QR inválidos." }, { status: 400 });
    const { qr, token } = await createQrCode(actor, parsed.data);
    const db = getDb();
    await db.insert(auditLogs).values({
      locationId: qr.locationId,
      actorUserId: actor.userId,
      actorPrincipal: actor.principalLabel,
      action: "qr.created",
      entityType: "qr_code",
      entityId: qr.id,
      metadata: { kind: qr.kind, tableLabel: qr.tableLabel, expiresAt: qr.expiresAt?.toISOString() ?? null },
    });
    return NextResponse.json({
      qr: publicQr(qr),
      token,
      entryUrl: publicQr(qr).entryUrl,
      warning: "El enlace queda disponible en el listado de QR para volver a copiarlo cuando lo necesites.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof QrFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof InvalidQrError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear el código QR." }, { status: 500 });
  }
}
