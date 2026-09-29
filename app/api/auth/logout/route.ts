import { NextResponse } from "next/server";
import { revokeCurrentSession, sessionCookieName, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await revokeCurrentSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("auth.logout", error);
    return NextResponse.json({ error: "No se pudo cerrar sesión." }, { status: 500 });
  }
}
