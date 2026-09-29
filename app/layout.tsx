import type { Metadata } from "next";
import "./globals.css";
import "./admin.css";
import "./admin-theme.css";

export const metadata: Metadata = {
  title: "Plato360 · Carta digital",
  description: "Carta digital con videos de los platos y pedidos desde la mesa.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/assets/favicon.svg",
    shortcut: "/assets/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
