"use client";

import { ArrowLeft, ArrowUpRight, Bell, Check, ChevronDown, ChevronLeft, Heart, ShoppingBag, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Candidate } from "@/data/candidates";
import { AppRibbon, BrandMark, DetailTop, MediaVisual, money, Pill } from "./shared";
import { BottomNav } from "./navigation";

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
            } as CSSProperties}
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

function NotifyModal({ candidate, onClose, onSave }: { candidate: Candidate; onClose: () => void; onSave: (email: string) => Promise<boolean> | boolean }) {
  const [stage, setStage] = useState<"question" | "email" | "success">("question");
  const [canClose, setCanClose] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [domain, setDomain] = useState(emailDomains[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
            <form className="notify-form" onSubmit={async (event) => {
              event.preventDefault();
              if (!canSubmit || saving) return;
              setSaving(true);
              setErrorMessage("");
              try {
                if (await onSave(email)) setStage("success");
                else setErrorMessage("No pudimos guardar tu interés. Probá nuevamente.");
              } catch {
                setErrorMessage("No pudimos guardar tu interés. Probá nuevamente.");
              } finally {
                setSaving(false);
              }
            }}>
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
              {errorMessage && <small role="alert">{errorMessage}</small>}
              <button className="modal-action" type="submit" disabled={!canSubmit || saving}>{saving ? "Guardando…" : "Guardar aviso"}</button>
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

function CandidateSlide({ candidate, index, total, active, voted, onVote, onDetails }: { candidate: Candidate; index: number; total: number; active: boolean; voted: boolean; onVote: () => void; onDetails: () => void }) {
  return (
    <article className="candidate-slide" data-candidate-slide={index}>
      <MediaVisual item={candidate} candidate active={active} />
      <div className="candidate-slide__veil" />
      <div className="candidate-slide__top">
        <Pill tone="accent">EN PRUEBA</Pill>
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <div className="candidate-slide__content">
        <span className="candidate-slide__eyebrow">TU DECIDES · PRÓXIMO PLATO</span>
        <div className="candidate-slide__title">
          <h1>{candidate.name}</h1>
          <strong>{money(candidate.estimatedPrice)}</strong>
        </div>
        <p>{candidate.description}</p>
        <div className="candidate-slide__stats">
          <span><strong>{candidate.wouldOrderPct > 0 ? `${candidate.wouldOrderPct}%` : "—"}</strong><small>{candidate.wouldOrderPct > 0 ? "dice que lo pediría" : "todavía sin muestra"}</small></span>
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

export function UpcomingPage({ candidates, votes, cartCount, onVote, onNotify, go, onToast }: { candidates: Candidate[]; votes: Record<string, boolean>; cartCount: number; onVote: (candidate: Candidate) => Promise<boolean>; onNotify: (candidate: Candidate, email: string) => Promise<boolean>; go: (href: string) => void; onToast: (message: string) => void }) {
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

  const handleVote = async (candidate: Candidate) => {
    if (votes[candidate.slug]) return;
    const saved = await onVote(candidate);
    if (!saved) return;
    setCelebratingSlug(candidate.slug);
    if (voteTimer.current) window.clearTimeout(voteTimer.current);
    voteTimer.current = window.setTimeout(() => {
      setCelebratingSlug(null);
      setNotifyCandidate(candidate);
    }, 850);
  };

  const celebratingCandidate = candidates.find((candidate) => candidate.slug === celebratingSlug);

  return (
    <main className="upcoming-page">
      <AppRibbon />
      <div className="upcoming-wrap">
        <div className="upcoming-header">
          <button onClick={() => go("/carta")} aria-label="Volver a la carta"><ChevronLeft size={20} /></button>
          <BrandMark compact />
          <div className="upcoming-header__right">
            <Pill tone="accent">TU DECIDES</Pill>
            <button onClick={() => go("/carta/pedido")} aria-label="Ver mi pedido"><ShoppingBag size={18} /></button>
          </div>
        </div>
        <div className="upcoming-feed" ref={feedRef} aria-label="Platos que podés elegir">
          {candidates.map((candidate, index) => (
            <CandidateSlide
              key={candidate.slug}
              candidate={candidate}
              index={index}
              total={candidates.length}
              active={index === activeIndex}
              voted={Boolean(votes[candidate.slug])}
              onVote={() => handleVote(candidate)}
              onDetails={() => go("/carta/proximamente/" + candidate.slug)}
            />
          ))}
        </div>
        <div className="upcoming-progress" aria-live="polite">{String(activeIndex + 1).padStart(2, "0")} / {String(candidates.length).padStart(2, "0")}</div>
        <BottomNav active="upcoming" cartCount={cartCount} go={go} />
        {celebratingCandidate && <VoteCelebration candidate={celebratingCandidate} />}
        {notifyCandidate && <NotifyModal candidate={notifyCandidate} onClose={() => setNotifyCandidate(null)} onSave={async (email) => { const saved = await onNotify(notifyCandidate, email); if (saved) onToast("¡Listo! Te avisaremos cuando se estrene."); return saved; }} />}
      </div>
    </main>
  );
}

export function CandidateDetailPage({ candidate, voted, notified, onVote, onNotify, go, onToast }: { candidate: Candidate; voted: boolean; notified: boolean; onVote: (candidate: Candidate) => Promise<boolean>; onNotify: (candidate: Candidate, email: string) => Promise<boolean>; go: (href: string) => void; onToast: (message: string) => void }) {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  return <main className="detail-page candidate-detail-page"><AppRibbon /><div className="detail-phone"><DetailTop label="Próximo plato" onBack={() => go("/carta/proximamente")} /><div className="detail-hero"><MediaVisual item={candidate} candidate active /><div className="detail-hero__overlay"><Pill tone="accent">PRÓXIMO PLATO</Pill><span className="detail-hero__play"><Sparkles size={13} /></span></div></div><div className="detail-body"><div className="detail-title-row"><div><span className="eyebrow-dark">EN PRUEBA</span><h1>{candidate.name}</h1></div><strong>{money(candidate.estimatedPrice)}<small> estimado</small></strong></div><p className="detail-description">{candidate.description}</p><div className="candidate-detail-stats"><span><strong>{candidate.wouldOrderPct > 0 ? `${candidate.wouldOrderPct}%` : "—"}</strong><small>{candidate.wouldOrderPct > 0 ? "la pediría" : "todavía sin muestra"}</small></span><span><strong>{candidate.votes > 0 ? candidate.votes : "—"}</strong><small>{candidate.votes > 0 ? "votos" : "todavía sin votos"}</small></span><span><strong>{candidate.avgAttention > 0 ? `${candidate.avgAttention} s` : "—"}</strong><small>{candidate.avgAttention > 0 ? "mirando" : "telemetría pendiente"}</small></span></div><div className="ingredients-block"><span className="eyebrow-dark">EN ESTE PLATO</span><div>{candidate.ingredients.length > 0 ? candidate.ingredients.map((ingredient) => <span key={ingredient}><Check size={14} />{ingredient}</span>) : <span>Aún no hay ingredientes cargados.</span>}</div></div><div className="candidate-detail-actions"><button className={"detail-vote" + (voted ? " is-voted" : "")} onClick={async () => { if (!voted && await onVote(candidate)) onToast("¡Gracias! Tu voto cuenta."); }} disabled={voted}>{voted ? <Check size={18} /> : <Heart size={18} />} {voted ? "Ya votaste" : "Lo pediría"}</button><button className={"detail-notify" + (notified ? " is-notified" : "")} onClick={() => { if (!notified) setShowNotifyModal(true); }} disabled={notified}>{notified ? <Check size={17} /> : <Bell size={17} />} {notified ? "Aviso anotado" : "Avisame cuando esté disponible"}</button></div><button className="back-to-menu" onClick={() => go("/carta/proximamente")}><ArrowLeft size={16} /> Ver todos los platos en prueba</button></div></div>{showNotifyModal && <NotifyModal candidate={candidate} onClose={() => setShowNotifyModal(false)} onSave={async (email) => { const saved = await onNotify(candidate, email); if (saved) onToast("¡Listo! Te avisaremos cuando se estrene."); return saved; }} />}</main>;
}
