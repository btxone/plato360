"use client";

import { FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BarChart3, BookOpen, Camera, Check, Image as ImageIcon, LayoutDashboard, LogOut, Plus, Save, Settings2, Sparkles, Tag, Trash2, Upload, Utensils, Video, Vote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type RestaurantRecord = {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  location: string;
  logoUrl: string;
};

type CategoryRecord = { id: string; label: string; icon: string; sortOrder: number; active: boolean };
type DishRecord = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  videoUrl: string | null;
  imageUrl: string;
  posterUrl: string | null;
  emoji: string;
  accent: string;
  ingredients: string[];
  tags: string[];
  sortOrder: number;
  available: boolean;
};
type CandidateRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  estimatedPrice: number;
  wouldOrderPct: number;
  votes: number;
  notifyCount: number;
  avgAttention: number;
  videoUrl: string | null;
  posterUrl: string | null;
  emoji: string;
  accent: string;
  status: string;
  ingredients: string[];
  active: boolean;
};
type VideoJobRecord = {
  id: string;
  targetId: string;
  dishName: string;
  provider: string;
  status: string;
  externalId: string | null;
  resultVideoUrl: string | null;
  errorMessage: string | null;
  referenceImages: string[];
  createdAt: string;
  updatedAt: string;
};
type Catalog = {
  restaurant: RestaurantRecord;
  categories: CategoryRecord[];
  dishes: DishRecord[];
  videoJobs: VideoJobRecord[];
  candidates: CandidateRecord[];
  metrics: {
    menuOpens: number;
    avgAttentionSeconds: number;
    totalVotes: number;
    totalNotify: number;
    menuItems: number;
    categories: number;
    topAttentionDish: string;
    topAttentionValue: string;
    topAddedDish: string;
    topAddedValue: string;
    topRevisitedDish: string;
    topRevisitedValue: string;
    dishAnalytics: Array<{ slug: string; avgAttention: number; interestScore: number; label: string }>;
    insights: Array<{ title: string; body: string; tone: string }>;
  };
};

type SaveFn = (type: "restaurant" | "category" | "dish" | "candidate", id: string | undefined, data: Record<string, unknown>) => Promise<void>;
type CreateDishFn = (data: Record<string, unknown>) => Promise<void>;
type CreateCategoryFn = (data: Record<string, unknown>) => Promise<Catalog>;
type DeleteCategoryFn = (id: string) => Promise<Catalog>;
type RequestVideoFn = (dishId: string, notes: string, imageUrls: string[]) => Promise<void>;

const money = (value: number) => `$${value.toLocaleString("es-UY")}`;
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const mobileMediaQuery = "(pointer: coarse)";
const subscribeMobile = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia(mobileMediaQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getMobileSnapshot = () => typeof window !== "undefined" && window.matchMedia(mobileMediaQuery).matches;
const getMobileServerSnapshot = () => false;

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <article className="restaurant-metric-card"><span className="restaurant-metric-card__icon">{icon}</span><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function SaveButton({ saving, children = "Guardar cambios" }: { saving: boolean; children?: React.ReactNode }) {
  return <Button type="submit" disabled={saving}><Save size={15} />{saving ? "Guardando…" : children}</Button>;
}

function BusinessEditor({ catalog, onSave }: { catalog: Catalog; onSave: SaveFn }) {
  const [draft, setDraft] = useState(catalog.restaurant);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    await onSave("restaurant", undefined, draft);
    setSaving(false);
  };
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">IDENTIDAD DEL NEGOCIO</span><h2>La información que ve tu cliente</h2></div><Settings2 size={19} /></div><form className="restaurant-form-grid" onSubmit={submit}><label>Nombre del negocio<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Nombre corto<Input value={draft.shortName} onChange={(event) => setDraft({ ...draft, shortName: event.target.value })} /></label><label className="restaurant-form-grid__wide">Descripción breve<Input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} /></label><label>Ubicación<Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><label className="restaurant-form-grid__wide">Ruta o URL del logo<Input value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} placeholder="/assets/brand/mi-logo.svg" /><small className="restaurant-field-help">En esta primera versión se edita la ruta del asset. La carga directa a R2 queda para el siguiente corte.</small></label><div className="restaurant-logo-preview"><span>Vista previa</span><img src={draft.logoUrl} alt="Logo del negocio" onError={(event) => { event.currentTarget.style.opacity = "0.25"; }} /></div><div className="restaurant-form-actions"><SaveButton saving={saving} /></div></form></section>;
}

