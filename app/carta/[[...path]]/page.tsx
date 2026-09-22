import CasaBrasaSite from "@/components/CasaBrasaSite";
import { getPublicCatalog } from "@/lib/catalog";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CartaRoute({ params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path ?? [];
  if (path[0] === "restaurante") notFound();
  return <CasaBrasaSite initialCatalog={await getPublicCatalog()} />;
}
