"use client";

import { ArrowLeft, ArrowRight, Check, ChevronLeft, Clock3, Minus, PackageOpen, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Dish } from "@/lib/catalog-types";
import { ArrowButton, BrandMark, money, type Cart } from "./shared";

export function Modal({ title, children, onClose, actionLabel }: { title: string; children: React.ReactNode; onClose: () => void; actionLabel?: string }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="info-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={17} /></button><span className="modal-star">✦</span><h2>{title}</h2><p>{children}</p>{actionLabel && <button className="modal-action" onClick={onClose}>{actionLabel}</button>}</div></div>;
}

type TrackedOrder = { id: string; referenceCode: string; status: "pending" | "confirmed" | "cancelled"; tableLabel: string; totalCents: number; createdAt: string; confirmedAt: string | null; cancelledAt: string | null };

function OrderStatus({ order, go, onClear }: { order: TrackedOrder; go: (href: string) => void; onClear: () => void }) {
  const isConfirmed = order.status === "confirmed";
  const isCancelled = order.status === "cancelled";
  return <section className={`order-status order-status--${order.status}`} aria-live="polite"><div className="order-status__icon" aria-hidden="true">{isConfirmed ? <Check size={38} strokeWidth={2.5} /> : isCancelled ? <X size={36} /> : <Clock3 size={36} />}</div><span className="eyebrow-dark">PEDIDO · {order.referenceCode}</span><h1>{isConfirmed ? "Pedido confirmado" : isCancelled ? "Pedido cancelado" : "Pedido pendiente"}</h1><p>{isConfirmed ? "El mozo confirmó tu pedido. Ya podés esperar a que lo preparen." : isCancelled ? "El restaurante no pudo confirmar este pedido. Podés volver a intentarlo." : "El mozo está revisando tu pedido. Te avisamos aquí apenas lo confirme."}</p><div className="order-status__details"><span>Mesa<strong>{order.tableLabel}</strong></span><span>Referencia<strong>#{order.referenceCode}</strong></span></div>{order.status === "pending" && <div className="order-status__waiting"><i /><span>Esperando confirmación del mozo</span></div>}{isConfirmed && <div className="order-status__confirmed"><Check size={15} /> Confirmado por el mozo</div>}<button className="back-to-menu" onClick={() => { onClear(); go("/carta"); }}><ArrowLeft size={16} /> Volver a la carta</button></section>;
}

