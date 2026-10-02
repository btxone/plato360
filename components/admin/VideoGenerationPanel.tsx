"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Activity, Check, Clock, Clapperboard, Download, Eye, Image as ImageIcon, Library, MoreHorizontal, Play, Plus, RefreshCw, Search, Sparkles, Upload, Video, X } from "lucide-react";

type VideoSection = "queue" | "generate" | "library";
type VideoJobStatus = "queued" | "processing" | "ready" | "review";

type VideoJob = {
  id: string;
  title: string;
  description?: string;
  source: string;
  status: VideoJobStatus;
  progress: number;
  meta: string;
  time: string;
  background: string;
};

type LibraryItem = {
  id: string;
  title: string;
  category: string;
  status: "Publicado" | "Borrador";
  updated: string;
  background: string;
  videoUrl: string;
  posterUrl: string | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  categoryName: string;
  status: "draft" | "scheduled" | "published" | "retired";
  isAvailable: boolean;
  inVisualMenu?: boolean;
  media: { imageKey: string | null; posterKey: string | null; videoKey: string | null };
  accent: string;
};

type AdminCatalog = {
  location: { name: string };
  products: CatalogProduct[];
};

type CatalogResponse = AdminCatalog | { catalogs: AdminCatalog[] };

const initialQueue: VideoJob[] = [
  { id: "job-1", title: "Smash Trufa", source: "Foto principal · Carta", status: "processing", progress: 68, meta: "Vertical 9:16 · 8 s", time: "~ 2 min restantes", background: "linear-gradient(135deg, #4b2d24, #f08059)" },
  { id: "job-2", title: "Pizza Burrata", source: "Foto principal · Carta", status: "queued", progress: 0, meta: "Vertical 9:16 · 8 s", time: "En cola · posición 2", background: "linear-gradient(135deg, #593f2b, #e8b86c)" },
  { id: "job-3", title: "Cheesecake Pistacho", source: "Foto principal · Carta", status: "review", progress: 100, meta: "Vertical 9:16 · 10 s", time: "Listo hace 18 min", background: "linear-gradient(135deg, #314335, #a7bd81)" },
];

const statusLabel: Record<VideoJobStatus, string> = {
  queued: "En cola",
  processing: "Generando",
  ready: "Listo para revisar",
  review: "Revisión pendiente",
};

const statusIcon: Record<VideoJobStatus, typeof Clock> = {
  queued: Clock,
  processing: Activity,
  ready: Check,
  review: Eye,
};

const assetUrl = (value: string | null) => value ? (/^(?:https?:|data:|\/)/.test(value) ? value : `/${value}`) : null;

function VideoSectionTabs({ section, onChange }: { section: VideoSection; onChange: (section: VideoSection) => void }) {
  const tabs: Array<{ id: VideoSection; label: string; helper: string; icon: typeof Clapperboard }> = [
    { id: "queue", label: "Cola", helper: "3 trabajos", icon: Activity },
    { id: "generate", label: "Generar video", helper: "Nuevo clip", icon: Sparkles },
    { id: "library", label: "Librería", helper: "Carta + borradores", icon: Library },
  ];
  return <div className="admin-video-tabs" role="tablist" aria-label="Secciones de generación de videos">{tabs.map(({ id, label, helper, icon: Icon }) => <button className={section === id ? "is-active" : ""} key={id} type="button" role="tab" aria-selected={section === id} onClick={() => onChange(id)}><Icon size={17} /><span><strong>{label}</strong><small>{helper}</small></span></button>)}</div>;
}

function VideoStat({ label, value, helper, tone = "" }: { label: string; value: string; helper: string; tone?: string }) {
  return <div className={`admin-video-stat ${tone}`}><small>{label}</small><strong>{value}</strong><span>{helper}</span></div>;
}

function VideoJobCard({ job }: { job: VideoJob }) {
  const Icon = statusIcon[job.status];
  return <article className="admin-video-job"><div className="admin-video-job__thumb" style={{ background: job.background }}><Video size={22} /><button type="button" aria-label={`Previsualizar ${job.title}`}><Play size={15} fill="currentColor" /></button></div><div className="admin-video-job__body"><div className="admin-video-job__heading"><div><strong>{job.title}</strong><small>{job.source}</small></div><button className="admin-icon-button" type="button" aria-label={`Más acciones para ${job.title}`}><MoreHorizontal size={17} /></button></div><div className="admin-video-job__meta"><span className={`admin-video-status admin-video-status--${job.status}`}><Icon size={13} />{statusLabel[job.status]}</span><span>{job.meta}</span><span>{job.time}</span></div><div className="admin-video-progress" aria-label={`${job.progress}% completado`}><i style={{ width: `${job.progress}%` }} /></div><small className="admin-video-job__progress">{job.status === "queued" ? "Esperando un espacio de generación" : `${job.progress}% completado`}</small></div></article>;
}

