import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicOrder, listPublicOrders, OrdersFeatureDisabledError, ProductUnavailableError, publicOrderView, requireOrdersSession } from "@/lib/order-service";
import { PublicSessionRequiredError } from "@/lib/public-session";

export const runtime = "nodejs";

const orderSchema = z.object({
  items: z.array(z.object({
    slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(20),
    notes: z.string().trim().max(300).optional(),
  })).min(1).max(30).superRefine((items, context) => {
    const slugs = items.map((item) => item.slug);
    if (new Set(slugs).size !== slugs.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "No repitas platos en el mismo pedido.", path: ["items"] });
  }),
  notes: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requireOrdersSession();
    const response = NextResponse.json({ orders: await listPublicOrders(session) });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof PublicSessionRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof OrdersFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "No se pudieron consultar tus pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireOrdersSession();
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "El pedido no es válido.", details: parsed.error.flatten() }, { status: 400 });
    const result = await createPublicOrder(session, parsed.data);
    const response = NextResponse.json({ order: publicOrderView(result.order, result.items) }, { status: 201 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof PublicSessionRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof OrdersFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof ProductUnavailableError) return NextResponse.json({ error: error.message, slugs: error.slugs }, { status: 409 });
    return NextResponse.json({ error: "No se pudo enviar el pedido." }, { status: 500 });
  }
}
