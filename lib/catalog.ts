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
  productIngredients,
  productMedia,
  products,
} from "@/db/schema";
import { candidates as demoCandidates, type Candidate } from "@/data/candidates";
import { categories as demoCategories, dishes as demoDishes, type Dish } from "@/data/dishes";

export type CatalogSnapshot = {
  dishes: Dish[];
  categories: typeof demoCategories;
  candidates: Candidate[];
  source: "database" | "demo";
};

const demoCatalog = (): CatalogSnapshot => ({
  dishes: demoDishes,
  categories: demoCategories,
  candidates: demoCandidates,
  source: "demo",
});

const assetUrl = (storageKey: string | undefined) => storageKey ? `/${storageKey.replace(/^\//, "")}` : "";

export async function getPublicCatalog(): Promise<CatalogSnapshot> {
  if (!process.env.DATABASE_URL) return demoCatalog();

  try {
    const db = getDb();
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
        eq(products.isAvailable, true),
      ))
      .orderBy(asc(menuEntries.sortOrder));

    if (productRows.length === 0) return demoCatalog();
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
    const categoryIcons = new Map(demoCategories.map((category) => [category.label, category.icon]));
    const catalogCategories = [
      { label: "Recomendados", icon: "🔥" },
      ...productRows.filter((row, index, rows) => rows.findIndex((item) => item.category.slug === row.category.slug) === index).map((row) => ({ label: row.category.name, icon: categoryIcons.get(row.category.name) ?? "✦" })),
    ] as typeof demoCategories;

    const dishes = productRows.map(({ product, category }) => {
      const fallback = demoDishes.find((dish) => dish.slug === product.slug);
      const media = mediaByProduct.get(product.id) ?? [];
      const video = media.find((item) => item.kind === "video");
      const images = media.filter((item) => item.kind === "image");
      return {
        slug: product.slug,
        name: product.name,
        category: category.name,
        description: product.description,
        price: product.priceCents / 100,
        video: assetUrl(video?.storageKey) || fallback?.video || "",
        image: assetUrl(images[0]?.storageKey) || fallback?.image || "",
        poster: assetUrl(images[1]?.storageKey ?? images[0]?.storageKey) || fallback?.poster || "",
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
      const fallback = demoCandidates.find((item) => item.slug === candidate.slug);
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
        video: assetUrl(video?.storageKey) || fallback?.video || "",
        poster: assetUrl(poster?.storageKey) || fallback?.poster || "",
        emoji: candidate.emoji,
        accent: candidate.accent,
        status: votes > 0 ? "Interés en curso" : "Aún reuniendo votos",
        ingredients: [],
      } satisfies Candidate;
    });

    return { dishes, categories: catalogCategories, candidates, source: "database" };
  } catch (error) {
    console.warn("No se pudo cargar el catálogo desde PostgreSQL; se usa el contenido demo.", error);
    return demoCatalog();
  }
}
