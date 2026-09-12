"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Search } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import {
  FILTER_LABELS,
  FILTER_ORDER,
  MONTH_SHORT,
  cellStatus,
  exerciseMonths,
  fullName,
  matchesFilter,
  matchesSearch,
  paymentKey,
  sortStats,
  type MemberFilter,
} from "@/lib/cotisations";
import { formatAmount, formatNumber } from "@/lib/format";
import type { CellStatus } from "@/lib/types";

/**
 * Grille mensuelle de suivi des cotisations : une ligne par membre, une
 * colonne par mois de l'exercice. Un clic bascule l'état « soldé ».
 */
export default function CotisationsPage() {
  const {
    settings,
    stats,
    paymentIndex,
    togglePayment,
    toggleMembershipFee,
    dashboard,
    loading,
    members,
  } = useData();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");

  const months = exerciseMonths(settings);
  const year = settings.exercise_year;
  const c = settings.currency;

  const rows = useMemo(
    () =>
      sortStats(
        stats.filter((s) => matchesFilter(s, filter) && matchesSearch(s.member, query)),
      ),
    [stats, filter, query],
  );

  if (loading && members.length === 0) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cotisations {year}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatAmount(settings.monthly_amount, c)} par mois · cliquez sur une case pour
          enregistrer ou annuler un paiement.
        </p>
      </div>

      {/* ---------- Légende ---------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <LegendItem color="var(--paid)" label="Soldé" />
        <LegendItem color="var(--due)" label="Dû (mois ouvert, non soldé)" />
        <LegendItem color="var(--neutral)" label="Mois pas encore ouvert" />
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm border border-line"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--surface-2) 0 3px, transparent 3px 6px)",
            }}
          />
          Non membre à cette période
        </span>
      </div>

      {/* ---------- Recherche + filtres ---------- */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            className="field pl-9"
            placeholder="Rechercher un membre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {FILTER_ORDER.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition " +
                (filter === f
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted hover:bg-surface-2 hover:text-ink")
              }
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={
              members.length === 0
                ? "Aucun membre à afficher"
                : "Aucun membre ne correspond à ce filtre"
            }
            description={
              members.length === 0
                ? "Ajoutez d'abord les membres du comité depuis l'onglet Membres."
                : undefined
            }
            action={
              members.length === 0 ? (
                <Link href="/membres" className="text-sm text-accent hover:underline">
                  Aller à la page Membres
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="grid-sticky-head">
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="grid-sticky-col border-b border-r border-line px-4 py-3 text-left font-medium min-w-[190px]">
                    Membre
                  </th>
                  <th
                    className="border-b border-r border-line px-2 py-3 text-center font-medium"
                    title={"Droit d'adhésion : " + formatAmount(settings.membership_fee, c)}
                  >
                    Adh.
                  </th>
                  {months.map((m) => {
                    const open = settings.active_months.includes(m);
                    return (
                      <th
                        key={m}
                        className={
                          "border-b border-line px-2 py-3 text-center font-medium min-w-[54px] " +
                          (open ? "" : "text-muted/60")
                        }
                        title={open ? "Mois ouvert" : "Mois non ouvert"}
                      >
                        {MONTH_SHORT[m - 1]}
                      </th>
                    );
                  })}
                  <th className="border-b border-l border-line px-3 py-3 text-right font-medium min-w-[90px]">
                    Reste
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((s) => (
                  <tr key={s.member.id} className="group">
                    {/* Nom du membre — colonne figée */}
                    <td className="grid-sticky-col border-b border-r border-line px-4 py-2.5 group-hover:bg-surface-2">
                      <Link
                        href={`/membres/${s.member.id}`}
                        className="block truncate font-medium hover:text-accent"
                      >
                        {fullName(s.member)}
                      </Link>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        {s.paidMonths}/{s.eligibleMonths} mois
                        {s.atRisk && (
                          <AlertTriangle size={11} className="text-danger" aria-label="Signalé" />
                        )}
                      </span>
                    </td>

                    {/* Droit d'adhésion */}
                    <td className="border-b border-r border-line p-1 text-center">
                      {s.feeDue ? (
                        <button
                          onClick={() => void toggleMembershipFee(s.member.id, !s.feePaid)}
                          title={
                            (s.feePaid ? "Réglé" : "Non réglé") +
                            " — " +
                            formatAmount(settings.membership_fee, c)
                          }
                          className={
                            "mx-auto flex h-8 w-8 items-center justify-center rounded-md border text-xs transition " +
                            (s.feePaid
                              ? "border-paid/40 bg-paid-soft text-paid"
                              : "border-due/40 bg-due-soft text-due hover:bg-due/20")
                          }
                        >
                          {s.feePaid ? <Check size={14} /> : "!"}
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Une case par mois */}
                    {months.map((m) => {
                      const payment = paymentIndex.get(paymentKey(s.member.id, year, m));
                      const status = cellStatus(s.member, m, settings, Boolean(payment));
                      return (
                        <td key={m} className="border-b border-line p-1 text-center">
                          <MonthCell
                            status={status}
                            label={
                              status === "not_member"
                                ? fullName(s.member) + " — non membre en " + MONTH_SHORT[m - 1]
                                : (status === "paid" ? "Soldé" : "Non soldé") +
                                  " — " +
                                  MONTH_SHORT[m - 1]
                            }
                            onToggle={
                              status === "not_member"
                                ? undefined
                                : () => void togglePayment(s.member.id, m, !payment)
                            }
                          />
                        </td>
                      );
                    })}

                    <td className="border-b border-l border-line px-3 py-2.5 text-right tabular-nums">
                      {s.outstanding > 0 ? (
                        <span className="text-due">{formatAmount(s.outstanding, c)}</span>
                      ) : (
                        <span className="text-paid">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* ---------- Totaux ---------- */}
              <tfoot>
                <tr className="bg-surface-2 text-xs">
                  <td className="grid-sticky-col border-r border-line px-4 py-3 font-medium">
                    Total soldés
                  </td>
                  <td className="border-r border-line px-2 py-3 text-center tabular-nums">
                    {formatNumber(
                      stats.filter((s) => s.member.active && s.feeDue && s.feePaid).length,
                    )}
                  </td>
                  {months.map((m) => {
                    const summary = dashboard.months.find((x) => x.month === m);
                    return (
                      <td key={m} className="px-2 py-3 text-center tabular-nums">
                        {summary && summary.open ? (
                          <span
                            className={
                              summary.paid === summary.eligible && summary.eligible > 0
                                ? "text-paid"
                                : ""
                            }
                          >
                            {summary.paid}/{summary.eligible}
                          </span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-l border-line px-3 py-3 text-right font-medium tabular-nums text-due">
                    {formatAmount(dashboard.outstanding, c)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted">
        Les mois ouverts se règlent dans{" "}
        <Link href="/parametres" className="text-accent hover:underline">
          Paramètres
        </Link>
        . Un mois fermé n&apos;est jamais compté comme un arriéré.
      </p>
    </div>
  );
}

/** Case d'un mois : verte si soldée, orange si due, hachurée si non membre. */
function MonthCell({
  status,
  label,
  onToggle,
}: {
  status: CellStatus;
  label: string;
  onToggle?: () => void;
}) {
  // Règle métier n°1 : aucun mois antérieur à l'adhésion ne peut être coché,
  // et sa présentation est volontairement distincte.
  if (status === "not_member") {
    return (
      <span
        title={label}
        aria-label={label}
        className="mx-auto flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted/50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--surface-2) 0 3px, transparent 3px 6px)",
        }}
      >
        <span className="text-[10px]">·</span>
      </span>
    );
  }

  const styles: Record<Exclude<CellStatus, "not_member">, string> = {
    paid: "border-paid/40 bg-paid-soft text-paid hover:bg-paid/25",
    due: "border-due/40 bg-due-soft text-due hover:bg-due/25",
    upcoming: "border-line text-muted/50 hover:bg-surface-2 hover:text-ink",
  };

  return (
    <button
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={status === "paid"}
      className={
        "mx-auto flex h-8 w-8 items-center justify-center rounded-md border transition " +
        styles[status as Exclude<CellStatus, "not_member">]
      }
    >
      {status === "paid" ? <Check size={15} /> : <span className="text-xs">•</span>}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
