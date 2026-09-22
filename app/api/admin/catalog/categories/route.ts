import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { getCatalogForActor, slugify } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const categorySchema = z.object({
  locationId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    const catalog = await getCatalogForActor(actor, new URL(request.url).searchParams.get("locationId") ?? undefined);
    return NextResponse.json({ locationId: catalog.location.id, categories: catalog.categories });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudieron cargar las categorías." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const parsed = categorySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos de la categoría son inválidos." }, { status: 400 });
    const locationId = await resolveLocationId(actor, parsed.data.locationId);
    const db = getDb();
    const [category] = await db.insert(categories).values({
      locationId,
      name: parsed.data.name,
      slug: slugify(parsed.data.slug || parsed.data.name),
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    }).returning();
    await db.insert(auditLogs).values({ locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.category_created", entityType: "category", entityId: category.id, metadata: { name: category.name } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo crear la categoría. Revisá que el slug no esté repetido." }, { status: 409 });
  }
}
