"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  IdCard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useData } from "./DataProvider";
import { Spinner } from "./ui";

/**
 * `short` est le libellé de la barre mobile ; `primary` désigne les quatre
 * entrées qui y restent visibles en permanence — les autres sont regroupées
 * derrière le bouton « Plus », pour garder des cibles tactiles confortables.
 */
const NAV = [
  { href: "/", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, primary: true },
  { href: "/membres", label: "Membres", short: "Membres", icon: Users, primary: true },
  { href: "/cotisations", label: "Cotisations", short: "Cotis.", icon: CalendarCheck2, primary: true },
  { href: "/alertes", label: "Alertes", short: "Alertes", icon: AlertTriangle, primary: true },
  { href: "/annonces", label: "Annonces", short: "Annonces", icon: Megaphone, primary: false },
  { href: "/cartes", label: "Cartes de membre", short: "Cartes", icon: IdCard, primary: false },
  { href: "/rapports", label: "Rapports", short: "Rapports", icon: FileText, primary: false },
  { href: "/parametres", label: "Paramètres", short: "Réglages", icon: SettingsIcon, primary: false },
];

const PRIMARY_NAV = NAV.filter((n) => n.primary);
const SECONDARY_NAV = NAV.filter((n) => !n.primary);

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings, dashboard, ready, error, configured, signOut } = useData();
  const [signingOut, setSigningOut] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Garde-fou : tant que les clés Supabase ne sont pas renseignées, on affiche
  // la marche à suivre plutôt qu'une application vide.
  if (!configured) return <SetupNotice />;

  return (
    <div className="min-h-screen lg:flex">
      {/* ---------- Navigation latérale (desktop) ---------- */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-5">
          <div className="flex items-center gap-2 text-accent">
            <Wallet size={20} />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Caisse
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug">
            {settings.association_name}
          </p>
          <p className="text-xs text-muted">Exercice {settings.exercise_year}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = href === "/alertes" && dashboard.atRisk > 0 ? dashboard.atRisk : null;
            return (
              <Link
                key={href}
                href={href}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition " +
                  (active
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-muted hover:bg-surface-2 hover:text-ink")
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <button
            onClick={() => {
              setSigningOut(true);
              void signOut();
            }}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <LogOut size={18} />
            {signingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      </aside>

      {/* ---------- Contenu ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{settings.association_name}</p>
            <p className="text-xs text-muted">Exercice {settings.exercise_year}</p>
          </div>
          <button
            onClick={() => {
              setSigningOut(true);
              void signOut();
            }}
            aria-label="Se déconnecter"
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={18} />
          </button>
        </header>

        {error && (
          <div className="border-b border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-10">
          {ready ? children : <Spinner />}
        </main>
      </div>

      {/* ---------- Barre de navigation (mobile) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {PRIMARY_NAV.map(({ href, label, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          const badge = href === "/alertes" && dashboard.atRisk > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              onClick={() => setMoreOpen(false)}
              className={
                "relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] " +
                (active ? "text-accent" : "text-muted")
              }
            >
              <Icon size={19} />
              <span className="max-w-full truncate px-0.5">{short}</span>
              {badge && (
                <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
              )}
            </Link>
          );
        })}

        {/* Les quatre autres rubriques, sous un bouton « Plus ». */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label="Plus de rubriques"
          className={
            "flex flex-col items-center gap-0.5 py-2.5 text-[10px] " +
            (moreOpen || SECONDARY_NAV.some((n) => isActive(pathname, n.href))
              ? "text-accent"
              : "text-muted")
          }
        >
          <MoreHorizontal size={19} />
          <span>Plus</span>
        </button>
      </nav>

      {/* Feuille « Plus » (mobile) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-[62px] border-t border-line bg-surface p-3 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {SECONDARY_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition " +
                    (isActive(pathname, href)
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line text-ink")
                  }
                >
                  <Icon size={18} />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Écran affiché quand .env.local n'est pas encore renseigné. */
function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-xl font-semibold">Configuration requise</h1>
      <p className="text-sm text-muted">
        Les clés Supabase ne sont pas renseignées. Créez un fichier{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">.env.local</code> à
        la racine du projet à partir de{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">
          .env.local.example
        </code>
        , puis relancez <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">npm run dev</code>.
      </p>
      <pre className="card overflow-x-auto p-4 text-xs text-muted">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
      </pre>
      <p className="text-sm text-muted">
        La marche à suivre complète se trouve dans le fichier{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">README.md</code>.
      </p>
    </div>
  );
}
