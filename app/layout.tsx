import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa Brasa · Cocina que entra por los ojos",
  description: "Una carta visual con videos cortos para descubrir qué platos generan más ganas.",
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
