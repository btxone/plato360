"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Activity, Check, Clock, Clapperboard, Download, Eye, Library, MoreHorizontal, Play, Plus, RefreshCw, Search, Sparkles, Upload, Video } from "lucide-react";

type VideoSection = "queue" | "generate" | "library";
type VideoJobStatus = "queued" | "processing" | "ready" | "review";

type VideoJob = {
  id: string;
  title: string;
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
  duration: string;
  status: "Publicado" | "Borrador" | "Archivado";
  updated: string;
  background: string;
};

const initialQueue: VideoJob[] = [
  { id: "job-1", title: "Smash Trufa", source: "Foto principal · Carta", status: "processing", progress: 68, meta: "Vertical 9:16 · 8 s", time: "~ 2 min restantes", background: "linear-gradient(135deg, #4b2d24, #f08059)" },
  { id: "job-2", title: "Pizza Burrata", source: "Foto principal · Carta", status: "queued", progress: 0, meta: "Vertical 9:16 · 8 s", time: "En cola · posición 2", background: "linear-gradient(135deg, #593f2b, #e8b86c)" },
  { id: "job-3", title: "Cheesecake Pistacho", source: "Foto principal · Carta", status: "review", progress: 100, meta: "Vertical 9:16 · 10 s", time: "Listo hace 18 min", background: "linear-gradient(135deg, #314335, #a7bd81)" },
];

