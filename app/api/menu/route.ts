import { asc, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonArray } from "@/db/serializers";
import { categories, dishes, restaurants } from "@/db/schema";

const restaurantId = "casa-brasa";

export async function GET() {
  try {
    const db = getDb();
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
    const menuCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, restaurantId), eq(categories.active, 1)))
      .orderBy(asc(categories.sortOrder));
    const menuDishes = await db
      .select()
      .from(dishes)
      .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.available, 1)))
      .orderBy(asc(dishes.sortOrder));

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        shortName: restaurant.shortName,
        tagline: restaurant.tagline,
        location: restaurant.location,
        logo: restaurant.logoUrl,
      },
      categories: menuCategories.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
      })),
      dishes: menuDishes.map((dish) => ({
        id: dish.id,
        slug: dish.slug,
        name: dish.name,
        categoryId: dish.categoryId,
        category: menuCategories.find((category) => category.id === dish.categoryId)?.label ?? "Recomendados",
        description: dish.description,
        price: dish.price,
        video: dish.videoUrl,
        image: dish.imageUrl,
        poster: dish.posterUrl,
        emoji: dish.emoji,
        accent: dish.accent,
        ingredients: parseJsonArray(dish.ingredientsJson),
        tags: parseJsonArray(dish.tagsJson),
      })),
    });
  } catch (error) {
    console.error("[api/menu] failed to load menu", error);
    return NextResponse.json({ error: "Menu unavailable" }, { status: 503 });
  }
}
