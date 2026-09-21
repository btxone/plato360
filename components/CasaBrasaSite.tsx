"use client";


import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Eye,
  Flame,
  Heart,
  Info,
  LayoutDashboard,
  List,
  MapPin,
  Minus,
  MoreHorizontal,
  PackageOpen,
  Play,
  Plus,
  Pointer,
  QrCode,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Utensils,
  Vote,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { candidates, type Candidate } from "@/data/candidates";
import { categories, dishes, getDish, type Dish } from "@/data/dishes";
import { dishAnalytics, insights, overview } from "@/data/analytics";
import { restaurant, whatsappUrl } from "@/data/restaurant";

type Cart = Record<string, number>;
type ToastMessage = { id: number; message: string } | null;

type MvpData = {
  categories: typeof categories;
  dishes: Dish[];
  candidates: Candidate[];
};

const MvpDataContext = createContext<MvpData>({ categories, dishes, candidates });

function useMvpData() {
  return useContext(MvpDataContext);
}

const money = (value: number) => `$${value.toLocaleString("es-UY")}`;

function useNavigation() {
  const router = useRouter();
  return (href: string) => {
    router.push(href);
    window.setTimeout(() => window.scrollTo(0, 0), 0);
  };
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <span className="brand-symbol">✦</span>
      <span>
        <strong>{restaurant.name}</strong>
        {!compact && <small>{restaurant.tagline}</small>}
      </span>
    </span>
  );
}

function AppRibbon({ restaurantView = false }: { restaurantView?: boolean }) {
  return (
    <div className="app-ribbon" aria-label="Navegación principal">
      <span className="app-ribbon__label"><span className="app-dot" /> CASA BRASA</span>
      <span className="app-ribbon__divider" />
      <span className="app-ribbon__mode">{restaurantView ? "Vista restaurante" : "Carta para clientes"}</span>
    </div>
  );
}

function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span className="toast__icon"><Check size={15} /></span>
      <span>{toast.message}</span>
      <button aria-label="Cerrar aviso" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

function FallbackVisual({ item, candidate = false }: { item: Dish | Candidate; candidate?: boolean }) {
  return (
    <div className={`fallback-visual ${candidate ? "fallback-visual--candidate" : ""}`} style={{ "--fallback-accent": item.accent } as React.CSSProperties}>
      <span className="fallback-visual__grain" />
      <span className="fallback-visual__orb fallback-visual__orb--one" />
      <span className="fallback-visual__orb fallback-visual__orb--two" />
      <div className="fallback-visual__plate">
        <span className="fallback-visual__emoji" aria-hidden="true">{item.emoji}</span>
        <span className="fallback-visual__shine" />
      </div>
      <div className="fallback-visual__caption">
        <span>Contenido visual</span>
        <strong>{candidate ? "Plato en prueba" : "Video del plato"}</strong>
      </div>
    </div>
  );
}

function MediaVisual({
  item,
  active = true,
  candidate = false,
  compact = false,
}: {
  item: Dish | Candidate;
  active?: boolean;
  candidate?: boolean;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (active) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, failed]);

  return (
    <div className={`media-visual ${compact ? "media-visual--compact" : ""}`}>
      <FallbackVisual item={item} candidate={candidate} />
      {!failed && (
        <video
          ref={videoRef}
          className="media-visual__video"
          src={item.video}
          poster={item.poster}
          muted
          loop
          playsInline
          preload={active ? "metadata" : "none"}
          onError={() => setFailed(true)}
          aria-label={`Video de ${item.name}`}
        />
      )}
      <div className="media-visual__vignette" />
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "green" | "warning" }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

function ArrowButton({ children, onClick, variant = "light", icon = true }: { children: React.ReactNode; onClick?: () => void; variant?: "light" | "dark" | "outline"; icon?: boolean }) {
  return (
    <button className={`arrow-button arrow-button--${variant}`} onClick={onClick}>
      <span>{children}</span>{icon && <ArrowUpRight size={16} strokeWidth={2.2} />}
    </button>
  );
}

function HeroPhone() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % 3), 3300);
    return () => window.clearInterval(timer);
  }, []);
  const dish = dishes[index];
  return (
    <div className="hero-phone-wrap">
      <div className="hero-phone__glow" />
      <div className="hero-phone">
        <div className="phone-topbar"><span className="phone-time">19:42</span><span className="phone-island" /><span>▮▮▮</span></div>
        <div className="hero-phone__media"><MediaVisual item={dish} active compact /></div>
        <div className="hero-phone__topline"><BrandMark compact /><span className="phone-dots">•••</span></div>
        <div className="hero-phone__copy">
          <Pill tone="accent">{dish.category}</Pill>
          <h3>{dish.name}</h3>
          <p>{dish.description}</p>
          <div className="hero-phone__price-row"><strong>{money(dish.price)}</strong><button><Plus size={16} /> Agregar</button></div>
        </div>
        <div className="hero-phone__progress"><span style={{ width: `${42 + index * 19}%` }} /></div>
        <div className="hero-phone__nav"><span className="is-current">⌂<small>Carta</small></span><span>◉<small>Viene</small></span><span>♧<small>Pedido</small></span></div>
      </div>
      <div className="floating-chip floating-chip--top"><span className="floating-chip__emoji">◌</span><span><strong>6,8 s</strong><small>mirando el plato</small></span></div>
      <div className="floating-chip floating-chip--bottom"><span className="floating-chip__emoji">↗</span><span><strong>Volvieron a verlo</strong><small>una señal de interés</small></span></div>
    </div>
  );
}

