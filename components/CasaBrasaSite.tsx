"use client";


import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Candidate, Dish } from "@/lib/catalog-types";
import type { CatalogSnapshot } from "@/lib/catalog";
import { OrderPage } from "@/components/casa-brasa/order";
import { CandidateDetailPage, UpcomingPage } from "@/components/casa-brasa/upcoming";
import { ClientMenuPage, DishDetailPage, NotFoundState, TraditionalMenuPage } from "@/components/casa-brasa/client";
import {
  type Cart,
  BrandMark,
  Toast,
  type ToastMessage,
  useNavigation,
} from "@/components/casa-brasa/shared";

const qrSessionStorageKey = "plato360:qr-session-active";
const qrSessionTabKey = "plato360:qr-session-tab";

function getTabId() {
  const prefix = "plato360-tab-";
  if (window.name.startsWith(prefix)) return window.name;
  const tabId = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.name = tabId;
  return tabId;
}

function QrRequiredPage({ go }: { go: (href: string) => void }) {
  return <main className="order-page"><div className="order-wrap"><div className="order-header"><button onClick={() => go("/carta")} aria-label="Volver a la carta"><BrandMark compact /></button><span className="order-header__label">MI PEDIDO</span></div><div className="empty-order"><span className="empty-order__icon">⌁</span><h2>Escaneá el QR de tu mesa</h2><p>Para pedir comida tenés que entrar a la carta desde el código QR de tu mesa.</p><button className="back-to-menu" onClick={() => go("/carta")}>Volver a la carta</button></div></div></main>;
}

function FeatureUnavailablePage({ title, fallbackHref, go }: { title: string; fallbackHref?: string; go: (href: string) => void }) {
  return <main className="simple-dark-page"><BrandMark /><div className="not-found"><span className="not-found__icon">✦</span><h1>{title}</h1><p>Esta opción no está disponible para este local.</p>{fallbackHref && <button className="back-to-menu" onClick={() => go(fallbackHref)}>Volver a la carta</button>}</div></main>;
}

