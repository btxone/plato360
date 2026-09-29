import { NextResponse } from "next/server";
import { z } from "zod";
import { PublicSessionRequiredError } from "@/lib/public-session";
import { recordTelemetry, requireTelemetrySession, telemetryEventTypes, TelemetryFeatureDisabledError, TelemetryReferenceError } from "@/lib/telemetry-service";

export const runtime = "nodejs";

const eventSchema = z.object({
  eventType: z.enum(telemetryEventTypes),
  idempotencyKey: z.string().trim().min(8).max(120),
  occurredAt: z.coerce.date().optional(),
  productSlug: z.string().trim().min(1).max(120).optional(),
  candidateSlug: z.string().trim().min(1).max(120).optional(),
  orderId: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
}).superRefine((event, context) => {
  if (event.productSlug && event.candidateSlug) context.addIssue({ code: z.ZodIssueCode.custom, message: "Un evento no puede apuntar a producto y candidato a la vez.", path: ["productSlug"] });
});

const telemetrySchema = z.object({ events: z.array(eventSchema).min(1).max(100) });

export async function POST(request: Request) {
  try {
    const session = await requireTelemetrySession();
    const parsed = telemetrySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Eventos de telemetría inválidos.", details: parsed.error.flatten() }, { status: 400 });
    const result = await recordTelemetry(session, parsed.data.events);
    const response = NextResponse.json(result, { status: 202 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof PublicSessionRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof TelemetryFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof TelemetryReferenceError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo registrar la telemetría." }, { status: 500 });
  }
}