function Landing({ go }: { go: (href: string) => void }) {
  return (
    <main className="landing">
      <div className="landing-noise" />
      <header className="landing-header page-width">
        <button className="brand-button" onClick={() => go("/")}><BrandMark /></button>
        <nav className="landing-nav" aria-label="Navegación principal">
          <button onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}>Cómo funciona</button>
          <button onClick={() => go("/carta/restaurante")}>Vista restaurante <ArrowUpRight size={14} /></button>
        </nav>
        <ArrowButton onClick={() => go("/carta")} variant="light">Probar la carta</ArrowButton>
      </header>

      <section className="landing-hero page-width">
        <div className="hero-copy">
          <Pill tone="accent"><span className="live-dot" /> La carta que tus clientes sí quieren mirar</Pill>
          <h1>Hacé que tus platos se vendan <em>con los ojos.</em></h1>
          <p className="hero-copy__lede">Convertí tu menú en una experiencia visual con videos cortos y descubrí qué platos realmente llaman la atención antes de que el cliente pida.</p>
          <div className="hero-actions"><ArrowButton onClick={() => go("/carta")} variant="light">Probar la carta</ArrowButton><button className="text-link" onClick={() => go("/carta/restaurante")}><BarChart3 size={16} /> Ver qué aprende el restaurante</button></div>
          <div className="hero-proof"><span className="proof-avatars"><i>M</i><i>L</i><i>R</i></span><span><strong>Una nueva forma de elegir</strong><small>Hecha para restaurantes que quieren ser recordados.</small></span></div>
        </div>
        <div className="hero-visual"><HeroPhone /><div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" /></div>
      </section>

      <section className="before-after page-width" id="como-funciona">
        <div className="section-kicker">La diferencia se siente</div>
        <div className="section-heading section-heading--row"><div><h2>Una lista informa.<br /><em>Un video despierta ganas.</em></h2></div><p>Mismo plato. Otra forma de elegirlo. La carta deja de ser algo que se consulta y se convierte en algo que se recorre.</p></div>
        <div className="before-after__grid">
          <div className="traditional-card"><div className="traditional-card__top"><span>CASA BRASA</span><MoreHorizontal size={17} /></div><div className="traditional-card__line traditional-card__line--long" /><div className="traditional-card__category">BURGERS</div><div className="traditional-card__item"><div><strong>SMASH BACON</strong><p>Doble carne, cheddar y panceta</p></div><b>$690</b></div><div className="traditional-card__item traditional-card__item--muted"><div><strong>PIZZA BURRATA</strong><p>Pomodoro, mozzarella y albahaca</p></div><b>$740</b></div><span className="traditional-card__stamp">CARTA DE SIEMPRE</span></div>
          <div className="after-card"><MediaVisual item={dishes[0]} active compact /><div className="after-card__overlay"><Pill tone="accent">BURGERS · 01</Pill><h3>Smash Trufa</h3><p>Doble carne smash, cheddar, cebolla crocante y mayo de trufa.</p><div><strong>$690</strong><button onClick={() => go("/carta/plato/smash-trufa")}><span>Quiero este</span><ArrowUpRight size={16} /></button></div></div><span className="after-card__stamp">LA NUEVA CARTA</span></div>
        </div>
      </section>

      <section className="benefits page-width">
        <div className="section-kicker">Tres cosas que cambian</div>
        <div className="benefit-grid">
          <Benefit number="01" icon={<Eye size={20} />} title="Mostrá tus platos como realmente se ven" body="Videos cortos, visuales y fáciles de recorrer desde el celular." />
          <Benefit number="02" icon={<TrendingUp size={20} />} title="Descubrí qué platos atrapan más" body="Mirá cuáles generan interés, cuáles pasan desapercibidos y cuáles terminan en una elección." accent />
          <Benefit number="03" icon={<Sparkles size={20} />} title="Probá nuevas ideas antes de sumarlas" body="Mostrá un plato futuro y medí el interés antes de lanzarlo." />
        </div>
      </section>

      <section className="try-now page-width">
        <div className="try-now__copy"><div className="section-kicker">La experiencia principal</div><h2>No te lo imagines.<br /><em>Probalo.</em></h2><p>Escaneás un QR, recorrés los platos y guardás lo que te tienta. Así de simple se siente para tus clientes.</p><ArrowButton onClick={() => go("/carta")} variant="light">Abrir carta completa</ArrowButton></div>
        <div className="preview-phone"><div className="preview-phone__label"><span /><span>Así lo ve tu cliente</span><QrCode size={18} /></div><div className="preview-phone__body"><MediaVisual item={dishes[1]} active compact /><div className="preview-phone__content"><Pill tone="accent">Para compartir</Pill><h3>Pizza Burrata</h3><p>Pomodoro, mozzarella, burrata cremosa...</p><div><strong>$740</strong><button><Plus size={15} /></button></div></div><div className="preview-phone__dots"><i /><i className="active" /><i /></div></div></div>
      </section>

      <section className="analytics-story page-width">
        <div className="analytics-story__copy"><div className="section-kicker">Del otro lado de la carta</div><h2>No solo sabés qué se vende.<br /><em>También qué genera ganas.</em></h2><p>Un plato puede llamar muchísimo la atención pero terminar poco en el pedido. Esa diferencia puede ayudarte a revisar precio, presentación o propuesta.</p><button className="story-link" onClick={() => go("/carta/restaurante")}><span>Ver el dashboard</span><ArrowRight size={16} /></button></div>
        <div className="analytics-preview"><div className="analytics-preview__head"><div><span className="eyebrow-dark">CASA BRASA / RESUMEN</span><h3>Qué está pasando en tu carta</h3></div><Pill>Datos de ejemplo</Pill></div><div className="analytics-feature"><div className="analytics-feature__title"><span className="dish-mini-art">🍔</span><span><strong>Smash Trufa</strong><small>Nivel de interés</small></span><b>8.7<small>/10</small></b></div><div className="score-bar"><span style={{ width: "87%" }} /></div><div className="analytics-feature__metrics"><span><strong>7,1 s</strong><small>Tiempo mirando</small></span><span><strong>29%</strong><small>Volvieron a verlo</small></span><span><strong>14%</strong><small>Lo agregaron</small></span></div></div><div className="mini-bars"><span><i style={{ width: "84%" }} /><b>Smash Trufa</b></span><span><i style={{ width: "69%" }} /><b>Pizza Burrata</b></span><span><i style={{ width: "54%" }} /><b>Ravioles</b></span></div></div>
      </section>

      <section className="upcoming-story page-width"><div className="section-heading section-heading--row"><div><div className="section-kicker">Antes de ponerlo en carta</div><h2>Probá una idea<br /><em>antes de invertir.</em></h2></div><p>Mostrás el plato como “Próximamente”, tus clientes votan y vos encontrás el candidato con más posibilidades.</p></div><div className="upcoming-preview-grid">{candidates.map((candidate, index) => <CandidatePreview key={candidate.slug} candidate={candidate} rank={index + 1} onClick={() => go(`/carta/proximamente/${candidate.slug}`)} />)}</div><div className="center-action"><ArrowButton onClick={() => go("/carta/proximamente")} variant="outline">Ver Tu decides</ArrowButton></div></section>

      <section className="how page-width"><div className="section-kicker">Cómo funciona</div><div className="how-grid"><HowStep number="01" title="Tus platos cobran vida" body="Usamos contenido visual para presentar cada plato en movimiento." icon={<Play size={18} />} /><HowStep number="02" title="El cliente explora" body="Escanea el QR y recorre la carta desde su celular." icon={<Utensils size={18} />} /><HowStep number="03" title="Vos aprendés" body="Ves qué platos generan interés y cuáles conviene revisar o probar." icon={<BarChart3 size={18} />} /></div></section>

      <section className="final-cta page-width"><div className="final-cta__visual"><MediaVisual item={dishes[5]} active compact /><div className="final-cta__veil" /></div><div className="final-cta__content"><Pill tone="accent">Casa Brasa · Menú digital</Pill><h2>Tu próxima carta<br /><em>puede sentirse así.</em></h2><p>Mirá la experiencia completa y pensá cómo se verían tus propios platos.</p><div className="hero-actions"><ArrowButton onClick={() => go("/carta")} variant="light">Ver experiencia</ArrowButton><a className="text-link text-link--light" href={whatsappUrl} target="_blank" rel="noreferrer"><Send size={16} /> Quiero esto para mi restaurante</a></div></div></section>

      <footer className="landing-footer page-width"><BrandMark compact /><span>Contenido visual para restaurantes con ganas de ser elegidos.</span><span>Montevideo · 2026</span></footer>
    </main>
  );
}

function Benefit({ number, icon, title, body, accent = false }: { number: string; icon: React.ReactNode; title: string; body: string; accent?: boolean }) {
  return <article className={`benefit-card ${accent ? "benefit-card--accent" : ""}`}><div className="benefit-card__top"><span>{number}</span><span className="benefit-card__icon">{icon}</span></div><h3>{title}</h3><p>{body}</p><span className="benefit-card__arrow"><ArrowUpRight size={17} /></span></article>;
}

function HowStep({ number, title, body, icon }: { number: string; title: string; body: string; icon: React.ReactNode }) {
  return <article className="how-step"><div className="how-step__number">{number}</div><div className="how-step__icon">{icon}</div><h3>{title}</h3><p>{body}</p></article>;
}

