import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "plato360",
    status: "ok",
  });
}
