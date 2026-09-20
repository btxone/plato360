import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonArray } from "@/db/serializers";
import { categories, candidates, dishes, restaurants, subscriptions, votes } from "@/db/schema";
import { dishAnalytics, insights, overview } from "@/data/analytics";
import { isAdminRequest } from "@/lib/admin-auth";

const restaurantId = "casa-brasa";

function unauthorized() {
  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
}

async function readCatalog() {
  const db = getDb();
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
  const menuCategories = await db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(asc(categories.sortOrder));
  const menuDishes = await db.select().from(dishes).where(eq(dishes.restaurantId, restaurantId)).orderBy(asc(dishes.sortOrder));
  const menuCandidates = await db.select().from(candidates).where(eq(candidates.restaurantId, restaurantId)).orderBy(asc(candidates.sortOrder));

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

