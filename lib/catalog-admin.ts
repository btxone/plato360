import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLogs,
  categories,
  candidateCampaigns,
  candidateInterests,
  candidateMedia,
  locations,
  mediaAssets,
  menuEntries,
  productMedia,
  products,
} from "@/db/schema";
import { PermissionDeniedError, resolveLocationId, resolveLocationIds } from "@/lib/authorization";
import type { CurrentSession } from "@/lib/auth";

export const catalogStatuses = ["draft", "scheduled", "published", "retired"] as const;
export type CatalogStatus = (typeof catalogStatuses)[number];

export function assertCatalogManager(actor: CurrentSession) {
  if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function normalizeStorageKey(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const key = value.trim().replace(/^\/+/, "").replace(/^public\//, "");
  if (!key.startsWith("assets/") || key.includes("..") || key.includes("\\")) {
    throw new Error("El recurso debe estar dentro de public/assets y usar una ruta segura.");
  }
  return key;
}

function mimeTypeFor(key: string) {
  const extension = key.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function getCatalogAtLocation(locationId: string) {
  const db = getDb();
  const [location] = await db.select({
    id: locations.id,
    slug: locations.slug,
    name: locations.name,
    tagline: locations.tagline,
    address: locations.address,
    phone: locations.phone,
    logoUrl: locations.logoUrl,
    timezone: locations.timezone,
  }).from(locations).where(eq(locations.id, locationId)).limit(1);
  if (!location) throw new PermissionDeniedError();

  const categoryRows = await db.select().from(categories).where(eq(categories.locationId, locationId)).orderBy(asc(categories.sortOrder), asc(categories.name));
  const productRows = await db.select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.locationId, locationId))
    .orderBy(asc(products.createdAt));
  const productIds = productRows.map(({ product }) => product.id);
  const menuRows = productIds.length === 0 ? [] : await db.select({
    productId: menuEntries.productId,
    surface: menuEntries.surface,
    sortOrder: menuEntries.sortOrder,
    status: menuEntries.status,
    publishedAt: menuEntries.publishedAt,
    retiredAt: menuEntries.retiredAt,
  }).from(menuEntries).where(and(eq(menuEntries.locationId, locationId), inArray(menuEntries.productId, productIds)));
  const mediaRows = productIds.length === 0 ? [] : await db.select({
    productId: productMedia.productId,
    storageKey: mediaAssets.storageKey,
    kind: mediaAssets.kind,
    sortOrder: productMedia.sortOrder,
  }).from(productMedia)
    .innerJoin(mediaAssets, eq(productMedia.mediaId, mediaAssets.id))
    .where(inArray(productMedia.productId, productIds))
    .orderBy(asc(productMedia.sortOrder));

  const menuByProduct = new Map<string, typeof menuRows>();
  for (const row of menuRows) menuByProduct.set(row.productId, [...(menuByProduct.get(row.productId) ?? []), row]);
  const mediaByProduct = new Map<string, typeof mediaRows>();
  for (const row of mediaRows) mediaByProduct.set(row.productId, [...(mediaByProduct.get(row.productId) ?? []), row]);

  return {
    location,
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      productCount: productRows.filter(({ product }) => product.categoryId === category.id).length,
    })),
    products: productRows.map(({ product, category }) => {
      const visualEntry = menuByProduct.get(product.id)?.find((entry) => entry.surface === "visual");
      const images = mediaByProduct.get(product.id)?.filter((media) => media.kind === "image") ?? [];
      const video = mediaByProduct.get(product.id)?.find((media) => media.kind === "video");
      return {
        id: product.id,
        categoryId: product.categoryId,
        categoryName: category.name,
        slug: product.slug,
        name: product.name,
        description: product.description,
        emoji: product.emoji,
        accent: product.accent,
        tags: product.tags,
        priceCents: product.priceCents,
        status: product.status,
        isAvailable: product.isAvailable,
        sortOrder: visualEntry?.sortOrder ?? 0,
        publishedAt: product.publishedAt ?? visualEntry?.publishedAt ?? null,
        retiredAt: product.retiredAt ?? visualEntry?.retiredAt ?? null,
        media: {
          imageKey: images[0]?.storageKey ?? null,
          posterKey: images[1]?.storageKey ?? null,
          videoKey: video?.storageKey ?? null,
        },
      };
    }),
  };
}

