"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Edit3, Plus, Save, Trash2, Upload, X } from "lucide-react";

type CatalogStatus = "draft" | "scheduled" | "published" | "retired";
type Category = { id: string; name: string; slug: string; sortOrder: number; isActive: boolean; productCount: number };
type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  accent: string;
  tags: string[];
  priceCents: number;
  status: CatalogStatus;
  isAvailable: boolean;
  sortOrder: number;
  publishedAt: string | null;
  retiredAt: string | null;
  media: { imageKey: string | null; posterKey: string | null; videoKey: string | null };
};
type Candidate = {
  id: string;
  locationId: string;
  locationName: string;
  categoryId: string | null;
  categoryName: string | null;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  accent: string;
  finalPriceCents: number | null;
  status: CatalogStatus;
  publishedAt: string | null;
  retiredAt: string | null;
  votes: number;
  interests: number;
  media: { imageKey: string | null; posterKey: string | null; videoKey: string | null };
};
type Catalog = {
  location: { id: string; slug: string; name: string; tagline: string | null; address: string | null; phone: string | null; logoUrl: string | null; timezone: string };
  categories: Category[];
  products: Product[];
};
type CatalogResponse = Catalog | { catalogs: Catalog[] };
type ProductForm = {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  accent: string;
  tags: string;
  price: string;
  status: CatalogStatus;
  isAvailable: boolean;
  sortOrder: string;
  publishedAt: string;
  retiredAt: string;
  imageKey: string;
  posterKey: string;
  videoKey: string;
};
type CandidateForm = {
  name: string;
  slug: string;
  description: string;
  emoji: string;
  accent: string;
  price: string;
  status: CatalogStatus;
  publishedAt: string;
  retiredAt: string;
  imageKey: string;
  posterKey: string;
  videoKey: string;
};

const emptyProduct = (categoryId: string): ProductForm => ({
  categoryId,
  name: "",
  slug: "",
  description: "",
  emoji: "🍽️",
  accent: "#8b5e45",
  tags: "",
  price: "",
  status: "draft",
  isAvailable: true,
  sortOrder: "0",
  publishedAt: "",
  retiredAt: "",
  imageKey: "",
  posterKey: "",
  videoKey: "",
});

const inputDate = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const assetUrl = (value: string | null) => value ? (/^(?:https?:|data:|\/)/.test(value) ? value : `/${value}`) : null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "No se pudo completar la operación.");
  return body;
}

