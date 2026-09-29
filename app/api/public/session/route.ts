import { NextResponse } from "next/server";
import { z } from "zod";
import { InvalidQrError } from "@/lib/qr";
import { openPublicSession, publicSessionCookieName, publicSessionTtlSeconds, publicSessionView } from "@/lib/public-session";

export const runtime = "nodejs";

const sessionSchema = z.object({ qrToken: z.string().trim().min(20).max(2000) });

function clearPublicSession(response: NextResponse) {
  response.cookies.set({
    name: publicSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: Request) {
  try {
    const parsed = sessionSchema.safeParse(await request.json());
    if (!parsed.success) return clearPublicSession(NextResponse.json({ error: "Token QR inválido." }, { status: 400 }));
    const result = await openPublicSession(parsed.data.qrToken);
    const response = NextResponse.json({ session: publicSessionView(result.session), created: result.created }, { status: result.created ? 201 : 200 });
    response.cookies.set({
      name: publicSessionCookieName,
      value: result.rawToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: publicSessionTtlSeconds,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof InvalidQrError) return clearPublicSession(NextResponse.json({ error: error.message }, { status: 400 }));
    return NextResponse.json({ error: "No se pudo abrir la sesión de la mesa." }, { status: 500 });
  }
}
