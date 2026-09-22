"use client";


import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Candidate } from "@/data/candidates";
import type { Dish } from "@/data/dishes";
import type { CatalogSnapshot } from "@/lib/catalog";
import { Landing } from "@/components/casa-brasa/landing";
import { OrderPage } from "@/components/casa-brasa/order";
import { CandidateDetailPage, UpcomingPage } from "@/components/casa-brasa/upcoming";
import { ClientMenuPage, DishDetailPage, NotFoundState, TraditionalMenuPage } from "@/components/casa-brasa/client";
import { RestaurantOverview, RestaurantTests } from "@/components/casa-brasa/dashboard";
import {
  type Cart,
  Toast,
  type ToastMessage,
  useNavigation,
} from "@/components/casa-brasa/shared";

export default function CasaBrasaSite({ initialCatalog }: { initialCatalog: CatalogSnapshot }) {
  const pathname = usePathname();
  const go = useNavigation();
  const catalog = initialCatalog;
  const [cart, setCart] = useState<Cart>({});
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastMessage>(null);
  const [hydrated, setHydrated] = useState(false);

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

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const addToCart = (dish: Dish) => setCart((current) => ({ ...current, [dish.slug]: (current[dish.slug] ?? 0) + 1 }));
  const increment = (slug: string) => setCart((current) => ({ ...current, [slug]: (current[slug] ?? 0) + 1 }));
  const decrement = (slug: string) => setCart((current) => { const next = { ...current }; if ((next[slug] ?? 0) <= 1) delete next[slug]; else next[slug] -= 1; return next; });
  const remove = (slug: string) => setCart((current) => { const next = { ...current }; delete next[slug]; return next; });
  const showToast = (message: string) => setToast({ id: Date.now(), message });
  const registerVote = (candidate: Candidate) => setVotes((current) => current[candidate.slug] ? current : ({ ...current, [candidate.slug]: true }));
  const registerNotify = (candidate: Candidate) => setNotified((current) => current[candidate.slug] ? current : ({ ...current, [candidate.slug]: true }));

  const parts = pathname.split("/").filter(Boolean);
  const isLanding = parts.length === 0;
  if (isLanding) return <><Landing go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[0] !== "carta") return <><NotFoundState go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "tradicional") return <><TraditionalMenuPage dishes={catalog.dishes} categories={catalog.categories} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "plato" && parts[2]) {
    const dish = catalog.dishes.find((item) => item.slug === parts[2]);
    return <>{dish ? <DishDetailPage dish={dish} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} /> : <NotFoundState go={go} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  }
  if (parts[1] === "pedido") return <><OrderPage dishes={catalog.dishes} cart={cart} onIncrement={increment} onDecrement={decrement} onRemove={remove} go={go} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "proximamente" && parts[2]) {
    const candidate = catalog.candidates.find((item) => item.slug === parts[2]);
    return <>{candidate ? <CandidateDetailPage candidate={candidate} voted={Boolean(votes[candidate.slug])} notified={Boolean(notified[candidate.slug])} onVote={registerVote} onNotify={registerNotify} go={go} onToast={showToast} /> : <NotFoundState go={go} />}<Toast toast={toast} onClose={() => setToast(null)} /></>;
  }
  if (parts[1] === "proximamente") return <><UpcomingPage candidates={catalog.candidates} votes={votes} cartCount={cartCount} onVote={registerVote} onNotify={registerNotify} go={go} onToast={showToast} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
  if (parts[1] === "restaurante" && parts[2] === "pruebas") return <RestaurantTests go={go} />;
  if (parts[1] === "restaurante") return <RestaurantOverview go={go} />;
  return <><ClientMenuPage dishes={catalog.dishes} categories={catalog.categories} cartCount={cartCount} onAdd={addToCart} go={go} onToast={showToast} /><Toast toast={toast} onClose={() => setToast(null)} /></>;
}
