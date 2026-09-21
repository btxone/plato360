import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../db/index";
import {
  candidateCampaigns,
  candidateMedia,
  categories,
  ingredients,
  locations,
  mediaAssets,
  menuEntries,
  productIngredients,
  productMedia,
  products,
} from "../db/schema";
import { candidates } from "../data/candidates";
import { dishes } from "../data/dishes";
import { restaurant } from "../data/restaurant";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const now = new Date();

const slugify = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const cents = (value: number) => Math.round(value * 100);

const mimeTypeFor = (assetPath: string) => {
  if (assetPath.endsWith(".mp4")) return "video/mp4";
  if (assetPath.endsWith(".png")) return "image/png";
  if (assetPath.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
};

const publicAsset = (assetPath: string) => {
  const storageKey = assetPath.replace(/^\//, "");
  const diskPath = resolve(projectRoot, "public", storageKey);
  if (!existsSync(diskPath)) throw new Error(`No existe el asset declarado: ${diskPath}`);
  return { storageKey, diskPath };
};

async function main() {
  const db = getDb();
  const [existingLocation] = await db.select({ id: locations.id }).from(locations).where(eq(locations.slug, "casa-brasa")).limit(1);
  const locationId = existingLocation?.id ?? (await db.insert(locations).values({
    slug: "casa-brasa",
    name: restaurant.name,
    tagline: restaurant.tagline,
    address: restaurant.location,
    logoUrl: restaurant.logo,
    timezone: "America/Montevideo",
  }).returning({ id: locations.id }))[0].id;

  await db.update(locations).set({
    name: restaurant.name,
    tagline: restaurant.tagline,
    address: restaurant.location,
    logoUrl: restaurant.logo,
    updatedAt: now,
  }).where(eq(locations.id, locationId));

  const categoryIds = new Map<string, string>();
  const categoryLabels = [...new Set(dishes.map((dish) => dish.category))];
  for (const [sortOrder, label] of categoryLabels.entries()) {
    const slug = slugify(label);
    const [existing] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.locationId, locationId), eq(categories.slug, slug))).limit(1);
    const categoryId = existing?.id ?? (await db.insert(categories).values({ locationId, slug, name: label, sortOrder }).returning({ id: categories.id }))[0].id;
    await db.update(categories).set({ name: label, sortOrder, isActive: true, updatedAt: now }).where(eq(categories.id, categoryId));
    categoryIds.set(label, categoryId);
  }

  const getMediaId = async (assetPath: string, kind: "image" | "video") => {
    const { storageKey, diskPath } = publicAsset(assetPath);
    const [existing] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.locationId, locationId), eq(mediaAssets.storageKey, storageKey))).limit(1);
    if (existing) return existing.id;
    const [created] = await db.insert(mediaAssets).values({
      locationId,
      kind,
      storageState: "final",
      storageKey,
      mimeType: mimeTypeFor(assetPath),
      sizeBytes: Math.max(statSync(diskPath).size, 1),
    }).returning({ id: mediaAssets.id });
    return created.id;
  };

  for (const dish of dishes) {
    const categoryId = categoryIds.get(dish.category);
    if (!categoryId) throw new Error(`Categoría no migrada para ${dish.name}`);
    const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.locationId, locationId), eq(products.slug, dish.slug))).limit(1);
    const productId = existing?.id ?? (await db.insert(products).values({
      locationId,
      categoryId,
      slug: dish.slug,
      name: dish.name,
      description: dish.description,
      priceCents: cents(dish.price),
      status: "published",
      isAvailable: true,
      publishedAt: now,
    }).returning({ id: products.id }))[0].id;
    await db.update(products).set({ categoryId, name: dish.name, description: dish.description, priceCents: cents(dish.price), status: "published", isAvailable: true, publishedAt: now, updatedAt: now }).where(eq(products.id, productId));

    for (const [sortOrder, ingredientName] of dish.ingredients.entries()) {
      const [existingIngredient] = await db.select({ id: ingredients.id }).from(ingredients).where(and(eq(ingredients.locationId, locationId), eq(ingredients.name, ingredientName))).limit(1);
      const ingredientId = existingIngredient?.id ?? (await db.insert(ingredients).values({ locationId, name: ingredientName, allergens: [] }).returning({ id: ingredients.id }))[0].id;
      await db.insert(productIngredients).values({ productId, ingredientId, sortOrder }).onConflictDoNothing();
    }

    const mediaLinks = [
      { path: dish.video, kind: "video" as const, isPrimary: true },
      { path: dish.image, kind: "image" as const, isPrimary: false },
      { path: dish.poster, kind: "image" as const, isPrimary: false },
    ];
    for (const [sortOrder, media] of mediaLinks.entries()) {
      const mediaId = await getMediaId(media.path, media.kind);
      await db.insert(productMedia).values({ productId, mediaId, sortOrder, isPrimary: media.isPrimary }).onConflictDoUpdate({ target: [productMedia.productId, productMedia.mediaId], set: { sortOrder, isPrimary: media.isPrimary } });
    }
    for (const surface of ["visual", "traditional"] as const) {
      await db.insert(menuEntries).values({ locationId, productId, categoryId, surface, status: "published", sortOrder: dishes.indexOf(dish), publishedAt: now }).onConflictDoUpdate({ target: [menuEntries.locationId, menuEntries.productId, menuEntries.surface], set: { categoryId, status: "published", sortOrder: dishes.indexOf(dish), publishedAt: now, updatedAt: now } });
    }
  }

  const candidateCategory: Record<string, string> = {
    "burger-bbq-ahumada": "Burgers",
    "taco-fuego": "Principales",
    "gnocchi-crocante": "Pastas",
  };
  for (const candidate of candidates) {
    const categoryId = categoryIds.get(candidateCategory[candidate.slug]);
    const [existing] = await db.select({ id: candidateCampaigns.id }).from(candidateCampaigns).where(and(eq(candidateCampaigns.locationId, locationId), eq(candidateCampaigns.slug, candidate.slug))).limit(1);
    const candidateId = existing?.id ?? (await db.insert(candidateCampaigns).values({
      locationId,
      categoryId,
      slug: candidate.slug,
      name: candidate.name,
      description: candidate.description,
      status: "published",
      finalPriceCents: cents(candidate.estimatedPrice),
      publishedAt: now,
    }).returning({ id: candidateCampaigns.id }))[0].id;
    await db.update(candidateCampaigns).set({ categoryId, name: candidate.name, description: candidate.description, status: "published", finalPriceCents: cents(candidate.estimatedPrice), publishedAt: now, updatedAt: now }).where(eq(candidateCampaigns.id, candidateId));
    for (const [sortOrder, media] of [
      { path: candidate.video, kind: "video" as const, isPrimary: true },
      { path: candidate.poster, kind: "image" as const, isPrimary: false },
    ].entries()) {
      const mediaId = await getMediaId(media.path, media.kind);
      await db.insert(candidateMedia).values({ candidateId, mediaId, sortOrder, isPrimary: media.isPrimary }).onConflictDoUpdate({ target: [candidateMedia.candidateId, candidateMedia.mediaId], set: { sortOrder, isPrimary: media.isPrimary } });
    }
  }

  console.log(`Seed completado: 1 local, ${categoryLabels.length} categorías, ${dishes.length} productos y ${candidates.length} candidatos. No se migraron analíticas ni localStorage.`);
}

try {
  await main();
} finally {
  await closeDb();
}
