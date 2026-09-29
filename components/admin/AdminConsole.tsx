"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Check, ChevronDown, Clipboard, Download, Edit3, Eye, EyeOff, KeyRound, LogOut, Menu, Moon, QrCode, RefreshCw, ScrollText, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, Sun, Trash2, Users, X } from "lucide-react";
import QRCode from "qrcode";
import CatalogPanel from "@/components/admin/CatalogPanel";

/* Panel loaders intentionally keep stable effect triggers while their request helpers close over panel state. */
/* eslint-disable react-hooks/exhaustive-deps */

type Role = "superadmin" | "admin" | "mozo";
type AdminTheme = "light" | "dark";
const adminThemeStorageKey = "plato360-admin-theme";
const allLocationsValue = "all" as const;
type ObservedLocationId = string | typeof allLocationsValue | null;
type SessionUser = { id: string; principalLabel: string; role: Role; locationId: string | null; locationName: string | null; locationLogoUrl: string | null; forcePasswordChange: boolean };
type LocationOption = { id: string; slug: string; name: string; address: string | null; logoUrl: string | null };
type Order = { id: string; referenceCode: string; tableLabel: string; locationName: string | null; status: "pending" | "in_process" | "confirmed" | "cancelled"; totalCents: number; notes: string; version: number; createdAt: string; items: Array<{ id: string; name: string; quantity: number; notes: string; lineTotalCents: number }> };
type QrCode = { id: string; kind: "fixed" | "dynamic"; status: "active" | "revoked"; tableLabel: string; locationName: string | null; publicId: string; entryUrl: string; expiresAt: string | null; lastUsedAt: string | null };
type User = { id: string; username: string; displayName: string; locationName: string | null; role: "admin" | "mozo"; status: "active" | "suspended"; forcePasswordChange: boolean; lastLoginAt: string | null };
type Feature = { key: string; label: string; enabled: boolean; isDefault: boolean };
type LogCategory = "orders" | "errors" | "passwords" | "users" | "access" | "qr" | "catalog" | "features";
type AuditLog = { id: string; locationId: string | null; locationName: string | null; actorPrincipal: string; actorDisplayName: string | null; actorRole: "admin" | "mozo" | null; action: string; entityType: string | null; entityId: string | null; metadata: Record<string, unknown> | null; createdAt: string };
type TelemetrySummary = { totalEvents: number; uniqueVisitors: number; impressions: number; detailOpens: number; addsToCart: number; ordersCreated: number; votes: number; interests: number };
type TelemetryDay = { day: string; events: number; impressions: number; detailOpens: number; addsToCart: number; ordersCreated: number };
type TelemetryContent = { id: string | null; name: string | null; impressions: number; detailOpens: number; addsToCart?: number; ordersCreated?: number; votes?: number; interests?: number };
type TelemetryMonthlyItem = { id: string; name: string; locationName: string; votes?: number; views?: number; totalWatchSeconds?: number; averageWatchSeconds?: number; media: { url: string; kind: "image" | "video" } | null };

const money = (cents: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(cents / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Nunca";
const duration = (seconds: number) => seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
const qrTimeRemaining = (value: string | null, now: number) => {
  if (!value) return "Sin vencimiento";
  if (!now) return "Calculando…";
  const remainingSeconds = Math.ceil((new Date(value).getTime() - now) / 1000);
  if (remainingSeconds <= 0) return "Vencido";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
};
const qrIsExpired = (value: string | null, now: number) => Boolean(value && now > 0 && new Date(value).getTime() <= now);
const assetUrl = (value: string | null) => value ? (/^(?:https?:|data:|\/)/.test(value) ? value : `/${value}`) : null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "No se pudo completar la operación.");
  return body;
}

function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="admin-login"><section className="admin-login__card"><div className="admin-brand"><span>✦</span><strong>Plato360</strong></div><span className="admin-eyebrow">Acceso operativo</span><h1>Entrá a tu consola</h1><p>Gestioná pedidos, carta, accesos y códigos QR desde un solo lugar.</p><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const body = await request<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }); onLogin(body.user); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); } finally { setBusy(false); } }}><label>Usuario<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Contraseña<div className="admin-password-field"><input required minLength={6} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="admin-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button></form></section></main>;
}

function AdminBrand({ user }: { user: SessionUser }) {
  const isSuperAdmin = user.role === "superadmin";
  const logoUrl = isSuperAdmin ? null : assetUrl(user.locationLogoUrl);
  const name = isSuperAdmin ? "Plato360" : user.locationName || "Restaurante";
  return <div className="admin-brand">{logoUrl ? <img className="admin-brand__logo" src={logoUrl} alt={`Logo de ${name}`} /> : <span>✦</span>}<strong>{name}</strong></div>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty"><span>✦</span><p>{children}</p></div>;
}

type OrderDraft = { notes: string; removeItemIds: string[] };

function OrderDetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="admin-modal admin-order-details-modal" role="dialog" aria-modal="true" aria-labelledby="admin-order-details-title"><div className="admin-modal__heading"><div><span className="admin-eyebrow">Pedido confirmado</span><h2 id="admin-order-details-title">Referencia #{order.referenceCode}</h2><p className="admin-order-details__location">{order.locationName ? `${order.locationName} · ` : ""}Mesa {order.tableLabel}</p></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar detalles del pedido"><X size={17} /></button></div><div className="admin-order-details__summary"><span><small>Fecha</small><strong>{date(order.createdAt)}</strong></span><span><small>Estado</small><strong>Confirmado</strong></span><span><small>Total</small><strong>{money(order.totalCents)}</strong></span></div>{order.notes && <p className="admin-order-details__notes"><strong>Nota:</strong> {order.notes}</p>}<ul className="admin-order-details__items">{order.items.map((item) => <li key={item.id}><span><strong>{item.quantity} × {item.name}</strong>{item.notes && <small>{item.notes}</small>}</span><b>{money(item.lineTotalCents)}</b></li>)}</ul><div className="admin-modal__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cerrar</button></div></section></div>;
}

