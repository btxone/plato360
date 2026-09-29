"use client";

import { BookOpen, Check, Pointer, ShoppingBag, Utensils, X } from "lucide-react";
import { BrandMark } from "./shared";

type PublicMenuFeatures = { visualMenu?: boolean; traditionalMenu?: boolean; candidates?: boolean; orders?: boolean; telemetry?: boolean };

export function MenuHeader({ cartCount, onCart, ordersEnabled = true }: { cartCount: number; onCart: () => void; ordersEnabled?: boolean }) {
  return <div className="menu-header"><button className="menu-header__brand" aria-label="Ir al inicio de la carta"><BrandMark compact /></button><div className="menu-header__actions">{ordersEnabled && <button className="menu-header__cart" aria-label="Ver mi pedido" onClick={onCart}><ShoppingBag size={18} /><span>{cartCount}</span></button>}</div></div>;
}

export function BottomNav({ active, cartCount, go, features = {} }: { active: "menu" | "traditional" | "upcoming" | "order"; cartCount: number; go: (href: string) => void; features?: PublicMenuFeatures }) {
  const visibleItems = [features.visualMenu !== false, features.traditionalMenu !== false, features.candidates !== false, features.orders !== false].filter(Boolean).length;
  return <nav className={`bottom-nav bottom-nav--${visibleItems}`} aria-label="Navegación de la carta">{features.visualMenu !== false && <button className={active === "menu" ? "is-active" : ""} onClick={() => go("/carta")}><Utensils size={18} /><span>Carta</span></button>}{features.traditionalMenu !== false && <button className={active === "traditional" ? "is-active" : ""} onClick={() => go("/carta/tradicional")}><BookOpen size={18} /><span>Carta tradicional</span></button>}{features.candidates !== false && <button className={active === "upcoming" ? "is-active" : ""} onClick={() => go("/carta/proximamente")}><Pointer size={18} /><span>Decides tú</span></button>}{features.orders !== false && <button className={active === "order" ? "is-active" : ""} onClick={() => go("/carta/pedido")}><ShoppingBag size={18} /><span>Mi pedido</span>{cartCount > 0 && <b>{cartCount}</b>}</button>}</nav>;
}

export function CategorySheet({ categories, selected, onSelect, onClose }: { categories: { label: string; icon: string }[]; selected: string; onSelect: (category: string) => void; onClose: () => void }) {
  return <div className="sheet-backdrop" onClick={onClose}><div className="category-sheet" role="dialog" aria-modal="true" aria-label="Categorías" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-heading"><div><span className="eyebrow-dark">CARTA</span><h2>Elegí una categoría</h2></div><button aria-label="Cerrar categorías" onClick={onClose}><X size={19} /></button></div><div className="category-list">{categories.map((category) => <button key={category.label} className={selected === category.label ? "is-selected" : ""} onClick={() => onSelect(category.label)}><span>{category.icon}</span><strong>{category.label}</strong>{selected === category.label && <Check size={16} />}</button>)}</div></div></div>;
}