export async function getCatalogForActor(actor: CurrentSession, requestedLocationId?: string) {
  assertCatalogManager(actor);
  const locationId = await resolveLocationId(actor, requestedLocationId);
  await promoteDueCandidates([locationId], actor);
  return getCatalogAtLocation(locationId);
}

export async function getCatalogsForActor(actor: CurrentSession) {
  assertCatalogManager(actor);
  const locationIds = await resolveLocationIds(actor);
  await promoteDueCandidates(locationIds, actor);
  return Promise.all(locationIds.map((locationId) => getCatalogAtLocation(locationId)));
}

export async function ensureMediaAsset(locationId: string, actor: CurrentSession, storageKey: string, kind: "image" | "video") {
  const db = getDb();
  const [existing] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.locationId, locationId), eq(mediaAssets.storageKey, storageKey))).limit(1);
  if (existing) return existing.id;
  const diskPath = resolve(process.cwd(), "public", storageKey);
  if (!existsSync(diskPath)) throw new Error(`No existe el recurso ${storageKey} en public/assets.`);
  const [created] = await db.insert(mediaAssets).values({
    locationId,
    kind,
    storageState: "final",
    storageKey,
    mimeType: mimeTypeFor(storageKey),
    sizeBytes: Math.max(statSync(diskPath).size, 1),
    uploadedByUserId: actor.userId,
  }).returning({ id: mediaAssets.id });
  return created.id;
}

export async function syncProductMedia(locationId: string, actor: CurrentSession, productId: string, media: { imageKey?: string | null; posterKey?: string | null; videoKey?: string | null }) {
  const db = getDb();
  const definitions = [
    { key: normalizeStorageKey(media.videoKey), kind: "video" as const, sortOrder: 0, isPrimary: true },
    { key: normalizeStorageKey(media.imageKey), kind: "image" as const, sortOrder: 1, isPrimary: false },
    { key: normalizeStorageKey(media.posterKey), kind: "image" as const, sortOrder: 2, isPrimary: false },
  ];
  const seen = new Set<string>();
  await db.delete(productMedia).where(eq(productMedia.productId, productId));
  for (const definition of definitions) {
    if (!definition.key || seen.has(definition.key)) continue;
    seen.add(definition.key);
    const mediaId = await ensureMediaAsset(locationId, actor, definition.key, definition.kind);
    await db.insert(productMedia).values({ productId, mediaId, sortOrder: definition.sortOrder, isPrimary: definition.isPrimary });
  }
}

export async function syncCandidateMedia(locationId: string, actor: CurrentSession, candidateId: string, media: { imageKey?: string | null; posterKey?: string | null; videoKey?: string | null }) {
  const db = getDb();
  const definitions = [
    { key: normalizeStorageKey(media.videoKey), kind: "video" as const, sortOrder: 0, isPrimary: true },
    { key: normalizeStorageKey(media.imageKey), kind: "image" as const, sortOrder: 1, isPrimary: false },
    { key: normalizeStorageKey(media.posterKey), kind: "image" as const, sortOrder: 2, isPrimary: false },
  ];
  const seen = new Set<string>();
  await db.delete(candidateMedia).where(eq(candidateMedia.candidateId, candidateId));
  for (const definition of definitions) {
    if (!definition.key || seen.has(definition.key)) continue;
    seen.add(definition.key);
    const mediaId = await ensureMediaAsset(locationId, actor, definition.key, definition.kind);
    await db.insert(candidateMedia).values({ candidateId, mediaId, sortOrder: definition.sortOrder, isPrimary: definition.isPrimary });
  }
}

