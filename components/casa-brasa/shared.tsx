"use client";

import { ArrowUpRight, Check, ChevronLeft, MoreHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { type Candidate } from "@/data/candidates";
import { restaurant } from "@/data/restaurant";
import { type Dish } from "@/data/dishes";

export type ToastMessage = { id: number; message: string } | null;
export type Cart = Record<string, number>;

export const money = (value: number) => `$${value.toLocaleString("es-UY")}`;

export function useNavigation() {
  const router = useRouter();
  return (href: string) => {
    router.push(href);
    window.setTimeout(() => window.scrollTo(0, 0), 0);
  };
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
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

export function AppRibbon({ restaurantView = false }: { restaurantView?: boolean }) {
  const go = useNavigation();
  return (
    <div className="app-ribbon" aria-label="Navegación principal">
      <span className="app-ribbon__label"><span className="app-dot" /> CASA BRASA</span>
      <span className="app-ribbon__divider" />
      <button className={!restaurantView ? "is-active" : ""} onClick={() => go("/carta")}>Vista cliente</button>
      <button className={restaurantView ? "is-active" : ""} onClick={() => go("/carta/restaurante")}>Vista restaurante</button>
    </div>
  );
}

export function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
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

export function FallbackVisual({ item, candidate = false }: { item: Dish | Candidate; candidate?: boolean }) {
  return (
    <div className={`fallback-visual ${candidate ? "fallback-visual--candidate" : ""}`} style={{ "--fallback-accent": item.accent } as CSSProperties}>
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

export function MediaVisual({
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

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "green" | "warning" }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function ArrowButton({ children, onClick, variant = "light", icon = true }: { children: ReactNode; onClick?: () => void; variant?: "light" | "dark" | "outline"; icon?: boolean }) {
  return (
    <button className={`arrow-button arrow-button--${variant}`} onClick={onClick}>
      <span>{children}</span>{icon && <ArrowUpRight size={16} strokeWidth={2.2} />}
    </button>
  );
}

export function DetailTop({ label, onBack }: { label: string; onBack: () => void }) {
  return <div className="detail-top"><button onClick={onBack} aria-label="Volver"><ChevronLeft size={20} /></button><span>{label}</span><button aria-label="Más opciones"><MoreHorizontal size={19} /></button></div>;
}
