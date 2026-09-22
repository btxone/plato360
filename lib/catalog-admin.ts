import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  locations,
  mediaAssets,
  menuEntries,
  productMedia,
  products,
} from "@/db/schema";
import { PermissionDeniedError, resolveLocationId } from "@/lib/authorization";
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

export async function getCatalogForActor(actor: CurrentSession, requestedLocationId?: string) {
  assertCatalogManager(actor);
  const locationId = await resolveLocationId(actor, requestedLocationId);
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