export async function promoteCandidateToProduct(candidateId: string, actor?: CurrentSession) {
  const db = getDb();
  const promotion = await db.transaction(async (tx) => {
    const [candidate] = await tx.select().from(candidateCampaigns).where(eq(candidateCampaigns.id, candidateId)).for("update").limit(1);
    if (!candidate || candidate.promotedProductId) return null;
    let categoryId = candidate.categoryId;
    if (categoryId) {
      const [category] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.locationId, candidate.locationId))).limit(1);
      if (!category) categoryId = null;
    }
    if (!categoryId) {
      const [fallbackCategory] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.locationId, candidate.locationId), eq(categories.isActive, true))).orderBy(asc(categories.sortOrder), asc(categories.name)).limit(1);
      categoryId = fallbackCategory?.id ?? null;
    }
    if (!categoryId) throw new Error("No hay una categoría activa para convertir el producto de Tu decides en plato.");

    const now = new Date();
    const publishedAt = candidate.publishedAt ?? now;
    const mediaRows = await tx.select({ mediaId: candidateMedia.mediaId, sortOrder: candidateMedia.sortOrder, isPrimary: candidateMedia.isPrimary }).from(candidateMedia).where(eq(candidateMedia.candidateId, candidate.id));
    const baseSlug = slugify(candidate.slug || candidate.name) || `plato-${candidate.id.slice(0, 8)}`;
    const [retiredSource] = await tx.select().from(products).where(and(
      eq(products.locationId, candidate.locationId),
      eq(products.slug, baseSlug),
      eq(products.status, "retired"),
    )).limit(1);
    const [sourceMenuEntry] = retiredSource
      ? await tx.select({ sortOrder: menuEntries.sortOrder }).from(menuEntries).where(and(eq(menuEntries.productId, retiredSource.id), eq(menuEntries.surface, "visual"))).limit(1)
      : [];
    const sortOrder = sourceMenuEntry?.sortOrder ?? 9999;

    let product;
    let restoredExistingProduct = false;
    if (retiredSource) {
      const [restoredProduct] = await tx.update(products).set({
        categoryId,
        name: candidate.name,
        description: candidate.description,
        emoji: candidate.emoji,
        accent: candidate.accent,
        priceCents: candidate.finalPriceCents ?? 0,
        status: "published",
        isAvailable: true,
        publishedAt,
        retiredAt: null,
        updatedAt: now,
      }).where(eq(products.id, retiredSource.id)).returning();
      product = restoredProduct;
      restoredExistingProduct = true;
      await tx.delete(productMedia).where(eq(productMedia.productId, product.id));
    } else {
      let slug = baseSlug;
      let suffix = 2;
      while (await tx.select({ id: products.id }).from(products).where(and(eq(products.locationId, candidate.locationId), eq(products.slug, slug))).limit(1).then((rows) => rows.length > 0)) slug = `${baseSlug}-${suffix++}`.slice(0, 120);
      const [createdProduct] = await tx.insert(products).values({
        locationId: candidate.locationId,
        categoryId,
        slug,
        name: candidate.name,
        description: candidate.description,
        emoji: candidate.emoji,
        accent: candidate.accent,
        tags: [],
        priceCents: candidate.finalPriceCents ?? 0,
        status: "published",
        isAvailable: true,
        publishedAt,
      }).returning();
      product = createdProduct;
    }
    if (mediaRows.length > 0) await tx.insert(productMedia).values(mediaRows.map((media) => ({ productId: product.id, mediaId: media.mediaId, sortOrder: media.sortOrder, isPrimary: media.isPrimary })));
    await tx.insert(menuEntries).values([
      { locationId: candidate.locationId, productId: product.id, categoryId, surface: "visual", status: "published", sortOrder, publishedAt, retiredAt: null },
      { locationId: candidate.locationId, productId: product.id, categoryId, surface: "traditional", status: "published", sortOrder, publishedAt, retiredAt: null },
    ]).onConflictDoUpdate({
      target: [menuEntries.locationId, menuEntries.productId, menuEntries.surface],
      set: { categoryId, status: "published", sortOrder, publishedAt, retiredAt: null, updatedAt: now },
    });
    await tx.update(candidateCampaigns).set({ categoryId, promotedProductId: product.id, promotedAt: now, status: "published", updatedAt: now }).where(eq(candidateCampaigns.id, candidate.id));
    await tx.insert(auditLogs).values({ locationId: candidate.locationId, actorUserId: actor?.userId ?? null, actorPrincipal: actor?.principalLabel ?? "system", action: "candidate.promoted_to_product", entityType: "candidate_campaign", entityId: candidate.id, metadata: { productId: product.id, productName: product.name, restoredExistingProduct } });
    return { product, candidateName: candidate.name, locationId: candidate.locationId };
  });
  if (!promotion) return null;

  const { sendCandidatePublishedEmail } = await import("@/lib/email");
  const [location] = await db.select({ name: locations.name }).from(locations).where(eq(locations.id, promotion.locationId)).limit(1);
  const interests = await db.select({ email: candidateInterests.email }).from(candidateInterests).where(and(
    eq(candidateInterests.candidateId, candidateId),
    eq(candidateInterests.acceptedNotification, true),
  ));
  if (interests.length > 0) {
    const results = await Promise.allSettled(interests.map((interest) => sendCandidatePublishedEmail({
      to: interest.email,
      candidateName: promotion.candidateName,
      locationName: location?.name ?? "nuestro local",
    })));
    const sent = results.filter((result) => result.status === "fulfilled" && result.value.sent).length;
    const failed = results.filter((result) => result.status === "rejected").length;
    await db.insert(auditLogs).values({
      locationId: promotion.locationId,
      actorUserId: actor?.userId ?? null,
      actorPrincipal: actor?.principalLabel ?? "system",
      action: "candidate.publication_notifications",
      entityType: "candidate_campaign",
      entityId: candidateId,
      metadata: { productId: promotion.product.id, requested: interests.length, sent, failed },
    });
    for (const result of results) {
      if (result.status === "rejected") console.error("candidate.publication_email_failed", result.reason);
    }
  }
  return promotion.product;
}

