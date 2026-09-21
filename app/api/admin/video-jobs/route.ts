import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { dishes, videoJobs } from "@/db/schema";
import { isAdminRequest } from "@/lib/admin-auth";

const restaurantId = "casa-brasa";

function unauthorized() {
  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  try {
    const db = getDb();
    const menuDishes = await db.select({ id: dishes.id, name: dishes.name }).from(dishes).where(eq(dishes.restaurantId, restaurantId));
    const jobs = await db.select().from(videoJobs).where(eq(videoJobs.targetType, "dish")).orderBy(asc(videoJobs.createdAt));
    return NextResponse.json(jobs.map((job) => ({ ...job, dishName: menuDishes.find((dish) => dish.id === job.targetId)?.name ?? "Platillo eliminado" })));
  } catch (error) {
    console.error("[api/admin/video-jobs] failed to load jobs", error);
    return NextResponse.json({ error: "No pudimos cargar las solicitudes" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  const body = await request.json().catch(() => null) as { dishId?: unknown; notes?: unknown; imageUrls?: unknown } | null;
  const dishId = typeof body?.dishId === "string" ? body.dishId : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls.filter((item): item is string => typeof item === "string" && item.startsWith("/api/assets/")) : [];
  if (!dishId) return NextResponse.json({ error: "Falta seleccionar un platillo" }, { status: 400 });

  try {
    const db = getDb();
    const [dish] = await db.select().from(dishes).where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId))).limit(1);
    if (!dish) return NextResponse.json({ error: "El platillo no existe" }, { status: 404 });

    const job = {
      id: `video-job-${crypto.randomUUID()}`,
      targetType: "dish",
      targetId: dish.id,
      provider: "http-post-pending",
      status: "requested",
      requestPayloadJson: JSON.stringify({ dishId: dish.id, dishName: dish.name, notes, imageUrls, requestedAt: new Date().toISOString() }),
    };
    await db.insert(videoJobs).values(job);
    return NextResponse.json({ ...job, dishName: dish.name }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/video-jobs] failed to request video", error);
    return NextResponse.json({ error: "No pudimos registrar la solicitud" }, { status: 503 });
  }
}
