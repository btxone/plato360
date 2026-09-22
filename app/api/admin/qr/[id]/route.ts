import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, qrCodes } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, assertSameLocation, requireSession } from "@/lib/authorization";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin" && actor.role !== "mozo") throw new PermissionDeniedError();
    const { id } = await context.params;
    const db = getDb();
    const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
    if (!qr) return NextResponse.json({ error: "Código QR no encontrado." }, { status: 404 });
    assertSameLocation(actor, qr.locationId);
    if (qr.status === "revoked") return NextResponse.json({ qr });
    const [revoked] = await db.update(qrCodes).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(qrCodes.id, id), eq(qrCodes.status, "active"))).returning();
    await db.insert(auditLogs).values({
      locationId: qr.locationId,
      actorUserId: actor.userId,
      actorPrincipal: actor.principalLabel,
      action: "qr.revoked",
      entityType: "qr_code",
      entityId: qr.id,
      metadata: { kind: qr.kind, tableLabel: qr.tableLabel },
    });
    return NextResponse.json({ qr: revoked });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo revocar el código QR." }, { status: 500 });
  }
}
