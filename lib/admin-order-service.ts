import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { orderHistory, orderItems, orders } from "@/db/schema";
import { type CurrentSession } from "@/lib/auth";
import { assertSameLocation, PermissionDeniedError, requireSession, resolveLocationId } from "@/lib/authorization";
import { publicOrderView } from "@/lib/order-service";

export async function requireOrderStaff() {
  const actor = await requireSession();
  if (actor.role !== "superadmin" && actor.role !== "admin" && actor.role !== "mozo") throw new PermissionDeniedError();
  return actor;
}

async function withItems(rows: Array<typeof orders.$inferSelect>) {
  if (rows.length === 0) return [];
  const db = getDb();
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((order) => order.id))).orderBy(asc(orderItems.createdAt));
  const itemsByOrder = new Map<string, Array<typeof orderItems.$inferSelect>>();
  for (const item of items) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
  return rows.map((order) => publicOrderView(order, itemsByOrder.get(order.id) ?? []));
}

export async function listAdminOrders(actor: CurrentSession, requestedLocationId: string | undefined, status: "pending" | "confirmed" | "cancelled" | undefined) {
  const locationId = await resolveLocationId(actor, requestedLocationId);
  const db = getDb();
  const conditions = [eq(orders.locationId, locationId)];
  if (status) conditions.push(eq(orders.status, status));
  const rows = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  return { locationId, orders: await withItems(rows) };
}

export async function transitionAdminOrder(actor: CurrentSession, orderId: string, action: "confirm" | "cancel", expectedVersion?: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!current) return null;
    assertSameLocation(actor, current.locationId);
    if (current.status !== "pending") throw new Error("ORDER_NOT_PENDING");
    if (expectedVersion !== undefined && expectedVersion !== current.version) throw new Error("ORDER_VERSION_CONFLICT");
    const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
    const now = new Date();
    const [updated] = await tx.update(orders).set({
      status: nextStatus,
      confirmedAt: action === "confirm" ? now : null,
      cancelledAt: action === "cancel" ? now : null,
      version: current.version + 1,
      updatedAt: now,
    }).where(and(eq(orders.id, orderId), eq(orders.status, "pending"), eq(orders.version, current.version))).returning();
    if (!updated) throw new Error("ORDER_VERSION_CONFLICT");
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, updated.id)).orderBy(asc(orderItems.createdAt));
    await tx.insert(orderHistory).values({
      orderId: updated.id,
      action: nextStatus,
      actorUserId: actor.userId,
      actorPrincipal: actor.principalLabel,
      previousStatus: current.status,
      nextStatus: updated.status,
      previousPayload: { totalCents: current.totalCents, version: current.version },
      nextPayload: { totalCents: updated.totalCents, version: updated.version },
      orderVersion: updated.version,
    });
    return publicOrderView(updated, items);
  });
}
