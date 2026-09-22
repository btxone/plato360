import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";
import { slugify } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().max(80).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos de la categoría son inválidos." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!current || (actor.role !== "superadmin" && actor.locationId !== current.locationId)) throw new PermissionDeniedError();
    const [category] = await db.update(categories).set({
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
      ...(parsed.data.slug === undefined && parsed.data.name === undefined ? {} : { slug: slugify(parsed.data.slug || parsed.data.name || current.name) }),
      ...(parsed.data.sortOrder === undefined ? {} : { sortOrder: parsed.data.sortOrder }),
      ...(parsed.data.isActive === undefined ? {} : { isActive: parsed.data.isActive }),
      updatedAt: new Date(),
    }).where(eq(categories.id, id)).returning();
    await db.insert(auditLogs).values({ locationId: current.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.category_updated", entityType: "category", entityId: id, metadata: parsed.data });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo actualizar la categoría. Revisá que el slug no esté repetido." }, { status: 409 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const db = getDb();
    const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!current || (actor.role !== "superadmin" && actor.locationId !== current.locationId)) throw new PermissionDeniedError();
    await db.update(categories).set({ isActive: false, updatedAt: new Date() }).where(and(eq(categories.id, id), eq(categories.locationId, current.locationId)));
    await db.insert(auditLogs).values({ locationId: current.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.category_deactivated", entityType: "category", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo desactivar la categoría." }, { status: 500 });
  }
}