export default function CatalogPanel({ locationId, onLocationChange, onSelectLocation, isSuperAdmin = false, features = {} }: { locationId?: string | null; onLocationChange?: (location: Catalog["location"]) => void; onSelectLocation?: (locationId: string) => void; isSuperAdmin?: boolean; features?: Record<string, boolean> }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [section, setSection] = useState<"products" | "candidates" | "categories" | "restaurant">("products");
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateForm | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [restaurantForm, setRestaurantForm] = useState({ name: "", tagline: "", address: "", phone: "", logoUrl: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingCandidateMedia, setUploadingCandidateMedia] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const candidatesEnabled = isSuperAdmin || !locationId || features.candidates !== false;
  const videoGenerationEnabled = isSuperAdmin || !locationId || features.video_generation !== false;
  const visibleSection = !candidatesEnabled && section === "candidates" ? "products" : section;
  useEffect(() => {
    if (candidatesEnabled || section !== "candidates") return;
    const timer = window.setTimeout(() => setSection("products"), 0);
    return () => window.clearTimeout(timer);
  }, [candidatesEnabled, section]);

  const load = async () => {
    setError("");
    try {
      const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      const next = await request<CatalogResponse>(`/api/admin/catalog${query}`);
      if ("catalogs" in next) {
        setCatalog(null);
        setCatalogs(next.catalogs);
        return;
      }
      setCatalogs(null);
      setCatalog(next);
      setRestaurantForm({ name: next.location.name, tagline: next.location.tagline ?? "", address: next.location.address ?? "", phone: next.location.phone ?? "", logoUrl: next.location.logoUrl ?? "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la carta.");
    }
  };

  const loadCandidates = async () => {
    try {
      const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      const next = await request<{ candidates: Candidate[] }>(`/api/admin/candidates${query}`);
      setCandidates(next.candidates);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los productos de Decides tú.");
    }
  };

  // The delayed reset avoids replacing the current local during the render that changes the observer context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { setCatalog(null); setCatalogs(null); setProductForm(null); setCandidateForm(null); setEditingProductId(null); setEditingCandidateId(null); void load(); if (candidatesEnabled) void loadCandidates(); else setCandidates([]); }, 0); return () => window.clearTimeout(timer); }, [locationId, candidatesEnabled]);

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2800); };
  const startNewProduct = () => { setEditingProductId(null); setProductForm(emptyProduct(catalog?.categories.find((category) => category.isActive)?.id ?? "")); setSection("products"); };
  const editProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({ categoryId: product.categoryId, name: product.name, slug: product.slug, description: product.description, emoji: product.emoji, accent: product.accent, tags: product.tags.join(", "), price: String(product.priceCents / 100), status: product.status, isAvailable: product.isAvailable, sortOrder: String(product.sortOrder), publishedAt: inputDate(product.publishedAt), retiredAt: inputDate(product.retiredAt), imageKey: product.media.imageKey ?? "", posterKey: product.media.posterKey ?? "", videoKey: product.media.videoKey ?? "" });
  };
  const closeProductEditor = () => { setProductForm(null); setEditingProductId(null); };
  const editCandidate = (candidate: Candidate) => {
    setEditingCandidateId(candidate.id);
    setCandidateForm({ name: candidate.name, slug: candidate.slug, description: candidate.description, emoji: candidate.emoji, accent: candidate.accent, price: candidate.finalPriceCents === null ? "" : String(candidate.finalPriceCents / 100), status: candidate.status, publishedAt: inputDate(candidate.publishedAt), retiredAt: inputDate(candidate.retiredAt), imageKey: candidate.media.imageKey ?? "", posterKey: candidate.media.posterKey ?? "", videoKey: candidate.media.videoKey ?? "" });
    setProductForm(null);
    setSection("candidates");
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm) return;
    setBusy(true); setError("");
    try {
      const payload = {
        ...(locationId ? { locationId } : {}),
        categoryId: productForm.categoryId,
        name: productForm.name,
        slug: productForm.slug || undefined,
        description: productForm.description,
        emoji: productForm.emoji,
        accent: productForm.accent,
        tags: productForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        priceCents: Math.round(Number(productForm.price.replace(",", ".")) * 100),
        status: productForm.status,
        isAvailable: productForm.isAvailable,
        sortOrder: Number(productForm.sortOrder) || 0,
        publishedAt: productForm.publishedAt ? new Date(productForm.publishedAt).toISOString() : null,
        retiredAt: productForm.retiredAt ? new Date(productForm.retiredAt).toISOString() : null,
        media: { imageKey: productForm.imageKey || null, posterKey: productForm.posterKey || null, videoKey: productForm.videoKey || null },
      };
      await request(editingProductId ? `/api/admin/catalog/products/${editingProductId}` : "/api/admin/catalog/products", { method: editingProductId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await load(); setProductForm(null); setEditingProductId(null); notify(editingProductId ? "Plato actualizado." : "Plato creado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el plato."); } finally { setBusy(false); }
  };

  const retireProduct = async (product: Product) => {
    if (!window.confirm(`¿Retirar “${product.name}” de la carta?`)) return;
    setBusy(true); setError("");
    try { await request(`/api/admin/catalog/products/${product.id}`, { method: "DELETE" }); await load(); notify("Plato retirado."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo retirar el plato."); } finally { setBusy(false); }
  };

  const moveProductToCandidates = async (product: Product) => {
    if (!window.confirm(`¿Pasar “${product.name}” a Decides tú? Se retirará de la carta y quedará disponible para recibir votos.`)) return;
    setBusy(true); setError("");
    try {
      await request(`/api/admin/catalog/products/${product.id}/candidate`, { method: "POST" });
      await load(); await loadCandidates(); setSection("candidates");
      notify("Plato enviado a Decides tú.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo pasar el plato a Decides tú."); } finally { setBusy(false); }
  };

  const returnCandidateToMenu = async (candidate: Candidate) => {
    if (!window.confirm(`¿Volver a colocar “${candidate.name}” en la carta? Se publicará para que puedan pedirlo.`)) return;
    setBusy(true); setError("");
    try {
      await request(`/api/admin/candidates/${candidate.id}/promote`, { method: "POST" });
      await load(); await loadCandidates(); setSection("products");
      notify("El plato volvió a la carta.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo devolver el plato a la carta."); } finally { setBusy(false); }
  };

  const saveCandidate = async (event: FormEvent) => {
    event.preventDefault();
    if (!candidateForm || !editingCandidateId) return;
    setBusy(true); setError("");
    try {
      const price = candidateForm.price.replace(",", ".").trim();
      const scheduledAt = candidateForm.status === "scheduled" && candidateForm.publishedAt
        ? new Date(candidateForm.publishedAt).toISOString()
        : null;
      const payload = {
        name: candidateForm.name,
        slug: candidateForm.slug || undefined,
        description: candidateForm.description,
        emoji: candidateForm.emoji,
        accent: candidateForm.accent,
        finalPriceCents: price ? Math.round(Number(price) * 100) : null,
        status: candidateForm.status,
        ...(candidateForm.status === "scheduled" ? { publishedAt: scheduledAt } : candidateForm.status === "published" ? {} : { publishedAt: null }),
        ...(candidateForm.status === "retired" ? {} : { retiredAt: null }),
        media: { imageKey: candidateForm.imageKey || null, posterKey: candidateForm.posterKey || null, videoKey: candidateForm.videoKey || null },
      };
      await request(`/api/admin/candidates/${editingCandidateId}`, { method: "PATCH", body: JSON.stringify(payload) });
      await load(); await loadCandidates();
      setCandidateForm(null); setEditingCandidateId(null); notify("Producto de Decides tú actualizado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el producto de Decides tú."); } finally { setBusy(false); }
  };

  const uploadCandidateMedia = async (field: "imageKey" | "posterKey" | "videoKey", file: File | undefined) => {
    if (!file || !editingCandidateId) return;
    const kind = field === "videoKey" ? "video" : "image";
    setUploadingCandidateMedia(field); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const body = await request<{ storageKey: string }>(`/api/admin/candidates/${editingCandidateId}/media`, { method: "POST", body: formData });
      setCandidateForm((current) => current ? { ...current, [field]: body.storageKey } : current);
      notify(kind === "video" ? "Video cargado." : "Imagen cargada.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo subir el medio."); } finally { setUploadingCandidateMedia(null); }
  };

  const publishCandidate = async (mode: "now" | "scheduled", scheduledAt: string | undefined, form: CandidateForm) => {
    if (!editingCandidateId) return false;
    if (mode === "scheduled" && !scheduledAt) { setError("Elegí la fecha y hora de publicación."); return false; }
    const publishDate = mode === "now" ? new Date() : new Date(scheduledAt as string);
    if (Number.isNaN(publishDate.getTime())) { setError("La fecha de publicación no es válida."); return false; }
    const price = form.price.replace(",", ".").trim();
    setBusy(true); setError("");
    try {
      await request(`/api/admin/candidates/${editingCandidateId}`, { method: "PATCH", body: JSON.stringify({ name: form.name, slug: form.slug || undefined, description: form.description, emoji: form.emoji, accent: form.accent, finalPriceCents: price ? Math.round(Number(price) * 100) : null, status: mode === "now" ? "published" : "scheduled", publishedAt: publishDate.toISOString(), retiredAt: null, media: { imageKey: form.imageKey || null, posterKey: form.posterKey || null, videoKey: form.videoKey || null } }) });
      await loadCandidates();
      setCandidateForm(null); setEditingCandidateId(null); notify(mode === "now" ? "Producto publicado." : "Publicación programada.");
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo publicar el producto."); return false; } finally { setBusy(false); }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = { ...(locationId ? { locationId } : {}), name: categoryName, slug: categorySlug || undefined, sortOrder: Number(categoryOrder) || 0 };
      await request(editingCategoryId ? `/api/admin/catalog/categories/${editingCategoryId}` : "/api/admin/catalog/categories", { method: editingCategoryId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await load(); setCategoryName(""); setCategorySlug(""); setCategoryOrder("0"); setEditingCategoryId(null); notify(editingCategoryId ? "Categoría actualizada." : "Categoría creada.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la categoría."); } finally { setBusy(false); }
  };

  const toggleCategory = async (category: Category) => {
    setBusy(true); setError("");
    try { await request(`/api/admin/catalog/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !category.isActive }) }); await load(); notify(category.isActive ? "Categoría desactivada." : "Categoría activada."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la categoría."); } finally { setBusy(false); }
  };

  const saveRestaurant = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const body = await request<{ location: Catalog["location"] }>("/api/admin/catalog", { method: "PATCH", body: JSON.stringify({ ...restaurantForm, ...(locationId ? { locationId } : {}) }) }); onLocationChange?.(body.location); await load(); notify("Datos del restaurante actualizados."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el restaurante."); } finally { setBusy(false); }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) { setDraggingLogo(false); return; }
    if (!(file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp")) { setDraggingLogo(false); setError("El logo debe ser una imagen PNG, JPG o WebP."); return; }
    setUploadingLogo(true); setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      if (locationId) formData.append("locationId", locationId);
      const body = await request<{ location: Catalog["location"] }>("/api/admin/catalog/logo", { method: "POST", body: formData });
      setRestaurantForm((current) => ({ ...current, logoUrl: body.location.logoUrl ?? "" }));
      onLocationChange?.(body.location);
      notify("Logo actualizado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo subir el logo."); } finally { setUploadingLogo(false); setDraggingLogo(false); }
  };

  if (catalogs) return <CatalogOverview catalogs={catalogs} onSelectLocation={onSelectLocation} />;
  if (!catalog) return <section className="admin-panel"><div className="admin-empty">{error || "Cargando carta…"}</div></section>;

  const productEditor = productForm ? <ProductEditor productForm={productForm} editingProductId={editingProductId} catalog={catalog} busy={busy} videoGenerationEnabled={videoGenerationEnabled} onChange={(patch) => setProductForm((current) => current ? { ...current, ...patch } : current)} onSubmit={saveProduct} onClose={closeProductEditor} /> : null;
  const candidateEditor = candidateForm ? <CandidateEditorV2 form={candidateForm} busy={busy} uploadingMedia={uploadingCandidateMedia} videoGenerationEnabled={videoGenerationEnabled} onUpload={uploadCandidateMedia} onChange={(patch) => setCandidateForm((current) => current ? { ...current, ...patch } : current)} onSubmit={saveCandidate} onClose={() => { setCandidateForm(null); setEditingCandidateId(null); }} /> : null;

  return <section className="admin-panel admin-catalog">
    <header className="admin-panel__header"><div><span className="admin-eyebrow">Contenido</span><h1>Carta</h1><p>Administrá los platos que aparecen en la carta pública, sus precios, orden y disponibilidad.</p></div><button className="admin-primary admin-primary--small" type="button" onClick={startNewProduct}><Plus size={15} /> Nuevo plato</button></header>
    <div className="admin-tabs admin-catalog__tabs"><button className={visibleSection === "products" ? "is-active" : ""} type="button" onClick={() => { setSection("products"); setProductForm(null); setCandidateForm(null); }}>Platos ({catalog.products.length})</button>{candidatesEnabled && <button className={visibleSection === "candidates" ? "is-active" : ""} type="button" onClick={() => { setSection("candidates"); setProductForm(null); }}>Decides tú ({candidates.length})</button>}<button className={visibleSection === "categories" ? "is-active" : ""} type="button" onClick={() => { setSection("categories"); setProductForm(null); setCandidateForm(null); }}>Categorías ({catalog.categories.length})</button><button className={visibleSection === "restaurant" ? "is-active" : ""} type="button" onClick={() => { setSection("restaurant"); setProductForm(null); setCandidateForm(null); }}>Restaurante</button></div>
    {message && <p className="admin-success"><Check size={16} /> {message}</p>}
    {error && <p className="admin-error">{error}</p>}

    {section === "products" && <>
      {productEditor && (editingProductId ? <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeProductEditor(); }}>{productEditor}</div> : productEditor)}
      <div className="admin-catalog-list">{catalog.products.length === 0 ? <EmptyCatalog text="Todavía no hay platos cargados." /> : catalog.products.map((product) => <article className="admin-catalog-row" key={product.id}><div className="admin-catalog-row__identity"><span className="admin-catalog-row__emoji" style={{ background: `${product.accent}22` }}>{product.emoji}</span><span><strong>{product.name}</strong><small>{product.categoryName} · /{product.slug}</small></span></div><div><strong>${(product.priceCents / 100).toFixed(0)}</strong><small>Orden {product.sortOrder}</small></div><span className={`admin-badge admin-badge--${product.status === "published" && product.isAvailable ? "active" : product.status === "retired" ? "retired" : "suspended"}`}>{product.status === "published" && product.isAvailable ? "Publicado" : product.status === "scheduled" ? "Programado" : product.status === "retired" ? "Retirado" : "Borrador"}</span><div className="admin-catalog-row__actions">{candidatesEnabled && <button className="admin-link-button" type="button" disabled={busy} onClick={() => void moveProductToCandidates(product)}><ArrowRight size={14} /> Decides tú</button>}<button className="admin-link-button" type="button" onClick={() => editProduct(product)}><Edit3 size={14} /> Editar</button>{product.status !== "retired" && <button className="admin-link-button admin-link-button--danger" type="button" onClick={() => void retireProduct(product)}><Trash2 size={14} /> Retirar</button>}</div></article>)}</div>
    </>}

    {section === "candidates" && <>
      {candidateEditor && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) { setCandidateForm(null); setEditingCandidateId(null); } }}>{candidateEditor}</div>}
      <div className="admin-catalog-list">{candidates.length === 0 ? <EmptyCatalog text="Todavía no hay productos cargados en Decides tú." /> : candidates.map((candidate) => <article className="admin-catalog-row" key={candidate.id}><div className="admin-catalog-row__identity"><span className="admin-catalog-row__emoji" style={{ background: `${candidate.accent}22` }}>{candidate.emoji}</span><span><strong>{candidate.name}</strong><small>{candidate.locationName}{candidate.categoryName ? ` · ${candidate.categoryName}` : ""} · /{candidate.slug}</small></span></div><div><strong>{candidate.finalPriceCents === null ? "Sin precio" : `$${(candidate.finalPriceCents / 100).toFixed(0)}`}</strong><small>{candidate.votes} votos · {candidate.interests} avisos</small></div><span className={`admin-badge admin-badge--${candidate.status === "published" ? "active" : candidate.status === "retired" ? "retired" : "suspended"}`}>{candidate.status === "published" ? "Público" : candidate.status === "scheduled" ? "Programado" : candidate.status === "retired" ? "Retirado" : "En prueba"}</span><div className="admin-catalog-row__actions">{candidate.status === "published" && <button className="admin-link-button" type="button" disabled={busy} onClick={() => void returnCandidateToMenu(candidate)}><ArrowLeft size={14} /> Volver a carta</button>}<button className="admin-link-button" type="button" onClick={() => editCandidate(candidate)}><Edit3 size={14} /> Editar</button></div></article>)}</div>
    </>}

    {section === "categories" && <div className="admin-catalog-split"><form className="admin-catalog-form admin-catalog-form--compact" onSubmit={saveCategory}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Organización</span><h2>{editingCategoryId ? "Editar categoría" : "Nueva categoría"}</h2></div></div><label>Nombre<input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label>Slug<input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} placeholder="Se genera automáticamente" /></label><label>Orden<input type="number" min="0" value={categoryOrder} onChange={(event) => setCategoryOrder(event.target.value)} /></label><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); setCategorySlug(""); setCategoryOrder("0"); }}>Limpiar</button><button className="admin-primary admin-primary--small" disabled={busy}><Save size={15} /> Guardar</button></div></form><div className="admin-catalog-list">{catalog.categories.map((category) => <article className="admin-catalog-row admin-catalog-row--category" key={category.id}><div><strong>{category.name}</strong><small>/{category.slug} · {category.productCount} platos</small></div><span className={`admin-badge admin-badge--${category.isActive ? "active" : "suspended"}`}>{category.isActive ? "Activa" : "Inactiva"}</span><div className="admin-catalog-row__actions"><button className="admin-link-button" type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); setCategorySlug(category.slug); setCategoryOrder(String(category.sortOrder)); }}><Edit3 size={14} /> Editar</button><button className="admin-link-button" type="button" onClick={() => void toggleCategory(category)}>{category.isActive ? "Desactivar" : "Activar"}</button></div></article>)}</div></div>}

    {section === "restaurant" && <form className="admin-catalog-form admin-catalog-form--restaurant" onSubmit={saveRestaurant}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Identidad</span><h2>Datos del restaurante</h2><p>Estos datos alimentan la identidad de la carta pública y de la consola del local.</p></div></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={restaurantForm.name} onChange={(event) => setRestaurantForm({ ...restaurantForm, name: event.target.value })} /></label><label>Teléfono<input value={restaurantForm.phone} onChange={(event) => setRestaurantForm({ ...restaurantForm, phone: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción corta<input value={restaurantForm.tagline} onChange={(event) => setRestaurantForm({ ...restaurantForm, tagline: event.target.value })} /></label><label className="admin-catalog-form__wide">Dirección<input value={restaurantForm.address} onChange={(event) => setRestaurantForm({ ...restaurantForm, address: event.target.value })} /></label><div className="admin-catalog-form__wide"><span className="admin-field-title">Logo o marca</span><span className="admin-field-help">Arrastrá una imagen aquí o hacé clic para abrir el explorador de archivos.</span><div className={`admin-logo-upload ${draggingLogo ? "is-dragging" : ""}`} role="button" tabIndex={0} onClick={() => logoInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") logoInputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDraggingLogo(true); }} onDragLeave={() => setDraggingLogo(false)} onDrop={(event) => { event.preventDefault(); void uploadLogo(event.dataTransfer.files[0]); }}><input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadLogo(event.target.files?.[0])} />{assetUrl(restaurantForm.logoUrl) ? <img src={assetUrl(restaurantForm.logoUrl) ?? ""} alt="Vista previa del logo" /> : <span className="admin-logo-upload__fallback">✦</span>}<span><strong>{uploadingLogo ? "Subiendo logo…" : restaurantForm.logoUrl ? "Cambiar logo" : "Subir logo"}</strong><small>PNG, JPG o WebP · máximo 5 MB</small></span></div>{restaurantForm.logoUrl && <button className="admin-link-button admin-link-button--danger admin-logo-remove" type="button" onClick={() => setRestaurantForm((current) => ({ ...current, logoUrl: "" }))}>Quitar logo</button>}</div></div><div className="admin-catalog-form__actions"><button className="admin-primary admin-primary--small" disabled={busy || uploadingLogo}><Save size={15} /> Guardar restaurante</button></div></form>}
  </section>;
}

function ProductEditor({ productForm, editingProductId, catalog, busy, videoGenerationEnabled, onChange, onSubmit, onClose }: { productForm: ProductForm; editingProductId: string | null; catalog: Catalog; busy: boolean; videoGenerationEnabled: boolean; onChange: (patch: Partial<ProductForm>) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <form className={editingProductId ? "admin-modal admin-catalog-form" : "admin-catalog-form"} onSubmit={onSubmit} role={editingProductId ? "dialog" : undefined} aria-modal={editingProductId ? true : undefined} aria-labelledby={editingProductId ? "admin-product-editor-title" : undefined}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">{editingProductId ? "Editar" : "Nuevo"}</span><h2 id={editingProductId ? "admin-product-editor-title" : undefined}>{editingProductId ? "Editar producto" : "Agregar plato"}</h2></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar formulario"><X size={17} /></button></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={productForm.name} onChange={(event) => onChange({ name: event.target.value })} /></label><label>Slug<input value={productForm.slug} onChange={(event) => onChange({ slug: event.target.value })} placeholder="Se genera automáticamente" /></label><label>Categoría<select required value={productForm.categoryId} onChange={(event) => onChange({ categoryId: event.target.value })}><option value="">Elegí una categoría</option>{catalog.categories.filter((category) => category.isActive).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Precio<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => onChange({ price: event.target.value })} /></label><label>Estado<select value={productForm.status} onChange={(event) => onChange({ status: event.target.value as CatalogStatus })}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="published">Publicado</option><option value="retired">Retirado</option></select></label><label>Orden<input type="number" min="0" value={productForm.sortOrder} onChange={(event) => onChange({ sortOrder: event.target.value })} /></label><label>Emoji<input value={productForm.emoji} onChange={(event) => onChange({ emoji: event.target.value })} /></label><label>Color<input value={productForm.accent} onChange={(event) => onChange({ accent: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción<textarea value={productForm.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} /></label><label className="admin-catalog-form__wide">Etiquetas <span className="admin-field-help">Separadas por coma</span><input value={productForm.tags} onChange={(event) => onChange({ tags: event.target.value })} /></label><label>Publicar desde<input type="datetime-local" value={productForm.publishedAt} onChange={(event) => onChange({ publishedAt: event.target.value })} /></label><label>Retirar desde<input type="datetime-local" value={productForm.retiredAt} onChange={(event) => onChange({ retiredAt: event.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={productForm.isAvailable} onChange={(event) => onChange({ isAvailable: event.target.checked })} /> Disponible para pedir</label><div className="admin-catalog-form__wide"><span className="admin-field-title">Medios existentes</span><span className="admin-field-help">Indicá rutas dentro de <code>public/assets</code>. La subida de archivos se incorpora en el siguiente hito.</span></div><label>Imagen<input value={productForm.imageKey} onChange={(event) => onChange({ imageKey: event.target.value })} placeholder="assets/images/menu/plato.jpeg" /></label><label>Póster<input value={productForm.posterKey} onChange={(event) => onChange({ posterKey: event.target.value })} placeholder="assets/images/posters/plato.png" /></label>{videoGenerationEnabled && <label>Video<input value={productForm.videoKey} onChange={(event) => onChange({ videoKey: event.target.value })} placeholder="assets/videos/plato.mp4" /></label>}</div><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy}><Save size={15} /> {busy ? "Guardando…" : "Guardar plato"}</button></div></form>;
}

function CandidateEditorLegacy({ form, busy, onChange, onSubmit, onClose }: { form: CandidateForm; busy: boolean; onChange: (patch: Partial<CandidateForm>) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <form className="admin-modal admin-catalog-form" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="admin-candidate-editor-title"><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Decides tú</span><h2 id="admin-candidate-editor-title">Editar producto</h2><p>Estos cambios se reflejan en la sección pública Decides tú.</p></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar edición"><X size={17} /></button></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={form.name} onChange={(event) => onChange({ name: event.target.value })} /></label><label>Slug<input value={form.slug} onChange={(event) => onChange({ slug: event.target.value })} placeholder="Se genera automáticamente" /></label><label>Precio estimado<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => onChange({ price: event.target.value })} placeholder="Opcional" /></label><label>Estado<select value={form.status} onChange={(event) => onChange({ status: event.target.value as CatalogStatus })}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="published">Publicado</option><option value="retired">Retirado</option></select></label><label>Emoji<input value={form.emoji} onChange={(event) => onChange({ emoji: event.target.value })} /></label><label>Color<input value={form.accent} onChange={(event) => onChange({ accent: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción<textarea value={form.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} /></label><label>Publicar desde<input type="datetime-local" value={form.publishedAt} onChange={(event) => onChange({ publishedAt: event.target.value })} /></label><label>Retirar desde<input type="datetime-local" value={form.retiredAt} onChange={(event) => onChange({ retiredAt: event.target.value })} /></label><div className="admin-catalog-form__wide"><span className="admin-field-title">Medios existentes</span><span className="admin-field-help">Indicá rutas dentro de <code>public/assets</code>. La subida de archivos se incorpora en el siguiente hito.</span></div><label>Imagen<input value={form.imageKey} onChange={(event) => onChange({ imageKey: event.target.value })} placeholder="assets/images/menu/plato.jpeg" /></label><label>Póster<input value={form.posterKey} onChange={(event) => onChange({ posterKey: event.target.value })} placeholder="assets/images/posters/plato.png" /></label><label>Video<input value={form.videoKey} onChange={(event) => onChange({ videoKey: event.target.value })} placeholder="assets/videos/plato.mp4" /></label></div><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy}><Save size={15} /> {busy ? "Guardando…" : "Guardar cambios"}</button></div></form>;
}

type CandidateMediaField = "imageKey" | "posterKey" | "videoKey";

function localDateTimeValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function CandidatePublishModal({ busy, onClose, onConfirm }: { busy: boolean; onClose: () => void; onConfirm: (mode: "now" | "scheduled", scheduledAt?: string) => Promise<boolean> }) {
  const [mode, setMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState(localDateTimeValue);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onConfirm(mode, mode === "scheduled" ? scheduledAt : undefined);
    setSaving(false);
    if (saved) onClose();
  };

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="admin-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="admin-publish-candidate-title"><div className="admin-modal__heading"><div><span className="admin-eyebrow">Visibilidad</span><h2 id="admin-publish-candidate-title">Hacer público</h2><p>Elegí cuándo querés que el producto aparezca en Decides tú.</p></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar publicación"><X size={17} /></button></div><div className="admin-modal__grid"><label><span>Publicación</span><select value={mode} onChange={(event) => setMode(event.target.value as "now" | "scheduled")}><option value="now">Publicar ahora</option><option value="scheduled">Programado</option></select></label>{mode === "scheduled" && <label><span>Fecha y hora</span><input required type="datetime-local" min={localDateTimeValue()} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>}</div><div className="admin-modal__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={saving || busy}><Check size={15} /> {saving || busy ? "Publicando…" : mode === "now" ? "Publicar ahora" : "Programar publicación"}</button></div></form></div>;
}

function CandidateMediaDropField({ label, kind, value, busy, onChange, onUpload }: { label: string; kind: "image" | "video"; value: string; busy: boolean; onChange: (value: string) => void; onUpload: (file: File | undefined) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = assetUrl(value);
  const accept = kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/png,image/jpeg,image/webp";
  return <div><span className="admin-field-title">{label}</span><div className={`admin-logo-upload ${dragging ? "is-dragging" : ""}`} role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onUpload(event.dataTransfer.files[0]); }}><input ref={inputRef} type="file" accept={accept} hidden onChange={(event) => { onUpload(event.target.files?.[0]); event.target.value = ""; }} />{preview && kind === "image" ? <img src={preview} alt={`Vista previa de ${label.toLowerCase()}`} /> : preview && kind === "video" ? <video src={preview} muted playsInline preload="metadata" style={{ width: 58, height: 58, flex: "0 0 58px", borderRadius: 12, objectFit: "cover" }} /> : <span className="admin-logo-upload__fallback"><Upload size={21} /></span>}<span><strong>{busy ? "Subiendo…" : value ? "Cambiar archivo" : "Arrastrá un archivo aquí"}</strong><small>{kind === "video" ? "MP4, WebM o MOV · máximo 100 MB" : "PNG, JPG o WebP · máximo 10 MB"}</small></span></div><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={kind === "video" ? "assets/videos/plato.mp4" : "assets/images/posters/plato.png"} /></div>;
}

function CandidateEditor({ form, busy, uploadingMedia, onChange, onUpload, onPublish, onSubmit, onClose }: { form: CandidateForm; busy: boolean; uploadingMedia: string | null; onChange: (patch: Partial<CandidateForm>) => void; onUpload: (field: CandidateMediaField, file: File | undefined) => void; onPublish: (mode: "now" | "scheduled", scheduledAt: string | undefined, form: CandidateForm) => Promise<boolean>; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const [showPublishModal, setShowPublishModal] = useState(false);
  return <><form className="admin-modal admin-catalog-form" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="admin-candidate-editor-title"><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Decides tú</span><h2 id="admin-candidate-editor-title">Editar producto</h2><p>Estos cambios se reflejan en la sección pública Decides tú.</p></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar edición"><X size={17} /></button></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={form.name} onChange={(event) => onChange({ name: event.target.value })} /></label><label>Slug<input value={form.slug} onChange={(event) => onChange({ slug: event.target.value })} placeholder="Se genera automáticamente" /></label><label>Precio estimado<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => onChange({ price: event.target.value })} placeholder="Opcional" /></label><label>Estado<select value={form.status} onChange={(event) => onChange({ status: event.target.value as CatalogStatus })}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="published">Publicado</option><option value="retired">Retirado</option></select></label><label>Emoji<input value={form.emoji} onChange={(event) => onChange({ emoji: event.target.value })} /></label><label>Color<input value={form.accent} onChange={(event) => onChange({ accent: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción<textarea value={form.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} /></label><label>Publicar desde<input type="datetime-local" value={form.publishedAt} onChange={(event) => onChange({ publishedAt: event.target.value })} /></label><label>Retirar desde<input type="datetime-local" value={form.retiredAt} onChange={(event) => onChange({ retiredAt: event.target.value })} /></label><div className="admin-catalog-form__wide"><span className="admin-field-title">Medios</span><span className="admin-field-help">Arrastrá cada archivo en su apartado. También podés pegar una ruta existente.</span></div><CandidateMediaDropField label="Imagen" kind="image" value={form.imageKey} busy={uploadingMedia === "imageKey"} onChange={(value) => onChange({ imageKey: value })} onUpload={(file) => onUpload("imageKey", file)} /><CandidateMediaDropField label="Póster" kind="image" value={form.posterKey} busy={uploadingMedia === "posterKey"} onChange={(value) => onChange({ posterKey: value })} onUpload={(file) => onUpload("posterKey", file)} /><CandidateMediaDropField label="Video" kind="video" value={form.videoKey} busy={uploadingMedia === "videoKey"} onChange={(value) => onChange({ videoKey: value })} onUpload={(file) => onUpload("videoKey", file)} /></div><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={() => setShowPublishModal(true)} disabled={busy || Boolean(uploadingMedia)}>Hacer público</button><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy || Boolean(uploadingMedia)}><Save size={15} /> {busy ? "Guardando…" : "Guardar cambios"}</button></div></form>{showPublishModal && <CandidatePublishModal busy={busy} onClose={() => setShowPublishModal(false)} onConfirm={(mode, scheduledAt) => onPublish(mode, scheduledAt, form)} />}</>;
}

function CandidateEditorV2({ form, busy, uploadingMedia, videoGenerationEnabled, onChange, onUpload, onSubmit, onClose }: { form: CandidateForm; busy: boolean; uploadingMedia: string | null; videoGenerationEnabled: boolean; onChange: (patch: Partial<CandidateForm>) => void; onUpload: (field: CandidateMediaField, file: File | undefined) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  return <form className="admin-modal admin-catalog-form" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="admin-candidate-editor-title"><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Decides tú</span><h2 id="admin-candidate-editor-title">Editar producto</h2><p>Mientras esté público aparecerá aquí para recibir votos. Cuando decidas recuperarlo, usá “Volver a carta”.</p></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar edición"><X size={17} /></button></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={form.name} onChange={(event) => onChange({ name: event.target.value })} /></label><label>Slug<input value={form.slug} onChange={(event) => onChange({ slug: event.target.value })} placeholder="Se genera automáticamente" /></label><label>Precio estimado<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => onChange({ price: event.target.value })} placeholder="Opcional" /></label><label>Estado<select value={form.status} onChange={(event) => onChange({ status: event.target.value as CatalogStatus })}><option value="draft">En prueba</option><option value="scheduled">Programado</option><option value="published">Público</option><option value="retired">Retirado</option></select></label>{form.status === "scheduled" && <label>Fecha y Hora<input required type="datetime-local" min={localDateTimeValue()} value={form.publishedAt} onChange={(event) => onChange({ publishedAt: event.target.value })} /></label>}<label>Emoji<input value={form.emoji} onChange={(event) => onChange({ emoji: event.target.value })} /></label><label>Color<input value={form.accent} onChange={(event) => onChange({ accent: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción<textarea value={form.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} /></label><div className="admin-catalog-form__wide"><span className="admin-field-title">Medios</span><span className="admin-field-help">Arrastrá cada archivo en su apartado. También podés pegar una ruta existente.</span></div><CandidateMediaDropField label="Imagen" kind="image" value={form.imageKey} busy={uploadingMedia === "imageKey"} onChange={(value) => onChange({ imageKey: value })} onUpload={(file) => onUpload("imageKey", file)} /><CandidateMediaDropField label="Póster" kind="image" value={form.posterKey} busy={uploadingMedia === "posterKey"} onChange={(value) => onChange({ posterKey: value })} onUpload={(file) => onUpload("posterKey", file)} />{videoGenerationEnabled && <CandidateMediaDropField label="Video" kind="video" value={form.videoKey} busy={uploadingMedia === "videoKey"} onChange={(value) => onChange({ videoKey: value })} onUpload={(file) => onUpload("videoKey", file)} />}</div><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy || Boolean(uploadingMedia)}><Save size={15} /> {busy ? "Guardando…" : "Guardar cambios"}</button></div></form>;
}

function CatalogOverview({ catalogs, onSelectLocation }: { catalogs: Catalog[]; onSelectLocation?: (locationId: string) => void }) {
  return <section className="admin-panel admin-catalog"><header className="admin-panel__header"><div><span className="admin-eyebrow">Contenido</span><h1>Carta</h1><p>Vista consolidada de las cartas. Elegí un local para editar sus productos y categorías.</p></div></header>{catalogs.length === 0 ? <div className="admin-empty"><span>✦</span><p>No hay locales registrados.</p></div> : <div className="admin-catalog-list">{catalogs.map((catalog) => <article className="admin-catalog-row admin-catalog-row--category" key={catalog.location.id}><div><strong>{catalog.location.name}</strong><small>{catalog.categories.length} categorías · {catalog.products.length} platos</small></div><div className="admin-catalog-row__actions"><button className="admin-link-button" type="button" onClick={() => onSelectLocation?.(catalog.location.id)}>Administrar</button></div></article>)}</div>}</section>;
}

function EmptyCatalog({ text }: { text: string }) {
  return <div className="admin-empty"><span>✦</span><p>{text}</p></div>;
}
