import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/lib/authorization";
import { requireOrderStaff, transitionAdminOrder } from "@/lib/admin-order-service";

export const runtime = "nodejs";

const transitionSchema = z.object({ action: z.enum(["confirm", "cancel"]), version: z.number().int().positive().optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireOrderStaff();
    const parsed = transitionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Transición de pedido inválida." }, { status: 400 });
    const { id } = await context.params;
    const order = await transitionAdminOrder(actor, id, parsed.data.action, parsed.data.version);
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "ORDER_NOT_PENDING") return NextResponse.json({ error: "Solo se puede cambiar un pedido pendiente." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_VERSION_CONFLICT") return NextResponse.json({ error: "El pedido cambió mientras lo estabas atendiendo. Actualizá la bandeja." }, { status: 409 });
    return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });
  }
}
