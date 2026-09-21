import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import {
  AuthenticationRequiredError,
  assertCanManageRole,
  assertSameLocation,
  publicUser,
  requireSession,
  revokeUserSessions,
  writeUserAudit,
} from "@/lib/authorization";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reset_password"), temporaryPassword: z.string().min(12).max(256) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await context.params;
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    const db = getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    assertCanManageRole(actor, target.role);
    assertSameLocation(actor, target.locationId);

    if (parsed.data.action === "activate") {
      const [updated] = await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, target.id)).returning();
      await writeUserAudit(actor, "user.activated", target.id, target.locationId);
      return NextResponse.json({ user: publicUser(updated) });
    }
    if (parsed.data.action === "suspend") {
      const [updated] = await db.update(users).set({ status: "suspended", updatedAt: new Date() }).where(eq(users.id, target.id)).returning();
      await revokeUserSessions(target.id);
      await writeUserAudit(actor, "user.suspended", target.id, target.locationId);
      return NextResponse.json({ user: publicUser(updated) });
    }

    const passwordHash = await hashPassword(parsed.data.temporaryPassword);
    const [updated] = await db.update(users).set({ passwordHash, forcePasswordChange: true, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, target.id)).returning();
    await revokeUserSessions(target.id);
    await writeUserAudit(actor, "user.password_reset", target.id, target.locationId);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "No tenés permisos para modificar ese usuario." }, { status: 403 });
  }
}
