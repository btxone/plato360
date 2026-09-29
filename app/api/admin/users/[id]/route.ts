import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, minimumPasswordLength } from "@/lib/auth";
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
  z.object({ action: z.literal("reset_password"), temporaryPassword: z.string().min(minimumPasswordLength).max(256) }),
  z.object({
    action: z.literal("update"),
    username: z.string().trim().min(3).max(120).optional(),
    displayName: z.string().trim().min(1).max(160).optional(),
    newPassword: z.string().min(minimumPasswordLength).max(256).optional(),
  }),
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

    if (parsed.data.action === "update") {
      if (parsed.data.username === undefined && parsed.data.displayName === undefined && parsed.data.newPassword === undefined) return NextResponse.json({ error: "No hay datos para actualizar." }, { status: 400 });
      const username = parsed.data.username?.toLowerCase();
      if (username && username !== target.username) {
        const [duplicate] = await db.select({ id: users.id }).from(users).where(and(eq(users.locationId, target.locationId), eq(users.username, username), ne(users.id, target.id))).limit(1);
        if (duplicate) return NextResponse.json({ error: "Ya existe un usuario con ese nombre." }, { status: 409 });
      }
      const passwordChanged = Boolean(parsed.data.newPassword);
      const passwordHash = passwordChanged ? await hashPassword(parsed.data.newPassword!) : undefined;
      const [updated] = await db.update(users).set({
        ...(username ? { username } : {}),
        ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
        ...(passwordHash ? { passwordHash, forcePasswordChange: false, failedLoginAttempts: 0, lockedUntil: null } : {}),
        updatedAt: new Date(),
      }).where(eq(users.id, target.id)).returning();
      if (passwordChanged) await revokeUserSessions(target.id);
      if (passwordChanged) await writeUserAudit(actor, "user.password_changed", target.id, target.locationId);
      await writeUserAudit(actor, "user.updated", target.id, target.locationId, { fields: [username ? "username" : null, parsed.data.displayName !== undefined ? "displayName" : null, passwordChanged ? "password" : null].filter(Boolean) });
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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await context.params;
    const db = getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    assertCanManageRole(actor, target.role);
    assertSameLocation(actor, target.locationId);
    await db.delete(users).where(eq(users.id, target.id));
    await writeUserAudit(actor, "user.deleted", target.id, target.locationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "No tenés permisos para eliminar ese usuario." }, { status: 403 });
  }
}
