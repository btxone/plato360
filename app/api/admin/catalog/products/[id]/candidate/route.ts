import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, candidateCampaigns, candidateMedia, menuEntries, productMedia, products } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";
import { slugify } from "@/lib/catalog-admin";

export const runtime = "nodejs";

/**
 * Moves an existing catalog product into Tu decides without changing its
 * content or media. The transaction also retires the public menu entries so
 * the dish cannot be ordered while the audience votes on it.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const { id } = await params;
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, id)).for("update").limit(1);
      if (!product || (actor.role !== "superadmin" && actor.locationId !== product.locationId)) throw new PermissionDeniedError();
      const baseSlug = slugify(product.slug || product.name) || `plato-${product.id.slice(0, 8)}`;
      const [existingCandidate] = await tx.select({ id: candidateCampaigns.id }).from(candidateCampaigns).where(and(
        eq(candidateCampaigns.locationId, product.locationId),
        eq(candidateCampaigns.slug, baseSlug),
        isNull(candidateCampaigns.promotedProductId),
      )).limit(1);
      if (existingCandidate) throw new Error("El plato ya está en Tu decides.");
      let candidateSlug = baseSlug;
      let suffix = 2;
      while (await tx.select({ id: candidateCampaigns.id }).from(candidateCampaigns).where(and(eq(candidateCampaigns.locationId, product.locationId), eq(candidateCampaigns.slug, candidateSlug))).limit(1).then((rows) => rows.length > 0)) {
        candidateSlug = `${baseSlug}-${suffix++}`.slice(0, 120);
      }

      const now = new Date();
      const [candidate] = await tx.insert(candidateCampaigns).values({
        locationId: product.locationId,
        categoryId: product.categoryId,
        slug: candidateSlug,
        name: product.name,
        description: product.description,
        emoji: product.emoji,
        accent: product.accent,
        status: "published",
        finalPriceCents: product.priceCents,
        publishedAt: now,
      }).returning();

      const mediaRows = await tx.select({
        mediaId: productMedia.mediaId,
        sortOrder: productMedia.sortOrder,
        isPrimary: productMedia.isPrimary,
      }).from(productMedia).where(eq(productMedia.productId, product.id));
      if (mediaRows.length > 0) {
        await tx.insert(candidateMedia).values(mediaRows.map((media) => ({
          candidateId: candidate.id,
          mediaId: media.mediaId,
          sortOrder: media.sortOrder,
          isPrimary: media.isPrimary,
        })));
      }

      await tx.update(products).set({
        status: "retired",
        isAvailable: false,
        retiredAt: now,
        updatedAt: now,
      }).where(eq(products.id, product.id));
      await tx.update(menuEntries).set({
        status: "retired",
        retiredAt: now,
        updatedAt: now,
      }).where(and(eq(menuEntries.productId, product.id), eq(menuEntries.locationId, product.locationId)));
      await tx.insert(auditLogs).values({
        locationId: product.locationId,
        actorUserId: actor.userId,
        actorPrincipal: actor.principalLabel,
        action: "catalog.product_moved_to_candidate",
        entityType: "product",
        entityId: product.id,
        metadata: { candidateId: candidate.id, candidateName: candidate.name },
      });

      return { candidate, productId: product.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message.includes("ya está en Tu decides")) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "No se pudo pasar el plato a Tu decides." }, { status: 409 });
  }
}
