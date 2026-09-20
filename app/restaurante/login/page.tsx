"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RestaurantLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? "No pudimos iniciar sesión.");
        return;
      }
      router.push("/restaurante");
    } catch {
      setError("No pudimos conectar con el panel. Probá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="restaurant-login-page">
      <div className="restaurant-login-glow" />
      <section className="restaurant-login-card" aria-labelledby="restaurant-login-title">
        <div className="restaurant-login-brand"><span><Utensils size={18} /></span><strong>PLATO360</strong></div>
        <div className="restaurant-login-kicker"><LockKeyhole size={14} /> VISTA RESTAURANTE</div>
        <h1 id="restaurant-login-title">Tu carta,<br /><em>bajo control.</em></h1>
        <p>Accedé a tus métricas y actualizá la carta de Casa Brasa desde un solo lugar.</p>
        <form onSubmit={submit} className="restaurant-login-form">
          <label htmlFor="restaurant-username">Usuario</label>
          <Input id="restaurant-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required placeholder="Tu usuario" />
          <label htmlFor="restaurant-password">Contraseña</label>
          <Input id="restaurant-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Tu contraseña" />
          {error && <p className="restaurant-login-error" role="alert">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Ingresando…" : "Entrar al panel"} <ArrowRight size={16} /></Button>
        </form>
        <Link href="/carta" className="restaurant-login-back">Volver a la carta pública</Link>
      </section>
    </main>
  );
}
