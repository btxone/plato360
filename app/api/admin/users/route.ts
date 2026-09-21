import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import {
  AuthenticationRequiredError,
  assertCanManageRole,
  publicUser,
  requireSession,
  resolveLocationId,
  writeUserAudit,
} from "@/lib/authorization";

export const runtime = "nodejs";

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(120),
  displayName: z.string().trim().min(1).max(160),
  role: z.enum(["admin", "mozo"]),
  temporaryPassword: z.string().min(12).max(256),
  locationId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") return NextResponse.json({ error: "No tenés permisos para consultar usuarios." }, { status: 403 });
    const db = getDb();
    const rows = actor.role === "superadmin"
      ? await db.select().from(users)
      : await db.select().from(users).where(eq(users.locationId, actor.locationId!));
    return NextResponse.json({ users: rows.map(publicUser) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "No se pudo consultar los usuarios." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSession();
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos de usuario inválidos." }, { status: 400 });
    assertCanManageRole(actor, parsed.data.role);
    const db = getDb();
    const locationId = await resolveLocationId(actor, parsed.data.locationId);
    const username = parsed.data.username.toLowerCase();
    const [duplicate] = await db.select({ id: users.id }).from(users).where(and(eq(users.locationId, locationId), eq(users.username, username))).limit(1);
    if (duplicate) return NextResponse.json({ error: "Ya existe un usuario con ese nombre." }, { status: 409 });
    const passwordHash = await hashPassword(parsed.data.temporaryPassword);
    const [created] = await db.insert(users).values({ locationId, username, displayName: parsed.data.displayName, role: parsed.data.role, passwordHash, forcePasswordChange: true }).returning();
    await writeUserAudit(actor, "user.created", created.id, locationId, { role: created.role });
    return NextResponse.json({ user: publicUser(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "No tenés permisos para crear ese usuario." }, { status: 403 });
  }
}
