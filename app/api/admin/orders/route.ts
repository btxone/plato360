import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit, type CurrentSession } from "@/lib/auth";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/lib/authorization";
import { listAdminOrders, requireOrderStaff } from "@/lib/admin-order-service";

export const runtime = "nodejs";

const statusSchema = z.enum(["pending", "in_process", "confirmed", "cancelled"]);

export async function GET(request: Request) {
  let actor: CurrentSession | null = null;
  try {
    actor = await requireOrderStaff();
    const search = new URL(request.url).searchParams;
    const statusValue = search.get("status");
    const status = statusValue ? statusSchema.safeParse(statusValue) : { success: true as const, data: undefined };
    if (!status.success) return NextResponse.json({ error: "Estado de pedido inválido." }, { status: 400 });
    const result = await listAdminOrders(actor, search.get("locationId") ?? undefined, status.data);
    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    await writeAudit({
      locationId: actor?.locationId,
      actorUserId: actor?.userId,
      actorPrincipal: actor?.principalLabel ?? "system:admin-orders",
      action: "error.order",
      metadata: {
        route: "/api/admin/orders",
        method: "GET",
        message: error instanceof Error ? error.message.slice(0, 300) : "Unknown application error",
      },
    }).catch(() => undefined);
    return NextResponse.json({ error: "No se pudieron consultar los pedidos." }, { status: 500 });
  }
}