const libraryItems: LibraryItem[] = [
  { id: "library-1", title: "Smash Trufa", category: "Carta · Hamburguesas", duration: "00:08", status: "Publicado", updated: "Actualizado hoy", background: "linear-gradient(135deg, #4b2d24, #f08059)" },
  { id: "library-2", title: "Pizza Burrata", category: "Carta · Para compartir", duration: "00:08", status: "Publicado", updated: "Actualizado ayer", background: "linear-gradient(135deg, #593f2b, #e8b86c)" },
  { id: "library-3", title: "Cheesecake Pistacho", category: "Carta · Postres", duration: "00:10", status: "Borrador", updated: "Hace 18 min", background: "linear-gradient(135deg, #314335, #a7bd81)" },
  { id: "library-4", title: "Ravioles de Calabaza", category: "Carta · Pastas", duration: "00:08", status: "Publicado", updated: "28 sep 2026", background: "linear-gradient(135deg, #503927, #d98d4e)" },
  { id: "library-5", title: "Milanesa Brasa", category: "Carta · Principales", duration: "00:08", status: "Archivado", updated: "24 sep 2026", background: "linear-gradient(135deg, #342b29, #b86e54)" },
  { id: "library-6", title: "Tacos Crispy", category: "Decides tú", duration: "00:06", status: "Borrador", updated: "22 sep 2026", background: "linear-gradient(135deg, #3f4927, #d3b75a)" },
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

const generationStyles = ["Editorial cálido", "Food close-up", "Minimalista", "Dinámico social"];
const dishOptions = ["Smash Trufa", "Pizza Burrata", "Cheesecake Pistacho", "Ravioles de Calabaza", "Milanesa Brasa", "Tacos Crispy"];

function VideoSectionTabs({ section, onChange }: { section: VideoSection; onChange: (section: VideoSection) => void }) {
  const tabs: Array<{ id: VideoSection; label: string; helper: string; icon: typeof Clapperboard }> = [
    { id: "queue", label: "Cola", helper: "3 trabajos", icon: Activity },
    { id: "generate", label: "Generar video", helper: "Nuevo clip", icon: Sparkles },
    { id: "library", label: "Librería", helper: "18 videos", icon: Library },
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
  const [dish, setDish] = useState(dishOptions[0]);
  const [style, setStyle] = useState(generationStyles[0]);
  const [duration, setDuration] = useState("8");
  const [prompt, setPrompt] = useState("Plano cercano, movimiento suave y luz cálida. El plato debe verse recién servido y apetitoso.");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreated({ id: `job-${Date.now()}`, title: dish, source: `${style} · Nueva generación`, status: "queued", progress: 0, meta: `Vertical 9:16 · ${duration} s`, time: "En cola · posición 4", background: "linear-gradient(135deg, #3d2b25, #b86c4e)" });
  };
  return <div className="admin-video-view"><div className="admin-video-generator-layout"><form className="admin-video-form" onSubmit={submit}><div className="admin-video-section-heading"><div><span className="admin-eyebrow">Nuevo contenido</span><h2>Generá un video</h2><p>Definí el plato y el estilo. La generación se agregará a la cola para revisión.</p></div></div><label>Plato base<select value={dish} onChange={(event) => setDish(event.target.value)}>{dishOptions.map((option) => <option key={option}>{option}</option>)}</select></label><div><span className="admin-field-title">Estilo visual</span><div className="admin-video-style-grid">{generationStyles.map((option) => <button className={style === option ? "is-selected" : ""} key={option} type="button" onClick={() => setStyle(option)}>{option}<small>{option === "Food close-up" ? "Detalle y textura" : option === "Dinámico social" ? "Más ritmo" : option === "Minimalista" ? "Limpio y editorial" : "Cálido y artesanal"}</small></button>)}</div></div><div className="admin-video-form-row"><label>Duración<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="6">6 segundos</option><option value="8">8 segundos</option><option value="10">10 segundos</option></select></label><label>Formato<select defaultValue="9:16"><option>9:16 · Vertical</option><option>1:1 · Cuadrado</option><option>16:9 · Horizontal</option></select></label></div><label>Indicaciones para la escena<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={500} /><small className="admin-video-counter">{prompt.length}/500</small></label><div className="admin-video-upload"><Upload size={18} /><div><strong>Imagen de referencia</strong><small>Opcional · JPG, PNG o WebP · hasta 10 MB</small></div><button className="admin-secondary" type="button">Elegir imagen</button></div><div className="admin-video-form-actions"><span><Sparkles size={15} />Se consumirá 1 crédito de generación</span><button className="admin-primary" type="submit"><Sparkles size={16} />Agregar a la cola</button></div></form><aside className="admin-video-preview"><div className="admin-video-preview__visual"><div className="admin-video-preview__glow" /><span className="admin-video-preview__label">Vista previa</span><div className="admin-video-preview__plate">{dish === "Smash Trufa" ? "🍔" : dish === "Pizza Burrata" ? "🍕" : dish === "Cheesecake Pistacho" ? "🍰" : dish === "Ravioles de Calabaza" ? "🥟" : dish === "Milanesa Brasa" ? "🥩" : "🌮"}</div><button type="button" aria-label="Reproducir vista previa"><Play size={17} fill="currentColor" /></button></div><div className="admin-video-preview__copy"><span className="admin-eyebrow">Brief seleccionado</span><h3>{dish}</h3><p>{style} · {duration} s · Vertical</p><div className="admin-video-steps"><span><i>1</i>Analizar imagen</span><span><i>2</i>Generar movimiento</span><span><i>3</i>Preparar revisión</span></div></div></aside></div></div>;
}

function LibraryView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const filtered = useMemo(() => libraryItems.filter((item) => (filter === "Todos" || item.status === filter) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <div className="admin-video-view"><div className="admin-video-library-toolbar"><label className="admin-video-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar videos…" /></label><label><span className="admin-sr-only">Filtrar por estado</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todos</option><option>Publicado</option><option>Borrador</option><option>Archivado</option></select></label><button className="admin-secondary" type="button"><Download size={15} />Exportar</button></div><div className="admin-video-library-heading"><div><span className="admin-eyebrow">Contenido generado</span><h2>Librería de videos</h2><p>Todos los clips disponibles para revisar, publicar o volver a usar.</p></div><span className="admin-video-library-count">{filtered.length} de {libraryItems.length} videos</span></div>{filtered.length === 0 ? <div className="admin-empty"><span>✦</span><p>No encontramos videos con esos filtros.</p></div> : <div className="admin-video-library-grid">{filtered.map((item) => <article className="admin-video-library-card" key={item.id}><div className="admin-video-library-card__thumb" style={{ background: item.background }}><Video size={22} /><span>{item.duration}</span><button type="button" aria-label={`Reproducir ${item.title}`}><Play size={15} fill="currentColor" /></button></div><div className="admin-video-library-card__body"><div><strong>{item.title}</strong><span>{item.category}</span></div><span className={`admin-video-library-status admin-video-library-status--${item.status.toLowerCase()}`}>{item.status}</span><small>{item.updated}</small></div></article>)}</div>}</div>;
}

export default function VideoGenerationPanel({ section = "queue", onSectionChange }: { section?: VideoSection; onSectionChange?: (section: VideoSection) => void }) {
  const [queue, setQueue] = useState(initialQueue);
  const [notice, setNotice] = useState("");
  const createJob = (job: VideoJob) => { setQueue((current) => [job, ...current]); onSectionChange?.("queue"); setNotice(`${job.title} fue agregado a la cola.`); window.setTimeout(() => setNotice(""), 3200); };
  const changeSection = (nextSection: VideoSection) => onSectionChange?.(nextSection);
  return <section className="admin-panel admin-video-panel"><header className="admin-panel__header"><div><span className="admin-eyebrow">Contenido</span><h1>Generación de videos</h1><p>Creá, revisá y organizá los videos que hacen más atractiva tu carta.</p></div><div className="admin-video-header-mark"><Clapperboard size={18} /><span>Front en preparación</span></div></header><VideoSectionTabs section={section} onChange={changeSection} />{notice && <p className="admin-success"><Check size={16} />{notice}</p>}{section === "queue" && <QueueView queue={queue} onRefresh={() => setNotice("La cola está actualizada.")} onGenerate={() => changeSection("generate")} />}{section === "generate" && <GenerateView onCreated={createJob} />}{section === "library" && <LibraryView />}</section>;
}
