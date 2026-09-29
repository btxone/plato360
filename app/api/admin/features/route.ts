import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { featureKeys, getFeatureState, setFeatureState } from "@/lib/features";

export const runtime = "nodejs";

const updateSchema = z.object({
  locationId: z.string().uuid().optional(),
  featureKey: z.enum(featureKeys),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin" && actor.role !== "mozo") throw new PermissionDeniedError();
    const locationId = await resolveLocationId(actor, new URL(request.url).searchParams.get("locationId") ?? undefined);
    return NextResponse.json({ locationId, features: await getFeatureState(locationId) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Solo SuperAdmin puede administrar funciones." }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin") throw new PermissionDeniedError();
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Configuración de función inválida." }, { status: 400 });
    const locationId = await resolveLocationId(actor, parsed.data.locationId);
    const feature = await setFeatureState(locationId, parsed.data.featureKey, parsed.data.enabled);
    const db = getDb();
    await db.insert(auditLogs).values({ locationId, actorUserId: null, actorPrincipal: actor.principalLabel, action: "feature.updated", entityType: "feature_flag", metadata: { featureKey: feature.featureKey, enabled: feature.enabled } });
    return NextResponse.json({ locationId, feature });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Solo SuperAdmin puede administrar funciones." }, { status: 403 });
  }
}
