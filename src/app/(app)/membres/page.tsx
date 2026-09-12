"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Plus, Search, UserPlus, Users } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { MemberForm } from "@/components/MemberForm";
import { Badge, Button, Card, EmptyState, Progress, Spinner } from "@/components/ui";
import {
  FILTER_LABELS,
  FILTER_ORDER,
  fullName,
  joinLabel,
  matchesFilter,
  matchesSearch,
  sortStats,
  type MemberFilter,
} from "@/lib/cotisations";
import { formatAmount, formatPercent } from "@/lib/format";
import type { MemberStats } from "@/lib/types";

export default function MembersPage() {
  const { stats, settings, loading, members } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const visible = useMemo(
    () =>
      sortStats(
        stats.filter((s) => matchesFilter(s, filter) && matchesSearch(s.member, query)),
      ),
    [stats, filter, query],
  );

  // Effectif de chaque filtre, affiché dans les onglets.
  const counts = useMemo(() => {
    const map = {} as Record<MemberFilter, number>;
    for (const f of FILTER_ORDER) map[f] = stats.filter((s) => matchesFilter(s, f)).length;
    return map;
  }, [stats]);

  if (loading && members.length === 0) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membres</h1>
          <p className="mt-1 text-sm text-muted">
            {counts.all} membre(s) actif(s) · exercice {settings.exercise_year}
          </p>
        </div>
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> Ajouter un membre
        </Button>
      </div>

      {/* ---------- Recherche ---------- */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="field pl-9"
          placeholder="Rechercher un nom, un prénom, un numéro…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* ---------- Filtres ---------- */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {FILTER_ORDER.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition " +
                (active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted hover:bg-surface-2 hover:text-ink")
              }
            >
              {FILTER_LABELS[f]}
              <span className="ml-1.5 opacity-70">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- Liste ---------- */}
      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={32} />}
            title={
              members.length === 0
                ? "Aucun membre enregistré"
                : "Aucun membre ne correspond à ce filtre"
            }
            description={
              members.length === 0
                ? "Commencez par ajouter les membres du comité, avec leur mois d'adhésion."
                : "Modifiez la recherche ou choisissez un autre filtre."
            }
            action={
              members.length === 0 ? (
                <Button variant="primary" onClick={() => setFormOpen(true)}>
                  <UserPlus size={16} /> Ajouter le premier membre
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          {/* Vue tableau (desktop) */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Membre</th>
                    <th className="px-3 py-3 font-medium">Adhésion</th>
                    <th className="px-3 py-3 font-medium">Mois soldés</th>
                    <th className="px-3 py-3 font-medium">Arriérés</th>
                    <th className="px-3 py-3 font-medium">Droit d&apos;adhésion</th>
                    <th className="px-3 py-3 font-medium">Reste à percevoir</th>
                    <th className="px-5 py-3 font-medium">Recouvrement</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr
                      key={s.member.id}
                      className="border-b border-line/60 transition last:border-0 hover:bg-surface-2/60"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/membres/${s.member.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {fullName(s.member)}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2">
                          {!s.member.active && <Badge>Retiré</Badge>}
                          {s.atRisk && (
                            <Badge tone="danger">
                              <AlertTriangle size={11} /> Signalé
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">{joinLabel(s.member)}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {s.paidMonths} / {s.eligibleMonths}
                      </td>
                      <td className="px-3 py-3">
                        {s.dueMonths.length === 0 ? (
                          <Badge tone="paid">À jour</Badge>
                        ) : (
                          <Badge tone={s.dueMonths.length >= 3 ? "danger" : "due"}>
                            {s.dueMonths.length} mois
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {!s.feeDue ? (
                          <span className="text-muted">Non dû</span>
                        ) : s.feePaid ? (
                          <Badge tone="paid">Réglé</Badge>
                        ) : (
                          <Badge tone="due">Non réglé</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted">
                        {formatAmount(s.outstanding, settings.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-14 shrink-0 tabular-nums">
                            {formatPercent(s.recoveryRate, 0)}
                          </span>
                          <div className="w-20">
                            <Progress value={s.recoveryRate} />
                          </div>
                        </div>
                      </td>
                      <td className="pr-4">
                        <Link
                          href={`/membres/${s.member.id}`}
                          aria-label={"Ouvrir la fiche de " + fullName(s.member)}
                          className="block text-muted hover:text-accent"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Vue cartes (mobile) */}
          <div className="space-y-2.5 lg:hidden">
            {visible.map((s) => (
              <MemberCard key={s.member.id} stats={s} currency={settings.currency} />
            ))}
          </div>
        </>
      )}

      <MemberForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function MemberCard({ stats: s, currency }: { stats: MemberStats; currency: string }) {
  return (
    <Link href={`/membres/${s.member.id}`} className="block">
      <Card className="p-4 transition active:bg-surface-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(s.member)}</p>
            <p className="mt-0.5 text-xs text-muted">
              Depuis {joinLabel(s.member)} · {s.paidMonths}/{s.eligibleMonths} mois soldés
            </p>
          </div>
          {s.dueMonths.length === 0 ? (
            <Badge tone="paid">À jour</Badge>
          ) : (
            <Badge tone={s.dueMonths.length >= 3 ? "danger" : "due"}>
              {s.dueMonths.length} mois
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <Progress value={s.recoveryRate} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {formatPercent(s.recoveryRate, 0)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {s.atRisk && (
            <Badge tone="danger">
              <AlertTriangle size={11} /> Signalé
            </Badge>
          )}
          {s.feeDue && !s.feePaid && <Badge tone="due">Adhésion non réglée</Badge>}
          {!s.member.active && <Badge>Retiré</Badge>}
          {s.outstanding > 0 && (
            <span className="text-xs text-muted">
              Reste {formatAmount(s.outstanding, currency)}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
