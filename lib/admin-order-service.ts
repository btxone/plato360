import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { locations, orderHistory, orderItems, orders } from "@/db/schema";
import { type CurrentSession } from "@/lib/auth";
import { assertSameLocation, PermissionDeniedError, requireSession, resolveLocationIds } from "@/lib/authorization";
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

export async function listAdminOrders(actor: CurrentSession, requestedLocationId: string | undefined, status: "pending" | "in_process" | "confirmed" | "cancelled" | undefined) {
  const locationIds = await resolveLocationIds(actor, requestedLocationId);
  if (locationIds.length === 0) return { locationId: null, locationIds, orders: [] };
  const db = getDb();
  const conditions = [inArray(orders.locationId, locationIds)];
  if (status) conditions.push(eq(orders.status, status));
  const rows = await db.select({ order: orders, locationName: locations.name }).from(orders).innerJoin(locations, eq(orders.locationId, locations.id)).where(and(...conditions)).orderBy(desc(orders.createdAt));
  const orderViews = await withItems(rows.map((row) => row.order));
  const locationNameById = new Map(rows.map((row) => [row.order.id, row.locationName]));
  return {
    locationId: locationIds.length === 1 ? locationIds[0] : null,
    locationIds,
    orders: orderViews.map((order) => ({ ...order, locationName: locationNameById.get(order.id) ?? null })),
  };
}

export async function transitionAdminOrder(actor: CurrentSession, orderId: string, action: "confirm" | "complete" | "cancel", expectedVersion?: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!current) return null;
    assertSameLocation(actor, current.locationId);
    const expectedStatus = action === "complete" ? "in_process" : "pending";
    if (action === "cancel") {
      if (current.status !== "pending" && current.status !== "in_process") throw new Error("ORDER_NOT_ACTIONABLE");
    } else if (current.status !== expectedStatus) {
      throw new Error(action === "complete" ? "ORDER_NOT_IN_PROCESS" : "ORDER_NOT_PENDING");
    }
    if (expectedVersion !== undefined && expectedVersion !== current.version) throw new Error("ORDER_VERSION_CONFLICT");
    const nextStatus = action === "confirm" ? "in_process" : action === "complete" ? "confirmed" : "cancelled";
    const historyAction = action === "confirm" ? "confirmed" : action === "complete" ? "completed" : "cancelled";
    const now = new Date();
    const [updated] = await tx.update(orders).set({
      status: nextStatus,
      confirmedAt: action === "confirm" ? now : current.confirmedAt,
      cancelledAt: action === "cancel" ? now : null,
      version: current.version + 1,
      updatedAt: now,
    }).where(and(eq(orders.id, orderId), eq(orders.status, current.status), eq(orders.version, current.version))).returning();
    if (!updated) throw new Error("ORDER_VERSION_CONFLICT");
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, updated.id)).orderBy(asc(orderItems.createdAt));
    await tx.insert(orderHistory).values({
      orderId: updated.id,
      action: historyAction,
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

export async function updateAdminOrder(actor: CurrentSession, orderId: string, input: { notes: string; removeItemIds: string[]; expectedVersion?: number }) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!current) return null;
    assertSameLocation(actor, current.locationId);
    if (current.status !== "pending") throw new Error("ORDER_NOT_PENDING");
    if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) throw new Error("ORDER_VERSION_CONFLICT");

    const currentItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.createdAt));
    const currentItemIds = new Set(currentItems.map((item) => item.id));
    const removeItemIds = [...new Set(input.removeItemIds)];
    if (removeItemIds.some((itemId) => !currentItemIds.has(itemId))) throw new Error("ORDER_ITEM_NOT_FOUND");
    const removeSet = new Set(removeItemIds);
    const remainingItems = currentItems.filter((item) => !removeSet.has(item.id));
    if (remainingItems.length === 0) throw new Error("ORDER_EMPTY");

    const now = new Date();
    if (removeItemIds.length > 0) await tx.delete(orderItems).where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, removeItemIds)));
    const totalCents = remainingItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const [updated] = await tx.update(orders).set({
      notes: input.notes.trim(),
      totalCents,
      version: current.version + 1,
      updatedAt: now,
    }).where(and(eq(orders.id, orderId), eq(orders.status, "pending"), eq(orders.version, current.version))).returning();
    if (!updated) throw new Error("ORDER_VERSION_CONFLICT");
    await tx.insert(orderHistory).values({
      orderId: updated.id,
      action: "updated",
      actorUserId: actor.userId,
      actorPrincipal: actor.principalLabel,
      previousStatus: current.status,
      nextStatus: updated.status,
      previousPayload: { totalCents: current.totalCents, notes: current.notes, version: current.version, itemIds: currentItems.map((item) => item.id) },
      nextPayload: { totalCents: updated.totalCents, notes: updated.notes, version: updated.version, itemIds: remainingItems.map((item) => item.id) },
      orderVersion: updated.version,
    });
    return publicOrderView(updated, remainingItems);
  });
}
