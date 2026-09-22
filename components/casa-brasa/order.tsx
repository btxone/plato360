"use client";

import { ArrowLeft, ArrowRight, ChevronLeft, Minus, PackageOpen, Plus, X } from "lucide-react";
import { useState } from "react";
import type { Dish } from "@/lib/catalog-types";
import { ArrowButton, BrandMark, money, type Cart } from "./shared";

export function Modal({ title, children, onClose, actionLabel }: { title: string; children: React.ReactNode; onClose: () => void; actionLabel?: string }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="info-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={17} /></button><span className="modal-star">✦</span><h2>{title}</h2><p>{children}</p>{actionLabel && <button className="modal-action" onClick={onClose}>{actionLabel}</button>}</div></div>;
}

export function OrderPage({ dishes, cart, onIncrement, onDecrement, onRemove, onClear, go }: { dishes: Dish[]; cart: Cart; onIncrement: (slug: string) => void; onDecrement: (slug: string) => void; onRemove: (slug: string) => void; onClear: () => void; go: (href: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [sentOrderId, setSentOrderId] = useState<string | null>(null);
  const entries = Object.entries(cart).map(([slug, quantity]) => ({ dish: dishes.find((item) => item.slug === slug), quantity })).filter((entry): entry is { dish: Dish; quantity: number } => Boolean(entry.dish && entry.quantity > 0));
  const total = entries.reduce((sum, entry) => sum + entry.dish.price * entry.quantity, 0);
  const submitOrder = async () => {
    setIsSubmitting(true);
    setSubmitMessage("");
    try {
      const response = await fetch("/api/public/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: entries.map(({ dish, quantity }) => ({ slug: dish.slug, quantity })) }) });
      const body = await response.json() as { order?: { id: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo enviar el pedido.");
      setSentOrderId(body.order?.id ?? null);
      setSubmitMessage("Tu pedido fue enviado a la atención del restaurante.");
      onClear();
      setShowModal(true);
    } catch (error) {
      setSentOrderId(null);
      setSubmitMessage(error instanceof Error ? error.message : "No se pudo enviar el pedido.");
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  return <main className="order-page"><div className="order-wrap"><div className="order-header"><button onClick={() => go("/carta")} aria-label="Volver a la carta"><ChevronLeft size={20} /></button><BrandMark compact /><span className="order-header__label">MI PEDIDO</span></div><div className="order-intro"><span className="eyebrow-dark">TU SELECCIÓN</span><h1>Lo que te<br /><em>tentó.</em></h1><p>Guardá tus favoritos y seguí recorriendo la carta.</p></div>{entries.length === 0 ? <div className="empty-order"><PackageOpen size={34} /><h2>Tu pedido está esperando un antojo.</h2><p>Agregá un plato para verlo aparecer acá.</p><ArrowButton onClick={() => go("/carta")} variant="dark">Seguir viendo la carta</ArrowButton></div> : <><div className="order-items">{entries.map(({ dish, quantity }) => <div className="order-item" key={dish.slug}><div className="order-item__thumb" style={{ background: `linear-gradient(145deg, ${dish.accent}, #231a14)` }}>{dish.emoji}</div><div className="order-item__info"><strong>{dish.name}</strong><small>{money(dish.price)} · {dish.category}</small><div className="quantity"><button onClick={() => onDecrement(dish.slug)} aria-label={`Restar ${dish.name}`}><Minus size={13} /></button><b>{quantity}</b><button onClick={() => onIncrement(dish.slug)} aria-label={`Sumar ${dish.name}`}><Plus size={13} /></button></div></div><strong className="order-item__price">{money(dish.price * quantity)}</strong><button className="order-item__remove" onClick={() => onRemove(dish.slug)} aria-label={`Eliminar ${dish.name}`}><X size={15} /></button></div>)}</div><div className="order-total"><span>Total <small>Tu selección</small></span><strong>{money(total)}</strong></div><button className="complete-order" disabled={isSubmitting} onClick={() => void submitOrder()}>{isSubmitting ? "Enviando…" : "Enviar pedido"} <ArrowRight size={18} /></button><button className="back-to-menu" onClick={() => go("/carta")}><ArrowLeft size={16} /> Seguir viendo la carta</button></>}</div>{showModal && <Modal title={sentOrderId ? "Pedido enviado" : "No pudimos enviarlo"} onClose={() => setShowModal(false)} actionLabel="Entendido">{submitMessage}{sentOrderId ? ` Código de referencia: ${sentOrderId.slice(0, 8).toUpperCase()}. Guardalo por si necesitás consultar este pedido con el restaurante.` : ""}</Modal>}</main>;
}
