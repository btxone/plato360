import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, locations } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { getCatalogForActor } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const locationSchema = z.object({
  locationId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  tagline: z.string().trim().max(240).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    const locationId = new URL(request.url).searchParams.get("locationId") ?? undefined;
    return NextResponse.json(await getCatalogForActor(actor, locationId));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo cargar la carta." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "La configuración del restaurante es inválida." }, { status: 400 });
    const locationId = await resolveLocationId(actor, parsed.data.locationId);
    const db = getDb();
    const [location] = await db.update(locations).set({
      name: parsed.data.name,
      tagline: parsed.data.tagline ?? null,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      logoUrl: parsed.data.logoUrl?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(locations.id, locationId)).returning();
    await db.insert(auditLogs).values({ locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "catalog.location_updated", entityType: "location", entityId: locationId });
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo actualizar el restaurante." }, { status: 500 });
  }
}