export function OrderPage({ dishes, cart, onIncrement, onDecrement, onRemove, onClear, go, restoreTrackedOrder }: { dishes: Dish[]; cart: Cart; onIncrement: (slug: string) => void; onDecrement: (slug: string) => void; onRemove: (slug: string) => void; onClear: () => void; go: (href: string) => void; restoreTrackedOrder: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [sentOrder, setSentOrder] = useState<TrackedOrder | null>(null);
  const entries = Object.entries(cart).map(([slug, quantity]) => ({ dish: dishes.find((item) => item.slug === slug), quantity })).filter((entry): entry is { dish: Dish; quantity: number } => Boolean(entry.dish && entry.quantity > 0));
  const total = entries.reduce((sum, entry) => sum + entry.dish.price * entry.quantity, 0);
  useEffect(() => {
    if (!restoreTrackedOrder) return;
    let cancelled = false;
    const restoreOrder = async () => {
      let orderId = "";
      try { orderId = window.localStorage.getItem("plato360:last-order-id") ?? ""; } catch { return; }
      if (!orderId) return;
      try {
        const response = await fetch("/api/public/orders", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { orders?: TrackedOrder[] };
        const order = body.orders?.find((item) => item.id === orderId);
        if (order?.status === "cancelled") {
          onClear();
          try { window.localStorage.removeItem("plato360:last-order-id"); } catch { /* El pedido cancelado no debe volver a restaurarse. */ }
          return;
        }
        if (order && !cancelled) {
          onClear();
          setSentOrder(order);
        }
      } catch { /* El pedido se puede consultar de nuevo al enviar o actualizar. */ }
    };
    void restoreOrder();
    return () => { cancelled = true; };
  }, [restoreTrackedOrder]);
  useEffect(() => {
    if (!sentOrder || sentOrder.status !== "pending") return;
    let cancelled = false;
    const refreshStatus = async () => {
      try {
        const response = await fetch("/api/public/orders", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const body = await response.json() as { orders?: TrackedOrder[] };
        const latest = body.orders?.find((item) => item.id === sentOrder.id);
        if (latest && !cancelled) setSentOrder(latest);
      } catch { /* Se mantiene el estado pendiente hasta el próximo intento. */ }
    };
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sentOrder?.id, sentOrder?.status]);
  const submitOrder = async () => {
    setIsSubmitting(true);
    setSubmitMessage("");
    try {
      const response = await fetch("/api/public/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: entries.map(({ dish, quantity }) => ({ slug: dish.slug, quantity })) }) });
      const body = await response.json() as { order?: TrackedOrder; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo enviar el pedido.");
      if (!body.order) throw new Error("No se recibió la confirmación del pedido.");
      setSentOrder(body.order);
      try { window.localStorage.setItem("plato360:last-order-id", body.order.id); } catch { /* El seguimiento sigue activo mientras esta pantalla esté abierta. */ }
      onClear();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "No se pudo enviar el pedido.");
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  return <main className="order-page"><div className="order-wrap"><div className="order-header"><button onClick={() => go("/carta")} aria-label="Volver a la carta"><ChevronLeft size={20} /></button><BrandMark compact /><span className="order-header__label">MI PEDIDO</span></div>{sentOrder && entries.length === 0 ? <OrderStatus order={sentOrder} go={go} onClear={onClear} /> : <><div className="order-intro"><span className="eyebrow-dark">TU SELECCIÓN</span><h1>Lo que te<br /><em>tentó.</em></h1><p>Guardá tus favoritos y seguí recorriendo la carta.</p></div>{entries.length === 0 ? <div className="empty-order"><PackageOpen size={34} /><h2>Tu pedido está esperando un antojo.</h2><p>Agregá un plato para verlo aparecer acá.</p><ArrowButton onClick={() => go("/carta")} variant="dark">Seguir viendo la carta</ArrowButton></div> : <><div className="order-items">{entries.map(({ dish, quantity }) => <div className="order-item" key={dish.slug}><div className="order-item__thumb" style={{ background: `linear-gradient(145deg, ${dish.accent}, #231a14)` }}>{dish.emoji}</div><div className="order-item__info"><strong>{dish.name}</strong><small>{money(dish.price)} · {dish.category}</small><div className="quantity"><button onClick={() => onDecrement(dish.slug)} aria-label={`Restar ${dish.name}`}><Minus size={13} /></button><b>{quantity}</b><button onClick={() => onIncrement(dish.slug)} aria-label={`Sumar ${dish.name}`}><Plus size={13} /></button></div></div><strong className="order-item__price">{money(dish.price * quantity)}</strong><button className="order-item__remove" onClick={() => onRemove(dish.slug)} aria-label={`Eliminar ${dish.name}`}><X size={15} /></button></div>)}</div><div className="order-total"><span>Total <small>Tu selección</small></span><strong>{money(total)}</strong></div><button className="complete-order" disabled={isSubmitting} onClick={() => void submitOrder()}>{isSubmitting ? "Enviando…" : "Enviar pedido"} <ArrowRight size={18} /></button><button className="back-to-menu" onClick={() => go("/carta")}><ArrowLeft size={16} /> Seguir viendo la carta</button></>}</>}</div>{showModal && <Modal title="No pudimos enviarlo" onClose={() => setShowModal(false)} actionLabel="Entendido">{submitMessage}</Modal>}</main>;
}
