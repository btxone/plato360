import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCredentials, createSession, InvalidCredentialsError, minimumPasswordLength, sessionCookieName, sessionCookieOptions } from "@/lib/auth";
import { LoginRateLimitError } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(minimumPasswordLength).max(256),
});

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Usuario y contraseña son obligatorios." }, { status: 400 });
    const identity = await authenticateCredentials(parsed.data.username, parsed.data.password);
    const rawToken = await createSession(identity);
    const response = NextResponse.json({
      user: {
        id: identity.userId ?? "superadmin",
        principalLabel: identity.principalLabel,
        role: identity.role,
        locationId: identity.locationId,
        locationName: identity.locationName,
        locationLogoUrl: identity.locationLogoUrl,
        forcePasswordChange: identity.forcePasswordChange,
      },
    });
    response.cookies.set(sessionCookieName, rawToken, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof LoginRateLimitError) return NextResponse.json({ error: "Demasiados intentos. Probá nuevamente más tarde." }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    if (error instanceof InvalidCredentialsError) return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    console.error("auth.login", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