function CandidatePreview({ candidate, rank, onClick }: { candidate: Candidate; rank: number; onClick: () => void }) {
  return <button className="candidate-preview" onClick={onClick}><div className="candidate-preview__media"><MediaVisual item={candidate} candidate compact /><span className="candidate-preview__rank">0{rank}</span></div><div className="candidate-preview__copy"><span className="eyebrow-dark">EN PRUEBA</span><h3>{candidate.name}</h3><div className="candidate-preview__stats"><strong>{candidate.wouldOrderPct}%</strong><span>la pediría</span><small>{candidate.notifyCount} quieren aviso</small></div></div></button>;
}

function MenuHeader() {
  return <div className="menu-header"><button className="menu-header__brand" aria-label="Ir al inicio de la carta"><BrandMark compact /></button></div>;
}

function BottomNav({ active, go }: { active: "menu" | "traditional" | "upcoming"; go: (href: string) => void }) {
  return <nav className="bottom-nav" aria-label="Navegación del cliente"><button className={active === "menu" ? "is-active" : ""} onClick={() => go("/carta")}><Utensils size={18} /><span>Videos</span></button><button className={active === "traditional" ? "is-active" : ""} onClick={() => go("/carta/tradicional")}><BookOpen size={18} /><span>Carta</span></button><button className={active === "upcoming" ? "is-active" : ""} onClick={() => go("/carta/tu-decides")}><Pointer size={18} /><span>Tu decides</span></button></nav>;
}

function CategorySheet({ selected, onSelect, onClose }: { selected: string; onSelect: (category: string) => void; onClose: () => void }) {
  const { categories: menuCategories } = useMvpData();
  return <div className="sheet-backdrop" onClick={onClose}><div className="category-sheet" role="dialog" aria-modal="true" aria-label="Categorías" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-heading"><div><span className="eyebrow-dark">CASA BRASA</span><h2>Elegí tu antojo</h2></div><button aria-label="Cerrar categorías" onClick={onClose}><X size={19} /></button></div><div className="category-list">{menuCategories.map((category) => <button key={category.label} className={selected === category.label ? "is-selected" : ""} onClick={() => onSelect(category.label)}><span>{category.icon}</span><strong>{category.label}</strong>{selected === category.label && <Check size={16} />}</button>)}</div></div></div>;
}

function DishCard({ dish, active, onDetails }: { dish: Dish; active: boolean; onDetails: () => void }) {
  const { dishes: menuDishes } = useMvpData();
  return <article className="dish-card"><MediaVisual item={dish} active={active} /><div className="dish-card__top"><Pill tone="accent">{dish.category}</Pill><span className="dish-card__counter">{String(menuDishes.indexOf(dish) + 1).padStart(2, "0")} / {String(menuDishes.length).padStart(2, "0")}</span></div><div className="dish-card__content"><div className="dish-card__label"><span className="live-dot" /> Recomendado de la casa</div><h2>{dish.name}</h2><p>{dish.description}</p><div className="dish-card__footer"><strong>{money(dish.price)}</strong><div className="dish-card__actions"><button className="dish-detail-link" onClick={onDetails}>Ver detalle <ArrowUpRight size={15} /></button></div></div></div><div className="dish-card__swipe"><ChevronDown size={16} /><span>Deslizá para seguir</span></div></article>;
}

function DishFeed({ filtered, onDetails }: { filtered: Dish[]; onDetails: (dish: Dish) => void }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-feed-index]"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { const index = Number((entry.target as HTMLElement).dataset.feedIndex); setActiveIndex(index); } }), { root, threshold: 0.7 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filtered]);
  return <div className="dish-feed" ref={feedRef}>{filtered.map((dish, index) => <div className="dish-feed__item" data-feed-index={index} key={dish.slug}><DishCard dish={dish} active={activeIndex === index} onDetails={() => onDetails(dish)} /></div>)}</div>;
}

function ClientMenuPage({ go }: { go: (href: string) => void }) {
  const { dishes: menuDishes } = useMvpData();
  const videoDishes = useMemo(() => menuDishes.filter((dish) => Boolean(dish.video)), [menuDishes]);
  const [category, setCategory] = useState("Recomendados");
  const [showCategories, setShowCategories] = useState(false);
  const filtered = useMemo(() => category === "Recomendados" ? videoDishes : videoDishes.filter((dish) => dish.category === category), [category, videoDishes]);
  return <main className="menu-page"><AppRibbon /><div className="menu-stage"><div className="menu-stage__side menu-stage__side--left"><span className="eyebrow-dark">EXPERIENCIA CLIENTE</span><h1>Así se ve<br /><em>tu carta.</em></h1><p>Un plato por pantalla. Todo el sabor, antes del primer bocado.</p><div className="qr-card"><QrCode size={33} /><span><strong>Escaneá y descubrí</strong><small>Una carta que se recorre</small></span></div><button className="menu-switch-pill" onClick={() => go("/carta/tradicional")}><span><List size={17} /></span><span><strong>Ver carta tradicional</strong><small>Fotos, nombres y precios</small></span><ArrowUpRight size={15} /></button></div><div className="menu-phone"><div className="phone-topbar phone-topbar--dark"><span>19:42</span><span className="phone-island" /><span>▮▮▮</span></div><MenuHeader /><button className="menu-category-pill" type="button" onClick={() => setShowCategories(true)} aria-haspopup="dialog" aria-expanded={showCategories}>Categorías <ChevronDown size={14} /></button><DishFeed key={category} filtered={filtered} onDetails={(dish) => go(`/carta/plato/${dish.slug}`)} /><BottomNav active="menu" go={go} /></div><div className="menu-stage__side menu-stage__side--right"><div className="menu-note"><span className="menu-note__mark">✦</span><p>“La carta ahora también cuenta una historia.”</p><small>— La experiencia Casa Brasa</small></div></div></div>{showCategories && <CategorySheet selected={category} onSelect={(value) => { setCategory(value); setShowCategories(false); }} onClose={() => setShowCategories(false)} />}</main>;
}

function traditionalCategoryId(label: string) {
  return `traditional-${label.toLowerCase().replace(/\s+/g, "-")}`;
}