export async function promoteDueCandidates(locationIds?: string[], actor?: CurrentSession) {
  const db = getDb();
  const conditions = [eq(candidateCampaigns.status, "scheduled" as const), lte(candidateCampaigns.publishedAt, new Date()), isNull(candidateCampaigns.promotedProductId)];
  if (locationIds?.length) conditions.push(inArray(candidateCampaigns.locationId, locationIds));
  const due = await db.select({ id: candidateCampaigns.id }).from(candidateCampaigns).where(and(...conditions));
  for (const candidate of due) {
    try {
      await promoteCandidateToProduct(candidate.id, actor);
    } catch (error) {
      console.error("candidate.promote_due", candidate.id, error);
    }
  }
}

export async function syncProductMenuEntries(locationId: string, productId: string, categoryId: string, status: CatalogStatus, sortOrder: number, publishedAt: Date | null, retiredAt: Date | null) {
  const db = getDb();
  await db.insert(menuEntries).values([
    { locationId, productId, categoryId, surface: "visual", status, sortOrder, publishedAt, retiredAt },
    { locationId, productId, categoryId, surface: "traditional", status, sortOrder, publishedAt, retiredAt },
  ]).onConflictDoUpdate({
    target: [menuEntries.locationId, menuEntries.productId, menuEntries.surface],
    set: { categoryId, status, sortOrder, publishedAt, retiredAt, updatedAt: new Date() },
  });
}
