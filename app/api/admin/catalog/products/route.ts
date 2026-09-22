import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories, products } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { catalogStatuses, getCatalogForActor, slugify, syncProductMedia, syncProductMenuEntries, type CatalogStatus } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const mediaSchema = z.object({
  imageKey: z.string().trim().max(500).nullable().optional(),
  posterKey: z.string().trim().max(500).nullable().optional(),
  videoKey: z.string().trim().max(500).nullable().optional(),
});

export const productSchema = z.object({
  locationId: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).default(""),
  emoji: z.string().trim().max(16).default("🍽️"),
  accent: z.string().trim().max(16).default("#8b5e45"),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  priceCents: z.number().int().min(0).max(100000000),
  status: z.enum(catalogStatuses).default("draft"),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  publishedAt: z.string().datetime().nullable().optional(),
  retiredAt: z.string().datetime().nullable().optional(),
  media: mediaSchema.optional(),
});

const asDate = (value: string | null | undefined) => value ? new Date(value) : null;

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    return NextResponse.json(await getCatalogForActor(actor, new URL(request.url).searchParams.get("locationId") ?? undefined));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo cargar la carta." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos del plato son inválidos." }, { status: 400 });
    const locationId = await resolveLocationId(actor, parsed.data.locationId);
    const db = getDb();
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, parsed.data.categoryId), eq(categories.locationId, locationId))).limit(1);
    if (!category) return NextResponse.json({ error: "La categoría no existe." }, { status: 400 });
    const publishedAt = asDate(parsed.data.publishedAt) ?? (parsed.data.status === "published" ? new Date() : null);
    const retiredAt = asDate(parsed.data.retiredAt);
    const [product] = await db.insert(products).values({
      locationId,
      categoryId: parsed.data.categoryId,
      slug: slugify(parsed.data.slug || parsed.data.name),
      name: parsed.data.name,
      description: parsed.data.description,
      emoji: parsed.data.emoji,
      accent: parsed.data.accent,
      tags: parsed.data.tags,
      priceCents: parsed.data.priceCents,
      status: parsed.data.status,
      isAvailable: parsed.data.isAvailable,
      publishedAt,
      retiredAt,
    }).returning();
    if (parsed.data.media) await syncProductMedia(locationId, actor, product.id, parsed.data.media);
    await syncProductMenuEntries(locationId, product.id, product.categoryId, product.status as CatalogStatus, parsed.data.sortOrder, publishedAt, retiredAt);
    await db.insert(auditLogs).values({ locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.product_created", entityType: "product", entityId: product.id, metadata: { name: product.name, status: product.status } });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message.includes("public/assets")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear el plato. Revisá que el slug no esté repetido." }, { status: 409 });
  }
}
