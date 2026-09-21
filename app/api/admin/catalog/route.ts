import { and, asc, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonArray } from "@/db/serializers";
import { categories, candidates, dishes, restaurants, subscriptions, videoJobs, votes } from "@/db/schema";
import { dishAnalytics, insights, overview } from "@/data/analytics";
import { isAdminRequest } from "@/lib/admin-auth";

const restaurantId = "casa-brasa";

const slugify = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "nuevo-platillo";

const parseReferenceImages = (value: string) => {
  try {
    const parsed = JSON.parse(value) as { imageUrls?: unknown };
    return Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

function unauthorized() {
  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
}

async function readCatalog() {
  const db = getDb();
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
  const menuCategories = await db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(asc(categories.sortOrder));
  const menuDishes = await db.select().from(dishes).where(eq(dishes.restaurantId, restaurantId)).orderBy(asc(dishes.sortOrder));
  const menuCandidates = await db.select().from(candidates).where(eq(candidates.restaurantId, restaurantId)).orderBy(asc(candidates.sortOrder));
  const jobs = await db.select().from(videoJobs).where(eq(videoJobs.targetType, "dish")).orderBy(desc(videoJobs.createdAt));

  const candidateMetrics = await Promise.all(menuCandidates.map(async (candidate) => {
    const [{ count: voteCount }] = await db.select({ count: sql<number>`count(*)` }).from(votes).where(eq(votes.candidateId, candidate.id));
    const [{ count: subscriptionCount }] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.candidateId, candidate.id));
    return {
      id: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      description: candidate.description,
      estimatedPrice: candidate.estimatedPrice,
      wouldOrderPct: candidate.wouldOrderPct,
      votes: candidate.seedVotes + Number(voteCount ?? 0),
      notifyCount: candidate.seedNotifyCount + Number(subscriptionCount ?? 0),
      avgAttention: Number(candidate.avgAttention),
      videoUrl: candidate.videoUrl,
      posterUrl: candidate.posterUrl,
      emoji: candidate.emoji,
      accent: candidate.accent,
      status: candidate.status,
      ingredients: parseJsonArray(candidate.ingredientsJson),
      active: Boolean(candidate.active),
    };
  }));

  return {
    restaurant: restaurant ? {
      id: restaurant.id,
      name: restaurant.name,
      shortName: restaurant.shortName,
      tagline: restaurant.tagline,
      location: restaurant.location,
      logoUrl: restaurant.logoUrl,
    } : null,
    categories: menuCategories.map((category) => ({
      id: category.id,
      label: category.label,
      icon: category.icon,
      sortOrder: category.sortOrder,
      active: Boolean(category.active),
    })),
    dishes: menuDishes.map((dish) => ({
      id: dish.id,
      categoryId: dish.categoryId,
      slug: dish.slug,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      videoUrl: dish.videoUrl,
      imageUrl: dish.imageUrl,
      posterUrl: dish.posterUrl,
      emoji: dish.emoji,
      accent: dish.accent,
      ingredients: parseJsonArray(dish.ingredientsJson),
      tags: parseJsonArray(dish.tagsJson),
      sortOrder: dish.sortOrder,
      available: Boolean(dish.available),
    })),
    videoJobs: jobs.map((job) => ({
      id: job.id,
      targetId: job.targetId,
      dishName: menuDishes.find((dish) => dish.id === job.targetId)?.name ?? "Platillo eliminado",
      provider: job.provider,
      status: job.status,
      externalId: job.externalId,
      resultVideoUrl: job.resultVideoUrl,
      errorMessage: job.errorMessage,
      referenceImages: parseReferenceImages(job.requestPayloadJson),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })),
    candidates: candidateMetrics,
    metrics: {
      menuOpens: overview.menuOpens,
      avgAttentionSeconds: overview.avgAttentionSeconds,
      totalVotes: candidateMetrics.reduce((total, candidate) => total + candidate.votes, 0),
      totalNotify: candidateMetrics.reduce((total, candidate) => total + candidate.notifyCount, 0),
      menuItems: menuDishes.length,
      categories: menuCategories.filter((category) => category.active).length,
      topAttentionDish: overview.topAttentionDish,
      topAttentionValue: overview.topAttentionValue,
      topAddedDish: overview.topAddedDish,
      topAddedValue: overview.topAddedValue,
      topRevisitedDish: overview.topRevisitedDish,
      topRevisitedValue: overview.topRevisitedValue,
      dishAnalytics,
      insights,
    },
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  try {
    return NextResponse.json(await readCatalog());
  } catch (error) {
    console.error("[api/admin/catalog] failed to load catalog", error);
    return NextResponse.json({ error: "No pudimos cargar el panel" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null) as { type?: unknown; id?: unknown; data?: Record<string, unknown> } | null;
  const type = typeof body?.type === "string" ? body.type : "";
  const id = typeof body?.id === "string" ? body.id : "";
  const data = body?.data ?? {};

  try {
    const db = getDb();
    if (type === "restaurant") {
      const updates: Partial<typeof restaurants.$inferInsert> = {};
      for (const field of ["name", "shortName", "tagline", "location", "logoUrl"] as const) {
        if (typeof data[field] === "string" && data[field].trim()) updates[field] = data[field].trim();
      }
      if (!Object.keys(updates).length) return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
      await db.update(restaurants).set(updates).where(eq(restaurants.id, restaurantId));
    } else if (type === "category" && id) {
      const updates: Partial<typeof categories.$inferInsert> = {};
      if (typeof data.label === "string" && data.label.trim()) updates.label = data.label.trim();
      if (typeof data.icon === "string" && data.icon.trim()) updates.icon = data.icon.trim();
      if (typeof data.sortOrder === "number") updates.sortOrder = data.sortOrder;
      if (typeof data.active === "boolean") updates.active = data.active ? 1 : 0;
      if (!Object.keys(updates).length) return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
      await db.update(categories).set(updates).where(and(eq(categories.id, id), eq(categories.restaurantId, restaurantId)));
    } else if (type === "dish" && id) {
      const updates: Partial<typeof dishes.$inferInsert> = {};
      for (const field of ["categoryId", "name", "description", "videoUrl", "imageUrl", "posterUrl", "emoji", "accent"] as const) {
        if (typeof data[field] === "string" && data[field].trim()) updates[field] = data[field].trim();
        if ((field === "videoUrl" || field === "posterUrl") && data[field] === "") updates[field] = null;
      }
      if (typeof data.price === "number" && data.price >= 0) updates.price = data.price;
      if (typeof data.sortOrder === "number") updates.sortOrder = data.sortOrder;
      if (typeof data.available === "boolean") updates.available = data.available ? 1 : 0;
      if (Array.isArray(data.ingredients)) updates.ingredientsJson = JSON.stringify(data.ingredients.filter((item): item is string => typeof item === "string"));
      if (Array.isArray(data.tags)) updates.tagsJson = JSON.stringify(data.tags.filter((item): item is string => typeof item === "string"));
      if (!Object.keys(updates).length) return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
      await db.update(dishes).set(updates).where(and(eq(dishes.id, id), eq(dishes.restaurantId, restaurantId)));
    } else if (type === "candidate" && id) {
      const updates: Partial<typeof candidates.$inferInsert> = {};
      for (const field of ["name", "description", "videoUrl", "posterUrl", "emoji", "accent", "status"] as const) {
        if (typeof data[field] === "string" && data[field].trim()) updates[field] = data[field].trim();
      }
      if (typeof data.estimatedPrice === "number" && data.estimatedPrice >= 0) updates.estimatedPrice = data.estimatedPrice;
      if (typeof data.active === "boolean") updates.active = data.active ? 1 : 0;
      if (Array.isArray(data.ingredients)) updates.ingredientsJson = JSON.stringify(data.ingredients.filter((item): item is string => typeof item === "string"));
      if (!Object.keys(updates).length) return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
      await db.update(candidates).set(updates).where(and(eq(candidates.id, id), eq(candidates.restaurantId, restaurantId)));
    } else {
      return NextResponse.json({ error: "Edición no válida" }, { status: 400 });
    }

    return NextResponse.json(await readCatalog());
  } catch (error) {
    console.error("[api/admin/catalog] failed to save catalog", error);
    return NextResponse.json({ error: "No pudimos guardar los cambios" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null) as { type?: unknown; data?: Record<string, unknown> } | null;
  const type = typeof body?.type === "string" ? body.type : "";
  const data = body?.data ?? {};

  if (type === "category") {
    const label = typeof data.label === "string" ? data.label.trim() : "";
    const icon = typeof data.icon === "string" ? data.icon.trim() : "🍽️";
    if (!label) return NextResponse.json({ error: "El nombre de la categoría es obligatorio" }, { status: 400 });
    try {
      const db = getDb();
      const [{ maxSortOrder }] = await db.select({ maxSortOrder: sql<number>`coalesce(max(${categories.sortOrder}), -1)` }).from(categories).where(eq(categories.restaurantId, restaurantId));
      await db.insert(categories).values({
        id: `category-${crypto.randomUUID()}`,
        restaurantId,
        label,
        icon: icon || "🍽️",
        sortOrder: Number(maxSortOrder ?? -1) + 1,
        active: 1,
      });
      return NextResponse.json(await readCatalog(), { status: 201 });
    } catch (error) {
      console.error("[api/admin/catalog] failed to create category", error);
      return NextResponse.json({ error: "No pudimos crear la categoría" }, { status: 503 });
    }
  }

  if (type !== "dish") return NextResponse.json({ error: "Creación no válida" }, { status: 400 });

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
  if (!name || !categoryId) return NextResponse.json({ error: "El nombre y la categoría son obligatorios" }, { status: 400 });

  try {
    const db = getDb();
    const [category] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.restaurantId, restaurantId))).limit(1);
    if (!category) return NextResponse.json({ error: "La categoría no existe" }, { status: 400 });
    const [{ maxSortOrder }] = await db.select({ maxSortOrder: sql<number>`coalesce(max(${dishes.sortOrder}), 0)` }).from(dishes).where(eq(dishes.restaurantId, restaurantId));
    const id = `dish-${crypto.randomUUID()}`;
    const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
    const stringOr = (field: string, fallback: string) => typeof data[field] === "string" && data[field].trim() ? data[field].trim() : fallback;
    const arrayOrEmpty = (field: string) => Array.isArray(data[field]) ? data[field].filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];

    await db.insert(dishes).values({
      id,
      restaurantId,
      categoryId,
      slug,
      name,
      description: stringOr("description", "Un nuevo plato para descubrir."),
      price: typeof data.price === "number" && data.price >= 0 ? data.price : 0,
      videoUrl: typeof data.videoUrl === "string" && data.videoUrl.trim() ? data.videoUrl.trim() : null,
      imageUrl: stringOr("imageUrl", "/assets/images/menu/smash-trufa.jpeg"),
      posterUrl: typeof data.posterUrl === "string" && data.posterUrl.trim() ? data.posterUrl.trim() : null,
      emoji: stringOr("emoji", "🍽️"),
      accent: stringOr("accent", "#cf6846"),
      ingredientsJson: JSON.stringify(arrayOrEmpty("ingredients")),
      tagsJson: JSON.stringify(arrayOrEmpty("tags")),
      sortOrder: Number(maxSortOrder ?? 0) + 1,
      available: data.available === false ? 0 : 1,
    });

    return NextResponse.json(await readCatalog(), { status: 201 });
  } catch (error) {
    console.error("[api/admin/catalog] failed to create dish", error);
    return NextResponse.json({ error: "No pudimos crear el platillo" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null) as { type?: unknown; id?: unknown } | null;
  const type = typeof body?.type === "string" ? body.type : "";
  const id = typeof body?.id === "string" ? body.id : "";
  if (type !== "category" || !id) return NextResponse.json({ error: "Eliminación no válida" }, { status: 400 });

  try {
    const db = getDb();
    if (id === "recomendados") return NextResponse.json({ error: "La categoría Recomendados es necesaria para la carta" }, { status: 400 });
    const [{ dishCount }] = await db.select({ dishCount: sql<number>`count(*)` }).from(dishes).where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.categoryId, id)));
    if (Number(dishCount ?? 0) > 0) return NextResponse.json({ error: "Primero mové los platillos de esta categoría a otra categoría" }, { status: 409 });
    const deleted = await db.delete(categories).where(and(eq(categories.id, id), eq(categories.restaurantId, restaurantId))).returning({ id: categories.id });
    if (!deleted.length) return NextResponse.json({ error: "La categoría no existe" }, { status: 404 });
    return NextResponse.json(await readCatalog());
  } catch (error) {
    console.error("[api/admin/catalog] failed to delete category", error);
    return NextResponse.json({ error: "No pudimos eliminar la categoría" }, { status: 503 });
  }
}
