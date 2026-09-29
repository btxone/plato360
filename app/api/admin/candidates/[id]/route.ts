import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, candidateCampaigns, categories } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession } from "@/lib/authorization";
import { catalogStatuses, promoteCandidateToProduct, slugify, syncCandidateMedia } from "@/lib/catalog-admin";

export const runtime = "nodejs";

const mediaSchema = z.object({
  imageKey: z.string().trim().max(500).nullable().optional(),
  posterKey: z.string().trim().max(500).nullable().optional(),
  videoKey: z.string().trim().max(500).nullable().optional(),
});

const updateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  emoji: z.string().trim().max(16).optional(),
  accent: z.string().trim().max(16).optional(),
  finalPriceCents: z.number().int().min(0).max(100000000).nullable().optional(),
  status: z.enum(catalogStatuses).optional(),
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
    if (!parsed.success) return NextResponse.json({ error: "Los datos de Tu decides son inválidos." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(candidateCampaigns).where(eq(candidateCampaigns.id, id)).limit(1);
    if (!current || (actor.role !== "superadmin" && actor.locationId !== current.locationId)) throw new PermissionDeniedError();

    const categoryId = parsed.data.categoryId === undefined ? current.categoryId : parsed.data.categoryId;
    if (categoryId) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.locationId, current.locationId))).limit(1);
      if (!category) return NextResponse.json({ error: "La categoría no existe en este local." }, { status: 400 });
    }
    const status = parsed.data.status ?? current.status;
    const publishedAt = parsed.data.publishedAt !== undefined
      ? asDate(parsed.data.publishedAt)
      : status === "published"
        ? new Date()
        : status === "draft"
          ? null
          : current.publishedAt;
    const retiredAt = parsed.data.retiredAt !== undefined
      ? asDate(parsed.data.retiredAt)
      : status === "retired"
        ? (current.retiredAt ?? new Date())
        : null;
    if (status === "scheduled" && !publishedAt) return NextResponse.json({ error: "Elegí la fecha y hora de publicación." }, { status: 400 });
    const [candidate] = await db.update(candidateCampaigns).set({
      categoryId,
      name: parsed.data.name ?? current.name,
      slug: slugify(parsed.data.slug || parsed.data.name || current.name),
      description: parsed.data.description ?? current.description,
      emoji: parsed.data.emoji ?? current.emoji,
      accent: parsed.data.accent ?? current.accent,
      finalPriceCents: parsed.data.finalPriceCents === undefined ? current.finalPriceCents : parsed.data.finalPriceCents,
      status,
      publishedAt,
      retiredAt,
      updatedAt: new Date(),
    }).where(eq(candidateCampaigns.id, id)).returning();
    if (parsed.data.media) await syncCandidateMedia(current.locationId, actor, candidate.id, parsed.data.media);
    // A published candidate is intentionally allowed to remain in Tu decides
    // while the owner evaluates votes. Promotion now happens on the explicit
    // owner action, while draft -> published keeps the existing behavior.
    if ((status === "published" && current.status !== "published") || (status === "scheduled" && publishedAt && publishedAt <= new Date())) await promoteCandidateToProduct(candidate.id, actor);
    await db.insert(auditLogs).values({ locationId: current.locationId, actorUserId: actor.userId, actorPrincipal: actor.principalLabel, action: "candidate.updated", entityType: "candidate_campaign", entityId: id, metadata: parsed.data });
    return NextResponse.json({ candidate });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message.includes("public/assets")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el producto de Tu decides. Revisá que el slug no esté repetido." }, { status: 409 });
  }
}
