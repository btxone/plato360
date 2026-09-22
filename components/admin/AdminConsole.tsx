"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Clipboard, KeyRound, LogOut, Menu, QrCode, RefreshCw, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, Users, X } from "lucide-react";
import CatalogPanel from "@/components/admin/CatalogPanel";

/* Panel loaders intentionally keep stable effect triggers while their request helpers close over panel state. */
/* eslint-disable react-hooks/exhaustive-deps */

type Role = "superadmin" | "admin" | "mozo";
type SessionUser = { id: string; principalLabel: string; role: Role; locationId: string | null; locationName: string | null; locationLogoUrl: string | null; forcePasswordChange: boolean };
type LocationOption = { id: string; slug: string; name: string; address: string | null; logoUrl: string | null };
type Order = { id: string; referenceCode: string; tableLabel: string; status: "pending" | "confirmed" | "cancelled"; totalCents: number; version: number; createdAt: string; items: Array<{ name: string; quantity: number; lineTotalCents: number }> };
type QrCode = { id: string; kind: "fixed" | "dynamic"; status: "active" | "revoked"; tableLabel: string; publicId: string; entryUrl: string; expiresAt: string | null; lastUsedAt: string | null };
type User = { id: string; username: string; displayName: string; role: "admin" | "mozo"; status: "active" | "suspended"; forcePasswordChange: boolean; lastLoginAt: string | null };
type Feature = { key: string; label: string; enabled: boolean; isDefault: boolean };