function CategoriesEditor({ catalog, onSave, onCreate, onDelete }: { catalog: Catalog; onSave: SaveFn; onCreate: CreateCategoryFn; onDelete: DeleteCategoryFn }) {
  const [drafts, setDrafts] = useState(catalog.categories);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDraft, setNewDraft] = useState({ label: "", icon: "🍽️" });
  const [creating, setCreating] = useState(false);
  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newDraft.label.trim()) return;
    setCreating(true);
    try {
      const next = await onCreate(newDraft);
      setDrafts(next.categories);
      setNewDraft({ label: "", icon: "🍽️" });
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  };
  const deleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const next = await onDelete(id);
      setDrafts(next.categories);
    } finally {
      setDeletingId(null);
    }
  };
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">CATEGORÍAS</span><h2>Ordená cómo se navega la carta</h2><p>Las categorías se comparten entre las dos cartas, pero cada producto se publica por separado.</p></div><div className="restaurant-category-heading-actions"><Tag size={19} /><Button type="button" size="sm" variant="outline" onClick={() => setShowNew((current) => !current)}><Plus size={14} /> {showNew ? "Cerrar" : "Agregar categoría"}</Button></div></div>{showNew && <form className="restaurant-category-create" onSubmit={createCategory}><label>Nombre de la categoría<Input required value={newDraft.label} onChange={(event) => setNewDraft({ ...newDraft, label: event.target.value })} placeholder="Ej. Sin alcohol" /></label><label>Icono<Input value={newDraft.icon} onChange={(event) => setNewDraft({ ...newDraft, icon: event.target.value })} /></label><div><Button type="submit" disabled={creating || !newDraft.label.trim()}><Plus size={14} />{creating ? "Creando…" : "Crear categoría"}</Button></div></form>}<div className="restaurant-category-list">{drafts.map((category) => <form className="restaurant-category-row" key={category.id} onSubmit={async (event) => { event.preventDefault(); setSavingId(category.id); await onSave("category", category.id, category); setSavingId(null); }}><Input aria-label={`Icono de ${category.label}`} className="restaurant-category-icon" value={category.icon} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, icon: event.target.value } : item))} /><Input aria-label={`Nombre de ${category.label}`} value={category.label} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, label: event.target.value } : item))} /><label className="restaurant-switch"><input type="checkbox" checked={category.active} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, active: event.target.checked } : item))} /><span>{category.active ? "Visible" : "Oculta"}</span></label><Button type="submit" size="sm" variant="outline" disabled={savingId === category.id}>{savingId === category.id ? "…" : <><Check size={14} /> Guardar</>}</Button>{category.id !== "recomendados" && <AlertDialog open={deletingId === category.id} onOpenChange={(open) => { if (!open) setDeletingId(null); }}><AlertDialogTrigger asChild><button type="button" className="restaurant-category-delete" aria-label={`Eliminar categoría ${category.label}`} disabled={deletingId === category.id}><Trash2 size={14} /></button></AlertDialogTrigger><AlertDialogContent className="restaurant-alert-dialog"><AlertDialogHeader><AlertDialogTitle>¿Eliminar {category.icon} {category.label}?</AlertDialogTitle><AlertDialogDescription>Solo se podrá eliminar si no tiene platillos asignados. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void deleteCategory(category.id)}>Eliminar categoría</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</form>)}</div></section>;
}

