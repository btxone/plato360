"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Edit3, Plus, Save, Trash2, X } from "lucide-react";

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
type Catalog = {
  location: { id: string; slug: string; name: string; tagline: string | null; address: string | null; phone: string | null; logoUrl: string | null; timezone: string };
  categories: Category[];
  products: Product[];
};
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

export default function CatalogPanel({ locationId, onLocationChange }: { locationId?: string | null; onLocationChange?: (location: Catalog["location"]) => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [section, setSection] = useState<"products" | "categories" | "restaurant">("products");
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [restaurantForm, setRestaurantForm] = useState({ name: "", tagline: "", address: "", phone: "", logoUrl: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setError("");
    try {
      const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      const next = await request<Catalog>(`/api/admin/catalog${query}`);
      setCatalog(next);
      setRestaurantForm({ name: next.location.name, tagline: next.location.tagline ?? "", address: next.location.address ?? "", phone: next.location.phone ?? "", logoUrl: next.location.logoUrl ?? "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la carta.");
    }
  };

  // The delayed reset avoids replacing the current local during the render that changes the observer context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { setCatalog(null); setProductForm(null); void load(); }, 0); return () => window.clearTimeout(timer); }, [locationId]);

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2800); };
  const startNewProduct = () => { setEditingProductId(null); setProductForm(emptyProduct(catalog?.categories.find((category) => category.isActive)?.id ?? "")); setSection("products"); };
  const editProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({ categoryId: product.categoryId, name: product.name, slug: product.slug, description: product.description, emoji: product.emoji, accent: product.accent, tags: product.tags.join(", "), price: String(product.priceCents / 100), status: product.status, isAvailable: product.isAvailable, sortOrder: String(product.sortOrder), publishedAt: inputDate(product.publishedAt), retiredAt: inputDate(product.retiredAt), imageKey: product.media.imageKey ?? "", posterKey: product.media.posterKey ?? "", videoKey: product.media.videoKey ?? "" });
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

  if (!catalog) return <section className="admin-panel"><div className="admin-empty">{error || "Cargando carta…"}</div></section>;

  return <section className="admin-panel admin-catalog">
    <header className="admin-panel__header"><div><span className="admin-eyebrow">Contenido</span><h1>Carta</h1><p>Administrá los platos que aparecen en la carta pública, sus precios, orden y disponibilidad.</p></div><button className="admin-primary admin-primary--small" type="button" onClick={startNewProduct}><Plus size={15} /> Nuevo plato</button></header>
    <div className="admin-tabs admin-catalog__tabs"><button className={section === "products" ? "is-active" : ""} type="button" onClick={() => { setSection("products"); setProductForm(null); }}>Platos ({catalog.products.length})</button><button className={section === "categories" ? "is-active" : ""} type="button" onClick={() => { setSection("categories"); setProductForm(null); }}>Categorías ({catalog.categories.length})</button><button className={section === "restaurant" ? "is-active" : ""} type="button" onClick={() => { setSection("restaurant"); setProductForm(null); }}>Restaurante</button></div>
    {message && <p className="admin-success"><Check size={16} /> {message}</p>}
    {error && <p className="admin-error">{error}</p>}

    {section === "products" && <>
      {productForm && <form className="admin-catalog-form" onSubmit={saveProduct}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">{editingProductId ? "Editar" : "Nuevo"}</span><h2>{editingProductId ? "Editar plato" : "Agregar plato"}</h2></div><button className="admin-icon-button" type="button" onClick={() => setProductForm(null)} aria-label="Cerrar formulario"><X size={17} /></button></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label><label>Slug<input value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} placeholder="Se genera automáticamente" /></label><label>Categoría<select required value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Elegí una categoría</option>{catalog.categories.filter((category) => category.isActive).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Precio<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label><label>Estado<select value={productForm.status} onChange={(event) => setProductForm({ ...productForm, status: event.target.value as CatalogStatus })}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="published">Publicado</option><option value="retired">Retirado</option></select></label><label>Orden<input type="number" min="0" value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: event.target.value })} /></label><label>Emoji<input value={productForm.emoji} onChange={(event) => setProductForm({ ...productForm, emoji: event.target.value })} /></label><label>Color<input value={productForm.accent} onChange={(event) => setProductForm({ ...productForm, accent: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción<textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows={3} /></label><label className="admin-catalog-form__wide">Etiquetas <span className="admin-field-help">Separadas por coma</span><input value={productForm.tags} onChange={(event) => setProductForm({ ...productForm, tags: event.target.value })} /></label><label>Publicar desde<input type="datetime-local" value={productForm.publishedAt} onChange={(event) => setProductForm({ ...productForm, publishedAt: event.target.value })} /></label><label>Retirar desde<input type="datetime-local" value={productForm.retiredAt} onChange={(event) => setProductForm({ ...productForm, retiredAt: event.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={productForm.isAvailable} onChange={(event) => setProductForm({ ...productForm, isAvailable: event.target.checked })} /> Disponible para pedir</label><div className="admin-catalog-form__wide"><span className="admin-field-title">Medios existentes</span><span className="admin-field-help">Indicá rutas dentro de <code>public/assets</code>. La subida de archivos se incorpora en el siguiente hito.</span></div><label>Imagen<input value={productForm.imageKey} onChange={(event) => setProductForm({ ...productForm, imageKey: event.target.value })} placeholder="assets/images/menu/plato.jpeg" /></label><label>Póster<input value={productForm.posterKey} onChange={(event) => setProductForm({ ...productForm, posterKey: event.target.value })} placeholder="assets/images/posters/plato.png" /></label><label>Video<input value={productForm.videoKey} onChange={(event) => setProductForm({ ...productForm, videoKey: event.target.value })} placeholder="assets/videos/plato.mp4" /></label></div><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={() => setProductForm(null)}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy}><Save size={15} /> {busy ? "Guardando…" : "Guardar plato"}</button></div></form>}
      <div className="admin-catalog-list">{catalog.products.length === 0 ? <EmptyCatalog text="Todavía no hay platos cargados." /> : catalog.products.map((product) => <article className="admin-catalog-row" key={product.id}><div className="admin-catalog-row__identity"><span className="admin-catalog-row__emoji" style={{ background: `${product.accent}22` }}>{product.emoji}</span><span><strong>{product.name}</strong><small>{product.categoryName} · /{product.slug}</small></span></div><div><strong>${(product.priceCents / 100).toFixed(0)}</strong><small>Orden {product.sortOrder}</small></div><span className={`admin-badge admin-badge--${product.status === "published" && product.isAvailable ? "active" : product.status === "retired" ? "retired" : "suspended"}`}>{product.status === "published" && product.isAvailable ? "Publicado" : product.status === "scheduled" ? "Programado" : product.status === "retired" ? "Retirado" : "Borrador"}</span><div className="admin-catalog-row__actions"><button className="admin-link-button" type="button" onClick={() => editProduct(product)}><Edit3 size={14} /> Editar</button>{product.status !== "retired" && <button className="admin-link-button admin-link-button--danger" type="button" onClick={() => void retireProduct(product)}><Trash2 size={14} /> Retirar</button>}</div></article>)}</div>
    </>}

    {section === "categories" && <div className="admin-catalog-split"><form className="admin-catalog-form admin-catalog-form--compact" onSubmit={saveCategory}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Organización</span><h2>{editingCategoryId ? "Editar categoría" : "Nueva categoría"}</h2></div></div><label>Nombre<input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label>Slug<input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} placeholder="Se genera automáticamente" /></label><label>Orden<input type="number" min="0" value={categoryOrder} onChange={(event) => setCategoryOrder(event.target.value)} /></label><div className="admin-catalog-form__actions"><button className="admin-secondary" type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); setCategorySlug(""); setCategoryOrder("0"); }}>Limpiar</button><button className="admin-primary admin-primary--small" disabled={busy}><Save size={15} /> Guardar</button></div></form><div className="admin-catalog-list">{catalog.categories.map((category) => <article className="admin-catalog-row admin-catalog-row--category" key={category.id}><div><strong>{category.name}</strong><small>/{category.slug} · {category.productCount} platos</small></div><span className={`admin-badge admin-badge--${category.isActive ? "active" : "suspended"}`}>{category.isActive ? "Activa" : "Inactiva"}</span><div className="admin-catalog-row__actions"><button className="admin-link-button" type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); setCategorySlug(category.slug); setCategoryOrder(String(category.sortOrder)); }}><Edit3 size={14} /> Editar</button><button className="admin-link-button" type="button" onClick={() => void toggleCategory(category)}>{category.isActive ? "Desactivar" : "Activar"}</button></div></article>)}</div></div>}

    {section === "restaurant" && <form className="admin-catalog-form admin-catalog-form--restaurant" onSubmit={saveRestaurant}><div className="admin-catalog-form__heading"><div><span className="admin-eyebrow">Identidad</span><h2>Datos del restaurante</h2><p>Estos datos alimentan la identidad de la carta pública y de la consola del local.</p></div></div><div className="admin-catalog-form__grid"><label>Nombre<input required value={restaurantForm.name} onChange={(event) => setRestaurantForm({ ...restaurantForm, name: event.target.value })} /></label><label>Teléfono<input value={restaurantForm.phone} onChange={(event) => setRestaurantForm({ ...restaurantForm, phone: event.target.value })} /></label><label className="admin-catalog-form__wide">Descripción corta<input value={restaurantForm.tagline} onChange={(event) => setRestaurantForm({ ...restaurantForm, tagline: event.target.value })} /></label><label className="admin-catalog-form__wide">Dirección<input value={restaurantForm.address} onChange={(event) => setRestaurantForm({ ...restaurantForm, address: event.target.value })} /></label><div className="admin-catalog-form__wide"><span className="admin-field-title">Logo o marca</span><span className="admin-field-help">Arrastrá una imagen aquí o hacé clic para abrir el explorador de archivos.</span><div className={`admin-logo-upload ${draggingLogo ? "is-dragging" : ""}`} role="button" tabIndex={0} onClick={() => logoInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") logoInputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDraggingLogo(true); }} onDragLeave={() => setDraggingLogo(false)} onDrop={(event) => { event.preventDefault(); void uploadLogo(event.dataTransfer.files[0]); }}><input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadLogo(event.target.files?.[0])} />{assetUrl(restaurantForm.logoUrl) ? <img src={assetUrl(restaurantForm.logoUrl) ?? ""} alt="Vista previa del logo" /> : <span className="admin-logo-upload__fallback">✦</span>}<span><strong>{uploadingLogo ? "Subiendo logo…" : restaurantForm.logoUrl ? "Cambiar logo" : "Subir logo"}</strong><small>PNG, JPG o WebP · máximo 5 MB</small></span></div>{restaurantForm.logoUrl && <button className="admin-link-button admin-link-button--danger admin-logo-remove" type="button" onClick={() => setRestaurantForm((current) => ({ ...current, logoUrl: "" }))}>Quitar logo</button>}</div></div><div className="admin-catalog-form__actions"><button className="admin-primary admin-primary--small" disabled={busy || uploadingLogo}><Save size={15} /> Guardar restaurante</button></div></form>}
  </section>;
}

function EmptyCatalog({ text }: { text: string }) {
  return <div className="admin-empty"><span>✦</span><p>{text}</p></div>;
}
