import CasaBrasaSite from "@/components/CasaBrasaSite";
import { getPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <CasaBrasaSite initialCatalog={await getPublicCatalog()} />;
}
