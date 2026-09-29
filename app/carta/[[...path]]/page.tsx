import CasaBrasaSite from "@/components/CasaBrasaSite";
import { getPublicCatalog } from "@/lib/catalog";
import { verifyQrToken } from "@/lib/qr";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CartaRoute({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<{ qr?: string | string[] }> }) {
  const path = (await params).path ?? [];
  const query = await searchParams;
  const qrToken = typeof query.qr === "string" ? query.qr : undefined;
  let preferredLocationId: string | undefined;
  if (qrToken) {
    try { preferredLocationId = verifyQrToken(qrToken).locationId; } catch { /* La sesión pública mostrará el error del QR si corresponde. */ }
  }
  if (path[0] === "restaurante") notFound();
  const catalog = await getPublicCatalog(preferredLocationId);
  if (path.length === 0 && !catalog.features.visualMenu && catalog.features.traditionalMenu) {
    redirect(`/carta/tradicional${qrToken ? `?qr=${encodeURIComponent(qrToken)}` : ""}`);
  }
  return <CasaBrasaSite initialCatalog={catalog} />;
}
