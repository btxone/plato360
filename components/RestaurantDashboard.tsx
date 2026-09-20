"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart3, BookOpen, Check, Image as ImageIcon, LayoutDashboard, LogOut, Save, Settings2, Sparkles, Tag, Utensils, Vote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
type Catalog = {
  restaurant: RestaurantRecord;
  categories: CategoryRecord[];
  dishes: DishRecord[];
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

const money = (value: number) => `$${value.toLocaleString("es-UY")}`;
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

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

function CategoriesEditor({ catalog, onSave }: { catalog: Catalog; onSave: SaveFn }) {
  const [drafts, setDrafts] = useState(catalog.categories);
  const [savingId, setSavingId] = useState<string | null>(null);
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">CATEGORÍAS</span><h2>Ordená cómo se navega la carta</h2></div><Tag size={19} /></div><div className="restaurant-category-list">{drafts.map((category) => <form className="restaurant-category-row" key={category.id} onSubmit={async (event) => { event.preventDefault(); setSavingId(category.id); await onSave("category", category.id, category); setSavingId(null); }}><Input aria-label={`Icono de ${category.label}`} className="restaurant-category-icon" value={category.icon} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, icon: event.target.value } : item))} /><Input aria-label={`Nombre de ${category.label}`} value={category.label} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, label: event.target.value } : item))} /><label className="restaurant-switch"><input type="checkbox" checked={category.active} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, active: event.target.checked } : item))} /><span>{category.active ? "Visible" : "Oculta"}</span></label><Button type="submit" size="sm" variant="outline" disabled={savingId === category.id}>{savingId === category.id ? "…" : <><Check size={14} /> Guardar</>}</Button></form>)}</div></section>;
}

function DishEditor({ catalog, onSave }: { catalog: Catalog; onSave: SaveFn }) {
  const [draft, setDraft] = useState<DishRecord | null>(catalog.dishes[0] ?? null);
  const [saving, setSaving] = useState(false);
  if (!draft) return <section className="restaurant-empty-state">Todavía no hay platos cargados.</section>;
  const update = <K extends keyof DishRecord>(key: K, value: DishRecord[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); await onSave("dish", draft.id, { ...draft, ingredients: draft.ingredients, tags: draft.tags }); setSaving(false); };
  return <section className="restaurant-editor-card"><div className="restaurant-editor-card__heading"><div><span className="restaurant-panel-kicker">CARTA TRADICIONAL Y VIDEOS</span><h2>Editá cada platillo</h2></div><BookOpen size={19} /></div><div className="restaurant-dish-editor"><div className="restaurant-dish-picker">{catalog.dishes.map((dish) => <button type="button" key={dish.id} className={dish.id === draft.id ? "is-selected" : ""} onClick={() => setDraft(dish)}><span>{dish.emoji}</span><span><strong>{dish.name}</strong><small>{money(dish.price)} · {dish.available ? "Publicado" : "Oculto"}</small></span></button>)}</div><form className="restaurant-dish-form" onSubmit={submit}><div className="restaurant-form-grid"><label>Nombre<Input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label>Precio<Input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} /></label><label className="restaurant-form-grid__wide">Descripción<Textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={3} /></label><label>Categoría<select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{catalog.categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.id}>{category.icon} {category.label}</option>)}</select></label><label>Emoji<Input value={draft.emoji} onChange={(event) => update("emoji", event.target.value)} /></label><label className="restaurant-form-grid__wide">Ingredientes separados por coma<Input value={draft.ingredients.join(", ")} onChange={(event) => update("ingredients", splitList(event.target.value))} /></label><label className="restaurant-form-grid__wide">Etiquetas separadas por coma<Input value={draft.tags.join(", ")} onChange={(event) => update("tags", splitList(event.target.value))} /></label><label className="restaurant-form-grid__wide">Imagen tradicional<Input value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} /></label><label className="restaurant-form-grid__wide">Video de la carta<Input value={draft.videoUrl ?? ""} onChange={(event) => update("videoUrl", event.target.value)} /></label><label className="restaurant-form-grid__wide">Poster del video<Input value={draft.posterUrl ?? ""} onChange={(event) => update("posterUrl", event.target.value)} /></label><label className="restaurant-switch"><input type="checkbox" checked={draft.available} onChange={(event) => update("available", event.target.checked)} /><span>{draft.available ? "Visible en la carta" : "Oculto de la carta"}</span></label></div><div className="restaurant-form-actions"><SaveButton saving={saving} /></div></form></div></section>;
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

  const loadCatalog = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadCatalog(); }, 0); return () => window.clearTimeout(timer); }, [loadCatalog]);

  const save = async (type: "restaurant" | "category" | "dish" | "candidate", id: string | undefined, data: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, data }) });
      const payload = await response.json() as Catalog & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos guardar los cambios.");
      setCatalog(payload);
      setNotice("Cambios guardados");
      window.setTimeout(() => setNotice(""), 2600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar los cambios.");
    }
  };

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/restaurante/login"); };

  if (loading) return <main className="restaurant-admin-page"><div className="restaurant-loading"><span className="restaurant-loading-mark">✦</span><p>Cargando tu panel…</p></div></main>;
  if (error || !catalog) return <main className="restaurant-admin-page"><div className="restaurant-admin-error"><span>✦</span><h1>No pudimos abrir el panel.</h1><p>{error || "La información todavía no está disponible."}</p><Button onClick={() => void loadCatalog()}>Intentar nuevamente</Button></div></main>;

  return <main className="restaurant-admin-page"><header className="restaurant-admin-topbar"><Link href="/carta" className="restaurant-admin-brand"><span>✦</span><strong>PLATO360</strong><small>VISTA RESTAURANTE</small></Link><div className="restaurant-admin-topbar__actions"><span className="restaurant-admin-location">{catalog.restaurant.name} · {catalog.restaurant.location}</span><Link href="/carta" className="restaurant-admin-public-link">Ver carta pública</Link><button className="restaurant-logout" onClick={logout}><LogOut size={15} /> Salir</button></div></header><div className="restaurant-admin-shell"><aside className="restaurant-admin-aside"><span className="restaurant-admin-aside__kicker">PANEL DE CONTROL</span><h1>{catalog.restaurant.name}</h1><p>Gestioná tu carta, medí el interés y decidí qué sale después.</p><div className="restaurant-aside-status"><span /> Datos locales activos</div></aside><section className="restaurant-admin-content"><div className="restaurant-admin-heading"><div><span className="restaurant-panel-kicker">RESUMEN DE {catalog.restaurant.shortName}</span><h2>Todo lo que pasa<br /><em>en tu carta.</em></h2></div><div className="restaurant-admin-heading__mark">✦</div></div>{notice && <div className="restaurant-save-notice" role="status"><Check size={15} /> {notice}</div>}<Tabs defaultValue="resumen"><TabsList className="restaurant-tabs"><TabsTrigger value="resumen"><LayoutDashboard size={15} /> Resumen</TabsTrigger><TabsTrigger value="carta"><BookOpen size={15} /> Carta y categorías</TabsTrigger><TabsTrigger value="decides"><Vote size={15} /> Tu decides</TabsTrigger><TabsTrigger value="negocio"><Settings2 size={15} /> Negocio</TabsTrigger></TabsList><TabsContent value="resumen"><MenuMetrics catalog={catalog} /></TabsContent><TabsContent value="carta"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">CONTENIDO PÚBLICO</span><h2>La carta que ve tu cliente</h2><p>Los cambios se guardan en la base del restaurante y se reflejan en las vistas de video y tradicional.</p></div><ImageIcon size={21} /></div><CategoriesEditor catalog={catalog} onSave={save} /><DishEditor catalog={catalog} onSave={save} /></TabsContent><TabsContent value="decides"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">VALIDACIÓN DE NUEVOS PLATOS</span><h2>Qué podría llegar después</h2><p>Revisá votos, avisos y el contenido de cada idea antes de decidir qué incorporar.</p></div><Sparkles size={21} /></div><TuDecidesMetrics catalog={catalog} onSave={save} /></TabsContent><TabsContent value="negocio"><div className="restaurant-edit-intro"><div><span className="restaurant-panel-kicker">CONFIGURACIÓN</span><h2>Identidad de tu negocio</h2><p>Estos datos aparecen en la experiencia pública del cliente.</p></div><Settings2 size={21} /></div><BusinessEditor catalog={catalog} onSave={save} /></TabsContent></Tabs></section></div></main>;
}