function QueueView({ queue, onRefresh, onGenerate }: { queue: VideoJob[]; onRefresh: () => void; onGenerate: () => void }) {
  const processing = queue.filter((job) => job.status === "processing").length;
  const queued = queue.filter((job) => job.status === "queued").length;
  const ready = queue.filter((job) => job.status === "ready" || job.status === "review").length;
  return <div className="admin-video-view"><div className="admin-video-stats"><VideoStat label="En cola" value={String(queued)} helper="Esperando generación" /><VideoStat label="Procesando" value={String(processing)} helper="Se actualiza en vivo" tone="is-highlight" /><VideoStat label="Listos para revisar" value={String(ready)} helper="Requieren tu aprobación" /><VideoStat label="Tiempo estimado" value="~ 8 min" helper="Para completar la cola" /></div><div className="admin-video-section-heading"><div><span className="admin-eyebrow">Producción</span><h2>Cola de generación</h2><p>Seguí el estado de los videos que están siendo preparados para tu carta.</p></div><div className="admin-video-heading-actions"><button className="admin-secondary" type="button" onClick={onRefresh}><RefreshCw size={15} />Actualizar</button><button className="admin-primary admin-primary--small" type="button" onClick={onGenerate}><Plus size={15} />Nuevo video</button></div></div><div className="admin-video-job-list">{queue.map((job) => <VideoJobCard job={job} key={job.id} />)}</div></div>;
}

function GenerateView({ onCreated }: { onCreated: (job: VideoJob) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<Array<{ id: string; file: File }>>([]);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && images.length >= 2 && images.length <= 4;
  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setImageError("Solo podés subir imágenes JPG, PNG o WebP.");
      return;
    }
    if (images.length + selected.length > 4) {
      setImageError("Podés subir un máximo de 4 imágenes.");
      return;
    }
    setImageError("");
    setImages((current) => [...current, ...selected.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file }))]);
  };
  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
    setImageError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setImageError(images.length < 2 ? "Subí entre 2 y 4 imágenes para continuar." : "Completá el título y la descripción para continuar.");
      return;
    }
    onCreated({ id: `job-${Date.now()}`, title: title.trim(), description: description.trim(), source: "Nueva generación", status: "queued", progress: 0, meta: `${images.length} imágenes de referencia`, time: "En cola · posición 4", background: "linear-gradient(135deg, #3d2b25, #b86c4e)" });
  };
  return <div className="admin-video-view"><div className="admin-video-generator-layout"><form className="admin-video-form" onSubmit={submit}><div className="admin-video-section-heading"><div><span className="admin-eyebrow">Nuevo contenido</span><h2>Generá un video</h2><p>Completá el título, la descripción y cargá entre 2 y 4 imágenes de referencia.</p></div></div><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Hamburguesa especial de la casa" required /></label><label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describí el producto, sus ingredientes y qué debería destacar el video…" rows={5} maxLength={500} required /><small className="admin-video-counter">{description.length}/500</small></label><div className={`admin-video-upload admin-video-upload--images ${imageError ? "is-error" : ""}`}><Upload size={18} /><div><strong>Imágenes de referencia</strong><small>Requeridas: entre 2 y 4 · JPG, PNG o WebP · hasta 10 MB cada una</small>{images.length > 0 && <div className="admin-video-image-list">{images.map((image, index) => <span className="admin-video-image" key={image.id}><ImageIcon size={14} /><span>{index + 1}. {image.file.name}</span><button type="button" onClick={() => removeImage(image.id)} aria-label={`Quitar ${image.file.name}`}><X size={13} /></button></span>)}</div>}{imageError && <small className="admin-video-upload-error">{imageError}</small>}</div><input ref={fileInputRef} className="admin-sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} /><button className="admin-secondary" type="button" onClick={() => fileInputRef.current?.click()}>Elegir imágenes</button></div><div className="admin-video-form-actions"><span><ImageIcon size={15} />{images.length}/4 imágenes · mínimo 2</span><button className="admin-primary" type="submit" disabled={!canSubmit}><Sparkles size={16} />Agregar a la cola</button></div></form><aside className="admin-video-preview"><div className="admin-video-preview__visual"><div className="admin-video-preview__glow" /><span className="admin-video-preview__label">Vista previa</span><div className="admin-video-preview__plate"><ImageIcon size={54} /></div><button type="button" aria-label="Reproducir vista previa"><Play size={17} fill="currentColor" /></button></div><div className="admin-video-preview__copy"><span className="admin-eyebrow">Brief seleccionado</span><h3>{title || "Tu nuevo video"}</h3><p>{images.length} de 2-4 imágenes cargadas</p><div className="admin-video-steps"><span><i>1</i>Analizar imágenes</span><span><i>2</i>Generar movimiento</span><span><i>3</i>Preparar revisión</span></div></div></aside></div></div>;
}