export default function CasaBrasaSite({ initialCatalog }: { initialCatalog: CatalogSnapshot }) {
  const pathname = usePathname();
  const go = useNavigation();
  const catalog = initialCatalog;
  const [cart, setCart] = useState<Cart>({});
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastMessage>(null);
  const [hydrated, setHydrated] = useState(false);
  const [qrSessionReady, setQrSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const savedCart = window.localStorage.getItem("casa-brasa-cart");
        const savedVotes = window.localStorage.getItem("casa-brasa-votes");
        const savedNotified = window.localStorage.getItem("casa-brasa-notified");
        if (savedCart) setCart(JSON.parse(savedCart));
        if (savedVotes) setVotes(JSON.parse(savedVotes));
        if (savedNotified) setNotified(JSON.parse(savedNotified));
      } catch {
        // The app keeps working even when browser storage is unavailable.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => { if (hydrated) window.localStorage.setItem("casa-brasa-cart", JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("casa-brasa-votes", JSON.stringify(votes)); }, [votes, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("casa-brasa-notified", JSON.stringify(notified)); }, [notified, hydrated]);

  useEffect(() => {
    const qrToken = new URLSearchParams(window.location.search).get("qr");
    const tabId = getTabId();
    let sessionStorageActive = false;
    try { sessionStorageActive = window.sessionStorage.getItem(qrSessionStorageKey) === "1" && window.sessionStorage.getItem(qrSessionTabKey) === tabId; } catch { /* La navegación sigue funcionando sin sessionStorage. */ }
    let cancelled = false;
    const readyTimer = window.setTimeout(() => { if (!cancelled) setQrSessionReady(Boolean(qrToken) ? false : sessionStorageActive); }, 0);
    if (!qrToken) return () => { cancelled = true; window.clearTimeout(readyTimer); };
    const cleanUrl = () => window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    void fetch("/api/public/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    }).then(async (response) => {
      const body = await response.json() as { session?: { id: string; tableLabel: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo conectar la mesa.");
      try { window.localStorage.removeItem("plato360:last-order-id"); } catch { /* El seguimiento anterior no debe pasar a la nueva visita. */ }
      try { window.sessionStorage.setItem(qrSessionStorageKey, "1"); window.sessionStorage.setItem(qrSessionTabKey, tabId); } catch { /* La sesión queda protegida por la cookie del servidor. */ }
      if (!cancelled) setQrSessionReady(true);
      if (!cancelled && body.session) setToast({ id: Date.now(), message: `Mesa ${body.session.tableLabel} conectada` });
    }).catch((error: unknown) => {
      try { window.sessionStorage.removeItem(qrSessionStorageKey); window.sessionStorage.removeItem(qrSessionTabKey); } catch { /* La navegación sigue funcionando sin sessionStorage. */ }
      if (!cancelled) setQrSessionReady(false);
      if (!cancelled) setToast({ id: Date.now(), message: error instanceof Error ? error.message : "No se pudo conectar la mesa." });
    }).finally(cleanUrl);
    return () => { cancelled = true; window.clearTimeout(readyTimer); };
  }, []);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const addToCart = (dish: Dish) => {
    if (!qrSessionReady) { showToast("Escaneá el código QR de tu mesa para pedir."); return; }
    setCart((current) => ({ ...current, [dish.slug]: (current[dish.slug] ?? 0) + 1 }));
  };
  const increment = (slug: string) => setCart((current) => ({ ...current, [slug]: (current[slug] ?? 0) + 1 }));
  const decrement = (slug: string) => setCart((current) => { const next = { ...current }; if ((next[slug] ?? 0) <= 1) delete next[slug]; else next[slug] -= 1; return next; });
  const remove = (slug: string) => setCart((current) => { const next = { ...current }; delete next[slug]; return next; });
  const showToast = (message: string) => setToast({ id: Date.now(), message });
  const sendCandidateTelemetry = useCallback((candidate: Candidate, eventType: "impression" | "detail_open" | "vote" | "interest", payload?: Record<string, unknown>) => {
    if (!qrSessionReady || !catalog.features.telemetry) return;
    void fetch("/api/public/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ events: [{ eventType, candidateSlug: candidate.slug, idempotencyKey: `${eventType}:${candidate.slug}:${Date.now()}:${Math.random().toString(36).slice(2)}`, payload }] }),
    }).catch(() => undefined);
  }, [qrSessionReady, catalog.features.telemetry]);
  const registerVote = async (candidate: Candidate) => {
    if (votes[candidate.slug]) return true;
    setVotes((current) => ({ ...current, [candidate.slug]: true }));
    try {
      const response = await fetch(`/api/public/candidates/${encodeURIComponent(candidate.slug)}/vote`, { method: "POST" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar el voto.");
      sendCandidateTelemetry(candidate, "vote");
      return true;
    } catch (error) {
      setVotes((current) => { const next = { ...current }; delete next[candidate.slug]; return next; });
      showToast(error instanceof Error ? error.message : "No se pudo registrar el voto.");
      return false;
    }
  };
  const registerNotify = async (candidate: Candidate, email: string) => {
    if (notified[candidate.slug]) return true;
    try {
      const response = await fetch(`/api/public/candidates/${encodeURIComponent(candidate.slug)}/interest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, acceptedNotification: true }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar el interés.");
      setNotified((current) => ({ ...current, [candidate.slug]: true }));
      sendCandidateTelemetry(candidate, "interest");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo registrar el interés.");
      return false;
    }
  };

  const parts = pathname.split("/").filter(Boolean);
  const fallbackCarta = catalog.features.visualMenu ? "/carta" : catalog.features.traditionalMenu ? "/carta/tradicional" : undefined;
  if (parts.length === 0) {
    if (!catalog.features.visualMenu) return <FeatureUnavailablePage title="La carta visual no está disponible." fallbackHref={catalog.features.traditionalMenu ? "/carta/tradicional" : undefined} go={go} />;
    return <ClientMenuPage dishes={catalog.dishes} categories={catalog.categories} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} ordersEnabled={catalog.features.orders} features={catalog.features} />;
  }
  if (parts[0] !== "carta") return <><NotFoundState go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "plato" && parts[2]) {
    const dish = catalog.dishes.find((item) => item.slug === parts[2]);
    return <>{!catalog.features.visualMenu ? <FeatureUnavailablePage title="La carta visual no está disponible." fallbackHref={fallbackCarta} go={go} /> : dish ? <DishDetailPage dish={dish} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} ordersEnabled={catalog.features.orders} /> : <NotFoundState go={go} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  }
  if (parts[1] === "pedido" && !catalog.features.orders) return <FeatureUnavailablePage title="Los pedidos no están disponibles." fallbackHref={fallbackCarta} go={go} />;
  if (parts[1] === "pedido" && !qrSessionReady) return <><QrRequiredPage go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "pedido") return <><OrderPage dishes={catalog.dishes} cart={cart} onIncrement={increment} onDecrement={decrement} onRemove={remove} onClear={() => setCart({})} go={go} restoreTrackedOrder={qrSessionReady && hydrated} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "proximamente" && parts[2]) {
    const candidate = catalog.candidates.find((item) => item.slug === parts[2]);
    return <>{!catalog.features.candidates ? <FeatureUnavailablePage title="Decides tú no está disponible." fallbackHref={fallbackCarta} go={go} /> : candidate ? <CandidateDetailPage candidate={candidate} voted={Boolean(votes[candidate.slug])} notified={Boolean(notified[candidate.slug])} onVote={registerVote} onNotify={registerNotify} onTelemetry={sendCandidateTelemetry} go={go} onToast={showToast} /> : <NotFoundState go={go} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  }
  if (parts[1] === "proximamente") return <>{!catalog.features.candidates ? <FeatureUnavailablePage title="Decides tú no está disponible." fallbackHref={fallbackCarta} go={go} /> : <UpcomingPage candidates={catalog.candidates} votes={votes} cartCount={cartCount} onVote={registerVote} onNotify={registerNotify} onTelemetry={sendCandidateTelemetry} go={go} onToast={showToast} ordersEnabled={catalog.features.orders} features={catalog.features} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "tradicional") return <>{!catalog.features.traditionalMenu ? <FeatureUnavailablePage title="La carta tradicional no está disponible." fallbackHref={catalog.features.visualMenu ? "/carta" : undefined} go={go} /> : <TraditionalMenuPage dishes={catalog.dishes} categories={catalog.categories} location={catalog.location} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} ordersEnabled={catalog.features.orders} visualEnabled={catalog.features.visualMenu} features={catalog.features} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "restaurante") return <><NotFoundState go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (!catalog.features.visualMenu) return <><FeatureUnavailablePage title="La carta visual no está disponible." fallbackHref={fallbackCarta} go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  return <><ClientMenuPage dishes={catalog.dishes} categories={catalog.categories} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} ordersEnabled={catalog.features.orders} features={catalog.features} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
}
