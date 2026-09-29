import { promoteDueCandidates } from "@/lib/catalog-admin";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const runPromotion = () => {
    void promoteDueCandidates().catch((error) => {
      console.error("candidate.scheduled_promotion", error);
    });
  };

  const firstRun = setTimeout(runPromotion, 5_000);
  firstRun.unref();
  const interval = setInterval(runPromotion, 60_000);
  interval.unref();
}
