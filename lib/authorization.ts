import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, auditLogs, locations, users } from "@/db/schema";
import { getCurrentSession, type CurrentSession } from "@/lib/auth";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Se requiere una sesión autenticada.");
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor() {
    super("No tenés permisos para realizar esta acción.");
    this.name = "PermissionDeniedError";
  }
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new AuthenticationRequiredError();
  return session;
}

export function canManageRole(actorRole: CurrentSession["role"], targetRole: "admin" | "mozo") {
  return actorRole === "superadmin" || (actorRole === "admin" && targetRole === "mozo");
}

export function assertCanManageRole(actor: CurrentSession, targetRole: "admin" | "mozo") {
  if (!canManageRole(actor.role, targetRole)) throw new PermissionDeniedError();
}

export function assertSameLocation(actor: CurrentSession, targetLocationId: string) {
  if (actor.role !== "superadmin" && actor.locationId !== targetLocationId) throw new PermissionDeniedError();
}

export async function resolveLocationId(actor: CurrentSession, requestedLocationId?: string) {
  const db = getDb();
  if (actor.role !== "superadmin") {
    if (!actor.locationId) throw new PermissionDeniedError();
    return actor.locationId;
  }
  if (requestedLocationId) {
    const [location] = await db.select({ id: locations.id }).from(locations).where(eq(locations.id, requestedLocationId)).limit(1);
    if (!location) throw new PermissionDeniedError();
    return location.id;
  }
  const [location] = await db.select({ id: locations.id }).from(locations).orderBy(asc(locations.createdAt)).limit(1);
  if (!location) throw new PermissionDeniedError();
  return location.id;
}

export async function writeUserAudit(actor: CurrentSession, action: string, targetUserId: string, locationId: string, metadata?: Record<string, unknown>) {
  const db = getDb();
  await db.insert(auditLogs).values({
    locationId,
    actorUserId: actor.userId,
    actorPrincipal: actor.principalLabel,
    action,
    entityType: "user",
    entityId: targetUserId,
    metadata,
  });
}

export function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    locationId: user.locationId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    forcePasswordChange: user.forcePasswordChange,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function revokeUserSessions(userId: string) {
  const db = getDb();
  await db.update(authSessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}
