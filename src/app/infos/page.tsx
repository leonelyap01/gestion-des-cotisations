import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { POST_CATEGORIES, categoryColor, sortPosts } from "@/lib/posts";
import { formatAmount, formatDate } from "@/lib/format";
import type { Post, Settings } from "@/lib/types";

/**
 * Page publique des actualités du comité.
 *
 * Consultable sans compte : le middleware laisse passer /infos, et la règle RLS
 * « posts_public_read » n'expose que les annonces publiées. Les membres, les
 * paiements et les rapports restent, eux, strictement privés.
 */

// Rendu à chaque visite : une annonce publiée apparaît immédiatement.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actualités du comité",
  description: "Informations et annonces destinées aux membres du comité.",
};

export default async function InfosPage() {
  const supabase = await createClient();

  const [settingsResult, postsResult] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("posts").select("*").eq("published", true),
  ]);

  const settings = settingsResult.data as Settings | null;
  const posts = sortPosts((postsResult.data ?? []) as Post[]);

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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* ---------- En-tête ---------- */}
        <header className="flex flex-col items-center gap-4 border-b border-line pb-7 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <Image
            src={settings?.logo_url || "/logo-ucjea.jpg"}
            alt=""
            width={329}
            height={262}
            priority
            className="h-24 w-auto shrink-0 rounded-xl bg-white p-1.5"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Actualités
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
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

        {/* ---------- Annonces ---------- */}
        <main className="py-8">
          {posts.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="font-medium">Aucune actualité pour le moment</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Les informations et annonces du bureau apparaîtront sur cette page.
                Pensez à l&apos;ajouter à vos favoris.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <article
                    className="card overflow-hidden border-l-4 p-5 sm:p-6"
                    style={{ borderLeftColor: categoryColor(post.category) }}
                  >
                    <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-medium"
                        style={{
                          color: categoryColor(post.category),
                          background: "color-mix(in srgb, " +
                            categoryColor(post.category) + " 14%, transparent)",
                        }}
                      >
                        {POST_CATEGORIES[post.category]?.label ?? "Information"}
                      </span>
                      <time className="text-muted" dateTime={post.published_at}>
                        {formatDate(post.published_at)}
                      </time>
                      {post.pinned && (
                        <span className="text-muted">· Épinglée</span>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold leading-snug sm:text-xl">
                      {post.title}
                    </h2>

                    {post.body.trim() && (
                      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {post.body}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </main>

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
          <Link href="/login" className="hover:text-accent">
            Espace trésorier
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
