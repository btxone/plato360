"use client";

import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Clock3, Eye, List, MapPin, Play, Plus, QrCode, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dish } from "@/data/dishes";
import { AppRibbon, ArrowButton, BrandMark, DetailTop, MediaVisual, money, Pill } from "./shared";
import { BottomNav, CategorySheet, MenuHeader } from "./navigation";

function DishCard({ dish, active, position, total, onDetails, onAdd }: { dish: Dish; active: boolean; position: number; total: number; onDetails: () => void; onAdd: () => void }) {
  return <article className="dish-card"><MediaVisual item={dish} active={active} /><div className="dish-card__top"><Pill tone="accent">{dish.category}</Pill><span className="dish-card__counter">{String(position + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></div><div className="dish-card__content"><div className="dish-card__label"><span className="live-dot" /> Recomendado de la casa</div><h2>{dish.name}</h2><p>{dish.description}</p><div className="dish-card__footer"><strong>{money(dish.price)}</strong><div className="dish-card__actions"><button className="dish-detail-link" onClick={onDetails}>Ver detalle <ArrowUpRight size={15} /></button><button className="add-button" onClick={onAdd}><Plus size={18} /> Agregar</button></div></div></div><div className="dish-card__swipe"><ChevronDown size={16} /><span>Deslizá para seguir</span></div></article>;
}

function DishFeed({ filtered, onAdd, onDetails, onSeen }: { filtered: Dish[]; onAdd: (dish: Dish) => void; onDetails: (dish: Dish) => void; onSeen: (index: number) => void }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-feed-index]"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { const index = Number((entry.target as HTMLElement).dataset.feedIndex); setActiveIndex(index); onSeen(index); } }), { root, threshold: 0.7 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filtered, onSeen]);
  return <div className="dish-feed" ref={feedRef}>{filtered.map((dish, index) => <div className="dish-feed__item" data-feed-index={index} key={dish.slug}><DishCard dish={dish} position={index} total={filtered.length} active={activeIndex === index} onDetails={() => onDetails(dish)} onAdd={() => onAdd(dish)} /></div>)}</div>;
}

export function ClientMenuPage({ dishes, categories, cartCount, onAdd, go, onToast }: { dishes: Dish[]; categories: { label: string; icon: string }[]; cartCount: number; onAdd: (dish: Dish) => void; go: (href: string) => void; onToast: (message: string) => void }) {
  const [category, setCategory] = useState("Recomendados");
  const [showCategories, setShowCategories] = useState(false);
  const [seen, setSeen] = useState(0);
  const filtered = useMemo(() => category === "Recomendados" ? dishes : dishes.filter((dish) => dish.category === category), [category]);
  return <main className="menu-page"><AppRibbon /><div className="menu-stage"><div className="menu-stage__side menu-stage__side--left"><span className="eyebrow-dark">EXPERIENCIA CLIENTE</span><h1>Así se ve<br /><em>tu carta.</em></h1><p>Un plato por pantalla. Todo el sabor, antes del primer bocado.</p><div className="qr-card"><QrCode size={33} /><span><strong>Escaneá y descubrí</strong><small>Una carta que se recorre</small></span></div><button className="menu-switch-pill" onClick={() => go("/carta/tradicional")}><span><List size={17} /></span><span><strong>Ver carta tradicional</strong><small>Fotos, nombres y precios</small></span><ArrowUpRight size={15} /></button></div><div className="menu-phone"><div className="phone-topbar phone-topbar--dark"><span>19:42</span><span className="phone-island" /><span>▮▮▮</span></div><MenuHeader cartCount={cartCount} onCart={() => go("/carta/pedido")} /><button className="menu-category-pill" type="button" onClick={() => setShowCategories(true)} aria-haspopup="dialog" aria-expanded={showCategories}>Categorías <ChevronDown size={14} /></button><DishFeed key={category} filtered={filtered} onAdd={(dish) => { onAdd(dish); onToast(`${dish.name} agregado a tu pedido`); }} onDetails={(dish) => go(`/carta/plato/${dish.slug}`)} onSeen={(index) => setSeen(index)} /><BottomNav active="menu" cartCount={cartCount} go={go} /></div><div className="menu-stage__side menu-stage__side--right">{seen >= 2 && <button className="learn-pill" onClick={() => go("/carta/restaurante")}><span><Eye size={16} /></span><span>Ver lo que aprende el restaurante<small>Datos de ejemplo</small></span><ArrowUpRight size={15} /></button>}<div className="menu-note"><span className="menu-note__mark">✦</span><p>“La carta ahora también cuenta una historia.”</p><small>— La experiencia Casa Brasa</small></div></div></div>{showCategories && <CategorySheet selected={category} onSelect={(value) => { setCategory(value); setShowCategories(false); }} onClose={() => setShowCategories(false)} />}</main>;
}

function traditionalCategoryId(label: string) {
  return `traditional-${label.toLowerCase().replace(/\s+/g, "-")}`;
}

export function TraditionalMenuPage({ dishes, categories, cartCount, onAdd, go, onToast }: { dishes: Dish[]; categories: { label: string; icon: string }[]; cartCount: number; onAdd: (dish: Dish) => void; go: (href: string) => void; onToast: (message: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const menuCategories = categories.filter((category) => category.label !== "Recomendados");
  const visibleDishes = selectedCategory === "Todos" ? dishes : dishes.filter((dish) => dish.category === selectedCategory);
  const groups = selectedCategory === "Todos" ? menuCategories.map((category) => ({ label: category.label, dishes: dishes.filter((dish) => dish.category === category.label) })) : [{ label: selectedCategory, dishes: visibleDishes }];

  return (
    <main className="traditional-page">
      <AppRibbon />
      <div className="traditional-shell">
        <header className="traditional-header">
          <button className="traditional-brand" onClick={() => go("/carta")} aria-label="Volver a la carta visual"><BrandMark /><span>MENÚ DIGITAL</span></button>
          <div className="traditional-header__actions"><button className="traditional-switch" onClick={() => go("/carta")}><Sparkles size={15} /> Carta visual</button><button className="traditional-cart" onClick={() => go("/carta/pedido")}><ShoppingBag size={17} /><span>Mi pedido</span>{cartCount > 0 && <b>{cartCount}</b>}</button></div>
        </header>

        <section className="traditional-hero">
          <div className="traditional-hero__copy"><span className="traditional-kicker">CASA BRASA · CARTA</span><h1>Todo lo rico,<br /><em>en su lugar.</em></h1><p>Una carta clara y cálida para recorrer los platos, mirar las fotos y elegir sin apuro.</p><div className="traditional-meta"><span><Clock3 size={15} /><strong>Abierto hoy</strong><small>12:00 — 00:30</small></span><span><MapPin size={15} /><strong>Montevideo</strong><small>Sentite como en casa</small></span></div></div>
          <div className="traditional-highlight"><div className="traditional-highlight__image"><img src={dishes[0].image} alt="Smash Trufa" /><span>RECOMENDADO DE LA CASA</span></div><div className="traditional-highlight__copy"><span className="eyebrow-dark">PARA EMPEZAR</span><h2>Smash Trufa</h2><p>Doble carne smash, cheddar, cebolla crocante y mayo de trufa.</p><strong>{money(dishes[0].price)}</strong></div></div>
        </section>

        <div className="traditional-toolbar"><div className="traditional-categories"><button className={selectedCategory === "Todos" ? "is-selected" : ""} onClick={() => setSelectedCategory("Todos")}>Toda la carta</button>{menuCategories.map((category) => <button className={selectedCategory === category.label ? "is-selected" : ""} key={category.label} onClick={() => setSelectedCategory(category.label)}>{category.icon} {category.label}</button>)}</div><span>{visibleDishes.length} platos · fotos reales de la carta</span></div>

        <div className="traditional-sections">{groups.map((group, index) => <section className="traditional-section" key={group.label} id={traditionalCategoryId(group.label)}><div className="traditional-section__heading"><span>0{index + 1}</span><div><span className="traditional-kicker">CASA BRASA</span><h2>{group.label}</h2></div><small>{group.dishes.length} {group.dishes.length === 1 ? "plato" : "platos"}</small></div><div className="traditional-dish-grid">{group.dishes.map((dish) => <article className="traditional-dish-card" key={dish.slug}><div className="traditional-dish-card__image"><img src={dish.image} alt={dish.name} loading="lazy" /><span>{dish.tags?.[0] ?? "De la casa"}</span></div><div className="traditional-dish-card__body"><div className="traditional-dish-card__title"><h3>{dish.name}</h3><strong>{money(dish.price)}</strong></div><p>{dish.description}</p><div className="traditional-dish-card__ingredients">{dish.ingredients.slice(0, 3).map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div><button onClick={() => { onAdd(dish); onToast(`${dish.name} agregado a tu pedido`); }}><Plus size={15} /> Agregar al pedido</button></div></article>)}</div></section>)}</div>

        <section className="traditional-footer-cta"><div><span className="traditional-kicker">¿TE TENTÓ ALGO?</span><h2>Guardalo para<br /><em>después.</em></h2><p>Tu selección queda lista en tu pedido.</p></div><button onClick={() => go("/carta/pedido")}><ShoppingBag size={17} /> Ver mi pedido {cartCount > 0 && <b>{cartCount}</b>} <ArrowUpRight size={16} /></button></section>
        <footer className="traditional-footer"><BrandMark compact /><span>Casa Brasa · Montevideo</span><span>Una carta simple, hecha para elegir.</span></footer>
      </div>
      <BottomNav active="traditional" cartCount={cartCount} go={go} />
    </main>
  );
}

export function NotFoundState({ go }: { go: (href: string) => void }) {
  return <main className="simple-dark-page"><BrandMark /><div className="not-found"><span className="not-found__icon">✦</span><h1>Este plato no está disponible por ahora.</h1><p>Volvamos a la carta para seguir descubriendo.</p><ArrowButton onClick={() => go("/carta")} variant="light">Volver a la carta</ArrowButton></div></main>;
}

export function DishDetailPage({ dish, cartCount, onAdd, go, onToast }: { dish: Dish; cartCount: number; onAdd: (dish: Dish) => void; go: (href: string) => void; onToast: (message: string) => void }) {
  return <main className="detail-page"><AppRibbon /><div className="detail-phone"><DetailTop label="Detalle del plato" onBack={() => go("/carta")} /><div className="detail-hero"><MediaVisual item={dish} active /><div className="detail-hero__overlay"><Pill tone="accent">{dish.category}</Pill><span className="detail-hero__play"><Play size={13} fill="currentColor" /></span></div></div><div className="detail-body"><div className="detail-title-row"><div><span className="eyebrow-dark">CASA BRASA</span><h1>{dish.name}</h1></div><strong>{money(dish.price)}</strong></div><p className="detail-description">{dish.description}</p><div className="tag-row">{dish.tags?.map((tag) => <Pill key={tag}>{tag}</Pill>)}</div><div className="ingredients-block"><span className="eyebrow-dark">EN ESTE PLATO</span><div>{dish.ingredients.map((ingredient) => <span key={ingredient}><Check size={14} />{ingredient}</span>)}</div></div><button className="detail-add" onClick={() => { onAdd(dish); onToast(`${dish.name} agregado a tu pedido`); }}><Plus size={18} /> Agregar a mi pedido <span>{cartCount > 0 ? `${cartCount} en tu pedido` : ""}</span></button><button className="back-to-menu" onClick={() => go("/carta")}><ArrowLeft size={16} /> Seguir viendo la carta</button></div></div></main>;
}
