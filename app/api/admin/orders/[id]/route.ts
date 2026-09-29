import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit, type CurrentSession } from "@/lib/auth";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/lib/authorization";
import { requireOrderStaff, transitionAdminOrder, updateAdminOrder } from "@/lib/admin-order-service";

export const runtime = "nodejs";

const orderActionSchema = z.union([
  z.object({ action: z.enum(["confirm", "complete", "cancel"]), version: z.number().int().positive().optional() }),
  z.object({ action: z.literal("update"), version: z.number().int().positive().optional(), notes: z.string().trim().max(500), removeItemIds: z.array(z.string().uuid()).max(30).default([]) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let actor: CurrentSession | null = null;
  try {
    actor = await requireOrderStaff();
    const parsed = orderActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Actualización de pedido inválida." }, { status: 400 });
    const order = parsed.data.action === "update"
      ? await updateAdminOrder(actor, id, { notes: parsed.data.notes, removeItemIds: parsed.data.removeItemIds, expectedVersion: parsed.data.version })
      : await transitionAdminOrder(actor, id, parsed.data.action, parsed.data.version);
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "ORDER_NOT_PENDING") return NextResponse.json({ error: "Solo se puede cambiar un pedido pendiente." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_NOT_IN_PROCESS") return NextResponse.json({ error: "Solo se puede finalizar un pedido que está en proceso." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_NOT_ACTIONABLE") return NextResponse.json({ error: "El pedido ya está cerrado y no se puede modificar." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_VERSION_CONFLICT") return NextResponse.json({ error: "El pedido cambió mientras lo estabas atendiendo. Actualizá la bandeja." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_ITEM_NOT_FOUND") return NextResponse.json({ error: "Uno de los productos ya no pertenece a este pedido. Actualizá la bandeja." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_EMPTY") return NextResponse.json({ error: "El pedido debe conservar al menos un producto." }, { status: 409 });
    await writeAudit({
      locationId: actor?.locationId,
      actorUserId: actor?.userId,
      actorPrincipal: actor?.principalLabel ?? "system:admin-order",
      action: "error.order",
      entityType: "order",
      entityId: id,
      metadata: {
        route: "/api/admin/orders/[id]",
        method: "PATCH",
        message: error instanceof Error ? error.message.slice(0, 300) : "Unknown application error",
      },
    }).catch(() => undefined);
    return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });
  }
}