function LibraryView({ locationId }: { locationId?: string | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const queryString = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
        const response = await fetch(`/api/admin/catalog${queryString}`);
        const body = await response.json() as CatalogResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "No se pudo cargar la librería.");
        const catalogs = "catalogs" in body ? body.catalogs : [body];
        const nextItems = catalogs.flatMap((catalog) => catalog.products.flatMap((product) => {
          const isDraft = product.status === "draft";
          const isCurrent = product.status === "published" && product.isAvailable && (product.inVisualMenu ?? true);
          if (!product.media.videoKey || (!isDraft && !isCurrent)) return [];
          return [{
            id: product.id,
            title: product.name,
            category: `${catalog.location.name} · ${product.categoryName}`,
            status: isDraft ? "Borrador" as const : "Publicado" as const,
            updated: isDraft ? "Borrador del catálogo" : "Actual en la carta",
            background: `linear-gradient(135deg, ${product.accent}, #2b201e)`,
            videoUrl: assetUrl(product.media.videoKey) ?? "",
            posterUrl: assetUrl(product.media.posterKey ?? product.media.imageKey),
          }];
        }));
        if (!cancelled) setItems(nextItems);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo cargar la librería.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [locationId, reloadToken]);
  const filtered = useMemo(() => items.filter((item) => (filter === "Todos" || item.status === filter) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [filter, items, query]);
  return <div className="admin-video-view"><div className="admin-video-library-toolbar"><label className="admin-video-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar videos…" /></label><label><span className="admin-sr-only">Filtrar por estado</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todos</option><option>Publicado</option><option>Borrador</option></select></label><button className="admin-secondary" type="button" onClick={() => setReloadToken((current) => current + 1)}>Actualizar</button><button className="admin-secondary" type="button" disabled><Download size={15} />Exportar</button></div><div className="admin-video-library-heading"><div><span className="admin-eyebrow">Carta y borradores</span><h2>Librería de videos</h2><p>Videos asociados a los platos actuales de la carta y a sus borradores.</p></div><span className="admin-video-library-count">{filtered.length} de {items.length} videos</span></div>{loading ? <div className="admin-empty"><span>✦</span><p>Cargando videos de la carta…</p></div> : error ? <p className="admin-error">{error}</p> : filtered.length === 0 ? <div className="admin-empty"><span>✦</span><p>No hay videos publicados o borradores con esos filtros.</p></div> : <div className="admin-video-library-grid">{filtered.map((item) => <article className="admin-video-library-card" key={item.id}><div className="admin-video-library-card__thumb" style={{ background: item.background }}><video src={item.videoUrl} poster={item.posterUrl ?? undefined} muted loop autoPlay playsInline preload="metadata" aria-label={`Video de ${item.title}`} /><span>{item.status}</span><button type="button" aria-label={`Reproducir ${item.title}`}><Play size={15} fill="currentColor" /></button></div><div className="admin-video-library-card__body"><div><strong>{item.title}</strong><span>{item.category}</span></div><span className={`admin-video-library-status admin-video-library-status--${item.status.toLowerCase()}`}>{item.status}</span><small>{item.updated}</small></div></article>)}</div>}</div>;
}

export default function VideoGenerationPanel({ section = "queue", locationId, onSectionChange }: { section?: VideoSection; locationId?: string | null; onSectionChange?: (section: VideoSection) => void }) {
  const [queue, setQueue] = useState(initialQueue);
  const [notice, setNotice] = useState("");
  const createJob = (job: VideoJob) => { setQueue((current) => [job, ...current]); onSectionChange?.("queue"); setNotice(`${job.title} fue agregado a la cola.`); window.setTimeout(() => setNotice(""), 3200); };
  const changeSection = (nextSection: VideoSection) => onSectionChange?.(nextSection);
  return <section className="admin-panel admin-video-panel"><header className="admin-panel__header"><div><span className="admin-eyebrow">Contenido</span><h1>Generación de videos</h1><p>Creá, revisá y organizá los videos que hacen más atractiva tu carta.</p></div><div className="admin-video-header-mark"><Clapperboard size={18} /><span>Front en preparación</span></div></header><VideoSectionTabs section={section} onChange={changeSection} />{notice && <p className="admin-success"><Check size={16} />{notice}</p>}{section === "queue" && <QueueView queue={queue} onRefresh={() => setNotice("La cola está actualizada.")} onGenerate={() => changeSection("generate")} />}{section === "generate" && <GenerateView onCreated={createJob} />}{section === "library" && <LibraryView locationId={locationId} />}</section>;
}
