import { NextResponse } from "next/server";
import { z } from "zod";
import { changePassword, getCurrentSession, InvalidCredentialsError } from "@/lib/auth";

export const runtime = "nodejs";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 12 caracteres." }, { status: 400 });
  try {
    await changePassword(session, parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) return NextResponse.json({ error: "La contraseña actual no es válida." }, { status: 401 });
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 400 });
  }
}
