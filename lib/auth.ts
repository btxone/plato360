import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { auditLogs, authSessions, users, userRole } from "@/db/schema";
import { assertLoginAllowed, registerLoginFailure, registerLoginSuccess } from "@/lib/auth-rate-limit";

export const sessionCookieName = "plato360_session";
export const sessionTtlSeconds = 12 * 60 * 60;
export const maxFailedLoginAttempts = 5;
export const loginLockMinutes = 15;

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export type SessionRole = "superadmin" | (typeof userRole.enumValues)[number];

export type CurrentSession = {
  id: string;
  subjectType: "user" | "superadmin";
  principalLabel: string;
  userId: string | null;
  locationId: string | null;
  role: SessionRole;
  forcePasswordChange: boolean;
};

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciales inválidas.");
    this.name = "InvalidCredentialsError";
  }
}

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export async function verifyPassword(password: string, passwordHash: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function getSuperAdminConfig() {
  const username = process.env.SUPERADMIN_USERNAME?.trim();
  const passwordHash = process.env.SUPERADMIN_PASSWORD_HASH?.trim();
  if (!username || !passwordHash) {
    throw new AuthConfigurationError("Faltan SUPERADMIN_USERNAME o SUPERADMIN_PASSWORD_HASH.");
  }
  return { username: normalizeUsername(username), passwordHash };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds,
  };
}

export function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, passwordOptions);
}

async function writeAudit(input: {
  locationId?: string | null;
  actorUserId?: string | null;
  actorPrincipal: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    locationId: input.locationId ?? null,
    actorUserId: input.actorUserId ?? null,
    actorPrincipal: input.actorPrincipal,
    action: input.action,
    metadata: input.metadata,
  });
}

async function registerFailedUserLogin(user: typeof users.$inferSelect) {
  const db = getDb();
  const attempts = user.failedLoginAttempts + 1;
  const lockedUntil = attempts >= maxFailedLoginAttempts
    ? new Date(Date.now() + loginLockMinutes * 60 * 1000)
    : user.lockedUntil;
  await db.update(users).set({ failedLoginAttempts: attempts, lockedUntil, updatedAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({ locationId: user.locationId, actorPrincipal: user.username, action: "auth.login_failed", metadata: { attempts } });
}

export async function authenticateCredentials(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) throw new InvalidCredentialsError();
  assertLoginAllowed(username);

  const superAdmin = getSuperAdminConfig();
  if (username === superAdmin.username) {
    if (!(await verifyPassword(password, superAdmin.passwordHash))) {
      registerLoginFailure(username);
      await writeAudit({ actorPrincipal: username, action: "auth.login_failed", metadata: { subjectType: "superadmin" } });
      throw new InvalidCredentialsError();
    }
    registerLoginSuccess(username);
    await writeAudit({ actorPrincipal: username, action: "auth.login_succeeded", metadata: { subjectType: "superadmin" } });
    return {
      subjectType: "superadmin" as const,
      userId: null,
      locationId: null,
      principalLabel: username,
      role: "superadmin" as const,
      forcePasswordChange: false,
    };
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || user.status !== "active" || (user.lockedUntil && user.lockedUntil > new Date())) {
    registerLoginFailure(username);
    await writeAudit({ actorPrincipal: username, action: "auth.login_failed", metadata: { subjectType: "user" } });
    throw new InvalidCredentialsError();
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    registerLoginFailure(username);
    await registerFailedUserLogin(user);
    throw new InvalidCredentialsError();
  }

  registerLoginSuccess(username);
  await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({ locationId: user.locationId, actorUserId: user.id, actorPrincipal: user.username, action: "auth.login_succeeded", metadata: { role: user.role } });
  return {
    subjectType: "user" as const,
    userId: user.id,
    locationId: user.locationId,
    principalLabel: user.username,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  };
}

export async function createSession(identity: Awaited<ReturnType<typeof authenticateCredentials>>) {
  const db = getDb();
  const rawToken = createOpaqueToken();
  await db.insert(authSessions).values({
    tokenDigest: digestToken(rawToken),
    subjectType: identity.subjectType,
    userId: identity.userId,
    principalLabel: identity.principalLabel,
    expiresAt: new Date(Date.now() + sessionTtlSeconds * 1000),
    lastSeenAt: new Date(),
  });
  return rawToken;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(sessionCookieName)?.value;
  if (!rawToken) return null;

  const db = getDb();
  const [row] = await db.select({ session: authSessions, user: users }).from(authSessions).leftJoin(users, eq(authSessions.userId, users.id)).where(and(
    eq(authSessions.tokenDigest, digestToken(rawToken)),
    isNull(authSessions.revokedAt),
    gt(authSessions.expiresAt, new Date()),
  )).limit(1);
  if (!row) return null;
  if (row.session.subjectType === "user" && (!row.user || row.user.status !== "active")) return null;

  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, row.session.id));
  return {
    id: row.session.id,
    subjectType: row.session.subjectType,
    principalLabel: row.session.principalLabel,
    userId: row.session.userId,
    locationId: row.user?.locationId ?? null,
    role: row.session.subjectType === "superadmin" ? "superadmin" : row.user?.role ?? "mozo",
    forcePasswordChange: row.user?.forcePasswordChange ?? false,
  } satisfies CurrentSession;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(sessionCookieName)?.value;
  if (!rawToken) return null;
  const db = getDb();
  const [session] = await db.update(authSessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(authSessions.tokenDigest, digestToken(rawToken)), isNull(authSessions.revokedAt))).returning({ id: authSessions.id, principalLabel: authSessions.principalLabel, userId: authSessions.userId });
  if (session) await writeAudit({ actorUserId: session.userId, actorPrincipal: session.principalLabel, action: "auth.logout" });
  return session ?? null;
}

export async function changePassword(session: CurrentSession, currentPassword: string, newPassword: string) {
  if (session.subjectType !== "user" || !session.userId) throw new AuthConfigurationError("El SuperAdmin cambia sus credenciales mediante secretos del VPS.");
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) throw new InvalidCredentialsError();
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, forcePasswordChange: false, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({ locationId: user.locationId, actorUserId: user.id, actorPrincipal: user.username, action: "auth.password_changed" });
}
