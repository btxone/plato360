import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories, products } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";
import { catalogStatuses, slugify, syncProductMedia, syncProductMenuEntries, type CatalogStatus } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const mediaSchema = z.object({
  imageKey: z.string().trim().max(500).nullable().optional(),
  posterKey: z.string().trim().max(500).nullable().optional(),
  videoKey: z.string().trim().max(500).nullable().optional(),
});

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  emoji: z.string().trim().max(16).optional(),
  accent: z.string().trim().max(16).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  priceCents: z.number().int().min(0).max(100000000).optional(),
  status: z.enum(catalogStatuses).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  retiredAt: z.string().datetime().nullable().optional(),
  media: mediaSchema.optional(),
});

const asDate = (value: string | null | undefined) => value ? new Date(value) : null;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos del plato son inválidos." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!current || (actor.role !== "superadmin" && actor.locationId !== current.locationId)) throw new PermissionDeniedError();
    const categoryId = parsed.data.categoryId ?? current.categoryId;
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.locationId, current.locationId))).limit(1);
    if (!category) return NextResponse.json({ error: "La categoría no existe." }, { status: 400 });
    const status = parsed.data.status ?? current.status;
    const publishedAt = parsed.data.publishedAt === undefined ? (status === "published" && !current.publishedAt ? new Date() : current.publishedAt) : asDate(parsed.data.publishedAt);
    const retiredAt = parsed.data.retiredAt === undefined ? current.retiredAt : asDate(parsed.data.retiredAt);
    const sortOrder = parsed.data.sortOrder ?? 0;
    const [product] = await db.update(products).set({
      categoryId,
      name: parsed.data.name ?? current.name,
      slug: slugify(parsed.data.slug || parsed.data.name || current.name),
      description: parsed.data.description ?? current.description,
      emoji: parsed.data.emoji ?? current.emoji,
      accent: parsed.data.accent ?? current.accent,
      tags: parsed.data.tags ?? current.tags,
      priceCents: parsed.data.priceCents ?? current.priceCents,
      status,
      isAvailable: parsed.data.isAvailable ?? current.isAvailable,
      publishedAt,
      retiredAt,
      updatedAt: new Date(),
    }).where(eq(products.id, id)).returning();
    if (parsed.data.media) await syncProductMedia(current.locationId, actor, product.id, parsed.data.media);
    await syncProductMenuEntries(current.locationId, product.id, categoryId, status as CatalogStatus, sortOrder, publishedAt, retiredAt);
    await db.insert(auditLogs).values({ locationId: current.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.product_updated", entityType: "product", entityId: id, metadata: parsed.data });
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message.includes("public/assets")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el plato. Revisá que el slug no esté repetido." }, { status: 409 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const db = getDb();
    const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!current || (actor.role !== "superadmin" && actor.locationId !== current.locationId)) throw new PermissionDeniedError();
    const retiredAt = new Date();
    const [product] = await db.update(products).set({ status: "retired", isAvailable: false, retiredAt, updatedAt: retiredAt }).where(eq(products.id, id)).returning();
    await syncProductMenuEntries(current.locationId, id, current.categoryId, "retired", 0, current.publishedAt, retiredAt);
    await db.insert(auditLogs).values({ locationId: current.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.product_retired", entityType: "product", entityId: id });
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo retirar el plato." }, { status: 500 });
  }
}
