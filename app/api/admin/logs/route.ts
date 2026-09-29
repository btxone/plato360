import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, locations, orderHistory, orders, users } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationIds } from "@/lib/authorization";

export const runtime = "nodejs";

const categorySchema = z.enum(["orders", "errors", "passwords", "users", "access", "qr", "catalog", "features"]);
type Category = z.infer<typeof categorySchema>;

function auditCategoryCondition(category: Category | undefined) {
  if (!category) return undefined;
  if (category === "orders") return eq(auditLogs.action, "__order_history__");
  if (category === "errors") return like(auditLogs.action, "error.%");
  if (category === "passwords") return or(eq(auditLogs.action, "auth.password_changed"), eq(auditLogs.action, "user.password_changed"), eq(auditLogs.action, "user.password_reset"));
  if (category === "users") return like(auditLogs.action, "user.%");
  if (category === "access") return like(auditLogs.action, "auth.%");
  if (category === "qr") return like(auditLogs.action, "qr.%");
  if (category === "catalog") return like(auditLogs.action, "catalog.%");
  return like(auditLogs.action, "feature.%");
}

function orderLog(row: {
  history: typeof orderHistory.$inferSelect;
  order: { tableLabel: string; totalCents: number };
  locationId: string;
  locationName: string;
  actorDisplayName: string | null;
  actorRole: "admin" | "mozo" | null;
}) {
  const nextPayload = row.history.nextPayload ?? {};
  const totalCents = typeof nextPayload.totalCents === "number" ? nextPayload.totalCents : row.order.totalCents;
  return {
    id: `order-history:${row.history.id}`,
    locationId: row.locationId,
    locationName: row.locationName,
    actorPrincipal: row.history.actorPrincipal,
    actorDisplayName: row.actorDisplayName,
    actorRole: row.actorRole,
    action: `order.${row.history.action}`,
    entityType: "order",
    entityId: row.history.orderId,
    metadata: {
      tableLabel: row.order.tableLabel,
      totalCents,
      previousStatus: row.history.previousStatus,
      nextStatus: row.history.nextStatus,
      orderVersion: row.history.orderVersion,
    },
    createdAt: row.history.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();

    const search = new URL(request.url).searchParams;
    const requestedLocationId = search.get("locationId") ?? undefined;
    const categoryValue = search.get("category") ?? undefined;
    const category = categoryValue ? categorySchema.safeParse(categoryValue) : { success: true as const, data: undefined };
    if (!category.success) return NextResponse.json({ error: "Categoría de log inválida." }, { status: 400 });

    const locationIds = await resolveLocationIds(actor, requestedLocationId);
    if (locationIds.length === 0) return NextResponse.json({ locationId: null, locationIds, logs: [] });

    const db = getDb();
    const auditLocationCondition = actor.role === "superadmin" && !requestedLocationId
      ? or(inArray(auditLogs.locationId, locationIds), isNull(auditLogs.locationId))
      : inArray(auditLogs.locationId, locationIds);
    const auditConditions = [auditLocationCondition];
    const categoryCondition = auditCategoryCondition(category.data);
    if (categoryCondition) auditConditions.push(categoryCondition);
    const auditRows = category.data === "orders"
      ? []
      : await db.select({
        id: auditLogs.id,
        locationId: auditLogs.locationId,
        locationName: locations.name,
        actorPrincipal: auditLogs.actorPrincipal,
        actorDisplayName: users.displayName,
        actorRole: users.role,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      }).from(auditLogs).leftJoin(locations, eq(auditLogs.locationId, locations.id)).leftJoin(users, eq(auditLogs.actorUserId, users.id)).where(and(...auditConditions)).orderBy(desc(auditLogs.createdAt)).limit(250);

    const orderRows = !category.data || category.data === "orders"
      ? await db.select({
        history: orderHistory,
        order: { tableLabel: orders.tableLabel, totalCents: orders.totalCents },
        locationId: orders.locationId,
        locationName: locations.name,
        actorDisplayName: users.displayName,
        actorRole: users.role,
      }).from(orderHistory).innerJoin(orders, eq(orderHistory.orderId, orders.id)).innerJoin(locations, eq(orders.locationId, locations.id)).leftJoin(users, eq(orderHistory.actorUserId, users.id)).where(inArray(orders.locationId, locationIds)).orderBy(desc(orderHistory.createdAt)).limit(250)
      : [];

    const logs = [...auditRows, ...orderRows.map(orderLog)]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 200);
    const response = NextResponse.json({ locationId: locationIds.length === 1 ? locationIds[0] : null, locationIds, logs });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudieron consultar los logs." }, { status: 500 });
  }
}
