import { NextResponse } from "next/server";
import { CandidateNotFoundError, CandidatesFeatureDisabledError, requireCandidateSession, voteForCandidate } from "@/lib/candidate-service";
import { PublicSessionRequiredError } from "@/lib/public-session";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireCandidateSession();
    const { slug } = await context.params;
    const result = await voteForCandidate(session.locationId, session.id, slug);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof PublicSessionRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof CandidatesFeatureDisabledError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof CandidateNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "No se pudo registrar el voto." }, { status: 500 });
  }
}