function NewDishForm({ catalog, onCreate }: { catalog: Catalog; onCreate: CreateDishFn }) {
  const defaultCategory = catalog.categories.find((category) => category.active)?.id ?? catalog.categories[0]?.id ?? "";
  const emptyDraft = { name: "", description: "", price: 0, categoryId: defaultCategory, emoji: "🍽️", ingredients: "", tags: "", imageUrl: "/assets/images/menu/smash-trufa.jpeg" };
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.categoryId) return;
    setSaving(true);
    await onCreate({ ...draft, ingredients: splitList(draft.ingredients), tags: splitList(draft.tags) });
    setDraft({ ...emptyDraft, categoryId: draft.categoryId });
    setSaving(false);
  };
  return <section className="restaurant-create-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">NUEVO PLATILLO</span><h2>Cargá un item a la carta tradicional</h2><p>Se publica en la carta tradicional y queda disponible para solicitar su video por separado.</p></div><Plus size={19} /></div><form className="restaurant-form-grid" onSubmit={submit}><label>Nombre del platillo<Input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Lasagna de la casa" /></label><label>Precio<Input type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label><label className="restaurant-form-grid__wide">Descripción<Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} placeholder="Contale al cliente qué tiene este plato." /></label><label>Categoría<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{catalog.categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.id}>{category.icon} {category.label}</option>)}</select></label><label>Emoji<Input value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} /></label><label className="restaurant-form-grid__wide">Imagen tradicional<Input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="/assets/images/menu/plato.jpeg" /></label><label className="restaurant-form-grid__wide">Ingredientes separados por coma<Input value={draft.ingredients} onChange={(event) => setDraft({ ...draft, ingredients: event.target.value })} /></label><label className="restaurant-form-grid__wide">Etiquetas separadas por coma<Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} /></label><div className="restaurant-form-actions"><Button type="submit" disabled={saving || !draft.name.trim()}><Plus size={15} />{saving ? "Creando…" : "Agregar a la carta"}</Button></div></form></section>;
}

function DishEditor({ catalog, onSave }: { catalog: Catalog; onSave: SaveFn }) {
  const [draft, setDraft] = useState<DishRecord | null>(catalog.dishes[0] ?? null);
  const [saving, setSaving] = useState(false);
  if (!draft) return <section className="restaurant-empty-state">Todavía no hay platos cargados.</section>;
  const update = <K extends keyof DishRecord>(key: K, value: DishRecord[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); await onSave("dish", draft.id, { ...draft, ingredients: draft.ingredients, tags: draft.tags }); setSaving(false); };
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">CARTA TRADICIONAL</span><h2>Editá cada platillo</h2><p>Estos cambios afectan la carta tradicional. El video se gestiona en su producto separado.</p></div><BookOpen size={19} /></div><div className="restaurant-dish-editor"><div className="restaurant-dish-picker">{catalog.dishes.map((dish) => <button type="button" key={dish.id} className={dish.id === draft.id ? "is-selected" : ""} onClick={() => setDraft(dish)}><span>{dish.emoji}</span><span><strong>{dish.name}</strong><small>{money(dish.price)} · {dish.available ? "Publicado" : "Oculto"}</small></span></button>)}</div><form className="restaurant-dish-form" onSubmit={submit}><div className="restaurant-form-grid"><label>Nombre<Input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label>Precio<Input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} /></label><label className="restaurant-form-grid__wide">Descripción<Textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={3} /></label><label>Categoría<select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{catalog.categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.id}>{category.icon} {category.label}</option>)}</select></label><label>Emoji<Input value={draft.emoji} onChange={(event) => update("emoji", event.target.value)} /></label><label className="restaurant-form-grid__wide">Ingredientes separados por coma<Input value={draft.ingredients.join(", ")} onChange={(event) => update("ingredients", splitList(event.target.value))} /></label><label className="restaurant-form-grid__wide">Etiquetas separadas por coma<Input value={draft.tags.join(", ")} onChange={(event) => update("tags", splitList(event.target.value))} /></label><label className="restaurant-form-grid__wide">Imagen tradicional<Input value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} /></label><label className="restaurant-switch"><input type="checkbox" checked={draft.available} onChange={(event) => update("available", event.target.checked)} /><span>{draft.available ? "Visible en la carta tradicional" : "Oculto de la carta tradicional"}</span></label></div><div className="restaurant-form-actions"><SaveButton saving={saving} /></div></form></div></section>;
}