function TraditionalMenuPage({ go }: { go: (href: string) => void }) {
  const { categories: menuCategories, dishes: menuDishes } = useMvpData();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const visibleDishes = selectedCategory === "Todos" ? menuDishes : menuDishes.filter((dish) => dish.category === selectedCategory);
  const groups = selectedCategory === "Todos" ? menuCategories.filter((category) => category.label !== "Recomendados").map((category) => ({ label: category.label, dishes: menuDishes.filter((dish) => dish.category === category.label) })) : [{ label: selectedCategory, dishes: visibleDishes }];
  const traditionalCategories = menuCategories.filter((category) => category.label !== "Recomendados");

  return (
    <main className="traditional-page">
      <AppRibbon />
      <div className="traditional-shell">
        <header className="traditional-header">
          <button className="traditional-brand" onClick={() => go("/carta")} aria-label="Volver a la carta visual"><BrandMark /><span>MENÚ DIGITAL</span></button>
          <div className="traditional-header__actions"><button className="traditional-switch" onClick={() => go("/carta")}><Sparkles size={15} /> Carta visual</button></div>
        </header>

        <section className="traditional-hero">
          <div className="traditional-hero__copy"><span className="traditional-kicker">CASA BRASA · CARTA</span><h1>Todo lo rico,<br /><em>en su lugar.</em></h1><p>Una carta clara y cálida para recorrer los platos, mirar las fotos y elegir sin apuro.</p><div className="traditional-meta"><span><Clock3 size={15} /><strong>Abierto hoy</strong><small>12:00 — 00:30</small></span><span><MapPin size={15} /><strong>Montevideo</strong><small>Sentite como en casa</small></span></div></div>
          <div className="traditional-highlight"><div className="traditional-highlight__image"><img src={menuDishes[0].image} alt="Smash Trufa" /><span>RECOMENDADO DE LA CASA</span></div><div className="traditional-highlight__copy"><span className="eyebrow-dark">PARA EMPEZAR</span><h2>Smash Trufa</h2><p>Doble carne smash, cheddar, cebolla crocante y mayo de trufa.</p><strong>{money(menuDishes[0].price)}</strong></div></div>
        </section>

        <div className="traditional-toolbar"><div className="traditional-categories"><button className={selectedCategory === "Todos" ? "is-selected" : ""} onClick={() => setSelectedCategory("Todos")}>Toda la carta</button>{traditionalCategories.map((category) => <button className={selectedCategory === category.label ? "is-selected" : ""} key={category.label} onClick={() => setSelectedCategory(category.label)}>{category.icon} {category.label}</button>)}</div><span>{visibleDishes.length} platos · fotos reales de la carta</span></div>

        <div className="traditional-sections">{groups.map((group, index) => <section className="traditional-section" key={group.label} id={traditionalCategoryId(group.label)}><div className="traditional-section__heading"><span>0{index + 1}</span><div><span className="traditional-kicker">CASA BRASA</span><h2>{group.label}</h2></div><small>{group.dishes.length} {group.dishes.length === 1 ? "plato" : "platos"}</small></div><div className="traditional-dish-grid">{group.dishes.map((dish) => <article className="traditional-dish-card" key={dish.slug}><div className="traditional-dish-card__image"><img src={dish.image} alt={dish.name} loading="lazy" /><span>{dish.tags?.[0] ?? "De la casa"}</span></div><div className="traditional-dish-card__body"><div className="traditional-dish-card__title"><h3>{dish.name}</h3><strong>{money(dish.price)}</strong></div><p>{dish.description}</p><div className="traditional-dish-card__ingredients">{dish.ingredients.slice(0, 3).map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div></div></article>)}</div></section>)}</div>

        <section className="traditional-footer-cta"><div><span className="traditional-kicker">¿QUÉ PLATO ELEGIRÍAS?</span><h2>Ayudá a decidir<br /><em>lo que viene.</em></h2><p>Votá por tu favorito en Tu decides.</p></div><button onClick={() => go("/carta/tu-decides")}><Pointer size={17} /> Ir a Tu decides <ArrowUpRight size={16} /></button></section>
        <footer className="traditional-footer"><BrandMark compact /><span>Casa Brasa · Montevideo</span><span>Una carta simple, hecha para elegir.</span></footer>
      </div>
      <BottomNav active="traditional" go={go} />
    </main>
  );
}

function DetailTop({ label, onBack }: { label: string; onBack: () => void }) {
  return <div className="detail-top"><button onClick={onBack} aria-label="Volver"><ChevronLeft size={20} /></button><span>{label}</span><button aria-label="Más opciones"><MoreHorizontal size={19} /></button></div>;
}

function NotFoundState({ go }: { go: (href: string) => void }) {
  return <main className="simple-dark-page"><BrandMark /><div className="not-found"><span className="not-found__icon">✦</span><h1>Este plato no está disponible por ahora.</h1><p>Volvamos a la carta para seguir descubriendo.</p><ArrowButton onClick={() => go("/carta")} variant="light">Volver a la carta</ArrowButton></div></main>;
}

function DishDetailPage({ dish, go }: { dish: Dish; go: (href: string) => void }) {
  return <main className="detail-page"><AppRibbon /><div className="detail-phone"><DetailTop label="Detalle del plato" onBack={() => go("/carta")} /><div className="detail-hero"><MediaVisual item={dish} active /><div className="detail-hero__overlay"><Pill tone="accent">{dish.category}</Pill><span className="detail-hero__play"><Play size={13} fill="currentColor" /></span></div></div><div className="detail-body"><div className="detail-title-row"><div><span className="eyebrow-dark">CASA BRASA</span><h1>{dish.name}</h1></div><strong>{money(dish.price)}</strong></div><p className="detail-description">{dish.description}</p><div className="tag-row">{dish.tags?.map((tag) => <Pill key={tag}>{tag}</Pill>)}</div><div className="ingredients-block"><span className="eyebrow-dark">EN ESTE PLATO</span><div>{dish.ingredients.map((ingredient) => <span key={ingredient}><Check size={14} />{ingredient}</span>)}</div></div><button className="back-to-menu" onClick={() => go("/carta")}><ArrowLeft size={16} /> Seguir viendo la carta</button></div></div></main>;
}

function Modal({ title, children, onClose, actionLabel }: { title: string; children: React.ReactNode; onClose: () => void; actionLabel?: string }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="info-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={17} /></button><span className="modal-star">✦</span><h2>{title}</h2><p>{children}</p>{actionLabel && <button className="modal-action" onClick={onClose}>{actionLabel}</button>}</div></div>;
}

function OrderPage({ cart, onIncrement, onDecrement, onRemove, go }: { cart: Cart; onIncrement: (slug: string) => void; onDecrement: (slug: string) => void; onRemove: (slug: string) => void; go: (href: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  const entries = Object.entries(cart).map(([slug, quantity]) => ({ dish: getDish(slug), quantity })).filter((entry): entry is { dish: Dish; quantity: number } => Boolean(entry.dish && entry.quantity > 0));
  const total = entries.reduce((sum, entry) => sum + entry.dish.price * entry.quantity, 0);
  return <main className="order-page"><AppRibbon /><div className="order-wrap"><div className="order-header"><button onClick={() => go("/carta")} aria-label="Volver a la carta"><ChevronLeft size={20} /></button><BrandMark compact /><span className="order-header__label">MI PEDIDO</span></div><div className="order-intro"><span className="eyebrow-dark">TU SELECCIÓN</span><h1>Lo que te<br /><em>tentó.</em></h1><p>Guardá tus favoritos y seguí recorriendo la carta.</p></div>{entries.length === 0 ? <div className="empty-order"><PackageOpen size={34} /><h2>Tu pedido está esperando un antojo.</h2><p>Agregá un plato para verlo aparecer acá.</p><ArrowButton onClick={() => go("/carta")} variant="dark">Seguir viendo la carta</ArrowButton></div> : <><div className="order-items">{entries.map(({ dish, quantity }) => <div className="order-item" key={dish.slug}><div className="order-item__thumb" style={{ background: `linear-gradient(145deg, ${dish.accent}, #231a14)` }}>{dish.emoji}</div><div className="order-item__info"><strong>{dish.name}</strong><small>{money(dish.price)} · {dish.category}</small><div className="quantity"><button onClick={() => onDecrement(dish.slug)} aria-label={`Restar ${dish.name}`}><Minus size={13} /></button><b>{quantity}</b><button onClick={() => onIncrement(dish.slug)} aria-label={`Sumar ${dish.name}`}><Plus size={13} /></button></div></div><strong className="order-item__price">{money(dish.price * quantity)}</strong><button className="order-item__remove" onClick={() => onRemove(dish.slug)} aria-label={`Eliminar ${dish.name}`}><X size={15} /></button></div>)}</div><div className="order-total"><span>Total <small>Tu selección</small></span><strong>{money(total)}</strong></div><button className="complete-order" onClick={() => setShowModal(true)}>Listo, esto pediría <ArrowRight size={18} /></button><button className="back-to-menu" onClick={() => go("/carta")}><ArrowLeft size={16} /> Seguir viendo la carta</button></>}</div>{showModal && <Modal title="Pedido listo" onClose={() => setShowModal(false)} actionLabel="Volver a la carta">En una versión real, este paso puede adaptarse al flujo de atención de cada restaurante.</Modal>}</main>;
}

const confettiPieces = [
  { color: "#ef754f", x: "-118px", y: "-92px", rotate: "-20deg", delay: "0s" },
  { color: "#f2bf67", x: "-72px", y: "-128px", rotate: "18deg", delay: ".06s" },
  { color: "#f7f1e8", x: "-22px", y: "-145px", rotate: "-12deg", delay: ".12s" },
  { color: "#9eaf89", x: "29px", y: "-136px", rotate: "23deg", delay: ".02s" },
  { color: "#c97856", x: "78px", y: "-112px", rotate: "-27deg", delay: ".1s" },
  { color: "#e8bd62", x: "119px", y: "-72px", rotate: "13deg", delay: ".16s" },
  { color: "#ffffff", x: "-104px", y: "-34px", rotate: "32deg", delay: ".2s" },
  { color: "#ef754f", x: "105px", y: "-30px", rotate: "-16deg", delay: ".24s" },
];

const emailDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"];

function VoteCelebration({ candidate }: { candidate: Candidate }) {
  return (
    <div className="vote-celebration" role="status" aria-live="polite">
      <div className="vote-celebration__confetti" aria-hidden="true">
        {confettiPieces.map((piece, index) => (
          <span
            key={index}
            style={{
              "--confetti-color": piece.color,
              "--confetti-x": piece.x,
              "--confetti-y": piece.y,
              "--confetti-rotate": piece.rotate,
              "--confetti-delay": piece.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="vote-celebration__message">
        <span><Check size={20} /></span>
        <strong>¡Voto enviado!</strong>
        <small>{candidate.name}</small>
      </div>
    </div>
  );
}

function NotifyModal({ candidate, onClose, onSave }: { candidate: Candidate; onClose: () => void; onSave: (email: string) => void }) {
  const [stage, setStage] = useState<"question" | "email" | "success">("question");
  const [canClose, setCanClose] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [domain, setDomain] = useState(emailDomains[0]);
  const [customDomain, setCustomDomain] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setCanClose(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const cleanLocalPart = localPart.trim().replace(/\s+/g, "");
  const cleanDomain = (domain === "otro" ? customDomain : domain).trim().replace(/\s+/g, "");
  const email = cleanLocalPart && cleanDomain ? cleanLocalPart + "@" + cleanDomain : "";
  const canSubmit = /^[^@\s]+$/.test(cleanLocalPart) && /^[^@\s]+\.[^@\s]+$/.test(cleanDomain);

  return (
    <div className="modal-backdrop notify-modal-backdrop" onClick={() => { if (canClose) onClose(); }}>
      <div className="notify-modal" role="dialog" aria-modal="true" aria-labelledby="notify-modal-title" onClick={(event) => event.stopPropagation()}>
        {canClose && <button className="modal-close notify-modal__close" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>}
        <span className="modal-star"><Sparkles size={22} /></span>
        {stage === "question" && (
          <>
            <h2 id="notify-modal-title">¿Te gustaría que te avisemos?</h2>
            <p>Te contamos cuando <strong>{candidate.name}</strong> se estrene en la carta.</p>
            <button className="modal-action" onClick={() => setStage("email")}>Sí, avisame</button>
          </>
        )}
        {stage === "email" && (
          <>
            <h2 id="notify-modal-title">¿Dónde te avisamos?</h2>
            <p>Dejanos tu email y te avisaremos cuando este plato esté disponible.</p>
            <form className="notify-form" onSubmit={(event) => { event.preventDefault(); if (canSubmit) { onSave(email); setStage("success"); } }}>
              <label htmlFor="notify-email-local">Tu email</label>
              <div className="email-composer">
                <input id="notify-email-local" type="text" inputMode="email" autoComplete="email" placeholder="tu nombre" value={localPart} onChange={(event) => setLocalPart(event.target.value)} />
                <span aria-hidden="true">@</span>
                <select aria-label="Dominio del correo" value={domain} onChange={(event) => setDomain(event.target.value)}>
                  {emailDomains.map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="otro">Otro</option>
                </select>
              </div>
              {domain === "otro" && <input className="custom-domain-input" type="text" placeholder="tudominio.com" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} aria-label="Otro dominio" />}
              <button className="modal-action" type="submit" disabled={!canSubmit}>Guardar aviso</button>
            </form>
          </>
        )}
        {stage === "success" && (
          <>
            <h2 id="notify-modal-title">¡Listo!</h2>
            <p>Te avisaremos cuando <strong>{candidate.name}</strong> llegue a la carta.</p>
            <button className="modal-action" onClick={onClose}>Seguir mirando</button>
          </>
        )}
      </div>
    </div>
  );
}

function CandidateSlide({ candidate, index, active, voted, onVote, onDetails }: { candidate: Candidate; index: number; active: boolean; voted: boolean; onVote: () => void; onDetails: () => void }) {
  const { candidates: upcomingCandidates } = useMvpData();
  return (
    <article className="candidate-slide" data-candidate-slide={index}>
      <MediaVisual item={candidate} candidate active={active} />
      <div className="candidate-slide__veil" />
      <div className="candidate-slide__top">
        <Pill tone="accent">EN PRUEBA</Pill>
        <span>{String(index + 1).padStart(2, "0")} / {String(upcomingCandidates.length).padStart(2, "0")}</span>
      </div>
      <div className="candidate-slide__content">
        <span className="candidate-slide__eyebrow">TU DECIDES · PRÓXIMO PLATO</span>
        <div className="candidate-slide__title">
          <h1>{candidate.name}</h1>
          <strong>{money(candidate.estimatedPrice)}</strong>
        </div>
        <p>{candidate.description}</p>
        <div className="candidate-slide__stats">
          <span><strong>{candidate.wouldOrderPct}%</strong><small>dice que lo pediría</small></span>
          <span><strong>{candidate.status}</strong><small>nivel de interés</small></span>
        </div>
      </div>
      <div className="candidate-slide__actions">
        <button className={"candidate-vote-button" + (voted ? " is-voted" : "")} onClick={onVote} disabled={voted}>
          {voted ? <Check size={18} /> : <Heart size={18} />}
          <span>{voted ? "Votaste" : "Yo lo probaría"}</span>
        </button>
        <button className="candidate-detail-link" onClick={onDetails}>Ver detalle <ArrowUpRight size={16} /></button>
      </div>
      <div className="candidate-slide__hint"><ChevronDown size={15} /> Deslizá para ver otra idea</div>
    </article>
  );
}

function UpcomingPage({ votes, onVote, onNotify, go, onToast }: { votes: Record<string, boolean>; onVote: (candidate: Candidate) => void; onNotify: (candidate: Candidate, email?: string) => void; go: (href: string) => void; onToast: (message: string) => void }) {
  const { candidates: upcomingCandidates } = useMvpData();
  const feedRef = useRef<HTMLDivElement>(null);
  const voteTimer = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [celebratingSlug, setCelebratingSlug] = useState<string | null>(null);
  const [notifyCandidate, setNotifyCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-candidate-slide]"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveIndex(Number((entry.target as HTMLElement).dataset.candidateSlide));
    }), { root, threshold: 0.65 });
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (voteTimer.current) window.clearTimeout(voteTimer.current);
  }, []);

  const handleVote = (candidate: Candidate) => {
    if (votes[candidate.slug]) return;
    onVote(candidate);
    setCelebratingSlug(candidate.slug);
    if (voteTimer.current) window.clearTimeout(voteTimer.current);
    voteTimer.current = window.setTimeout(() => {
      setCelebratingSlug(null);
      setNotifyCandidate(candidate);
    }, 850);
  };

  const celebratingCandidate = upcomingCandidates.find((candidate) => candidate.slug === celebratingSlug);

  return (
    <main className="upcoming-page">
      <AppRibbon />
      <div className="upcoming-wrap">
        <div className="upcoming-header">
          <button onClick={() => go("/carta")} aria-label="Volver a la carta"><ChevronLeft size={20} /></button>
          <BrandMark compact />
          <div className="upcoming-header__right">
            <Pill tone="accent">TU DECIDES</Pill>
          </div>
        </div>
        <div className="upcoming-feed" ref={feedRef} aria-label="Platos que podés elegir">
          {upcomingCandidates.map((candidate, index) => (
            <CandidateSlide
              key={candidate.slug}
              candidate={candidate}
              index={index}
              active={index === activeIndex}
              voted={Boolean(votes[candidate.slug])}
              onVote={() => handleVote(candidate)}
              onDetails={() => go("/carta/tu-decides/" + candidate.slug)}
            />
          ))}
        </div>
        <div className="upcoming-progress" aria-live="polite">{String(activeIndex + 1).padStart(2, "0")} / {String(upcomingCandidates.length).padStart(2, "0")}</div>
        <BottomNav active="upcoming" go={go} />
        {celebratingCandidate && <VoteCelebration candidate={celebratingCandidate} />}
        {notifyCandidate && <NotifyModal candidate={notifyCandidate} onClose={() => setNotifyCandidate(null)} onSave={(email) => { onNotify(notifyCandidate, email); onToast("¡Listo! Te avisaremos cuando se estrene."); }} />}
      </div>
    </main>
  );
}

function CandidateDetailPage({ candidate, voted, notified, onVote, onNotify, go, onToast }: { candidate: Candidate; voted: boolean; notified: boolean; onVote: (candidate: Candidate) => void; onNotify: (candidate: Candidate, email?: string) => void; go: (href: string) => void; onToast: (message: string) => void }) {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  return <main className="detail-page candidate-detail-page"><AppRibbon /><div className="detail-phone"><DetailTop label="Tu decides" onBack={() => go("/carta/tu-decides")} /><div className="detail-hero"><MediaVisual item={candidate} candidate active /><div className="detail-hero__overlay"><Pill tone="accent">IDEA EN VOTACIÓN</Pill><span className="detail-hero__play"><Sparkles size={13} /></span></div></div><div className="detail-body"><div className="detail-title-row"><div><span className="eyebrow-dark">EN PRUEBA</span><h1>{candidate.name}</h1></div><strong>{money(candidate.estimatedPrice)}<small> estimado</small></strong></div><p className="detail-description">{candidate.description}</p><div className="candidate-detail-stats"><span><strong>{candidate.wouldOrderPct}%</strong><small>la pediría</small></span><span><strong>{candidate.votes}</strong><small>votos</small></span><span><strong>{candidate.avgAttention} s</strong><small>mirando</small></span></div><div className="ingredients-block"><span className="eyebrow-dark">EN ESTE PLATO</span><div>{candidate.ingredients.map((ingredient) => <span key={ingredient}><Check size={14} />{ingredient}</span>)}</div></div><div className="candidate-detail-actions"><button className={"detail-vote" + (voted ? " is-voted" : "")} onClick={() => { if (!voted) { onVote(candidate); onToast("¡Gracias! Tu voto cuenta."); } }} disabled={voted}>{voted ? <Check size={18} /> : <Heart size={18} />} {voted ? "Ya votaste" : "Lo pediría"}</button><button className={"detail-notify" + (notified ? " is-notified" : "")} onClick={() => { if (!notified) onNotify(candidate); setShowNotifyModal(true); }}>{notified ? <Check size={17} /> : <Bell size={17} />} {notified ? "Aviso anotado" : "Avisame cuando esté disponible"}</button></div><button className="back-to-menu" onClick={() => go("/carta/tu-decides")}><ArrowLeft size={16} /> Ver todos los platos de Tu decides</button></div></div>{showNotifyModal && <Modal title="¡Anotado!" onClose={() => setShowNotifyModal(false)} actionLabel="Seguir viendo">En el producto real, el restaurante podría avisarte por WhatsApp o enviarte un beneficio cuando el plato esté disponible.</Modal>}</main>;
}

function DashboardNav({ active, go }: { active: "overview" | "tests"; go: (href: string) => void }) {
  return <><div className="dashboard-mobile-top"><BrandMark compact /><Pill>Datos de ejemplo</Pill></div><aside className="dashboard-sidebar"><div className="dashboard-sidebar__brand"><BrandMark /></div><span className="sidebar-eyebrow">VISTA RESTAURANTE</span><nav><button className={active === "overview" ? "is-active" : ""} onClick={() => go("/carta/restaurante")}><LayoutDashboard size={17} /> Resumen</button><button className={active === "tests" ? "is-active" : ""} onClick={() => go("/carta/restaurante/pruebas")}><Sparkles size={17} /> Platos en prueba</button><button onClick={() => go("/carta")}><Utensils size={17} /> Ver carta <ArrowUpRight size={14} /></button></nav><div className="sidebar-restaurant"><span className="sidebar-restaurant__avatar">CB</span><span><strong>{restaurant.name}</strong><small>{restaurant.location}</small></span><MoreHorizontal size={16} /></div></aside></>;
}

function KpiCard({ label, value, sub, icon, featured = false }: { label: string; value: string; sub: string; icon: React.ReactNode; featured?: boolean }) {
  return <article className={"kpi-card" + (featured ? " kpi-card--featured" : "")}><div className="kpi-card__top"><span className="kpi-card__icon">{icon}</span><span className="kpi-card__spark">↗</span></div><span className="kpi-card__label">{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

function DashboardHeader({ title, subtitle, active, go }: { title: string; subtitle: string; active: "overview" | "tests"; go: (href: string) => void }) {
  return <header className="dashboard-header"><div><span className="dashboard-kicker"><span className="live-dot" /> RESUMEN DE CASA BRASA</span><h1>{title}</h1><p>{subtitle}</p></div><div className="dashboard-header__actions"><Pill>Datos de ejemplo</Pill><button className="period-select">Últimos 30 días <ChevronDown size={15} /></button><button className="dashboard-mobile-link" onClick={() => go(active === "overview" ? "/carta/restaurante/pruebas" : "/carta/restaurante")}><RotateCcw size={15} /></button></div></header>;
}

function InterestScoreCard() {
  return <article className="interest-score-card"><div className="interest-score-card__head"><div><span className="eyebrow-dark">PLATO DESTACADO</span><h2>Smash Trufa</h2></div><span className="dish-mini-art">🍔</span></div><div className="interest-score"><div><strong>8.7</strong><span>/ 10</span></div><p>Nivel de interés <b>Muy alto</b></p></div><div className="score-bar score-bar--large"><span style={{ width: "87%" }} /></div><p className="score-explainer"><Info size={14} /> Combina cuánto tiempo lo miraron, cuántas personas volvieron a verlo y cuántas lo agregaron al pedido.</p><div className="interest-metrics"><span><strong>7,1 s</strong><small>Tiempo mirando</small></span><span><strong>29%</strong><small>Volvieron a verlo</small></span><span><strong>24%</strong><small>Quisieron saber más</small></span><span><strong>14%</strong><small>Lo agregaron</small></span></div></article>;
}

function AttentionRanking() {
  return <article className="ranking-card"><div className="card-heading"><div><span className="eyebrow-dark">RANKING DE LA CARTA</span><h2>Los platos que más llaman la atención</h2></div><button className="more-button" aria-label="Más información"><Info size={16} /></button></div><div className="ranking-list">{dishAnalytics.slice(0, 6).map((item, index) => { const dish = getDish(item.slug); return dish ? <div className="ranking-row" key={item.slug}><span className="ranking-row__index">{String(index + 1).padStart(2, "0")}</span><span className="ranking-row__dish"><span className="ranking-row__emoji" style={{ background: "linear-gradient(145deg, " + dish.accent + ", #231a14)" }}>{dish.emoji}</span><strong>{dish.name}</strong></span><span className="ranking-row__tag">{item.label}</span><strong className="ranking-row__value">{item.avgAttention.toFixed(1).replace(".", ",")} s</strong></div> : null; })}</div></article>;
}

function InterestChoiceChart() {
  const points = [
    { name: "Smash Trufa", emoji: "🍔", left: "77%", bottom: "78%", tone: "orange" },
    { name: "Pizza Burrata", emoji: "🍕", left: "69%", bottom: "62%", tone: "orange" },
    { name: "Ravioles", emoji: "🍝", left: "42%", bottom: "60%", tone: "yellow" },
    { name: "Milanesa", emoji: "🥩", left: "55%", bottom: "42%", tone: "green" },
    { name: "Limonada", emoji: "🍋", left: "82%", bottom: "24%", tone: "green" },
    { name: "Tacos", emoji: "🌮", left: "29%", bottom: "27%", tone: "muted" },
  ];
  return <article className="chart-card"><div className="card-heading"><div><span className="eyebrow-dark">LECTURA SIMPLE</span><h2>Lo que llama la atención vs. lo que termina en el pedido</h2></div><button className="more-button" aria-label="Más información"><Info size={16} /></button></div><div className="scatter"><span className="scatter__axis scatter__axis--y">Cuánto interés genera</span><span className="scatter__axis scatter__axis--x">Cuánto lo eligen</span><span className="quadrant quadrant--tl">Atraen,<br />pero algo frena</span><span className="quadrant quadrant--tr">Estrellas</span><span className="quadrant quadrant--bl">Para revisar</span><span className="quadrant quadrant--br">Elección rápida</span>{points.map((point) => <span className={"scatter-point scatter-point--" + point.tone} style={{ left: point.left, bottom: point.bottom }} title={point.name} key={point.name}>{point.emoji}</span>)}</div><div className="chart-legend"><span><i className="legend-dot legend-dot--orange" />Smash Trufa</span><span><i className="legend-dot legend-dot--orange" />Pizza Burrata</span><span><i className="legend-dot legend-dot--yellow" />Ravioles</span><span><i className="legend-dot legend-dot--green" />Otros platos</span></div></article>;
}

function InsightCard({ title, body, tone }: { title: string; body: string; tone: string }) {
  return <article className={"insight-card insight-card--" + tone}><span className="insight-card__icon">{tone === "positive" ? "✦" : tone === "warm" ? "◒" : "⌁"}</span><span className="eyebrow-dark">LECTURA DEL MENÚ</span><h3>{title}</h3><p>{body}</p></article>;
}

function RevisitCard() {
  const revisits = [
    { name: "Cheesecake Pistacho", value: 31, emoji: "🍰", color: "#7f8960" },
    { name: "Smash Trufa", value: 29, emoji: "🍔", color: "#cf6846" },
    { name: "Pizza Burrata", value: 22, emoji: "🍕", color: "#be5d3d" },
    { name: "Ravioles", value: 17, emoji: "🍝", color: "#bb7d44" },
  ];
  return <article className="revisit-card"><div className="card-heading"><div><span className="eyebrow-dark">SEÑAL FUERTE DE INTERÉS</span><h2>Platos que vuelven a mirar</h2></div><span className="revisit-card__icon"><RotateCcw size={17} /></span></div><p className="card-lede">Cuando alguien retrocede en la carta para volver a ver un plato, es una señal fuerte de interés.</p><div className="revisit-list">{revisits.map((item) => <div key={item.name}><span className="revisit-list__dish"><span style={{ background: "linear-gradient(145deg, " + item.color + ", #2b211a)" }}>{item.emoji}</span><strong>{item.name}</strong></span><div className="revisit-list__bar"><i style={{ width: (item.value * 2.55) + "%" }} /></div><b>{item.value}%</b></div>)}</div></article>;
}

function RestaurantOverview({ go }: { go: (href: string) => void }) {
  return <main className="dashboard-page"><AppRibbon restaurantView /><DashboardNav active="overview" go={go} /><div className="dashboard-content"><DashboardHeader title="Qué está pasando en tu carta" subtitle="Una forma simple de entender qué platos generan más interés antes de que el cliente termine de elegir." active="overview" go={go} /><section className="kpi-grid"><KpiCard label="Personas que abrieron la carta" value={overview.menuOpens.toLocaleString("es-UY")} sub="+18% vs. período anterior" icon={<Eye size={18} />} /><KpiCard label="Tiempo promedio mirando un plato" value={(overview.avgAttentionSeconds.toFixed(1).replace(".", ",") + " s")} sub="Casi 2 reproducciones completas" icon={<Clock3 size={18} />} /><KpiCard label="Plato que más atrapó" value={overview.topAttentionDish} sub={overview.topAttentionValue} icon={<Flame size={18} />} featured /><KpiCard label="Plato que más agregaron" value={overview.topAddedDish} sub={overview.topAddedValue} icon={<ShoppingBag size={18} />} /><KpiCard label="Plato que más volvieron a mirar" value={overview.topRevisitedDish} sub={overview.topRevisitedValue} icon={<RotateCcw size={18} />} /></section><section className="dashboard-grid dashboard-grid--top"><InterestScoreCard /><AttentionRanking /></section><section className="dashboard-grid dashboard-grid--wide"><InterestChoiceChart /><RevisitCard /></section><section className="insights-section"><div className="section-kicker">En lenguaje simple</div><div className="insights-grid">{insights.map((insight) => <InsightCard key={insight.title} title={insight.title} body={insight.body} tone={insight.tone} />)}</div></section><div className="dashboard-footer-link"><button onClick={() => go("/carta/restaurante/pruebas")}><Sparkles size={16} /> Ver qué plato conviene probar después <ArrowRight size={16} /></button></div></div></main>;
}

function CandidateRanking({ go }: { go: (href: string) => void }) {
  return <article className="candidate-ranking"><div className="card-heading"><div><span className="eyebrow-dark">RANKING DE IDEAS</span><h2>Personas que dicen “Lo pediría”</h2></div><button className="more-button" aria-label="Más información"><Info size={16} /></button></div><div className="candidate-ranking__rows">{candidates.map((candidate, index) => <button className="candidate-ranking__row" key={candidate.slug} onClick={() => go("/carta/proximamente/" + candidate.slug)}><span className="candidate-ranking__rank">0{index + 1}</span><span className="candidate-ranking__emoji" style={{ background: "linear-gradient(145deg, " + candidate.accent + ", #251a14)" }}>{candidate.emoji}</span><span className="candidate-ranking__name"><strong>{candidate.name}</strong><small>{candidate.votes} votos · {candidate.notifyCount} quieren aviso</small></span><span className="candidate-ranking__bar"><i style={{ width: candidate.wouldOrderPct + "%" }} /></span><strong className="candidate-ranking__pct">{candidate.wouldOrderPct}%</strong></button>)}</div></article>;
}

function RestaurantTests({ go }: { go: (href: string) => void }) {
  return <main className="dashboard-page"><AppRibbon restaurantView /><DashboardNav active="tests" go={go} /><div className="dashboard-content"><DashboardHeader title="Qué plato debería llegar a la carta" subtitle="Compará el interés de tus próximas ideas antes de invertir en lanzarlas." active="tests" go={go} /><section className="kpi-grid kpi-grid--tests"><KpiCard label="Platos en prueba" value="3" sub="Ideas abiertas a votación" icon={<Sparkles size={18} />} /><KpiCard label="Votos recibidos" value="993" sub="Personas que opinaron" icon={<Vote size={18} />} /><KpiCard label="Quieren que les avises" value="374" sub="Interés para el lanzamiento" icon={<Bell size={18} />} /><KpiCard label="Candidato con más interés" value="Burger BBQ" sub="72% la pediría" icon={<Star size={18} />} featured /></section><section className="dashboard-grid dashboard-grid--tests"><div className="test-hero-card"><div className="test-hero-card__top"><Pill tone="accent">MEJOR CANDIDATO</Pill><span className="test-hero-card__star">✦</span></div><span className="eyebrow-dark">BURGER BBQ AHUMADA</span><h2>La idea con más fuerza<br /><em>para llegar a la carta.</em></h2><p>Combina el mayor porcentaje de personas que dicen que la pedirían, el mayor tiempo mirando y la mayor cantidad de personas que quieren que les avisemos.</p><div className="test-hero-card__stats"><span><strong>72%</strong><small>la pediría</small></span><span><strong>438</strong><small>votos</small></span><span><strong>186</strong><small>quieren aviso</small></span><span><strong>7,2 s</strong><small>mirando</small></span></div><button onClick={() => go("/carta/proximamente/burger-bbq-ahumada")}>Ver cómo se ve para el cliente <ArrowUpRight size={16} /></button></div><CandidateRanking go={go} /></section><section className="comparison-section"><div className="section-kicker">Una decisión más simple</div><div className="comparison-copy"><h2>Probá antes de<br /><em>incorporar.</em></h2><p>Los votos no reemplazan tu criterio. Te dan una señal rápida sobre qué idea vale la pena explorar primero.</p></div><div className="candidate-bars">{candidates.map((candidate, index) => <div className="candidate-bar-row" key={candidate.slug}><span className="candidate-bar-row__name"><b>0{index + 1}</b>{candidate.name}</span><div><i style={{ width: candidate.wouldOrderPct + "%" }} /></div><strong>{candidate.wouldOrderPct}%</strong></div>)}</div></section><div className="dashboard-footer-link"><button onClick={() => go("/carta")}><Utensils size={16} /> Volver a ver la carta como cliente <ArrowRight size={16} /></button></div></div></main>;
}

type MenuApiPayload = {
  categories: Array<{ label: string; icon: string }>;
  dishes: Array<Omit<Dish, "category" | "video" | "poster"> & { category: string; video: string | null; poster: string | null }>;
};

type CandidatesApiPayload = {
  candidates: Array<Omit<Candidate, "video" | "poster"> & { video: string | null; poster: string | null }>;
};

export default function CasaBrasaSite() {
  const pathname = usePathname();
  const go = useNavigation();
  const [menuCategories, setMenuCategories] = useState(categories);
  const [menuDishes, setMenuDishes] = useState(dishes);
  const [menuCandidates, setMenuCandidates] = useState(candidates);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastMessage>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMvpData = async () => {
      try {
        const [menuResponse, candidatesResponse] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/tu-decides"),
        ]);

        if (menuResponse.ok) {
          const payload = await menuResponse.json() as MenuApiPayload;
          if (!cancelled && payload.categories?.length && payload.dishes?.length) {
            setMenuCategories(payload.categories);
            setMenuDishes(payload.dishes.map((dish) => ({
              ...dish,
              video: dish.video ?? "",
              poster: dish.poster ?? dish.image,
            })));
          }
        }

        if (candidatesResponse.ok) {
          const payload = await candidatesResponse.json() as CandidatesApiPayload;
          if (!cancelled && payload.candidates?.length) {
            setMenuCandidates(payload.candidates.map((candidate) => ({
              ...candidate,
              video: candidate.video ?? "",
              poster: candidate.poster ?? "",
            })));
          }
        }
      } catch {
        // Static data remains available as a visual fallback when the API is unavailable.
      }
    };

    void loadMvpData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const savedVotes = window.localStorage.getItem("casa-brasa-votes");
        const savedNotified = window.localStorage.getItem("casa-brasa-notified");
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

  useEffect(() => { if (hydrated) window.localStorage.setItem("casa-brasa-votes", JSON.stringify(votes)); }, [votes, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("casa-brasa-notified", JSON.stringify(notified)); }, [notified, hydrated]);

  const showToast = (message: string) => setToast({ id: Date.now(), message });
  const getVoterToken = () => {
    const storageKey = "casa-brasa-voter-token";
    const existingToken = window.localStorage.getItem(storageKey);
    if (existingToken) return existingToken;
    const generatedToken = typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, generatedToken);
    return generatedToken;
  };
  const registerVote = (candidate: Candidate) => {
    setVotes((current) => current[candidate.slug] ? current : ({ ...current, [candidate.slug]: true }));
    try {
      void fetch(`/api/tu-decides/${encodeURIComponent(candidate.slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterToken: getVoterToken() }),
      }).catch(() => undefined);
    } catch {
      // The local optimistic vote keeps the demo usable if the API is unavailable.
    }
  };
  const registerNotify = (candidate: Candidate, email?: string) => {
    setNotified((current) => current[candidate.slug] ? current : ({ ...current, [candidate.slug]: true }));
    if (!email) return;
    try {
      void fetch(`/api/tu-decides/${encodeURIComponent(candidate.slug)}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => undefined);
    } catch {
      // The local confirmation keeps the demo usable if the API is unavailable.
    }
  };

  const parts = pathname.split("/").filter(Boolean);
  const isLanding = parts.length === 0;
  const data = { categories: menuCategories, dishes: menuDishes, candidates: menuCandidates };
  let page: React.ReactNode;

  if (isLanding) page = <ClientMenuPage go={go} />;
  else if (parts[0] !== "carta") page = <NotFoundState go={go} />;
  else if (parts[1] === "tradicional") page = <TraditionalMenuPage go={go} />;
  else if (parts[1] === "plato" && parts[2]) {
    const dish = menuDishes.find((item) => item.slug === parts[2]);
    page = dish ? <DishDetailPage dish={dish} go={go} /> : <NotFoundState go={go} />;
  } else if ((parts[1] === "tu-decides" || parts[1] === "proximamente") && parts[2]) {
    const candidate = menuCandidates.find((item) => item.slug === parts[2]);
    page = candidate ? <CandidateDetailPage candidate={candidate} voted={Boolean(votes[candidate.slug])} notified={Boolean(notified[candidate.slug])} onVote={registerVote} onNotify={registerNotify} go={go} onToast={showToast} /> : <NotFoundState go={go} />;
  } else if (parts[1] === "tu-decides" || parts[1] === "proximamente") {
    page = <UpcomingPage votes={votes} onVote={registerVote} onNotify={registerNotify} go={go} onToast={showToast} />;
  } else {
    page = <ClientMenuPage go={go} />;
  }

  return <MvpDataContext.Provider value={data}>{page}<Toast toast={toast} onClose={() => setToast(null)} /></MvpDataContext.Provider>;
}
