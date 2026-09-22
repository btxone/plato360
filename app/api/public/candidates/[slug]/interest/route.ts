import { NextResponse } from "next/server";
import { z } from "zod";
import { CandidateNotFoundError, CandidatesFeatureDisabledError, registerCandidateInterest, requireCandidateSession } from "@/lib/candidate-service";
import { PublicSessionRequiredError } from "@/lib/public-session";

export const runtime = "nodejs";

const interestSchema = z.object({ email: z.string().trim().email().max(320), acceptedNotification: z.boolean().default(true) });

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireCandidateSession();
    const parsed = interestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "El email no es válido." }, { status: 400 });
    const { slug } = await context.params;
    const result = await registerCandidateInterest(session.locationId, slug, parsed.data.email, parsed.data.acceptedNotification);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof PublicSessionRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof CandidatesFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof CandidateNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "No se pudo registrar el interés." }, { status: 500 });
  }
}
