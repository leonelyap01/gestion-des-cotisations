import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LayoutDashboard, LogIn } from "lucide-react";
import { PublicTabs } from "@/components/PublicTabs";
import { createClient } from "@/lib/supabase/server";
import { HOME_AFTER_LOGIN } from "@/lib/routes";
import { getPublicSettings } from "@/lib/public-data";
import { formatAmount } from "@/lib/format";

/**
 * Espace public du comité : en-tête, onglets et pied de page communs aux
 * actualités et à la page « Notre vision ».
 *
 * Consultable sans compte : le middleware laisse passer la racine, et les règles
 * RLS n'exposent que les annonces publiées et la ligne de paramètres. Les
 * membres, les paiements et les rapports restent strictement privés.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Espace membres", template: "%s · Espace membres" },
  description: "Informations et annonces destinées aux membres du comité.",
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, supabase] = await Promise.all([getPublicSettings(), createClient()]);

  // Un membre du bureau déjà connecté voit « Mon espace » plutôt que
  // « Se connecter » ; pour tout autre visiteur, l'appel renvoie simplement null.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = settings?.association_name ?? "Comité";
  const currency = settings?.currency ?? "FCFA";
  const hasPayment = Boolean(
    settings?.pay_wave || settings?.pay_mtn || settings?.pay_orange,
  );

  return (
    <div
      data-accent={settings?.accent ?? "emerald"}
      className="min-h-screen bg-bg text-ink"
    >
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pb-28 sm:pt-8">
        {/* ---------- Barre d'accès ---------- */}
        <div className="mb-6 flex justify-end">
          <Link
            href={user ? HOME_AFTER_LOGIN : "/login"}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-ink transition hover:border-accent hover:text-accent"
          >
            {user ? <LayoutDashboard size={16} /> : <LogIn size={16} />}
            {user ? "Mon espace" : "Se connecter"}
          </Link>
        </div>

        {/* ---------- En-tête ---------- */}
        <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <Image
            src={settings?.logo_url || "/logo-ucjea.jpg"}
            alt=""
            width={329}
            height={262}
            priority
            className="h-24 w-auto shrink-0 rounded-xl bg-white p-1.5"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {name}
            </h1>
            {settings?.motto && (
              <p className="mt-1.5 text-sm italic text-muted">
                « {settings.motto} »
              </p>
            )}
            {settings && (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Exercice {settings.exercise_year} · cotisation{" "}
                {formatAmount(settings.monthly_amount, currency)} par mois · droit
                d&apos;adhésion {formatAmount(settings.membership_fee, currency)} (une
                seule fois, à l&apos;arrivée).
              </p>
            )}
          </div>
        </header>

        {/* ---------- Onglets ---------- */}
        <PublicTabs showVision={Boolean(settings?.vision?.trim())} />

        {children}

        {/* ---------- Coordonnées de paiement ---------- */}
        {hasPayment && settings && (
          <section className="card p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
              Moyens de paiement
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {settings.pay_wave && <PayRow label="Wave" value={settings.pay_wave} />}
              {settings.pay_mtn && (
                <PayRow label="MTN Mobile Money" value={settings.pay_mtn} />
              )}
              {settings.pay_orange && (
                <PayRow label="Orange Money" value={settings.pay_orange} />
              )}
            </ul>
          </section>
        )}

        {/* ---------- Pied de page ---------- */}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{name}</span>
            {settings?.city && <span>· {settings.city}</span>}
            {settings?.phone && <span>· {settings.phone}</span>}
          </span>
          <Link href={user ? HOME_AFTER_LOGIN : "/login"} className="hover:text-accent">
            {user ? "Mon espace" : "Espace du bureau"}
          </Link>
        </footer>
      </div>
    </div>
  );
}

function PayRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