function OrdersPanel({ locationId }: { locationId?: string | null }) {
  const [status, setStatus] = useState<"pending" | "in_process" | "confirmed" | "cancelled">("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { setError(""); try { const query = locationId ? `?status=${status}&locationId=${encodeURIComponent(locationId)}` : `?status=${status}`; const body = await request<{ orders: Order[] }>(`/api/admin/orders${query}`); setOrders(body.orders); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [status, locationId]);
  const draftFor = (order: Order) => drafts[order.id] ?? { notes: order.notes, removeItemIds: [] };
  const changeDraft = (order: Order, change: Partial<OrderDraft>) => setDrafts((current) => { const draft = current[order.id] ?? { notes: order.notes, removeItemIds: [] }; return { ...current, [order.id]: { ...draft, ...change } }; });
  const clearDraft = (orderId: string) => setDrafts((current) => { const next = { ...current }; delete next[orderId]; return next; });
  const persist = async (order: Order, draft: OrderDraft) => {
    if (order.items.length - draft.removeItemIds.length <= 0) throw new Error("El pedido debe conservar al menos un producto.");
    const body = await request<{ order: Order }>(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action: "update", notes: draft.notes, removeItemIds: draft.removeItemIds, version: order.version }) });
    return body.order;
  };
  const transition = async (order: Order, action: "confirm" | "complete" | "cancel") => {
    setBusy(order.id);
    setError("");
    try {
      let version = order.version;
      const draft = draftFor(order);
      if (action === "confirm" && (draft.notes !== order.notes || draft.removeItemIds.length > 0)) version = (await persist(order, draft)).version;
      await request(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action, version }) });
      clearDraft(order.id);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el pedido."); } finally { setBusy(null); }
  };
  const toggleItem = (order: Order, itemId: string) => {
    const draft = draftFor(order);
    const marked = draft.removeItemIds.includes(itemId);
    if (!marked && order.items.length - draft.removeItemIds.length <= 1) { setError("El pedido debe conservar al menos un producto. Para quitarlo completo, cancelá el pedido."); return; }
    changeDraft(order, { removeItemIds: marked ? draft.removeItemIds.filter((id) => id !== itemId) : [...draft.removeItemIds, itemId] });
  };
  return <section className="admin-panel"><PanelHeader title="Pedidos" subtitle="Recibí y atendé los pedidos enviados desde las mesas." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar pedidos"><RefreshCw size={17} /></button>} /><div className="admin-tabs">{(["pending", "in_process", "confirmed", "cancelled"] as const).map((item) => <button className={status === item ? "is-active" : ""} key={item} onClick={() => setStatus(item)}>{item === "pending" ? "Pendientes" : item === "in_process" ? "En proceso" : item === "confirmed" ? "Confirmados" : "Cancelados"}</button>)}</div>{error && <p className="admin-error">{error}</p>}{orders.length === 0 ? <EmptyState>No hay pedidos en este estado.</EmptyState> : <div className="admin-order-list">{orders.map((order) => { const draft = draftFor(order); const removed = new Set(draft.removeItemIds); const displayedTotal = order.items.filter((item) => !removed.has(item.id)).reduce((sum, item) => sum + item.lineTotalCents, 0); const hasChanges = draft.notes !== order.notes || draft.removeItemIds.length > 0; return <article className="admin-order" key={order.id}><div className="admin-order__head"><div><span className="admin-status">Mesa {order.tableLabel}</span>{order.locationName && <small className="admin-order__location">{order.locationName}</small>}<strong>Ref. {order.referenceCode} · {date(order.createdAt)}</strong></div><b>{money(displayedTotal)}</b></div>{status === "pending" ? <><div className="admin-order__editor"><label>Notas para el pedido<textarea rows={2} maxLength={500} value={draft.notes} onChange={(event) => changeDraft(order, { notes: event.target.value })} placeholder="Ej. Sin sal, alergia, entregar primero…" /><small>{draft.notes.length}/500</small></label></div><p className="admin-order__items-label">Productos <small>Marcá los que quieras quitar antes de confirmar.</small></p></> : order.notes && <p className="admin-order__notes"><strong>Nota:</strong> {order.notes}</p>}<ul>{order.items.map((item) => { const marked = removed.has(item.id); return <li className={marked ? "is-removed" : ""} key={item.id}><span className="admin-order-item__info"><span>{item.quantity} × {item.name}</span>{item.notes && <small>{item.notes}</small>}</span><span className="admin-order-item__amount"><b>{money(item.lineTotalCents)}</b>{status === "pending" && <button className="admin-icon-button" type="button" disabled={busy === order.id} onClick={() => toggleItem(order, item.id)} aria-label={marked ? `Restaurar ${item.name}` : `Quitar ${item.name}`} title={marked ? "Restaurar producto" : "Quitar producto"}>{marked ? <Check size={14} /> : <Trash2 size={14} />}</button>}</span></li>; })}</ul>{status === "pending" && <div className="admin-order__actions"><button className="admin-secondary" type="button" disabled={busy === order.id} onClick={() => void transition(order, "cancel")}>Cancelar pedido</button><button className="admin-primary admin-primary--small" type="button" disabled={busy === order.id} onClick={() => void transition(order, "confirm")}>Confirmar y pasar a proceso</button></div>}{status === "in_process" && <div className="admin-order__actions"><button className="admin-secondary" type="button" disabled={busy === order.id} onClick={() => void transition(order, "cancel")}>Cancelar pedido</button><button className="admin-primary admin-primary--small" type="button" disabled={busy === order.id} onClick={() => void transition(order, "complete")}>Pasar a confirmados</button></div>}{status === "confirmed" && <div className="admin-order__actions"><button className="admin-secondary admin-order__details" type="button" onClick={() => setDetailsOrder(order)}><Eye size={15} /> Ver detalles</button></div>}</article>; })}</div>}{detailsOrder && <OrderDetailsModal order={detailsOrder} onClose={() => setDetailsOrder(null)} />}</section>;
}

