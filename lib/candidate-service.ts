import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { candidateCampaigns, candidateInterests, candidateVotes } from "@/db/schema";
import { isFeatureEnabled } from "@/lib/features";
import { getCurrentPublicSession, PublicSessionRequiredError } from "@/lib/public-session";

export class CandidatesFeatureDisabledError extends Error {
  constructor() {
    super("La función de candidatos está desactivada para este local.");
    this.name = "CandidatesFeatureDisabledError";
  }
}

export class CandidateNotFoundError extends Error {
  constructor() {
    super("El plato en prueba no está disponible.");
    this.name = "CandidateNotFoundError";
  }
}

export async function requireCandidateSession() {
  const session = await getCurrentPublicSession();
  if (!session) throw new PublicSessionRequiredError();
  if (!(await isFeatureEnabled(session.locationId, "candidates"))) throw new CandidatesFeatureDisabledError();
  return session;
}

async function findCandidate(locationId: string, slug: string) {
  const db = getDb();
  const [candidate] = await db.select().from(candidateCampaigns).where(and(
    eq(candidateCampaigns.locationId, locationId),
    eq(candidateCampaigns.slug, slug),
    eq(candidateCampaigns.status, "published"),
  )).limit(1);
  if (!candidate) throw new CandidateNotFoundError();
  return candidate;
}

export async function voteForCandidate(locationId: string, dinerSessionId: string, slug: string) {
  const candidate = await findCandidate(locationId, slug);
  const db = getDb();
  const [created] = await db.insert(candidateVotes).values({ candidateId: candidate.id, dinerSessionId }).onConflictDoNothing().returning({ id: candidateVotes.id });
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(candidateVotes).where(eq(candidateVotes.candidateId, candidate.id));
  return { created: Boolean(created), candidateSlug: candidate.slug, votes: Number(count?.count ?? 0) };
}

export async function registerCandidateInterest(locationId: string, slug: string, email: string, acceptedNotification: boolean) {
  const candidate = await findCandidate(locationId, slug);
  const db = getDb();
  const emailNormalized = email.trim().toLowerCase();
  const [created] = await db.insert(candidateInterests).values({ candidateId: candidate.id, email: email.trim(), emailNormalized, acceptedNotification }).onConflictDoNothing().returning({ id: candidateInterests.id });
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(candidateInterests).where(eq(candidateInterests.candidateId, candidate.id));
  return { created: Boolean(created), candidateSlug: candidate.slug, notifyCount: Number(count?.count ?? 0) };
}
