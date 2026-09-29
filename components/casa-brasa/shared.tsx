"use client";

import { ArrowUpRight, Check, ChevronLeft, MoreHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Candidate, Dish } from "@/lib/catalog-types";

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
        <strong>Plato360</strong>
        {!compact && <small>Carta digital</small>}
      </span>
    </span>
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

export function MediaVisual({
  item,
  active = true,
  compact = false,
}: {
  item: Dish | Candidate;
  active?: boolean;
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
      {!failed && item.video && (
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
      {(!item.video || failed) && <div className="media-visual__missing">Video no disponible</div>}
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
