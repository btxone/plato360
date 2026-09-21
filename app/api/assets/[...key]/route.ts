import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

type AssetRouteContext = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: AssetRouteContext) {
  if (!env.BUCKET) return NextResponse.json({ error: "Asset storage unavailable" }, { status: 503 });
  const { key } = await context.params;
  const object = await env.BUCKET.get(key.map((part) => decodeURIComponent(part)).join("/"));
  if (!object) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
