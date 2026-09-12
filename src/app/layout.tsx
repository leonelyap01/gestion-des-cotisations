import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion des cotisations",
  description:
    "Suivi des cotisations mensuelles, de la caisse et des membres du comité.",
};

export const viewport: Viewport = {
  themeColor: "#0c1210",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // data-accent est ajusté au chargement par le DataProvider, selon les
  // paramètres enregistrés. « emerald » sert de valeur par défaut.
  return (
    <html lang="fr" data-accent="emerald">
      <body>{children}</body>
    </html>
  );
}
