import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { isFeatureEnabled } from "@/lib/features";
import { getCurrentPublicSession, PublicSessionRequiredError } from "@/lib/public-session";
import { dinerSessions, orderHistory, orderItems, orders, products } from "@/db/schema";

export type PublicOrderInput = {
  items: Array<{ slug: string; quantity: number; notes?: string }>;
  notes?: string;
};

export class OrdersFeatureDisabledError extends Error {
  constructor() {
    super("Los pedidos están desactivados para este local.");
    this.name = "OrdersFeatureDisabledError";
  }
}

export class ProductUnavailableError extends Error {
  readonly slugs: string[];

  constructor(slugs: string[]) {
    super(`Estos platos ya no están disponibles: ${slugs.join(", ")}.`);
    this.name = "ProductUnavailableError";
    this.slugs = slugs;
  }
}

type PublicSession = typeof dinerSessions.$inferSelect;
type PublicOrder = typeof orders.$inferSelect;
type PublicOrderItem = typeof orderItems.$inferSelect;

export async function requireOrdersSession() {
  const session = await getCurrentPublicSession();
  if (!session) throw new PublicSessionRequiredError();
  if (!(await isFeatureEnabled(session.locationId, "orders"))) throw new OrdersFeatureDisabledError();
  return session;
}

export function publicOrderView(order: PublicOrder, items: PublicOrderItem[], options?: { forDiner?: boolean }) {
  const status = options?.forDiner && order.status === "in_process" ? "confirmed" : order.status;
  return {
    id: order.id,
    referenceCode: order.id.slice(0, 8).toUpperCase(),
    locationId: order.locationId,
    dinerSessionId: order.dinerSessionId,
    tableLabel: order.tableLabel,
    status,
    totalCents: order.totalCents,
    notes: order.notes,
    version: order.version,
    confirmedAt: order.confirmedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      priceCents: item.priceCentsSnapshot,
      quantity: item.quantity,
      notes: item.notes,
      lineTotalCents: item.lineTotalCents,
    })),
  };
}

export async function createPublicOrder(session: PublicSession, input: PublicOrderInput) {
  const db = getDb();
  const requestedSlugs = input.items.map((item) => item.slug);
  const availableProducts = await db.select().from(products).where(and(
    eq(products.locationId, session.locationId),
    eq(products.status, "published"),
    eq(products.isAvailable, true),
    inArray(products.slug, requestedSlugs),
  ));
  const productBySlug = new Map(availableProducts.map((product) => [product.slug, product]));
  const missingSlugs = requestedSlugs.filter((slug) => !productBySlug.has(slug));
  if (missingSlugs.length > 0) throw new ProductUnavailableError(missingSlugs);

  const items = input.items.map((item) => {
    const product = productBySlug.get(item.slug)!;
    return {
      productId: product.id,
      nameSnapshot: product.name,
      priceCentsSnapshot: product.priceCents,
      quantity: item.quantity,
      notes: item.notes?.trim() ?? "",
      lineTotalCents: product.priceCents * item.quantity,
    };
  });
  const totalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const actorPrincipal = `diner:${session.anonymousId}`;
  return db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values({
      locationId: session.locationId,
      qrCodeId: session.qrCodeId,
      dinerSessionId: session.id,
      tableLabel: session.tableLabel,
      totalCents,
      notes: input.notes?.trim() ?? "",
    }).returning();
    const createdItems = await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id }))).returning();
    await tx.insert(orderHistory).values({
      orderId: order.id,
      action: "created",
      actorPrincipal,
      nextStatus: order.status,
      nextPayload: {
        tableLabel: order.tableLabel,
        notes: order.notes,
        totalCents: order.totalCents,
        items: createdItems.map((item) => ({ productId: item.productId, name: item.nameSnapshot, priceCents: item.priceCentsSnapshot, quantity: item.quantity, notes: item.notes })),
      },
      orderVersion: order.version,
    });
    return { order, items: createdItems };
  });
}

export async function listPublicOrders(session: PublicSession) {
  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.dinerSessionId, session.id)).orderBy(desc(orders.createdAt));
  if (rows.length === 0) return [];
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((order) => order.id))).orderBy(asc(orderItems.createdAt));
  const itemsByOrder = new Map<string, PublicOrderItem[]>();
  for (const item of items) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
  return rows.map((order) => publicOrderView(order, itemsByOrder.get(order.id) ?? [], { forDiner: true }));
}
