import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { candidates, subscriptions } from "@/db/schema";

const restaurantId = "casa-brasa";
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.restaurantId, restaurantId), eq(candidates.slug, slug), eq(candidates.active, 1)))
      .limit(1);

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const [existingSubscription] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.candidateId, candidate.id), eq(subscriptions.email, email)))
      .limit(1);

    if (!existingSubscription) {
      await db.insert(subscriptions).values({ candidateId: candidate.id, email });
    }

    return NextResponse.json({
      ok: true,
      alreadySubscribed: Boolean(existingSubscription),
    }, { status: existingSubscription ? 200 : 201 });
  } catch (error) {
    console.error("[api/tu-decides/subscriptions] failed to register subscription", error);
    return NextResponse.json({ error: "Subscription unavailable" }, { status: 503 });
  }
}

