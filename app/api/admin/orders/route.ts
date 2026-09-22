import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/lib/authorization";
import { listAdminOrders, requireOrderStaff } from "@/lib/admin-order-service";

export const runtime = "nodejs";

const statusSchema = z.enum(["pending", "confirmed", "cancelled"]);

export async function GET(request: Request) {
  try {
    const actor = await requireOrderStaff();
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
    return NextResponse.json({ error: "No se pudieron consultar los pedidos." }, { status: 500 });
  }
}
