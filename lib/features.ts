import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { featureFlags } from "@/db/schema";

export const featureKeys = [
  "visual_menu",
  "traditional_menu",
  "orders",
  "candidates",
  "fixed_qr",
  "dynamic_qr",
  "telemetry",
  "video_generation",
] as const;

export type FeatureKey = (typeof featureKeys)[number];

export const featureDefaults: Record<FeatureKey, boolean> = {
  visual_menu: true,
  traditional_menu: true,
  orders: true,
  candidates: true,
  fixed_qr: true,
  dynamic_qr: true,
  telemetry: true,
  video_generation: false,
};

export const featureLabels: Record<FeatureKey, string> = {
  visual_menu: "Carta visual",
  traditional_menu: "Carta tradicional",
  orders: "Pedidos",
  candidates: "Decides tú",
  fixed_qr: "QR fijo",
  dynamic_qr: "QR dinámico",
  telemetry: "Telemetría",
  video_generation: "Generación de videos",
};

export async function getFeatureState(locationId: string) {
  const db = getDb();
  const rows = await db.select({ featureKey: featureFlags.featureKey, enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.locationId, locationId));
  const saved = new Map(rows.map((row) => [row.featureKey, row.enabled]));
  return featureKeys.map((key) => ({ key, label: featureLabels[key], enabled: saved.get(key) ?? featureDefaults[key], isDefault: !saved.has(key) }));
}

export async function isFeatureEnabled(locationId: string, key: FeatureKey) {
  const state = await getFeatureState(locationId);
  return state.find((feature) => feature.key === key)?.enabled ?? featureDefaults[key];
}

export async function setFeatureState(locationId: string, key: FeatureKey, enabled: boolean) {
  const db = getDb();
  const [row] = await db.insert(featureFlags).values({ locationId, featureKey: key, enabled }).onConflictDoUpdate({ target: [featureFlags.locationId, featureFlags.featureKey], set: { enabled, updatedAt: new Date() } }).returning({ featureKey: featureFlags.featureKey, enabled: featureFlags.enabled });
  return row;
}

export async function getStoredFeature(locationId: string, key: FeatureKey) {
  const db = getDb();
  const [row] = await db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(and(eq(featureFlags.locationId, locationId), eq(featureFlags.featureKey, key))).limit(1);
  return row?.enabled ?? featureDefaults[key];
}
