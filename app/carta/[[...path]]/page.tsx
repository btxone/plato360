import CasaBrasaSite from "@/components/CasaBrasaSite";
import { getPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartaRoute() {
  return <CasaBrasaSite initialCatalog={await getPublicCatalog()} />;
}
