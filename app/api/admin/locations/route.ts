import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { locations } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin") throw new PermissionDeniedError();
    const db = getDb();
    const rows = await db.select({ id: locations.id, slug: locations.slug, name: locations.name, address: locations.address, logoUrl: locations.logoUrl }).from(locations).orderBy(asc(locations.name));
    return NextResponse.json({ locations: rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudieron cargar los locales." }, { status: 500 });
  }
}
