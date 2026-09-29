import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidateCampaigns } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";
import { promoteCandidateToProduct } from "@/lib/catalog-admin";

export const runtime = "nodejs";

/** Explicit owner decision: return a public Tu decides product to the carta. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const db = getDb();
    const [candidate] = await db.select({ locationId: candidateCampaigns.locationId, status: candidateCampaigns.status, promotedProductId: candidateCampaigns.promotedProductId })
      .from(candidateCampaigns)
      .where(eq(candidateCampaigns.id, id))
      .limit(1);
    if (!candidate || (actor.role !== "superadmin" && actor.locationId !== candidate.locationId)) throw new PermissionDeniedError();
    if (candidate.promotedProductId) return NextResponse.json({ error: "Este producto ya volvió a la carta." }, { status: 409 });
    if (candidate.status !== "published") return NextResponse.json({ error: "El producto debe estar público en Tu decides antes de volver a la carta." }, { status: 400 });

    const product = await promoteCandidateToProduct(id, actor);
    if (!product) return NextResponse.json({ error: "No se pudo volver a publicar el producto." }, { status: 409 });
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo devolver el producto a la carta." }, { status: 409 });
  }
}
