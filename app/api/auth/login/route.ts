import { NextResponse } from "next/server";
import { adminSessionCookie, createAdminSession, getAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const credentials = getAdminCredentials();

  if (username !== credentials.username || password !== credentials.password) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createAdminSession(username);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", adminSessionCookie(token));
  return response;
}