function VideoProductionPanel({ catalog, onSave, onRequest }: { catalog: Catalog; onSave: SaveFn; onRequest: RequestVideoFn }) {
  const firstDish = catalog.dishes[0];
  const [selectedId, setSelectedId] = useState(firstDish?.id ?? "");
  const [videoDraft, setVideoDraft] = useState({ videoUrl: firstDish?.videoUrl ?? "", posterUrl: firstDish?.posterUrl ?? "" });
  const firstJob = firstDish ? catalog.videoJobs.find((job) => job.targetId === firstDish.id) : undefined;
  const [referenceImages, setReferenceImages] = useState<string[]>(firstJob?.referenceImages ?? []);
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
  const selected = catalog.dishes.find((dish) => dish.id === selectedId) ?? catalog.dishes[0];
  const latestJob = selected ? catalog.videoJobs.find((job) => job.targetId === selected.id) : undefined;
  if (!selected) return <section className="restaurant-empty-state">Primero cargá un platillo en la carta tradicional.</section>;
  const uploadReferenceImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      formData.append("targetId", selected.id);
      const response = await fetch("/api/admin/uploads", { method: "POST", body: formData });
      const payload = await response.json() as { files?: Array<{ url: string }>; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos subir las imágenes.");
      setReferenceImages((current) => [...current, ...(payload.files ?? []).map((file) => file.url)]);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "No pudimos subir las imágenes.");
    } finally {
      setUploading(false);
    }
  };
  const request = async () => { setRequesting(true); await onRequest(selected.id, notes, referenceImages); setNotes(""); setRequesting(false); };
  const saveVideo = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); await onSave("dish", selected.id, { videoUrl: videoDraft.videoUrl, posterUrl: videoDraft.posterUrl }); setSaving(false); };
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">PRODUCTO CARTA DE VIDEOS</span><h2>Producción visual por solicitud</h2><p>Elegí un platillo, pedí su video y seguí el estado. La integración HTTP POST se conecta en el siguiente corte.</p></div><Video size={19} /></div><div className="restaurant-video-layout"><div className="restaurant-video-dish-list">{catalog.dishes.map((dish) => { const job = catalog.videoJobs.find((entry) => entry.targetId === dish.id); return <button type="button" key={dish.id} className={`restaurant-video-dish ${dish.id === selected.id ? "is-selected" : ""}`} onClick={() => { setSelectedId(dish.id); setVideoDraft({ videoUrl: dish.videoUrl ?? "", posterUrl: dish.posterUrl ?? "" }); setReferenceImages(job?.referenceImages ?? []); }}><span className="restaurant-video-dish__emoji">{dish.emoji}</span><span><strong>{dish.name}</strong><small>{dish.videoUrl ? "Video listo" : job?.status === "requested" ? "Solicitud enviada" : "Sin video"}</small></span><span className={`restaurant-video-status ${dish.videoUrl ? "is-ready" : ""}`}>{dish.videoUrl ? "Listo" : "Pendiente"}</span></button>; })}</div><div className="restaurant-video-workspace"><div className="restaurant-video-workspace__hero"><span className="restaurant-video-workspace__icon"><Video size={22} /></span><div><span className="restaurant-panel-kicker">PLATO SELECCIONADO</span><h3>{selected.name}</h3><p>{selected.videoUrl ? "Este plato ya está preparado para la carta de videos." : "Todavía no tiene un video publicado."}</p></div></div><form className="restaurant-form-grid" onSubmit={saveVideo}><label className="restaurant-form-grid__wide">URL o ruta del video final<Input value={videoDraft.videoUrl} onChange={(event) => setVideoDraft({ ...videoDraft, videoUrl: event.target.value })} placeholder="/assets/videos/mi-plato.mp4" /></label><label className="restaurant-form-grid__wide">Poster del video<Input value={videoDraft.posterUrl} onChange={(event) => setVideoDraft({ ...videoDraft, posterUrl: event.target.value })} placeholder="/assets/images/posters/mi-plato.jpeg" /></label><div className="restaurant-form-actions"><Button type="submit" variant="outline" disabled={saving}><Save size={15} />{saving ? "Guardando…" : "Guardar assets de video"}</Button></div></form><div className="restaurant-reference-upload"><div><span className="restaurant-panel-kicker">IMÁGENES PARA PRODUCCIÓN</span><h3>Mostrá el plato desde varios ángulos</h3><p>{isMobile ? "La primera opción abre la cámara del celular. También podés subir varias imágenes." : "En esta pantalla podés elegir imágenes desde tu equipo. En celular, la primera opción abre la cámara."}</p></div><div className="restaurant-upload-actions"><label className="restaurant-upload-button"><Camera size={16} /><span>{uploading ? "Subiendo…" : isMobile ? "Abrir cámara" : "Elegir imagen"}</span><input type="file" accept="image/*" capture="environment" disabled={uploading} onChange={(event) => { void uploadReferenceImages(event.target.files); event.currentTarget.value = ""; }} /></label><label className="restaurant-upload-button"><Upload size={16} /><span>Subir imágenes</span><input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void uploadReferenceImages(event.target.files); event.currentTarget.value = ""; }} /></label></div>{referenceImages.length > 0 && <div className="restaurant-reference-grid">{referenceImages.map((url) => <div key={url} className="restaurant-reference-image"><img src={url} alt="Referencia del platillo" /><button type="button" aria-label="Quitar imagen de la solicitud" onClick={() => setReferenceImages((current) => current.filter((item) => item !== url))}><Trash2 size={13} /></button></div>)}</div>}</div><div className="restaurant-video-request"><div><span className="restaurant-panel-kicker">SOLICITAR PRODUCCIÓN</span><h3>Mandar a hacer este video</h3><p>La solicitud queda registrada y lista para conectarse al endpoint de generación.</p></div><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Notas para producción (opcional)" /><Button type="button" onClick={() => void request()} disabled={requesting}><Video size={15} />{requesting ? "Registrando…" : "Solicitar video"}</Button></div>{latestJob && <div className="restaurant-video-latest"><span>Última solicitud: <strong>{latestJob.status === "requested" ? "pendiente de producción" : latestJob.status}</strong></span><small>{new Date(latestJob.createdAt).toLocaleString("es-UY")}</small></div>}</div></div><div className="restaurant-job-queue"><div className="restaurant-card-heading"><div><span className="restaurant-panel-kicker">COLA DE PRODUCCIÓN</span><h3>Solicitudes recientes</h3></div><span className="restaurant-card-badge">{catalog.videoJobs.length} solicitudes</span></div>{catalog.videoJobs.length ? catalog.videoJobs.slice(0, 8).map((job) => <div className="restaurant-job-row" key={job.id}><span className="restaurant-job-row__icon"><Video size={15} /></span><div><strong>{job.dishName}</strong><small>{job.provider === "http-post-pending" ? "Esperando integración HTTP POST" : job.provider}</small></div><span className="restaurant-video-status">{job.status}</span></div>) : <p className="restaurant-job-empty">Todavía no hay solicitudes. Elegí un plato y mandalo a producción.</p>}</div></section>;
}

function MenuMetrics({ catalog }: { catalog: Catalog }) {
  return <><section className="restaurant-kpi-grid"><MetricCard label="Aperturas de carta" value={catalog.metrics.menuOpens.toLocaleString("es-UY")} detail="últimos 30 días" icon={<BookOpen size={18} />} /><MetricCard label="Atención promedio" value={`${catalog.metrics.avgAttentionSeconds.toFixed(1).replace(".", ",")} s`} detail="tiempo viendo platos" icon={<BarChart3 size={18} />} /><MetricCard label="Platos publicados" value={String(catalog.metrics.menuItems)} detail={`${catalog.metrics.categories} categorías activas`} icon={<Utensils size={18} />} /><MetricCard label="Puntos de interés" value={catalog.metrics.topAddedValue} detail={catalog.metrics.topAddedDish} icon={<Sparkles size={18} />} /></section><section className="restaurant-dashboard-grid"><article className="restaurant-chart-card"><div className="restaurant-card-heading"><div><span className="restaurant-panel-kicker">RENDIMIENTO DE LA CARTA</span><h2>Qué platos generan más interés</h2></div><span className="restaurant-card-badge">Demo</span></div><div className="restaurant-ranking-list">{catalog.metrics.dishAnalytics.map((item, index) => { const dish = catalog.dishes.find((entry) => entry.slug === item.slug); return <div className="restaurant-ranking-row" key={item.slug}><span>0{index + 1}</span><strong>{dish?.name ?? item.slug}</strong><div><i style={{ width: `${item.interestScore * 10}%` }} /></div><b>{item.interestScore.toFixed(1)}</b></div>; })}</div></article><article className="restaurant-insights-card"><div className="restaurant-card-heading"><div><span className="restaurant-panel-kicker">LECTURA RÁPIDA</span><h2>Señales para decidir</h2></div><BarChart3 size={18} /></div><div className="restaurant-insights-list">{catalog.metrics.insights.map((insight) => <div key={insight.title}><span className={`restaurant-insight-dot restaurant-insight-dot--${insight.tone}`} /><div><strong>{insight.title}</strong><p>{insight.body}</p></div></div>)}</div></article></section></>;
}

function TuDecidesMetrics({ catalog, onSave }: { catalog: Catalog; onSave: SaveFn }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidateRecord | null>(null);
  const [saving, setSaving] = useState(false);
  return <><section className="restaurant-kpi-grid"><MetricCard label="Votos recibidos" value={catalog.metrics.totalVotes.toLocaleString("es-UY")} detail="base actual de validación" icon={<Vote size={18} />} /><MetricCard label="Quieren aviso" value={catalog.metrics.totalNotify.toLocaleString("es-UY")} detail="interés para el estreno" icon={<Sparkles size={18} />} /><MetricCard label="Mejor candidato" value={catalog.candidates[0]?.wouldOrderPct + "%"} detail={catalog.candidates[0]?.name ?? "Sin datos"} icon={<BarChart3 size={18} />} /><MetricCard label="Ideas activas" value={String(catalog.candidates.filter((candidate) => candidate.active).length)} detail="abiertas a votación" icon={<Utensils size={18} />} /></section><section className="restaurant-candidates-grid">{catalog.candidates.map((candidate) => <article className="restaurant-candidate-card" key={candidate.id}><div className="restaurant-candidate-card__top"><span className="restaurant-candidate-emoji" style={{ background: `linear-gradient(145deg, ${candidate.accent}, #241914)` }}>{candidate.emoji}</span><span className="restaurant-card-badge">{candidate.status}</span></div><h2>{candidate.name}</h2><p>{candidate.description}</p><div className="restaurant-candidate-stats"><span><strong>{candidate.wouldOrderPct}%</strong><small>la pediría</small></span><span><strong>{candidate.votes}</strong><small>votos</small></span><span><strong>{candidate.notifyCount}</strong><small>quieren aviso</small></span><span><strong>{candidate.avgAttention.toFixed(1)} s</strong><small>mirando</small></span></div><button className="restaurant-edit-link" onClick={() => { setEditing(candidate.id); setDraft(candidate); }}>Editar idea <Settings2 size={14} /></button>{editing === candidate.id && draft && <form className="restaurant-candidate-edit" onSubmit={async (event) => { event.preventDefault(); setSaving(true); await onSave("candidate", draft.id, { name: draft.name, description: draft.description, estimatedPrice: draft.estimatedPrice, status: draft.status, ingredients: draft.ingredients, videoUrl: draft.videoUrl ?? "", posterUrl: draft.posterUrl ?? "" }); setSaving(false); setEditing(null); }}><label>Nombre<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Estado<Input value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} /></label><label>Descripción<Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} /></label><div className="restaurant-form-actions"><SaveButton saving={saving}>Guardar idea</SaveButton></div></form>}</article>)}</section></>;
}

export default function RestaurantDashboard() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", { cache: "no-store" });
      if (response.status === 401) { router.push("/restaurante/login"); return; }
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar el panel.");
      setCatalog(payload);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos cargar el panel.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadCatalog(); }, 0); return () => window.clearTimeout(timer); }, [loadCatalog]);

  const save = async (type: "restaurant" | "category" | "dish" | "candidate", id: string | undefined, data: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, data }) });
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos guardar los cambios.");
      setCatalog(payload);
      setError("");
      setNotice("Cambios guardados");
      window.setTimeout(() => setNotice(""), 2600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar los cambios.");
    }
  };

  const createDish = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dish", data }) });
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos crear el platillo.");
      setCatalog(payload);
      setError("");
      setNotice("Platillo agregado a la carta tradicional");
      window.setTimeout(() => setNotice(""), 2600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos crear el platillo.");
    }
  };

  const createCategory = async (data: Record<string, unknown>): Promise<Catalog> => {
    try {
      const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "category", data }) });
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos crear la categoría.");
      setCatalog(payload);
      setError("");
      setNotice("Categoría creada");
      window.setTimeout(() => setNotice(""), 2600);
      return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos crear la categoría.");
      throw caught;
    }
  };

  const deleteCategory = async (id: string): Promise<Catalog> => {
    try {
      const response = await fetch("/api/admin/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "category", id }) });
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos eliminar la categoría.");
      setCatalog(payload);
      setError("");
      setNotice("Categoría eliminada");
      window.setTimeout(() => setNotice(""), 2600);
      return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos eliminar la categoría.");
      throw caught;
    }
  };

  const requestVideo = async (dishId: string, notes: string, imageUrls: string[]) => {
    try {
      const response = await fetch("/api/admin/video-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dishId, notes, imageUrls }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos registrar la solicitud.");
      await loadCatalog(false);
      setError("");
      setNotice("Solicitud de video registrada");
      window.setTimeout(() => setNotice(""), 2600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar la solicitud.");
    }
  };

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/restaurante/login"); };

  if (loading) return <main className="restaurant-admin-page"><div className="restaurant-loading"><span className="restaurant-loading-mark">✦</span><p>Cargando tu panel…</p></div></main>;
  if (!catalog) return <main className="restaurant-admin-page"><div className="restaurant-admin-error"><span>✦</span><h1>No pudimos abrir el panel.</h1><p>{error || "La información todavía no está disponible."}</p><Button onClick={() => void loadCatalog()}>Intentar nuevamente</Button></div></main>;

  return <main className="restaurant-admin-page"><header className="restaurant-admin-topbar"><Link href="/carta" className="restaurant-admin-brand"><span>✦</span><strong>PLATO360</strong><small>VISTA RESTAURANTE</small></Link><div className="restaurant-admin-topbar__actions"><span className="restaurant-admin-location">{catalog.restaurant.name} · {catalog.restaurant.location}</span><Link href="/carta" className="restaurant-admin-public-link">Ver carta pública</Link><button className="restaurant-logout" onClick={logout}><LogOut size={15} /> Salir</button></div></header><div className="restaurant-admin-shell"><aside className="restaurant-admin-aside"><span className="restaurant-admin-aside__kicker">PANEL DE CONTROL</span><h1>{catalog.restaurant.name}</h1><p>Gestioná tus dos cartas, medí el interés y decidí qué sale después.</p><div className="restaurant-aside-status"><span /> Datos locales activos</div></aside><section className="restaurant-admin-content"><div className="restaurant-admin-heading"><div><span className="restaurant-panel-kicker">RESUMEN DE {catalog.restaurant.shortName}</span><h2>Todo lo que pasa<br /><em>en tu carta.</em></h2></div><div className="restaurant-admin-heading__mark">✦</div></div>{notice && <div className="restaurant-save-notice" role="status"><Check size={15} /> {notice}</div>}{error && <div className="restaurant-error-notice" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>Cerrar</button></div>}<Tabs defaultValue="resumen"><TabsList className="restaurant-tabs"><TabsTrigger value="resumen"><LayoutDashboard size={15} /> Resumen</TabsTrigger><TabsTrigger value="videos"><Video size={15} /> Carta de videos</TabsTrigger><TabsTrigger value="tradicional"><BookOpen size={15} /> Carta tradicional</TabsTrigger><TabsTrigger value="decides"><Vote size={15} /> Tu decides</TabsTrigger><TabsTrigger value="negocio"><Settings2 size={15} /> Negocio</TabsTrigger></TabsList><TabsContent value="resumen"><MenuMetrics catalog={catalog} /></TabsContent><TabsContent value="videos"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">PRODUCTO INDEPENDIENTE</span><h2>Carta de videos</h2><p>Acá se administra el contenido audiovisual y se mandan a producir los videos. No modifica la carta tradicional.</p></div><Video size={21} /></div><VideoProductionPanel catalog={catalog} onSave={save} onRequest={requestVideo} /></TabsContent><TabsContent value="tradicional"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">PRODUCTO INDEPENDIENTE</span><h2>Carta tradicional</h2><p>Acá se cargan y editan los platillos con imagen, texto, precio y categorías. No necesitás tener un video para publicarlos.</p></div><ImageIcon size={21} /></div><CategoriesEditor catalog={catalog} onSave={save} onCreate={createCategory} onDelete={deleteCategory} /><NewDishForm catalog={catalog} onCreate={createDish} /><DishEditor catalog={catalog} onSave={save} /></TabsContent><TabsContent value="decides"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">VALIDACIÓN DE NUEVOS PLATOS</span><h2>Qué podría llegar después</h2><p>Revisá votos, avisos y el contenido de cada idea antes de decidir qué incorporar.</p></div><Sparkles size={21} /></div><TuDecidesMetrics catalog={catalog} onSave={save} /></TabsContent><TabsContent value="negocio"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">CONFIGURACIÓN</span><h2>Identidad de tu negocio</h2><p>Estos datos aparecen en la experiencia pública del cliente.</p></div><Settings2 size={21} /></div><BusinessEditor catalog={catalog} onSave={save} /></TabsContent></Tabs></section></div></main>;
}
