import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  candidateCampaigns,
  candidateInterests,
  candidateMedia,
  candidateVotes,
  categories as categoryTable,
  ingredients,
  mediaAssets,
  menuEntries,
  locations,
  productIngredients,
  productMedia,
  products,
} from "@/db/schema";
import type { Candidate, CatalogCategory, Dish, PublicLocation } from "@/lib/catalog-types";

export type CatalogSnapshot = {
  location: PublicLocation | null;
  dishes: Dish[];
  categories: CatalogCategory[];
  candidates: Candidate[];
  source: "database";
};

const emptyCatalog = (): CatalogSnapshot => ({
  location: null,
  dishes: [],
  categories: [],
  candidates: [],
  source: "database",
});

const assetUrl = (storageKey: string | undefined) => storageKey ? `/${storageKey.replace(/^\//, "")}` : "";

export async function getPublicCatalog(): Promise<CatalogSnapshot> {
  if (!process.env.DATABASE_URL) return emptyCatalog();

  try {
    const db = getDb();
    const [location] = await db.select({ name: locations.name, tagline: locations.tagline, address: locations.address, phone: locations.phone, logoUrl: locations.logoUrl }).from(locations).orderBy(asc(locations.createdAt)).limit(1);
    const productRows = await db.select({
      entry: menuEntries,
      product: products,
      category: categoryTable,
    }).from(menuEntries)
      .innerJoin(products, eq(menuEntries.productId, products.id))
      .innerJoin(categoryTable, eq(menuEntries.categoryId, categoryTable.id))
      .where(and(
        eq(menuEntries.surface, "visual"),
        eq(menuEntries.status, "published"),
        eq(products.status, "published"),
        eq(categoryTable.isActive, true),
        eq(products.isAvailable, true),
      ))
      .orderBy(asc(menuEntries.sortOrder));

    if (productRows.length === 0) return { ...emptyCatalog(), location: location ?? null };
    const productIds = productRows.map((row) => row.product.id);
    const mediaRows = await db.select({
      productId: productMedia.productId,
      storageKey: mediaAssets.storageKey,
      kind: mediaAssets.kind,
      sortOrder: productMedia.sortOrder,
    }).from(productMedia)
      .innerJoin(mediaAssets, eq(productMedia.mediaId, mediaAssets.id))
      .where(inArray(productMedia.productId, productIds))
      .orderBy(asc(productMedia.sortOrder));
    const ingredientRows = await db.select({
      productId: productIngredients.productId,
      name: ingredients.name,
      sortOrder: productIngredients.sortOrder,
    }).from(productIngredients)
      .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
      .where(inArray(productIngredients.productId, productIds))
      .orderBy(asc(productIngredients.sortOrder));

    const mediaByProduct = new Map<string, typeof mediaRows>();
    for (const row of mediaRows) mediaByProduct.set(row.productId, [...(mediaByProduct.get(row.productId) ?? []), row]);
    const ingredientsByProduct = new Map<string, string[]>();
    for (const row of ingredientRows) ingredientsByProduct.set(row.productId, [...(ingredientsByProduct.get(row.productId) ?? []), row.name]);
    const catalogCategories = [
      { label: "Recomendados", icon: "•" },
      ...productRows.filter((row, index, rows) => rows.findIndex((item) => item.category.slug === row.category.slug) === index).map((row) => ({ label: row.category.name, icon: "•" })),
    ];

    const dishes = productRows.map(({ product, category }) => {
      const media = mediaByProduct.get(product.id) ?? [];
      const video = media.find((item) => item.kind === "video");
      const images = media.filter((item) => item.kind === "image");
      return {
        slug: product.slug,
        name: product.name,
        category: category.name,
        description: product.description,
        price: product.priceCents / 100,
        video: assetUrl(video?.storageKey),
        image: assetUrl(images[0]?.storageKey),
        poster: assetUrl(images[1]?.storageKey ?? images[0]?.storageKey),
        emoji: product.emoji,
        accent: product.accent,
        ingredients: ingredientsByProduct.get(product.id) ?? [],
        tags: product.tags,
      } satisfies Dish;
    });

    const candidateRows = await db.select({ candidate: candidateCampaigns }).from(candidateCampaigns).where(eq(candidateCampaigns.status, "published")).orderBy(asc(candidateCampaigns.createdAt));
    const candidateIds = candidateRows.map((row) => row.candidate.id);
    const candidateMediaRows = candidateIds.length === 0 ? [] : await db.select({
      candidateId: candidateMedia.candidateId,
      storageKey: mediaAssets.storageKey,
      kind: mediaAssets.kind,
      sortOrder: candidateMedia.sortOrder,
    }).from(candidateMedia)
      .innerJoin(mediaAssets, eq(candidateMedia.mediaId, mediaAssets.id))
      .where(inArray(candidateMedia.candidateId, candidateIds))
      .orderBy(asc(candidateMedia.sortOrder));
    const voteRows = candidateIds.length === 0 ? [] : await db.select({ candidateId: candidateVotes.candidateId, count: sql<number>`count(*)::int` }).from(candidateVotes).where(inArray(candidateVotes.candidateId, candidateIds)).groupBy(candidateVotes.candidateId);
    const interestRows = candidateIds.length === 0 ? [] : await db.select({ candidateId: candidateInterests.candidateId, count: sql<number>`count(*)::int` }).from(candidateInterests).where(inArray(candidateInterests.candidateId, candidateIds)).groupBy(candidateInterests.candidateId);
    const votesByCandidate = new Map(voteRows.map((row) => [row.candidateId, Number(row.count)]));
    const interestsByCandidate = new Map(interestRows.map((row) => [row.candidateId, Number(row.count)]));
    const mediaByCandidate = new Map<string, typeof candidateMediaRows>();
    for (const row of candidateMediaRows) mediaByCandidate.set(row.candidateId, [...(mediaByCandidate.get(row.candidateId) ?? []), row]);

    const candidates = candidateRows.map(({ candidate }) => {
      const media = mediaByCandidate.get(candidate.id) ?? [];
      const video = media.find((item) => item.kind === "video");
      const poster = media.find((item) => item.kind === "image");
      const votes = votesByCandidate.get(candidate.id) ?? 0;
      const notifyCount = interestsByCandidate.get(candidate.id) ?? 0;
      return {
        slug: candidate.slug,
        name: candidate.name,
        description: candidate.description,
        estimatedPrice: (candidate.finalPriceCents ?? 0) / 100,
        wouldOrderPct: 0,
        votes,
        notifyCount,
        avgAttention: 0,
        video: assetUrl(video?.storageKey),
        poster: assetUrl(poster?.storageKey),
        emoji: candidate.emoji,
        accent: candidate.accent,
        status: votes > 0 ? "Interés en curso" : "Aún reuniendo votos",
        ingredients: [],
      } satisfies Candidate;
    });

    return { location: location ?? null, dishes, categories: catalogCategories, candidates, source: "database" };
  } catch (error) {
    console.error("No se pudo cargar el catálogo desde PostgreSQL.", error);
    return emptyCatalog();
  }
}
