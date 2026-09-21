"use client";

import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Eye,
  MoreHorizontal,
  Play,
  Plus,
  QrCode,
  Send,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { candidates } from "@/data/candidates";
import { dishes } from "@/data/dishes";
import { whatsappUrl } from "@/data/restaurant";
import { ArrowButton, BrandMark, MediaVisual, Pill } from "./shared";

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
          <div className="hero-phone__price-row"><strong>{`$${dish.price}`}</strong><button><Plus size={16} /> Agregar</button></div>
        </div>
        <div className="hero-phone__progress"><span style={{ width: `${42 + index * 19}%` }} /></div>
        <div className="hero-phone__nav"><span className="is-current">⌂<small>Carta</small></span><span>◉<small>Viene</small></span><span>♧<small>Pedido</small></span></div>
      </div>
      <div className="floating-chip floating-chip--top"><span className="floating-chip__emoji">◌</span><span><strong>6,8 s</strong><small>mirando el plato</small></span></div>
      <div className="floating-chip floating-chip--bottom"><span className="floating-chip__emoji">↗</span><span><strong>Volvieron a verlo</strong><small>una señal de interés</small></span></div>
    </div>
  );
}

export function Landing({ go }: { go: (href: string) => void }) {
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

function Benefit({ number, icon, title, body, accent = false }: { number: string; icon: ReactNode; title: string; body: string; accent?: boolean }) {
  return <article className={`benefit-card ${accent ? "benefit-card--accent" : ""}`}><div className="benefit-card__top"><span>{number}</span><span className="benefit-card__icon">{icon}</span></div><h3>{title}</h3><p>{body}</p><span className="benefit-card__arrow"><ArrowUpRight size={17} /></span></article>;
}

function HowStep({ number, title, body, icon }: { number: string; title: string; body: string; icon: ReactNode }) {
  return <article className="how-step"><div className="how-step__number">{number}</div><div className="how-step__icon">{icon}</div><h3>{title}</h3><p>{body}</p></article>;
}

function CandidatePreview({ candidate, rank, onClick }: { candidate: (typeof candidates)[number]; rank: number; onClick: () => void }) {
  return <button className="candidate-preview" onClick={onClick}><div className="candidate-preview__media"><MediaVisual item={candidate} candidate compact /><span className="candidate-preview__rank">0{rank}</span></div><div className="candidate-preview__copy"><span className="eyebrow-dark">EN PRUEBA</span><h3>{candidate.name}</h3><div className="candidate-preview__stats"><strong>{candidate.wouldOrderPct}%</strong><span>la pediría</span><small>{candidate.notifyCount} quieren aviso</small></div></div></button>;
}