const money = (cents: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(cents / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Nunca";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="admin-login"><section className="admin-login__card"><div className="admin-brand"><span>✦</span><strong>Plato360</strong></div><span className="admin-eyebrow">Acceso operativo</span><h1>Entrá a tu consola</h1><p>Gestioná pedidos, carta, accesos y códigos QR desde un solo lugar.</p><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const body = await request<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }); onLogin(body.user); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); } finally { setBusy(false); } }}><label>Usuario<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Contraseña<input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button></form></section></main>;
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

function OrdersPanel({ locationId }: { locationId?: string | null }) {
  const [status, setStatus] = useState<"pending" | "confirmed" | "cancelled">("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { setError(""); try { const query = locationId ? `?status=${status}&locationId=${encodeURIComponent(locationId)}` : `?status=${status}`; const body = await request<{ orders: Order[] }>(`/api/admin/orders${query}`); setOrders(body.orders); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [status, locationId]);
  const transition = async (order: Order, action: "confirm" | "cancel") => { setBusy(order.id); setError(""); try { await request(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action, version: order.version }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el pedido."); } finally { setBusy(null); } };
  return <section className="admin-panel"><PanelHeader title="Pedidos" subtitle="Recibí y atendé los pedidos enviados desde las mesas." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar pedidos"><RefreshCw size={17} /></button>} /><div className="admin-tabs">{(["pending", "confirmed", "cancelled"] as const).map((item) => <button className={status === item ? "is-active" : ""} key={item} onClick={() => setStatus(item)}>{item === "pending" ? "Pendientes" : item === "confirmed" ? "Confirmados" : "Cancelados"}</button>)}</div>{error && <p className="admin-error">{error}</p>}{orders.length === 0 ? <EmptyState>No hay pedidos en este estado.</EmptyState> : <div className="admin-order-list">{orders.map((order) => <article className="admin-order" key={order.id}><div className="admin-order__head"><div><span className="admin-status">Mesa {order.tableLabel}</span><strong>Ref. {order.referenceCode} · {date(order.createdAt)}</strong></div><b>{money(order.totalCents)}</b></div><ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}><span>{item.quantity} × {item.name}</span><b>{money(item.lineTotalCents)}</b></li>)}</ul>{status === "pending" && <div className="admin-order__actions"><button className="admin-secondary" disabled={busy === order.id} onClick={() => void transition(order, "cancel")}>Cancelar</button><button className="admin-primary admin-primary--small" disabled={busy === order.id} onClick={() => void transition(order, "confirm")}>Confirmar</button></div>}</article>)}</div>}</section>;
}

function QrPanel({ role, locationId }: { role: Role; locationId?: string | null }) {
  const [codes, setCodes] = useState<QrCode[]>([]);
  const [kind, setKind] = useState<"fixed" | "dynamic">(role === "superadmin" ? "fixed" : "dynamic");
  const [tableLabel, setTableLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [entryUrl, setEntryUrl] = useState("");
  const [copiedQrId, setCopiedQrId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""; const body = await request<{ qrCodes: QrCode[] }>(`/api/admin/qr${query}`); setCodes(body.qrCodes); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los QR."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); setEntryUrl(""); try { const body = await request<{ entryUrl: string }>("/api/admin/qr", { method: "POST", body: JSON.stringify({ kind, tableLabel, ...(kind === "dynamic" ? { durationMinutes: Number(durationMinutes) } : {}), ...(locationId ? { locationId } : {}) }) }); setEntryUrl(body.entryUrl); setTableLabel(""); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el QR."); } finally { setBusy(false); } };
  const revoke = async (id: string) => { setError(""); try { await request(`/api/admin/qr/${id}`, { method: "DELETE" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo revocar el QR."); } };
  const copyQrLink = async (code: QrCode) => { setError(""); try { await navigator.clipboard.writeText(code.entryUrl); setCopiedQrId(code.id); window.setTimeout(() => setCopiedQrId((current) => current === code.id ? null : current), 1800); } catch { setError("No se pudo copiar el enlace. Revisá los permisos del navegador."); } };
  return <section className="admin-panel"><PanelHeader title="Códigos QR" subtitle="Conectá cada mesa con la carta y la sesión de pedidos." action={<button className="admin-icon-button" onClick={() => void load()} aria-label="Actualizar códigos QR"><RefreshCw size={17} /></button>} /><form className="admin-inline-form" onSubmit={create}><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as "fixed" | "dynamic")} disabled={role !== "superadmin"}>{role === "superadmin" && <option value="fixed">Fijo</option>}<option value="dynamic">Dinámico</option></select></label><label>Mesa<input required value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} placeholder="Ej. 12" /></label>{kind === "dynamic" && <label>Duración (minutos)<input type="number" min="15" max="1440" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>}<button className="admin-primary admin-primary--small" disabled={busy}>{busy ? "Creando…" : "Crear QR"}</button></form>{entryUrl && <div className="admin-success"><Check size={16} /><span>QR creado. También podés copiarlo desde la lista cuando quieras.</span><button onClick={() => void navigator.clipboard?.writeText(entryUrl)} aria-label="Copiar enlace recién creado"><Clipboard size={15} /></button></div>}{error && <p className="admin-error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mesa</th><th>Tipo</th><th>Estado</th><th>Enlace</th><th>Último uso</th><th /></tr></thead><tbody>{codes.map((code) => <tr key={code.id}><td>{code.tableLabel}</td><td>{code.kind === "fixed" ? "Fijo" : "Dinámico"}</td><td><span className={`admin-badge admin-badge--${code.status}`}>{code.status === "active" ? "Activo" : "Revocado"}</span></td><td><div className="admin-qr-link"><code title={code.entryUrl}>{code.entryUrl}</code><button className="admin-link-button admin-qr-copy" type="button" onClick={() => void copyQrLink(code)}>{copiedQrId === code.id ? <><Check size={14} /> Copiado</> : <><Clipboard size={14} /> Copiar enlace</>}</button></div></td><td>{date(code.lastUsedAt)}</td><td>{code.status === "active" && <button className="admin-link-button" onClick={() => void revoke(code.id)}>Revocar</button>}</td></tr>)}</tbody></table></div></section>;
}

function UsersPanel({ role, locationId }: { role: Role; locationId?: string | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", displayName: "", role: role === "admin" ? "mozo" : "admin", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""; const body = await request<{ users: User[] }>(`/api/admin/users${query}`); setUsers(body.users); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await request("/api/admin/users", { method: "POST", body: JSON.stringify({ username: form.username, displayName: form.displayName, role: form.role, temporaryPassword: form.password, ...(locationId ? { locationId } : {}) }) }); setForm({ username: "", displayName: "", role: role === "admin" ? "mozo" : "admin", password: "" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario."); } finally { setBusy(false); } };
  const update = async (user: User, action: "activate" | "suspend") => { setError(""); try { await request(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ action }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el usuario."); } };
  return <section className="admin-panel"><PanelHeader title="Usuarios" subtitle="Administrá los accesos de cada local según su responsabilidad." /><form className="admin-user-form" onSubmit={save}><label>Usuario<input required minLength={3} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label><label>Nombre visible<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "admin" | "mozo" })} disabled={role === "admin"}><option value="admin">Admin</option><option value="mozo">Mozo</option></select></label><label>Contraseña temporal<input required minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="admin-primary admin-primary--small" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button></form>{error && <p className="admin-error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.username}</small></td><td>{user.role === "admin" ? "Admin" : "Mozo"}</td><td><span className={`admin-badge admin-badge--${user.status}`}>{user.status === "active" ? "Activo" : "Suspendido"}</span></td><td>{date(user.lastLoginAt)}</td><td><button className="admin-link-button" onClick={() => void update(user, user.status === "active" ? "suspend" : "activate")}>{user.status === "active" ? "Suspender" : "Activar"}</button></td></tr>)}</tbody></table></div></section>;
}

function FeaturesPanel({ locationId }: { locationId?: string | null }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState("");
  const load = async () => { try { const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""; const body = await request<{ features: Feature[] }>(`/api/admin/features${query}`); setFeatures(body.features); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar las funciones."); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [locationId]);
  const toggle = async (feature: Feature) => { setError(""); try { await request("/api/admin/features", { method: "PATCH", body: JSON.stringify({ featureKey: feature.key, enabled: !feature.enabled, ...(locationId ? { locationId } : {}) }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la función."); } };
  return <section className="admin-panel"><PanelHeader title="Funciones" subtitle="Activá o desactivá capacidades del local. Los cambios quedan auditados." />{error && <p className="admin-error">{error}</p>}<div className="admin-feature-list">{features.map((feature) => <button className="admin-feature" key={feature.key} onClick={() => void toggle(feature)}><span><strong>{feature.label}</strong><small>{feature.isDefault ? "Valor por defecto" : "Configuración guardada"}</small></span><span className={`admin-switch ${feature.enabled ? "is-on" : ""}`}><i /></span></button>)}</div></section>;
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

function LocationObserver({ locations, selectedId, onSelect }: { locations: LocationOption[]; selectedId: string | null; onSelect: (locationId: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = locations.find((location) => location.id === selectedId);
  return <div className="admin-observer"><button className="admin-observer__trigger" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}><Store size={16} /><span><small>Observar local</small><strong>{selected?.name ?? "Elegí un local"}</strong></span><ChevronDown size={15} /></button>{open && <div className="admin-observer__menu" role="menu"><span className="admin-observer__title">Locales registrados</span>{locations.length === 0 ? <span className="admin-observer__empty">No hay locales registrados.</span> : locations.map((location) => <button className={location.id === selectedId ? "is-selected" : ""} type="button" role="menuitem" key={location.id} onClick={() => { onSelect(location.id); setOpen(false); }}><span>{location.name}</span><small>{location.address || location.slug}</small></button>)}</div>}</div>;
}

export default function AdminConsole() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("orders");
  const [mobileNav, setMobileNav] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [observedLocationId, setObservedLocationId] = useState<string | null>(null);
  useEffect(() => { request<{ user: SessionUser }>("/api/auth/me").then((body) => setUser(body.user)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (user?.role !== "superadmin") return; request<{ locations: LocationOption[] }>("/api/admin/locations").then((body) => { setLocations(body.locations); setObservedLocationId((current) => current && body.locations.some((location) => location.id === current) ? current : body.locations[0]?.id ?? null); }).catch(() => setLocations([])); }, [user?.role]);
  const links = useMemo(() => user ? [{ id: "orders", label: "Pedidos", icon: ShoppingBag }, ...(user.role === "superadmin" || user.role === "admin" ? [{ id: "catalog", label: "Carta", icon: Store }] : []), { id: "qr", label: "Códigos QR", icon: QrCode }, ...(user.role === "superadmin" || user.role === "admin" ? [{ id: "users", label: "Usuarios", icon: Users }] : []), ...(user.role === "superadmin" ? [{ id: "features", label: "Funciones", icon: SlidersHorizontal }] : []), { id: "account", label: "Mi cuenta", icon: KeyRound }] : [], [user]);
  if (loading) return <main className="admin-loading">Cargando consola…</main>;
  if (!user) return <Login onLogin={setUser} />;
  const activeLocationId = user.role === "superadmin" ? observedLocationId : user.locationId;
  const logout = async () => { await request("/api/auth/logout", { method: "POST" }).catch(() => undefined); setUser(null); };
  const updateObservedLocation = (location: LocationOption) => setLocations((current) => current.map((item) => item.id === location.id ? { ...item, name: location.name, address: location.address, logoUrl: location.logoUrl } : item));
  return <main className="admin-shell"><aside className={`admin-sidebar ${mobileNav ? "is-open" : ""}`}><div className="admin-sidebar__brand"><AdminBrand user={user} /><button className="admin-close-nav" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={19} /></button></div><div className="admin-role"><ShieldCheck size={16} /><span><strong>{user.role === "superadmin" ? "SuperAdmin" : user.role === "admin" ? "Admin" : "Mozo"}</strong><small>{user.principalLabel}</small></span></div><nav>{links.map(({ id, label, icon: Icon }) => <button className={view === id ? "is-active" : ""} key={id} onClick={() => { setView(id); setMobileNav(false); }}><Icon size={17} />{label}</button>)}</nav><button className="admin-logout" onClick={() => void logout()}><LogOut size={17} />Cerrar sesión</button></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={20} /></button><span>Consola operativa</span><div className="admin-topbar__actions">{user.role === "superadmin" && <LocationObserver locations={locations} selectedId={observedLocationId} onSelect={setObservedLocationId} />}<button className="admin-topbar__account" onClick={() => setView("account")}><span>{user.principalLabel.slice(0, 1).toUpperCase()}</span>{user.principalLabel}</button></div></header><div className="admin-content">{user.forcePasswordChange && <div className="admin-warning"><KeyRound size={16} /> Esta cuenta tiene una contraseña temporal. Actualizala en “Mi cuenta”.</div>}{view === "orders" && <OrdersPanel locationId={activeLocationId} />}{view === "catalog" && (user.role === "superadmin" || user.role === "admin") && <CatalogPanel key={activeLocationId ?? "default"} locationId={activeLocationId} onLocationChange={(location) => { updateObservedLocation(location); setUser((current) => current ? { ...current, locationName: current.role === "superadmin" ? null : location.name, locationLogoUrl: current.role === "superadmin" ? null : location.logoUrl } : current); }} />}{view === "qr" && <QrPanel role={user.role} locationId={activeLocationId} />}{view === "users" && <UsersPanel role={user.role} locationId={activeLocationId} />}{view === "features" && user.role === "superadmin" && <FeaturesPanel locationId={activeLocationId} />}{view === "account" && <AccountPanel user={user} />}</div></div></main>;
}