function QrPanel({ role, locationId, features = {} }: { role: Role; locationId?: string | null; features?: Record<string, boolean> }) {
  const [codes, setCodes] = useState<QrCode[]>([]);
  const [kind, setKind] = useState<"fixed" | "dynamic">(role === "superadmin" ? "fixed" : "dynamic");
  const [tableLabel, setTableLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [entryUrl, setEntryUrl] = useState("");
  const [copiedQrId, setCopiedQrId] = useState<string | null>(null);
  const [viewingCode, setViewingCode] = useState<QrCode | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrImageError, setQrImageError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const bypassFeatureRestrictions = role === "superadmin";
  const fixedEnabled = bypassFeatureRestrictions || !locationId || features.fixed_qr !== false;
  const dynamicEnabled = bypassFeatureRestrictions || !locationId || features.dynamic_qr !== false;
  const selectedKind = kind === "fixed" && fixedEnabled ? "fixed" : "dynamic";
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, []);
  const load = async () => { try { const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""; const body = await request<{ qrCodes: QrCode[] }>(`/api/admin/qr${query}`); setCodes(body.qrCodes); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los QR."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!viewingCode) { setQrImage(null); setQrImageError(""); return; }
      setQrImage(null);
      setQrImageError("");
      void QRCode.toDataURL(viewingCode.entryUrl, { errorCorrectionLevel: "H", margin: 3, width: 900, color: { dark: "#211a16", light: "#fffaf3" } })
        .then((dataUrl) => { if (!cancelled) setQrImage(dataUrl); })
        .catch(() => { if (!cancelled) setQrImageError("No se pudo generar la imagen del código QR."); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [viewingCode]);
  useEffect(() => {
    if (!viewingCode) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setViewingCode(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [viewingCode]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); if (!locationId) { setError("Elegí un local para crear un código QR."); return; } if (!fixedEnabled && !dynamicEnabled) { setError("Los códigos QR están desactivados para este local."); return; } setBusy(true); setError(""); setEntryUrl(""); try { const body = await request<{ entryUrl: string }>("/api/admin/qr", { method: "POST", body: JSON.stringify({ kind: selectedKind, tableLabel, ...(selectedKind === "dynamic" ? { durationMinutes: Number(durationMinutes) } : {}), locationId }) }); setEntryUrl(body.entryUrl); setTableLabel(""); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el QR."); } finally { setBusy(false); } };
  const revoke = async (id: string) => { setError(""); try { await request(`/api/admin/qr/${id}`, { method: "DELETE" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo revocar el QR."); } };
  const copyQrLink = async (code: QrCode) => { setError(""); try { await navigator.clipboard.writeText(code.entryUrl); setCopiedQrId(code.id); window.setTimeout(() => setCopiedQrId((current) => current === code.id ? null : current), 1800); } catch { setError("No se pudo copiar el enlace. Revisá los permisos del navegador."); } };
  const downloadFixedQr = () => { if (!viewingCode || viewingCode.kind !== "fixed" || !qrImage) return; const anchor = document.createElement("a"); anchor.href = qrImage; anchor.download = `qr-fijo-${viewingCode.tableLabel.trim().replace(/\s+/g, "-") || "mesa"}.png`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); };
  return <section className="admin-panel"><PanelHeader title="Códigos QR" subtitle="Conectá cada mesa con la carta y la sesión de pedidos." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar códigos QR"><RefreshCw size={17} /></button>} /><form className="admin-inline-form" onSubmit={create}><label>Tipo<select value={selectedKind} onChange={(event) => setKind(event.target.value as "fixed" | "dynamic")} disabled={role !== "superadmin"}>{role === "superadmin" && fixedEnabled && <option value="fixed">Fijo</option>}{dynamicEnabled && <option value="dynamic">Dinámico</option>}</select></label><label>Mesa<input required value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} placeholder="Ej. 12" /></label>{selectedKind === "dynamic" && <label>Duración (minutos)<input type="number" min="15" max="1440" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>}<button className="admin-primary admin-primary--small" disabled={busy || !locationId || (!fixedEnabled && !dynamicEnabled)}>{busy ? "Creando…" : "Crear QR"}</button></form>{!locationId && <p className="admin-note">Elegí un local para crear códigos QR.</p>}{!fixedEnabled && !dynamicEnabled && <p className="admin-note">Los códigos QR están desactivados para este local.</p>}{entryUrl && <div className="admin-success"><Check size={16} /><span>QR creado. También podés copiarlo desde la lista cuando quieras.</span><button onClick={() => void navigator.clipboard?.writeText(entryUrl)} aria-label="Copiar enlace recién creado"><Clipboard size={15} /></button></div>}{error && <p className="admin-error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Local</th><th>Mesa</th><th>Tipo</th><th>Estado</th><th>Enlace</th><th>Último uso</th><th>Tiempo restante</th><th /></tr></thead><tbody>{codes.map((code) => <tr key={code.id}><td>{code.locationName ?? "—"}</td><td>{code.tableLabel}</td><td>{code.kind === "fixed" ? "Fijo" : "Dinámico"}</td><td><span className={`admin-badge admin-badge--${code.status}`}>{code.status === "active" ? "Activo" : "Revocado"}</span></td><td><div className="admin-qr-link"><code title={code.entryUrl}>{code.entryUrl}</code><button className="admin-link-button admin-qr-copy" type="button" onClick={() => void copyQrLink(code)}>{copiedQrId === code.id ? <><Check size={14} /> Copiado</> : <><Clipboard size={14} /> Copiar enlace</>}</button></div></td><td>{date(code.lastUsedAt)}</td><td><span className={`admin-qr-expiry ${qrIsExpired(code.expiresAt, now) ? "is-expired" : ""}`}>{qrTimeRemaining(code.expiresAt, now)}</span></td><td><div className="admin-qr-actions"><button className="admin-link-button admin-qr-view" type="button" onClick={() => setViewingCode(code)}><Eye size={14} /> Ver QR</button>{code.status === "active" && <button className="admin-link-button" type="button" onClick={() => void revoke(code.id)}>Revocar</button>}</div></td></tr>)}</tbody></table></div>{viewingCode && <div className="admin-modal-backdrop admin-qr-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setViewingCode(null); }}><section className="admin-modal admin-qr-modal" role="dialog" aria-modal="true" aria-labelledby="admin-qr-modal-title"><div className="admin-modal__heading"><div><span className="admin-eyebrow">Código QR {viewingCode.kind === "fixed" ? "fijo" : "dinámico"}</span><h2 id="admin-qr-modal-title">Mesa {viewingCode.tableLabel}</h2>{viewingCode.locationName && <p className="admin-qr-modal__location">{viewingCode.locationName}</p>}</div><button className="admin-icon-button" type="button" onClick={() => setViewingCode(null)} aria-label="Cerrar código QR"><X size={17} /></button></div><div className="admin-qr-preview" aria-busy={!qrImage && !qrImageError}>{qrImage ? <img src={qrImage} alt={`Código QR ${viewingCode.kind === "fixed" ? "fijo" : "dinámico"} de la mesa ${viewingCode.tableLabel}`} /> : qrImageError ? <p className="admin-error">{qrImageError}</p> : <p className="admin-note">Generando imagen…</p>}</div><div className="admin-qr-modal__meta"><span className={`admin-badge admin-badge--${viewingCode.status}`}>{viewingCode.status === "active" ? "Activo" : "Revocado"}</span><span className={`admin-qr-expiry ${qrIsExpired(viewingCode.expiresAt, now) ? "is-expired" : ""}`}>Tiempo restante: {qrTimeRemaining(viewingCode.expiresAt, now)}</span><span>{viewingCode.expiresAt ? `Vence ${date(viewingCode.expiresAt)}` : "Sin vencimiento"}</span></div><div className="admin-modal__actions">{viewingCode.kind === "fixed" && <button className="admin-primary admin-primary--small" type="button" onClick={downloadFixedQr} disabled={!qrImage}><Download size={15} /> Descargar QR fijo</button>}<button className="admin-secondary" type="button" onClick={() => setViewingCode(null)}>Cerrar</button></div></section></div>}</section>;
}

function UsersPanel({ role, locationId }: { role: Role; locationId?: string | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", displayName: "", role: role === "admin" ? "mozo" : "admin", password: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: "", displayName: "", newPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""; const body = await request<{ users: User[] }>(`/api/admin/users${query}`); setUsers(body.users); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!locationId) { setError("Elegí un local para crear un usuario."); return; } setBusy(true); setError(""); try { await request("/api/admin/users", { method: "POST", body: JSON.stringify({ username: form.username, displayName: form.displayName, role: form.role, temporaryPassword: form.password, locationId }) }); setForm({ username: "", displayName: "", role: role === "admin" ? "mozo" : "admin", password: "" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario."); } finally { setBusy(false); } };
  const openEdit = (user: User) => { setEditingUser(user); setEditForm({ username: user.username, displayName: user.displayName, newPassword: "" }); setError(""); };
  const saveEdit = async (event: React.FormEvent) => { event.preventDefault(); if (!editingUser) return; setBusy(true); setError(""); try { await request(`/api/admin/users/${editingUser.id}`, { method: "PATCH", body: JSON.stringify({ action: "update", username: editForm.username, displayName: editForm.displayName, ...(editForm.newPassword ? { newPassword: editForm.newPassword } : {}) }) }); setEditingUser(null); setEditForm({ username: "", displayName: "", newPassword: "" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el usuario."); } finally { setBusy(false); } };
  const remove = async (user: User) => { if (!window.confirm(`¿Eliminar el usuario “${user.displayName}”? Esta acción no se puede deshacer.`)) return; setBusy(true); setError(""); try { await request(`/api/admin/users/${user.id}`, { method: "DELETE" }); if (editingUser?.id === user.id) setEditingUser(null); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el usuario."); } finally { setBusy(false); } };
return <section className="admin-panel"><PanelHeader title="Usuarios" subtitle="Administrá los accesos de cada local según su responsabilidad." /><>{editingUser && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditingUser(null); }}><form className="admin-modal" onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="admin-user-editor-title"><div className="admin-modal__heading"><div><span className="admin-eyebrow">Editar usuario</span><h2 id="admin-user-editor-title">{editingUser.displayName}</h2></div><button className="admin-icon-button" type="button" onClick={() => setEditingUser(null)} aria-label="Cerrar edición"><X size={17} /></button></div><div className="admin-modal__grid"><label>Usuario<input required minLength={3} value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} /></label><label>Nombre visible<input required value={editForm.displayName} onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })} /></label><label>Contraseña nueva<input minLength={6} type="password" autoComplete="new-password" placeholder="Dejar vacío para conservarla" value={editForm.newPassword} onChange={(event) => setEditForm({ ...editForm, newPassword: event.target.value })} /></label></div><div className="admin-modal__actions"><button className="admin-secondary" type="button" onClick={() => setEditingUser(null)}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button></div></form></div>}</><form className="admin-user-form" onSubmit={save}><label>Usuario<input required minLength={3} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label><label>Nombre visible<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "admin" | "mozo" })} disabled={role === "admin"}><option value="admin">Admin</option><option value="mozo">Mozo</option></select></label><label>Contraseña temporal<input required minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="admin-primary admin-primary--small" disabled={busy || !locationId}>{busy ? "Creando…" : "Crear usuario"}</button></form>{!locationId && <p className="admin-note">Elegí un local para crear usuarios. La vista consolidada es de consulta.</p>}{error && <p className="admin-error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuario</th><th>Local</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.username}</small></td><td>{user.locationName ?? "—"}</td><td>{user.role === "admin" ? "Admin" : "Mozo"}</td><td><span className={`admin-badge admin-badge--${user.status}`}>{user.status === "active" ? "Activo" : "Suspendido"}</span></td><td>{date(user.lastLoginAt)}</td><td><div className="admin-user-actions"><button className="admin-icon-button" type="button" onClick={() => openEdit(user)} aria-label={`Editar usuario ${user.displayName}`} title="Editar usuario"><Edit3 size={16} /></button><button className="admin-icon-button admin-user-delete" type="button" onClick={() => void remove(user)} aria-label={`Eliminar usuario ${user.displayName}`} title="Eliminar usuario" disabled={busy}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></section>;
}

function FeaturesPanel({ locationId, onFeatureChange }: { locationId?: string | null; onFeatureChange?: (feature: Feature) => void }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState("");
  const load = async () => { if (!locationId) { setFeatures([]); return; } try { const query = `?locationId=${encodeURIComponent(locationId)}`; const body = await request<{ features: Feature[] }>(`/api/admin/features${query}`); setFeatures(body.features); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar las funciones."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  const toggle = async (feature: Feature) => { setError(""); try { await request<{ feature: Feature }>("/api/admin/features", { method: "PATCH", body: JSON.stringify({ featureKey: feature.key, enabled: !feature.enabled, ...(locationId ? { locationId } : {}) }) }); onFeatureChange?.({ ...feature, enabled: !feature.enabled }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la función."); } };
  if (!locationId) return <section className="admin-panel"><PanelHeader title="Funciones" subtitle="Activá o desactivá capacidades del local. Los cambios quedan auditados." /><p className="admin-note">Elegí un local para administrar sus funciones.</p></section>;
  return <section className="admin-panel"><PanelHeader title="Funciones" subtitle="Activá o desactivá capacidades del local. Los cambios quedan auditados." />{error && <p className="admin-error">{error}</p>}<div className="admin-feature-list">{features.map((feature) => <button className="admin-feature" key={feature.key} onClick={() => void toggle(feature)}><span><strong>{feature.label}</strong><small>{feature.isDefault ? "Valor por defecto" : "Configuración guardada"}</small></span><span className={`admin-switch ${feature.enabled ? "is-on" : ""}`}><i /></span></button>)}</div></section>;
}

const logCategoryOptions: Array<{ value: "all" | LogCategory; label: string }> = [
  { value: "all", label: "Todos los eventos" },
  { value: "orders", label: "Pedidos" },
  { value: "errors", label: "Errores de aplicación" },
  { value: "passwords", label: "Cambios de contraseña" },
  { value: "users", label: "Usuarios" },
  { value: "access", label: "Accesos" },
  { value: "qr", label: "Códigos QR" },
  { value: "catalog", label: "Carta" },
  { value: "features", label: "Funciones" },
];

const logActionLabels: Record<string, string> = {
  "order.created": "Pedido recibido",
  "order.updated": "Pedido editado",
  "order.confirmed": "Pedido enviado a cocina",
  "order.completed": "Pedido confirmado",
  "order.cancelled": "Pedido cancelado",
  "error.order": "Error en pedido",
  "auth.password_changed": "Contraseña cambiada",
  "user.password_changed": "Contraseña de usuario cambiada",
  "user.password_reset": "Contraseña restablecida",
  "user.updated": "Usuario editado",
  "user.created": "Usuario creado",
  "user.deleted": "Usuario eliminado",
  "user.activated": "Usuario activado",
  "user.suspended": "Usuario suspendido",
  "auth.login_succeeded": "Inicio de sesión",
  "auth.login_failed": "Inicio de sesión fallido",
  "auth.logout": "Cierre de sesión",
  "qr.created": "QR creado",
  "qr.revoked": "QR revocado",
  "feature.updated": "Función actualizada",
};

function logActionLabel(action: string) {
  return logActionLabels[action] ?? action.replaceAll(".", " · ");
}

const orderStatusLabels: Record<string, string> = { pending: "Pendiente", in_process: "En proceso", confirmed: "Confirmado", cancelled: "Cancelado" };
const logRoleLabels: Record<string, string> = { superadmin: "SuperAdmin", admin: "Administrador", mozo: "Mozo", user: "Usuario" };
const logMetadataLabels: Record<string, string> = { role: "Perfil", subjectType: "Tipo de cuenta", attempts: "Intentos", enabled: "Estado", route: "Ruta", message: "Mensaje", kind: "Tipo", tableLabel: "Mesa", previousStatus: "Estado anterior", nextStatus: "Estado nuevo", totalCents: "Total", orderVersion: "Versión del pedido" };

function logActor(log: AuditLog) {
  if (log.action === "order.created" && !log.actorRole) return "Comensal";
  const name = log.actorDisplayName || log.actorPrincipal;
  if (log.actorRole === "mozo") return `Mozo · ${name}`;
  if (log.actorRole === "admin") return `Admin · ${name}`;
  return name;
}

function logMetadataValue(key: string, value: unknown) {
  if (key === "role" && typeof value === "string") return logRoleLabels[value] ?? value;
  if (key === "subjectType" && value === "superadmin") return "SuperAdmin";
  if (key === "subjectType" && value === "user") return "Usuario";
  if (key === "enabled" && typeof value === "boolean") return value ? "Activada" : "Desactivada";
  if (key === "totalCents" && typeof value === "number") return money(value);
  if (key === "previousStatus" || key === "nextStatus") return typeof value === "string" ? orderStatusLabels[value] ?? value : String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function logMetadataLabel(key: string) {
  return logMetadataLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function logDescription(log: AuditLog): string {
  const metadata = log.metadata ?? {};
  if (log.action.startsWith("order.")) {
    const table = typeof metadata.tableLabel === "string" ? `la mesa ${metadata.tableLabel}` : "el pedido";
    const actor = logActor(log);
    if (log.action === "order.created") return `El comensal creó un pedido para ${table}.`;
    if (log.action === "order.confirmed") return `${actor} aceptó el pedido de ${table} y lo pasó a En proceso.`;
    if (log.action === "order.completed") return `${actor} tomó el pedido de cocina y lo pasó a Confirmados.`;
    if (log.action === "order.cancelled") return `${actor} canceló el pedido de ${table}.`;
    if (log.action === "order.updated") return `${actor} editó el pedido de ${table} antes de confirmarlo.`;
    return `${actor} registró una acción sobre ${table}.`;
  }
  return logDetail(log);
}

function logDetail(log: AuditLog): string {
  const metadata = log.metadata ?? {};
  if (log.action.startsWith("order.")) {
    const table = typeof metadata.tableLabel === "string" ? `Mesa ${metadata.tableLabel}` : "Pedido";
    const total = typeof metadata.totalCents === "number" ? ` · ${money(metadata.totalCents)}` : "";
    return `${logDescription(log)}${total ? ` · Total ${total.replace(" · ", "")}` : ""}`;
  }
  if (log.action === "error.order") {
    const message = typeof metadata.message === "string" ? metadata.message : "Error no especificado";
    return `${message}${typeof metadata.route === "string" ? ` · ${metadata.route}` : ""}`;
  }
  if (log.action === "auth.password_changed") return "Un usuario cambió su contraseña. El valor nunca se registra.";
  if (log.action === "user.password_changed") return "Un administrador cambió la contraseña de un usuario. El valor nunca se registra.";
  if (log.action === "user.password_reset") return "Se restableció la contraseña de un usuario. El valor nunca se registra.";
  if (log.action === "user.updated") return "Se actualizaron los datos de un usuario. La contraseña nunca se muestra.";
  if (log.action === "auth.login_succeeded") {
    const role = typeof metadata.role === "string" ? logMetadataValue("role", metadata.role) : "";
    return `${logActor(log)} inició sesión${role ? ` con perfil ${role}` : ""}.`;
  }
  if (log.action === "auth.login_failed") {
    const subject = metadata.subjectType === "superadmin" ? "SuperAdmin" : "un usuario";
    return `Falló un intento de inicio de sesión para ${subject}.`;
  }
  if (log.action === "auth.logout") return `${logActor(log)} cerró sesión.`;
  const safeEntries = Object.entries(metadata).filter(([key]) => !/(password|secret|token|hash)/i.test(key)).slice(0, 3);
  if (safeEntries.length === 0) return "Sin detalles adicionales";
  return safeEntries.map(([key, value]) => `${logMetadataLabel(key)}: ${logMetadataValue(key, value)}`).join(" · ");
}

function safeLogMetadata(log: AuditLog) {
  return Object.entries(log.metadata ?? {}).filter(([key]) => !/(password|secret|token|hash)/i.test(key));
}

function LogDetailsModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const metadata = log.metadata ?? {};
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const order = log.entityType === "order";
  const field = (label: string, value: string) => <div className="admin-log-detail__field" key={label}><small>{label}</small><strong>{value}</strong></div>;
  const details = [
    field("Evento", logActionLabel(log.action)),
    field("Usuario", logActor(log)),
    field("Fecha", date(log.createdAt)),
    field("Local", log.locationName ?? "Global"),
    ...(order ? [
      field("Pedido", log.entityId ? `#${log.entityId.slice(0, 8).toUpperCase()}` : "—"),
      field("Mesa", typeof metadata.tableLabel === "string" ? metadata.tableLabel : "—"),
      field("Estado anterior", typeof metadata.previousStatus === "string" ? orderStatusLabels[metadata.previousStatus] ?? metadata.previousStatus : "—"),
      field("Estado nuevo", typeof metadata.nextStatus === "string" ? orderStatusLabels[metadata.nextStatus] ?? metadata.nextStatus : "—"),
      ...(typeof metadata.totalCents === "number" ? [field("Total", money(metadata.totalCents))] : []),
    ] : []),
  ];
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="admin-modal admin-log-modal" role="dialog" aria-modal="true" aria-labelledby="admin-log-modal-title"><div className="admin-modal__heading"><div><span className="admin-eyebrow">Registro de actividad</span><h2 id="admin-log-modal-title">{logActionLabel(log.action)}</h2></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar detalle del log"><X size={17} /></button></div><div className="admin-log-detail-grid">{details}</div><div className="admin-log-detail__description"><small>Qué pasó</small><p>{logDescription(log)}</p></div>{safeLogMetadata(log).length > 0 && <div className="admin-log-detail__metadata"><small>Datos del evento</small>{safeLogMetadata(log).map(([key, value]) => <div key={key}><span>{logMetadataLabel(key)}</span><strong>{logMetadataValue(key, value)}</strong></div>)}</div>}<div className="admin-modal__actions"><button className="admin-secondary" type="button" onClick={onClose}>Cerrar</button></div></section></div>;
}

function LogsPanel({ locationId }: { locationId?: string | null }) {
  const [category, setCategory] = useState<"all" | LogCategory>("all");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (locationId) query.set("locationId", locationId);
      if (category !== "all") query.set("category", category);
      const body = await request<{ logs: AuditLog[] }>(`/api/admin/logs${query.toString() ? `?${query.toString()}` : ""}`);
      setLogs(body.logs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los logs.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId, category]);
  return <section className="admin-panel"><PanelHeader title="Logs" subtitle="Consultá pedidos, errores y cambios importantes de la operación." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar logs" disabled={loading}><RefreshCw size={17} /></button>} /><div className="admin-log-toolbar"><label>Mostrar<select value={category} onChange={(event) => setCategory(event.target.value as "all" | LogCategory)}>{logCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><span>{loading ? "Actualizando…" : `${logs.length} eventos visibles`}</span></div>{error && <p className="admin-error">{error}</p>}{logs.length === 0 && !loading ? <EmptyState>No hay eventos para este filtro.</EmptyState> : <div className="admin-log-list">{logs.map((log) => <article className={`admin-log ${log.action.startsWith("error.") ? "admin-log--error" : ""}`} key={log.id}><div className="admin-log__mark"><ScrollText size={16} /></div><div className="admin-log__body"><div className="admin-log__heading"><strong>{logActionLabel(log.action)}</strong><time>{date(log.createdAt)}</time></div><p>{logDescription(log)}</p><small>Usuario: {logActor(log)} · Fecha: {date(log.createdAt)} · Local: {log.locationName ?? "Global"}{log.entityId && log.entityType === "order" ? ` · Pedido #${log.entityId.slice(0, 8).toUpperCase()}` : ""}</small><button className="admin-link-button admin-log-details" type="button" onClick={() => setSelectedLog(log)}>Ver más detalles</button></div></article>)}</div>}{selectedLog && <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}</section>;
}

function TelemetryMonthlyCard({ title, item, kind }: { title: string; item: TelemetryMonthlyItem | null; kind: "votes" | "views" }) {
  return <article className="admin-telemetry-monthly-card"><div className="admin-telemetry-monthly-card__heading"><div><span className="admin-eyebrow">Este mes</span><h2>{title}</h2></div><Activity size={18} /></div>{item ? <div className="admin-telemetry-monthly-card__content"><div className="admin-telemetry-monthly-card__media">{item.media?.kind === "video" ? <video src={item.media.url} muted loop autoPlay playsInline aria-label={`Video de ${item.name}`} /> : item.media ? <img src={item.media.url} alt={`Imagen de ${item.name}`} /> : <span>Sin imagen</span>}</div><div className="admin-telemetry-monthly-card__info"><strong>{item.name}</strong><small>{item.locationName}</small>{kind === "votes" ? <p><b>{item.votes ?? 0}</b> votos</p> : <p><b>{item.views ?? 0}</b> vistas · <b>{duration(Math.round(item.averageWatchSeconds ?? 0))}</b> promedio mirando<br /><small>{duration(item.totalWatchSeconds ?? 0)} acumulados</small></p>}</div></div> : <EmptyState>No hay datos de este mes.</EmptyState>}</article>;
}

function TelemetryPanel({ locationId }: { locationId?: string | null }) {
  const [range, setRange] = useState("30");
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [daily, setDaily] = useState<TelemetryDay[]>([]);
  const [products, setProducts] = useState<TelemetryContent[]>([]);
  const [candidates, setCandidates] = useState<TelemetryContent[]>([]);
  const [monthly, setMonthly] = useState<{ mostVoted: TelemetryMonthlyItem | null; mostViewed: TelemetryMonthlyItem | null } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ range });
      if (locationId) query.set("locationId", locationId);
      const body = await request<{ summary: TelemetrySummary; daily: TelemetryDay[]; products: TelemetryContent[]; candidates: TelemetryContent[]; monthly: { mostVoted: TelemetryMonthlyItem | null; mostViewed: TelemetryMonthlyItem | null } }>(`/api/admin/telemetry?${query.toString()}`);
      setSummary(body.summary);
      setDaily(body.daily);
      setProducts(body.products);
      setCandidates(body.candidates);
      setMonthly(body.monthly);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la telemetría.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId, range]);
  const values = summary ?? { totalEvents: 0, uniqueVisitors: 0, impressions: 0, detailOpens: 0, addsToCart: 0, ordersCreated: 0, votes: 0, interests: 0 };
  const conversion = values.impressions > 0 ? `${((values.ordersCreated / values.impressions) * 100).toFixed(1)}%` : "0%";
  const maxDay = Math.max(...daily.map((item) => item.events), 1);
  const metric = (label: string, value: string | number, tone = "") => <div className={`admin-telemetry-card ${tone}`} key={label}><small>{label}</small><strong>{value}</strong></div>;
  return <section className="admin-panel"><PanelHeader title="Telemetría" subtitle="Medí cómo recorren la carta los comensales y qué contenido genera más interés." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar telemetría" disabled={loading}><RefreshCw size={17} /></button>} /><div className="admin-telemetry-toolbar"><label>Período<select value={range} onChange={(event) => setRange(event.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></label><span>{loading ? "Actualizando…" : "Eventos anónimos de la carta"}</span></div>{error && <p className="admin-error">{error}</p>}<div className="admin-telemetry-monthly"><TelemetryMonthlyCard title="Plato más votado este mes" item={monthly?.mostVoted ?? null} kind="votes" /><TelemetryMonthlyCard title="Plato más visto este mes" item={monthly?.mostViewed ?? null} kind="views" /></div><div className="admin-telemetry-stats">{metric("Eventos", values.totalEvents)}{metric("Visitantes", values.uniqueVisitors)}{metric("Impresiones", values.impressions)}{metric("Aperturas de detalle", values.detailOpens)}{metric("Agregados al pedido", values.addsToCart)}{metric("Pedidos creados", values.ordersCreated, "is-highlight")}{metric("Conversión impresión → pedido", conversion, "is-highlight")}{metric("Votos / intereses", `${values.votes} / ${values.interests}`)}</div><div className="admin-telemetry-layout"><section className="admin-telemetry-block"><div className="admin-telemetry-block__heading"><div><span className="admin-eyebrow">Actividad</span><h2>Eventos por día</h2></div><BarChart3 size={18} /></div>{daily.length === 0 ? <EmptyState> todavía no hay eventos en este período.</EmptyState> : <div className="admin-telemetry-chart">{daily.map((item) => <div className="admin-telemetry-bar" key={item.day}><div className="admin-telemetry-bar__value">{item.events}</div><i style={{ height: `${Math.max(8, (item.events / maxDay) * 100)}%` }} /><small>{item.day.slice(5)}</small></div>)}</div>}</section><section className="admin-telemetry-block"><div className="admin-telemetry-block__heading"><div><span className="admin-eyebrow">Contenido</span><h2>Platos más observados</h2></div><Activity size={18} /></div>{products.length === 0 ? <EmptyState>No hay productos con telemetría.</EmptyState> : <div className="admin-telemetry-list">{products.map((item) => <div className="admin-telemetry-row" key={item.id}><span><strong>{item.name ?? "Producto eliminado"}</strong><small>{item.impressions} impresiones · {item.detailOpens} detalles · {item.addsToCart ?? 0} agregados</small></span><b>{item.ordersCreated ?? 0} pedidos</b></div>)}</div>}</section></div>{candidates.length > 0 && <section className="admin-telemetry-block admin-telemetry-block--wide"><div className="admin-telemetry-block__heading"><div><span className="admin-eyebrow">Decides tú</span><h2>Contenido en prueba</h2></div><Activity size={18} /></div><div className="admin-telemetry-list">{candidates.map((item) => <div className="admin-telemetry-row" key={item.id}><span><strong>{item.name ?? "Contenido eliminado"}</strong><small>{item.impressions} impresiones · {item.detailOpens} detalles · {item.votes ?? 0} votos · {item.interests ?? 0} avisos</small></span><b>{item.detailOpens ?? 0} aperturas</b></div>)}</div></section>}</section>;
}

function AccountPanel({ user }: { user: SessionUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <section className="admin-panel"><PanelHeader title="Mi cuenta" subtitle={`Sesión iniciada como ${user.principalLabel}.`} /><form className="admin-password-form" onSubmit={async (event) => { event.preventDefault(); setMessage(""); setError(""); try { await request("/api/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }); setCurrentPassword(""); setNewPassword(""); setMessage("Contraseña actualizada."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña."); } }}><label>Contraseña actual<input required minLength={6} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>Nueva contraseña<input required minLength={6} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><button className="admin-primary admin-primary--small">Actualizar contraseña</button></form>{message && <p className="admin-success"><Check size={16} /> {message}</p>}{error && <p className="admin-error">{error}</p>}{user.role === "superadmin" && <p className="admin-note">La credencial del SuperAdmin se administra como secreto de despliegue.</p>}</section>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <header className="admin-panel__header"><div><span className="admin-eyebrow">Operación</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}

function LocationObserver({ locations, selectedId, onSelect }: { locations: LocationOption[]; selectedId: ObservedLocationId; onSelect: (locationId: string | typeof allLocationsValue) => void }) {
  const [open, setOpen] = useState(false);
  const selected = locations.find((location) => location.id === selectedId);
  const selectedLabel = selectedId === allLocationsValue ? "Todos los locales" : selected?.name ?? "Cargando locales…";
  return <div className="admin-observer"><button className="admin-observer__trigger" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}><Store size={16} /><span><small>Observar local</small><strong>{selectedLabel}</strong></span><ChevronDown size={15} /></button>{open && <div className="admin-observer__menu" role="menu"><span className="admin-observer__title">Observar</span><button className={selectedId === allLocationsValue ? "is-selected" : ""} type="button" role="menuitem" onClick={() => { onSelect(allLocationsValue); setOpen(false); }}><span>Todos los locales</span><small>Vista consolidada</small></button>{locations.length === 0 ? <span className="admin-observer__empty">No hay locales registrados.</span> : <><span className="admin-observer__title">Locales registrados</span>{locations.map((location) => <button className={location.id === selectedId ? "is-selected" : ""} type="button" role="menuitem" key={location.id} onClick={() => { onSelect(location.id); setOpen(false); }}><span>{location.name}</span><small>{location.address || location.slug}</small></button>)}</>}</div>}</div>;
}

export default function AdminConsole() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") return "light";
    const storedTheme = window.localStorage.getItem(adminThemeStorageKey);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "light";
  });
  const [view, setView] = useState("orders");
  const [mobileNav, setMobileNav] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [observedLocationId, setObservedLocationId] = useState<ObservedLocationId>(null);
  const activeLocationId = user?.role === "superadmin" && observedLocationId !== allLocationsValue ? observedLocationId : user?.locationId;
  const [locationFeatures, setLocationFeatures] = useState<Record<string, boolean>>({});
  useEffect(() => { request<{ user: SessionUser }>("/api/auth/me").then((body) => setUser(body.user)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (user?.role !== "superadmin") return; request<{ locations: LocationOption[] }>("/api/admin/locations").then((body) => { setLocations(body.locations); setObservedLocationId((current) => current === allLocationsValue || (current && body.locations.some((location) => location.id === current)) ? current : body.locations[0]?.id ?? allLocationsValue); }).catch(() => { setLocations([]); setObservedLocationId(allLocationsValue); }); }, [user?.role]);
  useEffect(() => {
    if (!user || !activeLocationId) {
      const timer = window.setTimeout(() => setLocationFeatures({}), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    void request<{ features: Feature[] }>(`/api/admin/features?locationId=${encodeURIComponent(activeLocationId)}`).then((body) => {
      if (!cancelled) setLocationFeatures(Object.fromEntries(body.features.map((feature) => [feature.key, feature.enabled])));
    }).catch(() => { if (!cancelled) setLocationFeatures({}); });
    return () => { cancelled = true; };
  }, [user?.role, activeLocationId]);
  const featureEnabled = (key: string) => user?.role === "superadmin" || !activeLocationId || locationFeatures[key] !== false;
  const links = useMemo(() => user ? [
    ...(featureEnabled("orders") ? [{ id: "orders", label: "Pedidos", icon: ShoppingBag }] : []),
    ...(user.role === "superadmin" || user.role === "admin" ? [{ id: "catalog", label: "Carta", icon: Store }] : []),
    ...(featureEnabled("fixed_qr") || featureEnabled("dynamic_qr") ? [{ id: "qr", label: "Códigos QR", icon: QrCode }] : []),
    ...(user.role === "superadmin" || user.role === "admin" ? [{ id: "users", label: "Usuarios", icon: Users }] : []),
    ...(user.role === "superadmin" || user.role === "admin" ? [{ id: "logs", label: "Logs", icon: ScrollText }] : []),
    ...(featureEnabled("telemetry") && (user.role === "superadmin" || user.role === "admin") ? [{ id: "telemetry", label: "Telemetría", icon: Activity }] : []),
    ...(user.role === "superadmin" ? [{ id: "features", label: "Funciones", icon: SlidersHorizontal }] : []),
    { id: "account", label: "Mi cuenta", icon: KeyRound },
  ] : [], [user, activeLocationId, locationFeatures]);
  const navGroups = useMemo(() => [{ label: "Operación", ids: ["orders", "catalog", "qr"] }, { label: "Administración", ids: ["users", "logs", "telemetry", "features"] }, { label: "Cuenta", ids: ["account"] }].map((group) => ({ ...group, links: links.filter((link) => group.ids.includes(link.id)) })).filter((group) => group.links.length > 0), [links]);
  const renderedView = links.some((link) => link.id === view) ? view : links[0]?.id ?? "account";
  if (loading) return <main className="admin-loading">Cargando consola…</main>;
  if (!user) return <Login onLogin={setUser} />;
  const logout = async () => { await request("/api/auth/logout", { method: "POST" }).catch(() => undefined); setUser(null); };
  const toggleTheme = () => setTheme((current) => {
    const next = current === "dark" ? "light" : "dark";
    window.localStorage.setItem(adminThemeStorageKey, next);
    return next;
  });
  const updateObservedLocation = (location: LocationOption) => setLocations((current) => current.map((item) => item.id === location.id ? { ...item, name: location.name, address: location.address, logoUrl: location.logoUrl } : item));
  const activeLinkLabel = links.find((link) => link.id === renderedView)?.label ?? "Consola operativa";
  return <main className={`admin-shell admin-shell--${theme}`}><aside className={`admin-sidebar ${mobileNav ? "is-open" : ""}`}><div className="admin-sidebar__brand"><AdminBrand user={user} /><button className="admin-close-nav" type="button" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={19} /></button></div><div className="admin-role"><ShieldCheck size={16} /><span><strong>{user.role === "superadmin" ? "SuperAdmin" : user.role === "admin" ? "Admin" : "Mozo"}</strong><small>{user.principalLabel}</small></span></div><nav>{navGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-group__label">{group.label}</span>{group.links.map(({ id, label, icon: Icon }) => <button className={renderedView === id ? "is-active" : ""} key={id} type="button" onClick={() => { setView(id); setMobileNav(false); }}><Icon size={17} />{label}</button>)}</div>)}</nav><button className="admin-logout" type="button" onClick={() => void logout()}><LogOut size={17} />Cerrar sesión</button></aside>{mobileNav && <button className="admin-nav-backdrop" type="button" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}<div className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" type="button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={20} /></button><span className="admin-topbar__context">{activeLinkLabel}</span><div className="admin-topbar__actions">{user.role === "superadmin" && <LocationObserver locations={locations} selectedId={observedLocationId} onSelect={setObservedLocationId} />}<button className="admin-theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}<span>{theme === "dark" ? "Claro" : "Oscuro"}</span></button><button className="admin-topbar__account" type="button" onClick={() => setView("account")}><span>{user.principalLabel.slice(0, 1).toUpperCase()}</span>{user.principalLabel}</button></div></header><div className="admin-content">{user.forcePasswordChange && <div className="admin-warning"><KeyRound size={16} /> Esta cuenta tiene una contraseña temporal. Actualizala en “Mi cuenta”.</div>}{renderedView === "orders" && <OrdersPanel locationId={activeLocationId} />}{renderedView === "catalog" && (user.role === "superadmin" || user.role === "admin") && <CatalogPanel key={activeLocationId ?? "default"} locationId={activeLocationId} features={locationFeatures} isSuperAdmin={user.role === "superadmin"} onLocationChange={(location) => { updateObservedLocation(location); setUser((current) => current ? { ...current, locationName: current.role === "superadmin" ? null : location.name, locationLogoUrl: current.role === "superadmin" ? null : location.logoUrl } : current); }} onSelectLocation={(locationId) => setObservedLocationId(locationId)} />}{renderedView === "qr" && <QrPanel role={user.role} locationId={activeLocationId} features={locationFeatures} />}{renderedView === "users" && <UsersPanel role={user.role} locationId={activeLocationId} />}{renderedView === "logs" && (user.role === "superadmin" || user.role === "admin") && <LogsPanel locationId={activeLocationId} />}{renderedView === "telemetry" && (user.role === "superadmin" || user.role === "admin") && <TelemetryPanel locationId={activeLocationId} />}{renderedView === "features" && user.role === "superadmin" && <FeaturesPanel locationId={activeLocationId} onFeatureChange={(feature) => setLocationFeatures((current) => ({ ...current, [feature.key]: feature.enabled }))} />}{renderedView === "account" && <AccountPanel user={user} />}</div></div></main>;
}
